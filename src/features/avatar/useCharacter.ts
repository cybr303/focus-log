import { useMemo } from 'react'
import { isPaused } from '../../lib/stats'
import { useNow } from '../../lib/useNow'
import { useStore } from '../../store/store'
import { useAvatar } from './avatarStore'
import type { Look } from './compose'
import { computeProgress, moodFor, resolveEquipped, speechFor, unseenUnlocks } from './progress'

/** Everything a screen needs to show the character: its look (locked items stripped), mood and progress. */
export const useCharacter = () => {
  const now = useNow(30_000)
  const modules = useStore((s) => s.modules)
  const sessions = useStore((s) => s.sessions)
  const active = useStore((s) => s.active)
  const avatar = useAvatar()

  const progress = useMemo(() => computeProgress({ modules, sessions }, now), [modules, sessions, now])
  const unseen = useMemo(() => unseenUnlocks(progress, avatar.seen), [progress, avatar.seen])
  const equipped = useMemo(() => resolveEquipped(avatar.equipped, progress), [avatar.equipped, progress])
  const look: Look = useMemo(
    () => ({ skin: avatar.skin, hairStyle: avatar.hairStyle, hairColor: avatar.hairColor, equipped }),
    [avatar.skin, avatar.hairStyle, avatar.hairColor, equipped],
  )
  const lastEnd = sessions.reduce<number | undefined>((m, s) => (m === undefined || s.end > m ? s.end : m), undefined)
  const mood = moodFor({
    now,
    activeState: active ? (isPaused(active) ? 'paused' : 'running') : 'none',
    lastEnd,
    hasUnseen: unseen.length > 0,
  })

  return { avatar, look, mood, progress, unseen, speech: speechFor(mood, unseen.length, now) }
}
