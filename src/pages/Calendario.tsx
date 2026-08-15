import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useAppStore } from '../store/useAppStore'
import type { CalendarEvent, EventType, Task } from '../lib/types'
import {
  CLASS_TYPE_LABEL,
  DAY_NAMES,
  DAY_SHORT,
  MONTH_NAMES,
  classesForDay,
  eventsOn,
  fromDateKey,
  monthGrid,
  toDateKey,
  weekday,
} from '../lib/schedule'
import { accentRgb } from '../lib/accents'
import { EventSheet, EVENT_TYPE_LABEL } from '../features/schedule/EventSheet'
import { TaskEditor } from '../features/tasks/TaskEditor'
import { CalendarIcon, CheckIcon, ChevronDown, ChevronLeft, ChevronRight, PlusIcon } from '../components/ui/Icons'

/** Color de acento por tipo de evento (cuando no hay ramo asociado). */
const EVENT_TYPE_RGB: Record<EventType, string> = {
  evaluacion: '239 68 68', // rojo
  tarea: '249 115 22', // naranjo
  evento: '59 130 246', // azul
  recordatorio: '139 92 246', // violeta
}

/** Item compacto para la vista mensual ampliada. */
type DayItem = { title: string; time?: string; rgb: string }

export function Calendario() {
  const classes = useAppStore((s) => s.classes)
  const events = useAppStore((s) => s.events)
  const tasks = useAppStore((s) => s.tasks)
  const subjects = useAppStore((s) => s.subjects)
  const toggleTask = useAppStore((s) => s.toggleTask)

  const today = new Date()
  const todayKey = toDateKey(today)
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selectedKey, setSelectedKey] = useState(todayKey)
  const [expanded, setExpanded] = useState(false)
  // Día "espiado" en la vista ampliada: se agranda encima (como el visor de imagen)
  // mostrando todo lo que tiene, en vez de volver a la vista compacta.
  const [peekKey, setPeekKey] = useState<string | null>(null)
  // Las clases del día van plegadas por defecto (ya se sabe que hay clases);
  // se despliegan con la flechita "Clases".
  const [peekClasesOpen, setPeekClasesOpen] = useState(false)
  // Desde dónde crece la tarjeta: offset del centro de la celda tocada respecto
  // al centro de la pantalla. La tarjeta crece UNIFORME (sin estirarse) mientras
  // viaja desde ahí, y al cerrar vuelve al mismo punto.
  const [peekFrom, setPeekFrom] = useState<{ dx: number; dy: number }>({ dx: 0, dy: 0 })

  const [eventSheetOpen, setEventSheetOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [taskSheetOpen, setTaskSheetOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)

  const weeks = useMemo(() => monthGrid(year, month), [year, month])
  const selected = fromDateKey(selectedKey)

  const subjectName = (id?: string) => subjects.find((s) => s.id === id)?.name
  const subjectRgb = (id?: string) => accentRgb(subjects.find((s) => s.id === id)?.color ?? 'gray')
  const subjectColor = (id?: string) => `rgb(${subjectRgb(id)})`
  /** Color de un evento: el del ramo si tiene, si no el de su tipo. */
  const eventRgb = (e: CalendarEvent) => (e.subjectId ? subjectRgb(e.subjectId) : EVENT_TYPE_RGB[e.type])

  const changeMonth = (delta: number) => {
    const d = new Date(year, month + delta, 1)
    setYear(d.getFullYear())
    setMonth(d.getMonth())
  }
  const goToday = () => {
    setYear(today.getFullYear())
    setMonth(today.getMonth())
    setSelectedKey(todayKey)
  }

  // Elementos del día seleccionado (vista compacta).
  const dayClasses = classesForDay(classes, weekday(selected))
  const dayEvents = eventsOn(events, selectedKey)
  const dayTasks = tasks.filter((t) => t.date === selectedKey)
  const totalItems = dayClasses.length + dayEvents.length + dayTasks.length

  /** Eventos + tareas de un día (para puntos y para la vista ampliada). */
  const itemsFor = (d: Date): DayItem[] => {
    const key = toDateKey(d)
    const evs = eventsOn(events, key).map((e) => ({ title: e.title, time: e.time, rgb: eventRgb(e) }))
    const tks = tasks
      .filter((t) => t.date === key)
      .map((t) => ({ title: t.title, time: t.time, rgb: t.color ? accentRgb(t.color) : '148 163 184' }))
    return [...evs, ...tks]
  }

  const openNew = () => {
    setEditingEvent(null)
    setEventSheetOpen(true)
  }

  // El botón "Hoy" (acción, NO etiqueta) solo aparece si te alejaste de hoy.
  const showHoy = year !== today.getFullYear() || month !== today.getMonth() || selectedKey !== todayKey

  return (
    <div className="h-full overflow-y-auto px-5 pb-36 pt-6">
      <header className="mb-6 flex items-end justify-between">
        <div>
          <p className="text-sm font-medium text-ink/50">Tus fechas</p>
          <h1 className="text-[34px] font-bold leading-tight text-ink">Calendario</h1>
        </div>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={openNew}
          className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ink text-surface shadow-[0_6px_16px_-6px_rgba(0,0,0,0.4)]"
          aria-label="Agregar"
        >
          <PlusIcon className="h-6 w-6" />
        </motion.button>
      </header>

      {/* Navegación de mes (izq) + controles Hoy/expandir (der) */}
      <div className="mb-4 flex items-center justify-between px-1">
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => changeMonth(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-full text-ink/50 active:bg-ink/5"
            aria-label="Mes anterior"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h2 className="min-w-[132px] text-center text-[18px] font-bold text-ink">
            {MONTH_NAMES[month]} {year}
          </h2>
          <button
            onClick={() => changeMonth(1)}
            className="flex h-9 w-9 items-center justify-center rounded-full text-ink/50 active:bg-ink/5"
            aria-label="Mes siguiente"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
        <div className="flex items-center gap-1.5">
          {showHoy && (
            <button
              onClick={goToday}
              className="rounded-full bg-ink/5 px-3 py-1.5 text-[12px] font-semibold text-ink/60 active:bg-ink/10"
            >
              Hoy
            </button>
          )}
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-ink/5 text-ink/70 active:bg-ink/10"
            aria-label={expanded ? 'Vista compacta' : 'Vista mensual'}
          >
            {expanded ? (
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                <rect x="3.5" y="5" width="17" height="4.2" rx="1.6" />
                <rect x="3.5" y="14.8" width="17" height="4.2" rx="1.6" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                <rect x="3.5" y="3.5" width="7.5" height="7.5" rx="2" />
                <rect x="13" y="3.5" width="7.5" height="7.5" rx="2" />
                <rect x="3.5" y="13" width="7.5" height="7.5" rx="2" />
                <rect x="13" y="13" width="7.5" height="7.5" rx="2" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* --- COMPACTA: calendario dentro de una tarjeta --- */}
      {!expanded && (
        <div className="glass rounded-[28px] p-4">
          <div className="mb-2 grid grid-cols-7">
            {DAY_SHORT.map((d) => (
              <span key={d} className="text-center text-[11px] font-semibold uppercase text-ink/30">
                {d[0]}
              </span>
            ))}
          </div>
          {weeks.map((w, wi) => (
            <div key={wi} className="grid grid-cols-7">
              {w.map((d, di) => {
                if (!d) return <span key={di} />
                const key = toDateKey(d)
                const isToday = key === todayKey
                const isSelected = key === selectedKey
                const dots = itemsFor(d).slice(0, 3)
                return (
                  <button
                    key={di}
                    onClick={() => setSelectedKey(key)}
                    className="flex flex-col items-center py-1.5"
                  >
                    <span className="relative flex h-9 w-9 items-center justify-center">
                      {isSelected && (
                        <motion.span
                          layoutId="cal-daysel"
                          transition={{ type: 'spring', stiffness: 520, damping: 40 }}
                          className="absolute inset-0 rounded-full bg-ink"
                        />
                      )}
                      <span
                        className={`relative z-10 text-[15px] tabular-nums ${
                          isSelected
                            ? 'font-bold text-surface'
                            : isToday
                              ? 'font-bold text-ink'
                              : 'font-medium text-ink/70'
                        }`}
                      >
                        {d.getDate()}
                      </span>
                    </span>
                    <span className="mt-1 flex h-2 items-center gap-[3px]">
                      {dots.map((it, i) => (
                        <span
                          key={i}
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ background: isSelected ? 'rgb(var(--surface) / 0.7)' : `rgb(${it.rgb})` }}
                        />
                      ))}
                    </span>
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      )}

      {/* --- AMPLIADA: mes a pantalla completa con los eventos dentro de cada día --- */}
      {expanded && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="-mx-4"
        >
          <div className="grid grid-cols-7 px-1 pb-1.5">
            {DAY_SHORT.map((d) => (
              <span key={d} className="text-center text-[11px] font-semibold uppercase text-ink/30">
                {d[0]}
              </span>
            ))}
          </div>
          {weeks.map((w, wi) => (
            <div key={wi} className="grid grid-cols-7 border-t border-ink/[0.06]">
              {w.map((d, di) => {
                if (!d) return <div key={di} className="min-h-[122px]" />
                const key = toDateKey(d)
                const isToday = key === todayKey
                const items = itemsFor(d)
                return (
                  <button
                    key={di}
                    onClick={(e) => {
                      // Agranda el día encima (vista rápida) — no colapsa el mes.
                      // Guardamos desde dónde crece: el centro de esta celda.
                      const r = e.currentTarget.getBoundingClientRect()
                      setPeekFrom({
                        dx: r.left + r.width / 2 - window.innerWidth / 2,
                        dy: r.top + r.height / 2 - window.innerHeight / 2,
                      })
                      setSelectedKey(key)
                      setPeekClasesOpen(false)
                      setPeekKey(key)
                    }}
                    className="flex min-h-[122px] flex-col gap-1 px-1 pt-1.5 text-left align-top active:bg-ink/[0.03]"
                  >
                    <span
                      className={`mx-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[13px] tabular-nums ${
                        isToday ? 'bg-ink font-bold text-surface' : 'font-semibold text-ink/70'
                      }`}
                    >
                      {d.getDate()}
                    </span>
                    <div className="flex flex-col gap-1 overflow-hidden">
                      {items.slice(0, 3).map((it, i) => (
                        <span
                          key={i}
                          className="truncate rounded-md px-1 py-0.5 text-[10.5px] font-semibold leading-tight text-ink/80"
                          style={{ background: `rgb(${it.rgb} / 0.16)` }}
                        >
                          {it.title}
                        </span>
                      ))}
                      {items.length > 3 && (
                        <span className="pl-1 text-[10px] font-semibold text-ink/40">
                          +{items.length - 3} más
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          ))}
        </motion.div>
      )}

      {/* Detalle del día seleccionado (solo en vista compacta) */}
      {!expanded && (
        <>
          <div className="mb-3 mt-6 flex items-baseline justify-between px-1">
            <h2 className="text-[18px] font-bold text-ink">
              {DAY_NAMES[weekday(selected)]} {selected.getDate()}
              <span className="font-semibold text-ink/40"> de {MONTH_NAMES[selected.getMonth()]}</span>
            </h2>
            {totalItems > 0 && (
              <span className="shrink-0 text-sm font-semibold text-ink/40">
                {totalItems} {totalItems === 1 ? 'cosa' : 'cosas'}
              </span>
            )}
          </div>

          {totalItems === 0 ? (
            <div className="glass rounded-3xl p-8 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-ink/5 text-ink/60">
                <CalendarIcon className="h-6 w-6" />
              </div>
              <p className="text-[15px] font-semibold text-ink">No tienes nada para este día</p>
              <p className="mt-0.5 text-sm text-ink/45">Disfruta el día.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {/* Clases del horario (derivadas) */}
              {dayClasses.map((c, i) => (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i, 8) * 0.03 }}
                  className="glass relative overflow-hidden rounded-[20px] p-4 pl-5 opacity-95"
                >
                  <span
                    className="absolute inset-y-2 left-0 w-1 rounded-r-full"
                    style={{ background: subjectColor(c.subjectId) }}
                  />
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="break-words text-[15px] font-bold text-ink">
                      {subjectName(c.subjectId) ?? 'Clase'}
                    </h3>
                    <span className="shrink-0 text-[12px] font-medium text-ink/40">
                      Clase · {CLASS_TYPE_LABEL[c.type]}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm tabular-nums text-ink/55">
                    {c.start} — {c.end}
                    {c.room ? ` · ${c.room}` : ''}
                  </p>
                </motion.div>
              ))}

              {/* Eventos */}
              {dayEvents.map((e, i) => {
                const past = selectedKey < todayKey
                return (
                  <motion.button
                    key={e.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(dayClasses.length + i, 8) * 0.03 }}
                    whileTap={{ scale: 0.985 }}
                    onClick={() => {
                      setEditingEvent(e)
                      setEventSheetOpen(true)
                    }}
                    className={`glass relative w-full overflow-hidden rounded-[20px] p-4 pl-5 text-left ${past ? 'opacity-60' : ''}`}
                  >
                    <span
                      className="absolute inset-y-2 left-0 w-1 rounded-r-full"
                      style={{ background: `rgb(${eventRgb(e)})` }}
                    />
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="break-words text-[15px] font-bold text-ink">{e.title}</h3>
                      <span className="shrink-0 text-[12px] font-medium text-ink/40">
                        {EVENT_TYPE_LABEL[e.type]}
                      </span>
                    </div>
                    <p className="mt-0.5 text-sm tabular-nums text-ink/55">
                      {[subjectName(e.subjectId), e.time ?? 'Todo el día', e.location]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </motion.button>
                )
              })}

              {/* Tareas con fecha */}
              {dayTasks.map((t, i) => {
                const overdue = !t.done && t.date! < todayKey
                return (
                  <motion.div
                    key={t.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(dayClasses.length + dayEvents.length + i, 8) * 0.03 }}
                    className={`glass relative overflow-hidden rounded-[20px] p-4 pl-5 ${t.done ? 'opacity-60' : ''}`}
                  >
                    <span
                      className="absolute inset-y-2 left-0 w-1 rounded-r-full"
                      style={{ background: t.color ? `rgb(${accentRgb(t.color)})` : 'rgb(var(--ink) / 0.8)' }}
                    />
                    <div className="flex items-center justify-between gap-2">
                      <button
                        onClick={() => {
                          setEditingTask(t)
                          setTaskSheetOpen(true)
                        }}
                        className="min-w-0 flex-1 text-left"
                      >
                        <h3 className={`break-words text-[15px] font-bold text-ink ${t.done ? 'line-through opacity-60' : ''}`}>
                          {t.title}
                        </h3>
                        <p className="mt-0.5 text-sm text-ink/55">
                          Tarea{t.time ? ` · ${t.time}` : ''}
                          {overdue && <span className="font-semibold text-rose-500"> · Vencida</span>}
                          {t.done && <span className="font-semibold text-emerald-600 dark:text-emerald-300"> · Completada</span>}
                        </p>
                      </button>
                      <button
                        onClick={() => toggleTask(t.id)}
                        aria-label={t.done ? 'Marcar pendiente' : 'Completar'}
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${
                          t.done
                            ? 'border-emerald-500 bg-emerald-500 text-white'
                            : 'border-ink/20 text-transparent'
                        }`}
                      >
                        <CheckIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Vista rápida de un día (desde el mes ampliado): se agranda por encima
          mostrando todo lo que tiene, como el visor de imágenes del chat. */}
      <AnimatePresence>
        {peekKey &&
          (() => {
            const pd = fromDateKey(peekKey)
            const pClasses = classesForDay(classes, weekday(pd))
            const pEvents = eventsOn(events, peekKey)
            const pTasks = tasks.filter((t) => t.date === peekKey)
            const n = pClasses.length + pEvents.length + pTasks.length
            return (
              <motion.div
                key="peek"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                onClick={() => setPeekKey(null)}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-5 backdrop-blur-[2px]"
              >
                {/* La tarjeta CRECE uniforme (misma escala en ambos ejes, sin
                    estirarse) mientras VIAJA desde la celda tocada hasta el centro;
                    al cerrar hace el camino inverso. */}
                <motion.div
                  initial={{ scale: 0.12, x: peekFrom.dx, y: peekFrom.dy, opacity: 0 }}
                  animate={{ scale: 1, x: 0, y: 0, opacity: 1 }}
                  exit={{ scale: 0.12, x: peekFrom.dx, y: peekFrom.dy, opacity: 0 }}
                  transition={{
                    type: 'spring',
                    stiffness: 320,
                    damping: 30,
                    opacity: { duration: 0.16 },
                  }}
                  style={{ borderRadius: 20 }}
                  onClick={(e) => e.stopPropagation()}
                  className="max-h-[75vh] w-full max-w-sm overflow-y-auto bg-surface p-5 shadow-2xl"
                >
                  {/* El contenido aparece en fade mientras la caja vuela (padre→hijo). */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1, duration: 0.2 }}
                  >
                    <div className="mb-3 flex items-baseline justify-between gap-2">
                      <h3 className="text-[18px] font-bold text-ink">
                        {DAY_NAMES[weekday(pd)]} {pd.getDate()}
                        <span className="font-semibold text-ink/40"> de {MONTH_NAMES[pd.getMonth()]}</span>
                      </h3>
                      {n > 0 && (
                        <span className="shrink-0 text-sm font-semibold text-ink/40">
                          {n} {n === 1 ? 'cosa' : 'cosas'}
                        </span>
                      )}
                    </div>

                    {n === 0 ? (
                      <p className="py-6 text-center text-[15px] text-ink/50">
                        Nada para este día — libreee 😎
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {/* Clases plegadas por defecto: ya se sabe que hay clases;
                            lo importante del día son los eventos y tareas. */}
                        {pClasses.length > 0 && (
                          <>
                            <button
                              onClick={() => setPeekClasesOpen((v) => !v)}
                              className="flex w-full items-center justify-between rounded-2xl bg-ink/[0.04] p-3 active:bg-ink/[0.07]"
                            >
                              <span className="text-[14px] font-bold text-ink">
                                Clases <span className="font-semibold text-ink/40">({pClasses.length})</span>
                              </span>
                              <ChevronDown
                                className={`h-4 w-4 text-ink/50 transition-transform duration-200 ${
                                  peekClasesOpen ? 'rotate-180' : ''
                                }`}
                              />
                            </button>
                            {peekClasesOpen &&
                              pClasses.map((c, i) => (
                                <motion.div
                                  key={c.id}
                                  initial={{ opacity: 0, y: -4 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: i * 0.03 }}
                                  className="flex gap-2.5 rounded-2xl bg-ink/[0.04] p-3"
                                >
                                  <span
                                    className="w-[3px] shrink-0 self-stretch rounded-full"
                                    style={{ background: subjectColor(c.subjectId) }}
                                  />
                                  <div className="min-w-0">
                                    <p className="break-words text-[14px] font-bold text-ink">
                                      {subjectName(c.subjectId) ?? 'Clase'}
                                    </p>
                                    <p className="text-[12.5px] tabular-nums text-ink/55">
                                      {c.start} — {c.end}
                                      {c.room ? ` · ${c.room}` : ''} · {CLASS_TYPE_LABEL[c.type]}
                                    </p>
                                  </div>
                                </motion.div>
                              ))}
                          </>
                        )}
                        {pEvents.map((e) => (
                          <div key={e.id} className="flex gap-2.5 rounded-2xl bg-ink/[0.04] p-3">
                            <span
                              className="w-[3px] shrink-0 self-stretch rounded-full"
                              style={{ background: `rgb(${eventRgb(e)})` }}
                            />
                            <div className="min-w-0">
                              <p className="break-words text-[14px] font-bold text-ink">{e.title}</p>
                              <p className="text-[12.5px] tabular-nums text-ink/55">
                                {[EVENT_TYPE_LABEL[e.type], e.time ?? 'Todo el día', e.location]
                                  .filter(Boolean)
                                  .join(' · ')}
                              </p>
                            </div>
                          </div>
                        ))}
                        {pTasks.map((t) => (
                          <div key={t.id} className="flex gap-2.5 rounded-2xl bg-ink/[0.04] p-3">
                            <span
                              className="w-[3px] shrink-0 self-stretch rounded-full"
                              style={{
                                background: t.color ? `rgb(${accentRgb(t.color)})` : 'rgb(var(--ink) / 0.8)',
                              }}
                            />
                            <div className="min-w-0">
                              <p
                                className={`break-words text-[14px] font-bold text-ink ${
                                  t.done ? 'line-through opacity-60' : ''
                                }`}
                              >
                                {t.title}
                              </p>
                              <p className="text-[12.5px] text-ink/55">
                                Tarea
                                {t.time ? ` · ${t.time}` : ''}
                                {t.done ? ' · Completada' : ''}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                </motion.div>
              </motion.div>
            )
          })()}
      </AnimatePresence>

      <EventSheet
        open={eventSheetOpen}
        onClose={() => setEventSheetOpen(false)}
        event={editingEvent}
        defaultDate={selectedKey}
        onPickTask={() => {
          setEditingTask(null)
          setTaskSheetOpen(true)
        }}
      />
      <TaskEditor
        open={taskSheetOpen}
        onClose={() => setTaskSheetOpen(false)}
        task={editingTask}
        defaultDate={selectedKey}
      />
    </div>
  )
}
