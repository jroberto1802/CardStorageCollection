import { supabase } from '@/lib/supabase'
import type {
  Anime,
  AnimeDeckCardView,
  AnimeDeckDetail,
  AppLanguage,
  CharacterDetail,
  CharacterListItem,
  DeckZone,
  ResolvedAnimeDeckCard,
} from '@/types'
import { parseCardImages, parseCardPrices } from '@/utils/cardHelpers'
import {
  applyLocalizedCards,
  groupCardUsage,
  type CardUsage,
  type CardUsageRow,
  type LocalizedCard,
} from '@/utils/characterView'

function asOne<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

export async function listAnimes(): Promise<Anime[]> {
  const { data, error } = await supabase
    .from('animes')
    .select('*')
    .order('sort_order', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []) as Anime[]
}

export async function listCharacters(): Promise<CharacterListItem[]> {
  const { data, error } = await supabase
    .from('characters')
    .select(
      `
      id, anime_id, name, japanese_name, slug, description, image, image_small, series, is_duelist, sort_order, created_at, updated_at,
      animes ( id, name, slug, sort_order ),
      character_decks ( id )
    `,
    )
    .order('sort_order', { ascending: true })

  if (error) throw new Error(error.message)

  const items = (data ?? []).flatMap((row) => {
    const anime = asOne(
      row.animes as CharacterListItem['anime'] | CharacterListItem['anime'][] | null,
    )
    if (!anime) return []
    const links = (row.character_decks ?? []) as { id: string }[]
    return [
      {
        id: row.id,
        anime_id: row.anime_id,
        name: row.name,
        japanese_name: row.japanese_name,
        slug: row.slug,
        description: row.description,
        image: row.image,
        image_small: row.image_small,
        series: row.series,
        is_duelist: row.is_duelist,
        sort_order: row.sort_order,
        created_at: row.created_at,
        updated_at: row.updated_at,
        anime,
        deckCount: links.length,
      },
    ]
  })

  // sort_order reinicia em cada série: agrupa por série (ordem do anime) e depois por personagem.
  return items.sort(
    (a, b) => a.anime.sort_order - b.anime.sort_order || a.sort_order - b.sort_order,
  )
}

export async function getCharacterBySlug(
  slug: string,
): Promise<CharacterDetail | null> {
  const { data, error } = await supabase
    .from('characters')
    .select(
      `
      *,
      animes (*),
      character_decks (
        id, anime_arc, season, description, label, is_primary, sort_order,
        anime_decks (
          id, name, slug, description, image, created_at, updated_at,
          anime_deck_cards ( card_id, zone, quantity )
        )
      )
    `,
    )
    .eq('slug', slug)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null

  const anime = asOne(data.animes as CharacterDetail['anime'] | CharacterDetail['anime'][])
  if (!anime) return null

  const links = (data.character_decks ?? []) as Array<{
    id: string
    anime_arc: string | null
    season: string | null
    description: string | null
    label: string | null
    is_primary: boolean
    sort_order: number
    anime_decks:
      | (CharacterDetail['decks'][number] & {
          anime_deck_cards?: { card_id: number | null; zone: string; quantity: number }[]
        })
      | Array<
          CharacterDetail['decks'][number] & {
            anime_deck_cards?: { card_id: number | null; zone: string; quantity: number }[]
          }
        >
      | null
  }>

  const decks = links
    .map((link) => {
      const deck = asOne(link.anime_decks)
      if (!deck) return null
      const cards = deck.anime_deck_cards ?? []
      const cardCount = cards.reduce((sum, card) => sum + card.quantity, 0)
      const zoneCounts: Record<DeckZone, number> = { main: 0, extra: 0, side: 0 }
      for (const card of cards) {
        if (card.zone in zoneCounts) zoneCounts[card.zone as DeckZone] += card.quantity
      }
      const unresolvedCount = cards.reduce(
        (sum, card) => sum + (card.card_id === null ? card.quantity : 0),
        0,
      )
      return {
        id: deck.id,
        name: deck.name,
        slug: deck.slug,
        description: deck.description,
        image: deck.image,
        created_at: deck.created_at,
        updated_at: deck.updated_at,
        linkId: link.id,
        animeArc: link.anime_arc,
        season: link.season,
        linkDescription: link.description,
        label: link.label,
        isPrimary: link.is_primary,
        sortOrder: link.sort_order,
        cardCount,
        unresolvedCount,
        zoneCounts,
        lines: cards.map((card) => ({ cardId: card.card_id, quantity: card.quantity })),
      }
    })
    .filter((deck): deck is CharacterDetail['decks'][number] => deck !== null)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))

  return {
    id: data.id,
    anime_id: data.anime_id,
    name: data.name,
    japanese_name: data.japanese_name,
    slug: data.slug,
    description: data.description,
    image: data.image,
    image_small: data.image_small,
    series: data.series,
    is_duelist: data.is_duelist,
    sort_order: data.sort_order,
    created_at: data.created_at,
    updated_at: data.updated_at,
    anime,
    decks,
  }
}

