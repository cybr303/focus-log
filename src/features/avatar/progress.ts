import { streaks, totalDuration } from '../../lib/stats'
import type { AppData } from '../../lib/types'
import { DEFAULT_EQUIPPED, ITEMS, itemById, type Item, type Mood, type Progress, type Rule, type Slot } from './catalog'

/** Achievements derived from the study data. Nothing is stored, so unlocks can never drift from your real progress. */
export const computeProgress = (data: Pick<AppData, 'modules' | 'sessions'>, now: number): Progress => {
  const hourOf = (ts: number) => new Date(ts).getHours()
  return {
    hours: totalDuration(data.sessions) / 3_600_000,
    sessions: data.sessions.length,
    longestStreak: streaks(data.sessions, now).longest,
    fiveStars: data.sessions.filter((s) => s.productivity === 5).length,
    nightSessions: data.sessions.filter((s) => hourOf(s.start) >= 22 || hourOf(s.start) < 4).length,
    earlySessions: data.sessions.filter((s) => hourOf(s.start) >= 5 && hourOf(s.start) < 9).length,
    modules: data.modules.length,
    topics: data.modules.reduce((n, m) => n + m.topics.length, 0),
  }
}

export const isUnlocked = (item: Item, p: Progress): boolean => !item.unlock || p[item.unlock.kind] >= item.unlock.n

/** 0–1 progress toward an item's unlock. */
export const unlockFraction = (item: Item, p: Progress): number =>
  item.unlock ? Math.min(1, p[item.unlock.kind] / item.unlock.n) : 1

export const ruleLabel = ({ kind, n }: Rule): string => {
  switch (kind) {
    case 'hours':
      return `Study ${n}h in total`
    case 'sessions':
      return n === 1 ? 'Finish your first session' : `Finish ${n} sessions`
    case 'longestStreak':
      return `Reach a ${n}-day streak`
    case 'fiveStars':
      return `Rate ${n} sessions 5 stars`
    case 'nightSessions':
      return `${n} sessions started after 22:00`
    case 'earlySessions':
      return `${n} sessions started before 9:00`
    case 'modules':
      return `Create ${n} modules`
    case 'topics':
      return `Add ${n} topics`
  }
}

/** '3.2 / 5h', '4 / 10' */
export const ruleProgressLabel = ({ kind, n }: Rule, p: Progress): string => {
  const v = p[kind]
  return kind === 'hours' ? `${Math.min(v, n).toFixed(1).replace(/\.0$/, '')} / ${n}h` : `${Math.min(v, n)} / ${n}`
}

/** Unlockable (non-free) items you've earned but not yet looked at in the wardrobe. */
export const unseenUnlocks = (p: Progress, seen: string[]): Item[] =>
  ITEMS.filter((i) => i.unlock && isUnlocked(i, p) && !seen.includes(i.id))

/** Equipped items, falling back to the slot default if one is locked or no longer exists. */
export const resolveEquipped = (equipped: Partial<Record<Slot, string>>, p: Progress): Record<Slot, string> => {
  const out = { ...DEFAULT_EQUIPPED }
  for (const slot of Object.keys(DEFAULT_EQUIPPED) as Slot[]) {
    const item = itemById(equipped[slot] ?? '')
    if (item && item.slot === slot && isUnlocked(item, p)) out[slot] = item.id
  }
  return out
}

export interface MoodInput {
  now: number
  activeState: 'none' | 'running' | 'paused'
  /** End of the most recent finished session, if any. */
  lastEnd?: number
  hasUnseen: boolean
}

/** The character is never sad: at worst it's sleepy. */
export const moodFor = ({ now, activeState, lastEnd, hasUnseen }: MoodInput): Mood => {
  if (activeState === 'running') return 'study'
  if (activeState === 'paused') return 'sleepy'
  if (hasUnseen) return 'celebrate'
  if (lastEnd !== undefined && now - lastEnd < 60 * 60_000) return 'happy'
  const h = new Date(now).getHours()
  if (h >= 0 && h < 5) return 'sleepy'
  return 'idle'
}

export const speechFor = (mood: Mood, unseen: number, now: number): string => {
  switch (mood) {
    case 'celebrate':
      return unseen === 1 ? 'Ooh, a new item to try on!' : `${unseen} new items to try on!`
    case 'happy':
      return 'Nice session! Proud of you.'
    case 'sleepy':
      return 'Getting late… one more page?'
    case 'study':
      return 'Focusing with you.'
    default: {
      const h = new Date(now).getHours()
      if (h < 12) return 'Morning! Ready to learn?'
      if (h < 18) return 'Let’s get a session in.'
      return 'Evening study crew.'
    }
  }
}
