// Supabase Edge Function: CALENDARIO PÚBLICO (compartir calendario con un link).
//   GET  ?t=<token>  -> { nombre, eventos, ramos, meses } de quien comparte (SIN login).
//   POST (x-id-token) body {action:'get'|'enable'|'config'|'disable', meses?} -> administra
//        el link propio. `meses` = ["YYYY-MM", ...] para compartir solo esos meses,
//        o null/[] para compartir el calendario completo.
//
// Requiere en public.perfiles: share_calendario text, share_cal_meses jsonb.
// Deploy: supabase functions deploy calendario-publico --no-verify-jwt

// npm: (no esm.sh): el deploy EMPAQUETA la librería — sin descargas en el cold start.
import { createRemoteJWKSet, jwtVerify } from 'npm:jose@5.9.6'

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

/** Normaliza la selección de meses: ["YYYY-MM"] únicos y ordenados, o null = todo. */
function sanitizeMeses(input: unknown): string[] | null {
  if (!Array.isArray(input)) return null
  const ok = [...new Set(input.filter((m) => typeof m === 'string' && /^\d{4}-\d{2}$/.test(m)))]
    .sort()
    .slice(0, 24)
  return ok.length ? ok : null
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin')
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(origin) })

  try {
    // ---- GET público: ver calendario por token ----
    if (req.method === 'GET') {
      const token = new URL(req.url).searchParams.get('t') ?? ''
      if (!token || token.length < 16) return json({ error: 'Link inválido' }, 400, origin)
      const r = await rest(
        `perfiles?share_calendario=eq.${encodeURIComponent(token)}&select=nombre,eventos,ramos,horario,share_cal_meses,share_cal_clases`,
        { method: 'GET' },
      )
      if (!r.ok) return json({ error: 'db' }, 502, origin)
      const rows = await r.json()
      const row = Array.isArray(rows) && rows.length ? rows[0] : null
      if (!row) return json({ error: 'Este link ya no está activo' }, 404, origin)

      const meses = sanitizeMeses(row.share_cal_meses)
      let eventos = Array.isArray(row.eventos) ? row.eventos : []
      if (meses) {
        // Solo eventos de los meses elegidos. Los repetitivos (semanal/mensual…)
        // se incluyen igual: ocurren también dentro de los meses compartidos y la
        // vista pública solo permite navegar esos meses.
        eventos = eventos.filter(
          (e: { date?: string; repeat?: string }) =>
            (typeof e.date === 'string' && meses.includes(e.date.slice(0, 7))) ||
            (e.repeat && e.repeat !== 'none'),
        )
      }
      return json(
        {
          nombre: row.nombre ?? '',
          eventos,
          ramos: publicRamos(row.ramos),
          meses,
          // Las clases del horario solo viajan si el dueño prendió el interruptor.
          horario: row.share_cal_clases === true && Array.isArray(row.horario) ? row.horario : [],
          clases: row.share_cal_clases === true,
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
        `perfiles?uid=eq.${encodeURIComponent(uid)}&select=share_calendario,share_cal_meses,share_cal_clases`,
        { method: 'GET' },
      )
      if (!r.ok) return null
      const rows = await r.json()
      return Array.isArray(rows) && rows.length ? rows[0] : null
    }

    if (action === 'get') {
      const row = await getRow()
      return json(
        {
          token: row?.share_calendario ?? null,
          meses: sanitizeMeses(row?.share_cal_meses),
          clases: row?.share_cal_clases === true,
        },
        200,
        origin,
      )
    }

    if (action === 'enable') {
      const meses = sanitizeMeses(body?.meses)
      const clases = body?.clases === true
      const row = await getRow()
      let token: string = row?.share_calendario ?? ''
      if (!token) token = crypto.randomUUID().replace(/-/g, '')
      const r = await rest(`perfiles?uid=eq.${encodeURIComponent(uid)}`, {
        method: 'PATCH',
        body: JSON.stringify({ share_calendario: token, share_cal_meses: meses, share_cal_clases: clases }),
      })
      if (!r.ok) return json({ error: 'db', detail: await r.text() }, 502, origin)
      return json({ token, meses, clases }, 200, origin)
    }

    if (action === 'config') {
      const meses = sanitizeMeses(body?.meses)
      const clases = body?.clases === true
      const r = await rest(`perfiles?uid=eq.${encodeURIComponent(uid)}`, {
        method: 'PATCH',
        body: JSON.stringify({ share_cal_meses: meses, share_cal_clases: clases }),
      })
      if (!r.ok) return json({ error: 'db' }, 502, origin)
      const row = await getRow()
      return json({ token: row?.share_calendario ?? null, meses, clases }, 200, origin)
    }

    if (action === 'disable') {
      const r = await rest(`perfiles?uid=eq.${encodeURIComponent(uid)}`, {
        method: 'PATCH',
        body: JSON.stringify({ share_calendario: null, share_cal_meses: null, share_cal_clases: null }),
      })
      if (!r.ok) return json({ error: 'db' }, 502, origin)
      return json({ token: null, meses: null, clases: false }, 200, origin)
    }

    return json({ error: 'Acción desconocida' }, 400, origin)
  } catch (e) {
    console.error('Excepción no manejada:', String(e))
    return json({ error: String(e) }, 500, origin)
  }
})
