import { NavLink, Outlet } from 'react-router-dom'
import { Layers, LogOut, Settings } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  [
    'rounded-lg px-3 py-2 text-sm transition-colors',
    isActive
      ? 'bg-[var(--color-accent)] text-white'
      : 'text-[var(--color-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]',
  ].join(' ')

export function AppLayout() {
  const { user, signOut } = useAuth()

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-bg)_85%,transparent)] backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-[var(--color-accent)]" />
            <span className="font-semibold tracking-tight">Card Storage Collection</span>
          </div>

          <nav className="flex items-center gap-1">
            <NavLink to="/" end className={linkClass}>
              Início
            </NavLink>
            <NavLink to="/settings" className={linkClass}>
              <span className="inline-flex items-center gap-1.5">
                <Settings className="h-4 w-4" />
                Configurações
              </span>
            </NavLink>
          </nav>

          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-[var(--color-muted)] sm:inline">
              {user?.email}
            </span>
            <button
              type="button"
              onClick={() => void signOut()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm text-[var(--color-muted)] transition hover:border-[var(--color-danger)] hover:text-[var(--color-danger)]"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
