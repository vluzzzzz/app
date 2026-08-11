import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useAppStore } from '../store/useAppStore'
import type { CalendarEvent, Task } from '../lib/types'
import {
  CLASS_TYPE_LABEL,
  DAY_SHORT,
  classesForDay,
  eventsOn,
  fromDateKey,
  humanDate,
  MONTH_NAMES,
  monthGrid,
  toDateKey,
  weekday,
} from '../lib/schedule'
import { accentRgb } from '../lib/accents'
import { EventSheet, EVENT_TYPE_LABEL } from '../features/schedule/EventSheet'
import { TaskEditor } from '../features/tasks/TaskEditor'
import { CalendarIcon, CheckIcon, ChevronLeft, ChevronRight, PlusIcon } from '../components/ui/Icons'

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
  const subjectColor = (id?: string) =>
    `rgb(${accentRgb(subjects.find((s) => s.id === id)?.color ?? 'gray')})`

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

  /** ¿Un día tiene algo? (para los puntitos; clases no cuentan, solo eventos/tareas). */
  const dotsFor = (d: Date): number => {
    const key = toDateKey(d)
    const n = eventsOn(events, key).length + tasks.filter((t) => t.date === key).length
    return Math.min(n, 3)
  }

  const openNew = () => {
    setEditingEvent(null)
    setEventSheetOpen(true)
  }

  const viewingOtherMonth = year !== today.getFullYear() || month !== today.getMonth()

  return (
    <div className="h-full overflow-y-auto px-5 pb-36 pt-6">
      <header className="mb-5 flex items-end justify-between">
        <div>
          <p className="text-sm font-medium text-ink/50">Tus fechas</p>
          <h1 className="text-[34px] font-bold leading-tight text-ink">Calendario</h1>
        </div>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={openNew}
          className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ink text-surface"
          aria-label="Agregar"
        >
          <PlusIcon className="h-6 w-6" />
        </motion.button>
      </header>

      {/* Navegación de mes */}
      <div className="mb-3 flex items-center justify-between px-1">
        <button
          onClick={() => changeMonth(-1)}
          className="rounded-xl p-2 text-ink/50 active:bg-ink/5"
          aria-label="Mes anterior"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <h2 className="text-[17px] font-bold text-ink">
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
          className="rounded-xl p-2 text-ink/50 active:bg-ink/5"
          aria-label="Mes siguiente"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Grilla mensual */}
      <div className="glass rounded-3xl p-3">
        <div className="mb-1 grid grid-cols-7">
          {DAY_SHORT.map((d) => (
            <span key={d} className="text-center text-[11px] font-semibold text-ink/35">
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
                  className="flex flex-col items-center py-1"
                >
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-full text-[15px] tabular-nums ${
                      isSelected
                        ? 'bg-ink font-bold text-surface'
                        : isToday
                          ? 'bg-ink/[0.08] font-bold text-ink'
                          : 'font-medium text-ink/70'
                    }`}
                  >
                    {d.getDate()}
                  </span>
                  <span className="mt-0.5 flex h-1.5 gap-0.5">
                    {Array.from({ length: dots }).map((_, i) => (
                      <span
                        key={i}
                        className={`h-1 w-1 rounded-full ${isSelected ? 'bg-ink/60' : 'bg-ink/30'}`}
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
      <div className="mb-3 mt-5 flex items-center justify-between px-1">
        <h2 className="text-[17px] font-bold text-ink/70">{humanDate(selected)}</h2>
        {totalItems > 0 && (
          <span className="text-sm font-semibold text-ink/45">
            {totalItems} {totalItems === 1 ? 'cosa' : 'cosas'}
          </span>
        )}
      </div>

      {totalItems === 0 ? (
        <div className="glass rounded-3xl p-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-ink/5 text-ink/60">
            <CalendarIcon className="h-6 w-6" />
          </div>
          <p className="text-[15px] font-semibold text-ink">No tienes nada para este día</p>
          <p className="mt-0.5 text-sm text-ink/45">Disfruta el día.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {/* Clases del horario (derivadas) */}
          {dayClasses.map((c) => (
            <div key={c.id} className="glass relative overflow-hidden rounded-2xl p-4 pl-5 opacity-90">
              <span
                className="absolute inset-y-0 left-0 w-1.5"
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
            </div>
          ))}

          {/* Eventos */}
          {dayEvents.map((e) => {
            const past = selectedKey < todayKey
            return (
              <motion.button
                key={e.id}
                whileTap={{ scale: 0.985 }}
                onClick={() => {
                  setEditingEvent(e)
                  setEventSheetOpen(true)
                }}
                className={`glass relative w-full overflow-hidden rounded-2xl p-4 pl-5 text-left ${past ? 'opacity-60' : ''}`}
              >
                <span
                  className="absolute inset-y-0 left-0 w-1.5"
                  style={{ background: e.subjectId ? subjectColor(e.subjectId) : 'rgb(var(--ink) / 0.35)' }}
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
          {dayTasks.map((t) => {
            const overdue = !t.done && t.date! < todayKey
            return (
              <div key={t.id} className={`glass relative overflow-hidden rounded-2xl p-4 pl-5 ${t.done ? 'opacity-60' : ''}`}>
                <span className="absolute inset-y-0 left-0 w-1.5 bg-ink/80" />
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
              </div>
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
