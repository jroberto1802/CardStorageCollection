import { createWorker, PSM, type Worker } from 'tesseract.js'
import { searchCatalogBothLanguages } from '@/services/catalogService'
import type { CardImpression } from '@/types'
import {
  getSetCodeBandCandidates,
  getYgoTextRegions,
  resolveCardFrame,
  type CardTextRegions,
} from '@/utils/cardFrameDetector'
import {
  buildScannerQueryVariants,
  nameSimilarity,
  suggestionLabel,
  type SuggestionLabel,
} from '@/utils/ocrSuggest'

export type CardFrameRect = { x: number; y: number; width: number; height: number }

export type { CardTextRegions }

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
    // Remove CJK (kanji do ícone 罠 etc.)
    .replace(/[\u3040-\u30ff\u3400-\u9fff\uf900-\ufaff]/g, ' ')
    .replace(/[^\p{L}\p{N}'&\-.\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Tipo da carta na mesma linha do nome (YGO). */
const CARD_TYPE_NOISE =
  /\b(TRAP|SPELL|MAGIC|MONSTER|CONTINUOUS|EQUIP|FIELD|RITUAL|COUNTER|QUICK[\s-]?PLAY|FUSION|SYNCHRO|XYZ|LINK|PENDULUM|TOKEN|ARMADILHA|MAGIA|MONSTRO|CONTINUO|CONT[IÍ]NUO|EQUIPAMENTO|CAMPO|RESPOSTA|FUS[AÃ]O|SINCRO|P[EÊ]NDULO)\b/gi

/**
 * Remove tipo (Trap/Spell/Monster…) deixando só o nome.
 * Ex.: "ICE BARRIER TRAP" → "ICE BARRIER"
 */
export function stripCardTypeFromName(value: string): string {
  return cleanOcrLine(value)
    .replace(CARD_TYPE_NOISE, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const SET_CODE_RE = /\b([A-Z0-9]{2,5}-[A-Z]{0,3}\d{1,4})\b/gi

/** Normaliza e corrige OCR comum em set codes YGO. */
export function normalizeSetCode(raw: string): string | null {
  const code = raw
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '')
    .replace(/\s+/g, '')
    .trim()

  const parts = code.match(/^([A-Z0-9]{2,5})-([A-Z]{0,3})(.+)$/)
  if (!parts) return null

  const [, setId, langPart, rest] = parts
  let lang = langPart
  let num = rest.replace(/[OIL]/g, (c) => (c === 'O' ? '0' : '1'))

  // ENO68 → EN + 068 (O do meio era zero do número)
  if (lang.length >= 2 && /[OIL]$/.test(lang)) {
    const last = lang.at(-1)!
    lang = lang.slice(0, -1)
    num = (last === 'O' ? '0' : '1') + num
  }

  const normalized = `${setId}-${lang}${num}`
  const match = normalized.match(/^([A-Z0-9]{2,5}-[A-Z]{0,3}\d{1,4})$/)
  return match ? match[1] : null
}

export function extractSetCodes(ocrText: string): string[] {
  const found = ocrText.toUpperCase().match(SET_CODE_RE) ?? []
  const normalized = found
    .map((s) => normalizeSetCode(s))
    .filter((s): s is string => Boolean(s))
  return [...new Set(normalized)]
}

export function extractCardNameCandidates(ocrText: string, limit = 6): string[] {
  const lines = ocrText
    .split(/\r?\n/)
    .map(stripCardTypeFromName)
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

  if (lines.length >= 2 && lines[0].split(' ').length === 1) {
    const joined = stripCardTypeFromName(`${lines[0]} ${lines[1]}`)
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

/**
 * Recorta região do set code (abaixo da arte, direita).
 */
export function cropSetCodeFromFrame(
  source: HTMLCanvasElement,
  frame: CardFrameRect,
): HTMLCanvasElement {
  const { setCode } = getYgoTextRegions(frame)
  return cropRect(source, setCode)
}

export function cropNameBandFromFrame(
  source: HTMLCanvasElement,
  frame: CardFrameRect,
): HTMLCanvasElement {
  const { name } = getYgoTextRegions(frame)
  return cropRect(source, name)
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

/**
 * Pré-processamento mais suave para set code (texto pequeno em fundo colorido).
 */
function preprocessSetCodeForOcr(source: HTMLCanvasElement): HTMLCanvasElement {
  const minW = 720
  const scale = Math.max(4, minW / Math.max(source.width, 1))
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
    // Contraste moderado — evita estourar fundo claro da arte
    g = (g - 128) * 1.25 + 128
    g = Math.max(0, Math.min(255, g))
    // Binarização leve
    g = g < 140 ? 0 : 255
    data[i] = g
    data[i + 1] = g
    data[i + 2] = g
  }
  ctx.putImageData(imageData, 0, 0)
  return canvas
}

async function recognizeSetCode(
  image: HTMLCanvasElement,
): Promise<{ text: string; confidence: number }> {
  const worker = await getOcrWorker()
  await worker.setParameters({
    tessedit_pageseg_mode: PSM.SINGLE_LINE,
    user_defined_dpi: '300',
    tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-',
  })
  const result = await worker.recognize(image)
  return {
    text: result.data.text ?? '',
    confidence: Number(result.data.confidence ?? 0),
  }
}

/** Tenta várias bandas sob a arte até obter um set code válido. */
async function recognizeSetCodeFromFrame(
  fullCanvas: HTMLCanvasElement,
  frame: CardFrameRect,
): Promise<{ code: string | null; previewUrl: string; text: string }> {
  const bands = getSetCodeBandCandidates(frame)
  let bestPreview = ''
  let bestText = ''
  let bestCode: string | null = null
  let bestScore = -1

  for (const band of bands) {
    const crop = cropRect(fullCanvas, band)
    const prepared = preprocessSetCodeForOcr(crop)
    const previewUrl = prepared.toDataURL('image/jpeg', 0.85)
    const result = await recognizeSetCode(prepared)
    const code =
      normalizeSetCode(result.text) ?? extractSetCodes(result.text)[0] ?? null
    const score = code
      ? 1000 + result.confidence
      : result.confidence + (result.text.trim().length > 0 ? 5 : 0)

    if (!bestPreview) bestPreview = previewUrl
    if (score > bestScore) {
      bestScore = score
      bestPreview = previewUrl
      bestText = result.text
      bestCode = code
    }
    if (code) break
  }

  return { code: bestCode, previewUrl: bestPreview, text: bestText }
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
    tessedit_char_whitelist: '',
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
  /** Set code lido na região dedicada (ex.: BLVO-EN068) */
  detectedSetCode: string | null
  autoDetected: boolean
  regions: CardTextRegions
  nameBandPreviewUrl: string
  setCodePreviewUrl: string
}

/**
 * Auto-enquadra (se possível), lê nome + set code em regiões fixas do layout YGO.
 */
export async function identifyCardFromFrame(
  fullCanvas: HTMLCanvasElement,
  manualFrame: CardFrameRect,
): Promise<IdentifyResult> {
  const { frame, autoDetected } = resolveCardFrame(fullCanvas, manualFrame)
  const regions = getYgoTextRegions(frame)

  const nameBand = cropNameBandFromFrame(fullCanvas, frame)
  const preparedName = preprocessForOcr(nameBand)
  const nameBandPreviewUrl = preparedName.toDataURL('image/jpeg', 0.85)

  const [lineResult, blockResult, setCodeHit] = await Promise.all([
    recognizeOnce(preparedName, PSM.SINGLE_LINE),
    recognizeOnce(preparedName, PSM.SINGLE_BLOCK),
    recognizeSetCodeFromFrame(fullCanvas, frame),
  ])

  const ranked = [lineResult, blockResult].sort(
    (a, b) => scoreOcrResult(b.text, b.confidence) - scoreOcrResult(a.text, a.confidence),
  )
  const best = ranked[0] ?? { text: '', confidence: 0 }
  const merged = `${lineResult.text}\n${blockResult.text}`
  const cleanedBest = stripCardTypeFromName(best.text.trim() || merged.trim())

  const setFromName = extractSetCodes(merged)
  const setFromRegion = setCodeHit.code
  const allSetCodes = [
    ...(setFromRegion ? [setFromRegion] : []),
    ...setFromName.filter((c) => c !== setFromRegion),
  ]

  return {
    text: cleanedBest || best.text.trim() || merged.trim(),
    confidence: best.confidence,
    candidates: extractCardNameCandidates(merged, 8),
    setCodes: allSetCodes,
    detectedSetCode: setFromRegion,
    autoDetected,
    regions,
    nameBandPreviewUrl,
    setCodePreviewUrl: setCodeHit.previewUrl,
  }
}

export interface ScannerSuggestion {
  label: SuggestionLabel
  /** Query usada (leitura original ou autocorreção) */
  query: string
  item: CardImpression
}

/** Match por nome/set/archetype — ignora só-descrição (ex.: Terror de Trishula por “Ice Barrier”). */
function isStrongNameMatch(item: CardImpression): boolean {
  return item.searchRank <= 4
}

function scoreSuggestion(
  item: CardImpression,
  ocrName: string,
  query: string,
): number {
  const simName = nameSimilarity(item.name, ocrName)
  const simQuery = nameSimilarity(item.name, query)
  const rankBonus = Math.max(0, 10 - item.searchRank)
  return simName * 100 + simQuery * 40 + rankBonus * 5
}

/**
 * Busca no catálogo com até 3 sugestões:
 * leitura original + autocorreção 1 + autocorreção 2.
 */
export async function suggestScannerMatches(params: {
  ocrName: string
  setCode?: string | null
  extraCandidates?: string[]
}): Promise<ScannerSuggestion[]> {
  const ocrName = stripCardTypeFromName(params.ocrName)
  const variants = buildScannerQueryVariants(ocrName, params.extraCandidates ?? [])

  const queries: string[] = []
  if (params.setCode) queries.push(params.setCode)
  for (const v of variants) {
    if (!queries.some((q) => q.toLowerCase() === v.toLowerCase())) queries.push(v)
  }
  const limitedQueries = queries.slice(0, 4)

  const pools = await Promise.all(
    limitedQueries.map(async (q) => {
      const result = await searchCatalogBothLanguages({ query: q, pageSize: 16 })
      return {
        query: q,
        items: result.items.filter(isStrongNameMatch),
      }
    }),
  )

  const suggestions: ScannerSuggestion[] = []
  const usedCardIds = new Set<number>()

  // 1 sugestão por variante de nome (até 3), priorizando similaridade com o OCR
  const nameVariants = variants.slice(0, 3)
  for (let i = 0; i < nameVariants.length; i++) {
    const q = nameVariants[i]
    const pool =
      pools.find((p) => p.query.toLowerCase() === q.toLowerCase())?.items ?? []
    const ranked = [...pool]
      .filter((it) => !usedCardIds.has(it.cardId))
      .sort(
        (a, b) =>
          scoreSuggestion(b, ocrName, q) - scoreSuggestion(a, ocrName, q),
      )

    const best = ranked[0]
    if (best) {
      usedCardIds.add(best.cardId)
      suggestions.push({
        label: suggestionLabel(i),
        query: q,
        item: best,
      })
    }
  }

  // Completar até 3 com melhores do pool geral (inclui set code)
  if (suggestions.length < 3) {
    const all = pools
      .flatMap((p) => p.items.map((item) => ({ item, query: p.query })))
      .filter((row) => !usedCardIds.has(row.item.cardId))
      .sort(
        (a, b) =>
          scoreSuggestion(b.item, ocrName, b.query) -
          scoreSuggestion(a.item, ocrName, a.query),
      )

    for (const row of all) {
      if (suggestions.length >= 3) break
      if (usedCardIds.has(row.item.cardId)) continue
      usedCardIds.add(row.item.cardId)
      suggestions.push({
        label: suggestionLabel(suggestions.length),
        query: row.query,
        item: row.item,
      })
    }
  }

  return suggestions.slice(0, 3)
}

export async function searchCardsByScannerQuery(params: {
  query: string
  pageSize?: number
}): Promise<CardImpression[]> {
  const query = params.query.trim()
  if (!query) return []

  const suggestions = await suggestScannerMatches({
    ocrName: query,
    extraCandidates: [],
  })

  if (suggestions.length > 0) {
    return suggestions.map((s) => s.item)
  }

  // Fallback: busca bilíngue filtrando matches fracos de descrição
  const pageSize = params.pageSize ?? 24
  const result = await searchCatalogBothLanguages({
    query,
    page: 0,
    pageSize,
  })
  const strong = result.items.filter(isStrongNameMatch)
  return (strong.length > 0 ? strong : result.items).slice(0, 3)
}
