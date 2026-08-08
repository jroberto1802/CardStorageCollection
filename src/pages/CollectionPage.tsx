import { useCallback, useEffect, useMemo, useState } from 'react'
import { BookOpen, Grid3X3, List, Plus } from 'lucide-react'
import { AddToCollectionModal } from '@/components/collection/AddToCollectionModal'
import { CollectionAlbumView } from '@/components/collection/CollectionAlbumView'
import { CollectionGridView } from '@/components/collection/CollectionGridView'
import { CollectionListView } from '@/components/collection/CollectionListView'
import { useSettings } from '@/contexts/SettingsContext'
import { useDebounce } from '@/hooks/useDebounce'
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
  const [view, setView] = useState<CollectionViewMode>('grid')
  const [items, setItems] = useState<CollectionItemWithCard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const [ownedSets, setOwnedSets] = useState<CollectionSetOption[]>([])
  const [setSearch, setSetSearch] = useState('')
  const debouncedSetSearch = useDebounce(setSearch, 300)
  const [catalogSets, setCatalogSets] = useState<string[]>([])
  const [selectedSetName, setSelectedSetName] = useState('')
  const [albumSlots, setAlbumSlots] = useState<AlbumSlot[]>([])
  const [albumLoading, setAlbumLoading] = useState(false)

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
    const map = new Map<string, string>()
    for (const set of ownedSets) {
      map.set(set.setName, `${set.setPrefix} · ${set.ownedCount} na coleção`)
    }
    for (const name of catalogSets) {
      if (!map.has(name)) map.set(name, 'Catálogo')
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], 'pt-BR'))
  }, [ownedSets, catalogSets])

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
              onClick={() => setView(option.value)}
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
      </div>

      {view === 'album' && (
        <div className="flex flex-col gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <label className="mb-1.5 block text-xs text-[var(--color-muted)]">
              Coleção (set)
            </label>
            <input
              value={setSearch}
              onChange={(e) => setSetSearch(e.target.value)}
              placeholder="Filtrar sets pelo nome..."
              className="mb-2 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm outline-none ring-[var(--color-accent)] focus:ring-2"
            />
            <select
              value={selectedSetName}
              onChange={(e) => setSelectedSetName(e.target.value)}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm outline-none ring-[var(--color-accent)] focus:ring-2"
            >
              <option value="">Selecione uma coleção...</option>
              {albumSetOptions.map(([name, hint]) => (
                <option key={name} value={name}>
                  {name} ({hint})
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {!loading && view !== 'album' && (
        <p className="text-sm text-[var(--color-muted)]">
          <span className="font-semibold text-[var(--color-text)]">
            {items.length.toLocaleString('pt-BR')}
          </span>{' '}
          {items.length === 1 ? 'item na coleção' : 'itens na coleção'}
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
        <CollectionGridView items={items} onRemove={(id) => void handleRemove(id)} />
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
