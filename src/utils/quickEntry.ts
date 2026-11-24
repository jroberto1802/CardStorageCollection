/**
 * Cadastro rápido: digita só os números do set ("1 5 12x3 40-45") e o app monta LIOV-EN001...
 * Tudo aqui é puro (sem rede/DOM), exceto saveDraft/loadDraft/clearDraft (localStorage com try/catch).
 */

import type { SetPrinting } from '@/types'

export type { SetPrinting }

export const KNOWN_REGIONS = ['EN', 'FR', 'DE', 'IT', 'PT', 'SP', 'ES', 'JP', 'JA', 'KR', 'SC', 'TC', 'AE', 'AS', 'NA', 'EU']
export const QUICK_ENTRY_CONFIRM_LIMIT = 60
/** Teto duro de um intervalo, mesmo com allowLarge */
export const MAX_RANGE = 2000
export const MAX_LINE_QUANTITY = 999
export const QUANTITY_WARNING_THRESHOLD = 4

export interface ActiveSet {
  prefix: string
  region: string | null
}

export interface QuickEntry {
  raw: string
  /** Número como digitado (ex.: '1', '001', 'A08'); a comparação usa numberKey, não o preenchimento. */
  number: string
  prefix?: string
  region?: string
  qty: number
}

export interface QuickEntryError {
  raw: string
  reason: string
  /** true quando o erro é só "confirmação necessária" (intervalo/quantidade acima do limite) */
  needsConfirmation?: boolean
}

export interface ParseResult {
  entries: QuickEntry[]
  errors: QuickEntryError[]
}

export interface ParseOptions {
  /** Libera intervalos/quantidades acima de 60 (depois que o usuário confirmou) */
  allowLarge?: boolean
}

/** '001' -> '1'; 'A08' -> 'A8'; usado para casar o número digitado com o do catálogo (qualquer largura). */
export function numberKey(value: string): string {
  const m = value.trim().toUpperCase().match(/^([A-Z]?)0*(\d+)$/)
  if (!m) return value.trim().toUpperCase()
  return `${m[1]}${m[2]}`
}

const REGION_SET = new Set(KNOWN_REGIONS)
/** Regiões aceitas dentro do código (inclui 'E' do formato antigo LOB-E001), igual ao regex do banco */
const REGION_RE = `${KNOWN_REGIONS.join('|')}|E`

function padLike(template: string, n: number): string {
  const digits = template.replace(/^[A-Za-z]/, '')
  const letter = template.match(/^[A-Za-z]/)?.[0] ?? ''
  return `${letter.toUpperCase()}${String(n).padStart(digits.length, '0')}`
}

/** Normaliza 'x' colado ('12 x 3' -> '12x3') e separa por espaço, vírgula, ponto e vírgula ou quebra de linha. */
function tokenize(text: string): string[] {
  return text
    .replace(/(\d)\s*[x×]\s*(\d)/gi, '$1x$2')
    .split(/[\s,;]+/)
    .map((t) => t.trim())
    .filter(Boolean)
}

interface Body {
  prefix?: string
  region?: string
  number: string
}

/** Interpreta o corpo (sem quantidade, sem intervalo). Devolve Body ou um motivo de erro. */
function parseBody(body: string, active: ActiveSet): Body | string {
  const activePrefix = active.prefix.toUpperCase()
  const upper = body.toUpperCase()

  // Código completo com hífen: LIOV-EN001, liov-en1, lob-001
  const dashed = upper.match(new RegExp(`^([A-Z0-9]+)-(${REGION_RE})?([A-Z]?\\d+)$`))
  if (dashed) {
    const [, prefix, region, number] = dashed
    return { prefix, region, number }
  }
  if (upper.includes('-')) return 'formato inválido'

  // Prefixo do set ativo colado (LIOV001, LIOVEN001, RA01EN001): o prefixo pode ter dígitos, então
  // usamos o prefixo ativo para saber onde ele termina.
  if (upper.startsWith(activePrefix) && upper.length > activePrefix.length) {
    const rest = upper.slice(activePrefix.length)
    const m = rest.match(new RegExp(`^(${REGION_RE})?([A-Z]?\\d+)$`))
    if (m) {
      const [, region, number] = m
      // 'LIOVEN001' => região EN; mas 'LIOVA08' => número A08
      return { prefix: activePrefix, region, number }
    }
  }

  // Número puro: 1, 001, A08
  const plain = upper.match(/^([A-Z]?\d+)$/)
  if (plain) return { number: plain[1] }

  // Região + número: EN001, ENA08 (só regiões conhecidas)
  const reg = upper.match(/^([A-Z]{2})([A-Z]?\d+)$/)
  if (reg && REGION_SET.has(reg[1])) return { region: reg[1], number: reg[2] }

  // Outro prefixo: LOB001, MP22001
  const other = upper.match(/^([A-Z][A-Z0-9]*?)(\d{1,4})$/)
  if (other) return { prefix: other[1], number: other[2] }

  return 'formato inválido'
}

