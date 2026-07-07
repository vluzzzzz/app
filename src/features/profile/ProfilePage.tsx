import { useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { Route } from '../../App'
import { useAppStore } from '../../store/useAppStore'
import { auth } from '../../lib/firebase'
import { saveProfile } from '../../lib/profile'
import { AVATARS, avatarSrc } from '../../lib/avatars'
import { BANNERS, bannerCss, BANNER_SHEEN } from '../../lib/banners'
import { CAREERS, normalizeSearch } from '../../lib/careers'
import { flagUrl } from '../../lib/scales'
import { currentGrade } from '../../lib/grades'
import { formatGrade } from '../../lib/format'
import { GlassButton } from '../../components/ui/GlassButton'
import { ChevronLeft } from '../../components/ui/Icons'

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
const countryName = (code: string) => COUNTRIES.find((c) => c.code === code)?.name

const AGES = ['Menos de 15', '15-17', '18-20', '21-24', '25-29', '30+']
const monthKey = () => new Date().toISOString().slice(0, 7)

export function ProfilePage({ navigate }: { navigate: (r: Route) => void }) {
  const store = useAppStore()
  const hydrateProfile = useAppStore((s) => s.hydrateProfile)

  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(store.userName)
  const [country, setCountry] = useState(store.country)
  const [ageRange, setAgeRange] = useState(store.ageRange)
  const [career, setCareer] = useState(store.career)
  const [avatar, setAvatar] = useState(store.avatar || AVATARS[0].id)
  const [banner, setBanner] = useState(store.banner || BANNERS[0].id)
  const [showAvatars, setShowAvatars] = useState(false)
  const [showBanners, setShowBanners] = useState(false)
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

  function startEdit() {
    setName(store.userName)
    setCountry(store.country)
    setAgeRange(store.ageRange)
    setCareer(store.career)
    setAvatar(store.avatar || AVATARS[0].id)
    setBanner(store.banner || BANNERS[0].id)
    setMsg(null)
    setEditing(true)
  }

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
    setSaving(false)
    if (res.nameLimited) {
      setMsg('Ya cambiaste tu nombre 3 veces este mes 😅')
    } else {
      setEditing(false)
    }
  }

  return (
    <div className="h-full overflow-y-auto px-5 pb-28 pt-6">
      <header className="mb-5 flex items-center gap-3">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => (editing ? setEditing(false) : navigate({ name: 'inicio' }))}
          className="glass glass-highlight rounded-2xl p-2.5 text-ink/80"
        >
          <ChevronLeft className="h-5 w-5" />
        </motion.button>
        <h1 className="text-[28px] font-bold text-ink">Perfil</h1>
      </header>

      {/* Tarjeta (banner + avatar circular + nombre + stats) */}
      <div className="glass glass-highlight overflow-hidden rounded-4xl">
        <div className="relative h-28" style={{ background: bannerCss(banner) }}>
          <div className="absolute inset-0" style={{ background: BANNER_SHEEN }} />
          <div className="absolute inset-0 opacity-[0.10]">
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
          <div className="-mt-12 mb-2 h-24 w-24 rounded-full bg-white p-2.5 shadow-lg">
            <img src={avatarSrc(avatar)} alt="avatar" className="h-full w-full rounded-full object-contain" />
          </div>
          <h2 className="truncate text-xl font-bold text-ink">{name || 'Tu nombre'}</h2>
          {handle && <p className="truncate text-sm text-ink/50">{handle}</p>}
          <div className="mt-4 flex gap-6">
            <Stat n={String(ramos)} label="Ramos" />
            <Stat n={promedio} label="Promedio" />
            {country && <Stat n={countryName(country) ?? ''} label="País" flag={country} />}
          </div>
        </div>
      </div>

      {!editing ? (
        /* ---------- VISTA ---------- */
        <>
          <div className="mt-5 space-y-2">
            {ageRange && <InfoRow label="Edad" value={ageRange} />}
            {career && <InfoRow label="Carrera" value={career} />}
            {!ageRange && !career && (
              <p className="px-1 text-sm text-ink/45">
                Completa tu perfil para que te conozcamos mejor 👀
              </p>
            )}
          </div>
          <div className="mt-6">
            <GlassButton variant="primary" full onClick={startEdit}>
              Editar perfil
            </GlassButton>
          </div>
          {/* Debajo, en el futuro, irá el horario u otras cosas del usuario. */}
        </>
      ) : (
        /* ---------- EDITAR ---------- */
        <div className="mt-6 space-y-4">
          <Field label={`Nombre · ${usedThisMonth}/3 cambios este mes`}>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={nameLocked}
              placeholder="Tu nombre"
              className="w-full rounded-2xl border border-ink/15 bg-ink/5 px-4 py-3 text-ink outline-none placeholder:text-ink/30 focus:border-ink/40 disabled:opacity-50"
            />
            {nameLocked && (
              <p className="mt-1 text-xs text-ink/45">Podrás cambiarlo el próximo mes.</p>
            )}
          </Field>

          <Field label="País">
            <InlineSelect
              value={country}
              placeholder="Elige tu país"
              options={COUNTRIES.map((c) => ({ value: c.code, label: c.name, flag: c.code }))}
              onPick={setCountry}
            />
          </Field>

          <Field label="Edad">
            <InlineSelect
              value={ageRange}
              placeholder="Elige tu rango de edad"
              options={AGES.map((a) => ({ value: a, label: a }))}
              onPick={setAgeRange}
            />
          </Field>

          <Field label="Carrera">
            <InlineSelect
              value={career}
              placeholder="Elige tu carrera"
              options={CAREERS.map((c) => ({ value: c, label: c }))}
              onPick={setCareer}
              search
            />
          </Field>

          {/* Foto de perfil (detrás de botón) */}
          <div>
            <ToggleRow open={showAvatars} onClick={() => setShowAvatars((v) => !v)}>
              Foto de perfil
            </ToggleRow>
            <AnimatePresence initial={false}>
              {showAvatars && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-5 gap-3 pt-3">
                    {AVATARS.map((a) => (
                      <motion.button
                        key={a.id}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setAvatar(a.id)}
                        className={`aspect-square rounded-full bg-white p-1.5 shadow ${
                          avatar === a.id ? 'ring-2 ring-ink/70' : ''
                        }`}
                      >
                        <img src={a.src} alt="" className="h-full w-full rounded-full object-contain" />
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Banner (detrás de botón) */}
          <div>
            <ToggleRow open={showBanners} onClick={() => setShowBanners((v) => !v)}>
              Banner
            </ToggleRow>
            <AnimatePresence initial={false}>
              {showBanners && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-4 gap-3 pt-3">
                    {BANNERS.map((b) => (
                      <motion.button
                        key={b.id}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setBanner(b.id)}
                        style={{ background: b.css }}
                        className={`aspect-[3/2] rounded-xl ${
                          banner === b.id ? 'ring-2 ring-ink/70' : ''
                        }`}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {msg && <p className="text-center text-sm font-medium text-ink/70">{msg}</p>}

          <div className="flex gap-2 pt-1">
            <GlassButton variant="glass" onClick={() => setEditing(false)}>
              Cancelar
            </GlassButton>
            <GlassButton variant="primary" full onClick={save} disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar'}
            </GlassButton>
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ n, label, flag }: { n: string; label: string; flag?: string }) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5 truncate text-lg font-bold text-ink">
        {flag && <img src={flagUrl(flag)} className="h-4 rounded-[3px]" alt="" />}
        <span className="truncate">{n}</span>
      </div>
      <span className="text-xs text-ink/50">{label}</span>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass glass-highlight flex items-center justify-between rounded-2xl px-4 py-3">
      <span className="text-sm text-ink/50">{label}</span>
      <span className="font-medium text-ink">{value}</span>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink/45">
        {label}
      </span>
      {children}
    </label>
  )
}

function ToggleRow({
  children,
  open,
  onClick,
}: {
  children: ReactNode
  open: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center justify-between rounded-2xl border border-ink/15 bg-ink/5 px-4 py-3 text-left font-medium text-ink"
    >
      {children}
      <span className={`text-ink/40 transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
    </button>
  )
}

/** Dropdown inline (panel blanco limpio que se despliega bajo el campo). */
function InlineSelect({
  value,
  placeholder,
  options,
  onPick,
  search,
}: {
  value: string
  placeholder: string
  options: { value: string; label: string; flag?: string }[]
  onPick: (v: string) => void
  search?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const current = options.find((o) => o.value === value)
  const filtered =
    search && q
      ? options.filter((o) => normalizeSearch(o.label).includes(normalizeSearch(q)))
      : options

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-2xl border border-ink/15 bg-ink/5 px-4 py-3 text-left text-ink"
      >
        <span className="flex min-w-0 items-center gap-2">
          {current?.flag && <img src={flagUrl(current.flag)} className="h-4 rounded-[3px]" alt="" />}
          <span className="truncate">
            {current ? current.label : <span className="text-ink/40">{placeholder}</span>}
          </span>
        </span>
        <span className={`ml-2 text-ink/40 transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 right-0 top-full z-20 mt-2 max-h-64 overflow-y-auto rounded-2xl border border-ink/10 bg-[rgb(var(--surface))] p-1.5 shadow-2xl">
            {search && (
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar… (ej: ing civil)"
                className="mb-1 w-full rounded-xl border border-ink/10 bg-ink/5 px-3 py-2 text-sm text-ink outline-none placeholder:text-ink/30"
              />
            )}
            {filtered.map((o) => (
              <button
                key={o.value}
                onClick={() => {
                  onPick(o.value)
                  setOpen(false)
                  setQ('')
                }}
                className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-[15px] text-ink hover:bg-ink/5 ${
                  o.value === value ? 'bg-ink/10' : ''
                }`}
              >
                {o.flag && <img src={flagUrl(o.flag)} className="h-4 rounded-[3px]" alt="" />}
                <span className="truncate">{o.label}</span>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="px-3 py-4 text-center text-sm text-ink/40">Sin resultados</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
