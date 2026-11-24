import { allocateOwnedCopies, computeOwnership } from '@/services/syncedDeckService'
import type { AppLanguage, CardPriceSources, CharacterListItem, DeckZone } from '@/types'

export type OwnershipStatus = 'complete' | 'partial' | 'missing'
export type OwnershipFilter = 'all' | 'owned' | 'missing'

export const ZONE_ORDER: DeckZone[] = ['main', 'extra', 'side']

/** Minúsculas, sem acento, espaços colapsados — para busca tolerante. */
export function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

/** Avatares locais (/characters/...) agora são .webp; valores antigos do banco ainda terminam em .png. */
export function normalizeAvatarSrc(src: string | null): string | null {
  if (!src) return src
  return src.startsWith('/characters/') ? src.replace(/\.png$/i, '.webp') : src
}

export function seriesKey(character: Pick<CharacterListItem, 'series' | 'anime'>): string {
  return character.series ?? character.anime.slug
}

export interface SeriesTab {
  key: string
  label: string
  count: number
}

/** Só séries que têm personagens, na ordem do anime. */
export function buildSeriesTabs(characters: CharacterListItem[]): SeriesTab[] {
  const map = new Map<string, SeriesTab & { order: number }>()
  for (const character of characters) {
    const key = seriesKey(character)
    const current = map.get(key)
    if (current) current.count += 1
    else map.set(key, { key, label: character.anime.name, count: 1, order: character.anime.sort_order })
  }
  return [...map.values()]
    .sort((a, b) => a.order - b.order)
    .map(({ key, label, count }) => ({ key, label, count }))
}

export function filterCharacters(
  characters: CharacterListItem[],
  serie: string | null,
  query: string,
): CharacterListItem[] {
  const q = normalizeText(query)
  return characters.filter((character) => {
    if (serie && seriesKey(character) !== serie) return false
    if (!q) return true
    return (
      normalizeText(character.name).includes(q) ||
      normalizeText(character.japanese_name ?? '').includes(q) ||
      normalizeText(character.slug).includes(q)
    )
  })
}

export function cardOwnershipStatus(owned: number, quantity: number): OwnershipStatus {
  if (owned >= quantity) return 'complete'
  if (owned > 0) return 'partial'
  return 'missing'
}

export const STATUS_LABEL: Record<OwnershipStatus, string> = {
  complete: 'Completo',
  partial: 'Parcial',
  missing: 'Falta',
}

export interface DeckCardLine {
  id: string
  cardId: number | null
  quantity: number
  zone: DeckZone
}

export interface DeckCardEntry<T extends DeckCardLine> {
  card: T
  owned: number
  status: OwnershipStatus
}

/** Posse por carta distinta (uma entrada por linha do deck), alocando cópias main → extra → side. */
export function buildCardEntries<T extends DeckCardLine>(
  cards: T[],
  ownedQty: Map<number, number>,
): DeckCardEntry<T>[] {
  const owned = allocateOwnedCopies(
    cards.map((card) => ({ card_id: card.cardId, quantity: card.quantity, zone: card.zone })),
    ownedQty,
  )
  return cards.map((card, index) => {
    const have = owned[index] ?? 0
    return { card, owned: have, status: cardOwnershipStatus(have, card.quantity) }
  })
}

export function filterEntries<T extends DeckCardLine>(
  entries: DeckCardEntry<T>[],
  filter: OwnershipFilter,
): DeckCardEntry<T>[] {
  if (filter === 'owned') return entries.filter((entry) => entry.owned > 0)
  if (filter === 'missing') return entries.filter((entry) => entry.owned < entry.card.quantity)
  return entries
}

export interface ZoneSummary {
  /** Cópias da zona, incluindo não catalogadas */
  total: number
  owned: number
  /** Cópias não catalogadas da zona (já incluídas em total) */
  unresolved: number
}

export function zoneSummary<T extends DeckCardLine>(
  entries: DeckCardEntry<T>[],
  zone: DeckZone,
  unresolvedCards: Array<{ zone: DeckZone; quantity: number }> = [],
): ZoneSummary {
  let total = 0
  let owned = 0
  let unresolved = 0
  for (const entry of entries) {
    if (entry.card.zone !== zone) continue
    total += entry.card.quantity
    owned += entry.owned
  }
  for (const card of unresolvedCards) {
    if (card.zone !== zone) continue
    total += card.quantity
    unresolved += card.quantity
  }
  return { total, owned, unresolved }
}

