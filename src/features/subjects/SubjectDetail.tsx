import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import type { Route } from '../../App'
import { useAppStore } from '../../store/useAppStore'
import { accentRgb } from '../../lib/accents'
import { formatGrade } from '../../lib/format'
import {
  currentGrade,
  gradedEvaluationCount,
  minGradeToPass,
  realEvaluationCount,
  weightsAreValid,
} from '../../lib/grades'
import { NodeEditor } from './NodeEditor'
import { CalcResultsSheet } from './CalcResultsSheet'
import { GlassButton } from '../../components/ui/GlassButton'
import { ChevronLeft, TrashIcon } from '../../components/ui/Icons'

export function SubjectDetail({
  id,
  navigate,
}: {
  id: string
  navigate: (r: Route) => void
}) {
  const subject = useAppStore((s) => s.subjects.find((x) => x.id === id))
  const removeSubject = useAppStore((s) => s.removeSubject)
  const [calcOpen, setCalcOpen] = useState(false)

  useEffect(() => {
    if (!subject) navigate({ name: 'calculadora' })
  }, [subject, navigate])

  if (!subject) return null

  const current = currentGrade(subject)
  const res = minGradeToPass(subject)
  const total = realEvaluationCount(subject)
  const graded = gradedEvaluationCount(subject)
  const pct = total === 0 ? 0 : Math.round((graded / total) * 100)
  const invalidWeights = !weightsAreValid(subject)
  const color = `rgb(${accentRgb(subject.color ?? 'gray')})`
  const promedio = current == null ? '0,0' : formatGrade(current)

  function handleDelete() {
    if (confirm(`¿Eliminar "${subject!.name}"? Esta acción no se puede deshacer.`)) {
      removeSubject(id)
      navigate({ name: 'calculadora' })
    }
  }

  // Texto del campo "Necesitas" según el estado.
  const needBox = (() => {
    switch (res.status) {
      case 'ALCANZABLE':
        return { label: 'Necesitas', value: formatGrade(res.needed), tone: 'amber' as const }
      case 'ASEGURADO':
        return { label: 'Necesitas', value: '¡Ya aprobaste!', tone: 'green' as const }
      case 'IMPOSIBLE':
        return { label: 'Necesitas', value: 'Ya no alcanza', tone: 'red' as const }
      default:
        return {
          label: 'Necesitas',
          value: `${formatGrade(subject.scale.pass)} para aprobar`,
          tone: 'gray' as const,
        }
    }
  })()
  const toneClass = {
    green: 'text-emerald-600 dark:text-emerald-300',
    amber: 'text-amber-600 dark:text-amber-300',
    red: 'text-rose-600 dark:text-rose-300',
    gray: 'text-ink/40',
  }[needBox.tone]

  return (
    <div className="h-full overflow-y-auto px-5 pb-36 pt-6">
      {/* Header */}
      <header className="mb-5 flex items-center justify-between">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate({ name: 'calculadora' })}
          className="glass rounded-2xl p-2.5 text-ink/80"
        >
          <ChevronLeft className="h-5 w-5" />
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={handleDelete}
          className="glass rounded-2xl p-2.5 text-rose-500 dark:text-rose-300/90"
        >
          <TrashIcon className="h-5 w-5" />
        </motion.button>
      </header>

      {/* Título */}
      <div className="mb-4 flex items-center gap-3">
        <div
          className="h-11 w-11 shrink-0 rounded-2xl shadow-[var(--card-shadow)]"
          style={{ background: `rgb(${accentRgb(subject.color ?? 'gray')})` }}
        />
        <h1 className="truncate text-[26px] font-bold text-ink">{subject.name}</h1>
      </div>

      {/* Resumen: promedio + necesitas + barra (línea de color a la izquierda) */}
      <div className="glass relative mb-5 overflow-hidden rounded-2xl p-5 pl-6">
        <span className="absolute inset-y-0 left-0 w-1.5" style={{ background: color }} />
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-ink/50">Promedio actual</p>
            <span className="text-4xl font-black tabular-nums text-ink">{promedio}</span>
          </div>
          <div className="text-right">
            <p className="text-sm text-ink/50">{needBox.label}</p>
            <p className={`text-lg font-bold ${toneClass}`}>{needBox.value}</p>
          </div>
        </div>

        {/* Barra de progreso de notas puestas */}
        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between text-xs text-ink/45">
            <span>{total === 0 ? 'Sin notas aún' : `${graded}/${total} notas puestas`}</span>
            <span className="tabular-nums">{pct}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-ink/10">
            <motion.div
              className="h-full rounded-full"
              style={{ background: color }}
              initial={false}
              animate={{ width: `${pct}%` }}
              transition={{ type: 'spring', stiffness: 220, damping: 30 }}
            />
          </div>
        </div>
      </div>

      {invalidWeights && (
        <div className="mb-4 rounded-2xl border border-amber-500/30 bg-amber-400/15 px-4 py-3 text-sm text-amber-700 dark:text-amber-100">
          Los porcentajes de alguna sección no suman 100%. El cálculo se ajusta
          proporcional igual, pero revisa los valores.
        </div>
      )}

      {/* Editor del árbol de evaluación */}
      <NodeEditor subjectId={id} />

      {/* Botón Calcular (fijo abajo) */}
      <div className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md px-5 pb-6 pt-3">
        <GlassButton variant="primary" full onClick={() => setCalcOpen(true)}>
          Calcular
        </GlassButton>
      </div>

      <CalcResultsSheet subject={subject} open={calcOpen} onClose={() => setCalcOpen(false)} />
    </div>
  )
}
