import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { CalendarEvent, EventType } from '../../lib/types'
import {
  CLASS_TYPE_LABEL,
  DAY_SHORT,
  DAY_NAMES,
  MONTH_NAMES,
  classesForDay,
  eventsOn,
  fromDateKey,
  monthGrid,
  toDateKey,
  weekday,
} from '../../lib/schedule'
import { accentRgb } from '../../lib/accents'
import { fetchSharedCalendario, type SharedCalendario } from '../../lib/shareCal'
import { ChevronDown, ChevronLeft, ChevronRight, MoonIcon, SunIcon } from '../../components/ui/Icons'

const EVENT_TYPE_RGB: Record<EventType, string> = {
  evaluacion: '239 68 68',
  tarea: '249 115 22',
  evento: '59 130 246',
  recordatorio: '139 92 246',
}
const EVENT_TYPE_LABEL: Record<EventType, string> = {
  evaluacion: 'Evaluación',
  tarea: 'Tarea',
  evento: 'Evento',
  recordatorio: 'Recordatorio',
}

const mesKey = (y: number, m: number) => `${y}-${String(m + 1).padStart(2, '0')}`

/**
 * Vista PÚBLICA del calendario compartido (/calendario/<token>): solo lectura,
 * sin login, con la MISMA interfaz del Calendario real — mes compacto con
 * puntitos, mes ampliado con chips, vista rápida del día (container transform)
 * y swipe para cambiar de mes. Si se compartieron meses específicos, la
 * navegación queda acotada a esos meses.
 */
