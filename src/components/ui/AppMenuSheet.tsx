import { useEffect, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { Route } from '../../App'
import { useAppStore } from '../../store/useAppStore'
import { ACCENT_THEMES } from '../../lib/accents'
import { auth } from '../../lib/firebase'
import {
  ChevronLeft,
  ChevronRight,
  LogoutIcon,
  PaletteIcon,
  ReloadIcon,
  SettingsIcon,
  TrashIcon,
} from './Icons'

// En táctil (móvil) el blur de 22px sobre el fondo en movimiento causa lag → usamos
// vidrio SÓLIDO (más opaco) solo en móvil; en PC se mantiene el blur.
const isTouch =
  typeof window !== 'undefined' &&
  window.matchMedia('(hover: none) and (pointer: coarse)').matches

// Vidrio oscuro ("plomo") para el menú Opciones.
const darkGlass = isTouch
  ? {
      background: 'rgba(24,24,28,0.94)',
      border: '1px solid rgba(255,255,255,0.12)',
    }
  : ({
      background: 'rgba(28,28,32,0.62)',
      backdropFilter: 'blur(22px) saturate(1.4)',
      WebkitBackdropFilter: 'blur(22px) saturate(1.4)',
      border: '1px solid rgba(255,255,255,0.12)',
    } as const)

// Vidrio blanco para Apariencia.
const lightGlass = isTouch
  ? {
      background: 'rgba(255,255,255,0.95)',
      border: '1px solid rgba(17,24,39,0.1)',
    }
  : ({
      background: 'rgba(255,255,255,0.75)',
      backdropFilter: 'blur(22px) saturate(1.6)',
      WebkitBackdropFilter: 'blur(22px) saturate(1.6)',
      border: '1px solid rgba(17,24,39,0.1)',
    } as const)

type View = 'menu' | 'appearance' | 'confirmReset'

export function AppMenuSheet({
  open,
  onClose,
  navigate,
}: {
  open: boolean
  onClose: () => void
  navigate: (r: Route) => void
}) {
  const [view, setView] = useState<View>('menu')
  const resetAll = useAppStore((s) => s.resetAll)

  useEffect(() => {
    if (!open) setView('menu')
  }, [open])

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
              ...(view === 'appearance' ? lightGlass : darkGlass),
              transformOrigin: 'bottom right',
            }}
            className="fixed bottom-32 right-4 z-50 w-80 overflow-hidden rounded-3xl p-2 shadow-glass-lg"
          >
            <AnimatePresence mode="wait" initial={false}>
              {view === 'menu' && (
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
                  <MenuRow
                    icon={<LogoutIcon className="h-5 w-5" />}
                    label="Cerrar sesión"
                    onClick={() => {
                      onClose()
                      auth?.signOut()
                    }}
                  />
                  <MenuRow
                    icon={<TrashIcon className="h-5 w-5" />}
                    label="Empezar de 0"
                    danger
                    onClick={() => setView('confirmReset')}
                  />
                </motion.div>
              )}

              {view === 'appearance' && (
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

              {view === 'confirmReset' && (
                <motion.div
                  key="confirm"
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                  transition={{ duration: 0.18 }}
                  className="text-white"
                >
                  <p className="px-3 pb-1 pt-2 text-lg font-bold">¿Empezar de 0?</p>
                  <p className="px-3 pb-4 text-sm leading-snug text-white/70">
                    Se borrará <b>todo</b>: tus ramos, notas y tu nombre. Volverás a la
                    presentación desde cero. Esto no se puede deshacer.
                  </p>
                  <div className="flex flex-col gap-2 px-1 pb-1">
                    <button
                      onClick={() => {
                        resetAll()
                        onClose()
                      }}
                      className="rounded-2xl bg-rose-500 px-3 py-3 text-sm font-semibold text-white active:bg-rose-600"
                    >
                      Sí, borrar todo
                    </button>
                    <button
                      onClick={() => setView('menu')}
                      className="rounded-2xl px-3 py-3 text-sm font-medium text-white/70 hover:bg-white/10"
                    >
                      Cancelar
                    </button>
                  </div>
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
  danger,
}: {
  icon: ReactNode
  label: string
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors hover:bg-white/10 active:bg-white/10 ${
        danger ? 'text-rose-300' : 'text-white/90'
      }`}
    >
      <span className={danger ? 'text-rose-300' : 'text-white/70'}>{icon}</span>
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
      {ACCENT_THEMES.map((a) => {
        const selected = accent === a.id
        return (
          <motion.button
            key={a.id}
            whileTap={{ scale: 0.9 }}
            onClick={() => setAccent(a.id)}
            aria-label={a.label}
            // Círculo por defecto; al seleccionar se MORPHEA a cuadrado redondeado.
            animate={{ borderRadius: selected ? '30%' : '50%' }}
            transition={{ type: 'spring', stiffness: 420, damping: 26 }}
            className="aspect-square"
            style={{
              // Gloss SUTIL tipo esfera pulida (como stepbro): brillo arriba + sombrita abajo.
              background: `radial-gradient(110% 110% at 32% 28%, rgba(255,255,255,0.4), rgba(255,255,255,0) 52%), rgb(${a.rgb})`,
              boxShadow: 'inset 0 -3px 6px rgba(0,0,0,0.14)',
            }}
          />
        )
      })}
    </div>
  )
}
