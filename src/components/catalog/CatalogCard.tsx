import { Link } from 'react-router-dom'
import type { CardImpression } from '@/types'
import { buildCardDetailPath, languageLabel } from '@/utils/cardHelpers'

interface CatalogCardProps {
  impression: CardImpression
}

export function CatalogCard({ impression }: CatalogCardProps) {
  const detailUrl = buildCardDetailPath(impression.cardId, {
    lang: impression.language,
    setCode: impression.setCode,
    setRarity: impression.setRarity,
    setName: impression.setName,
  })

  return (
    <Link
      to={detailUrl}
      className="group flex flex-col overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] transition hover:border-[var(--color-accent)] hover:shadow-lg hover:shadow-blue-950/40"
    >
      <div className="relative aspect-[59/86] overflow-hidden bg-[var(--color-surface-2)]">
        {impression.imageUrlSmall || impression.imageUrl ? (
          <img
            src={impression.imageUrlSmall ?? impression.imageUrl ?? undefined}
            alt={impression.name}
            loading="lazy"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-[var(--color-muted)]">
            Sem imagem
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug">{impression.name}</h3>

        <p className="text-xs text-[var(--color-muted)]">
          {impression.versionCount > 0 ? (
            <>
              {impression.versionCount === 1
                ? '1 versão'
                : `${impression.versionCount} versões`}
              {impression.setCode !== '—' && (
                <span className="font-mono text-[var(--color-accent)]">
                  {' '}
                  · {impression.setCode}
                </span>
              )}
            </>
          ) : (
            'Sem set'
          )}
        </p>

        <p className="text-xs text-[var(--color-muted)]">
          {[
            languageLabel(impression.language) === 'Português' ? 'PT' : 'EN',
            impression.region !== 'Unknown' ? impression.region : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>

        {impression.type && (
          <p className="mt-auto line-clamp-1 text-xs text-[var(--color-muted)]">
            {impression.type}
          </p>
        )}
      </div>
    </Link>
  )
}
