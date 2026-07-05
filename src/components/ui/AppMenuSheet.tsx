import { useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { Route } from '../../App'
import { useAppStore } from '../../store/useAppStore'
import { ACCENT_THEMES } from '../../lib/accents'
import { GlassSheet } from './GlassSheet'
import { ChevronRight, PaletteIcon, SettingsIcon } from './Icons'

export function AppMenuSheet({
  open,
  onClose,
  navigate,
}: {
  open: boolean
  onClose: () => void
  navigate: (r: Route) => void
}) {
  const [appearance, setAppearance] = useState(false)

  function closeAll() {
    setAppearance(false)
    onClose()
  }

  return (
    <>
      {/* Popover "Opciones" en liquid glass, anclado sobre el botón + */}
      <AnimatePresence>
        {open && !appearance && (
          <>
            <motion.div
              className="fixed inset-0 z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 12 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              style={{ transformOrigin: 'bottom right' }}
              className="glass glass-highlight fixed bottom-28 right-4 z-50 w-60 rounded-3xl p-2"
            >
              <p className="px-3 pb-1 pt-2 text-lg font-bold text-ink">
                Opciones
              </p>
              <MenuRow
                icon={<PaletteIcon className="h-5 w-5" />}
                label="Apariencia"
                onClick={() => setAppearance(true)}
              />
              <MenuRow
                icon={<SettingsIcon className="h-5 w-5" />}
                label="Configuración"
                onClick={() => {
                  onClose()
                  navigate({ name: 'settings' })
                }}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Apariencia: solo colores */}
      <GlassSheet open={appearance} onClose={closeAll} title="Apariencia">
        <AppearanceContent />
      </GlassSheet>
    </>
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
      className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-ink transition-colors hover:bg-ink/10 active:bg-ink/10"
    >
      <span className="text-ink/70">{icon}</span>
      <span className="flex-1 text-[15px] font-medium">{label}</span>
      <ChevronRight className="h-4 w-4 text-ink/30" />
    </button>
  )
}

function AppearanceContent() {
  const accent = useAppStore((s) => s.accent)
  const setAccent = useAppStore((s) => s.setAccent)

  return (
    <div>
      <p className="mb-3 text-sm font-medium text-ink/55">Color</p>
      <div className="grid grid-cols-5 gap-4">
        {ACCENT_THEMES.map((a) => (
          <motion.button
            key={a.id}
            whileTap={{ scale: 0.85 }}
            onClick={() => setAccent(a.id)}
            aria-label={a.label}
            className={`aspect-square rounded-full ring-2 ring-offset-2 ring-offset-surface transition-all ${
              accent === a.id ? 'ring-ink/70' : 'ring-transparent'
            }`}
            style={{
              background: `rgb(${a.rgb})`,
              // Brillo glossy sutil (como los swatches de stepbro).
              boxShadow:
                'inset 0 2px 3px rgba(255,255,255,0.45), inset 0 -4px 7px rgba(0,0,0,0.18)',
            }}
          />
        ))}
      </div>
    </div>
  )
}
