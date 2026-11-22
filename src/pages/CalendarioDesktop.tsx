import { useEffect, useMemo, useRef, useState, type CSSProperties, type WheelEvent } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, MotionConfig, motion, type PanInfo } from 'framer-motion'
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
import { EASE, SPRING } from '../lib/motion'
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

/** Cuánto hay que arrastrar (px, con el impulso proyectado) para cambiar de mes. */
const SWIPE_DISTANCE = 140

/**
 * Relieve suave de lo "presionable" oscuro (píldoras que vienen, botón Crear):
 * un brillo arriba, un filo oscuro abajo y una sombra corta. Se ve con volumen
 * sin parecer un botón de los 2000.
 */
const RAISED: CSSProperties = {
  backgroundImage: 'linear-gradient(to bottom, rgb(255 255 255 / 0.12), rgb(255 255 255 / 0))',
  boxShadow:
    'inset 0 1px 0 rgb(255 255 255 / 0.16), inset 0 -1px 0 rgb(0 0 0 / 0.22), 0 1px 2px rgb(0 0 0 / 0.16), 0 4px 10px -4px rgb(0 0 0 / 0.35)',
}

/** Relieve de lo claro (píldoras que ya pasaron): flota apenas sobre la celda. */
const RAISED_LIGHT: CSSProperties = {
  boxShadow: '0 1px 1.5px rgb(0 0 0 / 0.06), 0 3px 8px -3px rgb(0 0 0 / 0.12)',
}

type DayItem = {
  kind: 'event' | 'task'
  id: string
  title: string
  time?: string
  rgb: string
  done: boolean
  ref: CalendarEvent | Task
}

type Rect = { left: number; top: number; width: number; height: number }

