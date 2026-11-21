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

/** Cuántas píldoras caben en una celda antes de resumir con "+N". */
const MAX_PILLS = 3

type DayItem = {
  kind: 'event' | 'task'
  id: string
  title: string
  time?: string
  rgb: string
  done: boolean
  ref: CalendarEvent | Task
}

/**
 * Calendario del modo PC (≥1024px). Cada día es su propia tarjeta redondeada
 * separada por aire (sin líneas de tabla) y los eventos son píldoras sólidas:
 * llenas de color los que vienen, apagadas los que ya pasaron. Al abrir un día
 * entra un panel lateral con la agenda completa.
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

  // Una sola grilla plana de 7 columnas: así cada día es una tarjeta suelta.
  const weeks = useMemo(() => monthGrid(year, month), [year, month])
  const days = useMemo(() => weeks.flat(), [weeks])

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
      done: !!e.done,
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
        done: t.done,
        ref: t,
      }))
    return [...evs, ...tks].sort((a, b) => (a.time ?? '99').localeCompare(b.time ?? '99'))
  }

  // Al cambiar de mes, si el día abierto ya no está en pantalla, cierra el panel.
  useEffect(() => {
    if (openKey && fromDateKey(openKey).getMonth() !== month) setOpenKey(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, year])

  const showHoy = year !== today.getFullYear() || month !== today.getMonth()

  return (
    <div className="flex h-full flex-col overflow-hidden px-8 pb-6 pt-8 xl:px-12">
      {/* ===== Encabezado ===== */}
      <header className="mb-6 flex shrink-0 items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-[32px] font-bold capitalize leading-none tracking-tight text-ink">
            {MONTH_NAMES[month]} <span className="font-medium text-ink/30">{year}</span>
          </h1>
          <div className="flex items-center gap-1">
            <button
              onClick={() => changeMonth(-1)}
              className="flex h-9 w-9 items-center justify-center rounded-full text-ink/50 transition-colors hover:bg-ink/[0.06] hover:text-ink"
              aria-label="Mes anterior"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() => changeMonth(1)}
              className="flex h-9 w-9 items-center justify-center rounded-full text-ink/50 transition-colors hover:bg-ink/[0.06] hover:text-ink"
              aria-label="Mes siguiente"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
          <AnimatePresence>
            {showHoy && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.18, ease: EASE.emphasized }}
                onClick={goToday}
                className="rounded-full bg-ink/[0.06] px-4 py-2 text-[13px] font-semibold text-ink/70 transition-colors hover:bg-ink/10"
              >
                Hoy
              </motion.button>
            )}
          </AnimatePresence>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShareOpen(true)}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-ink/[0.05] text-ink/60 transition-colors hover:bg-ink/10 hover:text-ink"
            aria-label="Compartir calendario"
          >
            <ShareIcon className="h-5 w-5" />
          </button>
          <motion.button
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.96 }}
            transition={{ duration: 0.18, ease: EASE.emphasized }}
            onClick={() => {
              setEditingEvent(null)
              setEventSheetOpen(true)
            }}
            className="flex h-11 items-center gap-2 rounded-full bg-ink px-5 text-[14.5px] font-semibold text-surface shadow-[0_10px_24px_-10px_rgba(0,0,0,0.6)]"
          >
            <PlusIcon className="h-5 w-5" /> Crear evento
          </motion.button>
        </div>
      </header>

      {/* ===== Nombres de los días ===== */}
      <div className="mb-2 grid shrink-0 grid-cols-7 gap-2">
        {DAY_NAMES.map((d) => (
          <span key={d} className="px-3 text-[13px] font-medium text-ink/35">
            {d}
          </span>
        ))}
      </div>

      {/* ===== Grilla del mes ===== */}
      <div className="relative min-h-0 flex-1">
        <div className="h-full overflow-hidden">
          <motion.div
            key={`${year}-${month}`}
            initial="initial"
            animate="animate"
            variants={{
              initial: { opacity: 0, x: monthDir * 28 },
              animate: {
                opacity: 1,
                x: 0,
                transition: { duration: 0.3, ease: EASE.emphasized, staggerChildren: 0.012 },
              },
            }}
            className="grid h-full grid-cols-7 gap-1.5"
            style={{ gridTemplateRows: `repeat(${weeks.length}, minmax(0, 1fr))` }}
          >
            {days.map((d, i) => {
              if (!d) return <div key={i} className="rounded-[20px] bg-ink/[0.02]" />
              const key = toDateKey(d)
              const isToday = key === todayKey
              const isPast = key < todayKey
              const isOpen = key === openKey
              const items = itemsFor(key)
              const hasItems = items.length > 0
              return (
                <motion.button
                  key={key}
                  variants={{
                    initial: { opacity: 0, y: 10 },
                    animate: { opacity: 1, y: 0, transition: { duration: 0.34, ease: EASE.decel } },
                  }}
                  onClick={() => setOpenKey(key)}
                  whileHover={{ y: -2 }}
                  transition={{ duration: 0.16, ease: EASE.emphasized }}
                  className={`group relative flex flex-col gap-1 overflow-hidden rounded-[18px] p-2 text-left ${
                    hasItems
                      ? 'bg-[rgb(var(--card))] shadow-[0_1px_2px_rgba(17,24,39,0.05)] ring-1 ring-ink/[0.06]'
                      : 'bg-ink/[0.035]'
                  } ${isOpen ? 'ring-2 ring-ink/25' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    {isToday ? (
                      <span className="flex h-[24px] w-[24px] items-center justify-center rounded-full bg-ink text-[12.5px] font-bold tabular-nums text-surface">
                        {d.getDate()}
                      </span>
                    ) : (
                      <span
                        className={`px-1 text-[13.5px] font-medium tabular-nums ${
                          isPast ? 'text-ink/30' : 'text-ink/55'
                        }`}
                      >
                        {d.getDate()}
                      </span>
                    )}
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden
                      className="mr-0.5 h-3.5 w-3.5 text-ink/25 opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <path
                        d="M14 4h6v6M20 4l-7 7M10 20H4v-6M4 20l7-7"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <div className="flex flex-col gap-1">
                    {items.slice(0, MAX_PILLS).map((it) => (
                      <Pill key={it.id} item={it} muted={isPast} />
                    ))}
                    {items.length > MAX_PILLS && (
                      <span className="pl-2.5 pt-0.5 text-[11px] font-semibold text-ink/35">
                        +{items.length - MAX_PILLS} más
                      </span>
                    )}
                  </div>
                </motion.button>
              )
            })}
          </motion.div>
        </div>

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

/**
 * Píldora de un evento/tarea dentro de una celda. Lo que ya pasó queda en una
 * píldora clara con punto de color y texto nítido; lo que viene se llena del
 * color del ramo — así el mes se lee de un vistazo sin verse apagado.
 */
function Pill({ item, muted }: { item: DayItem; muted: boolean }) {
  const off = muted || item.done
  return (
    <span
      className={`flex items-center gap-1.5 rounded-full py-[4px] pl-[7px] pr-2 text-[11.5px] font-semibold ${
        off ? 'bg-ink/[0.045] text-ink/85' : 'text-white'
      }`}
      style={off ? undefined : { background: `rgb(${item.rgb})` }}
    >
      <span
        aria-hidden
        className={`h-[10px] w-[10px] shrink-0 rounded-full ${off ? '' : 'border-[1.5px] border-white/75'}`}
        style={off ? { background: `rgb(${item.rgb})` } : undefined}
      />
      <span className={`min-w-0 flex-1 truncate ${item.done ? 'line-through opacity-50' : ''}`}>
        {item.title}
      </span>
      {item.time && (
        <span
          className={`shrink-0 text-[10.5px] font-medium tabular-nums ${
            off ? 'text-ink/40' : 'text-white/75'
          }`}
        >
          {item.time}
        </span>
      )}
    </span>
  )
}

/** Panel lateral deslizante con la agenda completa de un día. */
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

  const row = {
    initial: { opacity: 0, x: 18 },
    animate: { opacity: 1, x: 0, transition: { duration: 0.34, ease: EASE.decel } },
  }

  return (
    <>
      {/* Telón que apaga la grilla detrás del panel. */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        className="absolute inset-0 z-10 bg-black/15 backdrop-blur-[2px]"
      />
      {/* Panel. */}
      <motion.aside
        initial={{ x: 44, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 44, opacity: 0 }}
        transition={{ duration: 0.28, ease: EASE.emphasized }}
        className="absolute inset-y-0 right-0 z-20 flex w-[420px] flex-col rounded-[28px] bg-[rgb(var(--card))] shadow-[0_30px_70px_-25px_rgba(0,0,0,0.45)] ring-1 ring-ink/[0.07]"
      >
        <div className="flex items-start justify-between gap-3 px-6 pb-5 pt-6">
          <div>
            <p className="text-[12.5px] font-semibold uppercase tracking-wide text-ink/35">
              {isPast ? 'Fue el' : 'Agenda del'}
            </p>
            <h2 className="mt-1 text-[24px] font-bold capitalize leading-tight tracking-tight text-ink">
              {DAY_NAMES[weekday(d)]} {d.getDate()}
            </h2>
            <p className="text-[13.5px] text-ink/40">de {MONTH_NAMES[d.getMonth()]}</p>
          </div>
          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.94 }}
              onClick={onNew}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-ink text-surface"
              aria-label="Agregar"
            >
              <PlusIcon className="h-5 w-5" />
            </motion.button>
            <button
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full text-ink/40 transition-colors hover:bg-ink/[0.06] hover:text-ink"
              aria-label="Cerrar"
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        <motion.div
          initial="initial"
          animate="animate"
          variants={{ animate: { transition: { staggerChildren: 0.04, delayChildren: 0.06 } } }}
          className="min-h-0 flex-1 space-y-2 overflow-y-auto px-6 pb-6"
        >
          {n === 0 && (
            <motion.div variants={row} className="mt-12 flex flex-col items-center text-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-ink/[0.05] text-ink/40">
                <CalendarIcon className="h-7 w-7" />
              </div>
              <p className="text-[15px] font-semibold text-ink">No tienes nada este día</p>
              <p className="mt-0.5 text-[13.5px] text-ink/40">Disfruta el día.</p>
            </motion.div>
          )}

          {/* Clases del horario */}
          {classes.map((c) => (
            <motion.div key={c.id} variants={row} className="flex gap-3 rounded-[18px] bg-ink/[0.035] p-3.5">
              <span
                className="w-[3px] shrink-0 self-stretch rounded-full"
                style={{ background: subjectColor(c.subjectId) }}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="break-words text-[14.5px] font-bold text-ink">
                    {subjectName(c.subjectId) ?? 'Clase'}
                  </p>
                  <span className="shrink-0 text-[12px] font-medium text-ink/35">
                    Clase · {CLASS_TYPE_LABEL[c.type]}
                  </span>
                </div>
                <p className="mt-0.5 text-[13px] tabular-nums text-ink/50">
                  {c.start} — {c.end}
                  {c.room ? ` · ${c.room}` : ''}
                </p>
              </div>
            </motion.div>
          ))}

          {/* Eventos y tareas */}
          {items.map((it) =>
            it.kind === 'event' ? (
              <motion.button
                key={it.id}
                variants={row}
                onClick={() => onEditEvent(it.ref as CalendarEvent)}
                className="flex w-full gap-3 rounded-[18px] bg-ink/[0.035] p-3.5 text-left transition-colors hover:bg-ink/[0.07]"
              >
                <span
                  className="w-[3px] shrink-0 self-stretch rounded-full"
                  style={{ background: `rgb(${it.rgb})` }}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="break-words text-[14.5px] font-bold text-ink">{it.title}</p>
                    <span className="shrink-0 text-[12px] font-medium text-ink/35">
                      {EVENT_TYPE_LABEL[(it.ref as CalendarEvent).type]}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[13px] tabular-nums text-ink/50">
                    {[
                      subjectName((it.ref as CalendarEvent).subjectId),
                      it.time ?? 'Todo el día',
                      (it.ref as CalendarEvent).location,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </div>
              </motion.button>
            ) : (
              <motion.div key={it.id} variants={row} className="flex gap-3 rounded-[18px] bg-ink/[0.035] p-3.5">
                <span className="w-[3px] shrink-0 self-stretch rounded-full" style={{ background: `rgb(${it.rgb})` }} />
                <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                  <button onClick={() => onEditTask(it.ref as Task)} className="min-w-0 flex-1 text-left">
                    <p
                      className={`break-words text-[14.5px] font-bold text-ink ${
                        it.done ? 'line-through opacity-50' : ''
                      }`}
                    >
                      {it.title}
                    </p>
                    <p className="mt-0.5 text-[13px] text-ink/50">
                      Tarea{it.time ? ` · ${it.time}` : ''}
                      {!it.done && isPast && <span className="font-semibold text-rose-500"> · Vencida</span>}
                      {it.done && (
                        <span className="font-semibold text-emerald-600 dark:text-emerald-300"> · Completada</span>
                      )}
                    </p>
                  </button>
                  <motion.button
                    whileTap={{ scale: 0.88 }}
                    onClick={() => onToggleTask(it.id)}
                    aria-label={it.done ? 'Marcar pendiente' : 'Completar'}
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors ${
                      it.done
                        ? 'border-emerald-500 bg-emerald-500 text-white'
                        : 'border-ink/20 text-transparent hover:border-ink/40'
                    }`}
                  >
                    <CheckIcon className="h-4 w-4" />
                  </motion.button>
                </div>
              </motion.div>
            ),
          )}
        </motion.div>
      </motion.aside>
    </>
  )
}
