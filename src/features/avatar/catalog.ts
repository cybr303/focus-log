import { DX, mix, shade, type Painter } from './sprite'

/*
 * Chibi anime pixel art on a 32×44 canvas: big head on top, small body below.
 * Head layers (face, hair, hats, glasses) use canvas coordinates:
 *   face x9–22, y8–22 · bangs end y12 · eyes x10–14 and x17–21, y13–18 · mouth y20
 * Body layers (body, clothes, held items) are drawn one row lower by compose(), in these coordinates:
 *   torso x11–20, y23–31 · sleeves x8–10 / x21–23 · hands x9–10 / x21–22, y31–32
 *   hips y32–33 · legs x12–14 / x17–19, y34–39 · shoes y39–41
 */

export const SKIN_TONES = ['#FFE9DE', '#FCDCC8', '#F1C6A4', '#D9A07A', '#A86F4E', '#6E452F'] as const

export const HAIR_COLORS = [
  '#9FD35F', '#D6EFA0', '#2B2F45', '#7A5236', '#F2D98A', '#F4A6C8', '#B9A3F0', '#8CC8F0', '#EDEFF5', '#D9584E',
] as const

export const EYE_COLORS = ['#3F7FBF', '#3F9A6E', '#9B5FD6', '#7A4A2E', '#D65F8E', '#4A4E6A'] as const

export type Slot = 'top' | 'bottom' | 'shoes' | 'head' | 'face' | 'held' | 'back'

export const SLOTS: { slot: Slot; label: string }[] = [
  { slot: 'top', label: 'Tops' },
  { slot: 'bottom', label: 'Bottoms' },
  { slot: 'shoes', label: 'Shoes' },
  { slot: 'head', label: 'Head' },
  { slot: 'face', label: 'Face' },
  { slot: 'back', label: 'Back' },
  { slot: 'held', label: 'Hands' },
]

/** What the player has achieved; unlock rules are thresholds on these. */
export interface Progress {
  hours: number
  sessions: number
  longestStreak: number
  fiveStars: number
  nightSessions: number
  earlySessions: number
  modules: number
  topics: number
}

export type Rule = { kind: keyof Progress; n: number }

export interface DrawCtx {
  skin: string
  /** Overlay painter for effects that shouldn't get an outline (steam, sparkles). */
  fx: Painter
}

export interface Item {
  id: string
  name: string
  slot: Slot
  /** Missing rule = free from the start. */
  unlock?: Rule
  draw: (p: Painter, ctx: DrawCtx) => void
  /** Drawn after the hair, in canvas coordinates (a hood pulled up, a robotic arm). */
  over?: (p: Painter, ctx: DrawCtx) => void
  /** Slots this item covers completely, which are then not drawn (a one-piece hides bottoms). */
  hides?: Slot[]
}

/** Base, shadow, deep line and highlight tones for a colour. */
const tones = (c: string) => ({ c, sh: shade(c, 0.16), dk: shade(c, 0.36), lt: shade(c, -0.3) })

// ---------- Body and face ----------

const FACE = [
  '...SSSSSSSS...',
  '.SSSSSSSSSSSS.',
  ...Array<string>(10).fill('SSSSSSSSSSSSSS'),
  '.SSSSSSSSSSSS.',
  '..SSSSSSSSSS..',
  '....ssssss....',
]

export const drawHead = (p: Painter, skin: string) => p.map(9, 8, FACE, { S: skin, s: shade(skin, 0.1) })

/** Body coordinates. `hands` is false while holding the study book (the book draws its own hands). */
export const drawBody = (p: Painter, skin: string, hands = true) => {
  const s = shade(skin, 0.1)
  p.rect(14, 22, 4, 1, s) // neck
  p.rect(11, 23, 10, 9, skin) // torso
  p.rect(8, 23, 3, 8, skin) // arms
  p.rect(21, 23, 3, 8, skin)
  if (hands) {
    p.rect(9, 31, 2, 2, skin)
    p.rect(21, 31, 2, 2, skin)
  }
  p.rect(11, 32, 10, 2, skin) // hips
  p.rect(12, 34, 3, 7, skin) // legs + feet
  p.rect(17, 34, 3, 7, skin)
}

export type Mood = 'idle' | 'happy' | 'sleepy' | 'study' | 'celebrate'

const LASH = '#1b2440'
const MOUTH = '#c06a72'
const BLUSH = '#f8b4bf'

