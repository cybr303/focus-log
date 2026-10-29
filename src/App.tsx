import { useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { Starfield } from './components/Starfield'
import { TabBar } from './components/TabBar'
import { CalendarPage } from './pages/CalendarPage'
import { HistoryPage } from './pages/HistoryPage'
import { HomePage } from './pages/HomePage'
import { InsightsPage } from './pages/InsightsPage'
import { ModuleDetailPage } from './pages/ModuleDetailPage'
import { ModulesPage } from './pages/ModulesPage'
import { SessionFormPage } from './pages/SessionFormPage'
import { SettingsPage } from './pages/SettingsPage'

export default function App() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <>
      <Starfield />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/modules" element={<ModulesPage />} />
        <Route path="/modules/:id" element={<ModuleDetailPage />} />
        <Route path="/sessions" element={<HistoryPage />} />
        <Route path="/sessions/new" element={<SessionFormPage />} />
        <Route path="/sessions/:id" element={<SessionFormPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/insights" element={<InsightsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<HomePage />} />
      </Routes>
      <TabBar />
    </>
  )
}
