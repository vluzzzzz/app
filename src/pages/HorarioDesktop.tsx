import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { MotionConfig, motion } from 'framer-motion'
import { useAppStore } from '../store/useAppStore'
import type { ClassBlock } from '../lib/types'
import { CLASS_TYPE_LABEL, DAY_NAMES, toMinutes, weekday } from '../lib/schedule'
import { accentRgb } from '../lib/accents'
import { SPRING } from '../lib/motion'
import { ClassSheet } from '../features/schedule/ClassSheet'
import { ShareHorarioSheet } from '../features/schedule/ShareHorarioSheet'
import { HorarioPrint } from '../features/schedule/HorarioPrint'
import { RAISED, RAISED_LIGHT } from '../components/ui/relief'
import { ClockIcon, PlusIcon, PrinterIcon, ShareIcon } from '../components/ui/Icons'

/** Margen interno arriba/abajo de cada columna, para que los bloques no toquen las esquinas. */
const COL_PAD = 8

/** Reparte los bloques de un día en "carriles" para que los topes de horario
 *  no se tapen (primer carril libre). Cada grupo de clases que se cruzan se
 *  reparte su propio ancho: una clase sola a su hora usa la columna entera. */
function layoutDay(blocks: ClassBlock[]): { block: ClassBlock; lane: number; lanes: number }[] {
  const sorted = [...blocks].sort((a, b) => toMinutes(a.start) - toMinutes(b.start))
  const out: { block: ClassBlock; lane: number; lanes: number }[] = []
  let group: { block: ClassBlock; lane: number }[] = []
  let laneEnds: number[] = []
  let groupEnd = -1
  const flush = () => {
    out.push(...group.map((g) => ({ ...g, lanes: laneEnds.length })))
    group = []
    laneEnds = []
  }
  for (const block of sorted) {
    const start = toMinutes(block.start)
    if (start >= groupEnd) flush()
    let lane = laneEnds.findIndex((end) => end <= start)
    if (lane === -1) {
      lane = laneEnds.length
      laneEnds.push(0)
    }
    laneEnds[lane] = toMinutes(block.end)
    groupEnd = Math.max(groupEnd, toMinutes(block.end))
    group.push({ block, lane })
  }
  flush()
  return out
}

/** Pin de ubicación (sala) para las tarjetas de clase. */
function PinIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <path
        d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="10" r="2.2" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}

/**
 * Horario del modo PC (≥1024px): un horario universitario fijo (sin fechas).
 * Días y horas van en etiquetas redondeadas; cada clase es una tarjeta blanca
 * elevada con la barra larga del color del ramo (la misma del calendario), con
 * la hora arriba, el nombre y la sala. La semana entra completa en pantalla.
 * Click en una tarjeta → editar; click en el espacio libre de un día → nueva
 * clase ese día.
 * El horario del celular vive intacto en Horario.tsx.
 */
