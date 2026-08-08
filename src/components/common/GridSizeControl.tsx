import type { GridCardSize } from '@/types'
import { GRID_CARD_SIZE_OPTIONS } from '@/hooks/useGridCardSize'

interface GridSizeControlProps {
  value: GridCardSize
  onChange: (size: GridCardSize) => void
}

export function GridSizeControl({ value, onChange }: GridSizeControlProps) {
  return (
    <div
      className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-border)] p-0.5"
      role="group"
      aria-label="Tamanho dos quadros"
    >
      <span className="hidden px-2 text-xs text-[var(--color-muted)] sm:inline">
        Tamanho
      </span>
      {GRID_CARD_SIZE_OPTIONS.map((option) => {
        const active = value === option.value
        return (
          <button
            key={option.value}
            type="button"
            title={option.title}
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={[
              'min-w-8 rounded-md px-2.5 py-1.5 text-xs font-semibold transition',
              active
                ? 'bg-[var(--color-accent)] text-white'
                : 'text-[var(--color-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]',
            ].join(' ')}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
