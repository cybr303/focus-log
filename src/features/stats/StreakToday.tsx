import { Link } from 'react-router-dom'
import { Icon } from '../../components/Icon'
import { streaks } from '../../lib/stats'
import { formatDuration } from '../../lib/time'
import { useNow } from '../../lib/useNow'
import { useStore } from '../../store/store'
import { thisWeekMs, todayMs, withActive } from './insights'
import './stats.css'

const days = (n: number) => `${n} ${n === 1 ? 'day' : 'days'}`

/** Home header: current/longest streak on the left, today/this week on the right. */
export function StreakToday() {
  const sessions = useStore((s) => s.sessions)
  const active = useStore((s) => s.active)
  const now = useNow()
  const all = withActive(sessions, active, now)
  const { current, longest } = streaks(all, now)

  return (
    <section className="st-row">
      <div>
        <Link to="/calendar" className="st-label">Current Streak <span aria-hidden="true">›</span></Link>
        <div className="st-big">
          {current}
          <Icon name="flame" size={26} className={current > 0 ? 'st-flame on' : 'st-flame'} />
        </div>
        <div className="st-sub">Longest: <b>{days(longest)}</b></div>
      </div>
      <div className="st-right">
        <Link to="/insights" className="st-label">Today <span aria-hidden="true">›</span></Link>
        <div className="st-big">{formatDuration(todayMs(all, now))}</div>
        <div className="st-sub">This week: <b>{formatDuration(thisWeekMs(all, now))}</b></div>
      </div>
    </section>
  )
}
