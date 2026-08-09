import { describe, it, expect } from 'vitest'
import {
  analyzeSituation,
  ceilTo,
  combinationsFor,
  currentGrade,
  evaluationsBreakdown,
  impactTable,
  maxPossibleFinal,
  minGradeToPass,
  minPossibleFinal,
  pendingEvaluations,
  projectedFinal,
  projectedGrade,
  scenariosFor,
  weightsAreValid,
} from './grades'
import { DEFAULT_SCALE, type GradeNode, type Subject } from './types'

let counter = 0
const id = () => `id-${counter++}`

function subject(nodes: GradeNode[], partial: Partial<Subject> = {}): Subject {
  return { id: id(), name: 'Test', scale: DEFAULT_SCALE, nodes, ...partial }
}

/** Carpeta (sección/subgrupo). */
const folder = (name: string, weight: number, children: GradeNode[]): GradeNode => ({
  id: id(),
  name,
  weight,
  children,
})
/** Nota (hoja). */
const note = (name: string, weight: number, grade: number | null, nid?: string): GradeNode => ({
  id: nid ?? id(),
  name,
  weight,
  grade,
})

describe('ceilTo', () => {
  it('redondea hacia arriba al 0.1', () => {
    expect(ceilTo(3.571, 0.1)).toBe(3.6)
    expect(ceilTo(4.0, 0.1)).toBe(4.0)
    expect(ceilTo(5.31, 0.1)).toBe(5.4)
  })
})

describe('minGradeToPass — escala chilena 20/80', () => {
  it('necesita exactamente 4.0 cuando control=4.0 y pruebas pendiente', () => {
    const s = subject([
      folder('Controles', 20, [note('C1', 100, 4.0)]),
      folder('Pruebas', 80, [note('P1', 100, null)]),
    ])
    const r = minGradeToPass(s)
    expect(r.status).toBe('ALCANZABLE')
    expect(r.needed).toBe(4.0)
    expect(currentGrade(s)).toBeCloseTo(4.0)
  })

  it('marca ASEGURADO cuando incluso con la mínima se aprueba', () => {
    const s = subject([
      folder('Controles', 20, [note('C1', 100, 7.0)]),
      folder('Pruebas', 80, [note('P1', 50, 7.0), note('P2', 50, null)]),
    ])
    expect(minGradeToPass(s).status).toBe('ASEGURADO')
  })

  it('marca IMPOSIBLE cuando ni con 7.0 se alcanza', () => {
    const s = subject([
      folder('Controles', 20, [note('C1', 100, 1.0)]),
      folder('Pruebas', 80, [note('P1', 50, 1.0), note('P2', 50, null)]),
    ])
    expect(minGradeToPass(s).status).toBe('IMPOSIBLE')
  })

  it('cuando ya no queda nada pendiente devuelve la nota final', () => {
    const s = subject([
      folder('Controles', 20, [note('C1', 100, 5.0)]),
      folder('Pruebas', 80, [note('P1', 100, 6.0)]),
    ])
    const r = minGradeToPass(s)
    expect(r.status).toBe('ASEGURADO')
    expect(r.final).toBeCloseTo(5.8)
    expect(currentGrade(s)).toBeCloseTo(5.8)
  })

  it('reprobado ya determinado => IMPOSIBLE', () => {
    const s = subject([
      folder('Controles', 20, [note('C1', 100, 2.0)]),
      folder('Pruebas', 80, [note('P1', 100, 3.0)]),
    ])
    const r = minGradeToPass(s)
    expect(r.status).toBe('IMPOSIBLE')
    expect(r.final).toBeCloseTo(2.8)
  })
})

