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
import { EASE } from './lib/motion'
import { accentLightRgb, accentRgb } from './lib/accents'
import { useAppStore } from './store/useAppStore'

export type Route =
  | { name: 'inicio' }
  | { name: 'calculadora' }
  | { name: 'horario' }
  | { name: 'calendario' }
  | { name: 'settings' }
  | { name: 'subject'; id: string }

const TAB_ROUTES: TabId[] = ['inicio', 'calculadora', 'horario', 'calendario']

const pageVariants = {
  initial: { opacity: 0, y: 12, filter: 'blur(12px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  exit: { opacity: 0, y: -8, filter: 'blur(12px)' },
}

export default function App() {
  const [route, setRoute] = useState<Route>({ name: 'inicio' })
  const [menuOpen, setMenuOpen] = useState(false)
  const theme = useAppStore((s) => s.theme)
  const accent = useAppStore((s) => s.accent)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--accent', accentRgb(accent))
    root.style.setProperty('--accent-light', accentLightRgb(accent))
  }, [accent])

  const showTabBar = TAB_ROUTES.includes(route.name as TabId)
  const key = route.name === 'subject' ? `subject-${route.id}` : route.name

  return (
    <>
      <AnimatedMesh />
      <div className="mx-auto h-full w-full max-w-md overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={key}
            className="h-full"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.4, ease: EASE.smooth }}
          >
            {route.name === 'inicio' && <Inicio />}
            {route.name === 'calculadora' && <Calculadora navigate={setRoute} />}
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
  )
}
