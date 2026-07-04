import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { GlassSheet } from '../../components/ui/GlassSheet'
import { GlassButton } from '../../components/ui/GlassButton'
import { WeightField } from '../../components/ui/WeightField'
import { PlusIcon, TrashIcon } from '../../components/ui/Icons'
import { ACCENTS, gradient } from '../../lib/colors'
import { useAppStore } from '../../store/useAppStore'

type Draft = { name: string; weight: number }

export function AddSubjectSheet({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: (id: string) => void
}) {
  const addSubject = useAppStore((s) => s.addSubject)

  const [name, setName] = useState('')
  const [color, setColor] = useState(ACCENTS[0].id)
  const [hasSubs, setHasSubs] = useState(true)
  const [subs, setSubs] = useState<Draft[]>([
    { name: 'Controles', weight: 20 },
    { name: 'Pruebas', weight: 80 },
  ])

  const sum = subs.reduce((s, d) => s + (d.weight || 0), 0)
  const weightsOk = !hasSubs || Math.abs(sum - 100) < 0.01
  const canSave = name.trim() !== '' && weightsOk

  function reset() {
    setName('')
    setColor(ACCENTS[0].id)
    setHasSubs(true)
    setSubs([
      { name: 'Controles', weight: 20 },
      { name: 'Pruebas', weight: 80 },
    ])
  }

  function save() {
    if (!canSave) return
    const id = addSubject({
      name,
      color,
      subdivisions: hasSubs
        ? subs.filter((d) => d.name.trim() !== '' || d.weight > 0)
        : undefined,
    })
    reset()
    onClose()
    onCreated(id)
  }

  return (
    <GlassSheet open={open} onClose={onClose} title="Nueva asignatura">
      <div className="space-y-5">
        {/* Nombre */}
        <div>
          <label className="mb-2 block text-sm text-ink/60">Nombre</label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Cálculo I"
            className="w-full rounded-2xl border border-ink/15 bg-ink/5 px-4 py-3 text-lg text-ink outline-none placeholder:text-ink/30 focus:border-ink/40"
          />
        </div>

        {/* Color */}
        <div>
          <label className="mb-2 block text-sm text-ink/60">Color</label>
          <div className="flex flex-wrap gap-2.5">
            {ACCENTS.map((a) => (
              <motion.button
                key={a.id}
                whileTap={{ scale: 0.85 }}
                onClick={() => setColor(a.id)}
                className={`h-9 w-9 rounded-full ring-2 ring-offset-2 ring-offset-transparent transition-all ${
                  color === a.id ? 'ring-ink/80' : 'ring-transparent'
                }`}
                style={{ backgroundImage: gradient(a.id) }}
              />
            ))}
          </div>
        </div>

        {/* Toggle subdivisiones */}
        <div className="flex items-center justify-between rounded-2xl border border-ink/10 bg-ink/5 px-4 py-3">
          <div>
            <p className="font-medium text-ink">Subdivisiones</p>
            <p className="text-xs text-ink/50">
              Ej: Controles 20% + Pruebas 80%
            </p>
          </div>
          <Toggle on={hasSubs} onToggle={() => setHasSubs((v) => !v)} />
        </div>

        {/* Editor de subdivisiones */}
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
                    className="rounded-xl p-2 text-ink/40 hover:text-rose-300"
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
                    weightsOk ? 'text-emerald-300' : 'text-rose-300'
                  }`}
                >
                  Suma: {sum}%
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <GlassButton variant="primary" full disabled={!canSave} onClick={save}>
          Crear asignatura
        </GlassButton>
      </div>
    </GlassSheet>
  )
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`relative h-7 w-12 rounded-full transition-colors ${
        on ? 'bg-emerald-400' : 'bg-ink/20'
      }`}
    >
      <motion.span
        layout
        transition={{ type: 'spring', stiffness: 500, damping: 32 }}
        className="absolute top-0.5 h-6 w-6 rounded-full bg-ink shadow"
        style={{ left: on ? 22 : 2 }}
      />
    </button>
  )
}
