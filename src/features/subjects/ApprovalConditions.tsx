import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useAppStore } from '../../store/useAppStore'
import { sectionOptions } from '../../lib/grades'
import { formatGrade } from '../../lib/format'
import { CheckIcon, ChevronRight, PlusIcon, TrashIcon } from '../../components/ui/Icons'

/** "Más opciones → Condiciones de aprobación" (opcional, cerrado por defecto). */
export function ApprovalConditions({ subjectId }: { subjectId: string }) {
  const subject = useAppStore((s) => s.subjects.find((x) => x.id === subjectId))
  const addCondition = useAppStore((s) => s.addCondition)
  const removeCondition = useAppStore((s) => s.removeCondition)
  const [open, setOpen] = useState(false)
  const [adding, setAdding] = useState(false)
  const [scopeId, setScopeId] = useState<string>('')
  const [min, setMin] = useState('')

  if (!subject) return null
  const sections = sectionOptions(subject)
  if (sections.length === 0) return null // sin secciones no aplica

  const conds = subject.conditions ?? []
  const nameOf = (id: string) => sections.find((s) => s.id === id)?.name ?? 'Sección'

  const save = () => {
    const v = Number(min.replace(',', '.'))
    if (!scopeId || Number.isNaN(v)) return
    const clamped = Math.min(subject.scale.max, Math.max(subject.scale.min, v))
    addCondition(subjectId, { scopeId, min: clamped })
    setAdding(false)
    setScopeId('')
    setMin('')
  }

  return (
    <div className="glass rounded-3xl p-4">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between">
        <span className="text-[15px] font-semibold text-ink/70">Más opciones</span>
        <ChevronRight className={`h-4 w-4 text-ink/40 transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <p className="mb-2 mt-3 text-sm font-semibold text-ink">Condiciones de aprobación</p>
            <p className="mb-3 text-[13px] leading-snug text-ink/45">
              Reglas extra además del promedio final. Ej: "Cátedra ≥ {formatGrade(subject.scale.pass)}".
            </p>

            {/* Condición fija */}
            <div className="flex items-center gap-2 py-1.5 text-[15px] text-ink/70">
              <CheckIcon className="h-4 w-4 text-emerald-500" />
              Promedio final ≥ {formatGrade(subject.scale.pass)}
            </div>

            {/* Condiciones del usuario */}
            {conds.map((c) => (
              <div key={c.id} className="flex items-center gap-2 py-1.5 text-[15px]">
                <CheckIcon className="h-4 w-4 text-emerald-500" />
                <span className="flex-1 text-ink">
                  {nameOf(c.scopeId)} ≥ {formatGrade(c.min)}
                </span>
                <button
                  onClick={() => removeCondition(subjectId, c.id)}
                  className="rounded-lg p-1.5 text-ink/30 active:bg-ink/5"
                  aria-label="Quitar"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            ))}

            {/* Alta de condición */}
            {adding ? (
              <div className="mt-3 space-y-3 rounded-2xl bg-ink/[0.04] p-3">
                <div>
                  <p className="mb-1.5 text-[13px] font-medium text-ink/55">El promedio de:</p>
                  <div className="flex flex-wrap gap-2">
                    {sections.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => setScopeId(s.id)}
                        className={`rounded-xl px-3 py-1.5 text-sm font-semibold ${
                          scopeId === s.id ? 'bg-ink text-surface' : 'bg-ink/5 text-ink/60'
                        }`}
                      >
                        {s.name}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-medium text-ink/55">debe ser ≥</span>
                  <input
                    inputMode="decimal"
                    value={min}
                    onChange={(e) => {
                      const v = e.target.value.replace(',', '.')
                      if (/^[0-9]*\.?[0-9]*$/.test(v)) setMin(v)
                    }}
                    placeholder={formatGrade(subject.scale.pass)}
                    className="w-16 rounded-xl border border-ink/15 bg-[rgb(var(--card))] py-2 text-center text-[15px] font-bold tabular-nums text-ink outline-none focus:border-ink/40"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={save}
                    disabled={!scopeId || min.trim() === ''}
                    className="flex-1 rounded-xl bg-ink py-2.5 text-sm font-semibold text-surface disabled:opacity-30"
                  >
                    Guardar
                  </button>
                  <button
                    onClick={() => setAdding(false)}
                    className="rounded-xl bg-ink/5 px-4 py-2.5 text-sm font-semibold text-ink/60"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setAdding(true)}
                className="mt-2 flex items-center gap-1 text-sm font-semibold text-ink/55 active:text-ink/70"
              >
                <PlusIcon className="h-4 w-4" /> Agregar condición
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
