import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Layers3 } from 'lucide-react'
import { DeckSectionTabs } from '@/components/deck/DeckSectionTabs'
import { getCharacterBySlug } from '@/services/characterService'
import type { CharacterDetail } from '@/types'

export function CharacterDetailPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [character, setCharacter] = useState<CharacterDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    async function load() {
      if (!slug) return
      setLoading(true)
      setError(null)
      try {
        const data = await getCharacterBySlug(slug)
        if (!mounted) return
        setCharacter(data)
        if (!data) setError('Personagem não encontrado.')
      } catch (err) {
        if (!mounted) return
        setError(err instanceof Error ? err.message : 'Falha ao carregar personagem')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    void load()
    return () => {
      mounted = false
    }
  }, [slug])

  return (
    <div className="space-y-6">
      <DeckSectionTabs />
      <button
        type="button"
        onClick={() => navigate('/characters')}
        className="inline-flex items-center gap-2 text-sm text-[var(--color-muted)] hover:text-[var(--color-accent)]"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar aos personagens
      </button>

      {loading && (
        <p className="text-sm text-[var(--color-muted)]">Carregando personagem...</p>
      )}

      {error && (
        <p className="rounded-lg border border-[var(--color-danger)]/40 bg-[var(--color-danger)]/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      {character && (
        <>
          <div>
            <p className="text-sm text-[var(--color-muted)]">{character.anime.name}</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">{character.name}</h1>
            {character.japanese_name && (
              <p className="mt-1 text-sm text-[var(--color-muted)]">
                {character.japanese_name}
              </p>
            )}
            {character.description && (
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--color-muted)]">
                {character.description}
              </p>
            )}
          </div>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold tracking-wide uppercase">Decks</h2>
            {character.decks.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-12 text-center">
                <Layers3 className="mx-auto h-8 w-8 text-[var(--color-muted)]" />
                <p className="mt-3 text-sm text-[var(--color-muted)]">
                  Nenhum deck cadastrado para este personagem ainda.
                </p>
              </div>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {character.decks.map((deck) => (
                  <li key={deck.linkId}>
                    <Link
                      to={`/characters/${character.slug}/decks/${deck.slug}`}
                      className="block h-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition hover:border-[var(--color-accent)]"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-lg font-semibold">{deck.name}</h3>
                        {deck.isPrimary && (
                          <span className="rounded-full bg-[var(--color-accent)]/15 px-2 py-0.5 text-xs text-[var(--color-accent)]">
                            Principal
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-[var(--color-muted)]">{deck.name}</p>
                      {(deck.animeArc || deck.season) && (
                        <p className="mt-2 text-xs text-[var(--color-muted)]">
                          {[deck.animeArc, deck.season].filter(Boolean).join(' · ')}
                        </p>
                      )}
                      <p className="mt-3 text-sm text-[var(--color-muted)]">
                        {deck.cardCount > 0
                          ? `${deck.cardCount} carta${deck.cardCount === 1 ? '' : 's'}`
                          : 'Cartas ainda não cadastradas'}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  )
}
