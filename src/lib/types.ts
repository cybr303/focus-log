export type ID = string

export interface Topic {
  id: ID
  name: string
  createdAt: number
}

export interface Module {
  id: ID
  name: string
  /** Hex colour, used for cards, charts and pills. */
  color: string
  emoji: string
  topics: Topic[]
  /** Exam date as a local calendar date, 'yyyy-MM-dd'. */
  examDate?: string
  createdAt: number
}

/** 1 (poor) – 5 (excellent). */
export type Productivity = 1 | 2 | 3 | 4 | 5

export interface Session {
  id: ID
  moduleId: ID
  /** One or more topics; time is split evenly between them in per-topic stats. */
  topicIds: ID[]
  /** Epoch ms. */
  start: number
  /** Epoch ms. Wall-clock end, including any paused time. */
  end: number
  /** Total paused time within [start, end]. Study time = end - start - pausedMs. */
  pausedMs: number
  productivity?: Productivity
  note?: string
  /** True when logged after the fact rather than timed live. */
  manual?: boolean
}

export interface Pause {
  start: number
  end?: number
}

/** The currently running (or paused) timed session. At most one exists. */
export interface ActiveSession {
  id: ID
  moduleId: ID
  topicIds: ID[]
  start: number
  pauses: Pause[]
}

export interface AppData {
  modules: Module[]
  sessions: Session[]
  active: ActiveSession | null
}
