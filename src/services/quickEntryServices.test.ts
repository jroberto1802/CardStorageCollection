import { beforeEach, describe, expect, it, vi } from 'vitest'

const rpcMock = vi.fn()
vi.mock('@/lib/supabase', () => ({ supabase: { rpc: (...args: unknown[]) => rpcMock(...args) } }))
vi.mock('@/services/catalogService', () => ({ getCardById: vi.fn(), getCardsByIds: vi.fn(), getCardsBySetName: vi.fn() }))

import { addCollectionItemsBatch, BatchCollectionError } from './collectionService'
import { clearSetPrintingsCache, getSetPrintings, listSetPrefixes } from './setPrintingsService'

const item = (cardId: number, setCode = 'LIOV-EN001', rarity = 'Rare', quantity = 1) => ({
  card_id: cardId,
  language: 'en' as const,
  set_code: setCode,
  set_name: 'Lord of the Ravens',
  set_rarity: rarity,
  quantity,
})

beforeEach(() => {
  rpcMock.mockReset()
  clearSetPrintingsCache()
})

describe('addCollectionItemsBatch', () => {
  it('uma única chamada RPC para até 500 itens e nunca envia user_id', async () => {
    rpcMock.mockResolvedValue({ data: { inserted: 2, updated: 1, total_quantity: 5 }, error: null })
    const result = await addCollectionItemsBatch([item(1), item(2), item(3, 'LIOV-EN003', '—', 2)])
    expect(rpcMock).toHaveBeenCalledTimes(1)
    expect(rpcMock.mock.calls[0][0]).toBe('add_collection_items_batch')
    const sent = rpcMock.mock.calls[0][1].p_items as Array<Record<string, unknown>>
    expect(sent).toHaveLength(3)
    expect(sent.every((i) => !('user_id' in i))).toBe(true)
    expect(sent[2].set_rarity).toBe('') // '—' normalizado
    expect(result).toEqual({ inserted: 2, updated: 1, total_quantity: 5 })
  })

  it('soma duplicatas do lote antes de enviar', async () => {
    rpcMock.mockResolvedValue({ data: { inserted: 1, updated: 0, total_quantity: 5 }, error: null })
    await addCollectionItemsBatch([item(1, 'LIOV-EN001', 'Rare', 2), item(1, ' LIOV-EN001 ', 'Rare', 3)])
    const sent = rpcMock.mock.calls[0][1].p_items as Array<{ quantity: number }>
    expect(sent).toHaveLength(1)
    expect(sent[0].quantity).toBe(5)
  })

  it('quebra em chunks de 500 e agrega o resumo', async () => {
    rpcMock.mockResolvedValue({ data: { inserted: 1, updated: 2, total_quantity: 3 }, error: null })
    const many = Array.from({ length: 1201 }, (_, i) => item(i + 1))
    const result = await addCollectionItemsBatch(many)
    expect(rpcMock).toHaveBeenCalledTimes(3)
    expect(rpcMock.mock.calls.map((c) => (c[1].p_items as unknown[]).length)).toEqual([500, 500, 201])
    expect(result).toEqual({ inserted: 3, updated: 6, total_quantity: 9 })
  })

  it('soma duplicatas no cliente com teto de 999 (a RPC rejeita o lote inteiro acima disso)', async () => {
    rpcMock.mockResolvedValue({ data: { inserted: 1, updated: 0, total_quantity: 999 }, error: null })
    await addCollectionItemsBatch([item(1, 'LIOV-EN001', 'Rare', 600), item(1, 'LIOV-EN001', 'Rare', 600)])
    expect((rpcMock.mock.calls[0][1].p_items as Array<{ quantity: number }>)[0].quantity).toBe(999)
  })

  it('lista vazia não chama a RPC', async () => {
    expect(await addCollectionItemsBatch([])).toEqual({ inserted: 0, updated: 0, total_quantity: 0 })
    expect(rpcMock).not.toHaveBeenCalled()
  })

  it('erro na RPC lança, sem resultado parcial no cliente (lote único = nada salvo)', async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: 'quantity deve estar entre 1 e 999' } })
    const promise = addCollectionItemsBatch([item(1)])
    await expect(promise).rejects.toBeInstanceOf(BatchCollectionError)
    await expect(promise).rejects.toMatchObject({ savedItems: 0, savedChunks: 0, totalChunks: 1 })
    await expect(promise).rejects.toThrow(/quantity/)
  })

  it('falha no 2º chunk informa o que já foi gravado', async () => {
    rpcMock
      .mockResolvedValueOnce({ data: { inserted: 500, updated: 0, total_quantity: 500 }, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: 'boom' } })
    const many = Array.from({ length: 600 }, (_, i) => item(i + 1))
    await expect(addCollectionItemsBatch(many)).rejects.toMatchObject({
      savedItems: 500,
      savedChunks: 1,
      totalChunks: 2,
    })
  })

  it('falha parcial expõe os itens restantes (para reenviar só eles, sem duplicar)', async () => {
    rpcMock
      .mockResolvedValueOnce({ data: { inserted: 500, updated: 0, total_quantity: 500 }, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: 'boom' } })
    const many = Array.from({ length: 600 }, (_, i) => item(i + 1))
    const err = await addCollectionItemsBatch(many).catch((e) => e)
    expect(err).toBeInstanceOf(BatchCollectionError)
    expect(err.remainingItems).toHaveLength(100)
    expect(err.remainingItems[0].card_id).toBe(501)
  })
})

