import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { useAvatar } from '../features/avatar/avatarStore'
import { HAIR_COLORS, HAIR_STYLES, ITEMS, SKIN_TONES, SLOTS, type Item, type Slot } from '../features/avatar/catalog'
import type { Look } from '../features/avatar/compose'
import { PixelAvatar } from '../features/avatar/PixelAvatar'
import { isUnlocked, ruleLabel, ruleProgressLabel, unlockFraction } from '../features/avatar/progress'
import { useCharacter } from '../features/avatar/useCharacter'
import '../features/avatar/wardrobe.css'

type Tab = 'body' | Slot

export function WardrobePage() {
  const { avatar, look, mood, progress, unseen } = useCharacter()
  const { setLook, equip, markSeen } = useAvatar.getState()
  const [tab, setTab] = useState<Tab>('body')

  // Items earned before this visit stay marked NEW until you leave the page.
  const newIds = useRef(new Set(unseen.map((i) => i.id))).current
  const unlockedIds = useMemo(() => ITEMS.filter((i) => i.unlock && isUnlocked(i, progress)).map((i) => i.id), [progress])
  const latestUnlocked = useRef(unlockedIds)
  latestUnlocked.current = unlockedIds
  useEffect(() => () => markSeen(latestUnlocked.current), [markSeen])

  const lockable = ITEMS.filter((i) => i.unlock)
  const earned = lockable.filter((i) => isUnlocked(i, progress)).length

  const shuffle = () => {
    const pick = <T,>(xs: readonly T[]) => xs[Math.floor(Math.random() * xs.length)]
    for (const { slot } of SLOTS) equip(slot, pick(ITEMS.filter((i) => i.slot === slot && isUnlocked(i, progress))).id)
    setLook({ hairStyle: pick(HAIR_STYLES).id, hairColor: Math.floor(Math.random() * HAIR_COLORS.length) })
  }

  return (
    <main className="page">
      <div className="page-header">
        <Link to="/" className="wr-back">
          <Icon name="chevronLeft" size={20} /> Home
        </Link>
      </div>
      <h1 className="page-title" style={{ marginTop: 4 }}>Wardrobe</h1>

      <div className="card wr-stage">
        <div className="wr-glow" />
        <PixelAvatar look={look} mood={mood} scale={8} />
        <input
          className="wr-name"
          value={avatar.name}
          onChange={(e) => setLook({ name: e.target.value.slice(0, 20) })}
          onBlur={(e) => !e.target.value.trim() && setLook({ name: 'Pixel' })}
          aria-label="Character name"
        />
        <div className="wr-stage-row">
          <span className="muted">
            <strong className="wr-count">{earned}</strong> / {lockable.length} items earned
          </span>
          <button className="btn wr-shuffle" onClick={shuffle}>
            🎲 Shuffle
          </button>
        </div>
      </div>

      <div className="wr-tabs" role="tablist">
        {([{ slot: 'body', label: 'Body' }, ...SLOTS] as { slot: Tab; label: string }[]).map((t) => {
          const hasNew = t.slot !== 'body' && ITEMS.some((i) => i.slot === t.slot && newIds.has(i.id))
          return (
            <button key={t.slot} role="tab" aria-selected={tab === t.slot} className="chip wr-tab" aria-pressed={tab === t.slot} onClick={() => setTab(t.slot)}>
              {t.label}
              {hasNew && <span className="wr-dot" aria-label="new items" />}
            </button>
          )
        })}
      </div>

      {tab === 'body' ? (
        <BodyTab look={look} />
      ) : (
        <div className="wr-grid">
          {ITEMS.filter((i) => i.slot === tab).map((item) => (
            <ItemTile
              key={item.id}
              item={item}
              look={look}
              selected={look.equipped[item.slot] === item.id}
              unlocked={isUnlocked(item, progress)}
              isNew={newIds.has(item.id)}
              fraction={unlockFraction(item, progress)}
              progressLabel={item.unlock ? ruleProgressLabel(item.unlock, progress) : ''}
              onEquip={() => equip(item.slot, item.id)}
            />
          ))}
        </div>
      )}
    </main>
  )
}

function ItemTile({
  item, look, selected, unlocked, isNew, fraction, progressLabel, onEquip,
}: {
  item: Item; look: Look; selected: boolean; unlocked: boolean; isNew: boolean; fraction: number; progressLabel: string; onEquip: () => void
}) {
  const preview = useMemo(() => ({ ...look, equipped: { ...look.equipped, [item.slot]: item.id } }), [look, item])
  return (
    <button
      className={`wr-tile ${selected ? 'is-on' : ''} ${unlocked ? '' : 'is-locked'}`}
      onClick={onEquip}
      disabled={!unlocked}
      aria-pressed={selected}
    >
      {isNew && <span className="wr-new">NEW</span>}
      <PixelAvatar look={preview} scale={3} animate={false} className="wr-tile-art" />
      <span className="wr-tile-name">{item.name}</span>
      {!unlocked && item.unlock && (
        <span className="wr-lock">
          <span className="wr-lock-rule">🔒 {ruleLabel(item.unlock)}</span>
          <span className="wr-bar"><span style={{ width: `${fraction * 100}%` }} /></span>
          <span className="wr-lock-progress">{progressLabel}</span>
        </span>
      )}
    </button>
  )
}

function BodyTab({ look }: { look: Look }) {
  const setLook = useAvatar((s) => s.setLook)
  return (
    <>
      <h2 className="section-title wr-sub">Skin</h2>
      <div className="wr-swatches">
        {SKIN_TONES.map((c, i) => (
          <button key={c} className={`wr-swatch ${look.skin === i ? 'is-on' : ''}`} style={{ background: c }} aria-label={`Skin tone ${i + 1}`} aria-pressed={look.skin === i} onClick={() => setLook({ skin: i })} />
        ))}
      </div>

      <h2 className="section-title wr-sub">Hair colour</h2>
      <div className="wr-swatches">
        {HAIR_COLORS.map((c, i) => (
          <button key={c} className={`wr-swatch ${look.hairColor === i ? 'is-on' : ''}`} style={{ background: c }} aria-label={`Hair colour ${i + 1}`} aria-pressed={look.hairColor === i} onClick={() => setLook({ hairColor: i })} />
        ))}
      </div>

      <h2 className="section-title wr-sub">Hair style</h2>
      <div className="wr-grid">
        {HAIR_STYLES.map((h) => (
          <button key={h.id} className={`wr-tile ${look.hairStyle === h.id ? 'is-on' : ''}`} aria-pressed={look.hairStyle === h.id} onClick={() => setLook({ hairStyle: h.id })}>
            <PixelAvatar look={{ ...look, hairStyle: h.id }} scale={3} animate={false} className="wr-tile-art" />
            <span className="wr-tile-name">{h.name}</span>
          </button>
        ))}
      </div>
    </>
  )
}
