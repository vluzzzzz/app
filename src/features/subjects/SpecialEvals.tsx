import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useAppStore } from '../../store/useAppStore'
import { GradeInput } from '../../components/ui/GradeInput'
import { ChevronRight, PlusIcon, TrashIcon } from '../../components/ui/Icons'

/** "Evaluaciones especiales" (botón propio): prueba optativa con % editables. */
export function SpecialEvals({ subjectId }: { subjectId: string }) {
  const subject = useAppStore((s) => s.subjects.find((x) => x.id === subjectId))
  const addOptativa = useAppStore((s) => s.addOptativa)
  const removeOptativa = useAppStore((s) => s.removeOptativa)
  const setOptativaGrade = useAppStore((s) => s.setOptativaGrade)
  const setOptativaSplit = useAppStore((s) => s.setOptativaSplit)
  const [open, setOpen] = useState(false)

  if (!subject) return null
  const opt = subject.optativa

  return (
    <div className="glass rounded-3xl p-4">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between">
        <span className="text-[15px] font-semibold text-ink/70">Evaluaciones especiales</span>
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
            <div className="pt-3">
              {!opt ? (
                <>
                  <p className="mb-2 text-[13px] leading-snug text-ink/45">
                    Prueba optativa: reemplaza parte de tu promedio (por defecto actual 60% ·
                    optativa 40%).
                  </p>
                  <button
                    onClick={() => addOptativa(subjectId)}
                    className="flex items-center gap-1 text-sm font-semibold text-ink/55 active:text-ink/70"
                  >
                    <PlusIcon className="h-4 w-4" /> Agregar prueba optativa
                  </button>
                </>
              ) : (
                <div className="space-y-2.5 rounded-2xl bg-ink/[0.04] p-3">
                  <p className="text-[15px] font-semibold text-ink">Prueba optativa</p>
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] text-ink/55">Tu promedio actual pesa</span>
                    <div className="flex items-center gap-1">
                      <input
                        inputMode="numeric"
                        value={opt.actualPct}
                        onChange={(e) => {
                          const v = e.target.value.replace(/[^0-9]/g, '')
                          if (v !== '') setOptativaSplit(subjectId, Math.min(100, Number(v)))
                        }}
                        className="w-12 rounded-xl border border-ink/15 bg-[rgb(var(--card))] py-1.5 text-center text-[15px] font-bold tabular-nums text-ink outline-none focus:border-ink/40"
                      />
                      <span className="text-sm text-ink/50">%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] text-ink/55">La optativa pesa</span>
                    <div className="flex items-center gap-1">
                      <input
                        inputMode="numeric"
                        value={100 - opt.actualPct}
                        onChange={(e) => {
                          const v = e.target.value.replace(/[^0-9]/g, '')
                          if (v !== '') setOptativaSplit(subjectId, 100 - Math.min(100, Number(v)))
                        }}
                        className="w-12 rounded-xl border border-ink/15 bg-[rgb(var(--card))] py-1.5 text-center text-[15px] font-bold tabular-nums text-ink outline-none focus:border-ink/40"
                      />
                      <span className="text-sm text-ink/50">%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-t border-ink/10 pt-2.5">
                    <span className="text-[13px] text-ink/55">Tu nota en la optativa</span>
                    <GradeInput
                      value={opt.grade}
                      scale={subject.scale}
                      onChange={(g) => setOptativaGrade(subjectId, g)}
                    />
                  </div>
                  <button
                    onClick={() => removeOptativa(subjectId)}
                    className="flex items-center gap-1 text-[13px] font-semibold text-rose-500 active:text-rose-600"
                  >
                    <TrashIcon className="h-3.5 w-3.5" /> Quitar optativa
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
