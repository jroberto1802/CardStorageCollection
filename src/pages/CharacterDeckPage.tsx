import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { DeckCardPreviewModal } from '@/components/deck/DeckCardPreviewModal'
import { useSettings } from '@/contexts/SettingsContext'
import { listCollectionItems } from '@/services/collectionService'
import { getCharacterDeck } from '@/services/characterService'
import {
  allocateOwnedCopies,
  computeOwnership,
  ownedQuantityByCardId,
} from '@/services/syncedDeckService'
import type { AnimeDeckCardView, AnimeDeckDetail, AppLanguage, DeckZone } from '@/types'

const ZONES: { zone: DeckZone; label: string }[] = [
  { zone: 'main', label: 'Deck principal' },
  { zone: 'extra', label: 'Extra Deck' },
  { zone: 'side', label: 'Side Deck' },
]

function ZoneSection({
  title,
  zone,
  cards,
  ownedByCard,
  onCardClick,
}: {
  title: string
  zone: DeckZone
  cards: AnimeDeckCardView[]
  ownedByCard: number[]
  onCardClick: (card: AnimeDeckCardView) => void
}) {
  const indexed = cards
    .map((card, index) => ({ card, ownedCopies: ownedByCard[index] ?? 0 }))
    .filter((entry) => entry.card.zone === zone)

  if (indexed.length === 0) return null

  const copies: Array<{ card: AnimeDeckCardView; slotOwned: boolean }> = []
  for (const { card, ownedCopies } of indexed) {
    for (let i = 0; i < card.quantity; i += 1) {
      copies.push({ card, slotOwned: i < ownedCopies })
    }
  }

  const ownedSlots = copies.filter((copy) => copy.slotOwned).length

  return (
    <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-3">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-semibold tracking-wide">{title}</h3>
        <span className="rounded-md bg-[var(--color-accent)]/20 px-2 py-0.5 text-sm font-bold text-[var(--color-accent)]">
          {copies.length}
        </span>
        <span className="text-xs text-[var(--color-muted)]">
          Possui {ownedSlots}/{copies.length}
        </span>
      </div>
      <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-8 md:grid-cols-10">
        {copies.map(({ card, slotOwned }, index) => {
          const marks = [
            card.isAce ? 'ace' : null,
            card.isSignature ? 'assinatura' : null,
            slotOwned ? null : 'não possui',
          ]
            .filter(Boolean)
            .join(', ')

          return (
            <button
              key={`${card.id}-${index}`}
              type="button"
              onClick={() => onCardClick(card)}
              title={`${card.name}${marks ? ` (${marks})` : ''} — clique para detalhe`}
              className={[
                'relative overflow-hidden rounded-md border bg-[var(--color-surface-2)] text-left transition',
                slotOwned
                  ? 'border-[var(--color-accent)]/40'
                  : 'border-[var(--color-border)] opacity-40',
                'cursor-pointer hover:border-[var(--color-accent)] hover:ring-1 hover:ring-[var(--color-accent)]',
              ].join(' ')}
            >
              {card.imageUrlSmall || card.imageUrl ? (
                <img
                  src={card.imageUrlSmall ?? card.imageUrl ?? undefined}
                  alt={card.name}
                  className="aspect-[59/86] w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="flex aspect-[59/86] items-center justify-center p-1 text-center text-[9px] text-[var(--color-muted)]">
                  {card.name}
                </div>
              )}
            </button>
          )
        })}
      </div>
    </section>
  )
}

