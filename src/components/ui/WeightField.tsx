type Props = {
  value: number
  onChange: (value: number) => void
  suffix?: string
}

/** Campo numérico compacto para ponderaciones (%). */
export function WeightField({ value, onChange, suffix = '%' }: Props) {
  return (
    <div className="flex items-center gap-1 rounded-2xl border border-ink/15 bg-ink/5 px-3 py-2">
      <input
        inputMode="numeric"
        value={Number.isNaN(value) ? '' : String(value)}
        onChange={(e) => {
          const v = e.target.value.replace(/[^0-9]/g, '')
          onChange(v === '' ? 0 : Math.min(100, Number(v)))
        }}
        className="w-10 bg-transparent text-right text-base font-semibold tabular-nums text-ink outline-none"
      />
      <span className="text-sm text-ink/50">{suffix}</span>
    </div>
  )
}
