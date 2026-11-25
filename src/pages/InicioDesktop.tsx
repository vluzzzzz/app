import { useEffect, useState, type ReactNode } from 'react'
import { MotionConfig, motion } from 'framer-motion'
import type { Route } from '../App'
import type { CalendarEvent, EventType, Task } from '../lib/types'
import { useAppStore } from '../store/useAppStore'
import { accentRgb } from '../lib/accents'
import { EASE, SPRING } from '../lib/motion'
import {
  CLASS_TYPE_LABEL,
  DAY_NAMES,
  DAY_SHORT,
  MONTH_NAMES,
  classesForDay,
  eventsOn,
  fromDateKey,
  nextClassToday,
  toDateKey,
  toMinutes,
  weekday,
} from '../lib/schedule'
import { TaskEditor } from '../features/tasks/TaskEditor'
import { EventSheet } from '../features/schedule/EventSheet'
import { SubjectTile } from '../features/subjects/SubjectTile'
import { RAISED, RAISED_LIGHT } from '../components/ui/relief'
import { CalendarIcon, CheckIcon, ChevronRight, PlusIcon } from '../components/ui/Icons'

/** Color por tipo de evento (cuando no tiene ramo asociado). */
const EVENT_TYPE_RGB: Record<EventType, string> = {
  evaluacion: '239 68 68',
  tarea: '249 115 22',
  evento: '59 130 246',
  recordatorio: '139 92 246',
}

/** Días hacia adelante en que se buscan evaluaciones. */
const EVAL_DAYS = 30

type Slot = {
  key: string
  name: string
  rgb: string
  start?: string
  end?: string
  detail: string
  onClick: () => void
}

/**
 * Inicio del modo PC: responde "¿qué tengo hoy y esta semana?".
 * Arriba el saludo con una frase del día; luego "Hoy" (clases y eventos en una
 * línea de tiempo) junto a las tareas; las próximas evaluaciones en fila; y los
 * ramos en tarjetas con promedio, anillo y estado (las mismas de la Calculadora).
 * El Inicio del celular vive intacto en Inicio.tsx.
 */
