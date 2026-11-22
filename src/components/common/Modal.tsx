import { useEffect, useRef, type ReactNode, type RefObject } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  /** id do elemento de título (aria-labelledby) */
  labelledBy: string
  children: ReactNode
  /** false bloqueia ESC, clique no fundo e botão de fechar durante operações em andamento */
  dismissible?: boolean
  /** 'dialog' = centralizado (bottom-sheet no mobile); 'panel' = painel lateral em >= md */
  variant?: 'dialog' | 'panel'
  /** Elemento que abriu o modal; recebe o foco ao fechar (Safari não foca botões no clique) */
  returnFocusRef?: RefObject<HTMLElement | null>
  /** Elemento que recebe o foco inicial (padrão: primeiro focável) */
  initialFocusRef?: RefObject<HTMLElement | null>
  className?: string
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])'

/**
 * Modal base: role=dialog, aria-modal, foco inicial, Tab preso, ESC fecha,
 * foco volta ao gatilho e bottom-sheet em telas pequenas (360px).
 */
export function Modal({
  open,
  onClose,
  labelledBy,
  children,
  dismissible = true,
  variant = 'dialog',
  returnFocusRef,
  initialFocusRef,
  className = '',
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const downOnBackdrop = useRef(false)
  const onCloseRef = useRef(onClose)
  const dismissibleRef = useRef(dismissible)
  const returnFocusPropRef = useRef(returnFocusRef)
  const initialFocusPropRef = useRef(initialFocusRef)
  useEffect(() => {
    onCloseRef.current = onClose
    dismissibleRef.current = dismissible
    returnFocusPropRef.current = returnFocusRef
    initialFocusPropRef.current = initialFocusRef
  })

  useEffect(() => {
    if (!open) return
    const previous = (returnFocusPropRef.current?.current ?? document.activeElement) as HTMLElement | null
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const node = dialogRef.current
    const target =
      initialFocusPropRef.current?.current ?? node?.querySelector<HTMLElement>(FOCUSABLE) ?? node
    target?.focus()

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.stopPropagation()
        if (dismissibleRef.current) onCloseRef.current()
        return
      }
      if (event.key !== 'Tab' || !dialogRef.current) return
      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      )
      if (focusable.length === 0) {
        event.preventDefault()
        return
      }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement
      if (event.shiftKey && (active === first || !dialogRef.current.contains(active))) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (active === last || !dialogRef.current.contains(active))) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = overflow
      previous?.focus?.()
    }
  }, [open])

  if (!open) return null

  const layout =
    variant === 'panel'
      ? 'items-end justify-center md:items-stretch md:justify-end'
      : 'items-end justify-center sm:items-center sm:p-4'
  const shape =
    variant === 'panel'
      ? 'max-h-[92vh] rounded-t-2xl md:max-h-none md:h-full md:max-w-md md:rounded-none md:rounded-l-2xl'
      : 'max-h-[92vh] max-w-md rounded-t-2xl sm:rounded-2xl'

  return (
    <div
      className={`fixed inset-0 z-50 flex bg-black/60 ${layout}`}
      onMouseDown={(e) => {
        downOnBackdrop.current = e.target === e.currentTarget
      }}
      onClick={(e) => {
        // evita fechar ao arrastar uma seleção de dentro do diálogo até o fundo
        if (dismissible && downOnBackdrop.current && e.target === e.currentTarget) onClose()
        downOnBackdrop.current = false
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className={`flex w-full flex-col overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl ${shape} ${className}`}
      >
        {children}
      </div>
    </div>
  )
}
