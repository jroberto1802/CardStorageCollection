export interface SharpnessRegion {
  x: number
  y: number
  width: number
  height: number
}

/** Limiar mínimo para captura ao vivo (720p–1080p). */
export const SHARPNESS_MIN_CAMERA = 8

/** Upload de foto costuma ter compressão diferente — limiar um pouco mais baixo. */
export const SHARPNESS_MIN_PHOTO = 6

const MAX_SAMPLE_WIDTH = 480

function measureSharpnessFromPixels(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): number {
  let sum = 0
  let count = 0
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = (y * width + x) * 4
      const lum =
        0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
      const iR = (y * width + x + 1) * 4
      const lumR =
        0.299 * data[iR] + 0.587 * data[iR + 1] + 0.114 * data[iR + 2]
      sum += Math.abs(lum - lumR)
      count++
    }
  }
  return count > 0 ? sum / count : 0
}

/**
 * Mede nitidez via gradiente horizontal médio (proxy rápido de variância Laplaciana).
 * Valores maiores = imagem mais nítida.
 */
export function measureSharpness(
  source: HTMLCanvasElement,
  region?: SharpnessRegion,
): number {
  const rx = region?.x ?? 0
  const ry = region?.y ?? 0
  const rw = region?.width ?? source.width
  const rh = region?.height ?? source.height

  const cropW = Math.max(1, Math.min(rw, source.width - rx))
  const cropH = Math.max(1, Math.min(rh, source.height - ry))
  if (cropW < 8 || cropH < 8) return 0

  const scale = Math.min(1, MAX_SAMPLE_WIDTH / cropW)
  const sw = Math.max(8, Math.round(cropW * scale))
  const sh = Math.max(8, Math.round(cropH * scale))

  const sample = document.createElement('canvas')
  sample.width = sw
  sample.height = sh
  const ctx = sample.getContext('2d')
  if (!ctx) return 0

  ctx.drawImage(source, rx, ry, cropW, cropH, 0, 0, sw, sh)
  const { data } = ctx.getImageData(0, 0, sw, sh)
  return measureSharpnessFromPixels(data, sw, sh)
}

/** Expõe lógica pura para testes unitários (sem DOM). */
export function measureSharpnessFromImageData(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): number {
  return measureSharpnessFromPixels(data, width, height)
}

export function isImageSharpEnough(
  source: HTMLCanvasElement,
  region?: SharpnessRegion,
  sourceKind: 'camera' | 'photo' = 'camera',
): boolean {
  const min =
    sourceKind === 'photo' ? SHARPNESS_MIN_PHOTO : SHARPNESS_MIN_CAMERA
  return measureSharpness(source, region) >= min
}

export function blurWarningMessage(sourceKind: 'camera' | 'photo'): string {
  if (sourceKind === 'photo') {
    return 'A foto está desfocada. Envie outra imagem mais nítida ou recorte melhor a carta.'
  }
  return 'Imagem desfocada. Segure o celular firme, melhore a luz e tente de novo.'
}
