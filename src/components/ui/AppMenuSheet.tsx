import { useEffect, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { Route } from '../../App'
import { useAppStore } from '../../store/useAppStore'
import { ACCENT_THEMES } from '../../lib/accents'
import {
  ChevronLeft,
  ChevronRight,
  PaletteIcon,
  ReloadIcon,
  SettingsIcon,
} from './Icons'

// Vidrio oscuro ("plomo") para el menú Opciones.
const darkGlass = {
  background: 'rgba(28,28,32,0.62)',
  backdropFilter: 'blur(22px) saturate(1.4)',
  WebkitBackdropFilter: 'blur(22px) saturate(1.4)',
  border: '1px solid rgba(255,255,255,0.12)',
} as const

// Vidrio blanco para Apariencia.
const lightGlass = {
  background: 'rgba(255,255,255,0.75)',
  backdropFilter: 'blur(22px) saturate(1.6)',
  WebkitBackdropFilter: 'blur(22px) saturate(1.6)',
  border: '1px solid rgba(17,24,39,0.1)',
} as const

export function AppMenuSheet({
  open,
  onClose,
  navigate,
}: {
  open: boolean
  onClose: () => void
  navigate: (r: Route) => void
}) {
  const [view, setView] = useState<'menu' | 'appearance'>('menu')

  useEffect(() => {
    if (!open) setView('menu')
  }, [open])

  const isMenu = view === 'menu'

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            layout
            initial={{ opacity: 0, scale: 0.9, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 12 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            style={{
              ...(isMenu ? darkGlass : lightGlass),
              transformOrigin: 'bottom right',
            }}
            className="fixed bottom-32 right-4 z-50 w-80 overflow-hidden rounded-3xl p-2 shadow-glass-lg"
          >
            <AnimatePresence mode="wait" initial={false}>
              {isMenu ? (
                <motion.div
                  key="menu"
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.18 }}
                  className="text-white"
                >
                  <p className="px-3 pb-1 pt-2 text-lg font-bold">Opciones</p>
                  <MenuRow
                    icon={<PaletteIcon className="h-5 w-5" />}
                    label="Apariencia"
                    onClick={() => setView('appearance')}
                  />
                  <MenuRow
                    icon={<SettingsIcon className="h-5 w-5" />}
                    label="Configuración"
                    onClick={() => {
                      onClose()
                      navigate({ name: 'settings' })
                    }}
                  />
                  <MenuRow
                    icon={<ReloadIcon className="h-5 w-5" />}
                    label="Recargar app"
                    onClick={() => window.location.reload()}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="appearance"
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                  transition={{ duration: 0.18 }}
                  className="text-ink"
                >
                  <div className="flex items-center gap-1 px-1 pb-3 pt-1">
                    <button
                      onClick={() => setView('menu')}
                      className="rounded-full p-1.5 text-ink/80 hover:bg-ink/10"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <span className="text-lg font-bold">Apariencia</span>
                  </div>
                  <AppearanceColors />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

function MenuRow({
  icon,
  label,
  onClick,
}: {
  icon: ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-white/90 transition-colors hover:bg-white/10 active:bg-white/10"
    >
      <span className="text-white/70">{icon}</span>
      <span className="flex-1 text-[15px] font-medium">{label}</span>
      <ChevronRight className="h-4 w-4 text-white/30" />
    </button>
  )
}

function AppearanceColors() {
  const accent = useAppStore((s) => s.accent)
  const setAccent = useAppStore((s) => s.setAccent)

  return (
    <div className="grid grid-cols-4 gap-3.5 px-2 pb-2">
      {ACCENT_THEMES.map((a) => (
        <motion.button
          key={a.id}
          whileTap={{ scale: 0.9 }}
          onClick={() => setAccent(a.id)}
          aria-label={a.label}
          className={`aspect-square rounded-full ring-2 ring-offset-2 ring-offset-white transition-all ${
            accent === a.id ? 'ring-ink/70' : 'ring-transparent'
          }`}
          style={{
            // Glossy tipo esfera (brillo arriba-izq + sombra abajo), como stepbro.
            background: `radial-gradient(120% 120% at 32% 26%, rgba(255,255,255,0.6), rgba(255,255,255,0) 44%), rgb(${a.rgb})`,
            boxShadow: 'inset 0 -5px 9px rgba(0,0,0,0.25)',
          }}
        />
      ))}
    </div>
  )
}
