import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { EASE } from '../../lib/motion'
import { SubjectWheel, type WheelItem } from './SubjectWheel'
import { RAISED } from './relief'
import { TrashIcon } from './Icons'

/**
 * Modal de escritorio en dos columnas: a la izquierda una rueda de ramos tipo
 * iOS; a la derecha el formulario, ordenado en tarjetas. Pie fijo con borrar y
 * guardar. Solo para PC — en celu se sigue usando GlassSheet.
 */
export function WheelModal({
  open,
  onClose,
  items,
  value,
  onChange,
  wheelLabel = 'Ramo',
  children,
  onDelete,
  onSave,
  canSave,
  saveLabel,
}: {
  open: boolean
  onClose: () => void
  items: WheelItem[]
  value: string
  onChange: (id: string) => void
  wheelLabel?: string
  children: ReactNode
  onDelete?: () => void
  onSave: () => void
  canSave: boolean
  saveLabel: string
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.26, ease: EASE.smooth }}
            className="relative flex max-h-[88vh] w-full max-w-[880px] overflow-hidden rounded-[30px] bg-surface shadow-[0_40px_90px_-30px_rgba(0,0,0,0.5)] ring-1 ring-ink/[0.06] dark:bg-[rgb(16_16_18)] dark:ring-white/10"
          >
            {/* ===== Columna izquierda: rueda de ramos ===== */}
            <div className="flex w-[300px] shrink-0 flex-col items-center border-r border-ink/[0.06] bg-ink/[0.015] py-8">
              <p className="mb-5 text-[13px] font-semibold uppercase tracking-wide text-ink/40">{wheelLabel}</p>
              {items.length > 0 ? (
                <SubjectWheel items={items} value={value} onChange={onChange} />
              ) : (
                <p className="px-6 text-center text-[13.5px] text-ink/45">
                  Primero crea un ramo en la Calculadora.
                </p>
              )}
            </div>

            {/* ===== Columna derecha: formulario ===== */}
            <div className="flex min-w-0 flex-1 flex-col">
              <button
                onClick={onClose}
                aria-label="Cerrar"
                className="absolute right-5 top-5 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-ink/[0.06] text-ink/50 transition-colors hover:bg-ink/10 hover:text-ink"
              >
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>

              <div className="min-h-0 flex-1 overflow-y-auto px-7 pb-4 pt-8">{children}</div>

              {/* Pie fijo */}
              <div className="flex items-center gap-3 border-t border-ink/[0.06] px-7 py-4">
                {onDelete && (
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={onDelete}
                    aria-label="Eliminar"
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500 transition-colors hover:bg-rose-500/20"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </motion.button>
                )}
                <motion.button
                  whileHover={canSave ? { y: -1 } : undefined}
                  whileTap={canSave ? { scale: 0.98, y: 0 } : undefined}
                  onClick={onSave}
                  disabled={!canSave}
                  style={canSave ? RAISED : undefined}
                  className="h-12 flex-1 rounded-2xl bg-ink text-[15px] font-semibold text-surface transition-opacity disabled:opacity-30"
                >
                  {saveLabel}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

/** Fila de una tarjeta "inset grouped" estilo iOS: icono, etiqueta y valor/acción a la derecha. */
export function SheetRow({
  icon,
  label,
  children,
  onClick,
  last,
}: {
  icon: ReactNode
  label: string
  children: ReactNode
  onClick?: () => void
  last?: boolean
}) {
  const inner = (
    <div className={`flex items-center gap-3 px-4 py-3 ${last ? '' : 'border-b border-ink/[0.06]'}`}>
      <span className="flex h-7 w-7 shrink-0 items-center justify-center text-ink/45">{icon}</span>
      <span className="text-[14.5px] font-medium text-ink/80">{label}</span>
      <span className="ml-auto flex items-center gap-1.5 text-[14.5px] font-semibold text-ink">{children}</span>
    </div>
  )
  if (!onClick) return inner
  return (
    <button onClick={onClick} className="w-full text-left transition-colors hover:bg-ink/[0.02]">
      {inner}
    </button>
  )
}

/** Tarjeta blanca que agrupa filas (como las listas inset de iOS). */
export function SheetCard({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div>
      {title && <p className="mb-2 px-1 text-[13px] font-semibold text-ink/50">{title}</p>}
      <div className="overflow-hidden rounded-2xl bg-[rgb(var(--card))] ring-1 ring-ink/[0.05]">{children}</div>
    </div>
  )
}
