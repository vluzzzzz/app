import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { Route } from '../App'
import { useAppStore } from '../store/useAppStore'
import { SubjectCard } from '../features/subjects/SubjectCard'
import { AddSubjectSheet } from '../features/subjects/AddSubjectSheet'
import { PlusIcon } from '../components/ui/Icons'
import { EASE } from '../lib/motion'

export function Calculadora({ navigate }: { navigate: (r: Route) => void }) {
  const subjects = useAppStore((s) => s.subjects)
  const [adding, setAdding] = useState(false)

  return (
    <div className="h-full overflow-y-auto px-5 pb-28 pt-6">
      <header className="mb-6 flex items-end justify-between">
        <div>
          <p className="text-sm font-medium text-ink/50">Tus ramos</p>
          <h1 className="text-[34px] font-bold leading-tight text-ink">
            Calculadora
          </h1>
        </div>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setAdding(true)}
          className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ink text-surface shadow-glass"
        >
          <PlusIcon className="h-6 w-6" />
        </motion.button>
      </header>

      {subjects.length === 0 ? (
        <EmptyState onAdd={() => setAdding(true)} />
      ) : (
        <motion.div layout className="space-y-3">
          <AnimatePresence initial={false}>
            {subjects.map((s, i) => (
              <motion.div
                key={s.id}
                layout
                initial={{ opacity: 0, y: 12, scale: 0.985, filter: 'blur(8px)' }}
                animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, scale: 0.94 }}
                transition={{ duration: 0.5, ease: EASE.overshoot, delay: i * 0.05 }}
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

      <AddSubjectSheet
        open={adding}
        onClose={() => setAdding(false)}
        onCreated={(id) => navigate({ name: 'subject', id })}
      />
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
      <div className="mb-4 text-5xl">🎓</div>
      <h2 className="mb-1 text-xl font-semibold text-ink">
        Aún no tienes asignaturas
      </h2>
      <p className="mb-6 text-sm text-ink/55">
        Agrega tu primera asignatura y calcula qué nota necesitas para salvar el
        semestre.
      </p>
      <button
        onClick={onAdd}
        className="inline-flex items-center gap-2 rounded-3xl bg-ink px-5 py-3 font-semibold text-surface"
      >
        <PlusIcon className="h-5 w-5" /> Agregar asignatura
      </button>
    </motion.div>
  )
}
