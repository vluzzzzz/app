import { useEffect, useMemo, useState } from 'react'
import { useAppStore } from '../../store/useAppStore'
import type { ClassBlock, ClassType } from '../../lib/types'
import { CLASS_TYPE_LABEL, DAY_SHORT, overlaps, toMinutes } from '../../lib/schedule'

/** minutos → "HH:mm" (tope 23:59). */
function toHHMM(mins: number): string {
  const m = Math.min(mins, 23 * 60 + 59)
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}
/** "13:05" → "1:05" (para mostrar chips, sin AM/PM). */
function fmt12(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number)
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${String(m).padStart(2, '0')}`
}
/** "13:05" → "1:05 PM" (para los campos de hora). */
function fmt12Full(hhmm: string): string {
  const [h] = hhmm.split(':').map(Number)
  return `${fmt12(hhmm)} ${h < 12 ? 'AM' : 'PM'}`
}
import { accentRgb } from '../../lib/accents'
import { GlassSheet } from '../../components/ui/GlassSheet'
import { TimeWheelSheet } from '../../components/ui/TimeWheelSheet'
import {
  AlertIcon,
  ChevronDown,
  ClockIcon,
  DoorIcon,
  TrashIcon,
  UserIcon,
} from '../../components/ui/Icons'

type Props = {
  open: boolean
  onClose: () => void
  /** Clase a editar, o null para crear. */
  block: ClassBlock | null
  /** Día preseleccionado al crear. */
  defaultDay: number
}

const TYPES: ClassType[] = ['catedra', 'laboratorio', 'ayudantia', 'taller', 'otro']

/** Hoja para crear/editar una clase del horario. */
export function ClassSheet({ open, onClose, block, defaultDay }: Props) {
  const subjects = useAppStore((s) => s.subjects)
  const classes = useAppStore((s) => s.classes)
  const addClass = useAppStore((s) => s.addClass)
  const updateClass = useAppStore((s) => s.updateClass)
  const removeClass = useAppStore((s) => s.removeClass)

  const [subjectId, setSubjectId] = useState('')
  // Al crear se pueden elegir VARIOS días (misma clase repetida); al editar, uno.
  const [days, setDays] = useState<number[]>([defaultDay])
  const [start, setStart] = useState('08:15')
  const [end, setEnd] = useState('09:45')
  const [type, setType] = useState<ClassType>('catedra')
  const [room, setRoom] = useState('')
  const [professor, setProfessor] = useState('')

  /** Config recordada del curso: si ya tiene clases, hereda tipo/sala/profe. */
  const prefillFrom = (sid: string) => {
    const prev = [...classes].reverse().find((c) => c.subjectId === sid)
    if (!prev) return
    setType(prev.type)
    setRoom(prev.room ?? '')
    setProfessor(prev.professor ?? '')
  }

  useEffect(() => {
    if (!open) return
    const initialSid = block?.subjectId ?? subjects[0]?.id ?? ''
    setSubjectId(initialSid)
    setDays(block ? [block.day] : [defaultDay])
    setStart(block?.start ?? '08:15')
    setEnd(block?.end ?? '09:45')
    setType(block?.type ?? 'catedra')
    setRoom(block?.room ?? '')
    setProfessor(block?.professor ?? '')
    if (!block && initialSid) prefillFrom(initialSid)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, block])

  /** Bloques de hora que el usuario ya usa, ordenados por frecuencia (máx 4). */
  const slotSuggestions = useMemo(() => {
    const count = new Map<string, number>()
    for (const c of classes) {
      const k = `${c.start}|${c.end}`
      count.set(k, (count.get(k) ?? 0) + 1)
    }
    return [...count.entries()]
      .sort(
        (a, b) =>
          b[1] - a[1] || toMinutes(a[0].split('|')[0]) - toMinutes(b[0].split('|')[0]),
      )
      .slice(0, 4)
      .map(([k]) => {
        const [s, e] = k.split('|')
        return { s, e }
      })
  }, [classes])

  /** Cambiar el inicio mantiene la duración (el fin se corre solo). */
  const onStartChange = (v: string) => {
    if (!v) return
    const dur = toMinutes(end) - toMinutes(start)
    setStart(v)
    if (dur > 0) setEnd(toHHMM(toMinutes(v) + dur))
  }

  /** Rueda de hora abierta: para inicio, para fin, o cerrada. */
  const [pickerFor, setPickerFor] = useState<'start' | 'end' | null>(null)

  const toggleDay = (i: number) => {
    if (block) {
      setDays([i]) // editando: un solo día
      return
    }
    setDays((prev) =>
      prev.includes(i) ? (prev.length > 1 ? prev.filter((d) => d !== i) : prev) : [...prev, i].sort(),
    )
  }

  const validTimes = toMinutes(end) > toMinutes(start)
  const canSave = subjectId !== '' && validTimes && days.length > 0

  // Conflicto: otra clase en alguno de los días elegidos que se superpone (advertir, no impedir).
  const conflict = classes.find(
    (c) => c.id !== block?.id && days.includes(c.day) && overlaps(start, end, c.start, c.end),
  )
  const conflictName = conflict
    ? subjects.find((s) => s.id === conflict.subjectId)?.name ?? 'otra clase'
    : null

  const save = () => {
    if (!canSave) return
    const data = {
      subjectId,
      start,
      end,
      type,
      room: room.trim() || undefined,
      professor: professor.trim() || undefined,
    }
    if (block) updateClass(block.id, { ...data, day: days[0] })
    else days.forEach((d) => addClass({ ...data, day: d }))
    onClose()
  }

  const del = () => {
    if (block && confirm('¿Eliminar esta clase?')) {
      removeClass(block.id)
      onClose()
    }
  }

  return (
    <GlassSheet open={open} onClose={onClose} title={block ? 'Editar clase' : 'Nueva clase'}>
      <div className="pt-1">
        {/* Ramo */}
        <label className="mb-2 block px-0.5 text-[13px] font-semibold text-ink/50">Ramo</label>
        {subjects.length === 0 ? (
          <p className="px-1 text-sm text-ink/50">
            Primero crea un ramo en la Calculadora.
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {subjects.map((s) => {
              const on = subjectId === s.id
              return (
                <button
                  key={s.id}
                  onClick={() => {
                    setSubjectId(s.id)
                    // Al crear, hereda la config ya usada para este curso.
                    if (!block) prefillFrom(s.id)
                  }}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[13px] font-semibold ${
                    on ? 'bg-ink text-surface' : 'bg-ink/5 text-ink/60'
                  }`}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: `rgb(${accentRgb(s.color ?? 'gray')})` }}
                  />
                  {s.name}
                </button>
              )
            })}
          </div>
        )}

        <div className="my-4 h-px bg-ink/[0.07]" />

        {/* Día(s) */}
        <label className="mb-2 block px-0.5 text-[13px] font-semibold text-ink/50">
          {block ? 'Día' : 'Días'}
          {!block && <span className="font-medium text-ink/30"> · toca varios si se repite</span>}
        </label>
        <div className="flex gap-1.5">
          {DAY_SHORT.map((d, i) => (
            <button
              key={d}
              onClick={() => toggleDay(i)}
              className={`flex-1 rounded-xl py-2 text-[13px] font-semibold ${
                days.includes(i) ? 'bg-ink text-surface' : 'bg-ink/5 text-ink/60'
              }`}
            >
              {d[0]}
            </button>
          ))}
        </div>

        {/* Tus horarios de siempre: un toque y quedan inicio + fin */}
        {slotSuggestions.length > 0 && (
          <>
            <div className="my-4 h-px bg-ink/[0.07]" />
            <label className="mb-2 block px-0.5 text-[13px] font-semibold text-ink/50">
              Tus horarios
            </label>
            <div className="flex flex-wrap gap-1.5">
              {slotSuggestions.map(({ s, e }) => {
                const on = start === s && end === e
                return (
                  <button
                    key={`${s}${e}`}
                    onClick={() => {
                      setStart(s)
                      setEnd(e)
                    }}
                    className={`rounded-xl px-3 py-1.5 text-[13px] font-semibold tabular-nums ${
                      on ? 'bg-ink text-surface' : 'bg-ink/5 text-ink/60'
                    }`}
                  >
                    {fmt12(s)} — {fmt12(e)}
                  </button>
                )
              })}
            </div>
          </>
        )}

        <div className="my-4 h-px bg-ink/[0.07]" />

        {/* Horario de la clase: [🕐 inicio ⌄] — [🕐 fin ⌄] */}
        <label className="mb-2 block px-0.5 text-[13px] font-semibold text-ink/50">
          Horario de la clase
        </label>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPickerFor('start')}
            className="flex flex-1 items-center gap-2 rounded-2xl border border-ink/12 bg-[rgb(var(--card))] px-3 py-2.5 active:border-ink/30"
          >
            <ClockIcon className="h-4 w-4 shrink-0 text-ink/40" />
            <span className="flex-1 text-left text-[15px] font-semibold tabular-nums text-ink">
              {fmt12Full(start)}
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 text-ink/35" />
          </button>
          <span className="text-ink/30">—</span>
          <button
            onClick={() => setPickerFor('end')}
            className="flex flex-1 items-center gap-2 rounded-2xl border border-ink/12 bg-[rgb(var(--card))] px-3 py-2.5 active:border-ink/30"
          >
            <ClockIcon className="h-4 w-4 shrink-0 text-ink/40" />
            <span className="flex-1 text-left text-[15px] font-semibold tabular-nums text-ink">
              {fmt12Full(end)}
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 text-ink/35" />
          </button>
        </div>
        {!validTimes && (
          <p className="mt-2 px-1 text-[13px] text-rose-500">
            La hora de término debe ser después del inicio.
          </p>
        )}

        <div className="my-4 h-px bg-ink/[0.07]" />

        {/* Tipo de clase */}
        <label className="mb-2 block px-0.5 text-[13px] font-semibold text-ink/50">Tipo de clase</label>
        <div className="flex flex-wrap gap-1.5">
          {TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`rounded-xl px-3 py-1.5 text-[13px] font-semibold ${
                type === t ? 'bg-ink text-surface' : 'bg-ink/5 text-ink/60'
              }`}
            >
              {CLASS_TYPE_LABEL[t]}
            </button>
          ))}
        </div>

        <div className="my-4 h-px bg-ink/[0.07]" />

        {/* Sala + Profesor (con iconito adentro) */}
        <div className="flex gap-2.5">
          <div className="flex-1">
            <label className="mb-2 block px-0.5 text-[13px] font-semibold text-ink/50">Sala</label>
            <div className="relative">
              <DoorIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35" />
              <input
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                placeholder="Ej: C 304"
                className="w-full rounded-2xl border border-ink/12 bg-[rgb(var(--card))] py-2.5 pl-9 pr-3 text-[15px] text-ink placeholder:text-ink/30 outline-none focus:border-ink/35"
              />
            </div>
          </div>
          <div className="flex-1">
            <label className="mb-2 block px-0.5 text-[13px] font-semibold text-ink/50">
              Profesor <span className="font-medium text-ink/30">· opcional</span>
            </label>
            <div className="relative">
              <UserIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35" />
              <input
                value={professor}
                onChange={(e) => setProfessor(e.target.value)}
                placeholder="Agregar profesor"
                className="w-full rounded-2xl border border-ink/12 bg-[rgb(var(--card))] py-2.5 pl-9 pr-3 text-[15px] text-ink placeholder:text-ink/30 outline-none focus:border-ink/35"
              />
            </div>
          </div>
        </div>

        {/* Advertencia de conflicto (no impide guardar) */}
        {conflict && conflictName && validTimes && (
          <div className="mt-4 flex items-center gap-2 rounded-2xl bg-amber-400/15 px-3 py-2.5 text-[13px] font-medium text-amber-700 dark:text-amber-200">
            <AlertIcon className="h-4 w-4 shrink-0" />
            Tienes {conflictName} el {DAY_SHORT[conflict.day]} en este horario.
          </div>
        )}

        {/* Acciones */}
        <div className="mt-5 flex items-center gap-3">
          {block && (
            <button
              onClick={del}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500 active:bg-rose-500/20"
              aria-label="Eliminar"
            >
              <TrashIcon className="h-5 w-5" />
            </button>
          )}
          <button
            onClick={save}
            disabled={!canSave}
            className="h-12 flex-1 rounded-2xl bg-ink text-[15px] font-semibold text-surface transition active:opacity-90 disabled:opacity-30"
          >
            {block ? 'Guardar' : days.length > 1 ? `Agregar ${days.length} clases` : 'Agregar clase'}
          </button>
        </div>
      </div>

      {/* Rueda de hora (inicio / fin) */}
      <TimeWheelSheet
        open={pickerFor !== null}
        title={pickerFor === 'end' ? 'Hora de término' : 'Hora de inicio'}
        value={pickerFor === 'end' ? end : start}
        onClose={() => setPickerFor(null)}
        onSave={(v) => (pickerFor === 'end' ? setEnd(v) : onStartChange(v))}
      />
    </GlassSheet>
  )
}
