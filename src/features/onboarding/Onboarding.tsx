import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useAppStore } from '../../store/useAppStore'
import { ACCENT_THEMES, accentGhost } from '../../lib/accents'
import { type GradeScale } from '../../lib/types'
import { GlassButton } from '../../components/ui/GlassButton'
import { ChevronLeft } from '../../components/ui/Icons'
import { EASE } from '../../lib/motion'

// Pasos con pregunta (para la barra de progreso). Bienvenida/Listo van aparte.
const STEPS = ['welcome', 'name', 'theme', 'color', 'scale', 'referral', 'done'] as const
type Step = (typeof STEPS)[number]

const SCALE_PRESETS: { label: string; scale: GradeScale }[] = [
  { label: 'Chile 1,0 – 7,0', scale: { min: 1, max: 7, pass: 4 } },
  { label: '0 – 100', scale: { min: 0, max: 100, pass: 60 } },
  { label: '0 – 10', scale: { min: 0, max: 10, pass: 5 } },
]

const REFERRALS = [
  { id: 'tiktok', label: 'TikTok', emoji: '🎵' },
  { id: 'instagram', label: 'Instagram', emoji: '📸' },
  { id: 'friend', label: 'Un amigo / compañero', emoji: '🧑‍🤝‍🧑' },
  { id: 'teacher', label: 'Un profesor', emoji: '🧑‍🏫' },
  { id: 'google', label: 'Google / búsqueda', emoji: '🔎' },
  { id: 'other', label: 'Otro', emoji: '✨' },
]

