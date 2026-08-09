import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Layers3, Loader2, Plus, Trash2 } from 'lucide-react'
import { useSettings } from '@/contexts/SettingsContext'
import {
  createDeck,
  deleteDeck,
  listDecks,
} from '@/services/deckService'
import type { DeckSummary } from '@/types'

export function DecksPage() {
  const { language } = useSettings()
  const navigate = useNavigate()
  const [decks, setDecks] = useState<DeckSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setDecks(await listDecks())
    } catch (err) {
      setDecks([])
      setError(
        err instanceof Error
          ? err.message
          : 'Falha ao listar decks. Aplique a migration 003_decks.sql no Supabase.',
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function handleCreate() {
    setCreating(true)
    setError(null)
    try {
      const deck = await createDeck(language, 'Novo deck')
      navigate(`/decks/${deck.id}`)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Não foi possível criar o deck. Verifique a migration 003.',
      )
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`Excluir o deck "${name}"?`)) return
    try {
      await deleteDeck(id)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao excluir')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Decks</h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Monte decks com qualquer carta do catálogo — não é necessário possuí-las.
          </p>
        </div>
        <button
          type="button"
          disabled={creating}
          onClick={() => void handleCreate()}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-accent)] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--color-accent-hover)] disabled:opacity-60"
        >
          {creating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Criar deck
        </button>
      </div>

      {error && (
        <p className="rounded-lg border border-[var(--color-danger)]/40 bg-[var(--color-danger)]/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      {loading && (
        <p className="text-sm text-[var(--color-muted)]">Carregando decks...</p>
      )}

      {!loading && decks.length === 0 && (
        <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-16 text-center">
          <Layers3 className="mx-auto h-10 w-10 text-[var(--color-muted)]" />
          <p className="mt-3 text-lg font-medium">Nenhum deck ainda</p>
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            Crie seu primeiro deck e arraste cartas do catálogo.
          </p>
          <button
            type="button"
            disabled={creating}
            onClick={() => void handleCreate()}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-accent-hover)]"
          >
            <Plus className="h-4 w-4" />
            Criar deck
          </button>
        </div>
      )}

      {!loading && decks.length > 0 && (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {decks.map((deck) => (
            <li
              key={deck.id}
              className="group relative rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition hover:border-[var(--color-accent)]"
            >
              <Link to={`/decks/${deck.id}`} className="block pr-10">
                <h2 className="text-lg font-semibold">{deck.name}</h2>
                <p className="mt-2 text-sm text-[var(--color-muted)]">
                  Principal{' '}
                  <span className="font-semibold text-[var(--color-text)]">
                    {deck.mainCount}
                  </span>
                  {' · '}
                  Extra{' '}
                  <span className="font-semibold text-[var(--color-text)]">
                    {deck.extraCount}
                  </span>
                  {deck.sideCount > 0 && (
                    <>
                      {' · '}
                      Side{' '}
                      <span className="font-semibold text-[var(--color-text)]">
                        {deck.sideCount}
                      </span>
                    </>
                  )}
                </p>
                <p className="mt-1 text-xs text-[var(--color-muted)]">
                  Atualizado{' '}
                  {new Date(deck.updated_at).toLocaleString('pt-BR', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })}
                </p>
              </Link>
              <button
                type="button"
                title="Excluir"
                onClick={() => void handleDelete(deck.id, deck.name)}
                className="absolute top-3 right-3 rounded-lg p-2 text-[var(--color-muted)] opacity-0 transition group-hover:opacity-100 hover:bg-[var(--color-danger)]/15 hover:text-[var(--color-danger)]"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
