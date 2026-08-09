import { supabase } from '@/lib/supabase'
import type {
  AddToCollectionInput,
  AlbumSlot,
  AppLanguage,
  CollectionItem,
  CollectionItemWithCard,
  CollectionSetOption,
} from '@/types'
import { getPrimaryImage, parseCardSets } from '@/utils/cardHelpers'
import { getCardById, getCardsByIds, getCardsBySetName } from '@/services/catalogService'

function mapItem(row: Record<string, unknown>): CollectionItem {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    card_id: Number(row.card_id),
    language: row.language as AppLanguage,
    set_code: String(row.set_code),
    set_name: String(row.set_name ?? ''),
    set_rarity: String(row.set_rarity ?? ''),
    quantity: Number(row.quantity ?? 1),
    notes: (row.notes as string | null) ?? null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  }
}

/** Prefixo da coleção a partir do set_code (LOB-EN001 → LOB) */
export function extractSetPrefix(setCode: string): string {
  const code = setCode.trim().toUpperCase()
  const match = code.match(/^([A-Z0-9]+)/)
  return match?.[1] ?? code
}

/** Lista inventário completo (não filtra por idioma das configs) */
export async function listCollectionItems(): Promise<CollectionItem[]> {
  const pageSize = 1000
  const all: CollectionItem[] = []

  for (let from = 0; ; from += pageSize) {
    const to = from + pageSize - 1
    const { data, error } = await supabase
      .from('collection_items')
      .select('*')
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) throw new Error(error.message)
    const page = (data ?? []).map((row) => mapItem(row as Record<string, unknown>))
    all.push(...page)
    if (page.length < pageSize) break
  }

  return all
}

/**
 * Inventário com dados da carta.
 * Carrega PT e EN; em configs PT, cartas só em inglês ainda aparecem com nome/imagem.
 */
export async function listCollectionWithCards(
  preferredLanguage: AppLanguage = 'pt',
): Promise<CollectionItemWithCard[]> {
  const items = await listCollectionItems()
  if (items.length === 0) return []

  const uniqueIds = [...new Set(items.map((item) => item.card_id))]

  // Sempre busca os dois idiomas — evita sumir cartas só-EN com o app em PT
  const [ptCards, enCards] = await Promise.all([
    getCardsByIds('pt', uniqueIds),
    getCardsByIds('en', uniqueIds),
  ])
  const ptMap = new Map(ptCards.map((card) => [card.id, card]))
  const enMap = new Map(enCards.map((card) => [card.id, card]))

  return items.map((item) => {
    const byItemLang = item.language === 'pt' ? ptMap : enMap
    const byPreferred = preferredLanguage === 'pt' ? ptMap : enMap
    const byOther = preferredLanguage === 'pt' ? enMap : ptMap

    // 1) idioma em que o item foi salvo (FK garante existência)
    // 2) idioma das configs (ex.: nome em PT se existir)
    // 3) qualquer outro
    const card =
      byItemLang.get(item.card_id) ??
      byPreferred.get(item.card_id) ??
      byOther.get(item.card_id) ??
      null

    return {
      ...item,
      card,
    }
  })
}

