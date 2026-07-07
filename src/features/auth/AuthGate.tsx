import { useEffect, useState, type ReactNode } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { auth, firebaseReady } from '../../lib/firebase'
import { useAppStore } from '../../store/useAppStore'
import { fetchProfile } from '../../lib/profile'
import { LoginScreen } from './LoginScreen'

/**
 * Portón de autenticación. Si Firebase está configurado, exige iniciar sesión.
 * Al loguearse, HIDRATA el perfil desde Supabase (para que el nombre/país/etc. y el
 * estado "ya hizo onboarding" sigan al usuario en cualquier dispositivo).
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(firebaseReady)
  const [hydrating, setHydrating] = useState(false)

  useEffect(() => {
    if (!auth) return
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u)
      if (u) {
        // Trae el perfil de la nube; si existe, hidrata y marca onboarding hecho.
        setHydrating(true)
        try {
          const profile = await fetchProfile()
          if (profile) {
            useAppStore.getState().hydrateProfile(profile)
            useAppStore.getState().setOnboarded(true)
          }
        } finally {
          setHydrating(false)
        }
      }
      setLoading(false)
    })
    return unsub
  }, [])

  if (!firebaseReady) return <>{children}</>

  if (loading || (user && hydrating)) {
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
