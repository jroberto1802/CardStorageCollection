import { describe, expect, it } from 'vitest'
import {
  fixCollectorNumberOcr,
  fixSetIdOcr,
  generateSetCodeCandidates,
  normalizeSetCode,
} from '@/utils/setCodeOcr'

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
  })

  it('fixes DPZO-EN0G6 to DP20-EN006', () => {
    expect(normalizeSetCode('DPZO-EN0G6')).toBe('DP20-EN006')
  })

  it('rejects invalid strings', () => {
    expect(normalizeSetCode('ICE BARRIER')).toBeNull()
  })
})

describe('fixSetIdOcr', () => {
  it('maps Z and O in set id', () => {
    expect(fixSetIdOcr('DPZO')).toBe('DP20')
  })
})

describe('fixCollectorNumberOcr', () => {
  it('maps 0G6 to 006', () => {
    expect(fixCollectorNumberOcr('0G6')).toBe('006')
  })
})

describe('generateSetCodeCandidates', () => {
  it('includes DP20-EN006 for DPZO-EN0G6', () => {
    const candidates = generateSetCodeCandidates('DPZO-EN0G6')
    expect(candidates).toContain('DP20-EN006')
  })
})
