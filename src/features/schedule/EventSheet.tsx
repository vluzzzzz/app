import { useEffect, useState } from 'react'
import { useAppStore } from '../../store/useAppStore'
import type { CalendarEvent, EventType } from '../../lib/types'
import { accentRgb } from '../../lib/accents'
import { DAY_NAMES, MONTH_NAMES, fromDateKey, weekday } from '../../lib/schedule'
import { useIsDesktop } from '../../lib/useIsDesktop'
import { GlassSheet } from '../../components/ui/GlassSheet'
import { WheelModal, SheetCard, SheetRow } from '../../components/ui/WheelModal'
import { TimeWheelSheet } from '../../components/ui/TimeWheelSheet'
import { RAISED } from '../../components/ui/relief'
import {
  BellIcon,
  CalendarIcon,
  CheckIcon,
  ClockIcon,
  FileUploadIcon,
  PinIcon,
  ReloadIcon,
  TrashIcon,
} from '../../components/ui/Icons'

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

/** Color de respaldo por tipo cuando el evento no tiene ramo. */
const EVENT_TYPE_RGB: Record<EventType, string> = {
  evaluacion: '239 68 68',
  tarea: '249 115 22',
  evento: '59 130 246',
  recordatorio: '139 92 246',
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
  const isDesktop = useIsDesktop()
  const subjects = useAppStore((s) => s.subjects)
  const addEvent = useAppStore((s) => s.addEvent)
  const updateEvent = useAppStore((s) => s.updateEvent)
  const removeEvent = useAppStore((s) => s.removeEvent)

  // 'pick' = elegir qué agregar; 'form' = formulario. (Solo celu usa 'pick'.)
  const [step, setStep] = useState<'pick' | 'form'>('pick')
  const [type, setType] = useState<EventType>('evento')
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(defaultDate)
  const [time, setTime] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [location, setLocation] = useState('')
  const [repeat, setRepeat] = useState<NonNullable<CalendarEvent['repeat']>>('none')
  const [repeatOpen, setRepeatOpen] = useState(false)
  const [timeOpen, setTimeOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    setStep(event || isDesktop ? 'form' : 'pick')
    setType(event?.type ?? 'evento')
    setTitle(event?.title ?? '')
    setDate(event?.date ?? defaultDate)
    setTime(event?.time ?? '')
    setSubjectId(event?.subjectId ?? '')
    setLocation(event?.location ?? '')
    setRepeat(event?.repeat ?? 'none')
    setRepeatOpen(false)
    setTimeOpen(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, event])

  const canSave = title.trim() !== '' && date !== ''
  const subjectRgb = (id: string) => accentRgb(subjects.find((s) => s.id === id)?.color ?? 'gray')
  const rgb = subjectId ? subjectRgb(subjectId) : EVENT_TYPE_RGB[type]

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

  // ====== Versión PC: modal de dos columnas con rueda de ramos ======
  if (isDesktop) {
    const d = fromDateKey(date)
    const dateLabel = `${DAY_NAMES[weekday(d)].toLowerCase()} ${d.getDate()} de ${MONTH_NAMES[d.getMonth()].toLowerCase()}`
    const wheelItems = [
      { id: '', name: 'Sin ramo', rgb: '148 163 184' },
      ...subjects.map((s) => ({ id: s.id, name: s.name, rgb: subjectRgb(s.id) })),
    ]
    const tabs: { type: EventType; label: string; icon: JSX.Element }[] = [
      { type: 'evaluacion', label: 'Evaluación', icon: <FileUploadIcon className="h-[18px] w-[18px]" /> },
      { type: 'tarea', label: 'Tarea', icon: <CheckIcon className="h-[18px] w-[18px]" /> },
      { type: 'evento', label: 'Evento', icon: <CalendarIcon className="h-[18px] w-[18px]" /> },
      { type: 'recordatorio', label: 'Recordatorio', icon: <BellIcon className="h-[18px] w-[18px]" /> },
    ]

    return (
      <>
        <WheelModal
          open={open}
          onClose={onClose}
          items={wheelItems}
          value={subjectId}
          onChange={setSubjectId}
          onDelete={event ? del : undefined}
          onSave={save}
          canSave={canSave}
          saveLabel={event ? 'Guardar' : 'Agregar'}
        >
          <div className="space-y-5">
            {/* Vista previa en vivo de la píldora del evento. */}
            <div className="flex">
              <span
                className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[13px] font-semibold text-white"
                style={{ ...RAISED, backgroundColor: `rgb(${rgb})` }}
              >
                <span className="h-2.5 w-2.5 rounded-full border-[1.5px] border-white/75" />
                {title.trim() || 'Nuevo evento'}
                {time && <span className="font-medium text-white/80">· {time}</span>}
              </span>
            </div>

            {/* Nombre, como título. */}
            <input
              autoFocus={!event}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={type === 'evaluacion' ? 'Control 2' : 'Nombre del evento'}
              className="w-full rounded-2xl bg-[rgb(var(--card))] px-4 py-3.5 text-[22px] font-bold text-ink placeholder:text-ink/30 ring-1 ring-ink/[0.05] focus:outline-none focus:ring-ink/20"
            />

            {/* Tipo (segmentado). Tarea delega al editor de tareas. */}
            <div className="flex gap-1.5 rounded-2xl bg-ink/[0.04] p-1">
              {tabs.map((t) => {
                const on = type === t.type
                return (
                  <button
                    key={t.type}
                    onClick={() => {
                      if (t.type === 'tarea') {
                        onClose()
                        onPickTask()
                      } else setType(t.type)
                    }}
                    style={on ? RAISED : undefined}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-[13.5px] font-semibold transition-colors ${
                      on ? 'bg-ink text-surface' : 'text-ink/55 hover:text-ink'
                    }`}
                  >
                    {t.icon}
                    {t.label}
                  </button>
                )
              })}
            </div>

            {/* Cuándo */}
            <SheetCard title="Cuándo">
              <SheetRow icon={<CalendarIcon className="h-[18px] w-[18px]" />} label="Fecha">
                <span className="relative first-letter:uppercase">
                  {dateLabel}
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => e.target.value && setDate(e.target.value)}
                    className="absolute inset-0 cursor-pointer opacity-0"
                  />
                </span>
              </SheetRow>
              <SheetRow
                icon={<ClockIcon className="h-[18px] w-[18px]" />}
                label="Hora"
                onClick={() => setTimeOpen(true)}
              >
                {time ? (
                  <>
                    <span className="tabular-nums">{time}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setTime('')
                      }}
                      className="ml-1 text-ink/35 hover:text-ink/70"
                      aria-label="Quitar hora"
                    >
                      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                        <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </button>
                  </>
                ) : (
                  <span className="text-ink/45">Todo el día</span>
                )}
              </SheetRow>
              <SheetRow icon={<ReloadIcon className="h-[18px] w-[18px]" />} label="Repetir" last>
                <span className="relative">
                  {REPEAT_LABEL[repeat]}
                  <select
                    value={repeat}
                    onChange={(e) => setRepeat(e.target.value as typeof repeat)}
                    className="absolute inset-0 cursor-pointer opacity-0"
                  >
                    {(Object.keys(REPEAT_LABEL) as (keyof typeof REPEAT_LABEL)[]).map((r) => (
                      <option key={r} value={r}>
                        {REPEAT_LABEL[r]}
                      </option>
                    ))}
                  </select>
                </span>
              </SheetRow>
            </SheetCard>

            {/* Dónde */}
            <SheetCard title="Dónde">
              <SheetRow icon={<PinIcon className="h-[18px] w-[18px]" />} label="Sala" last>
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Agregar"
                  className="w-32 bg-transparent text-right font-semibold text-ink placeholder:font-normal placeholder:text-ink/35 focus:outline-none"
                />
              </SheetRow>
            </SheetCard>
          </div>
        </WheelModal>

        <TimeWheelSheet
          open={timeOpen}
          title="Hora del evento"
          value={time || '08:00'}
          onClose={() => setTimeOpen(false)}
          onSave={(v) => setTime(v)}
        />
      </>
    )
  }

  // ====== Versión celu (intacta) ======
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