export function SharedCalendarioView({ token }: { token: string }) {
  const [state, setState] = useState<'loading' | 'error' | 'ok'>('loading')
  const [data, setData] = useState<SharedCalendario | null>(null)

  const today = new Date()
  const todayKey = toDateKey(today)
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [monthDir, setMonthDir] = useState(0)
  const [expanded, setExpanded] = useState(false)
  const [peekKey, setPeekKey] = useState<string | null>(null)
  const [selectedKey, setSelectedKey] = useState(todayKey)
  // Clases plegadas por defecto (detalle del día y vista rápida), como en la app.
  const [clasesOpen, setClasesOpen] = useState(false)
  const [peekClasesOpen, setPeekClasesOpen] = useState(false)
  useEffect(() => setClasesOpen(false), [selectedKey])

  // El link compartido SIEMPRE abre en tema claro; el visitante puede alternar.
  const [dark, setDark] = useState(false)
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  useEffect(() => {
    fetchSharedCalendario(token).then((d) => {
      if (d) {
        setData(d)
        setState('ok')
        document.title = `Calendario de ${d.nombre || 'Brody'}`
        // Arranca en el mes actual si está compartido; si no, en el primero.
        if (d.meses && !d.meses.includes(mesKey(today.getFullYear(), today.getMonth()))) {
          const [y, m] = d.meses[0].split('-').map(Number)
          setYear(y)
          setMonth(m - 1)
          setSelectedKey(toDateKey(new Date(y, m - 1, 1)))
        }
      } else {
        setState('error')
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const meses = data?.meses ?? null
  const weeks = useMemo(() => monthGrid(year, month), [year, month])

  // Navegación: libre si se comparte todo; por la lista si son meses elegidos
  // (así funciona incluso con meses salteados, ej. Agosto y Octubre).
  const currKey = mesKey(year, month)
  const idx = meses ? meses.indexOf(currKey) : -1
  const canPrev = meses ? idx > 0 : true
  const canNext = meses ? idx >= 0 && idx < meses.length - 1 : true
  const changeMonth = (delta: number) => {
    setMonthDir(delta)
    if (meses) {
      const target = meses[idx + delta]
      if (!target) return
      const [y, m] = target.split('-').map(Number)
      setYear(y)
      setMonth(m - 1)
    } else {
      const d = new Date(year, month + delta, 1)
      setYear(d.getFullYear())
      setMonth(d.getMonth())
    }
  }
  const onSwipe = (_: unknown, info: { offset: { x: number } }) => {
    if (info.offset.x < -70 && canNext) changeMonth(1)
    else if (info.offset.x > 70 && canPrev) changeMonth(-1)
  }

  if (state === 'loading') {
    return (
      <div className="flex h-[100dvh] items-center justify-center">
        <img src="/logoapp.png" alt="Brody" className="h-16 w-16 animate-pulse rounded-2xl object-contain" />
      </div>
    )
  }

  if (state === 'error' || !data) {
    return (
      <div className="flex h-[100dvh] flex-col items-center justify-center gap-3 px-8 text-center">
        <img src="/logoapp.png" alt="Brody" className="h-14 w-14 rounded-2xl object-contain" />
        <h1 className="text-xl font-bold text-ink">Este link ya no está activo</h1>
        <p className="max-w-xs text-sm text-ink/55">
          Pídele a quien te lo compartió que lo genere de nuevo desde Brody.
        </p>
      </div>
    )
  }

  const ramo = (id?: string) => data.ramos.find((r) => r.id === id)
  const eventRgb = (e: CalendarEvent) =>
    e.subjectId && ramo(e.subjectId) ? accentRgb(ramo(e.subjectId)!.color) : EVENT_TYPE_RGB[e.type]
  const itemsFor = (d: Date) =>
    eventsOn(data.eventos, toDateKey(d)).map((e) => ({ title: e.title, rgb: eventRgb(e) }))

  return (
    <div className="mx-auto h-full w-full max-w-md overflow-y-auto px-5 pb-16 pt-6 lg:max-w-2xl lg:pt-10">
      <header className="mb-6 flex items-end justify-between">
        <div>
          <p className="text-sm font-medium text-ink/50">Calendario de</p>
          <h1 className="text-[34px] font-bold leading-tight text-ink">
            {data.nombre || 'Estudiante'}
          </h1>
        </div>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setDark((v) => !v)}
          className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ink/5 text-ink"
          aria-label={dark ? 'Tema claro' : 'Tema oscuro'}
        >
          {dark ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
        </motion.button>
      </header>

      {/* Navegación de mes + maximizar */}
      <div className="mb-4 flex items-center justify-between px-1">
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => canPrev && changeMonth(-1)}
            className={`flex h-9 w-9 items-center justify-center rounded-full ${
              canPrev ? 'text-ink/50 active:bg-ink/5' : 'text-ink/15'
            }`}
            aria-label="Mes anterior"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h2 className="min-w-[132px] text-center text-[18px] font-bold text-ink">
            {MONTH_NAMES[month]} {year}
          </h2>
          <button
            onClick={() => canNext && changeMonth(1)}
            className={`flex h-9 w-9 items-center justify-center rounded-full ${
              canNext ? 'text-ink/50 active:bg-ink/5' : 'text-ink/15'
            }`}
            aria-label="Mes siguiente"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
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

      {/* --- COMPACTA --- */}
      {!expanded && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          drag="x"
          dragDirectionLock
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.12}
          onDragEnd={onSwipe}
          className="glass rounded-[28px] p-4"
        >
          <div className="mb-2 grid grid-cols-7">
            {DAY_SHORT.map((d) => (
              <span key={d} className="text-center text-[11px] font-semibold uppercase text-ink/30">
                {d[0]}
              </span>
            ))}
          </div>
          <motion.div
            key={`${year}-${month}`}
            initial={{ x: monthDir * 44, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
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
                            layoutId="shared-cal-daysel"
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
                            style={{
                              background: isSelected ? 'rgb(var(--surface) / 0.7)' : `rgb(${it.rgb})`,
                            }}
                          />
                        ))}
                      </span>
                    </button>
                  )
                })}
              </div>
            ))}
          </motion.div>
        </motion.div>
      )}

      {/* Detalle del día seleccionado (vista compacta, igual que la app) */}
      {!expanded &&
        (() => {
          const sel = fromDateKey(selectedKey)
          const selEvents = eventsOn(data.eventos, selectedKey)
          const selClasses = classesForDay(data.horario, weekday(sel))
          const totalSel = selEvents.length + selClasses.length
          return (
            <>
              <div className="mb-3 mt-6 flex items-baseline justify-between px-1">
                <h2 className="text-[18px] font-bold text-ink">
                  {DAY_NAMES[weekday(sel)]} {sel.getDate()}
                  <span className="font-semibold text-ink/40"> de {MONTH_NAMES[sel.getMonth()]}</span>
                </h2>
                {totalSel > 0 && (
                  <span className="shrink-0 text-sm font-semibold text-ink/40">
                    {totalSel} {totalSel === 1 ? 'cosa' : 'cosas'}
                  </span>
                )}
              </div>
              {totalSel === 0 ? (
                <div className="glass rounded-3xl p-8 text-center">
                  <p className="text-[15px] font-semibold text-ink">Nada para este día</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {selClasses.length > 0 && (
                    <>
                      <button
                        onClick={() => setClasesOpen((v) => !v)}
                        className="glass flex w-full items-center justify-between rounded-[20px] p-4 active:opacity-80"
                      >
                        <span className="text-[15px] font-bold text-ink">
                          Clases <span className="font-semibold text-ink/40">({selClasses.length})</span>
                        </span>
                        <ChevronDown
                          className={`h-4 w-4 text-ink/50 transition-transform duration-200 ${
                            clasesOpen ? 'rotate-180' : ''
                          }`}
                        />
                      </button>
                      <AnimatePresence initial={false}>
                        {clasesOpen && (
                          <motion.div
                            key="shared-clases"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.24, ease: 'easeInOut' }}
                            className="overflow-hidden"
                          >
                            <div className="space-y-2.5">
                              {selClasses.map((c) => (
                                <div key={c.id} className="glass rounded-[20px] p-4">
                                  <div className="flex gap-2.5">
                                    <span
                                      className="w-[3px] shrink-0 self-stretch rounded-full"
                                      style={{
                                        background: `rgb(${accentRgb(ramo(c.subjectId)?.color ?? 'gray')})`,
                                      }}
                                    />
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-start justify-between gap-2">
                                        <h3 className="break-words text-[15px] font-bold text-ink">
                                          {ramo(c.subjectId)?.nombre ?? 'Clase'}
                                        </h3>
                                        <span className="shrink-0 text-[12px] font-medium text-ink/40">
                                          Clase · {CLASS_TYPE_LABEL[c.type]}
                                        </span>
                                      </div>
                                      <p className="mt-0.5 text-sm tabular-nums text-ink/55">
                                        {c.start} — {c.end}
                                        {c.room ? ` · ${c.room}` : ''}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </>
                  )}
                  {selEvents.map((e, i) => (
                    <motion.div
                      key={e.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i, 8) * 0.03 }}
                      className="glass rounded-[20px] p-4"
                    >
                      <div className="flex gap-2.5">
                        <span
                          className="w-[3px] shrink-0 self-stretch rounded-full"
                          style={{ background: `rgb(${eventRgb(e)})` }}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="break-words text-[15px] font-bold text-ink">{e.title}</h3>
                            <span className="shrink-0 text-[12px] font-medium text-ink/40">
                              {EVENT_TYPE_LABEL[e.type]}
                            </span>
                          </div>
                          <p className="mt-0.5 text-sm tabular-nums text-ink/55">
                            {[ramo(e.subjectId)?.nombre, e.time ?? 'Todo el día', e.location]
                              .filter(Boolean)
                              .join(' · ')}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </>
          )
        })()}

      {/* --- AMPLIADA --- */}
      {expanded && (
        <motion.div
          initial={{ opacity: 0, y: 14, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.26, ease: 'easeOut' }}
          drag="x"
          dragDirectionLock
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.12}
          onDragEnd={onSwipe}
          className="-mx-2"
        >
          <div className="grid grid-cols-7 px-1 pb-1.5">
            {DAY_SHORT.map((d) => (
              <span key={d} className="text-center text-[11px] font-semibold uppercase text-ink/30">
                {d[0]}
              </span>
            ))}
          </div>
          <motion.div
            key={`${year}-${month}`}
            initial={{ x: monthDir * 44, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            {weeks.map((w, wi) => (
              <div key={wi} className="grid grid-cols-7 border-t border-ink/[0.06]">
                {w.map((d, di) => {
                  if (!d) return <div key={di} className="min-h-[110px]" />
                  const key = toDateKey(d)
                  const isToday = key === todayKey
                  const items = itemsFor(d)
                  return (
                    <motion.button
                      key={di}
                      layoutId={`speek-x-${key}`}
                      layoutDependency={peekKey}
                      style={{ borderRadius: 16 }}
                      onClick={() => {
                        setPeekClasesOpen(false)
                        setPeekKey(key)
                      }}
                      className="min-h-[110px] px-1 pt-1.5 text-left align-top active:bg-ink/[0.03]"
                    >
                      <motion.div layout="position" className="flex flex-col gap-1">
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
                      </motion.div>
                    </motion.button>
                  )
                })}
              </div>
            ))}
          </motion.div>
        </motion.div>
      )}

      {/* Vista rápida del día (mismas dos capas que la app: caja voladora + contenido) */}
      <AnimatePresence>
        {peekKey &&
          (() => {
            const pd = fromDateKey(peekKey)
            const pEvents = eventsOn(data.eventos, peekKey)
            const pClasses = classesForDay(data.horario, weekday(pd))
            const nPeek = pEvents.length + pClasses.length
            const layoutBase = 'speek-x'
            return (
              <motion.div
                key="peek"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.32, delay: 0.1, ease: 'easeIn' } }}
                transition={{ duration: 0.18 }}
                onClick={() => setPeekKey(null)}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-5 backdrop-blur-[2px]"
              >
                <div className="relative w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
                  <motion.div
                    layoutId={`${layoutBase}-${peekKey}`}
                    layoutDependency={peekKey}
                    transition={{ type: 'spring', stiffness: 280, damping: 30 }}
                    style={{ borderRadius: 20 }}
                    className="absolute inset-0 bg-surface shadow-2xl"
                  />
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, transition: { duration: 0.1 } }}
                    transition={{ delay: 0.1, duration: 0.2 }}
                    className="relative max-h-[75vh] overflow-y-auto p-5"
                  >
                    <div className="mb-3 flex items-baseline justify-between gap-2">
                      <h3 className="text-[18px] font-bold text-ink">
                        {DAY_NAMES[weekday(pd)]} {pd.getDate()}
                        <span className="font-semibold text-ink/40"> de {MONTH_NAMES[pd.getMonth()]}</span>
                      </h3>
                      {nPeek > 0 && (
                        <span className="shrink-0 text-sm font-semibold text-ink/40">
                          {nPeek} {nPeek === 1 ? 'cosa' : 'cosas'}
                        </span>
                      )}
                    </div>

                    {nPeek === 0 ? (
                      <p className="py-6 text-center text-[15px] text-ink/50">
                        Nada para este día
                      </p>
                    ) : (
                      <div className="space-y-2">
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
                            <AnimatePresence initial={false}>
                              {peekClasesOpen && (
                                <motion.div
                                  key="shared-peek-clases"
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.24, ease: 'easeInOut' }}
                                  className="overflow-hidden"
                                >
                                  <div className="space-y-2">
                                    {pClasses.map((c) => (
                                      <div key={c.id} className="flex gap-2.5 rounded-2xl bg-ink/[0.04] p-3">
                                        <span
                                          className="w-[3px] shrink-0 self-stretch rounded-full"
                                          style={{
                                            background: `rgb(${accentRgb(ramo(c.subjectId)?.color ?? 'gray')})`,
                                          }}
                                        />
                                        <div className="min-w-0">
                                          <p className="break-words text-[14px] font-bold text-ink">
                                            {ramo(c.subjectId)?.nombre ?? 'Clase'}
                                          </p>
                                          <p className="text-[12.5px] tabular-nums text-ink/55">
                                            {c.start} — {c.end}
                                            {c.room ? ` · ${c.room}` : ''} · {CLASS_TYPE_LABEL[c.type]}
                                          </p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
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
                                {[
                                  EVENT_TYPE_LABEL[e.type],
                                  ramo(e.subjectId)?.nombre,
                                  e.time ?? 'Todo el día',
                                  e.location,
                                ]
                                  .filter(Boolean)
                                  .join(' · ')}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                </div>
              </motion.div>
            )
          })()}
      </AnimatePresence>

      <a
        href="https://www.brrody.app"
        className="mt-8 block pb-4 text-center text-[12px] text-ink/35 active:opacity-70"
      >
        Hecho con <span className="font-semibold text-ink/50">Brody</span> · brrody.app
      </a>
    </div>
  )
}
