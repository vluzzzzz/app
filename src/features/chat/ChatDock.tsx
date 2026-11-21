import { motion } from 'framer-motion'
import { useAppStore } from '../../store/useAppStore'
import { accentGhost } from '../../lib/accents'
import { ChevronDown } from '../../components/ui/Icons'
import { EASE } from '../../lib/motion'
import { ChatView } from './ChatView'

/**
 * Panel flotante de Brody (solo PC): crece desde la esquina inferior derecha
 * con scale+fade (curva emphasized de Material 3), como un copiloto que "sale"
 * del botón. Siempre montado: cuando se cierra se encoge y desactiva el puntero,
 * así el estado del chat (borrador a medias, grabación) sobrevive al cerrar/abrir.
 * El contenido interno tiene ancho fijo para que el texto no se re-acomode.
 */
export function ChatDock({ open, onClose }: { open: boolean; onClose: () => void }) {
  const clearChat = useAppStore((s) => s.clearChat)
  const accent = useAppStore((s) => s.accent)
  const theme = useAppStore((s) => s.theme)

  return (
    <motion.aside
      initial={false}
      animate={
        open
          ? { opacity: 1, scale: 1, y: 0, pointerEvents: 'auto' }
          : { opacity: 0, scale: 0.92, y: 24, pointerEvents: 'none' }
      }
      transition={{ duration: open ? 0.3 : 0.2, ease: EASE.emphasized }}
      style={{ originX: 1, originY: 1 }}
      className="fixed bottom-6 right-6 z-40 flex h-[min(720px,calc(100vh-7rem))] w-[400px] flex-col overflow-hidden rounded-[28px] border border-ink/10 bg-surface shadow-[0_30px_70px_-25px_rgba(0,0,0,0.5)]"
      aria-hidden={!open}
    >
      <header className="flex items-center gap-2.5 border-b border-ink/5 px-4 py-3">
        <img
          src={accentGhost(accent, theme === 'dark')}
          alt="Brody"
          className="h-8 w-8 object-contain"
        />
        <h2 className="flex-1 text-[16px] font-bold text-ink">Brody</h2>
        <button
          onClick={clearChat}
          className="rounded-xl px-2.5 py-1.5 text-sm font-medium text-ink/50 hover:bg-ink/5"
        >
          Limpiar
        </button>
        <button
          onClick={onClose}
          aria-label="Cerrar panel de Brody"
          className="flex h-8 w-8 items-center justify-center rounded-xl text-ink/50 hover:bg-ink/5"
        >
          <ChevronDown className="h-5 w-5" />
        </button>
      </header>
      <ChatView compact />
    </motion.aside>
  )
}
