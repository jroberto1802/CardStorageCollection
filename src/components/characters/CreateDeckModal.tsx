import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, ChevronRight, Loader2, X } from 'lucide-react'
import { Modal } from '@/components/common/Modal'
import { createUserDeckFromCards, planUserDeckRows } from '@/services/syncedDeckService'
import type {
  AnimeDeckCardView,
  AppLanguage,
  CreateUserDeckResult,
  ResolvedAnimeDeckCard,
} from '@/types'
import {
  MAX_USER_DECK_NAME,
  buildCreateDeckCards,
  validateUserDeckName,
  type CreateDeckMode,
  type DeckCardEntry,
} from '@/utils/characterView'

const RECENT_KEY_PREFIX = 'csc-created-deck-'
const RECENT_WINDOW_MS = 10 * 60 * 1000

interface RecentCreation {
  deckId: string
  at: number
}

function readRecent(deckSlug: string): RecentCreation | null {
  try {
    const raw = localStorage.getItem(`${RECENT_KEY_PREFIX}${deckSlug}`)
    if (!raw) return null
    const parsed = JSON.parse(raw) as RecentCreation
    return Date.now() - parsed.at < RECENT_WINDOW_MS ? parsed : null
  } catch {
    return null
  }
}

function writeRecent(deckSlug: string, deckId: string) {
  try {
    localStorage.setItem(
      `${RECENT_KEY_PREFIX}${deckSlug}`,
      JSON.stringify({ deckId, at: Date.now() } satisfies RecentCreation),
    )
  } catch {
    // ignore
  }
}

type Phase = 'form' | 'submitting' | 'success' | 'partial' | 'error'

interface CreateDeckModalProps {
  open: boolean
  onClose: () => void
  deckSlug: string
  defaultName: string
  language: AppLanguage
  entries: DeckCardEntry<ResolvedAnimeDeckCard>[]
  unresolvedCards: AnimeDeckCardView[]
  collectionOk: boolean
  returnFocusRef?: RefObject<HTMLElement | null>
}

export function CreateDeckModal(props: CreateDeckModalProps) {
  // Remonta o conteúdo a cada abertura para resetar o estado.
  return props.open ? <CreateDeckModalBody key="open" {...props} /> : null
}

