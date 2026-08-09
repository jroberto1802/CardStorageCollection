import type { DragEvent } from 'react'
import { X } from 'lucide-react'
import type { DeckCardSlot, DeckDragPayload, DeckZone } from '@/types'
import { DECK_DRAG_MIME } from '@/types'
import { sortDeckSlotsByType } from '@/utils/deckHelpers'

interface DeckZonePanelProps {
  title: string
  zone: DeckZone
  slots: DeckCardSlot[]
  ownedByCard?: Map<number, number>
  onDropPayload: (payload: DeckDragPayload) => void
  onRemove: (slotId: string) => void
  onCardClick?: (slot: DeckCardSlot) => void
  columns?: number
}

export function parseDeckDragPayload(event: DragEvent): DeckDragPayload | null {
  const raw =
    event.dataTransfer.getData(DECK_DRAG_MIME) ||
    event.dataTransfer.getData('text/plain')
  if (!raw) return null
  try {
    return JSON.parse(raw) as DeckDragPayload
  } catch {
    return null
  }
}

export function DeckZonePanel({
  title,
  zone,
  slots,
  ownedByCard,
  onDropPayload,
  onRemove,
  onCardClick,
  columns = 10,
}: DeckZonePanelProps) {
  const sorted = sortDeckSlotsByType(slots, zone)

  function handleDragOver(event: DragEvent) {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault()
    const payload = parseDeckDragPayload(event)
    if (payload) onDropPayload(payload)
  }

  return (
    <section
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-3"
    >
      <div className="mb-2 flex items-center gap-2">
        <h3 className="text-sm font-semibold tracking-wide text-[var(--color-text)]">
          {title}
        </h3>
        <span className="rounded-md bg-[var(--color-accent)]/20 px-2 py-0.5 text-sm font-bold text-[var(--color-accent)]">
          {slots.length}
        </span>
      </div>

      <div
        className="grid min-h-[120px] gap-1.5"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        data-zone={zone}
      >
        {(() => {
          const usedOwned = new Map<number, number>()
          return sorted.map((slot) => {
            // Acende só até a qtd. possuída: 1 na coleção + 2 no deck → 1 acesa, 1 apagada
            const ownedQty = ownedByCard?.get(slot.card_id) ?? 0
            const used = usedOwned.get(slot.card_id) ?? 0
            const coveredByCollection = used < ownedQty
            usedOwned.set(slot.card_id, used + 1)

            return (
              <div
                key={slot.id}
                role={onCardClick ? 'button' : undefined}
                tabIndex={onCardClick ? 0 : undefined}
                onClick={() => onCardClick?.(slot)}
                onKeyDown={(event) => {
                  if (!onCardClick) return
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    onCardClick(slot)
                  }
                }}
                className={[
                  'group relative aspect-[59/86] overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] transition',
                  coveredByCollection ? '' : 'opacity-25',
                  onCardClick
                    ? 'cursor-pointer hover:border-[var(--color-accent)]'
                    : '',
                ].join(' ')}
                title={
                  coveredByCollection
                    ? slot.name
                    : ownedQty === 0
                      ? `${slot.name} (você não possui esta carta)`
                      : `${slot.name} (possui ${ownedQty}; cópia além do inventário)`
                }
              >
                {slot.imageUrlSmall || slot.imageUrl ? (
                  <img
                    src={slot.imageUrlSmall ?? slot.imageUrl ?? undefined}
                    alt={slot.name}
                    className="h-full w-full object-cover"
                    draggable={false}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center p-1 text-center text-[9px] text-[var(--color-muted)]">
                    {slot.name}
                  </div>
                )}
                <button
                  type="button"
                  title="Remover"
                  onClick={(event) => {
                    event.stopPropagation()
                    onRemove(slot.id)
                  }}
                  className="absolute top-0.5 right-0.5 rounded bg-black/70 p-0.5 text-white opacity-0 transition group-hover:opacity-100 hover:bg-[var(--color-danger)]"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )
          })
        })()}

        {sorted.length === 0 && (
          <div className="col-span-full flex items-center justify-center py-8 text-xs text-[var(--color-muted)]">
            Arraste cartas para cá
          </div>
        )}
      </div>
    </section>
  )
}
