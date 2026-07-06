import { useState } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../../lib/supabase'
import { GlassButton } from '../../components/ui/GlassButton'
import { EASE } from '../../lib/motion'

export function LoginScreen() {
  const [mode, setMode] = useState<'in' | 'up'>('in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function google() {
    setMsg(null)
    await supabase?.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
  }

  async function emailAuth() {
    if (!email.trim() || !password || loading) return
    setLoading(true)
    setMsg(null)
    try {
      if (mode === 'in') {
        const { error } = await supabase!.auth.signInWithPassword({
          email: email.trim(),
          password,
        })
        if (error) throw error
      } else {
        const { error } = await supabase!.auth.signUp({
          email: email.trim(),
          password,
        })
        if (error) throw error
        setMsg('¡Cuenta creada! Revisa tu correo si te pide confirmar.')
      }
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'No se pudo, intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto flex h-[100dvh] w-full max-w-md flex-col items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 16, filter: 'blur(10px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.5, ease: EASE.smooth }}
        className="glass glass-highlight w-full rounded-4xl p-6"
      >
        <div className="mb-5 text-center">
          <img
            src="/logoapp.png"
            alt="Brody"
            className="mx-auto mb-3 h-16 w-16 rounded-2xl object-contain"
          />
          <h1 className="text-2xl font-bold text-ink">Brody</h1>
          <p className="mt-1 text-sm text-ink/55">
            {mode === 'in' ? 'Inicia sesión para continuar' : 'Crea tu cuenta'}
          </p>
        </div>

        <GlassButton variant="glass" full onClick={google} className="mb-4">
          <GoogleG /> Continuar con Google
        </GlassButton>

        <div className="mb-4 flex items-center gap-3 text-xs text-ink/40">
          <span className="h-px flex-1 bg-ink/10" /> o con tu correo{' '}
          <span className="h-px flex-1 bg-ink/10" />
        </div>

        <div className="space-y-2">
          <input
            type="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Correo"
            className="w-full rounded-2xl border border-ink/15 bg-ink/5 px-4 py-3 text-ink outline-none placeholder:text-ink/30 focus:border-ink/40"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && emailAuth()}
            placeholder="Contraseña"
            className="w-full rounded-2xl border border-ink/15 bg-ink/5 px-4 py-3 text-ink outline-none placeholder:text-ink/30 focus:border-ink/40"
          />
        </div>

        {msg && (
          <p className="mt-3 text-center text-sm text-rose-500 dark:text-rose-300">
            {msg}
          </p>
        )}

        <GlassButton
          variant="primary"
          full
          disabled={loading || !email.trim() || !password}
          onClick={emailAuth}
          className="mt-4"
        >
          {mode === 'in' ? 'Entrar' : 'Crear cuenta'}
        </GlassButton>

        <button
          onClick={() => {
            setMode((m) => (m === 'in' ? 'up' : 'in'))
            setMsg(null)
          }}
          className="mt-4 w-full text-center text-sm font-medium text-ink/55"
        >
          {mode === 'in'
            ? '¿No tienes cuenta? Crea una'
            : '¿Ya tienes cuenta? Inicia sesión'}
        </button>
      </motion.div>
    </div>
  )
}

function GoogleG() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5">
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.7-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1.1.7-2.5 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1C3.4 21.3 7.4 24 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.4 14.4c-.2-.7-.4-1.4-.4-2.4s.1-1.6.4-2.4V6.5H1.4C.5 8.2 0 10 0 12s.5 3.8 1.4 5.5l4-3.1Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4C17.9 1.2 15.2 0 12 0 7.4 0 3.4 2.7 1.4 6.5l4 3.1C6.3 6.8 8.9 4.8 12 4.8Z"
      />
    </svg>
  )
}
