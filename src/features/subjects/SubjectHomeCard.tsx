import { motion } from 'framer-motion'
import type { Subject } from '../../lib/types'
import { ChevronRight } from '../../components/ui/Icons'

/** Tarjeta simple de ramo para la Home: gris (oscuro/plomo) + nombre + flecha. */
export function SubjectHomeCard({
  subject,
  onOpen,
  bg,
}: {
  subject: Subject
  onOpen: () => void
  /** Color de fondo (gris oscuro o plomo, intercalado por la Home). */
  bg: string
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onOpen}
      className="flex w-full items-center justify-between gap-3 rounded-3xl px-6 py-8 text-left"
      style={{ background: bg }}
    >
      <span className="truncate text-xl font-bold text-white">{subject.name}</span>
      <ChevronRight className="h-6 w-6 shrink-0 text-white/80" />
    </motion.button>
  )
}
