import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
} from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  batchReducer,
  initialBatchState,
  loadDraft,
  loadLastRarities,
  loadLastSet,
  saveDraft,
  saveLastRarities,
  saveLastSet,
  setKey,
  type ActiveSet,
  type BatchAction,
  type BatchAddition,
  type BatchState,
  type QuickProblem,
} from '@/utils/quickEntry'

interface QuickBatchValue {
  state: BatchState
  dispatch: Dispatch<BatchAction>
  activeSet: ActiveSet | null
  setActiveSet: (set: ActiveSet | null) => void
  problems: QuickProblem[]
  addProblems: (items: QuickProblem[]) => void
  removeProblem: (id: string) => void
  clearProblems: () => void
  /** Última raridade usada no set (padrão da próxima carta) */
  lastRarityFor: (set: ActiveSet) => string | null
  rememberRarity: (set: ActiveSet, rarity: string) => void
  /** Scanner: entra direto no lote, sem set ativo */
  addFromScanner: (addition: BatchAddition) => void
}

const QuickBatchContext = createContext<QuickBatchValue | null>(null)

/**
 * Estado ÚNICO do lote de cadastro rápido, compartilhado pela tela de Entrada rápida e pelo Scanner.
 * O lote (linhas) é persistido em localStorage como rascunho e restaurado ao recarregar.
 */
export function QuickBatchProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const [state, dispatch] = useReducer(batchReducer, undefined, (): BatchState => {
    const draft = loadDraft(userId)
    return draft ? { lines: draft.lines, history: [] } : initialBatchState
  })
  const [activeSet, setActiveSetState] = useState<ActiveSet | null>(() => loadDraft(userId)?.activeSet ?? loadLastSet())
  const [problems, setProblems] = useState<QuickProblem[]>([])
  const lastRarities = useRef<Record<string, string>>(loadLastRarities())

  useEffect(() => {
    saveDraft({ activeSet, lines: state.lines }, userId)
  }, [state.lines, activeSet, userId])

  const setActiveSet = useCallback((set: ActiveSet | null) => {
    setActiveSetState(set)
    if (set) saveLastSet(set)
  }, [])

  const addProblems = useCallback((items: QuickProblem[]) => {
    if (items.length) setProblems((prev) => [...items, ...prev])
  }, [])
  const removeProblem = useCallback((id: string) => setProblems((prev) => prev.filter((p) => p.id !== id)), [])
  const clearProblems = useCallback(() => setProblems([]), [])

  const lastRarityFor = useCallback((set: ActiveSet) => lastRarities.current[setKey(set)] ?? null, [])
  const rememberRarity = useCallback((set: ActiveSet, rarity: string) => {
    lastRarities.current = { ...lastRarities.current, [setKey(set)]: rarity }
    saveLastRarities(lastRarities.current)
  }, [])

  const addFromScanner = useCallback((addition: BatchAddition) => dispatch({ type: 'add', items: [addition] }), [])

  const value = useMemo(
    () => ({
      state,
      dispatch,
      activeSet,
      setActiveSet,
      problems,
      addProblems,
      removeProblem,
      clearProblems,
      lastRarityFor,
      rememberRarity,
      addFromScanner,
    }),
    [state, activeSet, setActiveSet, problems, addProblems, removeProblem, clearProblems, lastRarityFor, rememberRarity, addFromScanner],
  )

  return <QuickBatchContext.Provider value={value}>{children}</QuickBatchContext.Provider>
}

export function useQuickBatch(): QuickBatchValue {
  const ctx = useContext(QuickBatchContext)
  if (!ctx) throw new Error('useQuickBatch deve ser usado dentro de QuickBatchProvider')
  return ctx
}
