import { beforeEach, describe, expect, it, vi } from 'vitest'

const insertMock = vi.fn()
const updateEqMock = vi.fn(() => Promise.resolve({ error: null }))
const createDeckMock = vi.fn()
const deleteDeckMock = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (table: string) => {
      if (table === 'deck_cards') return { insert: insertMock }
      return { update: () => ({ eq: updateEqMock }) }
    },
  },
}))
vi.mock('@/services/deckService', () => ({
  createDeck: (...args: unknown[]) => createDeckMock(...args),
  deleteDeck: (...args: unknown[]) => deleteDeckMock(...args),
}))

import { createUserDeckFromCards, planUserDeckRows, type UserDeckCardInput } from './syncedDeckService'

const card = (cardId: number | null, quantity: number, zone: UserDeckCardInput['zone'] = 'main'): UserDeckCardInput => ({
  cardId,
  language: cardId == null ? null : 'en',
  zone,
  quantity,
})

beforeEach(() => {
  insertMock.mockReset()
  updateEqMock.mockClear()
  createDeckMock.mockReset()
  deleteDeckMock.mockReset()
  createDeckMock.mockResolvedValue({ id: 'deck-1', name: 'Meu deck' })
  insertMock.mockResolvedValue({ error: null })
})

describe('planUserDeckRows', () => {
  it('limita a 3 cópias por carta (somando zonas) e conta as cortadas', () => {
    const plan = planUserDeckRows([card(1, 2), card(1, 2, 'side')])
    expect(plan.rows).toHaveLength(3)
    expect(plan.cappedCopies).toBe(1)
    expect(plan.rows.filter((r) => r.zone === 'side')).toHaveLength(1)
  })

  it('pula cartas sem id/idioma e conta as cópias', () => {
    const plan = planUserDeckRows([card(null, 2), card(5, 1)])
    expect(plan.skippedUnresolved).toBe(2)
    expect(plan.rows).toHaveLength(1)
  })

  it('respeita o limite de cada zona e posiciona em sequência', () => {
    const many = Array.from({ length: 20 }, (_, i) => card(100 + i, 3, 'extra'))
    const plan = planUserDeckRows(many)
    expect(plan.rows).toHaveLength(15)
    expect(plan.truncatedByLimit).toBe(45)
    expect(plan.rows.map((r) => r.position)).toEqual(Array.from({ length: 15 }, (_, i) => i))
  })
})

describe('createUserDeckFromCards', () => {
  it('insere em lotes de 200 e reporta progresso', async () => {
    const cards = Array.from({ length: 140 }, (_, i) => card(1000 + i, 3, i < 60 ? 'main' : i < 100 ? 'extra' : 'side'))
    const progress: Array<[number, number]> = []
    const result = await createUserDeckFromCards({
      name: 'Meu deck',
      language: 'pt',
      cards,
      onProgress: (done, total) => progress.push([done, total]),
    })
    // main limitado a 60, extra a 15, side a 15 = 90 linhas -> 1 lote
    expect(insertMock).toHaveBeenCalledTimes(1)
    expect(result).toMatchObject({ deckId: 'deck-1', inserted: 90, failedAtChunk: null })
    expect(progress[0]).toEqual([0, 90])
    expect(progress.at(-1)).toEqual([90, 90])
    expect(insertMock.mock.calls[0][0][0]).toMatchObject({ deck_id: 'deck-1' })
  })

  it('divide em vários lotes conforme o chunkSize', async () => {
    const cards = Array.from({ length: 20 }, (_, i) => card(i + 1, 3, 'main'))
    const result = await createUserDeckFromCards({ name: 'x', language: 'en', cards, chunkSize: 25 })
    expect(insertMock.mock.calls.map((c) => c[0].length)).toEqual([25, 25, 10])
    expect(result.inserted).toBe(60)
  })

  it('falha total: apaga o deck criado e lança erro', async () => {
    insertMock.mockResolvedValue({ error: { message: 'boom' } })
    await expect(
      createUserDeckFromCards({ name: 'x', language: 'en', cards: [card(1, 3)] }),
    ).rejects.toThrow('boom')
    expect(deleteDeckMock).toHaveBeenCalledWith('deck-1')
  })

  it('falha parcial: mantém o deck e informa o lote que falhou', async () => {
    insertMock.mockResolvedValueOnce({ error: null }).mockResolvedValueOnce({ error: { message: 'x' } })
    const cards = Array.from({ length: 20 }, (_, i) => card(i + 1, 3, 'main'))
    const result = await createUserDeckFromCards({ name: 'x', language: 'en', cards, chunkSize: 25 })
    expect(result.failedAtChunk).toBe(2)
    expect(result.inserted).toBe(25)
    expect(deleteDeckMock).not.toHaveBeenCalled()
  })

  it('falha total: tenta apagar 2 vezes e avisa sobre deck vazio com o id', async () => {
    insertMock.mockResolvedValue({ error: { message: 'boom' } })
    deleteDeckMock.mockRejectedValue(new Error('rls'))
    await expect(
      createUserDeckFromCards({ name: 'x', language: 'en', cards: [card(1, 3)] }),
    ).rejects.toThrow(/boom.*deck vazio pode ter sido criado: deck-1/)
    expect(deleteDeckMock).toHaveBeenCalledTimes(2)
  })

  it('falha total: se o 2º delete funciona, a mensagem é só o erro original', async () => {
    insertMock.mockResolvedValue({ error: { message: 'boom' } })
    deleteDeckMock.mockRejectedValueOnce(new Error('rede')).mockResolvedValueOnce(undefined)
    await expect(
      createUserDeckFromCards({ name: 'x', language: 'en', cards: [card(1, 3)] }),
    ).rejects.toThrow(/^boom$/)
  })

  it('informa plannedRows (esperado) junto do inserido', async () => {
    const result = await createUserDeckFromCards({ name: 'x', language: 'en', cards: [card(1, 3)] })
    expect(result).toMatchObject({ inserted: 3, plannedRows: 3 })
  })

  it('sem cartas válidas cria o deck vazio (como a importação de comunidade)', async () => {
    const result = await createUserDeckFromCards({ name: 'x', language: 'en', cards: [card(null, 2)] })
    expect(result).toMatchObject({ inserted: 0, skippedUnresolved: 2, failedAtChunk: null })
    expect(insertMock).not.toHaveBeenCalled()
  })
})
