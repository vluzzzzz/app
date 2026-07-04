import type { PassStatus } from '../../lib/grades'

const STYLES: Record<PassStatus, { label: string; className: string }> = {
  ASEGURADO: {
    label: 'Aprobado',
    className:
      'bg-emerald-500/15 text-emerald-700 border-emerald-600/30 dark:bg-emerald-400/20 dark:text-emerald-200 dark:border-emerald-300/30',
  },
  ALCANZABLE: {
    label: 'En juego',
    className:
      'bg-amber-500/15 text-amber-700 border-amber-600/30 dark:bg-amber-400/20 dark:text-amber-100 dark:border-amber-300/30',
  },
  IMPOSIBLE: {
    label: 'En riesgo',
    className:
      'bg-rose-500/15 text-rose-700 border-rose-600/30 dark:bg-rose-500/20 dark:text-rose-200 dark:border-rose-300/30',
  },
  SIN_DATOS: {
    label: 'Sin notas',
    className: 'bg-ink/10 text-ink/60 border-ink/15',
  },
}

export function StatusPill({ status }: { status: PassStatus }) {
  const s = STYLES[status]
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${s.className}`}
    >
      {s.label}
    </span>
  )
}
