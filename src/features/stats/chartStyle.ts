// Shared chart style on black: muted axes and grid, accent blue series.
export const ACCENT = '#0a84ff'
export const AXIS = { stroke: 'rgba(235,235,245,0.18)', tick: { fill: 'rgba(235,235,245,0.6)', fontSize: 12 }, tickLine: false } as const
export const GRID = { stroke: 'rgba(255,255,255,0.08)', vertical: false } as const

/** Minutes → compact axis label ('45m', '2h'). */
export const minutesTick = (m: number): string => (m >= 60 ? `${Math.round((m / 60) * 10) / 10}h` : `${Math.round(m)}m`)
