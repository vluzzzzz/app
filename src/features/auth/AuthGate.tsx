import { useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase, supabaseReady } from '../../lib/supabase'
import { LoginScreen } from './LoginScreen'

/**
 * Portón de autenticación. Si Supabase está configurado, exige iniciar sesión
 * (login obligatorio). Si aún NO está configurado, deja pasar (la app corre local),
 * así producción no se rompe mientras se termina el setup.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(supabaseReady)

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) =>
      setSession(s),
    )
    return () => sub.subscription.unsubscribe()
  }, [])

  if (!supabaseReady) return <>{children}</>

  if (loading) {
    return (
      <div className="flex h-[100dvh] items-center justify-center">
        <img
          src="/logoapp.png"
          alt="Brody"
          className="h-16 w-16 animate-pulse rounded-2xl object-contain"
        />
      </div>
    )
  }

  if (!session) return <LoginScreen />
  return <>{children}</>
}
