/** Paleta de acentos para las asignaturas (gradientes vibrantes tipo iOS). */
export const ACCENTS: { id: string; from: string; to: string }[] = [
  { id: 'violet', from: '#8b5cf6', to: '#6366f1' },
  { id: 'pink', from: '#ec4899', to: '#f43f5e' },
  { id: 'orange', from: '#fb923c', to: '#f97316' },
  { id: 'teal', from: '#2dd4bf', to: '#06b6d4' },
  { id: 'green', from: '#34d399', to: '#10b981' },
  { id: 'blue', from: '#38bdf8', to: '#3b82f6' },
  { id: 'amber', from: '#fbbf24', to: '#f59e0b' },
]

export function accentById(id?: string) {
  return ACCENTS.find((a) => a.id === id) ?? ACCENTS[0]
}

export function gradient(id?: string): string {
  const a = accentById(id)
  return `linear-gradient(135deg, ${a.from}, ${a.to})`
}