/** Query string da lista (?serie=&q=) para voltar preservando o contexto. */
export function buildListSearch(params: { serie?: string | null; q?: string | null }): string {
  const sp = new URLSearchParams()
  if (params.serie) sp.set('serie', params.serie)
  if (params.q) sp.set('q', params.q)
  const s = sp.toString()
  return s ? `?${s}` : ''
}

export interface DeckSummary {
  owned: number
  total: number
  missing: number
  unresolved: number
  percent: number
}

/** Cartas não catalogadas contam no total e como faltantes. */
export function summarizeDeck(
  lines: Array<{ cardId: number | null; quantity: number }>,
  ownedQty: Map<number, number>,
): DeckSummary {
  const { ownedCount, totalCount, unresolvedCount } = computeOwnership(lines, ownedQty)
  return {
    owned: ownedCount,
    total: totalCount,
    missing: Math.max(0, totalCount - ownedCount),
    unresolved: unresolvedCount,
    percent: totalCount > 0 ? Math.round((ownedCount / totalCount) * 100) : 0,
  }
}

export function formatDeckProgress(summary: DeckSummary): string {
  const base = `${summary.owned}/${summary.total}`
  if (summary.unresolved === 0) return base
  return `${base} · ${summary.unresolved} não catalogada${summary.unresolved === 1 ? '' : 's'}`
}

export function describeCardOwnership(
  name: string,
  quantity: number,
  owned: number,
  status: OwnershipStatus,
): string {
  const label = STATUS_LABEL[status]
  return `${name}, ${quantity} ${quantity === 1 ? 'cópia' : 'cópias'} no deck, você tem ${owned}: ${label}`
}

export interface LocalizedCard {
  /** Idioma em que a carta existe (o do app) */
  language?: AppLanguage
  name: string
  type: string | null
  imageUrl: string | null
  imageUrlSmall: string | null
}

/**
 * Sobrepõe nome/tipo/imagens com a versão no idioma do app; cartas sem tradução
 * mantêm os dados em inglês (fallback).
 */
export function applyLocalizedCards<
  T extends {
    cardId: number | null
    name: string
    type: string | null
    imageUrl: string | null
    imageUrlSmall: string | null
    language?: AppLanguage
  },
>(cards: T[], localized: Map<number, LocalizedCard>): T[] {
  if (localized.size === 0) return cards
  return cards.map((card) => {
    const loc = card.cardId == null ? undefined : localized.get(card.cardId)
    if (!loc) return card
    return {
      ...card,
      language: loc.language ?? card.language,
      name: loc.name || card.name,
      type: loc.type ?? card.type,
      imageUrl: loc.imageUrl ?? card.imageUrl,
      imageUrlSmall: loc.imageUrlSmall ?? card.imageUrlSmall,
    }
  })
}

// ---------------------------------------------------------------------------
// Criar deck do usuário a partir de um deck de personagem
// ---------------------------------------------------------------------------

export type CreateDeckMode = 'all' | 'owned'

export const MAX_USER_DECK_NAME = 60

/** Nome sugerido '{deck} - {personagem}' respeitando o limite. */
export function suggestUserDeckName(deckName: string, characterName: string): string {
  // por code points: nunca parte um par substituto (emoji)
  return Array.from(`${deckName} - ${characterName}`.trim()).slice(0, MAX_USER_DECK_NAME).join('')
}

/** Valida o nome; devolve mensagem de erro ou null. */
export function validateUserDeckName(name: string): string | null {
  const trimmed = name.trim()
  if (!trimmed) return 'Informe um nome para o deck.'
  if (Array.from(trimmed).length > MAX_USER_DECK_NAME) return `Use no máximo ${MAX_USER_DECK_NAME} caracteres.`
  return null
}

/** Linhas para createUserDeckFromCards: todas as cartas ou só as cópias que o usuário tem. */
export function buildCreateDeckCards<
  T extends DeckCardLine & { language: AppLanguage | null | undefined },
