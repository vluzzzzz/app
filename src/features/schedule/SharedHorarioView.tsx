import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import type { ClassBlock } from '../../lib/types'
import {
  CLASS_TYPE_LABEL,
  DAY_NAMES,
  DAY_SHORT,
  classesForDay,
  weekday,
} from '../../lib/schedule'
import { accentRgb } from '../../lib/accents'
import { fetchSharedHorario, type SharedHorario } from '../../lib/share'

/** "13:05" → "1:05 PM". */
function to12h(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number)
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
}

/**
 * Vista PÚBLICA del horario compartido (?h=token): solo lectura, sin login.
 * La abre la familia/amigos en cualquier navegador.
 */
export function SharedHorarioView({ token }: { token: string }) {
  const [state, setState] = useState<'loading' | 'error' | 'ok'>('loading')
  const [data, setData] = useState<SharedHorario | null>(null)
  const [day, setDay] = useState(weekday(new Date()))

  useEffect(() => {
    fetchSharedHorario(token).then((d) => {
      if (d) {
        setData(d)
        setState('ok')
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
  const color = (id: string) => `rgb(${accentRgb(ramo(id)?.color ?? 'gray')})`
  const dayClasses = classesForDay(data.horario as ClassBlock[], day)

  return (
    <div className="mx-auto h-full w-full max-w-md overflow-y-auto px-5 pb-16 pt-6">
      <header className="mb-5">
        <p className="text-sm font-medium text-ink/50">Horario de</p>
        <h1 className="text-[30px] font-bold leading-tight text-ink">
          {data.nombre || 'Estudiante'}
        </h1>
      </header>

      {/* Tira de días */}
      <div className="glass mb-5 flex items-stretch justify-between gap-1 rounded-[26px] p-2">
        {DAY_SHORT.map((d, i) => {
          const selected = i === day
          return (
            <button
              key={d}
              onClick={() => setDay(i)}
              className="relative flex flex-1 flex-col items-center justify-center rounded-2xl py-2.5"
            >
              {selected && (
                <motion.span
                  layoutId="shared-daysel"
                  transition={{ type: 'spring', stiffness: 520, damping: 40 }}
                  className="absolute inset-0 rounded-2xl bg-ink"
                />
              )}
              <span
                className={`relative z-10 text-[13px] font-semibold ${
                  selected ? 'text-surface' : 'text-ink/45'
                }`}
              >
                {d}
              </span>
            </button>
          )
        })}
      </div>

      <h2 className="mb-3 px-1 text-[17px] font-bold text-ink/70">{DAY_NAMES[day]}</h2>

      {dayClasses.length === 0 ? (
        <div className="glass rounded-3xl p-8 text-center">
          <p className="text-[15px] font-semibold text-ink">Sin clases este día</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {dayClasses.map((b, i) => (
            <motion.div
              key={b.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i, 8) * 0.04 }}
              className="glass rounded-[20px] p-3.5"
            >
              <div className="flex gap-2.5">
                <span
                  className="w-[3px] shrink-0 self-stretch rounded-full"
                  style={{ background: color(b.subjectId) }}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="break-words text-[15px] font-bold leading-snug text-ink">
                      {ramo(b.subjectId)?.nombre ?? 'Clase'}
                    </h3>
                    <span className="shrink-0 text-[12px] font-medium text-ink/40">
                      {CLASS_TYPE_LABEL[b.type]}
                    </span>
                  </div>
                  <div className="mt-2 rounded-xl bg-ink/[0.05] px-3.5 py-3">
                    <p className="text-[14px] font-semibold tabular-nums text-ink/70">
                      {to12h(b.start)} — {to12h(b.end)}
                    </p>
                    {(b.room || b.professor) && (
                      <p className="mt-1 break-words text-[13px] text-ink/45">
                        {[b.room, b.professor].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <p className="mt-8 text-center text-[12px] text-ink/35">
        Hecho con <span className="font-semibold text-ink/50">Brody</span> · brrody.app
      </p>
    </div>
  )
}
