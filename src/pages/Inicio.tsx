import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { Route } from '../App'
import type { Task } from '../lib/types'
import { useAppStore } from '../store/useAppStore'
import { avatarSrc } from '../lib/avatars'
import { AiBar } from '../features/chat/AiBar'
import { RamosCarousel } from '../features/subjects/RamosCarousel'
import { TaskCard } from '../features/tasks/TaskCard'
import { TaskEditor } from '../features/tasks/TaskEditor'
import { DashedBox } from '../components/ui/DashedBox'
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
    <div className="flex h-full flex-col gap-7 overflow-y-auto px-5 pb-36 pt-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white shadow-[var(--card-shadow)] ring-1 ring-ink/5">
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
        <div className="flex shrink-0 items-center gap-2.5">
          <button
            className="flex h-11 w-11 items-center justify-center rounded-full border border-ink/10 bg-ink/[0.02] text-ink/60"
            aria-label="Notificaciones"
          >
            <BellIcon className="h-5 w-5" />
          </button>
          <button
            onClick={() => navigate({ name: 'calendario' })}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-ink/10 bg-ink/[0.02] text-ink/60"
            aria-label="Calendario"
          >
            <CalendarIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Tira de la semana (tarjeta blanca, compacta; hoy = caja plomo) */}
      <div className="glass flex items-stretch justify-between gap-1 rounded-[26px] p-2">
        {week.map((d, i) => {
          const isToday = d.toDateString() === now.toDateString()
          return (
            <div
              key={i}
              className={`flex flex-1 flex-col items-center justify-center gap-1 rounded-2xl py-2.5 ${
                isToday ? 'bg-ink/[0.07]' : ''
              }`}
            >
              <span
                className={`text-[12px] font-medium ${isToday ? 'text-ink/45' : 'text-ink/35'}`}
              >
                {DIAS[i]}
              </span>
              <span
                className={`tabular-nums ${
                  isToday ? 'text-[17px] font-bold text-ink' : 'text-[16px] font-semibold text-ink/45'
                }`}
              >
                {d.getDate()}
              </span>
            </div>
          )
        })}
      </div>

      {/* Ramos */}
      <section className="space-y-4">
        <h2 className="px-1 text-[17px] font-bold text-ink/70">Ramos</h2>
        {subjects.length === 0 ? (
          <div className="glass rounded-[32px] p-2.5">
            <DashedBox
              rx={26}
              onClick={goAddRamo}
              className="flex w-full flex-col items-center justify-center gap-2.5 py-9"
            >
              <FileUploadIcon className="h-16 w-16 text-ink" />
              <span className="rounded-lg bg-ink/[0.06] px-3 py-1 text-[17px] font-semibold text-ink">
                Agregar Ramo
              </span>
              <span className="text-[13px] text-ink/40">Cálculo, Álgebra, etc.</span>
            </DashedBox>
          </div>
        ) : (
          <RamosCarousel
            subjects={subjects}
            onOpen={(id) => navigate({ name: 'subject', id })}
          />
        )}
      </section>

      {/* Barra de Brody (chica y centrada) */}
      <AiBar onOpen={() => navigate({ name: 'chat' })} />

      {/* Tareas */}
      <section className="space-y-4">
        <h2 className="px-1 text-[17px] font-bold text-ink/70">Tareas</h2>
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
        <DashedBox
          rx={22}
          onClick={openNew}
          className="flex w-full items-center justify-center gap-2 py-3.5 text-[15px] font-semibold text-ink/55"
        >
          <PlusIcon className="h-5 w-5" /> Agregar tarea
        </DashedBox>
      </section>

      <TaskEditor open={editorOpen} onClose={() => setEditorOpen(false)} task={editing} />
    </div>
  )
}
