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
/** Ancho de la columna de horas y separación entre columnas (gap-1.5). */
const GUTTER_W = 64
const COL_GAP = 6
/** Ancho mínimo de tarjeta para poner los datos al costado del nombre. */
const SIDE_MIN_W = 230
/** Bajo este ancho de tarjeta solo caben el nombre y la hora de inicio. */
const TINY_W = 100


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
 * Horario del modo PC (≥1024px): un horario universitario fijo (sin fechas).
 * Días y horas van en etiquetas redondeadas; cada clase es una tarjeta blanca
 * elevada con la barra larga del color del ramo (la misma del calendario): si
 * va sola, nombre a la izquierda y hora/sala a la derecha; si choca o la columna
 * es angosta, apilada. La semana entra completa en pantalla.
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

  // Tamaño real del área de bloques: el alto da cuánto mide una hora y el
  // ancho decide si las tarjetas van con datos al costado o apiladas.
  const bodyRef = useRef<HTMLDivElement>(null)
  const [body, setBody] = useState({ w: 0, h: 0 })
  const hasClasses = classes.length > 0
  useLayoutEffect(() => {
    const el = bodyRef.current
    if (!el) return
    const measure = () => setBody({ w: el.clientWidth, h: el.clientHeight })
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    measure()
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

  const innerH = Math.max(0, body.h - COL_PAD * 2)
  // Redondeado al píxel: así todas las líneas y tarjetas quedan igual de nítidas.
  const yOf = (mins: number) =>
    Math.round(COL_PAD + ((mins - startH * 60) / ((endH - startH) * 60)) * innerH)
  const colW = days.length ? (body.w - GUTTER_W - COL_GAP * days.length) / days.length : 0
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

  const cols = `${GUTTER_W}px repeat(${days.length}, minmax(0, 1fr))`

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
                      // Datos al costado solo si la clase va sola y la tarjeta es ancha; si no, apilada.
                      const cardW = colW / lanes - 10
                      const side = lanes === 1 && cardW >= SIDE_MIN_W
                      const tiny = !side && cardW < TINY_W
                      const place = [CLASS_TYPE_LABEL[block.type], block.room].filter(Boolean).join(' · ')
                      const name = subjectName(block.subjectId)
                      // El nombre manda: estimo cuántas líneas necesita y solo muestro
                      // hora y sala si sobra alto. Así el nombre nunca se corta a medias.
                      const nameFont = side ? 15 : tiny ? 11.5 : 13
                      const nameW = side ? cardW * 0.5 - 14 : cardW - 22
                      const cpl = Math.max(5, Math.floor(nameW / (nameFont * 0.52)))
                      const lineH = nameFont * 1.18
                      const contentH = height - (tiny ? 12 : 16)
                      const fitLines = Math.max(1, Math.floor(contentH / lineH))
                      // +1 línea de holgura cuando el nombre parte (las palabras largas gastan espacio).
                      const estLines = Math.max(1, Math.ceil(name.length / cpl))
                      const nameLines = Math.min(estLines > 1 ? estLines + 1 : 1, fitLines, side ? 3 : 4)
                      const afterName = contentH - nameLines * lineH
                      const showTime = side || afterName >= 16
                      const showPlace = side
                        ? place && height >= 50
                        : !tiny && place && afterName >= (showTime ? 44 : 26)
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
                            tiny ? 'gap-1.5 p-1.5' : 'gap-2.5 p-2 pr-3'
                          }`}
                        >
                          {/* Barra larga del color del ramo, igual que en el calendario (mismo grosor siempre). */}
                          <span
                            aria-hidden
                            className="w-[5px] shrink-0 self-stretch rounded-full"
                            style={{ ...RAISED, backgroundColor: `rgb(${rgb})` }}
                          />
                          {side ? (
                            /* Clase sola: nombre a la izquierda | hora y sala a la derecha. */
                            <div className="flex min-w-0 flex-1 items-center gap-3">
                              <p
                                className="line-clamp-3 min-w-0 flex-1 text-[15px] font-bold leading-[1.15] tracking-[-0.012em] text-ink [overflow-wrap:normal]"
                                style={{ WebkitLineClamp: nameLines }}
                              >
                                {name}
                              </p>
                              <span aria-hidden className="w-px self-stretch bg-ink/[0.08]" style={{ margin: '4px 0' }} />
                              <div className="w-[46%] shrink-0">
                                <p className="whitespace-nowrap text-[11.5px] font-semibold tabular-nums leading-tight text-ink/70">
                                  {block.start} – {block.end}
                                </p>
                                {showPlace && place && (
                                  <p className="mt-1 line-clamp-2 text-[11px] font-medium leading-tight text-ink/45">{place}</p>
                                )}
                              </div>
                            </div>
                          ) : (
                            /* Choque o columna angosta: nombre arriba, hora y sala debajo. */
                            <div className="flex min-w-0 flex-1 flex-col justify-center">
                              <p
                                lang="es"
                                className={`line-clamp-4 font-bold leading-[1.15] tracking-[-0.01em] text-ink hyphens-auto [overflow-wrap:anywhere] ${
                                  tiny ? 'text-[11.5px]' : 'text-[13px]'
                                }`}
                                style={{ WebkitLineClamp: nameLines }}
                              >
                                {name}
                              </p>
                              {showTime && (
                                <p className="mt-1 whitespace-nowrap text-[11px] font-semibold tabular-nums leading-tight tracking-[-0.01em] text-ink/70">
                                  {tiny ? block.start : `${block.start} – ${block.end}`}
                                </p>
                              )}
                              {showPlace && place && (
                                <p className="mt-0.5 line-clamp-2 text-[10.5px] font-medium leading-tight text-ink/45">{place}</p>
                              )}
                            </div>
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
