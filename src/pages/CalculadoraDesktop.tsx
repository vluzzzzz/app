import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, MotionConfig, motion } from 'framer-motion'
import { useAppStore } from '../store/useAppStore'
import type { GradeNode, GradeScale, Subject } from '../lib/types'
import { accentRgb } from '../lib/accents'
import { formatGrade } from '../lib/format'
import { SPRING } from '../lib/motion'
import {
  analyzeSituation,
  currentGrade,
  gradedEvaluationCount,
  minGradeToPass,
  pendingWeight,
  projectedGrade,
  realEvaluationCount,
  weightsAreValid,
} from '../lib/grades'
import { AddSubjectWizard } from '../features/subjects/AddSubjectWizard'
import { ApprovalConditions } from '../features/subjects/ApprovalConditions'
import { SpecialEvals } from '../features/subjects/SpecialEvals'
import { CalcAnalysis } from '../features/subjects/CalcAnalysis'
import { Stepper } from '../components/ui/Stepper'
import { RAISED, RAISED_LIGHT } from '../components/ui/relief'
import {
  CalculatorIcon,
  CheckIcon,
  ChevronDown,
  ChevronRight,
  FolderIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from '../components/ui/Icons'

const EPS = 1e-9
/** Desde este ancho el simulador y las opciones van en una tercera columna. */
const THREE_COLS_MIN = 1360

type Tone = 'green' | 'amber' | 'red' | 'gray'

const CHIP: Record<Tone, string> = {
  green: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  amber: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  red: 'bg-rose-500/10 text-rose-600 dark:text-rose-300',
  gray: 'bg-ink/[0.06] text-ink/50',
}
const TEXT: Record<Tone, string> = {
  green: 'text-emerald-600 dark:text-emerald-300',
  amber: 'text-amber-500 dark:text-amber-300',
  red: 'text-rose-500 dark:text-rose-300',
  gray: 'text-ink/40',
}

function useMinWidth(px: number) {
  const query = `(min-width: ${px}px)`
  const [ok, setOk] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const on = () => setOk(mq.matches)
    on()
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [query])
  return ok
}

const pctLabel = (w: number) => String(Math.round(w * 10) / 10).replace('.', ',')

/** Chip de estado de un ramo para la lista. */
function statusOf(s: Subject): { label: string; tone: Tone } {
  if (realEvaluationCount(s) === 0) return { label: 'Sin evaluaciones', tone: 'gray' }
  if (gradedEvaluationCount(s) === 0) return { label: 'Sin notas', tone: 'gray' }
  const res = minGradeToPass(s)
  switch (analyzeSituation(s)) {
    case 'cerrado_aprobado':
      return { label: 'Aprobado', tone: 'green' }
    case 'asegurado':
      return { label: 'Ya aprobaste', tone: 'green' }
    case 'facil':
      return { label: 'Vas aprobando', tone: 'green' }
    case 'medio':
    case 'dificil':
      return res.status === 'ALCANZABLE'
        ? { label: `Necesitas ${formatGrade(res.needed)}`, tone: 'amber' }
        : { label: 'Revisa condiciones', tone: 'amber' }
    default:
      return { label: 'Remedial', tone: 'red' }
  }
}

/** Lo que muestra el bloque "Necesitas" del encabezado del ramo. */
function needOf(s: Subject): { label: string; value: string; sub: string; tone: Tone } {
  const res = minGradeToPass(s)
  if (realEvaluationCount(s) === 0) {
    return { label: 'Necesitas', value: formatGrade(s.scale.pass), sub: 'para aprobar', tone: 'gray' }
  }
  if (pendingWeight(s) <= EPS) {
    const ok = res.status === 'ASEGURADO'
    return { label: 'Nota final', value: formatGrade(res.final ?? 0), sub: ok ? 'Aprobado' : 'Reprobado', tone: ok ? 'green' : 'red' }
  }
  switch (res.status) {
    case 'ALCANZABLE':
      return { label: 'Necesitas', value: formatGrade(res.needed), sub: 'en lo que queda', tone: 'amber' }
    case 'ASEGURADO':
      return { label: 'Necesitas', value: 'Listo', sub: 'ya tienes el ramo aprobado', tone: 'green' }
    case 'IMPOSIBLE':
      return { label: 'Necesitas', value: 'Remedial', sub: 'no alcanzas con lo que queda', tone: 'red' }
    default:
      return { label: 'Necesitas', value: formatGrade(s.scale.pass), sub: 'para aprobar', tone: 'gray' }
  }
}

