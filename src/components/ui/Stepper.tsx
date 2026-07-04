import { motion } from 'framer-motion'

/** Control +/- para números enteros (ej: cantidad de notas). */
export function Stepper({
  value,
  min = 0,
  max = 30,
  onChange,
}: {
  value: number
  min?: number
  max?: number
  onChange: (value: number) => void
}) {
  const btn =
    'flex h-8 w-8 items-center justify-center rounded-xl bg-ink/10 text-ink text-lg font-bold leading-none disabled:opacity-30'
  return (
    <div className="flex items-center gap-2">
      <motion.button
        whileTap={{ scale: 0.85 }}
        className={btn}
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
      >
        −
      </motion.button>
      <span className="w-6 text-center text-base font-bold tabular-nums text-ink">
        {value}
      </span>
      <motion.button
        whileTap={{ scale: 0.85 }}
        className={btn}
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
      >
        +
      </motion.button>
    </div>
  )
}
