import { Link } from 'react-router-dom'
import type { ID, Module } from '../../lib/types'
import { toggleId } from './progress'

/** Multi-select topic chips for a module, or a nudge to add topics when it has none. */
export function TopicChips({ module, value, onChange }: { module: Module; value: ID[]; onChange: (ids: ID[]) => void }) {
  if (!module.topics.length) {
    return (
      <p className="muted session-hint">
        {module.name} has no topics yet.{' '}
        <Link to={`/modules/${module.id}`} className="link-btn">Add topics</Link>
      </p>
    )
  }
  return (
    <div className="chips">
      {module.topics.map((t) => (
        <button key={t.id} type="button" className="chip" aria-pressed={value.includes(t.id)} onClick={() => onChange(toggleId(value, t.id))}>
          {t.name}
        </button>
      ))}
    </div>
  )
}
