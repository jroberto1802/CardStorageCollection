import { describe, expect, it } from 'vitest'
import {
  measureSharpnessFromImageData,
  SHARPNESS_MIN_CAMERA,
} from '@/utils/imageSharpness'

function fillGray(
  width: number,
  height: number,
  value: number,
): Uint8ClampedArray {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let i = 0; i < data.length; i += 4) {
    data[i] = value
    data[i + 1] = value
    data[i + 2] = value
    data[i + 3] = 255
  }
  return data
}

function fillWithEdgeBlock(
  width: number,
  height: number,
  block: { x: number; y: number; w: number; h: number },
): Uint8ClampedArray {
  const data = fillGray(width, height, 200)
  for (let y = block.y; y < block.y + block.h; y++) {
    for (let x = block.x; x < block.x + block.w; x++) {
      const i = (y * width + x) * 4
      data[i] = 0
      data[i + 1] = 0
      data[i + 2] = 0
    }
  }
  return data
}

describe('measureSharpnessFromImageData', () => {
  it('returns low score for uniform blur-like image', () => {
    const data = fillGray(200, 200, 136)
    expect(measureSharpnessFromImageData(data, 200, 200)).toBeLessThan(
      SHARPNESS_MIN_CAMERA,
    )
  })

  it('returns higher score for sharp edges than uniform gray', () => {
    const flat = fillGray(200, 200, 136)
    const sharp = fillWithEdgeBlock(200, 200, { x: 20, y: 80, w: 120, h: 24 })
    expect(measureSharpnessFromImageData(sharp, 200, 200)).toBeGreaterThan(
      measureSharpnessFromImageData(flat, 200, 200),
    )
  })

  it('detects contrast in a sub-region pattern', () => {
    const flat = fillGray(300, 200, 204)
    const sharp = fillWithEdgeBlock(300, 200, { x: 220, y: 80, w: 70, h: 30 })
    expect(measureSharpnessFromImageData(sharp, 300, 200)).toBeGreaterThan(
      measureSharpnessFromImageData(flat, 300, 200),
    )
  })
})