function checkSet(b: Body, active: ActiveSet): string | null {
  if (b.prefix && b.prefix !== active.prefix.toUpperCase()) {
    return `prefixo ${b.prefix} é de outro set (ativo: ${active.prefix.toUpperCase()})`
  }
  if (b.region && active.region && b.region !== active.region.toUpperCase()) {
    return `região ${b.region} diferente da ativa (${active.region.toUpperCase()})`
  }
  return null
}

export function parseQuickEntry(
  text: string,
  activeSet: ActiveSet,
  options: ParseOptions = {},
): ParseResult {
  const entries: QuickEntry[] = []
  const errors: QuickEntryError[] = []
  const limit = QUICK_ENTRY_CONFIRM_LIMIT

  for (const raw of tokenize(text)) {
    // quantidade: <corpo terminado em dígito>x<n>
    let body = raw
    let qty = 1
    // O prefixo do set ativo é preservado intacto (pode conter x/X, ex.: 'A2X3'): a quantidade só é lida depois dele.
    const upperRaw = raw.toUpperCase()
    const prefixLen = upperRaw.startsWith(activeSet.prefix.toUpperCase()) ? activeSet.prefix.length : 0
    const head = raw.slice(0, prefixLen)
    const rest = raw.slice(prefixLen)
    const qm = rest.match(/^(.*\d)x(\d+)$/i)
    if (qm) {
      body = head + qm[1]
      qty = Number(qm[2])
    } else if (/\dx$/i.test(rest)) {
      errors.push({ raw, reason: 'quantidade ausente depois do x' })
      continue
    }

    if (!Number.isInteger(qty) || qty < 1) {
      errors.push({ raw, reason: 'quantidade deve ser pelo menos 1' })
      continue
    }
    if (qty > MAX_LINE_QUANTITY) {
      errors.push({ raw, reason: `quantidade máxima é ${MAX_LINE_QUANTITY}` })
      continue
    }
    if (qty > limit && !options.allowLarge) {
      errors.push({ raw, reason: `quantidade ${qty} acima de ${limit}: confirmação necessária`, needsConfirmation: true })
      continue
    }

    // intervalo: 40-45, A01-A05 (só números; o código completo usa hífen para o set)
    const range = body.match(/^([A-Za-z]?)(\d+)-([A-Za-z]?)(\d+)$/)
    if (range) {
      const [, l1, d1, l2, d2] = range
      if (l2 && l1.toUpperCase() !== l2.toUpperCase()) {
        errors.push({ raw, reason: 'intervalo com letras diferentes' })
        continue
      }
      const from = Number(d1)
      const to = Number(d2)
      if (from > to) {
        errors.push({ raw, reason: `intervalo invertido: use ${l1}${d2}-${l1}${d1}` })
        continue
      }
      const count = to - from + 1
      if (count > MAX_RANGE) {
        errors.push({ raw, reason: `intervalo acima do máximo de ${MAX_RANGE}` })
        continue
      }
      if (count > limit && !options.allowLarge) {
        errors.push({
          raw,
          reason: `intervalo de ${count} cartas acima de ${limit}: confirmação necessária`,
          needsConfirmation: true,
        })
        continue
      }
      const template = `${l1}${d1}`
      for (let n = from; n <= to; n++) entries.push({ raw, number: padLike(template, n), qty })
      continue
    }

    const parsed = parseBody(body, activeSet)
    if (typeof parsed === 'string') {
      errors.push({ raw, reason: parsed })
      continue
    }
    const mismatch = checkSet(parsed, activeSet)
    if (mismatch) {
      errors.push({ raw, reason: mismatch })
      continue
    }
    entries.push({
      raw,
      number: parsed.number,
      ...(parsed.prefix ? { prefix: parsed.prefix } : {}),
      ...(parsed.region ? { region: parsed.region } : {}),
      qty,
    })
  }

  return { entries, errors }
}

// ---------------------------------------------------------------------------
// Resolução por número no conjunto carregado
// ---------------------------------------------------------------------------

