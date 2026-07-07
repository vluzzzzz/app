import { useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { Route } from '../../App'
import { useAppStore } from '../../store/useAppStore'
import { auth } from '../../lib/firebase'
import { saveProfile } from '../../lib/profile'
import { AVATARS, avatarSrc } from '../../lib/avatars'
import { BANNERS, bannerCss } from '../../lib/banners'
import { CAREERS } from '../../lib/careers'
import { flagUrl } from '../../lib/scales'
import { currentGrade } from '../../lib/grades'
import { formatGrade } from '../../lib/format'
import { GlassButton } from '../../components/ui/GlassButton'
import { ChevronLeft } from '../../components/ui/Icons'

// Países de LatAm (+ US/ES) para el dropdown con banderas.
const COUNTRIES: { code: string; name: string }[] = [
  { code: 'cl', name: 'Chile' },
  { code: 'ar', name: 'Argentina' },
  { code: 'pe', name: 'Perú' },
  { code: 'bo', name: 'Bolivia' },
  { code: 'py', name: 'Paraguay' },
  { code: 'uy', name: 'Uruguay' },
  { code: 'br', name: 'Brasil' },
  { code: 'co', name: 'Colombia' },
  { code: 've', name: 'Venezuela' },
  { code: 'ec', name: 'Ecuador' },
  { code: 'mx', name: 'México' },
  { code: 'gt', name: 'Guatemala' },
  { code: 'hn', name: 'Honduras' },
  { code: 'sv', name: 'El Salvador' },
  { code: 'ni', name: 'Nicaragua' },
  { code: 'cr', name: 'Costa Rica' },
  { code: 'pa', name: 'Panamá' },
  { code: 'do', name: 'Rep. Dominicana' },
  { code: 'cu', name: 'Cuba' },
  { code: 'pr', name: 'Puerto Rico' },
  { code: 'us', name: 'Estados Unidos' },
  { code: 'es', name: 'España' },
]

const AGES = ['Menos de 15', '15-17', '18-20', '21-24', '25-29', '30+']

const monthKey = () => new Date().toISOString().slice(0, 7)

export function ProfilePage({ navigate }: { navigate: (r: Route) => void }) {
  const store = useAppStore()
  const hydrateProfile = useAppStore((s) => s.hydrateProfile)

  // Estado local de edición (se commitea al Guardar).
  const [name, setName] = useState(store.userName)
  const [country, setCountry] = useState(store.country)
  const [ageRange, setAgeRange] = useState(store.ageRange)
  const [career, setCareer] = useState(store.career)
  const [avatar, setAvatar] = useState(store.avatar)
  const [banner, setBanner] = useState(store.banner || 'esmeralda')
  const [picker, setPicker] = useState<'none' | 'country' | 'age' | 'career'>('none')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const usedThisMonth = store.nameMonth === monthKey() ? store.nameChanges : 0
  const nameLocked = usedThisMonth >= 3
  const email = auth?.currentUser?.email ?? ''
  const handle = email ? '@' + email.split('@')[0] : ''

  const ramos = store.subjects.length
  const graded = store.subjects
    .map((s) => currentGrade(s))
    .filter((g): g is number => g != null)
  const promedio = graded.length
    ? formatGrade(graded.reduce((a, b) => a + b, 0) / graded.length)
    : '—'

  const countryName = COUNTRIES.find((c) => c.code === country)?.name

  async function save() {
    if (saving) return
    setSaving(true)
    setMsg(null)
    const res = await saveProfile({
      nombre: name.trim(),
      pais: country,
      edad: ageRange,
      carrera: career,
      avatar,
      banner,
      referral: store.referral,
    })
    if (res.profile) {
      hydrateProfile(res.profile)
      setName(res.profile.userName ?? name)
    } else {
      hydrateProfile({ userName: name.trim(), country, ageRange, career, avatar, banner })
    }
    setMsg(res.nameLimited ? 'Ya cambiaste tu nombre 3 veces este mes 😅' : '¡Guardado! ✅')
    setSaving(false)
  }

  return (
    <div className="h-full overflow-y-auto px-5 pb-28 pt-6">
      <header className="mb-5 flex items-center gap-3">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate({ name: 'inicio' })}
          className="glass glass-highlight rounded-2xl p-2.5 text-ink/80"
        >
          <ChevronLeft className="h-5 w-5" />
        </motion.button>
        <h1 className="text-[28px] font-bold text-ink">Perfil</h1>
      </header>

      {/* Tarjeta preview (fachera) */}
      <div className="glass glass-highlight overflow-hidden rounded-4xl">
        <div className="relative h-28" style={{ background: bannerCss(banner) }}>
          {/* grano sobre el banner */}
          <div className="absolute inset-0 opacity-[0.12]">
            <svg className="h-full w-full">
              <filter id="prof-grain">
                <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} stitchTiles="stitch" />
                <feColorMatrix type="saturate" values="0" />
              </filter>
              <rect width="100%" height="100%" filter="url(#prof-grain)" />
            </svg>
          </div>
        </div>
        <div className="px-5 pb-5">
          <img
            src={avatarSrc(avatar)}
            alt="avatar"
            className="-mt-10 h-20 w-20 rounded-3xl bg-surface object-contain shadow-lg ring-4 ring-[rgb(var(--surface))]"
          />
          <h2 className="mt-2 text-xl font-bold text-ink">{name || 'Tu nombre'}</h2>
          {handle && <p className="text-sm text-ink/50">{handle}</p>}
          <div className="mt-4 flex gap-6">
            <Stat n={String(ramos)} label="Ramos" />
            <Stat n={promedio} label="Promedio" />
            {countryName && <Stat n={countryName} label="País" flag={country} />}
          </div>
        </div>
      </div>

      {/* Editar */}
      <div className="mt-6 space-y-4">
        {/* Nombre */}
        <Field label={`Nombre · ${usedThisMonth}/3 cambios este mes`}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={nameLocked}
            placeholder="Tu nombre"
            className="w-full rounded-2xl border border-ink/15 bg-ink/5 px-4 py-3 text-ink outline-none placeholder:text-ink/30 focus:border-ink/40 disabled:opacity-50"
          />
          {nameLocked && (
            <p className="mt-1 text-xs text-ink/45">
              Podrás cambiarlo de nuevo el próximo mes.
            </p>
          )}
        </Field>

        {/* País */}
        <Field label="País">
          <PickerButton onClick={() => setPicker('country')}>
            {country ? (
              <span className="flex items-center gap-2">
                <img src={flagUrl(country)} className="h-4 rounded-[3px]" alt="" />
                {countryName}
              </span>
            ) : (
              <span className="text-ink/40">Elige tu país</span>
            )}
          </PickerButton>
        </Field>

        {/* Edad */}
        <Field label="Edad">
          <PickerButton onClick={() => setPicker('age')}>
            {ageRange || <span className="text-ink/40">Elige tu rango de edad</span>}
          </PickerButton>
        </Field>

        {/* Carrera */}
        <Field label="Carrera">
          <PickerButton onClick={() => setPicker('career')}>
            {career || <span className="text-ink/40">Elige tu carrera</span>}
          </PickerButton>
        </Field>

        {/* Avatar */}
        <Field label="Avatar">
          <div className="grid grid-cols-5 gap-3">
            {AVATARS.map((a) => (
              <motion.button
                key={a.id}
                whileTap={{ scale: 0.9 }}
                onClick={() => setAvatar(a.id)}
                className={`aspect-square rounded-2xl bg-ink/5 p-1.5 ${
                  avatar === a.id ? 'ring-2 ring-ink/60' : ''
                }`}
              >
                <img src={a.src} alt="" className="h-full w-full object-contain" />
              </motion.button>
            ))}
          </div>
        </Field>

        {/* Banner */}
        <Field label="Banner">
          <div className="grid grid-cols-5 gap-3">
            {BANNERS.map((b) => (
              <motion.button
                key={b.id}
                whileTap={{ scale: 0.9 }}
                onClick={() => setBanner(b.id)}
                style={{ background: b.css }}
                className={`aspect-[3/2] rounded-2xl ${
                  banner === b.id ? 'ring-2 ring-ink/70' : ''
                }`}
              />
            ))}
          </div>
        </Field>
      </div>

      {msg && <p className="mt-4 text-center text-sm font-medium text-ink/70">{msg}</p>}

      <div className="mt-5">
        <GlassButton variant="primary" full onClick={save} disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </GlassButton>
      </div>

      {/* Pickers */}
      <PickerOverlay
        open={picker === 'country'}
        title="Tu país"
        onClose={() => setPicker('none')}
        options={COUNTRIES.map((c) => ({ value: c.code, label: c.name, flag: c.code }))}
        onPick={(v) => {
          setCountry(v)
          setPicker('none')
        }}
      />
      <PickerOverlay
        open={picker === 'age'}
        title="Tu edad"
        onClose={() => setPicker('none')}
        options={AGES.map((a) => ({ value: a, label: a }))}
        onPick={(v) => {
          setAgeRange(v)
          setPicker('none')
        }}
      />
      <PickerOverlay
        open={picker === 'career'}
        title="Tu carrera"
        search
        onClose={() => setPicker('none')}
        options={CAREERS.map((c) => ({ value: c, label: c }))}
        onPick={(v) => {
          setCareer(v)
          setPicker('none')
        }}
      />
    </div>
  )
}

