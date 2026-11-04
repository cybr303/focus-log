import { shade, type Painter } from './sprite'

export const SKIN_TONES = ['#FFDBB5', '#F1C27D', '#E0AC69', '#C68642', '#8D5524', '#5C3A21'] as const

export const HAIR_COLORS = ['#2B2522', '#6B4226', '#E8C66A', '#C2562B', '#F28AB2', '#5B8DEF', '#E6E6EA', '#9B6BDE'] as const

export type Slot = 'top' | 'bottom' | 'shoes' | 'head' | 'face' | 'held'

export const SLOTS: { slot: Slot; label: string }[] = [
  { slot: 'top', label: 'Tops' },
  { slot: 'bottom', label: 'Bottoms' },
  { slot: 'shoes', label: 'Shoes' },
  { slot: 'head', label: 'Head' },
  { slot: 'face', label: 'Glasses' },
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
}

// ---------- Body, face and hair ----------

export const drawBody = (p: Painter, skin: string) => {
  const s = shade(skin, 0.14)
  p.rect(6, 5, 8, 8, skin) // head
  for (const [x, y] of [[6, 5], [13, 5], [6, 12], [13, 12]]) p.clear(x, y)
  p.rect(7, 12, 6, 1, s) // jaw shadow
  p.rect(9, 13, 2, 1, s) // neck
  p.rect(6, 14, 8, 6, skin) // torso
  p.rect(4, 14, 2, 7, skin) // arms + hands
  p.rect(14, 14, 2, 7, skin)
  p.rect(7, 20, 6, 2, skin) // hips
  p.rect(7, 22, 2, 5, skin) // legs + feet
  p.rect(11, 22, 2, 5, skin)
}

export type Mood = 'idle' | 'happy' | 'sleepy' | 'study' | 'celebrate'

const EYE = '#1d1a26'
const MOUTH = '#a8484a'
const BLUSH = '#f29b9b'

export const drawFace = (p: Painter, mood: Mood) => {
  switch (mood) {
    case 'happy':
    case 'celebrate':
      p.rect(7, 8, 2, 1, EYE)
      p.rect(11, 8, 2, 1, EYE)
      p.px(6, 10, BLUSH)
      p.px(13, 10, BLUSH)
      p.px(8, 10, MOUTH)
      p.px(11, 10, MOUTH)
      p.rect(9, 11, 2, 1, mood === 'celebrate' ? '#6e1f2a' : MOUTH)
      break
    case 'sleepy':
      p.rect(7, 9, 2, 1, EYE)
      p.rect(11, 9, 2, 1, EYE)
      p.px(10, 11, MOUTH)
      break
    case 'study':
      p.rect(7, 9, 2, 2, EYE)
      p.rect(11, 9, 2, 2, EYE)
      p.rect(9, 11, 2, 1, MOUTH)
      break
    default:
      p.rect(7, 8, 2, 2, EYE)
      p.rect(11, 8, 2, 2, EYE)
      p.px(7, 8, '#ffffff')
      p.px(11, 8, '#ffffff')
      p.rect(9, 11, 2, 1, MOUTH)
  }
}

export interface HairStyle {
  id: string
  name: string
  draw: (p: Painter, c: string) => void
}

const shortHair = (p: Painter, c: string) => {
  p.rect(7, 4, 6, 1, c)
  p.rect(6, 5, 8, 2, c)
  p.rect(7, 6, 6, 1, shade(c, 0.2))
  p.px(6, 7, c)
  p.px(13, 7, c)
  p.rect(8, 4, 2, 1, shade(c, -0.25))
}

const bobHair = (p: Painter, c: string) => {
  p.rect(7, 3, 6, 1, c)
  p.rect(6, 4, 8, 1, c)
  p.rect(5, 5, 10, 2, c)
  p.rect(7, 6, 6, 1, shade(c, 0.2))
  p.rect(5, 7, 2, 6, c)
  p.rect(13, 7, 2, 6, c)
  p.rect(8, 4, 2, 1, shade(c, -0.25))
}

