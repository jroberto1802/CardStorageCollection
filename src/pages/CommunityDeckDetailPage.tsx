import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Download,
  ExternalLink,
  Loader2,
} from 'lucide-react'
import { useSettings } from '@/contexts/SettingsContext'
import {
  getSyncedDeck,
  importSyncedDeckToUserDeck,
} from '@/services/syncedDeckService'
import type { DeckZone, SyncedDeckCardRow, SyncedDeckDetail } from '@/types'

function ZoneSection({
  title,
  zone,
  cards,
}: {
  title: string
  zone: DeckZone
  cards: SyncedDeckCardRow[]
}) {
  const zoneCards = cards.filter((c) => c.zone === zone)
  if (zoneCards.length === 0) return null

  const copies: Array<{ card: SyncedDeckCardRow; slotOwned: boolean }> = []
  for (const card of zoneCards) {
    for (let i = 0; i < card.quantity; i += 1) {
      copies.push({ card, slotOwned: i < card.ownedCopies })
    }
  }

  const ownedSlots = copies.filter((c) => c.slotOwned).length

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
        {copies.map(({ card, slotOwned }, index) => (
          <div
            key={`${card.id}-${index}`}
            title={`${card.name}${slotOwned ? '' : ' (não possui)'}`}
            className={[
              'relative overflow-hidden rounded-md border bg-[var(--color-surface-2)]',
              slotOwned
                ? 'border-[var(--color-accent)]/40'
                : 'border-[var(--color-border)] opacity-40',
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
                {card.mdm_card_name || card.name}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

export function CommunityDeckDetailPage() {
  const { syncedDeckId } = useParams()
  const { language } = useSettings()
  const navigate = useNavigate()

  const [deck, setDeck] = useState<SyncedDeckDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!syncedDeckId) return
    setLoading(true)
    setError(null)
    try {
      const data = await getSyncedDeck(syncedDeckId)
      if (!data) {
        setError('Deck não encontrado.')
        setDeck(null)
        return
      }
      setDeck(data)
    } catch (err) {
      setDeck(null)
      setError(err instanceof Error ? err.message : 'Falha ao carregar deck')
    } finally {
      setLoading(false)
    }
  }, [syncedDeckId])

  useEffect(() => {
    void load()
  }, [load])

  const pct = useMemo(() => {
    if (!deck || deck.totalCount <= 0) return 0
    return Math.round((deck.ownedCount / deck.totalCount) * 100)
  }, [deck])

  async function handleImport() {
    if (!deck || importing) return
    setImporting(true)
    setMessage(null)
    setError(null)
    try {
      const result = await importSyncedDeckToUserDeck(deck.id, language)
      const notes: string[] = []
      if (result.skippedUnresolved) {
        notes.push(`${result.skippedUnresolved} sem catálogo`)
      }
      if (result.cappedCopies) {
        notes.push(`${result.cappedCopies} cópias limitadas a 3`)
      }
      if (result.truncatedByLimit) {
        notes.push(`${result.truncatedByLimit} cortadas por limite de zona`)
      }
      setMessage(
        `Importado: ${result.inserted} cartas` +
          (notes.length ? ` (${notes.join('; ')})` : ''),
      )
      navigate(`/decks/${result.deckId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao importar')
    } finally {
      setImporting(false)
    }
  }

  if (loading) {
    return (
      <p className="inline-flex items-center gap-2 text-sm text-[var(--color-muted)]">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando deck...
      </p>
    )
  }

  if (error && !deck) {
    return (
      <div className="space-y-4">
        <Link
          to="/community"
          className="inline-flex items-center gap-2 text-sm text-[var(--color-muted)] hover:text-[var(--color-accent)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar à comunidade
        </Link>
        <p className="rounded-lg border border-[var(--color-danger)]/40 bg-[var(--color-danger)]/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      </div>
    )
  }

  if (!deck) return null

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Link
            to="/community"
            className="mb-2 inline-flex items-center gap-2 text-sm text-[var(--color-muted)] hover:text-[var(--color-accent)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Comunidade
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">{deck.name}</h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            {deck.author_name ?? 'Autor desconhecido'}
            {deck.deck_type ? ` · ${deck.deck_type}` : ''}
            {deck.ranked_type ? ` · ${deck.ranked_type}` : ''}
          </p>
          {deck.source_url && (
            <a
              href={deck.source_url}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-1.5 text-xs text-[var(--color-accent)] hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Ver no Master Duel Meta
            </a>
          )}
        </div>

        <button
          type="button"
          disabled={importing}
          onClick={() => void handleImport()}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-accent)] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--color-accent-hover)] disabled:opacity-60"
        >
          {importing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Importar para Meus decks
        </button>
      </div>

      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-xs text-[var(--color-muted)]">Cartas que você possui</p>
            <p className="text-lg font-semibold">
              {deck.ownedCount}
              <span className="text-[var(--color-muted)]">/{deck.totalCount}</span>
              <span className="ml-2 text-sm font-normal text-[var(--color-muted)]">
                ({pct}%)
              </span>
            </p>
          </div>
          <p className="text-sm text-[var(--color-muted)]">
            Main {deck.mainCount} · Extra {deck.extraCount}
            {deck.sideCount > 0 ? ` · Side ${deck.sideCount}` : ''}
          </p>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-[var(--color-surface-2)]">
          <div
            className="h-full rounded-full bg-[var(--color-accent)]"
            style={{ width: `${pct}%` }}
          />
        </div>
        {deck.unresolvedCount > 0 && (
          <p className="mt-2 text-xs text-[var(--color-muted)]">
            {deck.unresolvedCount} cópia(s) sem correspondência no catálogo local
            (contam no total, mas não como possuídas).
          </p>
        )}
      </div>

      {error && (
        <p className="rounded-lg border border-[var(--color-danger)]/40 bg-[var(--color-danger)]/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}
      {message && (
        <p className="rounded-lg border border-[var(--color-success)]/40 bg-[var(--color-success)]/10 px-3 py-2 text-sm text-green-300">
          {message}
        </p>
      )}

      <div className="space-y-4">
        <ZoneSection title="Deck principal" zone="main" cards={deck.cards} />
        <ZoneSection title="Extra Deck" zone="extra" cards={deck.cards} />
        <ZoneSection title="Side Deck" zone="side" cards={deck.cards} />
      </div>
    </div>
  )
}
