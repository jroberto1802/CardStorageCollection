import { useEffect, useMemo, useState, type RefObject } from 'react'
import { Copy, Download, X } from 'lucide-react'
import { Modal } from '@/components/common/Modal'
import { getUsdBrlRate } from '@/services/currencyService'
import type { ResolvedAnimeDeckCard } from '@/types'
import { convertUsdToBrl, formatBrl } from '@/utils/cardHelpers'
import {
  PRICE_SOURCE_LABEL,
  PRICE_SOURCES,
  availablePriceSources,
  buildMissingList,
  formatMissingText,
  missingFileName,
  type DeckCardEntry,
  type PriceSource,
} from '@/utils/characterView'

const SOURCE_KEY = 'csc-missing-price-source'
const ZONE_LABEL = { main: 'Deck principal', extra: 'Extra Deck', side: 'Side Deck' } as const

function readSource(): PriceSource | null {
  try {
    const value = localStorage.getItem(SOURCE_KEY)
    return PRICE_SOURCES.find((source) => source === value) ?? null
  } catch {
    return null
  }
}

function writeSource(source: PriceSource) {
  try {
    localStorage.setItem(SOURCE_KEY, source)
  } catch {
    // ignore
  }
}

const usd = (value: number) => `US$ ${value.toFixed(2)}`

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    try {
      const area = document.createElement('textarea')
      area.value = text
      area.setAttribute('readonly', '')
      area.style.position = 'fixed'
      area.style.opacity = '0'
      document.body.appendChild(area)
      area.select()
      const ok = document.execCommand('copy')
      document.body.removeChild(area)
      return ok
    } catch {
      return false
    }
  }
}

interface MissingCardsPanelProps {
  open: boolean
  onClose: () => void
  entries: DeckCardEntry<ResolvedAnimeDeckCard>[]
  deckName: string
  characterName: string
  unresolvedCount: number
  returnFocusRef?: RefObject<HTMLElement | null>
}

export function MissingCardsPanel(props: MissingCardsPanelProps) {
  return props.open ? <MissingCardsPanelBody {...props} /> : null
}

function MissingCardsPanelBody({
  open,
  onClose,
  entries,
  deckName,
  characterName,
  unresolvedCount,
  returnFocusRef,
}: MissingCardsPanelProps) {
  const sources = useMemo(() => availablePriceSources(entries), [entries])
  const [stored, setStored] = useState<PriceSource | null>(() => readSource())
  const source: PriceSource =
    stored && sources.includes(stored) ? stored : (sources[0] ?? 'cardmarket')
  const list = useMemo(() => buildMissingList(entries, source), [entries, source])
  const [rate, setRate] = useState<number | null>(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    let mounted = true
    getUsdBrlRate()
      .then((value) => {
        if (mounted) setRate(value)
      })
      .catch(() => {})
    return () => {
      mounted = false
    }
  }, [])

  const text = () =>
    formatMissingText({ deckName, characterName, list, source, unresolvedCount })

  async function onCopy() {
    const ok = await copyText(text())
    setMessage(ok ? 'Lista copiada!' : 'Não foi possível copiar. Use Baixar .txt.')
  }

  function onDownload() {
    const blob = new Blob([text()], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = missingFileName(deckName, characterName)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    setMessage('Arquivo baixado.')
  }

  const titleId = 'missing-title'

  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy={titleId}
      variant="panel"
      returnFocusRef={returnFocusRef}
    >
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
        <h2 id={titleId} className="text-base font-semibold">
          O que falta ({list.missingCopies})
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="flex h-11 w-11 items-center justify-center rounded-lg text-[var(--color-muted)] hover:bg-[var(--color-surface-2)]"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {sources.length > 0 && (
          <div role="group" aria-label="Fonte de preço" className="flex flex-wrap gap-2">
            {sources.map((item) => (
              <button
                key={item}
                type="button"
                aria-pressed={item === source}
                onClick={() => {
                  setStored(item)
                  writeSource(item)
                }}
                className={[
                  'min-h-11 rounded-lg border px-3 py-2 text-sm font-medium',
                  item === source
                    ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-white'
                    : 'border-[var(--color-border)] text-[var(--color-muted)] hover:bg-[var(--color-surface-2)]',
                ].join(' ')}
              >
                {PRICE_SOURCE_LABEL[item]}
              </button>
            ))}
          </div>
        )}

        {list.groups.map((group) => (
          <section key={group.zone} aria-labelledby={`missing-${group.zone}`}>
            <h3 id={`missing-${group.zone}`} className="mb-2 text-sm font-semibold">
              {ZONE_LABEL[group.zone]} ({group.missingCopies})
            </h3>
            <ul className="space-y-2">
              {group.lines.map((line) => (
                <li
                  key={line.card.id}
                  className="flex items-center gap-3 rounded-lg border border-[var(--color-border)] p-2"
                >
                  {line.card.imageUrlSmall || line.card.imageUrl ? (
                    <img
                      src={line.card.imageUrlSmall ?? line.card.imageUrl ?? undefined}
                      alt=""
                      width={40}
                      height={58}
                      loading="lazy"
                      className="h-[58px] w-10 shrink-0 rounded object-cover"
                    />
                  ) : (
                    <div className="h-[58px] w-10 shrink-0 rounded bg-[var(--color-surface-2)]" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{line.card.name}</p>
                    <p className="text-xs text-[var(--color-muted)]">
                      Faltam {line.missing} (tem {line.owned} de {line.card.quantity})
                    </p>
                  </div>
                  <div className="shrink-0 text-right text-xs">
                    {line.unit == null ? (
                      <span aria-label="Sem preço">—</span>
                    ) : (
                      <>
                        <p className="text-[var(--color-muted)]">{usd(line.unit)} un.</p>
                        <p className="text-sm font-medium">{usd(line.subtotal ?? 0)}</p>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <div className="rounded-lg border border-[var(--color-border)] p-3 text-sm">
          <p className="font-semibold">
            Total estimado: {usd(list.totalUsd)}
            {list.unpricedCount > 0 && (
              <span className="font-normal text-[var(--color-muted)]"> (+ {list.unpricedCount} sem preço)</span>
            )}
          </p>
          {rate != null && list.totalUsd > 0 && (
            <p className="text-[var(--color-muted)]">
              ≈ {formatBrl(convertUsdToBrl(list.totalUsd, rate))}
            </p>
          )}
          <p className="mt-1 text-xs text-[var(--color-muted)]">
            Estimativa com preços de {PRICE_SOURCE_LABEL[source]}; valores reais podem variar.
          </p>
          {unresolvedCount > 0 && (
            <p className="mt-1 text-xs text-[var(--color-muted)]">
              {unresolvedCount} carta{unresolvedCount === 1 ? '' : 's'} não catalogada
              {unresolvedCount === 1 ? '' : 's'} fora desta lista.
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2 border-t border-[var(--color-border)] p-4">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void onCopy()}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium hover:bg-[var(--color-surface-2)]"
          >
            <Copy className="h-4 w-4" aria-hidden="true" />
            Copiar lista
          </button>
          <button
            type="button"
            onClick={onDownload}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium hover:bg-[var(--color-surface-2)]"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Baixar .txt
          </button>
        </div>
        <p aria-live="polite" role="status" className="min-h-5 text-sm text-[var(--color-muted)]">
          {message}
        </p>
      </div>
    </Modal>
  )
}
