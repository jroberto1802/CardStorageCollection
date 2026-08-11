import { Link } from 'react-router-dom'
import { BookmarkPlus } from 'lucide-react'
import type { CardImpression } from '@/types'
import { languageLabel } from '@/utils/cardHelpers'

interface CatalogListViewProps {
  items: CardImpression[]
  onAddToCollection: (item: CardImpression) => void
}

export function CatalogListView({ items, onAddToCollection }: CatalogListViewProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
      <ul className="divide-y divide-[var(--color-border)]">
        {items.map((item) => {
          const params = new URLSearchParams({ lang: item.language })
          if (item.setCode && item.setCode !== '—') {
            params.set('set', item.setCode)
          }
          const detailUrl = `/cards/${item.cardId}?${params.toString()}`

          return (
            <li
              key={item.key}
              className="flex items-center gap-3 px-3 py-2.5 transition hover:bg-[var(--color-surface-2)]/60"
            >
              <Link to={detailUrl} className="flex min-w-0 flex-1 items-center gap-3">
                {item.imageUrlSmall || item.imageUrl ? (
                  <img
                    src={item.imageUrlSmall ?? item.imageUrl ?? undefined}
                    alt={item.name}
                    loading="lazy"
                    className="h-16 w-11 shrink-0 rounded object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-11 shrink-0 items-center justify-center rounded bg-[var(--color-surface-2)] text-[10px] text-[var(--color-muted)]">
                    —
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{item.name}</p>
                  <p className="mt-0.5 text-xs text-[var(--color-muted)]">
                    {item.versionCount > 0 ? (
                      <>
                        {item.versionCount === 1
                          ? '1 versão'
                          : `${item.versionCount} versões`}
                        {item.setCode !== '—' && (
                          <span className="font-mono text-[var(--color-accent)]">
                            {' '}
                            · {item.setCode}
                          </span>
                        )}
                      </>
                    ) : (
                      'Sem set'
                    )}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-[var(--color-muted)]">
                    {[
                      item.archetype,
                      item.type,
                      languageLabel(item.language) === 'Português' ? 'PT' : 'EN',
                      item.region !== 'Unknown' ? item.region : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </div>
              </Link>

              <button
                type="button"
                title="Adicionar à coleção"
                onClick={() => onAddToCollection(item)}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-2.5 py-2 text-xs text-[var(--color-muted)] transition hover:border-[var(--color-accent)] hover:bg-[var(--color-accent)]/10 hover:text-[var(--color-accent)]"
              >
                <BookmarkPlus className="h-4 w-4" />
                <span className="hidden sm:inline">Coleção</span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
