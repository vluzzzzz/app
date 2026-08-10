export type GradeScale = {
  /** Nota mínima posible (ej: 1.0 en Chile) */
  min: number
  /** Nota máxima posible (ej: 7.0 en Chile) */
  max: number
  /** Nota mínima para aprobar (ej: 4.0 en Chile) */
  pass: number
}

export const DEFAULT_SCALE: GradeScale = { min: 1, max: 7, pass: 4 }

/**
 * Nodo del árbol de evaluación de un ramo.
 * - Si tiene `children`, es una CARPETA (sección o subgrupo); los pesos de sus
 *   hijos suman 100 entre ellos.
 * - Si NO tiene `children`, es una NOTA (hoja) con su `grade` (null = pendiente).
 */
export type GradeNode = {
  id: string
  name: string
  /** Ponderación (%) dentro de su padre (los hermanos suman 100). */
  weight: number
  /** Hijos: si está presente (aunque sea []), el nodo es una carpeta. */
  children?: GradeNode[]
  /** Nota obtenida (solo hojas). null = pendiente. */
  grade?: number | null
}

export type Subject = {
  id: string
  name: string
  /** Id del color (paleta de Apariencia, ver src/lib/accents.ts). */
  color?: string
  scale: GradeScale
  /** Secciones tope del ramo (sus pesos suman 100). Árbol anidado de GradeNode. */
  nodes: GradeNode[]
  /**
   * Condiciones de aprobación OPCIONALES además del promedio final ≥ pass.
   * Ej: "Cátedra ≥ 4,0". Vacío/undefined = ramo normal. Todas deben cumplirse (AND).
   */
  conditions?: ApprovalCondition[]
  /** Prueba optativa OPCIONAL (modalidad especial de cálculo). undefined = no tiene. */
  optativa?: Optativa
}

/**
 * Prueba optativa: reemplaza parcialmente el promedio.
 * final = promedioActual·(actualPct%) + nota·((100-actualPct)%).
 */
export type Optativa = {
  /** Peso del promedio actual (0-100). La optativa pesa (100 - actualPct). Default 60. */
  actualPct: number
  grade: number | null
}

/** Regla extra de aprobación: el promedio de una sección debe ser ≥ min. */
export type ApprovalCondition = {
  id: string
  /** Id del nodo (sección) del árbol al que aplica. */
  scopeId: string
  /** Nota mínima que debe alcanzar el promedio de esa sección. */
  min: number
}

export type Theme = 'light' | 'dark'

export type Task = {
  id: string
  title: string
  done: boolean
  /** Hora opcional "HH:mm"; se muestra como "Hoy: 11:00am". */
  time?: string
  /** Id de la paleta ACCENTS para la barra lateral (si no hay, va negra/ink). */
  color?: string
}
