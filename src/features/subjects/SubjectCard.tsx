import { motion } from 'framer-motion'
import type { Subject } from '../../lib/types'
import {
  currentGrade,
  minGradeToPass,
  realEvaluationCount,
  gradedEvaluationCount,
} from '../../lib/grades'
import { formatGrade } from '../../lib/format'
import { accentRgb } from '../../lib/accents'
import { ChevronRight } from '../../components/ui/Icons'

/** Tarjeta de ramo (lista de Calculadora): línea de color, promedio, necesitas, barra. */
export function SubjectCard({
  subject,
  onOpen,
}: {
  subject: Subject
  onOpen: () => void
}) {
  const current = currentGrade(subject)
  const res = minGradeToPass(subject)
  const total = realEvaluationCount(subject)
  const graded = gradedEvaluationCount(subject)
  const pct = total === 0 ? 0 : Math.round((graded / total) * 100)
  const color = `rgb(${accentRgb(subject.color ?? 'gray')})`

  const promedio = current == null ? '0,0' : formatGrade(current)
  const need =
    res.status === 'ALCANZABLE'
      ? formatGrade(res.needed)
      : res.status === 'SIN_DATOS'
        ? formatGrade(subject.scale.pass)
        : res.status === 'ASEGURADO'
          ? '¡Listo!'
          : '—'

  return (
    <motion.button
      whileTap={{ scale: 0.985 }}
      onClick={onOpen}
      className="glass relative w-full overflow-hidden rounded-2xl p-5 pl-6 text-left"
    >
      <span className="absolute inset-y-0 left-0 w-1.5" style={{ background: color }} />

      <div className="flex items-center justify-between gap-2">
        <h3 className="truncate text-[18px] font-bold text-ink">{subject.name}</h3>
        <ChevronRight className="h-5 w-5 shrink-0 text-ink/30" />
      </div>

      <div className="mt-3 flex items-start justify-between">
        <div>
          <p className="text-sm text-ink/50">Promedio actual</p>
          <p className="text-3xl font-black tabular-nums text-ink">{promedio}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-ink/50">Necesitas</p>
          <p className="text-3xl font-black tabular-nums text-ink">{need}</p>
          {res.status !== 'ASEGURADO' && <p className="text-xs text-ink/45">para aprobar</p>}
        </div>
      </div>

      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-ink/10">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className="mt-1.5 flex justify-between text-xs text-ink/45">
        <span>{total} {total === 1 ? 'evaluación' : 'evaluaciones'}</span>
        <span className="tabular-nums">{pct}%</span>
      </div>
    </motion.button>
  )
}
