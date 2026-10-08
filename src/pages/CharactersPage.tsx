import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, UserRound } from 'lucide-react'
import { DeckSectionTabs } from '@/components/deck/DeckSectionTabs'
import { useDebounce } from '@/hooks/useDebounce'
import { listAnimes, listCharacters } from '@/services/characterService'
import type { Anime, CharacterListItem } from '@/types'
import { normalizeQuery } from '@/utils/cardHelpers'

function matchesSearch(character: CharacterListItem, query: string) {
  if (!query) return true
  const q = query.toLowerCase()
  return (
    character.name.toLowerCase().includes(q) ||
    (character.japanese_name ?? '').toLowerCase().includes(q) ||
    character.slug.toLowerCase().includes(q) ||
    character.anime.name.toLowerCase().includes(q) ||
    character.anime.slug.toLowerCase().includes(q)
  )
}

export function CharactersPage() {
  const [animes, setAnimes] = useState<Anime[]>([])
  const [characters, setCharacters] = useState<CharacterListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [animeSlug, setAnimeSlug] = useState<string | null>(null)
  const [duelistsOnly, setDuelistsOnly] = useState(false)
  const debouncedQuery = useDebounce(query, 250)

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [animeRows, characterRows] = await Promise.all([
          listAnimes(),
          listCharacters(),
        ])
        if (!mounted) return
        setAnimes(animeRows)
        setCharacters(characterRows)
      } catch (err) {
        if (!mounted) return
        setError(
          err instanceof Error
            ? err.message
            : 'Falha ao listar personagens. Aplique a migration 011_anime_characters.sql.',
        )
      } finally {
        if (mounted) setLoading(false)
      }
    }
    void load()
    return () => {
      mounted = false
    }
  }, [])

  const filtered = useMemo(() => {
    const q = normalizeQuery(debouncedQuery)
    return characters.filter((character) => {
      if (animeSlug && character.anime.slug !== animeSlug) return false
      if (duelistsOnly && !character.is_duelist) return false
      return matchesSearch(character, q)
    })
  }, [characters, animeSlug, duelistsOnly, debouncedQuery])

  const groups = useMemo(() => {
    const byAnime = new Map<string, { anime: Anime; items: CharacterListItem[] }>()
    for (const anime of animes) {
      if (animeSlug && anime.slug !== animeSlug) continue
      byAnime.set(anime.id, { anime, items: [] })
    }
    for (const character of filtered) {
      const group = byAnime.get(character.anime.id)
      if (group) group.items.push(character)
    }
    return [...byAnime.values()].filter((group) => group.items.length > 0)
  }, [animes, filtered, animeSlug])

  return (
    <div className="space-y-6">
      <DeckSectionTabs />

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Personagens</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Escolha o anime e o personagem para ver os decks usados na série.
        </p>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-[var(--color-muted)]" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nome, nome japonês ou anime..."
          className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] py-3 pr-4 pl-12 text-sm outline-none ring-[var(--color-accent)] transition focus:ring-2"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setAnimeSlug(null)}
          className={[
            'rounded-lg border px-3 py-1.5 text-sm transition',
            animeSlug === null
              ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-white'
              : 'border-[var(--color-border)] text-[var(--color-muted)] hover:bg-[var(--color-surface-2)]',
          ].join(' ')}
        >
          Todos
        </button>
        {animes.map((anime) => (
          <button
            key={anime.id}
            type="button"
            onClick={() => setAnimeSlug(anime.slug)}
            className={[
              'rounded-lg border px-3 py-1.5 text-sm transition',
              animeSlug === anime.slug
                ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-white'
                : 'border-[var(--color-border)] text-[var(--color-muted)] hover:bg-[var(--color-surface-2)]',
            ].join(' ')}
          >
            {anime.name}
          </button>
        ))}
        <label className="ml-auto inline-flex items-center gap-2 text-sm text-[var(--color-muted)]">
          <input
            type="checkbox"
            checked={duelistsOnly}
            onChange={(e) => setDuelistsOnly(e.target.checked)}
            className="accent-[var(--color-accent)]"
          />
          Somente duelistas
        </label>
      </div>

      {error && (
        <p className="rounded-lg border border-[var(--color-danger)]/40 bg-[var(--color-danger)]/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      {loading && (
        <p className="text-sm text-[var(--color-muted)]">Carregando personagens...</p>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-16 text-center">
          <p className="text-lg font-medium">Nenhum personagem encontrado.</p>
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            Tente outro nome ou altere o anime selecionado.
          </p>
        </div>
      )}

      {!loading &&
        groups.map((group) => (
          <section key={group.anime.id} className="space-y-3">
            <h2 className="text-lg font-semibold">{group.anime.name}</h2>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {group.items.map((character) => (
                <li key={character.id}>
                  <Link
                    to={`/characters/${character.slug}`}
                    className="flex h-full flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition hover:border-[var(--color-accent)]"
                  >
                    <div className="mb-3 flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl bg-[var(--color-surface-2)] text-[var(--color-accent)]">
                      {character.image ? (
                        <img
                          src={character.image}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <UserRound className="h-7 w-7" />
                      )}
                    </div>
                    <h3 className="text-sm font-semibold leading-snug">{character.name}</h3>
                    {character.japanese_name && (
                      <p className="mt-1 text-xs text-[var(--color-muted)]">
                        {character.japanese_name}
                      </p>
                    )}
                    <p className="mt-auto pt-2 text-xs text-[var(--color-muted)]">
                      {character.anime.name}
                      {' · '}
                      {character.deckCount === 0
                        ? 'Sem decks'
                        : `${character.deckCount} deck${character.deckCount === 1 ? '' : 's'}`}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
    </div>
  )
}
