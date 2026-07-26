import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/AppLayout'
import { EditorPage } from './pages/EditorPage'
import { HomePage } from './pages/HomePage'
import { PlaybackPage } from './pages/PlaybackPage'
import { RosterPage } from './pages/RosterPage'
import { SettingsPage } from './pages/SettingsPage'
import { UnsavedNavigationProvider } from './navigation/unsaved-navigation'

export default function App() {
  return (
    <BrowserRouter>
      <UnsavedNavigationProvider>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<HomePage />} />
            <Route path="editor" element={<EditorPage />} />
            <Route path="editor/:playId" element={<EditorPage />} />
            <Route path="playback" element={<PlaybackPage />} />
            <Route path="roster" element={<RosterPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </UnsavedNavigationProvider>
    </BrowserRouter>
  )
}
