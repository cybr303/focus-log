/** Module colour palette. Picked to read well on black and stay distinct from each other. */
export const MODULE_COLORS = [
  '#0A84FF', // blue
  '#FF453A', // red
  '#FFD60A', // yellow
  '#30D158', // green
  '#BF5AF2', // purple
  '#FF9F0A', // orange
  '#64D2FF', // cyan
  '#FF375F', // pink
] as const

export const MODULE_EMOJIS = ['📘', '🧪', '📦', '💻', '📐', '🧠', '🌍', '🎨', '⚖️', '🧮', '🔬', '📊'] as const

/** Hex colour with alpha, e.g. tint('#FF453A', 0.18) for card backgrounds. */
export const tint = (hex: string, alpha: number): string => {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`
}
