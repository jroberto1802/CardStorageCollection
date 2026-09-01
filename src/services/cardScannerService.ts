import { createWorker, PSM, type Worker } from 'tesseract.js'
import {
  getCardsByIdsWithFallback,
  searchCatalogBothLanguages,
  setCodeExistsInCatalog,
} from '@/services/catalogService'
import { findVisualMatchesFromFrame } from '@/services/cardArtHashService'
import type { CardImpression } from '@/types'
import {
  VISUAL_MATCH_STRONG_DISTANCE,
  type VisualMatchCandidate,
} from '@/utils/cardArtHash'
import { cardToCatalogItem } from '@/utils/cardHelpers'
import {
  getSetCodeBandCandidates,
  getYgoTextRegions,
  resolveCardFrame,
  type CardCaptureSource,
  type CardTextRegions,
} from '@/utils/cardFrameDetector'
import {
  preparePerspectiveCanvas,
} from '@/utils/cardPerspective'
import {
  buildScannerQueryVariants,
  nameSimilarity,
  SET_CODE_SUGGESTION_LABEL,
  suggestionLabel,
  VISUAL_SUGGESTION_LABEL,
  type SuggestionLabel,
} from '@/utils/ocrSuggest'
import {
  extractSetCodes,
  generateSetCodeCandidates,
  normalizeSetCode,
} from '@/utils/setCodeOcr'

export type CardFrameRect = { x: number; y: number; width: number; height: number }

export { extractSetCodes, normalizeSetCode } from '@/utils/setCodeOcr'

export const SCANNER_BURST_COUNT = 3
export const SCANNER_BURST_INTERVAL_MS = 90

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

