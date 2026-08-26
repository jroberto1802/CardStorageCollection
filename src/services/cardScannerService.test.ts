import { describe, expect, it } from 'vitest'
import {
  extractCardNameCandidates,
  normalizeOcrCardName,
  normalizeSetCode,
  stripCardTypeFromName,
} from '@/services/cardScannerService'
import { getYgoTextRegions } from '@/utils/cardFrameDetector'
import {
  buildScannerQueryVariants,
  nameSimilarity,
} from '@/utils/ocrSuggest'
import {
  detectFullBleedCardFrame,
  isPlausibleCardFrame,
  YGO_CARD_RATIO,
} from '@/utils/cardFrameDetector'

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

  it('fixes FN/F misreads as EN', () => {
    expect(normalizeSetCode('KICO-FN065')).toBe('KICO-EN065')
    expect(normalizeSetCode('KICO-F065')).toBe('KICO-EN065')
    expect(normalizeSetCode('kico-en065')).toBe('KICO-EN065')
  })

  it('rejects invalid strings', () => {
    expect(normalizeSetCode('ICE BARRIER')).toBeNull()
  })
})

describe('getYgoTextRegions', () => {
  it('uses measured Ra/LDK2 ratios for name and set code', () => {
    const frame = { x: 0, y: 0, width: 590, height: 860 }
    const { name, setCode } = getYgoTextRegions(frame)
    // Nome: até antes do ícone (~84.5%)
    expect(name.x).toBe(Math.round(590 * 0.05))
    expect(name.y).toBe(Math.round(860 * 0.048))
    expect(name.width).toBe(Math.round(590 * 0.785))
    expect(name.height).toBe(Math.round(860 * 0.058))
    expect(name.x + name.width).toBeLessThanOrEqual(Math.round(590 * 0.845))
    // Set code: faixa baixa/fina (entre arte e caixa de efeito)
    expect(setCode.x).toBe(Math.round(590 * 0.6))
    expect(setCode.y).toBe(Math.round(860 * 0.718))
    expect(setCode.width).toBe(Math.round(590 * 0.32))
    expect(setCode.height).toBe(Math.round(860 * 0.038))
    expect(setCode.y / frame.height).toBeCloseTo(0.718, 2)
  })
})

describe('full-bleed photo framing', () => {
  it('accepts a frame that fills the entire image', () => {
    const w = 303
    const h = 438
    const frame = { x: 0, y: 0, width: w, height: h }
    expect(isPlausibleCardFrame(frame, w, h)).toBe(true)
  })

  it('detects card-shaped uploads as full-bleed', () => {
    const w = 590
    const h = Math.round(w / YGO_CARD_RATIO)
    // jsdom may not have canvas — simulate via plain object path
    const canvas = {
      width: w,
      height: h,
    } as HTMLCanvasElement
    const frame = detectFullBleedCardFrame(canvas)
    expect(frame).toEqual({ x: 0, y: 0, width: w, height: h })
  })

  it('rejects non-card aspect as full-bleed', () => {
    const canvas = { width: 1920, height: 1080 } as HTMLCanvasElement
    expect(detectFullBleedCardFrame(canvas)).toBeNull()
  })
})

describe('normalizeOcrCardName', () => {
  it('removes duplicated glued names and restores spaces', () => {
    expect(
      normalizeOcrCardName('THEWINGEDDRAGONOFRA THEWINGEDDRAGONOFRA'),
    ).toBe('THE WINGED DRAGON OF RA')
  })

  it('restores spaces in a single glued name', () => {
    expect(normalizeOcrCardName('THEWINGEDDRAGONOFRA')).toBe(
      'THE WINGED DRAGON OF RA',
    )
  })

  it('fixes gold-foil OCR typos TRBE/OE', () => {
    expect(normalizeOcrCardName('TRBE WINGED DRAGON OE RA')).toBe(
      'THE WINGED DRAGON OF RA',
    )
  })

  it('keeps already spaced names', () => {
    expect(normalizeOcrCardName('Ice Barrier')).toBe('Ice Barrier')
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
