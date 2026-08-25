import { createWorker, PSM, type Worker } from 'tesseract.js'
import { searchCatalog } from '@/services/catalogService'
import type { AppLanguage, CardImpression } from '@/types'
import { DEFAULT_CATALOG_FILTERS } from '@/types'

export type CardFrameRect = { x: number; y: number; width: number; height: number }

let workerPromise: Promise<Worker> | null = null

async function getOcrWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = (async () => {
      const worker = await createWorker('eng')
      await worker.setParameters({
        // Evita warning de DPI e melhora LSTM em imagens pequenas
        user_defined_dpi: '300',
        preserve_interword_spaces: '1',
        tessedit_char_whitelist:
          "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'&.- ",
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

/** Limpa ruído típico de OCR em nomes de cartas. */
export function cleanOcrLine(value: string): string {
  return value
    .replace(/[|]/g, 'I')
    .replace(/[“”]/g, '"')
    .replace(/[^a-zA-Z0-9'&\-.\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const SET_CODE_RE = /\b([A-Z0-9]{2,5}-[A-Z]{0,3}\d{1,4})\b/gi

export function extractSetCodes(ocrText: string): string[] {
  const found = ocrText.toUpperCase().match(SET_CODE_RE) ?? []
  return [...new Set(found.map((s) => s.toUpperCase()))]
}

/**
 * Extrai candidatos a nome de carta a partir do texto OCR.
 * Prioriza linhas longas com letras (faixa do nome).
 */
export function extractCardNameCandidates(ocrText: string, limit = 6): string[] {
  const lines = ocrText
    .split(/\r?\n/)
    .map(cleanOcrLine)
    .filter((line) => line.length >= 3 && /[A-Za-z]{2,}/.test(line))
    // Remove linhas que são só set code / números
    .filter((line) => !/^[A-Z0-9-]{3,12}$/i.test(line))
    .filter((line) => {
      const withoutCodes = line.replace(/\b[A-Z0-9]{2,5}-[A-Z]{0,3}\d{1,4}\b/gi, '').trim()
      // Se a linha era só set code, descarta; se tem nome + set code, mantém
      return withoutCodes.length >= 3 || !/\b[A-Z0-9]{2,5}-[A-Z]{0,3}\d{1,4}\b/i.test(line)
    })

  const scored = lines.map((line, index) => {
    const words = line.split(' ').filter(Boolean)
    const letterRatio =
      (line.replace(/[^A-Za-z]/g, '').length || 0) / Math.max(line.length, 1)
    const score =
      line.length * 2 +
      words.length * 10 +
      letterRatio * 25 -
      index * 2 -
      (/\d{3,}/.test(line) ? 20 : 0) -
      (words.length === 1 && line.length < 8 ? 10 : 0)
    return { line, score }
  })

  scored.sort((a, b) => b.score - a.score)

  const unique: string[] = []
  for (const row of scored) {
    const exists = unique.some(
      (u) => u.toLowerCase() === row.line.toLowerCase(),
    )
    if (!exists) unique.push(row.line)
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

/** Faixa do nome (~topo da carta). */
export function cropNameBandFromFrame(
  source: HTMLCanvasElement,
  frame: CardFrameRect,
): HTMLCanvasElement {
  const topPad = Math.round(frame.height * 0.02)
  const bandHeight = Math.max(32, Math.round(frame.height * 0.16))
  const sidePad = Math.round(frame.width * 0.06)
  return cropRect(source, {
    x: frame.x + sidePad,
    y: frame.y + topPad,
    width: Math.max(1, frame.width - sidePad * 2),
    height: bandHeight,
  })
}

/** Região da arte + nome (metade superior) — fallback. */
export function cropUpperCardFromFrame(
  source: HTMLCanvasElement,
  frame: CardFrameRect,
): HTMLCanvasElement {
  return cropRect(source, {
    x: frame.x,
    y: frame.y,
    width: frame.width,
    height: Math.max(1, Math.round(frame.height * 0.45)),
  })
}

type PreprocessMode = 'contrast' | 'threshold' | 'invertThreshold'

/**
 * Pré-processa para OCR: upscale + escala de cinza + contraste/limiar.
 * Tesseract lê bem pior em foto colorida pequena sem isso.
 */
export function preprocessForOcr(
  source: HTMLCanvasElement,
  mode: PreprocessMode = 'contrast',
  scale = 3,
): HTMLCanvasElement {
  const targetW = Math.max(1, Math.round(source.width * scale))
  // Largura mínima ajuda LSTM
  const minW = 600
  const finalScale = targetW < minW ? minW / source.width : scale
  const w = Math.max(1, Math.round(source.width * finalScale))
  const h = Math.max(1, Math.round(source.height * finalScale))

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

  let sum = 0
  const grays = new Uint8ClampedArray(w * h)
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    let g = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
    // contraste
    g = (g - 128) * 1.85 + 128
    g = Math.max(0, Math.min(255, g))
    grays[p] = g
    sum += g
  }

  const mean = sum / grays.length
  // Limiar adaptativo simples em torno da média
  const threshold = Math.max(90, Math.min(170, mean * 0.92))

  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    let v = grays[p]
    if (mode === 'threshold' || mode === 'invertThreshold') {
      v = v > threshold ? 255 : 0
      if (mode === 'invertThreshold') v = 255 - v
    }
    data[i] = v
    data[i + 1] = v
    data[i + 2] = v
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
    tessedit_char_whitelist:
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'&.- ",
  })
  const result = await worker.recognize(image)
  return {
    text: result.data.text ?? '',
    confidence: Number(result.data.confidence ?? 0),
  }
}

function scoreOcrResult(text: string, confidence: number): number {
  const names = extractCardNameCandidates(text, 3)
  const setCodes = extractSetCodes(text)
  const bestLen = names[0]?.length ?? 0
  return confidence + bestLen * 2 + names.length * 5 + setCodes.length * 15
}

/**
 * OCR robusto: várias regiões + pré-processamentos + modos PSM.
 * Retorna o melhor texto agregado e candidatos.
 */
export async function identifyCardFromFrame(
  fullCanvas: HTMLCanvasElement,
  frame: CardFrameRect,
): Promise<{
  text: string
  confidence: number
  candidates: string[]
  setCodes: string[]
}> {
  const nameBand = cropNameBandFromFrame(fullCanvas, frame)
  const upper = cropUpperCardFromFrame(fullCanvas, frame)

  const jobs: Array<Promise<{ text: string; confidence: number; label: string }>> =
    []

  const pushJob = (
    source: HTMLCanvasElement,
    mode: PreprocessMode,
    psm: typeof PSM[keyof typeof PSM],
    label: string,
  ) => {
    const prepared = preprocessForOcr(source, mode)
    jobs.push(
      recognizeOnce(prepared, psm).then((r) => ({ ...r, label })),
    )
  }

  // Nome: linha única + bloco
  pushJob(nameBand, 'contrast', PSM.SINGLE_LINE, 'name-contrast-line')
  pushJob(nameBand, 'threshold', PSM.SINGLE_LINE, 'name-th-line')
  pushJob(nameBand, 'invertThreshold', PSM.SINGLE_LINE, 'name-inv-line')
  pushJob(nameBand, 'contrast', PSM.SINGLE_BLOCK, 'name-contrast-block')
  // Metade superior (fallback se a faixa falhar)
  pushJob(upper, 'contrast', PSM.SPARSE_TEXT, 'upper-sparse')
  pushJob(upper, 'threshold', PSM.SPARSE_TEXT, 'upper-th-sparse')

  const results = await Promise.all(jobs)
  results.sort(
    (a, b) => scoreOcrResult(b.text, b.confidence) - scoreOcrResult(a.text, a.confidence),
  )

  const best = results[0] ?? { text: '', confidence: 0, label: 'none' }
  const mergedText = results
    .slice(0, 3)
    .map((r) => r.text)
    .filter(Boolean)
    .join('\n')

  const candidates = extractCardNameCandidates(
    `${best.text}\n${mergedText}`,
    8,
  )
  const setCodes = extractSetCodes(`${best.text}\n${mergedText}`)

  return {
    text: best.text.trim() || mergedText.trim(),
    confidence: best.confidence,
    candidates,
    setCodes,
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

  const runs: Promise<{ items: CardImpression[] }>[] = [
    searchCatalog({
      language: params.language,
      query,
      filters: DEFAULT_CATALOG_FILTERS,
      sort: 'name_asc',
      page: 0,
      pageSize,
    }),
  ]

  if (params.language !== 'en') {
    runs.push(
      searchCatalog({
        language: 'en',
        query,
        filters: DEFAULT_CATALOG_FILTERS,
        sort: 'name_asc',
        page: 0,
        pageSize,
      }),
    )
  }

  const results = await Promise.all(runs)
  const map = new Map<string, CardImpression>()

  for (const result of results) {
    for (const item of result.items) {
      const key = `${item.cardId}-${item.language}`
      if (!map.has(key)) map.set(key, item)
    }
  }

  return [...map.values()].slice(0, pageSize)
}
