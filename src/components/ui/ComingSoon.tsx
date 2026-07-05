import { motion } from 'framer-motion'
import { EASE } from '../../lib/motion'

export function ComingSoon({
  emoji,
  title,
  text,
}: {
  emoji: string
  title: string
  text: string
}) {
  return (
    <div className="h-full overflow-y-auto px-5 pb-32 pt-6">
      <header className="mb-6">
        <p className="text-sm font-medium text-ink/50">Próximamente</p>
        <h1 className="text-[34px] font-bold leading-tight text-ink">{title}</h1>
      </header>

      <motion.div
        initial={{ opacity: 0, y: 16, filter: 'blur(10px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.5, ease: EASE.smooth }}
        className="glass glass-highlight mt-6 rounded-4xl p-8 text-center"
      >
        <div className="mb-4 text-6xl">{emoji}</div>
        <h2 className="mb-2 text-xl font-semibold text-ink">En construcción</h2>
        <p className="mx-auto max-w-xs text-sm text-ink/55">{text}</p>
      </motion.div>
    </div>
  )
}
