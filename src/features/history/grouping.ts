import { differenceInCalendarDays, format, parseISO } from 'date-fns'
import { totalDuration } from '../../lib/stats'
import { dayKey, studyDay } from '../../lib/time'
import type { Session } from '../../lib/types'

export interface DayGroup {
  key: string
  sessions: Session[]
  total: number
}

/** Newest-first sessions grouped by study day, newest day first. */
export const groupByDay = (sessions: Session[]): DayGroup[] => {
  const sorted = [...sessions].sort((a, b) => b.start - a.start)
  const groups: DayGroup[] = []
  for (const s of sorted) {
    const key = dayKey(s.start)
    const last = groups[groups.length - 1]
    if (last && last.key === key) last.sessions.push(s)
    else groups.push({ key, sessions: [s], total: 0 })
  }
  for (const g of groups) g.total = totalDuration(g.sessions)
  return groups
}

/** 'Today', 'Yesterday' or 'Mon 26 Oct' for a 'yyyy-MM-dd' study-day key. */
export const dayLabel = (key: string, now: number): string => {
  const diff = differenceInCalendarDays(studyDay(now), parseISO(key))
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  return format(parseISO(key), 'EEE d MMM')
}

/** Start time with day context, e.g. 'Today 14:30' or 'Mon 26 Oct 09:10'. */
export const sessionWhen = (start: number, now: number): string =>
  `${dayLabel(dayKey(start), now)} ${format(start, 'HH:mm')}`
