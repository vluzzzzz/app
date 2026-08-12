import { motion } from 'framer-motion'
import type { Subject } from '../../lib/types'
import type { NextClassInfo } from '../../lib/schedule'
import { ChevronRight, ClockIcon } from '../../components/ui/Icons'
import { to12h } from '../schedule/AgendaTimeline'

/** Tarjeta simple de ramo para la Home: gris (oscuro/plomo) + nombre + flecha. */
export function SubjectHomeCard({
  subject,
  onOpen,
  bg,
  next,
}: {
  subject: Subject
  onOpen: () => void
  /** Color de fondo (gris oscuro o plomo, intercalado por la Home). */
  bg: string
  /** Si este ramo es la clase actual/próxima de hoy, su info. */
  next?: NextClassInfo | null
}) {
  const label = next
    ? next.status === 'now'
      ? 'Ahora en clase'
      : next.minutesTo < 60
        ? `Próxima clase · en ${next.minutesTo} min`
        : `Próxima clase · a las ${to12h(next.block.start)}`
    : null

  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onOpen}
      className="flex w-full items-center justify-between gap-3 rounded-3xl px-6 py-8 text-left"
      style={{ background: bg }}
    >
      <span className="min-w-0">
        <span className="block truncate text-xl font-bold text-white">{subject.name}</span>
        {label && (
          <span className="mt-1.5 flex items-center gap-1.5 text-[13px] font-semibold text-white/60">
            <ClockIcon className="h-3.5 w-3.5" />
            {label}
          </span>
        )}
      </span>
      <ChevronRight className="h-6 w-6 shrink-0 text-white/80" />
    </motion.button>
  )
}
