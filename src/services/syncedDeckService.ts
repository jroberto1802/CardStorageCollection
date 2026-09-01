import { supabase } from '@/lib/supabase'
import { listCollectionItems } from '@/services/collectionService'
import { createDeck } from '@/services/deckService'
import { getCardsByIdsWithFallback } from '@/services/catalogService'
import { getPrimaryImage } from '@/utils/cardHelpers'
import type {
  AppLanguage,
  CollectionItem,
  CommunityMissingCardRank,
  DeckZone,
  ImportSyncedDeckResult,
  SyncedDeck,
  SyncedDeckCardRow,
  SyncedDeckDetail,
  SyncedDeckSummary,
} from '@/types'
import {
  MAX_COPIES_PER_CARD,
  MAX_EXTRA_DECK,
  MAX_MAIN_DECK,
  MAX_SIDE_DECK,
} from '@/types'

function mapSyncedDeck(row: Record<string, unknown>): SyncedDeck {
  return {
    id: String(row.id),
    source: String(row.source ?? 'mdm'),
    external_id: String(row.external_id),
    name: String(row.name),
    author_name: (row.author_name as string | null) ?? null,
    author_external_id: (row.author_external_id as string | null) ?? null,
    deck_type: (row.deck_type as string | null) ?? null,
    ranked_type: (row.ranked_type as string | null) ?? null,
    source_url: (row.source_url as string | null) ?? null,
    source_created_at: (row.source_created_at as string | null) ?? null,
    language: row.language as AppLanguage,
    missing_card_count: Number(row.missing_card_count ?? 0),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  }
}

/** Soma quantity da coleção por card_id (impressões diferentes contam juntas). */
export function ownedQuantityByCardId(
  items: CollectionItem[],
): Map<number, number> {
  const map = new Map<number, number>()
  for (const item of items) {
    if (item.quantity <= 0) continue
    map.set(item.card_id, (map.get(item.card_id) ?? 0) + item.quantity)
  }
  return map
}

export type OwnershipLine = {
  cardId: number | null | undefined
  quantity: number
}

/**
 * Posse por cópias: owned = min(exigido, possui) por card_id;
 * total = soma de todas as slots (com repetições). Unresolved entram no total, não no owned.
 */
export function computeOwnership(
  lines: OwnershipLine[],
  ownedQty: Map<number, number>,
): { ownedCount: number; totalCount: number; unresolvedCount: number } {
  let totalCount = 0
  let unresolvedCount = 0
  const requiredByCard = new Map<number, number>()

  for (const line of lines) {
    const qty = Math.max(0, Number(line.quantity) || 0)
    totalCount += qty
    const id = line.cardId
    if (id == null || !Number.isFinite(Number(id))) {
      unresolvedCount += qty
      continue
    }
    const cardId = Number(id)
    requiredByCard.set(cardId, (requiredByCard.get(cardId) ?? 0) + qty)
  }

  let ownedCount = 0
  for (const [cardId, required] of requiredByCard) {
    ownedCount += Math.min(required, ownedQty.get(cardId) ?? 0)
  }

  return { ownedCount, totalCount, unresolvedCount }
}

/** Distribui cópias possuídas nas linhas do deck (main → extra → side). */
export function allocateOwnedCopies(
  lines: Array<{ card_id: number | null; quantity: number; zone: DeckZone }>,
  ownedQty: Map<number, number>,
): number[] {
  const remaining = new Map(ownedQty)
  const zoneOrder: Record<DeckZone, number> = { main: 0, extra: 1, side: 2 }
  const order = lines.map((_, i) => i).sort((a, b) => {
    const za = zoneOrder[lines[a].zone] - zoneOrder[lines[b].zone]
    return za !== 0 ? za : a - b
  })

  const ownedCopies = new Array<number>(lines.length).fill(0)
  for (const i of order) {
    const line = lines[i]
    if (line.card_id == null) continue
    const have = remaining.get(line.card_id) ?? 0
    const take = Math.min(line.quantity, have)
    ownedCopies[i] = take
    remaining.set(line.card_id, have - take)
  }
  return ownedCopies
}

