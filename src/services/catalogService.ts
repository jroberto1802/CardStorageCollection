import { supabase } from '@/lib/supabase'
import type {
  AppLanguage,
  Card,
  CardImpression,
  CatalogFilters,
  SortOption,
} from '@/types'
import {
  computeSearchRank,
  expandCardToImpressions,
  looksLikeSetCode,
  matchesFilters,
  normalizeQuery,
  parseCardSets,
  sortImpressions,
} from '@/utils/cardHelpers'

const FETCH_LIMIT = 300
const SET_SCAN_LIMIT = 1000

function mapRow(row: Record<string, unknown>): Card {
  return {
    id: Number(row.id),
    name: String(row.name),
    type: (row.type as string | null) ?? null,
    frame_type: (row.frame_type as string | null) ?? null,
    description: (row.description as string | null) ?? null,
    atk: (row.atk as number | null) ?? null,
    def: (row.def as number | null) ?? null,
    level: (row.level as number | null) ?? null,
    race: (row.race as string | null) ?? null,
    attribute: (row.attribute as string | null) ?? null,
    archetype: (row.archetype as string | null) ?? null,
    scale: (row.scale as number | null) ?? null,
    linkval: (row.linkval as number | null) ?? null,
    linkmarkers: (row.linkmarkers as string[] | null) ?? null,
    ygoprodeck_url: (row.ygoprodeck_url as string | null) ?? null,
    card_images: (row.card_images as Card['card_images']) ?? null,
    card_sets: (row.card_sets as Card['card_sets']) ?? null,
    card_prices: row.card_prices ?? null,
    banlist_info: (row.banlist_info as Card['banlist_info']) ?? null,
    language: row.language as AppLanguage,
    synced_at: String(row.synced_at),
    updated_at: String(row.updated_at),
  }
}

function mergeCards(groups: Card[][]): Card[] {
  const map = new Map<string, Card>()
  for (const group of groups) {
    for (const card of group) {
      map.set(`${card.id}-${card.language}`, card)
    }
  }
  return [...map.values()]
}

async function fetchByExactSetCode(
  language: AppLanguage,
  setCode: string,
): Promise<Card[]> {
  const variants = Array.from(
    new Set([setCode, setCode.toUpperCase(), setCode.toLowerCase()]),
  )

  const results = await Promise.all(
    variants.map(async (code) => {
      const { data, error } = await supabase
        .from('cards')
        .select('*')
        .eq('language', language)
        .contains('card_sets', [{ set_code: code }])
        .limit(FETCH_LIMIT)

      if (error) throw new Error(error.message)
      return (data ?? []).map((row) => mapRow(row as Record<string, unknown>))
    }),
  )

  return mergeCards(results)
}

async function fetchBySetCodePartial(
  language: AppLanguage,
  setCodeQuery: string,
): Promise<Card[]> {
  const q = setCodeQuery.toLowerCase()
  const { data, error } = await supabase
    .from('cards')
    .select('*')
    .eq('language', language)
    .not('card_sets', 'is', null)
    .limit(SET_SCAN_LIMIT)

  if (error) throw new Error(error.message)

  return (data ?? [])
    .map((row) => mapRow(row as Record<string, unknown>))
    .filter((card) =>
      parseCardSets(card.card_sets).some((set) =>
        set.set_code.toLowerCase().includes(q),
      ),
    )
}

async function fetchByNameExact(
  language: AppLanguage,
  name: string,
): Promise<Card[]> {
  const { data, error } = await supabase
    .from('cards')
    .select('*')
    .eq('language', language)
    .ilike('name', name)
    .limit(FETCH_LIMIT)

  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => mapRow(row as Record<string, unknown>))
}

async function fetchByNamePartial(
  language: AppLanguage,
  name: string,
): Promise<Card[]> {
  const { data, error } = await supabase
    .from('cards')
    .select('*')
    .eq('language', language)
    .ilike('name', `%${name}%`)
    .limit(FETCH_LIMIT)

  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => mapRow(row as Record<string, unknown>))
}

async function fetchByDescription(
  language: AppLanguage,
  text: string,
): Promise<Card[]> {
  const { data, error } = await supabase
    .from('cards')
    .select('*')
    .eq('language', language)
    .ilike('description', `%${text}%`)
    .limit(FETCH_LIMIT)

  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => mapRow(row as Record<string, unknown>))
}

async function fetchBrowsePage(
  language: AppLanguage,
  filters: CatalogFilters,
  page: number,
  pageSize: number,
): Promise<Card[]> {
  let query = supabase
    .from('cards')
    .select('*')
    .eq('language', language)
    .order('name', { ascending: true })
    .range(page * pageSize, page * pageSize + pageSize - 1)

  if (filters.attributes.length === 1) {
    query = query.ilike('attribute', filters.attributes[0])
  }

  if (filters.cardCategory === 'spell') {
    query = query.or('type.ilike.%Spell%,type.ilike.%Magia%,type.ilike.%Magic%')
  } else if (filters.cardCategory === 'trap') {
    query = query.or('type.ilike.%Trap%,type.ilike.%Armadilha%')
  } else if (filters.cardCategory === 'monster') {
    query = query.or('type.ilike.%Monster%,type.ilike.%Monstro%,type.ilike.%Token%')
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => mapRow(row as Record<string, unknown>))
}

