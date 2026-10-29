import { useState } from 'react'
import { Sheet } from '../../components/Sheet'
import { activeElapsed } from '../../lib/stats'
import { formatClock, formatDuration } from '../../lib/time'
import type { Productivity } from '../../lib/types'
import { useNow } from '../../lib/useNow'
import { useStore } from '../../store/store'
import { StarGlyph } from './glyphs'
import { MIN_SESSION_MS } from './progress'

const LABELS = ['', 'Rough', 'Meh', 'Okay', 'Good', 'Excellent'] as const

/** Rate and save the running session. Calls onSaved with the stored study time. */
export function FinishSheet({ onClose, onSaved }: { onClose: () => void; onSaved: (ms: number) => void }) {
  const active = useStore((s) => s.active)
  const finishSession = useStore((s) => s.finishSession)
  const cancelSession = useStore((s) => s.cancelSession)
  const now = useNow()
  const [productivity, setProductivity] = useState<Productivity | undefined>()
  const [note, setNote] = useState('')

  if (!active) return null
  const elapsed = activeElapsed(active, now)

  if (elapsed < MIN_SESSION_MS) {
    return (
      <Sheet title="Finish session" onClose={onClose}>
        <div className="empty">
          <div className="session-finish-time">{formatClock(elapsed)}</div>
          <p>Sessions under a minute won't be saved.</p>
        </div>
        <div className="session-sheet-buttons">
          <button className="btn btn-danger" onClick={() => { cancelSession(); onClose() }}>Discard</button>
          <button className="btn btn-primary" onClick={onClose}>Keep going</button>
        </div>
      </Sheet>
    )
  }

  const save = () => {
    const s = finishSession({ productivity, note })
    onClose()
    if (s) onSaved(s.end - s.start - s.pausedMs)
  }

  return (
    <Sheet
      title="Finish session"
      onClose={onClose}
      actions={<button className="link-btn" style={{ fontWeight: 600 }} onClick={save}>Save</button>}
    >
      <div className="session-finish-head">
        <div className="session-finish-time">{formatDuration(elapsed)}</div>
        <div className="muted">of focused study</div>
      </div>

      <div className="field">
        <span className="field-label">How productive was it? <span className="faint">(optional)</span></span>
        <div className="session-stars" role="radiogroup" aria-label="Productivity">
          {([1, 2, 3, 4, 5] as Productivity[]).map((n) => (
            <button
              key={n}
              role="radio"
              aria-checked={productivity === n}
              aria-label={`${n} – ${LABELS[n]}`}
              className={productivity && n <= productivity ? 'on' : ''}
              onClick={() => setProductivity(productivity === n ? undefined : n)}
            >
              <StarGlyph filled={!!productivity && n <= productivity} />
            </button>
          ))}
        </div>
        <div className="session-stars-label muted">{productivity ? LABELS[productivity] : ' '}</div>
      </div>

      <label className="field">
        <span className="field-label">Note <span className="faint">(optional)</span></span>
        <textarea className="input" placeholder="What did you get done?" value={note} onChange={(e) => setNote(e.target.value)} />
      </label>

      <button className="btn btn-primary btn-block" onClick={save}>Save</button>
    </Sheet>
  )
}
