import type { CSSProperties } from 'react'

/**
 * Relieve suave de lo "presionable" lleno de color (píldoras, bloques de clase,
 * botón Crear): un brillo arriba, un filo oscuro abajo y una sombra corta. Se ve
 * con volumen sin parecer un botón de los 2000. El color va aparte, en
 * `backgroundColor` o en una clase `bg-*`.
 */
export const RAISED: CSSProperties = {
  backgroundImage: 'linear-gradient(to bottom, rgb(255 255 255 / 0.12), rgb(255 255 255 / 0))',
  boxShadow:
    'inset 0 1px 0 rgb(255 255 255 / 0.16), inset 0 -1px 0 rgb(0 0 0 / 0.22), 0 1px 2px rgb(0 0 0 / 0.16), 0 4px 10px -4px rgb(0 0 0 / 0.35)',
}

/** Relieve de lo claro (tarjetas blancas, celda de hoy): flota apenas. */
export const RAISED_LIGHT: CSSProperties = {
  boxShadow: '0 1px 1.5px rgb(0 0 0 / 0.06), 0 3px 8px -3px rgb(0 0 0 / 0.12)',
}
