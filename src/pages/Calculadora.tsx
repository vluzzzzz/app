import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { Route } from '../App'
import { useAppStore } from '../store/useAppStore'
import { SubjectCard } from '../features/subjects/SubjectCard'
import { AddSubjectWizard } from '../features/subjects/AddSubjectWizard'
import { CalculatorIcon, PlusIcon } from '../components/ui/Icons'
import { EASE } from '../lib/motion'

export function Calculadora({
  navigate,
  startAdding,
}: {
  navigate: (r: Route) => void
  startAdding?: boolean
}) {
  const subjects = useAppStore((s) => s.subjects)
  const [adding, setAdding] = useState(!!startAdding)

  return (
    <div className="h-full overflow-y-auto px-5 pb-28 pt-6 lg:px-8 lg:pb-10 lg:pt-8">
      <div className="lg:mx-auto lg:max-w-4xl">
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
            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ink text-surface shadow-glass"
          >
            <PlusIcon className="h-6 w-6" />
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
      ) : (
        <motion.div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
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
