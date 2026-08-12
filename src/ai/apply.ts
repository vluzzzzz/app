import { useAppStore } from '../store/useAppStore'
import { makeId } from '../lib/format'
import { distributeChildren } from '../lib/gradeTree'
import type { GradeNode, Subject } from '../lib/types'
import type { AiAction, AiNode } from './types'

const norm = (s: string) => s.trim().toLowerCase()

function findSubject(subjects: Subject[], name: string): Subject | undefined {
  return subjects.find((s) => norm(s.name) === norm(name))
}

/** Camina el árbol por una ruta de nombres. Devuelve el nodo o null. */
function findByPath(nodes: GradeNode[], path: string[]): GradeNode | null {
  if (!path.length) return null
  let curr: GradeNode | undefined = nodes.find((n) => norm(n.name) === norm(path[0]))
  for (let i = 1; i < path.length && curr; i++) {
    curr = (curr.children ?? []).find((n) => norm(n.name) === norm(path[i]))
  }
  return curr ?? null
}

/** Convierte el árbol que manda la IA en GradeNode[] (con ids y pesos parejos si faltan). */
function buildTree(aiNodes: AiNode[]): GradeNode[] {
  const mapped: GradeNode[] = aiNodes.map((a) =>
    a.children && a.children.length
      ? { id: makeId(), name: a.name || 'Sección', weight: a.weight ?? 0, children: buildTree(a.children) }
      : { id: makeId(), name: a.name || 'Nota', weight: a.weight ?? 0, grade: a.grade ?? null },
  )
  const sum = mapped.reduce((s, n) => s + (n.weight || 0), 0)
  return Math.abs(sum - 100) < 0.5 ? mapped : distributeChildren(mapped)
}

/**
 * Ejecuta las acciones de la IA sobre el store. Devuelve un resumen legible de lo
 * aplicado (para chips). Ignora acciones que no se puedan resolver.
 */
export function applyActions(actions: AiAction[]): string[] {
  const applied: string[] = []
  const store = useAppStore.getState()

  for (const a of actions) {
    // Estado fresco tras cada acción (para resolver nodos recién creados).
    const subjects = useAppStore.getState().subjects

    switch (a.type) {
      case 'create_subject': {
        store.addSubject({
          name: a.name,
          color: a.color,
          nodes: a.nodes ? buildTree(a.nodes) : [],
        })
        applied.push(`Creé ${a.name}`)
        break
      }
      case 'add_note': {
        const s = findSubject(subjects, a.subject)
        if (!s) break
        const path = a.path ?? []
        const parent = path.length ? findByPath(s.nodes, path) : null
        const parentId = parent ? parent.id : null
        store.addNode(s.id, parentId, { name: a.name, folder: false })
        // Poner nota si vino: buscar la recién creada por nombre bajo el padre.
        if (a.grade != null) {
          const fresh = useAppStore.getState().getSubject(s.id)
          if (fresh) {
            const siblings = parentId ? findByPath(fresh.nodes, path)?.children ?? [] : fresh.nodes
            const created = [...siblings].reverse().find((n) => norm(n.name) === norm(a.name))
            if (created) store.updateNode(s.id, created.id, { grade: a.grade })
          }
        }
        applied.push(`Agregué ${a.name}${a.grade != null ? ` (${a.grade})` : ''} en ${a.subject}`)
        break
      }
      case 'set_grade': {
        const s = findSubject(subjects, a.subject)
        if (!s) break
        const node = findByPath(s.nodes, a.path)
        if (!node || node.children !== undefined) break
        store.updateNode(s.id, node.id, { grade: a.grade })
        applied.push(`Puse ${a.grade} en ${a.path[a.path.length - 1] ?? a.subject}`)
        break
      }
      case 'update_node': {
        const s = findSubject(subjects, a.subject)
        if (!s) break
        const node = findByPath(s.nodes, a.path)
        if (!node) break
        store.updateNode(s.id, node.id, {
          ...(a.weight != null ? { weight: a.weight } : {}),
          ...(a.name ? { name: a.name } : {}),
        })
        applied.push(`Actualicé ${a.path[a.path.length - 1] ?? a.subject}`)
        break
      }
      case 'remove_node': {
        const s = findSubject(subjects, a.subject)
        if (!s) break
        const node = findByPath(s.nodes, a.path)
        if (!node) break
        store.removeNode(s.id, node.id)
        applied.push(`Borré ${a.path[a.path.length - 1] ?? ''}`.trim())
        break
      }
      case 'remove_subject': {
        const s = findSubject(subjects, a.subject)
        if (!s) break
        store.removeSubject(s.id)
        applied.push(`Borré ${a.subject}`)
        break
      }
      case 'add_task': {
        store.addTask({ title: a.title, date: a.date, time: a.time })
        applied.push(`Tarea: ${a.title}`)
        break
      }
      case 'complete_task': {
        const t = [...useAppStore.getState().tasks]
          .reverse()
          .find((t) => norm(t.title) === norm(a.title) && !t.done)
        if (!t) break
        store.updateTask(t.id, { done: true })
        applied.push(`Completé: ${a.title}`)
        break
      }
      case 'remove_task': {
        const t = [...useAppStore.getState().tasks]
          .reverse()
          .find((t) => norm(t.title) === norm(a.title))
        if (!t) break
        store.removeTask(t.id)
        applied.push(`Borré la tarea ${a.title}`)
        break
      }
      case 'add_event': {
        if (!a.date) break
        const subjectId = a.subject ? findSubject(subjects, a.subject)?.id : undefined
        store.addEvent({
          title: a.title,
          date: a.date,
          time: a.time,
          endTime: a.endTime,
          type: a.eventType ?? 'evento',
          subjectId,
          repeat: a.repeat ?? 'none',
          location: a.location,
          description: a.description,
        })
        applied.push(`Agendé: ${a.title}`)
        break
      }
      case 'remove_event': {
        const ev = [...useAppStore.getState().events]
          .reverse()
          .find((e) => norm(e.title) === norm(a.title))
        if (!ev) break
        store.removeEvent(ev.id)
        applied.push(`Borré el evento ${a.title}`)
        break
      }
      case 'clear_date': {
        if (!a.date) break
        const scope = a.scope ?? 'all'
        const st = useAppStore.getState()
        let count = 0
        if (scope !== 'tasks') {
          for (const e of st.events.filter((e) => e.date === a.date)) {
            store.removeEvent(e.id)
            count++
          }
        }
        if (scope !== 'events') {
          for (const t of st.tasks.filter((t) => t.date === a.date)) {
            store.removeTask(t.id)
            count++
          }
        }
        if (count) applied.push(`Borré ${count} cosa${count === 1 ? '' : 's'} del ${a.date}`)
        break
      }
    }
  }
  return applied
}
