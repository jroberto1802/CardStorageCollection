import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AlertTriangle, Check, ChevronRight, CircleDashed, X } from 'lucide-react'
import { CreateDeckModal } from '@/components/characters/CreateDeckModal'
import { MissingCardsPanel } from '@/components/characters/MissingCardsPanel'
import { DeckCardPreviewModal } from '@/components/deck/DeckCardPreviewModal'
import { useSettings } from '@/contexts/SettingsContext'
import { getCharacterDeck, getCharacterNav, type CharacterNav } from '@/services/characterService'
import { listCollectionItems } from '@/services/collectionService'
import { ownedQuantityByCardId } from '@/services/syncedDeckService'
import type { AnimeDeckDetail, AppLanguage, DeckZone, ResolvedAnimeDeckCard } from '@/types'
import {
  STATUS_LABEL,
  ZONE_ORDER,
  buildCardEntries,
  buildListSearch,
  buildMissingList,
  describeCardOwnership,
  filterEntries,
  formatDeckProgress,
  suggestUserDeckName,
  summarizeDeck,
  zoneSummary,
  type OwnershipFilter,
  type OwnershipStatus,
} from '@/utils/characterView'

const ZONE_LABEL: Record<DeckZone, string> = {
  main: 'Deck principal',
  extra: 'Extra Deck',
  side: 'Side Deck',
}

const FILTERS: { value: OwnershipFilter; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'owned', label: 'Tenho' },
  { value: 'missing', label: 'Faltam' },
]

const STATUS_STYLE: Record<OwnershipStatus, string> = {
  complete: 'text-green-300',
  partial: 'text-amber-300',
  missing: 'text-red-300',
}

function StatusIcon({ status }: { status: OwnershipStatus }) {
  const cls = 'h-3 w-3 shrink-0'
  if (status === 'complete') return <Check className={cls} aria-hidden="true" />
  if (status === 'partial') return <CircleDashed className={cls} aria-hidden="true" />
  return <X className={cls} aria-hidden="true" />
}

function DeckSkeleton() {
  return (
    <div
      className="animate-pulse space-y-4 motion-reduce:animate-none"
      aria-busy="true"
      aria-label="Carregando deck"
    >
      <div className="h-4 w-56 rounded bg-[var(--color-surface-2)]" />
      <div className="h-8 w-64 rounded bg-[var(--color-surface-2)]" />
      <div className="h-24 rounded-2xl bg-[var(--color-surface-2)]" />
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
        {Array.from({ length: 16 }, (_, i) => (
          <div key={i} className="aspect-[59/86] rounded-md bg-[var(--color-surface-2)]" />
        ))}
      </div>
    </div>
  )
}

