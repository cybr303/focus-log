import { describe, expect, it } from 'vitest'
import type { Module, Session } from '../../lib/types'
import { beatCaption, beatProgress, formatRemaining, formatTarget, pickDefaultModule, toggleId, topicNames } from './progress'

const min = 60000
const mod = (id: string): Module => ({
  id, name: id, color: '#0A84FF', emoji: '📦', createdAt: 0,
  topics: [{ id: 't1', name: 'UD6', createdAt: 0 }, { id: 't2', name: 'UD7', createdAt: 0 }],
})
const sess = (moduleId: string, start: number): Session => ({ id: String(start), moduleId, topicIds: [], start, end: start + min, pausedMs: 0 })

describe('beatProgress', () => {
  it('is "first" without history', () => {
    expect(beatProgress(5 * min, 0)).toEqual({ kind: 'first' })
    expect(beatCaption({ kind: 'first' }, 'Envases')).toBe('First Envases session — set the bar!')
  })
  it('tracks the remaining time', () => {
    const p = beatProgress(10 * min, 40 * min)
    expect(p).toMatchObject({ kind: 'chasing', fraction: 0.25, remainingMs: 30 * min })
    expect(beatCaption(p, 'Envases')).toBe('30m to beat your usual Envases session')
  })
  it('flips to beaten at the average', () => {
    expect(beatProgress(40 * min, 40 * min).kind).toBe('beaten')
  })
  it('rounds remaining up and targets to nearest', () => {
    expect(formatRemaining(10_000)).toBe('1m')
    expect(formatRemaining(61 * min)).toBe('1h 1m')
    expect(formatTarget(36.4 * min)).toBe('36m')
    expect(formatTarget(5000)).toBe('1m')
  })
})

describe('helpers', () => {
  it('maps topic names and skips missing ones', () => {
    expect(topicNames(mod('a'), ['t2', 'gone', 't1'])).toEqual(['UD7', 'UD6'])
    expect(topicNames(undefined, ['t1'])).toEqual([])
  })
  it('toggles ids', () => {
    expect(toggleId(['a'], 'b')).toEqual(['a', 'b'])
    expect(toggleId(['a', 'b'], 'a')).toEqual(['b'])
  })
  it('picks a default module', () => {
    const mods = [mod('a'), mod('b'), mod('c')]
    expect(pickDefaultModule(mods, [], 'b')).toBe('b')
    expect(pickDefaultModule(mods, [sess('c', 2), sess('a', 1)], 'deleted')).toBe('c')
    expect(pickDefaultModule(mods, [], null)).toBe('a')
    expect(pickDefaultModule([], [], 'a')).toBeNull()
  })
})
