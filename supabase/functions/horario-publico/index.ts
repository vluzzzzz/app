// Supabase Edge Function: HORARIO PÚBLICO (compartir horario con un link).
//   GET  ?t=<token>  -> devuelve { nombre, horario, ramos } de quien comparte (SIN login).
//   POST (x-id-token) body {action:'get'|'enable'|'disable'} -> administra el link propio:
//        get: token actual (o null) · enable: crea/devuelve token · disable: lo borra.
//
// Requiere la columna `share_horario text` en public.perfiles (ver SETUP-COMPARTIR-HORARIO.md).
// Deploy: supabase functions deploy horario-publico --no-verify-jwt

import { createRemoteJWKSet, jwtVerify } from 'https://esm.sh/jose@5.9.6'

const PROJECT_ID = Deno.env.get('FIREBASE_PROJECT_ID') ?? 'brody-13148'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

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
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    Vary: 'Origin',
  }
}

function json(body: unknown, status: number, origin: string | null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
  })
}

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

/** Ramos jsonb → subset público (id, nombre, color). Nada de notas. */
function publicRamos(ramos: unknown): { id: string; nombre: string; color: string }[] {
  if (!Array.isArray(ramos)) return []
  return ramos.map((r) => ({
    id: String((r as Record<string, unknown>).id ?? ''),
    nombre: String((r as Record<string, unknown>).name ?? ''),
    color: String((r as Record<string, unknown>).color ?? 'gray'),
  }))
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin')
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(origin) })

  try {
    // ---- GET público: ver horario por token ----
    if (req.method === 'GET') {
      const token = new URL(req.url).searchParams.get('t') ?? ''
      if (!token || token.length < 16) return json({ error: 'Link inválido' }, 400, origin)
      const r = await rest(
        `perfiles?share_horario=eq.${encodeURIComponent(token)}&select=nombre,horario,ramos`,
        { method: 'GET' },
      )
      if (!r.ok) return json({ error: 'db' }, 502, origin)
      const rows = await r.json()
      const row = Array.isArray(rows) && rows.length ? rows[0] : null
      if (!row) return json({ error: 'Este link ya no está activo' }, 404, origin)
      return json(
        {
          nombre: row.nombre ?? '',
          horario: Array.isArray(row.horario) ? row.horario : [],
          ramos: publicRamos(row.ramos),
        },
        200,
        origin,
      )
    }

    if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405, origin)

    // ---- POST autenticado: administrar el link propio ----
    const idToken = req.headers.get('x-id-token') ?? ''
    if (!idToken) return json({ error: 'No autorizado' }, 401, origin)
    let uid = ''
    try {
      const { payload } = await jwtVerify(idToken, JWKS, {
        issuer: `https://securetoken.google.com/${PROJECT_ID}`,
        audience: PROJECT_ID,
      })
      uid = String(payload.sub ?? (payload as Record<string, unknown>).user_id ?? '')
    } catch {
      return json({ error: 'Sesión inválida' }, 401, origin)
    }
    if (!uid) return json({ error: 'Sin uid' }, 400, origin)

    const body = await req.json().catch(() => ({}))
    const action = body?.action

    const getRow = async () => {
      const r = await rest(
        `perfiles?uid=eq.${encodeURIComponent(uid)}&select=share_horario`,
        { method: 'GET' },
      )
      if (!r.ok) return null
      const rows = await r.json()
      return Array.isArray(rows) && rows.length ? rows[0] : null
    }

    if (action === 'get') {
      const row = await getRow()
      return json({ token: row?.share_horario ?? null }, 200, origin)
    }

    if (action === 'enable') {
      const row = await getRow()
      let token: string = row?.share_horario ?? ''
      if (!token) {
        token = crypto.randomUUID().replace(/-/g, '')
        const r = await rest(`perfiles?uid=eq.${encodeURIComponent(uid)}`, {
          method: 'PATCH',
          body: JSON.stringify({ share_horario: token }),
        })
        if (!r.ok) return json({ error: 'db', detail: await r.text() }, 502, origin)
      }
      return json({ token }, 200, origin)
    }

    if (action === 'disable') {
      const r = await rest(`perfiles?uid=eq.${encodeURIComponent(uid)}`, {
        method: 'PATCH',
        body: JSON.stringify({ share_horario: null }),
      })
      if (!r.ok) return json({ error: 'db' }, 502, origin)
      return json({ token: null }, 200, origin)
    }

    return json({ error: 'Acción desconocida' }, 400, origin)
  } catch (e) {
    return json({ error: String(e) }, 500, origin)
  }
})
