import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ChevronLeft,
  ChevronRight,
  Filter,
  Grid3X3,
  List,
  Settings,
  SlidersHorizontal,
} from 'lucide-react'
import { SearchBar } from '@/components/catalog/SearchBar'
import { FilterPanel } from '@/components/catalog/FilterPanel'
import { CardGrid } from '@/components/catalog/CardGrid'
import { CatalogListView } from '@/components/catalog/CatalogListView'
import { AddToCollectionModal } from '@/components/collection/AddToCollectionModal'
import { GridSizeControl } from '@/components/common/GridSizeControl'
import { useSettings } from '@/contexts/SettingsContext'
import { useDebounce } from '@/hooks/useDebounce'
import { gridCardSizeClass, useGridCardSize } from '@/hooks/useGridCardSize'
import {
  getDistinctArchetypes,
  getDistinctRarities,
  getDistinctSetNames,
  searchCatalog,
} from '@/services/catalogService'
import { countCards, fetchLatestSyncLog } from '@/services/syncService'
import {
  DEFAULT_CATALOG_FILTERS,
  type CardImpression,
  type CatalogFilters,
  type SortOption,
} from '@/types'

const PAGE_SIZE = 24

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'name_asc', label: 'Nome A → Z' },
  { value: 'name_desc', label: 'Nome Z → A' },
  { value: 'set_asc', label: 'Set representativo A → Z' },
  { value: 'set_desc', label: 'Set representativo Z → A' },
  { value: 'rarity', label: 'Raridade (representativa)' },
  { value: 'release_date', label: 'Data de lançamento' },
]

type CatalogViewMode = 'grid' | 'list'

function countActiveFilters(filters: CatalogFilters): number {
  let count = 0
  if (filters.cardCategory) count += 1
  count += filters.monsterTypes.length
  count += filters.attributes.length
  count += filters.rarities.length
  if (filters.region) count += 1
  if (filters.setName.trim()) count += 1
  if (filters.archetype.trim()) count += 1
  return count
}

