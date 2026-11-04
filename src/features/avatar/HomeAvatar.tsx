import { Link } from 'react-router-dom'
import { PixelAvatar } from './PixelAvatar'
import { useCharacter } from './useCharacter'

/** "Overview" title with the character beside it; tapping the character opens the wardrobe. */
export function HomeAvatar() {
  const { avatar, look, mood, unseen, speech } = useCharacter()
  return (
    <div className="home-title-row">
      <div>
        <h1 className="page-title">Overview</h1>
        <p className="home-speech">
          <strong>{avatar.name}:</strong> {speech}
        </p>
      </div>
      <Link to="/wardrobe" className="home-avatar" aria-label={`Open wardrobe${unseen.length ? `, ${unseen.length} new items` : ''}`}>
        <PixelAvatar look={look} mood={mood} scale={4} />
        {unseen.length > 0 && <span className="home-avatar-badge">{unseen.length}</span>}
      </Link>
    </div>
  )
}
