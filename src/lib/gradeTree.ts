import { makeId } from './format'
import { DEFAULT_SCALE, type GradeNode, type Subject } from './types'

/** ¿El nodo es una carpeta (tiene children)? Si no, es una nota (hoja). */
export const isFolder = (n: GradeNode): boolean => n.children !== undefined

/** Reparte 100% parejo entre los hijos (el último absorbe el redondeo). */
export function distributeChildren(children: GradeNode[]): GradeNode[] {
  const n = children.length
  if (n === 0) return children
  const base = Math.round((100 / n) * 10) / 10
  return children.map((c, i) => ({
    ...c,
    weight: i === n - 1 ? Math.round((100 - base * (n - 1)) * 10) / 10 : base,
  }))
}

export const makeNote = (name: string): GradeNode => ({
  id: makeId(),
  name,
  weight: 0,
  grade: null,
})

export const makeFolder = (name: string, children: GradeNode[] = []): GradeNode => ({
  id: makeId(),
  name,
  weight: 0,
  children,
})

/** Transforma el nodo con `id` (recursivo, inmutable). */
export function mapNodeById(
  nodes: GradeNode[],
  id: string,
  fn: (n: GradeNode) => GradeNode,
): GradeNode[] {
  return nodes.map((n) => {
    if (n.id === id) return fn(n)
    if (n.children) return { ...n, children: mapNodeById(n.children, id, fn) }
    return n
  })
}

/** Agrega un hijo bajo `parentId` (null = nivel tope) y reparte pesos parejos. */
export function withChildAdded(
  nodes: GradeNode[],
  parentId: string | null,
  child: GradeNode,
): GradeNode[] {
  if (parentId === null) return distributeChildren([...nodes, child])
  return nodes.map((n) => {
    if (n.id === parentId) {
      return { ...n, children: distributeChildren([...(n.children ?? []), child]) }
    }
    if (n.children) return { ...n, children: withChildAdded(n.children, parentId, child) }
    return n
  })
}

/** Quita el nodo `id` y reparte parejo los hermanos restantes. */
export function withNodeRemoved(nodes: GradeNode[], id: string): GradeNode[] {
  if (nodes.some((n) => n.id === id)) {
    return distributeChildren(nodes.filter((n) => n.id !== id))
  }
  return nodes.map((n) => (n.children ? { ...n, children: withNodeRemoved(n.children, id) } : n))
}

/** Redimensiona la cantidad de NOTAS (hojas) bajo `parentId` (null = tope). */
export function resizeChildren(
  nodes: GradeNode[],
  parentId: string | null,
  count: number,
  prefix: string,
): GradeNode[] {
  const resize = (children: GradeNode[]): GradeNode[] => {
    const next = [...children]
    while (next.length < count) next.push(makeNote(`${prefix} ${next.length + 1}`))
    while (next.length > count) {
      // Quita primero las notas pendientes (sin nota), desde el final.
      const idx = [...next]
        .map((c, i) => ({ c, i }))
        .reverse()
        .find((x) => x.c.children === undefined && x.c.grade == null)?.i
      next.splice(idx ?? next.length - 1, 1)
    }
    return distributeChildren(next)
  }
  if (parentId === null) return resize(nodes)
  return mapNodeById(nodes, parentId, (n) => ({ ...n, children: resize(n.children ?? []) }))
}

/** Árbol de evaluación por defecto para un ramo nuevo (Cátedra → Controles/Pruebas). */
export function defaultEvalTree(): GradeNode[] {
  const controles: GradeNode = {
    ...makeFolder('Controles'),
    weight: 50,
    children: distributeChildren([makeNote('Control 1'), makeNote('Control 2')]),
  }
  const pruebas: GradeNode = {
    ...makeFolder('Pruebas'),
    weight: 50,
    children: distributeChildren([makeNote('Prueba 1'), makeNote('Prueba 2')]),
  }
  return [{ ...makeFolder('Cátedra'), weight: 100, children: [controles, pruebas] }]
}

/* ---------- Migración del modelo viejo (2 niveles) al árbol ---------- */

const THEME_IDS = new Set([
  'gray', 'black', 'red', 'orange', 'green', 'cyan', 'blue', 'indigo', 'violet', 'pink',
])
const OLD_COLOR_MAP: Record<string, string> = { teal: 'cyan', amber: 'orange' }

/** Normaliza el color viejo (gradiente) a un id de la paleta de Apariencia. */
export function normalizeColor(raw: unknown): string {
  if (typeof raw !== 'string') return 'gray'
  if (THEME_IDS.has(raw)) return raw
  if (raw in OLD_COLOR_MAP) return OLD_COLOR_MAP[raw]
  return 'gray'
}

/** Convierte cualquier Subject (nuevo o viejo shape) al modelo de árbol. */
export function normalizeSubject(raw: unknown): Subject {
  const r = (raw ?? {}) as Record<string, any>
  const scale = r.scale ?? DEFAULT_SCALE
  const color = normalizeColor(r.color)
  const conditions = Array.isArray(r.conditions) ? r.conditions : []
  const base = { id: r.id ?? makeId(), name: r.name || 'Ramo', color, scale, conditions }

  // Ya es el modelo nuevo.
  if (Array.isArray(r.nodes)) return { ...base, nodes: r.nodes as GradeNode[] }

  // Modelo viejo: subdivisions (+ evaluations) o looseEvaluations.
  let nodes: GradeNode[] = []
  if (Array.isArray(r.subdivisions) && r.subdivisions.length) {
    nodes = r.subdivisions.map((sub: any) => {
      const evs: GradeNode[] = (sub.evaluations ?? []).map((e: any) => ({
        id: e.id ?? makeId(),
        name: e.name || 'Nota',
        weight: r.weightedEvals && typeof e.weight === 'number' ? e.weight : 0,
        grade: e.grade ?? null,
      }))
      return {
        id: sub.id ?? makeId(),
        name: sub.name || 'Sección',
        weight: typeof sub.weight === 'number' ? sub.weight : 0,
        children: r.weightedEvals ? evs : distributeChildren(evs),
      }
    })
  } else if (Array.isArray(r.looseEvaluations) && r.looseEvaluations.length) {
    nodes = distributeChildren(
      r.looseEvaluations.map((e: any) => ({
        id: e.id ?? makeId(),
        name: e.name || 'Nota',
        weight: 0,
        grade: e.grade ?? null,
      })),
    )
  }
  return { ...base, nodes }
}