function zoneLimit(zone: DeckZone): number {
  if (zone === 'extra') return MAX_EXTRA_DECK
  if (zone === 'side') return MAX_SIDE_DECK
  return MAX_MAIN_DECK
}

export async function countSyncedDecks(): Promise<number> {
  const { count, error } = await supabase
    .from('synced_decks')
    .select('id', { count: 'exact', head: true })

  if (error) throw new Error(error.message)
  return count ?? 0
}

function sanitizeIlikeTerm(value: string): string {
  return value.replace(/[%_,.()]/g, ' ').replace(/\s+/g, ' ').trim()
}

/** IDs de decks que contêm a carta (por card_id e/ou nome MDM). */
export async function findSyncedDeckIdsContainingCard(params: {
  cardIds?: number[]
  cardName?: string
}): Promise<string[]> {
  const cardIds = [...new Set((params.cardIds ?? []).filter((id) => Number.isFinite(id)))]
  const cardName = sanitizeIlikeTerm(params.cardName ?? '')

  if (cardIds.length === 0 && !cardName) return []

  const ids = new Set<string>()
  let from = 0

  for (let round = 0; round < MAX_PAGE_ROUNDS; round += 1) {
    let cardQuery = supabase
      .from('synced_deck_cards')
      .select('deck_id')
      .order('id', { ascending: true })
      .range(from, from + PAGE_FETCH - 1)

    if (cardIds.length > 0 && cardName) {
      const idList = cardIds.join(',')
      cardQuery = cardQuery.or(
        `card_id.in.(${idList}),mdm_card_name.ilike.%${cardName}%`,
      )
    } else if (cardIds.length > 0) {
      cardQuery = cardQuery.in('card_id', cardIds)
    } else {
      cardQuery = cardQuery.ilike('mdm_card_name', `%${cardName}%`)
    }

    const { data, error } = await cardQuery
    if (error) throw new Error(error.message)
    if (!data?.length) break

    for (const row of data) {
      ids.add(String((row as { deck_id: string }).deck_id))
    }
    if (data.length < PAGE_FETCH) break
    from += PAGE_FETCH
  }

  return [...ids]
}

const PAGE_FETCH = 1000
const MAX_PAGE_ROUNDS = 200

type SyncedCardAggRow = {
  deck_id: string
  card_id: number | null
  zone: DeckZone
  quantity: number
}

function mapCardAggRow(row: Record<string, unknown>): SyncedCardAggRow {
  const cardIdRaw = row.card_id
  return {
    deck_id: String(row.deck_id),
    card_id:
      cardIdRaw == null || !Number.isFinite(Number(cardIdRaw))
        ? null
        : Number(cardIdRaw),
    zone: row.zone as DeckZone,
    quantity: Math.max(1, Number(row.quantity) || 1),
  }
}

/** Coleção leve: só card_id + quantity (evita puxar colunas extras). */
async function fetchOwnedQuantityMap(): Promise<Map<number, number>> {
  const map = new Map<number, number>()
  let from = 0

  for (let round = 0; round < MAX_PAGE_ROUNDS; round += 1) {
    const { data, error } = await supabase
      .from('collection_items')
      .select('card_id, quantity')
      .order('id', { ascending: true })
      .range(from, from + PAGE_FETCH - 1)

    if (error) throw new Error(error.message)
    if (!data?.length) break

    for (const row of data) {
      const cardId = Number((row as { card_id: number }).card_id)
      const qty = Number((row as { quantity: number }).quantity) || 0
      if (!Number.isFinite(cardId) || qty <= 0) continue
      map.set(cardId, (map.get(cardId) ?? 0) + qty)
    }

    if (data.length < PAGE_FETCH) break
    from += PAGE_FETCH
  }

  return map
}

