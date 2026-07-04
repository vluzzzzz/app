import { motion } from 'framer-motion'
import type { Evaluation, GradeScale } from '../../lib/types'
import { GradeInput } from '../../components/ui/GradeInput'
import { WeightField } from '../../components/ui/WeightField'
import { TrashIcon } from '../../components/ui/Icons'

export function EvaluationRow({
  evaluation,
  scale,
  weighted,
  onName,
  onGrade,
  onWeight,
  onRemove,
}: {
  evaluation: Evaluation
  scale: GradeScale
  weighted?: boolean
  onName: (name: string) => void
  onGrade: (grade: number | null) => void
  onWeight?: (weight: number) => void
  onRemove: () => void
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 12 }}
      className="flex items-center gap-2 rounded-2xl bg-ink/5 px-3 py-2"
    >
      <input
        value={evaluation.name}
        onChange={(e) => onName(e.target.value)}
        className="min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-ink/30"
        placeholder="Evaluación"
      />
      {weighted && (
        <WeightField
          value={evaluation.weight ?? 0}
          onChange={(w) => onWeight?.(w)}
        />
      )}
      <GradeInput value={evaluation.grade} scale={scale} onChange={onGrade} />
      <button
        onClick={onRemove}
        className="rounded-xl p-1.5 text-ink/30 hover:text-rose-300"
      >
        <TrashIcon className="h-4 w-4" />
      </button>
    </motion.div>
  )
}