/**
 * Calendario del modo PC (≥1024px). Cada día es una celda del mismo tono que el
 * fondo (sin tarjetas blancas) y los eventos son píldoras con relieve: oscuras
 * las que vienen, claras las que ya pasaron. El mes se cambia arrastrando la
 * grilla, con el trackpad o con las flechas; al abrir un día, el panel crece
 * desde esa misma celda y vuelve a ella al cerrar.
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
  // Día abierto en el panel lateral (null = panel cerrado) y la celda de donde nace.
  const [openKey, setOpenKey] = useState<string | null>(null)
  const [openRect, setOpenRect] = useState<Rect | null>(null)

  const [eventSheetOpen, setEventSheetOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [taskSheetOpen, setTaskSheetOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [shareOpen, setShareOpen] = useState(false)
  const sheetOpen = eventSheetOpen || taskSheetOpen || shareOpen

  // Al soltar un arrastre el navegador igual dispara `click` en la celda: se ignora.
  const dragEndAt = useRef(0)
  const wheel = useRef({ acc: 0, lockedUntil: 0 })

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
    setMonthDir(year * 12 + month > today.getFullYear() * 12 + today.getMonth() ? -1 : 1)
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

  // Flechas ← → cambian de mes (solo con todo cerrado y sin un campo enfocado).
  useEffect(() => {
    if (openKey || sheetOpen) return
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (el.closest('input, textarea, [contenteditable="true"]')) return
      if (e.key === 'ArrowLeft') changeMonth(-1)
      if (e.key === 'ArrowRight') changeMonth(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const onDragEnd = (_: unknown, info: PanInfo) => {
    dragEndAt.current = performance.now()
    // Se decide con el impulso proyectado, no solo con dónde se soltó: un
    // movimiento corto pero rápido también cambia de mes.
    const projected = info.offset.x + info.velocity.x * 0.2
    if (projected < -SWIPE_DISTANCE) changeMonth(1)
    else if (projected > SWIPE_DISTANCE) changeMonth(-1)
  }

  // Deslizar con dos dedos en el trackpad (scroll horizontal) también pasa de mes.
  const onWheel = (e: WheelEvent) => {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return
    const w = wheel.current
    const now = performance.now()
    if (now < w.lockedUntil) return
    w.acc += e.deltaX
    if (Math.abs(w.acc) > 90) {
      changeMonth(w.acc > 0 ? 1 : -1)
      w.acc = 0
      w.lockedUntil = now + 550
    }
  }

  const openDay = (key: string, el: HTMLElement) => {
    if (performance.now() - dragEndAt.current < 120) return
    const r = el.getBoundingClientRect()
    setOpenRect({ left: r.left, top: r.top, width: r.width, height: r.height })
    setOpenKey(key)
  }

  const showHoy = year !== today.getFullYear() || month !== today.getMonth()

  return (
    <MotionConfig reducedMotion="user">
      {/* Con el panel abierto, la página se va un pelín hacia atrás (profundidad iOS). */}
      <motion.div
        animate={{ scale: openKey ? 0.985 : 1 }}
        transition={SPRING.soft}
        className="flex h-full flex-col overflow-hidden px-8 pb-6 pt-8 xl:px-12"
      >
        {/* ===== Encabezado ===== */}
        <header className="mb-6 flex shrink-0 items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h1 className="relative h-[36px] min-w-[300px] overflow-hidden text-[32px] font-bold capitalize leading-[36px] tracking-[-0.02em] text-ink">
              <AnimatePresence initial={false} custom={monthDir}>
                <motion.span
                  key={`${year}-${month}`}
                  custom={monthDir}
                  variants={{
                    enter: (dir: number) => ({ y: dir >= 0 ? 22 : -22, opacity: 0, filter: 'blur(4px)' }),
                    center: { y: 0, opacity: 1, filter: 'blur(0px)' },
                    exit: (dir: number) => ({ y: dir >= 0 ? -22 : 22, opacity: 0, filter: 'blur(4px)' }),
                  }}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={SPRING.soft}
                  className="absolute inset-0 whitespace-nowrap"
                >
                  {MONTH_NAMES[month]} <span className="font-medium text-ink/30">{year}</span>
                </motion.span>
              </AnimatePresence>
            </h1>
            <div className="flex items-center gap-1">
              <motion.button
                whileTap={{ scale: 0.86 }}
                transition={SPRING.press}
                onClick={() => changeMonth(-1)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-ink/50 transition-colors hover:bg-ink/[0.06] hover:text-ink"
                aria-label="Mes anterior"
              >
                <ChevronLeft className="h-5 w-5" />
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.86 }}
                transition={SPRING.press}
                onClick={() => changeMonth(1)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-ink/50 transition-colors hover:bg-ink/[0.06] hover:text-ink"
                aria-label="Mes siguiente"
              >
                <ChevronRight className="h-5 w-5" />
              </motion.button>
            </div>
            <AnimatePresence>
              {showHoy && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.6 }}
                  whileTap={{ scale: 0.9 }}
                  transition={SPRING.pop}
                  onClick={goToday}
                  className="rounded-full bg-ink/[0.06] px-4 py-2 text-[13px] font-semibold text-ink/70 transition-colors hover:bg-ink/10"
                >
                  Hoy
                </motion.button>
              )}
            </AnimatePresence>
          </div>
          <div className="flex items-center gap-2.5">
            <motion.button
              whileTap={{ scale: 0.9 }}
              transition={SPRING.press}
              onClick={() => setShareOpen(true)}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-ink/[0.05] text-ink/60 transition-colors hover:bg-ink/10 hover:text-ink"
              aria-label="Compartir calendario"
            >
              <ShareIcon className="h-5 w-5" />
            </motion.button>
            <motion.button
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.95, y: 0 }}
              transition={SPRING.press}
              onClick={() => {
                setEditingEvent(null)
                setEventSheetOpen(true)
              }}
              style={RAISED}
              className="flex h-11 items-center gap-2 rounded-full bg-ink px-5 text-[14.5px] font-semibold text-surface"
            >
              <PlusIcon className="h-5 w-5" /> Crear evento
            </motion.button>
          </div>
        </header>

        {/* ===== Nombres de los días ===== */}
        <div className="mb-2 grid shrink-0 grid-cols-7 gap-1.5">
          {DAY_NAMES.map((d) => (
            <span key={d} className="text-center text-[13px] font-medium text-ink/35">
              {d}
            </span>
          ))}
        </div>

        {/* ===== Grilla del mes ===== */}
        <div className="relative min-h-0 flex-1 overscroll-x-contain" onWheel={onWheel}>
          <div className="h-full overflow-hidden">
            <motion.div
              key={`${year}-${month}`}
              drag="x"
              dragDirectionLock
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.22}
              dragTransition={{ bounceStiffness: 420, bounceDamping: 38 }}
              onDragEnd={onDragEnd}
              initial={{ x: monthDir * 56, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ x: SPRING.soft, opacity: { duration: 0.2 } }}
              className="grid h-full grid-cols-7 gap-1.5"
              style={{ gridTemplateRows: `repeat(${weeks.length}, minmax(0, 1fr))` }}
            >
              {days.map((d, i) => {
                // Las celdas entran en ola diagonal desde la esquina por donde llega el mes.
                const col = i % 7
                const row = Math.floor(i / 7)
                const wave = monthDir < 0 ? 6 - col + row : col + row
                if (!d) return <div key={i} />
                const key = toDateKey(d)
                const isToday = key === todayKey
                const isPast = key < todayKey
                const isOpen = key === openKey
                const items = itemsFor(key)
                // Si no caben todas, la última línea pasa a ser el "+N más".
                const shown = items.length > MAX_PILLS ? MAX_PILLS - 1 : items.length
                return (
                  <motion.button
                    key={key}
                    initial={{ opacity: 0, scale: 0.94, y: 6 }}
                    animate={{ opacity: 1, scale: 1, y: 0, transition: { ...SPRING.pop, delay: wave * 0.014 } }}
                    whileHover={{ scale: 1.012 }}
                    whileTap={{ scale: 0.975 }}
                    transition={SPRING.press}
                    onClick={(e) => openDay(key, e.currentTarget)}
                    className={`group relative flex flex-col gap-1 overflow-hidden rounded-[22px] p-2 text-left transition-colors duration-200 ${
                      isOpen ? 'bg-ink/[0.08]' : 'bg-ink/[0.035] hover:bg-ink/[0.055]'
                    }`}
                  >
                    <div className="flex items-center justify-between px-0.5">
                      {isToday ? (
                        <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-ink text-[12px] font-bold tabular-nums text-surface">
                          {d.getDate()}
                        </span>
                      ) : (
                        <span
                          className={`px-1 text-[13px] font-medium leading-[22px] tabular-nums ${
                            isPast ? 'text-ink/30' : 'text-ink/50'
                          }`}
                        >
                          {d.getDate()}
                        </span>
                      )}
                      <span
                        aria-hidden
                        className="mr-0.5 flex h-5 w-5 scale-75 items-center justify-center rounded-full bg-ink/[0.07] text-ink/45 opacity-0 transition-all duration-200 group-hover:scale-100 group-hover:opacity-100"
                      >
                        <PlusIcon className="h-3 w-3" />
                      </span>
                    </div>
                    <div className="flex flex-col gap-1">
                      {items.slice(0, shown).map((it) => (
                        <Pill key={it.id} item={it} muted={isPast} />
                      ))}
                      {shown < items.length && (
                        <span className="pl-2.5 pt-0.5 text-[11px] font-semibold text-ink/40">
                          +{items.length - shown} más
                        </span>
                      )}
                    </div>
                  </motion.button>
                )
              })}
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* ===== Panel del día (crece desde la celda tocada) ===== */}
      <AnimatePresence>
        {openKey && (
          <DayPanel
            key="daypanel"
            dateKey={openKey}
            origin={openRect}
            onClose={() => setOpenKey(null)}
            sheetOpen={sheetOpen}
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
    </MotionConfig>
  )
}

