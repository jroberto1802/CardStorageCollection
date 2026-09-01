export interface SharpnessRegion {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Abaixo disso a imagem é quase uniforme (capa preta, falha de captura).
 * Não bloqueia o scan — só exibe aviso.
 */
export const SHARPNESS_EXTREME_BLUR = 0.35

/** Aviso suave quando a melhor foto do burst ainda está fraca. */
export const SHARPNESS_WARN_CAMERA = 0.9
export const SHARPNESS_WARN_PHOTO = 0.7

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

      const iD = ((y + 1) * width + x) * 4
      const lumD =
        0.299 * data[iD] + 0.587 * data[iD + 1] + 0.114 * data[iD + 2]

      sum += Math.abs(lum - lumR) + Math.abs(lum - lumD)
      count += 2
    }
  }

  return count > 0 ? sum / count : 0
}

/**
 * Nitidez via gradiente horizontal + vertical (proxy de Laplaciano).
 * Valores típicos: uniforme ~0, foto real ~0.5–3, muito nítida ~3+.
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

/** Imagem quase sem detalhe (falha de câmera / quadro vazio). */
export function isExtremelyBlurry(
  source: HTMLCanvasElement,
  region?: SharpnessRegion,
): boolean {
  return measureSharpness(source, region) < SHARPNESS_EXTREME_BLUR
}

export function shouldWarnBlur(
  source: HTMLCanvasElement,
  region?: SharpnessRegion,
  sourceKind: 'camera' | 'photo' = 'camera',
): boolean {
  const score = measureSharpness(source, region)
  const warn =
    sourceKind === 'photo' ? SHARPNESS_WARN_PHOTO : SHARPNESS_WARN_CAMERA
  return score < warn && score >= SHARPNESS_EXTREME_BLUR
}

export function blurWarningMessage(sourceKind: 'camera' | 'photo'): string {
  if (sourceKind === 'photo') {
    return 'A foto parece um pouco desfocada — o OCR pode errar. Tente outra com mais luz se o resultado falhar.'
  }
  return 'A foto parece um pouco desfocada — segure firme e melhore a luz se o resultado falhar.'
}

export function extremeBlurWarningMessage(sourceKind: 'camera' | 'photo'): string {
  if (sourceKind === 'photo') {
    return 'Não foi possível ler detalhes na imagem. Tente outra foto com a carta centralizada e boa iluminação.'
  }
  return 'A câmera não capturou detalhes da carta. Verifique a lente, a luz e se a carta está dentro da moldura.'
}
