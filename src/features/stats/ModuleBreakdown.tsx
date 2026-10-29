import { useState } from 'react'
import { ModuleBadge } from '../../components/ModuleBadge'
import { tint } from '../../lib/colors'
import { totalsByModule, totalsByTopic } from '../../lib/stats'
import { formatDuration } from '../../lib/time'
import type { ID, Module, Session } from '../../lib/types'
import { ChartEmpty } from './charts'

const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0)

/** Time per module as horizontal bars; tap a module to see its topics. */
export function ModuleBreakdown({ sessions, modules }: { sessions: Session[]; modules: Module[] }) {
  const [open, setOpen] = useState<ID | null>(null)
  const byModule = totalsByModule(sessions)
  const total = [...byModule.values()].reduce((a, b) => a + b, 0)
  const rows = modules
    .map((m) => ({ module: m, ms: byModule.get(m.id) ?? 0 }))
    .filter((r) => r.ms > 0)
    .sort((a, b) => b.ms - a.ms)

  if (!rows.length) return <ChartEmpty>No study time in this period yet.</ChartEmpty>
  const max = rows[0].ms

  return (
    <div className="mb-list">
      {rows.map(({ module: m, ms }) => {
        const expanded = open === m.id
        return (
          <div key={m.id} className="mb-item">
            <button className="mb-row" aria-expanded={expanded} onClick={() => setOpen(expanded ? null : m.id)}>
              <ModuleBadge module={m} size={32} />
              <div className="mb-main">
                <div className="mb-top">
                  <span className="mb-name">{m.name}</span>
                  <span className="mb-value">{formatDuration(ms)} <span className="muted">· {pct(ms, total)}%</span></span>
                </div>
                <div className="mb-track" style={{ background: tint(m.color, 0.16) }}>
                  <div className="mb-fill" style={{ width: `${(ms / max) * 100}%`, background: m.color }} />
                </div>
              </div>
              <span className={expanded ? 'mb-chev open' : 'mb-chev'} aria-hidden="true">›</span>
            </button>
            {expanded && <TopicBreakdown module={m} sessions={sessions.filter((s) => s.moduleId === m.id)} total={ms} />}
          </div>
        )
      })}
    </div>
  )
}

function TopicBreakdown({ module: m, sessions, total }: { module: Module; sessions: Session[]; total: number }) {
  const byTopic = totalsByTopic(sessions)
  const rows = m.topics
    .map((t) => ({ id: t.id, name: t.name, ms: byTopic.get(t.id) ?? 0 }))
    .filter((r) => r.ms > 0)
  const untagged = total - rows.reduce((sum, r) => sum + r.ms, 0)
  if (untagged >= 60000) rows.push({ id: '_none', name: 'No topic', ms: untagged })
  rows.sort((a, b) => b.ms - a.ms)

  if (!rows.length) return <div className="mb-topics muted">No topics logged.</div>
  return (
    <div className="mb-topics">
      {rows.map((r) => (
        <div key={r.id} className="mb-topic">
          <div className="mb-top">
            <span className={r.id === '_none' ? 'muted' : undefined}>{r.name}</span>
            <span className="mb-value">{formatDuration(r.ms)} <span className="muted">· {pct(r.ms, total)}%</span></span>
          </div>
          <div className="mb-track thin" style={{ background: tint(m.color, 0.12) }}>
            <div className="mb-fill" style={{ width: `${pct(r.ms, total)}%`, background: tint(m.color, 0.75) }} />
          </div>
        </div>
      ))}
    </div>
  )
}
