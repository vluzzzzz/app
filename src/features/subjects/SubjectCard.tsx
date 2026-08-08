import type { Subject } from '../../lib/types'
import {
  currentGrade,
  gradedEvaluationCount,
  minGradeToPass,
  realEvaluationCount,
} from '../../lib/grades'
import { formatGrade } from '../../lib/format'
import { accentRgb } from '../../lib/accents'
import { GlassCard } from '../../components/ui/GlassCard'
import { StatusPill } from '../../components/ui/StatusPill'

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
  const pct = total === 0 ? 0 : Math.round((graded / total) * 100)
  const color = `rgb(${accentRgb(subject.color ?? 'gray')})`

  return (
    <GlassCard interactive onClick={onOpen} className="cursor-pointer p-4">
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 shrink-0 rounded-2xl" style={{ background: color }} />

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="truncate text-[17px] font-semibold text-ink">{subject.name}</h3>
            <StatusPill status={result.status} />
          </div>
          {/* Barra de progreso de notas puestas */}
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-ink/10">
            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
          </div>
          <p className="mt-1 text-xs text-ink/45">
            {total === 0 ? 'Sin evaluaciones' : `${graded}/${total} notas puestas`}
          </p>
        </div>

        <div className="text-right">
          <div className="text-2xl font-bold tabular-nums text-ink">{formatGrade(current)}</div>
          <div className="text-[11px] uppercase tracking-wide text-ink/40">actual</div>
        </div>
      </div>
    </GlassCard>
  )
}