export const drawFace = (p: Painter, mood: Mood, eye: string) => {
  const pal = { e: LASH, i: eye, d: shade(eye, 0.4), j: shade(eye, -0.35), w: '#ffffff' }
  const eyes = (rows: string[], y = 13) => {
    p.map(10, y, rows, pal)
    p.map(17, y, rows, pal)
  }
  const blush = (h: number) => {
    p.rect(10, 19, 3, h, BLUSH)
    p.rect(19, 19, 3, h, BLUSH)
  }

  switch (mood) {
    case 'happy':
      eyes(['.eee.', 'e...e'], 15)
      blush(2)
      p.rect(15, 20, 2, 1, '#7a3240')
      p.rect(15, 21, 2, 1, '#e8828f')
      break
    case 'celebrate':
      eyes(['eeeee', 'ewdde', 'iwdwi', 'iddwi', 'ijjji', '.iii.'])
      blush(1)
      p.map(14, 20, ['MMMM', '.TT.'], { M: '#6e2a3a', T: '#e8828f' })
      break
    case 'sleepy':
      eyes(['e...e', '.eee.'], 16)
      blush(1)
      p.px(16, 20, MOUTH)
      break
    case 'study':
      eyes(['eeeee', 'idddi', 'ijjji', '.iii.'], 15)
      p.rect(15, 20, 2, 1, MOUTH)
      break
    default:
      eyes(['eeeee', 'ewdde', 'iwddi', 'idddi', 'ijjji', '.iii.'])
      blush(1)
      p.px(15, 20, MOUTH)
      p.px(16, 20, MOUTH)
  }
}

// ---------- Hair: back hair + dome + bangs + side locks + extras ----------

type HairTones = ReturnType<typeof tones>
type Bangs = 'messy' | 'blunt' | 'swept'
type Back = 'short' | 'bob' | 'long' | 'hime' | 'wolf'
type Extra = 'ahoge' | 'twintails' | 'ponytail' | 'buns'

const RIBBON = '#f28ab2'

const drawBack = (p: Painter, t: HairTones, back: Back) => {
  const c = t.sh
  switch (back) {
    case 'short':
      p.rect(5, 8, 22, 10, c)
      break
    case 'bob':
      p.rect(4, 8, 24, 16, c)
      p.rect(5, 24, 3, 1, c)
      p.rect(24, 24, 3, 1, c)
      break
    case 'long':
      p.rect(4, 8, 24, 18, c)
      p.rect(3, 16, 26, 16, c)
      p.map(3, 32, ['##.######......######.##', '#..#####........#####..#', '...##.##........##.##...', '....#..#........#..#....'], { '#': c })
      for (const x of [6, 9, 22, 25]) p.rect(x, 18, 1, 13, t.dk)
      break
    case 'hime':
      p.rect(4, 8, 24, 28, c)
      for (const x of [7, 10, 21, 24]) p.rect(x, 20, 1, 15, t.dk)
      break
    case 'wolf':
      p.rect(4, 8, 24, 20, c)
      p.map(3, 28, ['.##.###.####..####.###.##.', '.#...#...##....##...#...#.', '..........................'], { '#': c })
      for (const x of [7, 24]) p.rect(x, 18, 1, 9, t.dk)
      break
  }
}

const drawExtraBack = (p: Painter, t: HairTones, extra?: Extra) => {
  if (extra === 'twintails') {
    const tail = ['.####', '#####', '#####', ...Array<string>(14).fill('####.'), '.###.', '.##..', '..#..']
    p.map(1, 11, tail, { '#': t.c })
    p.map(26, 11, tail.map((r) => [...r].reverse().join('')), { '#': t.c })
    p.rect(2, 13, 1, 12, t.lt)
    p.rect(29, 13, 1, 12, t.lt)
    p.rect(4, 10, 2, 2, RIBBON)
    p.rect(26, 10, 2, 2, RIBBON)
  }
  if (extra === 'ponytail') {
    p.rect(25, 8, 4, 5, t.c)
    p.rect(26, 13, 4, 14, t.c)
    p.rect(27, 27, 2, 3, t.c)
    p.rect(28, 14, 1, 11, t.lt)
    p.rect(24, 8, 2, 2, RIBBON)
  }
}

const DOME: [number, number, number][] = [
  [3, 10, 21], [4, 8, 23], [5, 7, 24], [6, 6, 25], [7, 5, 26], [8, 4, 27], [9, 4, 27], [10, 4, 27], [11, 4, 27],
]

const drawDome = (p: Painter, t: HairTones) => {
  for (const [y, a, b] of DOME) {
    p.rect(a, y, b - a + 1, 1, t.c)
    p.px(a, y, t.sh)
    p.px(b, y, t.sh)
  }
  // angel-ring highlight
  p.rect(11, 5, 4, 1, t.lt)
  p.rect(17, 5, 4, 1, t.lt)
  p.rect(10, 6, 2, 1, t.lt)
  p.rect(20, 6, 2, 1, t.lt)
  // strand lines
  for (const [x, y] of [[11, 9], [11, 10], [10, 11], [15, 8], [15, 9], [14, 10], [14, 11], [19, 9], [19, 10], [20, 11]])
    p.px(x, y, t.sh)
}

