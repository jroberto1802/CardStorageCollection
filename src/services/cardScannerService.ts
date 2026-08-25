import { createWorker, type Worker } from 'tesseract.js'
import { searchCatalog } from '@/services/catalogService'
import type { AppLanguage, CardImpression } from '@/types'
import { DEFAULT_CATALOG_FILTERS } from '@/types'

let workerPromise: Promise<Worker> | null = null

async function getOcrWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = (async () => {
      const worker = await createWorker('eng')
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
    .replace(/[^a-zA-Z0-9'&\-.\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Extrai candidatos a nome de carta a partir do texto OCR.
 * Prioriza linhas longas com letras (faixa do nome).
 */
export function extractCardNameCandidates(ocrText: string, limit = 5): string[] {
  const lines = ocrText
    .split(/\r?\n/)
    .map(cleanOcrLine)
    .filter((line) => line.length >= 3 && /[A-Za-z]{2,}/.test(line))

  const scored = lines.map((line, index) => {
    const words = line.split(' ').filter(Boolean)
    const letterRatio =
      (line.replace(/[^A-Za-z]/g, '').length || 0) / Math.max(line.length, 1)
    const score =
      line.length * 2 +
      words.length * 8 +
      letterRatio * 20 -
      index * 3 -
      (/\d{3,}/.test(line) ? 15 : 0)
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

  // Junta as 2 primeiras linhas (nomes longos quebrados)
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

export async function recognizeCardText(
  image: HTMLCanvasElement | Blob | string,
  onProgress?: (progress: number) => void,
): Promise<{ text: string; confidence: number }> {
  const worker = await getOcrWorker()

  const result = await worker.recognize(image, undefined, {
    text: true,
  })

  // Progresso aproximado (API v7 não expõe callback contínuo simples em recognize)
  onProgress?.(1)

  const text = result.data.text ?? ''
  const confidence = Number(result.data.confidence ?? 0)
  return { text, confidence }
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

  // Nomes impressos em cartas TCG costumam ser EN
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

/** Recorta a faixa superior da moldura (onde fica o nome da carta). */
export function cropNameBandFromFrame(
  source: HTMLCanvasElement,
  frame: { x: number; y: number; width: number; height: number },
): HTMLCanvasElement {
  const bandHeight = Math.max(24, Math.round(frame.height * 0.18))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(frame.width))
  canvas.height = bandHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) return source

  ctx.drawImage(
    source,
    frame.x,
    frame.y,
    frame.width,
    bandHeight,
    0,
    0,
    canvas.width,
    canvas.height,
  )
  return canvas
}
