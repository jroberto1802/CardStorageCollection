import { describe, expect, it } from 'vitest'
import {
  extractCardNameCandidates,
  normalizeSetCode,
  stripCardTypeFromName,
} from '@/services/cardScannerService'
import { getYgoTextRegions } from '@/utils/cardFrameDetector'
import {
  buildScannerQueryVariants,
  nameSimilarity,
} from '@/utils/ocrSuggest'

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

describe('normalizeSetCode', () => {
  it('accepts valid set codes', () => {
    expect(normalizeSetCode('BLVO-EN068')).toBe('BLVO-EN068')
    expect(normalizeSetCode('blvo-en068')).toBe('BLVO-EN068')
  })

  it('fixes common OCR mistakes in numeric suffix', () => {
    expect(normalizeSetCode('BLVO-ENO68')).toBe('BLVO-EN068')
    expect(normalizeSetCode('BLVO-EN0I8')).toBe('BLVO-EN018')
  })

  it('rejects invalid strings', () => {
    expect(normalizeSetCode('ICE BARRIER')).toBeNull()
  })
})

describe('getYgoTextRegions', () => {
  it('aligns name to name-box and set code under artwork (Ra / LDK2)', () => {
    const frame = { x: 0, y: 0, width: 590, height: 860 }
    const { name, setCode } = getYgoTextRegions(frame)
    // Nome: caixa do título, quase até o ícone (sem estrelas)
    expect(name.x).toBe(Math.round(590 * 0.05))
    expect(name.y).toBe(Math.round(860 * 0.04))
    expect(name.width).toBe(Math.round(590 * 0.82))
    expect(name.height).toBe(Math.round(860 * 0.065))
    expect(name.x + name.width).toBeGreaterThan(frame.width * 0.85)
    // Set code: sob o quadro da arte, direita (LDK2-ENS03)
    expect(setCode.x).toBe(Math.round(590 * 0.58))
    expect(setCode.y).toBe(Math.round(860 * 0.548))
    expect(setCode.width).toBe(Math.round(590 * 0.34))
    expect(setCode.height).toBe(Math.round(860 * 0.028))
  })
})

describe('buildScannerQueryVariants', () => {
  it('returns up to 3 variants including original', () => {
    const variants = buildScannerQueryVariants('ICE BARRIER', [
      'Ice Barrier',
      'Barrier',
    ])
    expect(variants[0]).toBe('ICE BARRIER')
    expect(variants.length).toBeGreaterThanOrEqual(1)
    expect(variants.length).toBeLessThanOrEqual(3)
  })
})

describe('nameSimilarity', () => {
  it('ranks exact names higher than unrelated ones', () => {
    expect(nameSimilarity('ICE BARRIER', 'Ice Barrier')).toBeGreaterThan(
      nameSimilarity('ICE BARRIER', 'Terror de Trishula'),
    )
  })
})
