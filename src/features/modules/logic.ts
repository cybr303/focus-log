import { differenceInCalendarDays, parseISO } from 'date-fns'
import { studyDay } from '../../lib/time'
import type { ID, Module, Topic } from '../../lib/types'

const norm = (s: string) => s.trim().toLocaleLowerCase()

/** Error message for a module name, or null if valid. `selfId` is the module being edited. */
export const moduleNameError = (name: string, modules: Pick<Module, 'id' | 'name'>[], selfId?: ID): string | null => {
  if (!name.trim()) return 'Give the module a name.'
  if (modules.some((m) => m.id !== selfId && norm(m.name) === norm(name))) return 'A module with this name already exists.'
  return null
}

/** Error message for a topic name within a module, or null if valid. */
export const topicNameError = (name: string, topics: Pick<Topic, 'id' | 'name'>[], selfId?: ID): string | null => {
  if (!name.trim()) return 'Topic name is empty.'
  if (topics.some((t) => t.id !== selfId && norm(t.name) === norm(name))) return 'This topic already exists.'
  return null
}

/** Days from today's study day until the exam date (negative if past). */
export const daysUntilExam = (examDate: string, now: number): number => differenceInCalendarDays(parseISO(examDate), studyDay(now))

/** 'Exam in 12 days', 'Exam tomorrow', 'Exam today', 'Exam was 3 days ago'. */
export const examLabel = (examDate: string, now: number): string => {
  const d = daysUntilExam(examDate, now)
  if (d === 0) return 'Exam today'
  if (d === 1) return 'Exam tomorrow'
  if (d > 1) return `Exam in ${d} days`
  if (d === -1) return 'Exam was yesterday'
  return `Exam was ${-d} days ago`
}

type Segmenter = { segment: (s: string) => Iterable<{ segment: string }> }
type SegmenterCtor = new (locale?: string, opts?: { granularity: 'grapheme' }) => Segmenter

/** First visible character of a custom emoji input (handles multi-code-point emoji like 👩‍💻). */
export const cleanEmoji = (input: string): string => {
  const s = input.trim()
  if (!s) return ''
  const Seg = (Intl as unknown as { Segmenter?: SegmenterCtor }).Segmenter
  if (Seg) {
    for (const { segment } of new Seg(undefined, { granularity: 'grapheme' }).segment(s)) return segment
  }
  return [...s].slice(0, 2).join('')
}