/** Pré-carrega modelos PT+EN em background (chamar ao abrir a página do scanner). */
export function preloadOcrWorker(): void {
  void getOcrWorker().catch(() => {
    // Falha silenciosa — identify mostrará erro se necessário
  })
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

const OCR_NAME_PARTICLES = [
  'THE',
  'OF',
  'AND',
  'AN',
  'OR',
  'TO',
  'IN',
  'ON',
  'AT',
  'BY',
  'DE',
  'DA',
  'DO',
  'DAS',
  'DOS',
] as const

/** Palavras frequentes em nomes YGO (ajuda a reinserir espaços no OCR). */
const OCR_NAME_WORDS = [
  'WINGED',
  'DRAGON',
  'MAGICIAN',
  'SWORDSMAN',
  'SWORDS',
  'LIGHTNING',
  'BARRIER',
  'BEAST',
  'DIVINE',
  'FLAME',
  'STORM',
  'WHITE',
  'BLACK',
  'BLUE',
  'DARK',
  'EYES',
  'RED',
  'ICE',
  'RA',
] as const

/** Insere espaços em nomes colados (THEWINGEDDRAGONOFRA → THE WINGED DRAGON OF RA). */
export function insertSpacesInGluedName(raw: string): string {
  const compact = raw.replace(/\s+/g, '').trim()
  if (compact.length < 8) return raw.trim()

  // TitleCase colado: WingedDragonOfRa
  if (/[a-z]/.test(compact) && /[A-Z]/.test(compact)) {
    return compact
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
      .replace(/\s+/g, ' ')
      .trim()
  }

  const s = compact.toUpperCase()
  const dictionary = [...OCR_NAME_PARTICLES, ...OCR_NAME_WORDS].sort(
    (a, b) => b.length - a.length,
  )

  const tokens: string[] = []
  let i = 0
  while (i < s.length) {
    let matched: string | null = null
    for (const word of dictionary) {
      if (s.startsWith(word, i)) {
        matched = word
        break
      }
    }
    if (matched) {
      tokens.push(matched)
      i += matched.length
      continue
    }
    let j = i + 1
    while (j < s.length) {
      const hit = dictionary.some((word) => s.startsWith(word, j))
      if (hit) break
      j += 1
    }
    tokens.push(s.slice(i, j))
    i = j
  }

  return tokens.join(' ').replace(/\s+/g, ' ').trim()
}

/**
 * Normaliza nome lido pelo OCR: remove duplicata e restaura espaços.
 * Ex.: "THEWINGEDDRAGONOFRA THEWINGEDDRAGONOFRA" → "THE WINGED DRAGON OF RA"
 */
export function normalizeOcrCardName(raw: string): string {
  let s = stripCardTypeFromName(raw)
  if (!s) return ''

  // "FOO FOO" → "FOO"
  const spaced = s.split(/\s+/).filter(Boolean)
  if (
    spaced.length === 2 &&
    spaced[0].toLowerCase() === spaced[1].toLowerCase()
  ) {
    s = spaced[0]
  } else if (spaced.length > 2) {
    const mid = Math.floor(spaced.length / 2)
    const left = spaced.slice(0, mid).join(' ')
    const right = spaced.slice(mid).join(' ')
    if (left.toLowerCase() === right.toLowerCase()) s = left
  }

  // "FOOFOO" (duplicado sem espaço)
  const compact = s.replace(/\s+/g, '')
  if (compact.length >= 6 && compact.length % 2 === 0) {
    const half = compact.slice(0, compact.length / 2)
    if (half.toLowerCase() === compact.slice(half.length).toLowerCase()) {
      s = half
    }
  }

  // Sem espaços: tenta reinserir
  if (!/\s/.test(s) && s.length >= 8) {
    s = insertSpacesInGluedName(s)
  }

  // Foil dourado: TRBE→THE, OE→OF
  s = fixGoldFoilOcrTypos(s)

  return s.replace(/\s+/g, ' ').trim()
}

/** Correções típicas de foil dourado/metálico (H↔R, E↔B, F↔E). */
export function fixGoldFoilOcrTypos(value: string): string {
  return value
    .replace(/\bTRBE\b/gi, 'THE')
    .replace(/\bTBE\b/gi, 'THE')
    .replace(/\bTHB\b/gi, 'THE')
    .replace(/\bTEB\b/gi, 'THE')
    .replace(/\bTHF\b/gi, 'THE')
    .replace(/\bOE\b/gi, 'OF')
    .replace(/\b0F\b/gi, 'OF')
    .replace(/\bOЕ\b/gi, 'OF')
    .replace(/\bDRACON\b/gi, 'DRAGON')
    .replace(/\bDRAQON\b/gi, 'DRAGON')
    .replace(/\bWINGEO\b/gi, 'WINGED')
    .replace(/\bWINGEO\b/gi, 'WINGED')
}

async function resolveSetCodeWithCatalog(raw: string): Promise<string | null> {
  const trimmed = raw.trim()
  if (!trimmed) return null

  const candidates = [
    ...new Set(
      [
        normalizeSetCode(trimmed),
        ...generateSetCodeCandidates(trimmed),
      ].filter((code): code is string => Boolean(code)),
    ),
  ]

  for (const code of candidates) {
    if (await setCodeExistsInCatalog(code)) return code
  }

  return normalizeSetCode(trimmed) ?? candidates[0] ?? null
}

export function extractCardNameCandidates(ocrText: string, limit = 6): string[] {
  const lines = ocrText
    .split(/\r?\n/)
    .map(normalizeOcrCardName)
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
    // Prefere nomes com espaços (melhor para busca)
    const spaceBonus = words.length > 1 ? 30 : 0
    const score =
      line.length * 2 +
      words.length * 10 +
      letterRatio * 25 +
      spaceBonus -
      index * 2 -
      (/\d{3,}/.test(line) ? 20 : 0)
    return { line, score }
  })

  scored.sort((a, b) => b.score - a.score)

  const unique: string[] = []
  const compactSeen = new Set<string>()
  for (const row of scored) {
    const compact = row.line.replace(/\s+/g, '').toLowerCase()
    if (compactSeen.has(compact)) continue
    if (!unique.some((u) => u.toLowerCase() === row.line.toLowerCase())) {
      unique.push(row.line)
      compactSeen.add(compact)
    }
    if (unique.length >= limit) break
  }

  if (lines.length >= 2 && lines[0].split(' ').length === 1) {
    const joined = normalizeOcrCardName(`${lines[0]} ${lines[1]}`)
    const compact = joined.replace(/\s+/g, '').toLowerCase()
    if (
      joined.length >= 6 &&
      !compactSeen.has(compact) &&
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
 * Upscale genérico para OCR.
 */
function upscaleCanvas(
  source: HTMLCanvasElement,
  minW: number,
  minScale: number,
): HTMLCanvasElement {
  const scale = Math.max(minScale, minW / Math.max(source.width, 1))
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
  return canvas
}

function applyGrayscaleContrast(
  canvas: HTMLCanvasElement,
  contrast: number,
): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const data = imageData.data
  for (let i = 0; i < data.length; i += 4) {
    let g = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
    g = (g - 128) * contrast + 128
    g = Math.max(0, Math.min(255, g))
    data[i] = g
    data[i + 1] = g
    data[i + 2] = g
  }
  ctx.putImageData(imageData, 0, 0)
}

/**
 * Nome dourado/metálico em fundo bege: realça contorno escuro da letra.
 * (ex.: THE → TRBE quando o H/E dourados perdem contraste)
 */
export function preprocessNameForOcr(source: HTMLCanvasElement): HTMLCanvasElement {
  const canvas = upscaleCanvas(source, 1200, 4)
  const ctx = canvas.getContext('2d')
  if (!ctx) return source

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const data = imageData.data
  let sum = 0
  const gray = new Float32Array(data.length / 4)

  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    // Contorno escuro do foil + canal amarelo vs azul
    const minC = Math.min(r, g, b)
    const yellow = (r + g) * 0.5 - b * 0.45
    // Letras douradas com sombra tendem a minC menor que o pergaminho
    let v = minC * 0.65 + (255 - Math.max(0, Math.min(255, yellow))) * 0.35
    v = (v - 128) * 1.85 + 128
    v = Math.max(0, Math.min(255, v))
    gray[p] = v
    sum += v
  }

  const mean = sum / gray.length
  // Texto deve ficar ESCURO no branco; se a média ficou baixa, inverte
  const invert = mean < 110
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    let v = gray[p]
    if (invert) v = 255 - v
    // Limiar suave
    v = v < mean * (invert ? 0.92 : 1.05) ? 0 : 255
    data[i] = v
    data[i + 1] = v
    data[i + 2] = v
  }
  ctx.putImageData(imageData, 0, 0)
  return canvas
}

