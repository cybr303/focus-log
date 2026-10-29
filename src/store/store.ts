import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { newId } from '../lib/id'
import { activePausedMs, isPaused } from '../lib/stats'
import type { ActiveSession, AppData, ID, Module, Productivity, Session } from '../lib/types'

export const STORAGE_KEY = 'focuslog-v1'

interface Actions {
  // Modules & topics
  addModule: (m: Pick<Module, 'name' | 'color' | 'emoji'> & Partial<Pick<Module, 'examDate'>>) => Module
  updateModule: (id: ID, patch: Partial<Omit<Module, 'id' | 'topics' | 'createdAt'>>) => void
  /** Deletes the module, all its sessions, and the active session if it belongs to it. */
  deleteModule: (id: ID) => void
  addTopic: (moduleId: ID, name: string) => void
  renameTopic: (moduleId: ID, topicId: ID, name: string) => void
  /** Removes the topic and strips it from any sessions that referenced it. */
  deleteTopic: (moduleId: ID, topicId: ID) => void

  // Live session
  startSession: (moduleId: ID, topicIds: ID[]) => void
  pauseSession: () => void
  resumeSession: () => void
  cancelSession: () => void
  /** Changes the topics of the running session. */
  setActiveTopics: (topicIds: ID[]) => void
  /** Ends the active session and stores it. Returns the stored session, or null if none was active. */
  finishSession: (rating?: { productivity?: Productivity; note?: string }) => Session | null

  // Finished sessions
  addSession: (s: Omit<Session, 'id'>) => Session
  updateSession: (id: ID, patch: Partial<Omit<Session, 'id'>>) => void
  deleteSession: (id: ID) => void

  // Backup
  /** Replaces all data. Caller is responsible for validating with parseBackup first. */
  replaceAll: (data: AppData) => void
}

export type Store = AppData & Actions

const mapModule = (modules: Module[], id: ID, fn: (m: Module) => Module) =>
  modules.map((m) => (m.id === id ? fn(m) : m))

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      modules: [],
      sessions: [],
      active: null,

      addModule: (input) => {
        const m: Module = { id: newId(), topics: [], createdAt: Date.now(), ...input }
        set((s) => ({ modules: [...s.modules, m] }))
        return m
      },
      updateModule: (id, patch) => set((s) => ({ modules: mapModule(s.modules, id, (m) => ({ ...m, ...patch })) })),
      deleteModule: (id) =>
        set((s) => ({
          modules: s.modules.filter((m) => m.id !== id),
          sessions: s.sessions.filter((x) => x.moduleId !== id),
          active: s.active?.moduleId === id ? null : s.active,
        })),
      addTopic: (moduleId, name) =>
        set((s) => ({
          modules: mapModule(s.modules, moduleId, (m) => ({
            ...m,
            topics: [...m.topics, { id: newId(), name: name.trim(), createdAt: Date.now() }],
          })),
        })),
      renameTopic: (moduleId, topicId, name) =>
        set((s) => ({
          modules: mapModule(s.modules, moduleId, (m) => ({
            ...m,
            topics: m.topics.map((t) => (t.id === topicId ? { ...t, name: name.trim() } : t)),
          })),
        })),
      deleteTopic: (moduleId, topicId) =>
        set((s) => ({
          modules: mapModule(s.modules, moduleId, (m) => ({ ...m, topics: m.topics.filter((t) => t.id !== topicId) })),
          sessions: s.sessions.map((x) =>
            x.topicIds.includes(topicId) ? { ...x, topicIds: x.topicIds.filter((t) => t !== topicId) } : x,
          ),
          active: s.active ? { ...s.active, topicIds: s.active.topicIds.filter((t) => t !== topicId) } : null,
        })),

      startSession: (moduleId, topicIds) => {
        if (get().active) return
        const active: ActiveSession = { id: newId(), moduleId, topicIds, start: Date.now(), pauses: [] }
        set({ active })
      },
      pauseSession: () => {
        const a = get().active
        if (!a || isPaused(a)) return
        set({ active: { ...a, pauses: [...a.pauses, { start: Date.now() }] } })
      },
      resumeSession: () => {
        const a = get().active
        if (!a || !isPaused(a)) return
        const pauses = a.pauses.slice()
        pauses[pauses.length - 1] = { ...pauses[pauses.length - 1], end: Date.now() }
        set({ active: { ...a, pauses } })
      },
      cancelSession: () => set({ active: null }),
      setActiveTopics: (topicIds) => {
        const a = get().active
        if (a) set({ active: { ...a, topicIds } })
      },
      finishSession: (rating) => {
        const a = get().active
        if (!a) return null
        const now = Date.now()
        const session: Session = {
          id: a.id,
          moduleId: a.moduleId,
          topicIds: a.topicIds,
          start: a.start,
          end: now,
          pausedMs: activePausedMs(a, now),
          ...(rating?.productivity ? { productivity: rating.productivity } : {}),
          ...(rating?.note?.trim() ? { note: rating.note.trim() } : {}),
        }
        set((s) => ({ sessions: [...s.sessions, session], active: null }))
        return session
      },

      addSession: (input) => {
        const session: Session = { id: newId(), ...input }
        set((s) => ({ sessions: [...s.sessions, session] }))
        return session
      },
      updateSession: (id, patch) =>
        set((s) => ({ sessions: s.sessions.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
      deleteSession: (id) => set((s) => ({ sessions: s.sessions.filter((x) => x.id !== id) })),

      replaceAll: (data) => set({ modules: data.modules, sessions: data.sessions, active: data.active }),
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      partialize: (s): AppData => ({ modules: s.modules, sessions: s.sessions, active: s.active }),
    },
  ),
)

/** Lookup helpers usable inside components: `const mod = useStore(selectModule(id))`. */
export const selectModule = (id: ID | undefined) => (s: Store) => s.modules.find((m) => m.id === id)

// Dev-only handle for debugging in the browser console.
if (import.meta.env.DEV) (window as unknown as { __store: typeof useStore }).__store = useStore