/* ======================= Árbol de evaluaciones ======================= */

type TreeCtx = {
  s: Subject
  editing: boolean
  /** Texto gris en las notas vacías ("Necesitas 5,2"). */
  placeholder: string
  isOpen: (id: string) => boolean
  toggle: (id: string) => void
}
const Tree = createContext<TreeCtx | null>(null)
const useTree = () => useContext(Tree) as TreeCtx

/** Campo de nota grande: acepta coma o punto y valida contra la escala. */
function GradeField({
  value,
  scale,
  placeholder,
  onChange,
}: {
  value: number | null
  scale: GradeScale
  placeholder: string
  onChange: (v: number | null) => void
}) {
  const show = (v: number | null) => (v == null ? '' : String(v).replace('.', ','))
  const [text, setText] = useState(show(value))
  const [focused, setFocused] = useState(false)
  useEffect(() => setText(show(value)), [value])

  const commit = (raw: string) => {
    const t = raw.replace(',', '.').trim()
    if (t === '') return onChange(null)
    const n = Number(t)
    if (Number.isNaN(n)) return
    onChange(Math.min(scale.max, Math.max(scale.min, n)))
  }
  const filled = text.trim() !== ''

  return (
    <input
      inputMode="decimal"
      value={focused || value == null ? text : formatGrade(value)}
      placeholder={placeholder}
      onFocus={() => setFocused(true)}
      onChange={(e) => {
        const v = e.target.value
        if (/^[0-9]*[.,]?[0-9]*$/.test(v)) {
          setText(v)
          commit(v)
        }
      }}
      onBlur={() => {
        setFocused(false)
        commit(text)
      }}
      className={`h-11 w-[132px] shrink-0 rounded-xl text-center text-[17px] font-bold tabular-nums text-ink outline-none transition-colors placeholder:text-[13px] placeholder:font-medium placeholder:text-ink/35 focus:ring-2 focus:ring-ink/25 ${
        filled ? 'bg-[rgb(var(--card))] ring-1 ring-ink/15' : 'bg-ink/[0.045]'
      }`}
    />
  )
}

/** Peso de un nodo: píldora fija, o editable en modo estructura. */
function WeightChip({ node }: { node: GradeNode }) {
  const { s, editing } = useTree()
  const updateNode = useAppStore((st) => st.updateNode)
  if (!editing) {
    return (
      <span className="shrink-0 rounded-full bg-ink/[0.05] px-2.5 py-1 text-[12.5px] font-semibold tabular-nums text-ink/55">
        {pctLabel(node.weight)} %
      </span>
    )
  }
  return (
    <span className="flex shrink-0 items-center gap-0.5 rounded-full bg-ink/[0.06] py-1 pl-2.5 pr-2">
      <input
        inputMode="decimal"
        value={node.weight === 0 ? '' : String(node.weight)}
        placeholder="0"
        onChange={(e) => {
          const v = e.target.value.replace(',', '.')
          if (/^[0-9]*\.?[0-9]*$/.test(v)) updateNode(s.id, node.id, { weight: v === '' ? 0 : Number(v) })
        }}
        className="w-8 bg-transparent text-right text-[12.5px] font-semibold tabular-nums text-ink outline-none"
      />
      <span className="text-[12.5px] font-semibold text-ink/45">%</span>
    </span>
  )
}

