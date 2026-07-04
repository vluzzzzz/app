import { motion } from 'framer-motion'
import type { ComponentType } from 'react'
import GlassSurface from './GlassSurface'
import {
  CalculatorIcon,
  CalendarIcon,
  ClockIcon,
  HomeIcon,
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
}: {
  active: TabId
  onChange: (t: TabId) => void
}) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <GlassSurface
        width="100%"
        height={66}
        borderRadius={30}
        className="pointer-events-auto w-full"
      >
        <div className="flex h-full w-full items-center justify-around">
          {TABS.map(({ id, label, Icon }) => {
            const isActive = active === id
            return (
              <motion.button
                key={id}
                whileTap={{ scale: 0.88 }}
                onClick={() => onChange(id)}
                className="relative flex h-full flex-1 flex-col items-center justify-center gap-0.5"
              >
                {isActive && (
                  <motion.span
                    layoutId="tab-active"
                    className="absolute inset-1.5 -z-0 rounded-2xl bg-ink/10"
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  />
                )}
                <Icon
                  className={`relative z-10 h-5 w-5 ${
                    isActive ? 'text-ink' : 'text-ink/45'
                  }`}
                />
                <span
                  className={`relative z-10 text-[10px] font-semibold ${
                    isActive ? 'text-ink' : 'text-ink/45'
                  }`}
                >
                  {label}
                </span>
              </motion.button>
            )
          })}
        </div>
      </GlassSurface>
    </div>
  )
}
