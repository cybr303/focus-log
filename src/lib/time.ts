import { addDays, format, startOfDay, subHours } from 'date-fns'

/** A study "day" runs from 04:00 to 03:59 the next morning, so late nights count toward the previous day. */
export const DAY_CUTOFF_HOUR = 4

/** Local midnight of the study day that `ts` belongs to. */
export const studyDay = (ts: number | Date): Date => startOfDay(subHours(ts, DAY_CUTOFF_HOUR))

/** 'yyyy-MM-dd' key of the study day that `ts` belongs to. */
export const dayKey = (ts: number | Date): string => format(studyDay(ts), 'yyyy-MM-dd')

/** Key of the day `n` days after `day` (a Date at local midnight, e.g. from studyDay). */
export const shiftDayKey = (day: Date, n: number): string => format(addDays(day, n), 'yyyy-MM-dd')

/** '1h 12m', '40m', '0m'. */
export const formatDuration = (ms: number): string => {
  const totalMin = Math.floor(Math.max(0, ms) / 60000)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h === 0) return `${m}m`
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

/** Stopwatch display: '00:45' (mm:ss) or '1:02:45' (h:mm:ss). */
export const formatClock = (ms: number): string => {
  const total = Math.floor(Math.max(0, ms) / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}
