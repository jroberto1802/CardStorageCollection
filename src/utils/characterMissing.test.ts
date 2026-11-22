import { describe, expect, it } from 'vitest'
import type { CardPriceSources } from '@/types'
import {
  availablePriceSources,
  buildCardEntries,
  buildCreateDeckCards,
  buildMissingList,
  characterProgress,
  formatMissingText,
  missingFileName,
  parseCharacterOrder,
  sortCharacters,
  suggestUserDeckName,
  summarizeDeck,
  validateUserDeckName,
  type PricedCardLine,
} from './characterView'

const prices = (cardmarket: number | null, tcgplayer: number | null = null): CardPriceSources => ({
  cardmarket,
  tcgplayer,
  ebay: null,
  amazon: null,
  coolstuffinc: null,
})

type Card = PricedCardLine & { language: 'en' }
const card = (id: string, cardId: number, qty: number, zone: Card['zone'], p: CardPriceSources | null, name = id): Card => ({
  id,
  cardId,
  quantity: qty,
  zone,
  name,
  prices: p,
  language: 'en',
})

const cards: Card[] = [
  card('a', 1, 3, 'main', prices(1, 2), 'Alpha'),
  card('b', 2, 2, 'main', prices(null, null), 'Beta'),
  card('c', 3, 1, 'extra', prices(10, 12), 'Gamma'),
]

describe('lista O que falta', () => {
  it('calcula faltantes com o mesmo allocateOwnedCopies, por zona, com subtotal e total', () => {
    const entries = buildCardEntries(cards, new Map([[1, 1], [3, 1]]))
    const list = buildMissingList(entries, 'cardmarket')
    expect(list.groups.map((g) => g.zone)).toEqual(['main'])
    expect(list.groups[0].lines.map((l) => [l.card.name, l.missing, l.owned])).toEqual([
      ['Alpha', 2, 1],
      ['Beta', 2, 0],
    ])
    expect(list.groups[0].lines[0]).toMatchObject({ unit: 1, subtotal: 2 })
    expect(list.groups[0].lines[1]).toMatchObject({ unit: null, subtotal: null })
    expect(list.totalUsd).toBe(2)
    expect(list.unpricedCount).toBe(1)
    expect(list.missingCopies).toBe(4)
  })

  it('troca de fonte muda preços; sem faltas devolve lista vazia', () => {
    const entries = buildCardEntries(cards, new Map())
    expect(buildMissingList(entries, 'tcgplayer').totalUsd).toBe(3 * 2 + 12)
    const all = buildCardEntries(cards, new Map([[1, 3], [2, 2], [3, 1]]))
    const none = buildMissingList(all, 'cardmarket')
    expect(none.groups).toEqual([])
    expect(none.totalUsd).toBe(0)
  })

  it('só oferece fontes com preço entre as faltantes', () => {
    const entries = buildCardEntries(cards, new Map([[1, 3], [3, 1]]))
    // só Beta falta e não tem preço em nenhuma fonte
    expect(availablePriceSources(entries)).toEqual([])
    expect(availablePriceSources(buildCardEntries(cards, new Map()))).toEqual(['cardmarket', 'tcgplayer'])
  })

  it('gera o texto com cabeçalho, zonas, quantidades, total e nota de não catalogadas', () => {
    const entries = buildCardEntries(cards, new Map([[1, 1]]))
    const text = formatMissingText({
      deckName: 'Fusion',
      characterName: 'Yugi Muto',
      list: buildMissingList(entries, 'cardmarket'),
      source: 'cardmarket',
      unresolvedCount: 2,
    })
    expect(text.split('\n')).toEqual([
      '# O que falta - Fusion (Yugi Muto)',
      '',
      '## Deck principal',
      '2x Alpha',
      '2x Beta',
      '',
      '## Extra Deck',
      '1x Gamma',
      '',
      '# Total estimado (Cardmarket): US$ 12.00 (+ 1 sem preço)',
      '# Nota: 2 carta(s) não catalogada(s) ficaram fora desta lista.',
      '',
    ])
  })

  it('nome do arquivo com fallback quando o slug fica vazio', () => {
    expect(missingFileName('★★', '!!!')).toBe('faltam-deck-personagem.txt')
  })

  it('nome do arquivo sem acento e em minúsculas', () => {
    expect(missingFileName('Final Destiny', 'Téa Gardner')).toBe('faltam-final-destiny-tea-gardner.txt')
  })
})

