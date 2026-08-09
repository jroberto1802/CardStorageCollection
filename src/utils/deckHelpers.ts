import type { DeckCardSlot } from '@/types'
import { getCardCategory } from '@/utils/cardHelpers'

/**
 * Ordem de tipo no Deck Principal:
 * Normal → Effect → Ritual → Pendulum → Spell → Trap → outros
 */
function mainTypeWeight(type: string | null, frameType: string | null): number {
  const t = `${type ?? ''} ${frameType ?? ''}`.toLowerCase()
  const category = getCardCategory(type)

  if (category === 'spell') return 50
  if (category === 'trap') return 60

  if (category === 'monster' || t.includes('monster') || t.includes('monstro')) {
    if (t.includes('ritual')) return 30
    if (t.includes('pendulum') || t.includes('pêndulo') || t.includes('pendulo')) return 40
    if (
      (t.includes('normal') && !t.includes('effect') && !t.includes('efeito')) ||
      frameType === 'normal'
    ) {
      return 10
    }
    // Effect e demais monstros do main
    return 20
  }

  return 90
}

/**
 * Ordem de tipo no Extra Deck:
 * Fusion → Synchro → Xyz → Link → outros
 */
function extraTypeWeight(type: string | null, frameType: string | null): number {
  const t = `${type ?? ''} ${frameType ?? ''}`.toLowerCase()

  if (t.includes('fusion') || t.includes('fusão') || t.includes('fusao')) return 10
  if (t.includes('synchro') || t.includes('sincro')) return 20
  if (t.includes('xyz')) return 30
  if (t.includes('link')) return 40
  return 90
}

export function sortDeckSlotsByType(
  slots: DeckCardSlot[],
  zone: 'main' | 'extra' | 'side',
): DeckCardSlot[] {
  const weight = zone === 'extra' ? extraTypeWeight : mainTypeWeight

  // Agrupa cópias da mesma carta
  const order: number[] = []
  const groups = new Map<number, DeckCardSlot[]>()

  for (const slot of slots) {
    if (!groups.has(slot.card_id)) {
      order.push(slot.card_id)
      groups.set(slot.card_id, [])
    }
    groups.get(slot.card_id)!.push(slot)
  }

  // Ordena grupos por tipo, depois race (só no principal), depois nome
  order.sort((aId, bId) => {
    const a = groups.get(aId)![0]
    const b = groups.get(bId)![0]
    const wa = weight(a.type, a.frameType)
    const wb = weight(b.type, b.frameType)
    if (wa !== wb) return wa - wb

    if (zone === 'main') {
      const raceCmp = (a.race ?? '').localeCompare(b.race ?? '', 'en', {
        sensitivity: 'base',
      })
      if (raceCmp !== 0) return raceCmp
    }

    return a.name.localeCompare(b.name, 'pt-BR')
  })

  return order.flatMap((id) => groups.get(id) ?? [])
}

/** @deprecated use sortDeckSlotsByType */
export function groupDeckSlotsByCard<T extends { card_id: number; position: number }>(
  slots: T[],
): T[] {
  const order: number[] = []
  const groups = new Map<number, T[]>()
  const sorted = [...slots].sort((a, b) => a.position - b.position)

  for (const slot of sorted) {
    if (!groups.has(slot.card_id)) {
      order.push(slot.card_id)
      groups.set(slot.card_id, [])
    }
    groups.get(slot.card_id)!.push(slot)
  }

  return order.flatMap((id) => groups.get(id) ?? [])
}
