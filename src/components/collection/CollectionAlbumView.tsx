import { Link } from 'react-router-dom'
import { Loader2, Minus, Plus } from 'lucide-react'
import type { AlbumSlot } from '@/types'
import { buildCardDetailPath } from '@/utils/cardHelpers'

export function albumSlotKey(slot: AlbumSlot): string {
  return `${slot.cardId}-${slot.setCode}-${slot.setRarity}`
}

interface CollectionAlbumViewProps {
  slots: AlbumSlot[]
  setName: string
  loading: boolean
  busySlotKey: string | null
  onAdjustQuantity: (slot: AlbumSlot, delta: 1 | -1) => void
}

export function CollectionAlbumView({
  slots,
  setName,
  loading,
  busySlotKey,
  onAdjustQuantity,
}: CollectionAlbumViewProps) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-16 text-center text-sm text-[var(--color-muted)]">
        Montando álbum...
      </div>
    )
  }

  if (!setName) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-16 text-center">
        <p className="text-lg font-medium">Escolha uma coleção</p>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          Selecione um set acima para ver o álbum de figurinhas — cartas que você
          possui aparecem coloridas; as que faltam ficam em preto e branco. Se
          tiver outra versão da carta, ela fica colorida com o set code próprio em
          vermelho ao lado do set code do álbum (azul).
        </p>
      </div>
    )
  }

  if (slots.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-16 text-center">
        <p className="text-lg font-medium">Nenhuma carta encontrada neste set</p>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          Confirme se o catálogo está sincronizado neste idioma.
        </p>
      </div>
    )
  }

  const owned = slots.filter((slot) => slot.owned).length
  const total = slots.length
  const pct = Math.round((owned / total) * 100)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
        <div>
          <p className="text-xs tracking-wide text-[var(--color-muted)] uppercase">
            Álbum
          </p>
          <h3 className="text-base font-semibold">{setName}</h3>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-[var(--color-text)]">
            {owned}/{total} · {pct}%
          </p>
          <div className="mt-1 h-1.5 w-40 overflow-hidden rounded-full bg-[var(--color-surface-2)]">
            <div
              className="h-full rounded-full bg-[var(--color-accent)] transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8">
        {slots.map((slot) => {
          const key = albumSlotKey(slot)
          const busy = busySlotKey === key
          const canDecrement =
            slot.ownedInAlbumSet && slot.quantity > 0 && Boolean(slot.collectionItemId)

          return (
            <article
              key={key}
              title={
                slot.ownedSetCode
                  ? `${slot.setCode} — ${slot.name} (você possui ${slot.ownedSetCode})`
                  : `${slot.setCode} — ${slot.name}`
              }
              className={[
                'group relative overflow-hidden rounded-xl border bg-[var(--color-surface)] transition',
                slot.owned
                  ? slot.ownedInAlbumSet
                    ? 'border-[var(--color-accent)]/50 hover:border-[var(--color-accent)]'
                    : 'border-[var(--color-danger)]/50 hover:border-[var(--color-danger)]'
                  : 'border-[var(--color-border)] opacity-45',
              ].join(' ')}
            >
              <Link
                to={buildCardDetailPath(slot.cardId, {
                  lang: slot.language,
                  setCode: slot.setCode,
                  setRarity: slot.setRarity,
                  setName: slot.setName,
                })}
                className="relative block"
              >
                <div className="aspect-[59/86] overflow-hidden bg-[var(--color-surface-2)]">
                  {slot.imageUrlSmall || slot.imageUrl ? (
                    <img
                      src={slot.imageUrlSmall ?? slot.imageUrl ?? undefined}
                      alt={slot.name}
                      loading="lazy"
                      className={[
                        'h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]',
                        slot.owned ? '' : 'grayscale',
                      ].join(' ')}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center p-1 text-center text-[10px] text-[var(--color-muted)]">
                      {slot.setCode}
                    </div>
                  )}
                </div>
                {!slot.owned && (
                  <div className="pointer-events-none absolute inset-0 bg-black/25" />
                )}
              </Link>

              <div className="flex items-center justify-between gap-1 px-1.5 py-1">
                <p
                  className="min-w-0 truncate font-mono text-[10px] font-semibold text-[var(--color-accent)]"
                  title={`Álbum: ${slot.setCode}`}
                >
                  {slot.setCode}
                </p>
                <div className="flex shrink-0 items-center gap-0.5">
                  <button
                    type="button"
                    title={`Remover 1 · ${slot.setCode}`}
                    disabled={busy || !canDecrement}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      onAdjustQuantity(slot, -1)
                    }}
                    className="inline-flex h-5 w-5 items-center justify-center rounded border border-[var(--color-border)] text-[var(--color-muted)] transition hover:border-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {busy ? (
                      <Loader2 className="h-2.5 w-2.5 animate-spin" />
                    ) : (
                      <Minus className="h-2.5 w-2.5" />
                    )}
                  </button>
                  {slot.ownedInAlbumSet && slot.quantity > 0 ? (
                    <span className="min-w-[1ch] text-center text-[9px] font-semibold tabular-nums text-[var(--color-text)]">
                      {slot.quantity}
                    </span>
                  ) : null}
                  <button
                    type="button"
                    title={`Adicionar 1 · ${slot.setCode}`}
                    disabled={busy}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      onAdjustQuantity(slot, 1)
                    }}
                    className="inline-flex h-5 w-5 items-center justify-center rounded border border-[var(--color-border)] text-[var(--color-muted)] transition hover:border-[var(--color-accent)] hover:bg-[var(--color-accent)]/10 hover:text-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {busy ? (
                      <Loader2 className="h-2.5 w-2.5 animate-spin" />
                    ) : (
                      <Plus className="h-2.5 w-2.5" />
                    )}
                  </button>
                </div>
              </div>

              {slot.ownedSetCode && (
                <p
                  className="truncate px-1.5 pb-1 font-mono text-[10px] font-semibold text-[var(--color-danger)]"
                  title={`Você possui: ${slot.ownedSetCode}`}
                >
                  {slot.ownedSetCode}
                </p>
              )}
            </article>
          )
        })}
      </div>
    </div>
  )
}
