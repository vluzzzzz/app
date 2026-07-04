import { describe, it, expect } from 'vitest'
import {
  ceilTo,
  combinationsFor,
  currentGrade,
  evalWeightsValid,
  minGradeToPass,
  pendingEvaluations,
  projectedFinal,
  projectedGrade,
  weightsAreValid,
} from './grades'
import { DEFAULT_SCALE, type Subject } from './types'

let counter = 0
const id = () => `id-${counter++}`

function subject(partial: Partial<Subject>): Subject {
  return {
    id: id(),
    name: 'Test',
    scale: DEFAULT_SCALE,
    subdivisions: [],
    looseEvaluations: [],
    ...partial,
  }
}

describe('ceilTo', () => {
  it('redondea hacia arriba al 0.1', () => {
    expect(ceilTo(3.571, 0.1)).toBe(3.6)
    expect(ceilTo(4.0, 0.1)).toBe(4.0)
    expect(ceilTo(5.31, 0.1)).toBe(5.4)
  })
})

describe('minGradeToPass — escala chilena 20/80', () => {
  it('necesita exactamente 4.0 cuando control=4.0 y pruebas pendiente', () => {
    const s = subject({
      subdivisions: [
        {
          id: id(),
          name: 'Controles',
          weight: 20,
          evaluations: [{ id: id(), name: 'C1', grade: 4.0 }],
        },
        {
          id: id(),
          name: 'Pruebas',
          weight: 80,
          evaluations: [{ id: id(), name: 'P1', grade: null }],
        },
      ],
    })
    const r = minGradeToPass(s)
    expect(r.status).toBe('ALCANZABLE')
    expect(r.needed).toBe(4.0)
    expect(currentGrade(s)).toBeCloseTo(4.0)
  })

  it('marca ASEGURADO cuando incluso con la mínima se aprueba', () => {
    const s = subject({
      subdivisions: [
        {
          id: id(),
          name: 'Controles',
          weight: 20,
          evaluations: [{ id: id(), name: 'C1', grade: 7.0 }],
        },
        {
          id: id(),
          name: 'Pruebas',
          weight: 80,
          evaluations: [
            { id: id(), name: 'P1', grade: 7.0 },
            { id: id(), name: 'P2', grade: null },
          ],
        },
      ],
    })
    expect(minGradeToPass(s).status).toBe('ASEGURADO')
  })

  it('marca IMPOSIBLE cuando ni con 7.0 se alcanza', () => {
    const s = subject({
      subdivisions: [
        {
          id: id(),
          name: 'Controles',
          weight: 20,
          evaluations: [{ id: id(), name: 'C1', grade: 1.0 }],
        },
        {
          id: id(),
          name: 'Pruebas',
          weight: 80,
          evaluations: [
            { id: id(), name: 'P1', grade: 1.0 },
            { id: id(), name: 'P2', grade: null },
          ],
        },
      ],
    })
    expect(minGradeToPass(s).status).toBe('IMPOSIBLE')
  })

  it('cuando ya no queda nada pendiente devuelve la nota final', () => {
    const s = subject({
      subdivisions: [
        {
          id: id(),
          name: 'Controles',
          weight: 20,
          evaluations: [{ id: id(), name: 'C1', grade: 5.0 }],
        },
        {
          id: id(),
          name: 'Pruebas',
          weight: 80,
          evaluations: [{ id: id(), name: 'P1', grade: 6.0 }],
        },
      ],
    })
    const r = minGradeToPass(s)
    expect(r.status).toBe('ASEGURADO')
    expect(r.final).toBeCloseTo(5.8)
    expect(currentGrade(s)).toBeCloseTo(5.8)
  })

  it('reprobado ya determinado => IMPOSIBLE', () => {
    const s = subject({
      subdivisions: [
        {
          id: id(),
          name: 'Controles',
          weight: 20,
          evaluations: [{ id: id(), name: 'C1', grade: 2.0 }],
        },
        {
          id: id(),
          name: 'Pruebas',
          weight: 80,
          evaluations: [{ id: id(), name: 'P1', grade: 3.0 }],
        },
      ],
    })
    const r = minGradeToPass(s)
    expect(r.status).toBe('IMPOSIBLE')
    expect(r.final).toBeCloseTo(2.8)
  })
})

describe('evaluaciones ponderadas dentro de una subdivisión', () => {
  it('respeta los pesos 30/70', () => {
    const s = subject({
      weightedEvals: true,
      subdivisions: [
        {
          id: id(),
          name: 'Notas',
          weight: 100,
          evaluations: [
            { id: id(), name: 'Parcial', weight: 30, grade: 5.0 },
            { id: id(), name: 'Examen', weight: 70, grade: null },
          ],
        },
      ],
    })
    const r = minGradeToPass(s)
    expect(r.status).toBe('ALCANZABLE')
    expect(r.needed).toBe(3.6) // (4 - 0.3*5) / 0.7 = 3.571 -> 3.6
  })
})

describe('evaluaciones sueltas sin subdivisiones', () => {
  it('promedia por igual', () => {
    const s = subject({
      looseEvaluations: [
        { id: id(), name: 'N1', grade: 4.0 },
        { id: id(), name: 'N2', grade: null },
      ],
    })
    expect(currentGrade(s)).toBeCloseTo(4.0)
    const r = minGradeToPass(s)
    expect(r.status).toBe('ALCANZABLE')
    expect(r.needed).toBe(4.0)
  })
})