/** O import grava só language='en'; busca nome/imagem no idioma atual (fallback: en). */
async function fetchLocalizedCards(
  ids: number[],
  language: AppLanguage,
): Promise<Map<number, LocalizedCard>> {
  const map = new Map<number, LocalizedCard>()
  if (language === 'en' || ids.length === 0) return map
  const { data, error } = await supabase
    .from('cards')
    .select('id, name, type, card_images')
    .eq('language', language)
    .in('id', [...new Set(ids)])
  if (error || !data) {
    console.warn('Falha ao buscar cartas no idioma do app; usando inglês.', error?.message)
    return map
  }
  for (const row of data) {
    const images = parseCardImages(row.card_images)
    map.set(row.id as number, {
      language,
      name: row.name as string,
      type: (row.type as string | null) ?? null,
      imageUrl: images[0]?.image_url ?? null,
      imageUrlSmall: images[0]?.image_url_small ?? images[0]?.image_url ?? null,
    })
  }
  return map
}

export interface DeckProgressRow {
  characterId: string
  label: string
  cardId: number | null
  quantity: number
}

/**
 * Linhas mínimas (carta + quantidade por deck/personagem) para calcular o progresso na lista.
 * Consulta agregada paginada de anime_deck_cards com o vínculo character_decks embutido
 * (sem N+1). Opção futura (RPC/view agregada + cache): ver docs/character-progress-notes.md.
 */
export async function listDeckProgressRows(): Promise<DeckProgressRow[]> {
  const pageSize = 1000
  const select =
    'card_id, quantity, anime_decks!inner ( character_decks ( character_id, label ) )'

  async function page(from: number, withCount: boolean) {
    const { data, error, count } = await supabase
      .from('anime_deck_cards')
      .select(select, withCount ? { count: 'exact' } : undefined)
      .order('id', { ascending: true })
      .range(from, from + pageSize - 1)
    if (error) throw new Error(error.message)
    return { rows: data ?? [], count: count ?? 0 }
  }

  const first = await page(0, true)
  const pages = [first.rows]
  if (first.count > pageSize) {
    const offsets: number[] = []
    for (let from = pageSize; from < first.count; from += pageSize) offsets.push(from)
    const rest = await Promise.all(offsets.map((from) => page(from, false)))
    for (const item of rest) pages.push(item.rows)
  }

  type Raw = {
    card_id: number | null
    quantity: number
    anime_decks:
      | { character_decks: Array<{ character_id: string; label: string | null }> | null }
      | Array<{ character_decks: Array<{ character_id: string; label: string | null }> | null }>
      | null
  }
  const out: DeckProgressRow[] = []
  for (const row of pages.flat() as unknown as Raw[]) {
    const deck = asOne(row.anime_decks)
    for (const link of deck?.character_decks ?? []) {
      if (!link.label) continue
      out.push({
        characterId: link.character_id,
        label: link.label,
        cardId: row.card_id,
        quantity: row.quantity,
      })
    }
  }
  return out
}

export interface CharacterNav {
  slug: string
  name: string
  series: string | null
  decks: Array<{ slug: string; name: string; label: string | null }>
}

