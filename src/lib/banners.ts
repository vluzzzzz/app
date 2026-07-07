// Degradados "facheros" predefinidos para el banner del perfil.
// `css` es el valor de `background` (degradado diagonal multi-color). Encima se le pone
// una capa de grano (en ProfilePage) para el look aesthetic tipo la referencia.
export type Banner = { id: string; css: string }

export const BANNERS: Banner[] = [
  { id: 'esmeralda', css: 'linear-gradient(135deg, #0f5132 0%, #22c55e 55%, #86efac 100%)' },
  { id: 'oceano', css: 'linear-gradient(135deg, #0c4a6e 0%, #0ea5e9 55%, #67e8f9 100%)' },
  { id: 'atardecer', css: 'linear-gradient(135deg, #7c2d12 0%, #f97316 50%, #fde047 100%)' },
  { id: 'uva', css: 'linear-gradient(135deg, #4c1d95 0%, #8b5cf6 55%, #d8b4fe 100%)' },
  { id: 'rosa', css: 'linear-gradient(135deg, #831843 0%, #ec4899 55%, #fbcfe8 100%)' },
  { id: 'cielo', css: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 55%, #93c5fd 100%)' },
  { id: 'fuego', css: 'linear-gradient(135deg, #7f1d1d 0%, #ef4444 50%, #fca5a5 100%)' },
  { id: 'menta', css: 'linear-gradient(135deg, #134e4a 0%, #14b8a6 55%, #99f6e4 100%)' },
  { id: 'noche', css: 'linear-gradient(135deg, #0b1020 0%, #334155 55%, #94a3b8 100%)' },
  { id: 'durazno', css: 'linear-gradient(135deg, #9d174d 0%, #fb7185 45%, #fed7aa 100%)' },
]

export function bannerCss(id: string): string {
  return (BANNERS.find((b) => b.id === id) ?? BANNERS[0]).css
}
