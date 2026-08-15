import { useEffect, useState } from 'react'
import type { ClassBlock } from '../../lib/types'
import { CLASS_TYPE_LABEL, DAY_NAMES, toMinutes, weekday } from '../../lib/schedule'

const HOUR_PX = 64 // alto de una hora en la grilla

/** Reparte los bloques de un día en "carriles" para que los topes de horario
 *  no se tapen (mismo algoritmo que usan los calendarios: primer carril libre). */
function layoutDay(blocks: ClassBlock[]): { block: ClassBlock; lane: number; lanes: number }[] {
  const sorted = [...blocks].sort((a, b) => toMinutes(a.start) - toMinutes(b.start))
  const laneEnds: number[] = []
  const placed = sorted.map((block) => {
    const start = toMinutes(block.start)
    let lane = laneEnds.findIndex((end) => end <= start)
    if (lane === -1) {
      lane = laneEnds.length
      laneEnds.push(0)
    }
    laneEnds[lane] = toMinutes(block.end)
    return { block, lane, lanes: 0 }
  })
  const lanes = laneEnds.length || 1
  return placed.map((p) => ({ ...p, lanes }))
}

/**
 * Horario semanal REAL del modo PC: columnas por día, filas por hora, bloques
 * posicionados por su horario con el color del ramo, columna de hoy resaltada
 * y línea roja de la hora actual. Click en un bloque → editar.
 */
export function WeekGrid({
  classes,
  subjectName,
  subjectColor,
  onOpen,
}: {
  classes: ClassBlock[]
  subjectName: (id: string) => string
  subjectColor: (id: string) => string
  onOpen: (b: ClassBlock) => void
}) {
  // Re-render cada 30s → la línea roja avanza sola.
  const [, setTick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 30_000)
    return () => clearInterval(t)
  }, [])

  const now = new Date()
  const today = weekday(now)

  // Días visibles: Lun-Vie siempre; Sáb/Dom solo si tienen clases.
  const days = [0, 1, 2, 3, 4, 5, 6].filter(
    (d) => d < 5 || classes.some((c) => c.day === d),
  )

  // Rango horario: envuelve todas las clases, con defaults cómodos (8:00–19:00).
  const starts = classes.map((c) => toMinutes(c.start))
  const ends = classes.map((c) => toMinutes(c.end))
  const startH = Math.min(8, ...(starts.length ? [Math.floor(Math.min(...starts) / 60)] : []))
  const endH = Math.max(19, ...(ends.length ? [Math.ceil(Math.max(...ends) / 60)] : []))
  const hours = Array.from({ length: endH - startH + 1 }, (_, i) => startH + i)
  const gridH = (endH - startH) * HOUR_PX

  const yOf = (mins: number) => ((mins - startH * 60) / 60) * HOUR_PX
  const nowMins = now.getHours() * 60 + now.getMinutes()
  const showNowLine = nowMins >= startH * 60 && nowMins <= endH * 60

  return (
    <div className="glass overflow-hidden rounded-[26px] p-4">
      {/* Cabecera de días */}
      <div
        className="grid"
        style={{ gridTemplateColumns: `56px repeat(${days.length}, minmax(0, 1fr))` }}
      >
        <span />
        {days.map((d) => (
          <div
            key={d}
            className={`pb-3 text-center text-[13px] font-bold uppercase tracking-wide ${
              d === today ? 'text-ink' : 'text-ink/35'
            }`}
          >
            {DAY_NAMES[d].slice(0, 3)}
            {d === today && <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-ink align-[2px]" />}
          </div>
        ))}
      </div>

      {/* Cuerpo: gutter de horas + columnas de días */}
      <div
        className="relative grid"
        style={{ gridTemplateColumns: `56px repeat(${days.length}, minmax(0, 1fr))`, height: gridH }}
      >
        {/* Horas + líneas horizontales */}
        {hours.map((h) => (
          <div
            key={h}
            className="pointer-events-none absolute inset-x-0"
            style={{ top: yOf(h * 60) }}
          >
            <div className="flex items-center gap-2">
              <span className="-mt-2 w-[48px] shrink-0 text-right text-[11.5px] font-medium tabular-nums text-ink/35">
                {String(h).padStart(2, '0')}:00
              </span>
              <span className="-mt-2 h-px flex-1 bg-ink/[0.06]" />
            </div>
          </div>
        ))}

        {/* Columnas de días */}
        <span />
        {days.map((d) => {
          const dayBlocks = layoutDay(classes.filter((c) => c.day === d))
          return (
            <div
              key={d}
              className={`relative border-l border-ink/[0.05] ${
                d === today ? 'bg-ink/[0.025]' : ''
              }`}
            >
              {dayBlocks.map(({ block, lane, lanes }) => {
                const top = yOf(toMinutes(block.start))
                const height = Math.max(
                  30,
                  yOf(toMinutes(block.end)) - yOf(toMinutes(block.start)) - 3,
                )
                const width = 100 / lanes
                const color = subjectColor(block.subjectId)
                return (
                  <button
                    key={block.id}
                    onClick={() => onOpen(block)}
                    style={{
                      top,
                      height,
                      left: `calc(${lane * width}% + 3px)`,
                      width: `calc(${width}% - 6px)`,
                      background: `color-mix(in srgb, ${color} 13%, rgb(var(--card)))`,
                      borderLeft: `3px solid ${color}`,
                    }}
                    className="absolute overflow-hidden rounded-xl px-2 py-1.5 text-left shadow-[0_2px_8px_-4px_rgba(0,0,0,0.2)] transition-transform hover:z-10 hover:scale-[1.02] hover:shadow-lg"
                  >
                    <p className="truncate text-[12.5px] font-bold leading-tight text-ink">
                      {subjectName(block.subjectId)}
                    </p>
                    <p className="truncate text-[11px] tabular-nums text-ink/55">
                      {block.start}–{block.end}
                    </p>
                    {height > 64 && (
                      <p className="truncate text-[11px] text-ink/45">
                        {block.room ? `${block.room} · ` : ''}
                        {CLASS_TYPE_LABEL[block.type]}
                      </p>
                    )}
                  </button>
                )
              })}

              {/* Línea roja de la hora actual (solo en la columna de hoy) */}
              {d === today && showNowLine && (
                <div
                  className="pointer-events-none absolute inset-x-0 z-20"
                  style={{ top: yOf(nowMins) }}
                >
                  <div className="relative h-[2px] bg-rose-500">
                    <span className="absolute -left-1 -top-[3px] h-2 w-2 rounded-full bg-rose-500" />
                    <span className="absolute -top-[9px] right-1 rounded-md bg-rose-500 px-1.5 py-px text-[10px] font-bold tabular-nums text-white">
                      {String(now.getHours()).padStart(2, '0')}:{String(now.getMinutes()).padStart(2, '0')}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
