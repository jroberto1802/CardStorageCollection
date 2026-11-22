import { describe, expect, it } from 'vitest'
import type { CharacterListItem } from '@/types'
import {
  applyLocalizedCards,
  buildCardEntries,
  buildListSearch,
  buildSeriesTabs,
  cardOwnershipStatus,
  filterCharacters,
  filterEntries,
  formatDeckProgress,
  normalizeAvatarSrc,
  normalizeText,
  summarizeDeck,
  zoneSummary,
  type DeckCardLine,
} from './characterView'

function character(over: Partial<CharacterListItem> & { name: string; series: string; order: number }) {
  return {
    id: over.name,
    anime_id: over.series,
    name: over.name,
    japanese_name: null,
    slug: over.name.toLowerCase().replace(/\s+/g, '-'),
    description: null,
    image: null,
    image_small: null,
    series: over.series,
    is_duelist: true,
    sort_order: 1,
    created_at: '',
    updated_at: '',
    deckCount: 2,
    anime: {
      id: over.series,
      name: over.series === 'gx' ? 'GX' : 'Clássico',
      slug: over.series,
      sort_order: over.order,
    },
  } as CharacterListItem
}

const chars = [
  character({ name: 'Téa Gardner', series: 'classic', order: 1 }),
  character({ name: 'Seto Kaiba', series: 'classic', order: 1 }),
  character({ name: 'Jaden Yuki', series: 'gx', order: 2 }),
]

describe('avatar', () => {
  it('normaliza .png para .webp só em caminhos locais', () => {
    expect(normalizeAvatarSrc('/characters/grande/GX_JadenYuki.png')).toBe('/characters/grande/GX_JadenYuki.webp')
    expect(normalizeAvatarSrc('/characters/pequeno/a.webp')).toBe('/characters/pequeno/a.webp')
    expect(normalizeAvatarSrc('https://cdn.example.com/a.png')).toBe('https://cdn.example.com/a.png')
    expect(normalizeAvatarSrc(null)).toBeNull()
  })
})

describe('lista de personagens', () => {
  it('normaliza acentos e caixa', () => {
    expect(normalizeText('  TÉA   Gardner ')).toBe('tea gardner')
  })

  it('cria abas só para séries com personagens, na ordem do anime', () => {
    expect(buildSeriesTabs([...chars].reverse())).toEqual([
      { key: 'classic', label: 'Clássico', count: 2 },
      { key: 'gx', label: 'GX', count: 1 },
    ])
  })

  it('filtra por série e por busca sem acento', () => {
    expect(filterCharacters(chars, 'gx', '').map((c) => c.name)).toEqual(['Jaden Yuki'])
    expect(filterCharacters(chars, null, 'tea').map((c) => c.name)).toEqual(['Téa Gardner'])
    expect(filterCharacters(chars, 'gx', 'tea')).toEqual([])
    expect(filterCharacters(chars, null, '')).toHaveLength(3)
  })
})

const cards: DeckCardLine[] = [
  { id: 'a', cardId: 1, quantity: 3, zone: 'main' },
  { id: 'b', cardId: 2, quantity: 1, zone: 'main' },
  { id: 'c', cardId: 3, quantity: 2, zone: 'extra' },
]

