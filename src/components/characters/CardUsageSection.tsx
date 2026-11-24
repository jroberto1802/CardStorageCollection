import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, CircleDashed, X } from 'lucide-react'
import { CharacterAvatar } from '@/components/characters/CharacterAvatar'
import { getCardUsageInDecks } from '@/services/characterService'
import {
  STATUS_LABEL,
  USAGE_PREVIEW_LIMIT,
  usageDeckStatus,
  type CardUsage,
  type OwnershipStatus,
} from '@/utils/characterView'

const STATUS_STYLE: Record<OwnershipStatus, string> = {
  complete: 'text-green-300',
  partial: 'text-amber-300',
  missing: 'text-red-300',
}

const ZONE_SHORT = { main: 'Main', extra: 'Extra', side: 'Side' } as const

function StatusIcon({ status }: { status: OwnershipStatus }) {
  const cls = 'h-3.5 w-3.5 shrink-0'
  if (status === 'complete') return <Check className={cls} aria-hidden="true" />
  if (status === 'partial') return <CircleDashed className={cls} aria-hidden="true" />
  return <X className={cls} aria-hidden="true" />
}

type LoadState = 'idle' | 'loading' | 'ready' | 'error'

interface CardUsageSectionProps {
  cardId: number
  /** Cópias que o usuário tem desta carta (todas as impressões). null = posse indisponível (sem indicador). */
  ownedCopies: number | null
}

/**
 * "Usada por personagens": carrega só quando a seção entra na tela (IntersectionObserver).
 * Oculta se a carta não é usada em nenhum deck; erro discreto com "Tentar novamente".
 */
export function CardUsageSection({ cardId, ownedCopies }: CardUsageSectionProps) {
  const ref = useRef<HTMLElement | null>(null)
  const listId = useId()
  const [visible, setVisible] = useState(false)
  const [state, setState] = useState<LoadState>('idle')
  const [usage, setUsage] = useState<CardUsage | null>(null)
  const [expanded, setExpanded] = useState(false)
  const requestRef = useRef(0)

  useEffect(() => {
    if (visible) return
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') {
      setVisible(true)
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin: '200px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [visible])

  const load = useCallback(() => {
    const request = ++requestRef.current
    setState('loading')
    getCardUsageInDecks(cardId)
      .then((result) => {
        if (requestRef.current !== request) return
        setUsage(result)
        setState('ready')
      })
      .catch(() => {
        if (requestRef.current !== request) return
        setState('error')
      })
  }, [cardId])

  useEffect(() => {
    const counter = requestRef
    if (visible) load()
    return () => {
      counter.current++
    }
  }, [visible, load])

  if (state === 'ready' && usage && usage.characters.length === 0) return null

  const characters = usage?.characters ?? []
  const shown = expanded ? characters : characters.slice(0, USAGE_PREVIEW_LIMIT)
  const hasMore = characters.length > USAGE_PREVIEW_LIMIT

  return (
    <section
      ref={ref}
      aria-labelledby={`${listId}-title`}
      className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5"
    >
      <h2 id={`${listId}-title`} className="mb-1 text-sm font-semibold tracking-wide uppercase">
        Usada por personagens
      </h2>

      {(state === 'idle' || state === 'loading') && (
        <div role="status" aria-live="polite" className="mt-3 space-y-2">
          <span className="sr-only">Carregando personagens que usam esta carta…</span>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              aria-hidden="true"
              className="h-12 animate-pulse rounded-xl bg-[var(--color-surface-2)] motion-reduce:animate-none"
            />
          ))}
        </div>
      )}

      {state === 'error' && (
        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-[var(--color-muted)]">
          <p>Não foi possível carregar os personagens agora.</p>
          <button
            type="button"
            onClick={load}
            className="min-h-11 rounded-lg border border-[var(--color-border)] px-3 text-sm text-[var(--color-text)] hover:bg-[var(--color-surface-2)]"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {state === 'ready' && usage && (
        <>
          <p className="mb-3 text-xs text-[var(--color-muted)]">{usage.summary}</p>
          <ul id={listId} className="space-y-2">
            {shown.map((character) => (
              <li
                key={character.slug}
                className="flex items-start gap-3 rounded-xl bg-[var(--color-surface-2)] p-3"
              >
                <CharacterAvatar src={character.imageSmall} size={40} alt="" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{character.name}</p>
                  {(character.seriesName ?? character.series) && (
                    <p className="truncate text-xs text-[var(--color-muted)]">{character.seriesName ?? character.series}</p>
                  )}
                  <ul className="mt-1 space-y-1">
                    {character.decks.map((deck) => {
                      const status = ownedCopies == null ? null : usageDeckStatus(deck, ownedCopies)
                      const zones = deck.zones.map((z) => `${z.quantity}x ${ZONE_SHORT[z.zone]}`).join(', ')
                      return (
                        <li key={deck.deckId} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                          <Link
                            to={`/characters/${character.slug}/decks/${deck.deckSlug}`}
                            aria-label={`Ver o deck ${deck.deckName} de ${character.name}`}
                            className="inline-flex min-h-11 items-center text-[var(--color-accent)] underline-offset-2 hover:underline"
                          >
                            {deck.label ? `Deck ${deck.label}: ` : ''}
                            {deck.deckName}
                          </Link>
                          <span className="text-[var(--color-muted)]">{zones}</span>
                          {status && (
                            <span className={`inline-flex items-center gap-1 font-medium ${STATUS_STYLE[status]}`}>
                              <StatusIcon status={status} />
                              {STATUS_LABEL[status]}
                            </span>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                </div>
              </li>
            ))}
          </ul>
          {hasMore && (
            <button
              type="button"
              aria-expanded={expanded}
              aria-controls={listId}
              onClick={() => setExpanded((value) => !value)}
              className="mt-3 min-h-11 rounded-lg border border-[var(--color-border)] px-3 text-sm hover:bg-[var(--color-surface-2)]"
            >
              {expanded ? 'Ver menos' : `Ver todos (${characters.length})`}
            </button>
          )}
        </>
      )}
    </section>
  )
}
