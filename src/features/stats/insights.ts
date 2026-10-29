import { format, startOfWeek } from 'date-fns'
import { activePausedMs, sessionDuration } from '../../lib/stats'
import { dayKey, shiftDayKey, studyDay } from '../../lib/time'
import type { ActiveSession, Session } from '../../lib/types'

export type Range = 'week' | 'month' | 'all'

export interface DayPoint {
  key: string
  date: Date
  ms: number
}

/** Local midnight Date for a 'yyyy-MM-dd' key. */
export const keyToDate = (key: string): Date => new Date(key + 'T00:00:00')

/** Finished sessions plus the active one (ended at `now`), so live time shows up in totals. */
export const withActive = (sessions: Session[], active: ActiveSession | null, now: number): Session[] =>
  active
    ? [...sessions, { id: active.id, moduleId: active.moduleId, topicIds: active.topicIds, start: active.start, end: now, pausedMs: activePausedMs(active, now) }]
    : sessions

const sumWhere = (sessions: Session[], pred: (k: string) => boolean): number =>
  sessions.reduce((sum, s) => (pred(dayKey(s.start)) ? sum + sessionDuration(s) : sum), 0)

/** Monday of the study week containing `now`. */
export const studyWeekStart = (now: number): Date => startOfWeek(studyDay(now), { weekStartsOn: 1 })

export const todayMs = (sessions: Session[], now: number): number => {
  const k = dayKey(now)
  return sumWhere(sessions, (x) => x === k)
}

/** Study time in the current Monday-based study week. */
export const thisWeekMs = (sessions: Session[], now: number): number => {
  const from = format(studyWeekStart(now), 'yyyy-MM-dd')
  const to = dayKey(now)
  return sumWhere(sessions, (k) => k >= from && k <= to)
}

/** Modules with at least one session in the last `days` study days (including today). */
export const activeModuleCount = (sessions: Session[], now: number, days = 30): number => {
  const from = shiftDayKey(studyDay(now), -(days - 1))
  return new Set(sessions.filter((s) => dayKey(s.start) >= from).map((s) => s.moduleId)).size
}

/** The last `n` study days ending today, oldest first. */
export const lastNDays = (sessions: Session[], now: number, n: number): DayPoint[] => {
  const today = studyDay(now)
  const keys = Array.from({ length: n }, (_, i) => shiftDayKey(today, i - (n - 1)))
  return daySeries(sessions, keys)
}

const daySeries = (sessions: Session[], keys: string[]): DayPoint[] => {
  const map = new Map<string, number>(keys.map((k) => [k, 0]))
  for (const s of sessions) {
    const k = dayKey(s.start)
    if (map.has(k)) map.set(k, map.get(k)! + sessionDuration(s))
  }
  return keys.map((key) => ({ key, date: keyToDate(key), ms: map.get(key)! }))
}

/**
 * Days studied within the last `n` days, out of the days that could have been studied
 * (days since the first session, capped at `n`).
 */
export const daysStudied = (sessions: Session[], now: number, n = 7): { studied: number; of: number } => {
  if (!sessions.length) return { studied: 0, of: 0 }
  const first = Math.min(...sessions.map((s) => s.start))
  const span = Math.round((studyDay(now).getTime() - studyDay(first).getTime()) / 86400000) + 1
  return { studied: lastNDays(sessions, now, n).filter((d) => d.ms > 0).length, of: Math.min(n, Math.max(1, span)) }
}

/** Day keys covered by a range, oldest first. 'all' starts at the first session's day. */
export const rangeKeys = (range: Range, sessions: Session[], now: number): string[] => {
  const today = studyDay(now)
  let n = range === 'week' ? 7 : 30
  if (range === 'all') {
    if (!sessions.length) return [dayKey(now)]
    const first = studyDay(Math.min(...sessions.map((s) => s.start)))
    n = Math.max(1, Math.round((today.getTime() - first.getTime()) / 86400000) + 1)
  }
  return Array.from({ length: n }, (_, i) => shiftDayKey(today, i - (n - 1)))
}

export const sessionsInKeys = (sessions: Session[], keys: string[]): Session[] => {
  const from = keys[0]
  const to = keys[keys.length - 1]
  return sessions.filter((s) => {
    const k = dayKey(s.start)
    return k >= from && k <= to
  })
}

export const dailyTotals = (sessions: Session[], keys: string[]): DayPoint[] => daySeries(sessions, keys)

