import { formatDuration } from '../../lib/time'
import type { ID, Module, Session } from '../../lib/types'

/** Sessions shorter than this are not worth saving. */
export const MIN_SESSION_MS = 60_000

export type BeatProgress =
  | { kind: 'first' }
  | { kind: 'chasing'; fraction: number; remainingMs: number; targetMs: number }
  | { kind: 'beaten'; targetMs: number }

/** Where the running session stands against the module's average session length. */
export const beatProgress = (elapsedMs: number, averageMs: number): BeatProgress => {
  if (averageMs <= 0) return { kind: 'first' }
  if (elapsedMs >= averageMs) return { kind: 'beaten', targetMs: averageMs }
  return {
    kind: 'chasing',
    fraction: Math.max(0, elapsedMs / averageMs),
    remainingMs: averageMs - elapsedMs,
    targetMs: averageMs,
  }
}

/** Rounds up to whole minutes so "0m to beat" never shows while time is still left. */
export const formatRemaining = (ms: number): string => formatDuration(Math.ceil(ms / 60000) * 60000)

/** Target pill text, rounded to the nearest minute (min 1m). */
export const formatTarget = (ms: number): string => formatDuration(Math.max(1, Math.round(ms / 60000)) * 60000)

export const beatCaption = (p: BeatProgress, moduleName: string): string => {
  switch (p.kind) {
    case 'first':
      return `First ${moduleName} session — set the bar!`
    case 'chasing':
      return `${formatRemaining(p.remainingMs)} to beat your usual ${moduleName} session`
    case 'beaten':
      return `You beat your usual ${moduleName} session 🎉`
  }
}

/** Topic names for display, skipping ids that no longer exist. */
export const topicNames = (module: Pick<Module, 'topics'> | undefined, topicIds: ID[]): string[] =>
  module ? topicIds.map((id) => module.topics.find((t) => t.id === id)?.name).filter((n): n is string => !!n) : []

/** Toggles `id` in a selection, keeping order of first selection. */
export const toggleId = (ids: ID[], id: ID): ID[] => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id])

/** Picks the module to preselect: the remembered one if it still exists, else the most recent session's, else the first. */
export const pickDefaultModule = (modules: Module[], sessions: Session[], remembered: ID | null): ID | null => {
  if (remembered && modules.some((m) => m.id === remembered)) return remembered
  const latest = sessions.reduce<Session | null>((best, s) => (!best || s.start > best.start ? s : best), null)
  if (latest && modules.some((m) => m.id === latest.moduleId)) return latest.moduleId
  return modules[0]?.id ?? null
}

const LAST_MODULE_KEY = 'focuslog-last-module'

export const loadLastModule = (): ID | null => {
  try {
    return localStorage.getItem(LAST_MODULE_KEY)
  } catch {
    return null
  }
}

export const saveLastModule = (id: ID) => {
  try {
    localStorage.setItem(LAST_MODULE_KEY, id)
  } catch {
    // storage unavailable; preselection just falls back
  }
}
