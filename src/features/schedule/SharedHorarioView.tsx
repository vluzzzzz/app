import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import type { ClassBlock } from '../../lib/types'
import { DAY_NAMES, DAY_SHORT, MONTH_NAMES, classesForDay, weekday } from '../../lib/schedule'
import { accentRgb } from '../../lib/accents'
import { fetchSharedHorario, type SharedHorario } from '../../lib/share'
import { AgendaTimeline } from './AgendaTimeline'
import { MoonIcon, SunIcon } from '../../components/ui/Icons'

/**
 * Vista PÚBLICA del horario compartido (/horario/token o ?h=token):
 * solo lectura, sin login, y con la MISMA agenda que el Horario real
 * (tira de días con fechas + escala de horas a la izquierda).
 */
export function SharedHorarioView({ token }: { token: string }) {
  const [state, setState] = useState<'loading' | 'error' | 'ok'>('loading')
  const [data, setData] = useState<SharedHorario | null>(null)

  const now = new Date()
  const [selectedDay, setSelectedDay] = useState(weekday(now))

  // Tema propio del visitante: parte según su sistema y se recuerda en el equipo.
  const [dark, setDark] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('brody-shared-theme')
      if (saved) return saved === 'dark'
      return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
    } catch {
      return false
    }
  })
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    try {
      localStorage.setItem('brody-shared-theme', dark ? 'dark' : 'light')
    } catch {
      /* sin storage */
    }
  }, [dark])

  useEffect(() => {
    fetchSharedHorario(token).then((d) => {
      if (d) {
        setData(d)
        setState('ok')
        document.title = `Horario de ${d.nombre || 'Brody'}`
      } else {
        setState('error')
      }
    })
  }, [token])

  if (state === 'loading') {
    return (
      <div className="flex h-[100dvh] items-center justify-center">
        <img src="/logoapp.png" alt="Brody" className="h-16 w-16 animate-pulse rounded-2xl object-contain" />
      </div>
    )
  }

  if (state === 'error' || !data) {
    return (
      <div className="flex h-[100dvh] flex-col items-center justify-center gap-3 px-8 text-center">
        <img src="/logoapp.png" alt="Brody" className="h-14 w-14 rounded-2xl object-contain" />
        <h1 className="text-xl font-bold text-ink">Este link ya no está activo</h1>
        <p className="max-w-xs text-sm text-ink/55">
          Pídele a quien te lo compartió que lo genere de nuevo desde Brody.
        </p>
      </div>
    )
  }

  const ramo = (id: string) => data.ramos.find((r) => r.id === id)
  const subjectColor = (id: string) => `rgb(${accentRgb(ramo(id)?.color ?? 'gray')})`
  const subjectName = (id: string) => ramo(id)?.nombre ?? 'Clase'
  const dayClasses = classesForDay(data.horario as ClassBlock[], selectedDay)

  // Semana actual (lunes → domingo) para la tira de días, igual que el Horario.
  const dow = weekday(now)
  const monday = new Date(now)
  monday.setDate(now.getDate() - dow)
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
  const selectedDate = week[selectedDay]

  return (
    <div className="mx-auto h-full w-full max-w-md overflow-y-auto px-5 pb-16 pt-6">
      <header className="mb-6 flex items-end justify-between">
        <div>
          <p className="text-sm font-medium text-ink/50">Horario de</p>
          <h1 className="text-[34px] font-bold leading-tight text-ink">
            {data.nombre || 'Estudiante'}
          </h1>
        </div>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setDark((v) => !v)}
          className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ink/5 text-ink"
          aria-label={dark ? 'Tema claro' : 'Tema oscuro'}
        >
          {dark ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
        </motion.button>
      </header>

      {/* Tira de días — igual que el Horario */}
      <div className="glass mb-5 flex items-stretch justify-between gap-1 rounded-[26px] p-2">
        {week.map((d, i) => {
          const selected = i === selectedDay
          return (
            <button
              key={i}
              onClick={() => setSelectedDay(i)}
              className="relative flex flex-1 flex-col items-center justify-center gap-1 rounded-2xl py-2.5"
            >
              {selected && (
                <motion.span
                  layoutId="shared-daysel"
                  transition={{ type: 'spring', stiffness: 520, damping: 40 }}
                  className="absolute inset-0 rounded-2xl bg-ink"
                />
              )}
              <span
                className={`relative z-10 text-[12px] font-medium ${
                  selected ? 'text-surface/60' : 'text-ink/35'
                }`}
              >
                {DAY_SHORT[i]}
              </span>
              <span
                className={`relative z-10 tabular-nums ${
                  selected
                    ? 'text-[17px] font-bold text-surface'
                    : 'text-[16px] font-semibold text-ink/45'
                }`}
              >
                {d.getDate()}
              </span>
            </button>
          )
        })}
      </div>

      {/* Encabezado del día seleccionado */}
      <div className="mb-4 px-1">
        <h2 className="text-[19px] font-bold text-ink">
          {DAY_NAMES[selectedDay]} {selectedDate.getDate()}
          <span className="font-semibold text-ink/40"> de {MONTH_NAMES[selectedDate.getMonth()]}</span>
        </h2>
      </div>

      {dayClasses.length === 0 ? (
        <div className="glass rounded-3xl p-8 text-center">
          <p className="text-[15px] font-semibold text-ink">Sin clases este día</p>
        </div>
      ) : (
        <AgendaTimeline
          classes={dayClasses}
          subjectName={subjectName}
          subjectColor={subjectColor}
        />
      )}

      <a
        href="https://www.brrody.app"
        className="mt-8 block pb-4 text-center text-[12px] text-ink/35 active:opacity-70"
      >
        Hecho con <span className="font-semibold text-ink/50">Brody</span> · brrody.app
      </a>
    </div>
  )
}
