import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { BookOpen, Grid3X3, List, Plus, X } from 'lucide-react'
import { AddToCollectionModal } from '@/components/collection/AddToCollectionModal'
import { CollectionAlbumView } from '@/components/collection/CollectionAlbumView'
import { CollectionGridView } from '@/components/collection/CollectionGridView'
import { CollectionListView } from '@/components/collection/CollectionListView'
import { GridSizeControl } from '@/components/common/GridSizeControl'
import { useSettings } from '@/contexts/SettingsContext'
import { useDebounce } from '@/hooks/useDebounce'
import { useGridCardSize } from '@/hooks/useGridCardSize'
import { getDistinctSetNames } from '@/services/catalogService'
import {
  buildAlbumSlots,
  getOwnedSetOptions,
  listCollectionWithCards,
  removeFromCollection,
} from '@/services/collectionService'
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
    if (!setPickerOpen) return

    function handlePointerDown(event: MouseEvent) {
      if (
        setPickerRef.current &&
        !setPickerRef.current.contains(event.target as Node)
      ) {
        setSetPickerOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [setPickerOpen])

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

  const totalCards = useMemo(
    () => items.reduce((sum, item) => sum + (item.quantity || 0), 0),
    [items],
  )

  async function handleRemove(id: string) {
    if (!window.confirm('Remover esta carta da coleção?')) return
    try {
      await removeFromCollection(id)
      await loadCollection()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao remover')
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
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-accent)] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--color-accent-hover)]"
        >
          <Plus className="h-4 w-4" />
          Adicionar carta
        </button>
      </div>

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
            {items.length.toLocaleString('pt-BR')}
          </span>{' '}
          {items.length === 1 ? 'impressão' : 'impressões'}
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

      {!loading && view === 'list' && items.length === 0 && (
        <EmptyCollection onAdd={() => setModalOpen(true)} />
      )}
      {!loading && view === 'grid' && items.length === 0 && (
        <EmptyCollection onAdd={() => setModalOpen(true)} />
      )}

      {!loading && view === 'list' && items.length > 0 && (
        <CollectionListView items={items} onRemove={(id) => void handleRemove(id)} />
      )}
      {!loading && view === 'grid' && items.length > 0 && (
        <CollectionGridView
          items={items}
          size={gridSize}
          onRemove={(id) => void handleRemove(id)}
        />
      )}
      {view === 'album' && (
        <CollectionAlbumView
          slots={albumSlots}
          setName={selectedSetName}
          loading={albumLoading}
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
