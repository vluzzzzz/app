import { useEffect, useMemo, useState } from 'react'
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

/** "13:05" → "1:05 PM" (hora normal, no militar). */
function to12h(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number)
  const ampm = h < 12 ? 'AM' : 'PM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`
}
/** 8 → "8 AM", 13 → "1 PM" (etiqueta de la escala de horas). */
function hourLabel(h: number): string {
  const ampm = h < 12 ? 'AM' : 'PM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12} ${ampm}`
}

/** Capa interior (tono más claro) con la info de la clase: hora + sala + profe.
 *  Ojo: "Sala" NO se muestra al ver (solo al editar) — aquí va el valor tal cual. */
function ClassInfo({ block, compact = false }: { block: ClassBlock; compact?: boolean }) {
  const extra = [block.room, block.professor].filter(Boolean).join(' · ')
  return (
    <div className={`rounded-xl bg-ink/[0.05] ${compact ? 'px-3 py-2' : 'px-3.5 py-3'}`}>
      <p className={`font-semibold tabular-nums text-ink/70 ${compact ? 'text-[12.5px]' : 'text-[14px]'}`}>
        {to12h(block.start)} — {to12h(block.end)}
      </p>
      {extra && (
        <p className={`mt-1 break-words text-ink/45 ${compact ? 'text-[11.5px]' : 'text-[13px]'}`}>
          {extra}
        </p>
      )}
    </div>
  )
}

/** Tarjeta de clase para la vista semanal (nombre afuera, info en capa interior). */
function ClassCard({ block, onOpen }: { block: ClassBlock; onOpen: () => void }) {
  const subject = useAppStore((s) => s.subjects.find((x) => x.id === block.subjectId))
  const color = `rgb(${accentRgb(subject?.color ?? 'gray')})`
  return (
    <motion.button
      whileTap={{ scale: 0.985 }}
      onClick={onOpen}
      className="glass relative w-full overflow-hidden rounded-[20px] p-3.5 pl-4 text-left"
    >
      <span className="absolute inset-y-3 left-0 w-[3px] rounded-r-full" style={{ background: color }} />
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
    </motion.button>
  )
}

// --- Agenda: layout por horas (columnas para clases que se solapan) ---
type Positioned = { block: ClassBlock; s: number; e: number; col: number; cols: number }

function packColumns(classes: ClassBlock[]): Positioned[] {
  const items: Positioned[] = classes
    .map((b) => ({ block: b, s: toMinutes(b.start), e: toMinutes(b.end), col: 0, cols: 1 }))
    .sort((a, b) => a.s - b.s || a.e - b.e)
  const colEnds: number[] = []
  for (const it of items) {
    let placed = false
    for (let i = 0; i < colEnds.length; i++) {
      if (colEnds[i] <= it.s) {
        it.col = i
        colEnds[i] = it.e
        placed = true
        break
      }
    }
    if (!placed) {
      it.col = colEnds.length
      colEnds.push(it.e)
    }
  }
  // Nº de columnas por cada clase = máximo de columnas entre las que se solapan con ella.
  for (const a of items) {
    let max = a.col + 1
    for (const b of items) {
      if (a !== b && b.s < a.e && a.s < b.e) max = Math.max(max, b.col + 1)
    }
    a.cols = max
  }
  return items
}

const HOUR_PX = 76 // alto de cada hora en la agenda (bastante aire)

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

  const subjectColor = (id: string) =>
    `rgb(${accentRgb(subjects.find((s) => s.id === id)?.color ?? 'gray')})`
  const subjectName = (id: string) => subjects.find((s) => s.id === id)?.name ?? 'Ramo eliminado'

  // Rango de horas de la agenda: por defecto 8–20, se estira para incluir todo.
  const { startHour, endHour, positioned } = useMemo(() => {
    if (dayClasses.length === 0) return { startHour: 8, endHour: 20, positioned: [] as Positioned[] }
    const pos = packColumns(dayClasses)
    const minS = Math.min(...pos.map((p) => p.s))
    const maxE = Math.max(...pos.map((p) => p.e))
    return {
      startHour: Math.min(8, Math.floor(minS / 60)),
      endHour: Math.max(20, Math.ceil(maxE / 60)),
      positioned: pos,
    }
  }, [dayClasses])

  const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i)
  const gridHeight = (endHour - startHour) * HOUR_PX + 16

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
                {next.minutesTo < 60 ? `En ${next.minutesTo} min` : `A las ${to12h(next.block.start)}`}
              </span>
            )}
          </div>
          <h3 className="mt-1.5 break-words text-[19px] font-bold text-ink">{nextSubject.name}</h3>
          <p className="mt-0.5 text-sm tabular-nums text-ink/55">
            {to12h(next.block.start)} — {to12h(next.block.end)}
            {next.block.room ? ` · ${next.block.room}` : ''}
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
        /* Agenda por horas: escala a la izquierda + líneas sutiles + bloques por hora */
        <div className="relative" style={{ height: gridHeight }}>
          {/* Escala de horas (hora normal AM/PM) + líneas guía muy sutiles */}
          {hours.map((h) => (
            <div
              key={h}
              className="absolute inset-x-0 flex items-center gap-2"
              style={{ top: (h - startHour) * HOUR_PX }}
            >
              <span className="w-11 shrink-0 -translate-y-1/2 text-right text-[11.5px] font-semibold text-ink/30">
                {hourLabel(h)}
              </span>
              <span className="h-px flex-1 bg-ink/[0.05]" />
            </div>
          ))}

          {/* Bloques de clase */}
          <div className="absolute inset-y-0" style={{ left: 52, right: 0 }}>
            {positioned.map((p, i) => {
              const top = ((p.s - startHour * 60) / 60) * HOUR_PX
              const height = Math.max(((p.e - p.s) / 60) * HOUR_PX, 56)
              const widthPct = 100 / p.cols
              const tall = height >= 78
              return (
                <motion.button
                  key={p.block.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i, 6) * 0.03 }}
                  whileTap={{ scale: 0.985 }}
                  onClick={() => openEdit(p.block)}
                  className="glass absolute overflow-hidden rounded-2xl p-2.5 pl-3 text-left"
                  style={{
                    top,
                    height: height - 6,
                    left: `calc(${p.col * widthPct}% + ${p.col ? 4 : 0}px)`,
                    width: `calc(${widthPct}% - ${p.cols > 1 ? 4 : 0}px)`,
                  }}
                >
                  <span
                    className="absolute inset-y-2 left-0 w-[3px] rounded-r-full"
                    style={{ background: subjectColor(p.block.subjectId) }}
                  />
                  <h3 className="break-words text-[13.5px] font-bold leading-tight text-ink">
                    {subjectName(p.block.subjectId)}
                  </h3>
                  {tall ? (
                    <>
                      <p className="mt-0.5 text-[11px] font-medium text-ink/40">
                        {CLASS_TYPE_LABEL[p.block.type]}
                      </p>
                      <div className="mt-1.5">
                        <ClassInfo block={p.block} compact />
                      </div>
                    </>
                  ) : (
                    <p className="mt-1 text-[11.5px] font-medium tabular-nums text-ink/50">
                      {to12h(p.block.start)} — {to12h(p.block.end)}
                    </p>
                  )}
                </motion.button>
              )
            })}
          </div>
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
