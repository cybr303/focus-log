import { addDays, differenceInCalendarDays, endOfMonth, format, parseISO, startOfMonth, startOfWeek } from 'date-fns'
import { studyDay } from '../../lib/time'
import type { Module } from '../../lib/types'

export interface CalendarCell {
  key: string
  date: Date
  inMonth: boolean
}

/** Monday-first weeks covering the whole month of `month`, padded with neighbouring days. */
export const buildMonthGrid = (month: Date): CalendarCell[][] => {
  const first = startOfMonth(month)
  const last = endOfMonth(month)
  const weeks: CalendarCell[][] = []
  let d = startOfWeek(first, { weekStartsOn: 1 })
  while (d <= last) {
    const week: CalendarCell[] = []
    for (let i = 0; i < 7; i++) {
      week.push({ key: format(d, 'yyyy-MM-dd'), date: d, inMonth: d.getMonth() === first.getMonth() })
      d = addDays(d, 1)
    }
    weeks.push(week)
  }
  return weeks
}

const MIN = 60000
/** Heat bucket 0–4 for a day's study total. */
export const heatLevel = (ms: number): number => {
  if (ms <= 0) return 0
  if (ms < 45 * MIN) return 1
  if (ms < 90 * MIN) return 2
  if (ms < 180 * MIN) return 3
  return 4
}

/** Whole days from today's study day to a 'yyyy-MM-dd' date (negative if past). */
export const daysUntil = (dateKey: string, now: number): number =>
  differenceInCalendarDays(parseISO(dateKey), studyDay(now))

/** 'today', 'tomorrow', 'in 12 days'. */
export const countdownLabel = (days: number): string =>
  days === 0 ? 'today' : days === 1 ? 'tomorrow' : days < 0 ? `${-days} days ago` : `in ${days} days`

export interface UpcomingExam {
  module: Module
  days: number
}

/** Modules with an exam today or later, soonest first. `withinDays` limits how far ahead. */
export const upcomingExams = (modules: Module[], now: number, withinDays = Infinity): UpcomingExam[] =>
  modules
    .filter((m) => m.examDate)
    .map((module) => ({ module, days: daysUntil(module.examDate!, now) }))
    .filter((e) => e.days >= 0 && e.days <= withinDays)
    .sort((a, b) => a.days - b.days || a.module.name.localeCompare(b.module.name))
