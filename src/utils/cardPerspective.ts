import type { CardFrameRect } from '@/services/cardScannerService'
import { YGO_CARD_RATIO } from '@/utils/cardFrameDetector'

export interface Point2D {
  x: number
  y: number
}

/** Tamanho canônico da carta para OCR (proporção 59:86). */
export const YGO_CANONICAL_WIDTH = 590
export const YGO_CANONICAL_HEIGHT = Math.round(YGO_CANONICAL_WIDTH / YGO_CARD_RATIO)

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export function lerp2d(a: Point2D, b: Point2D, t: number): Point2D {
  return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) }
}

/**
 * Ponto no quadrilátero via coordenadas baricênticas (u=horizontal, v=vertical).
 * Ordem: TL, TR, BR, BL.
 */
export function bilinearInQuad(
  corners: readonly [Point2D, Point2D, Point2D, Point2D],
  u: number,
  v: number,
): Point2D {
  const [tl, tr, br, bl] = corners
  const top = lerp2d(tl, tr, u)
  const bottom = lerp2d(bl, br, u)
  return lerp2d(top, bottom, v)
}

/**
 * Ordena 4 pontos em TL, TR, BR, BL (convex quad).
 */
export function orderCornersFromPoints(
  points: Point2D[],
): [Point2D, Point2D, Point2D, Point2D] | null {
  if (points.length < 4) return null

  const unique = dedupePoints(points, 2)
  if (unique.length < 4) return null

  const bySum = [...unique].sort((a, b) => a.x + a.y - (b.x + b.y))
  const tl = bySum[0]
  const br = bySum[bySum.length - 1]

  const remaining = unique.filter((p) => p !== tl && p !== br)
  if (remaining.length < 2) return null

  const tr = remaining.reduce((a, b) =>
    a.y - a.x < b.y - b.x ? a : b,
  )
  const bl = remaining.reduce((a, b) =>
    a.y - a.x > b.y - b.x ? a : b,
  )

  const area = quadArea([tl, tr, br, bl])
  if (area < 100) return null

  return [tl, tr, br, bl]
}

function dedupePoints(points: Point2D[], tolerance: number): Point2D[] {
  const out: Point2D[] = []
  for (const p of points) {
    if (
      !out.some(
        (q) => Math.abs(q.x - p.x) <= tolerance && Math.abs(q.y - p.y) <= tolerance,
      )
    ) {
      out.push(p)
    }
  }
  return out
}

function quadArea(corners: [Point2D, Point2D, Point2D, Point2D]): number {
  const [tl, tr, br, bl] = corners
  return Math.abs(
    (tl.x * tr.y - tr.x * tl.y) +
      (tr.x * br.y - br.x * tr.y) +
      (br.x * bl.y - bl.x * br.y) +
      (bl.x * tl.y - tl.x * bl.y),
  ) / 2
}

/** True se o quad difere o suficiente de um retângulo alinhado para valer o warp. */
export function isQuadSkewed(
  corners: readonly [Point2D, Point2D, Point2D, Point2D],
  minSkewRatio = 0.035,
): boolean {
  const [tl, tr, br, bl] = corners
  const topW = Math.hypot(tr.x - tl.x, tr.y - tl.y)
  const bottomW = Math.hypot(br.x - bl.x, br.y - bl.y)
  const leftH = Math.hypot(bl.x - tl.x, bl.y - tl.y)
  const rightH = Math.hypot(br.x - tr.x, br.y - tr.y)

  const width = Math.max(topW, bottomW, 1)
  const height = Math.max(leftH, rightH, 1)
  const widthDelta = Math.abs(topW - bottomW) / width
  const heightDelta = Math.abs(leftH - rightH) / height

  const diag1 = Math.hypot(br.x - tl.x, br.y - tl.y)
  const diag2 = Math.hypot(bl.x - tr.x, bl.y - tr.y)
  const diagDelta = Math.abs(diag1 - diag2) / Math.max(diag1, diag2, 1)

  return (
    widthDelta >= minSkewRatio ||
    heightDelta >= minSkewRatio ||
    diagDelta >= minSkewRatio
  )
}

function sampleBilinear(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
): [number, number, number, number] {
  const cx = Math.max(0, Math.min(width - 1, x))
  const cy = Math.max(0, Math.min(height - 1, y))
  const x0 = Math.floor(cx)
  const y0 = Math.floor(cy)
  const x1 = Math.min(width - 1, x0 + 1)
  const y1 = Math.min(height - 1, y0 + 1)
  const fx = cx - x0
  const fy = cy - y0

  const i00 = (y0 * width + x0) * 4
  const i10 = (y0 * width + x1) * 4
  const i01 = (y1 * width + x0) * 4
  const i11 = (y1 * width + x1) * 4

  const out: [number, number, number, number] = [0, 0, 0, 255]
  for (let c = 0; c < 4; c++) {
    const v00 = data[i00 + c]
    const v10 = data[i10 + c]
    const v01 = data[i01 + c]
    const v11 = data[i11 + c]
    const top = v00 + (v10 - v00) * fx
    const bottom = v01 + (v11 - v01) * fx
    out[c] = Math.round(top + (bottom - top) * fy)
  }
  return out
}