async function fetchSyncedDecksPage(params: {
  deckIds?: string[]
  search?: string
  deckType?: string
  from: number
  pageSize: number
}): Promise<SyncedDeck[]> {
  let query = supabase
    .from('synced_decks')
    .select('*')
    .order('id', { ascending: true })
    .range(params.from, params.from + params.pageSize - 1)

  if (params.deckIds) {
    query = query.in('id', params.deckIds)
  }

  const search = params.search?.trim()
  if (search) {
    const safe = sanitizeIlikeTerm(search)
    if (safe) {
      const pattern = `%${safe}%`
      query = query.or(
        `name.ilike.${pattern},author_name.ilike.${pattern},deck_type.ilike.${pattern}`,
      )
    }
  }

  const deckType = params.deckType?.trim()
  if (deckType) {
    query = query.ilike('deck_type', deckType)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => mapSyncedDeck(row as Record<string, unknown>))
}

async function fetchAllSyncedDecksMatching(params: {
  deckIdFilter: string[] | null
  search?: string
  deckType?: string
}): Promise<SyncedDeck[]> {
  const idChunkSize = 100

  async function fetchAllPages(deckIds?: string[]): Promise<SyncedDeck[]> {
    const decks: SyncedDeck[] = []
    let from = 0
    for (let round = 0; round < MAX_PAGE_ROUNDS; round += 1) {
      const batch = await fetchSyncedDecksPage({
        deckIds,
        search: params.search,
        deckType: params.deckType,
        from,
        pageSize: PAGE_FETCH,
      })
      if (batch.length === 0) break
      decks.push(...batch)
      if (batch.length < PAGE_FETCH) break
      from += PAGE_FETCH
    }
    return decks
  }

  if (!params.deckIdFilter) {
    return fetchAllPages()
  }

  const decks: SyncedDeck[] = []
  for (let i = 0; i < params.deckIdFilter.length; i += idChunkSize) {
    const idChunk = params.deckIdFilter.slice(i, i + idChunkSize)
    decks.push(...(await fetchAllPages(idChunk)))
  }
  return decks
}

/**
 * Busca linhas de cartas com order estável (evita loop infinito do .range sem order)
 * e páginas em paralelo após o count.
 */
async function fetchSyncedDeckCardRows(
  deckIds: string[],
): Promise<SyncedCardAggRow[]> {
  if (deckIds.length === 0) return []

  const wanted = new Set(deckIds)
  // Se há poucos decks, filtra no servidor; se muitos, varre a tabela e filtra no cliente.
  const useServerFilter = deckIds.length <= 80

  if (useServerFilter) {
    const rows: SyncedCardAggRow[] = []
    let from = 0
    for (let round = 0; round < MAX_PAGE_ROUNDS; round += 1) {
      const { data, error } = await supabase
        .from('synced_deck_cards')
        .select('deck_id, card_id, zone, quantity')
        .in('deck_id', deckIds)
        .order('id', { ascending: true })
        .range(from, from + PAGE_FETCH - 1)

      if (error) throw new Error(error.message)
      if (!data?.length) break

      for (const row of data) {
        rows.push(mapCardAggRow(row as Record<string, unknown>))
      }
      if (data.length < PAGE_FETCH) break
      from += PAGE_FETCH
    }
    return rows
  }

  const { count, error: countError } = await supabase
    .from('synced_deck_cards')
    .select('id', { count: 'exact', head: true })

  if (countError) throw new Error(countError.message)
  const total = count ?? 0
  if (total === 0) return []

  const pageCount = Math.min(MAX_PAGE_ROUNDS, Math.ceil(total / PAGE_FETCH))
  const pages = await Promise.all(
    Array.from({ length: pageCount }, async (_, pageIndex) => {
      const from = pageIndex * PAGE_FETCH
      const { data, error } = await supabase
        .from('synced_deck_cards')
        .select('deck_id, card_id, zone, quantity')
        .order('id', { ascending: true })
        .range(from, from + PAGE_FETCH - 1)

      if (error) throw new Error(error.message)
      return (data ?? []).map((row) =>
        mapCardAggRow(row as Record<string, unknown>),
      )
    }),
  )

  const rows: SyncedCardAggRow[] = []
  for (const page of pages) {
    for (const row of page) {
      if (wanted.has(row.deck_id)) rows.push(row)
    }
  }
  return rows
}

