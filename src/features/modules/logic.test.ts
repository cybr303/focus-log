import { describe, expect, it } from 'vitest'
import { cleanEmoji, examLabel, moduleNameError, topicNameError } from './logic'

const at = (iso: string) => new Date(iso).getTime()

describe('module logic', () => {
  const mods = [{ id: 'a', name: 'Algorithms' }, { id: 'b', name: 'Chemistry' }]

  it('validates module names', () => {
    expect(moduleNameError('  ', mods)).toMatch(/name/)
    expect(moduleNameError(' algorithms ', mods)).toMatch(/already exists/)
    expect(moduleNameError('Algorithms', mods, 'a')).toBeNull()
    expect(moduleNameError('Physics', mods)).toBeNull()
  })

  it('validates topic names', () => {
    const topics = [{ id: 't1', name: 'Graphs' }]
    expect(topicNameError('', topics)).toMatch(/empty/)
    expect(topicNameError('GRAPHS', topics)).toMatch(/exists/)
    expect(topicNameError('Graphs', topics, 't1')).toBeNull()
    expect(topicNameError('Trees', topics)).toBeNull()
  })

  it('labels exam countdowns using the 4am study day', () => {
    const now = at('2026-10-29T12:00:00')
    expect(examLabel('2026-11-10', now)).toBe('Exam in 12 days')
    expect(examLabel('2026-10-30', now)).toBe('Exam tomorrow')
    expect(examLabel('2026-10-29', now)).toBe('Exam today')
    expect(examLabel('2026-10-28', now)).toBe('Exam was yesterday')
    expect(examLabel('2026-10-26', now)).toBe('Exam was 3 days ago')
    // 2am on the 30th still belongs to the 29th's study day
    expect(examLabel('2026-10-30', at('2026-10-30T02:00:00'))).toBe('Exam tomorrow')
  })

  it('keeps one emoji from custom input', () => {
    expect(cleanEmoji(' 🚀🚀 ')).toBe('🚀')
    expect(cleanEmoji('👩‍💻x')).toBe('👩‍💻')
    expect(cleanEmoji('')).toBe('')
  })
})