/**
 * Fallback cinza + contraste (nomes claros em fundo escuro / branco).
 */
export function preprocessForOcr(source: HTMLCanvasElement): HTMLCanvasElement {
  const canvas = upscaleCanvas(source, 1000, 3)
  applyGrayscaleContrast(canvas, 1.55)
  return canvas
}

function padCanvas(
  source: HTMLCanvasElement,
  padRatio: number,
): HTMLCanvasElement {
  const padX = Math.max(8, Math.round(source.width * padRatio))
  const padY = Math.max(6, Math.round(source.height * padRatio))
  const canvas = document.createElement('canvas')
  canvas.width = source.width + padX * 2
  canvas.height = source.height + padY * 2
  const ctx = canvas.getContext('2d')
  if (!ctx) return source
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(source, padX, padY)
  return canvas
}

export type SetCodePreprocessMode = 'contrast' | 'adaptive' | 'soft' | 'invert'

/** Fração de pixels escuros (0–1). Texto legível costuma ficar ~3–28%. */
export function measureDarkInkRatio(canvas: HTMLCanvasElement): number {
  const ctx = canvas.getContext('2d')
  if (!ctx) return 0
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height)
  let dark = 0
  const total = data.length / 4
  for (let i = 0; i < data.length; i += 4) {
    if (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2] < 96) {
      dark++
    }
  }
  return total > 0 ? dark / total : 0
}

/**
 * Remove barras horizontais da moldura (borda da arte / caixa de efeito)
 * que colam no set code e confundem o Tesseract.
 */
