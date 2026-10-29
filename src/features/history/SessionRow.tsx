import { format } from 'date-fns'
import { Link } from 'react-router-dom'
import { Icon } from '../../components/Icon'
import { ModuleBadge } from '../../components/ModuleBadge'
import { sessionDuration } from '../../lib/stats'
import { formatDuration } from '../../lib/time'
import type { Module, Productivity, Session } from '../../lib/types'
import { sessionWhen } from './grouping'
import './history.css'

const MISSING: Pick<Module, 'name' | 'emoji' | 'color' | 'topics'> = { name: 'Deleted module', emoji: '❔', color: '#8e8e93', topics: [] }

export function ProductivityDots({ value }: { value?: Productivity }) {
  if (!value) return null
  return (
    <span className="prod-dots" aria-label={`Productivity ${value} of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= value ? 'on' : ''} />
      ))}
    </span>
  )
}

/** One session in a `.list`. `now` adds day context to the start time (for lists not grouped by day). */
export function SessionRow({ session, module, now }: { session: Session; module?: Module; now?: number }) {
  const m = module ?? MISSING
  const topics = session.topicIds
    .map((id) => m.topics.find((t) => t.id === id)?.name)
    .filter(Boolean)
    .join(' · ')
  const when = now !== undefined ? sessionWhen(session.start, now) : format(session.start, 'HH:mm')
  return (
    <Link to={`/sessions/${session.id}`} className="list-item session-row">
      <ModuleBadge module={m} />
      <div className="session-row-main">
        <div className="session-row-title">{m.name}</div>
        <div className="session-row-sub">{topics || 'No topic'}</div>
      </div>
      <div className="session-row-side">
        <div className="session-row-dur">{formatDuration(sessionDuration(session))}</div>
        <div className="session-row-meta">
          {session.manual && (
            <span className="session-row-manual" title="Logged manually" aria-label="Logged manually">
              <Icon name="edit" size={11} />
            </span>
          )}
          <span>{when}</span>
        </div>
        <ProductivityDots value={session.productivity} />
      </div>
    </Link>
  )
}
