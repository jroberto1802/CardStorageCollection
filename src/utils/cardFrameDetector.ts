import type { CardFrameRect } from '@/services/cardScannerService'

/** Proporção oficial carta YGO (largura / altura). */
export const YGO_CARD_RATIO = 59 / 86

export interface CardTextRegions {
  /** Moldura completa da carta */
  frame: CardFrameRect
  /** Faixa do nome (esquerda, sem ícone de tipo) */
  name: CardFrameRect
  /** Set code abaixo da arte, lado direito (ex.: ROTD-EN068) */
  setCode: CardFrameRect
}

/** Proporções relativas à moldura da carta (layout TCG Series 8+).
 * Calibrado com The Winged Dragon of Ra (LDK2-ENS03).
 */
export const YGO_REGION_RATIOS = {
  /** Caixa do nome só (sem estrelas). Quase até o ícone de atributo. */
  name: { x: 0.05, y: 0.04, w: 0.82, h: 0.065 },
  /** Ícone atributo/tipo — canto superior direito */
  typeIcon: { right: 0.02, y: 0.04, w: 0.11, h: 0.065 },
  /**
   * Set code logo abaixo do canto inferior direito do quadro da arte.
   * Medido: LDK2-ENS03 em y≈54.8–57%, x≈58–89%.
   */
  setCode: { x: 0.58, y: 0.548, w: 0.34, h: 0.028 },
} as const

/**
 * Bandas candidatas do set code (OCR tenta todas e fica com a melhor).
 */
export const SET_CODE_BAND_RATIOS: ReadonlyArray<{
  x: number
  y: number
  w: number
  h: number
}> = [
  { x: 0.58, y: 0.548, w: 0.34, h: 0.028 }, // Ra / monstro (medido)
  { x: 0.56, y: 0.555, w: 0.36, h: 0.03 },
  { x: 0.55, y: 0.562, w: 0.37, h: 0.03 }, // Spell/Trap
  { x: 0.58, y: 0.54, w: 0.34, h: 0.032 },
]

function regionFromRatios(
  frame: CardFrameRect,
  r: { x: number; y: number; w: number; h: number },
): CardFrameRect {
  return {
    x: frame.x + Math.round(frame.width * r.x),
    y: frame.y + Math.round(frame.height * r.y),
    width: Math.max(1, Math.round(frame.width * r.w)),
    height: Math.max(1, Math.round(frame.height * r.h)),
  }
}

/**
 * Regiões de texto no layout TCG padrão.
 * Nome: estreito à esquerda (sem padding até o ícone).
 * Set code: faixa fina sob a arte, à direita.
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
  if (areaRatio < 0.06 || areaRatio > 0.98) return false
  const ratio = frame.width / frame.height
  return Math.abs(ratio - YGO_CARD_RATIO) / YGO_CARD_RATIO < 0.18
}

/**
 * Detecta a carta na imagem (auto-enquadramento).
 * Funciona melhor com fundo escuro ou contraste claro ao redor.
 */
export function detectCardFrame(canvas: HTMLCanvasElement): CardFrameRect | null {
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

  const mask = new Uint8Array(sw * sh)
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    const lum = 0.299 * r + 0.587 * g + 0.114 * b
    mask[p] = lum > 42 ? 1 : 0
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

function frameIoU(a: CardFrameRect, b: CardFrameRect): number {
  const x1 = Math.max(a.x, b.x)
  const y1 = Math.max(a.y, b.y)
  const x2 = Math.min(a.x + a.width, b.x + b.width)
  const y2 = Math.min(a.y + a.height, b.y + b.height)
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1)
  if (inter <= 0) return 0
  const union = a.width * a.height + b.width * b.height - inter
  return union > 0 ? inter / union : 0
}

/**
 * Usa a moldura da UI (o que o usuário vê) como fonte da verdade.
 * Auto-detect só entra se estiver bem alinhado à moldura (IoU alto),
 * senão o OCR fica desalinhado do overlay verde/âmbar.
 */
export function resolveCardFrame(
  canvas: HTMLCanvasElement,
  manualFrame: CardFrameRect,
): { frame: CardFrameRect; autoDetected: boolean } {
  const auto = detectCardFrame(canvas)
  if (
    auto &&
    isPlausibleCardFrame(auto, canvas.width, canvas.height) &&
    frameIoU(auto, manualFrame) >= 0.72
  ) {
    return { frame: auto, autoDetected: true }
  }
  return { frame: manualFrame, autoDetected: false }
}
