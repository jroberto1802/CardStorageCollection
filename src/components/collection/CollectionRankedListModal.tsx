import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ExternalLink, X } from 'lucide-react'
import type { CollectionRankedItem } from '@/utils/cardHelpers'
import {
  buildCardDetailPath,
  convertUsdToBrl,
  formatBrl,
  formatUsd,
} from '@/utils/cardHelpers'

interface CollectionRankedListModalProps {
  open: boolean
  title: string
  subtitle?: string
  items: CollectionRankedItem[]
  usdBrlRate: number | null
  emptyMessage: string
  mode: 'valuable' | 'extras'
  onClose: () => void
}

export function CollectionRankedListModal({
  open,
  title,
  subtitle,
  items,
  usdBrlRate,
  emptyMessage,
  mode,
  onClose,
}: CollectionRankedListModalProps) {
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
        aria-labelledby="ranked-list-title"
        className="relative z-10 flex max-h-[85vh] w-full max-w-lg flex-col rounded-t-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-[var(--color-border)] px-4 py-3">
          <div className="min-w-0">
            <h2
              id="ranked-list-title"
              className="text-base font-semibold text-[var(--color-text)]"
            >
              {title}
            </h2>
            {subtitle ? (
              <p className="mt-0.5 text-xs text-[var(--color-muted)]">{subtitle}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[var(--color-muted)] transition hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {items.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-[var(--color-muted)]">
              {emptyMessage}
            </p>
          ) : (
            <ul className="divide-y divide-[var(--color-border)]/70">
              {items.map((item, index) => {
                const totalBrl =
                  item.totalUsd != null && usdBrlRate != null
                    ? convertUsdToBrl(item.totalUsd, usdBrlRate)
                    : null
                const detailPath = buildCardDetailPath(item.cardId, {
                  lang: item.language,
                  setCode: item.setCode,
                  setRarity: item.setRarity,
                  setName: item.setName,
                })

                return (
                  <li key={item.id} className="flex items-center gap-3 px-2 py-2.5">
                    <span className="w-6 shrink-0 text-center text-xs font-semibold tabular-nums text-[var(--color-muted)]">
                      {index + 1}
                    </span>
                    {item.imageUrlSmall ? (
                      <img
                        src={item.imageUrlSmall}
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
                      <p className="truncate font-mono text-[11px] text-[var(--color-accent)]">
                        {item.setCode}
                        {item.setRarity ? ` · ${item.setRarity}` : ''}
                      </p>
                      <p className="mt-0.5 text-[11px] text-[var(--color-muted)]">
                        {mode === 'extras' ? (
                          <>
                            ×{item.quantity} · {item.extraCopies}{' '}
                            {item.extraCopies === 1 ? 'extra' : 'extras'}
                          </>
                        ) : (
                          <>×{item.quantity}</>
                        )}
                        {totalBrl != null
                          ? ` · ${formatBrl(totalBrl)}`
                          : item.totalUsd != null
                            ? ` · ${formatUsd(item.totalUsd)}`
                            : ''}
                      </p>
                    </div>
                    <Link
                      to={detailPath}
                      onClick={onClose}
                      title="Ver detalhes"
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-2.5 py-2 text-xs font-medium text-[var(--color-text)] transition hover:border-[var(--color-accent)] hover:bg-[var(--color-accent)]/10 hover:text-[var(--color-accent)]"
                    >
                      Detalhar
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
