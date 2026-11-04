import {
  drawBody, drawBook, drawHead, drawFace, drawHairBack, drawHairFront, drawMoodFx, EYE_COLORS, HAIR_COLORS, hairStyleById, itemById,
  SKIN_TONES, type Mood, type Slot,
} from './catalog'
import { emptyGrid, outline, painter, shifted, toRuns, type Run } from './sprite'

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
  const p = painter(g)
  const fx = painter(fxGrid)
  const skin = SKIN_TONES[look.skin] ?? SKIN_TONES[0]
  const hair = HAIR_COLORS[look.hairColor] ?? HAIR_COLORS[0]
  const style = hairStyleById(look.hairStyle)
  // Body layers sit one row below their own coordinates, leaving the head room for a taller face.
  const bp = shifted(p, BODY_DY)
  const bodyCtx = { skin, fx: shifted(fx, BODY_DY) }
  const wear = (slot: Slot, on = bp) => itemById(look.equipped[slot])?.draw(on, on === bp ? bodyCtx : { skin, fx })

  drawHairBack(p, style, hair)
  drawHead(p, skin)
  drawBody(bp, skin, !book)
  LAYERS.forEach((s) => wear(s))
  drawFace(p, mood, EYE_COLORS[look.eyeColor] ?? EYE_COLORS[0])
  drawHairFront(p, style, hair)
  wear('face', p)
  wear('head', p)
  if (book) drawBook(bp, book, skin)
  else wear('held')
  drawMoodFx(fx, mood)

  return { body: toRuns(outline(g)), fx: toRuns(fxGrid) }
}
