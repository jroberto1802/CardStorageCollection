import { Link } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import type { CollectionItemWithCard, GridCardSize } from '@/types'
import { gridCardSizeClass } from '@/hooks/useGridCardSize'
import { getPrimaryImage } from '@/utils/cardHelpers'

interface CollectionGridViewProps {
  items: CollectionItemWithCard[]
  onRemove: (id: string) => void
  size?: GridCardSize
}

export function CollectionGridView({
  items,
  onRemove,
  size = 'md',
}: CollectionGridViewProps) {
  return (
    <div className={gridCardSizeClass(size)}>
      {items.map((item) => {
        const images = item.card ? getPrimaryImage(item.card) : { small: null, full: null }
        const name = item.card?.name ?? `Carta #${item.card_id}`
        const displayLang = item.card?.language ?? item.language

        return (
          <div
            key={item.id}
            className="group relative flex flex-col overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] transition hover:border-[var(--color-accent)]"
          >
            <Link
              to={`/cards/${item.card_id}?set=${encodeURIComponent(item.set_code)}&lang=${displayLang}`}
              className="flex flex-1 flex-col"
            >
              <div className="relative aspect-[59/86] overflow-hidden bg-[var(--color-surface-2)]">
                {images.small || images.full ? (
                  <img
                    src={images.small ?? images.full ?? undefined}
                    alt={name}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-[var(--color-muted)]">
                    Sem imagem
                  </div>
                )}
                {item.quantity > 1 && (
                  <span className="absolute top-2 right-2 rounded-md bg-black/70 px-1.5 py-0.5 text-xs font-semibold">
                    ×{item.quantity}
                  </span>
                )}
                {displayLang === 'en' && (
                  <span className="absolute bottom-2 left-2 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-white">
                    EN
                  </span>
                )}
              </div>
              <div className="space-y-1 p-3">
                <h3 className="line-clamp-2 text-sm font-semibold leading-snug">{name}</h3>
                <p className="font-mono text-xs font-bold text-[var(--color-accent)]">
                  {item.set_code}
                </p>
                {item.set_rarity && (
                  <p className="text-xs text-[var(--color-muted)]">{item.set_rarity}</p>
                )}
              </div>
            </Link>
            <button
              type="button"
              title="Remover"
              onClick={() => onRemove(item.id)}
              className="absolute top-2 left-2 rounded-lg bg-black/50 p-1.5 text-white opacity-0 transition group-hover:opacity-100 hover:bg-[var(--color-danger)]"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