export function trimSetCodeFrameRules(
  source: HTMLCanvasElement,
): HTMLCanvasElement {
  const ctx = source.getContext('2d')
  if (!ctx || source.width < 8 || source.height < 6) return source

  const { width: w, height: h } = source
  const { data } = ctx.getImageData(0, 0, w, h)
  const rowDark = new Float32Array(h)

  for (let y = 0; y < h; y++) {
    let dark = 0
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
      if (lum < 100) dark++
    }
    rowDark[y] = dark / w
  }

  const isRule = (y: number) => rowDark[y] >= 0.52
  const isGlyph = (y: number) => rowDark[y] > 0.035 && rowDark[y] < 0.48

  // Maior run contínuo de linhas “texto” (não barra sólida)
  let bestStart = -1
  let bestEnd = -1
  let runStart = -1
  for (let y = 0; y < h; y++) {
    const ok = isGlyph(y) && !isRule(y)
    if (ok) {
      if (runStart < 0) runStart = y
    } else if (runStart >= 0) {
      if (bestStart < 0 || y - 1 - runStart > bestEnd - bestStart) {
        bestStart = runStart
        bestEnd = y - 1
      }
      runStart = -1
    }
  }
  if (runStart >= 0) {
    if (bestStart < 0 || h - 1 - runStart > bestEnd - bestStart) {
      bestStart = runStart
      bestEnd = h - 1
    }
  }

  if (bestStart < 0 || bestEnd < bestStart) return source

  // Margem mínima; corta qualquer rule imediatamente acima/abaixo
  let top = Math.max(0, bestStart - 1)
  let bottom = Math.min(h - 1, bestEnd + 1)
  while (top < bestStart && isRule(top)) top++
  while (bottom > bestEnd && isRule(bottom)) bottom--

  // Também corta colunas quase vazias nas laterais
  let left = 0
  let right = w - 1
  const colHasInk = (x: number) => {
    for (let y = top; y <= bottom; y++) {
      const i = (y * w + x) * 4
      const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
      if (lum < 110) return true
    }
    return false
  }
  while (left < right && !colHasInk(left)) left++
  while (right > left && !colHasInk(right)) right--
  left = Math.max(0, left - 2)
  right = Math.min(w - 1, right + 2)

  const cropH = bottom - top + 1
  const cropW = right - left + 1
  if (cropH < 4 || cropW < 12) return source
  // Se quase não cortou, evita cópia inútil
  if (cropH >= h * 0.92 && cropW >= w * 0.95) return source

  return cropRect(source, {
    x: left,
    y: top,
    width: cropW,
    height: cropH,
  })
}

/**
 * Set code: isola o texto (sem barras) → pad → upscale → contraste/limiar suave.
 */
export function preprocessSetCodeForOcr(
  source: HTMLCanvasElement,
  mode: SetCodePreprocessMode = 'contrast',
): HTMLCanvasElement {
  const trimmed = trimSetCodeFrameRules(source)
  const padded = padCanvas(trimmed, 0.55)
  // Upscale moderado: glyphs pequenos, sem estourar
  const canvas = upscaleCanvas(padded, 1100, 6)
  const ctx = canvas.getContext('2d')
  if (!ctx) return trimmed

  if (mode === 'contrast' || mode === 'invert') {
    applyGrayscaleContrast(canvas, mode === 'invert' ? 1.75 : 1.7)
    if (mode === 'invert') {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = imageData.data
      for (let i = 0; i < data.length; i += 4) {
        data[i] = 255 - data[i]
        data[i + 1] = 255 - data[i + 1]
        data[i + 2] = 255 - data[i + 2]
      }
      ctx.putImageData(imageData, 0, 0)
    }
    return canvas
  }

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const data = imageData.data
  const gray = new Uint8Array(data.length / 4)
  let sum = 0

  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const v = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
    gray[p] = v
    sum += v
  }

  const mean = sum / gray.length
  const hist = new Array<number>(256).fill(0)
  for (let p = 0; p < gray.length; p++) hist[gray[p]]++

  let darkish = 0
  for (let v = 0; v < 250; v++) darkish += hist[v]
  let acc = 0
  let percentile = Math.round(mean)
  const target = Math.max(1, darkish * (mode === 'soft' ? 0.26 : 0.2))
  for (let v = 0; v < 250; v++) {
    acc += hist[v]
    if (acc >= target) {
      percentile = v
      break
    }
  }

  const threshold =
    mode === 'soft'
      ? Math.min(130, Math.max(65, mean * 0.75))
      : Math.min(125, Math.max(50, percentile + 10))

  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const v = gray[p] < threshold ? 0 : 255
    data[i] = v
    data[i + 1] = v
    data[i + 2] = v
  }
  ctx.putImageData(imageData, 0, 0)

  const ink = measureDarkInkRatio(canvas)
  if (ink < 0.015 || ink > 0.32) {
    return preprocessSetCodeForOcr(source, 'contrast')
  }
  return canvas
}

