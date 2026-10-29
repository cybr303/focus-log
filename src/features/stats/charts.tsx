import type { ReactNode } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatDuration } from '../../lib/time'
import { ACCENT, AXIS, GRID, minutesTick } from './chartStyle'

interface TipProps {
  active?: boolean
  payload?: readonly { value?: unknown; payload?: { tip?: string } }[]
  format?: (v: number) => string
}

/** Dark rounded tooltip; shows the datum's `tip` title and its formatted value. */
export function ChartTip({ active, payload, format = (v) => formatDuration(v * 60000) }: TipProps) {
  if (!active || !payload?.length) return null
  const p = payload[0]
  return (
    <div className="chart-tip">
      {p.payload?.tip && <div className="chart-tip-title">{p.payload.tip}</div>}
      <div className="chart-tip-value">{format(Number(p.value ?? 0))}</div>
    </div>
  )
}

export interface BarDatum {
  label: string
  tip: string
  /** Minutes. */
  value: number
  highlight?: boolean
}

/** Vertical bar chart of minutes, with optional highlighted bars. */
export function MinutesBarChart({ data, height = 180, interval = 0, dimOthers = false }: { data: BarDatum[]; height?: number; interval?: number | 'preserveStartEnd'; dimOthers?: boolean }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -12 }}>
        <CartesianGrid {...GRID} />
        <XAxis dataKey="label" {...AXIS} interval={interval} minTickGap={4} />
        <YAxis {...AXIS} axisLine={false} tickFormatter={minutesTick} width={44} allowDecimals={false} />
        <Tooltip content={<ChartTip />} cursor={{ fill: 'rgba(255,255,255,0.06)' }} />
        <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false}>
          {data.map((d, i) => (
            <Cell key={i} fill={ACCENT} fillOpacity={dimOthers && !d.highlight ? 0.4 : 1} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

/** Titled card section for the Insights page. */
export function InsightCard({ title, caption, children }: { title: string; caption?: ReactNode; children: ReactNode }) {
  return (
    <section className="section">
      <h2 className="section-title">{title}</h2>
      <div className="card ins-card">
        {children}
        {caption && <p className="ins-caption">{caption}</p>}
      </div>
    </section>
  )
}

export function ChartEmpty({ children }: { children: ReactNode }) {
  return <div className="empty ins-empty">{children}</div>
}
