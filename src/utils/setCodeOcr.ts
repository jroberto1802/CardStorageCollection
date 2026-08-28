/**
 * Normalização e correção de set codes YGO lidos por OCR.
 * Ex.: DPZO-EN0G6 → DP20-EN006
 */

const SET_CODE_STRICT_RE = /^([A-Z0-9]{2,5})-([A-Z]{0,3})(\d{1,4})$/
const SET_CODE_LOOSE_RE = /\b([A-Z0-9]{2,5}-[A-Z0-9]{2,10})\b/gi

/** Letras comuns confundidas com dígitos no número da carta. */
const DIGIT_AMBIG: Record<string, string[]> = {
  O: ['0'],
  D: ['0'],
  Q: ['0'],
  G: ['0', '6'],
  I: ['1'],
  L: ['1'],
  Z: ['2'],
  S: ['5'],
  B: ['8'],
}

/** Correções típicas de OCR em set codes (E↔F, língua, zeros). */
export function fixSetCodeOcrTypos(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[^A-Z0-9-\s]/g, ' ')
    .replace(/\s+/g, '')
    .replace(/-FN(\d)/g, '-EN$1')
    .replace(/-FM(\d)/g, '-EN$1')
    .replace(/-EM(\d)/g, '-EN$1')
    .replace(/-EH(\d)/g, '-EN$1')
    .replace(/-EU(\d)/g, '-EN$1')
    .replace(/-F(\d)/g, '-EN$1')
    .replace(/-E(\d)/g, '-EN$1')
    .replace(/-P(\d)/g, '-PT$1')
    .replace(/([A-Z]{2})S(\d{2})$/g, '$15$2')
    .replace(/([A-Z]{2})(\d)S(\d)$/g, '$1$25$3')
}

/** Corrige set id (antes do hífen): DPZO → DP20 — sem alterar letras válidas (BLVO, KICO). */
export function fixSetIdOcr(setId: string): string {
  return setId
    .replace(/Z/g, '2')
    .replace(/(\d)O$/g, '$10')
    .replace(/^O(\d)/g, '0$1')
}

/**
 * Corrige sufixo numérico após idioma: 0G6 → 006, ENO68 → 068.
 */
export function fixCollectorNumberOcr(num: string): string {
  let n = num
    .replace(/O/g, '0')
    .replace(/[IL]/g, '1')
    .replace(/Z/g, '2')
    .replace(/S/g, '5')
    .replace(/B/g, '8')

  // 0G6 / 0G06 — G no meio costuma ser zero
  n = n.replace(/0G(\d)/g, '00$1')
  n = n.replace(/(\d)G(\d)/g, '$16$2')
  n = n.replace(/G/g, '6')

  return n
}

function fixLangPart(lang: string): string {
  let l = lang.toUpperCase()

  if (l === 'FN' || l === 'FM' || l === 'F') return 'EN'
  if (l === 'P') return 'PT'

  if (l.length >= 2 && /[OIL]$/.test(l)) {
    const last = l.at(-1)!
    l = l.slice(0, -1)
    return l + (last === 'O' ? '0' : '1')
  }

  return l
}

function parseSetCodeParts(
  raw: string,
): { setId: string; lang: string; num: string } | null {
  const code = fixSetCodeOcrTypos(raw)
  const parts = code.match(/^([A-Z0-9]{2,5})-([A-Z]{0,3})(.+)$/)
  if (!parts) return null
  return { setId: parts[1], lang: parts[2], num: parts[3] }
}

function formatSetCode(
  setId: string,
  lang: string,
  num: string,
): string | null {
  const id = fixSetIdOcr(setId)
  let l = fixLangPart(lang)
  let n = fixCollectorNumberOcr(num)

  // ENO68 → lang EN + num 068
  if (/^[A-Z]{1,3}[OIL0-9]+$/.test(l + n)) {
    const merged = `${l}${n}`.replace(/O/g, '0').replace(/[IL]/g, '1')
    const langMatch = merged.match(/^(EN|PT|JP|DE|FR|IT|SP|AE|EU|KR|CN)(.+)$/i)
    if (langMatch) {
      l = langMatch[1].toUpperCase()
      n = fixCollectorNumberOcr(langMatch[2])
    }
  }

  const normalized = `${id}-${l}${n}`
  const match = normalized.match(SET_CODE_STRICT_RE)
  return match ? match[0] : null
}

/** Normaliza e corrige OCR comum em set codes YGO. */
export function normalizeSetCode(raw: string): string | null {
  const parsed = parseSetCodeParts(raw)
  if (!parsed) return null
  return formatSetCode(parsed.setId, parsed.lang, parsed.num)
}

function expandCollectorVariants(num: string, limit = 24): string[] {
  const upper = num.toUpperCase()
  const out = new Set<string>()

  function walk(idx: number, acc: string): void {
    if (out.size >= limit) return
    if (idx >= upper.length) {
      out.add(acc)
      return
    }
    const ch = upper[idx]!
    if (/\d/.test(ch)) {
      walk(idx + 1, acc + ch)
      return
    }
    const opts = DIGIT_AMBIG[ch] ?? [ch]
    for (const digit of opts) {
      walk(idx + 1, acc + digit)
      if (out.size >= limit) return
    }
  }

  walk(0, '')
  out.add(fixCollectorNumberOcr(upper))
  return [...out]
}

/** Gera candidatos a partir de leitura OCR ruidosa. */
export function generateSetCodeCandidates(raw: string, limit = 32): string[] {
  const parsed = parseSetCodeParts(raw)
  if (!parsed) {
    const direct = normalizeSetCode(raw)
    return direct ? [direct] : []
  }

  const setIds = [...new Set([parsed.setId, fixSetIdOcr(parsed.setId)])]
  const langs = [...new Set([parsed.lang, fixLangPart(parsed.lang)])]
  const nums = expandCollectorVariants(parsed.num)

  const candidates = new Set<string>()
  for (const setId of setIds) {
    for (const lang of langs) {
      for (const num of nums) {
        const formatted = formatSetCode(setId, lang, num)
        if (formatted) candidates.add(formatted)
        if (candidates.size >= limit) break
      }
    }
  }

  const direct = formatSetCode(parsed.setId, parsed.lang, parsed.num)
  if (direct) candidates.add(direct)

  return [...candidates]
}

export function extractSetCodes(ocrText: string): string[] {
  const found = ocrText.toUpperCase().match(SET_CODE_LOOSE_RE) ?? []
  const normalized = found
    .flatMap((s) => {
      const direct = normalizeSetCode(s)
      const variants = generateSetCodeCandidates(s, 8)
      return direct ? [direct, ...variants] : variants
    })
    .filter((s): s is string => Boolean(s))

  return [...new Set(normalized)]
}
