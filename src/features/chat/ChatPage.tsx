import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { Route } from '../../App'
import { useAppStore } from '../../store/useAppStore'
import { makeId } from '../../lib/format'
import { EASE } from '../../lib/motion'
import { buildSystemPrompt } from '../../ai/prompt'
import { aiConfigured, askAi } from '../../ai/client'
import { applyActions } from '../../ai/apply'
import { ChevronLeft } from '../../components/ui/Icons'
import { useKeyboardInset } from '../../lib/useKeyboardInset'

const SUGERENCIAS = [
  'Crea Cálculo con controles 20% y pruebas 80%',
  'Saqué 5,5 en el control 1 de Cálculo',
  '¿Qué necesito para pasar Cálculo?',
]

export function ChatPage({ navigate }: { navigate: (r: Route) => void }) {
  const chat = useAppStore((s) => s.chat)
  const pushChat = useAppStore((s) => s.pushChat)
  const clearChat = useAppStore((s) => s.clearChat)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const kb = useKeyboardInset()
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 1e9, behavior: 'smooth' })
  }, [chat, loading])

  async function send(textArg?: string) {
    const text = (textArg ?? input).trim()
    if (!text || loading) return
    setInput('')
    pushChat({ id: makeId(), role: 'user', text })
    setLoading(true)
    try {
      const { subjects, defaultScale } = useAppStore.getState()
      const history = useAppStore
        .getState()
        .chat.filter((m) => !m.error)
        .map((m) => ({ role: m.role, content: m.text }))
      const messages = [
        { role: 'system' as const, content: buildSystemPrompt(subjects, defaultScale) },
        ...history,
      ]
      const res = await askAi(messages)
      const applied =
        res.actions && res.actions.length ? applyActions(res.actions) : []
      pushChat({
        id: makeId(),
        role: 'assistant',
        text: res.reply,
        applied: applied.length ? applied : undefined,
      })
    } catch (e) {
      pushChat({
        id: makeId(),
        role: 'assistant',
        text: e instanceof Error ? e.message : 'Ups, algo falló.',
        error: true,
      })
    } finally {
      setLoading(false)
    }
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
        <h1 className="text-lg font-bold text-ink">Asistente IA</h1>
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
            <div className="mb-2 text-4xl">🤖</div>
            <p className="mb-4 text-sm text-ink/55">
              Pídeme crear ramos, poner notas o pregúntame qué necesitas para
              pasar.
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
                ⚠️ La IA aún no está conectada (falta el proxy). Ver guía de setup.
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
                <p className="whitespace-pre-wrap">{m.text}</p>
                {m.applied && m.applied.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {m.applied.map((a, i) => (
                      <span
                        key={i}
                        className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300"
                      >
                        ✓ {a}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {loading && (
          <div className="flex justify-start">
            <div className="glass glass-highlight rounded-3xl px-4 py-3 text-ink/50">
              <span className="inline-flex gap-1">
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
        <div className="glass glass-highlight flex items-end gap-2 rounded-3xl p-2">
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
            className="max-h-28 min-h-[2.5rem] flex-1 resize-none bg-transparent px-3 py-2 text-[15px] text-ink outline-none placeholder:text-ink/40"
          />
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => send()}
            disabled={!input.trim() || loading}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink text-surface disabled:opacity-40"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
              <path d="m3.4 20.4 17.5-8.4a.8.8 0 0 0 0-1.5L3.4 2.1a.7.7 0 0 0-1 .8L4 10l11 2-11 2-1.6 7.1a.7.7 0 0 0 1 .8Z" />
            </svg>
          </motion.button>
        </div>
      </div>
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
