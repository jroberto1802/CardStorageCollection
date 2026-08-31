import { describe, expect, it } from 'vitest'
import {
  computePHashFromImageData,
  hammingDistanceHex,
  rankVisualMatches,
} from './cardArtHash'

function solidImageData(
  width: number,
  height: number,
  r: number,
  g: number,
  b: number,
): Uint8ClampedArray {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let i = 0; i < width * height; i++) {
    const offset = i * 4
    data[offset] = r
    data[offset + 1] = g
    data[offset + 2] = b
    data[offset + 3] = 255
  }
  return data
}

function gradientImageData(width: number, height: number): Uint8ClampedArray {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      const value = Math.round((x / Math.max(1, width - 1)) * 255)
      data[i] = value
      data[i + 1] = value
      data[i + 2] = value
      data[i + 3] = 255
    }
  }
  return data
}

describe('cardArtHash', () => {
  it('returns stable hash for identical images', () => {
    const data = gradientImageData(120, 160)
    const a = computePHashFromImageData(data, 120, 160)
    const b = computePHashFromImageData(data, 120, 160)
    expect(a).toBe(b)
    expect(a).toHaveLength(16)
  })

  it('returns zero distance for identical hashes', () => {
    const hash = '0123456789abcdef'
    expect(hammingDistanceHex(hash, hash)).toBe(0)
  })

  it('counts bit differences between hashes', () => {
    expect(hammingDistanceHex('0000000000000000', '0000000000000001')).toBe(1)
    expect(hammingDistanceHex('0000000000000000', 'ffffffffffffffff')).toBe(64)
  })

  it('ranks closest visual matches first', () => {
    const query = computePHashFromImageData(gradientImageData(80, 100), 80, 100)
    const far = computePHashFromImageData(solidImageData(80, 100, 20, 20, 20), 80, 100)

    const index = new Map<number, string>([
      [1, far],
      [3, query],
    ])

    const ranked = rankVisualMatches(query, index, { maxDistance: 64, limit: 3 })
    expect(ranked[0]?.cardId).toBe(3)
    expect(ranked[0]?.distance).toBe(0)
    expect((ranked[1]?.distance ?? 64)).toBeGreaterThan(0)
  })
})
