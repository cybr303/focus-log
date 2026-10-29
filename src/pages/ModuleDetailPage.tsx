import { format } from 'date-fns'
import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { ModuleBadge } from '../components/ModuleBadge'
import { ConfirmSheet } from '../features/modules/ConfirmSheet'
import { examLabel } from '../features/modules/logic'
import { ModuleFormSheet } from '../features/modules/ModuleFormSheet'
import { TopicList } from '../features/modules/TopicList'
import '../features/modules/modules.css'
import { tint } from '../lib/colors'
import { averageProductivity, sessionDuration, totalDuration } from '../lib/stats'
import { formatDuration } from '../lib/time'
import { useNow } from '../lib/useNow'
import { selectModule, useStore } from '../store/store'

const RECENT_LIMIT = 10

export function ModuleDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const module = useStore(selectModule(id))
  const allSessions = useStore((s) => s.sessions)
  const deleteModule = useStore((s) => s.deleteModule)
  const now = useNow(60000)

  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [showAll, setShowAll] = useState(false)

  const sessions = useMemo(
    () => allSessions.filter((s) => s.moduleId === id).sort((a, b) => b.start - a.start),
    [allSessions, id],
  )

  if (!module) {
    return (
      <main className="page">
        <BackLink />
        <div className="card mod-empty" style={{ marginTop: 40 }}>
          <div className="mod-empty-art" aria-hidden="true">🔭</div>
          <h2>Module not found</h2>
          <p className="muted">It may have been deleted.</p>
          <Link to="/modules" className="btn btn-primary">Back to modules</Link>
        </div>
      </main>
    )
  }

  const total = totalDuration(sessions)
  const avgProd = averageProductivity(sessions)
  const topicName = new Map(module.topics.map((t) => [t.id, t.name]))
  const visible = showAll ? sessions : sessions.slice(0, RECENT_LIMIT)

  return (
    <main className="page">
      <div className="page-header">
        <BackLink />
        <button className="link-btn" onClick={() => setEditing(true)}>Edit</button>
      </div>

      <header className="md-header" style={{ background: `linear-gradient(160deg, ${tint(module.color, 0.28)}, ${tint(module.color, 0.04)})` }}>
        <ModuleBadge module={module} size={64} />
        <div>
          <h1 className="md-title">{module.name}</h1>
          {module.examDate ? (
            <div className="md-exam">
              {examLabel(module.examDate, now)} · {format(new Date(module.examDate + 'T00:00:00'), 'EEE d MMM yyyy')}
            </div>
          ) : (
            <div className="md-exam muted">No exam date</div>
          )}
        </div>
      </header>

      <div className="md-stats">
        <Stat label="Total time" value={formatDuration(total)} />
        <Stat label="Sessions" value={String(sessions.length)} />
        <Stat label="Avg session" value={sessions.length ? formatDuration(total / sessions.length) : '—'} />
        <Stat label="Avg productivity" value={avgProd === null ? '—' : `${avgProd.toFixed(1)} / 5`} />
      </div>

      <TopicList module={module} sessions={sessions} />

      <section className="section">
        <h2 className="section-title">Recent sessions</h2>
        {sessions.length === 0 ? (
          <div className="card empty">No sessions for this module yet.</div>
        ) : (
          <>
            <div className="list">
              {visible.map((s) => {
                const names = s.topicIds.map((t) => topicName.get(t)).filter(Boolean)
                return (
                  <Link key={s.id} to={`/sessions/${s.id}`} className="list-item md-session">
                    <div className="md-session-text">
                      <div className="md-session-date">{format(s.start, 'EEE d MMM · HH:mm')}</div>
                      <div className="muted md-session-topics">{names.length ? names.join(', ') : 'No topic'}</div>
                    </div>
                    <div className="md-session-side">
                      <div className="md-session-dur">{formatDuration(sessionDuration(s))}</div>
                      {s.productivity && (
                        <div className="md-stars" aria-label={`Productivity ${s.productivity} of 5`}>
                          {'★'.repeat(s.productivity)}
                          <span className="faint">{'★'.repeat(5 - s.productivity)}</span>
                        </div>
                      )}
                    </div>
                    <Icon name="chevronRight" size={16} className="faint" />
                  </Link>
                )
              })}
            </div>
            {sessions.length > RECENT_LIMIT && (
              <button className="link-btn md-more" onClick={() => setShowAll((v) => !v)}>
                {showAll ? 'Show fewer' : `Show all ${sessions.length}`}
              </button>
            )}
          </>
        )}
      </section>

      <section className="section">
        <button className="btn btn-danger btn-block" onClick={() => setConfirmDelete(true)}>
          <Icon name="trash" size={20} /> Delete module
        </button>
      </section>

      {editing && <ModuleFormSheet module={module} onClose={() => setEditing(false)} />}
      {confirmDelete && (
        <ConfirmSheet
          title="Delete Module"
          message={
            <>
              Delete <strong>{module.name}</strong> and its {module.topics.length}{' '}
              {module.topics.length === 1 ? 'topic' : 'topics'}?{' '}
              <strong className="confirm-warn">
                This also permanently deletes {sessions.length} {sessions.length === 1 ? 'session' : 'sessions'}
                {total > 0 && ` (${formatDuration(total)} of study time)`}.
              </strong>{' '}
              This can't be undone.
            </>
          }
          confirmLabel={`Delete module${sessions.length ? ` and ${sessions.length} ${sessions.length === 1 ? 'session' : 'sessions'}` : ''}`}
          onConfirm={() => {
            deleteModule(module.id)
            navigate('/modules', { replace: true })
          }}
          onClose={() => setConfirmDelete(false)}
        />
      )}
    </main>
  )
}

function BackLink() {
  return (
    <Link to="/modules" className="link-btn md-back">
      <Icon name="chevronLeft" size={20} /> Modules
    </Link>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card md-stat">
      <div className="md-stat-value">{value}</div>
      <div className="md-stat-label muted">{label}</div>
    </div>
  )
}
