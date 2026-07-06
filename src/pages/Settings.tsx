import { motion } from 'framer-motion'
import type { Route } from '../App'
import { useAppStore } from '../store/useAppStore'
import { DEFAULT_SCALE, type GradeScale } from '../lib/types'
import { GlassButton } from '../components/ui/GlassButton'
import { ChevronLeft } from '../components/ui/Icons'
import { useInstallPrompt } from '../lib/useInstallPrompt'

const PRESETS: { label: string; scale: GradeScale }[] = [
  { label: 'Chile 1,0 – 7,0', scale: { min: 1, max: 7, pass: 4 } },
  { label: '0 – 100', scale: { min: 0, max: 100, pass: 60 } },
  { label: '0 – 10', scale: { min: 0, max: 10, pass: 5 } },
]

export function Settings({ navigate }: { navigate: (r: Route) => void }) {
  const defaultScale = useAppStore((s) => s.defaultScale)
  const setDefaultScale = useAppStore((s) => s.setDefaultScale)
  const theme = useAppStore((s) => s.theme)
  const setTheme = useAppStore((s) => s.setTheme)
  const { canInstall, installed, isIOS, promptInstall } = useInstallPrompt()

  function patch(field: keyof GradeScale, raw: string) {
    const n = Number(raw.replace(',', '.'))
    if (Number.isNaN(n)) return
    setDefaultScale({ ...defaultScale, [field]: n })
  }

  const isPreset = (p: GradeScale) =>
    p.min === defaultScale.min &&
    p.max === defaultScale.max &&
    p.pass === defaultScale.pass

  return (
    <div className="h-full overflow-y-auto px-5 pb-24 pt-6">
      <header className="mb-6 flex items-center gap-3">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate({ name: 'inicio' })}
          className="glass glass-highlight rounded-2xl p-2.5 text-ink/80"
        >
          <ChevronLeft className="h-5 w-5" />
        </motion.button>
        <h1 className="text-[28px] font-bold text-ink">Ajustes</h1>
      </header>

      {/* Instalar app (PWA) */}
      {!installed && (
        <section className="glass glass-highlight mb-4 rounded-4xl p-5">
          <h2 className="mb-1 text-lg font-semibold text-ink">Instalar app</h2>
          {canInstall ? (
            <>
              <p className="mb-4 text-sm text-ink/55">
                Instala Brody en tu pantalla de inicio para abrirlo como app.
              </p>
              <GlassButton variant="primary" full onClick={promptInstall}>
                📲 Instalar Brody
              </GlassButton>
            </>
          ) : isIOS ? (
            <p className="text-sm text-ink/60">
              En iPhone: toca <b>Compartir</b> (el cuadrito con la flecha ↑) y luego{' '}
              <b>"Agregar a inicio"</b>.
            </p>
          ) : (
            <p className="text-sm text-ink/55">
              Si tu navegador lo permite, verás la opción de instalar en su menú
              (⋮). En escritorio, el ícono de instalar aparece en la barra de
              direcciones.
            </p>
          )}
        </section>
      )}

      {/* Apariencia */}
      <section className="glass glass-highlight mb-4 rounded-4xl p-5">
        <h2 className="mb-3 text-lg font-semibold text-ink">Apariencia</h2>
        <div className="grid grid-cols-2 gap-2">
          {(['light', 'dark'] as const).map((t) => (
            <motion.button
              key={t}
              whileTap={{ scale: 0.96 }}
              onClick={() => setTheme(t)}
              className={`rounded-2xl border px-4 py-3 text-sm font-medium transition-colors ${
                theme === t
                  ? 'border-ink/60 bg-ink/15 text-ink'
                  : 'border-ink/15 bg-ink/5 text-ink/60'
              }`}
            >
              {t === 'light' ? '☀️ Claro' : '🌙 Oscuro'}
            </motion.button>
          ))}
        </div>
      </section>

      <section className="glass glass-highlight rounded-4xl p-5">
        <h2 className="mb-1 text-lg font-semibold text-ink">
          Escala de notas
        </h2>
        <p className="mb-4 text-sm text-ink/55">
          Se aplica a las asignaturas nuevas que crees.
        </p>

        {/* Presets */}
        <div className="mb-5 flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <motion.button
              key={p.label}
              whileTap={{ scale: 0.94 }}
              onClick={() => setDefaultScale(p.scale)}
              className={`rounded-2xl border px-3.5 py-2 text-sm font-medium transition-colors ${
                isPreset(p.scale)
                  ? 'border-ink/60 bg-ink/20 text-ink'
                  : 'border-ink/15 bg-ink/5 text-ink/70'
              }`}
            >
              {p.label}
            </motion.button>
          ))}
        </div>

        {/* Campos */}
        <div className="grid grid-cols-3 gap-3">
          <ScaleField
            label="Mínima"
            value={defaultScale.min}
            onChange={(v) => patch('min', v)}
          />
          <ScaleField
            label="Máxima"
            value={defaultScale.max}
            onChange={(v) => patch('max', v)}
          />
          <ScaleField
            label="Aprobar"
            value={defaultScale.pass}
            onChange={(v) => patch('pass', v)}
          />
        </div>

        <div className="mt-5">
          <GlassButton
            variant="ghost"
            onClick={() => setDefaultScale(DEFAULT_SCALE)}
          >
            Restaurar escala chilena
          </GlassButton>
        </div>
      </section>

      <p className="mt-8 text-center text-xs text-ink/30">
        Brody · v0.1 · Tus datos se guardan en este dispositivo.
      </p>
    </div>
  )
}

function ScaleField({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (v: string) => void
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs uppercase tracking-wide text-ink/45">
        {label}
      </span>
      <input
        inputMode="decimal"
        value={String(value).replace('.', ',')}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-ink/15 bg-ink/5 px-3 py-3 text-center text-lg font-bold tabular-nums text-ink outline-none focus:border-ink/40"
      />
    </label>
  )
}
