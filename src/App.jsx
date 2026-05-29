import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from './racenroam/components/ui/toaster'
import { Toaster as Sonner } from './racenroam/components/ui/sonner'
import { TooltipProvider } from './racenroam/components/ui/tooltip'
import { CartProvider } from './racenroam/context/CartContext'

// Merch/storefront pages (Lovable)
import MerchIndex    from './racenroam/pages/Index'
import MerchAuth     from './racenroam/pages/Auth'
import MerchOrders   from './racenroam/pages/Orders'
import MerchNotFound from './racenroam/pages/NotFound'

// Import racenroam merch CSS (Tailwind + shadcn variables)
import './racenroam/racenroam.css'

// Watch-party layout and pages
import Layout      from './components/Layout'
import HubPage     from './pages/HubPage'
import TodayPage   from './pages/TodayPage'
import F1Page      from './pages/F1Page'
import NascarPage  from './pages/NascarPage'
import IndyCarPage from './pages/IndyCarPage'
import ImsaWecPage from './pages/ImsaWecPage'
import MotoGPPage  from './pages/MotoGPPage'
import CalendarPage from './pages/CalendarPage'
import StreamPage  from './pages/StreamPage'

const queryClient = new QueryClient()

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <CartProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Stream mode — standalone, no layout chrome */}
              <Route path="/stream" element={<StreamPage />} />

              {/* Watch-party section — nested under /watch-party */}
              <Route path="/watch-party" element={<Layout />}>
                <Route index element={<HubPage />} />
                <Route path="today"    element={<TodayPage />} />
                <Route path="f1"       element={<F1Page />} />
                <Route path="nascar"   element={<NascarPage />} />
                <Route path="indycar"  element={<IndyCarPage />} />
                <Route path="imsa-wec" element={<ImsaWecPage />} />
                <Route path="motogp"   element={<MotoGPPage />} />
                <Route path="calendar" element={<CalendarPage />} />
              </Route>

              {/* Convenience redirects — keep old paths working */}
              <Route path="/hub"      element={<Navigate to="/watch-party" replace />} />
              <Route path="/today"    element={<Navigate to="/watch-party/today" replace />} />
              <Route path="/f1"       element={<Navigate to="/watch-party/f1" replace />} />
              <Route path="/nascar"   element={<Navigate to="/watch-party/nascar" replace />} />
              <Route path="/indycar"  element={<Navigate to="/watch-party/indycar" replace />} />
              <Route path="/imsa-wec" element={<Navigate to="/watch-party/imsa-wec" replace />} />
              <Route path="/motogp"   element={<Navigate to="/watch-party/motogp" replace />} />
              <Route path="/calendar" element={<Navigate to="/watch-party/calendar" replace />} />
              <Route path="/race-center" element={<Navigate to="/watch-party" replace />} />

              {/* Merch/storefront routes */}
              <Route path="/auth"        element={<div className="rn-app"><MerchAuth /></div>} />
              <Route path="/orders"      element={<div className="rn-app"><MerchOrders /></div>} />

              {/* Merch homepage — / renders the storefront */}
              <Route path="/" element={<div className="rn-app"><MerchIndex /></div>} />

              {/* 404 */}
              <Route path="*" element={<div className="rn-app"><MerchNotFound /></div>} />
            </Routes>
          </BrowserRouter>
        </CartProvider>
      </TooltipProvider>
    </QueryClientProvider>
  )
}
