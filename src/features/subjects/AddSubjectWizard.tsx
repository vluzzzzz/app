import { useEffect, useRef, useState, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { useAppStore } from '../../store/useAppStore'
import { ACCENT_THEMES } from '../../lib/accents'
import { defaultEvalTree } from '../../lib/gradeTree'
import { NodeEditor } from './NodeEditor'
import { CheckIcon, ChevronLeft, ChevronRight } from '../../components/ui/Icons'

/** Botón negro plano y limpio (sin sombra ni brillo). */
function FlatButton({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <motion.button
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center justify-center gap-1.5 rounded-2xl bg-ink py-4 text-[15px] font-semibold text-surface transition-opacity active:opacity-90 disabled:opacity-30"
    >
      {children}
    </motion.button>
  )
}

const norm = (s: string) =>
  s.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

/** Asistente de creación de ramo en 2 pasos: (1) nombre + color, (2) evaluación. */
export function AddSubjectWizard({
  onDone,
  onCancel,
}: {
  onDone: (id: string) => void
  onCancel: () => void
}) {
  const subjects = useAppStore((s) => s.subjects)
  const addSubject = useAppStore((s) => s.addSubject)
  const removeSubject = useAppStore((s) => s.removeSubject)

  const [step, setStep] = useState<1 | 2>(1)
  const [name, setName] = useState('')
  const [color, setColor] = useState('gray')
  const [createdId, setCreatedId] = useState<string | null>(null)
  const doneRef = useRef(false)

  // Si el usuario se va sin terminar, descarta el borrador creado en el paso 2.
  useEffect(() => {
    return () => {
      if (!doneRef.current && createdId) removeSubject(createdId)
    }
  }, [createdId, removeSubject])

  const trimmed = name.trim()
  const duplicate = subjects.some((s) => norm(s.name) === norm(trimmed) && s.id !== createdId)
  const canNext = trimmed.length > 0 && !duplicate

  function goStep2() {
    if (!canNext) return
    const id = addSubject({ name: trimmed, color, nodes: defaultEvalTree() })
    setCreatedId(id)
    setStep(2)
  }

  function backToStep1() {
    if (createdId) removeSubject(createdId)
    setCreatedId(null)
    setStep(1)
  }

  function finish() {
    if (!createdId) return
    doneRef.current = true
    onDone(createdId)
  }

  return (
    <div className="pb-4">
      {/* Encabezado */}
      <div className="mb-5 flex items-center gap-3">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={step === 1 ? onCancel : backToStep1}
          className="glass rounded-2xl p-2.5 text-ink/80"
        >
          <ChevronLeft className="h-5 w-5" />
        </motion.button>
        <div>
          <h1 className="text-[26px] font-bold leading-tight text-ink">Nuevo ramo</h1>
          <p className="text-sm font-medium text-ink/45">Paso {step} de 2</p>
        </div>
      </div>

      {step === 1 ? (
        <div className="space-y-6">
          {/* Nombre */}
          <div>
            <label className="mb-2 block px-1 text-sm font-medium text-ink/55">
              Nombre del ramo
            </label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && goStep2()}
              placeholder="Ej: Cálculo I"
              className="glass w-full rounded-2xl px-4 py-3.5 text-[15px] text-ink placeholder:text-ink/35 focus:outline-none"
            />
            {duplicate && (
              <p className="mt-1.5 px-1 text-sm text-rose-500">
                Ya tienes un ramo con ese nombre.
              </p>
            )}
          </div>

          {/* Color (paleta de Apariencia) */}
          <div>
            <label className="mb-2.5 block px-1 text-sm font-medium text-ink/55">Color</label>
            <div className="grid grid-cols-5 gap-3">
              {ACCENT_THEMES.map((a) => {
                const selected = color === a.id
                return (
                  <motion.button
                    key={a.id}
                    onClick={() => setColor(a.id)}
                    whileTap={{ scale: 0.9 }}
                    initial={false}
                    animate={{ borderRadius: selected ? '32%' : '50%' }}
                    aria-label={a.label}
                    className="aspect-square"
                    style={{
                      background: `radial-gradient(110% 110% at 32% 28%, rgba(255,255,255,0.4), rgba(255,255,255,0) 52%), rgb(${a.rgb})`,
                      boxShadow: 'inset 0 -3px 6px rgba(0,0,0,0.14)',
                    }}
                  />
                )
              })}
            </div>
          </div>

          <FlatButton onClick={goStep2} disabled={!canNext}>
            Siguiente <ChevronRight className="h-5 w-5" />
          </FlatButton>
        </div>
      ) : (
        <div className="space-y-5">
          <div>
            <h2 className="px-1 text-[19px] font-bold text-ink">¿Cómo se evalúa este ramo?</h2>
            <p className="px-1 text-sm text-ink/45">
              Arma las secciones y sus %. Puedes poner las notas ahora o después.
            </p>
          </div>

          {createdId && <NodeEditor subjectId={createdId} />}

          {/* Crear ramo (en el flujo, sobre la nav) */}
          <div className="pt-2">
            <FlatButton onClick={finish}>
              <CheckIcon className="h-5 w-5" /> Crear ramo
            </FlatButton>
          </div>
        </div>
      )}
    </div>
  )
}
