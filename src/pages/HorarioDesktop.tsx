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

/**
 * Horario del modo PC (≥1024px), con el mismo lenguaje que el calendario: cada
 * día es una columna redondeada del tono del fondo (hoy, clara y elevada) y
 * cada clase es un bloque lleno del color del ramo con relieve. La semana entra
 * completa en pantalla, sin scroll. Click en un bloque → editar; click en el
 * espacio libre de un día → nueva clase ese día.
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

  const cols = `52px repeat(${days.length}, minmax(0, 1fr))`

  return (
    <MotionConfig reducedMotion="user">
      <div className="flex h-full flex-col overflow-hidden px-8 pb-6 pt-8 xl:px-12">
        {/* ===== Encabezado ===== */}
        <header className="mb-6 flex shrink-0 items-center justify-between gap-4">
          <h1 className="text-[32px] font-bold leading-[36px] tracking-[-0.02em] text-ink">
            Horario{' '}
            <span className="font-medium text-ink/30">
              {classes.length} {classes.length === 1 ? 'clase' : 'clases'}
            </span>
          </h1>
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
            {/* ===== Nombres de los días ===== */}
            <div className="mb-3 grid shrink-0 gap-1.5" style={{ gridTemplateColumns: cols }}>
              <span />
              {days.map((d) => {
                const isToday = d === today
                return (
                  <span
                    key={d}
                    className={`flex items-center justify-center text-[13px] ${
                      isToday ? 'font-bold text-ink' : 'font-medium text-ink/35'
                    }`}
                  >
                    {DAY_NAMES[d]}
                  </span>
                )
              })}
            </div>

            {/* ===== Semana ===== */}
            <div ref={bodyRef} className="relative grid min-h-0 flex-1 gap-1.5" style={{ gridTemplateColumns: cols }}>
              {/* Horas */}
              <div className="relative">
                {hours.map((h) => (
                  <span
                    key={h}
                    className="absolute right-2 -translate-y-1/2 text-[11.5px] font-medium tabular-nums text-ink/35"
                    style={{ top: yOf(h * 60) }}
                  >
                    {String(h).padStart(2, '0')}:00
                  </span>
                ))}
                {showNowLine && (
                  <span
                    className="absolute right-1 z-10 -translate-y-1/2 rounded-md bg-rose-500 px-1.5 py-px text-[10.5px] font-bold tabular-nums text-white"
                    style={{ top: yOf(nowMins) }}
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
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1, transition: { ...SPRING.pop, delay: di * 0.04 } }}
                    onClick={() => openNew(d)}
                    title="Agregar clase este día"
                    className={`group relative cursor-pointer rounded-[22px] transition-colors duration-200 ${
                      isToday
                        ? 'bg-[rgb(var(--card))] ring-1 ring-ink/[0.05] dark:ring-ink/[0.14]'
                        : 'bg-ink/[0.035] hover:bg-ink/[0.05]'
                    }`}
                    style={isToday ? RAISED_LIGHT : undefined}
                  >
                    {/* Líneas de cada hora, muy suaves */}
                    {hours.slice(1, -1).map((h) => (
                      <span
                        key={h}
                        className="pointer-events-none absolute inset-x-3 h-px bg-ink/[0.05]"
                        style={{ top: yOf(h * 60) }}
                      />
                    ))}

                    {dayBlocks.map(({ block, lane, lanes }, bi) => {
                      const top = yOf(toMinutes(block.start))
                      const height = Math.max(26, yOf(toMinutes(block.end)) - top - 3)
                      const width = 100 / lanes
                      const rgb = subjectRgb(block.subjectId)
                      const narrow = lanes > 1
                      const compact = height < 58
                      return (
                        <motion.button
                          key={block.id}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{
                            opacity: 1,
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
                            left: `calc(${lane * width}% + ${narrow ? 7 : 4}px)`,
                            width: `calc(${width}% - ${narrow ? 14 : 8}px)`,
                          }}
                          className={`absolute flex overflow-hidden rounded-[13px] bg-[rgb(var(--card))] text-left ring-1 ring-ink/[0.045] transition-shadow hover:ring-ink/10 ${
                            narrow
                              ? 'flex-col justify-center pl-3 pr-2'
                              : 'items-center justify-between gap-3 pl-3.5 pr-3'
                          } ${compact ? 'py-1.5' : 'py-2'}`}
                        >
                          {/* Rayita de color: identifica el ramo sin llenar toda la tarjeta. */}
                          <span
                            aria-hidden
                            className="absolute inset-y-0 left-0 w-[3px]"
                            style={{ backgroundColor: `rgb(${rgb})` }}
                          />
                          {narrow ? (
                            <>
                              {/* Choque: nombre arriba y datos abajo, con las dos tarjetas separadas. */}
                              <div className={compact ? undefined : 'flex min-h-[38px] items-center'}>
                                <p className="w-full break-words text-[11px] font-bold leading-[1.14] text-ink">
                                  {subjectName(block.subjectId)}
                                </p>
                              </div>
                              <div className={compact ? 'mt-0.5' : 'mt-1'}>
                                {compact ? (
                                  <p className="break-words text-[9.5px] font-semibold leading-tight tabular-nums text-ink/55">
                                    {block.start}–{block.end}
                                    {block.room ? ` · ${block.room}` : ''}
                                  </p>
                                ) : (
                                  <>
                                    <p className="whitespace-nowrap text-[10px] font-semibold leading-tight tabular-nums text-ink/55">
                                      {block.start} – {block.end}
                                    </p>
                                    <p className="mt-0.5 break-words text-[10px] font-medium leading-[1.2] text-ink/40">
                                      {CLASS_TYPE_LABEL[block.type]}
                                      {block.room ? ` · ${block.room}` : ''}
                                    </p>
                                  </>
                                )}
                              </div>
                            </>
                          ) : (
                            <>
                              {/* Sin choque: nombre a la izquierda y hora/sala a la derecha. */}
                              <p
                                className={`min-w-0 flex-1 break-words font-bold leading-[1.16] text-ink ${
                                  compact ? 'text-[12px]' : 'text-[13px]'
                                }`}
                              >
                                {subjectName(block.subjectId)}
                              </p>
                              <div className="shrink-0 text-right">
                                {compact ? (
                                  <p className="break-words text-[9.5px] font-semibold leading-tight tabular-nums text-ink/55">
                                    {block.start}–{block.end}
                                    {block.room ? ` · ${block.room}` : ''}
                                  </p>
                                ) : (
                                  <>
                                    <p className="whitespace-nowrap text-[10px] font-semibold leading-tight tabular-nums text-ink/55">
                                      {block.start} – {block.end}
                                    </p>
                                    <p className="mt-0.5 break-words text-[10px] font-medium leading-[1.2] text-ink/40">
                                      {CLASS_TYPE_LABEL[block.type]}
                                      {block.room ? ` · ${block.room}` : ''}
                                    </p>
                                  </>
                                )}
                              </div>
                            </>
                          )}
                        </motion.button>
                      )
                    })}

                    {/* Hora actual: línea roja solo en la columna de hoy */}
                    {isToday && showNowLine && (
                      <div
                        className="pointer-events-none absolute inset-x-0 z-20 -translate-y-1/2"
                        style={{ top: yOf(nowMins) }}
                      >
                        <div className="relative mx-1 h-[2px] rounded-full bg-rose-500">
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