async function recognizeSetCode(
  image: HTMLCanvasElement,
): Promise<{ text: string; confidence: number }> {
  const worker = await getOcrWorker()
  const passes = [PSM.SINGLE_LINE, PSM.RAW_LINE] as const
  let best = { text: '', confidence: -1 }

  for (const psm of passes) {
    await worker.setParameters({
      tessedit_pageseg_mode: psm,
      user_defined_dpi: '300',
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-',
    })
    const result = await worker.recognize(image)
    const text = result.data.text ?? ''
    const confidence = Number(result.data.confidence ?? 0)
    const code = await resolveSetCodeWithCatalog(text)
    const score = (code ? 1000 : 0) + confidence + (text.trim() ? 5 : 0)
    const bestCode =
      (await resolveSetCodeWithCatalog(best.text)) ??
      normalizeSetCode(best.text) ??
      extractSetCodes(best.text)[0] ??
      null
    const bestScore =
      (bestCode ? 1000 : 0) + best.confidence + (best.text.trim() ? 5 : 0)
    if (score > bestScore) best = { text, confidence }
  }

  return best
}

function scoreSetCodeAttempt(params: {
  code: string | null
  text: string
  confidence: number
  inkRatio: number
  mode: SetCodePreprocessMode
}): number {
  const { code, text, confidence, inkRatio, mode } = params
  let score = confidence
  if (code) score += 1000
  if (text.trim().length > 0) score += 8
  if (inkRatio > 0.4 || inkRatio < 0.01) score -= 400
  else if (inkRatio >= 0.03 && inkRatio <= 0.28) score += 40
  if (mode === 'contrast') score += 15
  else if (mode === 'soft') score += 8
  else if (mode === 'invert') score += 2
  return score
}