describe('getSetPrintings', () => {
  const row = {
    card_id: 10,
    language: 'en',
    name: 'Blue-Eyes',
    type: 'Normal Monster',
    set_code: 'LIOV-EN001',
    set_prefix: 'LIOV',
    set_region: 'EN',
    set_number: '001',
    set_name: 'Lord of the Ravens',
    set_rarity: 'Rare',
    set_rarity_code: '(R)',
    set_price: '1.25',
    image_url_small: null,
  }

  it('mapeia as colunas e cacheia por sessão', async () => {
    rpcMock.mockResolvedValue({ data: [row], error: null })
    const first = await getSetPrintings('liov', 'EN', 'en')
    expect(first[0]).toMatchObject({ cardId: 10, setNumber: '001', setPrice: 1.25, setRarity: 'Rare' })
    await getSetPrintings('LIOV', 'EN', 'en')
    expect(rpcMock).toHaveBeenCalledTimes(1)
    await getSetPrintings('LIOV', 'EN', 'pt') // outra chave
    expect(rpcMock).toHaveBeenCalledTimes(2)
  })

  it('devolve cópia: mutar o resultado não contamina o cache', async () => {
    rpcMock.mockResolvedValue({ data: [row], error: null })
    const first = await getSetPrintings('LIOV', 'EN', 'en')
    first[0].name = 'MUTADO'
    first.pop()
    const second = await getSetPrintings('LIOV', 'EN', 'en')
    expect(second).toHaveLength(1)
    expect(second[0].name).toBe('Blue-Eyes')
    expect(rpcMock).toHaveBeenCalledTimes(1)
  })

  it('chamadas simultâneas dividem a mesma requisição', async () => {
    rpcMock.mockResolvedValue({ data: [row], error: null })
    await Promise.all([getSetPrintings('LIOV'), getSetPrintings('LIOV')])
    expect(rpcMock).toHaveBeenCalledTimes(1)
  })

  it('expira pelo TTL e refaz a consulta', async () => {
    vi.useFakeTimers()
    try {
      rpcMock.mockResolvedValue({ data: [row], error: null })
      await getSetPrintings('LIOV')
      vi.advanceTimersByTime(11 * 60 * 1000)
      await getSetPrintings('LIOV')
      expect(rpcMock).toHaveBeenCalledTimes(2)
    } finally {
      vi.useRealTimers()
    }
  })

  it('erro não é cacheado', async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: 'falhou' } })
    await expect(getSetPrintings('LIOV')).rejects.toThrow('falhou')
    rpcMock.mockResolvedValueOnce({ data: [row], error: null })
    expect(await getSetPrintings('LIOV')).toHaveLength(1)
  })
})

describe('listSetPrefixes', () => {
  it('mapeia o autocompletar e envia consulta vazia como null', async () => {
    rpcMock.mockResolvedValue({
      data: [{ set_prefix: 'LIOV', regions: ['EN', 'FR'], set_name: 'Lord of the Ravens', total_cards: 100 }],
      error: null,
    })
    const list = await listSetPrefixes('  ')
    expect(rpcMock).toHaveBeenCalledWith('list_set_prefixes', { p_query: null, p_limit: 20 })
    expect(list).toEqual([{ prefix: 'LIOV', regions: ['EN', 'FR'], setName: 'Lord of the Ravens', totalCards: 100 }])
  })

  it('cache por consulta (TTL curto) e cópia defensiva', async () => {
    vi.useFakeTimers()
    try {
      rpcMock.mockResolvedValue({ data: [{ set_prefix: 'LIOV', regions: ['EN'], set_name: 'x', total_cards: 1 }], error: null })
      const a = await listSetPrefixes('Lio')
      a[0].regions.push('XX')
      const b = await listSetPrefixes('lio') // mesma consulta (sem caixa)
      expect(b[0].regions).toEqual(['EN'])
      expect(rpcMock).toHaveBeenCalledTimes(1)
      await listSetPrefixes('liov') // outra consulta
      expect(rpcMock).toHaveBeenCalledTimes(2)
      vi.advanceTimersByTime(61_000)
      await listSetPrefixes('lio')
      expect(rpcMock).toHaveBeenCalledTimes(3)
    } finally {
      vi.useRealTimers()
    }
  })

  it('propaga erro', async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: 'x' } })
    await expect(listSetPrefixes('a')).rejects.toThrow('x')
  })
})
