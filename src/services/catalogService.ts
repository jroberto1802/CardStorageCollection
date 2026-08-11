import { supabase } from '@/lib/supabase'
import type {
  AppLanguage,
  Card,
  CardImpression,
  CatalogFilters,
  SortOption,
} from '@/types'
import {
  cardToCatalogItem,
  looksLikeSetCode,
  matchesCardFilters,
  normalizeQuery,
  parseCardSets,
  sortImpressions,
} from '@/utils/cardHelpers'

const FETCH_LIMIT = 300
const SET_SCAN_LIMIT = 1000

/** Só caracteres seguros para filtro JSON de set_code */
function sanitizeSetCode(value: string): string | null {
  const cleaned = value.trim()
  if (!cleaned) return null
  if (!/^[A-Za-z0-9][A-Za-z0-9\-_.]{0,31}$/.test(cleaned)) return null
  return cleaned
}

/** Remove curingas do ILIKE para evitar padrões acidentais */
function sanitizeIlike(value: string): string {
  return value.trim().replace(/[%_]/g, '')
}

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

/**
 * Prefere cartas do idioma principal; inclui fallback só quando o id não existe no principal.
 * Uso típico: preferred=PT, fallback=EN.
 */
export function mergePreferLanguage(preferred: Card[], fallback: Card[]): Card[] {
  const map = new Map<number, Card>()
  for (const card of preferred) {
    map.set(card.id, card)
  }
  for (const card of fallback) {
    if (!map.has(card.id)) {
      map.set(card.id, card)
    }
  }
  return [...map.values()]
}

