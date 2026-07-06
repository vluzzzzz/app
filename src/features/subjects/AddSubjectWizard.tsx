import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useAppStore } from '../../store/useAppStore'
import { ACCENTS, gradient } from '../../lib/colors'
import { EASE } from '../../lib/motion'
import { GlassButton } from '../../components/ui/GlassButton'
import { WeightField } from '../../components/ui/WeightField'
import { Toggle } from '../../components/ui/Toggle'
import {
  ChevronLeft,
  ChevronRight,
  PlusIcon,
  TrashIcon,
} from '../../components/ui/Icons'

type Draft = { name: string; weight: number }

/** Asistente por pasos (in-place) para crear un ramo: 1) nombre, 2) color+subdivisiones. */
export function AddSubjectWizard({
  onDone,
  onCancel,
}: {
  onDone: (id: string) => void
  onCancel: () => void
}) {
  const addSubject = useAppStore((s) => s.addSubject)
  const subjects = useAppStore((s) => s.subjects)
  const [step, setStep] = useState<1 | 2>(1)
  const [name, setName] = useState('')
  const [color, setColor] = useState(ACCENTS[0].id)
  const [hasSubs, setHasSubs] = useState(true)
  const [subs, setSubs] = useState<Draft[]>([
    { name: 'Controles', weight: 20 },
    { name: 'Pruebas', weight: 80 },
  ])

  const sum = subs.reduce((s, d) => s + (d.weight || 0), 0)
  const weightsOk = !hasSubs || Math.abs(sum - 100) < 0.01

  // Nombre único ignorando tildes y mayúsculas (calculo = Càlculo = Calculo).
  const norm = (s: string) =>
    s
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
  const duplicate =
    name.trim() !== '' && subjects.some((s) => norm(s.name) === norm(name))
  const canNext = name.trim() !== '' && !duplicate

  function create() {
    if (!canNext || !weightsOk) return
    const id = addSubject({
      name,
      color,
      subdivisions: hasSubs
        ? subs.filter((d) => d.name.trim() !== '' || d.weight > 0)
        : undefined,
    })
    onDone(id)
  }

  return (
    <div className="flex min-h-[60vh] flex-col">
      <AnimatePresence mode="wait" initial={false}>
        {step === 1 ? (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.25, ease: EASE.smooth }}
            className="flex flex-1 flex-col justify-center"
          >
            <p className="mb-2 text-sm font-medium text-ink/50">Nuevo ramo</p>
            <h2 className="mb-5 text-[26px] font-bold leading-tight text-ink">
              Ingresa el nombre del ramo
            </h2>
            <div className="flex items-center gap-3">
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && canNext) setStep(2)
                }}
                placeholder="Ej: Cálculo I"
                className="min-w-0 flex-1 rounded-2xl border border-ink/15 bg-ink/5 px-4 py-3.5 text-lg text-ink outline-none placeholder:text-ink/30 focus:border-ink/40"
              />
              <motion.button
                whileTap={{ scale: 0.9 }}
                disabled={!canNext}
                onClick={() => canNext && setStep(2)}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-ink text-surface shadow-glass disabled:opacity-30"
              >
                <ChevronRight className="h-6 w-6" />
              </motion.button>
            </div>
            {duplicate && (
              <p className="mt-2 text-sm font-medium text-rose-500 dark:text-rose-300">
                Ya tienes un ramo con ese nombre.
              </p>
            )}
            <button
              onClick={onCancel}
              className="mt-6 self-start text-sm font-medium text-ink/40"
            >
              Cancelar
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 16 }}
            transition={{ duration: 0.25, ease: EASE.smooth }}
            className="flex-1"
          >
            <div className="mb-4 flex items-center gap-2">
              <button
                onClick={() => setStep(1)}
                className="rounded-full p-1.5 text-ink/70 hover:bg-ink/10"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <h2 className="truncate text-xl font-bold text-ink">{name}</h2>
            </div>

            {/* Color */}
            <p className="mb-2 text-sm text-ink/60">Color</p>
            <div className="mb-5 flex flex-wrap gap-2.5">
              {ACCENTS.map((a) => (
                <motion.button
                  key={a.id}
                  whileTap={{ scale: 0.85 }}
                  onClick={() => setColor(a.id)}
                  className={`h-9 w-9 rounded-full ring-2 ring-offset-2 ring-offset-surface transition-all ${
                    color === a.id ? 'ring-ink/80' : 'ring-transparent'
                  }`}
                  style={{ backgroundImage: gradient(a.id) }}
                />
              ))}
            </div>

            {/* Subdivisiones */}
            <div className="mb-3 flex items-center justify-between rounded-2xl border border-ink/10 bg-ink/5 px-4 py-3">
              <div>
                <p className="font-medium text-ink">Subdivisiones</p>
                <p className="text-xs text-ink/50">Ej: Controles 20% + Pruebas 80%</p>
              </div>
              <Toggle on={hasSubs} onToggle={() => setHasSubs((v) => !v)} />
            </div>

            <AnimatePresence initial={false}>
              {hasSubs && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2 overflow-hidden"
                >
                  {subs.map((d, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        value={d.name}
                        onChange={(e) =>
                          setSubs((arr) =>
                            arr.map((x, j) =>
                              j === i ? { ...x, name: e.target.value } : x,
                            ),
                          )
                        }
                        placeholder="Sección"
                        className="flex-1 rounded-2xl border border-ink/15 bg-ink/5 px-3 py-2 text-ink outline-none placeholder:text-ink/30 focus:border-ink/40"
                      />
                      <WeightField
                        value={d.weight}
                        onChange={(w) =>
                          setSubs((arr) =>
                            arr.map((x, j) => (j === i ? { ...x, weight: w } : x)),
                          )
                        }
                      />
                      <button
                        onClick={() =>
                          setSubs((arr) => arr.filter((_, j) => j !== i))
                        }
                        className="rounded-xl p-2 text-ink/40 hover:text-rose-400"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  ))}
                  <div className="flex items-center justify-between pt-1">
                    <GlassButton
                      variant="ghost"
                      onClick={() =>
                        setSubs((arr) => [...arr, { name: '', weight: 0 }])
                      }
                      className="!px-3 !py-2"
                    >
                      <PlusIcon className="h-4 w-4" /> Agregar sección
                    </GlassButton>
                    <span
                      className={`text-sm font-semibold tabular-nums ${
                        weightsOk
                          ? 'text-emerald-600 dark:text-emerald-300'
                          : 'text-rose-500 dark:text-rose-300'
                      }`}
                    >
                      Suma: {sum}%
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mt-5">
              <GlassButton variant="primary" full disabled={!weightsOk} onClick={create}>
                Crear ramo
              </GlassButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
