import type { ActiveSession, ID, Session } from './types'
import { dayKey, shiftDayKey, studyDay } from './time'

/** Study time of a finished session (excludes paused time). */
export const sessionDuration = (s: Session): number => Math.max(0, s.end - s.start - s.pausedMs)

/** Paused time of an active session up to `now`. */
export const activePausedMs = (a: ActiveSession, now: number): number =>
  a.pauses.reduce((sum, p) => sum + ((p.end ?? now) - p.start), 0)

/** Study time elapsed so far in an active session. */
export const activeElapsed = (a: ActiveSession, now: number): number =>
  Math.max(0, now - a.start - activePausedMs(a, now))

export const isPaused = (a: ActiveSession): boolean => {
  const last = a.pauses[a.pauses.length - 1]
  return !!last && last.end === undefined
}

export const totalDuration = (sessions: Session[]): number =>
  sessions.reduce((sum, s) => sum + sessionDuration(s), 0)

/** Study time per study day, keyed 'yyyy-MM-dd'. A session counts toward the day it started. */
export const totalsByDay = (sessions: Session[]): Map<string, number> => {
  const map = new Map<string, number>()
  for (const s of sessions) {
    const k = dayKey(s.start)
    map.set(k, (map.get(k) ?? 0) + sessionDuration(s))
  }
  return map
}

/**
 * Streaks in study days. Any session on a day counts. The current streak stays
 * alive through today even if you haven't studied yet today.
 */
export const streaks = (sessions: Session[], now: number): { current: number; longest: number } => {
  const days = new Set(sessions.map((s) => dayKey(s.start)))
  if (days.size === 0) return { current: 0, longest: 0 }

  const today = studyDay(now)
  let current = 0
  let offset = days.has(shiftDayKey(today, 0)) ? 0 : -1
  while (days.has(shiftDayKey(today, offset))) {
    current++
    offset--
  }

  const sorted = [...days].sort()
  let longest = 0
  let run = 0
  let prev: string | null = null
  for (const k of sorted) {
    run = prev !== null && shiftDayKey(new Date(prev + 'T00:00:00'), 1) === k ? run + 1 : 1
    longest = Math.max(longest, run)
    prev = k
  }
  return { current, longest: Math.max(longest, current) }
}

/** Average study time per session for a module (0 if none). Drives the "beat your usual session" bar. */
export const averageSessionMs = (sessions: Session[], moduleId: ID): number => {
  const own = sessions.filter((s) => s.moduleId === moduleId)
  return own.length ? totalDuration(own) / own.length : 0
}

/** Average productivity rating over rated sessions, or null if none are rated. */
export const averageProductivity = (sessions: Session[]): number | null => {
  const rated = sessions.filter((s) => s.productivity !== undefined)
  if (!rated.length) return null
  return rated.reduce((sum, s) => sum + (s.productivity ?? 0), 0) / rated.length
}

/** Study time per topic; a session's time is split evenly across its topics. */
export const totalsByTopic = (sessions: Session[]): Map<ID, number> => {
  const map = new Map<ID, number>()
  for (const s of sessions) {
    if (!s.topicIds.length) continue
    const share = sessionDuration(s) / s.topicIds.length
    for (const t of s.topicIds) map.set(t, (map.get(t) ?? 0) + share)
  }
  return map
}

export const totalsByModule = (sessions: Session[]): Map<ID, number> => {
  const map = new Map<ID, number>()
  for (const s of sessions) map.set(s.moduleId, (map.get(s.moduleId) ?? 0) + sessionDuration(s))
  return map
}
