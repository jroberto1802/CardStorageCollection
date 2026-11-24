import { AlertTriangle, Minus, Plus, Trash2 } from 'lucide-react'
import { lineHint, printingFromLine, type BatchLine, type OwnedMap, type SetPrinting } from '@/utils/quickEntry'

interface BatchLineRowProps {
  line: BatchLine
  owned: OwnedMap
  /** impressões do set carregado: permitem trocar a raridade (chips) */
  printings: SetPrinting[]
  disabled?: boolean
  onQuantity: (key: string, quantity: number) => void
  onRarity: (line: BatchLine, printing: SetPrinting) => void
  onRemove: (key: string) => void
}

const rarityLabel = (rarity: string) => rarity || 'Sem raridade'

export function BatchLineRow({ line, owned, printings, disabled, onQuantity, onRarity, onRemove }: BatchLineRowProps) {
  const hint = lineHint(line, owned)
  const label = `${line.setCode}, ${line.name}, ${rarityLabel(line.setRarity)}, quantidade ${line.quantity}`
  const options = line.rarityOptions.map((r) => (r === '—' ? '' : r))
  const showChips = line.unconfirmed || options.length > 1
  // Usa a impressão do set carregado quando existir; senão monta a partir da própria linha (outro set, set em
  // carga/erro, linha do Scanner): a raridade sempre pode ser confirmada.
  const printingFor = (rarity: string): SetPrinting =>
    printings.find((p) => p.cardId === line.cardId && p.setCode === line.setCode && (p.setRarity === '—' ? '' : p.setRarity) === rarity) ??
    printingFromLine(line, rarity)

  function onChipKey(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
    event.preventDefault()
    const next = (index + (event.key === 'ArrowRight' ? 1 : -1) + options.length) % options.length
    const group = event.currentTarget.parentElement
    group?.querySelectorAll<HTMLButtonElement>('button')[next]?.focus()
  }

  return (
    <li
      aria-label={label}
      data-testid="batch-line"
      className={`flex flex-wrap items-start gap-3 rounded-xl border p-3 ${
        line.unconfirmed ? 'border-amber-400/60 bg-amber-400/5' : 'border-[var(--color-border)] bg-[var(--color-surface)]'
      }`}
    >
      {line.imageUrlSmall ? (
        <img src={line.imageUrlSmall} alt="" width={40} height={58} loading="lazy" className="h-[58px] w-10 shrink-0 rounded object-cover" />
      ) : (
        <div aria-hidden="true" className="h-[58px] w-10 shrink-0 rounded bg-[var(--color-surface-2)]" />
      )}

      <div className="min-w-0 flex-1 basis-40">
        <p className="font-mono text-xs text-[var(--color-accent)]">{line.setCode}</p>
        <p className="truncate text-sm font-semibold">{line.name}</p>

        {showChips ? (
          <div role="radiogroup" aria-label={`Raridade de ${line.name}`} className="mt-1 flex flex-wrap gap-1.5">
            {options.map((rarity, index) => {
              const selected = rarity === line.setRarity
              const printing = printingFor(rarity)
              return (
                <button
                  key={rarity || 'none'}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  tabIndex={selected || (!options.includes(line.setRarity) && index === 0) ? 0 : -1}
                  disabled={disabled}
                  onClick={() => onRarity(line, printing)}
                  onKeyDown={(e) => onChipKey(e, index)}
                  className={`min-h-11 rounded-full border px-3 text-xs ${
                    selected
                      ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/20 font-semibold'
                      : 'border-[var(--color-border)] hover:bg-[var(--color-surface-2)]'
                  }`}
                >
                  {rarityLabel(rarity)}
                </button>
              )
            })}
          </div>
        ) : (
          <p className="text-xs text-[var(--color-muted)]">{rarityLabel(line.setRarity)}</p>
        )}

        {line.unconfirmed && (
          <p className="mt-1 text-xs text-amber-300">Confirme a raridade para salvar esta carta.</p>
        )}
        {line.auto && !line.unconfirmed && (
          <span className="mt-1 inline-block rounded border border-[var(--color-border)] px-1.5 py-0.5 text-[10px] tracking-wide text-[var(--color-muted)] uppercase">
            auto
          </span>
        )}
        <p className="mt-1 text-xs text-[var(--color-muted)]">{hint.text}</p>
        {hint.warn && (
          <p className="mt-1 flex items-center gap-1 text-xs text-amber-300">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            Quantidade alta ({line.quantity}): confira se está certo.
          </p>
        )}
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label={`Diminuir a quantidade de ${line.name} (${line.setCode})`}
          disabled={disabled || line.quantity <= 1}
          onClick={() => onQuantity(line.key, line.quantity - 1)}
          className="flex h-11 w-11 items-center justify-center rounded-lg border border-[var(--color-border)] disabled:opacity-40"
        >
          <Minus className="h-4 w-4" aria-hidden="true" />
        </button>
        <span className="w-8 text-center text-sm font-semibold tabular-nums" aria-live="off">
          {line.quantity}
        </span>
        <button
          type="button"
          aria-label={`Aumentar a quantidade de ${line.name} (${line.setCode})`}
          disabled={disabled || line.quantity >= 999}
          onClick={() => onQuantity(line.key, line.quantity + 1)}
          className="flex h-11 w-11 items-center justify-center rounded-lg border border-[var(--color-border)] disabled:opacity-40"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label={`Remover ${line.name} (${line.setCode}) do lote`}
          disabled={disabled}
          onClick={() => onRemove(line.key)}
          className="flex h-11 w-11 items-center justify-center rounded-lg border border-[var(--color-border)] text-red-300 disabled:opacity-40"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </li>
  )
}
