import { motion } from 'framer-motion'
import type { ComponentType } from 'react'
import {
  CalculatorFilledIcon,
  CalculatorIcon,
  CalendarFilledIcon,
  CalendarIcon,
  ClockFilledIcon,
  ClockIcon,
  HomeFilledIcon,
  HomeIcon,
  PlusIcon,
} from './Icons'

export type TabId = 'inicio' | 'calculadora' | 'horario' | 'calendario'

type IconC = ComponentType<{ className?: string }>

const TABS: { id: TabId; Icon: IconC; IconActive: IconC }[] = [
  { id: 'inicio', Icon: HomeIcon, IconActive: HomeFilledIcon },
  { id: 'calculadora', Icon: CalculatorIcon, IconActive: CalculatorFilledIcon },
  { id: 'horario', Icon: ClockIcon, IconActive: ClockFilledIcon },
  { id: 'calendario', Icon: CalendarIcon, IconActive: CalendarFilledIcon },
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
        {TABS.map(({ id, Icon, IconActive }) => {
          const isActive = active === id
          const I = isActive ? IconActive : Icon
          return (
            <motion.button
              layout
              key={id}
              whileTap={{ scale: 0.9 }}
              onClick={() => onChange(id)}
              transition={{ layout: { type: 'spring', stiffness: 420, damping: 36 } }}
              className={`relative flex h-14 items-center justify-center rounded-2xl ${
                isActive ? 'px-6' : 'px-3.5'
              }`}
            >
              {isActive && (
                <motion.span
                  layoutId="nav-active"
                  className="absolute inset-0 rounded-2xl"
                  style={{
                    // Relleno sólido + glow suave del mismo color (como stepbro). Sin borde.
                    background: 'rgb(var(--accent))',
                    boxShadow: '0 0 30px -8px rgb(var(--accent))',
                  }}
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                />
              )}
              <I
                className={`relative z-10 h-7 w-7 transition-colors ${
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
        className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-full bg-black text-white shadow-glass-lg"
      >
        <PlusIcon className="h-7 w-7" />
      </motion.button>
    </div>
  )
}
