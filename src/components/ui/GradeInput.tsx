import { useEffect, useState } from 'react'
import type { GradeScale } from '../../lib/types'

type Props = {
  value: number | null
  scale: GradeScale
  onChange: (value: number | null) => void
}

/** Input de nota táctil: acepta coma o punto y valida contra la escala. */
export function GradeInput({ value, scale, onChange }: Props) {
  const [text, setText] = useState(value == null ? '' : String(value).replace('.', ','))

  // Sincroniza si el valor externo cambia (ej: reset)
  useEffect(() => {
    setText(value == null ? '' : String(value).replace('.', ','))
  }, [value])

  function commit(raw: string) {
    const normalized = raw.replace(',', '.').trim()
    if (normalized === '') {
      onChange(null)
      return
    }
    const n = Number(normalized)
    if (Number.isNaN(n)) return
    const clamped = Math.min(scale.max, Math.max(scale.min, n))
    onChange(clamped)
  }

  const filled = text.trim() !== ''

  return (
    <input
      inputMode="decimal"
      value={text}
      placeholder="—"
      onChange={(e) => {
        const v = e.target.value
        // Solo dígitos, coma o punto
        if (/^[0-9]*[.,]?[0-9]*$/.test(v)) {
          setText(v)
          commit(v)
        }
      }}
      onBlur={() => commit(text)}
      className={`w-16 rounded-2xl border text-center text-lg font-bold tabular-nums transition-colors
        py-2 outline-none focus:border-ink/50
        ${
          filled
            ? 'bg-ink/15 border-ink/25 text-ink'
            : 'bg-ink/5 border-ink/10 text-ink/40'
        }`}
    />
  )
}
