import { useAppStore } from '../store/useAppStore'
import { saveRamos } from './profile'

// Sincroniza los ramos a la nube cuando cambian (con debounce). Se arranca una vez,
// DESPUÉS de hidratar desde la nube, para no re-subir lo recién bajado.
let started = false
let timer: ReturnType<typeof setTimeout> | undefined

export function startRamosSync() {
  if (started) return
  started = true
  useAppStore.subscribe((state, prev) => {
    if (state.subjects === prev.subjects) return
    clearTimeout(timer)
    timer = setTimeout(() => {
      saveRamos(useAppStore.getState().subjects)
    }, 1500)
  })
}