function ownershipRatio(owned: number, total: number): number {
  if (total <= 0) return 0
  return owned / total
}

/** Ordena por cópias possuídas (desc), depois % posse, depois updated_at. */
export function sortSyncedDecksByOwned(items: SyncedDeckSummary[]): SyncedDeckSummary[] {
  return [...items].sort((a, b) => {
    if (b.ownedCount !== a.ownedCount) return b.ownedCount - a.ownedCount
    const ratioDiff =
      ownershipRatio(b.ownedCount, b.totalCount) -
      ownershipRatio(a.ownedCount, a.totalCount)
    if (ratioDiff !== 0) return ratioDiff
    return b.updated_at.localeCompare(a.updated_at)
  })
}

function buildSummaries(
  decks: SyncedDeck[],
  cardRows: SyncedCardAggRow[],
  ownedQty: Map<number, number>,
): SyncedDeckSummary[] {
  type Agg = {
    main: number
    extra: number
    side: number
    lines: OwnershipLine[]
  }
  const byDeck = new Map<string, Agg>()

  for (const row of cardRows) {
    const agg = byDeck.get(row.deck_id) ?? {
      main: 0,
      extra: 0,
      side: 0,
      lines: [],
    }

    if (row.zone === 'extra') agg.extra += row.quantity
    else if (row.zone === 'side') agg.side += row.quantity
    else agg.main += row.quantity

    agg.lines.push({ cardId: row.card_id, quantity: row.quantity })
    byDeck.set(row.deck_id, agg)
  }

  return decks.map((deck) => {
    const agg = byDeck.get(deck.id) ?? {
      main: 0,
      extra: 0,
      side: 0,
      lines: [],
    }
    const ownership = computeOwnership(agg.lines, ownedQty)
    return {
      ...deck,
      mainCount: agg.main,
      extraCount: agg.extra,
      sideCount: agg.side,
      ownedCount: ownership.ownedCount,
      totalCount: ownership.totalCount,
      unresolvedCount: ownership.unresolvedCount,
    }
  })
}

async function fetchSyncedDecksPageByUpdatedAt(params: {
  deckIds?: string[]
  search?: string
  deckType?: string
  from: number
  pageSize: number
}): Promise<{ decks: SyncedDeck[]; total: number }> {
  let query = supabase
    .from('synced_decks')
    .select('*', { count: 'exact' })
    .order('updated_at', { ascending: false })
    .range(params.from, params.from + params.pageSize - 1)

  if (params.deckIds) {
    query = query.in('id', params.deckIds)
  }

  const search = params.search?.trim()
  if (search) {
    const safe = sanitizeIlikeTerm(search)
    if (safe) {
      const pattern = `%${safe}%`
      query = query.or(
        `name.ilike.${pattern},author_name.ilike.${pattern},deck_type.ilike.${pattern}`,
      )
    }
  }

  const deckType = params.deckType?.trim()
  if (deckType) {
    query = query.ilike('deck_type', deckType)
  }

  const { data, error, count } = await query
  if (error) throw new Error(error.message)

  return {
    decks: (data ?? []).map((row) => mapSyncedDeck(row as Record<string, unknown>)),
    total: count ?? 0,
  }
}