>(
  entries: DeckCardEntry<T>[],
  mode: CreateDeckMode,
): Array<{ cardId: number | null; language: AppLanguage | null | undefined; zone: DeckZone; quantity: number }> {
  return entries
    .map(({ card, owned }) => ({
      cardId: card.cardId,
      language: card.language,
      zone: card.zone,
      quantity: mode === 'owned' ? Math.min(card.quantity, owned) : card.quantity,
    }))
    .filter((line) => line.quantity > 0)
}

// ---------------------------------------------------------------------------
// Lista "O que falta"
// ---------------------------------------------------------------------------

export type PriceSource = 'cardmarket' | 'tcgplayer' | 'ebay'
export const PRICE_SOURCES: PriceSource[] = ['cardmarket', 'tcgplayer', 'ebay']
export const PRICE_SOURCE_LABEL: Record<PriceSource, string> = {
  cardmarket: 'Cardmarket',
  tcgplayer: 'TCGplayer',
  ebay: 'eBay',
}

export interface PricedCardLine extends DeckCardLine {
  name: string
  prices: CardPriceSources | null
}

export interface MissingLine<T extends PricedCardLine> {
  card: T
  /** Cópias que faltam: max(0, quantidade - possui) */
  missing: number
  owned: number
  unit: number | null
  /** unit * missing; null sem preço */
  subtotal: number | null
}

export interface MissingGroup<T extends PricedCardLine> {
  zone: DeckZone
  lines: MissingLine<T>[]
  missingCopies: number
  subtotal: number
}

export interface MissingList<T extends PricedCardLine> {
  groups: MissingGroup<T>[]
  missingCopies: number
  totalUsd: number
  /** Cartas distintas faltantes sem preço na fonte escolhida */
  unpricedCount: number
}

export function buildMissingList<T extends PricedCardLine>(
  entries: DeckCardEntry<T>[],
  source: PriceSource,
): MissingList<T> {
  const groups: MissingGroup<T>[] = []
  let totalUsd = 0
  let unpricedCount = 0
  let missingCopies = 0

  for (const zone of ZONE_ORDER) {
    const lines: MissingLine<T>[] = []
    for (const entry of entries) {
      if (entry.card.zone !== zone) continue
      const missing = Math.max(0, entry.card.quantity - entry.owned)
      if (missing === 0) continue
      const unit = entry.card.prices?.[source] ?? null
      lines.push({
        card: entry.card,
        missing,
        owned: entry.owned,
        unit,
        subtotal: unit == null ? null : unit * missing,
      })
    }
    if (lines.length === 0) continue
    const subtotal = lines.reduce((sum, line) => sum + (line.subtotal ?? 0), 0)
    const zoneCopies = lines.reduce((sum, line) => sum + line.missing, 0)
    unpricedCount += lines.filter((line) => line.unit == null).length
    totalUsd += subtotal
    missingCopies += zoneCopies
    groups.push({ zone, lines, missingCopies: zoneCopies, subtotal })
  }

  return { groups, missingCopies, totalUsd, unpricedCount }
}

/** Fontes que têm preço para ao menos uma carta faltante (Cardmarket primeiro). */
export function availablePriceSources<T extends PricedCardLine>(
  entries: DeckCardEntry<T>[],
): PriceSource[] {
  return PRICE_SOURCES.filter((source) =>
    entries.some(
      (entry) => entry.card.quantity > entry.owned && (entry.card.prices?.[source] ?? null) != null,
    ),
  )
}

const ZONE_TEXT: Record<DeckZone, string> = {
  main: 'Deck principal',
  extra: 'Extra Deck',
  side: 'Side Deck',
}

export function formatMissingText<T extends PricedCardLine>(params: {
  deckName: string
  characterName: string
  list: MissingList<T>
  source: PriceSource
  unresolvedCount: number
}): string {
  const { list } = params
  const lines: string[] = [`# O que falta - ${params.deckName} (${params.characterName})`]
  for (const group of list.groups) {
    lines.push('', `## ${ZONE_TEXT[group.zone]}`)
    for (const line of group.lines) lines.push(`${line.missing}x ${line.card.name}`)
  }
  const total = `US$ ${list.totalUsd.toFixed(2)}`
  lines.push(
    '',
    `# Total estimado (${PRICE_SOURCE_LABEL[params.source]}): ${total}${
      list.unpricedCount > 0 ? ` (+ ${list.unpricedCount} sem preço)` : ''
    }`,
  )
  if (params.unresolvedCount > 0) {
    lines.push(
      `# Nota: ${params.unresolvedCount} carta(s) não catalogada(s) ficaram fora desta lista.`,
    )
  }
  return `${lines.join('\n')}\n`
}