export function HorarioDesktop() {
  const classes = useAppStore((s) => s.classes)
  const subjects = useAppStore((s) => s.subjects)

  const [sheetOpen, setSheetOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [printing, setPrinting] = useState(false)
  const [editing, setEditing] = useState<ClassBlock | null>(null)
  const [newDay, setNewDay] = useState(0)

  // Re-render cada 30s → la línea de la hora actual avanza sola.
  const [, setTick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 30_000)
    return () => clearInterval(t)
  }, [])

  // Alto real del área de bloques: con él se calcula cuánto mide una hora.
  const bodyRef = useRef<HTMLDivElement>(null)
  const [bodyH, setBodyH] = useState(0)
  const hasClasses = classes.length > 0
  useLayoutEffect(() => {
    const el = bodyRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setBodyH(el.clientHeight))
    ro.observe(el)
    setBodyH(el.clientHeight)
    return () => ro.disconnect()
  }, [hasClasses])

  const now = new Date()
  const today = weekday(now)

  // Días visibles: Lun-Vie siempre; Sáb/Dom solo si tienen clases.
  const days = [0, 1, 2, 3, 4, 5, 6].filter((d) => d < 5 || classes.some((c) => c.day === d))

  // Rango horario: envuelve todas las clases, con defaults cómodos (8:00–19:00).
  const starts = classes.map((c) => toMinutes(c.start))
  const ends = classes.map((c) => toMinutes(c.end))
  const startH = Math.min(8, ...(starts.length ? [Math.floor(Math.min(...starts) / 60)] : []))
  const endH = Math.max(19, ...(ends.length ? [Math.ceil(Math.max(...ends) / 60)] : []))
  const hours = Array.from({ length: endH - startH + 1 }, (_, i) => startH + i)

  const innerH = Math.max(0, bodyH - COL_PAD * 2)
  const yOf = (mins: number) => COL_PAD + ((mins - startH * 60) / ((endH - startH) * 60)) * innerH
  const nowMins = now.getHours() * 60 + now.getMinutes()
  const showNowLine = days.includes(today) && nowMins >= startH * 60 && nowMins <= endH * 60

  const subjectRgb = (id: string) => accentRgb(subjects.find((s) => s.id === id)?.color ?? 'gray')
  const subjectName = (id: string) => subjects.find((s) => s.id === id)?.name ?? 'Ramo eliminado'

  const openNew = (day: number) => {
    setEditing(null)
    setNewDay(day)
    setSheetOpen(true)
  }
  const openEdit = (b: ClassBlock) => {
    setEditing(b)
    setSheetOpen(true)
  }

  const cols = `64px repeat(${days.length}, minmax(0, 1fr))`

  return (
    <MotionConfig reducedMotion="user">
      <div className="flex h-full flex-col overflow-hidden px-8 pb-6 pt-8 xl:px-12">
        {/* ===== Encabezado ===== */}
        <header className="mb-6 flex shrink-0 items-center justify-between gap-4">
          <div>
            <h1 className="text-[32px] font-bold leading-[36px] tracking-[-0.02em] text-ink">Horario</h1>
            <p className="mt-0.5 text-[14px] font-medium text-ink/45">Tu semana de clases</p>
          </div>
          <div className="flex items-center gap-2.5">
            <motion.button
              whileTap={{ scale: 0.9 }}
              transition={SPRING.press}
              onClick={() => setPrinting(true)}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-ink/[0.05] text-ink/60 transition-colors hover:bg-ink/10 hover:text-ink"
              aria-label="Imprimir o guardar como PDF"
            >
              <PrinterIcon className="h-5 w-5" />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.9 }}
              transition={SPRING.press}
              onClick={() => setShareOpen(true)}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-ink/[0.05] text-ink/60 transition-colors hover:bg-ink/10 hover:text-ink"
              aria-label="Compartir horario"
            >
              <ShareIcon className="h-5 w-5" />
            </motion.button>
            <motion.button
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.95, y: 0 }}
              transition={SPRING.press}
              onClick={() => openNew(today < 5 ? today : 0)}
              style={RAISED}
              className="flex h-11 items-center gap-2 rounded-full bg-ink px-5 text-[14.5px] font-semibold text-surface"
            >
              <PlusIcon className="h-5 w-5" /> Agregar clase
            </motion.button>
          </div>
        </header>

        {classes.length === 0 ? (
          /* Estado vacío */
          <div className="flex flex-1 items-center justify-center">
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-ink/[0.05] text-ink/45">
                <ClockIcon className="h-7 w-7" />
              </div>
              <h2 className="mb-1 text-xl font-semibold text-ink">Tu horario está vacío</h2>
              <p className="mb-6 text-sm text-ink/55">Agrega tus clases y tenlas siempre a mano.</p>
              <motion.button
                whileTap={{ scale: 0.95 }}
                transition={SPRING.press}
                onClick={() => openNew(today < 5 ? today : 0)}
                style={RAISED}
                className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-3 font-semibold text-surface"
              >
                <PlusIcon className="h-5 w-5" /> Agregar clase
              </motion.button>
            </div>
          </div>
        ) : (
          <>
            {/* ===== Días: etiquetas redondeadas fijas ===== */}
            <div className="mb-2 grid shrink-0 gap-1.5" style={{ gridTemplateColumns: cols }}>
              <span />
              {days.map((d) => (
                <div
                  key={d}
                  className={`flex h-10 items-center justify-center gap-1.5 rounded-[14px] text-[14px] tracking-[-0.01em] ${
                    d === today ? 'bg-ink/[0.08] font-bold text-ink' : 'bg-ink/[0.045] font-semibold text-ink/70'
                  }`}
                >
                  {DAY_NAMES[d]}
                  {d === today && <span aria-label="Hoy" className="h-1.5 w-1.5 rounded-full bg-rose-500" />}
                </div>
              ))}
            </div>

            {/* ===== Semana ===== */}
            <div ref={bodyRef} className="relative grid min-h-0 flex-1 gap-1.5" style={{ gridTemplateColumns: cols }}>
              {/* Horas: etiquetas redondeadas */}
              <div className="relative">
                {hours.map((h) => (
                  <span
                    key={h}
                    className="absolute left-1 right-1 -translate-y-1/2 rounded-full bg-ink/[0.045] py-[3px] text-center text-[11.5px] font-semibold tabular-nums text-ink/60"
                    style={{ top: yOf(h * 60) }}
                  >
                    {String(h).padStart(2, '0')}:00
                  </span>
                ))}
                {showNowLine && (
                  <span
                    className="absolute left-1 right-1 z-10 -translate-y-1/2 rounded-full py-[3px] text-center text-[11px] font-bold tabular-nums text-white"
                    style={{ ...RAISED, backgroundColor: 'rgb(244 63 94)', top: yOf(nowMins) }}
                  >
                    {String(now.getHours()).padStart(2, '0')}:{String(now.getMinutes()).padStart(2, '0')}
                  </span>
                )}
              </div>

              {/* Columnas de días */}
              {days.map((d, di) => {
                const isToday = d === today
                const dayBlocks = layoutDay(classes.filter((c) => c.day === d))
                return (
                  <motion.div
                    key={d}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0, transition: { ...SPRING.soft, delay: di * 0.04 } }}
                    onClick={() => openNew(d)}
                    title="Agregar clase este día"
                    className={`relative cursor-pointer rounded-[18px] transition-colors duration-200 ${
                      isToday ? 'bg-ink/[0.05]' : 'bg-ink/[0.025] hover:bg-ink/[0.04]'
                    }`}
                  >
                    {/* Líneas de cada hora, muy suaves */}
                    {hours.slice(1, -1).map((h) => (
                      <span
                        key={h}
                        className="pointer-events-none absolute inset-x-2 h-px bg-ink/[0.05]"
                        style={{ top: yOf(h * 60) }}
                      />
                    ))}

                    {dayBlocks.map(({ block, lane, lanes }, bi) => {
                      const top = yOf(toMinutes(block.start))
                      const height = Math.max(26, yOf(toMinutes(block.end)) - top - 4)
                      const width = 100 / lanes
                      const rgb = subjectRgb(block.subjectId)
                      const narrow = lanes > 1
                      // Qué cabe según el alto: el nombre siempre; la hora y la sala si hay espacio.
                      const showTime = height >= (narrow ? 64 : 52)
                      const showPlace = height >= (narrow ? 96 : 72)
                      const place = [CLASS_TYPE_LABEL[block.type], block.room].filter(Boolean).join(' · ')
                      return (
                        <motion.button
                          key={block.id}
                          initial={{ opacity: 0, y: 8, scale: 0.97 }}
                          animate={{
                            opacity: 1,
                            y: 0,
                            scale: 1,
                            transition: { ...SPRING.pop, delay: 0.08 + di * 0.04 + bi * 0.03 },
                          }}
                          whileHover={{ y: -2, zIndex: 10 }}
                          whileTap={{ scale: 0.97 }}
                          transition={SPRING.press}
                          onClick={(e) => {
                            e.stopPropagation()
                            openEdit(block)
                          }}
                          style={{
                            ...RAISED_LIGHT,
                            top,
                            height,
                            left: `calc(${lane * width}% + 5px)`,
                            width: `calc(${width}% - 10px)`,
                          }}
                          className={`absolute flex overflow-hidden rounded-[14px] bg-[rgb(var(--card))] text-left ring-1 ring-ink/[0.05] ${
                            narrow ? 'gap-1.5 p-1.5 pr-1.5' : 'gap-2.5 p-2 pr-2.5'
                          }`}
                        >
                          {/* Barra larga del color del ramo, igual que en el calendario. */}
                          <span
                            aria-hidden
                            className={`shrink-0 self-stretch rounded-full ${narrow ? 'w-1' : 'w-[6px]'}`}
                            style={{ ...RAISED, backgroundColor: `rgb(${rgb})` }}
                          />
                          <div className="flex min-w-0 flex-1 flex-col justify-center">
                            {showTime && (
                              <p
                                className={`whitespace-nowrap font-semibold tabular-nums leading-tight text-ink/55 ${
                                  narrow ? 'text-[10px] tracking-[-0.02em]' : 'text-[11px]'
                                }`}
                              >
                                {narrow ? `${block.start}–${block.end}` : `${block.start} – ${block.end}`}
                              </p>
                            )}
                            {/* El nombre corta por palabras (o con guion si una palabra no cabe) y como máximo en 2 líneas. */}
                            <p
                              lang="es"
                              className={`line-clamp-2 hyphens-auto font-bold leading-[1.15] tracking-[-0.01em] text-ink [overflow-wrap:normal] ${
                                narrow ? 'text-[12px]' : height < 52 ? 'text-[13px]' : 'text-[15px]'
                              } ${showTime ? 'mt-0.5' : ''}`}
                            >
                              {subjectName(block.subjectId)}
                            </p>
                            {showPlace && place && (
                              <p
                                className={`mt-1 flex items-start gap-1 font-medium leading-tight text-ink/50 ${
                                  narrow ? 'text-[10px]' : 'text-[11.5px]'
                                }`}
                              >
                                <PinIcon className={`mt-px shrink-0 ${narrow ? 'h-2.5 w-2.5' : 'h-3 w-3'}`} />
                                <span className="line-clamp-2 min-w-0">{place}</span>
                              </p>
                            )}
                          </div>
                        </motion.button>
                      )
                    })}

                    {/* Hora actual: línea roja solo en la columna de hoy */}
                    {isToday && showNowLine && (
                      <div
                        className="pointer-events-none absolute inset-x-0 z-20 -translate-y-1/2"
                        style={{ top: yOf(nowMins) }}
                      >
                        <div className="relative mx-1.5 h-[2px] rounded-full bg-rose-500">
                          <span className="absolute -left-1 -top-[3px] h-2 w-2 rounded-full bg-rose-500" />
                        </div>
                      </div>
                    )}
                  </motion.div>
                )
              })}
            </div>
          </>
        )}
      </div>

      <ClassSheet open={sheetOpen} onClose={() => setSheetOpen(false)} block={editing} defaultDay={newDay} />
      <ShareHorarioSheet open={shareOpen} onClose={() => setShareOpen(false)} />
      {printing && <HorarioPrint onDone={() => setPrinting(false)} />}
    </MotionConfig>
  )
}
