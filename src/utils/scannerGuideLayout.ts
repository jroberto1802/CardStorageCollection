import type { CardFrameRect } from '@/services/cardScannerService'
import { YGO_CARD_RATIO } from '@/utils/cardFrameDetector'

/** Fração da largura do vídeo ocupada pela moldura (guia + crop OCR). */
export const GUIDE_WIDTH_RATIO = 0.88

export interface ContainedVideoRect {
  x: number
  y: number
  width: number
  height: number
}

export interface GuideLayout {
  /** Área visível do vídeo (object-fit: contain) em px do container */
  content: ContainedVideoRect
  /** Moldura da carta em px do container (overlay) */
  guide: ContainedVideoRect
  /** Moldura da carta em pixels nativos do vídeo/canvas (OCR) */
  frame: CardFrameRect
  scale: number
}

/** Área real do vídeo dentro do container com object-fit: contain. */
export function getContainedVideoRect(
  videoWidth: number,
  videoHeight: number,
  containerWidth: number,
  containerHeight: number,
): ContainedVideoRect {
  if (!videoWidth || !videoHeight || !containerWidth || !containerHeight) {
    return { x: 0, y: 0, width: containerWidth, height: containerHeight }
  }

  const scale = Math.min(
    containerWidth / videoWidth,
    containerHeight / videoHeight,
  )
  const width = videoWidth * scale
  const height = videoHeight * scale

  return {
    x: (containerWidth - width) / 2,
    y: (containerHeight - height) / 2,
    width,
    height,
  }
}

/**
 * Moldura da carta em pixels do frame de vídeo/canvas.
 * Fonte única para overlay e OCR.
 */
export function computeGuideFrameInVideoPixels(
  videoWidth: number,
  videoHeight: number,
  widthRatio = GUIDE_WIDTH_RATIO,
): CardFrameRect {
  let width = videoWidth * widthRatio
  let height = width / YGO_CARD_RATIO
  const maxHeight = videoHeight * 0.92

  if (height > maxHeight) {
    height = maxHeight
    width = height * YGO_CARD_RATIO
  }

  return {
    x: Math.round((videoWidth - width) / 2),
    y: Math.round((videoHeight - height) / 2),
    width: Math.round(width),
    height: Math.round(height),
  }
}

/** Layout completo: vídeo contido + guia (px tela) + frame (px vídeo). */
export function computeGuideLayout(
  videoWidth: number,
  videoHeight: number,
  containerWidth: number,
  containerHeight: number,
  widthRatio = GUIDE_WIDTH_RATIO,
): GuideLayout {
  const content = getContainedVideoRect(
    videoWidth,
    videoHeight,
    containerWidth,
    containerHeight,
  )
  const frame = computeGuideFrameInVideoPixels(
    videoWidth,
    videoHeight,
    widthRatio,
  )
  const scale = videoWidth > 0 ? content.width / videoWidth : 1

  return {
    content,
    guide: {
      x: content.x + frame.x * scale,
      y: content.y + frame.y * scale,
      width: frame.width * scale,
      height: frame.height * scale,
    },
    frame,
    scale,
  }
}