const drawBangs = (p: Painter, t: HairTones, bangs: Bangs) => {
  if (bangs === 'messy') {
    for (const [a, b] of [[4, 8], [10, 12], [15, 16], [18, 20], [23, 27]]) p.rect(a, 12, b - a + 1, 1, t.c)
    for (const x of [10, 12, 18, 20]) p.px(x, 12, t.sh)
    p.rect(15, 13, 2, 1, t.c)
    p.px(15, 14, t.sh)
  } else if (bangs === 'blunt') {
    p.rect(4, 12, 24, 1, t.c)
    p.rect(9, 12, 14, 1, t.sh)
  } else {
    p.rect(4, 12, 11, 1, t.c)
    p.rect(4, 13, 7, 1, t.c)
    p.rect(4, 14, 5, 1, t.sh)
    p.rect(23, 12, 5, 1, t.c)
    for (const [x, y] of [[13, 11], [12, 12], [10, 13]]) p.px(x, y, t.sh)
  }
}

const drawLocks = (p: Painter, t: HairTones, toY: number) => {
  for (let y = 12; y <= toY; y++) {
    const tip = toY - y
    if (tip >= 2) {
      const lit = y > 15 && tip > 3 && y % 6 < 3
      p.map(5, y, ['dLHh'], { d: t.dk, h: t.sh, L: lit ? t.lt : t.c, H: t.c })
      p.map(23, y, ['hHLd'], { d: t.dk, h: t.sh, L: lit ? t.lt : t.c, H: t.c })
    } else if (tip === 1) {
      p.rect(6, y, 2, 1, t.c)
      p.rect(24, y, 2, 1, t.c)
    } else {
      p.px(6, y, t.sh)
      p.px(25, y, t.sh)
    }
  }
  // frame the cheeks
  p.rect(9, 12, 1, 5, t.sh)
  p.rect(22, 12, 1, 5, t.sh)
}

const drawExtraFront = (p: Painter, t: HairTones, extra?: Extra) => {
  if (extra === 'ahoge') p.map(15, 0, ['...hH', '..hH.', '.hH..'], { h: t.sh, H: t.c })
  if (extra === 'buns')
    for (const x of [5, 22]) {
      p.map(x, 1, ['.###.', '#####', '#####', '#####', '.###.'], { '#': t.c })
      p.rect(x + 1, 2, 2, 1, t.lt)
    }
}

export interface HairStyle {
  id: string
  name: string
  back: Back
  bangs: Bangs
  locksTo: number
  extra?: Extra
}

export const HAIR_STYLES: HairStyle[] = [
  { id: 'long', name: 'Long', back: 'long', bangs: 'messy', locksTo: 31, extra: 'ahoge' },
  { id: 'bob', name: 'Bob', back: 'bob', bangs: 'blunt', locksTo: 22 },
  { id: 'short', name: 'Short', back: 'short', bangs: 'messy', locksTo: 18, extra: 'ahoge' },
  { id: 'twintails', name: 'Twin tails', back: 'short', bangs: 'blunt', locksTo: 20, extra: 'twintails' },
  { id: 'ponytail', name: 'Ponytail', back: 'short', bangs: 'swept', locksTo: 20, extra: 'ponytail' },
  { id: 'hime', name: 'Hime cut', back: 'hime', bangs: 'blunt', locksTo: 33 },
  { id: 'spiky', name: 'Wolf cut', back: 'wolf', bangs: 'messy', locksTo: 26, extra: 'ahoge' },
  { id: 'bun', name: 'Space buns', back: 'short', bangs: 'swept', locksTo: 21, extra: 'buns' },
]

/** Styles from the first version of the character, mapped to their closest new style. */
const HAIR_ALIASES: Record<string, string> = { buzz: 'short', curly: 'long' }

export const isHairStyleId = (id: string): boolean => id in HAIR_ALIASES || HAIR_STYLES.some((h) => h.id === id)

export const hairStyleById = (id: string): HairStyle =>
  HAIR_STYLES.find((h) => h.id === (HAIR_ALIASES[id] ?? id)) ?? HAIR_STYLES[0]

export const drawHairBack = (p: Painter, style: HairStyle, color: string) => {
  const t = tones(color)
  drawBack(p, t, style.back)
  drawExtraBack(p, t, style.extra)
}

export const drawHairFront = (p: Painter, style: HairStyle, color: string) => {
  const t = tones(color)
  drawDome(p, t)
  drawBangs(p, t, style.bangs)
  drawLocks(p, t, style.locksTo)
  drawExtraFront(p, t, style.extra)
}

// ---------- Clothes ----------

interface TopStyle {
  c: string
  sleeve: 'short' | 'long' | 'baggy'
  sleeveColor?: string
  collar?: 'crew' | 'v' | 'turtle' | 'hood' | 'sailor' | 'open'
  /** Last row of the garment (31 = waist; longer for coats). */
  bottom?: number
  pattern?: (x: number, y: number) => string | null
}

