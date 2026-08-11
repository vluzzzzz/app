import { useEffect, useState } from 'react'
import { useAppStore } from '../../store/useAppStore'
import type { CalendarEvent, EventType } from '../../lib/types'
import { accentRgb } from '../../lib/accents'
import { GlassSheet } from '../../components/ui/GlassSheet'
import { BellIcon, CalendarIcon, CheckIcon, FileUploadIcon, TrashIcon } from '../../components/ui/Icons'

type Props = {
  open: boolean
  onClose: () => void
  /** Evento a editar, o null para crear. */
  event: CalendarEvent | null
  /** Fecha preseleccionada "YYYY-MM-DD" al crear. */
  defaultDate: string
  /** Al elegir "Tarea" en el selector: delega al editor de tareas existente. */
  onPickTask: () => void
}

const TYPE_META: { type: EventType; label: string; icon: JSX.Element }[] = [
  { type: 'evaluacion', label: 'Evaluación', icon: <FileUploadIcon className="h-5 w-5" /> },
  { type: 'evento', label: 'Evento', icon: <CalendarIcon className="h-5 w-5" /> },
  { type: 'recordatorio', label: 'Recordatorio', icon: <BellIcon className="h-5 w-5" /> },
]

export const EVENT_TYPE_LABEL: Record<EventType, string> = {
  evaluacion: 'Evaluación',
  tarea: 'Tarea',
  evento: 'Evento',
  recordatorio: 'Recordatorio',
}

const REPEAT_LABEL: Record<NonNullable<CalendarEvent['repeat']>, string> = {
  none: 'No repetir',
  daily: 'Diariamente',
  weekly: 'Semanalmente',
  monthly: 'Mensualmente',
}

