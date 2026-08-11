import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import {
  CARD_ATTRIBUTES,
  KNOWN_RARITIES,
  MONSTER_TYPE_OPTIONS,
  type CatalogFilters,
  type MonsterTypeFilter,
} from '@/types'

interface FilterPanelProps {
  open: boolean
  filters: CatalogFilters
  rarities: string[]
  setSuggestions: string[]
  archetypeSuggestions: string[]
  onChange: (filters: CatalogFilters) => void
  onSetSearch: (value: string) => void
  onArchetypeSearch: (value: string) => void
  onClear: () => void
}

function toggleInList<T extends string>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value]
}

export function FilterPanel({
  open,
  filters,
  rarities,
  setSuggestions,
  archetypeSuggestions,
  onChange,
  onSetSearch,
  onArchetypeSearch,
  onClear,
}: FilterPanelProps) {
  const [setSearch, setSetSearch] = useState(filters.setName)
  const [setPickerOpen, setSetPickerOpen] = useState(false)
  const setPickerRef = useRef<HTMLDivElement>(null)
  const [archetypeSearch, setArchetypeSearch] = useState(filters.archetype)
  const [archetypePickerOpen, setArchetypePickerOpen] = useState(false)
  const archetypePickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setSetSearch(filters.setName)
  }, [filters.setName])

  useEffect(() => {
    setArchetypeSearch(filters.archetype)
  }, [filters.archetype])

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

  if (!open) return null

  const rarityOptions = Array.from(
    new Set([...KNOWN_RARITIES, ...rarities]),
  ).sort((a, b) => a.localeCompare(b, 'en'))

  function handleSelectSet(name: string) {
    setSetSearch(name)
    onSetSearch(name)
    onChange({ ...filters, setName: name })
    setSetPickerOpen(false)
  }

  function handleClearSet() {
    setSetSearch('')
    onSetSearch('')
    onChange({ ...filters, setName: '' })
    setSetPickerOpen(false)
  }

  function handleSelectArchetype(name: string) {
    setArchetypeSearch(name)
    onArchetypeSearch(name)
    onChange({ ...filters, archetype: name })
    setArchetypePickerOpen(false)
  }

  function handleClearArchetype() {
    setArchetypeSearch('')
    onArchetypeSearch('')
    onChange({ ...filters, archetype: '' })
    setArchetypePickerOpen(false)
  }

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold tracking-wide uppercase">Filtros</h2>
        <button
          type="button"
          onClick={onClear}
          className="text-xs text-[var(--color-muted)] hover:text-[var(--color-accent)]"
        >
          Limpar filtros
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <fieldset>
          <legend className="mb-2 text-sm text-[var(--color-muted)]">Tipo de carta</legend>
          <div className="flex flex-wrap gap-2">
            {(
              [
                { value: 'monster' as const, label: 'Monstro' },
                { value: 'spell' as const, label: 'Magia' },
                { value: 'trap' as const, label: 'Armadilha' },
              ] as const
            ).map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() =>
                  onChange({
                    ...filters,
                    cardCategory:
                      filters.cardCategory === option.value ? null : option.value,
                    monsterTypes:
                      option.value === 'monster' ? filters.monsterTypes : [],
                  })
                }
                className={[
                  'rounded-lg border px-3 py-1.5 text-sm transition',
                  filters.cardCategory === option.value
                    ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-white'
                    : 'border-[var(--color-border)] text-[var(--color-muted)] hover:bg-[var(--color-surface-2)]',
                ].join(' ')}
              >
                {option.label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className={filters.cardCategory && filters.cardCategory !== 'monster' ? 'opacity-40' : ''}>
          <legend className="mb-2 text-sm text-[var(--color-muted)]">Tipo de monstro</legend>
          <div className="flex flex-wrap gap-2">
            {MONSTER_TYPE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                disabled={Boolean(filters.cardCategory && filters.cardCategory !== 'monster')}
                onClick={() =>
                  onChange({
                    ...filters,
                    cardCategory: filters.cardCategory ?? 'monster',
                    monsterTypes: toggleInList(
                      filters.monsterTypes,
                      option.value as MonsterTypeFilter,
                    ),
                  })
                }
                className={[
                  'rounded-lg border px-3 py-1.5 text-sm transition disabled:cursor-not-allowed',
                  filters.monsterTypes.includes(option.value)
                    ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-white'
                    : 'border-[var(--color-border)] text-[var(--color-muted)] hover:bg-[var(--color-surface-2)]',
                ].join(' ')}
              >
                {option.label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-sm text-[var(--color-muted)]">Atributo</legend>
          <div className="flex flex-wrap gap-2">
            {CARD_ATTRIBUTES.map((attribute) => (
              <button
                key={attribute}
                type="button"
                onClick={() =>
                  onChange({
                    ...filters,
                    attributes: toggleInList(filters.attributes, attribute),
                  })
                }
                className={[
                  'rounded-lg border px-3 py-1.5 text-sm transition',
                  filters.attributes.includes(attribute)
                    ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-white'
                    : 'border-[var(--color-border)] text-[var(--color-muted)] hover:bg-[var(--color-surface-2)]',
                ].join(' ')}
              >
                {attribute}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-sm text-[var(--color-muted)]">Região / Formato</legend>
          <div className="flex flex-wrap gap-2">
            {(['TCG', 'OCG'] as const).map((region) => (
              <button
                key={region}
                type="button"
                onClick={() =>
                  onChange({
                    ...filters,
                    region: filters.region === region ? null : region,
                  })
                }
                className={[
                  'rounded-lg border px-3 py-1.5 text-sm transition',
                  filters.region === region
                    ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-white'
                    : 'border-[var(--color-border)] text-[var(--color-muted)] hover:bg-[var(--color-surface-2)]',
                ].join(' ')}
              >
                {region}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-sm text-[var(--color-muted)]">Arquétipo</legend>
          <div className="relative" ref={archetypePickerRef}>
            <div className="relative">
              <input
                type="text"
                value={archetypeSearch}
                onChange={(e) => {
                  const value = e.target.value
                  setArchetypeSearch(value)
                  onArchetypeSearch(value)
                  setArchetypePickerOpen(true)
                  onChange({ ...filters, archetype: value })
                }}
                onFocus={() => setArchetypePickerOpen(true)}
                placeholder="Ex.: Blue-Eyes, Zoodiac..."
                autoComplete="off"
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] py-2 pr-10 pl-3 text-sm outline-none ring-[var(--color-accent)] focus:ring-2"
              />
              {(archetypeSearch || filters.archetype) && (
                <button
                  type="button"
                  title="Limpar"
                  onClick={handleClearArchetype}
                  className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-[var(--color-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {archetypePickerOpen && (
              <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl">
                {archetypeSuggestions.length === 0 ? (
                  <li className="px-3 py-3 text-sm text-[var(--color-muted)]">
                    Nenhum arquétipo encontrado.
                  </li>
                ) : (
                  archetypeSuggestions.map((name) => (
                    <li key={name}>
                      <button
                        type="button"
                        onClick={() => handleSelectArchetype(name)}
                        className={[
                          'flex w-full px-3 py-2.5 text-left text-sm transition hover:bg-[var(--color-surface-2)]',
                          filters.archetype === name
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
        </fieldset>

        <fieldset className="md:col-span-2">
          <legend className="mb-2 text-sm text-[var(--color-muted)]">Coleção / Set</legend>
          <div className="relative" ref={setPickerRef}>
            <div className="relative">
              <input
                type="text"
                value={setSearch}
                onChange={(e) => {
                  const value = e.target.value
                  setSetSearch(value)
                  onSetSearch(value)
                  setSetPickerOpen(true)
                  if (filters.setName && value !== filters.setName) {
                    onChange({ ...filters, setName: '' })
                  }
                }}
                onFocus={() => setSetPickerOpen(true)}
                placeholder="Digite nome ou set code (ex.: CH01, LOB)..."
                autoComplete="off"
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] py-2 pr-10 pl-3 text-sm outline-none ring-[var(--color-accent)] focus:ring-2"
              />
              {(setSearch || filters.setName) && (
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
                {setSuggestions.length === 0 ? (
                  <li className="px-3 py-3 text-sm text-[var(--color-muted)]">
                    Nenhuma coleção encontrada.
                  </li>
                ) : (
                  setSuggestions.map((name) => (
                    <li key={name}>
                      <button
                        type="button"
                        onClick={() => handleSelectSet(name)}
                        className={[
                          'flex w-full flex-col gap-0.5 px-3 py-2.5 text-left text-sm transition hover:bg-[var(--color-surface-2)]',
                          filters.setName === name
                            ? 'bg-[var(--color-accent)]/15'
                            : '',
                        ].join(' ')}
                      >
                        <span className="font-medium text-[var(--color-text)]">
                          {name}
                        </span>
                        <span className="text-xs text-[var(--color-muted)]">
                          Catálogo
                        </span>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            )}

            {filters.setName && (
              <p className="mt-2 text-xs text-[var(--color-muted)]">
                Selecionado:{' '}
                <span className="font-medium text-[var(--color-text)]">
                  {filters.setName}
                </span>
              </p>
            )}
          </div>
        </fieldset>

        <fieldset className="md:col-span-2 xl:col-span-3">
          <legend className="mb-2 text-sm text-[var(--color-muted)]">Raridade</legend>
          <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto pr-1">
            {rarityOptions.map((rarity) => (
              <button
                key={rarity}
                type="button"
                onClick={() =>
                  onChange({
                    ...filters,
                    rarities: toggleInList(filters.rarities, rarity),
                  })
                }
                className={[
                  'rounded-lg border px-3 py-1.5 text-sm transition',
                  filters.rarities.includes(rarity)
                    ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-white'
                    : 'border-[var(--color-border)] text-[var(--color-muted)] hover:bg-[var(--color-surface-2)]',
                ].join(' ')}
              >
                {rarity}
              </button>
            ))}
          </div>
        </fieldset>
      </div>
    </div>
  )
}