const top = (st: TopStyle) => (p: Painter, { skin }: DrawCtx) => {
  const t = tones(st.c)
  const s = tones(st.sleeveColor ?? st.c)
  const bottom = st.bottom ?? 31
  for (let y = 23; y <= bottom; y++)
    for (let x = 11; x <= 20; x++) p.px(x, y, st.pattern?.(x, y) ?? (x === 20 ? t.sh : x === 11 ? t.lt : t.c))
  p.rect(11, bottom, 10, 1, t.sh)

  const [w, end] = st.sleeve === 'short' ? [3, 26] : st.sleeve === 'long' ? [3, 30] : [4, 31]
  for (const x0 of [11 - w, 21]) {
    for (let y = 23; y <= end; y++)
      for (let x = x0; x < x0 + w; x++) p.px(x, y, st.pattern?.(x, y) ?? s.c)
    p.rect(x0, end, w, 1, s.sh)
  }
  p.rect(10, 24, 1, end - 24, s.sh) // seams between arm and body
  p.rect(21, 24, 1, end - 24, s.sh)

  switch (st.collar) {
    case 'crew':
      p.rect(14, 23, 4, 1, t.sh)
      break
    case 'v':
      p.map(14, 23, ['hSSh', '.hh.'], { h: t.sh, S: skin })
      break
    case 'turtle':
      p.rect(13, 22, 6, 2, t.c)
      p.rect(13, 23, 6, 1, t.sh)
      break
    case 'hood':
      p.rect(12, 22, 8, 2, t.sh)
      p.rect(14, 24, 1, 4, '#f4f4f6')
      p.rect(17, 24, 1, 4, '#f4f4f6')
      break
    case 'sailor':
      p.rect(11, 23, 10, 3, '#2f4a7a')
      p.rect(11, 25, 10, 1, '#f4f4f6')
      p.map(14, 26, ['RRRR', '.RR.'], { R: '#e05a5a' })
      break
    case 'open':
      p.rect(14, 23, 4, bottom - 22, '#22303f')
      p.px(15, 26, '#cfe86a')
      p.px(16, 26, '#cfe86a')
      break
  }
}

const legs = (p: Painter, c: string, toY = 39) => {
  const t = tones(c)
  p.rect(11, 32, 10, 2, t.c)
  p.rect(12, 34, 3, toY - 33, t.c)
  p.rect(17, 34, 3, toY - 33, t.c)
  p.rect(14, 34, 1, toY - 33, t.sh)
  p.rect(17, 34, 1, toY - 33, t.sh)
  p.rect(11, 32, 10, 1, t.sh) // waistband
}

const shoe = (c: string, sole: string, from = 39) => (p: Painter) => {
  const t = tones(c)
  for (const [x, wide] of [[12, 11], [17, 17]]) {
    p.rect(x, from, 3, 40 - from, t.c)
    p.rect(wide, 40, 4, 1, t.c)
    p.rect(wide, 41, 4, 1, sole)
  }
  if (from < 38) {
    p.rect(12, from, 3, 1, t.lt)
    p.rect(17, from, 3, 1, t.lt)
  }
}

const ring = (c: string, corners: boolean) => (p: Painter) => {
  for (const x0 of [9, 16]) {
    p.rect(x0 + 1, 12, 5, 1, c)
    p.rect(x0 + 1, 19, 5, 1, c)
    p.rect(x0, 13, 1, 6, c)
    p.rect(x0 + 6, 13, 1, 6, c)
    if (corners) for (const [dx, dy] of [[0, 12], [6, 12], [0, 19], [6, 19]]) p.px(x0 + dx, dy, c)
  }
}

const NEON = '#38E1FF'
const PINK = '#FF4FD8'
const INK = '#2A2D3A'
const METAL = '#A7B1C2'
const METAL_DK = '#6C7689'

/** Hood pulled up over the head (canvas coordinates; drawn over the hair). */
const hoodUp = (c: string, ears?: string) => (p: Painter) => {
  const t = tones(c)
  for (const [y, a, b] of [[1, 9, 22], [2, 7, 24], [3, 5, 26], [4, 4, 27], [5, 3, 28], [6, 3, 28], [7, 3, 28]])
    p.rect(a, y, b - a + 1, 1, t.c)
  p.rect(10, 2, 6, 1, t.lt)
  p.rect(8, 7, 16, 1, t.dk) // rim over the forehead
  for (let y = 8; y <= 23; y++) {
    p.rect(3, y, 5, 1, t.c)
    p.rect(24, y, 5, 1, t.c)
    p.px(7, y, t.dk)
    p.px(24, y, t.dk)
  }
  if (ears) {
    p.map(5, 0, ['#....', '##...', '#e#..', '#ee#.'], { '#': t.c, e: ears })
    p.map(23, 0, ['....#', '...##', '..#e#', '.#ee#'], { '#': t.c, e: ears })
  }
}