export function missingFileName(deckName: string, characterName: string): string {
  const slug = (value: string) =>
    normalizeText(value).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  return `faltam-${slug(deckName) || 'deck'}-${slug(characterName) || 'personagem'}.txt`
}

// ---------------------------------------------------------------------------
// Progresso na lista de personagens
// ---------------------------------------------------------------------------

export interface DeckProgressInput {
  characterId: string
  label: string
  cardId: number | null
  quantity: number
}

export interface CharacterDeckProgress {
  label: string
  owned: number
  total: number
  percent: number
}

export interface CharacterProgress {
  decks: CharacterDeckProgress[]
  /** Maior % entre os decks (usado em "Mais completos") */
  best: number
  average: number
}

/** Mesmo cálculo da página do deck (summarizeDeck = computeOwnership): mesmo %. */
export function characterProgress(
  rows: DeckProgressInput[],
  ownedQty: Map<number, number>,
): Map<string, CharacterProgress> {
  const byDeck = new Map<string, Map<string, Array<{ cardId: number | null; quantity: number }>>>()
  for (const row of rows) {
    const decks = byDeck.get(row.characterId) ?? new Map()
    const lines = decks.get(row.label) ?? []
    lines.push({ cardId: row.cardId, quantity: row.quantity })
    decks.set(row.label, lines)
    byDeck.set(row.characterId, decks)
  }
  const result = new Map<string, CharacterProgress>()
  for (const [characterId, decks] of byDeck) {
    const list: CharacterDeckProgress[] = [...decks.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([label, lines]) => {
        const summary = summarizeDeck(lines, ownedQty)
        return { label, owned: summary.owned, total: summary.total, percent: summary.percent }
      })
    const best = list.reduce((max, deck) => Math.max(max, deck.percent), 0)
    const average = list.length ? list.reduce((sum, deck) => sum + deck.percent, 0) / list.length : 0
    result.set(characterId, { decks: list, best, average })
  }
  return result
}

export type CharacterOrder = 'alfabetica' | 'completos'

export function parseCharacterOrder(value: string | null): CharacterOrder {
  return value === 'completos' ? 'completos' : 'alfabetica'
}

/** Alfabética (pt) ou por deck mais completo; desempate alfabético. */
export function sortCharacters<T extends Pick<CharacterListItem, 'id' | 'name'>>(
  characters: T[],
  order: CharacterOrder,
  progress: Map<string, CharacterProgress> | null,
): T[] {
  const alpha = (a: T, b: T) => a.name.localeCompare(b.name, 'pt', { sensitivity: 'base' })
  const copy = [...characters]
  if (order === 'completos' && progress) {
    return copy.sort((a, b) => {
      const pa = progress.get(a.id)
      const pb = progress.get(b.id)
      const diff = (pb?.best ?? -1) - (pa?.best ?? -1)
      if (diff !== 0) return diff
      const avg = (pb?.average ?? -1) - (pa?.average ?? -1)
      return avg !== 0 ? avg : alpha(a, b)
    })
  }
  return copy.sort(alpha)
}

// ---------------------------------------------------------------------------
// "Usada por personagens": consulta reversa carta -> decks (agrupamento puro)
// ---------------------------------------------------------------------------

/** Uma linha de anime_deck_cards já achatada com o deck/personagem (uma por idioma/zona). */
export interface CardUsageRow {
  deckId: string
  deckSlug: string
  deckName: string
  label: string | null
  characterSlug: string
  characterName: string
  series: string | null
  imageSmall: string | null
  /** nome de exibição do anime/série (Clássico, GX, 5D's...) */
  seriesName?: string | null
  seriesOrder: number
  zone: DeckZone
  quantity: number
  language: string
}

export interface CardUsageZone {
  zone: DeckZone
  quantity: number
}

