import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DEFAULT_EQUIPPED, HAIR_COLORS, HAIR_STYLES, SKIN_TONES, type Slot } from './catalog'
import type { Look } from './compose'

/** Kept apart from the study data (its own localStorage key), so the avatar can never affect your sessions. */
export const AVATAR_STORAGE_KEY = 'focuslog-avatar-v1'

export interface AvatarData extends Look {
  name: string
  /** Unlockable items already shown in the wardrobe; anything else earned shows as NEW. */
  seen: string[]
}

interface AvatarActions {
  setLook: (patch: Partial<Omit<AvatarData, 'equipped' | 'seen'>>) => void
  equip: (slot: Slot, id: string) => void
  markSeen: (ids: string[]) => void
  replaceAvatar: (data: AvatarData) => void
}

export const DEFAULT_AVATAR: AvatarData = {
  name: 'Pixel',
  skin: 1,
  hairStyle: 'short',
  hairColor: 1,
  equipped: { ...DEFAULT_EQUIPPED },
  seen: [],
}

export const useAvatar = create<AvatarData & AvatarActions>()(
  persist(
    (set) => ({
      ...DEFAULT_AVATAR,
      setLook: (patch) => set(patch),
      equip: (slot, id) => set((s) => ({ equipped: { ...s.equipped, [slot]: id } })),
      markSeen: (ids) => set((s) => ({ seen: [...new Set([...s.seen, ...ids])] })),
      replaceAvatar: (data) => set(data),
    }),
    {
      name: AVATAR_STORAGE_KEY,
      version: 1,
      partialize: ({ name, skin, hairStyle, hairColor, equipped, seen }): AvatarData => ({
        name, skin, hairStyle, hairColor, equipped, seen,
      }),
    },
  ),
)

/** Validates avatar data from a backup file; returns null if it's missing or malformed. */
export const parseAvatar = (raw: unknown): AvatarData | null => {
  if (!raw || typeof raw !== 'object') return null
  const a = raw as Record<string, unknown>
  const int = (v: unknown, max: number) => (Number.isInteger(v) && (v as number) >= 0 && (v as number) < max ? (v as number) : null)
  const skin = int(a.skin, SKIN_TONES.length)
  const hairColor = int(a.hairColor, HAIR_COLORS.length)
  if (skin === null || hairColor === null) return null
  if (typeof a.hairStyle !== 'string' || !HAIR_STYLES.some((h) => h.id === a.hairStyle)) return null
  if (!a.equipped || typeof a.equipped !== 'object') return null
  const equipped = { ...DEFAULT_EQUIPPED }
  for (const slot of Object.keys(DEFAULT_EQUIPPED) as Slot[]) {
    const v = (a.equipped as Record<string, unknown>)[slot]
    if (typeof v === 'string') equipped[slot] = v
  }
  return {
    name: typeof a.name === 'string' && a.name.trim() ? a.name.trim().slice(0, 20) : DEFAULT_AVATAR.name,
    skin,
    hairStyle: a.hairStyle,
    hairColor,
    equipped,
    seen: Array.isArray(a.seen) ? a.seen.filter((x): x is string => typeof x === 'string') : [],
  }
}
