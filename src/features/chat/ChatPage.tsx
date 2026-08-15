import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { Route } from '../../App'
import { useAppStore } from '../../store/useAppStore'
import { accentGhost } from '../../lib/accents'
import { makeId } from '../../lib/format'
import { EASE } from '../../lib/motion'
import { buildSystemPrompt } from '../../ai/prompt'
import { aiConfigured, askAi, pickTier, transcribeAudio } from '../../ai/client'
import { applyActions } from '../../ai/apply'
import { ChevronLeft, MicIcon, PaperclipIcon } from '../../components/ui/Icons'
import { useKeyboardInset } from '../../lib/useKeyboardInset'

const SUGERENCIAS = [
  'Tengo prueba el martes a las 5 de Cálculo',
  'Anota mi cumpleaños el 23 de octubre',
  'Recuérdame entregar el informe de Física',
  '¿Qué necesito para pasar Cálculo?',
]

/**
 * Parte el prompt del sistema en mensajes ≤ maxLen (el proxy limita el tamaño
 * POR mensaje). Con el tope alto normalmente sale UN solo mensaje de sistema
 * (el modelo sigue mejor un prompt coherente que varios trozos sueltos).
 */
type Adjunto = { mime: string; data: string; name: string; kind: 'imagen' | 'pdf' }

