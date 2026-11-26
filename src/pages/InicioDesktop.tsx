import { useEffect, useState, type ReactNode } from 'react'
import { MotionConfig, motion } from 'framer-motion'
import type { Route } from '../App'
import type { CalendarEvent, EventType, Subject, Task } from '../lib/types'
import { useAppStore } from '../store/useAppStore'
import { accentRgb } from '../lib/accents'
import { formatGrade } from '../lib/format'
import { EASE, SPRING } from '../lib/motion'
import {
  currentGrade,
  maxPossibleFinal,
  minGradeToPass,
  minPossibleFinal,
  realEvaluationCount,
} from '../lib/grades'
import {
  CLASS_TYPE_LABEL,
  DAY_NAMES,
  MONTH_NAMES,
  classesForDay,
  eventsOn,
  toDateKey,
  toMinutes,
  weekday,
} from '../lib/schedule'
import { TaskEditor } from '../features/tasks/TaskEditor'
import { EventSheet } from '../features/schedule/EventSheet'
import { RAISED, RAISED_LIGHT } from '../components/ui/relief'
import { CheckIcon, PlusIcon } from '../components/ui/Icons'

/** Color por tipo de evento (cuando no tiene ramo asociado). */
const EVENT_TYPE_RGB: Record<EventType, string> = {
  evaluacion: '239 68 68',
  tarea: '249 115 22',
  evento: '59 130 246',
  recordatorio: '139 92 246',
}

/** Días hacia adelante que muestra "Próximos días" (hoy incluido). */
const AHEAD_DAYS = 7

/**
 * Inicio del modo PC. Una sola pieza protagonista, "Tu semestre": todos los
 * ramos sobre la misma escala de notas, con la línea para aprobar, el promedio
 * actual y entre qué notas todavía puede terminar cada uno. Debajo, sin cajas,
 * lo de hoy y lo de los próximos días.
 * El Inicio del celular vive intacto en Inicio.tsx.
 */