function NameField({ node, className }: { node: GradeNode; className: string }) {
  const { s } = useTree()
  const updateNode = useAppStore((st) => st.updateNode)
  return (
    <input
      value={node.name}
      onChange={(e) => updateNode(s.id, node.id, { name: e.target.value })}
      onClick={(e) => e.stopPropagation()}
      className={`min-w-0 flex-1 rounded-lg bg-ink/[0.04] px-2 py-1 text-ink outline-none focus:bg-ink/[0.07] ${className}`}
    />
  )
}

function RemoveBtn({ node }: { node: GradeNode }) {
  const { s } = useTree()
  const removeNode = useAppStore((st) => st.removeNode)
  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        const hasKids = (node.children?.length ?? 0) > 0
        if (!hasKids || confirm(`¿Quitar "${node.name}" y todo lo que tiene adentro?`)) removeNode(s.id, node.id)
      }}
      aria-label={`Quitar ${node.name}`}
      className="shrink-0 rounded-lg p-1.5 text-ink/30 transition-colors hover:bg-rose-500/10 hover:text-rose-500"
    >
      <TrashIcon className="h-4 w-4" />
    </button>
  )
}

function Chevron({ open }: { open: boolean }) {
  return (
    <motion.span animate={{ rotate: open ? 180 : 0 }} transition={SPRING.soft} className="flex shrink-0 text-ink/35">
      <ChevronDown className="h-5 w-5" />
    </motion.span>
  )
}

/** Fila de una nota: nombre · peso · campo de nota. */
function LeafRow({ node }: { node: GradeNode }) {
  const { s, editing, placeholder } = useTree()
  const updateNode = useAppStore((st) => st.updateNode)
  return (
    <div className="flex items-center gap-3 px-5 py-2.5">
      {editing ? (
        <NameField node={node} className="text-[15px]" />
      ) : (
        <p className="min-w-0 flex-1 truncate text-[15px] text-ink/85">{node.name}</p>
      )}
      <WeightChip node={node} />
      <GradeField
        value={node.grade ?? null}
        scale={s.scale}
        placeholder={placeholder}
        onChange={(grade) => updateNode(s.id, node.id, { grade })}
      />
      {editing && <RemoveBtn node={node} />}
    </div>
  )
}

/** Controles de estructura de una carpeta (solo en modo editar). */
function FolderControls({ node, depth }: { node: GradeNode; depth: number }) {
  const { s } = useTree()
  const addNode = useAppStore((st) => st.addNode)
  const setChildCount = useAppStore((st) => st.setChildCount)
  const kids = node.children ?? []
  const subgroups = kids.some((k) => k.children !== undefined) || (kids.length === 0 && depth === 0)
  return (
    <div className="flex items-center gap-3 border-t border-ink/[0.06] px-5 py-3">
      {subgroups ? (
        <button
          onClick={() => addNode(s.id, node.id, { name: 'Subgrupo', folder: true })}
          className="flex items-center gap-1.5 rounded-xl bg-ink/[0.05] px-3 py-2 text-[13.5px] font-semibold text-ink/60 transition-colors hover:bg-ink/10 hover:text-ink"
        >
          <PlusIcon className="h-4 w-4" /> Agregar subgrupo
        </button>
      ) : (
        <>
          <span className="text-[13.5px] font-medium text-ink/55">Cantidad de notas</span>
          <Stepper value={kids.length} onChange={(n) => setChildCount(s.id, node.id, n)} />
        </>
      )}
    </div>
  )
}

function NodeRows({ nodes, depth }: { nodes: GradeNode[]; depth: number }) {
  const { editing } = useTree()
  if (nodes.length === 0 && !editing) {
    return <p className="px-5 py-3 text-[13.5px] text-ink/40">Sin evaluaciones todavía.</p>
  }
  return (
    <div className="divide-y divide-ink/[0.06]">
      {nodes.map((n) =>
        n.children === undefined ? <LeafRow key={n.id} node={n} /> : <SubFolder key={n.id} node={n} depth={depth} />,
      )}
    </div>
  )
}