/**
 * Píldora de un evento/tarea dentro de una celda. Lo que viene es oscuro con
 * relieve y un aro del color del ramo; lo que ya pasó es claro y flota apenas;
 * lo completado lleva un check.
 */
function Pill({ item, muted }: { item: DayItem; muted: boolean }) {
  const off = muted || item.done
  return (
    <span
      className={`flex items-center gap-1.5 rounded-full py-[3px] pl-[6px] pr-2.5 text-[11.5px] leading-4 font-semibold ${
        off ? 'bg-[rgb(var(--card))] text-ink/80' : 'bg-ink text-surface'
      }`}
      style={off ? RAISED_LIGHT : RAISED}
    >
      {item.done ? (
        <span
          aria-hidden
          className="flex h-[13px] w-[13px] shrink-0 items-center justify-center rounded-full bg-ink/75 text-surface"
        >
          <CheckIcon className="h-[9px] w-[9px]" />
        </span>
      ) : off ? (
        <span
          aria-hidden
          className="h-[9px] w-[9px] shrink-0 rounded-full"
          style={{ background: `rgb(${item.rgb})` }}
        />
      ) : (
        <span
          aria-hidden
          className="h-[11px] w-[11px] shrink-0 rounded-full border-[1.75px]"
          style={{ borderColor: `rgb(${item.rgb})` }}
        />
      )}
      <span className={`min-w-0 flex-1 truncate ${item.done ? 'text-ink/45 line-through' : ''}`}>
        {item.title}
      </span>
      {item.time && (
        <span
          className={`shrink-0 text-[10.5px] font-medium tabular-nums ${
            off ? 'text-ink/40' : 'text-surface/70'
          }`}
        >
          {item.time}
        </span>
      )}
    </span>
  )
}

