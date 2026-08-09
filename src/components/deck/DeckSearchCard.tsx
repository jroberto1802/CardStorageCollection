import type { DragEvent } from 'react'
import type { CardImpression, DeckDragPayload } from '@/types'
import { DECK_DRAG_MIME } from '@/types'
import { isExtraDeckCard } from '@/utils/cardHelpers'

interface DeckSearchCardProps {
  item: CardImpression
  ownedCount?: number
  copiesInDeck: number
  /** Quando true, cartas não possuídas ficam com opacidade baixa */
  dimUnowned?: boolean
  onAdd: (payload: DeckDragPayload) => void
  onPreview?: (item: CardImpression) => void
}

export function DeckSearchCard({
  item,
  ownedCount = 0,
  copiesInDeck,
  dimUnowned = false,
  onAdd,
  onPreview,
}: DeckSearchCardProps) {
  const payload: DeckDragPayload = {
    cardId: item.cardId,
    language: item.language,
    name: item.name,
    type: item.type,
    frameType: item.frameType,
    race: item.race,
    imageUrl: item.imageUrl,
    imageUrlSmall: item.imageUrlSmall,
  }

  const atLimit = copiesInDeck >= 3
  const extra = isExtraDeckCard(item.type, item.frameType)
  const owned = ownedCount > 0

  function handleDragStart(event: DragEvent) {
    if (atLimit) {
      event.preventDefault()
      return
    }
    event.dataTransfer.setData(DECK_DRAG_MIME, JSON.stringify(payload))
    event.dataTransfer.setData('text/plain', JSON.stringify(payload))
    event.dataTransfer.effectAllowed = 'copy'
  }

  return (
    <button
      type="button"
      draggable={!atLimit}
      onDragStart={handleDragStart}
      onClick={() => onPreview?.(item)}
      onDoubleClick={(event) => {
        event.preventDefault()
        if (!atLimit) onAdd(payload)
      }}
      title={
        atLimit
          ? 'Já há 3 cópias no deck'
          : `${item.name} — clique para detalhe · arraste ou dê duplo clique para adicionar (${extra ? 'Extra' : 'Principal'})${
              owned ? '' : ' · você não possui'
            }`
      }
      className={[
        'group relative aspect-[59/86] overflow-hidden rounded-lg border bg-[var(--color-surface)] text-left transition',
        atLimit
          ? 'cursor-not-allowed border-[var(--color-border)] opacity-40'
          : 'cursor-grab border-[var(--color-border)] hover:border-[var(--color-accent)] active:cursor-grabbing',
        dimUnowned && !owned && !atLimit ? 'opacity-25' : '',
      ].join(' ')}
    >
      {item.imageUrlSmall || item.imageUrl ? (
        <img
          src={item.imageUrlSmall ?? item.imageUrl ?? undefined}
          alt={item.name}
          className="h-full w-full object-cover"
          draggable={false}
        />
      ) : (
        <div className="flex h-full items-center justify-center p-1 text-center text-[10px] text-[var(--color-muted)]">
          {item.name}
        </div>
      )}

      {extra && (
        <span className="absolute top-1 left-1 rounded bg-purple-600/90 px-1 py-0.5 text-[9px] font-bold text-white">
          EX
        </span>
      )}

      {ownedCount > 0 && (
        <span className="absolute right-1 bottom-1 rounded bg-black/75 px-1.5 py-0.5 text-[10px] font-semibold text-white">
          {ownedCount}
        </span>
      )}

      {copiesInDeck > 0 && (
        <span className="absolute top-1 right-1 rounded bg-[var(--color-accent)] px-1.5 py-0.5 text-[10px] font-bold text-white">
          {copiesInDeck}/3
        </span>
      )}
    </button>
  )
}