export function InicioDesktop({ navigate }: { navigate: (r: Route) => void }) {
  const userName = useAppStore((s) => s.userName)
  const subjects = useAppStore((s) => s.subjects)
  const tasks = useAppStore((s) => s.tasks)
  const events = useAppStore((s) => s.events)
  const classes = useAppStore((s) => s.classes)
  const toggleTask = useAppStore((s) => s.toggleTask)

  const [taskOpen, setTaskOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [eventOpen, setEventOpen] = useState(false)

  // La línea de "Ahora" avanza sola.
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
  const eventRgb = (e: CalendarEvent) => {
    const s = subjectOf(e.subjectId)
    return s ? accentRgb(s.color ?? 'gray') : EVENT_TYPE_RGB[e.type]
  }
  const dateAt = (offset: number) => {
    const d = new Date(now)
    d.setDate(now.getDate() + offset)
    return d
  }

  // ---------- Próximas evaluaciones ----------
  const evals: { ev: CalendarEvent; key: string; days: number }[] = []
  const seen = new Set<string>()
  for (let i = 0; i < EVAL_DAYS; i++) {
    const key = toDateKey(dateAt(i))
    for (const ev of eventsOn(events, key)) {
      if (ev.type !== 'evaluacion' || seen.has(ev.id)) continue
      seen.add(ev.id)
      evals.push({ ev, key, days: i })
    }
  }
  const whenLabel = (days: number, key: string) =>
    days === 0 ? 'hoy' : days === 1 ? 'mañana' : `el ${DAY_NAMES[weekday(fromDateKey(key))].toLowerCase()}`

  // ---------- Hoy: clases + eventos ----------
  const slots: Slot[] = [
    ...classesForDay(classes, weekday(now)).map((c) => ({
      key: `c-${c.id}`,
      name: subjectOf(c.subjectId)?.name ?? 'Clase',
      rgb: accentRgb(subjectOf(c.subjectId)?.color ?? 'gray'),
      start: c.start,
      end: c.end,
      detail: [CLASS_TYPE_LABEL[c.type], c.room].filter(Boolean).join(' · '),
      onClick: () => navigate({ name: 'horario' }),
    })),
    ...eventsOn(events, todayKey).map((e) => ({
      key: `e-${e.id}`,
      name: e.title,
      rgb: eventRgb(e),
      start: e.time,
      detail: [subjectOf(e.subjectId)?.name, e.location].filter(Boolean).join(' · '),
      onClick: () => navigate({ name: 'calendario' }),
    })),
  ].sort((a, b) => (a.start ? toMinutes(a.start) : -1) - (b.start ? toMinutes(b.start) : -1))

  const timed = slots.filter((s) => s.start)
  const isLive = (s: Slot) =>
    !!s.start && !!s.end && nowMins >= toMinutes(s.start) && nowMins < toMinutes(s.end)
  // La línea "Ahora" va una sola vez: sobre el bloque en curso o, si no hay,
  // antes del primero que todavía no empieza.
  const nowIdx = (() => {
    const live = timed.findIndex(isLive)
    if (live !== -1) return live
    const i = timed.findIndex((s) => toMinutes(s.start!) > nowMins)
    return i === -1 ? timed.length : i
  })()
  const liveNow = timed.some(isLive)
  const isPast = (s: Slot) => !!s.start && toMinutes(s.end ?? s.start) <= nowMins && !isLive(s)

  // ---------- Frase del día ----------
  const next = nextClassToday(classes, now)
  const nextName = next ? subjectOf(next.block.subjectId)?.name ?? 'clase' : null
  const firstEval = evals[0]
  const evalPhrase = firstEval ? `una evaluación ${whenLabel(firstEval.days, firstEval.key)}` : null
  const frase: ReactNode = next ? (
    <>
      {next.status === 'now' ? 'Ahora estás en ' : 'Hoy tienes '}
      <b className="font-semibold text-ink">{nextName}</b>
      {next.status === 'now' ? ` hasta las ${next.block.end}` : ` a las ${next.block.start}`}
      {evalPhrase ? ` y ${evalPhrase}.` : '.'}
    </>
  ) : evalPhrase ? (
    <>
      Hoy no tienes más clases. Tienes <b className="font-semibold text-ink">{evalPhrase}</b>.
    </>
  ) : (
    'Hoy no tienes más clases ni evaluaciones cerca.'
  )

  // ---------- Tareas ----------
  const yesterdayKey = toDateKey(dateAt(-1))
  const tomorrowKey = toDateKey(dateAt(1))
  const taskDate = (t: Task) => {
    if (!t.date) return t.time ?? ''
    if (t.date === todayKey) return t.time ? `Hoy · ${t.time}` : 'Hoy'
    if (t.date === yesterdayKey) return 'Ayer'
    if (t.date === tomorrowKey) return 'Mañana'
    const d = fromDateKey(t.date)
    return `${DAY_SHORT[weekday(d)]} ${d.getDate()}`
  }
  const byDate = (a: Task, b: Task) => (a.date ?? '9999').localeCompare(b.date ?? '9999')
  const pending = tasks.filter((t) => !t.done).sort(byDate)
  const done = tasks.filter((t) => t.done).sort(byDate).reverse()
  const taskList = [...pending, ...done.slice(0, 3)]

  const openTask = (t: Task | null) => {
    setEditingTask(t)
    setTaskOpen(true)
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="h-full overflow-y-auto">
        <motion.div
          className="mx-auto flex w-full max-w-[1400px] flex-col gap-5 px-8 pb-12 pt-8"
          initial="initial"
          animate="animate"
          variants={{ animate: { transition: { staggerChildren: 0.06 } } }}
        >
          {/* ============ Saludo ============ */}
          <motion.header variants={rise} className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="truncate text-[34px] font-bold leading-tight tracking-[-0.02em] text-ink">
                {saludo}, {userName || 'Estudiante'}
              </h1>
              <p className="mt-0.5 text-[16px] font-medium text-ink/45">{fecha}</p>
              <p className="mt-2 text-[16px] text-ink/65">{frase}</p>
            </div>
            <motion.button
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.96, y: 0 }}
              transition={SPRING.press}
              onClick={() => setEventOpen(true)}
              style={RAISED}
              className="flex h-12 shrink-0 items-center gap-2 rounded-full bg-ink px-6 text-[15px] font-semibold text-surface"
            >
              <PlusIcon className="h-5 w-5" /> Agregar
            </motion.button>
          </motion.header>

          {/* ============ Hoy + Tareas ============ */}
          <motion.div variants={rise} className="grid grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] gap-5">
            <Card title="Hoy" action={{ label: 'Ver horario', onClick: () => navigate({ name: 'horario' }) }}>
              {slots.length === 0 ? (
                <Empty icon={<CalendarIcon className="h-6 w-6" />} title="Hoy no tienes clases" sub="Aprovecha para adelantar." />
              ) : (
                <div className="max-h-[330px] space-y-2 overflow-y-auto pr-1">
                  {slots
                    .filter((s) => !s.start)
                    .map((s) => (
                      <SlotRow key={s.key} slot={s} label="Todo el día" />
                    ))}
                  {timed.map((s, i) => (
                    <div key={s.key}>
                      {i === nowIdx && <NowLine mins={nowMins} live={liveNow} />}
                      <SlotRow slot={s} label={s.start!} live={isLive(s)} past={isPast(s)} />
                    </div>
                  ))}
                  {nowIdx === timed.length && timed.length > 0 && <NowLine mins={nowMins} live={false} />}
                </div>
              )}
            </Card>

            <Card title="Tareas" action={pending.length ? { label: `${pending.length} pendientes` } : undefined}>
              <div className="flex h-full flex-col">
                {taskList.length === 0 ? (
                  <Empty icon={<CheckIcon className="h-6 w-6" />} title="Todo al día" sub="No tienes tareas pendientes." />
                ) : (
                  <div className="max-h-[262px] divide-y divide-ink/[0.06] overflow-y-auto pr-1">
                    {taskList.map((t) => (
                      <div key={t.id} className="flex items-center gap-3 py-2.5">
                        <motion.button
                          initial={false}
                          whileTap={{ scale: 0.82 }}
                          animate={{ scale: t.done ? [1, 1.18, 1] : 1 }}
                          transition={{ duration: 0.38, ease: EASE.overshoot }}
                          onClick={() => toggleTask(t.id)}
                          aria-label={t.done ? 'Marcar pendiente' : 'Completar'}
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors duration-200 ${
                            t.done
                              ? 'border-emerald-500 bg-emerald-500 text-white'
                              : 'border-ink/25 text-transparent hover:border-ink/50'
                          }`}
                        >
                          <CheckIcon className="h-3.5 w-3.5" />
                        </motion.button>
                        <button
                          onClick={() => openTask(t)}
                          className={`min-w-0 flex-1 truncate text-left text-[15px] transition-colors ${
                            t.done ? 'text-ink/35 line-through' : 'text-ink hover:text-ink/70'
                          }`}
                        >
                          {t.title}
                        </button>
                        {t.color && (
                          <span
                            className="h-2 w-2 shrink-0 rounded-full"
                            style={{ background: `rgb(${accentRgb(t.color)})` }}
                          />
                        )}
                        <span
                          className={`shrink-0 text-[13px] tabular-nums ${
                            !t.done && t.date && t.date < todayKey ? 'font-semibold text-rose-500' : 'text-ink/45'
                          }`}
                        >
                          {taskDate(t)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => openTask(null)}
                  className="mt-auto flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-ink/[0.045] text-[14.5px] font-semibold text-ink/70 transition-colors hover:bg-ink/[0.08] hover:text-ink"
                >
                  <PlusIcon className="h-4 w-4" /> Agregar tarea
                </motion.button>
              </div>
            </Card>
          </motion.div>

          {/* ============ Próximas evaluaciones ============ */}
          <motion.div variants={rise}>
            <Card
              title="Próximas evaluaciones"
              action={{ label: 'Ver todas', onClick: () => navigate({ name: 'calendario' }), chevron: true }}
            >
              {evals.length === 0 ? (
                <p className="rounded-2xl bg-ink/[0.035] px-4 py-5 text-center text-[14px] text-ink/45">
                  No tienes evaluaciones en los próximos {EVAL_DAYS} días.
                </p>
              ) : (
                <div className="-mx-1 grid auto-cols-[minmax(250px,1fr)] grid-flow-col gap-3 overflow-x-auto px-1 pb-2 pt-0.5">
                  {evals.slice(0, 8).map(({ ev, key, days }, i) => {
                    const d = fromDateKey(key)
                    const rgb = eventRgb(ev)
                    return (
                      <motion.button
                        key={ev.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0, transition: { ...SPRING.soft, delay: 0.1 + i * 0.04 } }}
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => navigate({ name: 'calendario' })}
                        style={RAISED_LIGHT}
                        className="flex items-stretch gap-3 rounded-[18px] bg-[rgb(var(--card))] p-3 text-left ring-1 ring-ink/[0.05]"
                      >
                        <span
                          className="w-[5px] shrink-0 rounded-full"
                          style={{ ...RAISED, backgroundColor: `rgb(${rgb})` }}
                        />
                        <div className="min-w-0 flex-1 py-0.5">
                          <p className="truncate text-[15px] font-bold text-ink">{ev.title}</p>
                          <p className="truncate text-[13px] text-ink/50">
                            {subjectOf(ev.subjectId)?.name ?? (ev.time ? `A las ${ev.time}` : 'Evaluación')}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-center justify-center gap-1 border-l border-ink/[0.07] pl-3">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[12.5px] font-bold ${
                              days <= 1 ? 'text-white' : 'bg-ink/[0.06] text-ink'
                            }`}
                            style={days <= 1 ? { ...RAISED, backgroundColor: 'rgb(244 63 94)' } : undefined}
                          >
                            {DAY_SHORT[weekday(d)]} {d.getDate()}
                          </span>
                          <span className={`text-[12.5px] ${days <= 1 ? 'font-semibold text-rose-500' : 'text-ink/45'}`}>
                            {days === 0 ? 'hoy' : days === 1 ? 'mañana' : `en ${days} días`}
                          </span>
                        </div>
                      </motion.button>
                    )
                  })}
                </div>
              )}
            </Card>
          </motion.div>

          {/* ============ Tus ramos ============ */}
          <motion.div variants={rise}>
            <Card
              title="Tus ramos"
              action={{ label: 'Ver todos', onClick: () => navigate({ name: 'calculadora' }), chevron: true }}
            >
              {subjects.length === 0 ? (
                <div className="flex flex-col items-center rounded-2xl bg-ink/[0.035] px-4 py-6 text-center">
                  <p className="text-[15px] font-semibold text-ink">Aún no tienes ramos</p>
                  <p className="mt-0.5 text-[13.5px] text-ink/45">Agrega uno y calcula qué nota necesitas.</p>
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={() => navigate({ name: 'calculadora', add: true })}
                    style={RAISED}
                    className="mt-4 flex h-10 items-center gap-2 rounded-full bg-ink px-5 text-[14px] font-semibold text-surface"
                  >
                    <PlusIcon className="h-4 w-4" /> Agregar ramo
                  </motion.button>
                </div>
              ) : (
                <div className="-mx-1 grid auto-cols-[minmax(164px,1fr)] grid-flow-col gap-3 overflow-x-auto px-1 pb-2 pt-1">
                  {subjects.map((s, i) => (
                    <SubjectTile
                      key={s.id}
                      subject={s}
                      index={i}
                      onClick={() => navigate({ name: 'calculadora', id: s.id })}
                    />
                  ))}
                </div>
              )}
            </Card>
          </motion.div>
        </motion.div>
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

