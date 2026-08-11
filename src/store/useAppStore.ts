import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { makeId } from '../lib/format'
import {
  DEFAULT_SCALE,
  type CalendarEvent,
  type ClassBlock,
  type GradeNode,
  type GradeScale,
  type Subject,
  type Task,
  type Theme,
} from '../lib/types'
import {
  distributeChildren,
  makeFolder,
  makeNote,
  mapNodeById,
  normalizeSubject,
  resizeChildren,
  withChildAdded,
  withNodeRemoved,
} from '../lib/gradeTree'
import type { ChatMessage } from '../ai/types'

/** Tareas de arranque (cuenta nueva / empezar de 0). */
export const STARTER_TASKS = ['Agregar horario de clases', 'Organizar calendario académico']

type State = {
  defaultScale: GradeScale
  subjects: Subject[]
  theme: Theme
  /** Id del color de acento de la app (ver src/lib/accents.ts). Default 'gray'. */
  accent: string
  /** Modo lite: fondo estático + animaciones reducidas (celus menos potentes). */
  lite: boolean
  /** TEMP (prueba): variante visual del fondo 1|2|3. Quitar al decidir. */
  bgVariant: 1 | 2 | 3
  /** TEMP (prueba): nivel de grano del fondo. Quitar al decidir. */
  grain: 'marked' | 'subtle'
  /** ¿El usuario ya pasó por el onboarding? (evita repetirlo). */
  onboarded: boolean
  /** Nombre del usuario (para el saludo del Inicio). */
  userName: string
  /** Cómo conoció Brody. */
  referral: string
  /** --- Perfil (sincronizado con Supabase) --- */
  country: string
  ageRange: string
  career: string
  avatar: string
  banner: string
  /** Control de cambios de nombre (máx 3 por mes). */
  nameChanges: number
  nameMonth: string
  /** Historial del chat con la IA. */
  chat: ChatMessage[]
  /** Tareas del usuario (se sincronizan con la nube). */
  tasks: Task[]
  /** Clases semanales del horario (se sincronizan con la nube). */
  classes: ClassBlock[]
  /** Eventos del calendario (se sincronizan con la nube). */
  events: CalendarEvent[]
}

/** Campos del perfil que se hidratan desde Supabase / se editan en Perfil. */
export type ProfileFields = {
  userName: string
  referral: string
  country: string
  ageRange: string
  career: string
  avatar: string
  banner: string
  nameChanges: number
  nameMonth: string
}

