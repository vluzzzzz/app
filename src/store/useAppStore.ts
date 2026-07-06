import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { makeId } from '../lib/format'
import {
  DEFAULT_SCALE,
  type Evaluation,
  type GradeScale,
  type Subdivision,
  type Subject,
  type Theme,
} from '../lib/types'
import type { ChatMessage } from '../ai/types'

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
  /** Cómo conoció Brody (se enviará a Supabase en Fase B; local por ahora). */
  referral: string
  /** Historial del chat con la IA. */
  chat: ChatMessage[]
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
  pushChat: (m: ChatMessage) => void
  clearChat: () => void

  /** Activa/desactiva % por nota; al activar inicializa pesos repartidos. */
  setWeightedEvals: (subjectId: string, on: boolean) => void
  /** Ajusta la cantidad de notas de una sección creando/quitando espacios vacíos. */
  setEvalCount: (
    subjectId: string,
    subId: string | null,
    count: number,
  ) => void

  addSubject: (input: {
    name: string
    color?: string
    subdivisions?: { name: string; weight: number }[]
  }) => string
  updateSubject: (id: string, patch: Partial<Omit<Subject, 'id'>>) => void
  removeSubject: (id: string) => void
  getSubject: (id: string) => Subject | undefined

  addSubdivision: (subjectId: string, name: string, weight: number) => void
  updateSubdivision: (
    subjectId: string,
    subId: string,
    patch: Partial<Omit<Subdivision, 'id'>>,
  ) => void
  removeSubdivision: (subjectId: string, subId: string) => void

  /** subId = null => evaluación suelta (sin subdivisiones). */
  addEvaluation: (subjectId: string, subId: string | null, name: string) => void
  /** Igual que addEvaluation pero creando ya con nota (para la IA). */
  addEvaluationWith: (
    subjectId: string,
    subId: string | null,
    name: string,
    grade: number | null,
  ) => void
  updateEvaluation: (
    subjectId: string,
    subId: string | null,
    evalId: string,
    patch: Partial<Omit<Evaluation, 'id'>>,
  ) => void
  removeEvaluation: (
    subjectId: string,
    subId: string | null,
    evalId: string,
  ) => void
}

/** Aplica una transformación a una asignatura concreta de forma inmutable. */
function mapSubject(
  subjects: Subject[],
  id: string,
  fn: (s: Subject) => Subject,
): Subject[] {
  return subjects.map((s) => (s.id === id ? fn(s) : s))
}

