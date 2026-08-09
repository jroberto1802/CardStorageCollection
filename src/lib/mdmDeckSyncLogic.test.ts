import { describe, expect, it, vi } from 'vitest'
import {
  buildDeckUpsertPayload,
  buildNameLookup,
  collectUniqueCardNames,
  computeBatchOutcome,
  fetchWithRetry,
  mdmTopDecksUrl,
  normalizeMdmDeckList,
  partitionDeckResults,
  resolveDeckCards,
  type MdmDeck,
} from '@/lib/mdmDeckSyncLogic'

const sampleDeck: MdmDeck = {
  _id: 'deck-1',
  author: { _id: 'auth-1', username: 'Tester' },
  created: '2022-01-21T15:00:00.000Z',
  url: '/platinum-1/january-2022/zoodiac/tester/',
  deckType: { name: 'Zoodiac' },
  rankedType: { name: 'Platinum I' },
  main: [
    { card: { _id: 'c1', name: 'Ash Blossom & Joyous Spring', rarity: 'UR' }, amount: 3 },
    { card: { _id: 'c2', name: 'Unknown Card XYZ', rarity: 'N' }, amount: 1 },
  ],
  extra: [
    { card: { _id: 'c3', name: 'Divine Arsenal AA-ZEUS - Sky Thunder', rarity: 'UR' }, amount: 1 },
  ],
  side: [
    { card: { _id: 'c4', name: 'Called by the Grave', rarity: 'UR' }, amount: 2 },
  ],
}

describe('normalizeMdmDeckList', () => {
  it('aceita array e objeto único', () => {
    expect(normalizeMdmDeckList([sampleDeck])).toHaveLength(1)
    expect(normalizeMdmDeckList(sampleDeck)).toHaveLength(1)
    expect(normalizeMdmDeckList(null)).toHaveLength(0)
  })
})

describe('buildNameLookup + resolveDeckCards', () => {
  it('associa main/extra/side e conta missing sem descartar', () => {
    const lookup = buildNameLookup(
      [
        { id: 14558127, name: 'Ash Blossom & Joyous Spring', language: 'en' },
        { id: 90448279, name: 'Divine Arsenal AA-ZEUS - Sky Thunder', language: 'en' },
        { id: 24207889, name: 'Called by the Grave', language: 'en' },
      ],
      'en',
    )

    const { rows, missingCount } = resolveDeckCards(sampleDeck, lookup)
    expect(missingCount).toBe(1)
    expect(rows).toHaveLength(4)

    const ash = rows.find((r) => r.mdm_card_name === 'Ash Blossom & Joyous Spring')
    expect(ash).toMatchObject({
      zone: 'main',
      quantity: 3,
      card_id: 14558127,
      language: 'en',
    })

    const zeus = rows.find((r) => r.zone === 'extra')
    expect(zeus?.card_id).toBe(90448279)

    const side = rows.find((r) => r.zone === 'side')
    expect(side?.quantity).toBe(2)

    const missing = rows.find((r) => r.mdm_card_name === 'Unknown Card XYZ')
    expect(missing?.card_id).toBeNull()
  })

  it('prefere idioma solicitado e faz fallback para en', () => {
    const lookup = buildNameLookup(
      [
        { id: 1, name: 'Ash Blossom', language: 'pt' },
        { id: 2, name: 'Ash Blossom', language: 'en' },
      ],
      'pt',
    )
    expect(lookup.get('ash blossom')?.language).toBe('pt')
  })
})

describe('buildDeckUpsertPayload', () => {
  it('cria payload idempotente por external_id', () => {
    const payload = buildDeckUpsertPayload(sampleDeck, 'en', 1)
    expect(payload).toMatchObject({
      source: 'mdm',
      external_id: 'deck-1',
      name: 'Zoodiac — Tester',
      missing_card_count: 1,
    })
    expect(payload?.source_url).toContain('masterduelmeta.com')
  })

  it('rejeita deck sem id (evita duplicata sem chave)', () => {
    expect(buildDeckUpsertPayload({ ...sampleDeck, _id: undefined }, 'en', 0)).toBeNull()
  })
})

