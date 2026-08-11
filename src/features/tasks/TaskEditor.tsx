import { useEffect, useState } from 'react'
import type { Task } from '../../lib/types'
import { useAppStore } from '../../store/useAppStore'
import { GlassSheet } from '../../components/ui/GlassSheet'
import { TrashIcon } from '../../components/ui/Icons'

type Props = {
  open: boolean
  onClose: () => void
  /** Tarea a editar, o null para crear una nueva. */
  task: Task | null
  /** Fecha preseleccionada "YYYY-MM-DD" al crear (desde el Calendario). */
  defaultDate?: string
}

/** Hoja para crear/editar una tarea: título, fecha, hora. */
export function TaskEditor({ open, onClose, task, defaultDate }: Props) {
  const addTask = useAppStore((s) => s.addTask)
  const updateTask = useAppStore((s) => s.updateTask)
  const removeTask = useAppStore((s) => s.removeTask)

  const [title, setTitle] = useState('')
  const [time, setTime] = useState('')
  const [date, setDate] = useState('')

  // Cargar los valores de la tarea (o limpiar) cada vez que se abre.
  useEffect(() => {
    if (!open) return
    setTitle(task?.title ?? '')
    setTime(task?.time ?? '')
    setDate(task?.date ?? defaultDate ?? '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, task])

  const save = () => {
    const t = title.trim()
    if (!t) return
    const patch = { title: t, time: time || undefined, date: date || undefined }
    if (task) updateTask(task.id, patch)
    else addTask(patch)
    onClose()
  }

  const del = () => {
    if (task) removeTask(task.id)
    onClose()
  }

  return (
    <GlassSheet open={open} onClose={onClose} title={task ? 'Editar tarea' : 'Nueva tarea'}>
      <div className="space-y-5 pt-1">
        {/* Título */}
        <div>
          <label className="mb-1.5 block px-1 text-sm font-medium text-ink/55">Tarea</label>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej: Estudiar para el certamen"
            className="glass w-full rounded-2xl px-4 py-3.5 text-[15px] text-ink placeholder:text-ink/35 focus:outline-none"
          />
        </div>

        {/* Fecha + Hora */}
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="mb-1.5 block px-1 text-sm font-medium text-ink/55">
              Fecha (opcional)
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="glass w-full rounded-2xl px-4 py-3.5 text-[15px] text-ink focus:outline-none"
            />
          </div>
          <div className="flex-1">
            <label className="mb-1.5 block px-1 text-sm font-medium text-ink/55">
              Hora (opcional)
            </label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="glass w-full rounded-2xl px-4 py-3.5 text-[15px] text-ink focus:outline-none"
            />
          </div>
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-3 pt-1">
          {task && (
            <button
              onClick={del}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500 active:bg-rose-500/20"
              aria-label="Eliminar"
            >
              <TrashIcon className="h-5 w-5" />
            </button>
          )}
          <button
            onClick={save}
            disabled={!title.trim()}
            className="h-12 flex-1 rounded-2xl bg-ink text-[15px] font-semibold text-surface transition active:opacity-80 disabled:opacity-30"
          >
            {task ? 'Guardar' : 'Agregar tarea'}
          </button>
        </div>
      </div>
    </GlassSheet>
  )
}
