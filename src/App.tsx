import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AnimatedMesh } from './components/background/AnimatedMesh'
import { TabBar, type TabId } from './components/ui/TabBar'
import { AppMenuSheet } from './components/ui/AppMenuSheet'
import { Inicio } from './pages/Inicio'
import { Calculadora } from './pages/Calculadora'
import { Horario } from './pages/Horario'
import { Calendario } from './pages/Calendario'
import { Settings } from './pages/Settings'
import { SubjectDetail } from './features/subjects/SubjectDetail'
import { ChatPage } from './features/chat/ChatPage'
import { AuthGate } from './features/auth/AuthGate'
import { Onboarding } from './features/onboarding/Onboarding'
import { FpsMeter } from './components/dev/FpsMeter'
import { EASE } from './lib/motion'
import { accentLightRgb, accentRgb } from './lib/accents'
import { useAppStore } from './store/useAppStore'

export type Route =
  | { name: 'inicio' }
  | { name: 'calculadora' }
  | { name: 'horario' }
  | { name: 'calendario' }
  | { name: 'settings' }
  | { name: 'chat' }
  | { name: 'subject'; id: string }

const TAB_ROUTES: TabId[] = ['inicio', 'calculadora', 'horario', 'calendario']

// Transición liviana: solo opacidad + un pelín de desplazamiento (composita en GPU).
const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
}

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
        <AnimatePresence mode="wait">
          <motion.div
            key={key}
            className="h-full"
            style={{ willChange: 'opacity, transform' }}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.22, ease: EASE.standard }}
          >
            {route.name === 'inicio' && <Inicio navigate={setRoute} />}
            {route.name === 'calculadora' && <Calculadora navigate={setRoute} />}
            {route.name === 'chat' && <ChatPage navigate={setRoute} />}
            {route.name === 'horario' && <Horario />}
            {route.name === 'calendario' && <Calendario />}
            {route.name === 'settings' && <Settings navigate={setRoute} />}
            {route.name === 'subject' && (
              <SubjectDetail id={route.id} navigate={setRoute} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

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