describe('computeBatchOutcome / retomada', () => {
  it('avança last_skip e mantém RUNNING enquanto há mais páginas', () => {
    const outcome = computeBatchOutcome({
      created: 20,
      updated: 5,
      errors: 0,
      missingCardEvents: 3,
      processedDelta: 25,
      previousProcessed: 100,
      previousCreated: 80,
      previousUpdated: 10,
      previousErrors: 1,
      previousMissing: 2,
      previousSkip: 100,
      batchSize: 25,
      fetchedCount: 25,
      cancelRequested: false,
    })

    expect(outcome.last_skip).toBe(125)
    expect(outcome.processed).toBe(125)
    expect(outcome.created_count).toBe(100)
    expect(outcome.updated_count).toBe(15)
    expect(outcome.has_more).toBe(true)
    expect(outcome.status).toBe('RUNNING')
  })

  it('marca COMPLETED quando lote menor que batchSize', () => {
    const outcome = computeBatchOutcome({
      created: 2,
      updated: 1,
      errors: 0,
      missingCardEvents: 0,
      processedDelta: 3,
      previousProcessed: 50,
      previousCreated: 40,
      previousUpdated: 10,
      previousErrors: 0,
      previousMissing: 0,
      previousSkip: 50,
      batchSize: 25,
      fetchedCount: 3,
      cancelRequested: false,
    })
    expect(outcome.has_more).toBe(false)
    expect(outcome.status).toBe('COMPLETED')
  })

  it('marca CANCELLED quando cancelRequested', () => {
    const outcome = computeBatchOutcome({
      created: 0,
      updated: 0,
      errors: 0,
      missingCardEvents: 0,
      processedDelta: 0,
      previousProcessed: 10,
      previousCreated: 10,
      previousUpdated: 0,
      previousErrors: 0,
      previousMissing: 0,
      previousSkip: 10,
      batchSize: 25,
      fetchedCount: 25,
      cancelRequested: true,
    })
    expect(outcome.status).toBe('CANCELLED')
    expect(outcome.has_more).toBe(false)
  })
})

describe('partitionDeckResults (erro isolado + anti-duplicata lógica)', () => {
  it('erro em um deck não interrompe os demais', () => {
    const seen = new Set<string>()
    const result = partitionDeckResults(
      [{ id: 'a' }, { id: 'b' }, { id: 'a' }, { id: 'c' }],
      (item) => {
        if (item.id === 'b') return { ok: false, error: 'falha b' }
        if (seen.has(item.id)) return { ok: true, created: false }
        seen.add(item.id)
        return { ok: true, created: true }
      },
    )

    expect(result.created).toBe(2)
    expect(result.updated).toBe(1)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]?.error).toBe('falha b')
    expect(result.successIndexes).toEqual([0, 2, 3])
  })

  it('exceção em um item vira erro sem rollback dos sucessos anteriores', () => {
    const result = partitionDeckResults([1, 2, 3], (n) => {
      if (n === 2) throw new Error('boom')
      return { ok: true, created: true }
    })
    expect(result.created).toBe(2)
    expect(result.errors).toHaveLength(1)
  })
})

describe('fetchWithRetry / rate limit', () => {
  it('retenta em HTTP 429 e depois sucede', async () => {
    const responses = [
      new Response('rate', { status: 429 }),
      new Response('ok', { status: 200 }),
    ]
    const fetchImpl = vi.fn(async () => responses.shift()!)
    const sleepImpl = vi.fn(async () => undefined)

    const res = await fetchWithRetry('https://example.test', {
      fetchImpl: fetchImpl as unknown as typeof fetch,
      sleepImpl,
      maxAttempts: 3,
      baseDelayMs: 10,
    })

    expect(res.status).toBe(200)
    expect(fetchImpl).toHaveBeenCalledTimes(2)
    expect(sleepImpl).toHaveBeenCalled()
  })

  it('não faz retry infinito: esgota tentativas em 500', async () => {
    const fetchImpl = vi.fn(async () => new Response('err', { status: 500 }))
    const sleepImpl = vi.fn(async () => undefined)

    const res = await fetchWithRetry('https://example.test', {
      fetchImpl: fetchImpl as unknown as typeof fetch,
      sleepImpl,
      maxAttempts: 3,
      baseDelayMs: 1,
    })

    expect(res.status).toBe(500)
    expect(fetchImpl).toHaveBeenCalledTimes(3)
  })
})

describe('helpers auxiliares', () => {
  it('monta URL paginada e coleta nomes únicos', () => {
    expect(mdmTopDecksUrl(50, 25)).toContain('skip=50')
    expect(mdmTopDecksUrl(50, 25)).toContain('limit=25')
    expect(collectUniqueCardNames([sampleDeck]).sort()).toEqual(
      [
        'Ash Blossom & Joyous Spring',
        'Called by the Grave',
        'Divine Arsenal AA-ZEUS - Sky Thunder',
        'Unknown Card XYZ',
      ].sort(),
    )
  })
})
