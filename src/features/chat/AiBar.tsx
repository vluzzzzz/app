import { motion } from 'framer-motion'
import { useAppStore } from '../../store/useAppStore'
import { accentGhost } from '../../lib/accents'

/** Barra "Pregúntale a la IA…" que vive en el espacio central del Inicio. */
export function AiBar({ onOpen }: { onOpen: () => void }) {
  const accent = useAppStore((s) => s.accent)
  const theme = useAppStore((s) => s.theme)
  return (
    <div className="flex items-center justify-center py-1">
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={onOpen}
        className="glass glass-highlight flex w-full items-center gap-3 rounded-full px-5 py-4 text-left"
      >
        <img
          src={accentGhost(accent, theme === 'dark')}
          alt="Brody"
          className="h-11 w-11 shrink-0 object-contain"
        />
        <span className="flex-1 text-[15px] font-medium text-ink/50">
          Pregúntale a Brody
        </span>
        <span
          className="flex h-9 w-9 items-center justify-center rounded-full text-surface"
          style={{ background: 'rgb(var(--accent))' }}
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
            <path d="m3.4 20.4 17.5-8.4a.8.8 0 0 0 0-1.5L3.4 2.1a.7.7 0 0 0-1 .8L4 10l11 2-11 2-1.6 7.1a.7.7 0 0 0 1 .8Z" />
          </svg>
        </span>
      </motion.button>
    </div>
  )
}
