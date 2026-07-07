import { auth } from './firebase'

// El endpoint de perfil vive junto al de la IA (misma base de Edge Functions),
// solo cambia el último segmento: .../functions/v1/chat → .../functions/v1/perfil
const AI = import.meta.env.VITE_AI_ENDPOINT as string | undefined
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
const ENDPOINT = AI ? AI.replace(/\/[^/]+$/, '/perfil') : undefined

/**
 * Guarda/actualiza el perfil del usuario en Supabase (correo lo saca el servidor del
 * token de Firebase). Fire-and-forget: si falla, no rompe el onboarding.
 */
export async function saveProfile(data: {
  nombre: string
  pais: string
  referral: string
}): Promise<void> {
  if (!ENDPOINT || !auth?.currentUser) return
  try {
    const idToken = await auth.currentUser.getIdToken()
    await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(ANON ? { apikey: ANON, Authorization: `Bearer ${ANON}` } : {}),
        'x-id-token': idToken,
      },
      body: JSON.stringify(data),
    })
  } catch {
    /* silencioso: no bloquear el onboarding si el guardado falla */
  }
}
