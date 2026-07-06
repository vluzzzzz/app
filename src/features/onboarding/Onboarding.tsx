import { useEffect, useState, type ReactElement, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useAppStore } from '../../store/useAppStore'
import { ACCENT_THEMES, accentGhost } from '../../lib/accents'
import { COUNTRY_SCALES, flagUrl } from '../../lib/scales'
import { ChevronLeft, SunIcon, MoonIcon } from '../../components/ui/Icons'
import { EASE } from '../../lib/motion'

const STEPS = ['welcome', 'name', 'theme', 'color', 'scale', 'referral', 'done'] as const
type Step = (typeof STEPS)[number]

// Oscurece un "r g b" hacia un tono más profundo del mismo color (para el borde).
function darken(rgb: string, f = 0.55): string {
  return rgb
    .split(' ')
    .map((n) => Math.round(Number(n) * f))
    .join(' ')
}

const REFERRALS: {
  id: string
  label: string
  Icon: (p: { className?: string }) => ReactElement
}[] = [
  { id: 'tiktok', label: 'TikTok', Icon: TikTokIcon },
  { id: 'instagram', label: 'Instagram', Icon: InstagramIcon },
  { id: 'friend', label: 'Un amigo', Icon: FriendsIcon },
  { id: 'teacher', label: 'Un profesor', Icon: TeacherIcon },
  { id: 'google', label: 'Google', Icon: SearchIcon },
  { id: 'other', label: 'Otro', Icon: OtherIcon },
]