export async function listSyncedDecks(params: {
  search?: string
  deckType?: string
  /** Filtra decks que contêm esta carta (catálogo). */
  containsCardId?: number
  /** IDs extras (ex.: variantes PT/EN do mesmo nome). */
  containsCardIds?: number[]
  /** Também casa por mdm_card_name (cartas sem card_id). */
  containsCardName?: string
  /** Quando true, ordena todos os resultados por posse (mais lento). */
  sortByOwned?: boolean
  page?: number
  pageSize?: number
}): Promise<{ items: SyncedDeckSummary[]; total: number }> {
  const page = Math.max(1, params.page ?? 1)
  const pageSize = Math.min(60, Math.max(1, params.pageSize ?? 24))
  const from = (page - 1) * pageSize
  const sortByOwned = Boolean(params.sortByOwned)

  const cardIds = [
    ...new Set(
      [
        ...(params.containsCardId != null ? [params.containsCardId] : []),
        ...(params.containsCardIds ?? []),
      ].filter((id) => Number.isFinite(id)),
    ),
  ]
  const cardName = params.containsCardName?.trim()

  let deckIdFilter: string[] | null = null
  if (cardIds.length > 0 || cardName) {
    deckIdFilter = await findSyncedDeckIdsContainingCard({
      cardIds,
      cardName,
    })
    if (deckIdFilter.length === 0) {
      return { items: [], total: 0 }
    }
  }

  // Caminho lento: precisa de todos os decks + cartas para ordenar por posse.
  if (sortByOwned) {
    const decks = await fetchAllSyncedDecksMatching({
      deckIdFilter,
      search: params.search,
      deckType: params.deckType,
    })

    if (decks.length === 0) {
      return { items: [], total: 0 }
    }

    const [cardRows, ownedQty] = await Promise.all([
      fetchSyncedDeckCardRows(decks.map((d) => d.id)),
      fetchOwnedQuantityMap(),
    ])

    const summaries = buildSummaries(decks, cardRows, ownedQty)
    const sorted = sortSyncedDecksByOwned(summaries)
    return {
      items: sorted.slice(from, from + pageSize),
      total: sorted.length,
    }
  }

  // Caminho rápido: pagina no banco; posse só da página atual (badge).
  // Com filtro de carta e muitos IDs, pagina em memória só esses IDs filtrados.
  if (deckIdFilter && deckIdFilter.length > 80) {
    const decks = await fetchAllSyncedDecksMatching({
      deckIdFilter,
      search: params.search,
      deckType: params.deckType,
    })
    decks.sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    const pageDecks = decks.slice(from, from + pageSize)
    if (pageDecks.length === 0) {
      return { items: [], total: decks.length }
    }

    const [cardRows, ownedQty] = await Promise.all([
      fetchSyncedDeckCardRows(pageDecks.map((d) => d.id)),
      fetchOwnedQuantityMap(),
    ])

    return {
      items: buildSummaries(pageDecks, cardRows, ownedQty),
      total: decks.length,
    }
  }

  const { decks, total } = await fetchSyncedDecksPageByUpdatedAt({
    deckIds: deckIdFilter ?? undefined,
    search: params.search,
    deckType: params.deckType,
    from,
    pageSize,
  })

  if (decks.length === 0) {
    return { items: [], total }
  }

  const [cardRows, ownedQty] = await Promise.all([
    fetchSyncedDeckCardRows(decks.map((d) => d.id)),
    fetchOwnedQuantityMap(),
  ])

  return {
    items: buildSummaries(decks, cardRows, ownedQty),
    total,
  }
}

