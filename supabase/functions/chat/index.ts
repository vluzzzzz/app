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
// Modo híbrido: modelo GRANDE (preciso) para crear/editar; modelo RÁPIDO para
// preguntas y charla. El cliente manda tier 'smart' | 'fast'.
// Groq apagó los Llama 3.x el 16-ago-2026; los reemplazos oficiales son los GPT-OSS.
const MODEL = Deno.env.get('GROQ_MODEL') ?? 'openai/gpt-oss-120b'
const FAST_MODEL = Deno.env.get('GROQ_FAST_MODEL') ?? 'openai/gpt-oss-20b'
const PROJECT_ID = Deno.env.get('FIREBASE_PROJECT_ID') ?? 'brody-13148'

// Dominios permitidos (CORS).
const ALLOWED_ORIGINS = [
  'https://brrody.app',
  'https://www.brrody.app',
  'http://localhost:5173',
]

// Límites de entrada anti-abuso. El prompt del sistema de Brody es grande (incluye
// horario, agenda, personalidad y ejemplos), así que damos MUCHA holgura — el modelo
// tiene contexto de sobra (~128k tokens ≈ 500k caracteres).
const MAX_MESSAGES = 60
const MAX_CHARS_PER_MSG = 40000
const MAX_TOTAL_CHARS = 200000

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
    const { messages, tier } = await req.json()
    const model = tier === 'fast' ? FAST_MODEL : MODEL
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

    // 3) Proxy a Groq, con FALLBACK de modelo.
    const callGroq = (useModel: string) =>
      fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${GROQ_KEY}`,
        },
        body: JSON.stringify({
          model: useModel,
          messages,
          temperature: 0.4,
          // Acota la generación: respuestas más rápidas y menos gasto de tokens/minuto.
          // (2048 porque en GPT-OSS el razonamiento interno cuenta contra este límite.)
          max_tokens: 2048,
          response_format: { type: 'json_object' },
          // GPT-OSS razona antes de responder; en 'low' contesta rápido y alcanza de
          // sobra para armar el JSON. Solo aplica a esos modelos (otros lo rechazan).
          ...(useModel.startsWith('openai/gpt-oss') ? { reasoning_effort: 'low' } : {}),
        }),
      })

    let r = await callGroq(model)
    // Si el modelo grande se quedó sin cupo (rate limit / tokens por día del plan
    // gratis), degradamos automáticamente al rápido para que la app NO se rompa.
    // El rápido tiene un cupo diario mayor. Solo aplica si no estábamos ya en él.
    if (!r.ok && model !== FAST_MODEL) {
      const why = await r.text().catch(() => '')
      if (r.status === 429 || /rate.?limit|tokens?\s*per|quota|capacity/i.test(why)) {
        r = await callGroq(FAST_MODEL)
      }
    }

    if (!r.ok) {
      const detail = await r.text().catch(() => '')
      console.error('Groq error', r.status, detail)
      return json({ error: 'Groq error', detail }, 502, origin)
    }

    const data = await r.json()
    const content = data?.choices?.[0]?.message?.content ?? '{}'
    let parsed: { reply?: string; actions?: unknown[] } = {}
    try {
      parsed = JSON.parse(content)
    } catch {
      // JSON roto: intenta rescatar el objeto {...} embebido; si no, muestra el
      // texto solo si NO parece JSON (para no filtrar llaves crudas al chat).
      const m = content.match(/\{[\s\S]*\}/)
      if (m) {
        try {
          parsed = JSON.parse(m[0])
        } catch {
          parsed = {}
        }
      }
      if (!parsed.reply) {
        parsed = /^[\s{[]/.test(content.trim())
          ? { reply: 'Se me cruzaron los cables un segundo 😅 volvé a escribirme, bro.' }
          : { reply: content }
      }
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