/** Totals per Monday-based study week across `keys`, oldest first. `key` is the Monday. */
export const weeklyTotals = (sessions: Session[], keys: string[]): DayPoint[] => {
  const weekOf = (k: string) => format(startOfWeek(keyToDate(k), { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const weeks: string[] = []
  for (const k of keys) {
    const w = weekOf(k)
    if (weeks[weeks.length - 1] !== w) weeks.push(w)
  }
  const map = new Map<string, number>(weeks.map((w) => [w, 0]))
  for (const s of sessions) {
    const w = weekOf(dayKey(s.start))
    if (map.has(w)) map.set(w, map.get(w)! + sessionDuration(s))
  }
  return weeks.map((key) => ({ key, date: keyToDate(key), ms: map.get(key)! }))
}

/** Study time per clock hour (0–23); sessions are split across the hours they span, paused time scaled out. */
export const hourDistribution = (sessions: Session[]): number[] => {
  const buckets = Array<number>(24).fill(0)
  for (const s of sessions) {
    const wall = s.end - s.start
    if (wall <= 0) continue
    const ratio = sessionDuration(s) / wall
    let t = s.start
    while (t < s.end) {
      const d = new Date(t)
      const next = new Date(t)
      next.setMinutes(60, 0, 0)
      const chunkEnd = Math.min(next.getTime(), s.end)
      buckets[d.getHours()] += (chunkEnd - t) * ratio
      t = chunkEnd
    }
  }
  return buckets
}

/**
 * The busiest window of up to `size` consecutive hours (wrapping past midnight), with empty
 * edge hours trimmed. `to` is exclusive, e.g. { from: 22, to: 1 } = 22:00–01:00. Null if no data.
 */
export const peakWindow = (hours: number[], size = 3): { from: number; to: number } | null => {
  if (!hours.some((h) => h > 0)) return null
  let best = -1
  let bestStart = 0
  for (let i = 0; i < 24; i++) {
    let sum = 0
    for (let j = 0; j < size; j++) sum += hours[(i + j) % 24]
    if (sum > best + 1e-9) {
      best = sum
      bestStart = i
    }
  }
  let from = bestStart
  let len = size
  while (len > 1 && hours[from % 24] === 0) {
    from++
    len--
  }
  while (len > 1 && hours[(from + len - 1) % 24] === 0) len--
  return { from: from % 24, to: (from + len) % 24 }
}

export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

/** Average study time per weekday (Monday first) across the days in `keys`, counting unstudied days as zero. */
export const weekdayAverages = (sessions: Session[], keys: string[]): { label: string; ms: number }[] => {
  const totals = Array<number>(7).fill(0)
  const counts = Array<number>(7).fill(0)
  const idx = (d: Date) => (d.getDay() + 6) % 7
  for (const p of daySeries(sessions, keys)) {
    totals[idx(p.date)] += p.ms
    counts[idx(p.date)]++
  }
  return WEEKDAYS.map((label, i) => ({ label, ms: counts[i] ? totals[i] / counts[i] : 0 }))
}

/** Average rating per day or per Monday week, only for buckets that have rated sessions. */
export const productivityTrend = (sessions: Session[], bucket: 'day' | 'week'): { key: string; date: Date; avg: number; count: number }[] => {
  const map = new Map<string, { sum: number; count: number }>()
  for (const s of sessions) {
    if (s.productivity === undefined) continue
    const day = studyDay(s.start)
    const key = format(bucket === 'week' ? startOfWeek(day, { weekStartsOn: 1 }) : day, 'yyyy-MM-dd')
    const e = map.get(key) ?? { sum: 0, count: 0 }
    e.sum += s.productivity
    e.count++
    map.set(key, e)
  }
  return [...map.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([key, e]) => ({ key, date: keyToDate(key), avg: e.sum / e.count, count: e.count }))
}

export type DayPart = 'mornings' | 'afternoons' | 'evenings' | 'nights'

export const dayPart = (ts: number): DayPart => {
  const h = new Date(ts).getHours()
  if (h >= 4 && h < 12) return 'mornings'
  if (h >= 12 && h < 17) return 'afternoons'
  if (h >= 17 && h < 22) return 'evenings'
  return 'nights'
}

/** Part of the day with the best average rating (by start time). Needs `minRated` rated sessions, else null. */
export const mostProductivePart = (sessions: Session[], minRated = 5): DayPart | null => {
  const rated = sessions.filter((s) => s.productivity !== undefined)
  if (rated.length < minRated) return null
  const map = new Map<DayPart, { sum: number; count: number }>()
  for (const s of rated) {
    const p = dayPart(s.start)
    const e = map.get(p) ?? { sum: 0, count: 0 }
    e.sum += s.productivity!
    e.count++
    map.set(p, e)
  }
  // Prefer parts with at least two ratings so a single great session doesn't win.
  const entries = [...map.entries()]
  const pool = entries.some(([, e]) => e.count >= 2) ? entries.filter(([, e]) => e.count >= 2) : entries
  pool.sort(([, a], [, b]) => b.sum / b.count - a.sum / a.count || b.count - a.count)
  return pool[0][0]
}

/** '22:00'. */
export const hourLabel = (h: number): string => `${String(h % 24).padStart(2, '0')}:00`

/** Short axis label for a day or week bucket. */
export const shortDate = (d: Date): string => format(d, 'd MMM')