describe('criar meu deck (seleção)', () => {
  const entries = buildCardEntries(cards, new Map([[1, 2], [3, 5]]))

  it('todas as cartas', () => {
    expect(buildCreateDeckCards(entries, 'all').map((c) => [c.cardId, c.quantity])).toEqual([
      [1, 3],
      [2, 2],
      [3, 1],
    ])
  })

  it('só as que tenho (limita à posse e remove zeradas)', () => {
    expect(buildCreateDeckCards(entries, 'owned').map((c) => [c.cardId, c.quantity])).toEqual([
      [1, 2],
      [3, 1],
    ])
  })

  it('nome sugerido e validação (trim, máx. 60)', () => {
    expect(suggestUserDeckName('Fusion', 'Yugi Muto')).toBe('Fusion - Yugi Muto')
    expect(suggestUserDeckName('x'.repeat(80), 'y')).toHaveLength(60)
    expect(validateUserDeckName('   ')).toMatch(/Informe/)
    expect(validateUserDeckName('a'.repeat(61))).toMatch(/60/)
    expect(validateUserDeckName('  ok  ')).toBeNull()
  })

  it('conta o nome por code points (emoji vale 1) e não parte par substituto', () => {
    expect(validateUserDeckName('😀'.repeat(60))).toBeNull()
    expect(validateUserDeckName('😀'.repeat(61))).toMatch(/60/)
    const suggested = suggestUserDeckName('😀'.repeat(59), '😀😀')
    expect(Array.from(suggested)).toHaveLength(60)
    expect(suggested.endsWith('\uD83D')).toBe(false)
  })
})

describe('progresso na lista e ordenação', () => {
  const rows = [
    { characterId: 'c1', label: 'A', cardId: 1, quantity: 3 },
    { characterId: 'c1', label: 'A', cardId: null, quantity: 1 },
    { characterId: 'c1', label: 'B', cardId: 2, quantity: 2 },
    { characterId: 'c2', label: 'A', cardId: 2, quantity: 2 },
  ]
  const owned = new Map([[1, 3], [2, 2]])

  it('usa o mesmo cálculo do resumo do deck (mesmo %)', () => {
    const progress = characterProgress(rows, owned)
    const c1 = progress.get('c1')!
    const direct = summarizeDeck(
      [
        { cardId: 1, quantity: 3 },
        { cardId: null, quantity: 1 },
      ],
      owned,
    )
    expect(c1.decks[0]).toEqual({ label: 'A', owned: 3, total: 4, percent: direct.percent })
    expect(c1.decks[0].percent).toBe(75)
    expect(c1.decks[1]).toMatchObject({ label: 'B', percent: 100 })
    expect(c1.best).toBe(100)
    expect(progress.get('c2')!.best).toBe(100)
  })

  const chars = [
    { id: 'c1', name: 'Zane' },
    { id: 'c2', name: 'Alexis' },
    { id: 'c3', name: 'Bastion' },
  ]

  it('ordena alfabeticamente por padrão', () => {
    expect(sortCharacters(chars, 'alfabetica', null).map((c) => c.name)).toEqual(['Alexis', 'Bastion', 'Zane'])
    expect(parseCharacterOrder('x')).toBe('alfabetica')
    expect(parseCharacterOrder('completos')).toBe('completos')
  })

  it('ordena por mais completos com desempate alfabético e sem progresso por último', () => {
    const progress = characterProgress(rows, owned)
    expect(sortCharacters(chars, 'completos', progress).map((c) => c.name)).toEqual(['Alexis', 'Zane', 'Bastion'])
  })

  it('sem progresso disponível cai na ordem alfabética', () => {
    expect(sortCharacters(chars, 'completos', null).map((c) => c.name)).toEqual(['Alexis', 'Bastion', 'Zane'])
  })
})