export function InicioDesktop({ navigate }: { navigate: (r: Route) => void }) {
  const userName = useAppStore((s) => s.userName)
  const subjects = useAppStore((s) => s.subjects)
  const tasks = useAppStore((s) => s.tasks)
  const events = useAppStore((s) => s.events)
  const classes = useAppStore((s) => s.classes)
  const scale = useAppStore((s) => s.defaultScale)
  const toggleTask = useAppStore((s) => s.toggleTask)

  const [taskOpen, setTaskOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [eventOpen, setEventOpen] = useState(false)

  // La clase en curso se actualiza sola.
  const [, setTick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 30_000)
    return () => clearInterval(t)
  }, [])

  const now = new Date()
  const todayKey = toDateKey(now)
  const nowMins = now.getHours() * 60 + now.getMinutes()
  const hora = now.getHours()
  const saludo = hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches'
  const fecha = `${DAY_NAMES[weekday(now)]} ${now.getDate()} de ${MONTH_NAMES[now.getMonth()].toLowerCase()}`

  const subjectOf = (id?: string) => subjects.find((s) => s.id === id)
  const rgbOf = (id?: string) => accentRgb(subjectOf(id)?.color ?? 'gray')
  const eventRgb = (e: CalendarEvent) => (subjectOf(e.subjectId) ? rgbOf(e.subjectId) : EVENT_TYPE_RGB[e.type])

  const openTask = (t: Task | null) => {
    setEditingTask(t)
    setTaskOpen(true)
  }

  // ---------- Hoy ----------
  const todayClasses = classesForDay(classes, weekday(now))
  const todayEvents = eventsOn(events, todayKey).filter((e) => e.type !== 'evaluacion' || e.time)
  type TodayItem = { key: string; time?: string; end?: string; rgb: string; name: string; detail: string; onClick: () => void }
  const todayItems: TodayItem[] = [
    ...todayClasses.map((c) => ({
      key: `c-${c.id}`,
      time: c.start,
      end: c.end,
      rgb: rgbOf(c.subjectId),
      name: subjectOf(c.subjectId)?.name ?? 'Clase',
      detail: c.room ? `${CLASS_TYPE_LABEL[c.type]} en ${c.room}` : CLASS_TYPE_LABEL[c.type],
      onClick: () => navigate({ name: 'horario' }),
    })),
    ...todayEvents.map((e) => ({
      key: `e-${e.id}`,
      time: e.time,
      rgb: eventRgb(e),
      name: e.title,
      detail: subjectOf(e.subjectId)?.name ?? '',
      onClick: () => navigate({ name: 'calendario' }),
    })),
  ].sort((a, b) => (a.time ? toMinutes(a.time) : -1) - (b.time ? toMinutes(b.time) : -1))

  const liveOf = (it: TodayItem) =>
    !!it.time && !!it.end && nowMins >= toMinutes(it.time) && nowMins < toMinutes(it.end)
  const pastOf = (it: TodayItem) => !!it.time && toMinutes(it.end ?? it.time) <= nowMins && !liveOf(it)

  // ---------- Próximos días: evaluaciones y tareas agrupadas por día ----------
  type Ahead = { key: string; kind: 'eval' | 'task'; title: string; sub?: string; time?: string; rgb: string; task?: Task }
  const groups: { key: string; label: string; urgent?: boolean; items: Ahead[] }[] = []
  const overdue = tasks.filter((t) => !t.done && t.date && t.date < todayKey)
  if (overdue.length) {
    groups.push({
      key: 'overdue',
      label: 'Atrasadas',
      urgent: true,
      items: overdue.map((t) => ({ key: `t-${t.id}`, kind: 'task', title: t.title, rgb: '', task: t })),
    })
  }
  for (let i = 0; i < AHEAD_DAYS; i++) {
    const d = new Date(now)
    d.setDate(now.getDate() + i)
    const key = toDateKey(d)
    const evals = eventsOn(events, key)
      .filter((e) => e.type === 'evaluacion')
      .map<Ahead>((e) => ({
        key: `e-${e.id}`,
        kind: 'eval',
        title: e.title,
        sub: subjectOf(e.subjectId)?.name,
        time: e.time,
        rgb: eventRgb(e),
      }))
    const dayTasks = tasks
      .filter((t) => t.date === key)
      .map<Ahead>((t) => ({ key: `t-${t.id}`, kind: 'task', title: t.title, time: t.time, rgb: '', task: t }))
    if (evals.length + dayTasks.length === 0) continue
    const label = i === 0 ? 'Hoy' : i === 1 ? 'Mañana' : `${DAY_NAMES[weekday(d)]} ${d.getDate()}`
    groups.push({ key, label, items: [...evals, ...dayTasks] })
  }
  const undated = tasks.filter((t) => !t.date && !t.done)
  if (undated.length) {
    groups.push({
      key: 'undated',
      label: 'Sin fecha',
      items: undated.map((t) => ({ key: `t-${t.id}`, kind: 'task', title: t.title, time: t.time, rgb: '', task: t })),
    })
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="h-full overflow-y-auto">
        <div className="mx-auto w-full max-w-[1160px] px-10 pb-16 pt-10">
          {/* ============ Saludo ============ */}
          <header className="flex items-end justify-between gap-6">
            <div className="min-w-0">
              <h1 className="truncate text-[38px] font-bold leading-[1.1] tracking-[-0.025em] text-ink">
                {saludo}, {userName || 'Estudiante'}
              </h1>
              <p className="mt-1.5 text-[17px] text-ink/45">{fecha}</p>
            </div>
            <motion.button
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.96, y: 0 }}
              transition={SPRING.press}
              onClick={() => setEventOpen(true)}
              style={RAISED}
              className="flex h-11 shrink-0 items-center gap-2 rounded-full bg-ink px-5 text-[15px] font-semibold text-surface"
            >
              <PlusIcon className="h-5 w-5" /> Agregar
            </motion.button>
          </header>

          {/* ============ Tu semestre (la pieza protagonista) ============ */}
          <Semester subjects={subjects} pass={scale.pass} min={scale.min} max={scale.max} navigate={navigate} />

          {/* ============ Hoy · Próximos días ============ */}
          <div className="mt-14 grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-16">
            <section>
              <SectionTitle
                title="Hoy"
                action={todayClasses.length ? { label: 'Ver horario', onClick: () => navigate({ name: 'horario' }) } : undefined}
              />
              {todayItems.length === 0 ? (
                <Quiet>No tienes clases hoy.</Quiet>
              ) : (
                <ul>
                  {todayItems.map((it) => {
                    const live = liveOf(it)
                    const past = pastOf(it)
                    return (
                      <li key={it.key}>
                        <button
                          onClick={it.onClick}
                          className={`-mx-3 flex w-[calc(100%+1.5rem)] items-center gap-4 rounded-2xl px-3 py-3 text-left transition-colors hover:bg-ink/[0.035] ${
                            past ? 'opacity-40' : ''
                          }`}
                        >
                          <span
                            className={`w-12 shrink-0 text-[15px] tabular-nums ${
                              live ? 'font-bold text-rose-500' : 'font-medium text-ink/45'
                            }`}
                          >
                            {it.time ?? 'Día'}
                          </span>
                          <span
                            className="h-9 w-[5px] shrink-0 rounded-full"
                            style={{ ...RAISED, backgroundColor: `rgb(${it.rgb})` }}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[16px] font-semibold text-ink">{it.name}</span>
                            {it.detail && <span className="block truncate text-[14px] text-ink/45">{it.detail}</span>}
                          </span>
                          {live ? (
                            <span className="shrink-0 text-[13.5px] font-semibold text-rose-500">
                              En curso hasta las {it.end}
                            </span>
                          ) : (
                            it.end && <span className="shrink-0 text-[14px] tabular-nums text-ink/35">hasta {it.end}</span>
                          )}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>

            <section>
              <SectionTitle title="Próximos días" action={{ label: 'Agregar tarea', onClick: () => openTask(null), plus: true }} />
              {groups.length === 0 ? (
                <Quiet>Nada pendiente para esta semana.</Quiet>
              ) : (
                <div className="space-y-5">
                  {groups.map((g) => (
                    <div key={g.key}>
                      <h3 className={`mb-1 text-[14px] font-semibold ${g.urgent ? 'text-rose-500' : 'text-ink/45'}`}>
                        {g.label}
                      </h3>
                      <ul>
                        {g.items.map((it) =>
                          it.kind === 'task' && it.task ? (
                            <TaskRow key={it.key} task={it.task} onToggle={toggleTask} onOpen={openTask} />
                          ) : (
                            <li key={it.key}>
                              <button
                                onClick={() => navigate({ name: 'calendario' })}
                                className="-mx-3 flex w-[calc(100%+1.5rem)] items-center gap-3.5 rounded-2xl px-3 py-2.5 text-left transition-colors hover:bg-ink/[0.035]"
                              >
                                <span
                                  className="h-8 w-[5px] shrink-0 rounded-full"
                                  style={{ ...RAISED, backgroundColor: `rgb(${it.rgb})` }}
                                />
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-[16px] font-semibold text-ink">{it.title}</span>
                                  {it.sub && <span className="block truncate text-[14px] text-ink/45">{it.sub}</span>}
                                </span>
                                {it.time && <span className="shrink-0 text-[14px] tabular-nums text-ink/40">{it.time}</span>}
                              </button>
                            </li>
                          ),
                        )}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>

      <TaskEditor open={taskOpen} onClose={() => setTaskOpen(false)} task={editingTask} />
      <EventSheet
        open={eventOpen}
        onClose={() => setEventOpen(false)}
        event={null}
        defaultDate={todayKey}
        onPickTask={() => openTask(null)}
      />
    </MotionConfig>
  )
}

/* ======================= Tu semestre ======================= */

/**
 * Todos los ramos sobre la misma escala de notas. Por ramo: una franja con el
 * rango en que todavía puede terminar (nota mínima → máxima con lo que queda) y
 * un punto en el promedio actual. La línea del 4,0 cruza todas las filas.
 * Al entrar, los puntos viajan desde el inicio de la escala hasta su nota: es
 * la única animación automática de la página.
 */
function Semester({
  subjects,
  pass,
  min,
  max,
  navigate,
}: {
  subjects: Subject[]
  pass: number
  min: number
  max: number
  navigate: (r: Route) => void
}) {
  const pos = (v: number) => `${Math.max(0, Math.min(1, (v - min) / (max - min))) * 100}%`
  const ticks = Array.from({ length: Math.round(max - min) + 1 }, (_, i) => min + i)
  const graded = subjects.filter((s) => currentGrade(s) != null)
  const above = graded.filter((s) => (currentGrade(s) ?? 0) >= pass).length

  return (
    <section
      className="mt-9 rounded-[30px] bg-[rgb(var(--card))] px-8 pb-6 pt-7 ring-1 ring-ink/[0.05]"
      style={RAISED_LIGHT}
    >
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-[24px] font-bold tracking-[-0.02em] text-ink">Tu semestre</h2>
        {graded.length > 0 && (
          <p className="text-[15px] text-ink/45">
            {above === graded.length
              ? `Vas sobre ${formatGrade(pass)} en todos tus ramos`
              : `${above} de ${graded.length} ramos con nota van sobre ${formatGrade(pass)}`}
          </p>
        )}
      </div>

      {subjects.length === 0 ? (
        <div className="py-10">
          <p className="text-[16px] text-ink/50">Agrega tus ramos y acá vas a ver cómo va tu semestre de un vistazo.</p>
          <button
            onClick={() => navigate({ name: 'calculadora', add: true })}
            className="mt-4 flex items-center gap-1.5 text-[15px] font-semibold text-ink transition-opacity hover:opacity-70"
          >
            <PlusIcon className="h-4 w-4" /> Agregar ramo
          </button>
        </div>
      ) : (
        <div className="mt-6">
          {/* Escala */}
          <div className="grid grid-cols-[230px_minmax(0,1fr)_132px] gap-6">
            <span />
            <div className="relative h-5">
              {ticks.map((t) => (
                <span
                  key={t}
                  className={`absolute top-0 -translate-x-1/2 text-[13px] tabular-nums ${
                    t === pass ? 'font-bold text-ink' : 'font-medium text-ink/30'
                  }`}
                  style={{ left: pos(t) }}
                >
                  {t}
                </span>
              ))}
            </div>
            <span />
          </div>

          {/* Filas */}
          <div>
            {subjects.map((s, i) => (
              <SemesterRow
                key={s.id}
                s={s}
                index={i}
                pos={pos}
                passPos={pos(pass)}
                min={min}
                onClick={() => navigate({ name: 'calculadora', id: s.id })}
              />
            ))}
          </div>

          <p className="mt-4 pl-[254px] text-[13px] text-ink/40">
            El punto es tu promedio de hoy. La franja muestra entre qué notas todavía puedes terminar.
          </p>
        </div>
      )}
    </section>
  )
}

function SemesterRow({
  s,
  index,
  pos,
  passPos,
  min,
  onClick,
}: {
  s: Subject
  index: number
  pos: (v: number) => string
  passPos: string
  min: number
  onClick: () => void
}) {
  const rgb = accentRgb(s.color ?? 'gray')
  const cur = currentGrade(s)
  const hasEvals = realEvaluationCount(s) > 0
  const lo = hasEvals ? minPossibleFinal(s) : s.scale.min
  const hi = hasEvals ? maxPossibleFinal(s) : s.scale.max
  const res = minGradeToPass(s)

  const note: { text: string; tone: string } = !hasEvals
    ? { text: 'Sin evaluaciones', tone: 'text-ink/35' }
    : cur == null
      ? { text: 'Sin notas', tone: 'text-ink/35' }
      : res.status === 'ASEGURADO'
        ? { text: 'Aprobado', tone: 'text-emerald-600 dark:text-emerald-300' }
        : res.status === 'IMPOSIBLE'
          ? { text: 'No alcanza', tone: 'text-rose-500 dark:text-rose-300' }
          : res.status === 'ALCANZABLE'
            ? { text: `Necesitas ${formatGrade(res.needed)}`, tone: 'text-ink/50' }
            : { text: '', tone: '' }

  return (
    <button
      onClick={onClick}
      className="group -mx-4 grid w-[calc(100%+2rem)] grid-cols-[230px_minmax(0,1fr)_132px] items-center gap-6 rounded-2xl px-4 py-2.5 text-left transition-colors hover:bg-ink/[0.03]"
    >
      <span className="line-clamp-2 text-[16px] font-semibold leading-tight text-ink">{s.name}</span>

      {/* Pista: línea base, línea del 4,0, rango posible y promedio actual */}
      <span className="relative block h-9">
        <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-ink/[0.1]" />
        <span className="absolute -inset-y-2.5 w-px bg-ink/25" style={{ left: passPos }} />
        <span
          className="absolute top-1/2 h-[6px] -translate-y-1/2 rounded-full"
          style={{
            left: pos(lo),
            width: `calc(${pos(hi)} - ${pos(lo)})`,
            backgroundColor: `rgb(${rgb} / ${cur == null ? 0.14 : 0.28})`,
          }}
        />
        {cur != null && (
          <motion.span
            initial={{ left: pos(min) }}
            animate={{ left: pos(cur) }}
            transition={{ ...SPRING.panel, delay: 0.15 + index * 0.06 }}
            className="absolute top-1/2 h-[18px] w-[18px] -translate-x-1/2 -translate-y-1/2 rounded-full ring-[3px] ring-[rgb(var(--card))]"
            style={{ ...RAISED, backgroundColor: `rgb(${rgb})` }}
          />
        )}
      </span>

      <span className="flex items-baseline justify-end gap-3">
        <span className={`text-[13.5px] ${note.tone}`}>{note.text}</span>
        <span className="w-9 text-right text-[20px] font-bold tabular-nums tracking-[-0.02em] text-ink">
          {cur == null ? '–' : formatGrade(cur)}
        </span>
      </span>
    </button>
  )
}

/* ======================= Piezas chicas ======================= */

function SectionTitle({
  title,
  action,
}: {
  title: string
  action?: { label: string; onClick: () => void; plus?: boolean }
}) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-4">
      <h2 className="text-[24px] font-bold tracking-[-0.02em] text-ink">{title}</h2>
      {action && (
        <button
          onClick={action.onClick}
          className="flex items-center gap-1 text-[14.5px] font-medium text-ink/45 transition-colors hover:text-ink"
        >
          {action.plus && <PlusIcon className="h-4 w-4" />}
          {action.label}
        </button>
      )}
    </div>
  )
}

function Quiet({ children }: { children: ReactNode }) {
  return <p className="py-3 text-[16px] text-ink/45">{children}</p>
}

/** Tarea con su check (con el mismo salto que en el panel del día). */
function TaskRow({
  task,
  onToggle,
  onOpen,
}: {
  task: Task
  onToggle: (id: string) => void
  onOpen: (t: Task) => void
}) {
  return (
    <li className="-mx-3 flex items-center gap-3.5 rounded-2xl px-3 py-2.5 transition-colors hover:bg-ink/[0.035]">
      <motion.button
        initial={false}
        whileTap={{ scale: 0.82 }}
        animate={{ scale: task.done ? [1, 1.18, 1] : 1 }}
        transition={{ duration: 0.38, ease: EASE.overshoot }}
        onClick={() => onToggle(task.id)}
        aria-label={task.done ? 'Marcar pendiente' : 'Completar'}
        className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors duration-200 ${
          task.done ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-ink/25 text-transparent hover:border-ink/50'
        }`}
        style={task.color && !task.done ? { borderColor: `rgb(${accentRgb(task.color)})` } : undefined}
      >
        <CheckIcon className="h-3 w-3" />
      </motion.button>
      <button
        onClick={() => onOpen(task)}
        className={`min-w-0 flex-1 truncate text-left text-[16px] transition-colors ${
          task.done ? 'text-ink/35 line-through' : 'text-ink'
        }`}
      >
        {task.title}
      </button>
      {task.time && <span className="shrink-0 text-[14px] tabular-nums text-ink/40">{task.time}</span>}
    </li>
  )
}

