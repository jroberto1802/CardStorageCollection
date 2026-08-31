import type { CardFrameRect } from '@/services/cardScannerService'

/** Proporção oficial carta YGO (largura / altura). */
export const YGO_CARD_RATIO = 59 / 86

export interface RegionRatio {
  x: number
  y: number
  w: number
  h: number
}

export interface CardTextRegions {
  /** Moldura completa da carta */
  frame: CardFrameRect
  /** Faixa do nome (esquerda, sem ícone de atributo/tipo) */
  name: CardFrameRect
  /** Set code abaixo da arte, lado direito (ex.: LDK2-ENS03) */
  setCode: CardFrameRect
}

/**
 * Proporções relativas à moldura da carta (0–1).
 *
 * Fonte da verdade — medidas em carta real pixel a pixel:
 * The Winged Dragon of Ra / LDK2-ENS03
 * Artefato: `src/assets/ygo-region-calibration.png`
 *
 * NAME:     x 5.0%–83.5% · y 4.8% · h 5.8%  (para antes do ícone em ~84.5%)
 * ICON:     x 84.5%–96.5% · y 4.8% · h 5.8%
 * SET CODE: x 60.0%–92.0% · y 71.8% · h 3.8%
 *
 * Nota: a arte desta carta termina ~65–68%; o set code NÃO fica a ~55%
 * (isso era ruído escuro dentro da ilustração). Faixa baixa/fina para
 * evitar a barra da arte e a linha da caixa de efeito.
 */
export const YGO_REGION_RATIOS = {
  name: { x: 0.05, y: 0.048, w: 0.785, h: 0.058 } satisfies RegionRatio,
  typeIcon: { x: 0.845, y: 0.048, w: 0.12, h: 0.058 } satisfies RegionRatio,
  setCode: { x: 0.6, y: 0.718, w: 0.32, h: 0.038 } satisfies RegionRatio,
  /** Caixa de ilustração (monstro/magia/armadilha) */
  art: { x: 0.08, y: 0.11, w: 0.84, h: 0.57 } satisfies RegionRatio,
} as const

/** Bandas OCR do set code (principal = medida; extras = variação Spell/Trap). */
export const SET_CODE_BAND_RATIOS: ReadonlyArray<RegionRatio> = [
  { x: 0.6, y: 0.718, w: 0.32, h: 0.038 },
  { x: 0.585, y: 0.712, w: 0.34, h: 0.042 },
  { x: 0.57, y: 0.722, w: 0.35, h: 0.036 },
  { x: 0.61, y: 0.71, w: 0.31, h: 0.045 },
]

/** Converte ratio 0–1 em estilo CSS % para o overlay da câmera. */
export function regionRatioToStyle(r: RegionRatio): {
  left: string
  top: string
  width: string
  height: string
} {
  return {
    left: `${r.x * 100}%`,
    top: `${r.y * 100}%`,
    width: `${r.w * 100}%`,
    height: `${r.h * 100}%`,
  }
}

function regionFromRatios(frame: CardFrameRect, r: RegionRatio): CardFrameRect {
  return {
    x: frame.x + Math.round(frame.width * r.x),
    y: frame.y + Math.round(frame.height * r.y),
    width: Math.max(1, Math.round(frame.width * r.w)),
    height: Math.max(1, Math.round(frame.height * r.h)),
  }
}

/**
 * Regiões de texto no layout TCG padrão.
 * Overlay da câmera e crop do OCR usam exactamente estes ratios.
 */
export function getYgoTextRegions(frame: CardFrameRect): CardTextRegions {
  return {
    frame,
    name: regionFromRatios(frame, YGO_REGION_RATIOS.name),
    setCode: regionFromRatios(frame, YGO_REGION_RATIOS.setCode),
  }
}

/** Todas as bandas candidatas de set code para OCR. */
export function getSetCodeBandCandidates(frame: CardFrameRect): CardFrameRect[] {
  return SET_CODE_BAND_RATIOS.map((r) => regionFromRatios(frame, r))
}

/** Recorte da arte para hash visual / comparação. */
export function getArtRegion(frame: CardFrameRect): CardFrameRect {
  return regionFromRatios(frame, YGO_REGION_RATIOS.art)
}

function clampFrame(
  frame: CardFrameRect,
  maxW: number,
  maxH: number,
): CardFrameRect {
  const x = Math.max(0, Math.min(frame.x, maxW - 1))
  const y = Math.max(0, Math.min(frame.y, maxH - 1))
  const width = Math.max(1, Math.min(frame.width, maxW - x))
  const height = Math.max(1, Math.min(frame.height, maxH - y))
  return { x, y, width, height }
}

