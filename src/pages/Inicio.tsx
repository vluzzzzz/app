import { useState } from 'react'
import type { Route } from '../App'
import { AnimatedNumber } from '../components/ui/AnimatedNumber'
import { AiBar } from '../features/chat/AiBar'
import { BellIcon, ClockIcon } from '../components/ui/Icons'

const FRASES = [
  'Tú puedes\ncon todo hoy.',
  'Un paso\na la vez.',
  'Enfócate en lo\nque controlas.',
  'Hoy es buen día\npara avanzar.',
]

const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

// Datos placeholder por período (mientras no exista Horario/Calendario).
const PERIODOS = [
  { label: 'HOY TIENES', clases: 2, examenes: 1, tareas: 3 },
  { label: 'ESTA SEMANA TIENES', clases: 9, examenes: 2, tareas: 7 },
  { label: 'ESTE MES TIENES', clases: 36, examenes: 5, tareas: 20 },
]

export function Inicio({ navigate }: { navigate: (r: Route) => void }) {
  const now = new Date()
  const h = now.getHours()
  const saludo =
    h < 12 ? 'Buenos días' : h < 20 ? 'Buenas tardes' : 'Buenas noches'
  const frase = FRASES[now.getDate() % FRASES.length]

  // Semana actual (lunes → domingo) con el día de hoy resaltado.
  const dow = (now.getDay() + 6) % 7
  const monday = new Date(now)
  monday.setDate(now.getDate() - dow)
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })

  const [periodo, setPeriodo] = useState(0)
  const [logoOk, setLogoOk] = useState(true)
  const p = PERIODOS[periodo]

  return (
    <div className="flex h-full flex-col overflow-hidden px-5 pb-28 pt-4">
      {/* Top: racha + campana */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-1.5 rounded-full bg-ink/5 px-3 py-1.5">
          <span className="text-base leading-none">🔥</span>
          <span className="text-sm font-bold tabular-nums text-ink">7</span>
        </div>
        <button className="glass glass-highlight relative rounded-full p-2.5 text-ink/70">
          <BellIcon className="h-5 w-5" />
          <span
            className="absolute right-2 top-2 h-2 w-2 rounded-full"
            style={{ background: 'rgb(var(--accent))' }}
          />
        </button>
      </div>

      {/* Saludo */}
      <div className="mb-4">
        <p className="text-sm font-medium text-ink/55">{saludo}, 👋</p>
        <h1 className="mt-1 whitespace-pre-line text-[34px] font-bold leading-[1.05] text-ink">
          {frase}
        </h1>
      </div>

      {/* Tira de días */}
      <div className="glass glass-highlight mb-2 rounded-3xl px-2 py-3">
        <div className="flex items-stretch justify-between">
          {week.map((d, i) => {
            const isToday = d.toDateString() === now.toDateString()
            return (
              <div
                key={i}
                className={`flex flex-1 flex-col items-center gap-1 rounded-2xl py-1.5 ${
                  isToday ? 'text-surface' : 'text-ink/60'
                }`}
                style={
                  isToday ? { background: 'rgb(var(--accent))' } : undefined
                }
              >
                <span className="text-[11px] font-medium">{DIAS[i]}</span>
                <span className="text-[15px] font-bold tabular-nums">
                  {d.getDate()}
                </span>
              </div>
            )
          })}
        </div>
      </div>
      {/* Espacio central: barra que abre el chat con IA */}
      <AiBar onOpen={() => navigate({ name: 'chat' })} />

      {/* Próxima clase */}
      <div className="glass glass-highlight mb-3 flex items-center gap-3 rounded-4xl p-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-ink/50">Próxima clase</p>
          <div className="mt-0.5 flex items-center gap-2">
            <h3 className="text-xl font-bold text-ink">Cálculo I</h3>
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: 'rgb(var(--accent))' }}
            />
          </div>
          <p className="mt-0.5 text-sm text-ink/60">10:30 AM • Aula 204</p>
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-ink/10 px-3 py-1.5">
            <ClockIcon className="h-4 w-4 text-ink/70" />
            <span className="text-sm font-semibold text-ink">En 45 min</span>
          </div>
        </div>
        {logoOk ? (
          <img
            src="/logosombra.png"
            alt="Próxima clase"
            onError={() => setLogoOk(false)}
            className="-my-1 h-28 w-28 shrink-0 object-contain drop-shadow-lg"
          />
        ) : (
          <div className="text-6xl">⏰</div>
        )}
      </div>

      {/* Hoy tienes (ciclable + números animados) */}
      <button
        onClick={() => setPeriodo((v) => (v + 1) % PERIODOS.length)}
        className="glass glass-highlight w-full rounded-4xl p-4 text-left"
      >
        <p className="mb-2 text-sm font-semibold tracking-wide text-ink/60">
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
