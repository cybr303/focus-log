import { useCallback, useEffect, useRef, useState } from 'react'
import { Icon } from '../../components/Icon'
import { Sheet } from '../../components/Sheet'
import { tint } from '../../lib/colors'
import { activeElapsed, averageSessionMs, isPaused } from '../../lib/stats'
import { formatClock, formatDuration } from '../../lib/time'
import type { ActiveSession, ID } from '../../lib/types'
import { useNow } from '../../lib/useNow'
import { selectModule, useStore } from '../../store/store'
import { BeatBar } from './BeatBar'
import { FinishSheet } from './FinishSheet'
import { CheckCircleGlyph } from './glyphs'
import { beatCaption, beatProgress, topicNames } from './progress'
import { StartSessionSheet } from './StartSessionSheet'
import { TopicChips } from './TopicChips'
import './session.css'

/** Home's live-session block: a start CTA when idle, the running clock when active. */
export function ActiveSessionCard() {
  const active = useStore((s) => s.active)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(null), 2600)
    return () => clearTimeout(id)
  }, [toast])

  return (
    <section className="section">
      {active ? <Running active={active} onSaved={(ms) => setToast(`Saved · ${formatDuration(ms)}`)} /> : <Idle />}
      {toast && (
        <div className="session-toast" role="status">
          <Icon name="check" size={18} /> {toast}
        </div>
      )}
    </section>
  )
}

function Idle() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button className="card session-idle" onClick={() => setOpen(true)}>
        <span className="session-idle-play">
          <Icon name="play" size={26} />
        </span>
        <span className="session-idle-text">
          <span className="session-idle-title">Start session</span>
          <span className="muted">Pick a module and topics, then focus.</span>
        </span>
        <Icon name="chevronRight" size={20} className="faint" />
      </button>
      {open && <StartSessionSheet onClose={() => setOpen(false)} />}
    </>
  )
}

/** Shows the running clock in the tab title, restoring the original title afterwards. */
function useClockTitle(clock: string, paused: boolean) {
  const original = useRef(document.title)
  useEffect(() => {
    document.title = `${paused ? '⏸ ' : ''}${clock} · FocusLog`
  }, [clock, paused])
  useEffect(() => {
    const prev = original.current
    return () => {
      document.title = prev
    }
  }, [])
}

function Running({ active, onSaved }: { active: ActiveSession; onSaved: (ms: number) => void }) {
  const now = useNow()
  const module = useStore(selectModule(active.moduleId))
  const sessions = useStore((s) => s.sessions)
  const { pauseSession, resumeSession, cancelSession } = useStore.getState()
  const [sheet, setSheet] = useState<'finish' | 'cancel' | 'topics' | null>(null)

  const paused = isPaused(active)
  const elapsed = activeElapsed(active, now)
  const clock = formatClock(elapsed)
  useClockTitle(clock, paused)

  const name = module?.name ?? 'Session'
  const color = module?.color ?? '#0a84ff'
  const progress = beatProgress(elapsed, averageSessionMs(sessions, active.moduleId))
  const topics = topicNames(module, active.topicIds)
  // Stable so Sheet's effect doesn't re-run on every clock tick
  const close = useCallback(() => setSheet(null), [])

  return (
    <div className={`session-live ${paused ? 'is-paused' : ''}`}>
      <div className="session-head">
        <Icon name="timer" size={20} />
        <span className="session-head-title">Active study session</span>
        <span className="spacer" />
        <span className="muted session-head-module">{name}</span>
      </div>

      <div className="session-clock-wrap">
        <div
          className="session-glow"
          style={{ background: `radial-gradient(closest-side, ${tint(color, 0.55)}, rgba(100, 210, 255, 0.18) 55%, transparent)` }}
        />
        <div className="session-clock" aria-live="off">{clock}</div>
        {paused && <div className="session-paused">Paused</div>}
      </div>

      <button className="session-topics muted" onClick={() => setSheet('topics')}>
        Topics: {topics.length ? topics.join(', ') : 'none'} <Icon name="edit" size={14} />
      </button>

      <div className="session-beat">
        {progress.kind !== 'first' && <BeatBar progress={progress} />}
        <p className={`session-caption ${progress.kind === 'beaten' ? 'beaten' : 'muted'}`}>{beatCaption(progress, name)}</p>
      </div>

      <div className="session-controls">
        <button className="btn btn-round session-ctl" aria-label="Cancel session" onClick={() => setSheet('cancel')}>
          <Icon name="close" size={24} stroke={2.6} className="session-x" />
        </button>
        <button
          className="btn btn-round session-ctl"
          aria-label={paused ? 'Resume' : 'Pause'}
          onClick={() => (paused ? resumeSession() : pauseSession())}
        >
          <Icon name={paused ? 'play' : 'pause'} size={22} stroke={2.8} />
        </button>
        <span className="spacer" />
        <button className="btn btn-primary session-finish" onClick={() => setSheet('finish')}>
          <CheckCircleGlyph size={22} /> Finish
        </button>
      </div>

      {sheet === 'finish' && <FinishSheet onClose={close} onSaved={onSaved} />}
      {sheet === 'cancel' && (
        <Sheet title="Cancel session" onClose={close}>
          <p className="muted session-confirm">
            Discard this {formatDuration(elapsed)} {name} session? It won't be saved.
          </p>
          <div className="session-sheet-buttons">
            <button className="btn" onClick={close}>Keep going</button>
            <button className="btn btn-danger" onClick={() => { cancelSession(); close() }}>Discard</button>
          </div>
        </Sheet>
      )}
      {sheet === 'topics' && module && <EditTopicsSheet moduleId={module.id} initial={active.topicIds} onClose={close} />}
    </div>
  )
}

function EditTopicsSheet({ moduleId, initial, onClose }: { moduleId: ID; initial: ID[]; onClose: () => void }) {
  const module = useStore(selectModule(moduleId))
  const setActiveTopics = useStore((s) => s.setActiveTopics)
  const [ids, setIds] = useState<ID[]>(initial)
  if (!module) return null
  const valid = ids.filter((id) => module.topics.some((t) => t.id === id))
  const canSave = valid.length > 0 || module.topics.length === 0
  const save = () => {
    setActiveTopics(valid)
    onClose()
  }
  return (
    <Sheet
      title="Topics"
      onClose={onClose}
      actions={<button className="link-btn" style={{ fontWeight: 600 }} disabled={!canSave} onClick={save}>Done</button>}
    >
      <TopicChips module={module} value={valid} onChange={setIds} />
    </Sheet>
  )
}
