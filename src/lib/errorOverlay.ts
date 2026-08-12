/**
 * Capturador global de errores (incluye errores asíncronos / de animación que el
 * ErrorBoundary de React NO atrapa). Muestra un banner rojo abajo con el detalle,
 * para poder diagnosticar crashes. No bloquea la app; se cierra al tocarlo.
 *
 * SOLO en desarrollo: en producción muchos rechazos son ruido no fatal de
 * librerías de terceros (Firebase/IndexedDB, service worker) en navegadores
 * in-app o iOS, y no deben asustar al usuario. Los crashes reales de render los
 * cubre el ErrorBoundary de React.
 */
export function installErrorOverlay() {
  if (typeof window === 'undefined') return
  if (!import.meta.env.DEV) return

  const show = (title: string, detail: string) => {
    let el = document.getElementById('brody-err')
    if (!el) {
      el = document.createElement('div')
      el.id = 'brody-err'
      el.style.cssText = [
        'position:fixed',
        'left:8px',
        'right:8px',
        'bottom:8px',
        'z-index:99999',
        'background:#e11d48',
        'color:#fff',
        'font:12px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace',
        'padding:12px 14px',
        'border-radius:14px',
        'max-height:45vh',
        'overflow:auto',
        'white-space:pre-wrap',
        'box-shadow:0 12px 30px rgba(0,0,0,.35)',
      ].join(';')
      document.body.appendChild(el)
    }
    el.textContent = `ERROR — ${title}\n\n${detail}\n\n(toca para cerrar)`
    el.onclick = () => el?.remove()
  }

  window.addEventListener('error', (e) => {
    show('Excepción', `${e.message}\n${(e.error as Error | undefined)?.stack ?? ''}`)
  })
  window.addEventListener('unhandledrejection', (e) => {
    const r = e.reason as { message?: string; stack?: string } | undefined
    show('Promesa rechazada', r?.stack ?? r?.message ?? String(e.reason))
  })
}
