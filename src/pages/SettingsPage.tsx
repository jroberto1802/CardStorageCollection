import { useEffect, useState } from 'react'
import { Database, RefreshCw } from 'lucide-react'
import { useSettings } from '@/contexts/SettingsContext'
import { countCards, fetchLatestSyncLog, invokeSyncCards } from '@/services/syncService'
import type { AppLanguage, SyncLog } from '@/types'

function formatDate(value: string | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(new Date(value))
}

function languageLabel(language: AppLanguage) {
  return language === 'pt' ? 'Português' : 'Inglês'
}

export function SettingsPage() {
  const { language, setLanguage } = useSettings()
  const [syncing, setSyncing] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [latestLog, setLatestLog] = useState<SyncLog | null>(null)
  const [cardCount, setCardCount] = useState<number | null>(null)
  const [loadingMeta, setLoadingMeta] = useState(true)

  async function loadMeta() {
    setLoadingMeta(true)
    try {
      const [log, count] = await Promise.all([
        fetchLatestSyncLog(),
        countCards(language),
      ])
      setLatestLog(log)
      setCardCount(count)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar metadados')
    } finally {
      setLoadingMeta(false)
    }
  }

  useEffect(() => {
    void loadMeta()
  }, [language])

  async function handleSync() {
    setSyncing(true)
    setError(null)
    setMessage(null)

    const result = await invokeSyncCards(language)

    if (!result.success) {
      setError(result.error ?? 'Falha na sincronização')
    } else {
      setMessage(
        `Sincronização concluída: ${result.cards_synced ?? 0} cards em ${languageLabel(language)}.`,
      )
      await loadMeta()
    }

    setSyncing(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Idioma dos cards e sincronização com a API YGOPRODeck via Edge Function.
        </p>
      </div>

      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <h2 className="mb-4 text-lg font-medium">Idioma dos cards</h2>
        <p className="mb-4 text-sm text-[var(--color-muted)]">
          Define o idioma usado na sincronização e na leitura dos dados no Supabase.
        </p>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setLanguage('en')}
            className={[
              'rounded-lg border px-4 py-2 text-sm transition',
              language === 'en'
                ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-white'
                : 'border-[var(--color-border)] text-[var(--color-muted)] hover:bg-[var(--color-surface-2)]',
            ].join(' ')}
          >
            Inglês
          </button>
          <button
            type="button"
            onClick={() => setLanguage('pt')}
            className={[
              'rounded-lg border px-4 py-2 text-sm transition',
              language === 'pt'
                ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-white'
                : 'border-[var(--color-border)] text-[var(--color-muted)] hover:bg-[var(--color-surface-2)]',
            ].join(' ')}
          >
            Português
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-medium">Sincronização de cards</h2>
            <p className="mt-1 text-sm text-[var(--color-muted)]">
              Busca todas as cards na YGOPRODeck e grava/atualiza no Supabase. A
              aplicação consome apenas os dados do banco.
            </p>
          </div>
          <Database className="h-5 w-5 shrink-0 text-[var(--color-accent)]" />
        </div>

        <div className="mb-5 grid gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4 text-sm sm:grid-cols-3">
          <div>
            <p className="text-[var(--color-muted)]">Idioma atual</p>
            <p className="mt-1 font-medium">{languageLabel(language)}</p>
          </div>
          <div>
            <p className="text-[var(--color-muted)]">Cards no banco</p>
            <p className="mt-1 font-medium">
              {loadingMeta ? '...' : (cardCount ?? 0).toLocaleString('pt-BR')}
            </p>
          </div>
          <div>
            <p className="text-[var(--color-muted)]">Última sync</p>
            <p className="mt-1 font-medium">
              {loadingMeta
                ? '...'
                : latestLog
                  ? `${formatDate(latestLog.finished_at ?? latestLog.started_at)} (${latestLog.status})`
                  : 'Nunca'}
            </p>
          </div>
        </div>

        {latestLog?.error_message && (
          <p className="mb-4 rounded-lg border border-[var(--color-danger)]/40 bg-[var(--color-danger)]/10 px-3 py-2 text-sm text-red-300">
            Último erro: {latestLog.error_message}
          </p>
        )}

        {error && (
          <p className="mb-4 rounded-lg border border-[var(--color-danger)]/40 bg-[var(--color-danger)]/10 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}

        {message && (
          <p className="mb-4 rounded-lg border border-[var(--color-success)]/40 bg-[var(--color-success)]/10 px-3 py-2 text-sm text-green-300">
            {message}
          </p>
        )}

        <button
          type="button"
          onClick={() => void handleSync()}
          disabled={syncing}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-accent)] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--color-accent-hover)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Sincronizando...' : 'Sincronizar cards agora'}
        </button>

        <p className="mt-3 text-xs text-[var(--color-muted)]">
          A sincronização pode levar alguns minutos na primeira execução (milhares de
          cards).
        </p>
      </section>
    </div>
  )
}
