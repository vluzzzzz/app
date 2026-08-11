import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useAppStore } from '../store/useAppStore'
import type { ClassBlock } from '../lib/types'
import {
  CLASS_TYPE_LABEL,
  DAY_NAMES,
  DAY_SHORT,
  MONTH_NAMES,
  classesForDay,
  nextClassToday,
  toMinutes,
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
      className="glass relative w-full overflow-hidden rounded-[20px] p-4 pl-5 text-left"
    >
      <span
        className="absolute inset-y-2 left-0 w-1 rounded-r-full"
        style={{ background: color }}
      />
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
  const selectedDate = week[selectedDay]

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
      <header className="mb-6 flex items-end justify-between">
        <div>
          <p className="text-sm font-medium text-ink/50">Tus clases</p>
          <h1 className="text-[34px] font-bold leading-tight text-ink">Horario</h1>
        </div>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={openNew}
          className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ink text-surface shadow-[0_6px_16px_-6px_rgba(0,0,0,0.4)]"
          aria-label="Agregar clase"
        >
          <PlusIcon className="h-6 w-6" />
        </motion.button>
      </header>

      {/* Tira de días — selector premium con cápsula oscura deslizante */}
      <div className="glass mb-5 flex items-stretch justify-between gap-1 rounded-[26px] p-2">
        {week.map((d, i) => {
          const selected = i === selectedDay
          return (
            <button
              key={i}
              onClick={() => {
                setSelectedDay(i)
                setWeekView(false)
              }}
              className="relative flex flex-1 flex-col items-center justify-center gap-1 rounded-2xl py-2.5"
            >
              {selected && (
                <motion.span
                  layoutId="horario-daysel"
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
      {!weekView && (
        <div className="mb-4 flex items-baseline justify-between px-1">
          <h2 className="text-[19px] font-bold text-ink">
            {DAY_NAMES[selectedDay]} {selectedDate.getDate()}
            <span className="font-semibold text-ink/40"> de {MONTH_NAMES[selectedDate.getMonth()]}</span>
          </h2>
          <button
            onClick={() => setWeekView(true)}
            className="shrink-0 text-sm font-semibold text-ink/45 active:text-ink/70"
          >
            Ver semana
          </button>
        </div>
      )}

      {/* Próxima clase (solo hoy) */}
      {next && nextSubject && !weekView && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass glow relative mb-5 overflow-hidden rounded-[22px] p-4 pl-5"
          style={{ ['--glow' as string]: `rgb(${accentRgb(nextSubject.color ?? 'gray')} / 0.28)` }}
        >
          <span
            className="absolute inset-y-2 left-0 w-1 rounded-r-full"
            style={{ background: `rgb(${accentRgb(nextSubject.color ?? 'gray')})` }}
          />
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-[13px] font-semibold text-ink/50">
              <ClockIcon className="h-4 w-4" />
              {next.status === 'now' ? 'Ahora en clase' : 'Próxima clase'}
            </p>
            {next.status === 'next' && (
              <span className="rounded-full bg-ink/[0.06] px-2.5 py-1 text-[12px] font-bold text-ink/60">
                {next.minutesTo < 60 ? `En ${next.minutesTo} min` : `A las ${next.block.start}`}
              </span>
            )}
          </div>
          <h3 className="mt-1.5 text-[19px] font-bold text-ink">{nextSubject.name}</h3>
          <p className="mt-0.5 text-sm tabular-nums text-ink/55">
            {next.block.start} — {next.block.end}
            {next.block.room ? ` · Sala ${next.block.room}` : ''}
          </p>
        </motion.div>
      )}

      {classes.length === 0 ? (
        /* Estado vacío */
        <div className="glass mt-6 rounded-4xl p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-ink/5 text-ink">
            <ClockIcon className="h-7 w-7" />
          </div>
          <h2 className="mb-1 text-xl font-semibold text-ink">Tu horario está vacío</h2>
          <p className="mb-6 text-sm text-ink/55">Agrega tus clases y tenlas siempre a mano.</p>
          <button
            onClick={openNew}
            className="inline-flex items-center gap-2 rounded-3xl bg-ink px-5 py-3 font-semibold text-surface"
          >
            <PlusIcon className="h-5 w-5" /> Agregar clase
          </button>
        </div>
      ) : weekView ? (
        /* Vista semanal: lista compacta por día */
        <div className="space-y-5">
          {DAY_NAMES.map((name, i) => {
            const list = classesForDay(classes, i)
            if (list.length === 0 && i >= 5) return null // finde sin clases: no ocupa espacio
            return (
              <div key={name}>
                <div className="mb-2 flex items-center gap-2 px-1">
                  <p className="text-sm font-bold text-ink/70">{name}</p>
                  <span className="text-[12px] font-medium text-ink/30">
                    {list.length > 0 && `${list.length} ${list.length === 1 ? 'clase' : 'clases'}`}
                  </span>
                </div>
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
      ) : dayClasses.length === 0 ? (
        <div className="glass rounded-3xl p-8 text-center">
          <p className="text-[15px] font-semibold text-ink">Sin clases este día</p>
          <p className="mt-0.5 text-sm text-ink/45">Aprovecha para ponerte al día.</p>
        </div>
      ) : (
        /* Timeline del día: horas a la izquierda + rail + tarjetas */
        <div className="space-y-0">
          {dayClasses.map((b, i) => {
            const isFirst = i === 0
            const isLast = i === dayClasses.length - 1
            const nextBlock = dayClasses[i + 1]
            const gap = nextBlock ? toMinutes(nextBlock.start) - toMinutes(b.end) : 0
            const color = `rgb(${accentRgb(subjects.find((s) => s.id === b.subjectId)?.color ?? 'gray')})`
            return (
              <div key={b.id}>
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i, 6) * 0.04 }}
                  className="grid grid-cols-[2.75rem_1.25rem_1fr] items-stretch"
                >
                  {/* Columna de horas */}
                  <div className="flex flex-col items-end pt-3 pr-1">
                    <span className="text-[13px] font-bold tabular-nums leading-none text-ink/70">
                      {b.start}
                    </span>
                    <span className="mt-1 text-[11px] tabular-nums leading-none text-ink/30">
                      {b.end}
                    </span>
                  </div>
                  {/* Rail con nodo */}
                  <div className="relative flex justify-center">
                    {dayClasses.length > 1 && (
                      <span
                        className={`absolute left-1/2 w-px -translate-x-1/2 bg-ink/[0.08] ${
                          isFirst ? 'top-[18px]' : 'top-0'
                        } ${isLast ? 'h-[18px]' : 'bottom-0'}`}
                      />
                    )}
                    <span
                      className="relative z-10 mt-[13px] h-2.5 w-2.5 rounded-full ring-4 ring-surface"
                      style={{ background: color }}
                    />
                  </div>
                  {/* Tarjeta */}
                  <div className="pb-2 pl-1">
                    <ClassCard block={b} onOpen={() => openEdit(b)} />
                  </div>
                </motion.div>

                {/* Hueco entre clases → agregar bloque (discreto) */}
                {gap >= 20 && (
                  <div className="grid grid-cols-[2.75rem_1.25rem_1fr] items-stretch">
                    <span />
                    <div className="relative flex justify-center">
                      <span className="absolute left-1/2 inset-y-0 w-px -translate-x-1/2 bg-ink/[0.08]" />
                    </div>
                    <div className="pb-2 pl-1">
                      <button
                        onClick={openNew}
                        className="flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-ink/12 py-2.5 text-[13px] font-medium text-ink/35 active:bg-ink/[0.03]"
                      >
                        <PlusIcon className="h-4 w-4" /> Agregar bloque
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
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
