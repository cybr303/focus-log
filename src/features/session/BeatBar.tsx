import { Icon } from '../../components/Icon'
import { FlagGlyph } from './glyphs'
import { formatTarget, type BeatProgress } from './progress'

/** "Beat your usual session" track: fill, walking figure at its front, target pill and finish flag. */
export function BeatBar({ progress }: { progress: Exclude<BeatProgress, { kind: 'first' }> }) {
  const beaten = progress.kind === 'beaten'
  const pct = beaten ? 100 : progress.fraction * 100
  return (
    <div className={`beat ${beaten ? 'beat-done' : ''}`} aria-hidden="true">
      <div className="beat-track">
        <div className="beat-fill" style={{ width: `${pct}%` }} />
        {!beaten && (
          <span className="beat-walker" style={{ left: `${pct}%` }}>
            <Icon name="walk" size={14} stroke={2.4} />
          </span>
        )}
        <span className="beat-target">{formatTarget(progress.targetMs)}</span>
      </div>
      <span className="beat-flag">
        <FlagGlyph size={14} />
      </span>
    </div>
  )
}
