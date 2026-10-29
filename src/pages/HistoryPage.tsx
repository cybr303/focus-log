import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { groupByDay, dayLabel } from '../features/history/grouping'
import { SessionRow } from '../features/history/SessionRow'
import '../features/history/history.css'
import { formatDuration } from '../lib/time'
import { useNow } from '../lib/useNow'
import { useStore } from '../store/store'

export function HistoryPage() {
  const sessions = useStore((s) => s.sessions)
  const modules = useStore((s) => s.modules)
  const now = useNow(60000)
  const [params, setParams] = useSearchParams()
  const filter = params.get('module')

  const groups = useMemo(
    () => groupByDay(filter ? sessions.filter((s) => s.moduleId === filter) : sessions),
    [sessions, filter],
  )
  const setFilter = (id: string | null) => setParams(id ? { module: id } : {}, { replace: true })

  return (
    <main className="page">
      <div className="page-header">
        <Link to="/" className="back-link">
          <Icon name="chevronLeft" size={20} /> Overview
        </Link>
        <Link to="/sessions/new" className="btn btn-primary" style={{ height: 40, padding: '0 16px', fontSize: 15 }}>
          <Icon name="plus" size={18} /> Log session
        </Link>
      </div>
      <h1 className="page-title">Sessions</h1>

      {modules.length > 1 && (
        <div className="chips history-filter" role="group" aria-label="Filter by module">
          <button className="chip" aria-pressed={!filter} onClick={() => setFilter(null)}>All</button>
          {modules.map((m) => (
            <button key={m.id} className="chip" aria-pressed={filter === m.id} onClick={() => setFilter(m.id)}>
              {m.emoji} {m.name}
            </button>
          ))}
        </div>
      )}

      {groups.length === 0 ? (
        <div className="card empty" style={{ marginTop: 16 }}>
          {filter ? 'No sessions for this module yet.' : 'No sessions yet. Time one from Overview or log one here.'}
        </div>
      ) : (
        groups.map((g) => (
          <section key={g.key} className="day-group">
            <h2 className="day-header">
              <span>{dayLabel(g.key, now)}</span>
              <span className="day-header-total">{formatDuration(g.total)}</span>
            </h2>
            <div className="list">
              {g.sessions.map((s) => (
                <SessionRow key={s.id} session={s} module={modules.find((m) => m.id === s.moduleId)} />
              ))}
            </div>
          </section>
        ))
      )}
    </main>
  )
}
