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

/** Fantasmita de Brody (public/bro*.png) según el color de acento. */
const ACCENT_GHOST: Record<string, string> = {
  gray: 'brogray',
  black: 'broblack',
  red: 'brored',
  orange: 'broorange',
  green: 'brogreen',
  cyan: 'brocyan',
  blue: 'broceleste',
  indigo: 'bropurple',
  violet: 'bropurple2',
  pink: 'bropink',
}

export function accentGhost(id: string, dark = false): string {
  // El fantasmita negro se pierde en fondo oscuro → versión especial visible.
  if (id === 'black' && dark) return '/broblachthemeblack.png'
  return `/${ACCENT_GHOST[id] ?? 'brogray'}.png`
}

/** Versión más clara del acento (mezcla hacia blanco), para bordes/detalles. */
export function accentLightRgb(id: string, amount = 0.55): string {
  const [r, g, b] = accentRgb(id).split(' ').map(Number)
  const mix = (c: number) => Math.round(c + (255 - c) * amount)
  return `${mix(r)} ${mix(g)} ${mix(b)}`
}
