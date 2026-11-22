import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Layers3 } from 'lucide-react'
import { CharacterAvatar } from '@/components/characters/CharacterAvatar'
import { DeckSectionTabs } from '@/components/deck/DeckSectionTabs'
import { listCollectionItems } from '@/services/collectionService'
import { getCharacterBySlug } from '@/services/characterService'
import { ownedQuantityByCardId } from '@/services/syncedDeckService'
import type { CharacterDetail } from '@/types'
import { buildListSearch, summarizeDeck } from '@/utils/characterView'

export function CharacterDetailPage() {
  const { slug } = useParams()
  const [searchParams] = useSearchParams()
  const [character, setCharacter] = useState<CharacterDetail | null>(null)
  const [ownedQty, setOwnedQty] = useState<Map<number, number> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let mounted = true
    async function load() {
      if (!slug) return
      setLoading(true)
      setCharacter(null)
      setError(null)
      setNotFound(false)
      try {
        const [data, items] = await Promise.all([
          getCharacterBySlug(slug),
          listCollectionItems().catch(() => null),
        ])
        if (!mounted) return
        setCharacter(data)
        setOwnedQty(items ? ownedQuantityByCardId(items) : null)
        if (!data) setNotFound(true)
      } catch {
        if (!mounted) return
        setCharacter(null)
        setError('Não foi possível carregar o personagem.')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    void load()
    return () => {
      mounted = false
    }
  }, [slug, reloadKey])

  const listSearch = buildListSearch({
    serie: searchParams.get('serie') ?? character?.series,
    q: searchParams.get('q'),
  })
  const backTo = `/characters${listSearch}`

  const backLink = (
    <Link
      to={backTo}
      className="inline-flex min-h-11 items-center gap-2 text-sm text-[var(--color-muted)] hover:text-[var(--color-accent)]"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      Voltar aos personagens
    </Link>
  )

  return (
    <div className="space-y-6">
      <DeckSectionTabs />
      {backLink}

      {loading && (
        <div
          className="flex animate-pulse items-center gap-4 motion-reduce:animate-none"
          aria-busy="true"
          aria-label="Carregando personagem"
        >
          <div className="h-28 w-28 rounded-2xl bg-[var(--color-surface-2)]" />
          <div className="space-y-2">
            <div className="h-4 w-24 rounded bg-[var(--color-surface-2)]" />
            <div className="h-6 w-48 rounded bg-[var(--color-surface-2)]" />
          </div>
        </div>
      )}

      {!loading && notFound && (
        <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-12 text-center">
          <p className="text-lg font-medium">Personagem não encontrado</p>
          <Link
            to="/characters"
            className="mt-4 inline-flex min-h-11 items-center rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-accent)] hover:bg-[var(--color-surface-2)]"
          >
            Ver todos os personagens
          </Link>
        </div>
      )}

      {!loading && error && (
        <div
          role="alert"
          className="rounded-2xl border border-[var(--color-danger)]/40 bg-[var(--color-danger)]/10 px-4 py-4 text-sm"
        >
          <p className="text-red-300">{error}</p>
          <button
            type="button"
            onClick={() => setReloadKey((key) => key + 1)}
            className="mt-3 min-h-11 rounded-lg border border-[var(--color-border)] px-4 py-2 font-medium hover:bg-[var(--color-surface-2)]"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {!loading && character && (
        <>
          <div className="flex items-center gap-4">
            <CharacterAvatar
              src={character.image}
              size={112}
              alt={`Avatar de ${character.name}`}
              rounded="rounded-2xl"
            />
            <div className="min-w-0">
              <p className="text-sm text-[var(--color-muted)]">{character.anime.name}</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight">{character.name}</h1>
              {character.description && (
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--color-muted)]">
                  {character.description}
                </p>
              )}
            </div>
          </div>

          <section aria-labelledby="character-decks-title" className="space-y-3">
            <h2 id="character-decks-title" className="text-sm font-semibold tracking-wide uppercase">
              Decks
            </h2>
            {character.decks.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-12 text-center">
                <Layers3 className="mx-auto h-8 w-8 text-[var(--color-muted)]" aria-hidden="true" />
                <p className="mt-3 text-sm text-[var(--color-muted)]">
                  Nenhum deck cadastrado para este personagem ainda.
                </p>
              </div>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2">
                {character.decks.map((deck) => {
                  const summary = ownedQty ? summarizeDeck(deck.lines, ownedQty) : null
                  return (
                    <li key={deck.linkId}>
                      <Link
                        to={`/characters/${character.slug}/decks/${deck.slug}${listSearch}`}
                        className="block h-full min-h-11 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition hover:border-[var(--color-accent)] motion-reduce:transition-none"
                      >
                        <p className="text-xs font-medium tracking-wide text-[var(--color-accent)] uppercase">
                          {deck.label ? `Deck ${deck.label}` : 'Deck'}
                        </p>
                        <h3 className="mt-1 text-lg font-semibold">{deck.name}</h3>
                        {deck.cardCount > 0 ? (
                          <p className="mt-2 text-sm text-[var(--color-muted)]">
                            Main {deck.zoneCounts.main} · Extra {deck.zoneCounts.extra} · Side{' '}
                            {deck.zoneCounts.side}
                          </p>
                        ) : (
                          <p className="mt-2 text-sm text-[var(--color-muted)]">
                            Cartas ainda não cadastradas
                          </p>
                        )}
                        {summary && summary.total > 0 && (
                          <p className="mt-2 text-sm font-medium">
                            Você tem {summary.owned}/{summary.total}
                          </p>
                        )}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  )
}
