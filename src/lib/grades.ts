import type { GradeNode, Subject } from './types'

/**
 * Estado del cálculo de "nota mínima para aprobar".
 * - ALCANZABLE: se necesita una nota concreta (>= min y <= max).
 * - ASEGURADO: ya se aprueba pase lo que pase en lo pendiente.
 * - IMPOSIBLE: ni con la nota máxima en todo lo pendiente se alcanza a aprobar.
 * - SIN_DATOS: no hay evaluaciones registradas todavía.
 */
export type PassStatus = 'ALCANZABLE' | 'ASEGURADO' | 'IMPOSIBLE' | 'SIN_DATOS'

export type MinGradeResult = {
  status: PassStatus
  /** Nota uniforme requerida en lo pendiente (o null si no aplica). */
  needed: number | null
  /** Nota final ya determinada, cuando no queda nada pendiente. */
  final?: number
}

/** Una nota "efectiva" con su peso normalizado sobre el total (Σ = 1). */
type EffectiveLeaf = {
  /** id real de la nota, o null si es una carpeta vacía (bloque pendiente virtual). */
  id: string | null
  name: string
  /** Nombre del padre inmediato (para mostrar en combinaciones). */
  path: string | null
  grade: number | null
  weight: number
}

/** Evaluación pendiente direccionable (para combinaciones e interactivo). */
export type PendingEval = {
  id: string
  name: string
  subName: string | null
  /** Peso efectivo sobre el total (Σ de todas las evaluaciones = 1). */
  weight: number
}

const EPS = 1e-9

/** Redondea hacia arriba al múltiplo de `step` (para no quedar bajo el corte). */
export function ceilTo(value: number, step = 0.1): number {
  const r = Math.ceil(value / step - EPS) * step
  return Math.round(r * 100) / 100
}

/**
 * Aplana el árbol a hojas con su peso efectivo GLOBAL (producto de la cadena,
 * normalizado por nivel → Σ de todas las hojas = 1). Robusto aunque los % no
 * sumen exactamente 100 dentro de un nivel.
 */
function flattenLeaves(nodes: GradeNode[]): EffectiveLeaf[] {
  const out: EffectiveLeaf[] = []
  const walk = (ns: GradeNode[], parentFrac: number, parentName: string | null) => {
    const total = ns.reduce((s, n) => s + (n.weight || 0), 0) || ns.length || 1
    for (const n of ns) {
      const frac = parentFrac * ((n.weight || 0) / total)
      if (n.children === undefined) {
        // Hoja: una nota real.
        out.push({ id: n.id, name: n.name, path: parentName, grade: n.grade ?? null, weight: frac })
      } else if (n.children.length > 0) {
        walk(n.children, frac, n.name)
      } else {
        // Carpeta vacía: bloque pendiente virtual (ocupa su peso pero no es nota real).
        out.push({ id: null, name: n.name, path: parentName, grade: null, weight: frac })
      }
    }
  }
  walk(nodes, 1, null)
  return out
}

function effectiveLeaves(subject: Subject): EffectiveLeaf[] {
  return flattenLeaves(subject.nodes)
}

/** Busca un nodo por id en todo el árbol. */
function findNode(nodes: GradeNode[], id: string): GradeNode | null {
  for (const n of nodes) {
    if (n.id === id) return n
    if (n.children) {
      const f = findNode(n.children, id)
      if (f) return f
    }
  }
  return null
}

/** Recorre todas las hojas (notas reales) del árbol. */
function forEachLeaf(nodes: GradeNode[], fn: (n: GradeNode) => void) {
  for (const n of nodes) {
    if (n.children === undefined) fn(n)
    else forEachLeaf(n.children, fn)
  }
}

export function realEvaluationCount(subject: Subject): number {
  let c = 0
  forEachLeaf(subject.nodes, () => c++)
  return c
}

export function gradedEvaluationCount(subject: Subject): number {
  let c = 0
  forEachLeaf(subject.nodes, (n) => {
    if (n.grade != null) c++
  })
  return c
}

/** Nota actual = promedio ponderado SOLO de lo ya rendido (null si no hay notas). */
export function currentGrade(subject: Subject): number | null {
  const graded = effectiveLeaves(subject).filter((e) => e.grade != null)
  const wsum = graded.reduce((s, e) => s + e.weight, 0)
  if (wsum <= EPS) return null
  const k = graded.reduce((s, e) => s + e.weight * (e.grade as number), 0)
  return k / wsum
}

