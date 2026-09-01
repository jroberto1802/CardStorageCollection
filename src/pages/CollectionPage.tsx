import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { BookOpen, Grid3X3, List, Plus, ScanLine, Search, X } from 'lucide-react'
import { AddToCollectionModal } from '@/components/collection/AddToCollectionModal'
import { CollectionAlbumView } from '@/components/collection/CollectionAlbumView'
import { CollectionGridView } from '@/components/collection/CollectionGridView'
import { CollectionListView } from '@/components/collection/CollectionListView'
import { CollectionStatsCards } from '@/components/collection/CollectionStatsCards'
import { GridSizeControl } from '@/components/common/GridSizeControl'
import { useSettings } from '@/contexts/SettingsContext'
import { useDebounce } from '@/hooks/useDebounce'
import { useGridCardSize } from '@/hooks/useGridCardSize'
import { getDistinctSetNames } from '@/services/catalogService'
import { getUsdBrlRate } from '@/services/currencyService'
import {
  addToCollection,
  buildAlbumSlots,
  getOwnedSetOptions,
  listCollectionWithCards,
  removeFromCollection,
  updateCollectionQuantity,
} from '@/services/collectionService'
import { albumSlotKey } from '@/components/collection/CollectionAlbumView'
import {
  computeCollectionStats,
  matchesCollectionArchetype,
  matchesCollectionSearch,
} from '@/utils/cardHelpers'
import type {
  AlbumSlot,
  CollectionItemWithCard,
  CollectionSetOption,
  CollectionViewMode,
} from '@/types'

const VIEW_OPTIONS: { value: CollectionViewMode; label: string; icon: typeof List }[] = [
  { value: 'list', label: 'Listagem', icon: List },
  { value: 'grid', label: 'Quadros', icon: Grid3X3 },
  { value: 'album', label: 'Álbum', icon: BookOpen },
]