export function HomePage() {
  const { language } = useSettings()
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounce(query, 400)
  const [filters, setFilters] = useState<CatalogFilters>(DEFAULT_CATALOG_FILTERS)
  const [sort, setSort] = useState<SortOption>('name_asc')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [viewMode, setViewMode] = useState<CatalogViewMode>('grid')
  const { gridSize, setGridSize } = useGridCardSize()
  const [page, setPage] = useState(0)

  const [items, setItems] = useState<CardImpression[]>([])
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [catalogCount, setCatalogCount] = useState<number | null>(null)
  const [hasSynced, setHasSynced] = useState(true)
  const [rarities, setRarities] = useState<string[]>([])
  const [setSuggestions, setSetSuggestions] = useState<string[]>([])
  const [setSearch, setSetSearch] = useState('')
  const debouncedSetSearch = useDebounce(setSearch, 300)
  const [archetypeSuggestions, setArchetypeSuggestions] = useState<string[]>([])
  const [archetypeSearch, setArchetypeSearch] = useState('')
  const debouncedArchetypeSearch = useDebounce(archetypeSearch, 300)

  const [addModalOpen, setAddModalOpen] = useState(false)
  const [addPreset, setAddPreset] = useState<{
    cardId: number
    language?: CardImpression['language']
    setCode: string
    setName: string
    setRarity: string
  } | null>(null)
  const [addFeedback, setAddFeedback] = useState<string | null>(null)

  const activeFilterCount = useMemo(() => countActiveFilters(filters), [filters])

  useEffect(() => {
    setPage(0)
  }, [debouncedQuery, filters, sort, language])

  useEffect(() => {
    let mounted = true

    async function loadMeta() {
      try {
        const [count, log, rarityList] = await Promise.all([
          countCards(language),
          fetchLatestSyncLog(),
          getDistinctRarities(language),
        ])
        if (!mounted) return
        setCatalogCount(count)
        setHasSynced(Boolean(log && log.status === 'success') || count > 0)
        setRarities(rarityList)
      } catch {
        if (!mounted) return
        setCatalogCount(0)
        setHasSynced(false)
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

    async function loadArchetypes() {
      try {
        const names = await getDistinctArchetypes(language, debouncedArchetypeSearch)
        if (mounted) setArchetypeSuggestions(names)
      } catch {
        if (mounted) setArchetypeSuggestions([])
      }
    }

    void loadArchetypes()
    return () => {
      mounted = false
    }
  }, [language, debouncedArchetypeSearch])

  useEffect(() => {
    let mounted = true

    async function loadCatalog() {
      setLoading(true)
      setError(null)

      try {
        const result = await searchCatalog({
          language,
          query: debouncedQuery,
          filters,
          sort,
          page,
          pageSize: PAGE_SIZE,
        })

        if (!mounted) return
        setItems(result.items)
        setTotal(result.total)
        setHasMore(result.hasMore)
      } catch (err) {
        if (!mounted) return
        setItems([])
        setTotal(0)
        setHasMore(false)
        setError(err instanceof Error ? err.message : 'Falha ao buscar cartas')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    void loadCatalog()
    return () => {
      mounted = false
    }
  }, [language, debouncedQuery, filters, sort, page])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  function handleAddToCollection(item: CardImpression) {
    setAddPreset({
      cardId: item.cardId,
      language: item.language,
      setCode: item.setCode !== '—' ? item.setCode : '',
      setName: item.setName !== 'Sem set' ? item.setName : '',
      setRarity: item.setRarity !== '—' ? item.setRarity : '',
    })
    setAddModalOpen(true)
    setAddFeedback(null)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Catálogo de cartas</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Busque por nome, set code ou texto. Os resultados usam os dados sincronizados no
          Supabase.
        </p>
      </div>

      {!hasSynced && catalogCount === 0 && (
        <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <p className="text-sm text-[var(--color-muted)]">
            Nenhum catálogo sincronizado ainda. Vá em Configurações e execute a
            sincronização.
          </p>
          <Link
            to="/settings"
            className="mt-3 inline-flex items-center gap-2 text-sm text-[var(--color-accent)] hover:underline"
          >
            <Settings className="h-4 w-4" />
            Abrir configurações
          </Link>
        </div>
      )}

      <SearchBar value={query} onChange={setQuery} />

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setFiltersOpen((open) => !open)}
          className={[
            'inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition',
            filtersOpen || activeFilterCount > 0
              ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/15 text-[var(--color-text)]'
              : 'border-[var(--color-border)] text-[var(--color-muted)] hover:bg-[var(--color-surface-2)]',
          ].join(' ')}
        >
          <Filter className="h-4 w-4" />
          Filtros
          {activeFilterCount > 0 && (
            <span className="rounded-full bg-[var(--color-accent)] px-2 py-0.5 text-xs text-white">
              {activeFilterCount}
            </span>
          )}
        </button>

        <label className="inline-flex items-center gap-2 text-sm text-[var(--color-muted)]">
          <SlidersHorizontal className="h-4 w-4" />
          <span className="sr-only">Ordenação</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOption)}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] outline-none ring-[var(--color-accent)] focus:ring-2"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
          {viewMode === 'grid' && (
            <GridSizeControl value={gridSize} onChange={setGridSize} />
          )}
          <div className="flex items-center gap-1 rounded-lg border border-[var(--color-border)] p-0.5">
            <button
              type="button"
              title="Quadros"
              onClick={() => setViewMode('grid')}
              className={[
                'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm transition',
                viewMode === 'grid'
                  ? 'bg-[var(--color-accent)] text-white'
                  : 'text-[var(--color-muted)] hover:bg-[var(--color-surface-2)]',
              ].join(' ')}
            >
              <Grid3X3 className="h-4 w-4" />
              <span className="hidden sm:inline">Quadros</span>
            </button>
            <button
              type="button"
              title="Lista"
              onClick={() => setViewMode('list')}
              className={[
                'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm transition',
                viewMode === 'list'
                  ? 'bg-[var(--color-accent)] text-white'
                  : 'text-[var(--color-muted)] hover:bg-[var(--color-surface-2)]',
              ].join(' ')}
            >
              <List className="h-4 w-4" />
              <span className="hidden sm:inline">Lista</span>
            </button>
          </div>
        </div>
      </div>

      <FilterPanel
        open={filtersOpen}
        filters={filters}
        rarities={rarities}
        setSuggestions={setSuggestions}
        archetypeSuggestions={archetypeSuggestions}
        onChange={setFilters}
        onSetSearch={setSetSearch}
        onArchetypeSearch={setArchetypeSearch}
        onClear={() => {
          setFilters(DEFAULT_CATALOG_FILTERS)
          setSetSearch('')
          setArchetypeSearch('')
        }}
      />

      <div className="flex flex-wrap items-end justify-between gap-2">
        <p className="text-sm text-[var(--color-muted)]">
          {loading ? (
            'Buscando cartas...'
          ) : (
            <>
              <span className="font-semibold text-[var(--color-text)]">
                {total.toLocaleString('pt-BR')}
              </span>{' '}
              {total === 1 ? 'carta encontrada' : 'cartas encontradas'}
              {catalogCount !== null && (
                <span className="text-[var(--color-muted)]">
                  {' '}
                  · {catalogCount.toLocaleString('pt-BR')} no catálogo (
                  {language === 'pt' ? 'PT' : 'EN'})
                </span>
              )}
            </>
          )}
        </p>
      </div>

      {error && (
        <p className="rounded-lg border border-[var(--color-danger)]/40 bg-[var(--color-danger)]/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      {addFeedback && (
        <p className="rounded-lg border border-[var(--color-success)]/40 bg-[var(--color-success)]/10 px-3 py-2 text-sm text-green-300">
          {addFeedback}
        </p>
      )}

      {loading && viewMode === 'grid' && (
        <div className={gridCardSizeClass(gridSize)}>
          {Array.from({ length: 12 }).map((_, index) => (
            <div
              key={index}
              className="animate-pulse overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]"
            >
              <div className="aspect-[59/86] bg-[var(--color-surface-2)]" />
              <div className="space-y-2 p-3">
                <div className="h-3 rounded bg-[var(--color-surface-2)]" />
                <div className="h-3 w-2/3 rounded bg-[var(--color-surface-2)]" />
              </div>
            </div>
          ))}
        </div>
      )}

      {loading && viewMode === 'list' && (
        <div className="animate-pulse space-y-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="flex gap-3 py-2">
              <div className="h-16 w-11 rounded bg-[var(--color-surface-2)]" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-3 w-2/3 rounded bg-[var(--color-surface-2)]" />
                <div className="h-3 w-1/3 rounded bg-[var(--color-surface-2)]" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-16 text-center">
          <p className="text-lg font-medium">Nenhuma carta encontrada.</p>
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            Tente alterar os filtros ou utilizar outro termo de busca.
          </p>
        </div>
      )}

      {!loading && items.length > 0 && viewMode === 'grid' && (
        <CardGrid items={items} size={gridSize} />
      )}

      {!loading && items.length > 0 && viewMode === 'list' && (
        <CatalogListView items={items} onAddToCollection={handleAddToCollection} />
      )}

      {!loading && total > PAGE_SIZE && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            type="button"
            disabled={page === 0}
            onClick={() => setPage((current) => Math.max(0, current - 1))}
            className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-muted)] transition hover:bg-[var(--color-surface-2)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </button>
          <span className="text-sm text-[var(--color-muted)]">
            Página {page + 1} de {totalPages}
          </span>
          <button
            type="button"
            disabled={!hasMore}
            onClick={() => setPage((current) => current + 1)}
            className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-muted)] transition hover:bg-[var(--color-surface-2)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Próxima
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      <AddToCollectionModal
        open={addModalOpen}
        preset={addPreset}
        onClose={() => {
          setAddModalOpen(false)
          setAddPreset(null)
        }}
        onAdded={() => {
          setAddFeedback('Carta adicionada à coleção.')
          setTimeout(() => setAddFeedback(null), 2500)
        }}
      />
    </div>
  )
}
