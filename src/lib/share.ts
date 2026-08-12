import { auth } from './firebase'
import { authHeaders } from './profile'
import type { ClassBlock } from './types'

// Endpoint de la función `horario-publico` (misma base que la IA / perfil).
const AI = import.meta.env.VITE_AI_ENDPOINT as string | undefined
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
const ENDPOINT = AI ? AI.replace(/\/[^/]+$/, '/horario-publico') : undefined

export type SharedHorario = {
  nombre: string
  horario: ClassBlock[]
  ramos: { id: string; nombre: string; color: string }[]
}

/** URL pública que se comparte (bonita: /horario/<token>). */
export function shareUrl(token: string): string {
  return `${window.location.origin}/horario/${token}`
}

async function manage(action: 'get' | 'enable' | 'disable'): Promise<string | null> {
  if (!ENDPOINT || !auth?.currentUser) return null
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify({ action }),
    })
    if (!res.ok) return null
    const json = await res.json()
    return typeof json?.token === 'string' && json.token ? json.token : null
  } catch {
    return null
  }
}

/** Token actual del link (null = compartir apagado). */
export const getShareToken = () => manage('get')
/** Activa el link (crea el token si no existe) y lo devuelve. */
export const enableShare = () => manage('enable')
/** Apaga el link (el token deja de funcionar). */
export const disableShare = () => manage('disable')

/** Vista pública: trae el horario compartido por token (sin login). */
export async function fetchSharedHorario(token: string): Promise<SharedHorario | null> {
  if (!ENDPOINT) return null
  try {
    const res = await fetch(`${ENDPOINT}?t=${encodeURIComponent(token)}`, {
      headers: ANON ? { apikey: ANON, Authorization: `Bearer ${ANON}` } : {},
    })
    if (!res.ok) return null
    const json = await res.json()
    if (!json || !Array.isArray(json.horario)) return null
    return json as SharedHorario
  } catch {
    return null
  }
}
