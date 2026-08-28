import type {
  AppLanguage,
  BanlistInfo,
  Card,
  CardCategory,
  CardImage,
  CardImpression,
  CardRegion,
  CardSet,
  CatalogFilters,
  CollectionItemWithCard,
  MonsterTypeFilter,
  SortOption,
} from '@/types'
import { nameSimilarity } from '@/utils/ocrSuggest'

export function normalizeQuery(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

export function parseCardImages(value: unknown): CardImage[] {
  if (!Array.isArray(value)) return []
  return value.filter(
    (item): item is CardImage =>
      Boolean(item) &&
      typeof item === 'object' &&
      typeof (item as CardImage).image_url === 'string',
  )
}

export function parseCardSets(value: unknown): CardSet[] {
  if (!Array.isArray(value)) return []
  return value.filter(
    (item): item is CardSet =>
      Boolean(item) &&
      typeof item === 'object' &&
      typeof (item as CardSet).set_code === 'string' &&
      typeof (item as CardSet).set_name === 'string',
  )
}

export function parseBanlistInfo(value: unknown): BanlistInfo | null {
  if (!value || typeof value !== 'object') return null
  return value as BanlistInfo
}

export function getPrimaryImage(card: Card): { full: string | null; small: string | null } {
  const images = parseCardImages(card.card_images)
  const first = images[0]
  return {
    full: first?.image_url ?? null,
    small: first?.image_url_small ?? first?.image_url ?? null,
  }
}

export function detectRegion(setCode: string, banlist: BanlistInfo | null): CardRegion {
  const code = setCode.toUpperCase()

  if (/-(JP|JA|KR|AE|SC|TC)[A-Z]*\d/i.test(code) || /-(JP|JA|KR|AE|SC|TC)$/i.test(code)) {
    return 'OCG'
  }

  if (/-(EN|FR|DE|IT|PT|SP|EU)[A-Z]*\d/i.test(code) || /-(EN|FR|DE|IT|PT|SP|EU)$/i.test(code)) {
    return 'TCG'
  }

  if (banlist?.ban_tcg && !banlist?.ban_ocg) return 'TCG'
  if (banlist?.ban_ocg && !banlist?.ban_tcg) return 'OCG'

  // Códigos clássicos sem sufixo de região (ex.: LOB-001) são tipicamente TCG
  if (/^[A-Z0-9]+-\d+/i.test(code)) return 'TCG'

  return 'Unknown'
}

export function getCardCategory(type: string | null): CardCategory | null {
  if (!type) return null
  const t = type.toLowerCase()

  if (
    t.includes('spell') ||
    t.includes('magia') ||
    t.includes('magic')
  ) {
    return 'spell'
  }

  if (t.includes('trap') || t.includes('armadilha')) {
    return 'trap'
  }

  if (t.includes('monster') || t.includes('monstro') || t.includes('token')) {
    return 'monster'
  }

  return null
}

export function matchesMonsterType(
  type: string | null,
  frameType: string | null,
  filter: MonsterTypeFilter,
): boolean {
  const t = `${type ?? ''} ${frameType ?? ''}`.toLowerCase()

  switch (filter) {
    case 'normal':
      return (
        (t.includes('normal') && !t.includes('pendulum')) ||
        frameType === 'normal'
      )
    case 'effect':
      return t.includes('effect') || t.includes('efeito')
    case 'ritual':
      return t.includes('ritual')
    case 'fusion':
      return t.includes('fusion') || t.includes('fusão') || t.includes('fusao')
    case 'synchro':
      return t.includes('synchro') || t.includes('sincro')
    case 'xyz':
      return t.includes('xyz')
    case 'link':
      return t.includes('link')
    case 'pendulum':
      return t.includes('pendulum') || t.includes('pêndulo') || t.includes('pendulo')
    default:
      return false
  }
}

/** Fusion / Synchro / Xyz / Link → Extra Deck */
export function isExtraDeckCard(
  type: string | null,
  frameType: string | null,
): boolean {
  const t = `${type ?? ''} ${frameType ?? ''}`.toLowerCase()
  return (
    t.includes('fusion') ||
    t.includes('fusão') ||
    t.includes('fusao') ||
    t.includes('synchro') ||
    t.includes('sincro') ||
    t.includes('xyz') ||
    t.includes('link')
  )
}

export function resolveDeckZone(
  type: string | null,
  frameType: string | null,
): 'main' | 'extra' {
  return isExtraDeckCard(type, frameType) ? 'extra' : 'main'
}

export function languageLabel(language: AppLanguage): string {
  return language === 'pt' ? 'Português' : 'Inglês'
}

export function categoryLabel(category: CardCategory): string {
  switch (category) {
    case 'monster':
      return 'Monstro'
    case 'spell':
      return 'Magia'
    case 'trap':
      return 'Armadilha'
  }
}

/**
 * Uma entrada de catálogo por carta (não por impressão/set code).
 * Usa a impressão com melhor match da busca, ou a primeira disponível.
 */
export function cardToCatalogItem(
  card: Card,
  query = '',
): CardImpression | null {
  const sets = parseCardSets(card.card_sets)
  const images = getPrimaryImage(card)
  const banlist = parseBanlistInfo(card.banlist_info)
  const searchRank = query ? computeCardSearchRank(card, query) : 99

  if (query && searchRank >= 99) return null

  const preferredSet = pickPreferredSet(sets, query)
  const setCode = preferredSet?.set_code ?? '—'
  const region = preferredSet
    ? detectRegion(preferredSet.set_code, banlist)
    : 'Unknown'

  return {
    key: `${card.id}-${card.language}`,
    cardId: card.id,
    language: card.language,
    name: card.name,
    type: card.type,
    frameType: card.frame_type,
    description: card.description,
    atk: card.atk,
    def: card.def,
    level: card.level,
    race: card.race,
    attribute: card.attribute,
    archetype: card.archetype,
    scale: card.scale,
    linkval: card.linkval,
    linkmarkers: card.linkmarkers,
    imageUrl: images.full,
    imageUrlSmall: images.small,
    setCode,
    setName: preferredSet?.set_name ?? 'Sem set',
    setRarity: preferredSet?.set_rarity || '—',
    setRarityCode: preferredSet?.set_rarity_code ?? null,
    region,
    versionCount: sets.length,
    searchRank: query ? searchRank : 99,
    syncedAt: card.synced_at,
  }
}

/** @deprecated Prefer cardToCatalogItem — mantido para compatibilidade interna */
export function expandCardToImpressions(
  card: Card,
  searchRank = 99,
): CardImpression[] {
  const item = cardToCatalogItem(card, '')
  if (!item) return []
  return [{ ...item, searchRank }]
}

function pickPreferredSet(sets: CardSet[], query: string): CardSet | null {
  if (sets.length === 0) return null
  if (!query) return sets[0]

  const q = query.toLowerCase()
  const exact = sets.find((set) => set.set_code.toLowerCase() === q)
  if (exact) return exact

  const partial = sets.find((set) => set.set_code.toLowerCase().includes(q))
  if (partial) return partial

  return sets[0]
}

export function computeCardSearchRank(card: Card, query: string): number {
  const q = query.toLowerCase()
  const name = card.name.toLowerCase()
  const desc = (card.description ?? '').toLowerCase()
  const archetype = (card.archetype ?? '').toLowerCase()
  const sets = parseCardSets(card.card_sets)
  const qCompact = q.replace(/\s+/g, '')
  const nameCompact = name.replace(/\s+/g, '')

  if (sets.some((set) => set.set_code.toLowerCase() === q)) return 1
  if (sets.some((set) => set.set_code.toLowerCase().includes(q))) return 2
  if (name === q || nameCompact === qCompact) return 3
  if (archetype === q) return 3
  if (name.includes(q) || nameCompact.includes(qCompact)) return 4
  if (archetype.includes(q)) return 4
  if (desc.includes(q)) return 5

  const sim = nameSimilarity(card.name, query)
  if (sim >= 0.72) return 4
  if (sim >= 0.55) return 5

  return 99
}

export function computeSearchRank(
  impression: CardImpression,
  query: string,
  description: string | null,
): number {
  const q = query.toLowerCase()
  const setCode = impression.setCode.toLowerCase()
  const name = impression.name.toLowerCase()
  const desc = (description ?? '').toLowerCase()

  if (setCode === q) return 1
  if (setCode.includes(q)) return 2
  if (name === q) return 3
  if (name.includes(q)) return 4
  if (desc.includes(q)) return 5
  return 99
}

export function matchesCardFilters(card: Card, filters: CatalogFilters): boolean {
  const category = getCardCategory(card.type)
  const sets = parseCardSets(card.card_sets)
  const banlist = parseBanlistInfo(card.banlist_info)

  if (filters.cardCategory && category !== filters.cardCategory) {
    return false
  }

  if (filters.monsterTypes.length > 0) {
    if (category !== 'monster') return false
    const ok = filters.monsterTypes.some((mt) =>
      matchesMonsterType(card.type, card.frame_type, mt),
    )
    if (!ok) return false
  }

  if (filters.attributes.length > 0) {
    if (
      !card.attribute ||
      !filters.attributes.map((a) => a.toUpperCase()).includes(card.attribute.toUpperCase())
    ) {
      return false
    }
  }

  if (filters.rarities.length > 0) {
    const ok = sets.some((set) =>
      filters.rarities.some(
        (r) => (set.set_rarity || '').toLowerCase() === r.toLowerCase(),
      ),
    )
    if (!ok) return false
  }

  if (filters.region) {
    const ok = sets.some(
      (set) => detectRegion(set.set_code, banlist) === filters.region,
    )
    if (!ok) return false
  }

  if (filters.setName.trim()) {
    const setQ = filters.setName.trim().toLowerCase()
    const ok = sets.some(
      (set) =>
        set.set_name.toLowerCase().includes(setQ) ||
        set.set_code.toLowerCase().includes(setQ),
    )
    if (!ok) return false
  }

  if (filters.archetype.trim()) {
    const archetypeQ = filters.archetype.trim().toLowerCase()
    if (!(card.archetype ?? '').toLowerCase().includes(archetypeQ)) {
      return false
    }
  }

  return true
}

export function matchesFilters(
  impression: CardImpression,
  filters: CatalogFilters,
): boolean {
  const category = getCardCategory(impression.type)

  if (filters.cardCategory && category !== filters.cardCategory) {
    return false
  }

  if (filters.monsterTypes.length > 0) {
    if (category !== 'monster') return false
    const ok = filters.monsterTypes.some((mt) =>
      matchesMonsterType(impression.type, impression.frameType, mt),
    )
    if (!ok) return false
  }

  if (filters.attributes.length > 0) {
    if (
      !impression.attribute ||
      !filters.attributes.map((a) => a.toUpperCase()).includes(impression.attribute.toUpperCase())
    ) {
      return false
    }
  }

  if (filters.rarities.length > 0) {
    const rarity = impression.setRarity.toLowerCase()
    const ok = filters.rarities.some((r) => rarity === r.toLowerCase())
    if (!ok) return false
  }

  if (filters.region && impression.region !== filters.region) {
    return false
  }

  if (filters.setName.trim()) {
    const setQ = filters.setName.trim().toLowerCase()
    if (
      !impression.setName.toLowerCase().includes(setQ) &&
      !impression.setCode.toLowerCase().includes(setQ)
    ) {
      return false
    }
  }

  if (filters.archetype.trim()) {
    const archetypeQ = filters.archetype.trim().toLowerCase()
    if (!(impression.archetype ?? '').toLowerCase().includes(archetypeQ)) {
      return false
    }
  }

  return true
}

const RARITY_ORDER = [
  'common',
  'short print',
  'rare',
  'super rare',
  'ultra rare',
  'ultra rare (phar)',
  'secret rare',
  'prismatic secret rare',
  'ultimate rare',
  'ghost rare',
  'gold rare',
  "collector's rare",
  'starlight rare',
  'quarter century secret rare',
]

function rarityWeight(rarity: string): number {
  const idx = RARITY_ORDER.indexOf(rarity.toLowerCase())
  return idx === -1 ? 50 : idx
}

export function sortImpressions(
  items: CardImpression[],
  sort: SortOption,
): CardImpression[] {
  const copy = [...items]

  copy.sort((a, b) => {
    // Mantém prioridade de busca quando há rank relevante
    if (a.searchRank !== b.searchRank && a.searchRank < 99 && b.searchRank < 99) {
      if (a.searchRank !== b.searchRank) return a.searchRank - b.searchRank
    }

    switch (sort) {
      case 'name_asc':
        return a.name.localeCompare(b.name, 'pt-BR') || a.setCode.localeCompare(b.setCode)
      case 'name_desc':
        return b.name.localeCompare(a.name, 'pt-BR') || a.setCode.localeCompare(b.setCode)
      case 'set_asc':
        return a.setCode.localeCompare(b.setCode, 'en') || a.name.localeCompare(b.name)
      case 'set_desc':
        return b.setCode.localeCompare(a.setCode, 'en') || a.name.localeCompare(b.name)
      case 'rarity':
        return (
          rarityWeight(b.setRarity) - rarityWeight(a.setRarity) ||
          a.name.localeCompare(b.name)
        )
      case 'release_date':
        // Data de lançamento não está no schema atual; usa synced_at como fallback
        return (
          new Date(b.syncedAt).getTime() - new Date(a.syncedAt).getTime() ||
          a.setCode.localeCompare(b.setCode)
        )
      default:
        return 0
    }
  })

  return copy
}

export function looksLikeSetCode(query: string): boolean {
  return /^[A-Z0-9]{2,}[-_][A-Z0-9]+$/i.test(query.trim())
}

export interface ParsedYgoSetCode {
  setId: string
  lang: string
  number: number
  digits: number
  raw: string
}

/** Ex.: FOTB-EN043 → { setId: FOTB, lang: EN, number: 43, digits: 3 } */
export function parseYgoSetCode(raw: string): ParsedYgoSetCode | null {
  const code = raw.trim().toUpperCase()
  const match = code.match(/^([A-Z0-9]{2,8})-([A-Z]{0,3})(\d{1,4})$/)
  if (!match) return null
  const [, setId, lang, numStr] = match
  return {
    setId,
    lang,
    number: Number(numStr),
    digits: numStr.length,
    raw: code,
  }
}

/** Gera set code vizinho (FOTB-EN043 + 1 → FOTB-EN044). */
export function buildAdjacentSetCode(
  setCode: string,
  delta: number,
): string | null {
  const parsed = parseYgoSetCode(setCode)
  if (!parsed) return null
  const next = parsed.number + delta
  if (next < 0) return null
  return `${parsed.setId}-${parsed.lang}${String(next).padStart(parsed.digits, '0')}`
}

export function matchesCollectionSearch(
  item: CollectionItemWithCard,
  query: string,
): boolean {
  const q = normalizeQuery(query).toLowerCase()
  if (!q) return true

  const name = (item.card?.name ?? '').toLowerCase()
  const desc = (item.card?.description ?? '').toLowerCase()
  const archetype = (item.card?.archetype ?? '').toLowerCase()

  return (
    name.includes(q) ||
    desc.includes(q) ||
    archetype.includes(q) ||
    item.set_code.toLowerCase().includes(q) ||
    item.set_name.toLowerCase().includes(q) ||
    item.set_rarity.toLowerCase().includes(q) ||
    String(item.card_id).includes(q)
  )
}

export function matchesCollectionArchetype(
  item: CollectionItemWithCard,
  archetype: string,
): boolean {
  const value = archetype.trim().toLowerCase()
  if (!value) return true
  return (item.card?.archetype ?? '').toLowerCase().includes(value)
}

export interface CardDetailLinkParams {
  lang?: AppLanguage | string
  setCode?: string | null
  setRarity?: string | null
  setName?: string | null
}

/** Monta URL de detalhe preservando impressão (set + raridade). */
export function buildCardDetailPath(
  cardId: number,
  params: CardDetailLinkParams = {},
): string {
  const search = new URLSearchParams()
  if (params.lang) search.set('lang', params.lang)
  if (params.setCode && params.setCode !== '—') {
    search.set('set', params.setCode)
  }
  if (params.setRarity && params.setRarity !== '—') {
    search.set('rarity', params.setRarity)
  }
  if (params.setName && params.setName !== 'Sem set') {
    search.set('setName', params.setName)
  }
  const qs = search.toString()
  return qs ? `/cards/${cardId}?${qs}` : `/cards/${cardId}`
}

function normalizeSetKey(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase()
}

/**
 * Resolve a impressão correta quando o mesmo set_code existe em raridades diferentes.
 * Prioridade: set+rarity+name → set+rarity → set+name → set → primeira.
 */
export function resolveCardSet(
  sets: CardSet[],
  options: {
    setCode?: string | null
    setRarity?: string | null
    setName?: string | null
  },
): CardSet | null {
  if (!sets.length) return null

  const code = normalizeSetKey(options.setCode)
  const rarity = normalizeSetKey(options.setRarity)
  const name = normalizeSetKey(options.setName)

  if (!code) return sets[0]

  const byCode = sets.filter(
    (set) => normalizeSetKey(set.set_code) === code,
  )
  // Código pedido e não encontrado: não inventa outra impressão
  if (!byCode.length) return null

  if (rarity && name) {
    const exact = byCode.find(
      (set) =>
        normalizeSetKey(set.set_rarity) === rarity &&
        normalizeSetKey(set.set_name) === name,
    )
    if (exact) return exact
  }

  if (rarity) {
    const byRarity = byCode.find(
      (set) => normalizeSetKey(set.set_rarity) === rarity,
    )
    if (byRarity) return byRarity
  }

  if (name) {
    const byName = byCode.find(
      (set) => normalizeSetKey(set.set_name) === name,
    )
    if (byName) return byName
  }

  return byCode[0]
}

/** Converte set_price (string USD da API) em número. */
export function parseSetPriceUsd(setPrice?: string | null): number | null {
  if (setPrice == null) return null
  const cleaned = String(setPrice)
    .trim()
    .replace(/[^0-9.,-]/g, '')
    .replace(',', '.')
  if (!cleaned) return null
  const value = Number.parseFloat(cleaned)
  if (!Number.isFinite(value) || value < 0) return null
  return value
}

export function formatUsd(value: number): string {
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  })
}

