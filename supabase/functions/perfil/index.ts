// Supabase Edge Function: PERFIL del usuario (tabla `perfiles`).
// Verifica el ID token de Firebase (identidad) y opera con la service role key.
//   GET    -> devuelve la fila del usuario (para hidratar en cualquier dispositivo).
//   POST   -> upsert del perfil; aplica el límite de 3 cambios de nombre por mes.
//   DELETE -> borra la fila (para "Empezar de 0").
//
// Deploy:  supabase functions deploy perfil --no-verify-jwt
// Tabla (SQL Editor): ver README abajo — requiere las columnas edad, carrera, avatar,
//   banner, name_changes, name_month (además de uid, correo, nombre, pais, referral).

import { createRemoteJWKSet, jwtVerify } from 'https://esm.sh/jose@5.9.6'

const PROJECT_ID = Deno.env.get('FIREBASE_PROJECT_ID') ?? 'brody-13148'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const NAME_LIMIT = 3

const ALLOWED_ORIGINS = [
  'https://brrody.app',
  'https://www.brrody.app',
  'http://localhost:5173',
]

const JWKS = createRemoteJWKSet(
  new URL(
    'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com',
  ),
)

function corsHeaders(origin: string | null) {
  const allow = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type, x-id-token',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    Vary: 'Origin',
  }
}

function json(body: unknown, status: number, origin: string | null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
  })
}

const str = (v: unknown, max: number) =>
  typeof v === 'string' ? v.slice(0, max) : null

const rest = (path: string, init: RequestInit) =>
  fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SERVICE_ROLE,
      Authorization: `Bearer ${SERVICE_ROLE}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  })

async function getRow(uid: string) {
  const r = await rest(`perfiles?uid=eq.${encodeURIComponent(uid)}&select=*`, {
    method: 'GET',
  })
  if (!r.ok) return null
  const rows = await r.json()
  return Array.isArray(rows) && rows.length ? rows[0] : null
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin')
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(origin) })

  // Autenticación: ID token de Firebase.
  const idToken = req.headers.get('x-id-token') ?? ''
  if (!idToken) return json({ error: 'No autorizado' }, 401, origin)
  let uid = ''
  let email: string | null = null
  try {
    const { payload } = await jwtVerify(idToken, JWKS, {
      issuer: `https://securetoken.google.com/${PROJECT_ID}`,
      audience: PROJECT_ID,
    })
    uid = String(payload.sub ?? (payload as Record<string, unknown>).user_id ?? '')
    email = typeof payload.email === 'string' ? payload.email : null
  } catch {
    return json({ error: 'Sesión inválida' }, 401, origin)
  }
  if (!uid) return json({ error: 'Sin uid' }, 400, origin)

  try {
    // GET: devolver la fila.
    if (req.method === 'GET') {
      const row = await getRow(uid)
      return json({ profile: row }, 200, origin)
    }

    // DELETE: borrar la fila ("Empezar de 0").
    if (req.method === 'DELETE') {
      await rest(`perfiles?uid=eq.${encodeURIComponent(uid)}`, { method: 'DELETE' })
      return json({ ok: true }, 200, origin)
    }

    if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405, origin)

    // POST: upsert con límite de nombre.
    const body = await req.json().catch(() => ({}))
    const existing = await getRow(uid)
    const month = new Date().toISOString().slice(0, 7) // YYYY-MM

    const incomingName = str(body.nombre, 80)
    let finalName = incomingName ?? existing?.nombre ?? null
    let nameChanges = existing?.name_changes ?? 0
    let nameMonth = existing?.name_month ?? month
    let nameLimited = false

    if (existing && incomingName != null && incomingName !== existing.nombre) {
      const usedThisMonth = existing.name_month === month ? existing.name_changes ?? 0 : 0
      if (usedThisMonth >= NAME_LIMIT) {
        finalName = existing.nombre // rechazado: se mantiene el anterior
        nameLimited = true
        nameChanges = usedThisMonth
        nameMonth = month
      } else {
        nameChanges = usedThisMonth + 1
        nameMonth = month
      }
    } else if (!existing) {
      // Primer guardado (onboarding): no cuenta como cambio.
      nameChanges = 0
      nameMonth = month
    }

    const row = {
      uid,
      correo: email,
      nombre: finalName,
      pais: str(body.pais, 40),
      referral: str(body.referral, 40),
      edad: str(body.edad, 20),
      carrera: str(body.carrera, 60),
      avatar: str(body.avatar, 40),
      banner: str(body.banner, 40),
      name_changes: nameChanges,
      name_month: nameMonth,
      actualizado: new Date().toISOString(),
    }

    const r = await rest(`perfiles?on_conflict=uid`, {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify(row),
    })
    if (!r.ok) return json({ error: 'db', detail: await r.text() }, 502, origin)
    const saved = await r.json().catch(() => null)
    return json(
      { ok: true, nameLimited, profile: Array.isArray(saved) ? saved[0] : saved },
      200,
      origin,
    )
  } catch (e) {
    return json({ error: String(e) }, 500, origin)
  }
})
