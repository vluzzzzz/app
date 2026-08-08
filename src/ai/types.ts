/** Nodo del árbol que la IA puede mandar al crear un ramo (carpeta si trae children). */
export type AiNode = {
  name: string
  weight?: number
  grade?: number | null
  children?: AiNode[]
}

/**
 * Catálogo de acciones que la IA puede pedir (todo por NOMBRE / RUTA de nombres).
 * `path` = ruta de carpetas desde la sección tope hasta el nodo (ej:
 * ["Cátedra","Pruebas","Prueba 1"]). Para add_note, `path` es la carpeta destino.
 */
export type AiAction =
  | { type: 'create_subject'; name: string; color?: string; nodes?: AiNode[] }
  | { type: 'add_note'; subject: string; path?: string[]; name: string; grade?: number | null }
  | { type: 'set_grade'; subject: string; path: string[]; grade: number }
  | { type: 'update_node'; subject: string; path: string[]; weight?: number; name?: string }
  | { type: 'remove_node'; subject: string; path: string[] }
  | { type: 'remove_subject'; subject: string }

/** Respuesta esperada de la IA (JSON). */
export type AiResponse = {
  reply: string
  actions?: AiAction[]
}

export type ChatRole = 'user' | 'assistant'

export type ChatMessage = {
  id: string
  role: ChatRole
  text: string
  /** Resumen legible de acciones aplicadas (para chips). */
  applied?: string[]
  error?: boolean
}