export type ResolveStatus = 'ok' | 'ambiguous' | 'notFound'
export type DefaultReason = 'single' | 'lastUsed' | 'heuristic'

export interface ResolveResult {
  status: ResolveStatus
  /** Todas as impressões possíveis (raridades; várias regiões/cartas quando o set é carregado sem região) */
  candidates: SetPrinting[]
  chosen?: SetPrinting
  defaultReason?: DefaultReason
}

const RARITY_PRIORITY = [
  'common',
  'short print',
  'super short print',
  'rare',
  'super rare',
  'ultra rare',
  'secret rare',
  'ultimate rare',
  'ghost rare',
  'starlight rare',
]

export function rarityRank(rarity: string): number {
  const index = RARITY_PRIORITY.indexOf(rarity.trim().toLowerCase())
  return index === -1 ? RARITY_PRIORITY.length : index
}

/** Heurística de padrão: Common > Short Print > Rare > ... ; empate por nome. */
export function pickHeuristicRarity(candidates: SetPrinting[]): SetPrinting {
  return [...candidates].sort(
    (a, b) => rarityRank(a.setRarity) - rarityRank(b.setRarity) || a.setRarity.localeCompare(b.setRarity),
  )[0]
}

export function resolveEntry(
  entry: Pick<QuickEntry, 'number' | 'prefix' | 'region'>,
  printings: SetPrinting[],
  options: { lastRarity?: string | null } = {},
): ResolveResult {
  const key = numberKey(entry.number)
  const seen = new Set<string>()
  const candidates: SetPrinting[] = []
  for (const p of printings) {
    if (!p.setNumber || numberKey(p.setNumber) !== key) continue
    if (entry.prefix && p.setPrefix?.toUpperCase() !== entry.prefix.toUpperCase()) continue
    if (entry.region && p.setRegion?.toUpperCase() !== entry.region.toUpperCase()) continue
    const unique = `${p.cardId}|${p.setCode}|${p.setRarity}`
    if (seen.has(unique)) continue
    seen.add(unique)
    candidates.push(p)
  }
  if (candidates.length === 0) return { status: 'notFound', candidates: [] }

  const distinctImpressions = new Set(candidates.map((c) => `${c.cardId}|${c.setCode}`))
  // Mais de uma carta/código para o mesmo número (ex.: set carregado sem região): sempre confirmar.
  if (distinctImpressions.size > 1) {
    return { status: 'ambiguous', candidates, chosen: pickHeuristicRarity(candidates), defaultReason: 'heuristic' }
  }
  if (candidates.length === 1) {
    return { status: 'ok', candidates, chosen: candidates[0], defaultReason: 'single' }
  }

  const last = options.lastRarity?.trim().toLowerCase()
  const byLast = last == null ? undefined : candidates.find((c) => c.setRarity.trim().toLowerCase() === last)
  if (byLast) return { status: 'ok', candidates, chosen: byLast, defaultReason: 'lastUsed' }
  return { status: 'ambiguous', candidates, chosen: pickHeuristicRarity(candidates), defaultReason: 'heuristic' }
}

// ---------------------------------------------------------------------------
// Estado do lote (reducer puro, com desfazer por ação)
// ---------------------------------------------------------------------------

export interface BatchLine {
  key: string
  cardId: number
  language: 'en' | 'pt'
  name: string
  setCode: string
  setName: string
  setRarity: string
  quantity: number
  /** raridades disponíveis (para trocar sem nova consulta) */
  rarityOptions: string[]
  imageUrlSmall?: string | null
  /** raridade assumida automaticamente (última usada / única) */
  auto?: boolean
  /** raridade ambígua ainda não confirmada: fica no lote e NÃO é salva até confirmar */
  unconfirmed?: boolean
}

export interface BatchState {
  lines: BatchLine[]
  history: BatchLine[][]
}

export const initialBatchState: BatchState = { lines: [], history: [] }
const HISTORY_LIMIT = 50

export function normalizeRarity(rarity: string | null | undefined): string {
  const value = (rarity ?? '').trim()
  return value === '—' ? '' : value
}

/** Chave de impressão, igual à da coleção (independe do idioma). */
export function collectionKey(cardId: number, setCode: string, setRarity: string): string {
  return `${cardId}|${setCode.trim().toUpperCase()}|${normalizeRarity(setRarity)}`
}

export interface BatchAddition {
  printing: SetPrinting
  quantity: number
  rarityOptions?: string[]
  auto?: boolean
  unconfirmed?: boolean
}