type Actions = {
  setDefaultScale: (scale: GradeScale) => void
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  setAccent: (accent: string) => void
  setLite: (lite: boolean) => void
  setBgVariant: (v: 1 | 2 | 3) => void
  setGrain: (g: 'marked' | 'subtle') => void
  setOnboarded: (v: boolean) => void
  setUserName: (name: string) => void
  setReferral: (r: string) => void
  /** Aplica un conjunto de campos de perfil (hidratar desde nube / editar). */
  hydrateProfile: (p: Partial<ProfileFields>) => void
  /** Aplica preferencias sincronizadas desde la nube (tema, acento, escala, lite). */
  hydratePrefs: (p: {
    theme?: Theme
    accent?: string
    defaultScale?: GradeScale
    lite?: boolean
  }) => void
  /** Borra todos los datos del usuario y vuelve al onboarding (empezar de 0). */
  resetAll: () => void
  pushChat: (m: ChatMessage) => void
  /** Reemplaza todo el historial del chat (para hidratar desde la nube). */
  setChat: (chat: ChatMessage[]) => void
  clearChat: () => void

  /** --- Tareas --- */
  /** Reemplaza todas las tareas (para hidratar desde la nube). */
  setTasks: (tasks: Task[]) => void
  /** Crea una tarea y devuelve su id. */
  addTask: (input: { title: string; time?: string; date?: string; color?: string }) => string
  updateTask: (id: string, patch: Partial<Omit<Task, 'id'>>) => void
  removeTask: (id: string) => void
  /** Alterna pendiente/hecha. */
  toggleTask: (id: string) => void

  /** Reemplaza todos los ramos (para hidratar desde la nube). Normaliza el shape. */
  setSubjects: (subjects: Subject[]) => void
  addSubject: (input: { name: string; color?: string; nodes?: GradeNode[] }) => string
  updateSubject: (id: string, patch: Partial<Omit<Subject, 'id'>>) => void
  removeSubject: (id: string) => void
  getSubject: (id: string) => Subject | undefined

  /** --- Árbol de evaluación (nodos anidados) --- */
  /** Agrega un nodo bajo `parentId` (null = sección tope). Reparte pesos parejos. */
  addNode: (
    subjectId: string,
    parentId: string | null,
    input: { name: string; folder: boolean },
  ) => void
  /** Edita un nodo (nombre / peso / nota). */
  updateNode: (
    subjectId: string,
    nodeId: string,
    patch: Partial<Pick<GradeNode, 'name' | 'weight' | 'grade'>>,
  ) => void
  removeNode: (subjectId: string, nodeId: string) => void
  /** Cambia la cantidad de notas (hojas) bajo `parentId` (null = tope). */
  setChildCount: (subjectId: string, parentId: string | null, count: number) => void
  /** Reparte 100% parejo entre los hijos de `parentId` (null = tope). */
  distributeEven: (subjectId: string, parentId: string | null) => void

  /** --- Condiciones de aprobación (opcionales) --- */
  addCondition: (subjectId: string, input: { scopeId: string; min: number }) => void
  removeCondition: (subjectId: string, condId: string) => void

  /** --- Prueba optativa (opcional) --- */
  addOptativa: (subjectId: string) => void
  removeOptativa: (subjectId: string) => void
  setOptativaGrade: (subjectId: string, grade: number | null) => void
  setOptativaSplit: (subjectId: string, actualPct: number) => void

  /** --- Horario (clases) --- */
  setClasses: (classes: ClassBlock[]) => void
  addClass: (input: Omit<ClassBlock, 'id'>) => string
  updateClass: (id: string, patch: Partial<Omit<ClassBlock, 'id'>>) => void
  removeClass: (id: string) => void

  /** --- Calendario (eventos) --- */
  setEvents: (events: CalendarEvent[]) => void
  addEvent: (input: Omit<CalendarEvent, 'id'>) => string
  updateEvent: (id: string, patch: Partial<Omit<CalendarEvent, 'id'>>) => void
  removeEvent: (id: string) => void
}

/** Aplica una transformación a una asignatura concreta de forma inmutable. */
function mapSubject(
  subjects: Subject[],
  id: string,
  fn: (s: Subject) => Subject,
): Subject[] {
  return subjects.map((s) => (s.id === id ? fn(s) : s))
}

/** Actualiza los nodos de un ramo. */
function withNodes(
  subjects: Subject[],
  subjectId: string,
  fn: (nodes: GradeNode[]) => GradeNode[],
): Subject[] {
  return mapSubject(subjects, subjectId, (s) => ({ ...s, nodes: fn(s.nodes) }))
}

