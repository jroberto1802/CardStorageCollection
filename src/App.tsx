import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { SettingsProvider } from '@/contexts/SettingsContext'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { AppLayout } from '@/components/AppLayout'
import { LoginPage } from '@/pages/LoginPage'
import { HomePage } from '@/pages/HomePage'
import { SettingsPage } from '@/pages/SettingsPage'
import { CardDetailPage } from '@/pages/CardDetailPage'
import { CollectionPage } from '@/pages/CollectionPage'
import { DecksPage } from '@/pages/DecksPage'
import { DeckBuilderPage } from '@/pages/DeckBuilderPage'
import { CommunityDecksPage } from '@/pages/CommunityDecksPage'
import { CommunityDeckDetailPage } from '@/pages/CommunityDeckDetailPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SettingsProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/cards/:cardId" element={<CardDetailPage />} />
                <Route path="/collection" element={<CollectionPage />} />
                <Route path="/community" element={<CommunityDecksPage />} />
                <Route
                  path="/community/:syncedDeckId"
                  element={<CommunityDeckDetailPage />}
                />
                <Route path="/decks" element={<DecksPage />} />
                <Route path="/decks/:deckId" element={<DeckBuilderPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </SettingsProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