/** Suma ponderada de lo ya rendido (contribución conocida a la nota final). */
export function knownContribution(subject: Subject): number {
  return effectiveLeaves(subject)
    .filter((e) => e.grade != null)
    .reduce((s, e) => s + e.weight * (e.grade as number), 0)
}

/** Peso total pendiente (Σ de pesos de las evaluaciones sin nota). */
export function pendingWeight(subject: Subject): number {
  return effectiveLeaves(subject)
    .filter((e) => e.grade == null)
    .reduce((s, e) => s + e.weight, 0)
}

/** Nota mínima uniforme necesaria en TODO lo pendiente para aprobar. */
export function minGradeToPass(subject: Subject): MinGradeResult {
  const { scale } = subject
  if (realEvaluationCount(subject) === 0) {
    return { status: 'SIN_DATOS', needed: null }
  }
  const K = knownContribution(subject)
  const P = pendingWeight(subject)

  if (P <= EPS) {
    return K + EPS >= scale.pass
      ? { status: 'ASEGURADO', needed: null, final: K }
      : { status: 'IMPOSIBLE', needed: null, final: K }
  }

  const raw = (scale.pass - K) / P
  if (raw <= scale.min + EPS) return { status: 'ASEGURADO', needed: scale.min }
  if (raw > scale.max + EPS) return { status: 'IMPOSIBLE', needed: raw }
  return { status: 'ALCANZABLE', needed: ceilTo(raw, 0.1) }
}

/** Lista de evaluaciones pendientes direccionables (con id y peso efectivo). */
export function pendingEvaluations(subject: Subject): PendingEval[] {
  return effectiveLeaves(subject)
    .filter((e) => e.grade == null && e.id != null)
    .map((e) => ({ id: e.id as string, name: e.name, subName: e.path, weight: e.weight }))
}

/**
 * Nota final proyectada asignando notas a las pendientes.
 * Las pendientes sin asignar cuentan como su nota mínima (peor caso).
 */
export function projectedFinal(
  subject: Subject,
  assignments: Record<string, number>,
): number {
  return effectiveLeaves(subject).reduce((s, e) => {
    if (e.grade != null) return s + e.weight * e.grade
    const assigned = e.id != null ? assignments[e.id] : undefined
    return s + e.weight * (assigned != null ? assigned : subject.scale.min)
  }, 0)
}

/** Nota final proyectada asumiendo una nota uniforme `x` en todo lo pendiente. */
export function projectedGrade(subject: Subject, x: number): number {
  return effectiveLeaves(subject).reduce(
    (s, e) => s + e.weight * (e.grade == null ? x : (e.grade as number)),
    0,
  )
}

export type Combo = {
  a: number
  b: number | null
}

/** Tabla de combinaciones cuando faltan EXACTAMENTE 2 notas. */
export function combinationsFor(
  subject: Subject,
): { first: PendingEval; second: PendingEval; rows: Combo[] } | null {
  const pend = pendingEvaluations(subject)
  if (pend.length !== 2) return null
  const [first, second] = pend
  const K = knownContribution(subject)
  const { scale } = subject
  const rows: Combo[] = []
  const step = scale.max - scale.min <= 10 ? 0.5 : 5
  for (let a = scale.min; a <= scale.max + EPS; a += step) {
    const needB = (scale.pass - K - first.weight * a) / second.weight
    if (needB > scale.max + EPS) {
      rows.push({ a: round1(a), b: null })
    } else {
      rows.push({ a: round1(a), b: ceilTo(Math.max(needB, scale.min), 0.1) })
    }
  }
  return { first, second, rows }
}

function round1(n: number) {
  return Math.round(n * 10) / 10
}

/** Promedio final MÁXIMO posible (nota máxima en todo lo pendiente). */
export function maxPossibleFinal(subject: Subject): number {
  return projectedGrade(subject, subject.scale.max)
}

/** Promedio final MÍNIMO posible (nota mínima en todo lo pendiente). */
export function minPossibleFinal(subject: Subject): number {
  return projectedGrade(subject, subject.scale.min)
}

