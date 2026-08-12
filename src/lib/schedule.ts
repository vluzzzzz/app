import type { CalendarEvent, ClassBlock, ClassType } from './types'

/** Nombres en español (Chile). */
export const DAY_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
export const DAY_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
export const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

export const CLASS_TYPE_LABEL: Record<ClassType, string> = {
  catedra: 'Cátedra',
  laboratorio: 'Laboratorio',
  ayudantia: 'Ayudantía',
  taller: 'Taller',
  otro: 'Otro',
}

/** "HH:mm" → minutos desde medianoche (NaN si inválida). */
export function toMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + (m || 0)
}

/** Día de la semana con Lunes=0 … Domingo=6. */
export function weekday(d: Date): number {
  return (d.getDay() + 6) % 7
}

/** Date → "YYYY-MM-DD" (local, sin UTC para no desfasar). */
export function toDateKey(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

/** "YYYY-MM-DD" → Date local (mediodía, para evitar líos de zona horaria). */
export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d, 12)
}

/** "Miércoles 13" / "Miércoles 13 de agosto". */
export function humanDate(d: Date, withMonth = false): string {
  const base = `${DAY_NAMES[weekday(d)]} ${d.getDate()}`
  return withMonth ? `${base} de ${MONTH_NAMES[d.getMonth()].toLowerCase()}` : base
}

/** Clases de un día de la semana, ordenadas por hora de inicio. */
export function classesForDay(classes: ClassBlock[], day: number): ClassBlock[] {
  return classes.filter((c) => c.day === day).sort((a, b) => toMinutes(a.start) - toMinutes(b.start))
}

/** ¿Se superpone [aStart,aEnd) con [bStart,bEnd)? */
export function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return toMinutes(aStart) < toMinutes(bEnd) && toMinutes(bStart) < toMinutes(aEnd)
}

export type NextClassInfo = {
  block: ClassBlock
  /** 'now' = está ocurriendo; 'next' = viene después. */
  status: 'now' | 'next'
  /** Minutos para que empiece (solo 'next'). */
  minutesTo: number
}

/** Próxima clase de HOY según la hora actual (null si no quedan). */
export function nextClassToday(classes: ClassBlock[], now = new Date()): NextClassInfo | null {
  const today = classesForDay(classes, weekday(now))
  const mins = now.getHours() * 60 + now.getMinutes()
  for (const c of today) {
    if (mins >= toMinutes(c.start) && mins < toMinutes(c.end)) {
      return { block: c, status: 'now', minutesTo: 0 }
    }
    if (mins < toMinutes(c.start)) {
      return { block: c, status: 'next', minutesTo: toMinutes(c.start) - mins }
    }
  }
  return null
}

/** ¿El evento ocurre en la fecha dada? (considera repetición). */
export function eventOccursOn(ev: CalendarEvent, dateKey: string): boolean {
  if (ev.date === dateKey) return true
  const rep = ev.repeat ?? 'none'
  if (rep === 'none') return false
  if (dateKey < ev.date) return false
  const target = fromDateKey(dateKey)
  const start = fromDateKey(ev.date)
  if (rep === 'daily') return true
  if (rep === 'weekly') return weekday(target) === weekday(start)
  if (rep === 'monthly') return target.getDate() === start.getDate()
  return false
}

/** Eventos que ocurren en una fecha, ordenados (sin hora primero, luego por hora). */
export function eventsOn(events: CalendarEvent[], dateKey: string): CalendarEvent[] {
  return events
    .filter((e) => eventOccursOn(e, dateKey))
    .sort((a, b) => toMinutes(a.time ?? '00:00') - toMinutes(b.time ?? '00:00'))
}

/** Matriz del mes: semanas de 7 días (null = fuera del mes). Lunes primero. */
export function monthGrid(year: number, month: number): (Date | null)[][] {
  const first = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const lead = weekday(first)
  const cells: (Date | null)[] = []
  for (let i = 0; i < lead; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d, 12))
  while (cells.length % 7 !== 0) cells.push(null)
  const weeks: (Date | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
}
