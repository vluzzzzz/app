import { useEffect, useState } from 'react'
import { GlassSheet } from '../../components/ui/GlassSheet'
import { CheckIcon, ShareIcon } from '../../components/ui/Icons'
import { disableShare, enableShare, getShareToken, shareUrl } from '../../lib/share'
import { useAppStore } from '../../store/useAppStore'

type Props = { open: boolean; onClose: () => void }

/** Hoja para compartir el horario con un link público de solo lectura. */
export function ShareHorarioSheet({ open, onClose }: Props) {
  const userName = useAppStore((s) => s.userName)
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    setCopied(false)
    getShareToken()
      .then(setToken)
      .finally(() => setLoading(false))
  }, [open])

  const turnOn = async () => {
    setWorking(true)
    const t = await enableShare()
    setToken(t)
    setWorking(false)
  }

  const turnOff = async () => {
    setWorking(true)
    await disableShare()
    setToken(null)
    setWorking(false)
  }

  const url = token ? shareUrl(token) : ''

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
          title: `Horario de ${userName || 'Brody'}`,
          text: `Mira mi horario de clases 📚`,
          url,
        })
      } else {
        copy()
      }
    } catch {
      /* cancelado */
    }
  }

  return (
    <GlassSheet open={open} onClose={onClose} title="Compartir horario">
      <div className="pt-1">
        {loading ? (
          <p className="py-8 text-center text-sm text-ink/45">Cargando…</p>
        ) : !token ? (
          <>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-ink/5 text-ink">
              <ShareIcon className="h-7 w-7" />
            </div>
            <p className="mb-1 text-center text-[15px] font-semibold text-ink">
              Comparte tu horario con un link
            </p>
            <p className="mx-auto mb-6 max-w-xs text-center text-sm text-ink/50">
              Tu familia o amigos lo abren en el navegador, sin cuenta. Ven solo tus
              clases (nada de notas) y siempre actualizado.
            </p>
            <button
              onClick={turnOn}
              disabled={working}
              className="h-12 w-full rounded-2xl bg-ink text-[15px] font-semibold text-surface active:opacity-90 disabled:opacity-40"
            >
              {working ? 'Creando link…' : 'Crear link'}
            </button>
          </>
        ) : (
          <>
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
              Cualquiera con el link ve tu horario (solo lectura). Se actualiza solo
              cuando cambias tus clases.
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
