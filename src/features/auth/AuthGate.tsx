import { useEffect, useState, type ReactNode } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { auth, firebaseReady } from '../../lib/firebase'
import { useAppStore } from '../../store/useAppStore'
import { fetchProfile, pushSync } from '../../lib/profile'
import { startRamosSync } from '../../lib/sync'
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
          const result = await fetchProfile()
          if (result) {
            const st = useAppStore.getState()
            st.hydrateProfile(result.profile)
            // Solo saltar el onboarding si el perfil es "real" (tiene nombre).
            if (result.profile.userName) st.setOnboarded(true)
            // Adoptar de la nube lo que exista (ramos, preferencias, chat, tareas).
            if (result.ramos) st.setSubjects(result.ramos)
            if (result.prefs) st.hydratePrefs(result.prefs)
            if (result.chat) st.setChat(result.chat)
            if (result.tasks) st.setTasks(result.tasks)
            // Cuenta nueva (nube sin tareas): sembrar 2 tareas de arranque (guía inicial).
            else if (!st.tasks.length) {
              st.addTask({ title: 'Agregar horario de clases', color: 'blue' })
              st.addTask({ title: 'Organizar calendario académico', color: 'violet' })
            }
            // Sembrar en la nube lo que aún NO exista allá (primer login en otro equipo).
            const cur = useAppStore.getState()
            const seed: Parameters<typeof pushSync>[0] = {}
            if (!result.ramos && cur.subjects.length) seed.ramos = cur.subjects
            if (!result.prefs)
              seed.prefs = {
                theme: cur.theme,
                accent: cur.accent,
                defaultScale: cur.defaultScale,
                lite: cur.lite,
              }
            if (!result.chat && cur.chat.length) seed.chat = cur.chat
            if (!result.tasks && cur.tasks.length) seed.tasks = cur.tasks
            if (Object.keys(seed).length) pushSync(seed)
          }
        } finally {
          setHydrating(false)
        }
        // Escuchar cambios de ramos y subirlos (después de hidratar, para no re-subir).
        startRamosSync()
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