describe('posse por carta', () => {
  it('classifica completo, parcial e falta', () => {
    expect(cardOwnershipStatus(3, 3)).toBe('complete')
    expect(cardOwnershipStatus(5, 3)).toBe('complete')
    expect(cardOwnershipStatus(1, 3)).toBe('partial')
    expect(cardOwnershipStatus(0, 1)).toBe('missing')
  })

  it('calcula entradas por carta distinta', () => {
    const entries = buildCardEntries(cards, new Map([[1, 2], [3, 2]]))
    expect(entries.map((e) => [e.owned, e.status])).toEqual([
      [2, 'partial'],
      [0, 'missing'],
      [2, 'complete'],
    ])
  })

  it('não distribui a mesma cópia duas vezes entre zonas', () => {
    const dup: DeckCardLine[] = [
      { id: 'a', cardId: 1, quantity: 2, zone: 'main' },
      { id: 'b', cardId: 1, quantity: 2, zone: 'side' },
    ]
    const entries = buildCardEntries(dup, new Map([[1, 3]]))
    expect(entries.map((e) => e.owned)).toEqual([2, 1])
  })

  it('filtra Todas / Tenho / Faltam', () => {
    const entries = buildCardEntries(cards, new Map([[1, 2], [3, 2]]))
    expect(filterEntries(entries, 'all')).toHaveLength(3)
    expect(filterEntries(entries, 'owned').map((e) => e.card.id)).toEqual(['a', 'c'])
    expect(filterEntries(entries, 'missing').map((e) => e.card.id)).toEqual(['a', 'b'])
  })

  it('resume por zona somando cópias', () => {
    const entries = buildCardEntries(cards, new Map([[1, 2], [3, 2]]))
    expect(zoneSummary(entries, 'main')).toEqual({ total: 4, owned: 2, unresolved: 0 })
    expect(zoneSummary(entries, 'extra')).toEqual({ total: 2, owned: 2, unresolved: 0 })
    expect(zoneSummary(entries, 'side')).toEqual({ total: 0, owned: 0, unresolved: 0 })
  })

  it('soma não catalogadas da zona no total (bate com o resumo do deck)', () => {
    const entries = buildCardEntries(cards, new Map([[1, 3]]))
    const unresolved = [
      { zone: 'main' as const, quantity: 2 },
      { zone: 'side' as const, quantity: 1 },
    ]
    expect(zoneSummary(entries, 'main', unresolved)).toEqual({ total: 6, owned: 3, unresolved: 2 })
    expect(zoneSummary(entries, 'side', unresolved)).toEqual({ total: 1, owned: 0, unresolved: 1 })
    const all = ['main', 'extra', 'side'] as const
    const sum = all.reduce((acc, z) => acc + zoneSummary(entries, z, unresolved).total, 0)
    const summary = summarizeDeck(
      [...cards.map((c) => ({ cardId: c.cardId, quantity: c.quantity })), { cardId: null, quantity: 3 }],
      new Map([[1, 3]]),
    )
    expect(sum).toBe(summary.total)
  })

  it('monta a query da lista preservando serie e q', () => {
    expect(buildListSearch({ serie: 'gx', q: 'tea' })).toBe('?serie=gx&q=tea')
    expect(buildListSearch({ serie: null, q: '' })).toBe('')
    expect(buildListSearch({ q: 'a b' })).toBe('?q=a+b')
  })
})

describe('resumo do deck', () => {
  it('conta não catalogadas no total e como faltantes', () => {
    const summary = summarizeDeck(
      [
        { cardId: 1, quantity: 3 },
        { cardId: null, quantity: 2 },
      ],
      new Map([[1, 3]]),
    )
    expect(summary).toEqual({ owned: 3, total: 5, missing: 2, unresolved: 2, percent: 60 })
    expect(formatDeckProgress(summary)).toBe('3/5 · 2 não catalogadas')
  })

  it('formata sem sufixo quando tudo é catalogado', () => {
    expect(formatDeckProgress(summarizeDeck([{ cardId: 1, quantity: 2 }], new Map()))).toBe('0/2')
  })

  it('deck vazio dá 0%', () => {
    expect(summarizeDeck([], new Map()).percent).toBe(0)
  })
})

describe('idioma das cartas', () => {
  const base = (cardId: number, name: string) => ({
    cardId,
    name,
    type: 'Normal Monster',
    imageUrl: `en-${cardId}`,
    imageUrlSmall: `en-s-${cardId}`,
  })

  it('sobrepõe com o idioma atual e mantém en como fallback', () => {
    const out = applyLocalizedCards(
      [base(1, 'Dark Magician'), base(2, 'Kuriboh')],
      new Map([[1, { language: 'pt', name: 'Mago Negro', type: null, imageUrl: 'pt-1', imageUrlSmall: null }]]),
    )
    expect(out[0]).toMatchObject({
      language: 'pt',
      name: 'Mago Negro',
      type: 'Normal Monster',
      imageUrl: 'pt-1',
      imageUrlSmall: 'en-s-1',
    })
    expect(out[1]).toEqual(base(2, 'Kuriboh'))
  })

  it('sem traduções devolve a lista original', () => {
    const cards = [base(1, 'Dark Magician')]
    expect(applyLocalizedCards(cards, new Map())).toBe(cards)
  })
})