/** Select enxuto (sem cartas): série e decks irmãos para breadcrumb e alternador A/B. */
export async function getCharacterNav(slug: string): Promise<CharacterNav | null> {
  const { data, error } = await supabase
    .from('characters')
    .select('slug, name, series, character_decks ( label, sort_order, anime_decks ( slug, name ) )')
    .eq('slug', slug)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null

  const links = (data.character_decks ?? []) as Array<{
    label: string | null
    sort_order: number
    anime_decks: { slug: string; name: string } | Array<{ slug: string; name: string }> | null
  }>
  const decks = links
    .flatMap((link) => {
      const deck = asOne(link.anime_decks)
      return deck ? [{ slug: deck.slug, name: deck.name, label: link.label, sortOrder: link.sort_order }] : []
    })
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(({ slug: deckSlug, name, label }) => ({ slug: deckSlug, name, label }))

  return { slug: data.slug as string, name: data.name as string, series: (data.series as string | null) ?? null, decks }
}

interface DeckCardRow {
  id: string
  quantity: number
  zone: DeckZone
  is_ace: boolean
  is_signature: boolean
  sort_order: number
  card_id: number | null
  card_name: string | null
  language: AppLanguage
  cards:
    | {
        id: number
        name: string
        type: string | null
        card_images: unknown
        card_prices?: unknown
      }
    | Array<{
        id: number
        name: string
        type: string | null
        card_images: unknown
        card_prices?: unknown
      }>
    | null
}

/** Uma linha por carta e zona. O seed grava a mesma quantidade em cada idioma. */
function collapseDeckLanguages(
  cards: ResolvedAnimeDeckCard[],
  language: AppLanguage,
): ResolvedAnimeDeckCard[] {
  const byKey = new Map<string, ResolvedAnimeDeckCard>()
  for (const card of cards) {
    const key = `${card.zone}:${card.cardId}`
    const current = byKey.get(key)
    if (!current || (card.language === language && current.language !== language)) {
      byKey.set(key, card)
    }
  }
  return [...byKey.values()].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
  )
}

export async function getCharacterDeck(params: {
  characterSlug: string
  deckSlug: string
  language: AppLanguage
}): Promise<AnimeDeckDetail | null> {
  const { data, error } = await supabase
    .from('character_decks')
    .select(
      `
      anime_arc, description, label,
      characters!inner ( name, slug, animes ( name, slug ) ),
      anime_decks!inner (
        id, name, slug, description, image, created_at, updated_at,
        anime_deck_cards (
          id, quantity, zone, is_ace, is_signature, sort_order, card_id, card_name, language,
          cards ( id, name, type, card_images, card_prices )
        )
      )
    `,
    )
    .eq('characters.slug', params.characterSlug)
    .eq('anime_decks.slug', params.deckSlug)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null

  const character = asOne(
    data.characters as
      | {
          name: string
          slug: string
          animes: { name: string; slug: string } | { name: string; slug: string }[] | null
        }
      | Array<{
          name: string
          slug: string
          animes: { name: string; slug: string } | { name: string; slug: string }[] | null
        }>
      | null,
  )
  const deck = asOne(
    data.anime_decks as unknown as
      | {
          id: string
          name: string
          slug: string
          description: string | null
          image: string | null
          created_at: string
          updated_at: string
          anime_deck_cards: DeckCardRow[] | null
        }
      | Array<{
          id: string
          name: string
          slug: string
          description: string | null
          image: string | null
          created_at: string
          updated_at: string
          anime_deck_cards: DeckCardRow[] | null
        }>
      | null,
  )
  const anime = character ? asOne(character.animes) : null
  if (!character || !deck || !anime) return null

  const resolved: ResolvedAnimeDeckCard[] = []
  const unresolvedCards: AnimeDeckCardView[] = []
  for (const row of deck.anime_deck_cards ?? []) {
    const base = {
      id: row.id,
      quantity: row.quantity,
      zone: row.zone,
      isAce: row.is_ace,
      isSignature: row.is_signature,
      sortOrder: row.sort_order,
      language: row.language,
    }
    const card = row.card_id === null ? null : asOne(row.cards)
    if (!card) {
      // Sem card_id, ou card_id sem carta no catálogo: conta como não catalogada.
      const cardName = row.card_name ?? ''
      unresolvedCards.push({
        ...base,
        cardId: null,
        prices: null,
        cardName,
        unresolved: true,
        name: cardName,
        type: null,
        imageUrl: null,
        imageUrlSmall: null,
      })
      continue
    }
    const images = parseCardImages(card.card_images)
    resolved.push({
      ...base,
      cardId: row.card_id as number,
      prices: parseCardPrices(card.card_prices),
      cardName: row.card_name ?? card.name,
      unresolved: false,
      name: card.name,
      type: card.type,
      imageUrl: images[0]?.image_url ?? null,
      imageUrlSmall: images[0]?.image_url_small ?? images[0]?.image_url ?? null,
    })
  }
  const collapsed = collapseDeckLanguages(resolved, params.language)
  const localized = await fetchLocalizedCards(
    collapsed.map((card) => card.cardId),
    params.language,
  )
  const cards = applyLocalizedCards(collapsed, localized)
  unresolvedCards.sort((a, b) => a.sortOrder - b.sortOrder)

  return {
    id: deck.id,
    name: deck.name,
    slug: deck.slug,
    description: deck.description,
    image: deck.image,
    created_at: deck.created_at,
    updated_at: deck.updated_at,
    characterName: character.name,
    characterSlug: character.slug,
    animeName: anime.name,
    animeSlug: anime.slug,
    arc: data.anime_arc,
    linkDescription: data.description,
    label: data.label,
    cards,
    unresolvedCards,
    unresolvedCount: unresolvedCards.reduce((sum, card) => sum + card.quantity, 0),
  }
}

