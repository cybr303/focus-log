import { describe, expect, it } from 'vitest'
import type { Module, Session } from '../../lib/types'
import { buildMonthGrid, countdownLabel, daysUntil, heatLevel, upcomingExams } from './calendar'
import { dayLabel, groupByDay } from './grouping'
import { formStart, formToSession, newForm, sessionToForm, validateForm, type SessionForm } from './sessionForm'

const at = (iso: string) => new Date(iso).getTime()
const MIN = 60000
const mk = (start: string, minutes: number, extra: Partial<Session> = {}): Session => ({
  id: start, moduleId: 'm1', topicIds: ['t1'], start: at(start), end: at(start) + minutes * MIN, pausedMs: 0, ...extra,
})
const mod = (extra: Partial<Module> = {}): Module => ({
  id: 'm1', name: 'Envases', color: '#0A84FF', emoji: '📦', topics: [{ id: 't1', name: 'Glass', createdAt: 0 }], createdAt: 0, ...extra,
})
const NOW = at('2026-10-29T12:00:00')

describe('groupByDay', () => {
  it('groups by study day, newest first, with totals', () => {
    const groups = groupByDay([
      mk('2026-10-28T10:00:00', 30),
      mk('2026-10-29T02:00:00', 20), // after midnight → 28th
      mk('2026-10-29T09:00:00', 45, { pausedMs: 15 * MIN }),
    ])
    expect(groups.map((g) => g.key)).toEqual(['2026-10-29', '2026-10-28'])
    expect(groups[0].total).toBe(30 * MIN)
    expect(groups[1].total).toBe(50 * MIN)
    expect(groups[1].sessions[0].start).toBe(at('2026-10-29T02:00:00'))
  })
  it('labels days', () => {
    expect(dayLabel('2026-10-29', NOW)).toBe('Today')
    expect(dayLabel('2026-10-28', NOW)).toBe('Yesterday')
    expect(dayLabel('2026-10-26', NOW)).toBe('Mon 26 Oct')
    expect(dayLabel('2026-10-28', at('2026-10-29T03:00:00'))).toBe('Today')
  })
})

describe('calendar', () => {
  it('builds Monday-first full weeks', () => {
    const grid = buildMonthGrid(new Date(2026, 9, 15)) // Oct 2026 starts on Thursday
    expect(grid[0][0].key).toBe('2026-09-28')
    expect(grid[0][0].inMonth).toBe(false)
    expect(grid[0][3].key).toBe('2026-10-01')
    expect(grid.every((w) => w.length === 7)).toBe(true)
    expect(grid[grid.length - 1][6].key).toBe('2026-11-01')
    expect(grid.length).toBe(5)
  })
  it('handles a month starting on Monday', () => {
    const grid = buildMonthGrid(new Date(2026, 5, 1)) // June 2026
    expect(grid[0][0].key).toBe('2026-06-01')
  })
  it('buckets heat', () => {
    expect(heatLevel(0)).toBe(0)
    expect(heatLevel(10 * MIN)).toBe(1)
    expect(heatLevel(60 * MIN)).toBe(2)
    expect(heatLevel(120 * MIN)).toBe(3)
    expect(heatLevel(300 * MIN)).toBe(4)
  })
  it('counts down to exams', () => {
    expect(daysUntil('2026-10-29', NOW)).toBe(0)
    expect(daysUntil('2026-11-10', NOW)).toBe(12)
    expect(countdownLabel(0)).toBe('today')
    expect(countdownLabel(1)).toBe('tomorrow')
    expect(countdownLabel(12)).toBe('in 12 days')
    const mods = [
      mod({ id: 'a', examDate: '2026-12-20' }),
      mod({ id: 'b', examDate: '2026-11-01' }),
      mod({ id: 'c', examDate: '2026-10-01' }),
      mod({ id: 'd' }),
    ]
    expect(upcomingExams(mods, NOW).map((e) => e.module.id)).toEqual(['b', 'a'])
    expect(upcomingExams(mods, NOW, 30).map((e) => e.module.id)).toEqual(['b'])
  })
})

describe('session form', () => {
  const form = (extra: Partial<SessionForm> = {}): SessionForm => ({
    moduleId: 'm1', topicIds: ['t1'], date: '2026-10-28', time: '14:00', hours: '1', minutes: '30', note: '', ...extra,
  })

  it('maps times before 4am onto the next calendar morning', () => {
    expect(formStart(form({ time: '01:30' }))).toBe(at('2026-10-29T01:30:00'))
    expect(formStart(form({ time: '04:00' }))).toBe(at('2026-10-28T04:00:00'))
    expect(formStart(form({ date: 'bad' }))).toBeNaN()
  })
  it('validates', () => {
    expect(validateForm(form(), mod(), NOW)).toBeNull()
    expect(validateForm(form(), undefined, NOW)).toMatch(/module/)
    expect(validateForm(form({ topicIds: [] }), mod(), NOW)).toMatch(/topic/)
    expect(validateForm(form({ topicIds: [] }), mod({ topics: [] }), NOW)).toBeNull()
    expect(validateForm(form({ hours: '0', minutes: '0' }), mod(), NOW)).toMatch(/more than 0/)
    expect(validateForm(form({ hours: '16', minutes: '1' }), mod(), NOW)).toMatch(/16 hours/)
    expect(validateForm(form({ hours: '16', minutes: '' }), mod(), NOW)).toBeNull()
    expect(validateForm(form({ hours: '-1' }), mod(), NOW)).toMatch(/valid duration/)
    expect(validateForm(form({ date: '2026-10-29', time: '11:00' }), mod(), NOW)).toMatch(/future/)
  })
  it('creates manual sessions', () => {
    const s = formToSession(form({ productivity: 4, note: '  ok ' }))
    expect(s).toEqual({
      moduleId: 'm1', topicIds: ['t1'], start: at('2026-10-28T14:00:00'), end: at('2026-10-28T15:30:00'),
      pausedMs: 0, productivity: 4, note: 'ok', manual: true,
    })
  })
  it('keeps pauses when only other fields change', () => {
    const orig = mk('2026-10-28T14:00:20', 100, { pausedMs: 10 * MIN })
    const f = sessionToForm(orig)
    expect(f).toMatchObject({ date: '2026-10-28', time: '14:00', hours: '1', minutes: '30' })
    const s = formToSession({ ...f, note: 'x' }, orig)
    expect(s.start).toBe(orig.start)
    expect(s.end).toBe(orig.end)
    expect(s.pausedMs).toBe(10 * MIN)
    expect(s.manual).toBeUndefined()
  })
  it('drops pauses when the duration changes', () => {
    const orig = mk('2026-10-28T14:00:00', 100, { pausedMs: 10 * MIN })
    const s = formToSession({ ...sessionToForm(orig), hours: '2', minutes: '0' }, orig)
    expect(s.end).toBe(at('2026-10-28T16:00:00'))
    expect(s.pausedMs).toBe(0)
  })
  it('defaults new forms sensibly', () => {
    expect(newForm(NOW, 'm1')).toMatchObject({ date: '2026-10-29', time: '11:00' })
    expect(newForm(NOW, 'm1', '2026-10-20')).toMatchObject({ date: '2026-10-20', time: '18:00' })
    expect(newForm(at('2026-10-29T04:30:00'), 'm1')).toMatchObject({ date: '2026-10-28', time: '03:30' })
  })
})