/** Over-ear headset; `ears` adds cat ears on the band, `mic` a boom mic. */
const headset = (o: { band: string; cup: string; ring: string; ears?: string; mic?: boolean }) => (p: Painter) => {
  p.rect(10, 1, 12, 1, o.band)
  p.rect(8, 2, 2, 1, o.band)
  p.rect(22, 2, 2, 1, o.band)
  p.rect(6, 3, 2, 1, o.band)
  p.rect(24, 3, 2, 1, o.band)
  p.rect(5, 4, 1, 6, o.band)
  p.rect(26, 4, 1, 6, o.band)
  for (const x of [1, 26]) {
    p.rect(x, 9, 5, 9, o.cup)
    p.rect(x + 1, 11, 3, 5, o.ring)
    p.rect(x + 2, 12, 1, 3, o.cup)
  }
  if (o.ears) {
    p.map(6, 0, ['#...', '##..', '#e#.', '#ee#'], { '#': o.band, e: o.ears })
    p.map(22, 0, ['...#', '..##', '.#e#', '#ee#'], { '#': o.band, e: o.ears })
  }
  if (o.mic) {
    for (const [x, y] of [[25, 17], [24, 18], [23, 19]]) p.px(x, y, o.cup)
    p.rect(21, 19, 2, 2, o.ring)
  }
}

/** Mirrors an ASCII map left-to-right. */
const flip = (rows: string[]) => rows.map((r) => [...r].reverse().join(''))

/** A pair of wings reaching into the canvas margins (x < 0 and x > 31 in art coordinates). */
const wings = (rows: string[], pal: Record<string, string>, y: number) => (p: Painter) => {
  p.map(-DX, y, rows, pal)
  p.map(32 + DX - rows[0].length, y, flip(rows), pal)
}

const ANGEL = [
  '..........WW', '........WWWW', '......WWWWWW', '....WWWWWWWW', '..WWWWWWWWWW', '.WWWWWWWWWWW', 'WWWWWWWWWWWW',
  'WSSWWWWWWWWW', '.WWSSWWWWWWW', 'WSSWWSSWWWWW', '.WWSSWWSSWWW', '..SWWSSWWSWW', '...SWWSWWSW.', '....SW.SW...', '.....S......',
]
const BAT = [
  '...........#', '.........###', '.......#####', '.....#######', '...#########', '.###########', '############',
  '#mmm#mmm####', '#mmm#mmm####', '.mm.#mm.####', '.m...m..m###', '.........m##', '..........m#',
]
const CYBER_WING = [
  '..........FF', '........FFNF', '......FFNNNF', '....FFNnNNNF', '..FFNNnNNNNF', 'FFFFFFFFFFFF', '.FFNNnNNNNF.', '...FFNNNNF..', '.....FFFF...',
]

const none = (slot: Slot): Item => ({ id: `${slot}-none`, name: 'None', slot, draw: () => {} })

