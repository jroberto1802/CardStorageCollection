import { createWorker, PSM, type Worker } from 'tesseract.js'
import { searchCatalog } from '@/services/catalogService'
import type { AppLanguage, CardImpression } from '@/types'
import { DEFAULT_CATALOG_FILTERS } from '@/types'

export type CardFrameRect = { x: number; y: number; width: number; height: number }

let workerPromise: Promise<Worker> | null = null

/** PT + EN — cartas localizadas (ex.: Barreira de Gelo) precisam de `por`. */
async function getOcrWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = (async () => {
      const worker = await createWorker(['por', 'eng'])
      await worker.setParameters({
        user_defined_dpi: '300',
        preserve_interword_spaces: '1',
        // Sem whitelist restritiva: acentos PT (ç, ã, é…) são essenciais
      })
      return worker
    })()
  }
  return workerPromise
}

export async function terminateOcrWorker(): Promise<void> {
  if (!workerPromise) return
  try {
    const worker = await workerPromise
    await worker.terminate()
  } catch {
    // ignore
  } finally {
    workerPromise = null
  }
}

/** Limpa ruído de OCR preservando acentos do português. */
export function cleanOcrLine(value: string): string {
  return value
    .replace(/[|]/g, 'I')
    .replace(/[“”]/g, '"')
    .normalize('NFC')
    .replace(/[^\p{L}\p{N}'&\-.\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const SET_CODE_RE = /\b([A-Z0-9]{2,5}-[A-Z]{0,3}\d{1,4})\b/gi

export function extractSetCodes(ocrText: string): string[] {
  const found = ocrText.toUpperCase().match(SET_CODE_RE) ?? []
  return [...new Set(found.map((s) => s.toUpperCase()))]
}

export function extractCardNameCandidates(ocrText: string, limit = 6): string[] {
  const lines = ocrText
    .split(/\r?\n/)
    .map(cleanOcrLine)
    .filter((line) => line.length >= 3 && /\p{L}{2,}/u.test(line))
    .filter((line) => !/^[A-Z0-9-]{3,12}$/i.test(line))
    .filter((line) => {
      const withoutCodes = line
        .replace(/\b[A-Z0-9]{2,5}-[A-Z]{0,3}\d{1,4}\b/gi, '')
        .trim()
      return (
        withoutCodes.length >= 3 ||
        !/\b[A-Z0-9]{2,5}-[A-Z]{0,3}\d{1,4}\b/i.test(line)
      )
    })

  const scored = lines.map((line, index) => {
    const words = line.split(' ').filter(Boolean)
    const letterRatio =
      (line.replace(/[^\p{L}]/gu, '').length || 0) / Math.max(line.length, 1)
    const score =
      line.length * 2 +
      words.length * 10 +
      letterRatio * 25 -
      index * 2 -
      (/\d{3,}/.test(line) ? 20 : 0)
    return { line, score }
  })

  scored.sort((a, b) => b.score - a.score)

  const unique: string[] = []
  for (const row of scored) {
    if (!unique.some((u) => u.toLowerCase() === row.line.toLowerCase())) {
      unique.push(row.line)
    }
    if (unique.length >= limit) break
  }

  if (lines.length >= 2) {
    const joined = cleanOcrLine(`${lines[0]} ${lines[1]}`)
    if (
      joined.length >= 6 &&
      !unique.some((u) => u.toLowerCase() === joined.toLowerCase())
    ) {
      unique.unshift(joined)
    }
  }

  return unique.slice(0, limit)
}

function cropRect(
  source: HTMLCanvasElement,
  rect: CardFrameRect,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  const w = Math.max(1, Math.round(rect.width))
  const h = Math.max(1, Math.round(rect.height))
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return source
  ctx.drawImage(source, rect.x, rect.y, rect.width, rect.height, 0, 0, w, h)
  return canvas
}

export function cropNameBandFromFrame(
  source: HTMLCanvasElement,
  frame: CardFrameRect,
): HTMLCanvasElement {
  const topPad = Math.round(frame.height * 0.025)
  const bandHeight = Math.max(40, Math.round(frame.height * 0.14))
  const sidePad = Math.round(frame.width * 0.08)
  return cropRect(source, {
    x: frame.x + sidePad,
    y: frame.y + topPad,
    width: Math.max(1, frame.width - sidePad * 2),
    height: bandHeight,
  })
}

/**
 * Upscale + cinza + contraste alto (sem limiar agressivo que destrói letras).
 */
export function preprocessForOcr(source: HTMLCanvasElement): HTMLCanvasElement {
  const minW = 900
  const scale = Math.max(3, minW / Math.max(source.width, 1))
  const w = Math.max(1, Math.round(source.width * scale))
  const h = Math.max(1, Math.round(source.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return source

  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, w, h)
  ctx.drawImage(source, 0, 0, w, h)

  const imageData = ctx.getImageData(0, 0, w, h)
  const data = imageData.data
  for (let i = 0; i < data.length; i += 4) {
    let g = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
    g = (g - 128) * 1.55 + 128
    g = Math.max(0, Math.min(255, g))
    data[i] = g
    data[i + 1] = g
    data[i + 2] = g
  }
  ctx.putImageData(imageData, 0, 0)
  return canvas
}

async function recognizeOnce(
  image: HTMLCanvasElement,
  psm: typeof PSM[keyof typeof PSM],
): Promise<{ text: string; confidence: number }> {
  const worker = await getOcrWorker()
  await worker.setParameters({
    tessedit_pageseg_mode: psm,
    user_defined_dpi: '300',
    preserve_interword_spaces: '1',
  })
  const result = await worker.recognize(image)
  return {
    text: result.data.text ?? '',
    confidence: Number(result.data.confidence ?? 0),
  }
}

function scoreOcrResult(text: string, confidence: number): number {
  const names = extractCardNameCandidates(text, 3)
  const bestLen = names[0]?.length ?? 0
  return confidence + bestLen * 3 + names.length * 8 + extractSetCodes(text).length * 12
}

export interface IdentifyResult {
  text: string
  confidence: number
  candidates: string[]
  setCodes: string[]
  /** Preview da faixa do nome enviada ao OCR (debug/UX) */
  nameBandPreviewUrl: string
}

/**
 * Uma identificação focada: faixa do nome, PT+EN, poucos passes de qualidade.
 */
export async function identifyCardFromFrame(
  fullCanvas: HTMLCanvasElement,
  frame: CardFrameRect,
): Promise<IdentifyResult> {
  const nameBand = cropNameBandFromFrame(fullCanvas, frame)
  const prepared = preprocessForOcr(nameBand)
  const nameBandPreviewUrl = prepared.toDataURL('image/jpeg', 0.85)

  // Dois modos: linha única (ideal para nome) e bloco (fallback)
  const [lineResult, blockResult] = await Promise.all([
    recognizeOnce(prepared, PSM.SINGLE_LINE),
    recognizeOnce(prepared, PSM.SINGLE_BLOCK),
  ])

  const ranked = [lineResult, blockResult].sort(
    (a, b) => scoreOcrResult(b.text, b.confidence) - scoreOcrResult(a.text, a.confidence),
  )
  const best = ranked[0] ?? { text: '', confidence: 0 }
  const merged = `${lineResult.text}\n${blockResult.text}`

  return {
    text: best.text.trim() || merged.trim(),
    confidence: best.confidence,
    candidates: extractCardNameCandidates(merged, 8),
    setCodes: extractSetCodes(merged),
    nameBandPreviewUrl,
  }
}

export async function searchCardsByScannerQuery(params: {
  query: string
  language: AppLanguage
  pageSize?: number
}): Promise<CardImpression[]> {
  const query = params.query.trim()
  if (!query) return []

  const pageSize = params.pageSize ?? 12

  // Sempre busca PT e EN — nomes localizados vs originais
  const [ptResult, enResult] = await Promise.all([
    searchCatalog({
      language: 'pt',
      query,
      filters: DEFAULT_CATALOG_FILTERS,
      sort: 'name_asc',
      page: 0,
      pageSize,
    }),
    searchCatalog({
      language: 'en',
      query,
      filters: DEFAULT_CATALOG_FILTERS,
      sort: 'name_asc',
      page: 0,
      pageSize,
    }),
  ])

  const preferred = params.language === 'pt' ? ptResult.items : enResult.items
  const secondary = params.language === 'pt' ? enResult.items : ptResult.items
  const map = new Map<string, CardImpression>()

  for (const item of [...preferred, ...secondary]) {
    const key = `${item.cardId}-${item.language}`
    if (!map.has(key)) map.set(key, item)
  }

  return [...map.values()].slice(0, pageSize)
}
