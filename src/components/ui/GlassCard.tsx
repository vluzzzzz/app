import { motion, type HTMLMotionProps } from 'framer-motion'
import type { ReactNode } from 'react'

type Props = HTMLMotionProps<'div'> & {
  children: ReactNode
  strong?: boolean
  /** Habilita animación de "tap" (para tarjetas pulsables). */
  interactive?: boolean
}

export function GlassCard({
  children,
  strong,
  interactive,
  className = '',
  ...rest
}: Props) {
  return (
    <motion.div
      className={`${strong ? 'glass-strong' : 'glass'} glass-highlight rounded-4xl ${className}`}
      whileTap={interactive ? { scale: 0.975 } : undefined}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      {...rest}
    >
      {children}
    </motion.div>
  )
}
