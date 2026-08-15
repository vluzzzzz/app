import { motion } from 'framer-motion'
import type { Route } from '../../App'
import { useAppStore } from '../../store/useAppStore'
import { NavIcon, PlusIcon, SettingsIcon, UserIcon } from './Icons'
import type { TabId } from './TabBar'

const TABS: { id: TabId; label: string }[] = [
  { id: 'inicio', label: 'Inicio' },
  { id: 'calculadora', label: 'Ramos' },
  { id: 'horario', label: 'Horario' },
  { id: 'calendario', label: 'Calendario' },
]

/**
 * Navegación lateral del modo PC (≥1024px). Reemplaza a la TabBar: mismas 4
 * secciones (pill activa deslizante), más Brody (abre/cierra el panel de chat),
 * Ajustes, Perfil y el menú de opciones abajo. Solo se monta en desktop —
 * nunca convive con la TabBar (layoutIds de nav separados).
 */
export function Sidebar({
  active,
  navigate,
  chatOpen,
  onToggleChat,
  onOpenMenu,
}: {
  active: string
  navigate: (r: Route) => void
  chatOpen: boolean
  onToggleChat: () => void
  onOpenMenu: () => void
}) {
  const userName = useAppStore((s) => s.userName)

  return (
    <aside className="flex h-full w-[248px] shrink-0 flex-col gap-1 border-r border-ink/5 px-4 py-6">
      {/* Logo */}
      <button
        onClick={() => navigate({ name: 'inicio' })}
        className="mb-6 flex items-center gap-3 px-2"
      >
        <img src="/logoapp.png" alt="Brody" className="h-10 w-10 rounded-xl object-contain" />
        <span className="text-[19px] font-bold text-ink">Brody</span>
      </button>

      {/* Nav principal */}
      {TABS.map(({ id, label }) => {
        const isActive = active === id
        return (
          <button
            key={id}
            onClick={() => navigate({ name: id } as Route)}
            className={`relative flex items-center gap-3 rounded-2xl px-3.5 py-3 text-[15px] font-semibold transition-colors ${
              isActive ? 'text-surface' : 'text-ink/55 hover:bg-ink/5 hover:text-ink'
            }`}
          >
            {isActive && (
              <motion.span
                layoutId="sidebar-active"
                className="absolute inset-0 rounded-2xl"
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
              className={`relative z-10 h-6 w-6 ${
                isActive ? 'text-[rgb(var(--surface))]' : 'text-ink/40'
              }`}
            />
            <span className="relative z-10">{label}</span>
          </button>
        )
      })}

      <div className="mx-2 my-3 h-px bg-ink/5" />

      {/* Brody (panel de chat) */}
      <button
        onClick={onToggleChat}
        className={`flex items-center gap-3 rounded-2xl px-3.5 py-3 text-[15px] font-semibold transition-colors ${
          chatOpen ? 'bg-ink/5 text-ink' : 'text-ink/55 hover:bg-ink/5 hover:text-ink'
        }`}
      >
        <img src="/logoapp.png" alt="" className="h-6 w-6 rounded-lg object-contain opacity-80" />
        <span>Brody</span>
        {chatOpen && <span className="ml-auto h-2 w-2 rounded-full bg-emerald-500" />}
      </button>

      {/* Ajustes */}
      <button
        onClick={() => navigate({ name: 'settings' })}
        className={`flex items-center gap-3 rounded-2xl px-3.5 py-3 text-[15px] font-semibold transition-colors ${
          active === 'settings' ? 'bg-ink/5 text-ink' : 'text-ink/55 hover:bg-ink/5 hover:text-ink'
        }`}
      >
        <SettingsIcon className="h-6 w-6 text-ink/40" />
        <span>Ajustes</span>
      </button>

      {/* Perfil */}
      <button
        onClick={() => navigate({ name: 'profile' })}
        className={`flex items-center gap-3 rounded-2xl px-3.5 py-3 text-[15px] font-semibold transition-colors ${
          active === 'profile' ? 'bg-ink/5 text-ink' : 'text-ink/55 hover:bg-ink/5 hover:text-ink'
        }`}
      >
        <UserIcon className="h-6 w-6 text-ink/40" />
        <span className="truncate">{userName || 'Perfil'}</span>
      </button>

      {/* Menú de opciones (Apariencia, sesión, etc.) */}
      <button
        onClick={onOpenMenu}
        className="mt-auto flex items-center gap-3 rounded-2xl bg-ink px-3.5 py-3 text-[15px] font-semibold text-surface shadow-glass transition-transform hover:-translate-y-0.5"
      >
        <PlusIcon className="h-5 w-5" />
        <span>Opciones</span>
      </button>
    </aside>
  )
}
