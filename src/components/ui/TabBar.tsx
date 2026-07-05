import { motion } from 'framer-motion'
import type { ComponentType } from 'react'
import {
  CalculatorIcon,
  CalendarIcon,
  ClockIcon,
  HomeIcon,
  PlusIcon,
} from './Icons'

export type TabId = 'inicio' | 'calculadora' | 'horario' | 'calendario'

const TABS: { id: TabId; Icon: ComponentType<{ className?: string }> }[] = [
  { id: 'inicio', Icon: HomeIcon },
  { id: 'calculadora', Icon: CalculatorIcon },
  { id: 'horario', Icon: ClockIcon },
  { id: 'calendario', Icon: CalendarIcon },
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
    <div className="fixed inset-x-0 bottom-0 z-40 mx-auto flex max-w-md items-center gap-2.5 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      {/* Pill de pestañas (glass normal, más gruesa) */}
      <div className="glass glass-highlight flex flex-1 items-center justify-around rounded-full p-2">
        {TABS.map(({ id, Icon }) => {
          const isActive = active === id
          return (
            <motion.button
              key={id}
              whileTap={{ scale: 0.88 }}
              onClick={() => onChange(id)}
              className="relative flex h-12 w-12 items-center justify-center rounded-full"
            >
              {isActive && (
                <motion.span
                  layoutId="nav-active"
                  className="absolute inset-0 rounded-full"
                  style={{ background: 'rgb(var(--accent))' }}
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                />
              )}
              <Icon
                className={`relative z-10 h-6 w-6 transition-colors ${
                  isActive ? 'text-white' : 'text-ink/40'
                }`}
              />
            </motion.button>
          )
        })}
      </div>

      {/* Botón + (menú Opciones) */}
      <motion.button
        whileTap={{ scale: 0.88 }}
        onClick={onOpenMenu}
        className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-black text-white shadow-glass-lg"
      >
        <PlusIcon className="h-6 w-6" />
      </motion.button>
    </div>
  )
}
