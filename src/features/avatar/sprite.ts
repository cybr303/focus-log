/** Tiny pixel canvas used to compose the avatar from layers. */

export const W = 32
export const H = 44
/** Deep blue-grey line, like the soft outlines of anime pixel art (never pure black). */
export const OUTLINE = '#1e2a3a'

export type Grid = (string | null)[][]

export const emptyGrid = (): Grid => Array.from({ length: H }, () => Array<string | null>(W).fill(null))

/** Paint helpers handed to each layer's draw function. Out-of-bounds pixels are ignored. */
export interface Painter {
  px: (x: number, y: number, color: string) => void
  rect: (x: number, y: number, w: number, h: number, color: string) => void
  /** Paint from an ASCII map: each non-space, non-'.' char is looked up in `palette`. */
  map: (x: number, y: number, rows: string[], palette: Record<string, string>) => void
  /** Clear a pixel (e.g. to round a corner). */
  clear: (x: number, y: number) => void
  has: (x: number, y: number) => boolean
}

export const painter = (g: Grid): Painter => {
  const inside = (x: number, y: number) => x >= 0 && x < W && y >= 0 && y < H
  const px = (x: number, y: number, color: string) => {
    if (inside(x, y)) g[y][x] = color
  }
  return {
    px,
    rect: (x, y, w, h, color) => {
      for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) px(i, j, color)
    },
    map: (x, y, rows, palette) =>
      rows.forEach((row, j) =>
        [...row].forEach((ch, i) => {
          const c = palette[ch]
          if (c) px(x + i, y + j, c)
        }),
      ),
    clear: (x, y) => {
      if (inside(x, y)) g[y][x] = null
    },
    has: (x, y) => inside(x, y) && g[y][x] !== null,
  }
}

/** A painter that draws everything `dy` rows lower (used to place the body under the head). */
export const shifted = (p: Painter, dy: number): Painter => ({
  px: (x, y, c) => p.px(x, y + dy, c),
  rect: (x, y, w, h, c) => p.rect(x, y + dy, w, h, c),
  map: (x, y, rows, pal) => p.map(x, y + dy, rows, pal),
  clear: (x, y) => p.clear(x, y + dy),
  has: (x, y) => p.has(x, y + dy),
})

/**
 * Adds a 1px outline around every filled region (4-neighbourhood). Each outline pixel is a deep
 * shade of the colour it borders, pulled toward `ink`, so green hair gets a dark green line and
 * skin a warm brown one, the way hand-drawn anime pixel art does.
 */
export const outline = (g: Grid, ink = OUTLINE): Grid => {
  const out = g.map((row) => row.slice())
  const cache = new Map<string, string>()
  const lineFor = (c: string) => {
    let l = cache.get(c)
    if (!l) cache.set(c, (l = mix(shade(c, 0.62), ink, 0.45)))
    return l
  }
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (g[y][x]) continue
      for (const [i, j] of [[x, y + 1], [x, y - 1], [x - 1, y], [x + 1, y]]) {
        const c = i >= 0 && i < W && j >= 0 && j < H ? g[j][i] : null
        if (c) {
          out[y][x] = lineFor(c)
          break
        }
      }
    }
  return out
}

/** Blends two hex colours; t = 0 gives `a`, 1 gives `b`. */
export const mix = (a: string, b: string, t: number): string => {
  const p = (h: string) => [16, 8, 0].map((s) => (parseInt(h.slice(1), 16) >> s) & 255)
  const [x, y] = [p(a), p(b)]
  return `#${x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('')}`
}

export interface Run {
  x: number
  y: number
  w: number
  color: string
}

/** Merges horizontal runs of the same colour so the SVG stays small. */
export const toRuns = (g: Grid): Run[] => {
  const runs: Run[] = []
  g.forEach((row, y) => {
    let x = 0
    while (x < W) {
      const color = row[x]
      if (!color) {
        x++
        continue
      }
      let w = 1
      while (x + w < W && row[x + w] === color) w++
      runs.push({ x, y, w, color })
      x += w
    }
  })
  return runs
}

/** Darkens (amount > 0) or lightens (amount < 0) a hex colour. */
export const shade = (hex: string, amount: number): string => {
  const n = parseInt(hex.slice(1), 16)
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(amount > 0 ? c * (1 - amount) : c + (255 - c) * -amount)))
  const r = f((n >> 16) & 255)
  const g = f((n >> 8) & 255)
  const b = f(n & 255)
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}
