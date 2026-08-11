import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useAppStore } from '../store/useAppStore'
import type { CalendarEvent, EventType, Task } from '../lib/types'
import {
  CLASS_TYPE_LABEL,
  DAY_NAMES,
  DAY_SHORT,
  MONTH_NAMES,
  classesForDay,
  eventsOn,
  fromDateKey,
  monthGrid,
  toDateKey,
  weekday,
} from '../lib/schedule'
import { accentRgb } from '../lib/accents'
import { EventSheet, EVENT_TYPE_LABEL } from '../features/schedule/EventSheet'
import { TaskEditor } from '../features/tasks/TaskEditor'
import { CalendarIcon, CheckIcon, ChevronLeft, ChevronRight, PlusIcon } from '../components/ui/Icons'

/** Color de acento por tipo de evento (cuando no hay ramo asociado). */
const EVENT_TYPE_RGB: Record<EventType, string> = {
  evaluacion: '239 68 68', // rojo
  tarea: '249 115 22', // naranjo
  evento: '59 130 246', // azul
  recordatorio: '139 92 246', // violeta
}

export function Calendario() {
  const classes = useAppStore((s) => s.classes)
  const events = useAppStore((s) => s.events)
  const tasks = useAppStore((s) => s.tasks)
  const subjects = useAppStore((s) => s.subjects)
  const toggleTask = useAppStore((s) => s.toggleTask)

  const today = new Date()
  const todayKey = toDateKey(today)
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selectedKey, setSelectedKey] = useState(todayKey)

  const [eventSheetOpen, setEventSheetOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [taskSheetOpen, setTaskSheetOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)

  const weeks = useMemo(() => monthGrid(year, month), [year, month])
  const selected = fromDateKey(selectedKey)

  const subjectName = (id?: string) => subjects.find((s) => s.id === id)?.name
  const subjectRgb = (id?: string) => accentRgb(subjects.find((s) => s.id === id)?.color ?? 'gray')
  const subjectColor = (id?: string) => `rgb(${subjectRgb(id)})`
  /** Color de un evento: el del ramo si tiene, si no el de su tipo. */
  const eventRgb = (e: CalendarEvent) => (e.subjectId ? subjectRgb(e.subjectId) : EVENT_TYPE_RGB[e.type])

  const changeMonth = (delta: number) => {
    const d = new Date(year, month + delta, 1)
    setYear(d.getFullYear())
    setMonth(d.getMonth())
  }
  const goToday = () => {
    setYear(today.getFullYear())
    setMonth(today.getMonth())
    setSelectedKey(todayKey)
  }

  // Elementos del día seleccionado.
  const dayClasses = classesForDay(classes, weekday(selected))
  const dayEvents = eventsOn(events, selectedKey)
  const dayTasks = tasks.filter((t) => t.date === selectedKey)
  const totalItems = dayClasses.length + dayEvents.length + dayTasks.length

  /** Colores de los puntitos de un día (máx 3): eventos + tareas. */
  const dotsFor = (d: Date): string[] => {
    const key = toDateKey(d)
    const colors: string[] = []
    for (const e of eventsOn(events, key)) colors.push(`rgb(${eventRgb(e)})`)
    for (const t of tasks.filter((x) => x.date === key)) {
      colors.push(t.color ? `rgb(${accentRgb(t.color)})` : 'rgb(var(--ink) / 0.7)')
    }
    return colors.slice(0, 3)
  }

  const openNew = () => {
    setEditingEvent(null)
    setEventSheetOpen(true)
  }

  const viewingOtherMonth = year !== today.getFullYear() || month !== today.getMonth()

  return (
    <div className="h-full overflow-y-auto px-5 pb-36 pt-6">
      <header className="mb-6 flex items-end justify-between">
        <div>
          <p className="text-sm font-medium text-ink/50">Tus fechas</p>
          <h1 className="text-[34px] font-bold leading-tight text-ink">Calendario</h1>
        </div>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={openNew}
          className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ink text-surface shadow-[0_6px_16px_-6px_rgba(0,0,0,0.4)]"
          aria-label="Agregar"
        >
          <PlusIcon className="h-6 w-6" />
        </motion.button>
      </header>

      {/* Navegación de mes */}
      <div className="mb-4 flex items-center justify-between px-1">
        <button
          onClick={() => changeMonth(-1)}
          className="flex h-9 w-9 items-center justify-center rounded-full text-ink/50 active:bg-ink/5"
          aria-label="Mes anterior"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <h2 className="text-[18px] font-bold text-ink">
            {MONTH_NAMES[month]} {year}
          </h2>
          {(viewingOtherMonth || selectedKey !== todayKey) && (
            <button
              onClick={goToday}
              className="rounded-full bg-ink/5 px-2.5 py-1 text-[12px] font-semibold text-ink/60 active:bg-ink/10"
            >
              Hoy
            </button>
          )}
        </div>
        <button
          onClick={() => changeMonth(1)}
          className="flex h-9 w-9 items-center justify-center rounded-full text-ink/50 active:bg-ink/5"
          aria-label="Mes siguiente"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Grilla mensual */}
      <div className="glass rounded-[28px] p-4">
        <div className="mb-2 grid grid-cols-7">
          {DAY_SHORT.map((d) => (
            <span key={d} className="text-center text-[11px] font-semibold uppercase text-ink/30">
              {d[0]}
            </span>
          ))}
        </div>
        {weeks.map((w, wi) => (
          <div key={wi} className="grid grid-cols-7">
            {w.map((d, di) => {
              if (!d) return <span key={di} />
              const key = toDateKey(d)
              const isToday = key === todayKey
              const isSelected = key === selectedKey
              const dots = dotsFor(d)
              return (
                <button
                  key={di}
                  onClick={() => setSelectedKey(key)}
                  className="flex flex-col items-center py-1.5"
                >
                  <span className="relative flex h-9 w-9 items-center justify-center">
                    {isSelected && (
                      <motion.span
                        layoutId="cal-daysel"
                        transition={{ type: 'spring', stiffness: 520, damping: 40 }}
                        className="absolute inset-0 rounded-full bg-ink"
                      />
                    )}
                    <span
                      className={`relative z-10 text-[15px] tabular-nums ${
                        isSelected
                          ? 'font-bold text-surface'
                          : isToday
                            ? 'font-bold text-ink'
                            : 'font-medium text-ink/70'
                      }`}
                    >
                      {d.getDate()}
                    </span>
                  </span>
                  <span className="mt-1 flex h-1.5 items-center gap-0.5">
                    {dots.map((c, i) => (
                      <span
                        key={i}
                        className="h-1 w-1 rounded-full"
                        style={{ background: isSelected ? 'rgb(var(--surface) / 0.7)' : c }}
                      />
                    ))}
                  </span>
                </button>
              )
            })}
          </div>
        ))}
      </div>

      {/* Día seleccionado */}
      <div className="mb-3 mt-6 flex items-baseline justify-between px-1">
        <h2 className="text-[18px] font-bold text-ink">
          {DAY_NAMES[weekday(selected)]} {selected.getDate()}
          <span className="font-semibold text-ink/40"> de {MONTH_NAMES[selected.getMonth()]}</span>
        </h2>
        {totalItems > 0 && (
          <span className="shrink-0 text-sm font-semibold text-ink/40">
            {totalItems} {totalItems === 1 ? 'cosa' : 'cosas'}
          </span>
        )}
      </div>

      {totalItems === 0 ? (
        <div className="glass rounded-3xl p-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-ink/5 text-ink/60">
            <CalendarIcon className="h-6 w-6" />
          </div>
          <p className="text-[15px] font-semibold text-ink">No tienes nada para este día</p>
          <p className="mt-0.5 text-sm text-ink/45">Disfruta el día.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {/* Clases del horario (derivadas) */}
          {dayClasses.map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i, 8) * 0.03 }}
              className="glass relative overflow-hidden rounded-[20px] p-4 pl-5 opacity-95"
            >
              <span
                className="absolute inset-y-2 left-0 w-1 rounded-r-full"
                style={{ background: subjectColor(c.subjectId) }}
              />
              <div className="flex items-center justify-between gap-2">
                <h3 className="truncate text-[15px] font-bold text-ink">
                  {subjectName(c.subjectId) ?? 'Clase'}
                </h3>
                <span className="shrink-0 text-[12px] font-medium text-ink/40">
                  Clase · {CLASS_TYPE_LABEL[c.type]}
                </span>
              </div>
              <p className="mt-0.5 text-sm tabular-nums text-ink/55">
                {c.start} — {c.end}
                {c.room ? ` · Sala ${c.room}` : ''}
              </p>
            </motion.div>
          ))}

          {/* Eventos */}
          {dayEvents.map((e, i) => {
            const past = selectedKey < todayKey
            return (
              <motion.button
                key={e.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(dayClasses.length + i, 8) * 0.03 }}
                whileTap={{ scale: 0.985 }}
                onClick={() => {
                  setEditingEvent(e)
                  setEventSheetOpen(true)
                }}
                className={`glass relative w-full overflow-hidden rounded-[20px] p-4 pl-5 text-left ${past ? 'opacity-60' : ''}`}
              >
                <span
                  className="absolute inset-y-2 left-0 w-1 rounded-r-full"
                  style={{ background: `rgb(${eventRgb(e)})` }}
                />
                <div className="flex items-center justify-between gap-2">
                  <h3 className="truncate text-[15px] font-bold text-ink">{e.title}</h3>
                  <span className="shrink-0 text-[12px] font-medium text-ink/40">
                    {EVENT_TYPE_LABEL[e.type]}
                  </span>
                </div>
                <p className="mt-0.5 text-sm tabular-nums text-ink/55">
                  {[subjectName(e.subjectId), e.time ?? 'Todo el día', e.location]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </motion.button>
            )
          })}

          {/* Tareas con fecha */}
          {dayTasks.map((t, i) => {
            const overdue = !t.done && t.date! < todayKey
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(dayClasses.length + dayEvents.length + i, 8) * 0.03 }}
                className={`glass relative overflow-hidden rounded-[20px] p-4 pl-5 ${t.done ? 'opacity-60' : ''}`}
              >
                <span
                  className="absolute inset-y-2 left-0 w-1 rounded-r-full"
                  style={{ background: t.color ? `rgb(${accentRgb(t.color)})` : 'rgb(var(--ink) / 0.8)' }}
                />
                <div className="flex items-center justify-between gap-2">
                  <button
                    onClick={() => {
                      setEditingTask(t)
                      setTaskSheetOpen(true)
                    }}
                    className="min-w-0 flex-1 text-left"
                  >
                    <h3 className={`truncate text-[15px] font-bold text-ink ${t.done ? 'line-through opacity-60' : ''}`}>
                      {t.title}
                    </h3>
                    <p className="mt-0.5 text-sm text-ink/55">
                      Tarea{t.time ? ` · ${t.time}` : ''}
                      {overdue && <span className="font-semibold text-rose-500"> · Vencida</span>}
                      {t.done && <span className="font-semibold text-emerald-600 dark:text-emerald-300"> · Completada</span>}
                    </p>
                  </button>
                  <button
                    onClick={() => toggleTask(t.id)}
                    aria-label={t.done ? 'Marcar pendiente' : 'Completar'}
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${
                      t.done
                        ? 'border-emerald-500 bg-emerald-500 text-white'
                        : 'border-ink/20 text-transparent'
                    }`}
                  >
                    <CheckIcon className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      <EventSheet
        open={eventSheetOpen}
        onClose={() => setEventSheetOpen(false)}
        event={editingEvent}
        defaultDate={selectedKey}
        onPickTask={() => {
          setEditingTask(null)
          setTaskSheetOpen(true)
        }}
      />
      <TaskEditor
        open={taskSheetOpen}
        onClose={() => setTaskSheetOpen(false)}
        task={editingTask}
        defaultDate={selectedKey}
      />
    </div>
  )
}
