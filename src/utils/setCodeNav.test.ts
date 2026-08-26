import { describe, expect, it } from 'vitest'
import {
  buildAdjacentSetCode,
  parseYgoSetCode,
} from '@/utils/cardHelpers'

describe('parseYgoSetCode / buildAdjacentSetCode', () => {
  it('parses FOTB-EN043', () => {
    expect(parseYgoSetCode('FOTB-EN043')).toEqual({
      setId: 'FOTB',
      lang: 'EN',
      number: 43,
      digits: 3,
      raw: 'FOTB-EN043',
    })
  })

  it('builds next and previous set codes', () => {
    expect(buildAdjacentSetCode('FOTB-EN043', 1)).toBe('FOTB-EN044')
    expect(buildAdjacentSetCode('FOTB-EN043', -1)).toBe('FOTB-EN042')
  })

  it('keeps zero padding', () => {
    expect(buildAdjacentSetCode('LOB-EN001', 1)).toBe('LOB-EN002')
    expect(buildAdjacentSetCode('LOB-EN001', -1)).toBe('LOB-EN000')
  })

  it('keeps letter series for LEDD-ENA08', () => {
    expect(parseYgoSetCode('LEDD-ENA08')).toEqual({
      setId: 'LEDD',
      lang: 'ENA',
      number: 8,
      digits: 2,
      raw: 'LEDD-ENA08',
    })
    expect(buildAdjacentSetCode('LEDD-ENA08', 1)).toBe('LEDD-ENA09')
    expect(buildAdjacentSetCode('LEDD-EN008', 1)).toBe('LEDD-EN009')
  })
})