describe('subgrupos anidados (3 niveles)', () => {
  it('Cátedra 60 [Controles 40, Pruebas 60] + Laboratorio 40', () => {
    // Solo Controles rendido con 5.0; el resto pendiente.
    const s = subject([
      folder('Cátedra', 60, [
        folder('Controles', 40, [note('C1', 100, 5.0)]),
        folder('Pruebas', 60, [note('P1', 100, null)]),
      ]),
      folder('Laboratorio', 40, [note('Informe', 100, null)]),
    ])
    // effW C1 = 0.6*0.4 = 0.24 ; currentGrade = 5.0 (único con nota)
    expect(currentGrade(s)).toBeCloseTo(5.0)
    // K = 0.24*5 = 1.2 ; P = 1 - 0.24 = 0.76 ; raw = (4-1.2)/0.76
    const r = minGradeToPass(s)
    expect(r.status).toBe('ALCANZABLE')
    expect(r.needed).toBe(ceilTo((4 - 1.2) / 0.76, 0.1))
  })
})

describe('notas ponderadas dentro de un subgrupo', () => {
  it('respeta los pesos 30/70', () => {
    const s = subject([
      folder('Notas', 100, [note('Parcial', 30, 5.0), note('Examen', 70, null)]),
    ])
    const r = minGradeToPass(s)
    expect(r.status).toBe('ALCANZABLE')
    expect(r.needed).toBe(3.6) // (4 - 0.3*5) / 0.7 = 3.571 -> 3.6
    expect(weightsAreValid(s)).toBe(true)
  })

  it('pesos parejos 50/50', () => {
    const s = subject([
      folder('Notas', 100, [note('Parcial', 50, 5.0), note('Examen', 50, null)]),
    ])
    expect(minGradeToPass(s).needed).toBe(3.0) // (4 - 0.5*5)/0.5 = 3.0
  })
})

describe('notas sueltas al tope', () => {
  it('promedia por igual', () => {
    const s = subject([note('N1', 50, 4.0), note('N2', 50, null)])
    expect(currentGrade(s)).toBeCloseTo(4.0)
    const r = minGradeToPass(s)
    expect(r.status).toBe('ALCANZABLE')
    expect(r.needed).toBe(4.0)
  })
})

describe('casos borde', () => {
  it('SIN_DATOS cuando no hay evaluaciones', () => {
    expect(minGradeToPass(subject([])).status).toBe('SIN_DATOS')
    expect(currentGrade(subject([]))).toBeNull()
  })

  it('projectedGrade calcula la final asumiendo x en lo pendiente', () => {
    const s = subject([
      folder('Controles', 20, [note('C1', 100, 4.0)]),
      folder('Pruebas', 80, [note('P1', 100, null)]),
    ])
    expect(projectedGrade(s, 4.0)).toBeCloseTo(4.0)
    expect(projectedGrade(s, 7.0)).toBeCloseTo(0.2 * 4 + 0.8 * 7)
  })

  it('weightsAreValid detecta que las ponderaciones no suman 100', () => {
    const bad = subject([folder('A', 20, []), folder('B', 70, [])])
    expect(weightsAreValid(bad)).toBe(false)
  })

  it('weightsAreValid detecta % por nota que no suman 100', () => {
    const s = subject([
      folder('Notas', 100, [note('A', 30, null), note('B', 60, null)]),
    ])
    expect(weightsAreValid(s)).toBe(false)
  })
})

describe('notas que faltan (pendientes) y combinaciones', () => {
  // 3 controles (20%) + 3 pruebas (80%), tiene 2 y 2.
  function faltanUnaYUna() {
    return subject([
      folder('Controles', 20, [
        note('C1', 1, 5.0, 'c1'),
        note('C2', 1, 5.0, 'c2'),
        note('C3', 1, null, 'c3'),
      ]),
      folder('Pruebas', 80, [
        note('P1', 1, 4.0, 'p1'),
        note('P2', 1, 4.0, 'p2'),
        note('P3', 1, null, 'p3'),
      ]),
    ])
  }

  it('detecta exactamente 2 evaluaciones pendientes con id', () => {
    const pend = pendingEvaluations(faltanUnaYUna())
    expect(pend.map((p) => p.id).sort()).toEqual(['c3', 'p3'])
  })

  it('combinationsFor entrega la tabla de trade-off para 2 pendientes', () => {
    const combos = combinationsFor(faltanUnaYUna())
    expect(combos).not.toBeNull()
    expect(combos!.first.id === 'c3' || combos!.second.id === 'c3').toBe(true)
    expect(combos!.rows.length).toBeGreaterThan(0)
    for (const r of combos!.rows) {
      expect(r.b === null || (r.b >= 1 && r.b <= 7)).toBe(true)
    }
  })

  it('projectedFinal calcula la final con notas asignadas a las pendientes', () => {
    const final = projectedFinal(faltanUnaYUna(), { c3: 5, p3: 5 })
    const expected = 0.2 * 5 + 0.8 * (13 / 3)
    expect(final).toBeCloseTo(expected)
  })

  it('combinationsFor devuelve null si no faltan exactamente 2', () => {
    const s = subject([note('N1', 100, null, 'n1')])
    expect(combinationsFor(s)).toBeNull()
  })
})