export function formatBrl(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

export function convertUsdToBrl(usd: number, rate: number): number {
  return usd * rate
}

/** Preço USD unitário da impressão na coleção (via card_sets). */
export function resolveCollectionItemPriceUsd(
  item: CollectionItemWithCard,
): number | null {
  if (!item.card) return null
  const match = resolveCardSet(parseCardSets(item.card.card_sets), {
    setCode: item.set_code,
    setRarity: item.set_rarity,
    setName: item.set_name,
  })
  return parseSetPriceUsd(match?.set_price)
}

export interface CollectionStats {
  totalCards: number
  impressions: number
  uniqueCardIds: number
  uniqueSets: number
  extraCopies: number
  pricedImpressions: number
  valueUsd: number
  topItem: CollectionRankedItem | null
  premiumCount: number
}

export interface CollectionRankedItem {
  id: string
  cardId: number
  language: AppLanguage
  name: string
  setCode: string
  setName: string
  setRarity: string
  quantity: number
  extraCopies: number
  unitUsd: number | null
  totalUsd: number | null
  imageUrlSmall: string | null
}

const PREMIUM_RARITY_HINTS = [
  'secret',
  'ultimate',
  'ghost',
  'starlight',
  'collector',
  'quarter century',
  'prismatic',
  'ultra',
  'mosaic',
]

function isPremiumRarity(rarity: string): boolean {
  const r = rarity.toLowerCase()
  return PREMIUM_RARITY_HINTS.some((hint) => r.includes(hint))
}

function toRankedItem(item: CollectionItemWithCard): CollectionRankedItem {
  const qty = item.quantity || 0
  const unitUsd = resolveCollectionItemPriceUsd(item)
  const images = item.card ? getPrimaryImage(item.card) : { small: null, full: null }
  return {
    id: item.id,
    cardId: item.card_id,
    language: item.card?.language ?? item.language,
    name: item.card?.name ?? `Carta #${item.card_id}`,
    setCode: item.set_code,
    setName: item.set_name,
    setRarity: item.set_rarity || '',
    quantity: qty,
    extraCopies: Math.max(0, qty - 1),
    unitUsd,
    totalUsd: unitUsd != null ? unitUsd * qty : null,
    imageUrlSmall: images.small,
  }
}

export function listMostValuableItems(
  items: CollectionItemWithCard[],
  limit = 30,
): CollectionRankedItem[] {
  return items
    .map(toRankedItem)
    .filter((row) => row.totalUsd != null && row.totalUsd > 0)
    .sort((a, b) => (b.totalUsd ?? 0) - (a.totalUsd ?? 0))
    .slice(0, limit)
}

export function listExtraCopyItems(
  items: CollectionItemWithCard[],
): CollectionRankedItem[] {
  return items
    .map(toRankedItem)
    .filter((row) => row.extraCopies > 0)
    .sort((a, b) => {
      const valueDiff = (b.totalUsd ?? 0) - (a.totalUsd ?? 0)
      if (valueDiff !== 0) return valueDiff
      return b.extraCopies - a.extraCopies
    })
}

export function computeCollectionStats(
  items: CollectionItemWithCard[],
): CollectionStats {
  let totalCards = 0
  let extraCopies = 0
  let valueUsd = 0
  let pricedImpressions = 0
  let premiumCount = 0
  const cardIds = new Set<number>()
  const setNames = new Set<string>()

  let topItem: CollectionRankedItem | null = null

  for (const item of items) {
    const ranked = toRankedItem(item)
    totalCards += ranked.quantity
    extraCopies += ranked.extraCopies
    cardIds.add(item.card_id)
    if (item.set_name) setNames.add(item.set_name)
    if (isPremiumRarity(item.set_rarity || '')) {
      premiumCount += ranked.quantity
    }

    if (ranked.unitUsd == null || ranked.totalUsd == null) continue

    pricedImpressions += 1
    valueUsd += ranked.totalUsd

    if (!topItem || ranked.totalUsd > (topItem.totalUsd ?? 0)) {
      topItem = ranked
    }
  }

  return {
    totalCards,
    impressions: items.length,
    uniqueCardIds: cardIds.size,
    uniqueSets: setNames.size,
    extraCopies,
    pricedImpressions,
    valueUsd,
    topItem,
    premiumCount,
  }
}
