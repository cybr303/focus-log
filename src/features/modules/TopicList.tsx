import { useMemo, useState } from 'react'
import { Icon } from '../../components/Icon'
import { totalsByTopic } from '../../lib/stats'
import { formatDuration } from '../../lib/time'
import type { Module, Session, Topic } from '../../lib/types'
import { useStore } from '../../store/store'
import { ConfirmSheet } from './ConfirmSheet'
import { topicNameError } from './logic'
import './modules.css'

/** Topics of a module: inline add, tap-to-rename, delete with confirm. */
export function TopicList({ module, sessions }: { module: Module; sessions: Session[] }) {
  const addTopic = useStore((s) => s.addTopic)
  const renameTopic = useStore((s) => s.renameTopic)
  const deleteTopic = useStore((s) => s.deleteTopic)

  const [draft, setDraft] = useState('')
  const [addError, setAddError] = useState<string | null>(null)
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null)
  const [editError, setEditError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<Topic | null>(null)

  const totals = useMemo(() => totalsByTopic(sessions), [sessions])
  const counts = useMemo(() => {
    const map = new Map<string, number>()
    for (const s of sessions) for (const t of s.topicIds) map.set(t, (map.get(t) ?? 0) + 1)
    return map
  }, [sessions])

  const add = () => {
    const err = topicNameError(draft, module.topics)
    if (err) return setAddError(draft.trim() ? err : null)
    addTopic(module.id, draft)
    setDraft('')
    setAddError(null)
  }

  const commitRename = () => {
    if (!editing) return
    const original = module.topics.find((t) => t.id === editing.id)
    if (!original || editing.name.trim() === original.name) return setEditing(null)
    const err = topicNameError(editing.name, module.topics, editing.id)
    if (err) return setEditError(err)
    renameTopic(module.id, editing.id, editing.name)
    setEditing(null)
    setEditError(null)
  }

  return (
    <section className="section">
      <h2 className="section-title">
        Topics <span className="muted topic-count">{module.topics.length}</span>
      </h2>

      <form
        className="topic-add"
        onSubmit={(e) => {
          e.preventDefault()
          add()
        }}
      >
        <input
          className="input"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value)
            setAddError(null)
          }}
          placeholder="Add a topic…"
          maxLength={80}
          aria-label="New topic name"
        />
        <button type="submit" className="btn btn-primary" disabled={!draft.trim()}>
          Add
        </button>
      </form>
      {addError && <div className="mf-error topic-error">{addError}</div>}

      {module.topics.length === 0 ? (
        <div className="card empty topic-empty">No topics yet. Topics let you see where your time goes within a module.</div>
      ) : (
        <div className="list">
          {module.topics.map((t) =>
            editing?.id === t.id ? (
              <form
                key={t.id}
                className="list-item topic-edit"
                onSubmit={(e) => {
                  e.preventDefault()
                  commitRename()
                }}
              >
                <div className="topic-edit-field">
                  <input
                    className="input"
                    value={editing.name}
                    autoFocus
                    maxLength={80}
                    aria-label="Topic name"
                    onChange={(e) => {
                      setEditing({ id: t.id, name: e.target.value })
                      setEditError(null)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        e.stopPropagation()
                        setEditing(null)
                        setEditError(null)
                      }
                    }}
                    onBlur={commitRename}
                  />
                  {editError && <span className="mf-error">{editError}</span>}
                </div>
                <button type="submit" className="btn-icon" aria-label="Save topic name" onMouseDown={(e) => e.preventDefault()}>
                  <Icon name="check" size={18} />
                </button>
              </form>
            ) : (
              <div key={t.id} className="list-item topic-row">
                <button className="topic-name" onClick={() => setEditing({ id: t.id, name: t.name })} aria-label={`Rename ${t.name}`}>
                  <span>{t.name}</span>
                  <span className="muted topic-time">{formatDuration(totals.get(t.id) ?? 0)}</span>
                </button>
                <button className="topic-delete" aria-label={`Delete ${t.name}`} onClick={() => setDeleting(t)}>
                  <Icon name="trash" size={18} />
                </button>
              </div>
            ),
          )}
        </div>
      )}

      {deleting && (
        <ConfirmSheet
          title="Delete Topic"
          message={
            <>
              Delete <strong>{deleting.name}</strong>?
              {(counts.get(deleting.id) ?? 0) > 0 &&
                ` It will be removed from ${counts.get(deleting.id)} ${counts.get(deleting.id) === 1 ? 'session' : 'sessions'}; the sessions themselves are kept.`}
            </>
          }
          confirmLabel="Delete topic"
          onConfirm={() => deleteTopic(module.id, deleting.id)}
          onClose={() => setDeleting(null)}
        />
      )}
    </section>
  )
}