export const HAIR_STYLES: HairStyle[] = [
  { id: 'short', name: 'Short', draw: shortHair },
  { id: 'bob', name: 'Bob', draw: bobHair },
  {
    id: 'long',
    name: 'Long',
    draw: (p, c) => {
      bobHair(p, c)
      p.rect(5, 13, 2, 5, c)
      p.rect(13, 13, 2, 5, c)
    },
  },
  {
    id: 'buzz',
    name: 'Buzz',
    draw: (p, c) => {
      p.rect(7, 4, 6, 1, c)
      p.rect(6, 5, 8, 1, c)
    },
  },
  {
    id: 'spiky',
    name: 'Spiky',
    draw: (p, c) =>
      p.map(5, 1, ['.#..#...#.', '.##.##.##.', '##########', '.########.', '.########.', '.#......#.'], { '#': c }),
  },
  {
    id: 'bun',
    name: 'Bun',
    draw: (p, c) => {
      shortHair(p, c)
      p.map(8, 1, ['.##.', '####', '.##.'], { '#': c })
    },
  },
  {
    id: 'ponytail',
    name: 'Ponytail',
    draw: (p, c) => {
      shortHair(p, c)
      p.px(14, 5, '#e05a7a')
      p.rect(14, 6, 2, 5, c)
      p.px(15, 11, c)
    },
  },
  {
    id: 'curly',
    name: 'Curly',
    draw: (p, c) =>
      p.map(4, 2, ['..#.##.##.#.', '.##########.', '############', '############', '###.#..#.###', '##........##', '.#........#.'], {
        '#': c,
      }),
  },
]

// ---------- Clothes and accessories ----------

const tee = (c: string) => (p: Painter) => {
  p.rect(6, 14, 8, 6, c)
  p.rect(4, 14, 2, 3, shade(c, 0.12))
  p.rect(14, 14, 2, 3, shade(c, 0.12))
  p.rect(9, 14, 2, 1, shade(c, 0.3))
}

const longTop = (p: Painter, body: string, sleeves = shade(body, 0.12)) => {
  p.rect(6, 14, 8, 6, body)
  p.rect(4, 14, 2, 6, sleeves)
  p.rect(14, 14, 2, 6, sleeves)
}

const legs = (p: Painter, c: string, toY = 24) => {
  p.rect(7, 20, 6, 2, c)
  p.rect(7, 22, 2, toY - 21, c)
  p.rect(11, 22, 2, toY - 21, c)
}

const shoes = (p: Painter, c: string, sole: string, fromY = 25) => {
  p.rect(7, fromY, 2, 26 - fromY, c)
  p.rect(11, fromY, 2, 26 - fromY, c)
  p.rect(6, 26, 3, 1, sole)
  p.rect(11, 26, 3, 1, sole)
}

const ring = (p: Painter, c: string, corners: boolean) => {
  for (const x0 of [6, 10]) {
    p.rect(x0 + 1, 7, 2, 1, c)
    p.rect(x0 + 1, 10, 2, 1, c)
    p.rect(x0, 8, 1, 2, c)
    p.rect(x0 + 3, 8, 1, 2, c)
    if (corners) for (const [dx, dy] of [[0, 7], [3, 7], [0, 10], [3, 10]]) p.px(x0 + dx, dy, c)
  }
}

const none = (slot: Slot): Item => ({ id: `${slot}-none`, name: 'None', slot, draw: () => {} })