describe('análisis de Calcular', () => {
  it('máximo y mínimo posible (escala chilena)', () => {
    const s = subject([
      folder('Controles', 20, [note('C1', 100, 4.0)]),
      folder('Pruebas', 80, [note('P1', 100, null)]),
    ])
    expect(maxPossibleFinal(s)).toBeCloseTo(0.2 * 4 + 0.8 * 7) // 6.4
    expect(minPossibleFinal(s)).toBeCloseTo(0.2 * 4 + 0.8 * 1) // 1.6
  })

  it('evaluationsBreakdown expone el peso global de cada nota', () => {
    const s = subject([
      folder('Cátedra', 60, [
        folder('Controles', 40, [note('C1', 100, 5.0)]),
        folder('Pruebas', 60, [note('P1', 100, null)]),
      ]),
      folder('Laboratorio', 40, [note('Informe', 100, null)]),
    ])
    const b = evaluationsBreakdown(s)
    const c1 = b.find((x) => x.name === 'C1')!
    expect(c1.weightPct).toBeCloseTo(24) // 60% * 40% = 24%
    expect(b.find((x) => x.name === 'Informe')!.weightPct).toBeCloseTo(40)
  })

  it('analyzeSituation clasifica bien', () => {
    // imposible: ni con 7 alcanza
    const imp = subject([
      folder('C', 20, [note('C1', 100, 1.0)]),
      folder('P', 80, [note('P1', 50, 1.0), note('P2', 50, null)]),
    ])
    expect(analyzeSituation(imp)).toBe('imposible')
    // sin datos
    expect(analyzeSituation(subject([]))).toBe('sin_datos')
  })

  it('scenariosFor da parejo y sesgados para 2 pendientes', () => {
    const s = subject([
      folder('Controles', 20, [note('C1', 100, 4.0, 'c1'), note('C2', 100, null, 'c2')]),
      folder('Pruebas', 80, [note('P1', 100, null, 'p1')]),
    ])
    const sc = scenariosFor(s)
    expect(sc).not.toBeNull()
    expect(sc!.balanced).not.toBeNull()
    // el promedio final de cada escenario alcanza a aprobar
    for (const k of ['balanced', 'higherFirst', 'higherSecond'] as const) {
      if (sc![k]) expect(sc![k]!.final).toBeGreaterThanOrEqual(4.0 - 1e-9)
    }
  })

  it('funciona con una escala distinta (0–10, aprueba 5)', () => {
    const s: Subject = {
      id: 'x',
      name: 'Otra',
      scale: { min: 0, max: 10, pass: 5 },
      nodes: [folder('Notas', 100, [note('A', 50, 6.0), note('B', 50, null, 'b')])],
    }
    expect(currentGrade(s)).toBeCloseTo(6.0)
    expect(maxPossibleFinal(s)).toBeCloseTo(0.5 * 6 + 0.5 * 10) // 8
    expect(minGradeToPass(s).needed).toBe(4.0) // (5 - 0.5*6)/0.5 = 4
    expect(analyzeSituation(s)).toBe('facil')
    expect(impactTable(s, 'b').length).toBeGreaterThan(0)
  })
})