export type BatchAction =
  | { type: 'add'; items: BatchAddition[] }
  | { type: 'remove'; key: string }
  | { type: 'setQuantity'; key: string; quantity: number }
  | { type: 'setRarity'; key: string; printing: SetPrinting }
  | { type: 'confirmRarity'; key: string }
  | { type: 'commit'; keys: string[] }
  | { type: 'clear' }
  | { type: 'undo' }
  | { type: 'restore'; lines: BatchLine[] }

function lineFrom(item: BatchAddition): BatchLine {
  const p = item.printing
  return {
    key: collectionKey(p.cardId, p.setCode, p.setRarity),
    cardId: p.cardId,
    language: p.language,
    name: p.name,
    setCode: p.setCode,
    setName: p.setName,
    setRarity: normalizeRarity(p.setRarity),
    quantity: Math.min(MAX_LINE_QUANTITY, Math.max(1, Math.floor(item.quantity))),
    rarityOptions: item.rarityOptions ?? [p.setRarity],
    imageUrlSmall: p.imageUrlSmall,
    auto: item.auto ?? false,
    unconfirmed: item.unconfirmed ?? false,
  }
}

function pushHistory(state: BatchState, lines: BatchLine[]): BatchState {
  const history = [...state.history, state.lines].slice(-HISTORY_LIMIT)
  return { lines, history }
}

export function batchReducer(state: BatchState, action: BatchAction): BatchState {
  switch (action.type) {
    case 'add': {
      if (action.items.length === 0) return state
      const lines = state.lines.map((l) => ({ ...l }))
      const index = new Map(lines.map((l, i) => [l.key, i]))
      for (const item of action.items) {
        const next = lineFrom(item)
        const at = index.get(next.key)
        if (at === undefined) {
          index.set(next.key, lines.length)
          lines.push(next)
        } else {
          lines[at].quantity = Math.min(MAX_LINE_QUANTITY, lines[at].quantity + next.quantity)
          // soma ambígua numa linha já confirmada nunca é silenciosa: a linha volta a exigir revisão
          if (next.unconfirmed && !lines[at].unconfirmed) {
            lines[at].unconfirmed = true
            lines[at].auto = true
          }
        }
      }
      return pushHistory(state, lines) // expansão de intervalo = 1 ação
    }
    case 'remove': {
      if (!state.lines.some((l) => l.key === action.key)) return state
      return pushHistory(state, state.lines.filter((l) => l.key !== action.key))
    }
    case 'setQuantity': {
      const q = Math.floor(action.quantity)
      if (!Number.isFinite(q) || q < 1 || q > MAX_LINE_QUANTITY) return state
      const current = state.lines.find((l) => l.key === action.key)
      if (!current || current.quantity === q) return state
      return pushHistory(
        state,
        state.lines.map((l) => (l.key === action.key ? { ...l, quantity: q } : l)),
      )
    }
    case 'setRarity': {
      const current = state.lines.find((l) => l.key === action.key)
      if (!current) return state
      const nextKey = collectionKey(action.printing.cardId, action.printing.setCode, action.printing.setRarity)
      if (nextKey === current.key) {
        if (!current.unconfirmed && !current.auto) return state
        return pushHistory(
          state,
          state.lines.map((l) => (l.key === current.key ? { ...l, auto: false, unconfirmed: false } : l)),
        )
      }
      const moved: BatchLine = {
        ...current,
        key: nextKey,
        cardId: action.printing.cardId,
        language: action.printing.language,
        setCode: action.printing.setCode,
        setName: action.printing.setName,
        setRarity: normalizeRarity(action.printing.setRarity),
        auto: false,
        unconfirmed: false,
      }
      const target = state.lines.find((l) => l.key === nextKey)
      const lines = state.lines
        .filter((l) => l.key !== nextKey || l.key === current.key)
        .map((l) => (l.key === current.key ? moved : l))
      if (target) {
        const merged = lines.find((l) => l.key === nextKey)!
        merged.quantity = Math.min(MAX_LINE_QUANTITY, merged.quantity + target.quantity)
      }
      return pushHistory(state, lines)
    }
    case 'confirmRarity': {
      const current = state.lines.find((l) => l.key === action.key)
      if (!current || (!current.unconfirmed && !current.auto)) return state
      return pushHistory(
        state,
        state.lines.map((l) => (l.key === action.key ? { ...l, auto: false, unconfirmed: false } : l)),
      )
    }
    case 'commit': {
      // linhas salvas saem do lote e o histórico é zerado (desfazer não pode "ressuscitar" o que já foi gravado)
      const keys = new Set(action.keys)
      return { lines: state.lines.filter((l) => !keys.has(l.key)), history: [] }
    }
    case 'clear':
      return state.lines.length === 0 ? state : pushHistory(state, [])
    case 'undo': {
      if (state.history.length === 0) return state
      const history = state.history.slice(0, -1)
      return { lines: state.history[state.history.length - 1], history }
    }
    case 'restore':
      return { lines: action.lines, history: [] }
    default:
      return state
  }
}

