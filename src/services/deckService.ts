import { supabase } from '@/lib/supabase'
import type {
  AppLanguage,
  Deck,
  DeckCard,
  DeckCardSlot,
  DeckSummary,
  DeckZone,
} from '@/types'
import { getPrimaryImage, resolveDeckZone } from '@/utils/cardHelpers'
import { getCardById, getCardsByIdsWithFallback } from '@/services/catalogService'
import {
  MAX_COPIES_PER_CARD,
  MAX_EXTRA_DECK,
  MAX_MAIN_DECK,
  MAX_SIDE_DECK,
} from '@/types'

function mapDeck(row: Record<string, unknown>): Deck {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    name: String(row.name),
    language: row.language as AppLanguage,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  }
}

function mapDeckCard(row: Record<string, unknown>): DeckCard {
  return {
    id: String(row.id),
    deck_id: String(row.deck_id),
    card_id: Number(row.card_id),
    language: row.language as AppLanguage,
    zone: row.zone as DeckZone,
    position: Number(row.position ?? 0),
    created_at: String(row.created_at),
  }
}

async function touchDeck(deckId: string): Promise<void> {
  await supabase
    .from('decks')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', deckId)
}

export async function listDecks(): Promise<DeckSummary[]> {
  const { data, error } = await supabase
    .from('decks')
    .select('*')
    .order('updated_at', { ascending: false })

  if (error) throw new Error(error.message)

  const decks = (data ?? []).map((row) => mapDeck(row as Record<string, unknown>))
  if (decks.length === 0) return []

  const { data: cards, error: cardsError } = await supabase
    .from('deck_cards')
    .select('deck_id, zone')
    .in(
      'deck_id',
      decks.map((d) => d.id),
    )

  if (cardsError) throw new Error(cardsError.message)

  const counts = new Map<string, { main: number; extra: number; side: number }>()
  for (const row of cards ?? []) {
    const deckId = String((row as { deck_id: string }).deck_id)
    const zone = (row as { zone: DeckZone }).zone
    const current = counts.get(deckId) ?? { main: 0, extra: 0, side: 0 }
    if (zone === 'extra') current.extra += 1
    else if (zone === 'side') current.side += 1
    else current.main += 1
    counts.set(deckId, current)
  }

  return decks.map((deck) => {
    const c = counts.get(deck.id) ?? { main: 0, extra: 0, side: 0 }
    return {
      ...deck,
      mainCount: c.main,
      extraCount: c.extra,
      sideCount: c.side,
    }
  })
}

export async function getDeck(deckId: string): Promise<Deck | null> {
  const { data, error } = await supabase
    .from('decks')
    .select('*')
    .eq('id', deckId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null
  return mapDeck(data as Record<string, unknown>)
}

export async function createDeck(
  language: AppLanguage,
  name = 'Novo deck',
): Promise<Deck> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) throw new Error(userError.message)
  if (!user) throw new Error('Usuário não autenticado')

  const { data, error } = await supabase
    .from('decks')
    .insert({
      user_id: user.id,
      name: name.trim() || 'Novo deck',
      language,
    })
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return mapDeck(data as Record<string, unknown>)
}

export async function renameDeck(deckId: string, name: string): Promise<Deck> {
  const { data, error } = await supabase
    .from('decks')
    .update({
      name: name.trim() || 'Novo deck',
      updated_at: new Date().toISOString(),
    })
    .eq('id', deckId)
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return mapDeck(data as Record<string, unknown>)
}

export async function deleteDeck(deckId: string): Promise<void> {
  const { error } = await supabase.from('decks').delete().eq('id', deckId)
  if (error) throw new Error(error.message)
}

export async function listDeckCardSlots(
  deckId: string,
  language: AppLanguage,
): Promise<DeckCardSlot[]> {
  const { data, error } = await supabase
    .from('deck_cards')
    .select('*')
    .eq('deck_id', deckId)
    .order('position', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)

  const rows = (data ?? []).map((row) => mapDeckCard(row as Record<string, unknown>))
  if (rows.length === 0) return []

  const cards = await getCardsByIdsWithFallback(
    language,
    [...new Set(rows.map((r) => r.card_id))],
  )
  const cardMap = new Map(cards.map((c) => [c.id, c]))

  return rows.map((row) => {
    const card = cardMap.get(row.card_id)
    const images = card ? getPrimaryImage(card) : { full: null, small: null }
    return {
      ...row,
      name: card?.name ?? `#${row.card_id}`,
      type: card?.type ?? null,
      frameType: card?.frame_type ?? null,
      race: card?.race ?? null,
      imageUrl: images.full,
      imageUrlSmall: images.small,
    }
  })
}

