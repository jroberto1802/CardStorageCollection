import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertCircle, ArrowLeft, CheckCircle2, ClipboardCopy, Loader2, Undo2, X } from 'lucide-react'
import { Modal } from '@/components/common/Modal'
import { BatchLineRow } from '@/components/quickEntry/BatchLineRow'
import { SetPicker } from '@/components/quickEntry/SetPicker'
import { useQuickBatch } from '@/contexts/QuickBatchContext'
import { useSettings } from '@/contexts/SettingsContext'
import { addCollectionItemsBatch, BatchCollectionError, listCollectionItems } from '@/services/collectionService'
import { getSetPrintings } from '@/services/setPrintingsService'
import type { CollectionItem, SetPrefixOption, SetPrinting } from '@/types'
import {
  NOT_FOUND_HINT,
  buildOwnedMap,
  collectionKey,
  describeReconciliation,
  describeSaveError,
  describeSaveOutcome,
  isNetworkError,
  normalizeRarity,
  partitionForSave,
  processQuickEntry,
  reconcileSave,
  setDisplayName,
  setProgress,
  summarizeBatch,
  toBatchItems,
  type BatchLine,
  type QuickEntryError,
} from '@/utils/quickEntry'

type LoadState = 'idle' | 'loading' | 'ready' | 'error'

interface SaveResult {
  message: string
  setName: string
}

