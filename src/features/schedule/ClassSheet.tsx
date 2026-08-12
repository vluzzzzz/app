import { useEffect, useState } from 'react'
import { useAppStore } from '../../store/useAppStore'
import type { ClassBlock, ClassType } from '../../lib/types'
import { CLASS_TYPE_LABEL, DAY_SHORT, overlaps, toMinutes } from '../../lib/schedule'
import { accentRgb } from '../../lib/accents'
import { GlassSheet } from '../../components/ui/GlassSheet'
import { AlertIcon, TrashIcon } from '../../components/ui/Icons'

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
  const [day, setDay] = useState(defaultDay)
  const [start, setStart] = useState('08:15')
  const [end, setEnd] = useState('09:45')
  const [type, setType] = useState<ClassType>('catedra')
  const [room, setRoom] = useState('')
  const [professor, setProfessor] = useState('')

  useEffect(() => {
    if (!open) return
    setSubjectId(block?.subjectId ?? subjects[0]?.id ?? '')
    setDay(block?.day ?? defaultDay)
    setStart(block?.start ?? '08:15')
    setEnd(block?.end ?? '09:45')
    setType(block?.type ?? 'catedra')
    setRoom(block?.room ?? '')
    setProfessor(block?.professor ?? '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, block])

  const validTimes = toMinutes(end) > toMinutes(start)
  const canSave = subjectId !== '' && validTimes

  // Conflicto: otra clase del mismo día que se superpone (advertir, no impedir).
  const conflict = classes.find(
    (c) => c.id !== block?.id && c.day === day && overlaps(start, end, c.start, c.end),
  )
  const conflictName = conflict
    ? subjects.find((s) => s.id === conflict.subjectId)?.name ?? 'otra clase'
    : null

  const save = () => {
    if (!canSave) return
    const data = {
      subjectId,
      day,
      start,
      end,
      type,
      room: room.trim() || undefined,
      professor: professor.trim() || undefined,
    }
    if (block) updateClass(block.id, data)
    else addClass(data)
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
      <div className="space-y-4 pt-1">
        {/* Ramo */}
        <div>
          <label className="mb-1.5 block px-1 text-sm font-medium text-ink/55">Ramo</label>
          {subjects.length === 0 ? (
            <p className="px-1 text-sm text-ink/50">
              Primero crea un ramo en la Calculadora.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {subjects.map((s) => {
                const on = subjectId === s.id
                return (
                  <button
                    key={s.id}
                    onClick={() => setSubjectId(s.id)}
                    className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-semibold ${
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
        </div>

        {/* Día */}
        <div>
          <label className="mb-1.5 block px-1 text-sm font-medium text-ink/55">Día</label>
          <div className="flex gap-1.5">
            {DAY_SHORT.map((d, i) => (
              <button
                key={d}
                onClick={() => setDay(i)}
                className={`flex-1 rounded-xl py-2 text-[13px] font-semibold ${
                  day === i ? 'bg-ink text-surface' : 'bg-ink/5 text-ink/60'
                }`}
              >
                {d[0]}
              </button>
            ))}
          </div>
        </div>

        {/* Horas */}
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="mb-1.5 block px-1 text-sm font-medium text-ink/55">Inicio</label>
            <input
              type="time"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="w-full rounded-2xl border border-ink/15 bg-[rgb(var(--card))] px-3 py-2.5 text-[15px] font-semibold tabular-nums text-ink outline-none focus:border-ink/40"
            />
          </div>
          <div className="flex-1">
            <label className="mb-1.5 block px-1 text-sm font-medium text-ink/55">Fin</label>
            <input
              type="time"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="w-full rounded-2xl border border-ink/15 bg-[rgb(var(--card))] px-3 py-2.5 text-[15px] font-semibold tabular-nums text-ink outline-none focus:border-ink/40"
            />
          </div>
        </div>
        {!validTimes && (
          <p className="px-1 text-[13px] text-rose-500">La hora de término debe ser después del inicio.</p>
        )}

        {/* Tipo */}
        <div>
          <label className="mb-1.5 block px-1 text-sm font-medium text-ink/55">Tipo</label>
          <div className="flex flex-wrap gap-2">
            {TYPES.map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`rounded-xl px-3 py-1.5 text-sm font-semibold ${
                  type === t ? 'bg-ink text-surface' : 'bg-ink/5 text-ink/60'
                }`}
              >
                {CLASS_TYPE_LABEL[t]}
              </button>
            ))}
          </div>
        </div>

        {/* Sala + Profesor */}
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="mb-1.5 block px-1 text-sm font-medium text-ink/55">Sala</label>
            <input
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              placeholder="Ej: 204"
              className="w-full rounded-2xl border border-ink/15 bg-[rgb(var(--card))] px-3 py-2.5 text-[15px] text-ink placeholder:text-ink/35 outline-none focus:border-ink/40"
            />
          </div>
          <div className="flex-1">
            <label className="mb-1.5 block px-1 text-sm font-medium text-ink/55">
              Profesor <span className="text-ink/35">(opcional)</span>
            </label>
            <input
              value={professor}
              onChange={(e) => setProfessor(e.target.value)}
              className="w-full rounded-2xl border border-ink/15 bg-[rgb(var(--card))] px-3 py-2.5 text-[15px] text-ink outline-none focus:border-ink/40"
            />
          </div>
        </div>

        {/* Advertencia de conflicto (no impide guardar) */}
        {conflictName && validTimes && (
          <div className="flex items-center gap-2 rounded-2xl bg-amber-400/15 px-3 py-2.5 text-[13px] font-medium text-amber-700 dark:text-amber-200">
            <AlertIcon className="h-4 w-4 shrink-0" />
            Tienes {conflictName} en este horario.
          </div>
        )}

        {/* Acciones */}
        <div className="flex items-center gap-3 pt-1">
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
            {block ? 'Guardar' : 'Agregar clase'}
          </button>
        </div>
      </div>
    </GlassSheet>
  )
}
