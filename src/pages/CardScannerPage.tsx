import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BookmarkPlus,
  Loader2,
  ScanLine,
  Search,
  Sparkles,
  X,
} from 'lucide-react'
import { AddToCollectionModal } from '@/components/collection/AddToCollectionModal'
import {
  ScannerCamera,
  type CapturedFrame,
} from '@/components/scanner/ScannerCamera'
import { useSettings } from '@/contexts/SettingsContext'
import {
  cropNameBandFromFrame,
  extractCardNameCandidates,
  recognizeCardText,
  searchCardsByScannerQuery,
  terminateOcrWorker,
} from '@/services/cardScannerService'
import type { AppLanguage, CardImpression } from '@/types'
import { languageLabel } from '@/utils/cardHelpers'

export function CardScannerPage() {
  const { language } = useSettings()
  const [captured, setCaptured] = useState<CapturedFrame | null>(null)
  const [ocrText, setOcrText] = useState('')
  const [candidates, setCandidates] = useState<string[]>([])
  const [query, setQuery] = useState('')
  const [matches, setMatches] = useState<CardImpression[]>([])
  const [scanning, setScanning] = useState(false)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [preset, setPreset] = useState<{
    cardId: number
    language?: AppLanguage
    setCode: string
    setName: string
    setRarity: string
  } | null>(null)

  useEffect(() => {
    return () => {
      void terminateOcrWorker()
    }
  }, [])

  async function runIdentify(frame: CapturedFrame) {
    setCaptured(frame)
    setScanning(true)
    setError(null)
    setFeedback(null)
    setMatches([])
    setOcrText('')
    setCandidates([])

    try {
      const nameBand = cropNameBandFromFrame(frame.fullCanvas, frame.frame)
      const { text, confidence } = await recognizeCardText(nameBand)
      const names = extractCardNameCandidates(text)
      setOcrText(text.trim())
      setCandidates(names)

      const best = names[0] ?? ''
      setQuery(best)

      if (!best) {
        setFeedback(
          confidence > 0
            ? 'Texto detectado, mas nenhum nome claro. Edite a busca manualmente.'
            : 'Não foi possível ler o nome. Tente outra foto com mais luz.',
        )
        return
      }

      setFeedback(`Nome sugerido: “${best}”. Confirme ou ajuste antes de adicionar.`)
      await runSearch(best)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Falha ao identificar a carta. Tente novamente.',
      )
    } finally {
      setScanning(false)
    }
  }

  async function runSearch(nextQuery: string) {
    const q = nextQuery.trim()
    if (!q) {
      setMatches([])
      return
    }

    setSearching(true)
    setError(null)
    try {
      const items = await searchCardsByScannerQuery({
        query: q,
        language,
        pageSize: 12,
      })
      setMatches(items)
      if (items.length === 0) {
        setFeedback('Nenhuma carta encontrada no catálogo para essa busca.')
      }
    } catch (err) {
      setMatches([])
      setError(err instanceof Error ? err.message : 'Falha ao buscar no catálogo')
    } finally {
      setSearching(false)
    }
  }

  function handleSelectMatch(item: CardImpression) {
    setPreset({
      cardId: item.cardId,
      language: item.language,
      setCode: item.setCode !== '—' ? item.setCode : '',
      setName: item.setName !== 'Sem set' ? item.setName : '',
      setRarity: item.setRarity !== '—' ? item.setRarity : '',
    })
    setModalOpen(true)
  }

  function resetCapture() {
    setCaptured(null)
    setOcrText('')
    setCandidates([])
    setQuery('')
    setMatches([])
    setError(null)
    setFeedback(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="inline-flex items-center gap-1.5 text-xs font-medium tracking-wide text-[var(--color-accent)] uppercase">
            <ScanLine className="h-3.5 w-3.5" />
            Módulo MVP
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            Scanner de cartas
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-[var(--color-muted)]">
            Capture a carta pela câmera (ou envie uma foto). O app lê o nome por OCR,
            busca no catálogo e você confirma a impressão para adicionar à coleção.
          </p>
        </div>
        <Link
          to="/collection"
          className="text-sm text-[var(--color-accent)] hover:underline"
        >
          Ir para Minha coleção
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_1fr]">
        <section className="space-y-3">
          <h2 className="text-sm font-semibold tracking-wide text-[var(--color-muted)] uppercase">
            1. Captura
          </h2>
          {!captured ? (
            <ScannerCamera disabled={scanning} onCapture={(frame) => void runIdentify(frame)} />
          ) : (
            <div className="space-y-3">
              <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
                <img
                  src={captured.previewUrl}
                  alt="Captura da carta"
                  className="aspect-[3/4] w-full object-cover"
                />
              </div>
              <button
                type="button"
                disabled={scanning}
                onClick={resetCapture}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--color-border)] px-4 py-2.5 text-sm text-[var(--color-muted)] transition hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)] disabled:opacity-50"
              >
                <X className="h-4 w-4" />
                Nova captura
              </button>
            </div>
          )}
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-semibold tracking-wide text-[var(--color-muted)] uppercase">
            2. Identificação e confirmação
          </h2>

          {scanning && (
            <div className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-muted)]">
              <Loader2 className="h-4 w-4 animate-spin text-[var(--color-accent)]" />
              Lendo o nome da carta (OCR)... na primeira vez pode demorar um pouco.
            </div>
          )}

          {error && (
            <p className="rounded-lg border border-[var(--color-danger)]/40 bg-[var(--color-danger)]/10 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          )}

          {feedback && !error && (
            <p className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-muted)]">
              {feedback}
            </p>
          )}

          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <label className="mb-1.5 block text-xs text-[var(--color-muted)]">
              Busca (edite se o OCR errou)
            </label>
            <div className="flex gap-2">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--color-muted)]" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void runSearch(query)
                  }}
                  placeholder="Nome da carta..."
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] py-2.5 pr-3 pl-10 text-sm outline-none ring-[var(--color-accent)] focus:ring-2"
                  disabled={scanning}
                />
              </div>
              <button
                type="button"
                disabled={scanning || searching || !query.trim()}
                onClick={() => void runSearch(query)}
                className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-accent)] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--color-accent-hover)] disabled:opacity-50"
              >
                {searching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                Buscar
              </button>
            </div>

            {candidates.length > 1 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                <span className="inline-flex items-center gap-1 text-[11px] text-[var(--color-muted)]">
                  <Sparkles className="h-3 w-3" />
                  Sugestões:
                </span>
                {candidates.map((name) => (
                  <button
                    key={name}
                    type="button"
                    disabled={scanning || searching}
                    onClick={() => {
                      setQuery(name)
                      void runSearch(name)
                    }}
                    className={[
                      'rounded-md border px-2 py-1 text-[11px] transition',
                      query === name
                        ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/15 text-[var(--color-text)]'
                        : 'border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-text)]',
                    ].join(' ')}
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}

            {ocrText && (
              <details className="mt-3">
                <summary className="cursor-pointer text-xs text-[var(--color-muted)] hover:text-[var(--color-text)]">
                  Texto bruto do OCR
                </summary>
                <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap rounded-lg bg-[var(--color-surface-2)] p-2 text-[11px] text-[var(--color-muted)]">
                  {ocrText || '—'}
                </pre>
              </details>
            )}
          </div>

          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
            <div className="border-b border-[var(--color-border)] px-4 py-3">
              <h3 className="text-sm font-semibold">Candidatos no catálogo</h3>
              <p className="text-xs text-[var(--color-muted)]">
                Selecione a carta correta e confirme set/raridade no próximo passo.
              </p>
            </div>

            {searching ? (
              <p className="px-4 py-8 text-center text-sm text-[var(--color-muted)]">
                Buscando no catálogo...
              </p>
            ) : matches.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-[var(--color-muted)]">
                {captured
                  ? 'Nenhum resultado ainda. Ajuste a busca e tente de novo.'
                  : 'Capture uma carta para começar.'}
              </p>
            ) : (
              <ul className="divide-y divide-[var(--color-border)]">
                {matches.map((item) => (
                  <li key={item.key}>
                    <button
                      type="button"
                      onClick={() => handleSelectMatch(item)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-[var(--color-surface-2)]/70"
                    >
                      {item.imageUrlSmall || item.imageUrl ? (
                        <img
                          src={item.imageUrlSmall ?? item.imageUrl ?? undefined}
                          alt=""
                          className="h-16 w-11 shrink-0 rounded object-cover"
                        />
                      ) : (
                        <div className="flex h-16 w-11 shrink-0 items-center justify-center rounded bg-[var(--color-surface-2)] text-[10px] text-[var(--color-muted)]">
                          —
                        </div>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">
                          {item.name}
                        </span>
                        <span className="block font-mono text-xs text-[var(--color-accent)]">
                          {item.setCode}
                          {item.setRarity !== '—' ? ` · ${item.setRarity}` : ''}
                        </span>
                        <span className="block text-[11px] text-[var(--color-muted)]">
                          {languageLabel(item.language)}
                          {item.setName !== 'Sem set' ? ` · ${item.setName}` : ''}
                        </span>
                      </span>
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-[var(--color-border)] px-2.5 py-1.5 text-xs text-[var(--color-text)]">
                        <BookmarkPlus className="h-3.5 w-3.5 text-[var(--color-accent)]" />
                        Adicionar
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      <AddToCollectionModal
        open={modalOpen}
        preset={preset}
        onClose={() => {
          setModalOpen(false)
          setPreset(null)
        }}
        onAdded={() => {
          setFeedback('Carta adicionada à coleção.')
          setModalOpen(false)
          setPreset(null)
        }}
      />
    </div>
  )
}
