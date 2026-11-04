import {
  drawBody, drawBook, drawHead, drawFace, drawHairBack, drawHairFront, drawMoodFx, EYE_COLORS, HAIR_COLORS, hairStyleById, itemById,
  SKIN_TONES, type Mood, type Slot,
} from './catalog'
import { DX, emptyGrid, outline, painter, shifted, toRuns, type Run } from './sprite'

export interface Look {
  skin: number
  hairStyle: string
  hairColor: number
  eyeColor: number
  equipped: Record<Slot, string>
}

const BODY_DY = 1

/** Order clothes are layered in, bottom to top. */
const LAYERS: Slot[] = ['bottom', 'shoes', 'top']

/**
 * Builds the avatar as colour runs. `book` (a colour) replaces the held item with an
 * open book, used while studying.
 */
export const composeAvatar = (look: Look, mood: Mood, book?: string): { body: Run[]; fx: Run[] } => {
  const g = emptyGrid()
  const fxGrid = emptyGrid()
  const p = shifted(painter(g), DX, 0)
  const fx = shifted(painter(fxGrid), DX, 0)
  const skin = SKIN_TONES[look.skin] ?? SKIN_TONES[0]
  const hair = HAIR_COLORS[look.hairColor] ?? HAIR_COLORS[0]
  const style = hairStyleById(look.hairStyle)
  // Body layers sit one row below their own coordinates, leaving the head room for a taller face.
  const bp = shifted(p, 0, BODY_DY)
  const bodyCtx = { skin, fx: shifted(fx, 0, BODY_DY) }
  const headCtx = { skin, fx }
  const equipped = (Object.values(look.equipped) as string[]).map(itemById).filter((i) => i !== undefined)
  const hidden = new Set(equipped.flatMap((i) => i.hides ?? []))
  const wear = (slot: Slot, on = bp) => {
    if (!hidden.has(slot)) itemById(look.equipped[slot])?.draw(on, on === bp ? bodyCtx : headCtx)
  }

  drawHairBack(p, style, hair)
  wear('back', p) // wings and tails: over the back hair, behind the body
  drawHead(p, skin)
  drawBody(bp, skin, !book)
  LAYERS.forEach((s) => wear(s))
  drawFace(p, mood, EYE_COLORS[look.eyeColor] ?? EYE_COLORS[0])
  drawHairFront(p, style, hair)
  for (const item of equipped) item.over?.(p, headCtx)
  wear('face', p)
  wear('head', p)
  if (book) drawBook(bp, book, skin)
  else wear('held')
  drawMoodFx(fx, mood)

  return { body: toRuns(outline(g)), fx: toRuns(fxGrid) }
}
