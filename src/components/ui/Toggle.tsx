import { motion } from 'framer-motion'

export function Toggle({
  on,
  onToggle,
}: {
  on: boolean
  onToggle: () => void
}) {
  return (
    <button
      onClick={onToggle}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
        on ? 'bg-emerald-500' : 'bg-ink/20'
      }`}
    >
      <motion.span
        layout
        transition={{ type: 'spring', stiffness: 500, damping: 32 }}
        className="absolute top-0.5 h-6 w-6 rounded-full bg-white shadow"
        style={{ left: on ? 22 : 2 }}
      />
    </button>
  )
}