function CreateDeckModalBody({
  open,
  onClose,
  deckSlug,
  defaultName,
  language,
  entries,
  unresolvedCards,
  collectionOk,
  returnFocusRef,
}: CreateDeckModalProps) {
  const [name, setName] = useState(defaultName)
  const [nameError, setNameError] = useState<string | null>(null)
  const [mode, setMode] = useState<CreateDeckMode>('all')
  const [phase, setPhase] = useState<Phase>('form')
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [result, setResult] = useState<CreateUserDeckResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showUnresolved, setShowUnresolved] = useState(false)
  const [recent] = useState(() => readRecent(deckSlug))
  const submittingRef = useRef(false)
  const nameRef = useRef<HTMLInputElement>(null)
  const openDeckRef = useRef<HTMLAnchorElement>(null)

  // Ao concluir (sucesso/parcial) o foco vai para "Abrir deck" (o botão enviado deixou de existir).
  useEffect(() => {
    if (phase === 'success' || phase === 'partial') openDeckRef.current?.focus()
  }, [phase])

  const plans = useMemo(() => {
    const all = planUserDeckRows(buildCreateDeckCards(entries, 'all'))
    const owned = planUserDeckRows(buildCreateDeckCards(entries, 'owned'))
    return { all, owned }
  }, [entries])

  const ownedDisabled = !collectionOk || plans.owned.rows.length === 0
  const effectiveMode: CreateDeckMode = ownedDisabled ? 'all' : mode
  const plan = effectiveMode === 'owned' ? plans.owned : plans.all
  const zoneTotals = { main: 0, extra: 0, side: 0 }
  for (const row of plan.rows) zoneTotals[row.zone] += 1
  const unresolvedCopies = unresolvedCards.reduce((sum, card) => sum + card.quantity, 0)
  const busy = phase === 'submitting'

  async function submit() {
    if (submittingRef.current) return
    const validation = validateUserDeckName(name)
    if (validation) {
      setNameError(validation)
      nameRef.current?.focus()
      return
    }
    submittingRef.current = true
    setNameError(null)
    setError(null)
    setPhase('submitting')
    setProgress({ done: 0, total: plan.rows.length })
    try {
      const created = await createUserDeckFromCards({
        name: name.trim(),
        language,
        cards: buildCreateDeckCards(entries, effectiveMode),
        onProgress: (done, total) => setProgress({ done, total }),
      })
      writeRecent(deckSlug, created.deckId)
      setResult(created)
      setPhase(created.failedAtChunk ? 'partial' : 'success')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível criar o deck.')
      setPhase('error')
    } finally {
      submittingRef.current = false
    }
  }

  const titleId = 'create-deck-title'
  const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0
  const noteSkipped = plan.skippedUnresolved + unresolvedCopies

  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy={titleId}
      dismissible={!busy}
      returnFocusRef={returnFocusRef}
      initialFocusRef={nameRef}
    >
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
        <h2 id={titleId} className="text-base font-semibold">
          {phase === 'success' ? 'Deck criado!' : 'Criar meu deck'}
        </h2>
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          aria-label="Fechar"
          className="flex h-11 w-11 items-center justify-center rounded-lg text-[var(--color-muted)] hover:bg-[var(--color-surface-2)] disabled:opacity-40"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <div className="space-y-4 overflow-y-auto p-4">
        {(phase === 'form' || phase === 'error' || phase === 'submitting') && (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              void submit()
            }}
            className="space-y-4"
            noValidate
          >
            {recent && phase === 'form' && (
              <p
                role="status"
                className="flex items-start gap-2 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-sm text-amber-200"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>
                  Você criou um deck a partir deste há poucos minutos.{' '}
                  <Link to={`/decks/${recent.deckId}`} className="underline">
                    Abrir o deck criado
                  </Link>
                </span>
              </p>
            )}

            <div>
              <label htmlFor="create-deck-name" className="mb-1 block text-sm font-medium">
                Nome do deck
              </label>
              <input
                id="create-deck-name"
                ref={nameRef}
                value={name}
                maxLength={MAX_USER_DECK_NAME}
                disabled={busy}
                aria-invalid={nameError ? true : undefined}
                aria-describedby={nameError ? 'create-deck-name-error' : undefined}
                onChange={(e) => {
                  setName(e.target.value)
                  if (nameError) setNameError(validateUserDeckName(e.target.value))
                }}
                className="min-h-11 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm outline-none ring-[var(--color-accent)] focus:ring-2 disabled:opacity-60"
              />
              {nameError && (
                <p id="create-deck-name-error" role="alert" className="mt-1 text-sm text-red-300">
                  {nameError}
                </p>
              )}
            </div>

            <fieldset className="space-y-2" disabled={busy}>
              <legend className="mb-1 text-sm font-medium">Quais cartas adicionar</legend>
              <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm">
                <input
                  type="radio"
                  name="create-deck-mode"
                  checked={effectiveMode === 'all'}
                  onChange={() => setMode('all')}
                  className="accent-[var(--color-accent)]"
                />
                Todas as cartas ({plans.all.rows.length})
              </label>
              <label
                className={`flex min-h-11 items-center gap-3 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm ${
                  ownedDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                }`}
              >
                <input
                  type="radio"
                  name="create-deck-mode"
                  checked={effectiveMode === 'owned'}
                  disabled={ownedDisabled}
                  onChange={() => setMode('owned')}
                  className="accent-[var(--color-accent)]"
                />
                <span>
                  Só as que eu tenho ({plans.owned.rows.length} de {plans.all.rows.length})
                  {!collectionOk && (
                    <span className="block text-xs text-[var(--color-muted)]">Coleção indisponível</span>
                  )}
                  {collectionOk && plans.owned.rows.length === 0 && (
                    <span className="block text-xs text-[var(--color-muted)]">
                      Você ainda não tem cartas deste deck
                    </span>
                  )}
                </span>
              </label>
            </fieldset>

            <p aria-live="polite" className="text-sm text-[var(--color-muted)]">
              Main {zoneTotals.main} · Extra {zoneTotals.extra} · Side {zoneTotals.side}
              {plan.cappedCopies > 0 && ` · ${plan.cappedCopies} cópia(s) acima de 3 não entram`}
            </p>

            {noteSkipped > 0 && (
              <div className="rounded-lg border border-[var(--color-border)] px-3 text-sm">
                <button
                  type="button"
                  aria-expanded={showUnresolved}
                  aria-controls="create-deck-unresolved"
                  onClick={() => setShowUnresolved((v) => !v)}
                  className="flex min-h-11 w-full items-center justify-between gap-2 text-left text-[var(--color-muted)]"
                >
                  <span>
                    {noteSkipped} carta{noteSkipped === 1 ? '' : 's'} não catalogada
                    {noteSkipped === 1 ? '' : 's'} não {noteSkipped === 1 ? 'será adicionada' : 'serão adicionadas'}
                  </span>
                  <ChevronRight
                    aria-hidden="true"
                    className={`h-4 w-4 transition-transform motion-reduce:transition-none ${showUnresolved ? 'rotate-90' : ''}`}
                  />
                </button>
                {showUnresolved && (
                  <ul id="create-deck-unresolved" className="pb-2 text-[var(--color-muted)]">
                    {unresolvedCards.map((card) => (
                      <li key={card.id}>
                        {card.quantity}× {card.cardName}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {busy && (
              <div>
                <p className="mb-1 text-sm" aria-live="polite">
                  Adicionando cartas {progress.done}/{progress.total}
                </p>
                <div
                  role="progressbar"
                  aria-label="Adicionando cartas ao deck"
                  aria-valuemin={0}
                  aria-valuemax={progress.total}
                  aria-valuenow={progress.done}
                  className="h-2 overflow-hidden rounded-full bg-[var(--color-surface-2)]"
                >
                  <div className="h-full bg-[var(--color-accent)]" style={{ width: `${pct}%` }} />
                </div>
              </div>
            )}

            {phase === 'error' && (
              <div role="alert" className="rounded-lg border border-[var(--color-danger)]/40 bg-[var(--color-danger)]/10 px-3 py-2 text-sm text-red-300">
                Não foi possível criar o deck. {error}
              </div>
            )}

            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                className="min-h-11 rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium hover:bg-[var(--color-surface-2)] disabled:opacity-40"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={busy || plan.rows.length === 0}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--color-accent-hover)] disabled:opacity-60"
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
                {phase === 'error' ? 'Tentar novamente' : busy ? 'Criando...' : 'Criar deck'}
              </button>
            </div>
          </form>
        )}

        {(phase === 'success' || phase === 'partial') && result && (
          <div className="space-y-4">
            {phase === 'success' ? (
              <p role="status" className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-5 w-5 text-green-400" aria-hidden="true" />
                {result.inserted} carta{result.inserted === 1 ? '' : 's'} adicionada
                {result.inserted === 1 ? '' : 's'} a &ldquo;{result.deckName}&rdquo;.
              </p>
            ) : (
              <p role="alert" className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-sm text-amber-200">
                O deck &ldquo;{result.deckName}&rdquo; foi criado, mas só {result.inserted} de{' '}
                {result.plannedRows} cartas entraram (falha no lote {result.failedAtChunk}). O deck foi
                mantido; complete as cartas faltantes no editor.
              </p>
            )}
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="min-h-11 rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium hover:bg-[var(--color-surface-2)]"
              >
                Continuar aqui
              </button>
              <Link
                ref={openDeckRef}
                to={`/decks/${result.deckId}`}
                className="inline-flex min-h-11 items-center rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--color-accent-hover)]"
              >
                Abrir deck
              </Link>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
