import type { Subject, Subdivision } from './types'

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

/** Una evaluación "efectiva" con su peso normalizado sobre el total (Σ = 1). */
type EffectiveEval = {
  /** id real de la evaluación, o null si es un bloque virtual (subdivisión vacía). */
  id: string | null
  name: string
  subName: string | null
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

/** Reparte el peso de una subdivisión entre sus evaluaciones. */
function subdivisionEntries(
  sub: Subdivision,
  weighted: boolean,
): { id: string | null; name: string; grade: number | null; weight: number }[] {
  const evals = sub.evaluations
  if (evals.length === 0) {
    // Subdivisión sin evaluaciones: bloque pendiente que ocupa todo su peso.
    return [{ id: null, name: sub.name, grade: null, weight: 1 }]
  }
  const useWeights =
    weighted && evals.every((e) => typeof e.weight === 'number' && (e.weight as number) > 0)
  const totalW = useWeights
    ? evals.reduce((s, e) => s + (e.weight as number), 0)
    : evals.length
  return evals.map((e) => ({
    id: e.id,
    name: e.name,
    grade: e.grade,
    weight: useWeights ? (e.weight as number) / totalW : 1 / totalW,
  }))
}

/** Convierte la asignatura en una lista plana de evaluaciones con pesos (Σ = 1). */
function effectiveEvals(subject: Subject): EffectiveEval[] {
  const weighted = !!subject.weightedEvals
  const subs: Subdivision[] =
    subject.subdivisions.length > 0
      ? subject.subdivisions
      : [
          {
            id: 'loose',
            name: '',
            weight: 100,
            evaluations: subject.looseEvaluations,
          },
        ]

  const totalSubW = subs.reduce((s, x) => s + (x.weight || 0), 0) || 1
  const out: EffectiveEval[] = []
  for (const sub of subs) {
    const subFrac = (sub.weight || 0) / totalSubW
    for (const en of subdivisionEntries(sub, weighted)) {
      out.push({
        id: en.id,
        name: en.name,
        subName: sub.name || null,
        grade: en.grade,
        weight: subFrac * en.weight,
      })
    }
  }
  return out
}

export function realEvaluationCount(subject: Subject): number {
  if (subject.subdivisions.length > 0) {
    return subject.subdivisions.reduce((s, d) => s + d.evaluations.length, 0)
  }
  return subject.looseEvaluations.length
}

export function gradedEvaluationCount(subject: Subject): number {
  const collect = (es: { grade: number | null }[]) =>
    es.filter((e) => e.grade != null).length
  if (subject.subdivisions.length > 0) {
    return subject.subdivisions.reduce((s, d) => s + collect(d.evaluations), 0)
  }
  return collect(subject.looseEvaluations)
}

/** Nota actual = promedio ponderado SOLO de lo ya rendido (null si no hay notas). */
export function currentGrade(subject: Subject): number | null {
  const graded = effectiveEvals(subject).filter((e) => e.grade != null)
  const wsum = graded.reduce((s, e) => s + e.weight, 0)
  if (wsum <= EPS) return null
  const k = graded.reduce((s, e) => s + e.weight * (e.grade as number), 0)
  return k / wsum
}

/** Suma ponderada de lo ya rendido (contribución conocida a la nota final). */
export function knownContribution(subject: Subject): number {
  return effectiveEvals(subject)
    .filter((e) => e.grade != null)
    .reduce((s, e) => s + e.weight * (e.grade as number), 0)
}

/** Peso total pendiente (Σ de pesos de las evaluaciones sin nota). */
export function pendingWeight(subject: Subject): number {
  return effectiveEvals(subject)
    .filter((e) => e.grade == null)
    .reduce((s, e) => s + e.weight, 0)
}

/**
 * Nota mínima uniforme necesaria en TODO lo pendiente para aprobar.
 */
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
  return effectiveEvals(subject)
    .filter((e) => e.grade == null && e.id != null)
    .map((e) => ({
      id: e.id as string,
      name: e.name,
      subName: e.subName,
      weight: e.weight,
    }))
}

/**
 * Nota final proyectada asignando notas a las pendientes.
 * `assignments`: mapa id→nota. Las pendientes sin asignar cuentan como su nota
 * mínima de la escala (peor caso) para no inflar el resultado.
 */
export function projectedFinal(
  subject: Subject,
  assignments: Record<string, number>,
): number {
  return effectiveEvals(subject).reduce((s, e) => {
    if (e.grade != null) return s + e.weight * e.grade
    const assigned = e.id != null ? assignments[e.id] : undefined
    return s + e.weight * (assigned != null ? assigned : subject.scale.min)
  }, 0)
}

/** Nota final proyectada asumiendo una nota uniforme `x` en todo lo pendiente. */
export function projectedGrade(subject: Subject, x: number): number {
  return effectiveEvals(subject).reduce(
    (s, e) => s + e.weight * (e.grade == null ? x : (e.grade as number)),
    0,
  )
}

export type Combo = {
  /** Nota de la primera pendiente. */
  a: number
  /** Nota necesaria en la segunda pendiente para aprobar (o null si imposible). */
  b: number | null
}

/**
 * Tabla de combinaciones cuando faltan EXACTAMENTE 2 notas.
 * Recorre la primera pendiente por el rango de la escala y calcula la segunda.
 */
export function combinationsFor(
  subject: Subject,
): { first: PendingEval; second: PendingEval; rows: Combo[] } | null {
  const pend = pendingEvaluations(subject)
  if (pend.length !== 2) return null
  const [first, second] = pend
  const K = knownContribution(subject)
  const { scale } = subject
  const rows: Combo[] = []
  // Recorre la nota de la primera en pasos de 0.5 (o enteros para escalas grandes).
  const step = scale.max - scale.min <= 10 ? 0.5 : 5
  for (let a = scale.min; a <= scale.max + EPS; a += step) {
    // K + wa*a + wb*b >= pass  =>  b = (pass - K - wa*a) / wb
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

export function subdivisionsWeightSum(subject: Subject): number {
  return subject.subdivisions.reduce((s, d) => s + (d.weight || 0), 0)
}

export function weightsAreValid(subject: Subject): boolean {
  if (subject.subdivisions.length === 0) return true
  return Math.abs(subdivisionsWeightSum(subject) - 100) < 0.01
}

/** ¿Los % por nota suman 100 en cada subdivisión (cuando están activados)? */
export function evalWeightsValid(subject: Subject): boolean {
  if (!subject.weightedEvals) return true
  const groups =
    subject.subdivisions.length > 0
      ? subject.subdivisions.map((d) => d.evaluations)
      : [subject.looseEvaluations]
  return groups.every((evals) => {
    if (evals.length === 0) return true
    const sum = evals.reduce((s, e) => s + (e.weight || 0), 0)
    return Math.abs(sum - 100) < 0.01
  })
}
