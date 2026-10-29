import { addDays, format, parseISO } from 'date-fns'
import { sessionDuration } from '../../lib/stats'
import { DAY_CUTOFF_HOUR, dayKey } from '../../lib/time'
import type { ID, Module, Productivity, Session } from '../../lib/types'

export interface SessionForm {
  moduleId: ID
  topicIds: ID[]
  /** Study day, 'yyyy-MM-dd'. */
  date: string
  /** 'HH:mm'. Times before 04:00 fall on the next calendar morning of the study day. */
  time: string
  hours: string
  minutes: string
  productivity?: Productivity
  note: string
}

const MIN = 60000
export const MAX_DURATION_MS = 16 * 60 * MIN

/** True when `time` is after midnight but still belongs to the previous study day. */
export const isAfterMidnight = (time: string): boolean => {
  const h = Number(time.split(':')[0])
  return Number.isFinite(h) && h < DAY_CUTOFF_HOUR
}

/** Epoch ms of the form's start, or NaN if the date/time is malformed. */
export const formStart = (f: Pick<SessionForm, 'date' | 'time'>): number => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f.date) || !/^\d{2}:\d{2}$/.test(f.time)) return NaN
  const day = isAfterMidnight(f.time) ? addDays(parseISO(f.date), 1) : parseISO(f.date)
  return parseISO(`${format(day, 'yyyy-MM-dd')}T${f.time}:00`).getTime()
}

export const formDurationMs = (f: Pick<SessionForm, 'hours' | 'minutes'>): number => {
  const h = f.hours.trim() === '' ? 0 : Number(f.hours)
  const m = f.minutes.trim() === '' ? 0 : Number(f.minutes)
  if (!Number.isFinite(h) || !Number.isFinite(m) || h < 0 || m < 0) return NaN
  return Math.round((h * 60 + m) * MIN)
}

/** Blank form for a new manual session. Starts an hour ago, or at 18:00 on another day. */
export const newForm = (now: number, moduleId: ID, date?: string): SessionForm => {
  const start = now - 60 * MIN
  const useNow = !date || date === dayKey(start)
  return {
    moduleId,
    topicIds: [],
    date: useNow ? dayKey(start) : date,
    time: useNow ? format(start, 'HH:mm') : '18:00',
    hours: '1',
    minutes: '0',
    note: '',
  }
}

export const sessionToForm = (s: Session): SessionForm => {
  const mins = Math.floor(sessionDuration(s) / MIN)
  return {
    moduleId: s.moduleId,
    topicIds: [...s.topicIds],
    date: dayKey(s.start),
    time: format(s.start, 'HH:mm'),
    hours: String(Math.floor(mins / 60)),
    minutes: String(mins % 60),
    productivity: s.productivity,
    note: s.note ?? '',
  }
}

/** Returns an error message, or null when the form can be saved. */
export const validateForm = (f: SessionForm, module: Module | undefined, now: number): string | null => {
  if (!module) return 'Choose a module.'
  if (module.topics.length > 0 && f.topicIds.length === 0) return 'Pick at least one topic.'
  const start = formStart(f)
  if (Number.isNaN(start)) return 'Enter a valid date and start time.'
  const dur = formDurationMs(f)
  if (Number.isNaN(dur)) return 'Enter a valid duration.'
  if (dur <= 0) return 'Duration must be more than 0 minutes.'
  if (dur > MAX_DURATION_MS) return 'Duration can be at most 16 hours.'
  if (start + dur > now + MIN) return 'A session can’t end in the future.'
  return null
}

/**
 * Converts a valid form into session fields. When editing, an unchanged start keeps its seconds,
 * and an unchanged duration keeps the original pauses; a new duration drops them (end = start + duration).
 */
export const formToSession = (f: SessionForm, original?: Session): Omit<Session, 'id'> => {
  let start = formStart(f)
  const dur = formDurationMs(f)
  let end = start + dur
  let pausedMs = 0
  if (original) {
    if (Math.floor(original.start / MIN) * MIN === start) start = original.start
    const sameDuration = Math.floor(sessionDuration(original) / MIN) * MIN === dur
    if (sameDuration) {
      end = start + (original.end - original.start)
      pausedMs = original.pausedMs
    } else {
      end = start + dur
    }
  }
  const note = f.note.trim()
  return {
    moduleId: f.moduleId,
    topicIds: f.topicIds,
    start,
    end,
    pausedMs,
    ...(f.productivity ? { productivity: f.productivity } : {}),
    ...(note ? { note } : {}),
    ...(original ? (original.manual ? { manual: true } : {}) : { manual: true }),
  }
}
