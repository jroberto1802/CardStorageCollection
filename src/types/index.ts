export type AppLanguage = 'en' | 'pt'

export interface SyncLog {
  id: string
  user_id: string
  status: 'running' | 'success' | 'error'
  language: AppLanguage
  cards_synced: number | null
  started_at: string
  finished_at: string | null
  error_message: string | null
}

export interface SyncCardsResponse {
  success: boolean
  cards_synced?: number
  sync_log_id?: string
  error?: string
}

export interface CardImage {
  id: number
  image_url: string
  image_url_small: string
  image_url_cropped?: string
}

export interface CardSet {
  set_name: string
  set_code: string
  set_rarity: string
  set_rarity_code?: string
  set_price?: string
}

export interface BanlistInfo {
  ban_tcg?: string
  ban_ocg?: string
  ban_goat?: string
}

export interface Card {
  id: number
  name: string
  type: string | null
  frame_type: string | null
  description: string | null
  atk: number | null
  def: number | null
  level: number | null
  race: string | null
  attribute: string | null
  archetype: string | null
  scale: number | null
  linkval: number | null
  linkmarkers: string[] | null
  ygoprodeck_url: string | null
  card_images: CardImage[] | null
  card_sets: CardSet[] | null
  card_prices: unknown
  banlist_info: BanlistInfo | null
  language: AppLanguage
  synced_at: string
  updated_at: string
}

export type CardCategory = 'monster' | 'spell' | 'trap'

export type MonsterTypeFilter =
  | 'normal'
  | 'effect'
  | 'ritual'
  | 'fusion'
  | 'synchro'
  | 'xyz'
  | 'link'
  | 'pendulum'

export type CardRegion = 'TCG' | 'OCG' | 'Unknown'

export type SortOption =
  | 'name_asc'
  | 'name_desc'
  | 'set_asc'
  | 'set_desc'
  | 'rarity'
  | 'release_date'

export interface CatalogFilters {
  cardCategory: CardCategory | null
  monsterTypes: MonsterTypeFilter[]
  attributes: string[]
  rarities: string[]
  region: 'TCG' | 'OCG' | null
  setName: string
}

export interface CardImpression {
  key: string
  cardId: number
  language: AppLanguage
  name: string
  type: string | null
  frameType: string | null
  description: string | null
  atk: number | null
  def: number | null
  level: number | null
  race: string | null
  attribute: string | null
  archetype: string | null
  scale: number | null
  linkval: number | null
  linkmarkers: string[] | null
  imageUrl: string | null
  imageUrlSmall: string | null
  setCode: string
  setName: string
  setRarity: string
  setRarityCode: string | null
  region: CardRegion
  searchRank: number
  syncedAt: string
}

export const DEFAULT_CATALOG_FILTERS: CatalogFilters = {
  cardCategory: null,
  monsterTypes: [],
  attributes: [],
  rarities: [],
  region: null,
  setName: '',
}

export const KNOWN_RARITIES = [
  'Common',
  'Rare',
  'Super Rare',
  'Ultra Rare',
  'Secret Rare',
  'Ultimate Rare',
  'Ghost Rare',
  'Gold Rare',
  "Collector's Rare",
  'Starlight Rare',
  'Quarter Century Secret Rare',
] as const

export const CARD_ATTRIBUTES = [
  'DARK',
  'LIGHT',
  'EARTH',
  'WATER',
  'FIRE',
  'WIND',
  'DIVINE',
] as const

export const MONSTER_TYPE_OPTIONS: { value: MonsterTypeFilter; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'effect', label: 'Efeito' },
  { value: 'ritual', label: 'Ritual' },
  { value: 'fusion', label: 'Fusão' },
  { value: 'synchro', label: 'Sincro' },
  { value: 'xyz', label: 'Xyz' },
  { value: 'link', label: 'Link' },
  { value: 'pendulum', label: 'Pêndulo' },
]
