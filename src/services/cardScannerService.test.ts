import { describe, expect, it } from 'vitest'
import {
  extractCardNameCandidates,
  stripCardTypeFromName,
} from '@/services/cardScannerService'

describe('stripCardTypeFromName', () => {
  it('keeps only the card name when TRAP is on the same line', () => {
    expect(stripCardTypeFromName('ICE BARRIER TRAP')).toBe('ICE BARRIER')
  })

  it('removes SPELL and Portuguese type words', () => {
    expect(stripCardTypeFromName('Raigeki SPELL')).toBe('Raigeki')
    expect(stripCardTypeFromName('Barreira de Gelo Armadilha')).toBe(
      'Barreira de Gelo',
    )
  })

  it('strips CJK noise from trap icon OCR', () => {
    expect(stripCardTypeFromName('ICE BARRIER 罠 TRAP')).toBe('ICE BARRIER')
  })
})

describe('extractCardNameCandidates', () => {
  it('includes name without type token', () => {
    const names = extractCardNameCandidates('ICE BARRIER TRAP\nSomething else')
    expect(names).toContain('ICE BARRIER')
    expect(names.some((n) => /\bTRAP\b/i.test(n))).toBe(false)
  })
})
