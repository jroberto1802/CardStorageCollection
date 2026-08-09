export type SyncedDeckZone = 'main' | 'extra' | 'side'
export type DeckSyncRunStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'

export interface MdmCardRef {
  _id?: string
  name?: string
  rarity?: string
}

export interface MdmDeckEntry {
  card?: MdmCardRef
  amount?: number
}

export interface MdmDeck {
  _id?: string
  author?: { _id?: string; username?: string }
  created?: string
  main?: MdmDeckEntry[]
  extra?: MdmDeckEntry[]
  side?: MdmDeckEntry[]
  url?: string
  deckType?: { name?: string }
  rankedType?: { name?: string }
}

export interface ResolvedCardRow {
  zone: SyncedDeckZone
  quantity: number
  card_id: number | null
  language: 'en' | 'pt' | null
  mdm_card_id: string | null
  mdm_card_name: string
  mdm_rarity: string | null
}

export interface DeckUpsertPayload {
  source: 'mdm'
  external_id: string
  name: string
  author_name: string | null
  author_external_id: string | null
  deck_type: string | null
  ranked_type: string | null
  source_url: string | null
  source_created_at: string | null
  language: 'en' | 'pt'
  missing_card_count: number
}

export function normalizeMdmDeckList(payload: unknown): MdmDeck[] {
  if (Array.isArray(payload)) return payload as MdmDeck[]
  if (payload && typeof payload === 'object') return [payload as MdmDeck]
  return []
}

export function buildNameLookup(
  rows: Array<{ id: number; name: string; language: 'en' | 'pt' }>,
  preferredLanguage: 'en' | 'pt',
): Map<string, { id: number; language: 'en' | 'pt' }> {
  const map = new Map<string, { id: number; language: 'en' | 'pt' }>()
  const preferredFirst = [...rows].sort((a, b) => {
    if (a.language === preferredLanguage && b.language !== preferredLanguage) return -1
    if (b.language === preferredLanguage && a.language !== preferredLanguage) return 1
    if (a.language === 'en' && b.language !== 'en') return -1
    if (b.language === 'en' && a.language !== 'en') return 1
    return 0
  })

  for (const row of preferredFirst) {
    const key = row.name.trim().toLowerCase()
    if (!key || map.has(key)) continue
    map.set(key, { id: row.id, language: row.language })
  }
  return map
}

export function collectUniqueCardNames(decks: MdmDeck[]): string[] {
  const names = new Set<string>()
  for (const deck of decks) {
    for (const zone of ['main', 'extra', 'side'] as const) {
      for (const entry of deck[zone] ?? []) {
        const name = entry.card?.name?.trim()
        if (name) names.add(name)
      }
    }
  }
  return [...names]
}

export function deckDisplayName(deck: MdmDeck): string {
  const type = deck.deckType?.name?.trim()
  const author = deck.author?.username?.trim()
  if (type && author) return `${type} — ${author}`
  if (type) return type
  if (author) return `Deck — ${author}`
  if (deck._id) return `MDM ${deck._id}`
  return 'Deck MDM'
}

export function resolveDeckCards(
  deck: MdmDeck,
  lookup: Map<string, { id: number; language: 'en' | 'pt' }>,
): { rows: ResolvedCardRow[]; missingCount: number } {
  const rows: ResolvedCardRow[] = []
  let missingCount = 0

  for (const zone of ['main', 'extra', 'side'] as const) {
    for (const entry of deck[zone] ?? []) {
      const name = entry.card?.name?.trim()
      if (!name) continue
      const quantity = Math.max(1, Number(entry.amount) || 1)
      const hit = lookup.get(name.toLowerCase())
      if (!hit) missingCount += 1
      rows.push({
        zone,
        quantity,
        card_id: hit?.id ?? null,
        language: hit?.language ?? null,
        mdm_card_id: entry.card?._id ?? null,
        mdm_card_name: name,
        mdm_rarity: entry.card?.rarity ?? null,
      })
    }
  }

  return { rows, missingCount }
}

