import React, { lazy, Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'

// Each route becomes its own JS chunk so the initial bundle only ships what's
// needed for the current variant. Fallback is an empty black screen — same
// color as the app background so the route-swap feels instant.
const App  = lazy(() => import('./App.jsx'))
const AppB = lazy(() => import('./AppB.jsx'))
const AppC = lazy(() => import('./AppC.jsx'))
const AppD = lazy(() => import('./AppD.jsx'))
const DesignSystem = lazy(() => import('./DesignSystem.jsx'))

const Fallback = () => (
  <div style={{ position: 'fixed', inset: 0, background: '#000' }} />
)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Suspense fallback={<Fallback />}>
        <Routes>
          {/* Default route shows Version B. Version A lives at /a. */}
          <Route path="/" element={<AppB />} />
          <Route path="/a" element={<App />} />
          <Route path="/b" element={<AppB />} />
          <Route path="/c" element={<AppC />} />
          <Route path="/d" element={<AppD />} />
          <Route path="/design-system" element={<DesignSystem />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  </React.StrictMode>
)