/** Tenta várias bandas + pré-processamentos até obter um set code válido. */
async function recognizeSetCodeFromFrame(
  fullCanvas: HTMLCanvasElement,
  frame: CardFrameRect,
): Promise<{ code: string | null; previewUrl: string; text: string }> {
  const bands = getSetCodeBandCandidates(frame)
  const modes: SetCodePreprocessMode[] = [
    'contrast',
    'soft',
    'adaptive',
    'invert',
  ]
  let bestPreview = ''
  let bestText = ''
  let bestCode: string | null = null
  let bestScore = Number.NEGATIVE_INFINITY

  for (const band of bands) {
    const crop = cropRect(fullCanvas, band)
    for (const mode of modes) {
      const prepared = preprocessSetCodeForOcr(crop, mode)
      const inkRatio = measureDarkInkRatio(prepared)
      if (inkRatio > 0.45 && bestPreview) continue

      const previewUrl = prepared.toDataURL('image/jpeg', 0.92)
      const result = await recognizeSetCode(prepared)
      const code =
        (await resolveSetCodeWithCatalog(result.text)) ??
        normalizeSetCode(result.text) ??
        extractSetCodes(result.text)[0] ??
        null
      const score = scoreSetCodeAttempt({
        code,
        text: result.text,
        confidence: result.confidence,
        inkRatio,
        mode,
      })

      if (!bestPreview || inkRatio <= 0.35) {
        if (!bestPreview || score >= bestScore - 5) bestPreview = previewUrl
      }
      if (score > bestScore) {
        bestScore = score
        bestPreview = previewUrl
        bestText = result.text
        bestCode = code
      }
      if (code) {
        return { code: bestCode, previewUrl: bestPreview, text: bestText }
      }
    }
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

async function recognizeNameFromFrame(
  ocrCanvas: HTMLCanvasElement,
  frame: CardFrameRect,
): Promise<{
  text: string
  confidence: number
  candidates: string[]
  nameBandPreviewUrl: string
  merged: string
}> {
  const nameBand = cropNameBandFromFrame(ocrCanvas, frame)
  const preparedGold = preprocessNameForOcr(nameBand)
  const preparedGray = preprocessForOcr(nameBand)

  const [lineGold, blockGold, lineGray, blockGray] = await Promise.all([
    recognizeOnce(preparedGold, PSM.SINGLE_LINE),
    recognizeOnce(preparedGold, PSM.SINGLE_BLOCK),
    recognizeOnce(preparedGray, PSM.SINGLE_LINE),
    recognizeOnce(preparedGray, PSM.SINGLE_BLOCK),
  ])

  const namePasses = [
    { ...lineGold, preview: preparedGold },
    { ...blockGold, preview: preparedGold },
    { ...lineGray, preview: preparedGray },
    { ...blockGray, preview: preparedGray },
  ].sort(
    (a, b) =>
      scoreOcrResult(b.text, b.confidence) - scoreOcrResult(a.text, a.confidence),
  )

  const best = namePasses[0] ?? {
    text: '',
    confidence: 0,
    preview: preparedGold,
  }
  const merged = namePasses.map((p) => p.text).join('\n')
  const cleanedBest = normalizeOcrCardName(best.text.trim() || merged.trim())
  const candidates = extractCardNameCandidates(`${cleanedBest}\n${merged}`, 8)

  return {
    text: cleanedBest || candidates[0] || best.text.trim() || merged.trim(),
    confidence: best.confidence,
    candidates:
      candidates.length > 0
        ? candidates
        : cleanedBest
          ? [cleanedBest]
          : [],
    nameBandPreviewUrl: best.preview.toDataURL('image/jpeg', 0.85),
    merged,
  }
}

export interface IdentifyResult {
  text: string
  confidence: number
  candidates: string[]
  setCodes: string[]
  /** Set code lido na região dedicada (ex.: BLVO-EN068) */
  detectedSetCode: string | null
  autoDetected: boolean
  /** Carta retificada por perspectiva antes do OCR */
  perspectiveCorrected: boolean
  regions: CardTextRegions
  nameBandPreviewUrl: string
  setCodePreviewUrl: string
  /** Candidatos por similaridade visual (pHash da arte) */
  visualMatches: VisualMatchCandidate[]
  artPHash: string | null
  artPreviewUrl: string
}

export interface ScannerFrameInput {
  fullCanvas: HTMLCanvasElement
  manualFrame: CardFrameRect
  source?: CardCaptureSource
}

/** Pontua resultado para escolher o melhor frame do burst. */
export function scoreIdentifyResult(result: IdentifyResult): number {
  let score = 0
  if (result.detectedSetCode) score += 2500
  score += result.setCodes.length * 200
  score += result.confidence
  score += result.candidates.length * 12
  if (result.text.trim()) score += 30
  if (result.perspectiveCorrected) score += 5

  const bestVisual = result.visualMatches[0]
  if (bestVisual) {
    if (bestVisual.distance <= VISUAL_MATCH_STRONG_DISTANCE) score += 2200
    else if (bestVisual.distance <= 15) score += 1200
    score += Math.max(0, 20 - bestVisual.distance) * 25
  }

  return score
}

/**
 * Processa vários frames (burst) e retorna o de maior confiança.
 * Interrompe cedo quando um set code válido é lido.
 */
export async function identifyCardFromFrames(
  frames: ScannerFrameInput[],
): Promise<IdentifyResult> {
  if (frames.length === 0) {
    throw new Error('Nenhum frame para identificar')
  }

  if (frames.length === 1) {
    const only = frames[0]
    return identifyCardFromFrame(
      only.fullCanvas,
      only.manualFrame,
      only.source,
    )
  }

  let best: IdentifyResult | null = null
  let bestScore = Number.NEGATIVE_INFINITY

  for (const input of frames) {
    const result = await identifyCardFromFrame(
      input.fullCanvas,
      input.manualFrame,
      input.source,
    )
    const score = scoreIdentifyResult(result)
    if (score > bestScore) {
      bestScore = score
      best = result
    }
    if (result.detectedSetCode) break
  }

  if (best) return best

  const fallback = frames[0]
  return identifyCardFromFrame(
    fallback.fullCanvas,
    fallback.manualFrame,
    fallback.source,
  )
}

/**
 * Auto-enquadra (se possível), deskew, lê set code primeiro e nome só se necessário.
 */
export async function identifyCardFromFrame(
  fullCanvas: HTMLCanvasElement,
  manualFrame: CardFrameRect,
  source: CardCaptureSource = 'camera',
): Promise<IdentifyResult> {
  const { frame, autoDetected } = resolveCardFrame(fullCanvas, manualFrame, source)
  const {
    canvas: ocrCanvas,
    frame: ocrFrame,
    perspectiveCorrected,
  } = preparePerspectiveCanvas(fullCanvas, frame, {
    allowWarp: source !== 'camera',
  })
  const regions = getYgoTextRegions(ocrFrame)
  const visual = await findVisualMatchesFromFrame(ocrCanvas, ocrFrame)

  const setCodeHit = await recognizeSetCodeFromFrame(ocrCanvas, ocrFrame)
  const setFromRegion = setCodeHit.code

  if (setFromRegion) {
    return {
      text: '',
      confidence: 0,
      candidates: [],
      setCodes: [setFromRegion],
      detectedSetCode: setFromRegion,
      autoDetected,
      perspectiveCorrected,
      regions,
      nameBandPreviewUrl: '',
      setCodePreviewUrl: setCodeHit.previewUrl,
      visualMatches: visual.visualMatches,
      artPHash: visual.artPHash,
      artPreviewUrl: visual.artPreviewUrl,
    }
  }

  const nameResult = await recognizeNameFromFrame(ocrCanvas, ocrFrame)
  const setFromName = extractSetCodes(nameResult.merged)
  const allSetCodes = [
    ...setFromName,
  ]

  return {
    text: nameResult.text,
    confidence: nameResult.confidence,
    candidates: nameResult.candidates,
    setCodes: allSetCodes,
    detectedSetCode: null,
    autoDetected,
    perspectiveCorrected,
    regions,
    nameBandPreviewUrl: nameResult.nameBandPreviewUrl,
    setCodePreviewUrl: setCodeHit.previewUrl,
    visualMatches: visual.visualMatches,
    artPHash: visual.artPHash,
    artPreviewUrl: visual.artPreviewUrl,
  }
}

export interface ScannerSuggestion {
  label: SuggestionLabel
  /** Query usada (leitura original, set code ou autocorreção) */
  query: string
  item: CardImpression
}

/** Match por nome/set/archetype — ignora só-descrição (ex.: Terror de Trishula por “Ice Barrier”). */
function isStrongNameMatch(item: CardImpression): boolean {
  return item.searchRank <= 4
}

function normalizeSetCodeKey(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9-]/g, '')
}

