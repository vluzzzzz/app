import { useState } from 'react'
import { motion, type HTMLMotionProps } from 'framer-motion'
import type { PointerEvent, ReactNode } from 'react'
import { useIsDesktop } from '../../lib/useIsDesktop'
import { prefersReducedMotion } from '../../lib/motion'

type Variant = 'primary' | 'glass' | 'ghost' | 'danger'

type Props = Omit<HTMLMotionProps<'button'>, 'children'> & {
  children: ReactNode
  variant?: Variant
  full?: boolean
}

const VARIANTS: Record<Variant, string> = {
  // Negro plano y limpio: sin brillo (shimmer) ni sombra fuerte.
  primary: 'bg-ink text-surface font-semibold',
  glass: 'glass glass-highlight text-ink font-medium',
  ghost: 'text-ink/70 font-medium',
  danger: 'bg-rose-500/90 text-ink font-semibold',
}

// Color de la onda (ripple) según el fondo del botón: claro sobre oscuro y viceversa.
const RIPPLE_TONE: Record<Variant, string> = {
  primary: 'bg-white/30',
  danger: 'bg-white/30',
  glass: 'bg-ink/15',
  ghost: 'bg-ink/10',
}

type Ripple = { id: number; x: number; y: number; size: number }

export function GlassButton({
  children,
  variant = 'glass',
  full,
  className = '',
  onPointerDown,
  ...rest
}: Props) {
  // El ripple es un detalle de PC: en celular se omite (más liviano, como pidió Angel).
  const isDesktop = useIsDesktop()
  const [ripples, setRipples] = useState<Ripple[]>([])

  const handlePointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    if (isDesktop && !prefersReducedMotion()) {
      const rect = e.currentTarget.getBoundingClientRect()
      const size = Math.max(rect.width, rect.height) * 2
      setRipples((r) => [
        ...r,
        {
          id: Date.now() + Math.random(),
          x: e.clientX - rect.left - size / 2,
          y: e.clientY - rect.top - size / 2,
          size,
        },
      ])
    }
    onPointerDown?.(e)
  }

  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      onPointerDown={handlePointerDown}
      className={`relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-3xl px-5 py-3.5 text-[15px] transition-colors disabled:opacity-40 ${
        VARIANTS[variant]
      } ${full ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {/* Ondas Material: nacen donde tocaste y se expanden mientras se desvanecen. */}
      {ripples.map((r) => (
        <motion.span
          key={r.id}
          aria-hidden
          className={`pointer-events-none absolute rounded-full ${RIPPLE_TONE[variant]}`}
          style={{ left: r.x, top: r.y, width: r.size, height: r.size }}
          initial={{ scale: 0, opacity: 0.5 }}
          animate={{ scale: 1, opacity: 0 }}
          transition={{ duration: 0.55, ease: [0.2, 0, 0, 1] }}
          onAnimationComplete={() => setRipples((rs) => rs.filter((x) => x.id !== r.id))}
        />
      ))}
      <span className="relative z-10 inline-flex items-center gap-2">{children}</span>
    </motion.button>
  )
}