/** Desglose de TODAS las notas con su peso GLOBAL (%). */
export type LeafBreakdown = {
  id: string | null
  name: string
  subName: string | null
  weightPct: number
  grade: number | null
}
export function evaluationsBreakdown(subject: Subject): LeafBreakdown[] {
  return effectiveLeaves(subject).map((e) => ({
    id: e.id,
    name: e.name,
    subName: e.path,
    weightPct: Math.round(e.weight * 1000) / 10,
    grade: e.grade,
  }))
}

/** Clasificación automática de la situación del ramo. */
export type Situation =
  | 'sin_datos'
  | 'cerrado_aprobado'
  | 'cerrado_reprobado'
  | 'asegurado'
  | 'facil'
  | 'medio'
  | 'dificil'
  | 'imposible'

export function analyzeSituation(subject: Subject): Situation {
  const { scale } = subject
  if (realEvaluationCount(subject) === 0) return 'sin_datos'
  const res = minGradeToPass(subject)
  const condsFeasible = conditionsAllFeasible(subject)
  const condsMet = conditionsAllMet(subject)
  if (pendingWeight(subject) <= EPS) {
    return (res.final ?? 0) + EPS >= scale.pass && condsMet ? 'cerrado_aprobado' : 'cerrado_reprobado'
  }
  // Si alguna condición ya no se puede cumplir ni con la nota máxima → Remedial.
  if (!condsFeasible) return 'imposible'
  if (res.status === 'ASEGURADO') return condsMet ? 'asegurado' : 'medio'
  if (res.status === 'IMPOSIBLE') return 'imposible'
  const needed = res.needed ?? scale.pass
  const hardCut = scale.pass + 0.6 * (scale.max - scale.pass)
  if (needed <= scale.pass + EPS) return condsMet ? 'facil' : 'medio'
  if (needed >= hardCut) return 'dificil'
  return 'medio'
}

/** Escenario de 2 notas pendientes que alcanza a aprobar. */
export type Scenario = { a: number; b: number; final: number }

/** Escenarios destacados cuando quedan EXACTAMENTE 2 pendientes. */
export function scenariosFor(subject: Subject): {
  first: PendingEval
  second: PendingEval
  balanced: Scenario | null
  higherFirst: Scenario | null
  higherSecond: Scenario | null
} | null {
  const pend = pendingEvaluations(subject)
  if (pend.length !== 2) return null
  const [first, second] = pend
  const { scale } = subject
  const K = knownContribution(subject)
  const wa = first.weight
  const wb = second.weight
  const clamp = (v: number) => Math.min(scale.max, Math.max(scale.min, v))
  const make = (a: number, b: number): Scenario | null => {
    const ca = clamp(a)
    const cb = clamp(b)
    const assign = { [first.id]: ca, [second.id]: cb }
    // Debe cumplir el promedio final Y todas las condiciones de aprobación.
    return meetsAll(subject, assign)
      ? { a: round1(ca), b: round1(cb), final: round1(projectedFinal(subject, assign)) }
      : null
  }
  const t = ceilTo((scale.pass - K) / (wa + wb), 0.1)
  const balanced = make(t, t)
  const higherFirst = make(scale.max, ceilTo((scale.pass - K - wa * scale.max) / wb, 0.1))
  const higherSecond = make(ceilTo((scale.pass - K - wb * scale.max) / wa, 0.1), scale.max)
  return { first, second, balanced, higherFirst, higherSecond }
}

/**
 * "Si sacas X en esta nota, tu promedio final sería Y" — mantiene las OTRAS
 * pendientes en la nota mínima necesaria (uniforme).
 */
export function impactTable(subject: Subject, evalId: string): { x: number; final: number }[] {
  const { scale } = subject
  const res = minGradeToPass(subject)
  const others = res.needed ?? scale.pass
  const base: Record<string, number> = {}
  for (const p of pendingEvaluations(subject)) {
    if (p.id !== evalId) base[p.id] = others
  }
  const step = scale.max - scale.min <= 10 ? 1 : 5
  const rows: { x: number; final: number }[] = []
  for (let x = scale.min; x <= scale.max + EPS; x += step) {
    rows.push({ x: round1(x), final: round1(projectedFinal(subject, { ...base, [evalId]: x })) })
  }
  return rows
}

/* ---------- Condiciones de aprobación (secciones con nota mínima) ---------- */