function Collapse({ open, children }: { open: boolean; children: ReactNode }) {
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ height: SPRING.soft, opacity: { duration: 0.2 } }}
          className="overflow-hidden"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/** Subgrupo dentro de una sección (ej: Controles): carpeta desplegable. */
function SubFolder({ node, depth }: { node: GradeNode; depth: number }) {
  const { editing, isOpen, toggle } = useTree()
  const open = isOpen(node.id)
  return (
    <div>
      <div
        onClick={() => toggle(node.id)}
        className="flex cursor-pointer items-center gap-3 px-5 py-3 transition-colors hover:bg-ink/[0.02]"
      >
        <FolderIcon className="h-[18px] w-[18px] shrink-0 text-ink/35" />
        {editing ? (
          <NameField node={node} className="text-[15px] font-semibold" />
        ) : (
          <p className="min-w-0 flex-1 truncate text-[15px] font-semibold text-ink">{node.name}</p>
        )}
        <WeightChip node={node} />
        {editing && <RemoveBtn node={node} />}
        <Chevron open={open} />
      </div>
      <Collapse open={open}>
        <div className="mb-2 ml-7 border-l-2 border-ink/[0.07]">
          <NodeRows nodes={node.children ?? []} depth={depth + 1} />
          {editing && <FolderControls node={node} depth={depth + 1} />}
        </div>
      </Collapse>
    </div>
  )
}

/** Sección tope del ramo (ej: Cátedra · 70 %): tarjeta blanca desplegable. */
function SectionCard({ node }: { node: GradeNode }) {
  const { editing, isOpen, toggle } = useTree()
  const open = isOpen(node.id)
  const isLeaf = node.children === undefined
  return (
    <div className="overflow-hidden rounded-[22px] bg-[rgb(var(--card))] ring-1 ring-ink/[0.05]" style={RAISED_LIGHT}>
      {isLeaf ? (
        <LeafRow node={node} />
      ) : (
        <>
          <div
            onClick={() => toggle(node.id)}
            className="flex cursor-pointer items-center gap-3 px-5 py-4 transition-colors hover:bg-ink/[0.015]"
          >
            <FolderIcon className="h-5 w-5 shrink-0 text-ink/40" />
            {editing ? (
              <>
                <NameField node={node} className="text-[17px] font-bold" />
                <WeightChip node={node} />
                <RemoveBtn node={node} />
              </>
            ) : (
              <p className="min-w-0 flex-1 truncate text-[17px] font-bold tracking-[-0.01em] text-ink">
                {node.name} <span className="font-semibold text-ink/40">· {pctLabel(node.weight)} %</span>
              </p>
            )}
            <Chevron open={open} />
          </div>
          <Collapse open={open}>
            <div className="border-t border-ink/[0.06]">
              <NodeRows nodes={node.children ?? []} depth={1} />
            </div>
            {editing && <FolderControls node={node} depth={0} />}
          </Collapse>
        </>
      )}
    </div>
  )
}

/* ======================= Bloques de la derecha ======================= */

