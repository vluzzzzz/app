// Supabase Edge Function: proxy del chat de IA.
// Reenvía los mensajes a Groq usando la API key guardada como secreto (GROQ_API_KEY),
// así la key nunca queda expuesta en el frontend. Devuelve { reply, actions }.
//
// SEGURIDAD:
// - Exige un ID token válido de Firebase (header x-id-token) → solo usuarios logueados
//   en Brody pueden usar la IA (evita que cualquiera gaste tu cuota de Groq).
// - CORS restringido a los dominios de Brody.
// - Límites de tamaño de entrada (anti-abuso / prompts gigantes).
//
// Deploy:  supabase functions deploy chat --no-verify-jwt
// Secretos:
//   supabase secrets set GROQ_API_KEY=tu_key
//   supabase secrets set FIREBASE_PROJECT_ID=brody-13148   (opcional; default abajo)

import { createRemoteJWKSet, jwtVerify } from 'https://esm.sh/jose@5.9.6'

const GROQ_KEY = Deno.env.get('GROQ_API_KEY')
const MODEL = Deno.env.get('GROQ_MODEL') ?? 'llama-3.3-70b-versatile'
const PROJECT_ID = Deno.env.get('FIREBASE_PROJECT_ID') ?? 'brody-13148'

// Dominios permitidos (CORS).
const ALLOWED_ORIGINS = [
  'https://brrody.app',
  'https://www.brrody.app',
  'http://localhost:5173',
]

// Límites de entrada anti-abuso.
const MAX_MESSAGES = 50
const MAX_CHARS_PER_MSG = 6000
const MAX_TOTAL_CHARS = 16000

// Verificador de ID tokens de Firebase (claves públicas rotativas de Google).
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

async function verifyFirebaseToken(token: string) {
  const { payload } = await jwtVerify(token, JWKS, {
    issuer: `https://securetoken.google.com/${PROJECT_ID}`,
    audience: PROJECT_ID,
  })
  return payload
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin')
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(origin) })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405, origin)

  try {
    if (!GROQ_KEY) return json({ error: 'Falta el secreto GROQ_API_KEY' }, 500, origin)

    // 1) Autenticación: exige un ID token de Firebase válido.
    const idToken = req.headers.get('x-id-token') ?? ''
    if (!idToken) return json({ error: 'No autorizado' }, 401, origin)
    try {
      await verifyFirebaseToken(idToken)
    } catch {
      return json({ error: 'Sesión inválida' }, 401, origin)
    }

    // 2) Validación de entrada.
    const { messages } = await req.json()
    if (!Array.isArray(messages) || messages.length === 0) {
      return json({ error: 'messages requerido' }, 400, origin)
    }
    if (messages.length > MAX_MESSAGES) {
      return json({ error: 'Demasiados mensajes' }, 413, origin)
    }
    let total = 0
    for (const m of messages) {
      const c = typeof m?.content === 'string' ? m.content : ''
      if (c.length > MAX_CHARS_PER_MSG) return json({ error: 'Mensaje muy largo' }, 413, origin)
      total += c.length
    }
    if (total > MAX_TOTAL_CHARS) return json({ error: 'Conversación muy larga' }, 413, origin)

    // 3) Proxy a Groq.
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GROQ_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        temperature: 0.4,
        response_format: { type: 'json_object' },
      }),
    })

    if (!r.ok) {
      return json({ error: 'Groq error', detail: await r.text() }, 502, origin)
    }

    const data = await r.json()
    const content = data?.choices?.[0]?.message?.content ?? '{}'
    let parsed: { reply?: string; actions?: unknown[] } = {}
    try {
      parsed = JSON.parse(content)
    } catch {
      parsed = { reply: content }
    }
    return json(
      {
        reply: parsed.reply ?? '',
        actions: Array.isArray(parsed.actions) ? parsed.actions : [],
      },
      200,
      origin,
    )
  } catch (e) {
    return json({ error: String(e) }, 500, origin)
  }
})
