import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { ModuleBadge } from '../components/ModuleBadge'
import { daysUntilExam, examLabel } from '../features/modules/logic'
import { ModuleFormSheet } from '../features/modules/ModuleFormSheet'
import '../features/modules/modules.css'
import { totalsByModule } from '../lib/stats'
import { formatDuration } from '../lib/time'
import { useNow } from '../lib/useNow'
import { useStore } from '../store/store'

export function ModulesPage() {
  const modules = useStore((s) => s.modules)
  const sessions = useStore((s) => s.sessions)
  const [creating, setCreating] = useState(false)
  const now = useNow(60000)
  const totals = useMemo(() => totalsByModule(sessions), [sessions])

  return (
    <main className="page">
      <div className="page-header">
        <h1 className="page-title">Modules</h1>
        <button className="btn-icon mod-add" aria-label="New module" onClick={() => setCreating(true)}>
          <Icon name="plus" />
        </button>
      </div>

      {modules.length === 0 ? (
        <div className="card mod-empty">
          <div className="mod-empty-art" aria-hidden="true">📚</div>
          <h2>No modules yet</h2>
          <p className="muted">Modules are the courses or subjects you study. Add one to start logging sessions and topics.</p>
          <button className="btn btn-primary" onClick={() => setCreating(true)}>
            <Icon name="plus" size={20} /> Add your first module
          </button>
        </div>
      ) : (
        <div className="list">
          {modules.map((m) => {
            const days = m.examDate ? daysUntilExam(m.examDate, now) : null
            return (
              <Link key={m.id} to={`/modules/${m.id}`} className="list-item mod-row">
                <ModuleBadge module={m} size={44} />
                <div className="mod-row-text">
                  <div className="mod-row-name">{m.name}</div>
                  <div className="mod-row-meta muted">
                    {m.topics.length} {m.topics.length === 1 ? 'topic' : 'topics'} · {formatDuration(totals.get(m.id) ?? 0)} total
                  </div>
                  {m.examDate && (
                    <div className={`mod-exam${days !== null && days >= 0 && days <= 7 ? ' is-soon' : ''}${days !== null && days < 0 ? ' is-past' : ''}`}>
                      {examLabel(m.examDate, now)}
                    </div>
                  )}
                </div>
                <Icon name="chevronRight" size={18} className="faint" />
              </Link>
            )
          })}
        </div>
      )}

      {creating && <ModuleFormSheet onClose={() => setCreating(false)} />}
    </main>
  )
}
