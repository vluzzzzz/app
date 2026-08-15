import { motion } from 'framer-motion'
import type { Route } from '../../App'
import { useAppStore } from '../../store/useAppStore'
import { ChevronLeft } from '../../components/ui/Icons'
import { ChatView } from './ChatView'

/**
 * Página del chat de Brody (celular): header con volver/limpiar + el chat
 * completo (ChatView). En PC el chat vive en el panel lateral (ChatDock).
 */
export function ChatPage({ navigate }: { navigate: (r: Route) => void }) {
  const clearChat = useAppStore((s) => s.clearChat)

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between px-4 pt-4">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate({ name: 'inicio' })}
          className="glass glass-highlight rounded-2xl p-2.5 text-ink/80"
        >
          <ChevronLeft className="h-5 w-5" />
        </motion.button>
        <h1 className="text-lg font-bold text-ink">Brody</h1>
        <button
          onClick={clearChat}
          className="rounded-2xl px-3 py-2 text-sm font-medium text-ink/50"
        >
          Limpiar
        </button>
      </header>
      <ChatView />
    </div>
  )
}
