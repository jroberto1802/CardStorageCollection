import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  Bookmark,
  Layers,
  Layers3,
  LogOut,
  Menu,
  ScanLine,
  Settings,
  User,
  Users,
  X,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  [
    'rounded-lg px-3 py-2 text-sm transition-colors',
    isActive
      ? 'bg-[var(--color-accent)] text-white'
      : 'text-[var(--color-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]',
  ].join(' ')

const mobileNavClass = ({ isActive }: { isActive: boolean }) =>
  [
    'flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm transition-colors',
    isActive
      ? 'bg-[var(--color-accent)] text-white'
      : 'text-[var(--color-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]',
  ].join(' ')

export function AppLayout() {
  const { user, signOut } = useAuth()
  const { pathname } = useLocation()
  const wide =
    pathname.startsWith('/decks/') || pathname.startsWith('/community/')

  const [navOpen, setNavOpen] = useState(false)
  const [actionsOpen, setActionsOpen] = useState(false)
  const actionsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setNavOpen(false)
    setActionsOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!actionsOpen) return

    function handlePointerDown(event: MouseEvent) {
      if (
        actionsRef.current &&
        !actionsRef.current.contains(event.target as Node)
      ) {
        setActionsOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [actionsOpen])

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-bg)_85%,transparent)] backdrop-blur-md">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <Layers className="h-5 w-5 shrink-0 text-[var(--color-accent)]" />
            <span className="truncate font-semibold tracking-tight">
              Card Storage Collection
            </span>
          </div>

          {/* Desktop nav — inalterado */}
          <nav className="hidden items-center justify-center gap-1 md:flex">
            <NavLink to="/" end className={linkClass}>
              Início
            </NavLink>
            <NavLink to="/collection" className={linkClass}>
              <span className="inline-flex items-center gap-1.5">
                <Bookmark className="h-4 w-4" />
                Minha coleção
              </span>
            </NavLink>
            <NavLink to="/scanner" className={linkClass}>
              <span className="inline-flex items-center gap-1.5">
                <ScanLine className="h-4 w-4" />
                Scanner
              </span>
            </NavLink>
            <NavLink to="/decks" className={linkClass}>
              <span className="inline-flex items-center gap-1.5">
                <Layers3 className="h-4 w-4" />
                Decks
              </span>
            </NavLink>
            <NavLink to="/community" className={linkClass}>
              <span className="inline-flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                Comunidade
              </span>
            </NavLink>
            <NavLink to="/settings" className={linkClass}>
              <span className="inline-flex items-center gap-1.5">
                <Settings className="h-4 w-4" />
                Configurações
              </span>
            </NavLink>
          </nav>

          {/* Desktop ações — inalterado */}
          <div className="hidden items-center gap-3 md:flex">
            <span className="text-xs text-[var(--color-muted)]">{user?.email}</span>
            <button
              type="button"
              onClick={() => void signOut()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm text-[var(--color-muted)] transition hover:border-[var(--color-danger)] hover:text-[var(--color-danger)]"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </button>
          </div>

          {/* Mobile: hamburger + ações */}
          <div className="flex items-center gap-1.5 md:hidden">
            <button
              type="button"
              aria-label={navOpen ? 'Fechar menu' : 'Abrir menu'}
              aria-expanded={navOpen}
              onClick={() => {
                setNavOpen((v) => !v)
                setActionsOpen(false)
              }}
              className="rounded-lg border border-[var(--color-border)] p-2 text-[var(--color-muted)] transition hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]"
            >
              {navOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            <div className="relative" ref={actionsRef}>
              <button
                type="button"
                aria-label="Ações da conta"
                aria-expanded={actionsOpen}
                onClick={() => {
                  setActionsOpen((v) => !v)
                  setNavOpen(false)
                }}
                className="rounded-lg border border-[var(--color-border)] p-2 text-[var(--color-muted)] transition hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]"
              >
                <User className="h-5 w-5" />
              </button>

              {actionsOpen && (
                <div className="absolute top-full right-0 z-40 mt-2 w-64 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2 shadow-xl">
                  <p className="truncate px-3 py-2 text-xs text-[var(--color-muted)]">
                    {user?.email ?? '—'}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setActionsOpen(false)
                      void signOut()
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-[var(--color-muted)] transition hover:bg-[var(--color-surface-2)] hover:text-[var(--color-danger)]"
                  >
                    <LogOut className="h-4 w-4" />
                    Sair
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile nav panel */}
        {navOpen && (
          <nav className="border-t border-[var(--color-border)] px-4 py-3 md:hidden">
            <div className="flex flex-col gap-1">
              <NavLink to="/" end className={mobileNavClass} onClick={() => setNavOpen(false)}>
                Início
              </NavLink>
              <NavLink
                to="/collection"
                className={mobileNavClass}
                onClick={() => setNavOpen(false)}
              >
                <Bookmark className="h-4 w-4" />
                Minha coleção
              </NavLink>
              <NavLink
                to="/scanner"
                className={mobileNavClass}
                onClick={() => setNavOpen(false)}
              >
                <ScanLine className="h-4 w-4" />
                Scanner
              </NavLink>
              <NavLink
                to="/decks"
                className={mobileNavClass}
                onClick={() => setNavOpen(false)}
              >
                <Layers3 className="h-4 w-4" />
                Decks
              </NavLink>
              <NavLink
                to="/community"
                className={mobileNavClass}
                onClick={() => setNavOpen(false)}
              >
                <Users className="h-4 w-4" />
                Comunidade
              </NavLink>
              <NavLink
                to="/settings"
                className={mobileNavClass}
                onClick={() => setNavOpen(false)}
              >
                <Settings className="h-4 w-4" />
                Configurações
              </NavLink>
            </div>
          </nav>
        )}
      </header>

      <main
        className={[
          'mx-auto px-4 py-8',
          wide ? 'max-w-[1600px]' : 'max-w-7xl',
        ].join(' ')}
      >
        <Outlet />
      </main>
    </div>
  )
}
