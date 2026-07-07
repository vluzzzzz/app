// Supabase Edge Function: guarda el PERFIL del usuario en la tabla `perfiles`.
// Se llama al terminar el onboarding. Verifica el ID token de Firebase (para saber
// quién es y sacar su correo) y hace upsert con la service role key (bypassa RLS, así
// la tabla queda cerrada al público y solo esta función escribe).
//
// Deploy:  supabase functions deploy perfil --no-verify-jwt
// Secretos: FIREBASE_PROJECT_ID (ya seteado). SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY
//           los inyecta Supabase automáticamente (no hay que setearlos).
//
// Tabla (crear en SQL Editor):
//   create table if not exists public.perfiles (
//     uid text primary key,
//     correo text, nombre text, pais text, referral text,
//     creado timestamptz not null default now(),
//     actualizado timestamptz not null default now()
//   );
//   alter table public.perfiles enable row level security;   -- sin políticas = cerrada al público

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
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin')
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(origin) })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405, origin)

  try {
    const idToken = req.headers.get('x-id-token') ?? ''
    if (!idToken) return json({ error: 'No autorizado' }, 401, origin)

    let payload: Record<string, unknown>
    try {
      const res = await jwtVerify(idToken, JWKS, {
        issuer: `https://securetoken.google.com/${PROJECT_ID}`,
        audience: PROJECT_ID,
      })
      payload = res.payload as Record<string, unknown>
    } catch {
      return json({ error: 'Sesión inválida' }, 401, origin)
    }

    const uid = String(payload.sub ?? payload.user_id ?? '')
    if (!uid) return json({ error: 'Sin uid' }, 400, origin)

    const body = await req.json().catch(() => ({}))
    const row = {
      uid,
      correo: typeof payload.email === 'string' ? payload.email : null,
      nombre: str(body.nombre, 80),
      pais: str(body.pais, 40),
      referral: str(body.referral, 40),
      actualizado: new Date().toISOString(),
    }

    const r = await fetch(`${SUPABASE_URL}/rest/v1/perfiles?on_conflict=uid`, {
      method: 'POST',
      headers: {
        apikey: SERVICE_ROLE,
        Authorization: `Bearer ${SERVICE_ROLE}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(row),
    })
    if (!r.ok) return json({ error: 'db', detail: await r.text() }, 502, origin)

    return json({ ok: true }, 200, origin)
  } catch (e) {
    return json({ error: String(e) }, 500, origin)
  }
})
