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
  MonsterTypeFilter,
  SortOption,
} from '@/types'

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
  const sets = parseCardSets(card.card_sets)

  if (sets.some((set) => set.set_code.toLowerCase() === q)) return 1
  if (sets.some((set) => set.set_code.toLowerCase().includes(q))) return 2
  if (name === q) return 3
  if (name.includes(q)) return 4
  if (desc.includes(q)) return 5
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
