import type { AiResponse } from './types'

const ENDPOINT = import.meta.env.VITE_AI_ENDPOINT as string | undefined
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** ¿Está configurada la IA (hay endpoint del proxy)? */
export function aiConfigured(): boolean {
  return !!ENDPOINT
}

type Msg = { role: 'system' | 'user' | 'assistant'; content: string }

/** Llama al proxy (Supabase Edge Function) que reenvía a Groq con la key oculta. */
export async function askAi(messages: Msg[]): Promise<AiResponse> {
  if (!ENDPOINT) {
    throw new Error(
      'La IA todavía no está configurada. Falta conectar el proxy (Supabase).',
    )
  }
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(ANON ? { Authorization: `Bearer ${ANON}`, apikey: ANON } : {}),
    },
    body: JSON.stringify({ messages }),
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`Error de la IA (${res.status}). ${detail}`.trim())
  }
  const data = await res.json()
  return {
    reply: typeof data.reply === 'string' ? data.reply : '(sin respuesta)',
    actions: Array.isArray(data.actions) ? data.actions : [],
  }
}
