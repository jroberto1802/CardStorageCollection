import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { getCharacterDeck } from '@/services/characterService'
import type { AnimeDeckCardView, AnimeDeckDetail, DeckZone } from '@/types'

const ZONES: { zone: DeckZone; label: string }[] = [
  { zone: 'main', label: 'Main Deck' },
  { zone: 'extra', label: 'Extra Deck' },
  { zone: 'side', label: 'Side Deck' },
]

function CardTile({ card }: { card: AnimeDeckCardView }) {
  return (
    <Link
      to={`/cards/${card.cardId}?lang=${card.language}`}
      className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] transition hover:border-[var(--color-accent)]"
    >
      <div className="aspect-[59/86] bg-[var(--color-surface-2)]">
        {card.imageUrlSmall || card.imageUrl ? (
          <img
            src={card.imageUrlSmall ?? card.imageUrl ?? undefined}
            alt={card.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center px-2 text-center text-xs text-[var(--color-muted)]">
            Sem imagem
          </div>
        )}
      </div>
      <div className="space-y-1 p-2">
        <p className="line-clamp-2 text-xs font-semibold leading-snug">{card.name}</p>
        <p className="text-[11px] text-[var(--color-muted)]">
          x{card.quantity}
          {card.type ? ` · ${card.type}` : ''}
        </p>
        <div className="flex flex-wrap gap-1">
          {card.isAce && (
            <span className="rounded bg-[var(--color-accent)]/20 px-1.5 py-0.5 text-[10px] text-[var(--color-accent)]">
              Ace
            </span>
          )}
          {card.isSignature && (
            <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] text-amber-300">
              Assinatura
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}

export function CharacterDeckPage() {
  const { slug, deckSlug } = useParams()
  const [deck, setDeck] = useState<AnimeDeckDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    async function load() {
      if (!slug || !deckSlug) return
      setLoading(true)
      setError(null)
      try {
        const data = await getCharacterDeck({ characterSlug: slug, deckSlug })
        if (!mounted) return
        setDeck(data)
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
  }, [slug, deckSlug])

  const byZone = useMemo(() => {
    const map = new Map<DeckZone, AnimeDeckCardView[]>()
    for (const zone of ZONES) map.set(zone.zone, [])
    for (const card of deck?.cards ?? []) {
      map.get(card.zone)?.push(card)
    }
    return map
  }, [deck])

  if (loading) {
    return <p className="text-sm text-[var(--color-muted)]">Carregando deck...</p>
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
    <div className="space-y-8">
      <Link
        to={`/characters/${deck.characterSlug}`}
        className="inline-flex items-center gap-2 text-sm text-[var(--color-muted)] hover:text-[var(--color-accent)]"
      >
        <ArrowLeft className="h-4 w-4" />
        {deck.characterName}
      </Link>

      <div>
        <h1 className="text-3xl font-semibold tracking-tight">{deck.name}</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          {deck.characterName} · {deck.animeName}
          {deck.arc ? ` · ${deck.arc}` : ''}
        </p>
        {(deck.description || deck.linkDescription) && (
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--color-muted)]">
            {deck.linkDescription || deck.description}
          </p>
        )}
      </div>

      {deck.cards.length === 0 && (
        <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-12 text-center">
          <p className="text-sm text-[var(--color-muted)]">
            Nenhuma carta cadastrada neste deck ainda. A tabela de cartas do deck já
            está pronta para receber o Main, Extra e Side.
          </p>
        </div>
      )}

      {ZONES.map(({ zone, label }) => {
        const cards = byZone.get(zone) ?? []
        if (deck.cards.length > 0 && cards.length === 0) return null
        if (deck.cards.length === 0) return null
        return (
          <section key={zone} className="space-y-3">
            <h2 className="text-sm font-semibold tracking-wide uppercase">
              {label}
              <span className="ml-2 font-normal text-[var(--color-muted)]">
                {cards.reduce((sum, card) => sum + card.quantity, 0)}
              </span>
            </h2>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
              {cards.map((card) => (
                <CardTile key={card.id} card={card} />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
