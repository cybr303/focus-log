import { describe, expect, it } from 'vitest'
import { averageSessionMs, sessionDuration, streaks, totalsByTopic } from './stats'
import { dayKey, formatClock, formatDuration } from './time'
import type { Session } from './types'

const at = (iso: string) => new Date(iso).getTime()
const mk = (start: string, minutes: number, extra: Partial<Session> = {}): Session => ({
  id: start, moduleId: 'm1', topicIds: [], start: at(start), end: at(start) + minutes * 60000, pausedMs: 0, ...extra,
})

describe('time', () => {
  it('counts sessions before 4am toward the previous day', () => {
    expect(dayKey(at('2026-10-29T03:59:00'))).toBe('2026-10-28')
    expect(dayKey(at('2026-10-29T04:00:00'))).toBe('2026-10-29')
  })
  it('formats durations', () => {
    expect(formatDuration(72 * 60000)).toBe('1h 12m')
    expect(formatDuration(40 * 60000)).toBe('40m')
    expect(formatDuration(0)).toBe('0m')
    expect(formatClock(45000)).toBe('00:45')
    expect(formatClock(3765000)).toBe('1:02:45')
  })
})

describe('stats', () => {
  it('excludes paused time', () => {
    expect(sessionDuration(mk('2026-10-29T10:00:00', 30, { pausedMs: 5 * 60000 }))).toBe(25 * 60000)
  })
  it('computes current and longest streaks with the 4am cutoff', () => {
    const sessions = [
      mk('2026-10-20T10:00:00', 10),
      mk('2026-10-21T10:00:00', 10),
      mk('2026-10-22T10:00:00', 10),
      mk('2026-10-27T10:00:00', 10),
      mk('2026-10-29T01:30:00', 10), // counts as the 28th
    ]
    expect(streaks(sessions, at('2026-10-29T15:00:00'))).toEqual({ current: 2, longest: 3 })
    expect(streaks(sessions, at('2026-10-31T15:00:00')).current).toBe(0)
  })
  it('splits time evenly across topics', () => {
    const t = totalsByTopic([mk('2026-10-29T10:00:00', 60, { topicIds: ['a', 'b'] })])
    expect(t.get('a')).toBe(30 * 60000)
  })
  it('averages per module', () => {
    expect(averageSessionMs([mk('2026-10-29T10:00:00', 20), mk('2026-10-28T10:00:00', 40)], 'm1')).toBe(30 * 60000)
  })
})
