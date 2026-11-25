import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import type { Subject } from '../../lib/types'
import { accentRgb } from '../../lib/accents'
import { formatGrade } from '../../lib/format'
import { SPRING } from '../../lib/motion'
import {
  analyzeSituation,
  currentGrade,
  gradedEvaluationCount,
  minGradeToPass,
  realEvaluationCount,
} from '../../lib/grades'
import { RAISED, RAISED_LIGHT } from '../../components/ui/relief'

export type Tone = 'green' | 'amber' | 'red' | 'gray'

/** Chip de estado (fondo suave + texto del tono). */
export const CHIP: Record<Tone, string> = {
  green: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  amber: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  red: 'bg-rose-500/10 text-rose-600 dark:text-rose-300',
  gray: 'bg-ink/[0.06] text-ink/50',
}

/** Texto grande del tono (ej: "Necesitas 5,0"). */
export const TONE_TEXT: Record<Tone, string> = {
  green: 'text-emerald-600 dark:text-emerald-300',
  amber: 'text-amber-500 dark:text-amber-300',
  red: 'text-rose-500 dark:text-rose-300',
  gray: 'text-ink/40',
}

/** Estado de un ramo en una frase corta, para su chip. */
export function subjectStatus(s: Subject): { label: string; tone: Tone } {
  if (realEvaluationCount(s) === 0) return { label: 'Sin evaluaciones', tone: 'gray' }
  if (gradedEvaluationCount(s) === 0) return { label: 'Sin notas', tone: 'gray' }
  const res = minGradeToPass(s)
  switch (analyzeSituation(s)) {
    case 'cerrado_aprobado':
      return { label: 'Aprobado', tone: 'green' }
    case 'asegurado':
      return { label: 'Ya aprobaste', tone: 'green' }
    case 'facil':
      return { label: 'Vas aprobando', tone: 'green' }
    case 'medio':
    case 'dificil':
      return res.status === 'ALCANZABLE'
        ? { label: `Necesitas ${formatGrade(res.needed)}`, tone: 'amber' }
        : { label: 'Revisa condiciones', tone: 'amber' }
    default:
      return { label: 'Remedial', tone: 'red' }
  }
}

/** Anillo de progreso del color del ramo (cuántas notas llevas puestas). */
export function ProgressRing({
  graded,
  total,
  rgb,
  size = 116,
  stroke = 10,
  children,
}: {
  graded: number
  total: number
  rgb: string
  size?: number
  stroke?: number
  children: ReactNode
}) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const p = total ? graded / total : 0
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-ink/[0.08]" />
        {graded > 0 && (
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={`rgb(${rgb})`}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            initial={{ strokeDashoffset: c }}
            animate={{ strokeDashoffset: c * (1 - p) }}
            transition={SPRING.soft}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  )
}

/**
 * Tarjeta de un ramo: barra de su color, nombre, promedio grande, anillo con
 * las notas puestas y chip de estado. La usan el Inicio y la Calculadora (PC).
 */
export function SubjectTile({
  subject,
  onClick,
  selected = false,
  index = 0,
}: {
  subject: Subject
  onClick: () => void
  selected?: boolean
  index?: number
}) {
  const rgb = accentRgb(subject.color ?? 'gray')
  const cur = currentGrade(subject)
  const total = realEvaluationCount(subject)
  const graded = gradedEvaluationCount(subject)
  const st = subjectStatus(subject)

  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: selected ? -3 : 0, transition: { ...SPRING.soft, delay: index * 0.035 } }}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      style={{
        ...RAISED_LIGHT,
        ...(selected ? { boxShadow: `0 0 0 2px rgb(${rgb}), 0 10px 24px -12px rgb(${rgb} / 0.55)` } : null),
      }}
      className="relative flex h-full min-h-[172px] w-full gap-3 overflow-hidden rounded-[22px] bg-[rgb(var(--card))] p-3.5 text-left ring-1 ring-ink/[0.05]"
    >
      <span
        aria-hidden
        className="w-[5px] shrink-0 self-stretch rounded-full"
        style={{ ...RAISED, backgroundColor: `rgb(${rgb})` }}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <p className="line-clamp-2 min-h-[2.3em] text-[15px] font-bold leading-[1.15] tracking-[-0.01em] text-ink">
          {subject.name}
        </p>
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-[30px] font-black leading-none tracking-[-0.03em] tabular-nums text-ink">
            {cur == null ? '—' : formatGrade(cur)}
          </span>
          <ProgressRing graded={graded} total={total} rgb={rgb} size={54} stroke={6}>
            <span className="text-[12.5px] font-bold tabular-nums text-ink">
              {graded}/{total}
            </span>
          </ProgressRing>
        </div>
        <span className={`mt-auto self-center rounded-full px-3 py-1 text-[12.5px] font-semibold ${CHIP[st.tone]}`}>
          {st.label}
        </span>
      </div>
    </motion.button>
  )
}
