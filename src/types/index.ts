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

export interface SyncCardImagesResponse {
  success: boolean
  mode?: 'small' | 'full' | 'status'
  language?: AppLanguage
  mirrored?: number
  failed?: number
  skipped?: number
  cards_processed?: number
  has_more?: boolean
  after_id?: number
  storage_bytes?: number
  storage_soft_limit_bytes?: number
  stopped_for_quota?: boolean
  pending_small?: number | null
  sample_scanned?: number
  near_quota?: boolean
  card_images?: CardImage[]
  message?: string
  error?: string
  errors?: string[]
}

export type SyncCardImagesStatus = SyncCardImagesResponse

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
  archetype: string
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
  /** Impressão representativa (primeira / melhor match da busca) */
  setCode: string
  setName: string
  setRarity: string
  setRarityCode: string | null
  region: CardRegion
  /** Quantidade de versões (set codes) da carta */
  versionCount: number
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
  archetype: '',
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

/** Item salvo na coleção do usuário (impressão específica) */
export interface CollectionItem {
  id: string
  user_id: string
  card_id: number
  language: AppLanguage
  set_code: string
  set_name: string
  set_rarity: string
  quantity: number
  notes: string | null
  created_at: string
  updated_at: string
}

export interface CollectionItemWithCard extends CollectionItem {
  card: Card | null
}

export type CollectionViewMode = 'list' | 'grid' | 'album'

/** Tamanho dos cards na visualização por quadros (Início / Coleção) */
export type GridCardSize = 'pp' | 'sm' | 'md' | 'lg'

export interface AddToCollectionInput {
  card_id: number
  language: AppLanguage
  set_code: string
  set_name: string
  set_rarity: string
  quantity?: number
}

export interface AlbumSlot {
  cardId: number
  language: AppLanguage
  name: string
  /** Set code da coleção do álbum (exibido em azul) */
  setCode: string
  setName: string
  setRarity: string
  imageUrl: string | null
  imageUrlSmall: string | null
  owned: boolean
  /** true se possui a impressão desta coleção; false se só outra versão */
  ownedInAlbumSet: boolean
  /** Set code que o usuário possui (pode ser de outra coleção) */
  ownedSetCode: string | null
  quantity: number
  collectionItemId: string | null
}

export interface CollectionSetOption {
  setName: string
  /** Prefixo típico do set (ex.: LOB) extraído dos set_codes */
  setPrefix: string
  /** Códigos de impressão vistos neste set (para busca por set code) */
  setCodes: string[]
  ownedCount: number
}

export type DeckZone = 'main' | 'extra' | 'side'

export interface Deck {
  id: string
  user_id: string
  name: string
  language: AppLanguage
  created_at: string
  updated_at: string
}

/** Uma cópia física no deck (repetidas = várias linhas) */
export interface DeckCard {
  id: string
  deck_id: string
  card_id: number
  language: AppLanguage
  zone: DeckZone
  position: number
  created_at: string
}

export interface DeckCardSlot extends DeckCard {
  name: string
  type: string | null
  frameType: string | null
  race: string | null
  imageUrl: string | null
  imageUrlSmall: string | null
}

export interface DeckSummary extends Deck {
  mainCount: number
  extraCount: number
  sideCount: number
}

/** Payload arrastado da busca para o deck */
export interface DeckDragPayload {
  cardId: number
  language: AppLanguage
  name: string
  type: string | null
  frameType: string | null
  race: string | null
  imageUrl: string | null
  imageUrlSmall: string | null
}

export const DECK_DRAG_MIME = 'application/x-csc-deck-card'
export const MAX_COPIES_PER_CARD = 3
export const MAX_MAIN_DECK = 60
export const MAX_EXTRA_DECK = 15
export const MAX_SIDE_DECK = 15

export type DeckSyncRunStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'

export interface DeckSyncRun {
  id: string
  status: DeckSyncRunStatus
  language: AppLanguage
  started_at: string
  finished_at: string | null
  total_estimated: number | null
  processed: number
  created_count: number
  updated_count: number
  error_count: number
  missing_card_events: number
  last_skip: number
  batch_size: number
  cancel_requested: boolean
  error_message: string | null
  last_errors?: unknown
}

export interface MdmDeckSyncResponse {
  success: boolean
  mode?: 'start' | 'process' | 'status' | 'cancel' | 'history'
  resumed?: boolean
  has_more?: boolean
  retryable?: boolean
  message?: string
  error?: string
  run?: DeckSyncRun | null
  runs?: DeckSyncRun[]
  batch?: {
    fetched: number
    created: number
    updated: number
    errors: number
    missing_card_events: number
  }
}

export interface SyncedDeck {
  id: string
  source: string
  external_id: string
  name: string
  author_name: string | null
  author_external_id: string | null
  deck_type: string | null
  ranked_type: string | null
  source_url: string | null
  source_created_at: string | null
  language: AppLanguage
  missing_card_count: number
  created_at: string
  updated_at: string
}

export interface SyncedDeckCardRow {
  id: string
  deck_id: string
  card_id: number | null
  language: AppLanguage | null
  zone: DeckZone
  quantity: number
  mdm_card_id: string | null
  mdm_card_name: string
  mdm_rarity: string | null
  name: string
  type: string | null
  frameType: string | null
  race: string | null
  imageUrl: string | null
  imageUrlSmall: string | null
  /** Quantidade de cópias desta linha cobertas pela coleção (0..quantity). */
  ownedCopies: number
  /** true se ownedCopies > 0 */
  owned: boolean
}

export interface SyncedDeckSummary extends SyncedDeck {
  mainCount: number
  extraCount: number
  sideCount: number
  ownedCount: number
  totalCount: number
  unresolvedCount: number
}

export interface SyncedDeckDetail extends SyncedDeckSummary {
  cards: SyncedDeckCardRow[]
}

export interface ImportSyncedDeckResult {
  deckId: string
  deckName: string
  inserted: number
  skippedUnresolved: number
  cappedCopies: number
  truncatedByLimit: number
}

