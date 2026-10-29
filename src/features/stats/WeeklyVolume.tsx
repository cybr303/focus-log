import { format } from 'date-fns'
import { formatDuration } from '../../lib/time'
import { useNow } from '../../lib/useNow'
import { useStore } from '../../store/store'
import { daysStudied, lastNDays, withActive } from './insights'
import './stats.css'

// Chart geometry in a 0–100 box; zero days rest near the baseline on a gentle wave.
const BASE = 74
const TOP = 26
/** Days under a minute (e.g. a session that just started) get no dot, so the chart never shows "0m". */
const MIN_SHOWN = 60000

/** Smooth Catmull-Rom curve through the points, as an SVG path. */
const smoothPath = (pts: { x: number; y: number }[]): string => {
  let d = `M${pts[0].x},${pts[0].y}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] ?? p2
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 }
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 }
    d += ` C${c1.x},${c1.y} ${c2.x},${c2.y} ${p2.x},${p2.y}`
  }
  return d
}

/** Study volume over the last 7 study days. */
export function WeeklyVolume() {
  const sessions = useStore((s) => s.sessions)
  const active = useStore((s) => s.active)
  const now = useNow(10000)
  const all = withActive(sessions, active, now)
  const days = lastNDays(all, now, 7)
  const total = days.reduce((sum, d) => sum + d.ms, 0)
  const max = Math.max(...days.map((d) => d.ms))
  const { studied, of } = daysStudied(all, now)
  const empty = total === 0

  const pts = days.map((d, i) => ({
    x: ((i + 0.5) / days.length) * 100,
    y: empty ? 60 : d.ms >= MIN_SHOWN ? BASE - (d.ms / max) * (BASE - TOP) : BASE + Math.sin(i * 1.7) * 4,
  }))

  return (
    <section className="section wv">
      <div className="wv-head">
        <div>
          <div className="muted wv-label">Study volume</div>
          <div className="wv-total">{formatDuration(total)}</div>
        </div>
        {of > 0 && <div className="muted wv-days">{studied} of {of} {of === 1 ? 'day' : 'days'}</div>}
      </div>
      <div className="wv-chart">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <path
            d={empty ? 'M0,60 L100,60' : smoothPath([{ x: 0, y: pts[0].y }, ...pts, { x: 100, y: pts[pts.length - 1].y }])}
            fill="none"
            stroke="rgba(235,235,245,0.32)"
            strokeWidth={2}
            strokeDasharray="5 6"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        {!empty &&
          days.map((d, i) =>
            d.ms >= MIN_SHOWN ? (
              <div key={d.key} className="wv-point" style={{ left: `${pts[i].x}%`, top: `${pts[i].y}%` }}>
                <span className="wv-value">{formatDuration(d.ms)}</span>
                <span className="wv-dot" />
              </div>
            ) : null,
          )}
        {empty && <div className="wv-empty muted">Your week will show up here</div>}
      </div>
      <div className="wv-axis">
        {days.map((d, i) => (
          <span key={d.key} className={i === days.length - 1 ? 'today' : undefined}>{format(d.date, 'EEE')}</span>
        ))}
      </div>
    </section>
  )
}
