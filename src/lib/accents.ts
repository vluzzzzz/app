export type AccentTheme = { id: string; label: string; rgb: string }

/**
 * Paleta de colores de acento elegible por el usuario (Apariencia).
 * `rgb` es "r g b" para usar como `rgb(var(--accent))`.
 * El default es gris → look monocromático.
 */
export const ACCENT_THEMES: AccentTheme[] = [
  { id: 'gray', label: 'Gris', rgb: '148 163 184' },
  { id: 'black', label: 'Negro', rgb: '39 39 42' },
  { id: 'red', label: 'Rojo', rgb: '239 68 68' },
  { id: 'orange', label: 'Naranjo', rgb: '249 115 22' },
  { id: 'green', label: 'Verde', rgb: '34 197 94' },
  { id: 'cyan', label: 'Cyan', rgb: '6 182 212' },
  { id: 'blue', label: 'Azul', rgb: '59 130 246' },
  { id: 'indigo', label: 'Índigo', rgb: '99 102 241' },
  { id: 'violet', label: 'Violeta', rgb: '139 92 246' },
  { id: 'pink', label: 'Rosado', rgb: '236 72 153' },
]

export function accentRgb(id: string): string {
  return (ACCENT_THEMES.find((a) => a.id === id) ?? ACCENT_THEMES[0]).rgb
}
