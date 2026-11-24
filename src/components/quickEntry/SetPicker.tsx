import { useEffect, useId, useRef, useState } from 'react'
import { Loader2, Search } from 'lucide-react'
import { listSetPrefixes } from '@/services/setPrintingsService'
import type { SetPrefixOption } from '@/types'
import type { ActiveSet } from '@/utils/quickEntry'

const MIN_QUERY = 2
const DEBOUNCE_MS = 300

interface SetPickerProps {
  value: ActiveSet | null
  disabled?: boolean
  onSelect: (set: ActiveSet, option: SetPrefixOption | null) => void
  onRegionChange: (region: string | null) => void
}

/** Combobox de set (ARIA 1.2) com autocompletar por prefixo/nome + região editável. */
export function SetPicker({ value, disabled, onSelect, onRegionChange }: SetPickerProps) {
  const uid = useId()
  const listId = `${uid}-list`
  const [query, setQuery] = useState(value?.prefix ?? '')
  const [open, setOpen] = useState(false)
  const [options, setOptions] = useState<SetPrefixOption[]>([])
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)
  const [active, setActive] = useState(-1)
  const seq = useRef(0)
  // região: só é aplicada no blur/Enter (cada tecla recarregaria o set)
  const [regionText, setRegionText] = useState(value?.region ?? '')
  const regionProp = value?.region ?? ''
  useEffect(() => {
    setRegionText(regionProp)
  }, [regionProp])
  function commitRegion() {
    const next = regionText.trim().toUpperCase()
    if (next !== regionProp) onRegionChange(next || null)
  }

  // mantém o texto em sincronia quando o set muda por fora (rascunho/último usado)
  const prefix = value?.prefix ?? ''
  useEffect(() => {
    setQuery(prefix)
  }, [prefix])

  useEffect(() => {
    if (!open) return
    const ticket = ++seq.current
    if (query.trim().length < MIN_QUERY) {
      setOptions([])
      setLoading(false)
      setFailed(false)
      return
    }
    setLoading(true)
    setFailed(false)
    const timer = setTimeout(() => {
      listSetPrefixes(query, 12)
        .then((list) => {
          if (seq.current !== ticket) return
          setOptions(list)
          setActive(list.length ? 0 : -1)
        })
        .catch(() => {
          if (seq.current === ticket) setFailed(true)
        })
        .finally(() => {
          if (seq.current === ticket) setLoading(false)
        })
    }, DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [query, open])

  function choose(option: SetPrefixOption) {
    const region = option.regions.includes('EN') ? 'EN' : (option.regions[0] ?? null)
    setQuery(option.prefix)
    setOpen(false)
    onSelect({ prefix: option.prefix, region }, option)
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setOpen(true)
      setActive((i) => Math.min(options.length - 1, i + 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((i) => Math.max(0, i - 1))
    } else if (event.key === 'Enter' && open && active >= 0 && options[active]) {
      event.preventDefault()
      choose(options[active])
    } else if (event.key === 'Escape' && open) {
      event.preventDefault()
      event.stopPropagation()
      setOpen(false)
    }
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="relative min-w-0 flex-1 basis-56">
        <label htmlFor={`${uid}-set`} className="mb-1 block text-xs font-medium text-[var(--color-muted)]">
          Set (código ou nome)
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--color-muted)]" aria-hidden="true" />
          <input
            id={`${uid}-set`}
            role="combobox"
            aria-expanded={open}
            aria-controls={open ? listId : undefined}
            aria-autocomplete="list"
            aria-activedescendant={open && active >= 0 ? `${uid}-opt-${active}` : undefined}
            value={query}
            disabled={disabled}
            autoComplete="off"
            placeholder="LIOV ou Lord of the Ravens"
            onChange={(e) => {
              setQuery(e.target.value)
              setOpen(true)
            }}
            onFocus={() => setOpen(true)}
            onBlur={() =>
              setTimeout(() => {
                setOpen(false)
                setQuery(prefix) // volta ao set ativo se nada foi escolhido
              }, 150)
            }
            onKeyDown={onKeyDown}
            className="min-h-11 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] py-2 pr-3 pl-9 text-sm outline-none focus:border-[var(--color-accent)]"
          />
        </div>
        {open && (
          <ul
            id={listId}
            role="listbox"
            aria-label="Sets encontrados"
            className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl"
          >
            {loading && (
              <li role="presentation" className="flex items-center gap-2 px-3 py-2 text-xs text-[var(--color-muted)]">
                <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" aria-hidden="true" /> Buscando sets...
              </li>
            )}
            {failed && (
              <li role="presentation" className="px-3 py-2 text-xs text-red-300">
                Não foi possível buscar os sets. Tente digitar de novo.
              </li>
            )}
            {query.trim().length < MIN_QUERY && (
              <li role="presentation" className="px-3 py-2 text-xs text-[var(--color-muted)]">
                Digite ao menos {MIN_QUERY} caracteres do código ou do nome.
              </li>
            )}
            {query.trim().length >= MIN_QUERY && !loading && !failed && options.length === 0 && (
              <li role="presentation" className="px-3 py-2 text-xs text-[var(--color-muted)]">
                Nenhum set encontrado.
              </li>
            )}
            {options.map((option, index) => (
              <li
                key={option.prefix}
                id={`${uid}-opt-${index}`}
                role="option"
                aria-selected={index === active}
                onMouseDown={(e) => {
                  e.preventDefault()
                  choose(option)
                }}
                className={`flex min-h-11 cursor-pointer flex-col justify-center px-3 py-1.5 text-sm ${
                  index === active ? 'bg-[var(--color-accent)]/20' : ''
                }`}
              >
                <span>
                  <span className="font-mono font-semibold">{option.prefix}</span>
                  {option.regions.length > 0 && (
                    <span className="ml-2 text-xs text-[var(--color-muted)]">{option.regions.join(', ')}</span>
                  )}
                </span>
                <span className="truncate text-xs text-[var(--color-muted)]">
                  {option.setName || 'Sem nome'} · {option.totalCards} cartas
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="w-24">
        <label htmlFor={`${uid}-region`} className="mb-1 block text-xs font-medium text-[var(--color-muted)]">
          Região
        </label>
        <input
          id={`${uid}-region`}
          value={regionText}
          disabled={disabled || !value}
          maxLength={3}
          autoComplete="off"
          onChange={(e) => setRegionText(e.target.value.toUpperCase())}
          onBlur={commitRegion}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              commitRegion()
            }
          }}
          className="min-h-11 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm uppercase outline-none focus:border-[var(--color-accent)]"
        />
      </div>
    </div>
  )
}
