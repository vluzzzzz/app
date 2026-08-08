import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useAppStore } from '../../store/useAppStore'
import { accentRgb } from '../../lib/accents'
import type { GradeNode, GradeScale } from '../../lib/types'
import { GradeInput } from '../../components/ui/GradeInput'
import { Stepper } from '../../components/ui/Stepper'
import { ChevronRight, FolderIcon, PlusIcon, TrashIcon } from '../../components/ui/Icons'

const isFolder = (n: GradeNode) => n.children !== undefined

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
        className="w-6 rounded-md bg-transparent text-right text-xs font-semibold tabular-nums text-ink/55 outline-none focus:bg-ink/5"
      />
      <span className="text-xs text-ink/35">%</span>
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
    </div>
  )
}

/**
 * Controles de una carpeta:
 * - Sección o carpeta con subgrupos → botón grande "Agregar subgrupo".
 * - Subgrupo hoja (contiene notas) → SOLO el control de cantidad (− N +); al restar
 *   se elimina la última nota, así que no hacen falta trash ni "agregar evaluación".
 */
function FolderControls({
  subjectId,
  node,
  depth,
}: {
  subjectId: string
  node: GradeNode
  depth: number
}) {
  const addNode = useAppStore((s) => s.addNode)
  const setChildCount = useAppStore((s) => s.setChildCount)
  const children = node.children ?? []
  const hasSub = children.some(isFolder)
  const showSubgroup = hasSub || (children.length === 0 && depth === 0)

  if (showSubgroup) {
    return (
      <button
        onClick={() => addNode(subjectId, node.id, { name: 'Subgrupo', folder: true })}
        className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl bg-ink/5 py-2.5 text-sm font-semibold text-ink/60 active:bg-ink/10"
      >
        <PlusIcon className="h-4 w-4" /> Agregar subgrupo
      </button>
    )
  }

  return (
    <div className="mt-2 flex items-center gap-2">
      <span className="text-xs text-ink/45">Notas</span>
      <Stepper value={children.length} onChange={(n) => setChildCount(subjectId, node.id, n)} />
    </div>
  )
}

/** Subgrupo (carpeta anidada): fila compacta con puntito, colapsable. */
function Subgroup({
  subjectId,
  node,
  scale,
  color,
  depth,
  expanded,
  toggle,
}: {
  subjectId: string
  node: GradeNode
  scale: GradeScale
  color: string
  depth: number
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
        {isOpen && <TrashBtn onClick={() => removeNode(subjectId, node.id)} />}
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
                isFolder(c) ? (
                  <Subgroup
                    key={c.id}
                    subjectId={subjectId}
                    node={c}
                    scale={scale}
                    color={color}
                    depth={depth + 1}
                    expanded={expanded}
                    toggle={toggle}
                  />
                ) : (
                  <NoteRow key={c.id} subjectId={subjectId} node={c} scale={scale} color={color} />
                ),
              )}
            </div>
            <FolderControls subjectId={subjectId} node={node} depth={depth} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/** Sección tope: tarjeta con ícono de carpeta del color del ramo. Siempre expandida. */
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
          isFolder(c) ? (
            <Subgroup
              key={c.id}
              subjectId={subjectId}
              node={c}
              scale={scale}
              color={color}
              depth={1}
              expanded={expanded}
              toggle={toggle}
            />
          ) : (
            <NoteRow key={c.id} subjectId={subjectId} node={c} scale={scale} color={color} />
          ),
        )}
      </div>

      <FolderControls subjectId={subjectId} node={node} depth={0} />
    </div>
  )
}

/** Editor del árbol de evaluación (limpio, colapsable, color del ramo). */
export function NodeEditor({ subjectId }: { subjectId: string }) {
  const subject = useAppStore((s) => s.subjects.find((x) => x.id === subjectId))
  const addNode = useAppStore((s) => s.addNode)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  if (!subject) return null
  const color = `rgb(${accentRgb(subject.color ?? 'gray')})`

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
            <Section
              subjectId={subjectId}
              node={n}
              scale={subject.scale}
              color={color}
              expanded={expanded}
              toggle={toggle}
            />
          </motion.div>
        ))}
      </AnimatePresence>

      <div className="px-1">
        <AddLink label="Agregar sección" onClick={() => addNode(subjectId, null, { name: 'Sección', folder: true })} />
      </div>
    </div>
  )
}