/**
 * Detecta os 4 cantos da carta via máscara de luminância (mesma base do auto-enquadramento).
 */
export function detectCardCorners(
  canvas: HTMLCanvasElement,
  frameHint?: CardFrameRect,
): [Point2D, Point2D, Point2D, Point2D] | null {
  const maxW = 400
  const scale = Math.min(1, maxW / canvas.width)
  const sw = Math.max(1, Math.round(canvas.width * scale))
  const sh = Math.max(1, Math.round(canvas.height * scale))

  const tmp = document.createElement('canvas')
  tmp.width = sw
  tmp.height = sh
  const ctx = tmp.getContext('2d')
  if (!ctx) return null
  ctx.drawImage(canvas, 0, 0, sw, sh)
  const { data } = ctx.getImageData(0, 0, sw, sh)

  const hint = frameHint
    ? {
        x: Math.round(frameHint.x * scale),
        y: Math.round(frameHint.y * scale),
        w: Math.round(frameHint.width * scale),
        h: Math.round(frameHint.height * scale),
      }
    : { x: 0, y: 0, w: sw, h: sh }

  const corner = (x: number, y: number) => {
    const i = (y * sw + x) * 4
    return 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
  }
  const bgGuess =
    (corner(2, 2) +
      corner(sw - 3, 2) +
      corner(2, sh - 3) +
      corner(sw - 3, sh - 3)) /
    4
  const threshold = Math.min(90, Math.max(28, bgGuess + 18))

  const maskPoints: Point2D[] = []
  const pad = 2
  const x0 = Math.max(0, hint.x - pad)
  const y0 = Math.max(0, hint.y - pad)
  const x1 = Math.min(sw - 1, hint.x + hint.w + pad)
  const y1 = Math.min(sh - 1, hint.y + hint.h + pad)

  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const i = (y * sw + x) * 4
      const lum =
        0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
      if (lum > threshold) {
        maskPoints.push({ x: x / scale, y: y / scale })
      }
    }
  }

  if (maskPoints.length < 80) return null

  let tl = maskPoints[0]
  let tr = maskPoints[0]
  let br = maskPoints[0]
  let bl = maskPoints[0]

  for (const p of maskPoints) {
    const sum = p.x + p.y
    const diff = p.y - p.x
    if (sum < tl.x + tl.y) tl = p
    if (sum > br.x + br.y) br = p
    if (diff < bl.y - bl.x) bl = p
    if (diff > tr.y - tr.x) tr = p
  }

  return orderCornersFromPoints([tl, tr, br, bl])
}

/**
 * Aplica correção de perspectiva (deskew) para canvas canônico 590×860.
 */
export function warpCardToCanonical(
  source: HTMLCanvasElement,
  corners: [Point2D, Point2D, Point2D, Point2D],
  outW = YGO_CANONICAL_WIDTH,
  outH = YGO_CANONICAL_HEIGHT,
): HTMLCanvasElement {
  const srcCtx = source.getContext('2d')
  if (!srcCtx) return source

  const { data: srcData } = srcCtx.getImageData(0, 0, source.width, source.height)
  const dest = document.createElement('canvas')
  dest.width = outW
  dest.height = outH
  const destCtx = dest.getContext('2d')
  if (!destCtx) return source

  const out = destCtx.createImageData(outW, outH)

  for (let y = 0; y < outH; y++) {
    const v = y / Math.max(outH - 1, 1)
    for (let x = 0; x < outW; x++) {
      const u = x / Math.max(outW - 1, 1)
      const srcPt = bilinearInQuad(corners, u, v)
      const [r, g, b, a] = sampleBilinear(
        srcData,
        source.width,
        source.height,
        srcPt.x,
        srcPt.y,
      )
      const i = (y * outW + x) * 4
      out.data[i] = r
      out.data[i + 1] = g
      out.data[i + 2] = b
      out.data[i + 3] = a
    }
  }

  destCtx.putImageData(out, 0, 0)
  return dest
}

export interface PerspectivePrepareResult {
  canvas: HTMLCanvasElement
  frame: CardFrameRect
  perspectiveCorrected: boolean
}

/**
 * Deskew opcional: retorna canvas retificado + moldura canônica.
 */
export function preparePerspectiveCanvas(
  fullCanvas: HTMLCanvasElement,
  frame: CardFrameRect,
): PerspectivePrepareResult {
  const corners = detectCardCorners(fullCanvas, frame)
  if (corners && isQuadSkewed(corners)) {
    const warped = warpCardToCanonical(fullCanvas, corners)
    return {
      canvas: warped,
      frame: {
        x: 0,
        y: 0,
        width: warped.width,
        height: warped.height,
      },
      perspectiveCorrected: true,
    }
  }

  return {
    canvas: fullCanvas,
    frame,
    perspectiveCorrected: false,
  }
}
