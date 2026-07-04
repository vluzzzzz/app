import { motion, type HTMLMotionProps } from 'framer-motion'
import type { ReactNode } from 'react'

type Variant = 'primary' | 'glass' | 'ghost' | 'danger'

type Props = Omit<HTMLMotionProps<'button'>, 'children'> & {
  children: ReactNode
  variant?: Variant
  full?: boolean
}

const VARIANTS: Record<Variant, string> = {
  primary:
    'shimmer bg-ink text-surface font-semibold shadow-glass-lg',
  glass:
    'glass glass-highlight text-ink font-medium',
  ghost: 'text-ink/70 font-medium',
  danger: 'bg-rose-500/90 text-ink font-semibold shadow-glass',
}

export function GlassButton({
  children,
  variant = 'glass',
  full,
  className = '',
  ...rest
}: Props) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={`inline-flex items-center justify-center gap-2 rounded-3xl px-5 py-3.5 text-[15px] transition-colors disabled:opacity-40 ${
        VARIANTS[variant]
      } ${full ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {children}
    </motion.button>
  )
}