export type OwnedMap = Map<string, number>

/** Posse por impressão (soma entre idiomas), chaveada por collectionKey. */
export function buildOwnedMap(
  items: Array<{ card_id: number; set_code: string; set_rarity: string; quantity: number }>,
): OwnedMap {
  const map: OwnedMap = new Map()
  for (const item of items) {
    const key = collectionKey(item.card_id, item.set_code, item.set_rarity)
    map.set(key, (map.get(key) ?? 0) + item.quantity)
  }
  return map
}

export interface LineHint {
  had: number
  willHave: number
  text: string
  warn: boolean
}

export function lineHint(line: BatchLine, owned: OwnedMap): LineHint {
  const had = owned.get(line.key) ?? 0
  const willHave = had + line.quantity
  return {
    had,
    willHave,
    text: had > 0 ? `Você tem ${had} → ${willHave}` : 'Nova na coleção',
    warn: line.quantity >= QUANTITY_WARNING_THRESHOLD,
  }
}

export interface BatchSummary {
  lines: number
  copies: number
  newCount: number
  updatedCount: number
  text: string
}

export function summarizeBatch(lines: BatchLine[], owned: OwnedMap): BatchSummary {
  let copies = 0
  let newCount = 0
  let updatedCount = 0
  for (const line of lines) {
    copies += line.quantity
    if ((owned.get(line.key) ?? 0) > 0) updatedCount++
    else newCount++
  }
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`
  return {
    lines: lines.length,
    copies,
    newCount,
    updatedCount,
    text: `${plural(lines.length, 'carta', 'cartas')} (${plural(copies, 'cópia', 'cópias')}): ${newCount} nova(s), ${updatedCount} atualizada(s)`,
  }
}

// ---------------------------------------------------------------------------
// Rascunho em localStorage
// ---------------------------------------------------------------------------

export const DRAFT_KEY = 'quickEntryDraft'
export const DRAFT_VERSION = 1

export interface QuickEntryDraft {
  activeSet: ActiveSet | null
  lines: BatchLine[]
}

export function serializeDraft(draft: QuickEntryDraft): string {
  return JSON.stringify({ version: DRAFT_VERSION, savedAt: Date.now(), ...draft })
}

function isLine(value: unknown): value is BatchLine {
  const l = value as BatchLine
  return (
    !!l &&
    typeof l.key === 'string' &&
    Number.isInteger(l.cardId) &&
    (l.language === 'en' || l.language === 'pt') &&
    typeof l.setCode === 'string' &&
    typeof l.setName === 'string' &&
    typeof l.setRarity === 'string' &&
    typeof l.name === 'string' &&
    Number.isInteger(l.quantity) &&
    l.quantity >= 1 &&
    l.quantity <= MAX_LINE_QUANTITY &&
    Array.isArray(l.rarityOptions)
  )
}

/** Devolve null se o JSON for inválido, de outra versão ou sem linhas válidas. */
export function restoreDraft(raw: string | null | undefined): QuickEntryDraft | null {
  if (!raw) return null
  try {
    const data = JSON.parse(raw) as { version?: number; activeSet?: ActiveSet | null; lines?: unknown }
    if (!data || data.version !== DRAFT_VERSION || !Array.isArray(data.lines)) return null
    const valid = data.lines.filter(isLine)
    // recalcula a chave (rascunho antigo/adulterado) e funde linhas que passem a colidir
    const byKey = new Map<string, BatchLine>()
    for (const line of valid) {
      const key = collectionKey(line.cardId, line.setCode, line.setRarity)
      const current = byKey.get(key)
      if (current) current.quantity = Math.min(MAX_LINE_QUANTITY, current.quantity + line.quantity)
      else byKey.set(key, { ...line, key })
    }
    const lines = [...byKey.values()]
    if (lines.length === 0) return null
    const a = data.activeSet
    const activeSet = a && typeof a.prefix === 'string' ? { prefix: a.prefix, region: a.region ?? null } : null
    return { activeSet, lines }
  } catch {
    return null
  }
}

/**
 * O rascunho é POR USUÁRIO (chave quickEntryDraft:<id>) e é apagado no logout, para que outro login no mesmo
 * navegador não restaure o lote anterior. Duas abas do mesmo usuário compartilham a chave: vale o último a salvar
 * (cada aba lê o rascunho só ao carregar e o sobrescreve a cada mudança do lote).
 */
export function draftKey(userId?: string | null): string {
  return `${DRAFT_KEY}:${userId || 'anon'}`
}

/** Logout: remove TODOS os rascunhos (qualquer usuário) deste navegador. */
export function clearAllDrafts(): void {
  try {
    const keys: string[] = []
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i)
      if (k && (k === DRAFT_KEY || k.startsWith(`${DRAFT_KEY}:`))) keys.push(k)
    }
    keys.forEach((k) => localStorage.removeItem(k))
  } catch {
    /* ignore */
  }
}

export function saveDraft(draft: QuickEntryDraft, userId?: string | null): void {
  try {
    const key = draftKey(userId)
    if (draft.lines.length === 0) localStorage.removeItem(key)
    else localStorage.setItem(key, serializeDraft(draft))
  } catch {
    /* sem storage: o rascunho é só conveniência */
  }
}

export function loadDraft(userId?: string | null): QuickEntryDraft | null {
  try {
    return restoreDraft(localStorage.getItem(draftKey(userId)))
  } catch {
    return null
  }
}

export function clearDraft(userId?: string | null): void {
  try {
    localStorage.removeItem(draftKey(userId))
  } catch {
    /* ignore */
  }
}

// ---------------------------------------------------------------------------
// Processamento de texto -> lote (usado pela tela) e salvamento parcial
// ---------------------------------------------------------------------------

export interface QuickProblem {
  id: string
  raw: string
  reason: string
  kind: 'parse' | 'notFound'
  /** código completo para "Copiar códigos não encontrados" */
  code?: string
}

export interface ProcessResult {
  additions: BatchAddition[]
  problems: QuickProblem[]
  /** erros que só pedem confirmação (intervalo/quantidade > 60) */
  needsConfirmation: QuickEntryError[]
  addedCount: number
  ambiguousCount: number
  message: string
}

let problemSeq = 0
function problemId(): string {
  problemSeq += 1
  return `p${Date.now().toString(36)}${problemSeq}`
}

export function formatEntryCode(entry: Pick<QuickEntry, 'number' | 'prefix' | 'region'>, active: ActiveSet): string {
  const prefix = (entry.prefix ?? active.prefix).toUpperCase()
  const region = (entry.region ?? active.region ?? '').toUpperCase()
  return `${prefix}-${region}${entry.number.toUpperCase()}`
}

export const NOT_FOUND_HINT = 'Cartas muito novas podem demorar a aparecer após a sincronização do catálogo.'

/** Texto -> adições (resolvidas) + problemas por linha. Nunca lança; nada é criado no catálogo. */
export function processQuickEntry(
  text: string,
  activeSet: ActiveSet,
  printings: SetPrinting[],
  options: { lastRarity?: string | null; allowLarge?: boolean } = {},
): ProcessResult {
  const parsed = parseQuickEntry(text, activeSet, { allowLarge: options.allowLarge })
  const additions: BatchAddition[] = []
  const problems: QuickProblem[] = []
  const needsConfirmation: QuickEntryError[] = []
  let ambiguousCount = 0

  for (const error of parsed.errors) {
    if (error.needsConfirmation) needsConfirmation.push(error)
    else problems.push({ id: problemId(), raw: error.raw, reason: `${error.raw}: ${error.reason}`, kind: 'parse' })
  }

  for (const entry of parsed.entries) {
    const result = resolveEntry(entry, printings, { lastRarity: options.lastRarity })
    if (result.status === 'notFound' || !result.chosen) {
      const code = formatEntryCode(entry, activeSet)
      problems.push({ id: problemId(), raw: entry.raw, reason: `${code} não encontrado no catálogo`, kind: 'notFound', code })
      continue
    }
    const chosen = result.chosen
    const rarityOptions = [
      ...new Set(
        result.candidates
          .filter((c) => c.cardId === chosen.cardId && c.setCode === chosen.setCode)
          .map((c) => c.setRarity),
      ),
    ]
    const unconfirmed = result.status === 'ambiguous'
    if (unconfirmed) ambiguousCount += 1
    additions.push({
      printing: chosen,
      quantity: entry.qty,
      rarityOptions,
      auto: result.defaultReason === 'lastUsed' || unconfirmed,
      unconfirmed,
    })
  }

  const parts: string[] = []
  parts.push(`${additions.length} ${additions.length === 1 ? 'adicionada' : 'adicionadas'}`)
  if (ambiguousCount > 0) parts.push(`${ambiguousCount} para confirmar a raridade`)
  if (problems.length > 0) {
    parts.push(`${problems.length} ${problems.length === 1 ? 'inválida' : 'inválidas'}: ${problems.map((p) => p.reason).join('; ')}`)
  }
  if (needsConfirmation.length > 0) parts.push(`${needsConfirmation.length} aguardando confirmação`)
  return { additions, problems, needsConfirmation, addedCount: additions.length, ambiguousCount, message: parts.join(', ') }
}

export interface SavePartition {
  saveable: BatchLine[]
  kept: BatchLine[]
}

/** Salva só as linhas confirmadas; ambíguas (não confirmadas) permanecem no lote. */
export function partitionForSave(lines: BatchLine[]): SavePartition {
  const saveable: BatchLine[] = []
  const kept: BatchLine[] = []
  for (const line of lines) (line.unconfirmed ? kept : saveable).push(line)
  return { saveable, kept }
}

export function toBatchItems(lines: BatchLine[]) {
  return lines.map((l) => ({
    card_id: l.cardId,
    language: l.language,
    set_code: l.setCode,
    set_name: l.setName,
    set_rarity: l.setRarity,
    quantity: l.quantity,
  }))
}

/** Mensagem do rodapé após salvar parcialmente */
export function describeSaveOutcome(result: { inserted: number; updated: number }, keptCount: number, problemCount: number): string {
  const saved = result.inserted + result.updated
  const base = `Salvas ${saved} ${saved === 1 ? 'carta' : 'cartas'}: ${result.inserted} ${result.inserted === 1 ? 'nova' : 'novas'}, ${result.updated} ${result.updated === 1 ? 'atualizada' : 'atualizadas'}`
  const extras: string[] = []
  if (keptCount > 0) extras.push(`${keptCount} ${keptCount === 1 ? 'ficou' : 'ficaram'} no lote aguardando confirmação de raridade`)
  if (problemCount > 0) extras.push(`${problemCount} com erro ${problemCount === 1 ? 'continua' : 'continuam'} listada(s)`)
  return extras.length ? `${base}. ${extras.join('; ')}.` : `${base}.`
}

export interface SetProgress {
  total: number
  owned: number
}

/** "Você tem X/Y": cartas distintas (set_code) do set carregado que o usuário possui em qualquer raridade/idioma. */
export function setProgress(printings: SetPrinting[], items: Array<{ set_code: string }>): SetProgress {
  const ownedCodes = new Set(items.map((i) => i.set_code.trim().toUpperCase()))
  const codes = new Set(printings.map((p) => p.setCode.trim().toUpperCase()))
  let owned = 0
  for (const code of codes) if (ownedCodes.has(code)) owned++
  return { total: codes.size, owned }
}

export function setDisplayName(printings: SetPrinting[]): string {
  const counts = new Map<string, number>()
  for (const p of printings) if (p.setName) counts.set(p.setName, (counts.get(p.setName) ?? 0) + 1)
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? ''
}

/** Linha do scanner: impressão exata já encontrada no catálogo -> adição direta (sem set ativo). */
export function additionFromImpression(item: {
  cardId: number
  language: 'en' | 'pt'
  name: string
  type?: string | null
  setCode: string
  setName: string
  setRarity: string
  imageUrlSmall?: string | null
}): BatchAddition | null {
  const code = item.setCode.trim()
  if (!code || code === '—') return null
  const m = code.toUpperCase().match(/^([A-Z0-9]+)-(EN|FR|DE|IT|PT|SP|ES|JP|JA|KR|SC|TC|AE|AS|NA|EU|E)?([A-Z]?[0-9]+)$/)
  const rarity = normalizeRarity(item.setRarity)
  return {
    printing: {
      cardId: item.cardId,
      language: item.language,
      name: item.name,
      type: item.type ?? null,
      setCode: code,
      setPrefix: m?.[1] ?? null,
      setRegion: m?.[2] ?? null,
      setNumber: m?.[3] ?? null,
      setName: item.setName === 'Sem set' ? '' : item.setName,
      setRarity: rarity,
      setRarityCode: null,
      setPrice: null,
      imageUrlSmall: item.imageUrlSmall ?? null,
    },
    quantity: 1,
  }
}

// Última raridade usada por set (para o padrão de raridade) ----------------
export const LAST_RARITY_KEY = 'quickEntryLastRarity'
export const LAST_SET_KEY = 'quickEntryLastSet'

export function setKey(set: ActiveSet): string {
  return `${set.prefix.toUpperCase()}|${(set.region ?? '').toUpperCase()}`
}

export function loadLastRarities(): Record<string, string> {
  try {
    const parsed = JSON.parse(localStorage.getItem(LAST_RARITY_KEY) ?? '{}') as Record<string, unknown>
    return Object.fromEntries(Object.entries(parsed).filter(([, v]) => typeof v === 'string')) as Record<string, string>
  } catch {
    return {}
  }
}

export function saveLastRarities(map: Record<string, string>): void {
  try {
    localStorage.setItem(LAST_RARITY_KEY, JSON.stringify(map))
  } catch {
    /* ignore */
  }
}

export function loadLastSet(): ActiveSet | null {
  try {
    const v = JSON.parse(localStorage.getItem(LAST_SET_KEY) ?? 'null') as ActiveSet | null
    return v && typeof v.prefix === 'string' && v.prefix ? { prefix: v.prefix, region: v.region ?? null } : null
  } catch {
    return null
  }
}

export function saveLastSet(set: ActiveSet): void {
  try {
    localStorage.setItem(LAST_SET_KEY, JSON.stringify(set))
  } catch {
    /* ignore */
  }
}

// ---------------------------------------------------------------------------
// Salvamento: reconciliação após erro, mensagens de erro e impressão da linha
// ---------------------------------------------------------------------------

/** Erro de rede/timeout (a RPC pode ter sido gravada no servidor mesmo assim). */
export function isNetworkError(message: string): boolean {
  return /failed to fetch|networkerror|network request|load failed|timeout|timed out|aborted|fetch failed|err_/i.test(message)
}

/** Traduz mensagens cruas para o usuário. */
export function describeSaveError(message: string): string {
  if (isNetworkError(message)) return 'Sem conexão estável com o servidor.'
  return message
}

export type ReconcileStatus = 'saved' | 'partial' | 'unsaved' | 'unknown'

export interface Reconciliation {
  status: ReconcileStatus
  /** chaves das linhas cuja posse SUBIU (foram gravadas) */
  savedKeys: string[]
}

/**
 * Após um erro ambíguo (rede/timeout), compara a posse antes/depois: se a quantidade de uma linha subiu, ela foi
 * gravada (a RPC soma, então reenviar duplicaria). Posse "depois" indisponível => 'unknown' (não assume nada).
 */
export function reconcileSave(lines: BatchLine[], before: OwnedMap, after: OwnedMap | null): Reconciliation {
  if (!after) return { status: 'unknown', savedKeys: [] }
  const savedKeys = lines.filter((l) => (after.get(l.key) ?? 0) > (before.get(l.key) ?? 0)).map((l) => l.key)
  if (savedKeys.length === 0) return { status: 'unsaved', savedKeys }
  return { status: savedKeys.length === lines.length ? 'saved' : 'partial', savedKeys }
}

export function describeReconciliation(r: Reconciliation, rawMessage: string): string {
  const base = describeSaveError(rawMessage)
  if (r.status === 'unknown') {
    return `${base} Não foi possível confirmar se foi salvo. Confira sua coleção antes de tentar de novo.`
  }
  if (r.status === 'unsaved') {
    return `${base} A coleção foi conferida e nenhuma carta do lote entrou; o lote foi preservado.`
  }
  return `${base} A coleção foi conferida: ${r.savedKeys.length} carta(s) já constam como salvas e saíram do lote; as demais continuam nele.`
}

/** Impressão montada a partir da própria linha (permite confirmar a raridade fora do set ativo). */
export function printingFromLine(line: BatchLine, rarity: string): SetPrinting {
  const m = line.setCode.toUpperCase().match(/^([A-Z0-9]+)-([A-Z]{0,2}[A-Z]?\d+)$/)
  return {
    cardId: line.cardId,
    language: line.language,
    name: line.name,
    type: null,
    setCode: line.setCode,
    setPrefix: m?.[1] ?? null,
    setRegion: null,
    setNumber: null,
    setName: line.setName,
    setRarity: rarity,
    setRarityCode: null,
    setPrice: null,
    imageUrlSmall: line.imageUrlSmall ?? null,
  }
}