export function CharacterDeckPage() {
  const { slug, deckSlug } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { language } = useSettings()
  const [deck, setDeck] = useState<AnimeDeckDetail | null>(null)
  const [nav, setNav] = useState<CharacterNav | null>(null)
  const [ownedQty, setOwnedQty] = useState<Map<number, number> | null>(null)
  const [collectionLoading, setCollectionLoading] = useState(true)
  const [deckLoading, setDeckLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [filter, setFilter] = useState<OwnershipFilter>('all')
  const [previewCardId, setPreviewCardId] = useState<number | null>(null)
  const [previewLanguage, setPreviewLanguage] = useState<AppLanguage>(language)
  const [showUnresolved, setShowUnresolved] = useState(false)
  const triggerRef = useRef<HTMLElement | null>(null)
  const actionTriggerRef = useRef<HTMLElement | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [missingOpen, setMissingOpen] = useState(false)

  const listSearch = buildListSearch({
    serie: searchParams.get('serie'),
    q: searchParams.get('q'),
  })

  // Personagem (série e irmãos) + coleção: dependem só do personagem.
  useEffect(() => {
    if (!slug) return
    let mounted = true
    setNav(null)
    setOwnedQty(null)
    setCollectionLoading(true)
    setFilter('all')
    async function load() {
      const [navData, items] = await Promise.all([
        getCharacterNav(slug as string).catch(() => null),
        listCollectionItems().catch(() => null),
      ])
      if (!mounted) return
      setNav(navData)
      setOwnedQty(items ? ownedQuantityByCardId(items) : null)
      setCollectionLoading(false)
    }
    void load()
    return () => {
      mounted = false
    }
  }, [slug, reloadKey])

  // Deck: ao trocar só o deckSlug mantém a tela atual (sem skeleton completo).
  useEffect(() => {
    if (!slug || !deckSlug) return
    let mounted = true
    setDeckLoading(true)
    setError(null)
    setShowUnresolved(false)
    setPreviewCardId(null)
    setCreateOpen(false)
    setMissingOpen(false)
    async function load() {
      try {
        const data = await getCharacterDeck({ characterSlug: slug as string, deckSlug: deckSlug as string, language })
        if (!mounted) return
        setDeck(data)
        if (!data) setError('Deck não encontrado para este personagem.')
      } catch {
        if (!mounted) return
        setDeck(null)
        setError('Não foi possível carregar o deck.')
      } finally {
        if (mounted) setDeckLoading(false)
      }
    }
    void load()
    return () => {
      mounted = false
    }
  }, [slug, deckSlug, language, reloadKey])

  const loading = collectionLoading || (deckLoading && (deck === null || deck.characterSlug !== slug))
  const collectionOk = ownedQty !== null
  const effectiveOwned = useMemo(() => ownedQty ?? new Map<number, number>(), [ownedQty])

  const entries = useMemo(
    () => buildCardEntries(deck?.cards ?? [], effectiveOwned),
    [deck, effectiveOwned],
  )

  const summary = useMemo(
    () =>
      summarizeDeck(
        [
          ...(deck?.cards ?? []).map((card) => ({ cardId: card.cardId, quantity: card.quantity })),
          ...(deck?.unresolvedCards ?? []).map((card) => ({ cardId: null, quantity: card.quantity })),
        ],
        effectiveOwned,
      ),
    [deck, effectiveOwned],
  )

  const missingCopies = useMemo(
    () => buildMissingList(entries, 'cardmarket').missingCopies,
    [entries],
  )

  const visibleEntries = useMemo(
    () => (collectionOk ? filterEntries(entries, filter) : entries),
    [entries, filter, collectionOk],
  )

  const backToCharacters = `/characters${
    listSearch || buildListSearch({ serie: nav?.series })
  }`
  const characterPath = `${slug ? `/characters/${slug}` : '/characters'}${listSearch}`

  if (loading) return <DeckSkeleton />

  if (error || !deck) {
    return (
      <div className="space-y-4">
        <div role="alert" className="rounded-2xl border border-[var(--color-danger)]/40 bg-[var(--color-danger)]/10 px-4 py-4 text-sm">
          <p className="text-red-300">{error ?? 'Deck não encontrado.'}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setReloadKey((key) => key + 1)}
              className="min-h-11 rounded-lg border border-[var(--color-border)] px-4 py-2 font-medium hover:bg-[var(--color-surface-2)]"
            >
              Tentar novamente
            </button>
            <Link
              to={characterPath}
              className="inline-flex min-h-11 items-center rounded-lg border border-[var(--color-border)] px-4 py-2 font-medium text-[var(--color-accent)] hover:bg-[var(--color-surface-2)]"
            >
              Voltar ao personagem
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const siblings = (nav?.decks ?? []).filter((d) => d.label)
  const hasCards = deck.cards.length + deck.unresolvedCards.length > 0
  const subtitle = [deck.label ? `Deck ${deck.label}` : null, deck.characterName, deck.animeName]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="space-y-6">
      <nav aria-label="Navegação" className="flex flex-wrap items-center gap-1 text-sm text-[var(--color-muted)]">
        <Link to={backToCharacters} className="inline-flex min-h-11 items-center hover:text-[var(--color-accent)]">
          Personagens
        </Link>
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
        <Link to={characterPath} className="inline-flex min-h-11 items-center hover:text-[var(--color-accent)]">
          {deck.characterName}
        </Link>
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
        <span aria-current="page" className="text-[var(--color-text)]">
          {deck.name}
        </span>
      </nav>

      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight">{deck.name}</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">{subtitle}</p>
        {siblings.length > 1 && (
          <div role="group" aria-label="Alternar deck" className="mt-3 inline-flex gap-2">
            {siblings.map((sibling) => {
              const current = sibling.slug === deck.slug
              return (
                <button
                  key={sibling.slug}
                  type="button"
                  aria-pressed={current}
                  onClick={() => {
                    if (!current) {
                      navigate(
                        `/characters/${deck.characterSlug}/decks/${sibling.slug}${listSearch}`,
                        { replace: true },
                      )
                    }
                  }}
                  className={[
                    'min-h-11 min-w-11 rounded-lg border px-4 py-2 text-sm font-medium',
                    current
                      ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-white'
                      : 'border-[var(--color-border)] text-[var(--color-muted)] hover:bg-[var(--color-surface-2)]',
                  ].join(' ')}
                >
                  Deck {sibling.label}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {hasCards && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              actionTriggerRef.current = e.currentTarget
              setCreateOpen(true)
            }}
            className="min-h-11 rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--color-accent-hover)]"
          >
            Criar meu deck a partir deste
          </button>
          <button
            type="button"
            disabled={!collectionOk || missingCopies === 0}
            onClick={(e) => {
              actionTriggerRef.current = e.currentTarget
              setMissingOpen(true)
            }}
            className="min-h-11 rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium hover:bg-[var(--color-surface-2)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {!collectionOk
              ? 'O que falta · Coleção indisponível'
              : missingCopies === 0
                ? 'Você já tem tudo!'
                : `O que falta (${missingCopies})`}
          </button>
        </div>
      )}

      {!hasCards ? (
        <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-12 text-center">
          <p className="text-sm text-[var(--color-muted)]">Nenhuma carta cadastrada neste deck ainda.</p>
        </div>
      ) : (
        <>
          {!collectionOk && (
            <p
              role="status"
              className="flex items-center gap-2 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-sm text-amber-200"
            >
              <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
              Não foi possível carregar sua coleção; o progresso não é exibido.
            </p>
          )}

          {collectionOk && (
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
              <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
                <div>
                  <p id="deck-progress-label" className="text-xs text-[var(--color-muted)]">
                    Cartas que você possui
                  </p>
                  <p className="text-lg font-semibold">
                    {formatDeckProgress(summary)}
                    <span className="ml-2 text-sm font-normal text-[var(--color-muted)]">
                      ({summary.percent}%)
                    </span>
                  </p>
                </div>
                <p className="text-sm font-medium">
                  {summary.missing === 0 ? 'Deck completo' : `Faltam ${summary.missing}`}
                </p>
              </div>
              <div
                role="progressbar"
                aria-labelledby="deck-progress-label"
                aria-valuemin={0}
                aria-valuemax={summary.total}
                aria-valuenow={summary.owned}
                aria-valuetext={`${summary.owned} de ${summary.total} cartas`}
                className="h-2 overflow-hidden rounded-full bg-[var(--color-surface-2)]"
              >
                <div
                  className="h-full rounded-full bg-[var(--color-accent)]"
                  style={{ width: `${summary.percent}%` }}
                />
              </div>
              <div role="group" aria-label="Filtrar cartas" className="mt-3 flex flex-wrap gap-2">
                {FILTERS.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    aria-pressed={filter === item.value}
                    onClick={() => setFilter(item.value)}
                    className={[
                      'min-h-11 min-w-11 rounded-lg border px-4 py-2 text-sm font-medium',
                      filter === item.value
                        ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-white'
                        : 'border-[var(--color-border)] text-[var(--color-muted)] hover:bg-[var(--color-surface-2)]',
                    ].join(' ')}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {deck.unresolvedCount > 0 && (
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 px-3 py-1 text-sm">
              <button
                type="button"
                aria-expanded={showUnresolved}
                aria-controls="unresolved-cards"
                onClick={() => setShowUnresolved((open) => !open)}
                className="flex min-h-11 w-full items-center justify-between gap-2 text-left text-[var(--color-muted)] hover:text-[var(--color-text)]"
              >
                <span>
                  {deck.unresolvedCount} carta{deck.unresolvedCount === 1 ? '' : 's'} não catalogada
                  {deck.unresolvedCount === 1 ? '' : 's'}
                </span>
                <ChevronRight
                  aria-hidden="true"
                  className={`h-4 w-4 transition-transform motion-reduce:transition-none ${showUnresolved ? 'rotate-90' : ''}`}
                />
              </button>
              {showUnresolved && (
                <ul id="unresolved-cards" className="pb-2 text-[var(--color-muted)]">
                  {deck.unresolvedCards.map((card) => (
                    <li key={card.id}>
                      {card.quantity}× {card.cardName}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="space-y-4">
            {ZONE_ORDER.map((zone) => {
              const zoneAll = zoneSummary(entries, zone, deck.unresolvedCards)
              if (zoneAll.total === 0) return null
              const shown = visibleEntries.filter((entry) => entry.card.zone === zone)
              return (
                <section
                  key={zone}
                  aria-labelledby={`zone-${zone}`}
                  className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-3"
                >
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <h2 id={`zone-${zone}`} className="text-sm font-semibold tracking-wide">
                      {ZONE_LABEL[zone]}
                    </h2>
                    <span className="rounded-md bg-[var(--color-accent)]/20 px-2 py-0.5 text-sm font-bold text-[var(--color-accent)]">
                      {zoneAll.total}
                    </span>
                    {collectionOk && (
                      <span className="text-xs text-[var(--color-muted)]">
                        Possui {zoneAll.owned}/{zoneAll.total}
                      </span>
                    )}
                    {zoneAll.unresolved > 0 && (
                      <span className="text-xs text-[var(--color-muted)]">
                        ({zoneAll.unresolved} não catalogada{zoneAll.unresolved === 1 ? '' : 's'})
                      </span>
                    )}
                  </div>
                  {shown.length === 0 && zoneAll.total === zoneAll.unresolved ? (
                    <p className="text-sm text-[var(--color-muted)]">
                      Todas as cartas desta zona são não catalogadas.
                    </p>
                  ) : shown.length === 0 ? (
                    <p className="text-sm text-[var(--color-muted)]">Nenhuma carta neste filtro.</p>
                  ) : (
                    <ul className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10">
                      {shown.map(({ card, owned, status }) => (
                        <CardTile
                          key={card.id}
                          card={card}
                          owned={owned}
                          status={status}
                          showStatus={collectionOk}
                          onOpen={(trigger) => {
                            triggerRef.current = trigger
                            setPreviewCardId(card.cardId)
                            setPreviewLanguage(language)
                          }}
                        />
                      ))}
                    </ul>
                  )}
                </section>
              )
            })}
          </div>
        </>
      )}

      <CreateDeckModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        deckSlug={deck.slug}
        defaultName={suggestUserDeckName(deck.name, deck.characterName)}
        language={language}
        entries={entries}
        unresolvedCards={deck.unresolvedCards}
        collectionOk={collectionOk}
        returnFocusRef={actionTriggerRef}
      />
      <MissingCardsPanel
        open={missingOpen}
        onClose={() => setMissingOpen(false)}
        entries={entries}
        deckName={deck.name}
        characterName={deck.characterName}
        unresolvedCount={deck.unresolvedCount}
        returnFocusRef={actionTriggerRef}
      />
      <DeckCardPreviewModal
        open={previewCardId != null}
        cardId={previewCardId}
        language={previewLanguage}
        onClose={() => setPreviewCardId(null)}
        returnFocusRef={triggerRef}
      />
    </div>
  )
}

function CardTile({
  card,
  owned,
  status,
  showStatus,
  onOpen,
}: {
  card: ResolvedAnimeDeckCard
  owned: number
  status: OwnershipStatus
  showStatus: boolean
  onOpen: (trigger: HTMLElement) => void
}) {
  const marks = [card.isAce ? 'ace' : null, card.isSignature ? 'assinatura' : null]
    .filter(Boolean)
    .join(', ')
  const label = showStatus
    ? describeCardOwnership(card.name, card.quantity, owned, status)
    : `${card.name}, ${card.quantity} ${card.quantity === 1 ? 'cópia' : 'cópias'} no deck`

  return (
    <li>
      <button
        type="button"
        onClick={(e) => onOpen(e.currentTarget)}
        aria-label={`${label}${marks ? ` (${marks})` : ''}. Abrir detalhes`}
        title={card.name}
        className="block w-full cursor-pointer overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] text-left hover:border-[var(--color-accent)]"
      >
        <span className="relative block">
          {card.imageUrlSmall || card.imageUrl ? (
            <img
              src={card.imageUrlSmall ?? card.imageUrl ?? undefined}
              alt=""
              className={`aspect-[59/86] w-full object-cover ${showStatus && status === 'missing' ? 'opacity-50' : ''}`}
              loading="lazy"
            />
          ) : (
            <span className="flex aspect-[59/86] items-center justify-center p-1 text-center text-[10px] text-[var(--color-muted)]">
              {card.name}
            </span>
          )}
          {card.quantity > 1 && (
            <span
              aria-hidden="true"
              className="absolute top-0.5 right-0.5 rounded bg-black/80 px-1.5 py-0.5 text-xs font-bold text-white"
            >
              x{card.quantity}
            </span>
          )}
        </span>
        {showStatus && (
          <span
            aria-hidden="true"
            className={`flex items-center justify-center gap-1 px-1 py-0.5 text-[10px] font-medium ${STATUS_STYLE[status]}`}
          >
            <StatusIcon status={status} />
            {STATUS_LABEL[status]}
          </span>
        )}
      </button>
    </li>
  )
}
