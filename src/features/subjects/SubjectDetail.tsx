import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState, type ReactNode } from 'react'
import type { Route } from '../../App'
import { useAppStore } from '../../store/useAppStore'
import { gradient } from '../../lib/colors'
import { formatGrade } from '../../lib/format'
import {
  currentGrade,
  evalWeightsValid,
  minGradeToPass,
  weightsAreValid,
} from '../../lib/grades'
import type { Evaluation, GradeScale } from '../../lib/types'
import { EvaluationRow } from './EvaluationRow'
import { CalcResultsSheet } from './CalcResultsSheet'
import { GlassButton } from '../../components/ui/GlassButton'
import { Toggle } from '../../components/ui/Toggle'
import { Stepper } from '../../components/ui/Stepper'
import { StatusPill } from '../../components/ui/StatusPill'
import { ChevronLeft, PlusIcon, TrashIcon } from '../../components/ui/Icons'

export function SubjectDetail({
  id,
  navigate,
}: {
  id: string
  navigate: (r: Route) => void
}) {
  const subject = useAppStore((s) => s.subjects.find((x) => x.id === id))
  const addEvaluation = useAppStore((s) => s.addEvaluation)
  const updateEvaluation = useAppStore((s) => s.updateEvaluation)
  const removeEvaluation = useAppStore((s) => s.removeEvaluation)
  const removeSubject = useAppStore((s) => s.removeSubject)
  const setWeightedEvals = useAppStore((s) => s.setWeightedEvals)
  const setEvalCount = useAppStore((s) => s.setEvalCount)

  const [calcOpen, setCalcOpen] = useState(false)

  useEffect(() => {
    if (!subject) navigate({ name: 'calculadora' })
  }, [subject, navigate])

  if (!subject) return null

  const hasSubs = subject.subdivisions.length > 0
  const invalidWeights = hasSubs && !weightsAreValid(subject)
  const invalidEvalWeights = !evalWeightsValid(subject)
  const current = currentGrade(subject)
  const res = minGradeToPass(subject)

  function handleDelete() {
    if (confirm(`¿Eliminar "${subject!.name}"? Esta acción no se puede deshacer.`)) {
      removeSubject(id)
      navigate({ name: 'calculadora' })
    }
  }

  return (
    <div className="min-h-screen px-5 pb-28 pt-6">
      {/* Header */}
      <header className="mb-5 flex items-center justify-between">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate({ name: 'calculadora' })}
          className="glass glass-highlight rounded-2xl p-2.5 text-ink/80"
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

      {/* Título + nota actual pequeña */}
      <div className="mb-5 flex items-center gap-3">
        <div
          className="h-11 w-11 rounded-2xl shadow-glass"
          style={{ backgroundImage: gradient(subject.color) }}
        />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[26px] font-bold text-ink">
            {subject.name}
          </h1>
          <div className="flex items-center gap-2 text-sm text-ink/55">
            <span>
              Nota actual{' '}
              <b className="tabular-nums text-ink/80">{formatGrade(current)}</b>
            </span>
            <StatusPill status={res.status} />
          </div>
        </div>
      </div>

      {/* Opción: porcentaje por nota */}
      <div className="glass glass-highlight mb-4 flex items-center justify-between rounded-3xl p-4">
        <div className="min-w-0 pr-3">
          <p className="font-medium text-ink">Porcentaje por nota</p>
          <p className="text-xs text-ink/50">
            Cada evaluación con su propio %. Si no, se promedian igual.
          </p>
        </div>
        <Toggle
          on={!!subject.weightedEvals}
          onToggle={() => setWeightedEvals(id, !subject.weightedEvals)}
        />
      </div>

      {invalidWeights && (
        <Warning>
          Las ponderaciones de las secciones no suman 100%. El cálculo se ajusta
          proporcionalmente igual.
        </Warning>
      )}
      {invalidEvalWeights && (
        <Warning>
          Los % por nota no suman 100% en alguna sección. Revisa los valores.
        </Warning>
      )}

      {/* Secciones / evaluaciones */}
      {hasSubs ? (
        <div className="space-y-4">
          {subject.subdivisions.map((sub) => (
            <div key={sub.id} className="glass glass-highlight rounded-4xl p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="text-base font-semibold text-ink">{sub.name}</h3>
                <span className="rounded-full bg-ink/10 px-2.5 py-1 text-xs font-semibold text-ink/70">
                  {sub.weight}%
                </span>
              </div>

              <div className="mb-3 flex items-center justify-between rounded-2xl bg-ink/5 px-3 py-2">
                <span className="text-sm text-ink/60">Cantidad de notas</span>
                <Stepper
                  value={sub.evaluations.length}
                  onChange={(n) => setEvalCount(id, sub.id, n)}
                />
              </div>

              <EvalList
                evals={sub.evaluations}
                scale={subject.scale}
                weighted={subject.weightedEvals}
                onName={(evalId, name) =>
                  updateEvaluation(id, sub.id, evalId, { name })
                }
                onGrade={(evalId, grade) =>
                  updateEvaluation(id, sub.id, evalId, { grade })
                }
                onWeight={(evalId, weight) =>
                  updateEvaluation(id, sub.id, evalId, { weight })
                }
                onRemove={(evalId) => removeEvaluation(id, sub.id, evalId)}
              />

              <AddEvalButton
                onClick={() =>
                  addEvaluation(id, sub.id, `${sub.name} ${sub.evaluations.length + 1}`)
                }
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="glass glass-highlight rounded-4xl p-4">
          <div className="mb-3 flex items-center justify-between rounded-2xl bg-ink/5 px-3 py-2">
            <span className="text-sm text-ink/60">Cantidad de notas</span>
            <Stepper
              value={subject.looseEvaluations.length}
              onChange={(n) => setEvalCount(id, null, n)}
            />
          </div>
          <EvalList
            evals={subject.looseEvaluations}
            scale={subject.scale}
            weighted={subject.weightedEvals}
            onName={(evalId, name) => updateEvaluation(id, null, evalId, { name })}
            onGrade={(evalId, grade) =>
              updateEvaluation(id, null, evalId, { grade })
            }
            onWeight={(evalId, weight) =>
              updateEvaluation(id, null, evalId, { weight })
            }
            onRemove={(evalId) => removeEvaluation(id, null, evalId)}
          />
          <AddEvalButton
            onClick={() =>
              addEvaluation(id, null, `Nota ${subject.looseEvaluations.length + 1}`)
            }
          />
        </div>
      )}

      {/* Botón Calcular (fijo abajo) */}
      <div className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md px-5 pb-6 pt-3">
        <GlassButton variant="primary" full onClick={() => setCalcOpen(true)}>
          Calcular 🧮
        </GlassButton>
      </div>

      <CalcResultsSheet
        subject={subject}
        open={calcOpen}
        onClose={() => setCalcOpen(false)}
      />
    </div>
  )
}

function EvalList({
  evals,
  scale,
  weighted,
  onName,
  onGrade,
  onWeight,
  onRemove,
}: {
  evals: Evaluation[]
  scale: GradeScale
  weighted?: boolean
  onName: (evalId: string, name: string) => void
  onGrade: (evalId: string, grade: number | null) => void
  onWeight: (evalId: string, weight: number) => void
  onRemove: (evalId: string) => void
}) {
  if (evals.length === 0) {
    return (
      <p className="px-1 py-2 text-sm text-ink/40">
        Sin evaluaciones. Usa la cantidad de arriba o el botón de abajo.
      </p>
    )
  }
  return (
    <div className="space-y-2">
      <AnimatePresence initial={false}>
        {evals.map((ev) => (
          <EvaluationRow
            key={ev.id}
            evaluation={ev}
            scale={scale}
            weighted={weighted}
            onName={(name) => onName(ev.id, name)}
            onGrade={(grade) => onGrade(ev.id, grade)}
            onWeight={(weight) => onWeight(ev.id, weight)}
            onRemove={() => onRemove(ev.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}

function AddEvalButton({ onClick }: { onClick: () => void }) {
  return (
    <div className="mt-3">
      <GlassButton variant="ghost" onClick={onClick} className="!px-3 !py-2">
        <PlusIcon className="h-4 w-4" /> Agregar evaluación
      </GlassButton>
    </div>
  )
}

function Warning({ children }: { children: ReactNode }) {
  return (
    <div className="mb-4 rounded-2xl border border-amber-500/30 bg-amber-400/15 px-4 py-3 text-sm text-amber-700 dark:text-amber-100">
      {children}
    </div>
  )
}
