import { auth } from './firebase'
import type { ProfileFields } from '../store/useAppStore'

// El endpoint de perfil vive junto al de la IA (misma base de Edge Functions),
// solo cambia el último segmento: .../functions/v1/chat → .../functions/v1/perfil
const AI = import.meta.env.VITE_AI_ENDPOINT as string | undefined
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
const ENDPOINT = AI ? AI.replace(/\/[^/]+$/, '/perfil') : undefined

/** Payload que se manda a Supabase (nombres de columna de la tabla `perfiles`). */
export type ProfilePayload = {
  nombre?: string
  pais?: string
  referral?: string
  edad?: string
  carrera?: string
  avatar?: string
  banner?: string
}

async function authHeaders(): Promise<Record<string, string>> {
  const idToken = auth?.currentUser ? await auth.currentUser.getIdToken() : ''
  return {
    'Content-Type': 'application/json',
    ...(ANON ? { apikey: ANON, Authorization: `Bearer ${ANON}` } : {}),
    ...(idToken ? { 'x-id-token': idToken } : {}),
  }
}

/** Guarda/actualiza el perfil. Devuelve { nameLimited } si el cambio de nombre fue rechazado. */
export async function saveProfile(
  data: ProfilePayload,
): Promise<{ nameLimited?: boolean; profile?: Partial<ProfileFields> }> {
  if (!ENDPOINT || !auth?.currentUser) return {}
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify(data),
    })
    if (!res.ok) return {}
    const json = await res.json()
    return {
      nameLimited: !!json?.nameLimited,
      profile: json?.profile ? dbToProfile(json.profile) : undefined,
    }
  } catch {
    return {}
  }
}

/** Trae el perfil del usuario desde Supabase (para hidratar en otro dispositivo). */
export async function fetchProfile(): Promise<Partial<ProfileFields> | null> {
  if (!ENDPOINT || !auth?.currentUser) return null
  try {
    const res = await fetch(ENDPOINT, { method: 'GET', headers: await authHeaders() })
    if (!res.ok) return null
    const json = await res.json()
    return json?.profile ? dbToProfile(json.profile) : null
  } catch {
    return null
  }
}

/** Borra el perfil en Supabase ("Empezar de 0"). */
export async function deleteProfile(): Promise<void> {
  if (!ENDPOINT || !auth?.currentUser) return
  try {
    await fetch(ENDPOINT, { method: 'DELETE', headers: await authHeaders() })
  } catch {
    /* silencioso */
  }
}

/** Fila de la tabla `perfiles` → campos del store. */
type ProfileRow = Record<string, unknown>
export function dbToProfile(row: ProfileRow): Partial<ProfileFields> {
  const s = (v: unknown) => (typeof v === 'string' ? v : '')
  return {
    userName: s(row.nombre),
    referral: s(row.referral),
    country: s(row.pais),
    ageRange: s(row.edad),
    career: s(row.carrera),
    avatar: s(row.avatar),
    banner: s(row.banner) || 'esmeralda',
    nameChanges: typeof row.name_changes === 'number' ? row.name_changes : 0,
    nameMonth: s(row.name_month),
  }
}