export const ITEMS: Item[] = [
  // Tops
  { id: 'tee-white', name: 'White tee', slot: 'top', draw: tee('#f2f2f5') },
  { id: 'tee-blue', name: 'Blue tee', slot: 'top', draw: tee('#3b82f6') },
  { id: 'tee-red', name: 'Red tee', slot: 'top', draw: tee('#e5484d') },
  {
    id: 'hoodie',
    name: 'Cozy hoodie',
    slot: 'top',
    unlock: { kind: 'hours', n: 5 },
    draw: (p) => {
      const c = '#7c5cff'
      longTop(p, c)
      p.rect(7, 13, 2, 1, shade(c, 0.2))
      p.rect(11, 13, 2, 1, shade(c, 0.2))
      p.rect(8, 15, 1, 2, '#ffffff')
      p.rect(11, 15, 1, 2, '#ffffff')
      p.rect(7, 18, 6, 1, shade(c, 0.2))
    },
  },
  {
    id: 'jersey',
    name: 'Team jersey',
    slot: 'top',
    unlock: { kind: 'sessions', n: 10 },
    draw: (p) => {
      tee('#ff9f0a')(p)
      p.rect(4, 16, 2, 1, '#ffffff')
      p.rect(14, 16, 2, 1, '#ffffff')
      p.map(8, 15, ['###', '..#', '..#'], { '#': '#ffffff' })
    },
  },
  {
    id: 'sweater',
    name: 'Striped sweater',
    slot: 'top',
    unlock: { kind: 'sessions', n: 25 },
    draw: (p) => {
      longTop(p, '#f2efe6', '#f2efe6')
      for (const y of [16, 17]) {
        p.rect(4, y, 2, 1, '#e2574c')
        p.rect(6, y, 8, 1, '#e2574c')
        p.rect(14, y, 2, 1, '#e2574c')
      }
    },
  },
  {
    id: 'flannel',
    name: 'Flannel shirt',
    slot: 'top',
    unlock: { kind: 'longestStreak', n: 7 },
    draw: (p) => {
      for (let y = 14; y < 20; y++)
        for (let x = 4; x < 16; x++) p.px(x, y, ((x >> 1) + (y >> 1)) % 2 ? '#c0392b' : '#7b1e1e')
    },
  },
  {
    id: 'varsity',
    name: 'Varsity jacket',
    slot: 'top',
    unlock: { kind: 'longestStreak', n: 14 },
    draw: (p) => {
      longTop(p, '#1f3b73', '#efe8d8')
      p.map(7, 15, ['##', '#.', '#.'], { '#': '#efe8d8' })
      p.rect(6, 19, 8, 1, '#efe8d8')
    },
  },
  {
    id: 'labcoat',
    name: 'Lab coat',
    slot: 'top',
    unlock: { kind: 'hours', n: 50 },
    draw: (p) => {
      const c = '#f4f6f8'
      longTop(p, c, '#dfe5ea')
      p.rect(9, 14, 2, 6, '#5aa0d8')
      p.rect(6, 20, 3, 3, c)
      p.rect(11, 20, 3, 3, c)
      p.px(12, 17, '#bcc6cf')
    },
  },
  {
    id: 'gown',
    name: 'Graduation gown',
    slot: 'top',
    unlock: { kind: 'modules', n: 3 },
    draw: (p) => {
      const c = '#1c1c24'
      p.rect(6, 14, 8, 6, c)
      p.rect(5, 20, 10, 5, c)
      p.rect(3, 14, 3, 6, c)
      p.rect(14, 14, 3, 6, c)
      p.rect(9, 14, 2, 1, '#f5c542')
    },
  },

  // Bottoms
  {
    id: 'jeans',
    name: 'Jeans',
    slot: 'bottom',
    draw: (p) => {
      legs(p, '#3d5a8a')
      p.rect(7, 20, 6, 1, '#2c4268')
    },
  },
  {
    id: 'shorts',
    name: 'Shorts',
    slot: 'bottom',
    draw: (p) => {
      p.rect(7, 20, 6, 2, '#c2a878')
      p.rect(7, 22, 2, 1, '#c2a878')
      p.rect(11, 22, 2, 1, '#c2a878')
    },
  },
  {
    id: 'skirt',
    name: 'Skirt',
    slot: 'bottom',
    draw: (p) => {
      const c = '#e0699a'
      p.rect(7, 20, 6, 1, c)
      p.rect(6, 21, 8, 2, c)
      p.rect(5, 23, 10, 1, shade(c, 0.15))
    },
  },
  {
    id: 'joggers',
    name: 'Joggers',
    slot: 'bottom',
    unlock: { kind: 'hours', n: 2 },
    draw: (p) => {
      legs(p, '#8e8e96')
      p.rect(7, 24, 2, 1, '#6c6c74')
      p.rect(11, 24, 2, 1, '#6c6c74')
    },
  },
  { id: 'trousers', name: 'Smart trousers', slot: 'bottom', unlock: { kind: 'sessions', n: 5 }, draw: (p) => legs(p, '#2a2a33') },

  // Shoes
  { id: 'sneakers', name: 'Sneakers', slot: 'shoes', draw: (p) => shoes(p, '#f4f4f6', '#b9bcc6') },
  {
    id: 'slippers',
    name: 'Fluffy slippers',
    slot: 'shoes',
    unlock: { kind: 'nightSessions', n: 3 },
    draw: (p) => {
      shoes(p, '#f7a8c8', '#f7a8c8')
      p.px(5, 26, '#f7a8c8')
      p.px(14, 26, '#f7a8c8')
    },
  },
  { id: 'boots', name: 'Boots', slot: 'shoes', unlock: { kind: 'sessions', n: 15 }, draw: (p) => shoes(p, '#7a4a2a', '#4e2e19', 23) },
  { id: 'hightops', name: 'Red high-tops', slot: 'shoes', unlock: { kind: 'longestStreak', n: 7 }, draw: (p) => shoes(p, '#e5383b', '#ffffff', 24) },
  { id: 'gold-kicks', name: 'Golden sneakers', slot: 'shoes', unlock: { kind: 'longestStreak', n: 30 }, draw: (p) => shoes(p, '#f5c542', '#fff1b8') },

  // Head
  none('head'),
  {
    id: 'beanie',
    name: 'Beanie',
    slot: 'head',
    unlock: { kind: 'hours', n: 1 },
    draw: (p) => {
      const c = '#e2574c'
      p.rect(7, 2, 6, 1, c)
      p.rect(6, 3, 8, 3, c)
      p.rect(6, 6, 8, 1, shade(c, 0.25))
      p.rect(9, 1, 2, 1, '#ffffff')
    },
  },
  {
    id: 'cap',
    name: 'Cap',
    slot: 'head',
    unlock: { kind: 'longestStreak', n: 3 },
    draw: (p) => {
      const c = '#0a84ff'
      p.rect(7, 3, 6, 1, c)
      p.rect(6, 4, 8, 2, c)
      p.rect(11, 6, 6, 1, shade(c, 0.25))
      p.px(8, 4, '#ffffff')
    },
  },
  {
    id: 'headphones',
    name: 'Headphones',
    slot: 'head',
    unlock: { kind: 'hours', n: 25 },
    draw: (p) => {
      const band = '#2b2b33'
      p.rect(7, 3, 6, 1, band)
      p.px(6, 4, band)
      p.px(13, 4, band)
      p.rect(5, 5, 1, 2, band)
      p.rect(14, 5, 1, 2, band)
      p.rect(4, 7, 2, 3, '#ff453a')
      p.rect(14, 7, 2, 3, '#ff453a')
    },
  },
  {
    id: 'gradcap',
    name: 'Graduation cap',
    slot: 'head',
    unlock: { kind: 'modules', n: 3 },
    draw: (p) => {
      p.rect(4, 2, 12, 1, '#1c1c24')
      p.rect(6, 3, 8, 2, '#2a2a33')
      p.rect(15, 3, 1, 3, '#f5c542')
    },
  },
  {
    id: 'wizard',
    name: 'Night-owl wizard hat',
    slot: 'head',
    unlock: { kind: 'nightSessions', n: 10 },
    draw: (p) => {
      const c = '#5b3cc4'
      p.map(5, 0, ['.......#..', '......##..', '.....###..', '...#####..', '.########.'], { '#': c })
      p.rect(4, 5, 12, 1, shade(c, 0.25))
      p.px(9, 4, '#f5c542')
      p.px(11, 2, '#f5c542')
    },
  },
  {
    id: 'crown',
    name: 'Crown',
    slot: 'head',
    unlock: { kind: 'hours', n: 100 },
    draw: (p) => {
      p.map(6, 1, ['#..##..#', '#.####.#', '########', '########'], { '#': '#f5c542' })
      p.rect(6, 4, 8, 1, '#c99a1e')
      p.rect(9, 3, 2, 1, '#e5383b')
    },
  },

  // Glasses
  none('face'),
  { id: 'round-glasses', name: 'Round glasses', slot: 'face', unlock: { kind: 'hours', n: 10 }, draw: (p) => ring(p, '#2b2b33', false) },
  { id: 'square-glasses', name: 'Square glasses', slot: 'face', unlock: { kind: 'topics', n: 10 }, draw: (p) => ring(p, '#8a5a2b', true) },
  {
    id: 'sunglasses',
    name: 'Early-bird shades',
    slot: 'face',
    unlock: { kind: 'earlySessions', n: 5 },
    draw: (p) => {
      p.rect(6, 8, 8, 2, '#16161d')
      p.px(7, 8, '#5c6170')
      p.px(11, 8, '#5c6170')
    },
  },
  { id: 'star-glasses', name: 'Star glasses', slot: 'face', unlock: { kind: 'fiveStars', n: 5 }, draw: (p) => ring(p, '#ff5fa2', true) },

  // Hands
  none('held'),
  {
    id: 'coffee',
    name: 'Coffee',
    slot: 'held',
    unlock: { kind: 'sessions', n: 1 },
    draw: (p, { fx }) => {
      p.rect(15, 18, 3, 3, '#f4f4f6')
      p.rect(15, 18, 3, 1, '#6b3f22')
      p.px(18, 19, '#f4f4f6')
      fx.px(16, 16, '#cfd3dc')
      fx.px(17, 15, '#cfd3dc')
    },
  },
  {
    id: 'pencil',
    name: 'Pencil',
    slot: 'held',
    unlock: { kind: 'sessions', n: 10 },
    draw: (p) => {
      p.px(15, 20, '#2b2b33')
      for (const [x, y] of [[16, 19], [17, 18], [18, 17]]) p.px(x, y, '#f5c542')
      p.px(19, 16, '#f28ab2')
    },
  },
  {
    id: 'plant',
    name: 'Desk plant',
    slot: 'held',
    unlock: { kind: 'topics', n: 5 },
    draw: (p) => {
      p.rect(15, 19, 3, 2, '#c8693a')
      for (const [x, y] of [[16, 18], [16, 17], [15, 16], [17, 16], [16, 15]]) p.px(x, y, '#30d158')
    },
  },
  {
    id: 'trophy',
    name: 'Trophy',
    slot: 'held',
    unlock: { kind: 'sessions', n: 50 },
    draw: (p) => p.map(15, 15, ['####', '####', '.##.', '.##.', '####'], { '#': '#f5c542' }),
  },
]

