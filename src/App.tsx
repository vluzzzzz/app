import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { AnimatedMesh } from './components/background/AnimatedMesh'
import { ErrorBoundary } from './components/ErrorBoundary'
import { TabBar, type TabId } from './components/ui/TabBar'
import { Sidebar } from './components/ui/Sidebar'
import { AppMenuSheet } from './components/ui/AppMenuSheet'
import { ChatDock } from './features/chat/ChatDock'
import { useIsDesktop } from './lib/useIsDesktop'
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
import { SharedCalendarioView } from './features/schedule/SharedCalendarioView'
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
  const isDesktop = useIsDesktop()
  // Panel de Brody en PC: preferencia por dispositivo (localStorage, no store).
  const [chatOpen, setChatOpen] = useState(() => {
    try {
      return localStorage.getItem('ui.chatDock') === '1'
    } catch {
      return false
    }
  })
  const setChatDock = (v: boolean) => {
    setChatOpen(v)
    try {
      localStorage.setItem('ui.chatDock', v ? '1' : '0')
    } catch {
      /* sin storage */
    }
  }
  // En PC, "ir al chat" significa abrir el panel lateral, no cambiar de página.
  const nav = (r: Route) => {
    if (isDesktop && r.name === 'chat') {
      setChatDock(true)
      return
    }
    setRoute(r)
  }
  // Si se cruza el umbral de PC con el chat abierto como página → pasa al panel.
  useEffect(() => {
    if (isDesktop && route.name === 'chat') {
      setRoute({ name: 'inicio' })
      setChatDock(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDesktop, route.name])
  const theme = useAppStore((s) => s.theme)
  const accent = useAppStore((s) => s.accent)
  const lite = useAppStore((s) => s.lite)
  const onboarded = useAppStore((s) => s.onboarded)

  // En el link público (/horario/...) el tema lo maneja el propio visitante
  // (interruptor en SharedHorarioView), no el tema guardado de la app.
  const isSharedRoute =
    typeof window !== 'undefined' &&
    (/^\/(horario|calendario)\//.test(window.location.pathname) ||
      new URLSearchParams(window.location.search).has('h'))

  useEffect(() => {
    if (isSharedRoute) return
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme, isSharedRoute])

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

  // Link público de horario (/horario/token, o ?h=token para links viejos):
  // vista de solo lectura, SIN login.
  const sharedToken = (() => {
    if (typeof window === 'undefined') return null
    const m = window.location.pathname.match(/^\/horario\/([A-Za-z0-9]{16,})/)
    if (m) return m[1]
    return new URLSearchParams(window.location.search).get('h')
  })()
  if (sharedToken) {
    return (
      <>
        <AnimatedMesh />
        <SharedHorarioView token={sharedToken} />
      </>
    )
  }

  // Link público de calendario (/calendario/token): igual que el horario.
  const sharedCalToken = (() => {
    if (typeof window === 'undefined') return null
    const m = window.location.pathname.match(/^\/calendario\/([A-Za-z0-9]{16,})/)
    return m ? m[1] : null
  })()
  if (sharedCalToken) {
    return (
      <>
        <AnimatedMesh />
        <SharedCalendarioView token={sharedCalToken} />
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
      <div className="h-full lg:flex">
        {/* Montaje EXCLUYENTE: Sidebar (PC) o TabBar (celu), nunca ambos —
            dos navs con layout animations a la vez confunden a framer. */}
        {isDesktop && (
          <Sidebar
            active={route.name}
            navigate={nav}
            chatOpen={chatOpen}
            onToggleChat={() => setChatDock(!chatOpen)}
            onOpenMenu={() => setMenuOpen(true)}
          />
        )}

        <main className="mx-auto h-full w-full max-w-md overflow-hidden lg:min-w-0 lg:max-w-none lg:flex-1">
          {/* Entrada por `key` (sin `exit` bloqueante) → nunca se queda en blanco al
              navegar rápido. Un ErrorBoundary por ruta captura un crash de página y se
              reinicia solo al cambiar de pestaña. */}
          <ErrorBoundary key={key}>
            <motion.div
              key={key}
              className="h-full"
              style={{ willChange: 'opacity, transform' }}
              initial={
                isDesktop
                  ? { opacity: 0, scale: 0.985, y: 10, filter: 'blur(8px)' }
                  : { opacity: 0, y: 8 }
              }
              animate={
                isDesktop
                  ? { opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }
                  : { opacity: 1, y: 0 }
              }
              transition={{ duration: isDesktop ? 0.35 : 0.22, ease: EASE.standard }}
            >
              {route.name === 'inicio' && <Inicio navigate={nav} />}
              {route.name === 'calculadora' && (
                <Calculadora navigate={nav} startAdding={route.add} />
              )}
              {route.name === 'chat' && <ChatPage navigate={nav} />}
              {route.name === 'horario' && <Horario />}
              {route.name === 'calendario' && <Calendario />}
              {route.name === 'settings' && <Settings navigate={nav} />}
              {route.name === 'profile' && <ProfilePage navigate={nav} />}
              {route.name === 'subject' && (
                <SubjectDetail id={route.id} navigate={nav} />
              )}
            </motion.div>
          </ErrorBoundary>
        </main>

        {isDesktop && <ChatDock open={chatOpen} onClose={() => setChatDock(false)} />}
      </div>

      {/* Velo degradado: el contenido se desvanece detrás de la nav flotante. */}
      {showTabBar && !isDesktop && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 h-32 bg-gradient-to-t from-[rgb(var(--surface))] via-[rgb(var(--surface))]/85 to-transparent" />
      )}

      {showTabBar && !isDesktop && (
        <TabBar
          active={route.name as TabId}
          onChange={(t) => nav({ name: t } as Route)}
          onOpenMenu={() => setMenuOpen(true)}
        />
      )}

      <AppMenuSheet
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        navigate={nav}
      />
      </>
      )}
      </AuthGate>
    </>
  )
}
