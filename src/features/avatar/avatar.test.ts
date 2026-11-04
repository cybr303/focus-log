import { describe, expect, it } from 'vitest'
import { STORAGE_KEY } from '../../store/store'
import type { Session } from '../../lib/types'
import { AVATAR_STORAGE_KEY, DEFAULT_AVATAR, parseAvatar } from './avatarStore'
import { DEFAULT_EQUIPPED, HAIR_STYLES, hairStyleById, ITEMS, itemById, type Slot } from './catalog'
import { composeAvatar } from './compose'
import { computeProgress, isUnlocked, moodFor, resolveEquipped, ruleProgressLabel, unseenUnlocks } from './progress'
import { emptyGrid, H, mix, outline, painter, W } from './sprite'

const at = (iso: string) => new Date(iso).getTime()
const mk = (start: string, minutes: number, extra: Partial<Session> = {}): Session => ({
  id: start, moduleId: 'm1', topicIds: [], start: at(start), end: at(start) + minutes * 60000, pausedMs: 0, ...extra,
})
const NOW = at('2026-11-04T15:00:00')

describe('avatar storage', () => {
  it('lives under its own key, apart from the study data', () => {
    expect(AVATAR_STORAGE_KEY).not.toBe(STORAGE_KEY)
  })
})

describe('catalog', () => {
  it('has unique ids and a free default for every slot', () => {
    expect(new Set(ITEMS.map((i) => i.id)).size).toBe(ITEMS.length)
    for (const [slot, id] of Object.entries(DEFAULT_EQUIPPED)) {
      const item = itemById(id)
      expect(item?.slot).toBe(slot)
      expect(item?.unlock).toBeUndefined()
    }
  })
  it('draws every item and hair style inside the canvas', () => {
    for (const item of ITEMS) {
      const look = { ...DEFAULT_AVATAR, equipped: { ...DEFAULT_EQUIPPED, [item.slot]: item.id } }
      for (const r of composeAvatar(look, 'idle').body) {
        expect(r.x).toBeGreaterThanOrEqual(0)
        expect(r.x + r.w).toBeLessThanOrEqual(W)
        expect(r.y).toBeLessThan(H)
      }
    }
    for (const h of HAIR_STYLES) expect(composeAvatar({ ...DEFAULT_AVATAR, hairStyle: h.id }, 'happy').body.length).toBeGreaterThan(10)
  })
  it('outlines around shapes without touching filled pixels', () => {
    const g = emptyGrid()
    painter(g).px(5, 5, '#fff')
    const o = outline(g, '#000000')
    expect(o[5][5]).toBe('#fff')
    const line = o[4][5]
    expect(line).not.toBeNull()
    expect([o[6][5], o[5][4], o[5][6]]).toEqual([line, line, line])
    expect(o[4][4]).toBeNull()
    expect(mix('#000000', '#ffffff', 0.5)).toBe('#808080')
  })
})

describe('progress', () => {
  const sessions = [
    mk('2026-11-01T23:30:00', 90, { productivity: 5 }), // night
    mk('2026-11-02T07:00:00', 60, { productivity: 5 }), // early
    mk('2026-11-03T15:00:00', 30, { productivity: 3 }),
  ]
  const p = computeProgress({ modules: [{ id: 'm1', name: 'A', color: '#000000', emoji: 'x', topics: [], createdAt: 0 }], sessions }, NOW)

  it('derives achievements from existing sessions', () => {
    expect(p).toMatchObject({ hours: 3, sessions: 3, longestStreak: 3, fiveStars: 2, nightSessions: 1, earlySessions: 1, modules: 1 })
  })
  it('unlocks items by threshold', () => {
    expect(isUnlocked(itemById('cat-tail')!, p)).toBe(true) // 1h
    expect(isUnlocked(itemById('thigh-highs')!, p)).toBe(true) // 2h
    expect(isUnlocked(itemById('hoodie')!, p)).toBe(false) // 5h
    expect(isUnlocked(itemById('cat-ears')!, p)).toBe(true) // 3-day streak
    expect(ruleProgressLabel(itemById('hoodie')!.unlock!, p)).toBe('3 / 5h')
  })
  it('lists earned items not yet seen', () => {
    const ids = unseenUnlocks(p, ['cat-tail']).map((i) => i.id)
    expect(ids).toContain('coffee')
    expect(ids).not.toContain('cat-tail')
    expect(ids).not.toContain('tee-white') // free items are never "new"
  })
  it('hides bottoms under a one-piece', () => {
    const look = { ...DEFAULT_AVATAR, equipped: { ...DEFAULT_EQUIPPED, top: 'cyber-suit', bottom: 'skirt' } }
    const pink = composeAvatar(look, 'idle').body.filter((r) => r.color.toUpperCase() === '#E58FB0')
    expect(pink).toHaveLength(0)
  })
  it('falls back to defaults for locked or unknown items', () => {
    const eq = resolveEquipped({ top: 'hoodie', head: 'cat-ears', held: 'nope', face: 'cat-ears' } as Record<Slot, string>, p)
    expect(eq).toMatchObject({ top: 'tee-white', head: 'cat-ears', held: 'held-none', face: 'face-none', back: 'back-none' })
  })
})

describe('mood', () => {
  const base = { now: NOW, activeState: 'none' as const, hasUnseen: false }
  it('studies along while a session runs and dozes when paused', () => {
    expect(moodFor({ ...base, activeState: 'running', hasUnseen: true })).toBe('study')
    expect(moodFor({ ...base, activeState: 'paused' })).toBe('sleepy')
  })
  it('celebrates unlocks, is happy after a session, sleepy late at night', () => {
    expect(moodFor({ ...base, hasUnseen: true })).toBe('celebrate')
    expect(moodFor({ ...base, lastEnd: NOW - 10 * 60000 })).toBe('happy')
    expect(moodFor({ ...base, lastEnd: NOW - 3 * 3600000 })).toBe('idle')
    expect(moodFor({ ...base, now: at('2026-11-04T01:30:00') })).toBe('sleepy')
  })
})

describe('parseAvatar', () => {
  it('accepts a valid avatar and fills missing slots', () => {
    const a = parseAvatar({ name: '  Bit ', skin: 2, hairStyle: 'bob', hairColor: 3, equipped: { top: 'hoodie' }, seen: ['cat-tail', 4] })
    expect(a).toMatchObject({ name: 'Bit', skin: 2, hairStyle: 'bob', equipped: { top: 'hoodie', bottom: 'jeans' }, seen: ['cat-tail'] })
  })
  it('keeps hair styles from the first version of the character', () => {
    expect(parseAvatar({ skin: 0, hairStyle: 'curly', hairColor: 0, equipped: {} })?.hairStyle).toBe('curly')
    expect(hairStyleById('curly').id).toBe('long')
    expect(hairStyleById('spiky').name).toBe('Wolf cut')
    expect(parseAvatar({ skin: 0, hairStyle: 'bob', hairColor: 0, equipped: {} })?.eyeColor).toBe(0)
  })
  it('rejects garbage', () => {
    expect(parseAvatar(undefined)).toBeNull()
    expect(parseAvatar({ skin: 99, hairStyle: 'bob', hairColor: 0, equipped: {} })).toBeNull()
    expect(parseAvatar({ skin: 0, hairStyle: 'mohawk', hairColor: 0, equipped: {} })).toBeNull()
  })
})
