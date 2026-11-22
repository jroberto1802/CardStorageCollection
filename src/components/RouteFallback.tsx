import { Loader2 } from 'lucide-react'

export function RouteFallback() {
  return (
    <p role="status" className="inline-flex items-center gap-2 text-sm text-[var(--color-muted)]">
      <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
      Carregando...
    </p>
  )
}
