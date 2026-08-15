import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import type { Route } from '../App'
import type { Task } from '../lib/types'
import { useAppStore } from '../store/useAppStore'
import { accentGhost, accentRgb } from '../lib/accents'
import { avatarSrc } from '../lib/avatars'
import { currentGrade, minGradeToPass, realEvaluationCount } from '../lib/grades'
import { formatGrade } from '../lib/format'
import {
  DAY_NAMES,
  MONTH_NAMES,
  classesForDay,
  eventsOn,
  nextClassToday,
  toDateKey,
  weekday,
} from '../lib/schedule'
import { TaskEditor } from '../features/tasks/TaskEditor'
import {
  BellIcon,
  CalendarIcon,
  CheckIcon,
  ChevronRight,
  ClockIcon,
  PlusIcon,
} from '../components/ui/Icons'

/**
 * Home del modo PC: dashboard real (no el celular ensanchado).
 * Fila 1: "Hoy" (conteos del día) + "Próxima clase" (con el monito).
 * Fila 2: "Tus tareas" + "Tus ramos" lado a lado.
 * La Home del celular vive intacta en Inicio.tsx.
 */
export function InicioDesktop({ navigate }: { navigate: (r: Route) => void }) {
  const userName = useAppStore((s) => s.userName)
  const avatar = useAppStore((s) => s.avatar)
  const subjects = useAppStore((s) => s.subjects)
  const tasks = useAppStore((s) => s.tasks)
  const events = useAppStore((s) => s.events)
  const classes = useAppStore((s) => s.classes)
  const toggleTask = useAppStore((s) => s.toggleTask)
  const accent = useAppStore((s) => s.accent)
  const theme = useAppStore((s) => s.theme)

  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<Task | null>(null)

  // Refresca "próxima clase" y la línea del tiempo cada 30s.
  const [, setTick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 30_000)
    return () => clearInterval(t)
  }, [])

  const now = new Date()
  const todayKey = toDateKey(now)
  const clasesHoy = classesForDay(classes, weekday(now))
  const tareasPend = tasks.filter((t) => !t.done)
  const evalsHoy = eventsOn(events, todayKey).filter((e) => e.type === 'evaluacion')
  const next = nextClassToday(classes, now)
  const nextSubject = next ? subjects.find((s) => s.id === next.block.subjectId) : null

  const minsLabel = (m: number) =>
    m >= 60 ? `En ${Math.floor(m / 60)} h ${m % 60 ? `${m % 60} min` : ''}`.trim() : `En ${m} min`

  return (
    <div className="h-full overflow-y-auto px-10 pb-10 pt-8">
      <div className="mx-auto max-w-5xl">
        {/* Hero */}
        <header className="mb-7 flex items-center justify-between">
          <div>
            <h1 className="text-[30px] font-bold leading-tight text-ink">
              ¡Hola, {userName || 'Estudiante'}!
            </h1>
            <p className="mt-0.5 text-[15px] text-ink/50">Aquí tienes un resumen de tu día.</p>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => navigate({ name: 'calendario' })}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-ink/10 bg-ink/[0.02] text-ink/60 hover:bg-ink/5"
              aria-label="Calendario"
            >
              <CalendarIcon className="h-5 w-5" />
            </button>
            <button
              className="flex h-11 w-11 items-center justify-center rounded-full border border-ink/10 bg-ink/[0.02] text-ink/60 hover:bg-ink/5"
              aria-label="Notificaciones"
            >
              <BellIcon className="h-5 w-5" />
            </button>
            <button
              onClick={() => navigate({ name: 'profile' })}
              className="card-hover flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-white shadow-[var(--card-shadow)] ring-1 ring-ink/5"
              aria-label="Perfil"
            >
              <img src={avatarSrc(avatar || 'happy')} alt="" className="h-full w-full object-contain" />
            </button>
          </div>
        </header>

        {/* Fila 1: Hoy + Próxima clase */}
        <div className="grid grid-cols-[minmax(0,1fr)_380px] gap-5">
          <div className="glass rounded-[26px] p-6">
            <p className="text-[13px] font-semibold uppercase tracking-wide text-ink/40">Hoy es</p>
            <h2 className="mt-1 text-[26px] font-bold text-ink">
              {DAY_NAMES[weekday(now)]} {now.getDate()}
              <span className="font-semibold text-ink/40"> de {MONTH_NAMES[now.getMonth()]}</span>
            </h2>
            <div className="mt-5 flex items-center gap-8">
              <Stat
                icon={<ClockIcon className="h-4.5 w-4.5" />}
                n={clasesHoy.length}
                label={clasesHoy.length === 1 ? 'Clase' : 'Clases'}
              />
              <span className="h-9 w-px bg-ink/10" />
              <Stat
                icon={<CheckIcon className="h-4.5 w-4.5" />}
                n={tareasPend.length}
                label={tareasPend.length === 1 ? 'Tarea' : 'Tareas'}
              />
              <span className="h-9 w-px bg-ink/10" />
              <Stat
                icon={<CalendarIcon className="h-4.5 w-4.5" />}
                n={evalsHoy.length}
                label={evalsHoy.length === 1 ? 'Evaluación' : 'Evaluaciones'}
              />
            </div>
          </div>

          <div className="glass relative overflow-hidden rounded-[26px] p-6">
            <p className="text-[13px] font-semibold uppercase tracking-wide text-ink/40">
              <ClockIcon className="mr-1.5 inline h-3.5 w-3.5 align-[-2px]" />
              Próxima clase
            </p>
            {next && nextSubject ? (
              <>
                <h3 className="mt-1.5 line-clamp-2 pr-16 text-[19px] font-bold leading-snug text-ink">
                  {nextSubject.name}
                </h3>
                <p className="mt-1 text-[14px] tabular-nums text-ink/55">
                  {next.block.start} — {next.block.end}
                  {next.block.room ? ` · ${next.block.room}` : ''}
                </p>
                <span
                  className={`mt-3 inline-block rounded-full px-3 py-1 text-[12.5px] font-bold ${
                    next.status === 'now'
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                      : 'bg-ink text-surface'
                  }`}
                >
                  {next.status === 'now' ? 'Ahora mismo' : minsLabel(next.minutesTo)}
                </span>
              </>
            ) : (
              <>
                <h3 className="mt-1.5 text-[19px] font-bold text-ink">Nada más por hoy</h3>
                <p className="mt-1 text-[14px] text-ink/55">
                  {clasesHoy.length ? 'Ya cumpliste con tus clases.' : 'Día libre de clases.'}
                </p>
              </>
            )}
            <img
              src={accentGhost(accent, theme === 'dark')}
              alt=""
              className="pointer-events-none absolute -right-2 bottom-0 h-20 w-20 object-contain opacity-90"
            />
          </div>
        </div>

        {/* Fila 2: Tareas + Ramos */}
        <div className="mt-5 grid grid-cols-2 gap-5">
          {/* Tus tareas */}
          <div className="glass rounded-[26px] p-6">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="text-[17px] font-bold text-ink">Tus tareas</h2>
              {tareasPend.length > 0 && (
                <span className="text-[13px] font-semibold text-ink/40">
                  {tareasPend.length} pendiente{tareasPend.length === 1 ? '' : 's'}
                </span>
              )}
            </div>
            <div className="space-y-1.5">
              {tasks.length === 0 && (
                <p className="py-4 text-center text-sm text-ink/40">Sin tareas pendientes</p>
              )}
              {tasks.slice(0, 7).map((t) => (
                <div
                  key={t.id}
                  className="group flex items-center gap-3 rounded-2xl px-2 py-2 transition-colors hover:bg-ink/[0.04]"
                >
                  <button
                    onClick={() => toggleTask(t.id)}
                    aria-label={t.done ? 'Marcar pendiente' : 'Completar'}
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                      t.done
                        ? 'border-emerald-500 bg-emerald-500 text-white'
                        : 'border-ink/25 text-transparent hover:border-ink/50'
                    }`}
                  >
                    <CheckIcon className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      setEditing(t)
                      setEditorOpen(true)
                    }}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p
                      className={`truncate text-[14.5px] font-semibold text-ink ${
                        t.done ? 'line-through opacity-50' : ''
                      }`}
                    >
                      {t.title}
                    </p>
                  </button>
                  {t.date && (
                    <span className="shrink-0 rounded-lg bg-ink/5 px-2 py-1 text-[12px] font-semibold tabular-nums text-ink/50">
                      {Number(t.date.slice(8, 10))} {MONTH_NAMES[Number(t.date.slice(5, 7)) - 1]?.slice(0, 3).toLowerCase()}
                    </span>
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={() => {
                setEditing(null)
                setEditorOpen(true)
              }}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-ink/15 py-3 text-[14px] font-semibold text-ink/55 transition-colors hover:border-ink/30 hover:text-ink/80"
            >
              <PlusIcon className="h-4 w-4" /> Agregar tarea
            </button>
          </div>

          {/* Tus ramos */}
          <div className="glass rounded-[26px] p-6">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="text-[17px] font-bold text-ink">Tus ramos</h2>
              <button
                onClick={() => navigate({ name: 'calculadora' })}
                className="text-[13px] font-semibold text-ink/40 hover:text-ink/70"
              >
                Ver todos
              </button>
            </div>
            <div className="space-y-1.5">
              {subjects.length === 0 && (
                <button
                  onClick={() => navigate({ name: 'calculadora', add: true })}
                  className="w-full py-4 text-center text-sm font-semibold text-ink/40 hover:text-ink/70"
                >
                  + Agrega tu primer ramo
                </button>
              )}
              {subjects.slice(0, 7).map((s) => {
                const prom = currentGrade(s)
                const res = minGradeToPass(s)
                const tone =
                  res.status === 'ASEGURADO'
                    ? 'text-emerald-600 dark:text-emerald-300'
                    : res.status === 'IMPOSIBLE'
                      ? 'text-rose-500'
                      : 'text-ink'
                return (
                  <motion.button
                    key={s.id}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => navigate({ name: 'subject', id: s.id })}
                    className="group flex w-full items-center gap-3 rounded-2xl px-2 py-2.5 text-left transition-colors hover:bg-ink/[0.04]"
                  >
                    <span
                      className="h-8 w-[3.5px] shrink-0 rounded-full"
                      style={{ background: `rgb(${accentRgb(s.color ?? 'gray')})` }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14.5px] font-semibold text-ink">{s.name}</p>
                      <p className="text-[12px] text-ink/40">
                        {realEvaluationCount(s)} evaluaciones
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[11px] font-medium text-ink/35">Promedio</p>
                      <p className={`text-[19px] font-black leading-tight tabular-nums ${tone}`}>
                        {formatGrade(prom)}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-ink/25 transition-transform group-hover:translate-x-0.5" />
                  </motion.button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      <TaskEditor open={editorOpen} onClose={() => setEditorOpen(false)} task={editing} />
    </div>
  )
}

function Stat({ icon, n, label }: { icon: React.ReactNode; n: number; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink/5 text-ink/60">
        {icon}
      </span>
      <div>
        <p className="text-[22px] font-black tabular-nums leading-tight text-ink">{n}</p>
        <p className="text-[12.5px] font-medium text-ink/45">{label}</p>
      </div>
    </div>
  )
}
