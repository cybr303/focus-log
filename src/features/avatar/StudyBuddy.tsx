import { PixelAvatar } from './PixelAvatar'
import { useCharacter } from './useCharacter'

/** The character reading along next to the session clock (dozes off while paused). */
export function StudyBuddy({ bookColor }: { bookColor: string }) {
  const { look, mood } = useCharacter()
  return (
    <div className="study-buddy">
      <PixelAvatar look={look} mood={mood} scale={2} book={mood === 'study' ? bookColor : undefined} />
    </div>
  )
}
