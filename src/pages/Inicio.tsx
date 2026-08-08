import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { Route } from '../App'
import type { Task } from '../lib/types'
import { useAppStore } from '../store/useAppStore'
import { avatarSrc } from '../lib/avatars'
import { AiBar } from '../features/chat/AiBar'
import { SubjectCard } from '../features/subjects/SubjectCard'
import { TaskCard } from '../features/tasks/TaskCard'
import { TaskEditor } from '../features/tasks/TaskEditor'
import { BellIcon, CalendarIcon, FileUploadIcon, PlusIcon } from '../components/ui/Icons'

const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

export function Inicio({ navigate }: { navigate: (r: Route) => void }) {
  const userName = useAppStore((s) => s.userName)
  const avatar = useAppStore((s) => s.avatar)
  const subjects = useAppStore((s) => s.subjects)
  const tasks = useAppStore((s) => s.tasks)

  // Editor de tareas (null = crear nueva).
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<Task | null>(null)
  const openNew = () => {
    setEditing(null)
    setEditorOpen(true)
  }
  const openEdit = (t: Task) => {
    setEditing(t)
    setEditorOpen(true)
  }

  // Semana actual (lunes → domingo) con hoy resaltado.
  const now = new Date()
  const dow = (now.getDay() + 6) % 7
  const monday = new Date(now)
  monday.setDate(now.getDate() - dow)
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })

  const goAddRamo = () => navigate({ name: 'calculadora', add: true })

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto px-5 pb-28 pt-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white shadow-[var(--card-shadow)]">
            <img
              src={avatarSrc(avatar || 'happy')}
              alt="Avatar"
              className="h-full w-full object-contain"
            />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-ink/45">Bienvenido</p>
            <h1 className="truncate text-2xl font-bold leading-tight text-ink">
              {userName || 'Estudiante'}
            </h1>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button className="glass rounded-full p-2.5 text-ink/70" aria-label="Notificaciones">
            <BellIcon className="h-5 w-5" />
          </button>
          <button
            onClick={() => navigate({ name: 'calendario' })}
            className="glass rounded-full p-2.5 text-ink/70"
            aria-label="Calendario"
          >
            <CalendarIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Tira de la semana */}
      <div className="flex items-stretch justify-between gap-1 rounded-3xl bg-ink/[0.04] p-2">
        {week.map((d, i) => {
          const isToday = d.toDateString() === now.toDateString()
          return (
            <div
              key={i}
              className={`flex flex-1 flex-col items-center gap-1 rounded-2xl py-2.5 ${
                isToday
                  ? 'bg-[rgb(var(--card))] shadow-[0_4px_14px_-6px_rgba(0,0,0,0.25)]'
                  : ''
              }`}
            >
              <span
                className={`text-[11px] font-medium ${isToday ? 'text-ink/60' : 'text-ink/35'}`}
              >
                {DIAS[i]}
              </span>
              <span
                className={`text-[15px] tabular-nums ${
                  isToday ? 'font-bold text-ink' : 'font-semibold text-ink/60'
                }`}
              >
                {d.getDate()}
              </span>
            </div>
          )
        })}
      </div>

      {/* Ramos */}
      <section className="space-y-3">
        <h2 className="px-1 text-[17px] font-bold text-ink">Ramos</h2>
        {subjects.length === 0 ? (
          <button
            onClick={goAddRamo}
            className="flex w-full flex-col items-center justify-center gap-2 rounded-4xl border-2 border-dashed border-ink/15 bg-[rgb(var(--card))] py-12"
          >
            <FileUploadIcon className="h-14 w-14 text-ink" />
            <span className="rounded-lg bg-ink/5 px-2.5 py-1 text-[15px] font-semibold text-ink">
              Agregar Ramo
            </span>
            <span className="text-sm text-ink/40">Cálculo, Álgebra, etc.</span>
          </button>
        ) : (
          <div className="space-y-3">
            {subjects.map((s) => (
              <SubjectCard
                key={s.id}
                subject={s}
                onOpen={() => navigate({ name: 'subject', id: s.id })}
              />
            ))}
            <button
              onClick={goAddRamo}
              className="flex w-full items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-ink/15 py-4 text-[15px] font-semibold text-ink/55 active:bg-ink/5"
            >
              <PlusIcon className="h-5 w-5" /> Agregar Ramo
            </button>
          </div>
        )}
      </section>

      {/* Barra de Brody */}
      <AiBar onOpen={() => navigate({ name: 'chat' })} />

      {/* Tareas */}
      <section className="space-y-3">
        <h2 className="px-1 text-[17px] font-bold text-ink">Tareas</h2>
        <motion.div layout className="space-y-3">
          <AnimatePresence initial={false}>
            {tasks.map((t) => (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
              >
                <TaskCard task={t} onEdit={() => openEdit(t)} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
        <button
          onClick={openNew}
          className="flex w-full items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-ink/15 py-3.5 text-[15px] font-semibold text-ink/55 active:bg-ink/5"
        >
          <PlusIcon className="h-5 w-5" /> Agregar tarea
        </button>
      </section>

      <TaskEditor open={editorOpen} onClose={() => setEditorOpen(false)} task={editing} />
    </div>
  )
}
