import { useState } from 'react'
import { motion } from 'framer-motion'
import { useAppStore } from '../store/useAppStore'
import type { ClassBlock } from '../lib/types'
import {
  CLASS_TYPE_LABEL,
  DAY_NAMES,
  DAY_SHORT,
  MONTH_NAMES,
  classesForDay,
  weekday,
} from '../lib/schedule'
import { accentRgb } from '../lib/accents'
import { ClassSheet } from '../features/schedule/ClassSheet'
import { ShareHorarioSheet } from '../features/schedule/ShareHorarioSheet'
import { AgendaTimeline, ClassInfo } from '../features/schedule/AgendaTimeline'
import { ClockIcon, PlusIcon, ShareIcon } from '../components/ui/Icons'

/** Tarjeta de clase para la vista semanal (nombre afuera, info en capa interior). */
function ClassCard({ block, onOpen }: { block: ClassBlock; onOpen: () => void }) {
  const subject = useAppStore((s) => s.subjects.find((x) => x.id === block.subjectId))
  const color = `rgb(${accentRgb(subject?.color ?? 'gray')})`
  return (
    <motion.button
      whileTap={{ scale: 0.985 }}
      onClick={onOpen}
      className="glass w-full rounded-[20px] p-3.5 text-left"
    >
      <div className="flex gap-2.5">
        <span className="w-[3px] shrink-0 self-stretch rounded-full" style={{ background: color }} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="break-words text-[15px] font-bold leading-snug text-ink">
              {subject?.name ?? 'Ramo eliminado'}
            </h3>
            <span className="shrink-0 text-[12px] font-medium text-ink/40">
              {CLASS_TYPE_LABEL[block.type]}
            </span>
          </div>
          <div className="mt-2">
            <ClassInfo block={block} />
          </div>
        </div>
      </div>
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
  const [shareOpen, setShareOpen] = useState(false)
  const [editing, setEditing] = useState<ClassBlock | null>(null)

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
  const selectedDate = week[selectedDay]

  const subjectColor = (id: string) =>
    `rgb(${accentRgb(subjects.find((s) => s.id === id)?.color ?? 'gray')})`
  const subjectName = (id: string) => subjects.find((s) => s.id === id)?.name ?? 'Ramo eliminado'

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
        <div className="flex items-center gap-2">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setShareOpen(true)}
            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ink/5 text-ink"
            aria-label="Compartir horario"
          >
            <ShareIcon className="h-5 w-5" />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={openNew}
            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ink text-surface shadow-[0_6px_16px_-6px_rgba(0,0,0,0.4)]"
            aria-label="Agregar clase"
          >
            <PlusIcon className="h-6 w-6" />
          </motion.button>
        </div>
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
        <AgendaTimeline
          classes={dayClasses}
          subjectName={subjectName}
          subjectColor={subjectColor}
          onOpen={openEdit}
        />
      )}

      <ClassSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        block={editing}
        defaultDay={selectedDay}
      />
      <ShareHorarioSheet open={shareOpen} onClose={() => setShareOpen(false)} />
    </div>
  )
}
