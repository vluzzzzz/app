import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useAppStore } from '../store/useAppStore'
import type { ClassBlock } from '../lib/types'
import {
  CLASS_TYPE_LABEL,
  DAY_NAMES,
  DAY_SHORT,
  classesForDay,
  nextClassToday,
  weekday,
} from '../lib/schedule'
import { accentRgb } from '../lib/accents'
import { ClassSheet } from '../features/schedule/ClassSheet'
import { ClockIcon, PlusIcon } from '../components/ui/Icons'

/** Tarjeta de una clase: línea lateral con el color del ramo. */
function ClassCard({ block, onOpen }: { block: ClassBlock; onOpen: () => void }) {
  const subject = useAppStore((s) => s.subjects.find((x) => x.id === block.subjectId))
  const color = `rgb(${accentRgb(subject?.color ?? 'gray')})`
  return (
    <motion.button
      whileTap={{ scale: 0.985 }}
      onClick={onOpen}
      className="glass relative w-full overflow-hidden rounded-2xl p-4 pl-5 text-left"
    >
      <span className="absolute inset-y-0 left-0 w-1.5" style={{ background: color }} />
      <div className="flex items-center justify-between gap-2">
        <h3 className="truncate text-[16px] font-bold text-ink">
          {subject?.name ?? 'Ramo eliminado'}
        </h3>
        <span className="shrink-0 text-[13px] font-medium text-ink/45">
          {CLASS_TYPE_LABEL[block.type]}
        </span>
      </div>
      <p className="mt-0.5 text-sm tabular-nums text-ink/60">
        {block.start} — {block.end}
      </p>
      {(block.room || block.professor) && (
        <p className="mt-0.5 truncate text-[13px] text-ink/45">
          {[block.room && `Sala ${block.room}`, block.professor].filter(Boolean).join(' · ')}
        </p>
      )}
    </motion.button>
  )
}

export function Horario() {
  const classes = useAppStore((s) => s.classes)
  const subjects = useAppStore((s) => s.subjects)

  const now = new Date()
  const [selectedDay, setSelectedDay] = useState(weekday(now))
  const [weekView, setWeekView] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<ClassBlock | null>(null)

  // Refresca "próxima clase" cada 30s.
  const [, setTick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 30_000)
    return () => clearInterval(t)
  }, [])

  // Semana actual (lunes → domingo) para la tira de días.
  const dow = weekday(now)
  const monday = new Date(now)
  monday.setDate(now.getDate() - dow)
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })

  const dayClasses = classesForDay(classes, selectedDay)
  const next = selectedDay === dow ? nextClassToday(classes, now) : null
  const nextSubject = next ? subjects.find((s) => s.id === next.block.subjectId) : null

  const openNew = () => {
    setEditing(null)
    setSheetOpen(true)
  }
  const openEdit = (b: ClassBlock) => {
    setEditing(b)
    setSheetOpen(true)
  }

  return (
    <div className="h-full overflow-y-auto px-5 pb-36 pt-6">
      <header className="mb-5 flex items-end justify-between">
        <div>
          <p className="text-sm font-medium text-ink/50">Tus clases</p>
          <h1 className="text-[34px] font-bold leading-tight text-ink">Horario</h1>
        </div>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={openNew}
          className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ink text-surface"
          aria-label="Agregar clase"
        >
          <PlusIcon className="h-6 w-6" />
        </motion.button>
      </header>

      {/* Tira de días (misma estética que la Home) */}
      <div className="glass mb-4 flex items-stretch justify-between gap-1 rounded-[26px] p-2">
        {week.map((d, i) => {
          const selected = i === selectedDay
          return (
            <button
              key={i}
              onClick={() => {
                setSelectedDay(i)
                setWeekView(false)
              }}
              className={`flex flex-1 flex-col items-center justify-center gap-1 rounded-2xl py-2.5 ${
                selected ? 'bg-ink/[0.07]' : ''
              }`}
            >
              <span className={`text-[12px] font-medium ${selected ? 'text-ink/45' : 'text-ink/35'}`}>
                {DAY_SHORT[i]}
              </span>
              <span
                className={`tabular-nums ${
                  selected ? 'text-[17px] font-bold text-ink' : 'text-[16px] font-semibold text-ink/45'
                }`}
              >
                {d.getDate()}
              </span>
            </button>
          )
        })}
      </div>

      {/* Próxima clase (solo hoy) */}
      {next && nextSubject && !weekView && (
        <div className="glass relative mb-4 overflow-hidden rounded-2xl p-4 pl-5">
          <span
            className="absolute inset-y-0 left-0 w-1.5"
            style={{ background: `rgb(${accentRgb(nextSubject.color ?? 'gray')})` }}
          />
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-ink/50">
              {next.status === 'now' ? 'Ahora' : 'Próxima clase'}
            </p>
            {next.status === 'next' && (
              <span className="text-sm font-semibold text-ink/60">
                {next.minutesTo < 60
                  ? `En ${next.minutesTo} min`
                  : `A las ${next.block.start}`}
              </span>
            )}
          </div>
          <h3 className="mt-0.5 text-[18px] font-bold text-ink">{nextSubject.name}</h3>
          <p className="text-sm tabular-nums text-ink/60">
            {next.block.start} — {next.block.end}
            {next.block.room ? ` · Sala ${next.block.room}` : ''}
          </p>
        </div>
      )}

      {classes.length === 0 ? (
        /* Estado vacío */
        <div className="glass mt-6 rounded-4xl p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-ink/5 text-ink">
            <ClockIcon className="h-7 w-7" />
          </div>
          <h2 className="mb-1 text-xl font-semibold text-ink">Tu horario está vacío</h2>
          <p className="mb-6 text-sm text-ink/55">
            Agrega tus clases y tenlas siempre a mano.
          </p>
          <button
            onClick={openNew}
            className="inline-flex items-center gap-2 rounded-3xl bg-ink px-5 py-3 font-semibold text-surface"
          >
            <PlusIcon className="h-5 w-5" /> Agregar clase
          </button>
        </div>
      ) : weekView ? (
        /* Vista semanal: lista compacta por día */
        <div className="space-y-4">
          {DAY_NAMES.map((name, i) => {
            const list = classesForDay(classes, i)
            if (list.length === 0 && i >= 5) return null // finde sin clases: no ocupa espacio
            return (
              <div key={name}>
                <p className="mb-1.5 px-1 text-sm font-bold text-ink/70">{name}</p>
                {list.length === 0 ? (
                  <p className="px-1 text-[13px] text-ink/40">Sin clases</p>
                ) : (
                  <div className="space-y-2">
                    {list.map((b) => (
                      <ClassCard key={b.id} block={b} onOpen={() => openEdit(b)} />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <>
          <div className="mb-3 flex items-center justify-between px-1">
            <h2 className="text-[17px] font-bold text-ink/70">
              {DAY_NAMES[selectedDay]} {week[selectedDay].getDate()}
            </h2>
            <button
              onClick={() => setWeekView(true)}
              className="text-sm font-semibold text-ink/50 active:text-ink/70"
            >
              Ver semana
            </button>
          </div>

          {dayClasses.length === 0 ? (
            <p className="px-1 py-6 text-center text-sm text-ink/45">
              Sin clases este día.
            </p>
          ) : (
            <div className="space-y-2.5">
              {dayClasses.map((b) => (
                <ClassCard key={b.id} block={b} onOpen={() => openEdit(b)} />
              ))}
            </div>
          )}
        </>
      )}

      <ClassSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        block={editing}
        defaultDay={selectedDay}
      />
    </div>
  )
}
