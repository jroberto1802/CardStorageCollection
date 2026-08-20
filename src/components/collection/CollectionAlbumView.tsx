import { Link } from 'react-router-dom'
import type { AlbumSlot } from '@/types'
import { buildCardDetailPath } from '@/utils/cardHelpers'

interface CollectionAlbumViewProps {
  slots: AlbumSlot[]
  setName: string
  loading: boolean
}

export function CollectionAlbumView({
  slots,
  setName,
  loading,
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
        {slots.map((slot) => (
          <Link
            key={`${slot.cardId}-${slot.setCode}-${slot.setRarity}`}
            to={buildCardDetailPath(slot.cardId, {
              lang: slot.language,
              setCode: slot.setCode,
              setRarity: slot.setRarity,
              setName: slot.setName,
            })}
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
            <div className="space-y-0.5 px-1.5 py-1">
              <p
                className="truncate font-mono text-[10px] font-semibold text-[var(--color-accent)]"
                title={`Álbum: ${slot.setCode}`}
              >
                {slot.setCode}
              </p>
              {slot.ownedSetCode && (
                <p
                  className="truncate font-mono text-[10px] font-semibold text-[var(--color-danger)]"
                  title={`Você possui: ${slot.ownedSetCode}`}
                >
                  {slot.ownedSetCode}
                </p>
              )}
            </div>
            {!slot.owned && (
              <div className="pointer-events-none absolute inset-0 bg-black/25" />
            )}
          </Link>
        ))}
      </div>
    </div>
  )
}