export interface CardUsageDeck {
  deckId: string
  deckSlug: string
  deckName: string
  label: string | null
  zones: CardUsageZone[]
  /** Cópias exigidas pelo deck (soma das zonas) */
  required: number
}

export interface CardUsageCharacter {
  slug: string
  name: string
  series: string | null
  /** nome de exibição do anime/série; use no lugar do slug cru */
  seriesName: string | null
  imageSmall: string | null
  seriesOrder: number
  decks: CardUsageDeck[]
}

export interface CardUsage {
  characters: CardUsageCharacter[]
  deckCount: number
  characterCount: number
  summary: string
}

export function formatUsageSummary(deckCount: number, characterCount: number): string {
  const decks = deckCount === 1 ? '1 deck' : `${deckCount} decks`
  const characters = characterCount === 1 ? '1 personagem' : `${characterCount} personagens`
  return `Usada em ${decks} de ${characters}`
}

/**
 * Agrupa por personagem. Dedupe por (personagem, deck, zona): o seed grava uma linha por idioma com a
 * mesma quantidade, então fica a maior. Ordem: série (animes.sort_order), personagem (A–Z), deck (A/B),
 * zona (main, extra, side).
 */
export function groupCardUsage(rows: CardUsageRow[]): CardUsage {
  const byCharacter = new Map<string, CardUsageCharacter>()
  const zoneByKey = new Map<string, CardUsageZone>()

  for (const row of rows) {
    if (!(row.quantity > 0)) continue
    let character = byCharacter.get(row.characterSlug)
    if (!character) {
      character = {
        slug: row.characterSlug,
        name: row.characterName,
        series: row.series,
        seriesName: row.seriesName ?? null,
        imageSmall: row.imageSmall,
        seriesOrder: row.seriesOrder,
        decks: [],
      }
      byCharacter.set(row.characterSlug, character)
    }
    let deck = character.decks.find((d) => d.deckId === row.deckId)
    if (!deck) {
      deck = { deckId: row.deckId, deckSlug: row.deckSlug, deckName: row.deckName, label: row.label, zones: [], required: 0 }
      character.decks.push(deck)
    }
    const zoneKey = `${row.characterSlug}|${row.deckId}|${row.zone}`
    const existing = zoneByKey.get(zoneKey)
    if (existing) {
      existing.quantity = Math.max(existing.quantity, row.quantity)
    } else {
      const zone: CardUsageZone = { zone: row.zone, quantity: row.quantity }
      zoneByKey.set(zoneKey, zone)
      deck.zones.push(zone)
    }
  }

  const characters = [...byCharacter.values()].sort(
    (a, b) => a.seriesOrder - b.seriesOrder || a.name.localeCompare(b.name, 'pt-BR'),
  )
  let deckCount = 0
  for (const character of characters) {
    for (const deck of character.decks) {
      deck.zones.sort((a, b) => ZONE_ORDER.indexOf(a.zone) - ZONE_ORDER.indexOf(b.zone) || b.quantity - a.quantity)
      deck.required = deck.zones.reduce((sum, z) => sum + z.quantity, 0)
    }
    character.decks.sort(
      (a, b) => (a.label ?? '').localeCompare(b.label ?? '') || a.deckName.localeCompare(b.deckName, 'pt-BR'),
    )
    deckCount += character.decks.length
  }
  return { characters, deckCount, characterCount: characters.length, summary: formatUsageSummary(deckCount, characters.length) }
}

/** Posse da carta frente ao que o deck exige: mesmo cardOwnershipStatus da página do deck. */
export function usageDeckStatus(deck: Pick<CardUsageDeck, 'required'>, ownedCopies: number): OwnershipStatus {
  return cardOwnershipStatus(Math.min(deck.required, Math.max(0, ownedCopies)), deck.required)
}

/** Status agregado do personagem: pior caso entre os decks que usam a carta (completo só se todos). */
export function usageCharacterStatus(character: CardUsageCharacter, ownedCopies: number): OwnershipStatus {
  const statuses = character.decks.map((d) => usageDeckStatus(d, ownedCopies))
  if (statuses.every((s) => s === 'complete')) return 'complete'
  if (statuses.every((s) => s === 'missing')) return 'missing'
  return 'partial'
}

export const USAGE_PREVIEW_LIMIT = 8