export function Onboarding() {
  const [i, setI] = useState(0)
  const step: Step = STEPS[i]

  const theme = useAppStore((s) => s.theme)
  const setTheme = useAppStore((s) => s.setTheme)
  const accent = useAppStore((s) => s.accent)
  const setAccent = useAppStore((s) => s.setAccent)
  const defaultScale = useAppStore((s) => s.defaultScale)
  const setDefaultScale = useAppStore((s) => s.setDefaultScale)
  const setUserName = useAppStore((s) => s.setUserName)
  const setReferral = useAppStore((s) => s.setReferral)
  const setOnboarded = useAppStore((s) => s.setOnboarded)

  const [name, setName] = useState('')
  const [pickedReferral, setPickedReferral] = useState('')

  // Presentación en NEGRO por defecto hasta que el usuario elija su color.
  useEffect(() => {
    setAccent('black')
    // solo al montar
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const next = () => setI((v) => Math.min(v + 1, STEPS.length - 1))
  const back = () => setI((v) => Math.max(v - 1, 0))

  function finish() {
    setUserName(name.trim())
    setReferral(pickedReferral)
    setOnboarded(true)
  }

  // Índice dentro de los pasos "pregunta" (name..referral) para la barra.
  const qIndex = i - 1 // welcome = -1
  const totalQ = STEPS.length - 2 // sin welcome ni done

  const isPreset = (p: GradeScale) =>
    p.min === defaultScale.min &&
    p.max === defaultScale.max &&
    p.pass === defaultScale.pass

  return (
    <div className="mx-auto flex h-[100dvh] w-full max-w-md flex-col px-6 pb-8 pt-6">
      {/* Barra de progreso + atrás (oculto en welcome/done) */}
      {step !== 'welcome' && step !== 'done' && (
        <div className="mb-8 flex items-center gap-3">
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
                className="h-1.5 flex-1 rounded-full transition-colors"
                style={{
                  background:
                    k <= qIndex ? 'rgb(var(--ink))' : 'rgb(var(--ink) / 0.12)',
                }}
              />
            ))}
          </div>
        </div>
      )}

      <div className="relative flex flex-1 flex-col">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.32, ease: EASE.smooth }}
            className="flex flex-1 flex-col"
          >
            {step === 'welcome' && (
              <div className="flex flex-1 flex-col items-center justify-center text-center">
                <img
                  src={accentGhost(accent, theme === 'dark')}
                  alt="Brody"
                  className="mb-6 h-28 w-28 object-contain drop-shadow-lg"
                />
                <h1 className="text-4xl font-bold text-ink">Brody</h1>
                <p className="mt-2 max-w-xs text-base text-ink/55">
                  Configura lo esencial para empezar. Toma 20 segundos.
                </p>
              </div>
            )}

            {step === 'name' && (
              <div className="flex flex-1 flex-col justify-center">
                <h2 className="text-3xl font-bold text-ink">¿Cómo te digo?</h2>
                <p className="mb-6 mt-1 text-ink/55">
                  Para saludarte cuando entres.
                </p>
                <input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && next()}
                  placeholder="Tu nombre"
                  className="glass glass-highlight w-full rounded-3xl px-5 py-4 text-lg text-ink outline-none placeholder:text-ink/30"
                />
              </div>
            )}

            {step === 'theme' && (
              <div className="flex flex-1 flex-col justify-center">
                <h2 className="text-3xl font-bold text-ink">Elige tu tema</h2>
                <p className="mb-6 mt-1 text-ink/55">Claro u oscuro, como prefieras.</p>
                <div className="grid grid-cols-2 gap-3">
                  {(['light', 'dark'] as const).map((t) => (
                    <motion.button
                      key={t}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => setTheme(t)}
                      className={`glass glass-highlight flex flex-col items-center gap-2 rounded-3xl py-8 text-lg font-semibold ${
                        theme === t ? 'ring-2 ring-ink/60' : 'text-ink/60'
                      }`}
                    >
                      <span className="text-3xl">{t === 'light' ? '☀️' : '🌙'}</span>
                      {t === 'light' ? 'Claro' : 'Oscuro'}
                    </motion.button>
                  ))}
                </div>
              </div>
            )}

            {step === 'color' && (
              <div className="flex flex-1 flex-col justify-center">
                <h2 className="text-3xl font-bold text-ink">Dale tu color</h2>
                <p className="mb-6 mt-1 text-ink/55">El que más te guste.</p>
                <div className="grid grid-cols-4 gap-4">
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
                            ? '0 0 0 3px rgb(var(--ink) / 0.6), inset 0 -3px 6px rgba(0,0,0,0.14)'
                            : 'inset 0 -3px 6px rgba(0,0,0,0.14)',
                        }}
                      />
                    )
                  })}
                </div>
              </div>
            )}

            {step === 'scale' && (
              <div className="flex flex-1 flex-col justify-center">
                <h2 className="text-3xl font-bold text-ink">Tu escala de notas</h2>
                <p className="mb-6 mt-1 text-ink/55">
                  La puedes cambiar después en Ajustes.
                </p>
                <div className="flex flex-col gap-3">
                  {SCALE_PRESETS.map((p) => (
                    <motion.button
                      key={p.label}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setDefaultScale(p.scale)}
                      className={`glass glass-highlight rounded-3xl px-5 py-4 text-left text-lg font-semibold ${
                        isPreset(p.scale) ? 'ring-2 ring-ink/60' : 'text-ink/70'
                      }`}
                    >
                      {p.label}
                    </motion.button>
                  ))}
                </div>
              </div>
            )}

            {step === 'referral' && (
              <div className="flex flex-1 flex-col justify-center">
                <h2 className="text-3xl font-bold text-ink">¿Cómo conociste Brody?</h2>
                <p className="mb-6 mt-1 text-ink/55">Nos ayuda un montón saberlo.</p>
                <div className="grid grid-cols-2 gap-3">
                  {REFERRALS.map((r) => (
                    <motion.button
                      key={r.id}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => setPickedReferral(r.id)}
                      className={`glass glass-highlight flex items-center gap-2 rounded-2xl px-4 py-3.5 text-left text-sm font-medium ${
                        pickedReferral === r.id ? 'ring-2 ring-ink/60' : 'text-ink/70'
                      }`}
                    >
                      <span className="text-lg">{r.emoji}</span>
                      <span className="flex-1">{r.label}</span>
                    </motion.button>
                  ))}
                </div>
              </div>
            )}

            {step === 'done' && (
              <div className="flex flex-1 flex-col items-center justify-center text-center">
                <img
                  src={accentGhost(accent, theme === 'dark')}
                  alt="Brody"
                  className="mb-6 h-28 w-28 object-contain drop-shadow-lg"
                />
                <h1 className="text-4xl font-bold text-ink">
                  {name.trim() ? `¡Listo, ${name.trim()}!` : '¡Todo listo!'}
                </h1>
                <p className="mt-2 max-w-xs text-base text-ink/55">
                  Brody quedó a tu pinta. A calcular esas notas. 🚀
                </p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Botón principal por paso */}
      <div className="mt-6 flex flex-col gap-2">
        {step === 'welcome' && (
          <GlassButton variant="primary" full onClick={next}>
            Continuar →
          </GlassButton>
        )}
        {(step === 'name' ||
          step === 'theme' ||
          step === 'color' ||
          step === 'scale') && (
          <GlassButton variant="primary" full onClick={next}>
            Continuar →
          </GlassButton>
        )}
        {step === 'referral' && (
          <>
            <GlassButton variant="primary" full onClick={next}>
              Continuar →
            </GlassButton>
            <GlassButton variant="ghost" full onClick={next}>
              Omitir
            </GlassButton>
          </>
        )}
        {step === 'done' && (
          <GlassButton variant="primary" full onClick={finish}>
            Entrar a Brody
          </GlassButton>
        )}
      </div>
    </div>
  )
}
