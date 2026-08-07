import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { Layers } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

export function LoginPage() {
  const { user, loading, signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!loading && user) {
    return <Navigate to="/" replace />
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)

    const result = await signIn(email.trim(), password)
    if (result.error) {
      setError(result.error)
    }

    setSubmitting(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 shadow-2xl shadow-black/40">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-accent)]/15 text-[var(--color-accent)]">
            <Layers className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Card Storage Collection</h1>
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            Entre com e-mail e senha para gerenciar sua coleção.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm text-[var(--color-muted)]">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm outline-none ring-[var(--color-accent)] transition focus:ring-2"
              placeholder="seu@email.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm text-[var(--color-muted)]">
              Senha
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm outline-none ring-[var(--color-accent)] transition focus:ring-2"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="rounded-lg border border-[var(--color-danger)]/40 bg-[var(--color-danger)]/10 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-[var(--color-accent)] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--color-accent-hover)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