/** Entrada escalonada de cada bloque. */
const rise = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0, transition: SPRING.soft },
}

/** Tarjeta blanca de sección con título y acción opcional a la derecha. */
function Card({
  title,
  action,
  children,
}: {
  title: string
  action?: { label: string; onClick?: () => void; chevron?: boolean }
  children: ReactNode
}) {
  return (
    <section
      className="flex h-full flex-col rounded-[26px] bg-[rgb(var(--card))] p-5 ring-1 ring-ink/[0.05] dark:bg-white/[0.035] dark:ring-white/[0.06]"
      style={RAISED_LIGHT}
    >
      <div className="mb-3.5 flex items-center justify-between gap-3">
        <h2 className="text-[21px] font-bold tracking-[-0.015em] text-ink">{title}</h2>
        {action &&
          (action.onClick ? (
            <button
              onClick={action.onClick}
              className="flex items-center gap-0.5 text-[13.5px] font-semibold text-ink/45 transition-colors hover:text-ink"
            >
              {action.label}
              {action.chevron !== false && <ChevronRight className="h-4 w-4" />}
            </button>
          ) : (
            <span className="text-[13.5px] font-medium text-ink/40">{action.label}</span>
          ))}
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </section>
  )
}

function Empty({ icon, title, sub }: { icon: ReactNode; title: string; sub: string }) {
  return (
    <div className="flex h-full min-h-[150px] flex-col items-center justify-center text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-ink/[0.05] text-ink/40">{icon}</div>
      <p className="text-[15px] font-semibold text-ink">{title}</p>
      <p className="mt-0.5 text-[13.5px] text-ink/45">{sub}</p>
    </div>
  )
}

