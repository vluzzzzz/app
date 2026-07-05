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
      {/* Popover oscuro "Opciones" anclado sobre el botón + */}
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
              className="fixed bottom-24 right-4 z-50 w-60 rounded-3xl bg-neutral-900/95 p-2 shadow-glass-lg backdrop-blur-xl"
            >
              <p className="px-3 pb-1 pt-2 text-lg font-bold text-white">
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
              <p className="px-3 py-2 text-xs text-white/35">
                Más opciones pronto ✨
              </p>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Tarjeta blanca de Apariencia (colores + tema) */}
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
      className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-white/90 transition-colors hover:bg-white/10 active:bg-white/10"
    >
      <span className="text-white/70">{icon}</span>
      <span className="flex-1 text-[15px] font-medium">{label}</span>
      <ChevronRight className="h-4 w-4 text-white/30" />
    </button>
  )
}

function AppearanceContent() {
  const theme = useAppStore((s) => s.theme)
  const setTheme = useAppStore((s) => s.setTheme)
  const accent = useAppStore((s) => s.accent)
  const setAccent = useAppStore((s) => s.setAccent)

  return (
    <div className="space-y-4">
      {/* Tema */}
      <div className="grid grid-cols-2 gap-2">
        {(['light', 'dark'] as const).map((t) => (
          <motion.button
            key={t}
            whileTap={{ scale: 0.96 }}
            onClick={() => setTheme(t)}
            className={`rounded-2xl border px-4 py-3 text-sm font-medium transition-colors ${
              theme === t
                ? 'border-ink/60 bg-ink/15 text-ink'
                : 'border-ink/15 bg-ink/5 text-ink/60'
            }`}
          >
            {t === 'light' ? '☀️ Claro' : '🌙 Oscuro'}
          </motion.button>
        ))}
      </div>

      {/* Colores de acento */}
      <div>
        <p className="mb-2 text-sm font-medium text-ink/55">Color</p>
        <div className="grid grid-cols-5 gap-3">
          {ACCENT_THEMES.map((a) => (
            <motion.button
              key={a.id}
              whileTap={{ scale: 0.85 }}
              onClick={() => setAccent(a.id)}
              aria-label={a.label}
              className={`aspect-square rounded-full ring-2 ring-offset-2 ring-offset-surface transition-all ${
                accent === a.id ? 'ring-ink/70' : 'ring-transparent'
              }`}
              style={{ background: `rgb(${a.rgb})` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
