// Supabase Edge Function: proxy del chat de IA.
// Reenvía los mensajes a Groq usando la API key guardada como secreto (GROQ_API_KEY),
// así la key nunca queda expuesta en el frontend. Devuelve { reply, actions }.
//
// Deploy:  supabase functions deploy chat --no-verify-jwt
// Secreto: supabase secrets set GROQ_API_KEY=tu_key   (gratis en console.groq.com)

const GROQ_KEY = Deno.env.get('GROQ_API_KEY')
const MODEL = Deno.env.get('GROQ_MODEL') ?? 'llama-3.3-70b-versatile'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  try {
    if (!GROQ_KEY) return json({ error: 'Falta el secreto GROQ_API_KEY' }, 500)

    const { messages } = await req.json()
    if (!Array.isArray(messages)) return json({ error: 'messages requerido' }, 400)

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
      return json({ error: 'Groq error', detail: await r.text() }, 502)
    }

    const data = await r.json()
    const content = data?.choices?.[0]?.message?.content ?? '{}'
    let parsed: { reply?: string; actions?: unknown[] } = {}
    try {
      parsed = JSON.parse(content)
    } catch {
      parsed = { reply: content }
    }
    return json({
      reply: parsed.reply ?? '',
      actions: Array.isArray(parsed.actions) ? parsed.actions : [],
    })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