describe('casos borde', () => {
  it('SIN_DATOS cuando no hay evaluaciones', () => {
    expect(minGradeToPass(subject({})).status).toBe('SIN_DATOS')
    expect(currentGrade(subject({}))).toBeNull()
  })

  it('projectedGrade calcula la final asumiendo x en lo pendiente', () => {
    const s = subject({
      subdivisions: [
        {
          id: id(),
          name: 'Controles',
          weight: 20,
          evaluations: [{ id: id(), name: 'C1', grade: 4.0 }],
        },
        {
          id: id(),
          name: 'Pruebas',
          weight: 80,
          evaluations: [{ id: id(), name: 'P1', grade: null }],
        },
      ],
    })
    expect(projectedGrade(s, 4.0)).toBeCloseTo(4.0)
    expect(projectedGrade(s, 7.0)).toBeCloseTo(0.2 * 4 + 0.8 * 7)
  })

  it('weightsAreValid detecta que las ponderaciones no suman 100', () => {
    const bad = subject({
      subdivisions: [
        { id: id(), name: 'A', weight: 20, evaluations: [] },
        { id: id(), name: 'B', weight: 70, evaluations: [] },
      ],
    })
    expect(weightsAreValid(bad)).toBe(false)
  })
})

describe('notas que faltan (pendientes) y combinaciones', () => {
  // Caso del usuario: 3 controles (20%) + 3 pruebas (80%), tiene 2 y 2.
  function faltanUnaYUna() {
    return subject({
      subdivisions: [
        {
          id: id(),
          name: 'Controles',
          weight: 20,
          evaluations: [
            { id: 'c1', name: 'C1', grade: 5.0 },
            { id: 'c2', name: 'C2', grade: 5.0 },
            { id: 'c3', name: 'C3', grade: null },
          ],
        },
        {
          id: id(),
          name: 'Pruebas',
          weight: 80,
          evaluations: [
            { id: 'p1', name: 'P1', grade: 4.0 },
            { id: 'p2', name: 'P2', grade: 4.0 },
            { id: 'p3', name: 'P3', grade: null },
          ],
        },
      ],
    })
  }

  it('detecta exactamente 2 evaluaciones pendientes con id', () => {
    const s = faltanUnaYUna()
    const pend = pendingEvaluations(s)
    expect(pend.map((p) => p.id).sort()).toEqual(['c3', 'p3'])
  })

  it('combinationsFor entrega la tabla de trade-off para 2 pendientes', () => {
    const s = faltanUnaYUna()
    const combos = combinationsFor(s)
    expect(combos).not.toBeNull()
    expect(combos!.first.id === 'c3' || combos!.second.id === 'c3').toBe(true)
    // Todas las filas o dan una nota válida de la segunda, o marcan imposible (null).
    expect(combos!.rows.length).toBeGreaterThan(0)
    for (const r of combos!.rows) {
      expect(r.b === null || (r.b >= 1 && r.b <= 7)).toBe(true)
    }
  })

  it('projectedFinal calcula la final con notas asignadas a las pendientes', () => {
    const s = faltanUnaYUna()
    // Controles: (5+5+x)/3 * 20% ; Pruebas: (4+4+y)/3 * 80%
    const final = projectedFinal(s, { c3: 5, p3: 5 })
    // Controles avg = 5 -> 0.2*5 = 1.0 ; Pruebas avg = 13/3 -> 0.8*13/3
    const expected = 0.2 * 5 + 0.8 * (13 / 3)
    expect(final).toBeCloseTo(expected)
  })

  it('combinationsFor devuelve null si no faltan exactamente 2', () => {
    const s = subject({
      looseEvaluations: [{ id: 'n1', name: 'N1', grade: null }],
    })
    expect(combinationsFor(s)).toBeNull()
  })
})

describe('porcentaje por nota', () => {
  it('usa los pesos por nota cuando weightedEvals está activo', () => {
    const s = subject({
      weightedEvals: true,
      subdivisions: [
        {
          id: id(),
          name: 'Notas',
          weight: 100,
          evaluations: [
            { id: id(), name: 'Parcial', weight: 30, grade: 5.0 },
            { id: id(), name: 'Examen', weight: 70, grade: null },
          ],
        },
      ],
    })
    const r = minGradeToPass(s)
    expect(r.needed).toBe(3.6) // (4 - 0.3*5)/0.7 = 3.571 -> 3.6
    expect(evalWeightsValid(s)).toBe(true)
  })

  it('ignora los pesos por nota cuando weightedEvals está desactivado', () => {
    const s = subject({
      weightedEvals: false,
      subdivisions: [
        {
          id: id(),
          name: 'Notas',
          weight: 100,
          evaluations: [
            { id: id(), name: 'Parcial', weight: 30, grade: 5.0 },
            { id: id(), name: 'Examen', weight: 70, grade: null },
          ],
        },
      ],
    })
    // Promedio parejo: (4 - 0.5*5)/0.5 = 3.0
    expect(minGradeToPass(s).needed).toBe(3.0)
  })

  it('evalWeightsValid detecta % por nota que no suman 100', () => {
    const s = subject({
      weightedEvals: true,
      subdivisions: [
        {
          id: id(),
          name: 'Notas',
          weight: 100,
          evaluations: [
            { id: id(), name: 'A', weight: 30, grade: null },
            { id: id(), name: 'B', weight: 60, grade: null },
          ],
        },
      ],
    })
    expect(evalWeightsValid(s)).toBe(false)
  })
})