/** Busca posse pela impressão (independente do idioma salvo) */
export async function findCollectionItem(params: {
  cardId: number
  setCode: string
  setRarity: string
  language?: AppLanguage
}): Promise<CollectionItem | null> {
  let query = supabase
    .from('collection_items')
    .select('*')
    .eq('card_id', params.cardId)
    .eq('set_code', params.setCode)
    .eq('set_rarity', params.setRarity)
    .limit(1)

  if (params.language) {
    query = query.eq('language', params.language)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  const row = data?.[0]
  if (!row) return null
  return mapItem(row as Record<string, unknown>)
}

/** Todas as impressões (set codes) que o usuário possui desta carta */
export async function listCollectionItemsByCardId(
  cardId: number,
): Promise<CollectionItem[]> {
  const { data, error } = await supabase
    .from('collection_items')
    .select('*')
    .eq('card_id', cardId)
    .order('set_code', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => mapItem(row as Record<string, unknown>))
}

export async function addToCollection(
  input: AddToCollectionInput,
): Promise<CollectionItem> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) throw new Error(userError.message)
  if (!user) throw new Error('Usuário não autenticado')

  // Reusa qualquer idioma já cadastrado para a mesma impressão
  const existing = await findCollectionItem({
    cardId: input.card_id,
    setCode: input.set_code,
    setRarity: input.set_rarity,
  })

  if (existing) {
    const nextQty = existing.quantity + (input.quantity ?? 1)
    const { data, error } = await supabase
      .from('collection_items')
      .update({ quantity: nextQty, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select('*')
      .single()

    if (error) throw new Error(error.message)
    return mapItem(data as Record<string, unknown>)
  }

  const { data, error } = await supabase
    .from('collection_items')
    .insert({
      user_id: user.id,
      card_id: input.card_id,
      language: input.language,
      set_code: input.set_code,
      set_name: input.set_name,
      set_rarity: input.set_rarity,
      quantity: input.quantity ?? 1,
    })
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return mapItem(data as Record<string, unknown>)
}

export async function updateCollectionQuantity(
  id: string,
  quantity: number,
): Promise<CollectionItem | null> {
  if (quantity < 1) {
    await removeFromCollection(id)
    return null
  }

  const { data, error } = await supabase
    .from('collection_items')
    .update({ quantity, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return mapItem(data as Record<string, unknown>)
}

export async function removeFromCollection(id: string): Promise<void> {
  const { error } = await supabase.from('collection_items').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function getOwnedSetOptions(): Promise<CollectionSetOption[]> {
  const items = await listCollectionItems()
  const map = new Map<string, CollectionSetOption>()

  for (const item of items) {
    const key = item.set_name || item.set_code
    const current = map.get(key)
    if (current) {
      current.ownedCount += 1
      if (!current.setCodes.includes(item.set_code)) {
        current.setCodes.push(item.set_code)
      }
    } else {
      map.set(key, {
        setName: item.set_name || 'Sem nome',
        setPrefix: extractSetPrefix(item.set_code),
        setCodes: [item.set_code],
        ownedCount: 1,
      })
    }
  }

  return [...map.values()].sort((a, b) => a.setName.localeCompare(b.setName, 'pt-BR'))
}

export async function buildAlbumSlots(params: {
  language: AppLanguage
  setName: string
}): Promise<AlbumSlot[]> {
  const [cards, owned] = await Promise.all([
    getCardsBySetName(params.language, params.setName),
    listCollectionItems(),
  ])

  const setNameLower = params.setName.toLowerCase()

  const ownedByCard = new Map<number, CollectionItem[]>()
  for (const item of owned) {
    const list = ownedByCard.get(item.card_id) ?? []
    list.push(item)
    ownedByCard.set(item.card_id, list)
  }

  const slots: AlbumSlot[] = []

  for (const card of cards) {
    const sets = parseCardSets(card.card_sets).filter(
      (set) => set.set_name.toLowerCase() === setNameLower,
    )
    if (sets.length === 0) continue

    const primary = [...sets].sort((a, b) =>
      a.set_code.localeCompare(b.set_code, 'en', { numeric: true }),
    )[0]

    const albumSetCodes = new Set(sets.map((set) => set.set_code.toLowerCase()))
    const versions = ownedByCard.get(card.id) ?? []
    const images = getPrimaryImage(card)

    const ownedInAlbum =
      versions.find(
        (item) =>
          item.set_name.toLowerCase() === setNameLower ||
          albumSetCodes.has(item.set_code.toLowerCase()),
      ) ?? null

    const ownedOther =
      [...versions]
        .filter(
          (item) =>
            item.set_name.toLowerCase() !== setNameLower &&
            !albumSetCodes.has(item.set_code.toLowerCase()),
        )
        .sort((a, b) => b.quantity - a.quantity)[0] ?? null

    const preferred = ownedInAlbum ?? ownedOther

    slots.push({
      cardId: card.id,
      language: card.language,
      name: card.name,
      setCode: primary.set_code,
      setName: primary.set_name,
      setRarity: primary.set_rarity || '—',
      imageUrl: images.full,
      imageUrlSmall: images.small,
      owned: Boolean(preferred),
      ownedInAlbumSet: Boolean(ownedInAlbum),
      ownedSetCode: !ownedInAlbum && ownedOther ? ownedOther.set_code : null,
      quantity: preferred?.quantity ?? 0,
      collectionItemId: preferred?.id ?? null,
    })
  }

  slots.sort((a, b) => a.setCode.localeCompare(b.setCode, 'en', { numeric: true }))
  return slots
}

export async function ensureCardExists(
  cardId: number,
  language: AppLanguage,
) {
  return getCardById(cardId, language)
}