export function Onboarding() {
  const [i, setI] = useState(0)
  const step: Step = STEPS[i]

  const theme = useAppStore((s) => s.theme)
  const setTheme = useAppStore((s) => s.setTheme)
  const accent = useAppStore((s) => s.accent)
  const setAccent = useAppStore((s) => s.setAccent)
  const setDefaultScale = useAppStore((s) => s.setDefaultScale)
  const setUserName = useAppStore((s) => s.setUserName)
  const setReferral = useAppStore((s) => s.setReferral)
  const setOnboarded = useAppStore((s) => s.setOnboarded)

  const [name, setName] = useState('')
  const [pickedReferral, setPickedReferral] = useState('')
  const [scaleCode, setScaleCode] = useState('cl')

  // Presentación en NEGRO por defecto hasta que el usuario elija su color.
  useEffect(() => {
    setAccent('black')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const next = () => setI((v) => Math.min(v + 1, STEPS.length - 1))
  const back = () => setI((v) => Math.max(v - 1, 0))

  function finish() {
    setUserName(name.trim())
    setReferral(pickedReferral)
    setOnboarded(true)
  }

  const qIndex = i - 1
  const totalQ = STEPS.length - 2
  const showProgress = step !== 'welcome' && step !== 'done'

  return (
    <div className="mx-auto flex h-[100dvh] w-full max-w-md flex-col overflow-y-auto px-6 pb-6 pt-6">
      {showProgress && (
        <div className="mb-2 flex items-center gap-3">
          <button
            onClick={back}
            className="rounded-full p-1.5 text-ink/70 active:bg-ink/10"
            aria-label="Atrás"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="flex flex-1 gap-1.5">
            {Array.from({ length: totalQ }).map((_, k) => (
              <div
                key={k}
                className="h-1.5 flex-1 rounded-full"
                style={{
                  background: k <= qIndex ? 'rgb(var(--ink))' : 'rgb(var(--ink) / 0.12)',
                }}
              />
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-1 flex-col">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 22 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -22 }}
            transition={{ duration: 0.3, ease: EASE.smooth }}
            className="flex flex-1 flex-col justify-center py-4"
          >
            {step === 'welcome' && (
              <div>
                <img
                  src="/presentacionlogoapp.png"
                  alt="Brody"
                  className="mb-5 h-24 w-24 object-contain"
                />
                <h1 className="text-4xl font-bold text-ink">Brody</h1>
                <p className="mt-1.5 text-lg leading-snug text-ink/55">
                  Configura lo esencial
                  <br />
                  para empezar.
                </p>
                <div className="mt-7">
                  <AccentBtn onClick={next}>Continuar →</AccentBtn>
                </div>
              </div>
            )}

            {step === 'name' && (
              <div>
                <h2 className="text-3xl font-bold text-ink">
                  ¿Cómo quieres que te llame?
                </h2>
                <input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && next()}
                  placeholder="Tu nombre"
                  className="glass glass-highlight mt-6 w-full rounded-3xl px-5 py-4 text-lg text-ink outline-none placeholder:text-ink/30"
                />
                <div className="mt-7">
                  <AccentBtn onClick={next}>Continuar →</AccentBtn>
                </div>
              </div>
            )}

            {step === 'theme' && (
              <div>
                <h2 className="text-3xl font-bold text-ink">Elige tu tema</h2>
                <div className="mt-6 grid grid-cols-2 gap-3">
                  {(['light', 'dark'] as const).map((t) => (
                    <motion.button
                      key={t}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => setTheme(t)}
                      className={`glass glass-highlight flex flex-col items-center gap-2.5 rounded-3xl py-8 text-base font-semibold text-ink ${
                        theme === t ? 'ring-2 ring-ink/60' : ''
                      }`}
                    >
                      {t === 'light' ? (
                        <SunIcon className="h-7 w-7" />
                      ) : (
                        <MoonIcon className="h-7 w-7" />
                      )}
                      {t === 'light' ? 'Claro' : 'Oscuro'}
                    </motion.button>
                  ))}
                </div>
                <div className="mt-7">
                  <AccentBtn onClick={next}>Continuar →</AccentBtn>
                </div>
              </div>
            )}

            {step === 'color' && (
              <div>
                <h2 className="text-3xl font-bold text-ink">Elige tu color</h2>
                <p className="mt-1.5 text-ink/55">El que más te guste.</p>
                <div className="mt-6 grid grid-cols-4 gap-4">
                  {ACCENT_THEMES.map((a) => {
                    const selected = accent === a.id
                    return (
                      <motion.button
                        key={a.id}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setAccent(a.id)}
                        aria-label={a.label}
                        animate={{ borderRadius: selected ? '30%' : '50%' }}
                        transition={{ type: 'spring', stiffness: 420, damping: 26 }}
                        className="aspect-square"
                        style={{
                          background: `radial-gradient(110% 110% at 32% 28%, rgba(255,255,255,0.4), rgba(255,255,255,0) 52%), rgb(${a.rgb})`,
                          boxShadow: selected
                            ? `0 0 0 3px rgb(${darken(a.rgb)}), inset 0 -3px 6px rgba(0,0,0,0.14)`
                            : 'inset 0 -3px 6px rgba(0,0,0,0.14)',
                        }}
                      />
                    )
                  })}
                </div>
                <div className="mt-7">
                  <AccentBtn onClick={next}>Continuar →</AccentBtn>
                </div>
              </div>
            )}

            {step === 'scale' && (
              <div>
                <h2 className="text-3xl font-bold text-ink">Elige tu escala</h2>
                <p className="mt-1.5 text-ink/55">La cambias después si quieres.</p>
                <div className="mt-6 grid grid-cols-2 gap-3">
                  {COUNTRY_SCALES.map((s) => (
                    <motion.button
                      key={s.code}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => {
                        setScaleCode(s.code)
                        setDefaultScale(s.scale)
                      }}
                      className={`glass glass-highlight flex flex-col items-start gap-1 rounded-3xl p-4 text-left ${
                        scaleCode === s.code ? 'ring-2 ring-ink/60' : ''
                      }`}
                    >
                      <img
                        src={flagUrl(s.code)}
                        alt={s.country}
                        className="mb-1 h-4 rounded-[3px] shadow-sm"
                      />
                      <span className="text-2xl font-black tabular-nums text-ink">
                        {s.label}
                      </span>
                      <span className="mt-0.5 text-xs font-medium text-ink/50">
                        {s.country} · {s.pass}
                      </span>
                    </motion.button>
                  ))}
                </div>
                <div className="mt-7">
                  <AccentBtn onClick={next}>Continuar →</AccentBtn>
                </div>
              </div>
            )}

            {step === 'referral' && (
              <div>
                <h2 className="text-3xl font-bold text-ink">¿Cómo conociste Brody?</h2>
                <p className="mt-1.5 text-ink/55">Nos ayuda un montón saberlo.</p>
                <div className="mt-6 grid grid-cols-2 gap-3">
                  {REFERRALS.map((r) => {
                    const on = pickedReferral === r.id
                    return (
                      <motion.button
                        key={r.id}
                        whileTap={{ scale: 0.96 }}
                        onClick={() => setPickedReferral(r.id)}
                        className={`glass glass-highlight flex items-center gap-2 rounded-2xl px-3.5 py-3.5 text-left text-sm font-medium text-ink ${
                          on ? 'ring-2 ring-ink/60' : ''
                        }`}
                      >
                        <r.Icon className="h-5 w-5 shrink-0 text-ink/70" />
                        <span className="flex-1 truncate">{r.label}</span>
                        <span
                          className="h-4 w-4 shrink-0 rounded-full border-2"
                          style={{
                            borderColor: on
                              ? 'rgb(var(--accent))'
                              : 'rgb(var(--ink) / 0.25)',
                            background: on ? 'rgb(var(--accent))' : 'transparent',
                          }}
                        />
                      </motion.button>
                    )
                  })}
                </div>
                <div className="mt-7">
                  <AccentBtn onClick={next}>Continuar →</AccentBtn>
                </div>
              </div>
            )}

            {step === 'done' && (
              <div className="text-center">
                <img
                  src={accentGhost(accent, theme === 'dark')}
                  alt="Brody"
                  className="mx-auto mb-6 h-28 w-28 object-contain drop-shadow-lg"
                />
                <h1 className="text-4xl font-bold text-ink">
                  {name.trim() ? `¡Listo, ${name.trim()}!` : '¡Todo listo!'}
                </h1>
                <p className="mx-auto mt-2 max-w-xs text-base text-ink/55">
                  Brody quedó a tu pinta. A calcular esas notas. 🚀
                </p>
                <div className="mt-8">
                  <AccentBtn onClick={finish}>Entrar a Brody</AccentBtn>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

/** Botón principal: su color es el acento elegido (negro hasta que eligen color). */
function AccentBtn({
  children,
  onClick,
}: {
  children: ReactNode
  onClick: () => void
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      className="w-full rounded-3xl px-5 py-4 text-[15px] font-semibold"
      style={{ background: 'rgb(var(--accent))', color: 'rgb(var(--surface))' }}
    >
      {children}
    </motion.button>
  )
}

/* ---- Íconos monocromáticos para "¿cómo conociste?" ---- */

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17" cy="7" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 15a3 3 0 1 0 3 3V4c.5 2.5 2.5 4 5 4" />
    </svg>
  )
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  )
}

function FriendsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3" />
      <path d="M3 19a6 6 0 0 1 12 0" />
      <path d="M16 5.5a3 3 0 0 1 0 5.5" />
      <path d="M17.5 13.2A6 6 0 0 1 21 19" />
    </svg>
  )
}

function TeacherIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 8 12 4l10 4-10 4z" />
      <path d="M6 10v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5" />
    </svg>
  )
}

function OtherIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M9.6 9.2a2.5 2.5 0 1 1 3.6 2.5c-.8.4-1.2.9-1.2 1.8" />
      <circle cx="12" cy="16.6" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  )
}