/** Anillo de progreso: cuántas notas llevas puestas. */
function Ring({ graded, total, rgb }: { graded: number; total: number; rgb: string }) {
  const R = 46
  const C = 2 * Math.PI * R
  const p = total ? graded / total : 0
  return (
    <div className="relative h-[116px] w-[116px] shrink-0">
      <svg viewBox="0 0 116 116" className="h-full w-full -rotate-90">
        <circle cx="58" cy="58" r={R} fill="none" strokeWidth="10" className="stroke-ink/[0.08]" />
        {graded > 0 && (
          <motion.circle
            cx="58"
            cy="58"
            r={R}
            fill="none"
            stroke={`rgb(${rgb})`}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={C}
            initial={{ strokeDashoffset: C }}
            animate={{ strokeDashoffset: C * (1 - p) }}
            transition={SPRING.soft}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-[17px] font-bold tabular-nums text-ink">
          {graded} de {total}
        </p>
        <p className="text-[12.5px] font-medium text-ink/50">notas</p>
      </div>
    </div>
  )
}

/** Simulador: "si te sacas X en lo que queda, terminas con Y". */
function Simulator({ s, rgb }: { s: Subject; rgb: string }) {
  const { min, max, pass } = s.scale
  const res = minGradeToPass(s)
  const canSim = realEvaluationCount(s) > 0 && pendingWeight(s) > EPS
  const start = Math.min(max, Math.max(min, res.status === 'ALCANZABLE' && res.needed != null ? res.needed : pass))
  const [x, setX] = useState(start)
  useEffect(() => setX(start), [s.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const final = projectedGrade(s, x)
  const ok = final + EPS >= pass
  const pct = ((x - min) / (max - min)) * 100
  const passPct = ((pass - min) / (max - min)) * 100

  return (
    <div className="rounded-[22px] bg-[rgb(var(--card))] p-5 ring-1 ring-ink/[0.05]" style={RAISED_LIGHT}>
      <p className="text-[18px] font-bold tracking-[-0.01em] text-ink">Simulador</p>
      <p className="text-[13.5px] text-ink/50">Proyecta tu promedio final</p>

      {!canSim ? (
        <p className="mt-4 rounded-2xl bg-ink/[0.035] p-4 text-[13.5px] text-ink/50">
          {realEvaluationCount(s) === 0
            ? 'Agrega evaluaciones para poder simular.'
            : 'Ya tienes todas tus notas puestas.'}
        </p>
      ) : (
        <div className="mt-4 rounded-2xl bg-ink/[0.035] p-4">
          <p className="text-[14px] text-ink/60">
            Si te sacas <b className="font-bold tabular-nums text-ink">{formatGrade(x)}</b> → terminas con
          </p>
          <p className="mt-1 text-[44px] font-black leading-none tabular-nums tracking-[-0.02em]" style={{ color: `rgb(${rgb})` }}>
            {formatGrade(final)}
          </p>
          <p className={`mt-1.5 text-[13px] font-semibold ${ok ? TEXT.green : TEXT.red}`}>
            {ok ? 'Apruebas' : 'No alcanzas a aprobar'}
          </p>

          {/* Barra deslizante con el color del ramo */}
          <div className="relative mt-5 h-7">
            <div className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-ink/10" />
            <div
              className="absolute left-0 top-1/2 h-2 -translate-y-1/2 rounded-full"
              style={{ width: `${pct}%`, backgroundColor: `rgb(${rgb})` }}
            />
            {/* Marca de la nota para aprobar */}
            <span
              className="absolute top-1/2 h-3.5 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink/25"
              style={{ left: `${passPct}%` }}
            />
            <span
              className="pointer-events-none absolute top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_1px_4px_rgb(0_0_0/0.25)] ring-1 ring-black/5"
              style={{ left: `${pct}%` }}
            />
            <input
              type="range"
              min={min}
              max={max}
              step={0.1}
              value={x}
              onChange={(e) => setX(Number(e.target.value))}
              aria-label="Nota en lo que queda"
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
          </div>
          <div className="mt-1 flex justify-between text-[12px] font-medium tabular-nums text-ink/40">
            <span>{formatGrade(min)}</span>
            <span>Apruebas con {formatGrade(pass)}</span>
            <span>{formatGrade(max)}</span>
          </div>
        </div>
      )}
    </div>
  )
}

function Tools({ s, rgb }: { s: Subject; rgb: string }) {
  return (
    <div className="space-y-3">
      <Simulator s={s} rgb={rgb} />
      <SpecialEvals subjectId={s.id} />
      <ApprovalConditions subjectId={s.id} title="Condiciones de aprobación" />
    </div>
  )
}

/* ======================= Detalle del ramo (centro) ======================= */

function SubjectPanel({ s, wide }: { s: Subject; wide: boolean }) {
  const addNode = useAppStore((st) => st.addNode)
  const removeSubject = useAppStore((st) => st.removeSubject)
  const [editing, setEditing] = useState(false)
  const [showCalc, setShowCalc] = useState(false)
  const calcRef = useRef<HTMLDivElement>(null)

  // Con más de 2 secciones, solo la primera parte abierta (como en la imagen).
  const initialClosed = () => new Set(s.nodes.length > 2 ? s.nodes.slice(1).map((n) => n.id) : [])
  const [closed, setClosed] = useState<Set<string>>(initialClosed)
  useEffect(() => {
    setEditing(false)
    setShowCalc(false)
    setClosed(initialClosed())
  }, [s.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const rgb = accentRgb(s.color ?? 'gray')
  const current = currentGrade(s)
  const total = realEvaluationCount(s)
  const graded = gradedEvaluationCount(s)
  const need = needOf(s)
  const res = minGradeToPass(s)
  const placeholder = res.status === 'ALCANZABLE' ? `Necesitas ${formatGrade(res.needed)}` : '—'

  const tree: TreeCtx = {
    s,
    editing,
    placeholder,
    isOpen: (id) => !closed.has(id),
    toggle: (id) =>
      setClosed((prev) => {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return next
      }),
  }

  return (
    <Tree.Provider value={tree}>
      <div className="space-y-4">
        {/* ===== Encabezado: promedio · anillo · necesitas ===== */}
        <div className="rounded-[26px] bg-[rgb(var(--card))] p-6 ring-1 ring-ink/[0.05]" style={RAISED_LIGHT}>
          <div className="mb-4 flex items-center gap-3">
            <span className="h-8 w-[6px] shrink-0 rounded-full" style={{ ...RAISED, backgroundColor: `rgb(${rgb})` }} />
            <h2 className="min-w-0 truncate text-[28px] font-bold leading-tight tracking-[-0.02em] text-ink">{s.name}</h2>
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-6">
            <div className="min-w-0">
              <p className="text-[14px] font-medium text-ink/50">Promedio actual</p>
              <p className="mt-1 text-[56px] font-black leading-none tracking-[-0.03em] tabular-nums text-ink">
                {current == null ? '0,0' : formatGrade(current)}
              </p>
            </div>
            <Ring graded={graded} total={total} rgb={rgb} />
            <div className="min-w-0 border-l border-ink/[0.08] pl-6">
              <p className="text-[14px] font-medium text-ink/50">{need.label}</p>
              <p
                className={`mt-1 font-black leading-none tracking-[-0.03em] tabular-nums ${TEXT[need.tone]} ${
                  need.value.length > 4 ? 'text-[34px]' : 'text-[56px]'
                }`}
              >
                {need.value}
              </p>
              <p className="mt-1.5 text-[14px] text-ink/50">{need.sub}</p>
            </div>
          </div>
        </div>

        {!weightsAreValid(s) && (
          <div className="rounded-2xl bg-amber-400/15 px-4 py-3 text-[13.5px] text-amber-700 dark:text-amber-200">
            Los porcentajes de alguna sección no suman 100 %. El cálculo se ajusta igual, pero revisa los valores en
            "Editar estructura".
          </div>
        )}

        {/* ===== Evaluaciones ===== */}
        <div className="flex items-center justify-between px-1 pt-1">
          <p className="text-[13px] font-semibold uppercase tracking-wide text-ink/40">Evaluaciones</p>
          <motion.button
            whileTap={{ scale: 0.95 }}
            transition={SPRING.press}
            onClick={() => setEditing((v) => !v)}
            style={editing ? RAISED : RAISED_LIGHT}
            className={`flex items-center gap-2 rounded-full px-3.5 py-2 text-[13.5px] font-semibold transition-colors ${
              editing
                ? 'bg-ink text-surface'
                : 'bg-[rgb(var(--card))] text-ink/70 ring-1 ring-ink/[0.07] hover:text-ink'
            }`}
          >
            {editing ? <CheckIcon className="h-4 w-4" /> : <PencilIcon className="h-4 w-4" />}
            {editing ? 'Listo' : 'Editar estructura'}
          </motion.button>
        </div>

        {s.nodes.length === 0 && !editing ? (
          <div className="rounded-[22px] bg-ink/[0.035] p-6 text-center">
            <p className="text-[15px] font-semibold text-ink">Este ramo no tiene evaluaciones</p>
            <p className="mt-0.5 text-[13.5px] text-ink/45">Toca "Editar estructura" para agregar secciones.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {s.nodes.map((n) => (
              <SectionCard key={n.id} node={n} />
            ))}
          </div>
        )}

        {editing && (
          <div className="flex items-center justify-between px-1">
            <button
              onClick={() => addNode(s.id, null, { name: 'Sección', folder: true })}
              className="flex items-center gap-1.5 rounded-xl bg-ink/[0.05] px-3.5 py-2 text-[13.5px] font-semibold text-ink/60 transition-colors hover:bg-ink/10 hover:text-ink"
            >
              <PlusIcon className="h-4 w-4" /> Agregar sección
            </button>
            <button
              onClick={() => {
                if (confirm(`¿Eliminar "${s.name}"? Esta acción no se puede deshacer.`)) removeSubject(s.id)
              }}
              className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-[13.5px] font-semibold text-rose-500 transition-colors hover:bg-rose-500/10"
            >
              <TrashIcon className="h-4 w-4" /> Eliminar ramo
            </button>
          </div>
        )}

        {/* ===== Análisis completo ===== */}
        <motion.button
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.98, y: 0 }}
          transition={SPRING.press}
          onClick={() => {
            const next = !showCalc
            setShowCalc(next)
            if (next) setTimeout(() => calcRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
          }}
          style={RAISED}
          className="h-12 w-full rounded-2xl bg-ink text-[15px] font-semibold text-surface"
        >
          {showCalc ? 'Ocultar análisis' : 'Calcular'}
        </motion.button>
        {showCalc && (
          <motion.div
            ref={calcRef}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={SPRING.soft}
            className="scroll-mt-4"
          >
            <CalcAnalysis subject={s} />
          </motion.div>
        )}

        {/* Pantallas medianas: simulador y opciones van debajo. */}
        {!wide && (
          <div className="pt-2">
            <Tools s={s} rgb={rgb} />
          </div>
        )}
      </div>
    </Tree.Provider>
  )
}

/* ======================= Página ======================= */

/**
 * Calculadora del modo PC (≥1024px): lista compacta de ramos a la izquierda,
 * el ramo elegido al centro (promedio, anillo de notas, cuánto necesitas y las
 * evaluaciones en tarjetas) y el simulador con las opciones a la derecha.
 * La calculadora del celular vive intacta en Calculadora.tsx.
 */
export function CalculadoraDesktop({ startAdding }: { startAdding?: boolean }) {
  const subjects = useAppStore((s) => s.subjects)
  const wide = useMinWidth(THREE_COLS_MIN)
  const [adding, setAdding] = useState(!!startAdding)
  const [selected, setSelected] = useState<string | null>(null)
  const sel = subjects.find((s) => s.id === selected) ?? subjects[0] ?? null

  const threeCols = wide && !adding && sel
  return (
    <MotionConfig reducedMotion="user">
      <div
        className={`mx-auto grid h-full w-full max-w-[1480px] gap-6 overflow-hidden px-8 pt-8 ${
          threeCols ? 'grid-cols-[260px_minmax(0,1fr)_290px]' : 'grid-cols-[260px_minmax(0,1fr)]'
        }`}
      >
        {/* ===== Lista de ramos ===== */}
        <aside className="flex min-h-0 flex-col">
          <h1 className="text-[32px] font-bold leading-[36px] tracking-[-0.02em] text-ink">Calculadora</h1>
          <p className="mt-0.5 text-[14px] font-medium text-ink/45">Tus ramos</p>
          <motion.button
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.97, y: 0 }}
            transition={SPRING.press}
            onClick={() => setAdding(true)}
            style={RAISED}
            className="mt-5 flex h-11 w-full shrink-0 items-center justify-center gap-2 rounded-2xl bg-ink text-[14.5px] font-semibold text-surface"
          >
            <PlusIcon className="h-5 w-5" /> Agregar ramo
          </motion.button>

          <div className="-mx-2 mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto px-2 pb-6">
            {subjects.map((s, i) => {
              const on = !adding && sel?.id === s.id
              const st = statusOf(s)
              const cur = currentGrade(s)
              return (
                <motion.button
                  key={s.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0, transition: { ...SPRING.soft, delay: i * 0.03 } }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setAdding(false)
                    setSelected(s.id)
                  }}
                  className="group relative flex w-full items-center gap-3 rounded-[18px] p-3 text-left"
                >
                  {on ? (
                    <motion.span
                      layoutId="calc-selected"
                      transition={SPRING.soft}
                      className="absolute inset-0 rounded-[18px] bg-[rgb(var(--card))] ring-1 ring-ink/[0.06]"
                      style={RAISED_LIGHT}
                    />
                  ) : (
                    <span className="absolute inset-0 rounded-[18px] bg-ink/[0.035] transition-colors group-hover:bg-ink/[0.055]" />
                  )}
                  <span
                    className="relative w-[5px] shrink-0 self-stretch rounded-full"
                    style={{ ...RAISED, backgroundColor: `rgb(${accentRgb(s.color ?? 'gray')})` }}
                  />
                  <div className="relative min-w-0 flex-1">
                    <p className="line-clamp-2 text-[15px] font-bold leading-tight tracking-[-0.01em] text-ink">{s.name}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span className="rounded-full bg-ink/[0.06] px-2.5 py-0.5 text-[13px] font-bold tabular-nums text-ink">
                        {cur == null ? '0,0' : formatGrade(cur)}
                      </span>
                      <span className={`rounded-full px-2.5 py-0.5 text-[12.5px] font-semibold ${CHIP[st.tone]}`}>
                        {st.label}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="relative h-4 w-4 shrink-0 text-ink/30" />
                </motion.button>
              )
            })}
          </div>
        </aside>

        {/* ===== Centro ===== */}
        <main className="-mx-2 min-h-0 overflow-y-auto px-2 pb-8">
          {adding ? (
            <div className="mx-auto max-w-xl pt-1">
              <AddSubjectWizard
                onCancel={() => setAdding(false)}
                onDone={(id) => {
                  setAdding(false)
                  setSelected(id)
                }}
              />
            </div>
          ) : sel ? (
            <motion.div key={sel.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={SPRING.soft}>
              <SubjectPanel s={sel} wide={!!threeCols} />
            </motion.div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-ink/[0.05] text-ink/45">
                <CalculatorIcon className="h-7 w-7" />
              </div>
              <h2 className="mb-1 text-xl font-semibold text-ink">Aún no tienes asignaturas</h2>
              <p className="mb-6 text-sm text-ink/55">
                Agrega tu primer ramo y calcula qué nota necesitas para salvar el semestre.
              </p>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setAdding(true)}
                style={RAISED}
                className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-3 font-semibold text-surface"
              >
                <PlusIcon className="h-5 w-5" /> Agregar ramo
              </motion.button>
            </div>
          )}
        </main>

        {/* ===== Simulador y opciones ===== */}
        {threeCols && sel && (
          <div className="-mx-2 min-h-0 overflow-y-auto px-2 pb-8">
            <motion.div key={sel.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={SPRING.soft}>
              <Tools s={sel} rgb={accentRgb(sel.color ?? 'gray')} />
            </motion.div>
          </div>
        )}
      </div>
    </MotionConfig>
  )
}
