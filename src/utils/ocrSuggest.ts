/** Distância de Levenshtein normalizada (0 = idêntico, 1 = totalmente diferente). */
export function normalizedLevenshtein(a: string, b: string): number {
  const s = a.toLowerCase().trim()
  const t = b.toLowerCase().trim()
  if (!s && !t) return 0
  if (!s || !t) return 1
  if (s === t) return 0

  const rows = s.length + 1
  const cols = t.length + 1
  const prev = new Array<number>(cols)
  const curr = new Array<number>(cols)
  for (let j = 0; j < cols; j++) prev[j] = j

  for (let i = 1; i < rows; i++) {
    curr[0] = i
    for (let j = 1; j < cols; j++) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost)
    }
    for (let j = 0; j < cols; j++) prev[j] = curr[j]
  }

  return prev[t.length] / Math.max(s.length, t.length)
}

/** Similaridade 0–1 (1 = idêntico). */
export function nameSimilarity(a: string, b: string): number {
  return 1 - normalizedLevenshtein(a, b)
}

function fixCommonOcrChars(value: string): string {
  return value
    .replace(/\|/g, 'I')
    .replace(/\brn/gi, 'm')
    .replace(/([A-Za-z])0([A-Za-z])/g, '$1O$2')
    .replace(/([A-Za-z])1([A-Za-z])/g, '$1I$2')
}

/**
 * Gera até 3 variantes de busca a partir da leitura OCR:
 * original + autocorreções comuns.
 */
export function buildScannerQueryVariants(
  ocrText: string,
  extraCandidates: string[] = [],
): string[] {
  const base = ocrText.replace(/\s+/g, ' ').trim()
  if (!base) return []

  const variants: string[] = []
  const push = (v: string) => {
    const cleaned = v.replace(/\s+/g, ' ').trim()
    if (cleaned.length < 2) return
    if (!variants.some((x) => x.toLowerCase() === cleaned.toLowerCase())) {
      variants.push(cleaned)
    }
  }

  push(base)

  // Correção 1: troca OCR comum (0/O, 1/I, |/I, rn/m)
  push(fixCommonOcrChars(base))

  // Correção 2: 2 primeiras palavras (ou primeira se só 2)
  const words = base.split(' ').filter(Boolean)
  if (words.length >= 3) {
    push(words.slice(0, 2).join(' '))
  } else if (words.length === 2) {
    push(words[0])
  }

  for (const c of extraCandidates) push(c)

  return variants.slice(0, 3)
}

export type SuggestionLabel = 'original' | 'correção 1' | 'correção 2'

export function suggestionLabel(index: number): SuggestionLabel {
  if (index === 0) return 'original'
  if (index === 1) return 'correção 1'
  return 'correção 2'
}
