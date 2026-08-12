import { useMemo } from 'react'
import { motion } from 'framer-motion'
import type { ClassBlock } from '../../lib/types'
import { CLASS_TYPE_LABEL, toMinutes } from '../../lib/schedule'

/** "13:05" → "1:05 PM" (hora normal, no militar). */
export function to12h(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number)
  const ampm = h < 12 ? 'AM' : 'PM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`
}
/** "13:05" → "1:05" (sin AM/PM: dentro de la agenda la escala ya lo indica). */
export function to12hShort(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number)
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${String(m).padStart(2, '0')}`
}
/** 8 → "8 AM", 13 → "1 PM" (etiqueta de la escala de horas). */
function hourLabel(h: number): string {
  const ampm = h < 12 ? 'AM' : 'PM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12} ${ampm}`
}

/** Capa interior (tono más claro) con la info de la clase: hora + sala + profe. */
export function ClassInfo({ block, compact = false }: { block: ClassBlock; compact?: boolean }) {
  const extra = [block.room, block.professor].filter(Boolean).join(' · ')
  return (
    <div className={`rounded-xl bg-ink/[0.05] ${compact ? 'px-3 py-2' : 'px-3.5 py-3'}`}>
      <p className={`font-semibold tabular-nums text-ink/70 ${compact ? 'text-[12.5px]' : 'text-[14px]'}`}>
        {to12hShort(block.start)} — {to12hShort(block.end)}
      </p>
      {extra && (
        <p className={`mt-1 break-words text-ink/45 ${compact ? 'text-[11.5px]' : 'text-[13px]'}`}>
          {extra}
        </p>
      )}
    </div>
  )
}

// --- Agenda: clases agrupadas en "clusters" de solape. Las que chocan se
// renderizan lado a lado en una fila flex → SIEMPRE quedan del mismo alto
// (la más alta manda), sin importar cuánto texto tenga cada una. ---
type Cluster = { s: number; e: number; items: ClassBlock[] }

function buildClusters(classes: ClassBlock[]): Cluster[] {
  const sorted = [...classes].sort(
    (a, b) => toMinutes(a.start) - toMinutes(b.start) || toMinutes(a.end) - toMinutes(b.end),
  )
  const clusters: Cluster[] = []
  for (const b of sorted) {
    const s = toMinutes(b.start)
    const e = toMinutes(b.end)
    const last = clusters[clusters.length - 1]
    if (last && s < last.e) {
      last.items.push(b)
      last.e = Math.max(last.e, e)
    } else {
      clusters.push({ s, e, items: [b] })
    }
  }
  return clusters
}

const HOUR_PX = 76 // alto de cada hora en la agenda (bastante aire)

type Props = {
  classes: ClassBlock[]
  subjectName: (id: string) => string
  subjectColor: (id: string) => string
  /** Si viene, tocar una tarjeta la abre (editar). Sin esto = solo lectura. */
  onOpen?: (b: ClassBlock) => void
}

/**
 * Agenda del día por horas: escala AM/PM a la izquierda, líneas guía sutiles
 * y bloques por hora. La usan el Horario (editable) y la vista compartida
 * (solo lectura) para verse EXACTAMENTE igual.
 */
export function AgendaTimeline({ classes, subjectName, subjectColor, onOpen }: Props) {
  // Rango de horas: por defecto 8–20, se estira para incluir todo.
  const { startHour, endHour, clusters } = useMemo(() => {
    if (classes.length === 0) return { startHour: 8, endHour: 20, clusters: [] as Cluster[] }
    const cl = buildClusters(classes)
    const minS = cl[0].s
    const maxE = Math.max(...cl.map((c) => c.e))
    return {
      startHour: Math.min(8, Math.floor(minS / 60)),
      endHour: Math.max(20, Math.ceil(maxE / 60)),
      clusters: cl,
    }
  }, [classes])

  const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i)
  const gridHeight = (endHour - startHour) * HOUR_PX + 16

  return (
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

      {/* Bloques de clase (los que chocan van en una fila flex → mismo alto) */}
      <div className="absolute inset-y-0" style={{ left: 52, right: 0 }}>
        {clusters.map((c, ci) => {
          const top = ((c.s - startHour * 60) / 60) * HOUR_PX
          const minH = Math.max(((c.e - c.s) / 60) * HOUR_PX, 56) - 6
          const tall = minH >= 72
          // Con 3+ choques: carrusel horizontal (máx ~2 visibles, el resto se desliza).
          const carousel = c.items.length > 2
          return (
            <motion.div
              key={c.items[0].id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(ci, 6) * 0.03 }}
              className={`absolute inset-x-0 flex items-stretch gap-1.5 ${
                carousel ? 'snap-x snap-mandatory overflow-x-auto' : ''
              }`}
              style={{ top, minHeight: minH }}
            >
              {c.items.map((b) => (
                <motion.button
                  key={b.id}
                  whileTap={onOpen ? { scale: 0.985 } : undefined}
                  onClick={() => onOpen?.(b)}
                  className={`glass rounded-2xl p-2.5 text-left ${
                    carousel ? 'w-[46%] flex-none snap-start' : 'min-w-0 flex-1 basis-0'
                  } ${onOpen ? '' : 'cursor-default'}`}
                >
                  <div className="flex h-full gap-2">
                    <span
                      className="w-[3px] shrink-0 self-stretch rounded-full"
                      style={{ background: subjectColor(b.subjectId) }}
                    />
                    <div className="min-w-0 flex-1">
                      <h3 className="break-words text-[13.5px] font-bold leading-tight text-ink">
                        {subjectName(b.subjectId)}
                      </h3>
                      {tall ? (
                        <>
                          <p className="mt-0.5 text-[11px] font-medium text-ink/40">
                            {CLASS_TYPE_LABEL[b.type]}
                          </p>
                          <div className="mt-1.5">
                            <ClassInfo block={b} compact />
                          </div>
                        </>
                      ) : (
                        <p className="mt-1 text-[11.5px] font-medium tabular-nums text-ink/50">
                          {to12hShort(b.start)} — {to12hShort(b.end)}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.button>
              ))}
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
