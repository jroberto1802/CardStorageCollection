import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowDownWideNarrow, Loader2, Search, Users, X } from 'lucide-react'
import { useDebounce } from '@/hooks/useDebounce'
import { useSettings } from '@/contexts/SettingsContext'
import { searchCatalog } from '@/services/catalogService'
import { countSyncedDecks, listSyncedDecks } from '@/services/syncedDeckService'
import {
  DEFAULT_CATALOG_FILTERS,
  type CardImpression,
  type SyncedDeckSummary,
} from '@/types'

const PAGE_SIZE = 24

function OwnershipBadge({ owned, total }: { owned: number; total: number }) {
  const pct = total > 0 ? Math.round((owned / total) * 100) : 0
  return (
    <div className="mt-3">
      <div className="mb-1 flex items-center justify-between text-xs text-[var(--color-muted)]">
        <span>Possui</span>
        <span className="font-semibold text-[var(--color-text)]">
          {owned}/{total}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-surface-2)]">
        <div
          className="h-full rounded-full bg-[var(--color-accent)] transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

type SelectedCardFilter = {
  cardId: number
  name: string
}

export function CommunityDecksPage() {
  const { language } = useSettings()
  const [items, setItems] = useState<SyncedDeckSummary[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const [deckType, setDeckType] = useState('')
  const debouncedType = useDebounce(deckType, 300)

  const [cardFilterText, setCardFilterText] = useState('')
  const debouncedCardText = useDebounce(cardFilterText, 300)
  const [selectedCard, setSelectedCard] = useState<SelectedCardFilter | null>(
    null,
  )
  const [cardSuggestions, setCardSuggestions] = useState<CardImpression[]>([])
  const [cardSuggestLoading, setCardSuggestLoading] = useState(false)
  const [cardPickerOpen, setCardPickerOpen] = useState(false)
  const cardPickerRef = useRef<HTMLDivElement>(null)

  const [sortByOwned, setSortByOwned] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasAny, setHasAny] = useState<boolean | null>(null)

  useEffect(() => {
    if (!cardPickerOpen) return

    function handlePointerDown(event: MouseEvent) {
      if (
        cardPickerRef.current &&
        !cardPickerRef.current.contains(event.target as Node)
      ) {
        setCardPickerOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [cardPickerOpen])

  useEffect(() => {
    if (selectedCard) {
      setCardSuggestions([])
      return
    }

    const q = debouncedCardText.trim()
    if (q.length < 2) {
      setCardSuggestions([])
      return
    }

    let cancelled = false
    setCardSuggestLoading(true)
    void searchCatalog({
      language,
      query: q,
      filters: DEFAULT_CATALOG_FILTERS,
      sort: 'name_asc',
      page: 0,
      pageSize: 8,
    })
      .then((result) => {
        if (!cancelled) setCardSuggestions(result.items)
      })
      .catch(() => {
        if (!cancelled) setCardSuggestions([])
      })
      .finally(() => {
        if (!cancelled) setCardSuggestLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [debouncedCardText, language, selectedCard])

  useEffect(() => {
    setPage(1)
  }, [
    debouncedSearch,
    debouncedType,
    debouncedCardText,
    selectedCard,
    language,
    sortByOwned,
  ])

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const totalAll = await countSyncedDecks()
        if (cancelled) return
        setHasAny(totalAll > 0)

        let containsCardIds: number[] | undefined
        let containsCardName: string | undefined

        if (selectedCard) {
          containsCardIds = [selectedCard.cardId]
          containsCardName = selectedCard.name
        } else {
          const q = debouncedCardText.trim()
          if (q.length >= 2) {
            containsCardName = q
            try {
              const catalog = await searchCatalog({
                language,
                query: q,
                filters: DEFAULT_CATALOG_FILTERS,
                sort: 'name_asc',
                page: 0,
                pageSize: 20,
              })
              containsCardIds = [
                ...new Set(catalog.items.map((item) => item.cardId)),
              ]
            } catch {
              containsCardIds = undefined
            }
          }
        }

        if (cancelled) return

        const result = await listSyncedDecks({
          search: debouncedSearch,
          deckType: debouncedType,
          containsCardIds,
          containsCardName,
          sortByOwned,
          page,
          pageSize: PAGE_SIZE,
        })
        if (cancelled) return
        setItems(result.items)
        setTotal(result.total)
      } catch (err) {
        if (cancelled) return
        setItems([])
        setTotal(0)
        setError(
          err instanceof Error
            ? err.message
            : 'Falha ao listar decks. Aplique as migrations 005 e 006 no Supabase.',
        )
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [
    debouncedSearch,
    debouncedType,
    debouncedCardText,
    selectedCard,
    language,
    sortByOwned,
    page,
  ])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  function handleSelectCard(item: CardImpression) {
    setSelectedCard({ cardId: item.cardId, name: item.name })
    setCardFilterText(item.name)
    setCardSuggestions([])
    setCardPickerOpen(false)
  }

  function handleClearCardFilter() {
    setSelectedCard(null)
    setCardFilterText('')
    setCardSuggestions([])
    setCardPickerOpen(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Decks da comunidade
        </h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Top decks sincronizados do Master Duel Meta. Veja o que você já possui e
          importe para Meus decks.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--color-muted)]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar nome, autor ou arquétipo..."
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] py-2.5 pr-3 pl-10 text-sm outline-none ring-[var(--color-accent)] focus:ring-2"
            />
          </div>
          <input
            value={deckType}
            onChange={(e) => setDeckType(e.target.value)}
            placeholder="Filtrar arquétipo (ex.: Zoodiac)"
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm outline-none ring-[var(--color-accent)] focus:ring-2 sm:max-w-xs"
          />
          <label
            title="Analisa todos os decks e coloca os que você mais tem primeiro (mais lento)"
            className={[
              'inline-flex h-[42px] shrink-0 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm select-none transition',
              sortByOwned
                ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/15 text-[var(--color-text)]'
                : 'border-[var(--color-border)] text-[var(--color-muted)] hover:bg-[var(--color-surface-2)]',
            ].join(' ')}
          >
            <ArrowDownWideNarrow className="h-4 w-4 shrink-0" />
            <span>Ordenar por posse</span>
            <span
              className={[
                'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition',
                sortByOwned ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-border)]',
              ].join(' ')}
            >
              <span
                className={[
                  'inline-block h-4 w-4 rounded-full bg-white shadow transition',
                  sortByOwned ? 'translate-x-4' : 'translate-x-0.5',
                ].join(' ')}
              />
              <input
                type="checkbox"
                className="sr-only"
                checked={sortByOwned}
                onChange={(e) => setSortByOwned(e.target.checked)}
              />
            </span>
          </label>
        </div>

        <div className="relative" ref={cardPickerRef}>
          <label className="mb-1 block text-xs text-[var(--color-muted)]">
            Carta no deck
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--color-muted)]" />
            <input
              value={cardFilterText}
              onChange={(e) => {
                setCardFilterText(e.target.value)
                setSelectedCard(null)
                setCardPickerOpen(true)
              }}
              onFocus={() => setCardPickerOpen(true)}
              placeholder="Ex.: Ash Blossom — decks que incluem a carta"
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] py-2.5 pr-10 pl-10 text-sm outline-none ring-[var(--color-accent)] focus:ring-2"
            />
            {(cardFilterText || selectedCard) && (
              <button
                type="button"
                onClick={handleClearCardFilter}
                className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-[var(--color-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]"
                aria-label="Limpar filtro de carta"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {selectedCard && (
            <p className="mt-1 text-xs text-[var(--color-accent)]">
              Filtrando por: {selectedCard.name}
            </p>
          )}

          {cardPickerOpen &&
            !selectedCard &&
            debouncedCardText.trim().length >= 2 && (
              <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg">
                {cardSuggestLoading && (
                  <li className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--color-muted)]">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Buscando cartas...
                  </li>
                )}
                {!cardSuggestLoading && cardSuggestions.length === 0 && (
                  <li className="px-3 py-2 text-sm text-[var(--color-muted)]">
                    Nenhuma carta no catálogo — a busca ainda filtra pelo nome
                    MDM nos decks.
                  </li>
                )}
                {cardSuggestions.map((item) => (
                  <li key={`${item.cardId}-${item.language}`}>
                    <button
                      type="button"
                      onClick={() => handleSelectCard(item)}
                      className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-[var(--color-surface-2)]"
                    >
                      {item.imageUrlSmall || item.imageUrl ? (
                        <img
                          src={item.imageUrlSmall ?? item.imageUrl ?? undefined}
                          alt=""
                          className="h-10 w-7 rounded object-cover"
                        />
                      ) : (
                        <div className="h-10 w-7 rounded bg-[var(--color-surface-2)]" />
                      )}
                      <span className="min-w-0 flex-1 truncate">{item.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
        </div>
      </div>

      {error && (
        <p className="rounded-lg border border-[var(--color-danger)]/40 bg-[var(--color-danger)]/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      {loading && (
        <p className="inline-flex items-center gap-2 text-sm text-[var(--color-muted)]">
          <Loader2 className="h-4 w-4 animate-spin" />
          {sortByOwned
            ? 'Ordenando por posse (pode demorar)...'
            : 'Carregando comunidade...'}
        </p>
      )}

      {!loading && hasAny === false && (
        <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-16 text-center">
          <Users className="mx-auto h-10 w-10 text-[var(--color-muted)]" />
          <p className="mt-3 text-lg font-medium">Nenhum deck sincronizado</p>
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            Rode a sincronização de decks em Configurações para popular esta lista.
          </p>
          <Link
            to="/settings"
            className="mt-4 inline-flex rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-accent-hover)]"
          >
            Ir para Configurações
          </Link>
        </div>
      )}

      {!loading && hasAny && items.length === 0 && (
        <p className="text-sm text-[var(--color-muted)]">
          Nenhum deck corresponde aos filtros.
        </p>
      )}

      {!loading && items.length > 0 && (
        <>
          <p className="text-sm text-[var(--color-muted)]">
            {total.toLocaleString('pt-BR')} deck
            {total === 1 ? '' : 's'}
          </p>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((deck) => (
              <li key={deck.id}>
                <Link
                  to={`/community/${deck.id}`}
                  className="block rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition hover:border-[var(--color-accent)]"
                >
                  <h2 className="line-clamp-2 text-lg font-semibold">{deck.name}</h2>
                  <p className="mt-1 text-xs text-[var(--color-muted)]">
                    {deck.author_name ?? 'Autor desconhecido'}
                    {deck.ranked_type ? ` · ${deck.ranked_type}` : ''}
                  </p>
                  {deck.deck_type && (
                    <p className="mt-1 text-xs font-medium text-[var(--color-accent)]">
                      {deck.deck_type}
                    </p>
                  )}
                  <p className="mt-2 text-sm text-[var(--color-muted)]">
                    Main{' '}
                    <span className="font-semibold text-[var(--color-text)]">
                      {deck.mainCount}
                    </span>
                    {' · '}
                    Extra{' '}
                    <span className="font-semibold text-[var(--color-text)]">
                      {deck.extraCount}
                    </span>
                    {deck.sideCount > 0 && (
                      <>
                        {' · '}
                        Side{' '}
                        <span className="font-semibold text-[var(--color-text)]">
                          {deck.sideCount}
                        </span>
                      </>
                    )}
                  </p>
                  <OwnershipBadge
                    owned={deck.ownedCount}
                    total={deck.totalCount}
                  />
                  {deck.unresolvedCount > 0 && (
                    <p className="mt-1 text-[10px] text-[var(--color-muted)]">
                      {deck.unresolvedCount} linha(s) sem match no catálogo
                    </p>
                  )}
                </Link>
              </li>
            ))}
          </ul>

          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm disabled:opacity-40"
              >
                Anterior
              </button>
              <span className="text-sm text-[var(--color-muted)]">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm disabled:opacity-40"
              >
                Próxima
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
