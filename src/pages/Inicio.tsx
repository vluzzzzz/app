import { useState } from 'react'
import type { Route } from '../App'
import { useAppStore } from '../store/useAppStore'
import { currentGrade } from '../lib/grades'
import { AnimatedNumber } from '../components/ui/AnimatedNumber'
import { AiBar } from '../features/chat/AiBar'
import { BellIcon } from '../components/ui/Icons'

const DIAS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

// Placeholder por período (mientras no exista Horario/Calendario).
const PERIODOS = [
  { label: 'HOY TIENES', clases: 2, examenes: 1, tareas: 3 },
  { label: 'ESTA SEMANA TIENES', clases: 9, examenes: 2, tareas: 7 },
  { label: 'ESTE MES TIENES', clases: 36, examenes: 5, tareas: 20 },
]

export function Inicio({ navigate }: { navigate: (r: Route) => void }) {
  const userName = useAppStore((s) => s.userName)
  const subjects = useAppStore((s) => s.subjects)
  const now = new Date()
  const h = now.getHours()
  const saludo =
    h < 12 ? 'Buenos días' : h < 20 ? 'Buenas tardes' : 'Buenas noches'

  // Semana actual (lunes → domingo) con hoy resaltado.
  const dow = (now.getDay() + 6) % 7
  const monday = new Date(now)
  monday.setDate(now.getDate() - dow)
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })

  // Mini-gráfico de rendimiento: una barra por ramo (nota normalizada a su escala).
  const bars = subjects.slice(0, 8).map((s) => {
    const g = currentGrade(s)
    if (g == null) return { pct: 10, muted: true }
    const range = s.scale.max - s.scale.min || 1
    const pct = Math.max(8, Math.min(100, ((g - s.scale.min) / range) * 100))
    return { pct, muted: false }
  })

  const [periodo, setPeriodo] = useState(0)
  const p = PERIODOS[periodo]

  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto px-5 pb-28 pt-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink/45">{saludo} 👋</p>
          <h1 className="truncate text-3xl font-bold text-ink">
            {userName || 'Hola'}
          </h1>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-full bg-ink/5 px-3 py-2">
            <span className="text-sm leading-none">🔥</span>
            <span className="text-sm font-bold tabular-nums text-ink">7</span>
          </div>
          <button className="glass relative rounded-full p-2.5 text-ink/70">
            <BellIcon className="h-5 w-5" />
            <span
              className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full"
              style={{ background: 'rgb(var(--accent))' }}
            />
          </button>
        </div>
      </div>

      {/* Barra de Brody */}
      <AiBar onOpen={() => navigate({ name: 'chat' })} />

      {/* Tarjeta de rendimiento */}
      <div className="glass rounded-4xl p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-ink/50">Tu rendimiento</p>
            <h3 className="text-xl font-bold text-ink">
              {subjects.length} {subjects.length === 1 ? 'ramo' : 'ramos'}
            </h3>
          </div>
          <button
            onClick={() => navigate({ name: 'calculadora' })}
            className="rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-surface active:opacity-80"
          >
            Ver ramos →
          </button>
        </div>

        {bars.length > 0 ? (
          <div className="mt-5 flex h-20 items-end gap-2">
            {bars.map((b, i) => (
              <div key={i} className="flex-1">
                <div
                  className="w-full rounded-md"
                  style={{
                    height: `${b.pct}%`,
                    minHeight: 6,
                    background: b.muted ? 'rgb(var(--ink) / 0.1)' : 'rgb(var(--accent))',
                  }}
                />
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-ink/45">
            Aún no tienes ramos. Toca “Ver ramos” para crear el primero. 📚
          </p>
        )}
      </div>

      {/* Tira de la semana */}
      <div className="flex items-center justify-between px-1">
        {week.map((d, i) => {
          const isToday = d.toDateString() === now.toDateString()
          return (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <span className="text-[11px] font-medium text-ink/40">{DIAS[i]}</span>
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold tabular-nums ${
                  isToday ? 'text-surface' : 'text-ink/70'
                }`}
                style={isToday ? { background: 'rgb(var(--accent))' } : undefined}
              >
                {d.getDate()}
              </span>
            </div>
          )
        })}
      </div>

      {/* Hoy tienes */}
      <button
        onClick={() => setPeriodo((v) => (v + 1) % PERIODOS.length)}
        className="glass w-full rounded-4xl p-5 text-left"
      >
        <p className="mb-3 text-sm font-semibold tracking-wide text-ink/55">
          {p.label}
        </p>
        <div className="grid grid-cols-3 divide-x divide-ink/10">
          <Stat n={p.clases} label="Clases" />
          <Stat n={p.examenes} label="Examen" />
          <Stat n={p.tareas} label="Tareas" />
        </div>
      </button>
    </div>
  )
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div className="px-2 text-center">
      <AnimatedNumber
        value={n}
        className="block text-3xl font-black tabular-nums text-ink"
      />
      <span className="text-xs font-medium text-ink/50">{label}</span>
    </div>
  )
}