interface UsageRow {
  zone: DeckZone
  quantity: number
  language: string
  anime_decks:
    | {
        id: string
        slug: string
        name: string
        character_decks: UsageLink | UsageLink[] | null
      }
    | Array<{ id: string; slug: string; name: string; character_decks: UsageLink | UsageLink[] | null }>
    | null
}

interface UsageCharacter {
  slug: string
  name: string
  series: string | null
  image_small: string | null
  animes: { name: string; sort_order: number } | Array<{ name: string; sort_order: number }> | null
}

interface UsageLink {
  label: string | null
  characters: UsageCharacter | UsageCharacter[] | null
}

/**
 * Consulta reversa: em quais decks de personagens a carta aparece (agrupado por personagem).
 * Usa o índice anime_deck_cards(card_id) (migration 021).
 */
export async function getCardUsageInDecks(cardId: number): Promise<CardUsage> {
  const { data, error } = await supabase
    .from('anime_deck_cards')
    .select(
      `
      zone, quantity, language,
      anime_decks!inner (
        id, slug, name,
        character_decks ( label, characters ( slug, name, series, image_small, animes ( name, sort_order ) ) )
      )
    `,
    )
    .eq('card_id', cardId)
    .limit(1000)

  if (error) throw new Error(error.message)

  const rows: CardUsageRow[] = []
  for (const row of (data ?? []) as unknown as UsageRow[]) {
    const deck = asOne(row.anime_decks)
    if (!deck) continue
    const links = Array.isArray(deck.character_decks) ? deck.character_decks : deck.character_decks ? [deck.character_decks] : []
    for (const link of links) {
      const character = asOne(link.characters)
      if (!character) continue
      rows.push({
        deckId: deck.id,
        deckSlug: deck.slug,
        deckName: deck.name,
        label: link.label,
        characterSlug: character.slug,
        characterName: character.name,
        series: character.series,
        seriesName: asOne(character.animes)?.name ?? null,
        imageSmall: character.image_small,
        seriesOrder: asOne(character.animes)?.sort_order ?? Number.MAX_SAFE_INTEGER,
        zone: row.zone,
        quantity: row.quantity,
        language: row.language,
      })
    }
  }
  return groupCardUsage(rows)
}
