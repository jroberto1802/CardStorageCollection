import { describe, expect, it } from 'vitest'
import {
  formatUsageSummary,
  groupCardUsage,
  usageCharacterStatus,
  usageDeckStatus,
  type CardUsageRow,
} from './characterView'

const row = (over: Partial<CardUsageRow>): CardUsageRow => ({
  deckId: 'd1',
  deckSlug: 'deck-1',
  deckName: 'Deck 1',
  label: 'A',
  characterSlug: 'yugi',
  characterName: 'Yugi Muto',
  series: 'Yu-Gi-Oh!',
  imageSmall: null,
  seriesOrder: 1,
  zone: 'main',
  quantity: 3,
  language: 'en',
  ...over,
})

describe('groupCardUsage', () => {
  it('dedupe por (personagem, deck, zona): uma linha por idioma vira uma', () => {
    const usage = groupCardUsage([row({ language: 'en' }), row({ language: 'pt' })])
    expect(usage.deckCount).toBe(1)
    expect(usage.characters[0].decks[0].zones).toEqual([{ zone: 'main', quantity: 3 }])
    expect(usage.characters[0].decks[0].required).toBe(3)
  })

  it('mesma carta em main e side no mesmo deck soma a exigência e ordena as zonas', () => {
    const usage = groupCardUsage([row({ zone: 'side', quantity: 1 }), row({ zone: 'main', quantity: 2 })])
    const deck = usage.characters[0].decks[0]
    expect(deck.zones.map((z) => z.zone)).toEqual(['main', 'side'])
    expect(deck.required).toBe(3)
  })

  it('ordena séries por sort_order, personagens A–Z e decks por rótulo', () => {
    const usage = groupCardUsage([
      row({ characterSlug: 'z', characterName: 'Zane', seriesOrder: 3, deckId: 'z1' }),
      row({ characterSlug: 'b', characterName: 'Bastion', seriesOrder: 2, deckId: 'b1' }),
      row({ characterSlug: 'a', characterName: 'Alexis', seriesOrder: 2, deckId: 'a1' }),
      row({ characterSlug: 'a', characterName: 'Alexis', seriesOrder: 2, deckId: 'a2', label: 'B', deckName: 'B deck' }),
      row({ characterSlug: 'a', characterName: 'Alexis', seriesOrder: 2, deckId: 'a0', label: 'A', deckName: 'A deck' }),
      row({ characterSlug: 'y', characterName: 'Yugi', seriesOrder: 1, deckId: 'y1' }),
    ])
    expect(usage.characters.map((c) => c.name)).toEqual(['Yugi', 'Alexis', 'Bastion', 'Zane'])
    // mesmo rótulo A: desempata pelo nome ('A deck' < 'Deck 1'); depois o rótulo B
    expect(usage.characters[1].decks.map((d) => d.deckId)).toEqual(['a0', 'a1', 'a2'])
  })

  it('personagem com os dois decks (A e B) conta 2 decks e 1 personagem', () => {
    const usage = groupCardUsage([
      row({ deckId: 'd1', label: 'A' }),
      row({ deckId: 'd2', label: 'B', deckSlug: 'deck-2', deckName: 'Deck 2' }),
    ])
    expect(usage).toMatchObject({ deckCount: 2, characterCount: 1, summary: 'Usada em 2 decks de 1 personagem' })
  })

  it('ignora quantidade zero e lista vazia', () => {
    expect(groupCardUsage([row({ quantity: 0 })]).characters).toEqual([])
    expect(groupCardUsage([])).toMatchObject({ deckCount: 0, characterCount: 0 })
  })

  it('resumo no singular e no plural', () => {
    expect(formatUsageSummary(1, 1)).toBe('Usada em 1 deck de 1 personagem')
    expect(formatUsageSummary(5, 3)).toBe('Usada em 5 decks de 3 personagens')
  })
})

describe('status de posse por deck', () => {
  const usage = groupCardUsage([
    row({ deckId: 'd1', quantity: 3 }),
    row({ deckId: 'd2', quantity: 1, deckSlug: 'deck-2', label: 'B' }),
  ])
  const [d1, d2] = usage.characters[0].decks

  it('completo / parcial / falta pela cópias da carta', () => {
    expect(usageDeckStatus(d1, 3)).toBe('complete')
    expect(usageDeckStatus(d1, 5)).toBe('complete')
    expect(usageDeckStatus(d1, 1)).toBe('partial')
    expect(usageDeckStatus(d1, 0)).toBe('missing')
    expect(usageDeckStatus(d2, 1)).toBe('complete')
  })

  it('status do personagem: pior caso entre os decks', () => {
    expect(usageCharacterStatus(usage.characters[0], 3)).toBe('complete')
    expect(usageCharacterStatus(usage.characters[0], 1)).toBe('partial')
    expect(usageCharacterStatus(usage.characters[0], 0)).toBe('missing')
  })
})

describe('nome de exibição da série', () => {
  it('guarda seriesName (anime) separado do slug cru', () => {
    const usage = groupCardUsage([row({ series: 'classic', seriesName: 'Clássico' })])
    expect(usage.characters[0]).toMatchObject({ series: 'classic', seriesName: 'Clássico' })
    expect(groupCardUsage([row({ series: 'gx' })]).characters[0].seriesName).toBeNull()
  })
})
