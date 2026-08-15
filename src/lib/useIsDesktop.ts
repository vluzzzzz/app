import { useSyncExternalStore } from 'react'

// Un solo MediaQueryList compartido: PC = ancho lg de Tailwind (1024px).
const mq = typeof window !== 'undefined' ? window.matchMedia('(min-width: 1024px)') : null

/**
 * ¿Estamos en pantalla de PC (≥1024px)? Reacciona en vivo al redimensionar.
 * Usarlo SOLO donde el comportamiento difiere de verdad (montar Sidebar vs
 * TabBar, sheet vs modal, props de framer-motion). Para lo puramente visual,
 * preferir clases `lg:` de Tailwind.
 */
export function useIsDesktop(): boolean {
  return useSyncExternalStore(
    (cb) => {
      mq?.addEventListener('change', cb)
      return () => mq?.removeEventListener('change', cb)
    },
    () => mq?.matches ?? false,
  )
}
