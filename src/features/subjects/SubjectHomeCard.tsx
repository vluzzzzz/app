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
      className="flex h-[120px] w-full items-center gap-3 rounded-3xl px-6 text-left"
      style={{ background: bg }}
    >
      <div className="min-w-0 flex-1">
        <div className="line-clamp-2 break-words text-[19px] font-bold leading-tight text-white">
          {subject.name}
        </div>
        {label && (
          <div className="mt-1.5 flex items-center gap-1.5 text-[13px] font-semibold text-white/60">
            <ClockIcon className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{label}</span>
          </div>
        )}
      </div>
      <ChevronRight className="h-6 w-6 shrink-0 text-white/80" />
    </motion.button>
  )
}
