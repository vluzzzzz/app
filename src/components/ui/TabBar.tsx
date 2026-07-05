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
      <div className="glass glass-highlight flex flex-1 items-center justify-around rounded-full p-2">
        {TABS.map((id) => {
          const isActive = active === id
          return (
            <motion.button
              key={id}
              whileTap={{ scale: 0.9 }}
              onClick={() => onChange(id)}
              className="relative flex h-14 w-14 items-center justify-center"
            >
              {isActive && (
                // Pill más ancho que el ícono; se DESLIZA con transform (GPU), sin
                // recalcular tamaños (layout) → mucho más fluido en móvil.
                <motion.span
                  layoutId="nav-active"
                  className="absolute inset-y-1.5 -inset-x-2 rounded-full"
                  style={{
                    background: 'rgb(var(--accent))',
                    boxShadow: '0 0 26px -8px rgb(var(--accent))',
                  }}
                  transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                />
              )}
              <NavIcon
                name={id}
                filled={isActive}
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