export function CollectionPage() {
  const { language } = useSettings()
  const [searchParams, setSearchParams] = useSearchParams()
  const [view, setView] = useState<CollectionViewMode>(() => {
    const viewParam = searchParams.get('view')
    if (viewParam === 'list' || viewParam === 'grid' || viewParam === 'album') {
      return viewParam
    }
    return searchParams.get('set') ? 'album' : 'grid'
  })
  const { gridSize, setGridSize } = useGridCardSize()
  const [items, setItems] = useState<CollectionItemWithCard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const [ownedSets, setOwnedSets] = useState<CollectionSetOption[]>([])
  const initialSet = searchParams.get('set') ?? ''
  const [setSearch, setSetSearch] = useState(initialSet)
  const debouncedSetSearch = useDebounce(setSearch, 300)
  const [catalogSets, setCatalogSets] = useState<string[]>([])
  const [selectedSetName, setSelectedSetName] = useState(initialSet)
  const [setPickerOpen, setSetPickerOpen] = useState(false)
  const setPickerRef = useRef<HTMLDivElement>(null)
  const [albumSlots, setAlbumSlots] = useState<AlbumSlot[]>([])
  const [albumLoading, setAlbumLoading] = useState(false)
  const [albumBusySlotKey, setAlbumBusySlotKey] = useState<string | null>(null)

  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounce(query, 300)
  const [archetypeSearch, setArchetypeSearch] = useState('')
  const [selectedArchetype, setSelectedArchetype] = useState('')
  const [archetypePickerOpen, setArchetypePickerOpen] = useState(false)
  const archetypePickerRef = useRef<HTMLDivElement>(null)
  const [usdBrlRate, setUsdBrlRate] = useState<number | null>(null)

  useEffect(() => {
    let mounted = true
    void getUsdBrlRate().then((rate) => {
      if (mounted) setUsdBrlRate(rate)
    })
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    const viewParam = searchParams.get('view')
    const setParam = searchParams.get('set') ?? ''

    if (viewParam === 'list' || viewParam === 'grid' || viewParam === 'album') {
      setView(viewParam)
    } else if (setParam) {
      setView('album')
    }

    if (setParam) {
      setSelectedSetName(setParam)
      setSetSearch(setParam)
    }
  }, [searchParams])

  const loadCollection = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [list, sets] = await Promise.all([
        listCollectionWithCards(language),
        getOwnedSetOptions(),
      ])
      setItems(list)
      setOwnedSets(sets)
    } catch (err) {
      setItems([])
      setOwnedSets([])
      setError(
        err instanceof Error
          ? err.message
          : 'Falha ao carregar coleção. Verifique se a migration foi aplicada.',
      )
    } finally {
      setLoading(false)
    }
  }, [language])

  const refreshCollectionData = useCallback(async () => {
    const [list, sets] = await Promise.all([
      listCollectionWithCards(language),
      getOwnedSetOptions(),
    ])
    setItems(list)
    setOwnedSets(sets)
  }, [language])

  useEffect(() => {
    void loadCollection()
  }, [loadCollection])

  useEffect(() => {
    let mounted = true

    async function loadSetSuggestions() {
      try {
        const names = await getDistinctSetNames(language, debouncedSetSearch, 40)
        if (mounted) setCatalogSets(names)
      } catch {
        if (mounted) setCatalogSets([])
      }
    }

    if (view === 'album') void loadSetSuggestions()
    return () => {
      mounted = false
    }
  }, [language, debouncedSetSearch, view])

  useEffect(() => {
    if (view !== 'album' || !selectedSetName) {
      setAlbumSlots([])
      return
    }

    let mounted = true

    async function loadAlbum() {
      setAlbumLoading(true)
      try {
        const slots = await buildAlbumSlots({
          language,
          setName: selectedSetName,
        })
        if (mounted) setAlbumSlots(slots)
      } catch (err) {
        if (mounted) {
          setAlbumSlots([])
          setError(err instanceof Error ? err.message : 'Falha ao montar álbum')
        }
      } finally {
        if (mounted) setAlbumLoading(false)
      }
    }

    void loadAlbum()
    return () => {
      mounted = false
    }
  }, [view, selectedSetName, language, items])

  const albumSetOptions = useMemo(() => {
    const q = debouncedSetSearch.trim().toLowerCase()
    const map = new Map<string, { hint: string; ownedCount: number }>()

    for (const set of ownedSets) {
      const matchesOwned =
        !q ||
        set.setName.toLowerCase().includes(q) ||
        set.setPrefix.toLowerCase().includes(q) ||
        set.setCodes.some((code) => code.toLowerCase().includes(q))

      if (matchesOwned) {
        map.set(set.setName, {
          hint: `${set.setPrefix} · ${set.ownedCount} na coleção`,
          ownedCount: set.ownedCount,
        })
      }
    }

    for (const name of catalogSets) {
      if (!map.has(name)) {
        map.set(name, { hint: 'Catálogo', ownedCount: 0 })
      }
    }

    return [...map.entries()]
      .map(([name, meta]) => [name, meta.hint, meta.ownedCount] as const)
      .sort((a, b) => {
        if (b[2] !== a[2]) return b[2] - a[2]
        return a[0].localeCompare(b[0], 'pt-BR')
      })
  }, [ownedSets, catalogSets, debouncedSetSearch])

  useEffect(() => {
    if (!setPickerOpen && !archetypePickerOpen) return

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node
      if (
        setPickerOpen &&
        setPickerRef.current &&
        !setPickerRef.current.contains(target)
      ) {
        setSetPickerOpen(false)
      }
      if (
        archetypePickerOpen &&
        archetypePickerRef.current &&
        !archetypePickerRef.current.contains(target)
      ) {
        setArchetypePickerOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [setPickerOpen, archetypePickerOpen])

  function handleSelectSet(name: string) {
    setSelectedSetName(name)
    setSetSearch(name)
    setSetPickerOpen(false)
    setView('album')
    setSearchParams({ view: 'album', set: name })
  }

  function handleClearSet() {
    setSelectedSetName('')
    setSetSearch('')
    setSetPickerOpen(false)
    setSearchParams({ view: 'album' })
  }

  function handleSelectArchetype(name: string) {
    setSelectedArchetype(name)
    setArchetypeSearch(name)
    setArchetypePickerOpen(false)
  }

  function handleClearArchetype() {
    setSelectedArchetype('')
    setArchetypeSearch('')
    setArchetypePickerOpen(false)
  }

  function handleChangeView(next: CollectionViewMode) {
    setView(next)
    if (next === 'album' && selectedSetName) {
      setSearchParams({ view: 'album', set: selectedSetName })
    } else if (next === 'album') {
      setSearchParams({ view: 'album' })
    } else {
      setSearchParams({ view: next })
    }
  }

  const archetypeOptions = useMemo(() => {
    const q = archetypeSearch.trim().toLowerCase()
    const names = new Set<string>()

    for (const item of items) {
      const archetype = item.card?.archetype?.trim()
      if (!archetype) continue
      if (!q || archetype.toLowerCase().includes(q)) {
        names.add(archetype)
      }
    }

    return [...names].sort((a, b) => a.localeCompare(b, 'en'))
  }, [items, archetypeSearch])

  const filteredItems = useMemo(() => {
    const archetypeFilter = selectedArchetype || archetypeSearch
    return items.filter(
      (item) =>
        matchesCollectionSearch(item, debouncedQuery) &&
        matchesCollectionArchetype(item, archetypeFilter),
    )
  }, [items, debouncedQuery, selectedArchetype, archetypeSearch])

  const totalCards = useMemo(
    () => filteredItems.reduce((sum, item) => sum + (item.quantity || 0), 0),
    [filteredItems],
  )

  const collectionStats = useMemo(() => computeCollectionStats(items), [items])

  async function handleRemove(id: string) {
    if (!window.confirm('Remover esta carta da coleção?')) return
    try {
      await removeFromCollection(id)
      await loadCollection()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao remover')
    }
  }

  async function handleAlbumAdjustQuantity(slot: AlbumSlot, delta: 1 | -1) {
    const key = albumSlotKey(slot)
    setAlbumBusySlotKey(key)
    setError(null)
    try {
      if (delta === 1) {
        await addToCollection({
          card_id: slot.cardId,
          language: slot.language,
          set_code: slot.setCode,
          set_name: slot.setName,
          set_rarity: slot.setRarity === '—' ? '' : slot.setRarity,
          quantity: 1,
        })
      } else {
        if (!slot.collectionItemId || slot.quantity <= 0) return
        await updateCollectionQuantity(slot.collectionItemId, slot.quantity - 1)
      }
      await refreshCollectionData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao atualizar coleção')
    } finally {
      setAlbumBusySlotKey(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Minha coleção</h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Gerencie as cartas que você possui (incluindo as que só existem em inglês).
            No modo álbum, veja o progresso por coleção como figurinhas.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/scanner"
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-4 py-2.5 text-sm font-medium text-[var(--color-text)] transition hover:border-[var(--color-accent)] hover:bg-[var(--color-accent)]/10"
          >
            <ScanLine className="h-4 w-4 text-[var(--color-accent)]" />
            Escanear carta
          </Link>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-accent)] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--color-accent-hover)]"
          >
            <Plus className="h-4 w-4" />
            Adicionar carta
          </button>
        </div>
      </div>

      <CollectionStatsCards
        stats={collectionStats}
        items={items}
        usdBrlRate={usdBrlRate}
        loading={loading}
      />

      <div className="flex flex-wrap items-center gap-2">
        {VIEW_OPTIONS.map((option) => {
          const Icon = option.icon
          const active = view === option.value
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => handleChangeView(option.value)}
              className={[
                'inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition',
                active
                  ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/15 text-[var(--color-text)]'
                  : 'border-[var(--color-border)] text-[var(--color-muted)] hover:bg-[var(--color-surface-2)]',
              ].join(' ')}
            >
              <Icon className="h-4 w-4" />
              {option.label}
            </button>
          )
        })}
        {view === 'grid' && (
          <div className="ml-auto">
            <GridSizeControl value={gridSize} onChange={setGridSize} />
          </div>
        )}
      </div>

      {view !== 'album' && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="relative min-w-0 flex-1">
            <label className="mb-1.5 block text-xs text-[var(--color-muted)]">
              Busca
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--color-muted)]" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por nome, set code, texto ou arquétipo..."
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] py-2.5 pr-10 pl-10 text-sm outline-none ring-[var(--color-accent)] focus:ring-2"
                autoComplete="off"
                spellCheck={false}
              />
              {query && (
                <button
                  type="button"
                  title="Limpar busca"
                  onClick={() => setQuery('')}
                  className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-[var(--color-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          <div className="relative w-full sm:max-w-xs" ref={archetypePickerRef}>
            <label className="mb-1.5 block text-xs text-[var(--color-muted)]">
              Arquétipo
            </label>
            <div className="relative">
              <input
                value={archetypeSearch}
                onChange={(e) => {
                  setArchetypeSearch(e.target.value)
                  setArchetypePickerOpen(true)
                  if (selectedArchetype && e.target.value !== selectedArchetype) {
                    setSelectedArchetype('')
                  }
                }}
                onFocus={() => setArchetypePickerOpen(true)}
                placeholder="Ex.: Blue-Eyes, Zoodiac..."
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] py-2.5 pr-10 pl-3 text-sm outline-none ring-[var(--color-accent)] focus:ring-2"
                autoComplete="off"
                spellCheck={false}
              />
              {(archetypeSearch || selectedArchetype) && (
                <button
                  type="button"
                  title="Limpar arquétipo"
                  onClick={handleClearArchetype}
                  className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-[var(--color-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {archetypePickerOpen && (
              <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl">
                {archetypeOptions.length === 0 ? (
                  <li className="px-3 py-3 text-sm text-[var(--color-muted)]">
                    Nenhum arquétipo encontrado.
                  </li>
                ) : (
                  archetypeOptions.map((name) => (
                    <li key={name}>
                      <button
                        type="button"
                        onClick={() => handleSelectArchetype(name)}
                        className={[
                          'flex w-full px-3 py-2.5 text-left text-sm transition hover:bg-[var(--color-surface-2)]',
                          selectedArchetype === name
                            ? 'bg-[var(--color-accent)]/15'
                            : '',
                        ].join(' ')}
                      >
                        <span className="font-medium text-[var(--color-text)]">
                          {name}
                        </span>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            )}
          </div>
        </div>
      )}

      {view === 'album' && (
        <div className="flex flex-col gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:flex-row sm:items-end">
          <div className="relative min-w-0 flex-1" ref={setPickerRef}>
            <label className="mb-1.5 block text-xs text-[var(--color-muted)]">
              Coleção (set)
            </label>
            <div className="relative">
              <input
                value={setSearch}
                onChange={(e) => {
                  setSetSearch(e.target.value)
                  setSetPickerOpen(true)
                  if (selectedSetName && e.target.value !== selectedSetName) {
                    setSelectedSetName('')
                  }
                }}
                onFocus={() => setSetPickerOpen(true)}
                placeholder="Digite nome ou set code (ex.: CH01, LOB)..."
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] py-2.5 pr-10 pl-3 text-sm outline-none ring-[var(--color-accent)] focus:ring-2"
                autoComplete="off"
              />
              {(setSearch || selectedSetName) && (
                <button
                  type="button"
                  title="Limpar"
                  onClick={handleClearSet}
                  className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-[var(--color-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {setPickerOpen && (
              <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl">
                {albumSetOptions.length === 0 ? (
                  <li className="px-3 py-3 text-sm text-[var(--color-muted)]">
                    Nenhuma coleção encontrada.
                  </li>
                ) : (
                  albumSetOptions.map(([name, hint]) => (
                    <li key={name}>
                      <button
                        type="button"
                        onClick={() => handleSelectSet(name)}
                        className={[
                          'flex w-full flex-col gap-0.5 px-3 py-2.5 text-left text-sm transition hover:bg-[var(--color-surface-2)]',
                          selectedSetName === name
                            ? 'bg-[var(--color-accent)]/15'
                            : '',
                        ].join(' ')}
                      >
                        <span className="font-medium text-[var(--color-text)]">
                          {name}
                        </span>
                        <span className="text-xs text-[var(--color-muted)]">
                          {hint}
                        </span>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            )}

            {selectedSetName && (
              <p className="mt-2 text-xs text-[var(--color-muted)]">
                Selecionado:{' '}
                <span className="font-medium text-[var(--color-text)]">
                  {selectedSetName}
                </span>
              </p>
            )}
          </div>
        </div>
      )}

      {!loading && view !== 'album' && (
        <p className="text-sm text-[var(--color-muted)]">
          <span className="font-semibold text-[var(--color-text)]">
            {totalCards.toLocaleString('pt-BR')}
          </span>{' '}
          {totalCards === 1 ? 'carta' : 'cartas'}
          {' · '}
          <span className="font-semibold text-[var(--color-text)]">
            {filteredItems.length.toLocaleString('pt-BR')}
          </span>{' '}
          {filteredItems.length === 1 ? 'impressão' : 'impressões'}
          {(query || selectedArchetype || archetypeSearch) && items.length > 0 && (
            <span>
              {' '}
              · {items.length.toLocaleString('pt-BR')} no total
            </span>
          )}
        </p>
      )}

      {error && (
        <p className="rounded-lg border border-[var(--color-danger)]/40 bg-[var(--color-danger)]/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      {loading && view !== 'album' && (
        <p className="text-sm text-[var(--color-muted)]">Carregando coleção...</p>
      )}

      {!loading && view !== 'album' && items.length === 0 && (
        <EmptyCollection onAdd={() => setModalOpen(true)} />
      )}
      {!loading &&
        view !== 'album' &&
        items.length > 0 &&
        filteredItems.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-16 text-center">
            <p className="text-lg font-medium">Nenhuma carta encontrada.</p>
            <p className="mt-2 text-sm text-[var(--color-muted)]">
              Tente alterar a busca ou o filtro de arquétipo.
            </p>
          </div>
        )}

      {!loading && view === 'list' && filteredItems.length > 0 && (
        <CollectionListView
          items={filteredItems}
          onRemove={(id) => void handleRemove(id)}
        />
      )}
      {!loading && view === 'grid' && filteredItems.length > 0 && (
        <CollectionGridView
          items={filteredItems}
          size={gridSize}
          usdBrlRate={usdBrlRate}
          onRemove={(id) => void handleRemove(id)}
        />
      )}
      {view === 'album' && (
        <CollectionAlbumView
          slots={albumSlots}
          setName={selectedSetName}
          loading={albumLoading}
          busySlotKey={albumBusySlotKey}
          onAdjustQuantity={(slot, delta) => void handleAlbumAdjustQuantity(slot, delta)}
        />
      )}

      <AddToCollectionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onAdded={() => void loadCollection()}
      />
    </div>
  )
}

function EmptyCollection({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-16 text-center">
      <p className="text-lg font-medium">Sua coleção está vazia</p>
      <p className="mt-2 text-sm text-[var(--color-muted)]">
        Adicione cartas pelo botão acima ou a partir do detalhe no catálogo.
      </p>
      <button
        type="button"
        onClick={onAdd}
        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-accent-hover)]"
      >
        <Plus className="h-4 w-4" />
        Adicionar primeira carta
      </button>
    </div>
  )
}