/** Fila de la línea de tiempo de hoy: hora en etiqueta + tarjeta con barra de color. */
function SlotRow({ slot, label, live = false, past = false }: { slot: Slot; label: string; live?: boolean; past?: boolean }) {
  return (
    <div className={`flex items-center gap-3 transition-opacity ${past ? 'opacity-45' : ''}`}>
      <span className="w-[68px] shrink-0 rounded-full bg-ink/[0.045] py-1 text-center text-[12.5px] font-semibold tabular-nums text-ink/60">
        {label}
      </span>
      <motion.button
        whileHover={{ y: -1 }}
        whileTap={{ scale: 0.98 }}
        onClick={slot.onClick}
        style={RAISED_LIGHT}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-[16px] bg-[rgb(var(--card))] py-2.5 pl-2.5 pr-4 text-left ring-1 ring-ink/[0.06]"
      >
        <span className="h-7 w-[5px] shrink-0 rounded-full" style={{ ...RAISED, backgroundColor: `rgb(${slot.rgb})` }} />
        <span className="min-w-0 flex-1 truncate text-[15px] font-bold text-ink">{slot.name}</span>
        {live && (
          <span
            className="shrink-0 rounded-full px-2 py-0.5 text-[11.5px] font-bold text-white"
            style={{ ...RAISED, backgroundColor: 'rgb(244 63 94)' }}
          >
            Ahora
          </span>
        )}
        <span className="shrink-0 truncate text-[13px] tabular-nums text-ink/50">
          {[slot.start && slot.end ? `${slot.start} – ${slot.end}` : slot.start, slot.detail].filter(Boolean).join(' · ')}
        </span>
      </motion.button>
    </div>
  )
}

/** Línea roja con la hora actual entre los bloques de hoy. */
function NowLine({ mins, live }: { mins: number; live: boolean }) {
  const hh = String(Math.floor(mins / 60)).padStart(2, '0')
  const mm = String(mins % 60).padStart(2, '0')
  return (
    <div className="flex items-center gap-3 py-1">
      <span
        className="w-[68px] shrink-0 rounded-full py-1 text-center text-[12.5px] font-bold tabular-nums text-white"
        style={{ ...RAISED, backgroundColor: 'rgb(244 63 94)' }}
      >
        {hh}:{mm}
      </span>
      <div className="relative h-[2px] flex-1 rounded-full bg-rose-500">
        <span className="absolute -left-1 -top-[3px] h-2 w-2 rounded-full bg-rose-500" />
      </div>
      {!live && <span className="shrink-0 text-[11.5px] font-bold uppercase tracking-wide text-rose-500">Ahora</span>}
    </div>
  )
}