function toRankedImpressions(cards: Card[], query: string): CardImpression[] {
  return cards.flatMap((card) => {
    const impressions = expandCardToImpressions(card)
    if (!query) return impressions

    return impressions
      .map((item) => ({
        ...item,
        searchRank: computeSearchRank(item, query, card.description),
      }))
      .filter((item) => item.searchRank < 99)
  })
}

export interface CatalogSearchResult {
  items: CardImpression[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

export async function searchCatalog(params: {
  language: AppLanguage
  query: string
  filters: CatalogFilters
  sort: SortOption
  page?: number
  pageSize?: number
}): Promise<CatalogSearchResult> {
  const page = params.page ?? 0
  const pageSize = params.pageSize ?? 24
  const query = normalizeQuery(params.query)

  let impressions: CardImpression[] = []

  if (query) {
    const tasks: Promise<Card[]>[] = [
      fetchByExactSetCode(params.language, query),
      fetchByNameExact(params.language, query),
      fetchByNamePartial(params.language, query),
      fetchByDescription(params.language, query),
    ]

    // Varredura de set_code (parcial/exata) quando o termo parece código de coleção
    if (looksLikeSetCode(query) || query.includes('-') || query.includes('_')) {
      tasks.push(fetchBySetCodePartial(params.language, query))
    }

    const firstBatch = mergeCards(await Promise.all(tasks))

    // Se ainda não achou e o termo é curto alfanumérico, tenta match parcial de set_code
    let cards = firstBatch
    if (
      cards.length === 0 &&
      /^[A-Za-z0-9]{2,12}$/.test(query)
    ) {
      cards = mergeCards([
        firstBatch,
        await fetchBySetCodePartial(params.language, query),
      ])
    }

    impressions = toRankedImpressions(cards, query)
  } else {
    // Navegação do catálogo: carrega um lote maior de cartas e pagina impressões localmente
    const browseCards: Card[] = []
    const cardPageSize = 50
    const pagesToLoad = Math.min(page + 3, 8)

    for (let p = 0; p < pagesToLoad; p += 1) {
      const batch = await fetchBrowsePage(
        params.language,
        params.filters,
        p,
        cardPageSize,
      )
      if (batch.length === 0) break
      browseCards.push(...batch)
      if (batch.length < cardPageSize) break
    }

    impressions = toRankedImpressions(mergeCards([browseCards]), '')
  }

  impressions = impressions.filter((item) => matchesFilters(item, params.filters))
  impressions = sortImpressions(impressions, params.sort)

  const total = impressions.length
  const start = page * pageSize
  const items = impressions.slice(start, start + pageSize)

  return {
    items,
    total,
    page,
    pageSize,
    hasMore: start + pageSize < total,
  }
}

export async function getCardById(
  cardId: number,
  language: AppLanguage,
): Promise<Card | null> {
  const { data, error } = await supabase
    .from('cards')
    .select('*')
    .eq('id', cardId)
    .eq('language', language)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null
  return mapRow(data as Record<string, unknown>)
}

export async function getDistinctSetNames(
  language: AppLanguage,
  search: string,
  limit = 30,
): Promise<string[]> {
  const q = normalizeQuery(search)
  const { data, error } = await supabase
    .from('cards')
    .select('card_sets')
    .eq('language', language)
    .not('card_sets', 'is', null)
    .limit(500)

  if (error) throw new Error(error.message)

  const names = new Set<string>()
  for (const row of data ?? []) {
    for (const set of parseCardSets((row as { card_sets: unknown }).card_sets)) {
      if (!q || set.set_name.toLowerCase().includes(q.toLowerCase())) {
        names.add(set.set_name)
      }
    }
  }

  return [...names].sort((a, b) => a.localeCompare(b, 'pt-BR')).slice(0, limit)
}

export async function getDistinctRarities(language: AppLanguage): Promise<string[]> {
  const { data, error } = await supabase
    .from('cards')
    .select('card_sets')
    .eq('language', language)
    .not('card_sets', 'is', null)
    .limit(500)

  if (error) throw new Error(error.message)

  const rarities = new Set<string>()
  for (const row of data ?? []) {
    for (const set of parseCardSets((row as { card_sets: unknown }).card_sets)) {
      if (set.set_rarity) rarities.add(set.set_rarity)
    }
  }

  return [...rarities].sort((a, b) => a.localeCompare(b, 'en'))
}
