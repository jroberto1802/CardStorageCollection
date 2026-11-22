import { allocateOwnedCopies, computeOwnership } from '@/services/syncedDeckService'
import type { CharacterListItem, DeckZone } from '@/types'

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
  T extends { cardId: number | null; name: string; type: string | null; imageUrl: string | null; imageUrlSmall: string | null },
>(cards: T[], localized: Map<number, LocalizedCard>): T[] {
  if (localized.size === 0) return cards
  return cards.map((card) => {
    const loc = card.cardId == null ? undefined : localized.get(card.cardId)
    if (!loc) return card
    return {
      ...card,
      name: loc.name || card.name,
      type: loc.type ?? card.type,
      imageUrl: loc.imageUrl ?? card.imageUrl,
      imageUrlSmall: loc.imageUrlSmall ?? card.imageUrlSmall,
    }
  })
}
