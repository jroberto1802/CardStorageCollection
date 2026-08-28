import { describe, expect, it } from 'vitest'
import {
  bilinearInQuad,
  isQuadSkewed,
  lerp2d,
  orderCornersFromPoints,
} from '@/utils/cardPerspective'

describe('bilinearInQuad', () => {
  const rect: [
    { x: number; y: number },
    { x: number; y: number },
    { x: number; y: number },
    { x: number; y: number },
  ] = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 200 },
    { x: 0, y: 200 },
  ]

  it('maps corners correctly', () => {
    expect(bilinearInQuad(rect, 0, 0)).toEqual({ x: 0, y: 0 })
    expect(bilinearInQuad(rect, 1, 0)).toEqual({ x: 100, y: 0 })
    expect(bilinearInQuad(rect, 1, 1)).toEqual({ x: 100, y: 200 })
    expect(bilinearInQuad(rect, 0, 1)).toEqual({ x: 0, y: 200 })
  })

  it('interpolates center', () => {
    expect(bilinearInQuad(rect, 0.5, 0.5)).toEqual({ x: 50, y: 100 })
  })
})

describe('lerp2d', () => {
  it('interpolates between points', () => {
    expect(lerp2d({ x: 0, y: 0 }, { x: 10, y: 20 }, 0.5)).toEqual({
      x: 5,
      y: 10,
    })
  })
})

describe('orderCornersFromPoints', () => {
  it('orders rectangle corners as TL TR BR BL', () => {
    const ordered = orderCornersFromPoints([
      { x: 100, y: 0 },
      { x: 0, y: 0 },
      { x: 100, y: 200 },
      { x: 0, y: 200 },
    ])
    expect(ordered).toEqual([
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 200 },
      { x: 0, y: 200 },
    ])
  })

  it('returns null for fewer than 4 distinct points', () => {
    expect(orderCornersFromPoints([{ x: 0, y: 0 }])).toBeNull()
  })
})

describe('isQuadSkewed', () => {
  const aligned: [
    { x: number; y: number },
    { x: number; y: number },
    { x: number; y: number },
    { x: number; y: number },
  ] = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 200 },
    { x: 0, y: 200 },
  ]

  const skewed: typeof aligned = [
    { x: 10, y: 5 },
    { x: 110, y: 0 },
    { x: 100, y: 200 },
    { x: 0, y: 195 },
  ]

  it('returns false for axis-aligned rectangle', () => {
    expect(isQuadSkewed(aligned)).toBe(false)
  })

  it('returns true for perspective skew', () => {
    expect(isQuadSkewed(skewed)).toBe(true)
  })
})
