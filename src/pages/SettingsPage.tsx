import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Database, ImageIcon, Layers, RefreshCw } from 'lucide-react'
import { useSettings } from '@/contexts/SettingsContext'
import {
  fetchImageSyncStatus,
  formatBytes,
  invokeSyncCardImagesSmall,
} from '@/services/imageSyncService'
import {
  cancelMdmDeckSync,
  deckSyncProgressPercent,
  fetchMdmDeckSyncStatus,
  processMdmDeckSyncBatch,
  startMdmDeckSync,
} from '@/services/mdmDeckSyncService'
import { countCards, fetchLatestSyncLog, invokeSyncCards } from '@/services/syncService'
import type {
  AppLanguage,
  DeckSyncRun,
  SyncCardImagesStatus,
  SyncLog,
} from '@/types'

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

  const [imageStatus, setImageStatus] = useState<SyncCardImagesStatus | null>(null)
  const [imageSyncing, setImageSyncing] = useState(false)
  const [imageMessage, setImageMessage] = useState<string | null>(null)
  const [imageError, setImageError] = useState<string | null>(null)
  const [imageProgress, setImageProgress] = useState({
    mirrored: 0,
    failed: 0,
    batches: 0,
  })
  const stopImageSyncRef = useRef(false)

  const [deckSyncing, setDeckSyncing] = useState(false)
  const [deckRun, setDeckRun] = useState<DeckSyncRun | null>(null)
  const [deckMessage, setDeckMessage] = useState<string | null>(null)
  const [deckError, setDeckError] = useState<string | null>(null)
  const stopDeckSyncRef = useRef(false)

  async function loadMeta() {
    setLoadingMeta(true)
    try {
      const [log, count, status] = await Promise.all([
        fetchLatestSyncLog(),
        countCards(language),
        fetchImageSyncStatus(language),
      ])
      setLatestLog(log)
      setCardCount(count)
      setImageStatus(status)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar metadados')
    }

    try {
      const deckStatus = await fetchMdmDeckSyncStatus()
      if (deckStatus.success) {
        setDeckRun(deckStatus.run ?? null)
        setDeckError(null)
      } else if (deckStatus.error) {
        setDeckError(deckStatus.error)
      }
    } catch (err) {
      setDeckError(
        err instanceof Error ? err.message : 'Falha ao carregar status dos decks',
      )
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

  async function handleImageSync() {
    stopImageSyncRef.current = false
    setImageSyncing(true)
    setImageError(null)
    setImageMessage(null)
    setImageProgress({ mirrored: 0, failed: 0, batches: 0 })

    let afterId = 0
    let totalMirrored = 0
    let totalFailed = 0
    let batches = 0
    let lastStorage = imageStatus?.storage_bytes ?? 0

    try {
      for (;;) {
        if (stopImageSyncRef.current) {
          setImageMessage(
            `Sincronização de miniaturas interrompida. ${totalMirrored} imagens espelhadas.`,
          )
          break
        }

        const result = await invokeSyncCardImagesSmall({
          language,
          afterId,
          batchSize: 40,
        })

        if (!result.success) {
          setImageError(result.error ?? 'Falha ao espelhar miniaturas')
          break
        }

        batches += 1
        totalMirrored += result.mirrored ?? 0
        totalFailed += result.failed ?? 0
        afterId = result.after_id ?? afterId
        lastStorage = result.storage_bytes ?? lastStorage

        setImageProgress({
          mirrored: totalMirrored,
          failed: totalFailed,
          batches,
        })
        setImageStatus((prev) => ({
          ...(prev ?? { success: true }),
          success: true,
          storage_bytes: result.storage_bytes,
          storage_soft_limit_bytes: result.storage_soft_limit_bytes,
          near_quota: result.stopped_for_quota,
          stopped_for_quota: result.stopped_for_quota,
        }))

        if (result.stopped_for_quota) {
          setImageMessage(
            result.message ??
              `Limite soft de Storage atingido (${formatBytes(lastStorage)}). ${totalMirrored} miniaturas espelhadas.`,
          )
          break
        }

        if (!result.has_more) {
          setImageMessage(
            `Miniaturas sincronizadas: ${totalMirrored} espelhadas` +
              (totalFailed ? `, ${totalFailed} falhas` : '') +
              `. Uso estimado: ${formatBytes(lastStorage)}.`,
          )
          break
        }
      }

      const status = await fetchImageSyncStatus(language)
      setImageStatus(status)
    } catch (err) {
      setImageError(err instanceof Error ? err.message : 'Falha inesperada nas imagens')
    } finally {
      setImageSyncing(false)
    }
  }

  function handleStopImageSync() {
    stopImageSyncRef.current = true
  }

  async function handleDeckSync(forceRestart = false) {
    stopDeckSyncRef.current = false
    setDeckSyncing(true)
    setDeckError(null)
    setDeckMessage(null)

    try {
      const started = await startMdmDeckSync({
        language,
        batchSize: 25,
        forceRestart,
      })

      if (!started.success || !started.run) {
        setDeckError(started.error ?? 'Falha ao iniciar sincronização de decks')
        return
      }

      let run = started.run
      setDeckRun(run)

      for (;;) {
        if (stopDeckSyncRef.current) {
          await cancelMdmDeckSync({ runId: run.id })
          setDeckMessage('Cancelamento solicitado. Encerrando no lote atual...')
        }

        const result = await processMdmDeckSyncBatch({ runId: run.id })

        if (result.run) {
          run = result.run
          setDeckRun(run)
        }

        if (!result.success && result.retryable) {
          // Retry limitado no cliente: até 3 tentativas do mesmo lote
          let recovered = false
          for (let attempt = 1; attempt <= 3; attempt += 1) {
            await new Promise((r) => setTimeout(r, 500 * attempt))
            const retry = await processMdmDeckSyncBatch({ runId: run.id })
            if (retry.run) {
              run = retry.run
              setDeckRun(run)
            }
            if (retry.success) {
              recovered = true
              if (!retry.has_more) {
                setDeckMessage(
                  `Sincronização de decks concluída: ${run.created_count} criados, ${run.updated_count} atualizados, ${run.error_count} erros.`,
                )
                return
              }
              break
            }
            if (!retry.retryable) {
              setDeckError(retry.error ?? 'Falha na sincronização de decks')
              return
            }
          }
          if (!recovered) {
            setDeckError(result.error ?? 'Falha após retries na sincronização de decks')
            return
          }
          continue
        }

        if (!result.success) {
          setDeckError(result.error ?? 'Falha na sincronização de decks')
          break
        }

        if (run.status === 'CANCELLED' || result.message?.includes('cancelada')) {
          setDeckMessage(
            `Sincronização cancelada. Processados: ${run.processed.toLocaleString('pt-BR')}.`,
          )
          break
        }

        if (!result.has_more || run.status === 'COMPLETED') {
          setDeckMessage(
            `Sincronização de decks concluída: ${run.created_count.toLocaleString('pt-BR')} criados, ${run.updated_count.toLocaleString('pt-BR')} atualizados, ${run.error_count.toLocaleString('pt-BR')} erros` +
              (run.missing_card_events
                ? `, ${run.missing_card_events.toLocaleString('pt-BR')} cartas não encontradas`
                : '') +
              '.',
          )
          break
        }
      }

      const status = await fetchMdmDeckSyncStatus({ runId: run.id })
      if (status.run) setDeckRun(status.run)
    } catch (err) {
      setDeckError(err instanceof Error ? err.message : 'Falha inesperada nos decks')
    } finally {
      setDeckSyncing(false)
    }
  }

  async function handleStopDeckSync() {
    stopDeckSyncRef.current = true
    if (deckRun?.id) {
      await cancelMdmDeckSync({ runId: deckRun.id })
    }
  }

  const pendingLabel = (() => {
    if (loadingMeta) return '...'
    if (!imageStatus?.success) return '—'
    if (imageStatus.pending_small == null) {
      return `Muitas (amostra: ${imageStatus.sample_scanned ?? 0} cards)`
    }
    return imageStatus.pending_small.toLocaleString('pt-BR')
  })()

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
          disabled={syncing || imageSyncing || deckSyncing}
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

      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-medium">Imagens (Storage)</h2>
            <p className="mt-1 text-sm text-[var(--color-muted)]">
              Espelha miniaturas no Supabase Storage (plano Free: ~1 GB). Imagens full
              são baixadas sob demanda ao abrir o detalhe da carta.
            </p>
          </div>
          <ImageIcon className="h-5 w-5 shrink-0 text-[var(--color-accent)]" />
        </div>

        <div className="mb-5 grid gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4 text-sm sm:grid-cols-3">
          <div>
            <p className="text-[var(--color-muted)]">Uso estimado</p>
            <p className="mt-1 font-medium">
              {loadingMeta
                ? '...'
                : `${formatBytes(imageStatus?.storage_bytes)} / ${formatBytes(imageStatus?.storage_soft_limit_bytes ?? 900 * 1024 * 1024)}`}
            </p>
          </div>
          <div>
            <p className="text-[var(--color-muted)]">Pendentes (amostra)</p>
            <p className="mt-1 font-medium">{pendingLabel}</p>
          </div>
          <div>
            <p className="text-[var(--color-muted)]">Progresso desta sessão</p>
            <p className="mt-1 font-medium">
              {imageSyncing || imageProgress.batches > 0
                ? `${imageProgress.mirrored} ok / ${imageProgress.failed} falhas (${imageProgress.batches} lotes)`
                : '—'}
            </p>
          </div>
        </div>

        {imageStatus?.near_quota && (
          <p className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
            Storage perto do limite soft (~900 MB). Evite espelhar mais miniaturas no
            Free.
          </p>
        )}

        {imageError && (
          <p className="mb-4 rounded-lg border border-[var(--color-danger)]/40 bg-[var(--color-danger)]/10 px-3 py-2 text-sm text-red-300">
            {imageError}
          </p>
        )}

        {imageMessage && (
          <p className="mb-4 rounded-lg border border-[var(--color-success)]/40 bg-[var(--color-success)]/10 px-3 py-2 text-sm text-green-300">
            {imageMessage}
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void handleImageSync()}
            disabled={imageSyncing || syncing || deckSyncing || Boolean(imageStatus?.near_quota)}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-accent)] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--color-accent-hover)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${imageSyncing ? 'animate-spin' : ''}`} />
            {imageSyncing ? 'Espelhando miniaturas...' : 'Sincronizar miniaturas'}
          </button>

          {imageSyncing && (
            <button
              type="button"
              onClick={handleStopImageSync}
              className="rounded-lg border border-[var(--color-border)] px-4 py-2.5 text-sm text-[var(--color-muted)] transition hover:bg-[var(--color-surface-2)]"
            >
              Parar
            </button>
          )}
        </div>

        <p className="mt-3 text-xs text-[var(--color-muted)]">
          Baixa cada miniatura 1× da YGOPRODeck e reescreve as URLs no banco. Rode em
          lotes; pode levar bastante tempo na primeira execução. Depois, faça o deploy
          da Edge Function <code>sync-card-images</code> e aplique a migration{' '}
          <code>004_card_images_storage.sql</code>.
        </p>
      </section>

      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-medium">Sincronização de Decks</h2>
            <p className="mt-1 text-sm text-[var(--color-muted)]">
              Importa top decks do Master Duel Meta (API não oficial) em lotes
              retomáveis. Associa cartas pelo nome ao catálogo local — não altera seus
              decks pessoais.
            </p>
          </div>
          <Layers className="h-5 w-5 shrink-0 text-[var(--color-accent)]" />
        </div>

        {(() => {
          const percent = deckSyncProgressPercent(deckRun)
          const total =
            deckRun?.total_estimated && deckRun.total_estimated > 0
              ? deckRun.total_estimated
              : deckRun?.processed ?? 0
          return (
            <>
              <div className="mb-4">
                <div className="mb-1.5 flex items-center justify-between text-xs text-[var(--color-muted)]">
                  <span>Status: {deckRun?.status ?? '—'}</span>
                  <span>{percent}%</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-[var(--color-surface-2)]">
                  <div
                    className="h-full rounded-full bg-[var(--color-accent)] transition-all"
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <p className="mt-2 text-sm text-[var(--color-muted)]">
                  {(deckRun?.processed ?? 0).toLocaleString('pt-BR')}
                  {' / '}
                  {total.toLocaleString('pt-BR')}
                </p>
              </div>

              <div className="mb-5 grid gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="text-[var(--color-muted)]">Criados</p>
                  <p className="mt-1 font-medium">
                    {(deckRun?.created_count ?? 0).toLocaleString('pt-BR')}
                  </p>
                </div>
                <div>
                  <p className="text-[var(--color-muted)]">Atualizados</p>
                  <p className="mt-1 font-medium">
                    {(deckRun?.updated_count ?? 0).toLocaleString('pt-BR')}
                  </p>
                </div>
                <div>
                  <p className="text-[var(--color-muted)]">Erros</p>
                  <p className="mt-1 font-medium">
                    {(deckRun?.error_count ?? 0).toLocaleString('pt-BR')}
                  </p>
                </div>
                <div>
                  <p className="text-[var(--color-muted)]">Última sync</p>
                  <p className="mt-1 font-medium">
                    {loadingMeta
                      ? '...'
                      : deckRun
                        ? formatDate(deckRun.finished_at ?? deckRun.started_at)
                        : 'Nunca'}
                  </p>
                </div>
              </div>
            </>
          )
        })()}

        {deckError && (
          <p className="mb-4 rounded-lg border border-[var(--color-danger)]/40 bg-[var(--color-danger)]/10 px-3 py-2 text-sm text-red-300">
            {deckError}
          </p>
        )}

        {deckMessage && (
          <p className="mb-4 rounded-lg border border-[var(--color-success)]/40 bg-[var(--color-success)]/10 px-3 py-2 text-sm text-green-300">
            {deckMessage}
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void handleDeckSync(false)}
            disabled={deckSyncing || syncing || imageSyncing}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-accent)] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--color-accent-hover)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${deckSyncing ? 'animate-spin' : ''}`} />
            {deckSyncing ? 'Sincronizando decks...' : 'Sincronizar decks'}
          </button>

          {deckSyncing && (
            <button
              type="button"
              onClick={() => void handleStopDeckSync()}
              className="rounded-lg border border-[var(--color-border)] px-4 py-2.5 text-sm text-[var(--color-muted)] transition hover:bg-[var(--color-surface-2)]"
            >
              Cancelar
            </button>
          )}

          {!deckSyncing &&
            deckRun &&
            (deckRun.status === 'RUNNING' || deckRun.status === 'PENDING') && (
              <button
                type="button"
                onClick={() => void handleDeckSync(false)}
                className="rounded-lg border border-[var(--color-border)] px-4 py-2.5 text-sm text-[var(--color-muted)] transition hover:bg-[var(--color-surface-2)]"
              >
                Retomar
              </button>
            )}
        </div>

        <p className="mt-3 text-xs text-[var(--color-muted)]">
          Fonte: Master Duel Meta top-decks (não é o repositório YGOPRODeck). Aplique a
          migration <code>005_mdm_deck_sync.sql</code> e faça o deploy da Edge Function{' '}
          <code>sync-mdm-decks</code>. Cartas sem match no catálogo local são
          registradas sem interromper a sync.{' '}
          <Link to="/community" className="text-[var(--color-accent)] hover:underline">
            Ver Comunidade
          </Link>
        </p>
      </section>
    </div>
  )
}