/** Aplica una transformación a una lista de evaluaciones (suelta o de subdivisión). */
function mapEvaluations(
  subject: Subject,
  subId: string | null,
  fn: (evals: Evaluation[]) => Evaluation[],
): Subject {
  if (subId == null) {
    return { ...subject, looseEvaluations: fn(subject.looseEvaluations) }
  }
  return {
    ...subject,
    subdivisions: subject.subdivisions.map((d) =>
      d.id === subId ? { ...d, evaluations: fn(d.evaluations) } : d,
    ),
  }
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
      chat: [],

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
      pushChat: (m) => set((st) => ({ chat: [...st.chat, m] })),
      clearChat: () => set({ chat: [] }),

      setWeightedEvals: (subjectId, on) =>
        set((st) => ({
          subjects: mapSubject(st.subjects, subjectId, (s) => {
            if (!on) return { ...s, weightedEvals: false }
            // Reparte pesos parejos (100/n) en cada grupo al activar.
            const distribute = (evals: Evaluation[]): Evaluation[] => {
              if (evals.length === 0) return evals
              const base = Math.round((100 / evals.length) * 10) / 10
              return evals.map((e, i) => ({
                ...e,
                weight:
                  i === evals.length - 1
                    ? Math.round((100 - base * (evals.length - 1)) * 10) / 10
                    : base,
              }))
            }
            return {
              ...s,
              weightedEvals: true,
              subdivisions: s.subdivisions.map((d) => ({
                ...d,
                evaluations: distribute(d.evaluations),
              })),
              looseEvaluations: distribute(s.looseEvaluations),
            }
          }),
        })),

      setEvalCount: (subjectId, subId, count) =>
        set((st) => ({
          subjects: mapSubject(st.subjects, subjectId, (s) => {
            const prefix =
              subId != null
                ? s.subdivisions.find((d) => d.id === subId)?.name || 'Nota'
                : 'Nota'
            const resize = (evals: Evaluation[]): Evaluation[] => {
              const next = [...evals]
              while (next.length < count) {
                next.push({
                  id: makeId(),
                  name: `${prefix} ${next.length + 1}`,
                  grade: null,
                })
              }
              while (next.length > count) {
                // Quita primero las pendientes (sin nota), desde el final.
                const idx = [...next]
                  .map((e, i) => ({ e, i }))
                  .reverse()
                  .find((x) => x.e.grade == null)?.i
                next.splice(idx ?? next.length - 1, 1)
              }
              return next
            }
            if (subId == null) {
              return { ...s, looseEvaluations: resize(s.looseEvaluations) }
            }
            return {
              ...s,
              subdivisions: s.subdivisions.map((d) =>
                d.id === subId ? { ...d, evaluations: resize(d.evaluations) } : d,
              ),
            }
          }),
        })),

      addSubject: ({ name, color, subdivisions }) => {
        const newId = makeId()
        const subject: Subject = {
          id: newId,
          name: name.trim() || 'Asignatura',
          color,
          scale: get().defaultScale,
          subdivisions: (subdivisions ?? []).map((d) => ({
            id: makeId(),
            name: d.name.trim() || 'Sección',
            weight: d.weight,
            evaluations: [],
          })),
          looseEvaluations: [],
          weightedEvals: false,
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

      addSubdivision: (subjectId, name, weight) =>
        set((st) => ({
          subjects: mapSubject(st.subjects, subjectId, (s) => ({
            ...s,
            subdivisions: [
              ...s.subdivisions,
              {
                id: makeId(),
                name: name.trim() || 'Sección',
                weight,
                evaluations: [],
              },
            ],
          })),
        })),

      updateSubdivision: (subjectId, subId, patch) =>
        set((st) => ({
          subjects: mapSubject(st.subjects, subjectId, (s) => ({
            ...s,
            subdivisions: s.subdivisions.map((d) =>
              d.id === subId ? { ...d, ...patch } : d,
            ),
          })),
        })),

      removeSubdivision: (subjectId, subId) =>
        set((st) => ({
          subjects: mapSubject(st.subjects, subjectId, (s) => ({
            ...s,
            subdivisions: s.subdivisions.filter((d) => d.id !== subId),
          })),
        })),

      addEvaluation: (subjectId, subId, name) =>
        set((st) => ({
          subjects: mapSubject(st.subjects, subjectId, (s) =>
            mapEvaluations(s, subId, (evals) => [
              ...evals,
              { id: makeId(), name: name.trim() || `Nota ${evals.length + 1}`, grade: null },
            ]),
          ),
        })),

      addEvaluationWith: (subjectId, subId, name, grade) =>
        set((st) => ({
          subjects: mapSubject(st.subjects, subjectId, (s) =>
            mapEvaluations(s, subId, (evals) => [
              ...evals,
              {
                id: makeId(),
                name: name.trim() || `Nota ${evals.length + 1}`,
                grade,
              },
            ]),
          ),
        })),

      updateEvaluation: (subjectId, subId, evalId, patch) =>
        set((st) => ({
          subjects: mapSubject(st.subjects, subjectId, (s) =>
            mapEvaluations(s, subId, (evals) =>
              evals.map((e) => (e.id === evalId ? { ...e, ...patch } : e)),
            ),
          ),
        })),

      removeEvaluation: (subjectId, subId, evalId) =>
        set((st) => ({
          subjects: mapSubject(st.subjects, subjectId, (s) =>
            mapEvaluations(s, subId, (evals) =>
              evals.filter((e) => e.id !== evalId),
            ),
          ),
        })),
    }),
    {
      name: 'salva-semestres',
      version: 3,
    },
  ),
)