export const ITEMS: Item[] = [
  // Tops
  { id: 'tee-white', name: 'White tee', slot: 'top', draw: top({ c: '#F4F4F8', sleeve: 'short', collar: 'crew' }) },
  {
    id: 'gamer-tee',
    name: 'Gamer tee',
    slot: 'top',
    draw: (p, ctx) => {
      top({ c: INK, sleeve: 'short', collar: 'crew' })(p, ctx)
      p.map(13, 25, ['.CCCC.', 'CwCCaC', 'CCCCCC', 'C.CC.C'], { C: '#9FD35F', w: '#FFFFFF', a: PINK })
    },
  },
  { id: 'turtleneck', name: 'Cozy turtleneck', slot: 'top', draw: top({ c: '#F6F3EE', sleeve: 'baggy', collar: 'turtle' }) },
  { id: 'hoodie', name: 'Oversized hoodie', slot: 'top', unlock: { kind: 'hours', n: 5 }, draw: top({ c: '#6E8C99', sleeve: 'baggy', collar: 'hood' }) },
  {
    id: 'hoodie-up',
    name: 'Hood up',
    slot: 'top',
    unlock: { kind: 'hours', n: 8 },
    draw: top({ c: '#4A5A78', sleeve: 'baggy', collar: 'hood' }),
    over: hoodUp('#4A5A78'),
  },
  {
    id: 'cat-hoodie',
    name: 'Cat hoodie',
    slot: 'top',
    unlock: { kind: 'longestStreak', n: 7 },
    draw: (p, ctx) => {
      top({ c: INK, sleeve: 'baggy', collar: 'hood' })(p, ctx)
      p.map(13, 26, ['.p.p.', 'p...p', '.ppp.', '.ppp.'], { p: '#F4A6C8' })
    },
    over: hoodUp(INK, '#F4A6C8'),
  },
  { id: 'sailor', name: 'Sailor top', slot: 'top', unlock: { kind: 'topics', n: 8 }, draw: top({ c: '#F4F4F8', sleeve: 'long', collar: 'sailor' }) },
  { id: 'jacket', name: 'Bomber jacket', slot: 'top', unlock: { kind: 'hours', n: 12 }, draw: top({ c: '#7D9AA8', sleeve: 'baggy', collar: 'open' }) },
  {
    id: 'techwear',
    name: 'Techwear jacket',
    slot: 'top',
    unlock: { kind: 'sessions', n: 25 },
    draw: (p, ctx) => {
      top({ c: '#23262F', sleeve: 'baggy', collar: 'open' })(p, ctx)
      for (let i = 0; i < 8; i++) p.px(12 + i, 24 + i, '#5B6070')
      p.px(16, 28, '#C8CDD6')
      p.rect(7, 31, 4, 1, NEON)
      p.rect(21, 31, 4, 1, NEON)
    },
  },
  {
    id: 'cyber-suit',
    name: 'Cyber bodysuit',
    slot: 'top',
    unlock: { kind: 'hours', n: 50 },
    hides: ['bottom'],
    draw: (p, ctx) => {
      legs(p, '#1C2030')
      top({ c: '#1C2030', sleeve: 'long', collar: 'turtle' })(p, ctx)
      p.rect(15, 24, 1, 9, NEON)
      p.rect(8, 27, 3, 1, NEON)
      p.rect(21, 27, 3, 1, NEON)
      p.rect(13, 34, 1, 5, NEON)
      p.rect(18, 34, 1, 5, NEON)
      p.rect(11, 32, 10, 1, PINK)
    },
  },

  // Bottoms
  { id: 'jeans', name: 'Jeans', slot: 'bottom', draw: (p) => legs(p, '#5B7BAA') },
  { id: 'shorts', name: 'Shorts', slot: 'bottom', draw: (p) => legs(p, '#C9B48A', 35) },
  {
    id: 'skirt',
    name: 'Pleated skirt',
    slot: 'bottom',
    draw: (p) => {
      const t = tones('#E58FB0')
      p.map(9, 31, ['..CCCCCCCCCC..', '.CCCCCCCCCCCC.', 'CCCCCCCCCCCCCC', 'CCCCCCCCCCCCCC'], { C: t.c })
      for (const x of [11, 14, 17, 20]) p.rect(x, 33, 1, 2, t.sh)
      p.rect(11, 31, 10, 1, t.sh)
    },
  },
  {
    id: 'tights',
    name: 'Skirt & tights',
    slot: 'bottom',
    draw: (p) => {
      legs(p, '#24304A', 40)
      p.map(9, 31, ['..CCCCCCCCCC..', '.CCCCCCCCCCCC.', 'CCCCCCCCCCCCCC'], { C: '#3D4A66' })
    },
  },
  {
    id: 'thigh-highs',
    name: 'Thigh-highs',
    slot: 'bottom',
    unlock: { kind: 'hours', n: 2 },
    draw: (p) => {
      p.rect(11, 32, 10, 2, INK)
      p.rect(12, 34, 3, 1, INK)
      p.rect(17, 34, 3, 1, INK)
      p.rect(12, 36, 3, 4, '#1C2030')
      p.rect(17, 36, 3, 4, '#1C2030')
      p.rect(12, 36, 3, 1, '#FFFFFF')
      p.rect(17, 36, 3, 1, '#FFFFFF')
    },
  },
  {
    id: 'cyber-pants',
    name: 'Cyber cargo pants',
    slot: 'bottom',
    unlock: { kind: 'sessions', n: 20 },
    draw: (p) => {
      legs(p, INK)
      p.rect(12, 36, 3, 1, NEON)
      p.rect(17, 36, 3, 1, NEON)
      p.rect(11, 34, 1, 3, '#5B6070')
      p.rect(20, 34, 1, 3, '#5B6070')
    },
  },

  // Shoes
  { id: 'sneakers', name: 'Sneakers', slot: 'shoes', draw: shoe('#F4F4F6', '#B9BCC6') },
  {
    id: 'slippers',
    name: 'Fluffy slippers',
    slot: 'shoes',
    unlock: { kind: 'nightSessions', n: 3 },
    draw: (p) => {
      shoe('#F7B8D0', '#F7B8D0')(p)
      p.px(10, 41, '#F7B8D0')
      p.px(21, 41, '#F7B8D0')
    },
  },
  {
    id: 'platforms',
    name: 'Platform sneakers',
    slot: 'shoes',
    unlock: { kind: 'sessions', n: 10 },
    draw: (p) => {
      shoe('#F4F4F6', '#C86BD8', 37)(p)
      p.rect(11, 40, 4, 1, '#FF8FC8')
      p.rect(17, 40, 4, 1, '#FF8FC8')
    },
  },
  {
    id: 'boots',
    name: 'Chunky boots',
    slot: 'shoes',
    unlock: { kind: 'sessions', n: 15 },
    draw: (p) => {
      shoe('#24304A', '#9AA3AE', 35)(p)
      p.rect(11, 40, 4, 1, '#141C2B')
      p.rect(17, 40, 4, 1, '#141C2B')
      p.px(13, 37, NEON)
      p.px(18, 37, NEON)
    },
  },

  // Head
  none('head'),
  {
    id: 'bow',
    name: 'Ribbon',
    slot: 'head',
    draw: (p) => p.map(20, 2, ['BB...BB', 'BBBkBBB', 'BBBkBBB', '.B.k.B.'], { B: RIBBON, k: shade(RIBBON, 0.3) }),
  },
  {
    id: 'cat-ears',
    name: 'Cat ears',
    slot: 'head',
    unlock: { kind: 'longestStreak', n: 3 },
    draw: (p) =>
      [6, 21].forEach((x) => p.map(x, 0, ['#....', '##...', '#p#..', '#pp#.', '#ppp#'].map((r) => (x > 15 ? [...r].reverse().join('') : r)), { '#': '#24304A', p: '#F4A6C8' })),
  },
  {
    id: 'horns',
    name: 'Demon horns',
    slot: 'head',
    unlock: { kind: 'nightSessions', n: 10 },
    draw: (p) => {
      const pal = { '#': '#2A1A2E', h: '#B04A6A' }
      p.map(5, 0, ['#....', 'h#...', '.h#..', '..##.', '...##'], pal)
      p.map(22, 0, ['....#', '...#h', '..#h.', '.##..', '##...'], pal)
    },
  },
  {
    id: 'halo',
    name: 'Halo',
    slot: 'head',
    unlock: { kind: 'fiveStars', n: 10 },
    draw: (_p, { fx }) => {
      fx.rect(11, 0, 10, 1, '#FFF2A8')
      fx.px(10, 1, '#FFE680')
      fx.px(21, 1, '#FFE680')
      fx.rect(11, 2, 10, 1, '#FFD24A')
    },
  },
  { id: 'headphones', name: 'Gaming headset', slot: 'head', unlock: { kind: 'hours', n: 25 }, draw: headset({ band: INK, cup: '#3A3F4F', ring: NEON, mic: true }) },
  {
    id: 'cat-headphones',
    name: 'Cat headphones',
    slot: 'head',
    unlock: { kind: 'longestStreak', n: 14 },
    draw: headset({ band: '#F4A6C8', cup: '#FBD3E3', ring: '#FFFFFF', ears: '#FF8FC8' }),
  },

  // Face
  none('face'),
  { id: 'round-glasses', name: 'Round glasses', slot: 'face', unlock: { kind: 'hours', n: 10 }, draw: ring('#3A4250', false) },
  { id: 'star-glasses', name: 'Star glasses', slot: 'face', unlock: { kind: 'fiveStars', n: 5 }, draw: ring('#FF6FAE', true) },
  {
    id: 'visor',
    name: 'Cyber visor',
    slot: 'face',
    unlock: { kind: 'earlySessions', n: 5 },
    draw: (p) => {
      for (let y = 13; y <= 18; y++)
        for (let x = 8; x <= 23; x++) p.px(x, y, mix(p.get(x, y) ?? '#20232C', NEON, 0.55))
      p.rect(8, 12, 16, 1, INK)
      p.rect(8, 19, 16, 1, INK)
      p.rect(10, 14, 5, 1, '#C9F6FF')
    },
  },
  {
    id: 'mask',
    name: 'LED face mask',
    slot: 'face',
    unlock: { kind: 'topics', n: 10 },
    draw: (p) => {
      p.rect(10, 19, 12, 3, '#20232C')
      p.rect(12, 22, 8, 1, '#20232C')
      p.rect(9, 18, 1, 2, '#20232C')
      p.rect(22, 18, 1, 2, '#20232C')
      p.map(13, 20, ['N..N', '.NN.'], { N: NEON })
    },
  },
  {
    id: 'cyber-eye',
    name: 'Robotic eye',
    slot: 'face',
    unlock: { kind: 'hours', n: 40 },
    draw: (p) => {
      p.map(16, 12, ['.MMMMM.', 'MkkkkkM', 'MkrrrkM', 'MkrRrkM', 'MkrrrkM', 'MkkkkkM', '.MMMMM.'], {
        M: METAL, k: INK, r: '#FF4F6E', R: '#FFD1DA',
      })
      for (const [x, y] of [[23, 14], [24, 13], [25, 13]]) p.px(x, y, METAL_DK)
    },
  },

  // Back
  none('back'),
  { id: 'cat-tail', name: 'Cat tail', slot: 'back', unlock: { kind: 'hours', n: 1 }, draw: (p) => {
    for (const [x, y] of [[20, 34], [22, 34], [24, 33], [26, 32], [28, 31], [30, 30], [31, 28], [32, 26], [32, 24], [31, 22], [30, 21]])
      p.rect(x, y, 2, 2, '#24304A')
  } },
  { id: 'angel-wings', name: 'Angel wings', slot: 'back', unlock: { kind: 'hours', n: 30 }, draw: wings(ANGEL, { W: '#FFFFFF', S: '#D9CCF2' }, 13) },
  { id: 'demon-wings', name: 'Demon wings', slot: 'back', unlock: { kind: 'nightSessions', n: 20 }, draw: wings(BAT, { '#': '#2A1A2E', m: '#6B3F6E' }, 14) },
  { id: 'cyber-wings', name: 'Cyber wings', slot: 'back', unlock: { kind: 'hours', n: 100 }, draw: wings(CYBER_WING, { F: INK, N: NEON, n: '#B8F5FF' }, 15) },
  {
    id: 'robo-arm',
    name: 'Robotic arm',
    slot: 'back',
    unlock: { kind: 'longestStreak', n: 30 },
    draw: () => {},
    over: (p) => {
      p.rect(20, 23, 5, 2, METAL_DK)
      p.map(21, 25, ['PPP', 'PmP', 'PPP', '.j.', 'PPP', 'PlP', 'PPP', 'C.C', 'C.C'], { P: METAL, m: METAL_DK, j: '#4A5163', l: NEON, C: METAL_DK })
    },
  },

  // Hands
  none('held'),
  {
    id: 'coffee',
    name: 'Coffee',
    slot: 'held',
    unlock: { kind: 'sessions', n: 1 },
    draw: (p, { fx }) => {
      p.rect(23, 29, 4, 4, '#F4F4F6')
      p.rect(23, 29, 4, 1, '#7A4A2E')
      p.rect(27, 30, 1, 2, '#F4F4F6')
      p.rect(23, 31, 4, 1, '#E2776C')
      for (const [x, y] of [[24, 27], [25, 26], [24, 25]]) fx.px(x, y, '#CFD3DC')
    },
  },
  {
    id: 'soda',
    name: 'Soda bottle',
    slot: 'held',
    unlock: { kind: 'sessions', n: 3 },
    draw: (p) =>
      p.map(23, 24, ['.TT.', '.GG.', '.gg.', 'GGGG', 'GwgG', 'GrgG', 'GrgG', 'GwgG', 'GGGG'], {
        T: '#4FB3BF', G: '#CFEFB0', g: '#9FD35F', w: '#ffffff', r: '#E05A5A',
      }),
  },
  {
    id: 'energy',
    name: 'Energy drink',
    slot: 'held',
    unlock: { kind: 'nightSessions', n: 5 },
    draw: (p) => p.map(23, 27, ['sss', 'DDD', 'DLD', 'DLD', 'DLD', 'DDD', 'sss'], { s: '#9AA3AE', D: '#24343A', L: '#9FD35F' }),
  },
  {
    id: 'console',
    name: 'Handheld console',
    slot: 'held',
    unlock: { kind: 'hours', n: 15 },
    draw: (p) => p.map(22, 26, ['CCCCC', 'CsssC', 'CsgsC', 'CsssC', 'CCCCC', 'CbCaC', 'CCCCC'], { C: '#DCE2EA', s: '#8FB86A', g: '#C9E6A5', b: '#4A4E6A', a: '#E05A5A' }),
  },
  {
    id: 'plushie',
    name: 'Cat plushie',
    slot: 'held',
    unlock: { kind: 'modules', n: 3 },
    draw: (p) => p.map(22, 25, ['#...#', '##.##', '#####', '#e#e#', '##p##', '#####', '.#.#.'], { '#': '#F6E7D7', e: INK, p: '#F4A6C8' }),
  },
  {
    id: 'controller',
    name: 'Game controller',
    slot: 'held',
    unlock: { kind: 'sessions', n: 50 },
    draw: (p) =>
      p.map(20, 28, ['.GGGGGGG.', 'GGwGGGaGG', 'GwwwGGGbG', 'GGwGGGGGG', 'GGG...GGG'], { G: '#3A3F4F', w: '#C8CDD6', a: NEON, b: PINK }),
  },
]

