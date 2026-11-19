import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import type { Route } from '../App'
import type { CalendarEvent, EventType, Task } from '../lib/types'
import { useAppStore } from '../store/useAppStore'
import { accentRgb } from '../lib/accents'
import { currentGrade, minGradeToPass } from '../lib/grades'
import { formatGrade } from '../lib/format'
import { dashItem, staggerContainer } from '../lib/motion'
import { AnimatedNumber } from '../components/ui/AnimatedNumber'
import {
  DAY_NAMES,
  MONTH_NAMES,
  classesForDay,
  eventsOn,
  fromDateKey,
  nextClassToday,
  toDateKey,
  weekday,
} from '../lib/schedule'
import { TaskEditor } from '../features/tasks/TaskEditor'
import {
  BellIcon,
  CalendarIcon,
  ChatBubbleIcon,
  ChevronRight,
  PlusIcon,
} from '../components/ui/Icons'

/** Color por tipo de evento (cuando no tiene ramo asociado). */
const EVENT_TYPE_RGB: Record<EventType, string> = {
  evaluacion: '239 68 68',
  tarea: '249 115 22',
  evento: '59 130 246',
  recordatorio: '139 92 246',
}
const EVENT_TYPE_LABEL: Record<EventType, string> = {
  evaluacion: 'Evaluación',
  tarea: 'Tarea',
  evento: 'Evento',
  recordatorio: 'Recordatorio',
}

/** Fila unificada para la tabla de actividades (evento o tarea con fecha). */
type Actividad = {
  key: string
  title: string
  tipo: string
  tipoRgb: string
  ramo?: string
  date: string
  time?: string
  estado: 'hoy' | 'programado' | 'pendiente' | 'completada'
  onClick: () => void
}

/**
 * Home del modo PC — estructura de dashboard (referencia financiera de Angel):
 * col izquierda: promedio general + ramos + progreso de tareas;
 * derecha: stats 2x2 (clases hoy destacada) + gráfico de promedios + tabla
 * de próximas actividades. La Home del celular vive intacta en Inicio.tsx.
 */
