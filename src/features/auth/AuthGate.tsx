import { useEffect, useState, type ReactNode } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { auth, firebaseReady } from '../../lib/firebase'
import { LoginScreen } from './LoginScreen'

/**
 * Portón de autenticación. Si Firebase está configurado, exige iniciar sesión
 * (login obligatorio). Si aún NO está configurado, deja pasar (la app corre local),
 * así producción no se rompe mientras se termina el setup.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(firebaseReady)

  useEffect(() => {
    if (!auth) return
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u)
      setLoading(false)
    })
    return unsub
  }, [])

  if (!firebaseReady) return <>{children}</>

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

  if (!user) return <LoginScreen />
  return <>{children}</>
}
