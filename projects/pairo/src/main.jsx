import { createRoot } from 'react-dom/client'
import App from './App'
import DesignSystem from './DesignSystem'
import ErrorBoundary from './components/ErrorBoundary'

const isDesignSystem = new URLSearchParams(window.location.search).has('design-system')

if (isDesignSystem) {
  // Remove overflow:hidden set by index.html so the page can scroll
  const s = document.createElement('style')
  s.textContent = 'html, body, #root { overflow: auto !important; height: auto !important; }'
  document.head.appendChild(s)
}

createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    {isDesignSystem ? <DesignSystem /> : <App />}
  </ErrorBoundary>
)