export function InicioDesktop({ navigate }: { navigate: (r: Route) => void }) {
  const userName = useAppStore((s) => s.userName)
  const subjects = useAppStore((s) => s.subjects)
  const tasks = useAppStore((s) => s.tasks)
  const events = useAppStore((s) => s.events)
  const classes = useAppStore((s) => s.classes)
  const defaultScale = useAppStore((s) => s.defaultScale)

  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<Task | null>(null)

  // Refresca "próxima clase" cada 30s.
  const [, setTick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 30_000)
    return () => clearInterval(t)
  }, [])

  const now = new Date()
  const todayKey = toDateKey(now)
  const hora = now.getHours()
  const saludo = hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches'

  // --- Métricas académicas ---
  const conNota = subjects.filter((s) => currentGrade(s) != null)
  const promedioGeneral = conNota.length
    ? conNota.reduce((sum, s) => sum + (currentGrade(s) ?? 0), 0) / conNota.length
    : null
  const asegurados = subjects.filter((s) => minGradeToPass(s).status === 'ASEGURADO').length
  const enRiesgo = subjects.filter((s) => minGradeToPass(s).status === 'IMPOSIBLE').length

  // --- Hoy / semana ---
  const clasesHoy = classesForDay(classes, weekday(now))
  const next = nextClassToday(classes, now)
  const nextSubject = next ? subjects.find((s) => s.id === next.block.subjectId) : null
  const tareasPend = tasks.filter((t) => !t.done)
  const tareasHechas = tasks.filter((t) => t.done).length
  const progresoTareas = tasks.length ? tareasHechas / tasks.length : 0

  // Evaluaciones de los próximos 7 días.
  const evalsSemana = new Set<string>()
  for (let i = 0; i < 7; i++) {
    const d = new Date(now)
    d.setDate(now.getDate() + i)
    for (const ev of eventsOn(events, toDateKey(d))) {
      if (ev.type === 'evaluacion') evalsSemana.add(ev.id)
    }
  }

  // --- Tabla: próximas actividades (eventos 14 días + tareas pendientes con fecha) ---
  const subjectName = (id?: string) => subjects.find((s) => s.id === id)?.name
  const eventColor = (e: CalendarEvent) => {
    const subj = subjects.find((s) => s.id === e.subjectId)
    return subj ? accentRgb(subj.color ?? 'gray') : EVENT_TYPE_RGB[e.type]
  }
  const actividades: Actividad[] = []
  const vistos = new Set<string>()
  for (let i = 0; i < 14; i++) {
    const d = new Date(now)
    d.setDate(now.getDate() + i)
    const key = toDateKey(d)
    for (const ev of eventsOn(events, key)) {
      if (vistos.has(ev.id)) continue
      vistos.add(ev.id)
      actividades.push({
        key: `ev-${ev.id}`,
        title: ev.title,
        tipo: EVENT_TYPE_LABEL[ev.type],
        tipoRgb: eventColor(ev),
        ramo: subjectName(ev.subjectId),
        date: key,
        time: ev.time,
        estado: key === todayKey ? 'hoy' : 'programado',
        onClick: () => navigate({ name: 'calendario' }),
      })
    }
  }
  for (const t of tasks) {
    if (!t.date || t.date < todayKey) continue
    actividades.push({
      key: `t-${t.id}`,
      title: t.title,
      tipo: 'Tarea',
      tipoRgb: t.color ? accentRgb(t.color) : EVENT_TYPE_RGB.tarea,
      date: t.date,
      time: t.time,
      estado: t.done ? 'completada' : t.date === todayKey ? 'hoy' : 'pendiente',
      onClick: () => {
        setEditing(t)
        setEditorOpen(true)
      },
    })
  }
  actividades.sort((a, b) => (a.date + (a.time ?? '')).localeCompare(b.date + (b.time ?? '')))
  const filas = actividades.slice(0, 8)

  const fechaLabel = (key: string) => {
    if (key === todayKey) return 'Hoy'
    const d = fromDateKey(key)
    const man = new Date(now)
    man.setDate(now.getDate() + 1)
    if (key === toDateKey(man)) return 'Mañana'
    return `${DAY_NAMES[weekday(d)].slice(0, 3)} ${d.getDate()} ${MONTH_NAMES[d.getMonth()].slice(0, 3).toLowerCase()}`
  }

  // --- Gráfico: escala de la barra (de min a max de la escala de notas) ---
  const { min, max, pass } = defaultScale
  const pct = (v: number) => Math.max(0, Math.min(1, (v - min) / (max - min))) * 100
  const barras = subjects
    .map((s) => ({ s, prom: currentGrade(s) }))
    .filter((b): b is { s: (typeof subjects)[number]; prom: number } => b.prom != null)
    .slice(0, 8)

  const fechaHero = `${DAY_NAMES[weekday(now)]} ${now.getDate()} de ${MONTH_NAMES[
    now.getMonth()
  ].toLowerCase()}`
  const claseLabel = clasesHoy.length === 1 ? 'clase hoy' : 'clases hoy'

  return (
    <div className="h-full overflow-y-auto px-8 pb-14 pt-9 xl:px-12">
      <motion.div
        className="mx-auto flex max-w-[1400px] flex-col gap-6"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        {/* ============ ENCABEZADO ============ */}
        <motion.header variants={dashItem} className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="truncate text-[32px] font-bold leading-tight text-ink">
              {saludo}, {userName || 'Estudiante'}
            </h1>
            <p className="mt-1 text-[15px] capitalize text-ink/45">{fechaHero}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2.5">
            <button
              onClick={() => navigate({ name: 'calendario' })}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-ink/10 bg-ink/[0.02] text-ink/60 transition-colors hover:bg-ink/5"
              aria-label="Calendario"
            >
              <CalendarIcon className="h-5 w-5" />
            </button>
            <button
              className="flex h-11 w-11 items-center justify-center rounded-full border border-ink/10 bg-ink/[0.02] text-ink/60 transition-colors hover:bg-ink/5"
              aria-label="Notificaciones"
            >
              <BellIcon className="h-5 w-5" />
            </button>
            <button
              onClick={() => navigate({ name: 'calculadora', add: true })}
              className="ml-1 flex h-11 items-center gap-2 rounded-full bg-ink px-5 text-[14.5px] font-semibold text-surface transition-transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <PlusIcon className="h-4 w-4" /> Agregar ramo
            </button>
          </div>
        </motion.header>

        {/* ============ FILA HERO: resumen de hoy + stats ============ */}
        <motion.div
          variants={dashItem}
          className="grid grid-cols-1 gap-6 lg:grid-cols-[1.15fr_0.85fr]"
        >
          {/* Resumen de hoy — tarjeta destacada oscura */}
          <div className="card-hover relative flex min-h-[220px] flex-col justify-between overflow-hidden rounded-[30px] bg-ink p-8 shadow-glass">
            <div>
              <p className="text-[14px] font-semibold text-surface/55">Hoy tienes</p>
              <div className="mt-1 flex items-end gap-3">
                <AnimatedNumber
                  value={clasesHoy.length}
                  className="text-[64px] font-black leading-none tabular-nums text-surface"
                />
                <span className="mb-2 text-[20px] font-semibold text-surface/70">{claseLabel}</span>
              </div>
              <p className="mt-2 text-[14px] text-surface/55">
                {next && nextSubject
                  ? `Próxima: ${nextSubject.name} a las ${next.block.start}${
                      next.block.room ? ` · ${next.block.room}` : ''
                    }`
                  : clasesHoy.length
                    ? 'Ya terminaste tus clases de hoy'
                    : 'Día libre — aprovecha para adelantar'}
              </p>
            </div>
            <div className="mt-6 flex gap-2.5">
              <button
                onClick={() => navigate({ name: 'horario' })}
                className="flex h-11 items-center gap-2 rounded-2xl bg-surface px-5 text-[14px] font-semibold text-ink transition-transform hover:-translate-y-0.5 active:translate-y-0"
              >
                <CalendarIcon className="h-4 w-4" /> Ver horario
              </button>
              <button
                onClick={() => navigate({ name: 'chat' })}
                className="flex h-11 items-center gap-2 rounded-2xl border border-surface/20 px-5 text-[14px] font-semibold text-surface transition-colors hover:bg-surface/10"
              >
                <ChatBubbleIcon className="h-4 w-4" /> Pregúntale a Brody
              </button>
            </div>
          </div>

          {/* Stats 2x2 */}
          <div className="grid grid-cols-2 gap-5">
            <PromedioTile
              promedio={promedioGeneral}
              sub={
                subjects.length
                  ? `${asegurados} de ${subjects.length} asegurados`
                  : 'Agrega tu primer ramo'
              }
            />
            <MiniStat
              label="Tareas pendientes"
              n={tareasPend.length}
              sub={tareasPend.length ? 'por hacer' : 'todo al día'}
            />
            <MiniStat label="Evaluaciones" n={evalsSemana.size} sub="próximos 7 días" />
            <MiniStat
              label="En riesgo"
              n={enRiesgo}
              sub={enRiesgo ? 'ramos complicados' : 'todo en orden'}
              danger={enRiesgo > 0}
            />
          </div>
        </motion.div>

        {/* ============ FILA MEDIA: ramos + progreso | gráfico ============ */}
        <motion.div
          variants={dashItem}
          className="grid grid-cols-1 gap-6 lg:grid-cols-[380px_minmax(0,1fr)]"
        >
          {/* Columna izquierda: ramos + progreso de tareas */}
          <div className="flex flex-col gap-6">
            <div className="glass card-hover rounded-[26px] p-6">
              <div className="mb-3 flex items-baseline justify-between">
                <p className="text-[15px] font-bold text-ink">
                  Ramos{' '}
                  <span className="font-semibold text-ink/40">· {subjects.length} en curso</span>
                </p>
                <button
                  onClick={() => navigate({ name: 'calculadora' })}
                  className="text-[12.5px] font-semibold text-ink/40 transition-colors hover:text-ink/70"
                >
                  Ver todos
                </button>
              </div>
              {subjects.length === 0 && (
                <p className="py-6 text-center text-sm text-ink/40">Sin ramos todavía</p>
              )}
              <div className="space-y-0.5">
                {subjects.slice(0, 6).map((s) => {
                  const prom = currentGrade(s)
                  const res = minGradeToPass(s)
                  const tone =
                    res.status === 'ASEGURADO'
                      ? 'text-emerald-600 dark:text-emerald-300'
                      : res.status === 'IMPOSIBLE'
                        ? 'text-rose-500'
                        : 'text-ink'
                  return (
                    <button
                      key={s.id}
                      onClick={() => navigate({ name: 'subject', id: s.id })}
                      className="group flex w-full items-center gap-2.5 rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-ink/[0.04]"
                    >
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ background: `rgb(${accentRgb(s.color ?? 'gray')})` }}
                      />
                      <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold text-ink">
                        {s.name}
                      </span>
                      <span className={`shrink-0 text-[14px] font-black tabular-nums ${tone}`}>
                        {formatGrade(prom)}
                      </span>
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-ink/20 transition-transform group-hover:translate-x-0.5" />
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Progreso de tareas */}
            <div className="glass card-hover rounded-[26px] p-6">
              <div className="flex items-baseline justify-between">
                <p className="text-[15px] font-bold text-ink">Tareas completadas</p>
                <button
                  onClick={() => {
                    setEditing(null)
                    setEditorOpen(true)
                  }}
                  className="text-[12.5px] font-semibold text-ink/40 transition-colors hover:text-ink/70"
                >
                  Agregar
                </button>
              </div>
              <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-ink/[0.07]">
                <motion.div
                  className="h-full rounded-full bg-ink"
                  initial={{ width: 0 }}
                  animate={{ width: `${progresoTareas * 100}%` }}
                  transition={{ duration: 0.7, ease: [0.05, 0.7, 0.1, 1] }}
                />
              </div>
              <p className="mt-2 text-[12.5px] text-ink/45">
                {tasks.length
                  ? `${tareasHechas} hecha${tareasHechas === 1 ? '' : 's'} de ${tasks.length}`
                  : 'Sin tareas todavía'}
              </p>
            </div>
          </div>

          {/* Gráfico de promedios */}
          <div className="glass card-hover flex flex-col rounded-[26px] p-6">
            <div className="flex items-baseline justify-between">
              <p className="text-[15px] font-bold text-ink">Promedios por ramo</p>
              <p className="text-[11.5px] font-medium text-ink/35">
                línea = aprobación ({formatGrade(pass)})
              </p>
            </div>
            {barras.length === 0 ? (
              <p className="flex-1 py-16 text-center text-sm text-ink/40">
                Cuando pongas notas, acá verás tus promedios
              </p>
            ) : (
              <div className="relative mt-6 h-48 flex-1">
                {/* Línea de aprobación */}
                <div
                  className="absolute inset-x-0 border-t border-dashed border-ink/25"
                  style={{ bottom: `${pct(pass)}%` }}
                />
                <div className="flex h-full items-end justify-around gap-2">
                  {barras.map(({ s, prom }) => {
                    const aprueba = prom >= pass
                    return (
                      <button
                        key={s.id}
                        onClick={() => navigate({ name: 'subject', id: s.id })}
                        className="group flex h-full w-full max-w-[54px] flex-col items-center justify-end"
                        title={s.name}
                      >
                        <span
                          className={`mb-1 text-[11px] font-bold tabular-nums ${
                            aprueba ? 'text-ink/60' : 'text-rose-500'
                          }`}
                        >
                          {formatGrade(prom)}
                        </span>
                        <motion.span
                          className="w-full rounded-t-lg opacity-90 transition-opacity group-hover:opacity-100"
                          style={{ background: `rgb(${accentRgb(s.color ?? 'gray')})` }}
                          initial={{ height: 0 }}
                          animate={{ height: `${Math.max(pct(prom), 3)}%` }}
                          transition={{ duration: 0.6, ease: [0.05, 0.7, 0.1, 1] }}
                        />
                      </button>
                    )
                  })}
                </div>
                <div className="mt-2 flex justify-around gap-2">
                  {barras.map(({ s }) => (
                    <span
                      key={s.id}
                      className="w-full max-w-[54px] truncate text-center text-[10px] font-semibold text-ink/40"
                    >
                      {s.name.split(' ')[0]}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* ============ TABLA: próximas actividades ============ */}
        <motion.div variants={dashItem} className="glass card-hover rounded-[26px] p-6">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-[17px] font-bold text-ink">Próximas actividades</h2>
            <button
              onClick={() => navigate({ name: 'calendario' })}
              className="text-[13px] font-semibold text-ink/40 transition-colors hover:text-ink/70"
            >
              Ver calendario
            </button>
          </div>

          {filas.length === 0 ? (
            <p className="py-10 text-center text-sm text-ink/40">
              Nada agendado en los próximos días
            </p>
          ) : (
            <div>
              {/* Encabezado */}
              <div className="grid grid-cols-[minmax(0,2fr)_120px_minmax(0,1fr)_110px_70px_110px] gap-2 border-b border-ink/5 px-2 pb-2 text-[11px] font-bold uppercase tracking-wide text-ink/35">
                <span>Actividad</span>
                <span>Tipo</span>
                <span>Ramo</span>
                <span>Fecha</span>
                <span>Hora</span>
                <span className="text-right">Estado</span>
              </div>
              {filas.map((a) => (
                <button
                  key={a.key}
                  onClick={a.onClick}
                  className="grid w-full grid-cols-[minmax(0,2fr)_120px_minmax(0,1fr)_110px_70px_110px] items-center gap-2 border-b border-ink/5 px-2 py-3 text-left transition-colors last:border-b-0 hover:bg-ink/[0.03]"
                >
                  <span className="truncate text-[14px] font-semibold text-ink">{a.title}</span>
                  <span>
                    <span
                      className="inline-block rounded-full px-2.5 py-1 text-[11.5px] font-bold"
                      style={{
                        background: `rgb(${a.tipoRgb} / 0.12)`,
                        color: `rgb(${a.tipoRgb})`,
                      }}
                    >
                      {a.tipo}
                    </span>
                  </span>
                  <span className="truncate text-[13px] text-ink/50">{a.ramo ?? '—'}</span>
                  <span className="text-[13px] font-semibold text-ink/60">{fechaLabel(a.date)}</span>
                  <span className="text-[13px] tabular-nums text-ink/50">{a.time ?? '—'}</span>
                  <span className="text-right">
                    <span
                      className={`inline-block rounded-full px-2.5 py-1 text-[11.5px] font-bold ${
                        a.estado === 'hoy'
                          ? 'bg-ink text-surface'
                          : a.estado === 'completada'
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                            : 'bg-ink/[0.06] text-ink/55'
                      }`}
                    >
                      {a.estado === 'hoy'
                        ? 'Hoy'
                        : a.estado === 'completada'
                          ? 'Completada'
                          : a.estado === 'pendiente'
                            ? 'Pendiente'
                            : 'Programado'}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </motion.div>
      </motion.div>

      <TaskEditor open={editorOpen} onClose={() => setEditorOpen(false)} task={editing} />
    </div>
  )
}

/** Tarjeta del promedio general (nota con decimales, no entero). */
function PromedioTile({ promedio, sub }: { promedio: number | null; sub: string }) {
  return (
    <div className="glass card-hover flex flex-col justify-between rounded-[22px] p-5">
      <p className="text-[12.5px] font-semibold text-ink/45">Promedio general</p>
      <div>
        <p className="text-[32px] font-black leading-tight tabular-nums text-ink">
          {promedio != null ? formatGrade(promedio) : '—'}
        </p>
        <p className="mt-0.5 truncate text-[12px] text-ink/40">{sub}</p>
      </div>
    </div>
  )
}

function MiniStat({
  label,
  n,
  sub,
  danger = false,
}: {
  label: string
  n: number
  sub: string
  danger?: boolean
}) {
  return (
    <div className="glass card-hover flex flex-col justify-between rounded-[22px] p-5">
      <p className="text-[12.5px] font-semibold text-ink/45">{label}</p>
      <div>
        <p
          className={`text-[32px] font-black tabular-nums leading-tight ${
            danger ? 'text-rose-500' : 'text-ink'
          }`}
        >
          <AnimatedNumber value={n} />
        </p>
        <p className="mt-0.5 truncate text-[12px] text-ink/40">{sub}</p>
      </div>
    </div>
  )
}
