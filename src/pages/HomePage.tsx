import { Link } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { ExamCountdown } from '../features/history/ExamCountdown'
import { RecentSessions } from '../features/history/RecentSessions'
import { ActiveSessionCard } from '../features/session/ActiveSessionCard'
import { StatCards } from '../features/stats/StatCards'
import { StreakToday } from '../features/stats/StreakToday'
import { WeeklyVolume } from '../features/stats/WeeklyVolume'

export function HomePage() {
  return (
    <main className="page">
      <div className="page-header" style={{ justifyContent: 'flex-end' }}>
        <Link to="/settings" className="btn-icon" aria-label="Settings">
          <Icon name="gear" />
        </Link>
      </div>
      <h1 className="page-title" style={{ marginTop: 4 }}>Overview</h1>
      <StreakToday />
      <StatCards />
      <ExamCountdown />
      <ActiveSessionCard />
      <WeeklyVolume />
      <RecentSessions limit={5} />
    </main>
  )
}
