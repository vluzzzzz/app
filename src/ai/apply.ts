import { useAppStore } from '../store/useAppStore'
import type { Subject } from '../lib/types'
import type { AiAction } from './types'

const norm = (s: string) => s.trim().toLowerCase()

function findSubject(subjects: Subject[], name: string): Subject | undefined {
  return subjects.find((s) => norm(s.name) === norm(name))
}

function findSubdivisionId(
  subject: Subject,
  name?: string | null,
): string | null {
  if (!name) return null
  const d = subject.subdivisions.find((x) => norm(x.name) === norm(name))
  return d ? d.id : null
}

/** Busca una evaluación por nombre en toda la asignatura. */
function findEval(
  subject: Subject,
  evalName: string,
  subName?: string | null,
): { subId: string | null; evalId: string } | null {
  const match = (arr: { id: string; name: string }[]) =>
    arr.find((e) => norm(e.name) === norm(evalName))
  if (subject.subdivisions.length > 0) {
    for (const d of subject.subdivisions) {
      if (subName && norm(d.name) !== norm(subName)) continue
      const e = match(d.evaluations)
      if (e) return { subId: d.id, evalId: e.id }
    }
    return null
  }
  const e = match(subject.looseEvaluations)
  return e ? { subId: null, evalId: e.id } : null
}

/**
 * Ejecuta las acciones de la IA sobre el store. Devuelve un resumen legible de lo
 * aplicado (para mostrar chips). Ignora acciones que no se puedan resolver.
 */
export function applyActions(actions: AiAction[]): string[] {
  const applied: string[] = []
  const store = useAppStore.getState()

  for (const a of actions) {
    // Estado fresco tras cada acción (para resolver ids recién creados).
    const subjects = useAppStore.getState().subjects

    switch (a.type) {
      case 'create_subject': {
        store.addSubject({
          name: a.name,
          color: a.color,
          subdivisions: a.subdivisions,
        })
        applied.push(`Creé ${a.name}`)
        break
      }
      case 'add_evaluation': {
        const s = findSubject(subjects, a.subject)
        if (!s) break
        const subId = findSubdivisionId(s, a.subdivision)
        store.addEvaluationWith(s.id, subId, a.name, a.grade ?? null)
        applied.push(
          `Agregué ${a.name}${a.grade != null ? ` (${a.grade})` : ''} en ${a.subject}`,
        )
        break
      }
      case 'set_grade': {
        const s = findSubject(subjects, a.subject)
        if (!s) break
        const found = findEval(s, a.evaluation, a.subdivision)
        if (!found) break
        store.updateEvaluation(s.id, found.subId, found.evalId, {
          grade: a.grade,
        })
        applied.push(`Puse ${a.grade} en ${a.evaluation}`)
        break
      }
      case 'update_subdivision': {
        const s = findSubject(subjects, a.subject)
        if (!s) break
        const d = s.subdivisions.find(
          (x) => norm(x.name) === norm(a.subdivision),
        )
        if (!d) break
        store.updateSubdivision(s.id, d.id, {
          ...(a.weight != null ? { weight: a.weight } : {}),
          ...(a.name ? { name: a.name } : {}),
        })
        applied.push(`Actualicé ${a.subdivision}`)
        break
      }
      case 'remove_evaluation': {
        const s = findSubject(subjects, a.subject)
        if (!s) break
        const found = findEval(s, a.evaluation, a.subdivision)
        if (!found) break
        store.removeEvaluation(s.id, found.subId, found.evalId)
        applied.push(`Borré ${a.evaluation}`)
        break
      }
      case 'remove_subject': {
        const s = findSubject(subjects, a.subject)
        if (!s) break
        store.removeSubject(s.id)
        applied.push(`Borré ${a.subject}`)
        break
      }
    }
  }
  return applied
}
