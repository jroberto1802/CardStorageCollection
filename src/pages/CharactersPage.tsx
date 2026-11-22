import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Search } from 'lucide-react'
import { CharacterAvatar } from '@/components/characters/CharacterAvatar'
import { DeckSectionTabs } from '@/components/deck/DeckSectionTabs'
import { listCharacters } from '@/services/characterService'
import type { CharacterListItem } from '@/types'
import { buildListSearch, buildSeriesTabs, filterCharacters } from '@/utils/characterView'

const ALL = 'todos'

function SkeletonGrid() {
  return (
    <ul
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
      aria-hidden="true"
      data-testid="characters-skeleton"
    >
      {Array.from({ length: 9 }, (_, i) => (
        <li
          key={i}
          className="flex h-[88px] animate-pulse items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 motion-reduce:animate-none"
        >
          <div className="h-16 w-16 rounded-xl bg-[var(--color-surface-2)]" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-2/3 rounded bg-[var(--color-surface-2)]" />
            <div className="h-3 w-1/3 rounded bg-[var(--color-surface-2)]" />
          </div>
        </li>
      ))}
    </ul>
  )
}

export function CharactersPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [characters, setCharacters] = useState<CharacterListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([])

  const query = searchParams.get('q') ?? ''
  const serieParam = searchParams.get('serie')

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      setFailed(false)
      try {
        const rows = await listCharacters()
        if (mounted) setCharacters(rows)
      } catch {
        if (mounted) setFailed(true)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    void load()
    return () => {
      mounted = false
    }
  }, [reloadKey])

  const tabs = useMemo(() => buildSeriesTabs(characters), [characters])
  const activeSerie = serieParam && tabs.some((tab) => tab.key === serieParam) ? serieParam : null
  const filtered = useMemo(
    () => filterCharacters(characters, activeSerie, query),
    [characters, activeSerie, query],
  )

  const updateParams = useCallback(
    (next: { serie?: string | null; q?: string }) => {
      const params = new URLSearchParams(searchParams)
      if (next.serie !== undefined) {
        if (next.serie) params.set('serie', next.serie)
        else params.delete('serie')
      }
      if (next.q !== undefined) {
        if (next.q) params.set('q', next.q)
        else params.delete('q')
      }
      setSearchParams(params, { replace: true })
    },
    [searchParams, setSearchParams],
  )

  const tabItems = [{ key: ALL, label: 'Todos', count: characters.length }, ...tabs]
  const activeTabKey = activeSerie ?? ALL

  function onTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = index
    if (event.key === 'ArrowRight') next = (index + 1) % tabItems.length
    else if (event.key === 'ArrowLeft') next = (index - 1 + tabItems.length) % tabItems.length
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = tabItems.length - 1
    else return
    event.preventDefault()
    const item = tabItems[next]
    updateParams({ serie: item.key === ALL ? null : item.key })
    tabRefs.current[next]?.focus()
  }

  // Mantém o contexto da lista (aba ativa e busca) ao navegar.
  const serieQuery = () => buildListSearch({ serie: activeSerie, q: query })

  return (
    <div className="space-y-6">
      <DeckSectionTabs />

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Personagens</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Escolha um personagem para ver os decks usados na série.
        </p>
      </div>

      <div className="relative">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-[var(--color-muted)]"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => updateParams({ q: e.target.value })}
          aria-label="Buscar personagem"
          placeholder="Buscar personagem..."
          className="min-h-11 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] py-3 pr-4 pl-12 text-sm outline-none ring-[var(--color-accent)] transition focus:ring-2"
        />
      </div>

      {loading && <div aria-hidden="true" className="h-11" />}

      {tabs.length > 0 && (
        <div role="tablist" aria-label="Série" className="flex flex-wrap gap-2">
          {tabItems.map((tab, index) => {
            const selected = tab.key === activeTabKey
            return (
              <button
                key={tab.key}
                ref={(el) => {
                  tabRefs.current[index] = el
                }}
                id={`serie-tab-${tab.key}`}
                role="tab"
                type="button"
                aria-selected={selected}
                aria-controls="characters-panel"
                tabIndex={selected ? 0 : -1}
                onClick={() => updateParams({ serie: tab.key === ALL ? null : tab.key })}
                onKeyDown={(e) => onTabKeyDown(e, index)}
                className={[
                  'min-h-11 rounded-lg border px-4 py-2 text-sm font-medium transition motion-reduce:transition-none',
                  selected
                    ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-white'
                    : 'border-[var(--color-border)] text-[var(--color-muted)] hover:bg-[var(--color-surface-2)]',
                ].join(' ')}
              >
                {tab.label}
              </button>
            )
          })}
        </div>
      )}

      <div
        id="characters-panel"
        role={tabs.length > 0 ? 'tabpanel' : undefined}
        aria-labelledby={tabs.length > 0 ? `serie-tab-${activeTabKey}` : undefined}
        className="space-y-4"
      >
        <p aria-live="polite" className="text-sm text-[var(--color-muted)]">
          {loading || failed
            ? ''
            : `${filtered.length} ${filtered.length === 1 ? 'personagem' : 'personagens'}`}
        </p>

        {loading && <SkeletonGrid />}

        {!loading && failed && (
          <div
            role="alert"
            className="rounded-2xl border border-[var(--color-danger)]/40 bg-[var(--color-danger)]/10 px-4 py-4 text-sm"
          >
            <p className="text-red-300">Não foi possível carregar os personagens.</p>
            <button
              type="button"
              onClick={() => setReloadKey((key) => key + 1)}
              className="mt-3 min-h-11 rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium hover:bg-[var(--color-surface-2)]"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {!loading && !failed && characters.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-16 text-center">
            <p className="text-lg font-medium">Nenhum personagem cadastrado ainda.</p>
            <p className="mt-2 text-sm text-[var(--color-muted)]">
              Os personagens aparecerão aqui assim que forem importados.
            </p>
          </div>
        )}

        {!loading && !failed && characters.length > 0 && filtered.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-16 text-center">
            <p className="text-lg font-medium">
              {query ? `Nenhum personagem encontrado para “${query}”.` : 'Nenhum personagem nesta série.'}
            </p>
            {activeSerie && query && (
              <button
                type="button"
                onClick={() => updateParams({ serie: null })}
                className="mt-4 inline-flex min-h-11 items-center rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-accent)] hover:bg-[var(--color-surface-2)]"
              >
                Buscar em todas as séries
              </button>
            )}
            {query && (
              <button
                type="button"
                onClick={() => updateParams({ q: '' })}
                className="mt-4 ml-2 inline-flex min-h-11 items-center rounded-lg px-4 py-2 text-sm text-[var(--color-muted)] hover:text-[var(--color-text)]"
              >
                Limpar busca
              </button>
            )}
          </div>
        )}

        {!loading && !failed && filtered.length > 0 && (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((character) => (
              <li key={character.id}>
                <Link
                  to={`/characters/${character.slug}${serieQuery()}`}
                  className="flex min-h-[88px] items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 transition hover:border-[var(--color-accent)] motion-reduce:transition-none"
                >
                  <CharacterAvatar src={character.image_small} size={64} />
                  <div className="min-w-0">
                    <h2 className="text-sm leading-snug font-semibold">{character.name}</h2>
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--color-muted)]">
                      <span className="rounded-full bg-[var(--color-accent)]/15 px-2 py-0.5 text-[var(--color-accent)]">
                        {character.anime.name}
                      </span>
                      <span>
                        {character.deckCount === 0
                          ? 'Sem decks'
                          : `${character.deckCount} deck${character.deckCount === 1 ? '' : 's'}`}
                      </span>
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