export const DEFAULT_EQUIPPED: Record<Slot, string> = {
  top: 'tee-white',
  bottom: 'jeans',
  shoes: 'sneakers',
  head: 'head-none',
  face: 'face-none',
  held: 'held-none',
  back: 'back-none',
}

export const itemById = (id: string): Item | undefined => ITEMS.find((i) => i.id === id)

/** Open book held up in front while studying, in the module's colour. */
export const drawBook = (p: Painter, cover: string, skin: string) => {
  p.rect(10, 25, 12, 7, shade(cover, 0.1))
  p.rect(11, 25, 5, 6, '#FBF7EC')
  p.rect(16, 25, 5, 6, '#ECE4CF')
  for (const y of [27, 29]) {
    p.rect(12, y, 3, 1, '#C9BFA5')
    p.rect(17, y, 3, 1, '#C9BFA5')
  }
  p.rect(9, 28, 2, 2, skin)
  p.rect(21, 28, 2, 2, skin)
}

/** Effects drawn on top without outline. */
export const drawMoodFx = (fx: Painter, mood: Mood) => {
  if (mood === 'sleepy') {
    fx.map(24, 1, ['####', '..#.', '.#..', '####'], { '#': '#A5B4FC' })
    fx.map(28, 6, ['###', '.#.', '###'], { '#': '#A5B4FC' })
  }
  if (mood === 'celebrate') {
    const star = ['...#...', '...#...', '..###..', '#######', '..###..', '...#...', '...#...']
    fx.map(0, 3, star, { '#': '#E8F27A' })
    fx.map(25, 21, star, { '#': '#E8F27A' })
    fx.map(27, 2, ['.#.', '###', '.#.'], { '#': '#E8F27A' })
    fx.map(1, 27, ['.#.', '###', '.#.'], { '#': '#E8F27A' })
  }
}