export type AddCardResult =
  | { ok: true; slot: DeckCardSlot; zone: DeckZone }
  | { ok: false; reason: string }

export async function addCardToDeck(params: {
  deckId: string
  language: AppLanguage
  cardId: number
  name: string
  type: string | null
  frameType: string | null
  race: string | null
  imageUrl: string | null
  imageUrlSmall: string | null
  /** Força zona (ex.: drop no Side Deck / import da comunidade) */
  forcedZone?: DeckZone
}): Promise<AddCardResult> {
  const zone =
    params.forcedZone ?? resolveDeckZone(params.type, params.frameType)

  // FK (card_id, language) → cards: usa o idioma em que a carta realmente existe
  let cardLanguage = params.language
  const existingCard =
    (await getCardById(params.cardId, params.language, { fallbackToEn: false })) ??
    (params.language === 'pt'
      ? await getCardById(params.cardId, 'en', { fallbackToEn: false })
      : await getCardById(params.cardId, 'pt', { fallbackToEn: false }))

  if (!existingCard) {
    return {
      ok: false,
      reason: 'Carta não encontrada no catálogo sincronizado.',
    }
  }
  cardLanguage = existingCard.language

  const { data: existing, error: existingError } = await supabase
    .from('deck_cards')
    .select('id, card_id, zone, position')
    .eq('deck_id', params.deckId)

  if (existingError) throw new Error(existingError.message)

  const rows = existing ?? []
  const copiesOfCard = rows.filter((r) => Number(r.card_id) === params.cardId).length
  if (copiesOfCard >= MAX_COPIES_PER_CARD) {
    return {
      ok: false,
      reason: `Limite de ${MAX_COPIES_PER_CARD} cópias desta carta no deck.`,
    }
  }

  const zoneCount = rows.filter((r) => r.zone === zone).length
  if (zone === 'main' && zoneCount >= MAX_MAIN_DECK) {
    return { ok: false, reason: `Deck principal cheio (máx. ${MAX_MAIN_DECK}).` }
  }
  if (zone === 'extra' && zoneCount >= MAX_EXTRA_DECK) {
    return { ok: false, reason: `Extra Deck cheio (máx. ${MAX_EXTRA_DECK}).` }
  }
  if (zone === 'side' && zoneCount >= MAX_SIDE_DECK) {
    return { ok: false, reason: `Side Deck cheio (máx. ${MAX_SIDE_DECK}).` }
  }

  const zonePositions = rows
    .filter((r) => r.zone === zone)
    .map((r) => Number(r.position))
  const position = zonePositions.length > 0 ? Math.max(...zonePositions) + 1 : 0

  const { data, error } = await supabase
    .from('deck_cards')
    .insert({
      deck_id: params.deckId,
      card_id: params.cardId,
      language: cardLanguage,
      zone,
      position,
    })
    .select('*')
    .single()

  if (error) throw new Error(error.message)

  await touchDeck(params.deckId)

  const mapped = mapDeckCard(data as Record<string, unknown>)
  return {
    ok: true,
    zone,
    slot: {
      ...mapped,
      name: params.name || existingCard.name,
      type: params.type ?? existingCard.type,
      frameType: params.frameType ?? existingCard.frame_type,
      race: params.race ?? existingCard.race,
      imageUrl: params.imageUrl,
      imageUrlSmall: params.imageUrlSmall,
    },
  }
}

export async function removeDeckCard(
  deckId: string,
  deckCardId: string,
): Promise<void> {
  const { error } = await supabase
    .from('deck_cards')
    .delete()
    .eq('id', deckCardId)
    .eq('deck_id', deckId)

  if (error) throw new Error(error.message)
  await touchDeck(deckId)
}

export async function clearDeckZone(
  deckId: string,
  zone: DeckZone,
): Promise<void> {
  const { error } = await supabase
    .from('deck_cards')
    .delete()
    .eq('deck_id', deckId)
    .eq('zone', zone)

  if (error) throw new Error(error.message)
  await touchDeck(deckId)
}
