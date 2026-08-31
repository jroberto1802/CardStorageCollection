const DHASH_WIDTH = 9
const DHASH_HEIGHT = 8

/** Retângulo em pixels (mesmo formato de CardFrameRect do scanner). */
export type FrameRect = {
  x: number
  y: number
  width: number
  height: number
}

/** Caixa de ilustração YGO — espelha YGO_REGION_RATIOS.art em cardFrameDetector. */
const ART_REGION_RATIOS = { x: 0.08, y: 0.11, w: 0.84, h: 0.57 }

function getArtRegion(frame: FrameRect): FrameRect {
  return {
    x: frame.x + frame.width * ART_REGION_RATIOS.x,
    y: frame.y + frame.height * ART_REGION_RATIOS.y,
    width: frame.width * ART_REGION_RATIOS.w,
    height: frame.height * ART_REGION_RATIOS.h,
  }
}

/** pHash 64-bit em hexadecimal (16 caracteres). */
export type PHashHex = string

function clampInt(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)))
}

function sampleGray(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  sx: number,
  sy: number,
): number {
  const x = clampInt(sx, 0, width - 1)
  const y = clampInt(sy, 0, height - 1)
  const i = (y * width + x) * 4
  const r = data[i] ?? 0
  const g = data[i + 1] ?? 0
  const b = data[i + 2] ?? 0
  return 0.299 * r + 0.587 * g + 0.114 * b
}

function resizeToGrayGrid(
  data: Uint8ClampedArray,
  srcWidth: number,
  srcHeight: number,
  dstWidth: number,
  dstHeight: number,
): Float64Array {
  const out = new Float64Array(dstWidth * dstHeight)
  for (let y = 0; y < dstHeight; y++) {
    for (let x = 0; x < dstWidth; x++) {
      const sx = ((x + 0.5) / dstWidth) * srcWidth - 0.5
      const sy = ((y + 0.5) / dstHeight) * srcHeight - 0.5
      out[y * dstWidth + x] = sampleGray(data, srcWidth, srcHeight, sx, sy)
    }
  }
  return out
}

function bitsToHex(bits: string): PHashHex {
  let hex = ''
  for (let i = 0; i < bits.length; i += 4) {
    const nibble = bits.slice(i, i + 4)
    hex += parseInt(nibble, 2).toString(16)
  }
  return hex.padStart(16, '0')
}

/** Calcula dHash 64-bit a partir de pixels RGBA. */
export function computePHashFromImageData(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): PHashHex {
  if (width < 2 || height < 2) {
    return '0'.repeat(16)
  }

  const gray = resizeToGrayGrid(data, width, height, DHASH_WIDTH, DHASH_HEIGHT)
  let bits = ''

  for (let y = 0; y < DHASH_HEIGHT; y++) {
    for (let x = 0; x < DHASH_WIDTH - 1; x++) {
      const left = gray[y * DHASH_WIDTH + x] ?? 0
      const right = gray[y * DHASH_WIDTH + x + 1] ?? 0
      bits += left < right ? '1' : '0'
    }
  }

  return bitsToHex(bits)
}

/** Distância de Hamming entre dois hashes hex de 64 bits. */
export function hammingDistanceHex(a: PHashHex, b: PHashHex): number {
  if (!a || !b || a.length !== 16 || b.length !== 16) {
    return 64
  }

  try {
    let xor = BigInt(`0x${a}`) ^ BigInt(`0x${b}`)
    let count = 0
    while (xor > 0n) {
      count += Number(xor & 1n)
      xor >>= 1n
    }
    return count
  } catch {
    return 64
  }
}

export function cropArtCanvas(
  source: HTMLCanvasElement,
  frame: FrameRect,
): HTMLCanvasElement {
  const art = getArtRegion(frame)
  const w = Math.max(1, Math.round(art.width))
  const h = Math.max(1, Math.round(art.height))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas

  ctx.drawImage(
    source,
    art.x,
    art.y,
    art.width,
    art.height,
    0,
    0,
    w,
    h,
  )
  return canvas
}

/** Hash da região de arte de uma carta enquadrada. */
export function computeArtPHash(
  source: HTMLCanvasElement,
  frame: FrameRect,
): PHashHex {
  const artCanvas = cropArtCanvas(source, frame)
  const ctx = artCanvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return '0'.repeat(16)

  const { width, height } = artCanvas
  const imageData = ctx.getImageData(0, 0, width, height)
  return computePHashFromImageData(imageData.data, width, height)
}

export interface VisualMatchCandidate {
  cardId: number
  distance: number
}

/** Limiar para considerar match visual confiável (mesma carta, iluminação diferente). */
export const VISUAL_MATCH_STRONG_DISTANCE = 10

/** Limiar máximo para listar candidatos visuais. */
export const VISUAL_MATCH_MAX_DISTANCE = 18

export function rankVisualMatches(
  queryHash: PHashHex,
  index: Map<number, PHashHex>,
  options?: { maxDistance?: number; limit?: number },
): VisualMatchCandidate[] {
  const maxDistance = options?.maxDistance ?? VISUAL_MATCH_MAX_DISTANCE
  const limit = options?.limit ?? 8
  const matches: VisualMatchCandidate[] = []

  for (const [cardId, phash] of index) {
    const distance = hammingDistanceHex(queryHash, phash)
    if (distance <= maxDistance) {
      matches.push({ cardId, distance })
    }
  }

  matches.sort((a, b) => a.distance - b.distance)
  return matches.slice(0, limit)
}
