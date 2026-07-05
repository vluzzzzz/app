import { AnimatePresence, motion } from 'framer-motion'
import type { ComponentType } from 'react'
import { EASE } from '../../lib/motion'
import {
  CalculatorIcon,
  CalendarIcon,
  ClockIcon,
  HomeIcon,
  PlusIcon,
} from './Icons'

export type TabId = 'inicio' | 'calculadora' | 'horario' | 'calendario'

const TABS: { id: TabId; label: string; Icon: ComponentType<{ className?: string }> }[] = [
  { id: 'inicio', label: 'Inicio', Icon: HomeIcon },
  { id: 'calculadora', label: 'Calculadora', Icon: CalculatorIcon },
  { id: 'horario', label: 'Horario', Icon: ClockIcon },
  { id: 'calendario', label: 'Calendario', Icon: CalendarIcon },
]

export function TabBar({
  active,
  onChange,
  onOpenMenu,
}: {
  active: TabId
  onChange: (t: TabId) => void
  onOpenMenu: () => void
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 mx-auto flex max-w-md items-center gap-2 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      {/* Pill de pestañas (glass normal) */}
      <div className="glass glass-highlight flex flex-1 items-center justify-around rounded-full p-1.5">
        {TABS.map(({ id, label, Icon }) => {
          const isActive = active === id
          return (
            <motion.button
              layout
              key={id}
              whileTap={{ scale: 0.9 }}
              onClick={() => onChange(id)}
              transition={{ layout: { duration: 0.3, ease: EASE.smooth } }}
              className={`flex items-center gap-1.5 rounded-full py-2.5 ${
                isActive ? 'bg-ink/10 px-3.5 text-ink' : 'px-3 text-ink/45'
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <AnimatePresence initial={false} mode="popLayout">
                {isActive && (
                  <motion.span
                    key="label"
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.16 }}
                    className="whitespace-nowrap text-[13px] font-semibold"
                  >
                    {label}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          )
        })}
      </div>

      {/* Botón + (menú Opciones) */}
      <motion.button
        whileTap={{ scale: 0.88 }}
        onClick={onOpenMenu}
        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-black text-white shadow-glass-lg"
      >
        <PlusIcon className="h-6 w-6" />
      </motion.button>
    </div>
  )
}
