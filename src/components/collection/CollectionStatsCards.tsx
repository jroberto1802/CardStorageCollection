import { useMemo, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  Banknote,
  Copy,
  Gem,
  Layers,
  Sparkles,
  Trophy,
} from 'lucide-react'
import type { CollectionItemWithCard } from '@/types'
import { CollectionRankedListModal } from '@/components/collection/CollectionRankedListModal'
import type { CollectionStats } from '@/utils/cardHelpers'
import {
  convertUsdToBrl,
  formatBrl,
  formatUsd,
  listExtraCopyItems,
  listMostValuableItems,
} from '@/utils/cardHelpers'

interface CollectionStatsCardsProps {
  stats: CollectionStats
  items: CollectionItemWithCard[]
  usdBrlRate: number | null
  loading?: boolean
}

function StatTile({
  icon: Icon,
  label,
  value,
  hint,
  accent,
  onClick,
  clickHint,
}: {
  icon: LucideIcon
  label: string
  value: string
  hint?: string
  accent?: 'accent' | 'success' | 'muted'
  onClick?: () => void
  clickHint?: string
}) {
  const valueColor =
    accent === 'success'
      ? 'text-[var(--color-success)]'
      : accent === 'muted'
        ? 'text-[var(--color-muted)]'
        : 'text-[var(--color-accent)]'

  const content = (
    <>
      <div
        className="pointer-events-none absolute -top-8 -right-6 h-24 w-24 rounded-full opacity-30"
        style={{
          background:
            'radial-gradient(circle, color-mix(in srgb, var(--color-accent) 45%, transparent), transparent 70%)',
        }}
      />
      <div className="relative flex items-start gap-3">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-accent)]">
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1 text-left">
          <p className="text-[11px] font-medium tracking-wide text-[var(--color-muted)] uppercase">
            {label}
          </p>
          <p className={`mt-1 truncate text-xl font-semibold tabular-nums ${valueColor}`}>
            {value}
          </p>
          {hint ? (
            <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-[var(--color-muted)]">
              {hint}
            </p>
          ) : null}
          {onClick && clickHint ? (
            <p className="mt-1.5 text-[10px] font-medium text-[var(--color-accent)]">
              {clickHint}
            </p>
          ) : null}
        </div>
      </div>
    </>
  )

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-left transition hover:border-[var(--color-accent)] hover:bg-[var(--color-surface-2)]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
      >
        {content}
      </button>
    )
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      {content}
    </div>
  )
}

type ModalKind = 'valuable' | 'extras' | null

export function CollectionStatsCards({
  stats,
  items,
  usdBrlRate,
  loading = false,
}: CollectionStatsCardsProps) {
  const [modal, setModal] = useState<ModalKind>(null)

  const valuableItems = useMemo(() => listMostValuableItems(items, 40), [items])
  const extraItems = useMemo(() => listExtraCopyItems(items), [items])

  if (loading && stats.impressions === 0) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-[92px] animate-pulse rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]"
          />
        ))}
      </div>
    )
  }

  if (stats.impressions === 0) return null

  const valueBrl =
    usdBrlRate != null ? convertUsdToBrl(stats.valueUsd, usdBrlRate) : null
  const topBrl =
    stats.topItem?.totalUsd != null && usdBrlRate != null
      ? convertUsdToBrl(stats.topItem.totalUsd, usdBrlRate)
      : null

  return (
    <div className="space-y-2">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <StatTile
          icon={Layers}
          label="Cartas na coleção"
          value={stats.totalCards.toLocaleString('pt-BR')}
          hint={`${stats.impressions.toLocaleString('pt-BR')} impressões · ${stats.uniqueCardIds.toLocaleString('pt-BR')} cartas distintas`}
        />
        <StatTile
          icon={Banknote}
          label="Valor estimado"
          value={valueBrl != null ? formatBrl(valueBrl) : 'Calculando…'}
          hint={
            stats.valueUsd > 0
              ? `${formatUsd(stats.valueUsd)} · ${stats.pricedImpressions.toLocaleString('pt-BR')} com preço`
              : 'Sem preços disponíveis nas impressões'
          }
          accent="success"
        />
        <StatTile
          icon={Sparkles}
          label="Coleções (sets)"
          value={stats.uniqueSets.toLocaleString('pt-BR')}
          hint="Edições diferentes presentes na coleção"
        />
        <StatTile
          icon={Copy}
          label="Cópias extras"
          value={stats.extraCopies.toLocaleString('pt-BR')}
          hint="Quantidade além da 1ª cópia de cada impressão"
          onClick={() => setModal('extras')}
          clickHint="Clique para ver a lista"
        />
        <StatTile
          icon={Gem}
          label="Raridades premium"
          value={stats.premiumCount.toLocaleString('pt-BR')}
          hint="Secret, Ultra, Mosaic, Starlight e afins"
        />
        <StatTile
          icon={Trophy}
          label="Mais valiosa"
          value={
            topBrl != null
              ? formatBrl(topBrl)
              : stats.topItem?.totalUsd != null
                ? formatUsd(stats.topItem.totalUsd)
                : '—'
          }
          hint={
            stats.topItem
              ? `${stats.topItem.name} · ${stats.topItem.setCode}${
                  stats.topItem.setRarity ? ` · ${stats.topItem.setRarity}` : ''
                }${stats.topItem.quantity > 1 ? ` ×${stats.topItem.quantity}` : ''}`
              : 'Nenhuma impressão com preço'
          }
          onClick={() => setModal('valuable')}
          clickHint="Clique para ver o ranking"
        />
      </div>
      <p className="text-[11px] text-[var(--color-muted)]">
        Valores convertidos de USD (set_price) para BRL
        {usdBrlRate != null
          ? ` · cotação ${usdBrlRate.toLocaleString('pt-BR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 4,
            })}`
          : ''}
        . Estimativa de mercado, não preço de venda.
      </p>

      <CollectionRankedListModal
        open={modal === 'valuable'}
        title="Mais valiosas"
        subtitle="Ranking por valor estimado da impressão (quantidade × preço)"
        items={valuableItems}
        usdBrlRate={usdBrlRate}
        emptyMessage="Nenhuma impressão com preço disponível."
        mode="valuable"
        onClose={() => setModal(null)}
      />
      <CollectionRankedListModal
        open={modal === 'extras'}
        title="Cópias extras"
        subtitle="Impressões com mais de 1 unidade na coleção"
        items={extraItems}
        usdBrlRate={usdBrlRate}
        emptyMessage="Você ainda não tem cópias extras."
        mode="extras"
        onClose={() => setModal(null)}
      />
    </div>
  )
}
