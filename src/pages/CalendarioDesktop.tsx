import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useAppStore } from '../store/useAppStore'
import type { CalendarEvent, EventType, Task } from '../lib/types'
import {
  CLASS_TYPE_LABEL,
  DAY_NAMES,
  MONTH_NAMES,
  classesForDay,
  eventsOn,
  fromDateKey,
  monthGrid,
  toDateKey,
  weekday,
} from '../lib/schedule'
import { accentRgb } from '../lib/accents'
import { EASE } from '../lib/motion'
import { EventSheet, EVENT_TYPE_LABEL } from '../features/schedule/EventSheet'
import { TaskEditor } from '../features/tasks/TaskEditor'
import { ShareCalendarioSheet } from '../features/schedule/ShareCalendarioSheet'
import {
  CalendarIcon,
  CheckIcon,
  ChevronLeft,
  ChevronRight,
  PlusIcon,
  ShareIcon,
} from '../components/ui/Icons'

const EVENT_TYPE_RGB: Record<EventType, string> = {
  evaluacion: '239 68 68',
  tarea: '249 115 22',
  evento: '59 130 246',
  recordatorio: '139 92 246',
}

type DayItem = {
  kind: 'event' | 'task'
  id: string
  title: string
  time?: string
  rgb: string
  ref: CalendarEvent | Task
}

/**
 * Calendario del modo PC (≥1024px): mes a pantalla completa con celdas grandes
 * y un panel lateral que se desliza al abrir un día (estilo app de escritorio).
 * El calendario del celular vive intacto en Calendario.tsx (CalendarioMobile).
 */
