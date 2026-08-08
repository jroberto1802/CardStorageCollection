import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Filter,
  Loader2,
  Pencil,
  Save,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react'
import { DeckSearchCard } from '@/components/deck/DeckSearchCard'
import { DeckZonePanel } from '@/components/deck/DeckZonePanel'
import { FilterPanel } from '@/components/catalog/FilterPanel'
import { useDebounce } from '@/hooks/useDebounce'
import { useSettings } from '@/contexts/SettingsContext'
import {
  getDistinctRarities,
  getDistinctSetNames,
  searchCatalog,
} from '@/services/catalogService'
import { listCollectionItems } from '@/services/collectionService'
import {
  addCardToDeck,
  getDeck,
  listDeckCardSlots,
  removeDeckCard,
  renameDeck,
} from '@/services/deckService'
import {
  DEFAULT_CATALOG_FILTERS,
  type CardImpression,
  type CatalogFilters,
  type Deck,
  type DeckCardSlot,
  type DeckDragPayload,
  type SortOption,
} from '@/types'

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'name_asc', label: 'Nome A → Z' },
  { value: 'name_desc', label: 'Nome Z → A' },
  { value: 'set_asc', label: 'Set A → Z' },
  { value: 'set_desc', label: 'Set Z → A' },
]

export function DeckBuilderPage() {
  const { deckId } = useParams()
  const { language } = useSettings()

  const [deck, setDeck] = useState<Deck | null>(null)
  const [deckName, setDeckName] = useState('')
  const [editingName, setEditingName] = useState(false)
  const [slots, setSlots] = useState<DeckCardSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounce(query, 350)
  const [filters, setFilters] = useState<CatalogFilters>(DEFAULT_CATALOG_FILTERS)
  const [sort, setSort] = useState<SortOption>('name_asc')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [dimUnowned, setDimUnowned] = useState(false)
  const [searchItems, setSearchItems] = useState<CardImpression[]>([])
  const [searching, setSearching] = useState(false)
  const [rarities, setRarities] = useState<string[]>([])
  const [setSuggestions, setSetSuggestions] = useState<string[]>([])
  const [setSearch, setSetSearch] = useState('')
  const debouncedSetSearch = useDebounce(setSearch, 300)
  const [ownedByCard, setOwnedByCard] = useState<Map<number, number>>(new Map())

  const mainSlots = useMemo(
    () => slots.filter((s) => s.zone === 'main'),
    [slots],
  )
  const extraSlots = useMemo(
    () => slots.filter((s) => s.zone === 'extra'),
    [slots],
  )

  const copiesByCard = useMemo(() => {
    const map = new Map<number, number>()
    for (const slot of slots) {
      map.set(slot.card_id, (map.get(slot.card_id) ?? 0) + 1)
    }
    return map
  }, [slots])

  const loadDeck = useCallback(async () => {
    if (!deckId) return
    setLoading(true)
    setError(null)
    try {
      const data = await getDeck(deckId)
      if (!data) {
        setError('Deck não encontrado.')
        setDeck(null)
        return
      }
      setDeck(data)
      setDeckName(data.name)
      const cardSlots = await listDeckCardSlots(deckId, data.language)
      setSlots(cardSlots)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Falha ao carregar deck. Verifique se a migration 003 foi aplicada.',
      )
    } finally {
      setLoading(false)
    }
  }, [deckId])

  useEffect(() => {
    void loadDeck()
  }, [loadDeck])

  useEffect(() => {
    let mounted = true
    async function loadMeta() {
      try {
        const [rarityList, owned] = await Promise.all([
          getDistinctRarities(language),
          listCollectionItems(),
        ])
        if (!mounted) return
        setRarities(rarityList)
        const map = new Map<number, number>()
        for (const item of owned) {
          map.set(item.card_id, (map.get(item.card_id) ?? 0) + item.quantity)
        }
        setOwnedByCard(map)
      } catch {
        /* opcional */
      }
    }
    void loadMeta()
    return () => {
      mounted = false
    }
  }, [language])

  useEffect(() => {
    let mounted = true
    async function loadSets() {
      try {
        const names = await getDistinctSetNames(language, debouncedSetSearch)
        if (mounted) setSetSuggestions(names)
      } catch {
        if (mounted) setSetSuggestions([])
      }
    }
    void loadSets()
    return () => {
      mounted = false
    }
  }, [language, debouncedSetSearch])

  useEffect(() => {
    let mounted = true
    async function search() {
      setSearching(true)
      try {
        const result = await searchCatalog({
          language,
          query: debouncedQuery,
          filters,
          sort,
          page: 0,
          pageSize: 48,
        })
        if (mounted) setSearchItems(result.items)
      } catch (err) {
        if (mounted) {
          setSearchItems([])
          setMessage(err instanceof Error ? err.message : 'Falha na busca')
        }
      } finally {
        if (mounted) setSearching(false)
      }
    }
    void search()
    return () => {
      mounted = false
    }
  }, [language, debouncedQuery, filters, sort])

  async function handleSaveName() {
    if (!deck) return
    setEditingName(false)
    const next = deckName.trim() || 'Novo deck'
    setDeckName(next)
    if (next === deck.name) return
    try {
      const updated = await renameDeck(deck.id, next)
      setDeck(updated)
      setMessage('Nome salvo.')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Falha ao renomear')
    }
  }

  async function handleAdd(payload: DeckDragPayload) {
    if (!deck || busy) return
    setBusy(true)
    setMessage(null)
    try {
      const result = await addCardToDeck({
        deckId: deck.id,
        language: payload.language,
        cardId: payload.cardId,
        name: payload.name,
        type: payload.type,
        frameType: payload.frameType,
        race: payload.race,
        imageUrl: payload.imageUrl,
        imageUrlSmall: payload.imageUrlSmall,
      })

      if (!result.ok) {
        setMessage(result.reason)
        return
      }

      setSlots((prev) => [...prev, result.slot])
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Falha ao adicionar carta')
    } finally {
      setBusy(false)
    }
  }

  async function handleRemove(slotId: string) {
    if (!deck) return
    setSlots((prev) => prev.filter((s) => s.id !== slotId))
    try {
      await removeDeckCard(deck.id, slotId)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Falha ao remover')
      void loadDeck()
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-[var(--color-muted)]">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando construtor de deck...
      </div>
    )
  }

  if (error || !deck) {
    return (
      <div className="space-y-4">
        <Link
          to="/decks"
          className="inline-flex items-center gap-2 text-sm text-[var(--color-muted)] hover:text-[var(--color-accent)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar aos decks
        </Link>
        <p className="rounded-lg border border-[var(--color-danger)]/40 bg-[var(--color-danger)]/10 px-3 py-2 text-sm text-red-300">
          {error ?? 'Deck não encontrado'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/decks"
          className="inline-flex items-center gap-2 text-sm text-[var(--color-muted)] hover:text-[var(--color-accent)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Meus decks
        </Link>
        {message && (
          <p className="text-xs text-[var(--color-muted)]">{message}</p>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        {/* Esquerda: deck */}
        <div className="space-y-3 rounded-2xl border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_90%,#0a1628)] p-4 shadow-inner">
          <div className="flex items-center gap-2 border-b border-[var(--color-border)] pb-3">
            {editingName ? (
              <input
                autoFocus
                value={deckName}
                onChange={(e) => setDeckName(e.target.value)}
                onBlur={() => void handleSaveName()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleSaveName()
                  if (e.key === 'Escape') {
                    setDeckName(deck.name)
                    setEditingName(false)
                  }
                }}
                className="flex-1 rounded-lg border border-[var(--color-accent)] bg-[var(--color-surface-2)] px-3 py-2 text-lg font-semibold outline-none"
              />
            ) : (
              <>
                <h1 className="flex-1 text-xl font-semibold tracking-tight">
                  {deckName}
                </h1>
                <button
                  type="button"
                  onClick={() => setEditingName(true)}
                  className="rounded-lg p-2 text-[var(--color-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]"
                  title="Renomear"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => void handleSaveName()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-muted)] hover:bg-[var(--color-surface-2)]"
            >
              <Save className="h-3.5 w-3.5" />
              Salvar nome
            </button>
          </div>

          <DeckZonePanel
            title="Deck principal"
            zone="main"
            slots={mainSlots}
            ownedByCard={ownedByCard}
            columns={10}
            onDropPayload={(payload) => void handleAdd(payload)}
            onRemove={(id) => void handleRemove(id)}
          />

          <DeckZonePanel
            title="Extra Deck"
            zone="extra"
            slots={extraSlots}
            ownedByCard={ownedByCard}
            columns={10}
            onDropPayload={(payload) => void handleAdd(payload)}
            onRemove={(id) => void handleRemove(id)}
          />

          <p className="text-[11px] text-[var(--color-muted)]">
            Fusion, Synchro, Xyz e Link vão automaticamente para o Extra Deck.
            Máximo de 3 cópias da mesma carta. Clique no X para remover.
          </p>
        </div>

        {/* Direita: busca */}
        <div className="flex flex-col gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            Lista de cartas
          </div>

          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Busca por texto / set code..."
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm outline-none ring-[var(--color-accent)] focus:ring-2"
          />

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setFiltersOpen((o) => !o)}
              className={[
                'inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition',
                filtersOpen
                  ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/15'
                  : 'border-[var(--color-border)] text-[var(--color-muted)] hover:bg-[var(--color-surface-2)]',
              ].join(' ')}
            >
              <Filter className="h-4 w-4" />
              Filtros
            </button>

            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-muted)] select-none hover:bg-[var(--color-surface-2)]">
              <span
                className={[
                  'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition',
                  dimUnowned ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-border)]',
                ].join(' ')}
              >
                <span
                  className={[
                    'inline-block h-4 w-4 rounded-full bg-white shadow transition',
                    dimUnowned ? 'translate-x-4' : 'translate-x-0.5',
                  ].join(' ')}
                />
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={dimUnowned}
                  onChange={(e) => setDimUnowned(e.target.checked)}
                />
              </span>
              Destacar possuídas
            </label>

            <label className="inline-flex items-center gap-2 text-sm text-[var(--color-muted)]">
              <SlidersHorizontal className="h-4 w-4" />
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortOption)}
                className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2 py-2 text-sm text-[var(--color-text)] outline-none"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              title="Limpar busca e filtros"
              onClick={() => {
                setQuery('')
                setFilters(DEFAULT_CATALOG_FILTERS)
                setSort('name_asc')
              }}
              className="rounded-lg border border-[var(--color-border)] p-2 text-[var(--color-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-danger)]"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          <FilterPanel
            open={filtersOpen}
            filters={filters}
            rarities={rarities}
            setSuggestions={setSuggestions}
            onChange={setFilters}
            onSetSearch={setSetSearch}
            onClear={() => setFilters(DEFAULT_CATALOG_FILTERS)}
          />

          {searching ? (
            <p className="text-xs text-[var(--color-muted)]">Buscando...</p>
          ) : (
            <p className="text-xs text-[var(--color-muted)]">
              {searchItems.length} resultado(s) · arraste para o deck ou dê duplo
              clique
            </p>
          )}

          <div className="max-h-[70vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-4 xl:grid-cols-5">
              {searchItems.map((item) => (
                <DeckSearchCard
                  key={item.key}
                  item={item}
                  ownedCount={ownedByCard.get(item.cardId) ?? 0}
                  copiesInDeck={copiesByCard.get(item.cardId) ?? 0}
                  dimUnowned={dimUnowned}
                  onAdd={(payload) => void handleAdd(payload)}
                />
              ))}
            </div>
            {!searching && searchItems.length === 0 && (
              <p className="py-10 text-center text-sm text-[var(--color-muted)]">
                Nenhuma carta encontrada.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
