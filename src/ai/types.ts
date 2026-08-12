import type { EventType } from '../lib/types'

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
 *
 * Fechas SIEMPRE "YYYY-MM-DD" y horas "HH:mm" en 24h (las resuelve la IA a partir
 * de la fecha de hoy que recibe en el prompt).
 */
export type AiAction =
  | { type: 'create_subject'; name: string; color?: string; nodes?: AiNode[] }
  | { type: 'add_note'; subject: string; path?: string[]; name: string; grade?: number | null }
  | { type: 'set_grade'; subject: string; path: string[]; grade: number }
  | { type: 'update_node'; subject: string; path: string[]; weight?: number; name?: string }
  | { type: 'remove_node'; subject: string; path: string[] }
  | { type: 'remove_subject'; subject: string }
  // --- Tareas (to-do de la Home) ---
  | { type: 'add_task'; title: string; date?: string; time?: string }
  | { type: 'complete_task'; title: string }
  | { type: 'remove_task'; title: string }
  // --- Eventos del Calendario (pruebas, cumpleaños, recordatorios) ---
  | {
      type: 'add_event'
      title: string
      date: string
      time?: string
      endTime?: string
      /** evaluacion | tarea | evento | recordatorio (default: evento). */
      eventType?: EventType
      /** Ramo asociado (opcional, por nombre — útil en evaluaciones). */
      subject?: string
      repeat?: 'none' | 'daily' | 'weekly' | 'monthly'
      location?: string
      description?: string
    }
  | { type: 'remove_event'; title: string }
  /** Borra en bloque lo agendado en una fecha ("borra todo lo del 23 de octubre"). */
  | { type: 'clear_date'; date: string; scope?: 'all' | 'events' | 'tasks' }

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
