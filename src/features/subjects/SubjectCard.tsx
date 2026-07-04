import { motion } from 'framer-motion'
import type { Subject } from '../../lib/types'
import {
  currentGrade,
  gradedEvaluationCount,
  minGradeToPass,
  realEvaluationCount,
} from '../../lib/grades'
import { formatGrade } from '../../lib/format'
import { accentById, gradient } from '../../lib/colors'
import type { CSSProperties } from 'react'
import { GlassCard } from '../../components/ui/GlassCard'
import { StatusPill } from '../../components/ui/StatusPill'
import { ChevronRight } from '../../components/ui/Icons'

export function SubjectCard({
  subject,
  onOpen,
}: {
  subject: Subject
  onOpen: () => void
}) {
  const current = currentGrade(subject)
  const result = minGradeToPass(subject)
  const total = realEvaluationCount(subject)
  const graded = gradedEvaluationCount(subject)
  const accent = accentById(subject.color)

  return (
    <GlassCard interactive onClick={onOpen} className="cursor-pointer p-4">
      <div className="flex items-center gap-4">
        {/* Acento de color con resplandor de su propio color */}
        <div
          className="glow h-12 w-12 shrink-0 rounded-2xl"
          style={
            {
              backgroundImage: gradient(subject.color),
              '--glow': accent.from,
            } as CSSProperties
          }
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="truncate text-[17px] font-semibold text-ink">
              {subject.name}
            </h3>
            <StatusPill status={result.status} />
          </div>
          <p className="mt-0.5 text-sm text-ink/50">
            {total === 0
              ? 'Sin evaluaciones'
              : `${graded}/${total} notas puestas`}
          </p>
        </div>

        <div className="flex items-center gap-1 text-right">
          <div>
            <div className="text-2xl font-bold tabular-nums text-ink">
              {formatGrade(current)}
            </div>
            <div className="text-[11px] uppercase tracking-wide text-ink/40">
              actual
            </div>
          </div>
          <motion.span className="text-ink/30" whileHover={{ x: 2 }}>
            <ChevronRight className="h-5 w-5" />
          </motion.span>
        </div>
      </div>
    </GlassCard>
  )
}