/** Comprime una imagen a JPEG (máx 1600px) para no mandar fotos de 8MB al proxy. */
async function compressImage(f: File): Promise<Adjunto> {
  const url = URL.createObjectURL(f)
  try {
    const img = await new Promise<HTMLImageElement>((ok, err) => {
      const i = new Image()
      i.onload = () => ok(i)
      i.onerror = err
      i.src = url
    })
    const scale = Math.min(1, 1600 / Math.max(img.width, img.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(img.width * scale)
    canvas.height = Math.round(img.height * scale)
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.82)
    return { mime: 'image/jpeg', data: dataUrl.split(',')[1], name: f.name, kind: 'imagen' }
  } finally {
    URL.revokeObjectURL(url)
  }
}

async function fileToAdjunto(f: File): Promise<Adjunto> {
  if (f.type.startsWith('image/')) return compressImage(f)
  const dataUrl = await new Promise<string>((ok, err) => {
    const r = new FileReader()
    r.onload = () => ok(String(r.result))
    r.onerror = err
    r.readAsDataURL(f)
  })
  return { mime: 'application/pdf', data: dataUrl.split(',')[1], name: f.name, kind: 'pdf' }
}

function splitSystem(prompt: string, maxLen = 30000): string[] {
  const chunks: string[] = []
  let buf = ''
  for (const line of prompt.split('\n')) {
    if (buf.length + line.length + 1 > maxLen && buf) {
      chunks.push(buf)
      buf = ''
    }
    buf += (buf ? '\n' : '') + line
  }
  if (buf) chunks.push(buf)
  return chunks
}

export function ChatPage({ navigate }: { navigate: (r: Route) => void }) {
  const chat = useAppStore((s) => s.chat)
  const pushChat = useAppStore((s) => s.pushChat)
  const clearChat = useAppStore((s) => s.clearChat)
  const accent = useAppStore((s) => s.accent)
  const theme = useAppStore((s) => s.theme)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [adjunto, setAdjunto] = useState<Adjunto | null>(null)
  const [grabando, setGrabando] = useState(false)
  const [recSecs, setRecSecs] = useState(0)
  const [transcribiendo, setTranscribiendo] = useState(false)
  const kb = useKeyboardInset()
  const scrollRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const recRef = useRef<MediaRecorder | null>(null)
  const cancelRef = useRef(false)

  // Contador de la grabación (0:01, 0:02…) mientras está el mic abierto.
  useEffect(() => {
    if (!grabando) return
    setRecSecs(0)
    const id = setInterval(() => setRecSecs((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [grabando])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 1e9, behavior: 'smooth' })
  }, [chat, loading])

  async function send(textArg?: string) {
    const file = adjunto
    const typed = (textArg ?? input).trim()
    // Con adjunto sin texto, la burbuja muestra el nombre del archivo.
    const text = typed || (file ? `${file.kind === 'pdf' ? '📄' : '📸'} ${file.name}` : '')
    if (!text || loading) return
    setInput('')
    const userMsgId = makeId()
    pushChat({ id: userMsgId, role: 'user', text })
    setLoading(true)
    try {
      const { subjects, defaultScale, userName, tasks, events, classes } =
        useAppStore.getState()
      const history = useAppStore
        .getState()
        .chat.filter((m) => !m.error)
        .slice(-6) // últimos mensajes: contexto suficiente sin inflar tokens (evita saturar Groq)
        // Respuestas largas (listas de la semana) se recortan: el detalle vive en los
        // DATOS del prompt, no hace falta re-mandarlo entero como historial.
        .map((m) => ({
          role: m.role,
          content: m.text.length > 600 ? `${m.text.slice(0, 600)}…` : m.text,
        }))
      // El tier decide también el prompt: preguntas → prompt 'lite' (menos tokens =
      // respuesta rápida y sin chocar el límite por minuto del plan gratis de Groq).
      // Con adjunto siempre 'smart': leer una pauta/PDF requiere el prompt completo.
      const tier = file ? 'smart' : pickTier(text)
      const systemPrompt = buildSystemPrompt(
        subjects,
        defaultScale,
        userName,
        tasks,
        events,
        classes,
        tier === 'fast' ? 'lite' : 'full',
      )
      const messages = [
        ...splitSystem(systemPrompt).map((content) => ({ role: 'system' as const, content })),
        ...history,
      ]
      const res = await askAi(messages, tier, 0, file ? { mime: file.mime, data: file.data } : undefined)
      const applied =
        res.actions && res.actions.length ? applyActions(res.actions) : []
      setAdjunto(null)
      pushChat({
        id: makeId(),
        role: 'assistant',
        text: res.reply,
        applied: applied.length ? applied : undefined,
      })
    } catch {
      // Falló todo (tras los reintentos silenciosos): sacamos el mensaje del chat y
      // lo devolvemos al input listo para reenviar — nada de burbujas de error.
      // El adjunto queda puesto, listo para el reintento.
      const st = useAppStore.getState()
      st.setChat(st.chat.filter((m) => m.id !== userMsgId))
      setInput(typed)
    } finally {
      setLoading(false)
    }
  }

  /** Abre el micrófono: la barra de abajo se transforma en modo grabación. */
  async function startMic() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const rec = new MediaRecorder(stream)
      const chunks: BlobPart[] = []
      rec.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data)
      }
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        setGrabando(false)
        if (cancelRef.current) return // tocó "Cancelar": se descarta sin gastar nada
        const blob = new Blob(chunks, { type: rec.mimeType || 'audio/webm' })
        if (blob.size < 1500) return // toque accidental, sin audio real
        setTranscribiendo(true)
        let texto = ''
        try {
          texto = await transcribeAudio(blob)
        } catch {
          /* nada: puede volver a intentar */
        }
        setTranscribiendo(false)
        if (texto) void send(texto)
      }
      cancelRef.current = false
      recRef.current = rec
      rec.start()
      setGrabando(true)
    } catch {
      /* micrófono denegado: no hacemos nada */
    }
  }

  /** Corta la grabación: enviar (transcribe y manda) o cancelar (descarta). */
  function stopMic(enviar: boolean) {
    cancelRef.current = !enviar
    recRef.current?.stop()
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 pt-4">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate({ name: 'inicio' })}
          className="glass glass-highlight rounded-2xl p-2.5 text-ink/80"
        >
          <ChevronLeft className="h-5 w-5" />
        </motion.button>
        <h1 className="text-lg font-bold text-ink">Brody</h1>
        <button
          onClick={clearChat}
          className="rounded-2xl px-3 py-2 text-sm font-medium text-ink/50"
        >
          Limpiar
        </button>
      </header>

      {/* Mensajes */}
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {chat.length === 0 && (
          <div className="mt-6 text-center">
            <img
              src={accentGhost(accent, theme === 'dark')}
              alt="Brody"
              className="mx-auto mb-3 h-16 w-16 object-contain"
            />
            <p className="mb-4 text-sm text-ink/55">
              Soy Brody. Pídeme crear ramos, poner notas, agendar pruebas o
              cumpleaños, anotarte tareas, o pregúntame qué necesitas para pasar.
            </p>
            <div className="flex flex-col gap-2">
              {SUGERENCIAS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="glass glass-highlight rounded-2xl px-4 py-3 text-left text-sm text-ink/80"
                >
                  {s}
                </button>
              ))}
            </div>
            {!aiConfigured() && (
              <p className="mt-4 text-xs text-amber-600 dark:text-amber-300">
                ⚠️ Brody aún no está configurado.
              </p>
            )}
          </div>
        )}

        <AnimatePresence initial={false}>
          {chat.map((m) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: EASE.smooth }}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-3xl px-4 py-2.5 text-[15px] ${
                  m.role === 'user'
                    ? 'bg-ink text-surface'
                    : m.error
                      ? 'bg-rose-500/15 text-rose-700 dark:text-rose-200'
                      : 'glass glass-highlight text-ink'
                }`}
              >
                <RichText text={m.text} />
                {m.applied && m.applied.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {m.applied.map((a, i) => (
                      <span
                        key={i}
                        className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300"
                      >
                        {a}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {(loading || transcribiendo) && (
          <div className="flex justify-start">
            <div className="glass glass-highlight rounded-3xl px-4 py-3 text-ink/50">
              <span className="inline-flex items-center gap-1">
                {transcribiendo && <span className="mr-1 text-xs">🎧</span>}
                <Dot /> <Dot d={0.15} /> <Dot d={0.3} />
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Composer */}
      <div
        className="px-4 pt-2 transition-[padding] duration-200"
        style={{ paddingBottom: `max(1rem, ${kb + 16}px)` }}
      >
        {adjunto && !grabando && (
          <div className="glass glass-highlight mb-2 flex items-center gap-2.5 rounded-2xl px-3 py-2 text-sm text-ink/80">
            {adjunto.kind === 'imagen' ? (
              <img
                src={`data:${adjunto.mime};base64,${adjunto.data}`}
                alt={adjunto.name}
                className="h-12 w-12 shrink-0 rounded-xl object-cover"
              />
            ) : (
              <span className="text-xl">📄</span>
            )}
            <span className="min-w-0 flex-1 truncate">{adjunto.name}</span>
            <button onClick={() => setAdjunto(null)} className="px-1 text-ink/50">
              ✕
            </button>
          </div>
        )}
        {grabando ? (
          /* Modo grabación (estilo WhatsApp): contador + cancelar + enviar */
          <div className="glass glass-highlight flex items-center gap-3 rounded-3xl p-2 pl-4">
            <span className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-rose-500" />
            <span className="text-[15px] tabular-nums text-ink/80">
              {Math.floor(recSecs / 60)}:{String(recSecs % 60).padStart(2, '0')}
            </span>
            <span className="flex-1 truncate text-sm text-ink/40">Grabando…</span>
            <button
              onClick={() => stopMic(false)}
              className="shrink-0 rounded-2xl px-3 py-2 text-sm font-medium text-ink/60"
            >
              Cancelar
            </button>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => stopMic(true)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink text-surface"
              aria-label="Enviar nota de voz"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                <path d="m3.4 20.4 17.5-8.4a.8.8 0 0 0 0-1.5L3.4 2.1a.7.7 0 0 0-1 .8L4 10l11 2-11 2-1.6 7.1a.7.7 0 0 0 1 .8Z" />
              </svg>
            </motion.button>
          </div>
        ) : (
        <div className="glass glass-highlight flex items-end gap-1 rounded-3xl p-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0]
              e.target.value = ''
              if (!f) return
              // PDFs gigantes no: el proxy los rechaza igual (tope ~10MB).
              if (f.type === 'application/pdf' && f.size > 10_000_000) return
              try {
                setAdjunto(await fileToAdjunto(f))
              } catch {
                /* archivo ilegible */
              }
            }}
          />
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => fileRef.current?.click()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink/60"
            aria-label="Adjuntar imagen o PDF"
          >
            <PaperclipIcon className="h-5 w-5" />
          </motion.button>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send()
              }
            }}
            rows={1}
            placeholder="Escribe un mensaje…"
            className="max-h-28 min-h-[2.5rem] flex-1 resize-none bg-transparent px-2 py-2 text-[15px] text-ink outline-none placeholder:text-ink/40"
          />
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={startMic}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink/60"
            aria-label="Grabar nota de voz"
          >
            <MicIcon className="h-5 w-5" />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => send()}
            disabled={(!input.trim() && !adjunto) || loading}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink text-surface disabled:opacity-40"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
              <path d="m3.4 20.4 17.5-8.4a.8.8 0 0 0 0-1.5L3.4 2.1a.7.7 0 0 0-1 .8L4 10l11 2-11 2-1.6 7.1a.7.7 0 0 0 1 .8Z" />
            </svg>
          </motion.button>
        </div>
        )}
      </div>
    </div>
  )
}

/** Trozos con soporte de **negritas** (markdown mínimo). */
function Bold({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith('**') && p.endsWith('**') ? (
          <strong key={i} className="font-bold">
            {p.slice(2, -2)}
          </strong>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  )
}

/**
 * Texto del chat, línea por línea. Las viñetas ("• " o "- ") llevan sangría
 * colgante: si un nombre largo (ej. "Algoritmo y Estructura de Datos") salta
 * de línea, la continuación queda alineada con el texto y no pegada al borde.
 */
function RichText({ text }: { text: string }) {
  return (
    <div>
      {text.split('\n').map((line, i) =>
        line.trim() === '' ? (
          <div key={i} className="h-2.5" />
        ) : (
          <p
            key={i}
            className="whitespace-pre-wrap"
            style={/^[•\-] /.test(line) ? { paddingLeft: '1.1em', textIndent: '-1.1em' } : undefined}
          >
            <Bold text={line} />
          </p>
        ),
      )}
    </div>
  )
}

function Dot({ d = 0 }: { d?: number }) {
  return (
    <motion.span
      className="inline-block h-2 w-2 rounded-full bg-ink/40"
      animate={{ opacity: [0.3, 1, 0.3] }}
      transition={{ duration: 1, repeat: Infinity, delay: d }}
    />
  )
}