export function CharacterDeckPage() {
  const { slug, deckSlug } = useParams()
  const { language } = useSettings()
  const [deck, setDeck] = useState<AnimeDeckDetail | null>(null)
  const [ownedQty, setOwnedQty] = useState<Map<number, number>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [previewCardId, setPreviewCardId] = useState<number | null>(null)
  const [previewLanguage, setPreviewLanguage] = useState<AppLanguage>(language)

  useEffect(() => {
    let mounted = true
    async function load() {
      if (!slug || !deckSlug) return
      setLoading(true)
      setError(null)
      try {
        const [data, items] = await Promise.all([
          getCharacterDeck({
            characterSlug: slug,
            deckSlug,
            language,
          }),
          listCollectionItems().catch(() => []),
        ])
        if (!mounted) return
        setDeck(data)
        setOwnedQty(ownedQuantityByCardId(items))
        if (!data) setError('Deck não encontrado para este personagem.')
      } catch (err) {
        if (!mounted) return
        setError(err instanceof Error ? err.message : 'Falha ao carregar deck')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    void load()
    return () => {
      mounted = false
    }
  }, [slug, deckSlug, language])

  const ownedByCard = useMemo(() => {
    if (!deck) return []
    return allocateOwnedCopies(
      deck.cards.map((card) => ({
        card_id: card.cardId,
        quantity: card.quantity,
        zone: card.zone,
      })),
      ownedQty,
    )
  }, [deck, ownedQty])

  const ownership = useMemo(() => {
    if (!deck) return { ownedCount: 0, totalCount: 0, unresolvedCount: 0 }
    return computeOwnership(
      deck.cards.map((card) => ({ cardId: card.cardId, quantity: card.quantity })),
      ownedQty,
    )
  }, [deck, ownedQty])

  const pct =
    ownership.totalCount > 0
      ? Math.round((ownership.ownedCount / ownership.totalCount) * 100)
      : 0

  const zoneCounts = useMemo(() => {
    const counts: Record<DeckZone, number> = { main: 0, extra: 0, side: 0 }
    for (const card of deck?.cards ?? []) {
      counts[card.zone] += card.quantity
    }
    return counts
  }, [deck])

  if (loading) {
    return (
      <p className="inline-flex items-center gap-2 text-sm text-[var(--color-muted)]">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando deck...
      </p>
    )
  }

  if (error || !deck) {
    return (
      <div className="space-y-4">
        <Link
          to={slug ? `/characters/${slug}` : '/characters'}
          className="inline-flex items-center gap-2 text-sm text-[var(--color-muted)] hover:text-[var(--color-accent)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Link>
        <p className="rounded-lg border border-[var(--color-danger)]/40 bg-[var(--color-danger)]/10 px-3 py-2 text-sm text-red-300">
          {error ?? 'Deck não encontrado'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="min-w-0">
        <Link
          to={`/characters/${deck.characterSlug}`}
          className="mb-2 inline-flex items-center gap-2 text-sm text-[var(--color-muted)] hover:text-[var(--color-accent)]"
        >
          <ArrowLeft className="h-4 w-4" />
          {deck.characterName}
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">{deck.name}</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          {deck.characterName} · {deck.animeName}
          {deck.arc ? ` · ${deck.arc}` : ''}
        </p>
      </div>

      {deck.cards.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-12 text-center">
          <p className="text-sm text-[var(--color-muted)]">
            Nenhuma carta cadastrada neste deck ainda.
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
              <div>
                <p className="text-xs text-[var(--color-muted)]">Cartas que você possui</p>
                <p className="text-lg font-semibold">
                  {ownership.ownedCount}
                  <span className="text-[var(--color-muted)]">/{ownership.totalCount}</span>
                  <span className="ml-2 text-sm font-normal text-[var(--color-muted)]">
                    ({pct}%)
                  </span>
                </p>
              </div>
              <p className="text-sm text-[var(--color-muted)]">
                Main {zoneCounts.main} · Extra {zoneCounts.extra}
                {zoneCounts.side > 0 ? ` · Side ${zoneCounts.side}` : ''}
              </p>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[var(--color-surface-2)]">
              <div
                className="h-full rounded-full bg-[var(--color-accent)]"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          <div className="space-y-4">
            {ZONES.map(({ zone, label }) => (
              <ZoneSection
                key={zone}
                title={label}
                zone={zone}
                cards={deck.cards}
                ownedByCard={ownedByCard}
                onCardClick={(card) => {
                  setPreviewCardId(card.cardId)
                  setPreviewLanguage(card.language ?? language)
                }}
              />
            ))}
          </div>
        </>
      )}

      <DeckCardPreviewModal
        open={previewCardId != null}
        cardId={previewCardId}
        language={previewLanguage}
        onClose={() => setPreviewCardId(null)}
      />
    </div>
  )
}