/** Secciones tope (carpetas) elegibles para una condición. */
export function sectionOptions(subject: Subject): { id: string; name: string }[] {
  return subject.nodes.filter((n) => n.children !== undefined).map((n) => ({ id: n.id, name: n.name }))
}

/** Promedio ACTUAL de una sección (solo lo ya rendido dentro de ella). */
export function sectionGrade(subject: Subject, nodeId: string): number | null {
  const node = findNode(subject.nodes, nodeId)
  if (!node || node.children === undefined) return null
  const graded = flattenLeaves(node.children).filter((l) => l.grade != null)
  const w = graded.reduce((s, l) => s + l.weight, 0)
  if (w <= EPS) return null
  return graded.reduce((s, l) => s + l.weight * (l.grade as number), 0) / w
}

/** Promedio de una sección asignando notas a pendientes (resto = `fallback`). */
export function sectionProjected(
  subject: Subject,
  nodeId: string,
  assignment: Record<string, number>,
  fallback: number,
): number {
  const node = findNode(subject.nodes, nodeId)
  if (!node || node.children === undefined) return 0
  return flattenLeaves(node.children).reduce((s, l) => {
    const g =
      l.grade != null ? l.grade : l.id != null && assignment[l.id] != null ? assignment[l.id] : fallback
    return s + l.weight * g
  }, 0)
}

/** Nota uniforme necesaria en lo pendiente de una sección para llegar a `min` (null si imposible/sin pendientes). */
export function sectionNeeded(subject: Subject, nodeId: string, min: number): number | null {
  const node = findNode(subject.nodes, nodeId)
  if (!node || node.children === undefined) return null
  const leaves = flattenLeaves(node.children)
  const K = leaves.filter((l) => l.grade != null).reduce((s, l) => s + l.weight * (l.grade as number), 0)
  const P = leaves.filter((l) => l.grade == null).reduce((s, l) => s + l.weight, 0)
  if (P <= EPS) return null
  const raw = (min - K) / P
  if (raw > subject.scale.max + EPS) return null // no alcanza ni con el máximo
  return ceilTo(Math.max(raw, subject.scale.min), 0.1)
}

export type ConditionResult = {
  id: string
  scopeId: string
  name: string
  min: number
  current: number | null
  met: boolean
  feasible: boolean
  hasPending: boolean
  needed: number | null
}

export function conditionResults(subject: Subject): ConditionResult[] {
  const scaleMax = subject.scale.max
  return (subject.conditions ?? []).map((c) => {
    const node = findNode(subject.nodes, c.scopeId)
    const current = sectionGrade(subject, c.scopeId)
    const max = sectionProjected(subject, c.scopeId, {}, scaleMax)
    const leaves = node?.children ? flattenLeaves(node.children) : []
    const hasPending = leaves.some((l) => l.grade == null)
    return {
      id: c.id,
      scopeId: c.scopeId,
      name: node?.name ?? 'Sección',
      min: c.min,
      current,
      met: current != null && current + EPS >= c.min,
      feasible: max + EPS >= c.min,
      hasPending,
      needed: sectionNeeded(subject, c.scopeId, c.min),
    }
  })
}

export function conditionsAllFeasible(subject: Subject): boolean {
  return conditionResults(subject).every((c) => c.feasible)
}
export function conditionsAllMet(subject: Subject): boolean {
  return conditionResults(subject).every((c) => c.met)
}

/** ¿Una asignación de notas a pendientes aprueba (promedio final + TODAS las condiciones)? */
export function meetsAll(subject: Subject, assignment: Record<string, number>): boolean {
  if (projectedFinal(subject, assignment) + EPS < subject.scale.pass) return false
  return (subject.conditions ?? []).every(
    (c) => sectionProjected(subject, c.scopeId, assignment, subject.scale.min) + EPS >= c.min,
  )
}

/**
 * ¿Los pesos de cada carpeta suman ~100? (para banners de aviso).
 * Revisa el nivel tope y, recursivamente, cada carpeta con hijos.
 */
export function weightsAreValid(subject: Subject): boolean {
  const check = (nodes: GradeNode[]): boolean => {
    if (nodes.length > 0) {
      const sum = nodes.reduce((s, n) => s + (n.weight || 0), 0)
      if (Math.abs(sum - 100) > 0.5) return false
    }
    return nodes.every((n) => (n.children ? check(n.children) : true))
  }
  return check(subject.nodes)
}
