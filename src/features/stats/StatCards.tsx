import { averageProductivity, totalDuration } from '../../lib/stats'
import { formatDuration } from '../../lib/time'
import { useNow } from '../../lib/useNow'
import { useStore } from '../../store/store'
import { activeModuleCount, withActive } from './insights'
import './stats.css'

/** Horizontally scrolling row of all-time stat cards. */
export function StatCards() {
  const sessions = useStore((s) => s.sessions)
  const active = useStore((s) => s.active)
  const now = useNow(10000)
  const all = withActive(sessions, active, now)
  const total = totalDuration(all)
  const rating = averageProductivity(sessions)

  const cards = [
    { value: formatDuration(total), label: 'Study Time', bg: '#3a0f14' },
    { value: String(sessions.length), label: 'Total Sessions', bg: '#2a2421' },
    { value: rating === null ? '–' : rating.toFixed(1), label: 'Avg. Productivity', bg: '#2d2a0b' },
    { value: String(activeModuleCount(all, now)), label: 'Active Modules', bg: '#0b2b2c' },
    { value: sessions.length ? formatDuration(totalDuration(sessions) / sessions.length) : '–', label: 'Avg. Session', bg: '#141c33' },
  ]

  return (
    <div className="sc-scroller" role="list">
      {cards.map((c) => (
        <div key={c.label} className="sc-card" style={{ background: c.bg }} role="listitem">
          <div className="sc-value">{c.value}</div>
          <div className="sc-label">{c.label}</div>
        </div>
      ))}
    </div>
  )
}