export function QuickEntryPage() {
  const navigate = useNavigate()
  const { language } = useSettings()
  const { state, dispatch, activeSet, setActiveSet, problems, addProblems, removeProblem, clearProblems, lastRarityFor, rememberRarity } =
    useQuickBatch()
  const uid = useId()

  const inputRef = useRef<HTMLInputElement>(null)
  const clearButtonRef = useRef<HTMLButtonElement>(null)
  const savingRef = useRef(false)

  const [printings, setPrintings] = useState<SetPrinting[]>([])
  const [loadState, setLoadState] = useState<LoadState>('idle')
  const [expected, setExpected] = useState<number | null>(null)
  const [reloadTick, setReloadTick] = useState(0)

  const [items, setItems] = useState<CollectionItem[]>([])
  const [ownedFailed, setOwnedFailed] = useState(false)

  const [text, setText] = useState('')
  const [announce, setAnnounce] = useState('')
  const [confirmLarge, setConfirmLarge] = useState<QuickEntryError[] | null>(null)
  // 'text' por padrão: o teclado numérico não tem x, - nem letras (o alternador 123/ABC continua)
  const [numericKeyboard, setNumericKeyboard] = useState(false)
  const [fieldFocused, setFieldFocused] = useState(false)
  const [footerHeight, setFooterHeight] = useState(180)
  const footerRef = useRef<HTMLDivElement>(null)
  const ownedRef = useRef(new Map<string, number>())

  const [saving, setSaving] = useState(false)
  const [saveResult, setSaveResult] = useState<SaveResult | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [clearOpen, setClearOpen] = useState(false)

  const prefix = activeSet?.prefix ?? null
  const region = activeSet?.region ?? null

  const focusInput = useCallback(() => requestAnimationFrame(() => inputRef.current?.focus()), [])

  // Carrega o set (cache por sessão no serviço)
  useEffect(() => {
    if (!prefix) {
      setPrintings([])
      setLoadState('idle')
      return
    }
    let alive = true
    setLoadState('loading')
    getSetPrintings(prefix, region, language)
      .then((list) => {
        if (!alive) return
        setPrintings(list)
        setLoadState('ready')
      })
      .catch(() => {
        if (alive) setLoadState('error')
      })
    return () => {
      alive = false
    }
  }, [prefix, region, language, reloadTick])

  // Posse atual (para "Você tem N → N+q" e resumo)
  const loadOwned = useCallback(async (): Promise<CollectionItem[] | null> => {
    try {
      const list = await listCollectionItems()
      setItems(list)
      setOwnedFailed(false)
      return list
    } catch {
      setOwnedFailed(true)
      return null
    }
  }, [])
  useEffect(() => {
    void loadOwned()
  }, [loadOwned])

  useEffect(() => {
    if (loadState === 'ready') focusInput()
  }, [loadState, focusInput])

  const owned = useMemo(() => buildOwnedMap(items), [items])
  useEffect(() => {
    ownedRef.current = owned
  }, [owned])

  // rodapé fixo: o espaço inferior acompanha a altura real (resultado/erro/aviso mudam a altura)
  useEffect(() => {
    const el = footerRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => setFooterHeight(el.offsetHeight))
    observer.observe(el)
    setFooterHeight(el.offsetHeight)
    return () => observer.disconnect()
  }, [])
  const progress = useMemo(() => setProgress(printings, items), [printings, items])
  const setName = useMemo(() => setDisplayName(printings), [printings])
  const summary = useMemo(() => summarizeBatch(state.lines, owned), [state.lines, owned])
  const { saveable, kept } = useMemo(() => partitionForSave(state.lines), [state.lines])
  const displayLines = useMemo(() => [...state.lines].reverse(), [state.lines])
  const notFoundCodes = problems.filter((p) => p.kind === 'notFound' && p.code).map((p) => p.code as string)

  function process(input: string, allowLarge = false) {
    if (!activeSet || loadState !== 'ready') return
    const result = processQuickEntry(input, activeSet, printings, { lastRarity: lastRarityFor(activeSet), allowLarge })
    if (result.additions.length) dispatch({ type: 'add', items: result.additions })
    addProblems(result.problems)
    setAnnounce(result.message || 'Nada para adicionar.')
    if (result.needsConfirmation.length) setConfirmLarge(result.needsConfirmation)
    return result
  }

  function submit() {
    if (!text.trim() || saving) return
    process(text)
    setText('')
    focusInput()
  }

  function confirmLargeEntries() {
    if (!confirmLarge) return
    process(confirmLarge.map((e) => e.raw).join(' '), true)
    setConfirmLarge(null)
    focusInput()
  }

  function onRarity(line: BatchLine, printing: SetPrinting) {
    dispatch({ type: 'setRarity', key: line.key, printing })
    if (activeSet) rememberRarity(activeSet, normalizeRarity(printing.setRarity))
  }

  async function save() {
    if (savingRef.current) return
    const { saveable: toSave, kept: toKeep } = partitionForSave(state.lines)
    if (toSave.length === 0) return
    savingRef.current = true
    setSaving(true)
    setSaveError(null)
    setSaveResult(null)
    const ownedBefore = new Map(ownedRef.current)
    try {
      const result = await addCollectionItemsBatch(toBatchItems(toSave))
      dispatch({ type: 'commit', keys: toSave.map((l) => l.key) })
      const names = new Map<string, number>()
      for (const l of toSave) if (l.setName) names.set(l.setName, (names.get(l.setName) ?? 0) + 1)
      const album = [...names.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? setName
      setSaveResult({ message: describeSaveOutcome(result, toKeep.length, problems.length), setName: album })
      void loadOwned()
    } catch (err) {
      const raw = err instanceof Error ? err.message : 'Falha ao salvar'
      if (err instanceof BatchCollectionError && err.savedItems > 0) {
        // remove do lote só o que JÁ foi gravado; 'Tentar novamente' reenvia apenas o restante
        // (a RPC soma: reenviar o lote inteiro duplicaria quantidades)
        const remaining = new Set(err.remainingItems.map((i) => collectionKey(i.card_id, i.set_code, i.set_rarity)))
        dispatch({ type: 'commit', keys: toSave.filter((l) => !remaining.has(l.key)).map((l) => l.key) })
        let pending = err.remainingItems.length
        let extra = ''
        if (isNetworkError(raw)) {
          // o chunk que falhou pode ter sido gravado antes da queda: confere a posse antes de reenviar
          const fresh = await loadOwned()
          const rest = toSave.filter((l) => remaining.has(l.key))
          const result = reconcileSave(rest, ownedBefore, fresh ? buildOwnedMap(fresh) : null)
          if (result.status === 'unknown') extra = ' Não foi possível confirmar o último trecho: confira sua coleção antes de tentar de novo.'
          else if (result.savedKeys.length > 0) {
            dispatch({ type: 'commit', keys: result.savedKeys })
            pending -= result.savedKeys.length
          }
        } else {
          void loadOwned()
        }
        setSaveError(
          `${describeSaveError(raw)} ${err.savedChunks} de ${err.totalChunks} partes já foram salvas e saíram do lote; Tentar novamente envia só as ${pending} restantes.${extra}`,
        )
      } else if (isNetworkError(raw)) {
        // Erro de rede/timeout: a RPC pode ter sido gravada no servidor (e ela SOMA). Confere a posse antes de
        // qualquer nova tentativa e só remove do lote o que realmente subiu.
        const fresh = await loadOwned()
        const result = reconcileSave(toSave, ownedBefore, fresh ? buildOwnedMap(fresh) : null)
        if (result.savedKeys.length > 0) dispatch({ type: 'commit', keys: result.savedKeys })
        setSaveError(describeReconciliation(result, raw))
      } else {
        // Resposta de erro do servidor: a transação foi revertida, nada entrou.
        setSaveError(`${describeSaveError(raw)}. Nada foi salvo; o lote foi preservado.`)
      }
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLElement>) {
    const target = event.target as HTMLElement
    // atalhos globais só no campo de códigos ou fora de campos de texto; nunca em diálogo nem salvando
    const inDialog = Boolean(target.closest('[role="dialog"]'))
    const inOtherField = target !== inputRef.current && target.matches('input, textarea, select, [contenteditable="true"]')
    const shortcutsOk = !inDialog && !inOtherField && !saving
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      if (!shortcutsOk) return
      event.preventDefault()
      void save()
    } else if ((event.key === 'z' || event.key === 'Z') && (event.ctrlKey || event.metaKey)) {
      if (!shortcutsOk || (target === inputRef.current && text)) return
      event.preventDefault()
      dispatch({ type: 'undo' })
    } else if (event.key === 'Escape' && event.target === inputRef.current) {
      event.preventDefault()
      if (text) setText('')
      else if (confirmLarge) setConfirmLarge(null)
      else navigate('/collection')
    }
  }

  async function copyNotFound() {
    const payload = notFoundCodes.join('\n')
    try {
      await navigator.clipboard.writeText(payload)
      setAnnounce(`${notFoundCodes.length} código(s) copiado(s).`)
    } catch {
      setAnnounce('Não foi possível copiar automaticamente.')
    }
  }

  function selectSet(set: { prefix: string; region: string | null }, option: SetPrefixOption | null) {
    setActiveSet(set)
    setExpected(option?.totalCards ?? null)
    setSaveResult(null)
    setConfirmLarge(null)
    clearProblems()
  }

  const disabled = saving
  const ready = loadState === 'ready'
  const hintId = `${uid}-hint`
  // teclado virtual aberto em tela pequena: esconde resultado/erro do rodapé para não cobrir o campo
  const hideBlocks = fieldFocused && typeof window !== 'undefined' && window.matchMedia?.('(max-width: 640px)').matches

  return (
    <div className="space-y-4" style={{ paddingBottom: footerHeight + 16 }} onKeyDown={onKeyDown}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/collection" className="inline-flex min-h-11 items-center gap-1.5 text-sm text-[var(--color-muted)] hover:text-[var(--color-text)]">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Minha coleção
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">Entrada rápida por lote</h1>
          <p className="text-sm text-[var(--color-muted)]">Escolha o set e digite só os números das cartas.</p>
        </div>
      </div>

      <section aria-label="Set" className="space-y-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <SetPicker
          value={activeSet}
          disabled={disabled}
          onSelect={selectSet}
          onRegionChange={(r) => {
            if (!prefix) return
            setActiveSet({ prefix, region: r })
            setConfirmLarge(null)
            clearProblems()
          }}
        />
        {prefix && (
          <p className="text-sm" data-testid="set-summary">
            {loadState === 'loading' && (
              <span role="status" className="flex items-center gap-2 text-[var(--color-muted)]">
                <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                {expected ? `Carregando ${expected} cartas do set...` : 'Carregando cartas do set...'}
              </span>
            )}
            {ready && printings.length > 0 && (
              <span>
                <span className="font-mono font-semibold">{prefix}</span> - {setName || 'Set'} - {progress.total} cartas -{' '}
                {ownedFailed ? 'posse indisponível' : `você tem ${progress.owned}/${progress.total}`}
              </span>
            )}
            {loadState === 'error' && (
              <span role="alert" className="flex flex-wrap items-center gap-3 text-red-300">
                <AlertCircle className="h-4 w-4" aria-hidden="true" /> Não foi possível carregar o set.
                <button type="button" onClick={() => setReloadTick((n) => n + 1)} className="min-h-11 rounded-lg border border-[var(--color-border)] px-3 text-[var(--color-text)]">
                  Tentar novamente
                </button>
              </span>
            )}
            {ready && printings.length === 0 && (
              <span role="status" className="text-amber-300" data-testid="empty-set">
                Nenhuma carta encontrada para {prefix}
                {region ? `-${region}` : ''}. {NOT_FOUND_HINT}
              </span>
            )}
          </p>
        )}
      </section>

      <section aria-label="Códigos" className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <label htmlFor={`${uid}-codes`} className="mb-1 block text-sm font-medium">
          Números das cartas
        </label>
        <div className="flex gap-2">
          <input
            ref={inputRef}
            id={`${uid}-codes`}
            value={text}
            disabled={disabled || !ready}
            onFocus={() => setFieldFocused(true)}
            onBlur={() => setFieldFocused(false)}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey) {
                e.preventDefault()
                submit()
              }
            }}
            aria-describedby={hintId}
            placeholder="1 5 12x3 40-45 ou LIOV-EN001"
            inputMode={numericKeyboard ? 'numeric' : 'text'}
            enterKeyHint="done"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            className="min-h-11 min-w-0 flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-base outline-none focus:border-[var(--color-accent)] disabled:opacity-60"
          />
          <button
            type="button"
            onClick={() => setNumericKeyboard((v) => !v)}
            aria-pressed={numericKeyboard}
            aria-label="Alternar teclado numérico"
            className="min-h-11 rounded-lg border border-[var(--color-border)] px-3 text-xs"
          >
            {numericKeyboard ? '123' : 'ABC'}
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={disabled || !ready || !text.trim()}
            className="min-h-11 rounded-lg bg-[var(--color-accent)] px-4 text-sm font-medium text-white disabled:opacity-50"
          >
            Adicionar
          </button>
        </div>
        <p id={hintId} className="mt-1 text-xs text-[var(--color-muted)]">
          Separe por espaço ou vírgula. Use <code>12x3</code> para 3 cópias e <code>40-45</code> para um intervalo. Enter adiciona.
        </p>
        <details className="mt-2 text-xs text-[var(--color-muted)]">
          <summary className="min-h-11 cursor-pointer py-2">Atalhos</summary>
          <ul className="list-disc space-y-1 pl-5">
            <li>Enter: adiciona os números digitados</li>
            <li>Esc: limpa o campo (com o campo vazio, volta para a coleção)</li>
            <li>Ctrl+Z (campo vazio): desfaz a última ação</li>
            <li>Ctrl+Enter: salva tudo</li>
            <li>Setas esquerda/direita nas raridades: trocam a escolha</li>
          </ul>
        </details>

        <p role="status" aria-live="polite" className="mt-2 min-h-5 text-sm" data-testid="announce">
          {announce}
        </p>

        {confirmLarge && (
          <div role="alert" className="mt-2 space-y-2 rounded-lg border border-amber-400/60 bg-amber-400/10 p-3 text-sm">
            <p>Confirmação necessária: {confirmLarge.map((e) => e.reason).join('; ')}.</p>
            <div className="flex gap-2">
              <button type="button" onClick={confirmLargeEntries} className="min-h-11 rounded-lg bg-[var(--color-accent)] px-4 text-white">
                Confirmar
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmLarge(null)
                  focusInput()
                }}
                className="min-h-11 rounded-lg border border-[var(--color-border)] px-4"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </section>

      {problems.length > 0 && (
        <section aria-label="Erros" className="space-y-2">
          <ul aria-label="Códigos com erro" className="space-y-2">
            {problems.map((p) => (
              <li key={p.id} className="flex items-start gap-2 rounded-xl border border-red-400/50 bg-red-400/10 px-3 py-2 text-sm text-red-200">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="min-w-0 flex-1">{p.reason}</span>
                <button type="button" aria-label={`Dispensar erro: ${p.reason}`} onClick={() => removeProblem(p.id)} className="flex h-11 w-11 shrink-0 items-center justify-center">
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
          {notFoundCodes.length > 0 && (
            <div className="space-y-2 text-xs text-[var(--color-muted)]">
              <p>{NOT_FOUND_HINT} Nada foi criado no catálogo.</p>
              <button type="button" onClick={() => void copyNotFound()} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[var(--color-border)] px-3 text-sm text-[var(--color-text)]">
                <ClipboardCopy className="h-4 w-4" aria-hidden="true" /> Copiar códigos não encontrados
              </button>
            </div>
          )}
          <button type="button" onClick={clearProblems} className="min-h-11 rounded-lg border border-[var(--color-border)] px-3 text-xs">
            Dispensar todos os erros
          </button>
        </section>
      )}

      <section aria-label="Lote" className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold tracking-wide uppercase">Lote ({state.lines.length})</h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => dispatch({ type: 'undo' })}
              disabled={disabled || state.history.length === 0}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 text-sm disabled:opacity-40"
            >
              <Undo2 className="h-4 w-4" aria-hidden="true" /> Desfazer última
            </button>
            <button
              ref={clearButtonRef}
              type="button"
              onClick={() => setClearOpen(true)}
              disabled={disabled || state.lines.length === 0}
              className="min-h-11 rounded-lg border border-[var(--color-border)] px-3 text-sm disabled:opacity-40"
            >
              Limpar
            </button>
          </div>
        </div>
        {state.lines.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[var(--color-border)] px-4 py-8 text-center text-sm text-[var(--color-muted)]">
            O lote está vazio. Digite números de cartas do set acima.
          </p>
        ) : (
          <ul className="space-y-2">
            {displayLines.map((line) => (
              <BatchLineRow
                key={line.key}
                line={line}
                owned={owned}
                printings={printings}
                disabled={disabled}
                onQuantity={(key, quantity) => dispatch({ type: 'setQuantity', key, quantity })}
                onRarity={onRarity}
                onRemove={(key) => dispatch({ type: 'remove', key })}
              />
            ))}
          </ul>
        )}
      </section>

      {/* Rodapé fixo: sempre visível em 360px */}
      <div ref={footerRef} className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.3)]">
        <div className="mx-auto max-w-5xl space-y-2">
          {saveResult && !hideBlocks && (
            <div role="status" className="space-y-2 rounded-lg border border-green-400/50 bg-green-400/10 p-3 text-sm" data-testid="save-result">
              <p className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-300" aria-hidden="true" />
                {saveResult.message}
              </p>
              <div className="flex flex-wrap gap-2">
                {saveResult.setName && (
                  <Link
                    to={`/collection?view=album&set=${encodeURIComponent(saveResult.setName)}`}
                    className="inline-flex min-h-11 items-center rounded-lg border border-[var(--color-border)] px-3"
                  >
                    Ver set no álbum
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setSaveResult(null)
                    focusInput()
                  }}
                  className="min-h-11 rounded-lg bg-[var(--color-accent)] px-3 text-white"
                >
                  Continuar (novo lote)
                </button>
              </div>
            </div>
          )}
          {saveError && !hideBlocks && (
            <div role="alert" className="flex flex-wrap items-center gap-3 rounded-lg border border-red-400/50 bg-red-400/10 p-3 text-sm text-red-200">
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="min-w-0 flex-1">{saveError}</span>
              <button type="button" onClick={() => void save()} className="min-h-11 rounded-lg border border-red-300/60 px-3">
                Tentar novamente
              </button>
            </div>
          )}
          {kept.length > 0 && (
            <p className="text-xs text-amber-300" data-testid="kept-warning">
              {kept.length} {kept.length === 1 ? 'carta ficará' : 'cartas ficarão'} no lote: confirme a raridade para salvar.
            </p>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm" data-testid="batch-summary">
              {summary.lines} {summary.lines === 1 ? 'carta' : 'cartas'} - {summary.newCount} {summary.newCount === 1 ? 'nova' : 'novas'} -{' '}
              {summary.updatedCount} {summary.updatedCount === 1 ? 'atualizada' : 'atualizadas'}
            </p>
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving || saveable.length === 0}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[var(--color-accent)] px-5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
              Salvar tudo ({saveable.length})
            </button>
          </div>
        </div>
      </div>

      <Modal open={clearOpen} onClose={() => setClearOpen(false)} labelledBy={`${uid}-clear-title`} returnFocusRef={clearButtonRef}>
        <div className="space-y-3 p-5">
          <h2 id={`${uid}-clear-title`} className="text-lg font-semibold">
            Limpar o lote?
          </h2>
          <p className="text-sm text-[var(--color-muted)]">As {state.lines.length} cartas do lote serão removidas (você pode desfazer logo depois).</p>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setClearOpen(false)} className="min-h-11 rounded-lg border border-[var(--color-border)] px-4">
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => {
                dispatch({ type: 'clear' })
                clearProblems()
                setClearOpen(false)
              }}
              className="min-h-11 rounded-lg bg-red-500 px-4 text-white"
            >
              Limpar lote
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