export function buildDeckUpsertPayload(
  deck: MdmDeck,
  language: 'en' | 'pt',
  missingCardCount: number,
): DeckUpsertPayload | null {
  const externalId = deck._id?.trim()
  if (!externalId) return null

  const path = deck.url?.startsWith('http')
    ? deck.url
    : deck.url
      ? `https://www.masterduelmeta.com${deck.url}`
      : null

  return {
    source: 'mdm',
    external_id: externalId,
    name: deckDisplayName(deck),
    author_name: deck.author?.username?.trim() || null,
    author_external_id: deck.author?._id?.trim() || null,
    deck_type: deck.deckType?.name?.trim() || null,
    ranked_type: deck.rankedType?.name?.trim() || null,
    source_url: path,
    source_created_at: deck.created ?? null,
    language,
    missing_card_count: missingCardCount,
  }
}

export function computeBatchOutcome(params: {
  created: number
  updated: number
  errors: number
  missingCardEvents: number
  processedDelta: number
  previousProcessed: number
  previousCreated: number
  previousUpdated: number
  previousErrors: number
  previousMissing: number
  previousSkip: number
  batchSize: number
  fetchedCount: number
  cancelRequested: boolean
}): {
  processed: number
  created_count: number
  updated_count: number
  error_count: number
  missing_card_events: number
  last_skip: number
  has_more: boolean
  status: DeckSyncRunStatus
} {
  const lastSkip = params.previousSkip + params.fetchedCount
  const hasMore =
    !params.cancelRequested && params.fetchedCount >= params.batchSize

  return {
    processed: params.previousProcessed + params.processedDelta,
    created_count: params.previousCreated + params.created,
    updated_count: params.previousUpdated + params.updated,
    error_count: params.previousErrors + params.errors,
    missing_card_events: params.previousMissing + params.missingCardEvents,
    last_skip: lastSkip,
    has_more: hasMore,
    status: params.cancelRequested
      ? 'CANCELLED'
      : hasMore
        ? 'RUNNING'
        : 'COMPLETED',
  }
}

export async function fetchWithRetry(
  url: string,
  options: {
    maxAttempts?: number
    baseDelayMs?: number
    fetchImpl?: typeof fetch
    sleepImpl?: (ms: number) => Promise<void>
  } = {},
): Promise<Response> {
  const maxAttempts = options.maxAttempts ?? 3
  const baseDelayMs = options.baseDelayMs ?? 400
  const fetchImpl = options.fetchImpl ?? fetch
  const sleepImpl =
    options.sleepImpl ?? ((ms: number) => new Promise((r) => setTimeout(r, ms)))

  let lastError: unknown = null

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetchImpl(url, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'CardStorageCollection-MDM-Sync/1.0',
        },
      })

      if (response.status === 429 || response.status >= 500) {
        if (attempt === maxAttempts) return response
        await sleepImpl(baseDelayMs * attempt)
        continue
      }

      return response
    } catch (err) {
      lastError = err
      if (attempt === maxAttempts) throw err
      await sleepImpl(baseDelayMs * attempt)
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Falha ao buscar MDM após retries')
}

export function mdmTopDecksUrl(skip: number, limit: number): string {
  const params = new URLSearchParams({
    skip: String(Math.max(0, skip)),
    limit: String(Math.max(1, limit)),
  })
  return `https://www.masterduelmeta.com/api/v1/top-decks?${params.toString()}`
}

/** Simula resultado de transação por deck: falha isola o deck. */
export function partitionDeckResults<T>(
  items: T[],
  processOne: (item: T) => { ok: true; created: boolean } | { ok: false; error: string },
): {
  created: number
  updated: number
  errors: Array<{ index: number; error: string }>
  successIndexes: number[]
} {
  let created = 0
  let updated = 0
  const errors: Array<{ index: number; error: string }> = []
  const successIndexes: number[] = []

  items.forEach((item, index) => {
    try {
      const result = processOne(item)
      if (!result.ok) {
        errors.push({ index, error: result.error })
        return
      }
      if (result.created) created += 1
      else updated += 1
      successIndexes.push(index)
    } catch (err) {
      errors.push({
        index,
        error: err instanceof Error ? err.message : 'Erro desconhecido',
      })
    }
  })

  return { created, updated, errors, successIndexes }
}