export const useAppStore = create<State & Actions>()(
  persist(
    (set, get) => ({
      defaultScale: DEFAULT_SCALE,
      subjects: [],
      theme: 'light',
      accent: 'gray',
      lite: false,
      bgVariant: 1,
      grain: 'marked',
      onboarded: false,
      userName: '',
      referral: '',
      country: '',
      ageRange: '',
      career: '',
      avatar: '',
      banner: 'esmeralda',
      nameChanges: 0,
      nameMonth: '',
      chat: [],
      tasks: [],
      classes: [],
      events: [],

      setDefaultScale: (scale) => set({ defaultScale: scale }),
      setTheme: (theme) => set({ theme }),
      toggleTheme: () =>
        set((st) => ({ theme: st.theme === 'light' ? 'dark' : 'light' })),
      setAccent: (accent) => set({ accent }),
      setLite: (lite) => set({ lite }),
      setBgVariant: (bgVariant) => set({ bgVariant }),
      setGrain: (grain) => set({ grain }),
      setOnboarded: (onboarded) => set({ onboarded }),
      setUserName: (userName) => set({ userName }),
      setReferral: (referral) => set({ referral }),
      hydrateProfile: (p) => set(p),
      hydratePrefs: (p) => {
        const next: Partial<State> = {}
        if (p.theme != null) next.theme = p.theme
        if (p.accent != null) next.accent = p.accent
        if (p.defaultScale != null) next.defaultScale = p.defaultScale
        if (p.lite != null) next.lite = p.lite
        set(next)
      },
      resetAll: () =>
        set({
          subjects: [],
          chat: [],
          // Re-sembrar las tareas de arranque (como en una cuenta nueva).
          tasks: STARTER_TASKS.map((title) => ({ id: makeId(), title, done: false })),
          classes: [],
          events: [],
          userName: '',
          referral: '',
          country: '',
          ageRange: '',
          career: '',
          avatar: '',
          banner: 'esmeralda',
          nameChanges: 0,
          nameMonth: '',
          onboarded: false,
          defaultScale: DEFAULT_SCALE,
          accent: 'gray',
          theme: 'light',
        }),
      pushChat: (m) => set((st) => ({ chat: [...st.chat, m] })),
      setChat: (chat) => set({ chat }),
      clearChat: () => set({ chat: [] }),

      setTasks: (tasks) => set({ tasks }),
      addTask: ({ title, time, date, color }) => {
        const id = makeId()
        const task: Task = { id, title: title.trim() || 'Tarea', done: false, time, date, color }
        set((st) => ({ tasks: [...st.tasks, task] }))
        return id
      },
      updateTask: (id, patch) =>
        set((st) => ({
          tasks: st.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
        })),
      removeTask: (id) =>
        set((st) => ({ tasks: st.tasks.filter((t) => t.id !== id) })),
      toggleTask: (id) =>
        set((st) => ({
          tasks: st.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
        })),

      setSubjects: (subjects) =>
        set({ subjects: (subjects as unknown[]).map(normalizeSubject) }),

      addSubject: ({ name, color, nodes }) => {
        const newId = makeId()
        const subject: Subject = {
          id: newId,
          name: name.trim() || 'Asignatura',
          color: color ?? 'gray',
          scale: get().defaultScale,
          nodes: nodes ?? [],
          conditions: [],
        }
        set((st) => ({ subjects: [...st.subjects, subject] }))
        return newId
      },

      updateSubject: (id, patch) =>
        set((st) => ({
          subjects: mapSubject(st.subjects, id, (s) => ({ ...s, ...patch })),
        })),

      removeSubject: (id) =>
        set((st) => ({ subjects: st.subjects.filter((s) => s.id !== id) })),

      getSubject: (id) => get().subjects.find((s) => s.id === id),

      addNode: (subjectId, parentId, { name, folder }) =>
        set((st) => ({
          subjects: withNodes(st.subjects, subjectId, (nodes) =>
            withChildAdded(
              nodes,
              parentId,
              folder ? makeFolder(name.trim() || 'Sección') : makeNote(name.trim() || 'Nota'),
            ),
          ),
        })),

      updateNode: (subjectId, nodeId, patch) =>
        set((st) => ({
          subjects: withNodes(st.subjects, subjectId, (nodes) =>
            mapNodeById(nodes, nodeId, (n) => ({ ...n, ...patch })),
          ),
        })),

      removeNode: (subjectId, nodeId) =>
        set((st) => ({
          subjects: withNodes(st.subjects, subjectId, (nodes) => withNodeRemoved(nodes, nodeId)),
        })),

      setChildCount: (subjectId, parentId, count) =>
        set((st) => ({
          subjects: withNodes(st.subjects, subjectId, (nodes) => {
            const prefix =
              (parentId
                ? findNode(nodes, parentId)?.name
                : undefined) || 'Nota'
            return resizeChildren(nodes, parentId, count, prefix)
          }),
        })),

      distributeEven: (subjectId, parentId) =>
        set((st) => ({
          subjects: withNodes(st.subjects, subjectId, (nodes) => {
            if (parentId === null) return distributeChildren(nodes)
            return mapNodeById(nodes, parentId, (n) => ({
              ...n,
              children: distributeChildren(n.children ?? []),
            }))
          }),
        })),

      addCondition: (subjectId, { scopeId, min }) =>
        set((st) => ({
          subjects: mapSubject(st.subjects, subjectId, (s) => ({
            ...s,
            conditions: [...(s.conditions ?? []), { id: makeId(), scopeId, min }],
          })),
        })),

      removeCondition: (subjectId, condId) =>
        set((st) => ({
          subjects: mapSubject(st.subjects, subjectId, (s) => ({
            ...s,
            conditions: (s.conditions ?? []).filter((c) => c.id !== condId),
          })),
        })),

      addOptativa: (subjectId) =>
        set((st) => ({
          subjects: mapSubject(st.subjects, subjectId, (s) => ({
            ...s,
            optativa: s.optativa ?? { actualPct: 60, grade: null },
          })),
        })),
      removeOptativa: (subjectId) =>
        set((st) => ({
          subjects: mapSubject(st.subjects, subjectId, (s) => ({ ...s, optativa: undefined })),
        })),
      setOptativaGrade: (subjectId, grade) =>
        set((st) => ({
          subjects: mapSubject(st.subjects, subjectId, (s) =>
            s.optativa ? { ...s, optativa: { ...s.optativa, grade } } : s,
          ),
        })),
      setOptativaSplit: (subjectId, actualPct) =>
        set((st) => ({
          subjects: mapSubject(st.subjects, subjectId, (s) =>
            s.optativa
              ? { ...s, optativa: { ...s.optativa, actualPct: Math.min(100, Math.max(0, actualPct)) } }
              : s,
          ),
        })),

      setClasses: (classes) => set({ classes }),
      addClass: (input) => {
        const id = makeId()
        set((st) => ({ classes: [...st.classes, { ...input, id }] }))
        return id
      },
      updateClass: (id, patch) =>
        set((st) => ({
          classes: st.classes.map((c) => (c.id === id ? { ...c, ...patch } : c)),
        })),
      removeClass: (id) =>
        set((st) => ({ classes: st.classes.filter((c) => c.id !== id) })),

      setEvents: (events) => set({ events }),
      addEvent: (input) => {
        const id = makeId()
        set((st) => ({ events: [...st.events, { ...input, id }] }))
        return id
      },
      updateEvent: (id, patch) =>
        set((st) => ({
          events: st.events.map((e) => (e.id === id ? { ...e, ...patch } : e)),
        })),
      removeEvent: (id) =>
        set((st) => ({ events: st.events.filter((e) => e.id !== id) })),
    }),
    {
      name: 'salva-semestres',
      version: 4,
      // v3 (2 niveles) → v4 (árbol): normaliza cada ramo al nuevo modelo.
      migrate: (persisted: unknown, version: number) => {
        const state = persisted as Record<string, unknown>
        if (version < 4 && state && Array.isArray(state.subjects)) {
          state.subjects = (state.subjects as unknown[]).map(normalizeSubject)
        }
        return state as never
      },
    },
  ),
)

/** Busca un nodo por id en el árbol (para leer su nombre, etc.). */
function findNode(nodes: GradeNode[], id: string): GradeNode | undefined {
  for (const n of nodes) {
    if (n.id === id) return n
    if (n.children) {
      const found = findNode(n.children, id)
      if (found) return found
    }
  }
  return undefined
}
