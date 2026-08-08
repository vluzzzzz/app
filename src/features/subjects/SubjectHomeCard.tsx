import { motion } from 'framer-motion'
import type { Subject } from '../../lib/types'
import { accentRgb } from '../../lib/accents'
import { ChevronRight } from '../../components/ui/Icons'

/** Tarjeta simple de ramo para la Home: color + nombre + flecha (nada más). */
export function SubjectHomeCard({
  subject,
  onOpen,
}: {
  subject: Subject
  onOpen: () => void
}) {
  const color = `rgb(${accentRgb(subject.color ?? 'gray')})`
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onOpen}
      className="flex w-full items-center justify-between gap-3 rounded-4xl p-6 text-left"
      style={{ background: color }}
    >
      <span
        className="truncate text-xl font-bold text-white"
        style={{ textShadow: '0 1px 3px rgba(0,0,0,0.25)' }}
      >
        {subject.name}
      </span>
      <ChevronRight className="h-6 w-6 shrink-0 text-white/90" />
    </motion.button>
  )
}
