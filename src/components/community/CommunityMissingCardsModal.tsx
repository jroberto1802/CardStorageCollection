import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ExternalLink, Loader2, RefreshCw, X } from 'lucide-react'
import {
  fetchCommunityMissingCardRanking,
} from '@/services/syncedDeckService'
import type { AppLanguage, CommunityMissingCardRank } from '@/types'

interface CommunityMissingCardsModalProps {
  open: boolean
  language: AppLanguage
  onClose: () => void
}

export function CommunityMissingCardsModal({
  open,
  language,
  onClose,
}: CommunityMissingCardsModalProps) {
  const [items, setItems] = useState<CommunityMissingCardRank[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadedOnce, setLoadedOnce] = useState(false)

  const load = useCallback(
    async (refresh = false) => {
      setLoading(true)
      setError(null)
      try {
        const result = await fetchCommunityMissingCardRanking(language, {
          limit: 100,
          refresh,
        })
        setItems(result)
        setLoadedOnce(true)
      } catch (err) {
        setItems([])
        setError(
          err instanceof Error ? err.message : 'Falha ao carregar ranking',
        )
      } finally {
        setLoading(false)
      }
    },
    [language],
  )

  useEffect(() => {
    if (!open) return

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', onKeyDown)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    void load(false)
  }, [open, load])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Fechar"
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="community-missing-title"
        className="relative z-10 flex max-h-[85vh] w-full max-w-lg flex-col rounded-t-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-[var(--color-border)] px-4 py-3">
          <div className="min-w-0">
            <h2
              id="community-missing-title"
              className="text-base font-semibold text-[var(--color-text)]"
            >
              Staples que faltam
            </h2>
            <p className="mt-0.5 text-xs text-[var(--color-muted)]">
              Top 100 cartas mais usadas nos decks da comunidade que você não
              possui. Ordenado por quantidade de decks.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              disabled={loading}
              onClick={() => void load(true)}
              title="Recalcular (ignora cache de 15 min)"
              className="rounded-lg p-1.5 text-[var(--color-muted)] transition hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)] disabled:opacity-50"
            >
              <RefreshCw
                className={['h-4 w-4', loading ? 'animate-spin' : ''].join(' ')}
              />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-[var(--color-muted)] transition hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {loading && !loadedOnce && (
            <p className="inline-flex items-center gap-2 px-3 py-10 text-sm text-[var(--color-muted)]">
              <Loader2 className="h-4 w-4 animate-spin" />
              Calculando ranking...
            </p>
          )}

          {error && (
            <p className="mx-2 my-3 rounded-lg border border-[var(--color-danger)]/40 bg-[var(--color-danger)]/10 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          )}

          {!loading && !error && items.length === 0 && loadedOnce && (
            <p className="px-3 py-10 text-center text-sm text-[var(--color-muted)]">
              Nenhuma carta faltando — você já possui todas as cartas resolvidas
              usadas nos decks sincronizados, ou a comunidade ainda está vazia.
            </p>
          )}

          {items.length > 0 && (
            <ul className="divide-y divide-[var(--color-border)]/70">
              {items.map((item, index) => (
                <li key={item.cardId} className="flex items-center gap-3 px-2 py-2.5">
                  <span className="w-6 shrink-0 text-center text-xs font-semibold tabular-nums text-[var(--color-muted)]">
                    {index + 1}
                  </span>
                  {item.imageUrlSmall || item.imageUrl ? (
                    <img
                      src={item.imageUrlSmall ?? item.imageUrl ?? undefined}
                      alt=""
                      className="h-14 w-10 shrink-0 rounded object-cover"
                    />
                  ) : (
                    <div className="flex h-14 w-10 shrink-0 items-center justify-center rounded bg-[var(--color-surface-2)] text-[10px] text-[var(--color-muted)]">
                      —
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[var(--color-text)]">
                      {item.name}
                    </p>
                    <p className="mt-0.5 text-[11px] text-[var(--color-muted)]">
                      Em{' '}
                      <span className="font-semibold text-[var(--color-text)]">
                        {item.deckCount.toLocaleString('pt-BR')}
                      </span>{' '}
                      {item.deckCount === 1 ? 'deck' : 'decks'}
                      {' · '}
                      {item.totalCopies.toLocaleString('pt-BR')} cópias no meta
                    </p>
                  </div>
                  <Link
                    to={`/cards/${item.cardId}?lang=${item.language}`}
                    onClick={onClose}
                    title="Ver detalhes"
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-2.5 py-2 text-xs font-medium text-[var(--color-text)] transition hover:border-[var(--color-accent)] hover:bg-[var(--color-accent)]/10 hover:text-[var(--color-accent)]"
                  >
                    Detalhar
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