export function CalendarioDesktop() {
  const classes = useAppStore((s) => s.classes)
  const events = useAppStore((s) => s.events)
  const tasks = useAppStore((s) => s.tasks)
  const subjects = useAppStore((s) => s.subjects)
  const toggleTask = useAppStore((s) => s.toggleTask)

  const today = new Date()
  const todayKey = toDateKey(today)
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [monthDir, setMonthDir] = useState(0)
  // Día abierto en el panel lateral (null = panel cerrado).
  const [openKey, setOpenKey] = useState<string | null>(null)

  const [eventSheetOpen, setEventSheetOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [taskSheetOpen, setTaskSheetOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [shareOpen, setShareOpen] = useState(false)

  const weeks = useMemo(() => monthGrid(year, month), [year, month])

  const subjectName = (id?: string) => subjects.find((s) => s.id === id)?.name
  const subjectRgb = (id?: string) => accentRgb(subjects.find((s) => s.id === id)?.color ?? 'gray')
  const subjectColor = (id?: string) => `rgb(${subjectRgb(id)})`
  const eventRgb = (e: CalendarEvent) => (e.subjectId ? subjectRgb(e.subjectId) : EVENT_TYPE_RGB[e.type])

  const changeMonth = (delta: number) => {
    setMonthDir(delta)
    const d = new Date(year, month + delta, 1)
    setYear(d.getFullYear())
    setMonth(d.getMonth())
  }
  const goToday = () => {
    setMonthDir(0)
    setYear(today.getFullYear())
    setMonth(today.getMonth())
  }

  /** Eventos + tareas de un día, ya ordenados por hora. */
  const itemsFor = (key: string): DayItem[] => {
    const evs: DayItem[] = eventsOn(events, key).map((e) => ({
      kind: 'event',
      id: e.id,
      title: e.title,
      time: e.time,
      rgb: eventRgb(e),
      ref: e,
    }))
    const tks: DayItem[] = tasks
      .filter((t) => t.date === key)
      .map((t) => ({
        kind: 'task',
        id: t.id,
        title: t.title,
        time: t.time,
        rgb: t.color ? accentRgb(t.color) : '148 163 184',
        ref: t,
      }))
    return [...evs, ...tks].sort((a, b) => (a.time ?? '99').localeCompare(b.time ?? '99'))
  }

  const openNew = () => {
    setEditingEvent(null)
    setEventSheetOpen(true)
  }

  // Al cambiar de mes, si el día abierto ya no está en pantalla, cierra el panel.
  useEffect(() => {
    if (openKey && fromDateKey(openKey).getMonth() !== month) setOpenKey(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, year])

  const showHoy = year !== today.getFullYear() || month !== today.getMonth()
  const totalWeeks = weeks.length

  return (
    <div className="flex h-full flex-col overflow-hidden px-8 pb-8 pt-8 xl:px-12">
      {/* ===== Encabezado ===== */}
      <header className="mb-5 flex shrink-0 items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-[30px] font-bold capitalize leading-none text-ink">
            {MONTH_NAMES[month]} <span className="font-semibold text-ink/40">{year}</span>
          </h1>
          <div className="flex items-center gap-1">
            <button
              onClick={() => changeMonth(-1)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-ink/10 text-ink/60 transition-colors hover:bg-ink/5"
              aria-label="Mes anterior"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() => changeMonth(1)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-ink/10 text-ink/60 transition-colors hover:bg-ink/5"
              aria-label="Mes siguiente"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
          {showHoy && (
            <button
              onClick={goToday}
              className="rounded-full border border-ink/10 px-4 py-2 text-[13px] font-semibold text-ink/60 transition-colors hover:bg-ink/5"
            >
              Hoy
            </button>
          )}
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShareOpen(true)}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-ink/10 text-ink/60 transition-colors hover:bg-ink/5"
            aria-label="Compartir calendario"
          >
            <ShareIcon className="h-5 w-5" />
          </button>
          <button
            onClick={openNew}
            className="flex h-11 items-center gap-2 rounded-full bg-ink px-5 text-[14.5px] font-semibold text-surface shadow-[0_8px_20px_-8px_rgba(0,0,0,0.45)] transition-transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <PlusIcon className="h-5 w-5" /> Crear evento
          </button>
        </div>
      </header>

      {/* ===== Cabecera de días ===== */}
      <div className="grid shrink-0 grid-cols-7 border-b border-ink/5 pb-2">
        {DAY_NAMES.map((d) => (
          <span key={d} className="px-2 text-[12px] font-bold uppercase tracking-wide text-ink/35">
            {d.slice(0, 3)}
          </span>
        ))}
      </div>

      {/* ===== Grilla del mes (llena el alto disponible) ===== */}
      <div className="relative min-h-0 flex-1">
        <motion.div
          key={`${year}-${month}`}
          initial={{ opacity: 0, x: monthDir * 36 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, ease: EASE.emphasized }}
          className="grid h-full"
          style={{ gridTemplateRows: `repeat(${totalWeeks}, minmax(0, 1fr))` }}
        >
          {weeks.map((w, wi) => (
            <div key={wi} className="grid grid-cols-7">
              {w.map((d, di) => {
                if (!d) return <div key={di} className="border-b border-r border-ink/[0.04]" />
                const key = toDateKey(d)
                const isToday = key === todayKey
                const isOpen = key === openKey
                const items = itemsFor(key)
                return (
                  <button
                    key={di}
                    onClick={() => setOpenKey(key)}
                    className={`group relative flex min-h-0 flex-col items-stretch gap-1 border-b border-r border-ink/[0.04] p-1.5 text-left transition-colors ${
                      isOpen ? 'bg-ink/[0.04]' : 'hover:bg-ink/[0.025]'
                    }`}
                  >
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13.5px] font-semibold tabular-nums ${
                        isToday
                          ? 'bg-ink text-surface'
                          : 'text-ink/70 group-hover:text-ink'
                      }`}
                    >
                      {d.getDate()}
                    </span>
                    <div className="flex min-h-0 flex-col gap-1 overflow-hidden">
                      {items.slice(0, 3).map((it) => (
                        <span
                          key={it.id}
                          className="flex items-center gap-1 truncate rounded-md px-1.5 py-0.5 text-[11.5px] font-semibold leading-tight"
                          style={{
                            background: `rgb(${it.rgb} / 0.14)`,
                            color: `rgb(${it.rgb})`,
                          }}
                        >
                          {it.time && <span className="shrink-0 tabular-nums opacity-70">{it.time}</span>}
                          <span className="truncate">{it.title}</span>
                        </span>
                      ))}
                      {items.length > 3 && (
                        <span className="pl-1 text-[10.5px] font-semibold text-ink/40">
                          +{items.length - 3} más
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          ))}
        </motion.div>

        {/* ===== Panel lateral del día (se desliza desde la derecha) ===== */}
        <AnimatePresence>
          {openKey && (
            <DayPanel
              key="daypanel"
              dateKey={openKey}
              onClose={() => setOpenKey(null)}
              classes={classesForDay(classes, weekday(fromDateKey(openKey)))}
              items={itemsFor(openKey)}
              todayKey={todayKey}
              subjectName={subjectName}
              subjectColor={subjectColor}
              onNew={() => {
                setEditingEvent(null)
                setEventSheetOpen(true)
              }}
              onEditEvent={(e) => {
                setEditingEvent(e)
                setEventSheetOpen(true)
              }}
              onEditTask={(t) => {
                setEditingTask(t)
                setTaskSheetOpen(true)
              }}
              onToggleTask={toggleTask}
            />
          )}
        </AnimatePresence>
      </div>

      <EventSheet
        open={eventSheetOpen}
        onClose={() => setEventSheetOpen(false)}
        event={editingEvent}
        defaultDate={openKey ?? todayKey}
        onPickTask={() => {
          setEditingTask(null)
          setTaskSheetOpen(true)
        }}
      />
      <TaskEditor
        open={taskSheetOpen}
        onClose={() => setTaskSheetOpen(false)}
        task={editingTask}
        defaultDate={openKey ?? todayKey}
      />
      <ShareCalendarioSheet open={shareOpen} onClose={() => setShareOpen(false)} />
    </div>
  )
}

/** Panel lateral deslizante con la agenda de un día. */
function DayPanel({
  dateKey,
  onClose,
  classes,
  items,
  todayKey,
  subjectName,
  subjectColor,
  onNew,
  onEditEvent,
  onEditTask,
  onToggleTask,
}: {
  dateKey: string
  onClose: () => void
  classes: ReturnType<typeof classesForDay>
  items: DayItem[]
  todayKey: string
  subjectName: (id?: string) => string | undefined
  subjectColor: (id?: string) => string
  onNew: () => void
  onEditEvent: (e: CalendarEvent) => void
  onEditTask: (t: Task) => void
  onToggleTask: (id: string) => void
}) {
  const d = fromDateKey(dateKey)
  const n = classes.length + items.length
  const isPast = dateKey < todayKey

  return (
    <>
      {/* Telón que oscurece la grilla detrás del panel. */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        className="absolute inset-0 z-10 bg-black/20 backdrop-blur-[1px]"
      />
      {/* Panel. */}
      <motion.aside
        initial={{ x: 40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 40, opacity: 0 }}
        transition={{ duration: 0.28, ease: EASE.emphasized }}
        className="absolute inset-y-0 right-0 z-20 flex w-[400px] flex-col rounded-l-[28px] border-l border-ink/5 bg-surface shadow-[-20px_0_50px_-20px_rgba(0,0,0,0.35)]"
      >
        <div className="flex items-start justify-between gap-3 px-6 pb-4 pt-6">
          <div>
            <p className="text-[12.5px] font-semibold uppercase tracking-wide text-ink/40">
              {isPast ? 'Fue el' : 'Agenda del'}
            </p>
            <h2 className="mt-0.5 text-[22px] font-bold capitalize leading-tight text-ink">
              {DAY_NAMES[weekday(d)]} {d.getDate()}
            </h2>
            <p className="text-[13.5px] text-ink/45">de {MONTH_NAMES[d.getMonth()]}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onNew}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-ink text-surface transition-transform hover:-translate-y-0.5"
              aria-label="Agregar"
            >
              <PlusIcon className="h-5 w-5" />
            </button>
            <button
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full text-ink/45 transition-colors hover:bg-ink/5 hover:text-ink"
              aria-label="Cerrar"
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-6 pb-6">
          {n === 0 && (
            <div className="mt-10 flex flex-col items-center text-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-ink/5 text-ink/50">
                <CalendarIcon className="h-7 w-7" />
              </div>
              <p className="text-[15px] font-semibold text-ink">No tienes nada para este día</p>
              <p className="mt-0.5 text-[13.5px] text-ink/45">Disfruta el día.</p>
            </div>
          )}

          {/* Clases del horario */}
          {classes.map((c) => (
            <div key={c.id} className="flex gap-3 rounded-[18px] bg-ink/[0.03] p-3.5">
              <span
                className="w-[3px] shrink-0 self-stretch rounded-full"
                style={{ background: subjectColor(c.subjectId) }}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="break-words text-[14.5px] font-bold text-ink">
                    {subjectName(c.subjectId) ?? 'Clase'}
                  </p>
                  <span className="shrink-0 text-[12px] font-medium text-ink/40">
                    Clase · {CLASS_TYPE_LABEL[c.type]}
                  </span>
                </div>
                <p className="mt-0.5 text-[13px] tabular-nums text-ink/55">
                  {c.start} — {c.end}
                  {c.room ? ` · ${c.room}` : ''}
                </p>
              </div>
            </div>
          ))}

          {/* Eventos y tareas */}
          {items.map((it) =>
            it.kind === 'event' ? (
              <button
                key={it.id}
                onClick={() => onEditEvent(it.ref as CalendarEvent)}
                className="flex w-full gap-3 rounded-[18px] bg-ink/[0.03] p-3.5 text-left transition-colors hover:bg-ink/[0.06]"
              >
                <span
                  className="w-[3px] shrink-0 self-stretch rounded-full"
                  style={{ background: `rgb(${it.rgb})` }}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="break-words text-[14.5px] font-bold text-ink">{it.title}</p>
                    <span className="shrink-0 text-[12px] font-medium text-ink/40">
                      {EVENT_TYPE_LABEL[(it.ref as CalendarEvent).type]}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[13px] tabular-nums text-ink/55">
                    {[subjectName((it.ref as CalendarEvent).subjectId), it.time ?? 'Todo el día', (it.ref as CalendarEvent).location]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </div>
              </button>
            ) : (
              <div key={it.id} className="flex gap-3 rounded-[18px] bg-ink/[0.03] p-3.5">
                <span className="w-[3px] shrink-0 self-stretch rounded-full" style={{ background: `rgb(${it.rgb})` }} />
                <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                  <button onClick={() => onEditTask(it.ref as Task)} className="min-w-0 flex-1 text-left">
                    <p
                      className={`break-words text-[14.5px] font-bold text-ink ${
                        (it.ref as Task).done ? 'line-through opacity-60' : ''
                      }`}
                    >
                      {it.title}
                    </p>
                    <p className="mt-0.5 text-[13px] text-ink/55">
                      Tarea{it.time ? ` · ${it.time}` : ''}
                      {!(it.ref as Task).done && dateKey < todayKey && (
                        <span className="font-semibold text-rose-500"> · Vencida</span>
                      )}
                      {(it.ref as Task).done && (
                        <span className="font-semibold text-emerald-600 dark:text-emerald-300"> · Completada</span>
                      )}
                    </p>
                  </button>
                  <button
                    onClick={() => onToggleTask(it.id)}
                    aria-label={(it.ref as Task).done ? 'Marcar pendiente' : 'Completar'}
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors ${
                      (it.ref as Task).done
                        ? 'border-emerald-500 bg-emerald-500 text-white'
                        : 'border-ink/20 text-transparent hover:border-ink/40'
                    }`}
                  >
                    <CheckIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ),
          )}
        </div>
      </motion.aside>
    </>
  )
}
