import { AnimatePresence, motion } from 'framer-motion'
import { useAppStore } from '../../store/useAppStore'
import type { GradeNode, GradeScale } from '../../lib/types'
import { GradeInput } from '../../components/ui/GradeInput'
import { Stepper } from '../../components/ui/Stepper'
import { PlusIcon, TrashIcon } from '../../components/ui/Icons'

/** Suma de pesos de un grupo de hermanos. */
const weightSum = (nodes: GradeNode[]) => nodes.reduce((s, n) => s + (n.weight || 0), 0)

/** Input compacto de % (peso dentro del padre). */
function WeightInput({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center gap-0.5">
      <input
        inputMode="decimal"
        value={value === 0 ? '' : String(value)}
        placeholder="0"
        onChange={(e) => {
          const v = e.target.value.replace(',', '.')
          if (/^[0-9]*\.?[0-9]*$/.test(v)) onChange(v === '' ? 0 : Number(v))
        }}
        className="w-12 rounded-xl border border-ink/15 bg-ink/5 py-1.5 text-center text-sm font-semibold tabular-nums text-ink outline-none focus:border-ink/40"
      />
      <span className="text-sm text-ink/40">%</span>
    </div>
  )
}

/** Indicador "Suma: X%" (verde si ~100, ámbar si no). */
function SumTag({ nodes }: { nodes: GradeNode[] }) {
  if (nodes.length === 0) return null
  const sum = Math.round(weightSum(nodes) * 10) / 10
  const ok = Math.abs(sum - 100) < 0.5
  return (
    <span
      className={`text-xs font-semibold ${ok ? 'text-emerald-600 dark:text-emerald-300' : 'text-amber-600 dark:text-amber-300'}`}
    >
      Suma: {sum}%
    </span>
  )
}

function NameInput({
  value,
  bold,
  onChange,
}: {
  value: string
  bold?: boolean
  onChange: (s: string) => void
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`min-w-0 flex-1 rounded-lg bg-transparent px-1 py-1 text-ink outline-none focus:bg-ink/5 ${
        bold ? 'text-[15px] font-semibold' : 'text-[15px]'
      }`}
    />
  )
}

function Node({
  subjectId,
  node,
  scale,
  depth,
}: {
  subjectId: string
  node: GradeNode
  scale: GradeScale
  depth: number
}) {
  const updateNode = useAppStore((s) => s.updateNode)
  const removeNode = useAppStore((s) => s.removeNode)
  const addNode = useAppStore((s) => s.addNode)
  const setChildCount = useAppStore((s) => s.setChildCount)

  // Hoja (nota)
  if (node.children === undefined) {
    return (
      <div className="flex items-center gap-2 rounded-2xl bg-ink/[0.03] px-3 py-2">
        <NameInput value={node.name} onChange={(name) => updateNode(subjectId, node.id, { name })} />
        <WeightInput value={node.weight} onChange={(weight) => updateNode(subjectId, node.id, { weight })} />
        <GradeInput
          value={node.grade ?? null}
          scale={scale}
          onChange={(grade) => updateNode(subjectId, node.id, { grade })}
        />
        <button
          onClick={() => removeNode(subjectId, node.id)}
          className="shrink-0 rounded-lg p-1.5 text-ink/30 active:bg-ink/5"
          aria-label="Quitar"
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      </div>
    )
  }

  // Carpeta (sección / subgrupo)
  const children = node.children
  const childrenAreLeaves = children.length > 0 && children.every((c) => c.children === undefined)

  return (
    <div className={depth === 0 ? 'glass rounded-3xl p-3.5' : 'rounded-2xl bg-ink/[0.04] p-3'}>
      <div className="mb-2 flex items-center gap-2">
        <NameInput bold value={node.name} onChange={(name) => updateNode(subjectId, node.id, { name })} />
        <WeightInput value={node.weight} onChange={(weight) => updateNode(subjectId, node.id, { weight })} />
        <button
          onClick={() => removeNode(subjectId, node.id)}
          className="shrink-0 rounded-lg p-1.5 text-ink/30 active:bg-ink/5"
          aria-label="Quitar"
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-2 pl-2">
        <AnimatePresence initial={false}>
          {children.map((c) => (
            <motion.div
              key={c.id}
              layout
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97 }}
            >
              <Node subjectId={subjectId} node={c} scale={scale} depth={depth + 1} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-2 pl-2">
        {childrenAreLeaves && (
          <div className="mr-1 flex items-center gap-2 rounded-xl bg-ink/5 px-2.5 py-1.5">
            <span className="text-xs text-ink/50">Notas</span>
            <Stepper value={children.length} onChange={(n) => setChildCount(subjectId, node.id, n)} />
          </div>
        )}
        <button
          onClick={() => addNode(subjectId, node.id, { name: 'Nota', folder: false })}
          className="flex items-center gap-1 rounded-xl bg-ink/5 px-2.5 py-1.5 text-xs font-semibold text-ink/60 active:bg-ink/10"
        >
          <PlusIcon className="h-3.5 w-3.5" /> Nota
        </button>
        <button
          onClick={() => addNode(subjectId, node.id, { name: 'Subgrupo', folder: true })}
          className="flex items-center gap-1 rounded-xl bg-ink/5 px-2.5 py-1.5 text-xs font-semibold text-ink/60 active:bg-ink/10"
        >
          <PlusIcon className="h-3.5 w-3.5" /> Subgrupo
        </button>
        <SumTag nodes={children} />
      </div>
    </div>
  )
}

/** Editor recursivo del árbol de evaluación de un ramo. */
export function NodeEditor({ subjectId }: { subjectId: string }) {
  const subject = useAppStore((s) => s.subjects.find((x) => x.id === subjectId))
  const addNode = useAppStore((s) => s.addNode)
  if (!subject) return null

  return (
    <div className="space-y-3">
      <AnimatePresence initial={false}>
        {subject.nodes.map((n) => (
          <motion.div
            key={n.id}
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97 }}
          >
            <Node subjectId={subjectId} node={n} scale={subject.scale} depth={0} />
          </motion.div>
        ))}
      </AnimatePresence>

      <div className="flex items-center justify-between px-1">
        <button
          onClick={() => addNode(subjectId, null, { name: 'Sección', folder: true })}
          className="flex items-center gap-1.5 rounded-xl bg-ink/5 px-3 py-2 text-sm font-semibold text-ink/70 active:bg-ink/10"
        >
          <PlusIcon className="h-4 w-4" /> Agregar sección
        </button>
        <SumTag nodes={subject.nodes} />
      </div>
    </div>
  )
}
