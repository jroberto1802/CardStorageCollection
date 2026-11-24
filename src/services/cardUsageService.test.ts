import { beforeEach, describe, expect, it, vi } from 'vitest'

const limitMock = vi.fn()
const eqMock = vi.fn(() => ({ limit: limitMock }))
const selectMock = vi.fn(() => ({ eq: eqMock }))
const fromMock = vi.fn((_table: string) => ({ select: selectMock }))
vi.mock('@/lib/supabase', () => ({ supabase: { from: (t: string) => fromMock(t) } }))

import { getCardUsageInDecks } from './characterService'

const character = (slug: string, name: string, order: number) => ({
  slug,
  name,
  series: 'classic',
  image_small: null,
  animes: { name: 'Clássico', sort_order: order },
})

beforeEach(() => {
  limitMock.mockReset()
})

describe('getCardUsageInDecks', () => {
  it('consulta anime_deck_cards por card_id e agrupa por personagem (dedupe de idioma)', async () => {
    limitMock.mockResolvedValue({
      error: null,
      data: [
        { zone: 'main', quantity: 3, language: 'en', anime_decks: { id: 'd1', slug: 'a', name: 'A', character_decks: [{ label: 'A', characters: character('yugi', 'Yugi', 1) }] } },
        { zone: 'main', quantity: 3, language: 'pt', anime_decks: [{ id: 'd1', slug: 'a', name: 'A', character_decks: { label: 'A', characters: [character('yugi', 'Yugi', 1)] } }] },
        { zone: 'side', quantity: 1, language: 'en', anime_decks: { id: 'd1', slug: 'a', name: 'A', character_decks: [{ label: 'A', characters: character('yugi', 'Yugi', 1) }] } },
        { zone: 'main', quantity: 2, language: 'en', anime_decks: { id: 'd2', slug: 'b', name: 'B', character_decks: [{ label: 'A', characters: character('atem', 'Atem', 0) }] } },
        { zone: 'main', quantity: 2, language: 'en', anime_decks: null },
      ],
    })
    const usage = await getCardUsageInDecks(46986414)
    expect(fromMock).toHaveBeenCalledWith('anime_deck_cards')
    expect(eqMock).toHaveBeenCalledWith('card_id', 46986414)
    expect(usage.characters.map((c) => c.slug)).toEqual(['atem', 'yugi'])
    expect(usage.characters[1].decks[0]).toMatchObject({ required: 4 })
    expect(usage.summary).toBe('Usada em 2 decks de 2 personagens')
    // a série exibida é o NOME do anime, não o slug cru
    expect(usage.characters[0]).toMatchObject({ series: 'classic', seriesName: 'Clássico' })
  })

  it('propaga erro do Supabase', async () => {
    limitMock.mockResolvedValue({ error: { message: 'falhou' }, data: null })
    await expect(getCardUsageInDecks(1)).rejects.toThrow('falhou')
  })
})
