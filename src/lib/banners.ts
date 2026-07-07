// Degradados del banner del perfil (lo único con color). Diagonales suaves de 2 tonos
// del mismo hue → look premium. En la UI se les añade un brillo radial + grano fino.
export type Banner = { id: string; css: string }

export const BANNERS: Banner[] = [
  { id: 'bosque', css: 'linear-gradient(120deg, #064e3b 0%, #10b981 100%)' },
  { id: 'oceano', css: 'linear-gradient(120deg, #0c4a6e 0%, #38bdf8 100%)' },
  { id: 'lavanda', css: 'linear-gradient(120deg, #4338ca 0%, #a78bfa 100%)' },
  { id: 'atardecer', css: 'linear-gradient(120deg, #9a3412 0%, #fb923c 100%)' },
  { id: 'cereza', css: 'linear-gradient(120deg, #9f1239 0%, #fb7185 100%)' },
  { id: 'menta', css: 'linear-gradient(120deg, #0f766e 0%, #2dd4bf 100%)' },
  { id: 'uva', css: 'linear-gradient(120deg, #6b21a8 0%, #c084fc 100%)' },
  { id: 'grafito', css: 'linear-gradient(120deg, #111827 0%, #6b7280 100%)' },
]

// Brillo radial que se superpone al degradado para darle profundidad "fachera".
export const BANNER_SHEEN =
  'radial-gradient(120% 100% at 12% -10%, rgba(255,255,255,0.38) 0%, rgba(255,255,255,0) 55%)'

export function bannerCss(id: string): string {
  return (BANNERS.find((b) => b.id === id) ?? BANNERS[0]).css
}
