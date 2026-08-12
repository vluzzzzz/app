import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { AnimatedMesh } from './components/background/AnimatedMesh'
import { ErrorBoundary } from './components/ErrorBoundary'
import { TabBar, type TabId } from './components/ui/TabBar'
import { AppMenuSheet } from './components/ui/AppMenuSheet'
import { Inicio } from './pages/Inicio'
import { Calculadora } from './pages/Calculadora'
import { Horario } from './pages/Horario'
import { Calendario } from './pages/Calendario'
import { Settings } from './pages/Settings'
import { SubjectDetail } from './features/subjects/SubjectDetail'
import { ChatPage } from './features/chat/ChatPage'
import { ProfilePage } from './features/profile/ProfilePage'
import { AuthGate } from './features/auth/AuthGate'
import { SharedHorarioView } from './features/schedule/SharedHorarioView'
import { Onboarding } from './features/onboarding/Onboarding'
import { FpsMeter } from './components/dev/FpsMeter'
import { EASE } from './lib/motion'
import { accentLightRgb, accentRgb } from './lib/accents'
import { useAppStore } from './store/useAppStore'

export type Route =
  | { name: 'inicio' }
  | { name: 'calculadora'; add?: boolean }
  | { name: 'horario' }
  | { name: 'calendario' }
  | { name: 'settings' }
  | { name: 'chat' }
  | { name: 'profile' }
  | { name: 'subject'; id: string }

const TAB_ROUTES: TabId[] = ['inicio', 'calculadora', 'horario', 'calendario']

export default function App() {
  const [route, setRoute] = useState<Route>({ name: 'inicio' })
  const [menuOpen, setMenuOpen] = useState(false)
  const theme = useAppStore((s) => s.theme)
  const accent = useAppStore((s) => s.accent)
  const lite = useAppStore((s) => s.lite)
  const onboarded = useAppStore((s) => s.onboarded)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  useEffect(() => {
    document.documentElement.classList.toggle('lite', lite)
  }, [lite])

  useEffect(() => {
    const root = document.documentElement
    // El acento negro en tema oscuro desaparece sobre el fondo → usar tono claro
    // para que los resaltes (día activo, botones, etc.) sigan visibles.
    const darkBlack = theme === 'dark' && accent === 'black'
    root.style.setProperty(
      '--accent',
      darkBlack ? '228 228 231' : accentRgb(accent),
    )
    root.style.setProperty(
      '--accent-light',
      darkBlack ? '244 244 245' : accentLightRgb(accent),
    )
  }, [accent, theme])

  const showTabBar = TAB_ROUTES.includes(route.name as TabId)
  const key = route.name === 'subject' ? `subject-${route.id}` : route.name

  const showFps =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).has('fps')

  // Link público de horario (?h=token): vista de solo lectura, SIN login.
  const sharedToken =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('h')
      : null
  if (sharedToken) {
    return (
      <>
        <AnimatedMesh />
        <SharedHorarioView token={sharedToken} />
      </>
    )
  }

  return (
    <>
      {showFps && <FpsMeter />}
      <AnimatedMesh />
      <AuthGate>
      {!onboarded ? (
        <Onboarding />
      ) : (
      <>
      <div className="mx-auto h-full w-full max-w-md overflow-hidden">
        {/* Entrada por `key` (sin `exit` bloqueante) → nunca se queda en blanco al
            navegar rápido. Un ErrorBoundary por ruta captura un crash de página y se
            reinicia solo al cambiar de pestaña. */}
        <ErrorBoundary key={key}>
          <motion.div
            key={key}
            className="h-full"
            style={{ willChange: 'opacity, transform' }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: EASE.standard }}
          >
            {route.name === 'inicio' && <Inicio navigate={setRoute} />}
            {route.name === 'calculadora' && (
              <Calculadora navigate={setRoute} startAdding={route.add} />
            )}
            {route.name === 'chat' && <ChatPage navigate={setRoute} />}
            {route.name === 'horario' && <Horario />}
            {route.name === 'calendario' && <Calendario />}
            {route.name === 'settings' && <Settings navigate={setRoute} />}
            {route.name === 'profile' && <ProfilePage navigate={setRoute} />}
            {route.name === 'subject' && (
              <SubjectDetail id={route.id} navigate={setRoute} />
            )}
          </motion.div>
        </ErrorBoundary>
      </div>

      {/* Velo degradado: el contenido se desvanece detrás de la nav flotante. */}
      {showTabBar && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 h-32 bg-gradient-to-t from-[rgb(var(--surface))] via-[rgb(var(--surface))]/85 to-transparent" />
      )}

      {showTabBar && (
        <TabBar
          active={route.name as TabId}
          onChange={(t) => setRoute({ name: t } as Route)}
          onOpenMenu={() => setMenuOpen(true)}
        />
      )}

      <AppMenuSheet
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        navigate={setRoute}
      />
      </>
      )}
      </AuthGate>
    </>
  )
}
