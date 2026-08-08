import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useAppStore } from '../../store/useAppStore'
import { accentRgb } from '../../lib/accents'
import type { GradeNode, GradeScale } from '../../lib/types'
import { GradeInput } from '../../components/ui/GradeInput'
import { Stepper } from '../../components/ui/Stepper'
import { ChevronRight, FolderIcon, PlusIcon, TrashIcon } from '../../components/ui/Icons'

/** Colores de identidad por sección (se ciclan). */
const PALETTE = ['violet', 'blue', 'cyan', 'green', 'orange', 'pink', 'red', 'indigo']
const sectionColor = (i: number) => `rgb(${accentRgb(PALETTE[i % PALETTE.length])})`

const weightSum = (nodes: GradeNode[]) => nodes.reduce((s, n) => s + (n.weight || 0), 0)
const areLeaves = (nodes: GradeNode[]) =>
  nodes.length > 0 && nodes.every((c) => c.children === undefined)

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

/** % editable, estilo texto limpio (sin caja). */
function WeightPill({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <span className="flex shrink-0 items-center">
      <input
        inputMode="decimal"
        value={value === 0 ? '' : String(value)}
        placeholder="0"
        onChange={(e) => {
          const v = e.target.value.replace(',', '.')
          if (/^[0-9]*\.?[0-9]*$/.test(v)) onChange(v === '' ? 0 : Number(v))
        }}
        className="w-8 rounded-md bg-transparent text-right text-sm font-semibold tabular-nums text-ink/60 outline-none focus:bg-ink/5"
      />
      <span className="text-sm text-ink/40">%</span>
    </span>
  )
}

function NameInput({
  value,
  onChange,
  bold,
}: {
  value: string
  onChange: (s: string) => void
  bold?: boolean
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`min-w-0 flex-1 rounded-md bg-transparent px-1 py-0.5 text-ink outline-none focus:bg-ink/5 ${
        bold ? 'text-[15px] font-semibold' : 'text-[15px]'
      }`}
    />
  )
}

function Dot({ color, small }: { color: string; small?: boolean }) {
  return (
    <span
      className={`${small ? 'h-2 w-2' : 'h-2.5 w-2.5'} shrink-0 rounded-full`}
      style={{ background: color }}
    />
  )
}

function TrashBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="shrink-0 rounded-lg p-1.5 text-ink/25 active:bg-ink/5"
      aria-label="Quitar"
    >
      <TrashIcon className="h-4 w-4" />
    </button>
  )
}

function AddLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 text-sm font-medium text-ink/50 active:text-ink/70"
    >
      <PlusIcon className="h-4 w-4" /> {label}
    </button>
  )
}

/** Fila de nota (hoja): puntito + nombre + % + input de nota. */
function NoteRow({
  subjectId,
  node,
  scale,
  color,
}: {
  subjectId: string
  node: GradeNode
  scale: GradeScale
  color: string
}) {
  const updateNode = useAppStore((s) => s.updateNode)
  const removeNode = useAppStore((s) => s.removeNode)
  return (
    <div className="flex items-center gap-2.5 py-1">
      <Dot small color={color} />
      <NameInput value={node.name} onChange={(name) => updateNode(subjectId, node.id, { name })} />
      <WeightPill value={node.weight} onChange={(weight) => updateNode(subjectId, node.id, { weight })} />
      <GradeInput
        value={node.grade ?? null}
        scale={scale}
        onChange={(grade) => updateNode(subjectId, node.id, { grade })}
      />
      <TrashBtn onClick={() => removeNode(subjectId, node.id)} />
    </div>
  )
}

/** Controles para agregar dentro de una carpeta (nota / subgrupo / stepper). */
function FolderControls({
  subjectId,
  node,
}: {
  subjectId: string
  node: GradeNode
}) {
  const addNode = useAppStore((s) => s.addNode)
  const setChildCount = useAppStore((s) => s.setChildCount)
  const children = node.children ?? []
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
      {areLeaves(children) && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-ink/45">Notas</span>
          <Stepper value={children.length} onChange={(n) => setChildCount(subjectId, node.id, n)} />
        </div>
      )}
      <AddLink label="Agregar evaluación" onClick={() => addNode(subjectId, node.id, { name: 'Nota', folder: false })} />
      <AddLink label="Subgrupo" onClick={() => addNode(subjectId, node.id, { name: 'Subgrupo', folder: true })} />
      <SumTag nodes={children} />
    </div>
  )
}

