import type { ReactNode } from 'react'

type Props = {
  children: ReactNode
  className?: string
  /** Radio de las esquinas (px). */
  rx?: number
  /** Patrón de rayas "raya hueco" (px). Más hueco = más separadas. */
  dash?: string
  onClick?: () => void
}

/**
 * Caja con borde punteado dibujado con un <rect> SVG (trazo POR DENTRO, con las rayas
 * espaciadas a gusto). Reemplaza el `border-dashed` de CSS que no deja controlar el espaciado.
 */
export function DashedBox({ children, className = '', rx = 24, dash = '7 10', onClick }: Props) {
  const border = (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" fill="none" aria-hidden="true">
      <rect
        x="1"
        y="1"
        rx={rx}
        ry={rx}
        fill="none"
        stroke="rgb(var(--ink))"
        strokeOpacity={0.22}
        strokeWidth={2}
        strokeDasharray={dash}
        style={{ width: 'calc(100% - 2px)', height: 'calc(100% - 2px)' }}
      />
    </svg>
  )
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`relative ${className}`}>
        {border}
        {children}
      </button>
    )
  }
  return (
    <div className={`relative ${className}`}>
      {border}
      {children}
    </div>
  )
}
