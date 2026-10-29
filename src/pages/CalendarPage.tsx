import { addMonths, format, parseISO } from 'date-fns'
import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { ModuleBadge } from '../components/ModuleBadge'
import { buildMonthGrid, countdownLabel, heatLevel, upcomingExams } from '../features/history/calendar'
import { dayLabel } from '../features/history/grouping'
import { SessionRow } from '../features/history/SessionRow'
import '../features/history/history.css'
import { totalsByDay } from '../lib/stats'
import { dayKey, formatDuration } from '../lib/time'
import type { Module } from '../lib/types'
import { useNow } from '../lib/useNow'
import { useStore } from '../store/store'

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const KEY_RE = /^\d{4}-\d{2}-\d{2}$/

export function CalendarPage() {
  const sessions = useStore((s) => s.sessions)
  const modules = useStore((s) => s.modules)
  const now = useNow(60000)
  const todayKey = dayKey(now)
  const [params, setParams] = useSearchParams()

  // Selected day and visible month live in the URL so they survive a trip to the session form.
  const dayParam = params.get('day')
  const selected = dayParam && KEY_RE.test(dayParam) ? dayParam : todayKey
  const monthParam = params.get('m')
  const month = parseISO(`${monthParam && /^\d{4}-\d{2}$/.test(monthParam) ? monthParam : selected.slice(0, 7)}-01`)
  const monthKey = format(month, 'yyyy-MM')
  const update = (day: string, m: string) => setParams({ day, m }, { replace: true })

  const totals = useMemo(() => totalsByDay(sessions), [sessions])
  const grid = buildMonthGrid(month)
  const examsByDay = useMemo(() => {
    const map = new Map<string, Module[]>()
    for (const m of modules) if (m.examDate) map.set(m.examDate, [...(map.get(m.examDate) ?? []), m])
    return map
  }, [modules])

  let monthTotal = 0
  for (const [k, v] of totals) if (k.startsWith(monthKey)) monthTotal += v

  const daySessions = useMemo(
    () => sessions.filter((s) => dayKey(s.start) === selected).sort((a, b) => a.start - b.start),
    [sessions, selected],
  )
  const dayExams = examsByDay.get(selected) ?? []
  const upcoming = upcomingExams(modules, now)
  const canLog = selected <= todayKey
  const rel = dayLabel(selected, now)
  const heading = rel === 'Today' || rel === 'Yesterday'
    ? `${rel}, ${format(parseISO(selected), 'd MMMM')}`
    : format(parseISO(selected), 'EEEE d MMMM')

  return (
    <main className="page">
      <h1 className="page-title">Calendar</h1>

      <p className="cal-total">
        {format(month, 'MMMM')}: <strong>{formatDuration(monthTotal)}</strong> studied
      </p>

      <div className="card cal-card">
        <div className="cal-nav">
          <h2>{format(month, 'MMMM yyyy')}</h2>
          <button className="btn cal-today-btn" onClick={() => update(todayKey, todayKey.slice(0, 7))}>Today</button>
          <button className="btn-icon" aria-label="Previous month" onClick={() => update(selected, format(addMonths(month, -1), 'yyyy-MM'))}>
            <Icon name="chevronLeft" size={18} />
          </button>
          <button className="btn-icon" aria-label="Next month" onClick={() => update(selected, format(addMonths(month, 1), 'yyyy-MM'))}>
            <Icon name="chevronRight" size={18} />
          </button>
        </div>

        <div className="cal-grid">
          {WEEKDAYS.map((d, i) => (
            <div key={i} className="cal-weekday" aria-hidden="true">{d}</div>
          ))}
          {grid.flat().map((c) => {
            const total = totals.get(c.key) ?? 0
            const exams = examsByDay.get(c.key) ?? []
            const cls = ['cal-day', `heat-${heatLevel(total)}`, c.inMonth ? '' : 'out', c.key === todayKey ? 'today' : '']
            return (
              <button
                key={c.key}
                className={cls.filter(Boolean).join(' ')}
                aria-pressed={c.key === selected}
                aria-label={`${format(c.date, 'EEEE d MMMM')}${total ? `, ${formatDuration(total)}` : ''}${exams.length ? `, exam: ${exams.map((m) => m.name).join(', ')}` : ''}`}
                onClick={() => update(c.key, c.inMonth ? monthKey : c.key.slice(0, 7))}
              >
                {c.date.getDate()}
                {exams.length > 0 && (
                  <span className="cal-dots" aria-hidden="true">
                    {exams.slice(0, 3).map((m) => (
                      <span key={m.id} style={{ background: m.color }} />
                    ))}
                  </span>
                )}
              </button>
            )
          })}
        </div>
        <div className="cal-legend" aria-hidden="true">
          Less
          {[0, 1, 2, 3, 4].map((l) => (
            <i key={l} className={`cal-day heat-${l}`} style={{ aspectRatio: 'auto', border: 0 }} />
          ))}
          More
        </div>
      </div>

      <section className="section">
        <h2 className="section-title">
          {heading}
          <span className="muted" style={{ fontSize: 17, fontWeight: 500 }}>{formatDuration(totals.get(selected) ?? 0)}</span>
        </h2>

        {dayExams.length > 0 && (
          <div className="list" style={{ marginBottom: 12 }}>
            {dayExams.map((m) => (
              <Link key={m.id} to={`/modules/${m.id}`} className="list-item">
                <ModuleBadge module={m} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{m.name} exam</div>
                  <div className="muted" style={{ fontSize: 14 }}>🎓 Exam day</div>
                </div>
                <Icon name="chevronRight" size={18} className="faint" />
              </Link>
            ))}
          </div>
        )}

        {daySessions.length > 0 ? (
          <div className="list">
            {daySessions.map((s) => (
              <SessionRow key={s.id} session={s} module={modules.find((m) => m.id === s.moduleId)} />
            ))}
          </div>
        ) : (
          <div className="card empty" style={{ padding: 20 }}>No sessions this day.</div>
        )}

        {canLog && (
          <Link to={`/sessions/new?date=${selected}`} className="btn btn-block" style={{ marginTop: 12 }}>
            <Icon name="plus" size={18} /> Log session for this day
          </Link>
        )}
      </section>

      <section className="section">
        <h2 className="section-title">Upcoming exams</h2>
        {upcoming.length === 0 ? (
          <div className="card empty" style={{ padding: 20 }}>No exams scheduled. Add an exam date to a module.</div>
        ) : (
          <div className="list">
            {upcoming.map(({ module: m, days }) => (
              <Link key={m.id} to={`/modules/${m.id}`} className="list-item">
                <ModuleBadge module={m} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600 }}>{m.name}</div>
                  <div className="muted" style={{ fontSize: 14 }}>{format(parseISO(m.examDate!), 'EEE d MMM yyyy')}</div>
                </div>
                <span className="exam-row-when" style={days <= 7 ? { color: m.color, fontWeight: 600 } : undefined}>
                  {countdownLabel(days)}
                </span>
                <Icon name="chevronRight" size={18} className="faint" />
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
