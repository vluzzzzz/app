import { useEffect, useState } from 'react'

/**
 * Devuelve la altura (px) que ocupa el teclado en pantalla usando la API
 * VisualViewport. Sirve para subir hojas/inputs por encima del teclado en móvil
 * (iOS Safari incluido), donde el teclado se pone ENCIMA y tapa la UI.
 */
export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0)

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const update = () => {
      const kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
      setInset(kb)
    }
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    update()
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
    }
  }, [])

  return inset
}
