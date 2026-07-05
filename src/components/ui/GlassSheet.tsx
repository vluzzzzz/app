import { AnimatePresence, motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { EASE } from '../../lib/motion'
import { useKeyboardInset } from '../../lib/useKeyboardInset'

type Props = {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}

/** Hoja modal estilo iOS que sube desde abajo, con backdrop y arrastre para cerrar. */
export function GlassSheet({ open, onClose, title, children }: Props) {
  const kbInset = useKeyboardInset()
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel — se sube por encima del teclado (kbInset) */}
          <motion.div
            className="glass-strong glass-highlight relative w-full max-w-md rounded-t-5xl px-5 pb-8 pt-3 transition-[margin] duration-200"
            style={{ marginBottom: kbInset }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.5, ease: EASE.overshoot }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120 || info.velocity.y > 700) onClose()
            }}
          >
            {/* Grabber */}
            <div className="mx-auto mb-4 h-1.5 w-11 rounded-full bg-ink/30" />
            {title && (
              <h2 className="mb-4 text-center text-lg font-semibold text-ink">
                {title}
              </h2>
            )}
            <div className="max-h-[70vh] overflow-y-auto">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
