import { describe, expect, it } from 'vitest'
import type { ActiveSession, Session } from '../../lib/types'
import {
  activeModuleCount, dailyTotals, daysStudied, hourDistribution, lastNDays, mostProductivePart, peakWindow,
  productivityTrend, rangeKeys, thisWeekMs, todayMs, weekdayAverages, weeklyTotals, withActive,
} from './insights'

const at = (iso: string) => new Date(iso).getTime()
const MIN = 60000
const mk = (start: string, minutes: number, extra: Partial<Session> = {}): Session => ({
  id: start, moduleId: 'm1', topicIds: [], start: at(start), end: at(start) + minutes * MIN, pausedMs: 0, ...extra,
})
// Thursday 29 Oct 2026, 12:00
const NOW = at('2026-10-29T12:00:00')

describe('today and week', () => {
  it('counts late-night sessions toward the previous day', () => {
    const s = [mk('2026-10-29T02:00:00', 30), mk('2026-10-29T10:00:00', 20)]
    expect(todayMs(s, NOW)).toBe(20 * MIN)
  })
  it('includes the active session', () => {
    const active: ActiveSession = { id: 'a', moduleId: 'm1', topicIds: [], start: NOW - 30 * MIN, pauses: [{ start: NOW - 20 * MIN, end: NOW - 10 * MIN }] }
    expect(todayMs(withActive([], active, NOW), NOW)).toBe(20 * MIN)
  })
  it('uses a Monday-based week', () => {
    const s = [mk('2026-10-25T10:00:00', 60), mk('2026-10-26T10:00:00', 30), mk('2026-10-29T10:00:00', 10)]
    expect(thisWeekMs(s, NOW)).toBe(40 * MIN)
  })
})

describe('counts', () => {
  it('counts active modules in the last 30 days', () => {
    const s = [mk('2026-10-28T10:00:00', 10), mk('2026-09-30T10:00:00', 10, { moduleId: 'm2' }), mk('2026-09-29T10:00:00', 10, { moduleId: 'm3' })]
    expect(activeModuleCount(s, NOW)).toBe(2)
  })
  it('counts days studied out of days since the first session, capped at 7', () => {
    const s = [mk('2026-10-27T10:00:00', 10), mk('2026-10-29T10:00:00', 10)]
    expect(daysStudied(s, NOW)).toEqual({ studied: 2, of: 3 })
    expect(daysStudied([mk('2026-09-01T10:00:00', 10), ...s], NOW)).toEqual({ studied: 2, of: 7 })
    expect(daysStudied([], NOW)).toEqual({ studied: 0, of: 0 })
  })
  it('builds the last 7 days ending today', () => {
    const days = lastNDays([mk('2026-10-23T10:00:00', 32)], NOW, 7)
    expect(days.map((d) => d.key)).toEqual(['2026-10-23', '2026-10-24', '2026-10-25', '2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29'])
    expect(days[0].ms).toBe(32 * MIN)
  })
})

describe('ranges', () => {
  it('covers 7 / 30 days and all time from the first session', () => {
    expect(rangeKeys('week', [], NOW)).toHaveLength(7)
    expect(rangeKeys('month', [], NOW)).toHaveLength(30)
    const all = rangeKeys('all', [mk('2026-10-20T10:00:00', 10)], NOW)
    expect(all[0]).toBe('2026-10-20')
    expect(all).toHaveLength(10)
  })
  it('groups totals by Monday week', () => {
    const s = [mk('2026-10-20T10:00:00', 10), mk('2026-10-25T10:00:00', 5), mk('2026-10-27T10:00:00', 20)]
    const weeks = weeklyTotals(s, rangeKeys('all', s, NOW))
    expect(weeks.map((w) => [w.key, w.ms / MIN])).toEqual([['2026-10-19', 15], ['2026-10-26', 20]])
    expect(dailyTotals(s, ['2026-10-27']).map((d) => d.ms)).toEqual([20 * MIN])
  })
})

describe('time of day', () => {
  it('splits sessions across the hours they span, excluding paused time', () => {
    const h = hourDistribution([mk('2026-10-28T22:30:00', 120, { pausedMs: 60 * MIN })])
    // 2h wall clock, half paused: 22 → 15m, 23 → 30m, 00 → 15m
    expect(h[22]).toBe(15 * MIN)
    expect(h[23]).toBe(30 * MIN)
    expect(h[0]).toBe(15 * MIN)
  })
  it('finds the busiest window, wrapping midnight and trimming empty edges', () => {
    const h = hourDistribution([mk('2026-10-28T22:00:00', 180)])
    expect(peakWindow(h)).toEqual({ from: 22, to: 1 })
    expect(peakWindow(hourDistribution([mk('2026-10-28T10:00:00', 45)]))).toEqual({ from: 10, to: 11 })
    expect(peakWindow(Array(24).fill(0))).toBeNull()
  })
  it('averages per weekday, Monday first', () => {
    const keys = rangeKeys('month', [], NOW)
    const avg = weekdayAverages([mk('2026-10-26T10:00:00', 40)], keys)
    expect(avg[0].label).toBe('Mon')
    // Four Mondays in the last 30 days (5, 12, 19, 26 Oct)
    expect(avg[0].ms).toBe(10 * MIN)
    expect(avg[3].ms).toBe(0)
  })
})

describe('productivity', () => {
  it('averages ratings per week', () => {
    const s = [
      mk('2026-10-20T10:00:00', 10, { productivity: 2 }), mk('2026-10-21T10:00:00', 10, { productivity: 4 }),
      mk('2026-10-27T10:00:00', 10, { productivity: 5 }), mk('2026-10-28T10:00:00', 10),
    ]
    expect(productivityTrend(s, 'week').map((p) => [p.key, p.avg])).toEqual([['2026-10-19', 3], ['2026-10-26', 5]])
  })
  it('needs five rated sessions for the most productive part of the day', () => {
    const s = [
      mk('2026-10-20T09:00:00', 10, { productivity: 2 }), mk('2026-10-21T09:00:00', 10, { productivity: 3 }),
      mk('2026-10-22T19:00:00', 10, { productivity: 5 }), mk('2026-10-23T20:00:00', 10, { productivity: 4 }),
    ]
    expect(mostProductivePart(s)).toBeNull()
    expect(mostProductivePart([...s, mk('2026-10-24T14:00:00', 10, { productivity: 5 })])).toBe('evenings')
  })
})
