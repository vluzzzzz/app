import type { AiResponse } from './types'
import { auth } from '../lib/firebase'

const ENDPOINT = import.meta.env.VITE_AI_ENDPOINT as string | undefined
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** ¿Está configurada la IA (hay endpoint del proxy)? */
export function aiConfigured(): boolean {
  return !!ENDPOINT
}

type Msg = { role: 'system' | 'user' | 'assistant'; content: string }
export type Tier = 'fast' | 'smart'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// Verbos que implican CREAR/EDITAR/AGENDAR (o anotar una nota) → necesitan el
// modelo grande (más preciso armando ramos y fechas). Lo demás (preguntas,
// saludos, "¿qué tengo mañana?") va al modelo rápido.
const ACTION_RE =
  /\b(cre[aá]r?|cr[eé]ame|arm[aá]|h[aá]zme|agreg[aá]r?|a[ñn]ad[eií]r?|anot[aá]r?|ap[uú]nt[aá]|pon(?:g[aeoó]|me|le)?|ingres[aá]|registr[aá]|s[uú]mal?e?|saqu[eé]|me saqu[eé]|obtuve|sub[ií]|recu[eé]rdame|record[aá]|borr[aá]|elimin[aá]|quit[aá]|cambi[aá]|edit[aá]|modific[aá]|actualiz[aá]|renombr[aá]|agend[aá]|ag[eé]ndame|marc[aá]|complet[aá]|mu[eé]ve)\b/i

/** Elige el modelo según el mensaje: orden de acción → 'smart', pregunta → 'fast'. */
export function pickTier(text: string): Tier {
  return ACTION_RE.test(text) ? 'smart' : 'fast'
}

/**
 * Llama al proxy (Supabase Edge Function) que reenvía a Groq con la key oculta.
 * Reintenta solo cuando Groq responde "rate limit" (tokens por minuto del plan gratis),
 * respetando el tiempo que sugiere, para no mostrarle al usuario un error feo.
 */
export async function askAi(messages: Msg[], tier: Tier = 'smart', attempt = 0): Promise<AiResponse> {
  if (!ENDPOINT) {
    throw new Error('Brody aún no está configurado.')
  }
  // ID token de Firebase → el proxy solo atiende a usuarios logueados (anti-abuso).
  const idToken = auth?.currentUser ? await auth.currentUser.getIdToken() : ''
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(ANON ? { Authorization: `Bearer ${ANON}`, apikey: ANON } : {}),
      ...(idToken ? { 'x-id-token': idToken } : {}),
    },
    body: JSON.stringify({ messages, tier }),
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    const isRateLimit = res.status === 429 || /rate.?limit/i.test(detail)
    if (isRateLimit && attempt < 3) {
      // Groq sugiere "try again in 2.8s" → esperamos eso (+ margen) y reintentamos.
      const m = /try again in ([\d.]+)s/i.exec(detail)
      const waitMs = m ? Math.ceil(parseFloat(m[1]) * 1000) + 400 : 2500
      await sleep(waitMs)
      return askAi(messages, tier, attempt + 1)
    }
    if (isRateLimit) {
      throw new Error('Uff, me saturé un toque 🥵 dame unos segunditos y volvé a escribirme, bro.')
    }
    throw new Error('Se me cruzaron los cables un segundo 😅 probá de nuevo, bro.')
  }
  const data = await res.json()
  return {
    reply: typeof data.reply === 'string' ? data.reply : '(sin respuesta)',
    actions: Array.isArray(data.actions) ? data.actions : [],
  }
}
