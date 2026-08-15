import { useEffect, useState } from 'react'
import { GlassSheet } from '../../components/ui/GlassSheet'
import { CheckIcon, ShareIcon } from '../../components/ui/Icons'
import {
  disableCalShare,
  enableCalShare,
  getCalShare,
  setCalShareConfig,
  shareCalUrl,
} from '../../lib/shareCal'
import { MONTH_NAMES } from '../../lib/schedule'
import { useAppStore } from '../../store/useAppStore'

type Props = { open: boolean; onClose: () => void }

/** Meses del año ACTUAL desde el mes en curso hasta diciembre (solo el nombre). */
function monthOptions(): { key: string; label: string }[] {
  const now = new Date()
  const y = now.getFullYear()
  return Array.from({ length: 12 - now.getMonth() }, (_, i) => {
    const m = now.getMonth() + i
    return { key: `${y}-${String(m + 1).padStart(2, '0')}`, label: MONTH_NAMES[m] }
  })
}

/** Hoja para compartir el calendario: todo, un mes o varios meses elegidos. */
export function ShareCalendarioSheet({ open, onClose }: Props) {
  const userName = useAppStore((s) => s.userName)
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [todo, setTodo] = useState(true)
  const [sel, setSel] = useState<string[]>([])
  const [clases, setClases] = useState(false)
  const [copied, setCopied] = useState(false)

  const opts = monthOptions()

  useEffect(() => {
    if (!open) return
    setLoading(true)
    setCopied(false)
    getCalShare().then((st) => {
      setToken(st?.token ?? null)
      setClases(st?.clases ?? false)
      if (st?.meses?.length) {
        setTodo(false)
        setSel(st.meses)
      } else {
        setTodo(true)
        setSel([])
      }
      setLoading(false)
    })
  }, [open])

  /** Guarda la selección en el servidor (solo si el link ya existe). */
  const persist = (nuevoTodo: boolean, nuevaSel: string[], nuevasClases: boolean) => {
    if (token) void setCalShareConfig(nuevoTodo ? null : nuevaSel, nuevasClases)
  }

  const pickTodo = () => {
    setTodo(true)
    setSel([])
    persist(true, [], clases)
  }

  const toggleMes = (key: string) => {
    const nueva = sel.includes(key) ? sel.filter((k) => k !== key) : [...sel, key].sort()
    const nuevoTodo = nueva.length === 0
    setTodo(nuevoTodo)
    setSel(nueva)
    persist(nuevoTodo, nueva, clases)
  }

  const toggleClases = () => {
    const v = !clases
    setClases(v)
    persist(todo, sel, v)
  }

  const turnOn = async () => {
    setWorking(true)
    const st = await enableCalShare(todo ? null : sel, clases)
    setToken(st?.token ?? null)
    setWorking(false)
  }

  const turnOff = async () => {
    setWorking(true)
    await disableCalShare()
    setToken(null)
    setWorking(false)
  }

  const url = token ? shareCalUrl(token) : ''

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      /* sin clipboard */
    }
  }

  const nativeShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Calendario de ${userName || 'Brody'}`,
          text: 'Mira mi calendario 📅',
          url,
        })
      } else {
        copy()
      }
    } catch {
      /* cancelado */
    }
  }

  const selector = (
    <>
      <p className="mb-2 px-0.5 text-[13px] font-semibold text-ink/50">Qué compartir</p>
      <button
        onClick={pickTodo}
        className={`mb-2 w-full rounded-2xl px-3 py-3 text-left text-[14px] font-semibold ${
          todo ? 'bg-ink text-surface' : 'bg-ink/5 text-ink active:bg-ink/10'
        }`}
      >
        Todo el calendario
      </button>
      <div className="mb-3 grid grid-cols-3 gap-1.5">
        {opts.map((o) => {
          const on = sel.includes(o.key)
          return (
            <button
              key={o.key}
              onClick={() => toggleMes(o.key)}
              className={`truncate rounded-xl px-1 py-2.5 text-[13px] font-semibold ${
                on ? 'bg-ink text-surface' : 'bg-ink/5 text-ink/70 active:bg-ink/10'
              }`}
            >
              {o.label}
            </button>
          )
        })}
      </div>

      {/* Interruptor: incluir (o no) las clases del horario en el link */}
      <button
        onClick={toggleClases}
        className="mb-4 flex w-full items-center justify-between rounded-2xl bg-ink/5 px-3 py-3 active:bg-ink/10"
      >
        <span className="text-[14px] font-semibold text-ink">Compartir también mis clases</span>
        <span
          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ${
            clases ? 'bg-ink' : 'bg-ink/15'
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all duration-200 ${
              clases ? 'left-[22px]' : 'left-0.5'
            }`}
          />
        </span>
      </button>
    </>
  )

  return (
    <GlassSheet open={open} onClose={onClose} title="Compartir calendario">
      <div className="pt-1">
        {loading ? (
          <p className="py-8 text-center text-sm text-ink/45">Cargando…</p>
        ) : !token ? (
          <>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-ink/5 text-ink">
              <ShareIcon className="h-7 w-7" />
            </div>
            <p className="mb-1 text-center text-[15px] font-semibold text-ink">
              Comparte tu calendario con un link
            </p>
            <p className="mx-auto mb-5 max-w-xs text-center text-sm text-ink/50">
              Lo abren en el navegador, sin cuenta. Ven tus eventos (nada de notas) y
              siempre actualizado. Elige el calendario completo o solo algunos meses.
            </p>
            {selector}
            <button
              onClick={turnOn}
              disabled={working || (!todo && sel.length === 0)}
              className="h-12 w-full rounded-2xl bg-ink text-[15px] font-semibold text-surface active:opacity-90 disabled:opacity-40"
            >
              {working ? 'Creando link…' : 'Crear link'}
            </button>
          </>
        ) : (
          <>
            {selector}
            <p className="mb-2 px-0.5 text-[13px] font-semibold text-ink/50">Tu link</p>
            <button
              onClick={copy}
              className="mb-3 w-full truncate rounded-2xl border border-ink/12 bg-[rgb(var(--card))] px-3 py-3 text-left text-[13px] font-medium tabular-nums text-ink/70 active:border-ink/30"
            >
              {url}
            </button>

            <div className="flex gap-2.5">
              <button
                onClick={copy}
                className="h-12 flex-1 rounded-2xl bg-ink/5 text-[15px] font-semibold text-ink active:bg-ink/10"
              >
                {copied ? (
                  <span className="inline-flex items-center gap-1.5">
                    <CheckIcon className="h-4 w-4" /> Copiado
                  </span>
                ) : (
                  'Copiar'
                )}
              </button>
              <button
                onClick={nativeShare}
                className="h-12 flex-1 rounded-2xl bg-ink text-[15px] font-semibold text-surface active:opacity-90"
              >
                Compartir
              </button>
            </div>

            <p className="mt-4 px-1 text-center text-[12px] text-ink/40">
              Cualquiera con el link ve {todo ? 'tu calendario completo' : 'solo los meses elegidos'}
              {' '}(solo lectura). Los cambios de selección se guardan solos.
            </p>

            <button
              onClick={turnOff}
              disabled={working}
              className="mt-3 w-full py-2 text-center text-[13px] font-semibold text-rose-500 active:opacity-70 disabled:opacity-40"
            >
              {working ? 'Desactivando…' : 'Desactivar link'}
            </button>
          </>
        )}
      </div>
    </GlassSheet>
  )
}
