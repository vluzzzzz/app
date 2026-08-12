import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import { installErrorOverlay } from './lib/errorOverlay'

installErrorOverlay()

// Registro del service worker (PWA). En modo autoUpdate recarga sola cuando hay
// una versión nueva, evitando quedar pegado en una versión vieja. onRegisterError
// silencia fallos de registro (navegadores in-app / iOS), que no son críticos.
registerSW({
  immediate: true,
  onRegisterError() {},
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
