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

// npm: (no esm.sh): así el deploy EMPAQUETA la librería dentro de la función.
// Con esm.sh se descargaba de internet en cada arranque en frío, y esa demora
// mataba el primer pedido tras un rato de inactividad ("se me cruzaron los cables").
import { createRemoteJWKSet, jwtVerify } from 'npm:jose@5.9.6'

const GROQ_KEY = Deno.env.get('GROQ_API_KEY')
// Modo híbrido: modelo GRANDE (preciso) para crear/editar; modelo RÁPIDO para
// preguntas y charla. El cliente manda tier 'smart' | 'fast'.
// Groq apagó los Llama 3.x el 16-ago-2026; los reemplazos oficiales son los GPT-OSS.
const MODEL = Deno.env.get('GROQ_MODEL') ?? 'openai/gpt-oss-120b'
const FAST_MODEL = Deno.env.get('GROQ_FAST_MODEL') ?? 'openai/gpt-oss-20b'
// Tercer motor (Google Gemini, gratis): entra solo si los DOS modelos de Groq
// fallaron (cuota del minuto agotada, caída, etc.). Cuota independiente de Groq.
const GEMINI_KEY = Deno.env.get('GEMINI_API_KEY')
const GEMINI_MODEL = Deno.env.get('GEMINI_MODEL') ?? 'gemini-flash-lite-latest'
// Notas de voz del chat: se transcriben con Whisper, que corre gratis en Groq.
const WHISPER_MODEL = Deno.env.get('GROQ_WHISPER_MODEL') ?? 'whisper-large-v3-turbo'
// Adjuntos que Brody sabe leer (los procesa Gemini, que es multimodal).
const ALLOWED_FILE_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
const MAX_FILE_B64_CHARS = 15_000_000 // ~11 MB reales; las fotos llegan comprimidas del cliente
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
    if (!idToken) {
      console.error('Auth fallo: sin token')
      return json({ error: 'No autorizado' }, 401, origin)
    }
    try {
      await verifyFirebaseToken(idToken)
    } catch (e) {
      console.error('Auth fallo: token inválido —', String(e))
      return json({ error: 'Sesión inválida' }, 401, origin)
    }

    // 1b) Notas de voz: POST .../chat/transcribe con FormData { audio } → { text }.
    if (new URL(req.url).pathname.endsWith('/transcribe')) {
      const form = await req.formData()
      const audio = form.get('audio')
      if (!(audio instanceof File)) return json({ error: 'audio requerido' }, 400, origin)
      if (audio.size > 12_000_000) return json({ error: 'Audio muy largo' }, 413, origin)
      const gf = new FormData()
      gf.append('file', audio, audio.name || 'audio.webm')
      gf.append('model', WHISPER_MODEL)
      gf.append('language', 'es')
      const wr = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${GROQ_KEY}` },
        body: gf,
      })
      if (!wr.ok) {
        const detail = await wr.text().catch(() => '')
        console.error('Whisper fallo', wr.status, detail)
        return json({ error: 'Transcripción falló', detail }, 502, origin)
      }
      const wd = await wr.json()
      return json({ text: typeof wd.text === 'string' ? wd.text.trim() : '' }, 200, origin)
    }

    // 2) Validación de entrada.
    const { messages, tier, file } = await req.json()
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
    // Adjunto opcional (imagen o PDF): { mime, data } con data en base64 pelado.
    if (file) {
      if (
        typeof file.mime !== 'string' ||
        typeof file.data !== 'string' ||
        !ALLOWED_FILE_MIMES.includes(file.mime)
      ) {
        return json({ error: 'Adjunto no soportado' }, 415, origin)
      }
      if (file.data.length > MAX_FILE_B64_CHARS) return json({ error: 'Archivo muy grande' }, 413, origin)
      if (!GEMINI_KEY) return json({ error: 'Adjuntos no configurados' }, 501, origin)
    }

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
          // Charla/preguntas (fast): más temperatura = suena humano y variado.
          // Crear/editar (smart): baja = JSON y datos precisos.
          temperature: tier === 'fast' ? 0.75 : 0.4,
          // Acota la generación: menos max_tokens = Groq "reserva" menos cupo del
          // minuto por pedido (el estimado TPM cuenta input + max_tokens), o sea
          // más mensajes seguidos sin chocar el límite del plan gratis.
          max_tokens: tier === 'fast' ? 900 : 1800,
          // OJO: sin response_format json_object a propósito. Con GPT-OSS el modo JSON
          // estricto hace que Groq rechace con 400 (json_validate_failed) cuando el
          // modelo no lo clava, y el chat muere. El prompt ya exige JSON y abajo hay
          // un parser que rescata el objeto aunque venga con texto alrededor.
          // GPT-OSS razona antes de responder; en 'low' contesta rápido y alcanza de
          // sobra para armar el JSON. Solo aplica a esos modelos (otros lo rechazan).
          ...(useModel.startsWith('openai/gpt-oss') ? { reasoning_effort: 'low' } : {}),
        }),
      })

    // Gemini habla el mismo idioma que Groq (endpoint compatible con OpenAI), así
    // que la respuesta se procesa igual venga de donde venga.
    const callGemini = () =>
      fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${GEMINI_KEY}`,
        },
        body: JSON.stringify({
          model: GEMINI_MODEL,
          messages,
          temperature: tier === 'fast' ? 0.75 : 0.4,
          max_tokens: tier === 'fast' ? 900 : 1800,
        }),
      })

    let content: string
    if (file) {
      // Con adjunto va DIRECTO a Gemini (los modelos de Groq no ven imágenes/PDF).
      // API nativa: el prompt del sistema va aparte y el archivo como inline_data
      // pegado al último mensaje del usuario.
      const sys = messages
        .filter((m: any) => m.role === 'system')
        .map((m: any) => m.content)
        .join('\n\n')
      const hist = messages.filter((m: any) => m.role !== 'system')
      const contents = hist.map((m: any, i: number) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts:
          i === hist.length - 1
            ? [{ text: m.content }, { inline_data: { mime_type: file.mime, data: file.data } }]
            : [{ text: m.content }],
      }))
      const gr = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_KEY! },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: sys }] },
            contents,
            generationConfig: { temperature: 0.4, maxOutputTokens: 2048 },
          }),
        },
      )
      if (!gr.ok) {
        const detail = await gr.text().catch(() => '')
        console.error('Gemini adjunto fallo', gr.status, detail)
        return json({ error: 'AI error', detail }, 502, origin)
      }
      const gd = await gr.json()
      content =
        (gd?.candidates?.[0]?.content?.parts ?? [])
          .map((p: any) => p.text ?? '')
          .join('') || '{}'
    } else {
      // Cadena de motores: modelo del tier → el otro modelo de Groq (cupo separado)
      // → Gemini (proveedor aparte). El usuario solo ve error si fallan LOS TRES.
      let r = await callGroq(model)
      if (!r.ok) {
        console.error('Groq fallo 1', r.status, await r.text().catch(() => ''))
        r = await callGroq(model === FAST_MODEL ? MODEL : FAST_MODEL)
      }
      if (!r.ok && GEMINI_KEY) {
        console.error('Groq fallo 2', r.status, await r.text().catch(() => ''))
        r = await callGemini()
      }

      if (!r.ok) {
        const detail = await r.text().catch(() => '')
        console.error('Fallaron todos los motores', r.status, detail)
        return json({ error: 'AI error', detail }, 502, origin)
      }

      const data = await r.json()
      content = data?.choices?.[0]?.message?.content ?? '{}'
    }
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
    console.error('Excepción no manejada:', String(e))
    return json({ error: String(e) }, 500, origin)
  }
})
