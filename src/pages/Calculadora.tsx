import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { Route } from '../App'
import { useAppStore } from '../store/useAppStore'
import { SubjectCard } from '../features/subjects/SubjectCard'
import { AddSubjectWizard } from '../features/subjects/AddSubjectWizard'
import { SubjectDetail } from '../features/subjects/SubjectDetail'
import { useIsDesktop } from '../lib/useIsDesktop'
import { CalculatorIcon, PlusIcon } from '../components/ui/Icons'
import { EASE } from '../lib/motion'

export function Calculadora({
  navigate,
  startAdding,
}: {
  navigate: (r: Route) => void
  startAdding?: boolean
}) {
  const isDesktop = useIsDesktop()
  const subjects = useAppStore((s) => s.subjects)
  const [adding, setAdding] = useState(!!startAdding)
  // PC: ramo seleccionado para el panel de detalle (lista + detalle simultáneo).
  const [selected, setSelected] = useState<string | null>(null)
  const selId = subjects.some((s) => s.id === selected) ? selected : (subjects[0]?.id ?? null)

  return (
    <div className="h-full overflow-y-auto px-5 pb-28 pt-6 lg:px-8 lg:pb-10 lg:pt-8">
      <div className="lg:mx-auto lg:max-w-6xl">
      <header className="mb-6 flex items-end justify-between">
        <div>
          <p className="text-sm font-medium text-ink/50">Tus ramos</p>
          <h1 className="text-[34px] font-bold leading-tight text-ink">
            Calculadora
          </h1>
        </div>
        {!adding && (
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setAdding(true)}
            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ink text-surface shadow-glass lg:w-auto lg:gap-2 lg:px-4"
          >
            <PlusIcon className="h-6 w-6 lg:h-5 lg:w-5" />
            <span className="hidden text-[15px] font-semibold lg:inline">Agregar ramo</span>
          </motion.button>
        )}
      </header>

      {adding ? (
        <AddSubjectWizard
          onCancel={() => setAdding(false)}
          onDone={(id) => {
            setAdding(false)
            navigate({ name: 'subject', id })
          }}
        />
      ) : subjects.length === 0 ? (
        <EmptyState onAdd={() => setAdding(true)} />
      ) : isDesktop ? (
        /* PC: lista de ramos a la izquierda + detalle en vivo a la derecha
           (sin cambiar de página, como una app de escritorio de verdad). */
        <div className="grid grid-cols-[320px_minmax(0,1fr)] items-start gap-6">
          <div className="space-y-3">
            {subjects.map((s) => (
              <div
                key={s.id}
                className={`rounded-2xl transition-shadow ${
                  selId === s.id ? 'ring-2 ring-ink/70' : ''
                }`}
              >
                <SubjectCard subject={s} onOpen={() => setSelected(s.id)} />
              </div>
            ))}
          </div>
          <div className="min-w-0">
            {selId && (
              <SubjectDetail
                id={selId}
                embedded
                navigate={(r) => {
                  // Al borrar el ramo, el detalle "vuelve a calculadora":
                  // acá eso significa seleccionar el siguiente de la lista.
                  if (r.name === 'calculadora') setSelected(null)
                  else navigate(r)
                }}
              />
            )}
          </div>
        </div>
      ) : (
        <motion.div className="space-y-3">
          <AnimatePresence initial={false}>
            {subjects.map((s, i) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94 }}
                transition={{ duration: 0.4, ease: EASE.standard, delay: i * 0.04 }}
              >
                <SubjectCard
                  subject={s}
                  onOpen={() => navigate({ name: 'subject', id: s.id })}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
      </div>
    </div>
  )
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass glass-highlight mt-10 rounded-4xl p-8 text-center"
    >
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-ink/5 text-ink">
        <CalculatorIcon className="h-7 w-7" />
      </div>
      <h2 className="mb-1 text-xl font-semibold text-ink">
        Aún no tienes asignaturas
      </h2>
      <p className="mb-6 text-sm text-ink/55">
        Agrega tu primer ramo y calcula qué nota necesitas para salvar el
        semestre.
      </p>
      <button
        onClick={onAdd}
        className="inline-flex items-center gap-2 rounded-3xl bg-ink px-5 py-3 font-semibold text-surface"
      >
        <PlusIcon className="h-5 w-5" /> Agregar ramo
      </button>
    </motion.div>
  )
}
