import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useNow } from '../../lib/useNow'
import { useStore } from '../../store/store'
import { SessionRow } from './SessionRow'
import './history.css'

/** Home section: the last `limit` sessions with a link to the full history. */
export function RecentSessions({ limit = 5 }: { limit?: number }) {
  const sessions = useStore((s) => s.sessions)
  const modules = useStore((s) => s.modules)
  const now = useNow(60000)
  const recent = useMemo(() => [...sessions].sort((a, b) => b.start - a.start).slice(0, limit), [sessions, limit])

  return (
    <section className="section">
      <h2 className="section-title">
        Recent sessions
        <Link to="/sessions" className="see-all">See all ›</Link>
      </h2>
      {recent.length === 0 ? (
        <div className="card empty">No sessions yet — start one above</div>
      ) : (
        <div className="list">
          {recent.map((s) => (
            <SessionRow key={s.id} session={s} module={modules.find((m) => m.id === s.moduleId)} now={now} />
          ))}
        </div>
      )}
    </section>
  )
}
