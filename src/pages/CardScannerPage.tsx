import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BookmarkPlus,
  Loader2,
  ScanLine,
  Search,
  Sparkles,
  Unlock,
} from 'lucide-react'
import { AddToCollectionModal } from '@/components/collection/AddToCollectionModal'
import {
  ScannerCamera,
  type CapturedFrame,
} from '@/components/scanner/ScannerCamera'
import {
  identifyCardFromFrame,
  suggestScannerMatches,
  terminateOcrWorker,
  type ScannerSuggestion,
} from '@/services/cardScannerService'
import type { AppLanguage } from '@/types'
import { languageLabel } from '@/utils/cardHelpers'

export function CardScannerPage() {
  const [ocrText, setOcrText] = useState('')
  const [candidates, setCandidates] = useState<string[]>([])
  const [setCodes, setSetCodes] = useState<string[]>([])
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<ScannerSuggestion[]>([])
  const [identifying, setIdentifying] = useState(false)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [locked, setLocked] = useState(false)
  const [nameBandPreview, setNameBandPreview] = useState<string | null>(null)
  const [setCodePreview, setSetCodePreview] = useState<string | null>(null)
  const [autoDetected, setAutoDetected] = useState(false)
  const [detectedSetCode, setDetectedSetCode] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [preset, setPreset] = useState<{
    cardId: number
    language?: AppLanguage
    setCode: string
    setName: string
    setRarity: string
  } | null>(null)

  const busyRef = useRef(false)

  useEffect(() => {
    return () => {
      void terminateOcrWorker()
    }
  }, [])

  async function runSuggest(params: {
    ocrName: string
    setCode?: string | null
    extraCandidates?: string[]
  }): Promise<ScannerSuggestion[]> {
    const ocrName = params.ocrName.trim()
    if (!ocrName && !params.setCode) {
      setSuggestions([])
      return []
    }

    setSearching(true)
    setError(null)
    try {
      const items = await suggestScannerMatches({
        ocrName: ocrName || params.setCode || '',
        setCode: params.setCode,
        extraCandidates: params.extraCandidates,
      })
      setSuggestions(items)
      return items
    } catch (err) {
      setSuggestions([])
      setError(err instanceof Error ? err.message : 'Falha ao buscar no catálogo')
      return []
    } finally {
      setSearching(false)
    }
  }

  async function handleIdentify(frame: CapturedFrame) {
    if (busyRef.current || locked) return
    busyRef.current = true
    setIdentifying(true)
    setError(null)
    setFeedback(null)
    setSuggestions([])
    setCandidates([])
    setSetCodes([])
    setOcrText('')
    setNameBandPreview(null)
    setSetCodePreview(null)
    setAutoDetected(false)
    setDetectedSetCode(null)

    try {
      setFeedback('Auto-enquadrando e lendo nome + set code (PT + EN)...')
      const result = await identifyCardFromFrame(
        frame.fullCanvas,
        frame.frame,
        frame.source ?? 'camera',
      )

      setOcrText(result.text.trim())
      setCandidates(result.candidates)
      setSetCodes(result.setCodes)
      setNameBandPreview(result.nameBandPreviewUrl)
      setSetCodePreview(result.setCodePreviewUrl)
      setAutoDetected(result.autoDetected)
      setDetectedSetCode(result.detectedSetCode)

      const searchByName =
        result.candidates[0] ?? stripFallbackName(result.text) ?? ''
      const searchBySet = result.detectedSetCode
      const best = searchByName || searchBySet || result.setCodes[0] || ''

      if (!best) {
        setFeedback(
          'Não consegui ler nome nem set code. Enquadre a carta com boa luz e tente de novo.',
        )
        return
      }

      setQuery(searchByName || best)
      setFeedback(
        searchBySet
          ? `Buscando com set code ${searchBySet} + nome...`
          : 'Buscando 3 sugestões (original + autocorreções)...',
      )

      const items = await runSuggest({
        ocrName: searchByName || best,
        setCode: searchBySet,
        extraCandidates: result.candidates.slice(1, 4),
      })

      if (items.length > 0) {
        setLocked(true)
        const setHit = searchBySet
          ? items.some((s) =>
              s.item.setCode.replace(/[^a-z0-9-]/gi, '').toUpperCase() ===
              searchBySet.replace(/[^a-z0-9-]/gi, '').toUpperCase(),
            )
          : false
        setFeedback(
          `${items.length} sugestão(ões)${result.autoDetected ? ' · auto-enquadrado' : ''}${
            setHit ? ` · impressão ${searchBySet}` : searchBySet ? ` · set ${searchBySet}` : ''
          }. Escolha a carta ou escaneie outra.`,
        )
      } else {
        setFeedback(
          `Li “${best}”, mas não achei no catálogo. Ajuste a busca e busque de novo.`,
        )
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Falha ao identificar a carta. Tente novamente.',
      )
    } finally {
      busyRef.current = false
      setIdentifying(false)
    }
  }

  function stripFallbackName(text: string): string {
    return text.replace(/\s+/g, ' ').trim()
  }

  function unlockForNextScan() {
    setLocked(false)
    setSuggestions([])
    setCandidates([])
    setSetCodes([])
    setQuery('')
    setOcrText('')
    setNameBandPreview(null)
    setSetCodePreview(null)
    setAutoDetected(false)
    setDetectedSetCode(null)
    setFeedback('Pronto para escanear outra carta.')
    setError(null)
  }

  function handleSelectMatch(item: ScannerSuggestion['item']) {
    setPreset({
      cardId: item.cardId,
      language: item.language,
      setCode: item.setCode !== '—' ? item.setCode : '',
      setName: item.setName !== 'Sem set' ? item.setName : '',
      setRarity: item.setRarity !== '—' ? item.setRarity : '',
    })
    setModalOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="inline-flex items-center gap-1.5 text-xs font-medium tracking-wide text-[var(--color-accent)] uppercase">
            <ScanLine className="h-3.5 w-3.5" />
            Scanner
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            Identificar carta
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-[var(--color-muted)]">
            Nova abordagem: enquadre a carta e toque em <strong className="text-[var(--color-text)]">Identificar</strong>.
            Auto-enquadra quando possível, lê o nome e o set code (faixa âmbar). OCR em português + inglês.
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
            1. Enquadrar
          </h2>
          <ScannerCamera
            disabled={locked || modalOpen}
            identifying={identifying}
            onIdentify={(frame) => void handleIdentify(frame)}
          />
          {locked && (
            <button
              type="button"
              onClick={unlockForNextScan}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--color-border)] px-4 py-2.5 text-sm font-medium text-[var(--color-text)] transition hover:border-[var(--color-accent)] hover:bg-[var(--color-accent)]/10"
            >
              <Unlock className="h-4 w-4 text-[var(--color-accent)]" />
              Escanear outra carta
            </button>
          )}
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-semibold tracking-wide text-[var(--color-muted)] uppercase">
            2. Resultado
          </h2>

          {identifying && (
            <div className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-muted)]">
              <Loader2 className="h-4 w-4 animate-spin text-[var(--color-accent)]" />
              Processando OCR (PT + EN)... na 1ª vez pode demorar o download dos modelos.
            </div>
          )}

          {locked && (
            <p className="rounded-lg border border-[var(--color-success)]/40 bg-[var(--color-success)]/10 px-3 py-2 text-sm text-emerald-300">
              Resultado travado. Escolha a carta abaixo ou toque em “Escanear outra carta”.
            </p>
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

          {(autoDetected || detectedSetCode) && (
            <div className="flex flex-wrap gap-2">
              {autoDetected && (
                <span className="rounded-md border border-emerald-400/40 bg-emerald-400/10 px-2 py-1 text-[11px] text-emerald-300">
                  Carta auto-enquadrada
                </span>
              )}
              {detectedSetCode && (
                <span className="rounded-md border border-amber-400/40 bg-amber-400/10 px-2 py-1 font-mono text-[11px] text-amber-200">
                  Set code: {detectedSetCode}
                </span>
              )}
            </div>
          )}

          {(nameBandPreview || setCodePreview) && (
            <div className="grid gap-3 sm:grid-cols-2">
              {nameBandPreview && (
                <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
                  <p className="mb-2 text-xs text-[var(--color-muted)]">
                    Faixa do nome (OCR)
                  </p>
                  <img
                    src={nameBandPreview}
                    alt="Faixa do nome"
                    className="max-h-24 w-full rounded-lg bg-white object-contain"
                  />
                </div>
              )}
              {setCodePreview && (
                <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
                  <p className="mb-2 text-xs text-[var(--color-muted)]">
                    Faixa do set code (OCR)
                  </p>
                  <img
                    src={setCodePreview}
                    alt="Faixa do set code"
                    className="max-h-24 w-full rounded-lg bg-white object-contain"
                  />
                </div>
              )}
            </div>
          )}

          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <label className="mb-1.5 block text-xs text-[var(--color-muted)]">
              Busca no catálogo
            </label>
            <div className="flex gap-2">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--color-muted)]" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      void runSuggest({
                        ocrName: query,
                        setCode: detectedSetCode,
                        extraCandidates: candidates,
                      }).then((items) => {
                        if (items.length > 0) setLocked(true)
                      })
                    }
                  }}
                    placeholder="Nome ou set code (PT + EN)..."
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] py-2.5 pr-3 pl-10 text-sm outline-none ring-[var(--color-accent)] focus:ring-2"
                />
              </div>
              <button
                type="button"
                disabled={searching || !query.trim()}
                onClick={() =>
                  void runSuggest({
                    ocrName: query,
                    setCode: detectedSetCode,
                    extraCandidates: candidates,
                  }).then((items) => {
                    if (items.length > 0) setLocked(true)
                  })
                }
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

            {(candidates.length > 0 || setCodes.length > 0) && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                <span className="inline-flex items-center gap-1 text-[11px] text-[var(--color-muted)]">
                  <Sparkles className="h-3 w-3" />
                  OCR:
                </span>
                {candidates.map((name) => (
                  <button
                    key={name}
                    type="button"
                    disabled={searching}
                    onClick={() => {
                      setQuery(name)
                      void runSuggest({
                        ocrName: name,
                        setCode: detectedSetCode,
                        extraCandidates: candidates,
                      }).then((items) => {
                        if (items.length > 0) setLocked(true)
                      })
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
                {setCodes.map((code) => (
                  <button
                    key={code}
                    type="button"
                    disabled={searching}
                    onClick={() => {
                      setQuery(code)
                      void runSuggest({
                        ocrName: ocrText || code,
                        setCode: code,
                        extraCandidates: candidates,
                      }).then((items) => {
                        if (items.length > 0) setLocked(true)
                      })
                    }}
                    className="rounded-md border border-[var(--color-border)] px-2 py-1 font-mono text-[11px] text-[var(--color-accent)]"
                  >
                    {code}
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
              <h3 className="text-sm font-semibold">3 sugestões (corretor)</h3>
              <p className="text-xs text-[var(--color-muted)]">
                Set code tem prioridade · depois nome + autocorreções · PT/EN
              </p>
            </div>

            {searching ? (
              <p className="px-4 py-8 text-center text-sm text-[var(--color-muted)]">
                Buscando sugestões...
              </p>
            ) : suggestions.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-[var(--color-muted)]">
                Enquadre a carta e toque em Identificar.
              </p>
            ) : (
              <ul className="divide-y divide-[var(--color-border)]">
                {suggestions.map((row) => (
                  <li key={`${row.label}-${row.item.key}`}>
                    <button
                      type="button"
                      onClick={() => handleSelectMatch(row.item)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-[var(--color-surface-2)]/70"
                    >
                      {row.item.imageUrlSmall || row.item.imageUrl ? (
                        <img
                          src={row.item.imageUrlSmall ?? row.item.imageUrl ?? undefined}
                          alt=""
                          className="h-16 w-11 shrink-0 rounded object-cover"
                        />
                      ) : (
                        <div className="flex h-16 w-11 shrink-0 items-center justify-center rounded bg-[var(--color-surface-2)] text-[10px] text-[var(--color-muted)]">
                          —
                        </div>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="mb-0.5 inline-flex rounded border border-[var(--color-border)] px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-[var(--color-muted)]">
                          {row.label}
                          {row.query ? ` · “${row.query}”` : ''}
                        </span>
                        <span className="block truncate text-sm font-semibold">
                          {row.item.name}
                        </span>
                        <span className="block font-mono text-xs text-[var(--color-accent)]">
                          {row.item.setCode}
                          {row.item.setRarity !== '—'
                            ? ` · ${row.item.setRarity}`
                            : ''}
                        </span>
                        <span className="block text-[11px] text-[var(--color-muted)]">
                          {languageLabel(row.item.language)}
                          {row.item.setName !== 'Sem set'
                            ? ` · ${row.item.setName}`
                            : ''}
                        </span>
                      </span>
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-[var(--color-border)] px-2.5 py-1.5 text-xs">
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
          setFeedback('Carta adicionada. Toque em “Escanear outra carta” para continuar.')
          setModalOpen(false)
          setPreset(null)
        }}
      />
    </div>
  )
}
