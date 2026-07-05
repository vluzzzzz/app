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
              key={id}
              whileTap={{ scale: 0.88 }}
              onClick={() => onChange(id)}
              className="relative flex h-14 w-14 items-center justify-center rounded-full"
            >
              {isActive && (
                <motion.span
                  layoutId="nav-active"
                  className="absolute inset-0 rounded-full"
                  style={{
                    // Botón "glossy": más claro arriba (bisel), base abajo.
                    background:
                      'linear-gradient(180deg, rgb(var(--accent-light)), rgb(var(--accent)) 60%)',
                    boxShadow:
                      'inset 0 1.5px 1px rgba(255,255,255,0.55), inset 0 -3px 6px rgba(0,0,0,0.12), 0 4px 10px -2px rgb(var(--accent) / 0.5)',
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
