import { supabase } from '@/lib/supabase'
import type {
  Anime,
  AnimeDeckCardView,
  AnimeDeckDetail,
  AppLanguage,
  CharacterDetail,
  CharacterListItem,
  DeckZone,
} from '@/types'
import { parseCardImages } from '@/utils/cardHelpers'

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
      id, anime_id, name, japanese_name, slug, description, image, is_duelist, sort_order, created_at, updated_at,
      animes ( id, name, slug, sort_order ),
      character_decks ( id )
    `,
    )
    .order('sort_order', { ascending: true })

  if (error) throw new Error(error.message)

  return (data ?? []).flatMap((row) => {
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
        is_duelist: row.is_duelist,
        sort_order: row.sort_order,
        created_at: row.created_at,
        updated_at: row.updated_at,
        anime,
        deckCount: links.length,
      },
    ]
  })
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
        id, anime_arc, season, description, is_primary, sort_order,
        anime_decks (
          id, name, slug, description, image, created_at, updated_at,
          anime_deck_cards ( card_id, zone )
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
    is_primary: boolean
    sort_order: number
    anime_decks:
      | (CharacterDetail['decks'][number] & {
          anime_deck_cards?: { card_id: number; zone: string }[]
        })
      | Array<
          CharacterDetail['decks'][number] & {
            anime_deck_cards?: { card_id: number; zone: string }[]
          }
        >
      | null
  }>

  const decks = links
    .map((link) => {
      const deck = asOne(link.anime_decks)
      if (!deck) return null
      const cards = deck.anime_deck_cards ?? []
      const uniqueCards = new Set(cards.map((card) => `${card.zone}:${card.card_id}`))
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
        isPrimary: link.is_primary,
        sortOrder: link.sort_order,
        cardCount: uniqueCards.size,
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
    is_duelist: data.is_duelist,
    sort_order: data.sort_order,
    created_at: data.created_at,
    updated_at: data.updated_at,
    anime,
    decks,
  }
}

interface DeckCardRow {
  id: string
  quantity: number
  zone: DeckZone
  is_ace: boolean
  is_signature: boolean
  sort_order: number
  card_id: number
  language: AppLanguage
  cards:
    | {
        id: number
        name: string
        type: string | null
        card_images: unknown
      }
    | Array<{
        id: number
        name: string
        type: string | null
        card_images: unknown
      }>
    | null
}

/** Uma linha por carta e zona. O seed grava a mesma quantidade em cada idioma. */
function collapseDeckLanguages(
  cards: AnimeDeckCardView[],
  language: AppLanguage,
): AnimeDeckCardView[] {
  const byKey = new Map<string, AnimeDeckCardView>()
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
      anime_arc, description,
      characters!inner ( name, slug, animes ( name, slug ) ),
      anime_decks!inner (
        id, name, slug, description, image, created_at, updated_at,
        anime_deck_cards (
          id, quantity, zone, is_ace, is_signature, sort_order, card_id, language,
          cards ( id, name, type, card_images )
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

  const cards = collapseDeckLanguages(
    (deck.anime_deck_cards ?? []).flatMap((row) => {
      const card = asOne(row.cards)
      if (!card) return []
      const images = parseCardImages(card.card_images)
      const view: AnimeDeckCardView = {
        id: row.id,
        quantity: row.quantity,
        zone: row.zone,
        isAce: row.is_ace,
        isSignature: row.is_signature,
        sortOrder: row.sort_order,
        cardId: row.card_id,
        language: row.language,
        name: card.name,
        type: card.type,
        imageUrl: images[0]?.image_url ?? null,
        imageUrlSmall: images[0]?.image_url_small ?? images[0]?.image_url ?? null,
      }
      return [view]
    }),
    params.language,
  )

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
    cards,
  }
}