const PANEL_W = 420
const PANEL_INSET = 16

/** Panel con la agenda completa de un día. Nace de la celda y vuelve a ella. */
function DayPanel({
  dateKey,
  origin,
  onClose,
  sheetOpen,
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
  origin: Rect | null
  onClose: () => void
  sheetOpen: boolean
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

  // Posición de la celda vista desde el panel ya abierto (arriba a la derecha):
  // desde ahí el panel crece al entrar y hacia ahí se encoge al salir.
  const collapsed = useMemo(() => {
    if (!origin) return { x: 44, opacity: 0 }
    const panelLeft = window.innerWidth - PANEL_INSET - PANEL_W
    const panelH = window.innerHeight - PANEL_INSET * 2
    return {
      x: origin.left - panelLeft,
      y: origin.top - PANEL_INSET,
      scaleX: origin.width / PANEL_W,
      scaleY: origin.height / panelH,
      opacity: 0,
    }
  }, [origin])

  const row = {
    initial: { opacity: 0, y: 12, scale: 0.97 },
    animate: { opacity: 1, y: 0, scale: 1, transition: SPRING.pop },
  }

  // Con una hoja abierta encima, Escape cierra solo la hoja, no el panel.
  useEffect(() => {
    if (sheetOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, sheetOpen])

  // Por `document.body`: la página va dentro de un `motion.div` con transform,
  // y eso ancla a los `fixed` hijos. Con el portal el telón sí cubre la pantalla
  // completa (barra lateral incluida) en vez de un rectángulo sobre la grilla.
  return createPortal(
    <>
      {/* Telón suave sobre TODA la pantalla, sin desenfoque: solo baja el brillo
          de lo que queda detrás para que el panel mande. */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        onClick={onClose}
        className="fixed inset-0 z-[41] bg-black/[0.14]"
      />
      {/* Panel. z menor a 50 para que las hojas (GlassSheet) abran por encima. */}
      <motion.aside
        initial={collapsed}
        animate={{ x: 0, y: 0, scaleX: 1, scaleY: 1, opacity: 1 }}
        exit={{
          ...collapsed,
          transition: { default: SPRING.soft, opacity: { duration: 0.18, delay: 0.14 } },
        }}
        transition={{ default: SPRING.panel, opacity: { duration: 0.12 } }}
        style={{ originX: 0, originY: 0, width: PANEL_W }}
        className="fixed bottom-4 right-4 top-4 z-[42] flex flex-col overflow-hidden rounded-[30px] bg-[rgb(var(--card))] shadow-[0_30px_70px_-25px_rgba(0,0,0,0.45)] ring-1 ring-ink/[0.07]"
      >
        {/* El contenido aparece cuando el panel ya casi tomó su forma, así no se ve estirado. */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: 0.2, delay: 0.14 } }}
          exit={{ opacity: 0, transition: { duration: 0.08 } }}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="flex items-start justify-between gap-3 px-6 pb-5 pt-6">
            <div>
              <p className="text-[12.5px] font-semibold uppercase tracking-wide text-ink/35">
                {isPast ? 'Fue el' : 'Agenda del'}
              </p>
              <h2 className="mt-1 text-[24px] font-bold capitalize leading-tight tracking-[-0.015em] text-ink">
                {DAY_NAMES[weekday(d)]} {d.getDate()}
              </h2>
              <p className="text-[13.5px] text-ink/40">de {MONTH_NAMES[d.getMonth()]}</p>
            </div>
            <div className="flex items-center gap-2">
              <motion.button
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.88 }}
                transition={SPRING.press}
                onClick={onNew}
                style={RAISED}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-ink text-surface"
                aria-label="Agregar"
              >
                <PlusIcon className="h-5 w-5" />
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.86 }}
                transition={SPRING.press}
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-full text-ink/40 transition-colors hover:bg-ink/[0.06] hover:text-ink"
                aria-label="Cerrar"
              >
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </motion.button>
            </div>
          </div>

          <motion.div
            initial="initial"
            animate="animate"
            variants={{ animate: { transition: { staggerChildren: 0.045, delayChildren: 0.16 } } }}
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
              <motion.div key={c.id} variants={row} className="flex gap-3 rounded-[20px] bg-ink/[0.035] p-3.5">
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
                  whileTap={{ scale: 0.97 }}
                  onClick={() => onEditEvent(it.ref as CalendarEvent)}
                  className="flex w-full gap-3 rounded-[20px] bg-ink/[0.035] p-3.5 text-left transition-colors hover:bg-ink/[0.065]"
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
                <motion.div key={it.id} variants={row} className="flex gap-3 rounded-[20px] bg-ink/[0.035] p-3.5">
                  <span className="w-[3px] shrink-0 self-stretch rounded-full" style={{ background: `rgb(${it.rgb})` }} />
                  <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                    <button onClick={() => onEditTask(it.ref as Task)} className="min-w-0 flex-1 text-left">
                      <p
                        className={`break-words text-[14.5px] font-bold text-ink transition-opacity ${
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
                    {/* Check con "pop": al completar, el círculo salta y el tic se dibuja. */}
                    <motion.button
                      initial={false}
                      whileTap={{ scale: 0.82 }}
                      animate={{ scale: it.done ? [1, 1.18, 1] : 1 }}
                      transition={{ duration: 0.38, ease: EASE.overshoot }}
                      onClick={() => onToggleTask(it.id)}
                      aria-label={it.done ? 'Marcar pendiente' : 'Completar'}
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors duration-200 ${
                        it.done
                          ? 'border-emerald-500 bg-emerald-500 text-white'
                          : 'border-ink/20 text-transparent hover:border-ink/40'
                      }`}
                    >
                      <motion.span
                        initial={false}
                        animate={{ scale: it.done ? 1 : 0.4, opacity: it.done ? 1 : 0 }}
                        transition={SPRING.pop}
                        className="flex"
                      >
                        <CheckIcon className="h-4 w-4" />
                      </motion.span>
                    </motion.button>
                  </div>
                </motion.div>
              ),
            )}
          </motion.div>
        </motion.div>
      </motion.aside>
    </>,
    document.body,
  )
}
