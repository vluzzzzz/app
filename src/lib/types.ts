export type GradeScale = {
  /** Nota mínima posible (ej: 1.0 en Chile) */
  min: number
  /** Nota máxima posible (ej: 7.0 en Chile) */
  max: number
  /** Nota mínima para aprobar (ej: 4.0 en Chile) */
  pass: number
}

export const DEFAULT_SCALE: GradeScale = { min: 1, max: 7, pass: 4 }

export type Evaluation = {
  id: string
  name: string
  /**
   * Ponderación (%) de esta evaluación dentro de su subdivisión.
   * Si es undefined/null, todas las evaluaciones de la subdivisión se
   * promedian por igual.
   */
  weight?: number
  /** Nota obtenida. null = pendiente (aún no se rinde). */
  grade: number | null
}

export type Subdivision = {
  id: string
  name: string
  /** Ponderación (%) de esta subdivisión sobre el total de la asignatura. */
  weight: number
  evaluations: Evaluation[]
}

export type Subject = {
  id: string
  name: string
  /** Color de acento (índice de la paleta o hex). */
  color?: string
  scale: GradeScale
  /**
   * Si está vacío, la asignatura funciona como una lista simple de
   * evaluaciones promediadas por igual (usando `looseEvaluations`).
   */
  subdivisions: Subdivision[]
  /** Evaluaciones sueltas cuando no hay subdivisiones. */
  looseEvaluations: Evaluation[]
  /**
   * Si es true, cada evaluación tiene su propio % dentro de la subdivisión.
   * Si es false/undefined, las evaluaciones se promedian por igual.
   */
  weightedEvals?: boolean
}

export type Theme = 'light' | 'dark'
