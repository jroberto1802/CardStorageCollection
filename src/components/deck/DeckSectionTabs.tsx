import { NavLink } from 'react-router-dom'

const tabClass = ({ isActive }: { isActive: boolean }) =>
  [
    'rounded-lg px-4 py-2 text-sm font-medium transition',
    isActive
      ? 'bg-[var(--color-accent)] text-white'
      : 'border border-[var(--color-border)] text-[var(--color-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]',
  ].join(' ')

export function DeckSectionTabs() {
  return (
    <div className="flex flex-wrap gap-2">
      <NavLink to="/decks" end className={tabClass}>
        Meus decks
      </NavLink>
      <NavLink to="/characters" className={tabClass}>
        Personagens
      </NavLink>
    </div>
  )
}
