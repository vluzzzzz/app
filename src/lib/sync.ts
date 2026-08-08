import { useAppStore } from '../store/useAppStore'
import { pushSync, type PrefsPayload } from './profile'

// Sincroniza TODO el estado del usuario a la nube cuando cambia (con debounce):
// ramos, preferencias (tema, acento, escala, lite) y el historial del chat.
// Se arranca una vez, DESPUÉS de hidratar desde la nube, para no re-subir lo recién bajado.
let started = false
let timer: ReturnType<typeof setTimeout> | undefined

/** Extrae las preferencias sincronizables del estado. */
function prefsOf(s: ReturnType<typeof useAppStore.getState>): PrefsPayload {
  return { theme: s.theme, accent: s.accent, defaultScale: s.defaultScale, lite: s.lite }
}

export function startRamosSync() {
  if (started) return
  started = true
  useAppStore.subscribe((state, prev) => {
    const changed =
      state.subjects !== prev.subjects ||
      state.theme !== prev.theme ||
      state.accent !== prev.accent ||
      state.defaultScale !== prev.defaultScale ||
      state.lite !== prev.lite ||
      state.chat !== prev.chat
    if (!changed) return
    clearTimeout(timer)
    timer = setTimeout(() => {
      const s = useAppStore.getState()
      pushSync({ ramos: s.subjects, prefs: prefsOf(s), chat: s.chat })
    }, 1500)
  })
}
