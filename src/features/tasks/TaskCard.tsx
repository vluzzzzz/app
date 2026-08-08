import { motion } from 'framer-motion'
import type { Task } from '../../lib/types'
import { useAppStore } from '../../store/useAppStore'
import posthog from '../../lib/posthog'
import { CheckIcon, DotsIcon } from '../../components/ui/Icons'

/** "14:30" → "2:30pm". Devuelve null si no hay hora. */
export function formatTaskTime(t?: string): string | null {
  if (!t) return null
  const [hs, ms] = t.split(':')
  let h = parseInt(hs, 10)
  if (Number.isNaN(h)) return null
  const m = ms ?? '00'
  const ampm = h >= 12 ? 'pm' : 'am'
  h = h % 12 || 12
  return `${h}:${m}${ampm}`
}

/** Tarjeta de una tarea: barra de color, título, estado, hora y menú (editar). */
export function TaskCard({ task, onEdit }: { task: Task; onEdit: () => void }) {
  const toggleTask = useAppStore((s) => s.toggleTask)
  const accent = useAppStore((s) => s.accent)
  const time = formatTaskTime(task.time)
  // Barra: negra por defecto (acento gris/negro) o el color elegido en Apariencia.
  const neutral = accent === 'gray' || accent === 'black'
  const bar = { background: neutral ? 'rgb(var(--ink))' : 'rgb(var(--accent))' }

  return (
    <motion.div layout className="glass relative flex items-stretch gap-3.5 rounded-3xl p-5">
      {/* Barra de color (toca para completar) */}
      <button
        onClick={() => {
          toggleTask(task.id)
          posthog.capture('task_completion_changed', { completed: !task.done })
        }}
        aria-label={task.done ? 'Marcar pendiente' : 'Marcar hecha'}
        className="relative my-1 w-1.5 shrink-0 self-stretch rounded-full"
        style={bar}
      >
        {task.done && (
          <span className="absolute -left-1 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full bg-ink text-surface">
            <CheckIcon className="h-3 w-3" />
          </span>
        )}
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3
              className={`truncate text-[18px] font-semibold text-ink ${
                task.done ? 'line-through opacity-40' : ''
              }`}
            >
              {task.title}
            </h3>
            <p className="text-[15px] text-ink/40">{task.done ? 'Hecho' : 'Pendiente'}</p>
          </div>
          <button
            onClick={onEdit}
            aria-label="Opciones"
            className="-mr-1 -mt-1 shrink-0 rounded-full p-1.5 text-ink/30 active:bg-ink/5"
          >
            <DotsIcon className="h-5 w-5" />
          </button>
        </div>
        {time && (
          <p className="mt-3 text-right text-[15px] text-ink/40">Hoy: {time}</p>
        )}
      </div>
    </motion.div>
  )
}