export async function getSyncedDeck(id: string): Promise<SyncedDeckDetail | null> {
  const { data, error } = await supabase
    .from('synced_decks')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null

  const deck = mapSyncedDeck(data as Record<string, unknown>)

  const { data: cardRows, error: cardsError } = await supabase
    .from('synced_deck_cards')
    .select('*')
    .eq('deck_id', id)
    .order('zone', { ascending: true })

  if (cardsError) throw new Error(cardsError.message)

  const rows = (cardRows ?? []) as Array<Record<string, unknown>>
  const resolvedIds = [
    ...new Set(
      rows
        .map((r) => Number(r.card_id))
        .filter((n) => Number.isFinite(n) && n > 0),
    ),
  ]

  const catalog = await getCardsByIdsWithFallback(deck.language, resolvedIds)
  const byId = new Map(catalog.map((c) => [c.id, c]))

  const ownedItems = await listCollectionItems()
  const ownedQty = ownedQuantityByCardId(ownedItems)

  const baseRows = rows.map((row) => {
    const cardId =
      row.card_id == null || !Number.isFinite(Number(row.card_id))
        ? null
        : Number(row.card_id)
    const quantity = Math.max(1, Number(row.quantity) || 1)
    const zone = row.zone as DeckZone
    return { card_id: cardId, quantity, zone, row }
  })

  const ownedCopiesList = allocateOwnedCopies(
    baseRows.map(({ card_id, quantity, zone }) => ({ card_id, quantity, zone })),
    ownedQty,
  )

  const cards: SyncedDeckCardRow[] = baseRows.map((entry, index) => {
    const { card_id: cardId, quantity, zone, row } = entry
    const catalogCard = cardId != null ? byId.get(cardId) : undefined
    const images = catalogCard ? getPrimaryImage(catalogCard) : { full: null, small: null }
    const lang =
      (row.language as AppLanguage | null) ??
      catalogCard?.language ??
      null
    const ownedCopies = ownedCopiesList[index] ?? 0

    return {
      id: String(row.id),
      deck_id: String(row.deck_id),
      card_id: cardId,
      language: lang,
      zone,
      quantity,
      mdm_card_id: (row.mdm_card_id as string | null) ?? null,
      mdm_card_name: String(row.mdm_card_name ?? ''),
      mdm_rarity: (row.mdm_rarity as string | null) ?? null,
      name: catalogCard?.name ?? String(row.mdm_card_name ?? 'Carta desconhecida'),
      type: catalogCard?.type ?? null,
      frameType: catalogCard?.frame_type ?? null,
      race: catalogCard?.race ?? null,
      imageUrl: images.full,
      imageUrlSmall: images.small,
      ownedCopies,
      owned: ownedCopies > 0,
    }
  })

  let mainCount = 0
  let extraCount = 0
  let sideCount = 0
  for (const card of cards) {
    if (card.zone === 'extra') extraCount += card.quantity
    else if (card.zone === 'side') sideCount += card.quantity
    else mainCount += card.quantity
  }

  const ownership = computeOwnership(
    cards.map((c) => ({ cardId: c.card_id, quantity: c.quantity })),
    ownedQty,
  )

  return {
    ...deck,
    mainCount,
    extraCount,
    sideCount,
    ownedCount: ownership.ownedCount,
    totalCount: ownership.totalCount,
    unresolvedCount: ownership.unresolvedCount,
    cards,
  }
}

export async function importSyncedDeckToUserDeck(
  syncedDeckId: string,
  language: AppLanguage,
): Promise<ImportSyncedDeckResult> {
  const detail = await getSyncedDeck(syncedDeckId)
  if (!detail) throw new Error('Deck da comunidade não encontrado')

  const userDeck = await createDeck(language, detail.name)

  const zoneCounts: Record<DeckZone, number> = {
    main: 0,
    extra: 0,
    side: 0,
  }
  const copiesByCard = new Map<number, number>()

  let inserted = 0
  let skippedUnresolved = 0
  let cappedCopies = 0
  let truncatedByLimit = 0

  const insertRows: Array<{
    deck_id: string
    card_id: number
    language: AppLanguage
    zone: DeckZone
    position: number
  }> = []

  for (const card of detail.cards) {
    if (card.card_id == null || !card.language) {
      skippedUnresolved += card.quantity
      continue
    }

    const zone = card.zone
    const limit = zoneLimit(zone)
    let qty = card.quantity

    const already = copiesByCard.get(card.card_id) ?? 0
    const allowedByCopies = Math.max(0, MAX_COPIES_PER_CARD - already)
    if (qty > allowedByCopies) {
      cappedCopies += qty - allowedByCopies
      qty = allowedByCopies
    }
    if (qty <= 0) continue

    const room = Math.max(0, limit - zoneCounts[zone])
    if (qty > room) {
      truncatedByLimit += qty - room
      qty = room
    }
    if (qty <= 0) continue

    for (let i = 0; i < qty; i += 1) {
      insertRows.push({
        deck_id: userDeck.id,
        card_id: card.card_id,
        language: card.language,
        zone,
        position: zoneCounts[zone],
      })
      zoneCounts[zone] += 1
      copiesByCard.set(card.card_id, (copiesByCard.get(card.card_id) ?? 0) + 1)
      inserted += 1
    }
  }

  if (insertRows.length > 0) {
    const chunkSize = 200
    for (let i = 0; i < insertRows.length; i += chunkSize) {
      const chunk = insertRows.slice(i, i + chunkSize)
      const { error } = await supabase.from('deck_cards').insert(chunk)
      if (error) throw new Error(error.message)
    }

    await supabase
      .from('decks')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', userDeck.id)
  }

  return {
    deckId: userDeck.id,
    deckName: userDeck.name,
    inserted,
    skippedUnresolved,
    cappedCopies,
    truncatedByLimit,
  }
}