async function fetchByExactSetCode(
  language: AppLanguage,
  setCode: string,
): Promise<Card[]> {
  const safe = sanitizeSetCode(setCode)
  if (!safe) return []

  const variants = Array.from(
    new Set([safe, safe.toUpperCase(), safe.toLowerCase()]),
  )

  const results = await Promise.all(
    variants.map(async (code) => {
      try {
        const payload = JSON.stringify([{ set_code: code }])
        const { data, error } = await supabase
          .from('cards')
          .select('*')
          .eq('language', language)
          .filter('card_sets', 'cs', payload)
          .limit(FETCH_LIMIT)

        if (error) {
          console.warn('fetchByExactSetCode:', error.message)
          return []
        }
        return (data ?? []).map((row) => mapRow(row as Record<string, unknown>))
      } catch (err) {
        console.warn('fetchByExactSetCode failed:', err)
        return []
      }
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

async function fetchByArchetype(
  language: AppLanguage,
  text: string,
): Promise<Card[]> {
  const safe = sanitizeIlike(text)
  if (!safe) return []

  const { data, error } = await supabase
    .from('cards')
    .select('*')
    .eq('language', language)
    .ilike('archetype', `%${safe}%`)
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

  const archetype = sanitizeIlike(filters.archetype)
  if (archetype) {
    query = query.ilike('archetype', `%${archetype}%`)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => mapRow(row as Record<string, unknown>))
}

async function searchCardsInLanguage(
  language: AppLanguage,
  query: string,
): Promise<Card[]> {
  if (!query) return []

  const tasks: Promise<Card[]>[] = [
    fetchByNameExact(language, query),
    fetchByNamePartial(language, query),
    fetchByDescription(language, query),
    fetchByArchetype(language, query),
  ]

  const safeSetCode = sanitizeSetCode(query)
  if (safeSetCode && (looksLikeSetCode(query) || query.includes('-') || query.includes('_'))) {
    tasks.push(fetchByExactSetCode(language, safeSetCode))
    tasks.push(fetchBySetCodePartial(language, query))
  } else if (safeSetCode && /^[A-Za-z0-9]{2,12}$/.test(query)) {
    tasks.push(fetchByExactSetCode(language, safeSetCode))
  }

  let cards = mergeCards(await Promise.all(tasks))

  if (cards.length === 0 && safeSetCode && /^[A-Za-z0-9]{2,12}$/.test(query)) {
    cards = mergeCards([cards, await fetchBySetCodePartial(language, query)])
  }

  return cards
}

async function browseCardsInLanguage(
  language: AppLanguage,
  filters: CatalogFilters,
  page: number,
): Promise<Card[]> {
  const browseCards: Card[] = []
  const cardPageSize = 50
  const pagesToLoad = Math.min(page + 3, 8)

  for (let p = 0; p < pagesToLoad; p += 1) {
    const batch = await fetchBrowsePage(language, filters, p, cardPageSize)
    if (batch.length === 0) break
    browseCards.push(...batch)
    if (batch.length < cardPageSize) break
  }

  return mergeCards([browseCards])
}

/** Uma entrada por carta (não por set code) */
function toCatalogItems(cards: Card[], query: string): CardImpression[] {
  return cards
    .map((card) => cardToCatalogItem(card, query))
    .filter((item): item is CardImpression => item !== null)
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

  let cards: Card[] = []

  if (query) {
    if (params.language === 'pt') {
      // PT preferencial; cartas sem tradução entram em inglês
      const [ptCards, enCards] = await Promise.all([
        searchCardsInLanguage('pt', query),
        searchCardsInLanguage('en', query),
      ])
      cards = mergePreferLanguage(ptCards, enCards)
    } else {
      cards = await searchCardsInLanguage('en', query)
    }
  } else if (params.language === 'pt') {
    const [ptCards, enCards] = await Promise.all([
      browseCardsInLanguage('pt', params.filters, page),
      browseCardsInLanguage('en', params.filters, page),
    ])
    cards = mergePreferLanguage(ptCards, enCards)
  } else {
    cards = await browseCardsInLanguage('en', params.filters, page)
  }

  cards = cards.filter((card) => matchesCardFilters(card, params.filters))

  let items = toCatalogItems(cards, query)
  items = sortImpressions(items, params.sort)

  const total = items.length
  const start = page * pageSize
  const pageItems = items.slice(start, start + pageSize)

  return {
    items: pageItems,
    total,
    page,
    pageSize,
    hasMore: start + pageSize < total,
  }
}

export async function getCardById(
  cardId: number,
  language: AppLanguage,
  options?: { fallbackToEn?: boolean },
): Promise<Card | null> {
  const fallbackToEn = options?.fallbackToEn ?? true

  const { data, error } = await supabase
    .from('cards')
    .select('*')
    .eq('id', cardId)
    .eq('language', language)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (data) return mapRow(data as Record<string, unknown>)

  if (fallbackToEn && language === 'pt') {
    const { data: enData, error: enError } = await supabase
      .from('cards')
      .select('*')
      .eq('id', cardId)
      .eq('language', 'en')
      .maybeSingle()

    if (enError) throw new Error(enError.message)
    if (enData) return mapRow(enData as Record<string, unknown>)
  }

  return null
}

/** Idiomas em que a carta existe no catálogo (pt / en). */
export async function getAvailableCardLanguages(
  cardId: number,
): Promise<AppLanguage[]> {
  const { data, error } = await supabase
    .from('cards')
    .select('language')
    .eq('id', cardId)

  if (error) throw new Error(error.message)

  const langs = new Set<AppLanguage>()
  for (const row of data ?? []) {
    const lang = (row as { language: string }).language
    if (lang === 'pt' || lang === 'en') langs.add(lang)
  }

  const ordered: AppLanguage[] = []
  if (langs.has('pt')) ordered.push('pt')
  if (langs.has('en')) ordered.push('en')
  return ordered
}

/** Cartas que possuem impressão com o set_name informado (álbum) */
export async function getCardsBySetName(
  language: AppLanguage,
  setName: string,
): Promise<Card[]> {
  const name = setName.trim()
  if (!name) return []

  async function fetchLang(lang: AppLanguage): Promise<Card[]> {
    const payload = JSON.stringify([{ set_name: name }])
    const { data, error } = await supabase
      .from('cards')
      .select('*')
      .eq('language', lang)
      .filter('card_sets', 'cs', payload)
      .limit(500)

    if (error) throw new Error(error.message)

    return (data ?? [])
      .map((row) => mapRow(row as Record<string, unknown>))
      .filter((card) =>
        parseCardSets(card.card_sets).some(
          (set) => set.set_name.toLowerCase() === name.toLowerCase(),
        ),
      )
  }

  if (language === 'pt') {
    const [pt, en] = await Promise.all([fetchLang('pt'), fetchLang('en')])
    return mergePreferLanguage(pt, en)
  }

  return fetchLang('en')
}

export async function getCardsByIds(
  language: AppLanguage,
  ids: number[],
): Promise<Card[]> {
  if (ids.length === 0) return []

  const { data, error } = await supabase
    .from('cards')
    .select('*')
    .eq('language', language)
    .in('id', ids)

  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => mapRow(row as Record<string, unknown>))
}

/** Resolve cartas preferindo o idioma pedido e completando com o outro */
export async function getCardsByIdsWithFallback(
  preferredLanguage: AppLanguage,
  ids: number[],
): Promise<Card[]> {
  if (ids.length === 0) return []

  const preferred = await getCardsByIds(preferredLanguage, ids)
  const found = new Set(preferred.map((c) => c.id))
  const missing = ids.filter((id) => !found.has(id))

  if (missing.length === 0) return preferred

  const fallbackLang: AppLanguage = preferredLanguage === 'pt' ? 'en' : 'pt'
  const fallback = await getCardsByIds(fallbackLang, missing)
  return mergePreferLanguage(preferred, fallback)
}

export async function getDistinctSetNames(
  language: AppLanguage,
  search: string,
  limit = 30,
): Promise<string[]> {
  const q = normalizeQuery(search).toLowerCase()

  function setMatchesQuery(set: { set_name: string; set_code: string }): boolean {
    if (!q) return true
    const name = set.set_name.toLowerCase()
    const code = set.set_code.toLowerCase()
    const prefix = code.split(/[-_]/)[0] ?? code
    return name.includes(q) || code.includes(q) || prefix.includes(q)
  }

  async function fetchLang(lang: AppLanguage) {
    // Sem busca: amostra. Com busca: pagina o catálogo (ilike em jsonb não funciona).
    const pageSize = 1000
    const maxPages = q ? 25 : 1
    const rows: { card_sets: unknown }[] = []

    for (let page = 0; page < maxPages; page += 1) {
      const from = page * pageSize
      const to = from + pageSize - 1
      const { data, error } = await supabase
        .from('cards')
        .select('card_sets')
        .eq('language', lang)
        .not('card_sets', 'is', null)
        .order('id', { ascending: true })
        .range(from, to)

      if (error) throw new Error(error.message)
      if (!data?.length) break

      rows.push(...(data as { card_sets: unknown }[]))
      if (data.length < pageSize) break

      // Se já achou sets suficientes com a busca, pode parar cedo
      if (q) {
        const found = new Set<string>()
        for (const row of rows) {
          for (const set of parseCardSets(row.card_sets)) {
            if (setMatchesQuery(set)) found.add(set.set_name)
          }
        }
        if (found.size >= limit) break
      }
    }

    return rows
  }

  const rows =
    language === 'pt'
      ? [...(await fetchLang('pt')), ...(await fetchLang('en'))]
      : await fetchLang('en')

  const names = new Set<string>()
  for (const row of rows) {
    for (const set of parseCardSets(row.card_sets)) {
      if (setMatchesQuery(set)) {
        names.add(set.set_name)
      }
    }
  }

  return [...names].sort((a, b) => a.localeCompare(b, 'pt-BR')).slice(0, limit)
}

export async function getDistinctArchetypes(
  language: AppLanguage,
  search: string,
  limit = 30,
): Promise<string[]> {
  const q = sanitizeIlike(normalizeQuery(search))

  async function fetchLang(lang: AppLanguage) {
    let query = supabase
      .from('cards')
      .select('archetype')
      .eq('language', lang)
      .not('archetype', 'is', null)
      .neq('archetype', '')
      .order('archetype', { ascending: true })
      .limit(1500)

    if (q) {
      query = query.ilike('archetype', `%${q}%`)
    }

    const { data, error } = await query
    if (error) throw new Error(error.message)
    return data ?? []
  }

  const rows =
    language === 'pt'
      ? [...(await fetchLang('pt')), ...(await fetchLang('en'))]
      : await fetchLang('en')

  const names = new Set<string>()
  const needle = q.toLowerCase()

  for (const row of rows) {
    const value = String((row as { archetype: string | null }).archetype ?? '').trim()
    if (!value) continue
    if (!needle || value.toLowerCase().includes(needle)) {
      names.add(value)
    }
  }

  return [...names].sort((a, b) => a.localeCompare(b, 'en')).slice(0, limit)
}

export async function getDistinctRarities(language: AppLanguage): Promise<string[]> {
  async function fetchLang(lang: AppLanguage) {
    const { data, error } = await supabase
      .from('cards')
      .select('card_sets')
      .eq('language', lang)
      .not('card_sets', 'is', null)
      .limit(500)

    if (error) throw new Error(error.message)
    return data ?? []
  }

  const rows =
    language === 'pt'
      ? [...(await fetchLang('pt')), ...(await fetchLang('en'))]
      : await fetchLang('en')

  const rarities = new Set<string>()
  for (const row of rows) {
    for (const set of parseCardSets((row as { card_sets: unknown }).card_sets)) {
      if (set.set_rarity) rarities.add(set.set_rarity)
    }
  }

  return [...rarities].sort((a, b) => a.localeCompare(b, 'en'))
}
