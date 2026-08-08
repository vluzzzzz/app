import { motion } from 'framer-motion'
import { NavIcon, PlusIcon } from './Icons'

export type TabId = 'inicio' | 'calculadora' | 'horario' | 'calendario'

const TABS: TabId[] = ['inicio', 'calculadora', 'horario', 'calendario']

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
      <div className="glass glass-highlight flex flex-1 items-center rounded-full p-2">
        {TABS.map((id) => {
          const isActive = active === id
          return (
            <motion.button
              key={id}
              whileTap={{ scale: 0.9 }}
              onClick={() => onChange(id)}
              className="relative flex h-16 flex-1 items-center justify-center"
            >
              {isActive && (
                // Pill DENTRO del espacio (flex-1) con margen parejo → simétrico en
                // los extremos. Se desliza con transform (GPU).
                <motion.span
                  layoutId="nav-active"
                  className="absolute inset-y-1 -inset-x-0.5 rounded-full"
                  style={{
                    background: 'rgb(var(--ink))',
                    boxShadow: '0 8px 20px -8px rgba(0,0,0,0.45)',
                  }}
                  transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                />
              )}
              <NavIcon
                name={id}
                filled={isActive}
                className={`relative z-10 h-8 w-8 transition-colors ${
                  isActive ? 'text-[rgb(var(--surface))]' : 'text-ink/35'
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
        className="flex h-[80px] w-[80px] shrink-0 items-center justify-center rounded-full bg-ink text-surface shadow-glass-lg"
      >
        <PlusIcon className="h-8 w-8" />
      </motion.button>
    </div>
  )
}
