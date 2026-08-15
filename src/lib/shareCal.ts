import { auth } from './firebase'
import { authHeaders } from './profile'
import type { CalendarEvent } from './types'

// Endpoint de la función `calendario-publico` (misma base que la IA / perfil).
const AI = import.meta.env.VITE_AI_ENDPOINT as string | undefined
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
const ENDPOINT = AI ? AI.replace(/\/[^/]+$/, '/calendario-publico') : undefined

export type SharedCalendario = {
  nombre: string
  eventos: CalendarEvent[]
  ramos: { id: string; nombre: string; color: string }[]
  /** Meses compartidos ["YYYY-MM", ...] o null = calendario completo. */
  meses: string[] | null
}

export type CalShareState = { token: string | null; meses: string[] | null }

/** URL pública que se comparte (bonita: /calendario/<token>). */
export function shareCalUrl(token: string): string {
  return `${window.location.origin}/calendario/${token}`
}

async function manage(body: Record<string, unknown>): Promise<CalShareState | null> {
  if (!ENDPOINT || !auth?.currentUser) return null
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify(body),
    })
    if (!res.ok) return null
    const json = await res.json()
    return {
      token: typeof json?.token === 'string' && json.token ? json.token : null,
      meses: Array.isArray(json?.meses) && json.meses.length ? json.meses : null,
    }
  } catch {
    return null
  }
}

/** Estado actual del link (token null = compartir apagado). */
export const getCalShare = () => manage({ action: 'get' })
/** Activa el link con la selección de meses (null = todo el calendario). */
export const enableCalShare = (meses: string[] | null) => manage({ action: 'enable', meses })
/** Cambia qué meses se comparten sin tocar el token. */
export const setCalShareMeses = (meses: string[] | null) => manage({ action: 'config', meses })
/** Apaga el link (el token deja de funcionar). */
export const disableCalShare = () => manage({ action: 'disable' })

/** Vista pública: trae el calendario compartido por token (sin login). */
export async function fetchSharedCalendario(token: string): Promise<SharedCalendario | null> {
  if (!ENDPOINT) return null
  try {
    const res = await fetch(`${ENDPOINT}?t=${encodeURIComponent(token)}`, {
      headers: ANON ? { apikey: ANON, Authorization: `Bearer ${ANON}` } : {},
    })
    if (!res.ok) return null
    const json = await res.json()
    if (!json || !Array.isArray(json.eventos)) return null
    return {
      nombre: String(json.nombre ?? ''),
      eventos: json.eventos as CalendarEvent[],
      ramos: Array.isArray(json.ramos) ? json.ramos : [],
      meses: Array.isArray(json.meses) && json.meses.length ? json.meses : null,
    }
  } catch {
    return null
  }
}
