import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../../components/Icon'
import { ModuleBadge } from '../../components/ModuleBadge'
import { Sheet } from '../../components/Sheet'
import type { ID } from '../../lib/types'
import { useStore } from '../../store/store'
import { loadLastModule, pickDefaultModule, saveLastModule } from './progress'
import { TopicChips } from './TopicChips'

export function StartSessionSheet({ onClose }: { onClose: () => void }) {
  const modules = useStore((s) => s.modules)
  const sessions = useStore((s) => s.sessions)
  const startSession = useStore((s) => s.startSession)

  const [moduleId, setModuleId] = useState<ID | null>(() => pickDefaultModule(modules, sessions, loadLastModule()))
  const [topicIds, setTopicIds] = useState<ID[]>([])
  const module = modules.find((m) => m.id === moduleId)

  const canStart = !!module && (topicIds.length > 0 || module.topics.length === 0)

  const selectModule = (id: ID) => {
    if (id === moduleId) return
    setModuleId(id)
    setTopicIds([])
  }

  const start = () => {
    if (!module || !canStart) return
    saveLastModule(module.id)
    startSession(module.id, topicIds)
    onClose()
  }

  const startBtn = (
    <button className="link-btn" style={{ fontWeight: 600 }} disabled={!canStart} onClick={start}>
      Start
    </button>
  )

  return (
    <Sheet title="New session" onClose={onClose} actions={modules.length ? startBtn : undefined}>
      {!modules.length ? (
        <div className="empty">
          <p>Add a module first so you have something to study.</p>
          <Link to="/modules" className="btn btn-primary">Go to Modules</Link>
        </div>
      ) : (
        <>
          <div className="field-label session-label">Module</div>
          <div className="list">
            {modules.map((m) => (
              <button key={m.id} className="list-item" aria-pressed={m.id === moduleId} onClick={() => selectModule(m.id)}>
                <ModuleBadge module={m} size={34} />
                <span className="spacer">{m.name}</span>
                {m.id === moduleId && <Icon name="check" size={20} className="session-check" />}
              </button>
            ))}
          </div>

          {module && (
            <>
              <div className="field-label session-label">
                Topics{module.topics.length > 0 && <span className="faint"> · pick one or more</span>}
              </div>
              <TopicChips module={module} value={topicIds} onChange={setTopicIds} />
            </>
          )}

          <button className="btn btn-primary btn-block session-sheet-cta" disabled={!canStart} onClick={start}>
            <Icon name="play" size={18} /> Start session
          </button>
        </>
      )}
    </Sheet>
  )
}
