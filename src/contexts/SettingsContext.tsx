import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { AppLanguage } from '@/types'

const LANGUAGE_KEY = 'csc-language'

interface SettingsContextValue {
  language: AppLanguage
  setLanguage: (language: AppLanguage) => void
}

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined)

function readStoredLanguage(): AppLanguage {
  const stored = localStorage.getItem(LANGUAGE_KEY)
  return stored === 'pt' || stored === 'en' ? stored : 'en'
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>(readStoredLanguage)

  useEffect(() => {
    localStorage.setItem(LANGUAGE_KEY, language)
  }, [language])

  const setLanguage = useCallback((next: AppLanguage) => {
    setLanguageState(next)
  }, [])

  const value = useMemo(
    () => ({ language, setLanguage }),
    [language, setLanguage],
  )

  return (
    <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
  )
}

export function useSettings() {
  const context = useContext(SettingsContext)
  if (!context) {
    throw new Error('useSettings deve ser usado dentro de SettingsProvider')
  }
  return context
}
