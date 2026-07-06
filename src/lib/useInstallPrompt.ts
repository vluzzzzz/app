import { useEffect, useState } from 'react'

type BIPEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

// Captura el evento apenas se carga el módulo (puede dispararse antes de montar React).
let deferred: BIPEvent | null = null
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferred = e as BIPEvent
    window.dispatchEvent(new Event('bip-ready'))
  })
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari
    (navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

/** Estado + acción para instalar la PWA. */
export function useInstallPrompt() {
  const [canInstall, setCanInstall] = useState(!!deferred)
  const [installed, setInstalled] = useState(isStandalone())

  useEffect(() => {
    const onReady = () => setCanInstall(true)
    const onInstalled = () => {
      setInstalled(true)
      setCanInstall(false)
      deferred = null
    }
    window.addEventListener('bip-ready', onReady)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('bip-ready', onReady)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const isIOS =
    typeof navigator !== 'undefined' &&
    /iphone|ipad|ipod/i.test(navigator.userAgent)

  async function promptInstall() {
    if (!deferred) return
    await deferred.prompt()
    await deferred.userChoice
    deferred = null
    setCanInstall(false)
  }

  return { canInstall, installed, isIOS, promptInstall }
}
