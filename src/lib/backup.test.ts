import { describe, expect, it } from 'vitest'
import { backupFilename, buildBackup, parseBackup, summarizeData } from './backup'
import type { AppData } from './types'

const sample = (): AppData => ({
  modules: [
    {
      id: 'm1', name: 'Algorithms', color: '#0A84FF', emoji: '💻', createdAt: 1,
      topics: [{ id: 't1', name: 'Graphs', createdAt: 2 }, { id: 't2', name: 'DP', createdAt: 3 }],
      examDate: '2026-12-01',
    },
    { id: 'm2', name: 'Chemistry', color: '#30D158', emoji: '🧪', createdAt: 4, topics: [] },
  ],
  sessions: [
    { id: 's1', moduleId: 'm1', topicIds: ['t1', 't2'], start: 1000, end: 5000, pausedMs: 500, productivity: 4, note: 'ok' },
    { id: 's2', moduleId: 'm2', topicIds: [], start: 6000, end: 9000, pausedMs: 0, manual: true },
  ],
  active: { id: 'a1', moduleId: 'm1', topicIds: ['t1'], start: 10000, pauses: [{ start: 11000, end: 12000 }, { start: 13000 }] },
})

const text = (data: unknown, extra: Record<string, unknown> = {}) =>
  JSON.stringify({ app: 'focuslog', version: 1, exportedAt: '2026-10-29T10:00:00.000Z', data, ...extra })

const errorOf = (json: unknown) => {
  const r = parseBackup(json)
  expect(r.ok).toBe(false)
  return r.ok ? '' : r.error
}

describe('backup', () => {
  it('round-trips an export', () => {
    const data = sample()
    const r = parseBackup(JSON.stringify(buildBackup(data, 0)))
    expect(r).toEqual({ ok: true, data })
  })

  it('accepts an already-parsed object and empty data', () => {
    expect(parseBackup({ app: 'focuslog', version: 1, data: { modules: [], sessions: [], active: null } })).toEqual({
      ok: true, data: { modules: [], sessions: [], active: null },
    })
  })

  it('treats a missing active session as none and drops unknown fields', () => {
    const data = sample() as unknown as Record<string, unknown>
    delete data.active
    ;(data.modules as Record<string, unknown>[])[0].junk = 'x'
    const r = parseBackup(text(data))
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.data.active).toBeNull()
      expect(r.data.modules[0]).not.toHaveProperty('junk')
    }
  })

  it('rejects non-JSON and foreign files', () => {
    expect(errorOf('not json {')).toMatch(/valid JSON/)
    expect(errorOf('[1,2,3]')).toMatch(/FocusLog backup/)
    expect(errorOf(JSON.stringify({ app: 'other', version: 1, data: {} }))).toMatch(/FocusLog backup/)
    expect(errorOf(text(sample(), { version: 2 }))).toMatch(/version/)
    expect(errorOf(JSON.stringify({ app: 'focuslog', version: 1 }))).toMatch(/data/)
  })

  it('rejects malformed modules and topics', () => {
    const bad = (fn: (d: AppData) => void) => {
      const d = sample()
      fn(d)
      return errorOf(text(d))
    }
    expect(bad((d) => ((d as unknown as Record<string, unknown>).modules = 'nope'))).toMatch(/Modules is not a list/)
    expect(bad((d) => ((d.modules[0] as unknown as Record<string, unknown>).name = 42))).toMatch(/Module 1.*name/)
    expect(bad((d) => (d.modules[1].name = '  '))).toMatch(/Module 2.*empty/)
    expect(bad((d) => (d.modules[0].color = 'red'))).toMatch(/colour/)
    expect(bad((d) => (d.modules[0].examDate = '1 Dec'))).toMatch(/exam date/)
    expect(bad((d) => ((d.modules[0].topics[1] as unknown as Record<string, unknown>).createdAt = 'x'))).toMatch(/topic 2/)
    expect(bad((d) => (d.modules[1].id = 'm1'))).toMatch(/same id/)
    expect(bad((d) => (d.modules[0].topics[1].id = 't1'))).toMatch(/duplicate topic/)
  })

  it('rejects malformed sessions', () => {
    const bad = (fn: (d: AppData) => void) => {
      const d = sample()
      fn(d)
      return errorOf(text(d))
    }
    expect(bad((d) => (d.sessions[0].moduleId = 'ghost'))).toMatch(/Session 1.*module/)
    expect(bad((d) => (d.sessions[1].topicIds = ['t1']))).toMatch(/Session 2.*topic/)
    expect(bad((d) => ((d.sessions[0] as unknown as Record<string, unknown>).topicIds = [1]))).toMatch(/ids/)
    expect(bad((d) => (d.sessions[0].end = 0))).toMatch(/ends before/)
    expect(bad((d) => (d.sessions[0].pausedMs = -1))).toMatch(/paused/)
    expect(bad((d) => ((d.sessions[0] as unknown as Record<string, unknown>).start = 'yesterday'))).toMatch(/start/)
    expect(bad((d) => ((d.sessions[0] as unknown as Record<string, unknown>).productivity = 7))).toMatch(/productivity/)
    expect(bad((d) => ((d.sessions[0] as unknown as Record<string, unknown>).note = 5))).toMatch(/note/)
    expect(bad((d) => (d.sessions[1].id = 's1'))).toMatch(/same id/)
    expect(bad((d) => ((d.active as unknown as Record<string, unknown>).pauses = null))).toMatch(/running session/)
    expect(bad((d) => (d.active!.moduleId = 'ghost'))).toMatch(/running session/)
  })

  it('summarizes and names files', () => {
    expect(summarizeData(sample())).toBe('2 modules, 2 sessions')
    expect(summarizeData({ modules: [sample().modules[0]], sessions: [], active: null })).toBe('1 module, 0 sessions')
    expect(backupFilename(new Date('2026-10-29T12:00:00').getTime())).toBe('focuslog-backup-2026-10-29.json')
  })
})