/** Subgrupo (carpeta anidada): fila compacta con puntito, colapsable. */
function Subgroup({
  subjectId,
  node,
  scale,
  color,
  expanded,
  toggle,
}: {
  subjectId: string
  node: GradeNode
  scale: GradeScale
  color: string
  expanded: Set<string>
  toggle: (id: string) => void
}) {
  const updateNode = useAppStore((s) => s.updateNode)
  const removeNode = useAppStore((s) => s.removeNode)
  const isOpen = expanded.has(node.id)
  const children = node.children ?? []

  return (
    <div>
      <div className="flex items-center gap-2.5 py-1.5">
        <Dot color={color} />
        <NameInput value={node.name} onChange={(name) => updateNode(subjectId, node.id, { name })} />
        <WeightPill value={node.weight} onChange={(weight) => updateNode(subjectId, node.id, { weight })} />
        <button
          onClick={() => toggle(node.id)}
          className="shrink-0 rounded-lg p-1 text-ink/40 active:bg-ink/5"
          aria-label={isOpen ? 'Minimizar' : 'Expandir'}
        >
          <ChevronRight className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
        </button>
      </div>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="ml-1 overflow-hidden border-l border-ink/10 pl-3"
          >
            <div className="space-y-0.5 pt-1">
              {children.map((c) =>
                c.children === undefined ? (
                  <NoteRow key={c.id} subjectId={subjectId} node={c} scale={scale} color={color} />
                ) : (
                  <Subgroup
                    key={c.id}
                    subjectId={subjectId}
                    node={c}
                    scale={scale}
                    color={color}
                    expanded={expanded}
                    toggle={toggle}
                  />
                ),
              )}
            </div>
            <div className="flex items-center justify-between">
              <FolderControls subjectId={subjectId} node={node} />
              <TrashBtn onClick={() => removeNode(subjectId, node.id)} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/** Sección tope: tarjeta con ícono de carpeta de color. Siempre expandida. */
function Section({
  subjectId,
  node,
  scale,
  color,
  expanded,
  toggle,
}: {
  subjectId: string
  node: GradeNode
  scale: GradeScale
  color: string
  expanded: Set<string>
  toggle: (id: string) => void
}) {
  const updateNode = useAppStore((s) => s.updateNode)
  const removeNode = useAppStore((s) => s.removeNode)
  const children = node.children ?? []

  return (
    <div className="glass rounded-3xl p-4">
      <div className="mb-1.5 flex items-center gap-2.5">
        <span className="shrink-0" style={{ color }}>
          <FolderIcon className="h-5 w-5" />
        </span>
        <NameInput bold value={node.name} onChange={(name) => updateNode(subjectId, node.id, { name })} />
        <WeightPill value={node.weight} onChange={(weight) => updateNode(subjectId, node.id, { weight })} />
        <TrashBtn onClick={() => removeNode(subjectId, node.id)} />
      </div>

      <div className="space-y-0.5">
        {children.map((c) =>
          c.children === undefined ? (
            <NoteRow key={c.id} subjectId={subjectId} node={c} scale={scale} color={color} />
          ) : (
            <Subgroup
              key={c.id}
              subjectId={subjectId}
              node={c}
              scale={scale}
              color={color}
              expanded={expanded}
              toggle={toggle}
            />
          ),
        )}
      </div>

      <FolderControls subjectId={subjectId} node={node} />
    </div>
  )
}

/** Editor del árbol de evaluación (limpio, colapsable, con color por sección). */
export function NodeEditor({ subjectId }: { subjectId: string }) {
  const subject = useAppStore((s) => s.subjects.find((x) => x.id === subjectId))
  const addNode = useAppStore((s) => s.addNode)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  if (!subject) return null

  return (
    <div className="space-y-3">
      <AnimatePresence initial={false}>
        {subject.nodes.map((n, i) => (
          <motion.div
            key={n.id}
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97 }}
          >
            <Section
              subjectId={subjectId}
              node={n}
              scale={subject.scale}
              color={sectionColor(i)}
              expanded={expanded}
              toggle={toggle}
            />
          </motion.div>
        ))}
      </AnimatePresence>

      <div className="flex items-center justify-between px-1">
        <AddLink label="Agregar sección" onClick={() => addNode(subjectId, null, { name: 'Sección', folder: true })} />
        <SumTag nodes={subject.nodes} />
      </div>
    </div>
  )
}