/** Ajusta retângulo para proporção 59:86 (crop central). */
function fitAspectRatio(rect: CardFrameRect): CardFrameRect {
  const ratio = rect.width / rect.height
  if (Math.abs(ratio - YGO_CARD_RATIO) / YGO_CARD_RATIO < 0.02) return rect

  if (ratio > YGO_CARD_RATIO) {
    const newW = Math.round(rect.height * YGO_CARD_RATIO)
    const dx = Math.round((rect.width - newW) / 2)
    return { ...rect, x: rect.x + dx, width: newW }
  }

  const newH = Math.round(rect.width / YGO_CARD_RATIO)
  const dy = Math.round((rect.height - newH) / 2)
  return { ...rect, y: rect.y + dy, height: newH }
}

export function isPlausibleCardFrame(
  frame: CardFrameRect,
  canvasW: number,
  canvasH: number,
): boolean {
  if (frame.width < 40 || frame.height < 60) return false
  const areaRatio = (frame.width * frame.height) / (canvasW * canvasH)
  // Aceita carta full-bleed (upload recortado = ~100% da imagem)
  if (areaRatio < 0.06 || areaRatio > 1.001) return false
  const ratio = frame.width / frame.height
  return Math.abs(ratio - YGO_CARD_RATIO) / YGO_CARD_RATIO < 0.2
}

/**
 * Se a imagem já tem proporção de carta YGO, usa o canvas inteiro como moldura.
 * Essencial no upload de scans/fotos recortadas (sem margem).
 */
export function detectFullBleedCardFrame(
  canvas: HTMLCanvasElement,
): CardFrameRect | null {
  const { width, height } = canvas
  if (width < 40 || height < 60) return null
  const ratio = width / height
  if (Math.abs(ratio - YGO_CARD_RATIO) / YGO_CARD_RATIO > 0.12) return null
  return { x: 0, y: 0, width, height }
}

/**
 * Detecta a carta na imagem (auto-enquadramento).
 * Funciona com fundo contrastante OU carta preenchendo a imagem (full-bleed).
 */
export function detectCardFrame(canvas: HTMLCanvasElement): CardFrameRect | null {
  // Scan/foto já recortada na proporção da carta → moldura = imagem inteira
  const fullBleed = detectFullBleedCardFrame(canvas)
  if (fullBleed) return fullBleed

  const maxW = 360
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

  // Amostra cantos para limiar adaptativo (fundo vs carta)
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

  const mask = new Uint8Array(sw * sh)
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    const lum = 0.299 * r + 0.587 * g + 0.114 * b
    mask[p] = lum > threshold ? 1 : 0
  }

  let minX = sw
  let minY = sh
  let maxX = 0
  let maxY = 0
  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      if (mask[y * sw + x]) {
        minX = Math.min(minX, x)
        minY = Math.min(minY, y)
        maxX = Math.max(maxX, x)
        maxY = Math.max(maxY, y)
      }
    }
  }

  if (maxX <= minX || maxY <= minY) return null

  let frame: CardFrameRect = {
    x: Math.round(minX / scale),
    y: Math.round(minY / scale),
    width: Math.round((maxX - minX + 1) / scale),
    height: Math.round((maxY - minY + 1) / scale),
  }

  frame = fitAspectRatio(frame)
  frame = clampFrame(frame, canvas.width, canvas.height)

  if (!isPlausibleCardFrame(frame, canvas.width, canvas.height)) return null
  return frame
}

export type CardCaptureSource = 'camera' | 'photo'

/**
 * Resolve a moldura usada no OCR.
 * - camera: usa a moldura do guia (utilizador alinhou a carta)
 * - photo: prioriza auto-detect / full-bleed
 */
export function resolveCardFrame(
  canvas: HTMLCanvasElement,
  manualFrame: CardFrameRect,
  source: CardCaptureSource = 'camera',
): { frame: CardFrameRect; autoDetected: boolean } {
  if (source === 'camera') {
    return { frame: manualFrame, autoDetected: false }
  }

  const auto = detectCardFrame(canvas)

  if (auto && isPlausibleCardFrame(auto, canvas.width, canvas.height)) {
    return { frame: auto, autoDetected: true }
  }
  const fullBleed = detectFullBleedCardFrame(canvas)
  if (fullBleed) return { frame: fullBleed, autoDetected: true }
  return { frame: manualFrame, autoDetected: false }
}
