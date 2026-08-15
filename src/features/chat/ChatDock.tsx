import { motion } from 'framer-motion'
import { useAppStore } from '../../store/useAppStore'
import { accentGhost } from '../../lib/accents'
import { ChevronRight } from '../../components/ui/Icons'
import { ChatView } from './ChatView'

/**
 * Panel lateral derecho de Brody (solo PC): estilo copiloto. Siempre montado;
 * colapsa animando el ancho a 0, así el estado del chat (texto a medias,
 * grabación) sobrevive al cerrar/abrir. El contenido interno tiene ancho fijo
 * para que el texto no se re-acomode durante la animación.
 */
export function ChatDock({ open, onClose }: { open: boolean; onClose: () => void }) {
  const clearChat = useAppStore((s) => s.clearChat)
  const accent = useAppStore((s) => s.accent)
  const theme = useAppStore((s) => s.theme)

  return (
    <motion.aside
      initial={false}
      animate={{ width: open ? 400 : 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 34 }}
      className="h-full shrink-0 overflow-hidden border-l border-ink/5"
    >
      <div className="flex h-full w-[400px] flex-col">
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
            <ChevronRight className="h-5 w-5" />
          </button>
        </header>
        <ChatView compact />
      </div>
    </motion.aside>
  )
}
