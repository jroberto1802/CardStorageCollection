import { describe, expect, it } from 'vitest'
import { YGO_CARD_RATIO } from '@/utils/cardFrameDetector'
import {
  computeGuideFrameInVideoPixels,
  computeGuideLayout,
  getContainedVideoRect,
} from '@/utils/scannerGuideLayout'

describe('getContainedVideoRect', () => {
  it('letterboxes 16:9 video in 3:4 container', () => {
    const rect = getContainedVideoRect(1920, 1080, 390, 520)
    expect(rect.width).toBe(390)
    expect(rect.height).toBeCloseTo(390 * (1080 / 1920), 0)
    expect(rect.x).toBe(0)
    expect(rect.y).toBeGreaterThan(0)
  })
})

describe('computeGuideFrameInVideoPixels', () => {
  it('centers card frame with YGO aspect ratio', () => {
    const frame = computeGuideFrameInVideoPixels(1920, 1080)
    expect(frame.x).toBeGreaterThanOrEqual(0)
    expect(frame.y).toBeGreaterThanOrEqual(0)
    expect(frame.width / frame.height).toBeCloseTo(YGO_CARD_RATIO, 2)
    expect(frame.height).toBeLessThanOrEqual(Math.round(1080 * 0.92) + 1)
    expect(frame.x + frame.width).toBeLessThanOrEqual(1920)
    expect(frame.y + frame.height).toBeLessThanOrEqual(1080)
  })
})

describe('computeGuideLayout', () => {
  it('maps video frame to container guide with same scale', () => {
    const layout = computeGuideLayout(1920, 1080, 390, 520)
    const expectedGuideW = layout.frame.width * layout.scale
    expect(layout.guide.width).toBeCloseTo(expectedGuideW, 0)
    expect(layout.guide.x).toBeCloseTo(
      layout.content.x + layout.frame.x * layout.scale,
      0,
    )
    expect(layout.guide.y).toBeCloseTo(
      layout.content.y + layout.frame.y * layout.scale,
      0,
    )
  })
})
