/** Formatea una nota con un decimal y coma decimal (estilo chileno): 5.4 -> "5,4". */
export function formatGrade(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '—'
  return n.toFixed(1).replace('.', ',')
}

/** Genera un id corto sin depender de Math.random en tiempo de módulo. */
export function makeId(): string {
  return (
    Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
  )
}
