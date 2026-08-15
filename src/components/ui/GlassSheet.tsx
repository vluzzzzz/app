import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { EASE } from '../../lib/motion'
import { useKeyboardInset } from '../../lib/useKeyboardInset'
import { useIsDesktop } from '../../lib/useIsDesktop'

type Props = {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}

/**
 * Hoja modal. En celu: estilo iOS, sube desde abajo con arrastre para cerrar.
 * En PC (≥1024px): modal centrado con fade+escala, sin drag ni grabber, y
 * cierre con Escape. Los consumidores no cambian nada.
 */
export function GlassSheet({ open, onClose, title, children }: Props) {
  const kbInset = useKeyboardInset()
  const isDesktop = useIsDesktop()

  // Cerrar con Escape (útil en PC; inocuo en celu).
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Portal al body: las páginas viven dentro de un motion.div con transform
  // (transición de página), que crea un stacking context y dejaría esta hoja
  // DEBAJO de la TabBar (z-40) pese a su z-50.
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className={`fixed inset-0 z-50 flex justify-center ${
            isDesktop ? 'items-center p-6' : 'items-end'
          }`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel — en celu se sube por encima del teclado (kbInset) */}
          <motion.div
            className={`glass-strong glass-highlight relative w-full px-5 pb-8 pt-3 ${
              isDesktop
                ? 'max-w-lg rounded-4xl pt-6'
                : 'max-w-md rounded-t-5xl transition-[margin] duration-200'
            }`}
            style={isDesktop ? undefined : { marginBottom: kbInset }}
            initial={isDesktop ? { opacity: 0, scale: 0.95, y: 12 } : { y: '100%' }}
            animate={isDesktop ? { opacity: 1, scale: 1, y: 0 } : { y: 0 }}
            exit={isDesktop ? { opacity: 0, scale: 0.97 } : { y: '100%' }}
            transition={
              isDesktop
                ? { duration: 0.25, ease: EASE.smooth }
                : { duration: 0.5, ease: EASE.overshoot }
            }
            {...(!isDesktop && {
              drag: 'y' as const,
              dragConstraints: { top: 0, bottom: 0 },
              dragElastic: { top: 0, bottom: 0.6 },
              onDragEnd: (_: unknown, info: { offset: { y: number }; velocity: { y: number } }) => {
                if (info.offset.y > 120 || info.velocity.y > 700) onClose()
              },
            })}
          >
            {/* Grabber (solo celu) */}
            {!isDesktop && <div className="mx-auto mb-4 h-1.5 w-11 rounded-full bg-ink/30" />}
            {title && (
              <h2 className="mb-4 text-center text-lg font-semibold text-ink">
                {title}
              </h2>
            )}
            <div className="max-h-[70vh] overflow-y-auto">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
