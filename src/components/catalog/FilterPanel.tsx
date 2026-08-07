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
  onChange: (filters: CatalogFilters) => void
  onSetSearch: (value: string) => void
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
  onChange,
  onSetSearch,
  onClear,
}: FilterPanelProps) {
  if (!open) return null

  const rarityOptions = Array.from(
    new Set([...KNOWN_RARITIES, ...rarities]),
  ).sort((a, b) => a.localeCompare(b, 'en'))

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

        <fieldset className="md:col-span-2">
          <legend className="mb-2 text-sm text-[var(--color-muted)]">Coleção / Set</legend>
          <input
            type="text"
            value={filters.setName}
            onChange={(e) => {
              onChange({ ...filters, setName: e.target.value })
              onSetSearch(e.target.value)
            }}
            placeholder="Nome da coleção (ex.: Legend of Blue Eyes)"
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm outline-none ring-[var(--color-accent)] focus:ring-2"
            list="set-suggestions"
          />
          <datalist id="set-suggestions">
            {setSuggestions.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
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
