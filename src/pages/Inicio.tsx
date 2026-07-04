import { useState } from 'react'
import { motion } from 'framer-motion'
import type { Route } from '../App'
import { useAppStore } from '../store/useAppStore'
import { minGradeToPass } from '../lib/grades'
import { EASE } from '../lib/motion'
import { GlassCard } from '../components/ui/GlassCard'
import { BellIcon, ChevronRight, SettingsIcon } from '../components/ui/Icons'

const FRASES = [
  'Tú puedes con todo hoy.',
  'Un paso a la vez, se puede.',
  'Enfócate en lo que puedes controlar.',
  'Hoy es un buen día para avanzar.',
  'Constancia > perfección.',
]

export function Inicio({ navigate }: { navigate: (r: Route) => void }) {
  const subjects = useAppStore((s) => s.subjects)

  const now = new Date()
  const h = now.getHours()
  const saludo =
    h < 12 ? 'Buenos días' : h < 20 ? 'Buenas tardes' : 'Buenas noches'
  const frase = FRASES[now.getDate() % FRASES.length]

  let aprobados = 0
  let enRiesgo = 0
  subjects.forEach((s) => {
    const st = minGradeToPass(s).status
    if (st === 'ASEGURADO') aprobados++
    else if (st === 'IMPOSIBLE') enRiesgo++
  })

  return (
    <div className="min-h-screen px-5 pb-32 pt-6">
      {/* Header */}
      <header className="mb-5 flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-ink/55">{saludo}, 👋</p>
          <h1 className="mt-0.5 max-w-[16ch] text-[30px] font-bold leading-[1.1] text-ink">
            {frase}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <motion.button
            whileTap={{ scale: 0.9 }}
            className="glass glass-highlight relative rounded-2xl p-2.5 text-ink/70"
          >
            <BellIcon className="h-5 w-5" />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate({ name: 'settings' })}
            className="glass glass-highlight rounded-2xl p-2.5 text-ink/70"
          >
            <SettingsIcon className="h-5 w-5" />
          </motion.button>
        </div>
      </header>

      {/* Mascota */}
      <Mascota />

      {/* Resumen real */}
      <GlassCard className="mb-4 p-5">
        <p className="mb-3 text-sm font-semibold text-ink/60">Tu semestre</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <Stat n={subjects.length} label="Ramos" tone="ink" />
          <Stat n={aprobados} label="Aprobados" tone="good" />
          <Stat n={enRiesgo} label="En riesgo" tone="bad" />
        </div>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate({ name: 'calculadora' })}
          className="mt-4 flex w-full items-center justify-between rounded-2xl bg-ink/5 px-4 py-3 text-left"
        >
          <span className="text-sm font-medium text-ink">
            Ir a la calculadora
          </span>
          <ChevronRight className="h-5 w-5 text-ink/40" />
        </motion.button>
      </GlassCard>

      {/* Próximamente */}
      <div className="grid grid-cols-2 gap-3">
        <Soon
          emoji="🗓️"
          title="Horario"
          text="Tus clases de la semana"
          onClick={() => navigate({ name: 'horario' })}
        />
        <Soon
          emoji="📅"
          title="Calendario"
          text="Pruebas y entregas"
          onClick={() => navigate({ name: 'calendario' })}
        />
      </div>
    </div>
  )
}

function Mascota() {
  const [ok, setOk] = useState(true)
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
      animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
      transition={{ duration: 0.6, ease: EASE.overshoot }}
      className="mb-5 flex items-center justify-center"
    >
      {ok ? (
        // El usuario puede dejar su ilustración en public/mascot.png
        <img
          src="/mascot.png"
          alt="Mascota"
          onError={() => setOk(false)}
          className="h-40 w-40 object-contain drop-shadow-xl"
        />
      ) : (
        <div className="flex h-40 w-40 flex-col items-center justify-center rounded-[2.5rem] bg-gradient-to-br from-violet-400/30 to-pink-400/30 backdrop-blur-sm">
          <div className="text-6xl">🐥</div>
          <p className="mt-1 text-[11px] font-medium text-ink/40">tu mascota</p>
        </div>
      )}
    </motion.div>
  )
}

function Stat({
  n,
  label,
  tone,
}: {
  n: number
  label: string
  tone: 'ink' | 'good' | 'bad'
}) {
  const color =
    tone === 'good'
      ? 'text-emerald-600 dark:text-emerald-300'
      : tone === 'bad'
        ? 'text-rose-500 dark:text-rose-300'
        : 'text-ink'
  return (
    <div className="rounded-2xl bg-ink/5 py-3">
      <div className={`text-3xl font-black tabular-nums ${color}`}>{n}</div>
      <div className="text-[11px] font-medium text-ink/50">{label}</div>
    </div>
  )
}

function Soon({
  emoji,
  title,
  text,
  onClick,
}: {
  emoji: string
  title: string
  text: string
  onClick: () => void
}) {
  return (
    <GlassCard interactive onClick={onClick} className="cursor-pointer p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-2xl">{emoji}</span>
        <span className="rounded-full bg-ink/10 px-2 py-0.5 text-[10px] font-semibold text-ink/50">
          pronto
        </span>
      </div>
      <p className="font-semibold text-ink">{title}</p>
      <p className="text-xs text-ink/50">{text}</p>
    </GlassCard>
  )
}
