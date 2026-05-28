import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import HomePage    from './pages/HomePage'
import HubPage     from './pages/HubPage'
import TodayPage   from './pages/TodayPage'
import F1Page      from './pages/F1Page'
import NascarPage  from './pages/NascarPage'
import IndyCarPage from './pages/IndyCarPage'
import ImsaWecPage from './pages/ImsaWecPage'
import MotoGPPage  from './pages/MotoGPPage'
import CalendarPage from './pages/CalendarPage'
import StreamPage  from './pages/StreamPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Stream mode has its own minimal layout */}
        <Route path="/stream" element={<StreamPage />} />

        {/* All other routes use the main Layout */}
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="/hub"      element={<HubPage />} />
          <Route path="/today"    element={<TodayPage />} />
          <Route path="/f1"       element={<F1Page />} />
          <Route path="/nascar"   element={<NascarPage />} />
          <Route path="/indycar"  element={<IndyCarPage />} />
          <Route path="/imsa-wec" element={<ImsaWecPage />} />
          <Route path="/motogp"   element={<MotoGPPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          {/* Redirect legacy/unknown paths to hub */}
          <Route path="*" element={<Navigate to="/hub" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