function Stat({ n, label, flag }: { n: string; label: string; flag?: string }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-lg font-bold text-ink">
        {flag && <img src={flagUrl(flag)} className="h-4 rounded-[3px]" alt="" />}
        {n}
      </div>
      <span className="text-xs text-ink/50">{label}</span>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink/45">
        {label}
      </span>
      {children}
    </label>
  )
}

function PickerButton({
  children,
  onClick,
}: {
  children: ReactNode
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center justify-between rounded-2xl border border-ink/15 bg-ink/5 px-4 py-3 text-left text-ink"
    >
      <span className="min-w-0 truncate">{children}</span>
      <span className="ml-2 text-ink/30">▾</span>
    </button>
  )
}

function PickerOverlay({
  open,
  title,
  options,
  onPick,
  onClose,
  search,
}: {
  open: boolean
  title: string
  options: { value: string; label: string; flag?: string }[]
  onPick: (value: string) => void
  onClose: () => void
  search?: boolean
}) {
  const [q, setQ] = useState('')
  const filtered = search
    ? options.filter((o) => o.label.toLowerCase().includes(q.toLowerCase()))
    : options

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[60] bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 34 }}
            className="glass glass-highlight fixed inset-x-0 bottom-0 z-[60] mx-auto flex max-h-[75dvh] w-full max-w-md flex-col rounded-t-4xl p-4"
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-bold text-ink">{title}</h3>
              <button onClick={onClose} className="text-sm font-medium text-ink/50">
                Cerrar
              </button>
            </div>
            {search && (
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar…"
                className="mb-3 w-full rounded-2xl border border-ink/15 bg-ink/5 px-4 py-2.5 text-ink outline-none placeholder:text-ink/30 focus:border-ink/40"
              />
            )}
            <div className="flex-1 space-y-1 overflow-y-auto">
              {filtered.map((o) => (
                <button
                  key={o.value}
                  onClick={() => onPick(o.value)}
                  className="flex w-full items-center gap-2.5 rounded-2xl px-3 py-3 text-left text-ink hover:bg-ink/5 active:bg-ink/10"
                >
                  {o.flag && (
                    <img src={flagUrl(o.flag)} className="h-4 rounded-[3px]" alt="" />
                  )}
                  <span>{o.label}</span>
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="py-6 text-center text-sm text-ink/40">Sin resultados</p>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