function setCodesEqual(a: string, b: string): boolean {
  const left = normalizeSetCodeKey(a)
  const right = normalizeSetCodeKey(b)
  return Boolean(left && right && left === right)
}

function scoreSuggestion(
  item: CardImpression,
  ocrName: string,
  query: string,
  detectedSetCode?: string | null,
): number {
  const simName = nameSimilarity(item.name, ocrName)
  const simQuery = nameSimilarity(item.name, query)
  const rankBonus = Math.max(0, 10 - item.searchRank)
  let score = simName * 100 + simQuery * 40 + rankBonus * 5

  if (detectedSetCode) {
    if (setCodesEqual(item.setCode, detectedSetCode)) score += 500
    else if (
      normalizeSetCodeKey(item.setCode).includes(
        normalizeSetCodeKey(detectedSetCode),
      )
    ) {
      score += 180
    }
  }

  return score
}

/**
 * Busca no catálogo com até 3 sugestões.
 * Se houver set code OCR, ele tem prioridade na 1ª sugestão e
 * força a impressão correta nas sugestões por nome.
 */
export async function suggestScannerMatches(params: {
  ocrName: string
  setCode?: string | null
  extraCandidates?: string[]
  visualMatches?: VisualMatchCandidate[]
}): Promise<ScannerSuggestion[]> {
  const ocrName = normalizeOcrCardName(params.ocrName)
  const detectedSetCode = params.setCode
    ? (normalizeSetCode(params.setCode) ?? params.setCode.trim().toUpperCase())
    : null
  const variants = buildScannerQueryVariants(ocrName, [
    ...(params.extraCandidates ?? []).map(normalizeOcrCardName),
  ])

  const nameQueries = variants.slice(0, 3)
  const [setResult, ...nameResults] = await Promise.all([
    detectedSetCode
      ? searchCatalogBothLanguages({ query: detectedSetCode, pageSize: 24 })
      : Promise.resolve({ items: [] as CardImpression[] }),
    ...nameQueries.map((q) =>
      searchCatalogBothLanguages({ query: q, pageSize: 16 }),
    ),
  ])

  const setItems = setResult.items.filter(
    (it) => it.searchRank <= 2 || setCodesEqual(it.setCode, detectedSetCode ?? ''),
  )

  const setByCardLang = new Map<string, CardImpression>()
  const setByCardId = new Map<number, CardImpression>()
  for (const item of setItems) {
    setByCardLang.set(`${item.cardId}:${item.language}`, item)
    if (!setByCardId.has(item.cardId)) setByCardId.set(item.cardId, item)
  }

  /** Se o set code OCR achar a mesma carta, usa essa impressão (raridade/set certos). */
  function withDetectedPrinting(item: CardImpression): CardImpression {
    if (!detectedSetCode) return item
    return (
      setByCardLang.get(`${item.cardId}:${item.language}`) ??
      setByCardId.get(item.cardId) ??
      item
    )
  }

  const namePools = nameQueries.map((q, index) => ({
    query: q,
    items: (nameResults[index]?.items ?? [])
      .filter(isStrongNameMatch)
      .map(withDetectedPrinting),
  }))

  const suggestions: ScannerSuggestion[] = []
  const usedCardIds = new Set<number>()

  // 1) PRIORIDADE: melhor carta encontrada pelo set code
  if (detectedSetCode && setItems.length > 0) {
    const ranked = [...setItems].sort(
      (a, b) =>
        scoreSuggestion(b, ocrName || b.name, detectedSetCode, detectedSetCode) -
        scoreSuggestion(a, ocrName || a.name, detectedSetCode, detectedSetCode),
    )
    const best = ranked[0]
    if (best) {
      usedCardIds.add(best.cardId)
      suggestions.push({
        label: SET_CODE_SUGGESTION_LABEL,
        query: detectedSetCode,
        item: best,
      })
    }
  }

  // 2) Match visual por pHash da arte (após set code, antes do nome)
  if (params.visualMatches?.length) {
    const distanceById = new Map(
      params.visualMatches.map((match) => [match.cardId, match.distance]),
    )
    const visualIds = params.visualMatches
      .map((match) => match.cardId)
      .filter((id) => !usedCardIds.has(id))
      .slice(0, 5)

    if (visualIds.length > 0) {
      const cards = await getCardsByIdsWithFallback('pt', visualIds)
      const cardById = new Map(cards.map((card) => [card.id, card]))

      for (const cardId of visualIds) {
        if (suggestions.length >= 3) break
        if (usedCardIds.has(cardId)) continue

        const card = cardById.get(cardId)
        if (!card) continue

        const item = cardToCatalogItem(card, ocrName || card.name)
        if (!item) continue

        usedCardIds.add(cardId)
        const distance = distanceById.get(cardId) ?? 0
        suggestions.push({
          label: VISUAL_SUGGESTION_LABEL,
          query: `arte · ${distance} bits`,
          item: withDetectedPrinting(item),
        })
      }
    }
  }

  // 3) Variantes de nome (já com impressão do set code quando possível)
  for (let i = 0; i < namePools.length; i++) {
    if (suggestions.length >= 3) break
    const pool = namePools[i]
    const ranked = [...pool.items]
      .filter((it) => !usedCardIds.has(it.cardId))
      .sort(
        (a, b) =>
          scoreSuggestion(b, ocrName, pool.query, detectedSetCode) -
          scoreSuggestion(a, ocrName, pool.query, detectedSetCode),
      )
    const best = ranked[0]
    if (best) {
      usedCardIds.add(best.cardId)
      suggestions.push({
        label: suggestionLabel(suggestions.length),
        query: pool.query,
        item: best,
      })
    }
  }

  // 4) Completar até 3 com o restante dos pools
  if (suggestions.length < 3) {
    const all = [
      ...setItems.map((item) => ({
        item,
        query: detectedSetCode ?? item.setCode,
      })),
      ...namePools.flatMap((p) =>
        p.items.map((item) => ({ item, query: p.query })),
      ),
    ]
      .map((row) => ({ ...row, item: withDetectedPrinting(row.item) }))
      .filter((row) => !usedCardIds.has(row.item.cardId))
      .sort(
        (a, b) =>
          scoreSuggestion(b.item, ocrName, b.query, detectedSetCode) -
          scoreSuggestion(a.item, ocrName, a.query, detectedSetCode),
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
