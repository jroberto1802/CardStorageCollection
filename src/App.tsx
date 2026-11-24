import { Suspense, lazy } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { SettingsProvider } from '@/contexts/SettingsContext'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { AppLayout } from '@/components/AppLayout'
import { RouteFallback } from '@/components/RouteFallback'
import { LoginPage } from '@/pages/LoginPage'
import { HomePage } from '@/pages/HomePage'

// Páginas carregadas sob demanda (code-splitting por rota). As páginas exportam
// componentes nomeados, então mapeamos para o default esperado pelo React.lazy.
const SettingsPage = lazy(() => import('@/pages/SettingsPage').then((m) => ({ default: m.SettingsPage })))
const CardDetailPage = lazy(() => import('@/pages/CardDetailPage').then((m) => ({ default: m.CardDetailPage })))
const CollectionPage = lazy(() => import('@/pages/CollectionPage').then((m) => ({ default: m.CollectionPage })))
const DecksPage = lazy(() => import('@/pages/DecksPage').then((m) => ({ default: m.DecksPage })))
const DeckBuilderPage = lazy(() => import('@/pages/DeckBuilderPage').then((m) => ({ default: m.DeckBuilderPage })))
const CharactersPage = lazy(() => import('@/pages/CharactersPage').then((m) => ({ default: m.CharactersPage })))
const CharacterDetailPage = lazy(() =>
  import('@/pages/CharacterDetailPage').then((m) => ({ default: m.CharacterDetailPage })),
)
const CharacterDeckPage = lazy(() =>
  import('@/pages/CharacterDeckPage').then((m) => ({ default: m.CharacterDeckPage })),
)
const CommunityDecksPage = lazy(() =>
  import('@/pages/CommunityDecksPage').then((m) => ({ default: m.CommunityDecksPage })),
)
const CommunityDeckDetailPage = lazy(() =>
  import('@/pages/CommunityDeckDetailPage').then((m) => ({ default: m.CommunityDeckDetailPage })),
)
const QuickEntryPage = lazy(() => import('@/pages/QuickEntryPage').then((m) => ({ default: m.QuickEntryPage })))
const CardScannerPage = lazy(() => import('@/pages/CardScannerPage').then((m) => ({ default: m.CardScannerPage })))

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SettingsProvider>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />

              <Route element={<ProtectedRoute />}>
                <Route element={<AppLayout />}>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/cards/:cardId" element={<CardDetailPage />} />
                  <Route path="/collection" element={<CollectionPage />} />
                  <Route path="/collection/rapido" element={<QuickEntryPage />} />
                  <Route path="/scanner" element={<CardScannerPage />} />
                  <Route path="/community" element={<CommunityDecksPage />} />
                  <Route
                    path="/community/:syncedDeckId"
                    element={<CommunityDeckDetailPage />}
                  />
                  <Route path="/decks" element={<DecksPage />} />
                  <Route path="/decks/:deckId" element={<DeckBuilderPage />} />
                  <Route path="/characters" element={<CharactersPage />} />
                  <Route path="/characters/:slug" element={<CharacterDetailPage />} />
                  <Route
                    path="/characters/:slug/decks/:deckSlug"
                    element={<CharacterDeckPage />}
                  />
                  <Route path="/settings" element={<SettingsPage />} />
                </Route>
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </SettingsProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
