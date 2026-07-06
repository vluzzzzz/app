/** Catálogo de acciones que la IA puede pedir (todas por NOMBRE, no por id). */
export type AiAction =
  | {
      type: 'create_subject'
      name: string
      color?: string
      subdivisions?: { name: string; weight: number }[]
    }
  | {
      type: 'add_evaluation'
      subject: string
      subdivision?: string | null
      name: string
      grade?: number | null
    }
  | {
      type: 'set_grade'
      subject: string
      subdivision?: string | null
      evaluation: string
      grade: number
    }
  | {
      type: 'update_subdivision'
      subject: string
      subdivision: string
      weight?: number
      name?: string
    }
  | {
      type: 'remove_evaluation'
      subject: string
      subdivision?: string | null
      evaluation: string
    }
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
