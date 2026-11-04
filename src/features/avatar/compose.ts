import {
  drawBody, drawBook, drawFace, drawMoodFx, HAIR_COLORS, HAIR_STYLES, itemById, SKIN_TONES, type Mood, type Slot,
} from './catalog'
import { emptyGrid, outline, painter, toRuns, type Run } from './sprite'

export interface Look {
  skin: number
  hairStyle: string
  hairColor: number
  equipped: Record<Slot, string>
}

/** Order clothes are layered in, bottom to top. */
const LAYERS: Slot[] = ['bottom', 'shoes', 'top']

/**
 * Builds the avatar as colour runs. `book` (a colour) replaces the held item with an
 * open book, used while studying.
 */
export const composeAvatar = (look: Look, mood: Mood, book?: string): { body: Run[]; fx: Run[] } => {
  const g = emptyGrid()
  const fxGrid = emptyGrid()
  const p = painter(g)
  const fx = painter(fxGrid)
  const skin = SKIN_TONES[look.skin] ?? SKIN_TONES[0]
  const hair = HAIR_COLORS[look.hairColor] ?? HAIR_COLORS[0]
  const ctx = { skin, fx }
  const wear = (slot: Slot) => itemById(look.equipped[slot])?.draw(p, ctx)

  drawBody(p, skin)
  LAYERS.forEach(wear)
  drawFace(p, mood)
  ;(HAIR_STYLES.find((h) => h.id === look.hairStyle) ?? HAIR_STYLES[0]).draw(p, hair)
  wear('face')
  wear('head')
  if (book) drawBook(p, book, skin)
  else wear('held')
  drawMoodFx(fx, mood)

  return { body: toRuns(outline(g)), fx: toRuns(fxGrid) }
}
