import type { GradeScale } from './types'

/**
 * Escalas de notas por país (banderas individuales, aunque compartan valores).
 * Se usan en el onboarding y en Ajustes. Bandera vía flagcdn (el emoji de bandera
 * no renderiza en todos los dispositivos).
 */
export type CountryScale = {
  code: string
  country: string
  label: string
  pass: string
  scale: GradeScale
}

export const COUNTRY_SCALES: CountryScale[] = [
  { code: 'cl', country: 'Chile', label: '1 - 7', pass: 'Aprueba 4', scale: { min: 1, max: 7, pass: 4 } },
  { code: 'mx', country: 'México', label: '0 - 10', pass: 'Aprueba 6', scale: { min: 0, max: 10, pass: 6 } },
  { code: 'ar', country: 'Argentina', label: '0 - 10', pass: 'Aprueba 6', scale: { min: 0, max: 10, pass: 6 } },
  { code: 'br', country: 'Brasil', label: '0 - 10', pass: 'Aprueba 5', scale: { min: 0, max: 10, pass: 5 } },
  { code: 'co', country: 'Colombia', label: '0 - 5', pass: 'Aprueba 3', scale: { min: 0, max: 5, pass: 3 } },
  { code: 'pe', country: 'Perú', label: '0 - 20', pass: 'Aprueba 11', scale: { min: 0, max: 20, pass: 11 } },
  { code: 've', country: 'Venezuela', label: '0 - 20', pass: 'Aprueba 11', scale: { min: 0, max: 20, pass: 11 } },
  { code: 'us', country: 'Estados Unidos', label: '0 - 100', pass: 'Aprueba 60', scale: { min: 0, max: 100, pass: 60 } },
]

export function flagUrl(code: string): string {
  return `https://flagcdn.com/w40/${code}.png`
}