/** Hoja para crear/editar un evento del calendario (con selector de tipo al crear). */
export function EventSheet({ open, onClose, event, defaultDate, onPickTask }: Props) {
  const subjects = useAppStore((s) => s.subjects)
  const addEvent = useAppStore((s) => s.addEvent)
  const updateEvent = useAppStore((s) => s.updateEvent)
  const removeEvent = useAppStore((s) => s.removeEvent)

  // 'pick' = elegir qué agregar; 'form' = formulario.
  const [step, setStep] = useState<'pick' | 'form'>('pick')
  const [type, setType] = useState<EventType>('evento')
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(defaultDate)
  const [time, setTime] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [location, setLocation] = useState('')
  const [repeat, setRepeat] = useState<NonNullable<CalendarEvent['repeat']>>('none')
  const [repeatOpen, setRepeatOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    setStep(event ? 'form' : 'pick')
    setType(event?.type ?? 'evento')
    setTitle(event?.title ?? '')
    setDate(event?.date ?? defaultDate)
    setTime(event?.time ?? '')
    setSubjectId(event?.subjectId ?? '')
    setLocation(event?.location ?? '')
    setRepeat(event?.repeat ?? 'none')
    setRepeatOpen(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, event])

  const canSave = title.trim() !== '' && date !== ''

  const save = () => {
    if (!canSave) return
    const data = {
      title: title.trim(),
      date,
      time: time || undefined,
      type,
      subjectId: subjectId || undefined,
      location: location.trim() || undefined,
      repeat,
    }
    if (event) updateEvent(event.id, data)
    else addEvent(data)
    onClose()
  }

  const del = () => {
    if (event && confirm('¿Eliminar este evento?')) {
      removeEvent(event.id)
      onClose()
    }
  }

  return (
    <GlassSheet
      open={open}
      onClose={onClose}
      title={step === 'pick' ? '¿Qué quieres agregar?' : event ? 'Editar' : EVENT_TYPE_LABEL[type]}
    >
      {step === 'pick' ? (
        <div className="space-y-2 pt-1">
          {/* Tarea → editor de tareas existente */}
          <button
            onClick={() => {
              onClose()
              onPickTask()
            }}
            className="flex w-full items-center gap-3 rounded-2xl bg-ink/[0.04] p-4 text-left active:bg-ink/10"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink/8 text-ink/70">
              <CheckIcon className="h-5 w-5" />
            </span>
            <span className="text-[15px] font-semibold text-ink">Tarea</span>
          </button>
          {TYPE_META.map((t) => (
            <button
              key={t.type}
              onClick={() => {
                setType(t.type)
                setStep('form')
              }}
              className="flex w-full items-center gap-3 rounded-2xl bg-ink/[0.04] p-4 text-left active:bg-ink/10"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink/8 text-ink/70">
                {t.icon}
              </span>
              <span className="text-[15px] font-semibold text-ink">{t.label}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-4 pt-1">
          {/* Título */}
          <div>
            <label className="mb-1.5 block px-1 text-sm font-medium text-ink/55">
              {type === 'evaluacion' ? 'Nombre (ej: Control 2)' : 'Título'}
            </label>
            <input
              autoFocus={!event}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={type === 'evaluacion' ? 'Control 2' : 'Ej: Feria universitaria'}
              className="glass w-full rounded-2xl px-4 py-3.5 text-[15px] text-ink placeholder:text-ink/35 focus:outline-none"
            />
          </div>

          {/* Ramo (para evaluaciones; opcional en el resto) */}
          {subjects.length > 0 && (type === 'evaluacion' || subjectId) && (
            <div>
              <label className="mb-1.5 block px-1 text-sm font-medium text-ink/55">Ramo</label>
              <div className="flex flex-wrap gap-2">
                {subjects.map((s) => {
                  const on = subjectId === s.id
                  return (
                    <button
                      key={s.id}
                      onClick={() => setSubjectId(on ? '' : s.id)}
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
            </div>
          )}

          {/* Fecha + hora */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="mb-1.5 block px-1 text-sm font-medium text-ink/55">Fecha</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="glass w-full rounded-2xl px-4 py-3 text-[15px] text-ink focus:outline-none"
              />
            </div>
            <div className="flex-1">
              <label className="mb-1.5 block px-1 text-sm font-medium text-ink/55">
                Hora <span className="text-ink/35">(opcional)</span>
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="glass w-full rounded-2xl px-4 py-3 text-[15px] text-ink focus:outline-none"
              />
            </div>
          </div>

          {/* Ubicación */}
          <div>
            <label className="mb-1.5 block px-1 text-sm font-medium text-ink/55">
              {type === 'evaluacion' ? 'Sala' : 'Ubicación'} <span className="text-ink/35">(opcional)</span>
            </label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="glass w-full rounded-2xl px-4 py-3 text-[15px] text-ink focus:outline-none"
            />
          </div>

          {/* Repetir (colapsado) */}
          <div>
            <button
              onClick={() => setRepeatOpen((v) => !v)}
              className="flex w-full items-center justify-between rounded-2xl bg-ink/[0.04] px-4 py-3"
            >
              <span className="text-sm font-medium text-ink/55">Repetir</span>
              <span className="text-sm font-semibold text-ink">{REPEAT_LABEL[repeat]}</span>
            </button>
            {repeatOpen && (
              <div className="mt-2 flex flex-wrap gap-2">
                {(Object.keys(REPEAT_LABEL) as (keyof typeof REPEAT_LABEL)[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => {
                      setRepeat(r)
                      setRepeatOpen(false)
                    }}
                    className={`rounded-xl px-3 py-1.5 text-sm font-semibold ${
                      repeat === r ? 'bg-ink text-surface' : 'bg-ink/5 text-ink/60'
                    }`}
                  >
                    {REPEAT_LABEL[r]}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Acciones */}
          <div className="flex items-center gap-3 pt-1">
            {event && (
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
              {event ? 'Guardar' : 'Agregar'}
            </button>
          </div>
        </div>
      )}
    </GlassSheet>
  )
}