export const DEFAULT_EQUIPPED: Record<Slot, string> = {
  top: 'tee-white',
  bottom: 'jeans',
  shoes: 'sneakers',
  head: 'head-none',
  face: 'face-none',
  held: 'held-none',
}

export const itemById = (id: string): Item | undefined => ITEMS.find((i) => i.id === id)

/** Open book held in front while studying, in the module's colour. */
export const drawBook = (p: Painter, cover: string, skin: string) => {
  p.rect(5, 15, 10, 6, shade(cover, 0.15))
  p.rect(6, 15, 4, 5, '#fbf7ec')
  p.rect(10, 15, 4, 5, '#ece4cf')
  for (const y of [16, 18]) {
    p.rect(7, y, 2, 1, '#c9bfa5')
    p.rect(11, y, 2, 1, '#c9bfa5')
  }
  // hands gripping the covers
  p.rect(4, 17, 2, 2, skin)
  p.rect(14, 17, 2, 2, skin)
}

/** Effects drawn on top without outline. */
export const drawMoodFx = (fx: Painter, mood: Mood) => {
  if (mood === 'sleepy') {
    fx.map(15, 1, ['####', '..#.', '.#..', '####'], { '#': '#a5b4fc' })
    fx.map(17, 6, ['##', '##'], { '#': '#a5b4fc' })
  }
  if (mood === 'celebrate') {
    for (const [x, y] of [[2, 5], [17, 4], [1, 17], [18, 14]]) {
      fx.px(x, y, '#ffd60a')
      fx.px(x - 1, y, '#ffd60a')
      fx.px(x + 1, y, '#ffd60a')
      fx.px(x, y - 1, '#ffd60a')
      fx.px(x, y + 1, '#ffd60a')
    }
  }
}
