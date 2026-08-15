import { motion } from 'framer-motion'
import type { Route } from '../../App'
import { useAppStore } from '../../store/useAppStore'
import { avatarSrc } from '../../lib/avatars'
import { ChatBubbleIcon, DotsIcon, NavIcon, SettingsIcon } from './Icons'
import type { TabId } from './TabBar'

const TABS: { id: TabId; label: string }[] = [
  { id: 'inicio', label: 'Inicio' },
  { id: 'calculadora', label: 'Calculadora' },
  { id: 'horario', label: 'Horario' },
  { id: 'calendario', label: 'Calendario' },
]

/**
 * Navegación lateral del modo PC (≥1024px). Organización: logo arriba (único
 * lugar con el logo), nav principal, Brody (chat) — y abajo del todo, como en
 * cualquier app de escritorio: Ajustes y la tarjeta de perfil (foto + nombre)
 * con el menú de opciones en los puntitos. Sin emojis: es interfaz.
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
  const avatar = useAppStore((s) => s.avatar)

  return (
    <aside className="flex h-full w-[248px] shrink-0 flex-col border-r border-ink/5 px-4 py-6">
      {/* Logo (único) */}
      <button
        onClick={() => navigate({ name: 'inicio' })}
        className="mb-7 flex items-center gap-3 px-2"
      >
        <img src="/logoapp.png" alt="Brody" className="h-9 w-9 rounded-xl object-contain" />
        <span className="text-[18px] font-bold text-ink">Brody</span>
      </button>

      {/* Nav principal */}
      <div className="flex flex-col gap-1">
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

        {/* Brody (panel de chat) */}
        <button
          onClick={onToggleChat}
          className={`flex items-center gap-3 rounded-2xl px-3.5 py-3 text-[15px] font-semibold transition-colors ${
            chatOpen ? 'bg-ink/5 text-ink' : 'text-ink/55 hover:bg-ink/5 hover:text-ink'
          }`}
        >
          <ChatBubbleIcon className="h-6 w-6 text-ink/40" />
          <span>Brody</span>
          {chatOpen && <span className="ml-auto h-2 w-2 rounded-full bg-emerald-500" />}
        </button>
      </div>

      {/* Bloque inferior: Ajustes + perfil en la esquina */}
      <div className="mt-auto">
        <div className="mx-2 mb-3 h-px bg-ink/5" />
        <button
          onClick={() => navigate({ name: 'settings' })}
          className={`flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-[15px] font-semibold transition-colors ${
            active === 'settings' ? 'bg-ink/5 text-ink' : 'text-ink/55 hover:bg-ink/5 hover:text-ink'
          }`}
        >
          <SettingsIcon className="h-6 w-6 text-ink/40" />
          <span>Ajustes</span>
        </button>

        <div className="mt-2 flex items-center gap-1">
          <button
            onClick={() => navigate({ name: 'profile' })}
            className={`flex min-w-0 flex-1 items-center gap-3 rounded-2xl px-2.5 py-2.5 text-left transition-colors ${
              active === 'profile' ? 'bg-ink/5' : 'hover:bg-ink/5'
            }`}
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white shadow-[var(--card-shadow)] ring-1 ring-ink/5">
              <img src={avatarSrc(avatar || 'happy')} alt="" className="h-full w-full object-contain" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[14.5px] font-bold leading-tight text-ink">
                {userName || 'Estudiante'}
              </span>
              <span className="block text-[12px] text-ink/45">Estudiante</span>
            </span>
          </button>
          <button
            onClick={onOpenMenu}
            aria-label="Opciones"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-ink/45 transition-colors hover:bg-ink/5 hover:text-ink"
          >
            <DotsIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    </aside>
  )
}