const MISSING_RANK_CACHE_KEY = 'csc-community-missing-rank-v1'
const MISSING_RANK_CACHE_TTL_MS = 15 * 60 * 1000

type MissingRankCache = {
  at: number
  language: AppLanguage
  items: CommunityMissingCardRank[]
}

function readMissingRankCache(language: AppLanguage): CommunityMissingCardRank[] | null {
  try {
    const raw = sessionStorage.getItem(MISSING_RANK_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as MissingRankCache
    if (parsed.language !== language) return null
    if (Date.now() - parsed.at > MISSING_RANK_CACHE_TTL_MS) return null
    return parsed.items
  } catch {
    return null
  }
}

function writeMissingRankCache(
  language: AppLanguage,
  items: CommunityMissingCardRank[],
): void {
  try {
    const payload: MissingRankCache = { at: Date.now(), language, items }
    sessionStorage.setItem(MISSING_RANK_CACHE_KEY, JSON.stringify(payload))
  } catch {
    // quota / private mode — ignora
  }
}

export function clearCommunityMissingCardRankCache(): void {
  try {
    sessionStorage.removeItem(MISSING_RANK_CACHE_KEY)
  } catch {
    // ignore
  }
}

/**
 * Top cartas nos decks MDM que o usuário não possui (quantity > 0).
 * Usa RPC Postgres; cache de 15 min em sessionStorage.
 */
export async function fetchCommunityMissingCardRanking(
  language: AppLanguage,
  options?: { limit?: number; refresh?: boolean },
): Promise<CommunityMissingCardRank[]> {
  const limit = Math.min(200, Math.max(1, options?.limit ?? 100))
  const refresh = options?.refresh ?? false

  if (!refresh) {
    const cached = readMissingRankCache(language)
    if (cached) return cached
  }

  const { data, error } = await supabase.rpc('get_community_missing_card_ranking', {
    p_limit: limit,
  })

  if (error) {
    const msg = error.message.toLowerCase()
    if (
      msg.includes('get_community_missing_card_ranking') ||
      msg.includes('does not exist') ||
      msg.includes('could not find')
    ) {
      throw new Error(
        'Função de ranking não encontrada. Aplique a migration 007_community_missing_ranking.sql no Supabase.',
      )
    }
    throw new Error(error.message)
  }

  const rows = (data ?? []) as Array<{
    card_id: number
    deck_count: number
    total_copies: number
  }>

  if (rows.length === 0) {
    writeMissingRankCache(language, [])
    return []
  }

  const ids = rows.map((r) => Number(r.card_id)).filter((id) => Number.isFinite(id))
  const catalog = await getCardsByIdsWithFallback(language, ids)
  const byId = new Map(catalog.map((c) => [c.id, c]))

  const items: CommunityMissingCardRank[] = rows.map((row) => {
    const cardId = Number(row.card_id)
    const catalogCard = byId.get(cardId)
    const images = catalogCard ? getPrimaryImage(catalogCard) : { full: null, small: null }
    return {
      cardId,
      deckCount: Number(row.deck_count) || 0,
      totalCopies: Number(row.total_copies) || 0,
      name: catalogCard?.name ?? `Carta #${cardId}`,
      language: catalogCard?.language ?? language,
      imageUrl: images.full,
      imageUrlSmall: images.small,
    }
  })

  writeMissingRankCache(language, items)
  return items
}
