import { Link } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import type { CollectionItemWithCard } from '@/types'
import { getPrimaryImage, languageLabel } from '@/utils/cardHelpers'

interface CollectionListViewProps {
  items: CollectionItemWithCard[]
  onRemove: (id: string) => void
}

export function CollectionListView({ items, onRemove }: CollectionListViewProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
      <ul className="divide-y divide-[var(--color-border)]">
        {items.map((item) => {
          const images = item.card ? getPrimaryImage(item.card) : { small: null, full: null }
          const name = item.card?.name ?? `Carta #${item.card_id}`
          const displayLang = item.card?.language ?? item.language

          return (
            <li
              key={item.id}
              className="flex items-center gap-3 px-3 py-2.5 transition hover:bg-[var(--color-surface-2)]/60"
            >
              <Link
                to={`/cards/${item.card_id}?set=${encodeURIComponent(item.set_code)}&lang=${displayLang}`}
                className="flex min-w-0 flex-1 items-center gap-3"
              >
                {images.small || images.full ? (
                  <img
                    src={images.small ?? images.full ?? undefined}
                    alt={name}
                    className="h-14 w-10 shrink-0 rounded object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-14 w-10 shrink-0 items-center justify-center rounded bg-[var(--color-surface-2)] text-[10px] text-[var(--color-muted)]">
                    —
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {name}
                    {displayLang === 'en' && (
                      <span className="ml-2 rounded bg-[var(--color-surface-2)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-muted)]">
                        EN
                      </span>
                    )}
                  </p>
                  <p className="font-mono text-xs text-[var(--color-accent)]">
                    {item.set_code}
                    {item.quantity > 1 && (
                      <span className="ml-2 font-sans text-[var(--color-muted)]">
                        ×{item.quantity}
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-[var(--color-muted)]">
                    {[
                      item.card?.archetype,
                      item.set_rarity,
                      item.set_name,
                      languageLabel(displayLang),
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </div>
              </Link>
              <button
                type="button"
                title="Remover da coleção"
                onClick={() => onRemove(item.id)}
                className="rounded-lg p-2 text-[var(--color-muted)] transition hover:bg-[var(--color-danger)]/15 hover:text-[var(--color-danger)]"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
