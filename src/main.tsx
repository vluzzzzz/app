import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import { installErrorOverlay } from './lib/errorOverlay'

installErrorOverlay()

// Registro del service worker (PWA offline). Es opcional: en navegadores in-app
// (Instagram, etc.) o iOS puede fallar el registro; lo atrapamos en silencio para
// no interrumpir el login con el overlay de error.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {})
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
