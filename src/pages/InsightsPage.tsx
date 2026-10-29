import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { totalDuration } from '../lib/stats'
import { formatDuration } from '../lib/time'
import { useNow } from '../lib/useNow'
import { useStore } from '../store/store'
import { ChartEmpty, ChartTip, InsightCard, MinutesBarChart, type BarDatum } from '../features/stats/charts'
import { ACCENT, AXIS, GRID } from '../features/stats/chartStyle'
import {
  dailyTotals, hourDistribution, hourLabel, mostProductivePart, peakWindow, productivityTrend, rangeKeys,
  sessionsInKeys, shortDate, weekdayAverages, weeklyTotals, type Range,
} from '../features/stats/insights'
import { ModuleBreakdown } from '../features/stats/ModuleBreakdown'
import '../features/stats/insights.css'

const RANGES: { id: Range; label: string }[] = [
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'all', label: 'All time' },
]

const toMin = (ms: number) => ms / 60000
const RANGE_LABEL: Record<Range, string> = { week: 'Last 7 days', month: 'Last 30 days', all: 'All time' }

export function InsightsPage() {
  const allSessions = useStore((s) => s.sessions)
  const modules = useStore((s) => s.modules)
  const [range, setRange] = useState<Range>('week')
  const now = useNow(60000)

  const data = useMemo(() => {
    const keys = rangeKeys(range, allSessions, now)
    const sessions = sessionsInKeys(allSessions, keys)
    const total = totalDuration(sessions)

    const volume: BarDatum[] =
      range === 'all'
        ? weeklyTotals(sessions, keys).map((w) => ({ label: shortDate(w.date), tip: `Week of ${format(w.date, 'd MMM')}`, value: toMin(w.ms) }))
        : dailyTotals(sessions, keys).map((d) => ({
            label: range === 'week' ? format(d.date, 'EEE') : format(d.date, 'd'),
            tip: format(d.date, 'EEE d MMM'),
            value: toMin(d.ms),
          }))

    const hours = hourDistribution(sessions)
    const peak = peakWindow(hours)
    const inPeak = (h: number) => !!peak && (peak.from < peak.to ? h >= peak.from && h < peak.to : h >= peak.from || h < peak.to)
    const hourData: BarDatum[] = hours.map((ms, h) => ({
      label: String(h).padStart(2, '0'),
      tip: `${hourLabel(h)}–${hourLabel(h + 1)}`,
      value: toMin(ms),
      highlight: inPeak(h),
    }))

    const weekdays: BarDatum[] = weekdayAverages(sessions, keys).map((w) => ({ label: w.label, tip: `Average ${w.label}`, value: toMin(w.ms) }))

    const trend = productivityTrend(sessions, range === 'week' ? 'day' : 'week').map((p) => ({
      label: range === 'week' ? format(p.date, 'EEE') : shortDate(p.date),
      tip: range === 'week' ? format(p.date, 'EEE d MMM') : `Week of ${format(p.date, 'd MMM')}`,
      value: Math.round(p.avg * 10) / 10,
    }))

    return { keys, sessions, total, volume, hourData, peak, weekdays, trend, bestPart: mostProductivePart(sessions) }
  }, [allSessions, range, now])

  const { sessions, total, volume, hourData, peak, weekdays, trend, bestPart } = data
  const hasData = sessions.length > 0

  return (
    <main className="page">
      <h1 className="page-title">Insights</h1>

      <div className="seg" role="tablist" aria-label="Range">
        {RANGES.map((r) => (
          <button key={r.id} role="tab" aria-selected={range === r.id} className={range === r.id ? 'seg-btn on' : 'seg-btn'} onClick={() => setRange(r.id)}>
            {r.label}
          </button>
        ))}
      </div>

      <section className="ins-totals" aria-label={RANGE_LABEL[range]}>
        <div className="ins-total">
          <div className="ins-total-value">{formatDuration(total)}</div>
          <div className="ins-total-label">Total time</div>
        </div>
        <div className="ins-total">
          <div className="ins-total-value">{sessions.length}</div>
          <div className="ins-total-label">Sessions</div>
        </div>
        <div className="ins-total">
          <div className="ins-total-value">{hasData ? formatDuration(total / sessions.length) : '–'}</div>
          <div className="ins-total-label">Avg. session</div>
        </div>
      </section>

      <InsightCard title="Time per module">
        <ModuleBreakdown sessions={sessions} modules={modules} />
      </InsightCard>

      <InsightCard title={range === 'all' ? 'Weekly study time' : 'Daily study time'}>
        {total > 0 ? (
          <MinutesBarChart data={volume} interval={range === 'week' ? 0 : 'preserveStartEnd'} />
        ) : (
          <ChartEmpty>Log a session to see your study time here.</ChartEmpty>
        )}
      </InsightCard>

      <InsightCard
        title="Best time of day"
        caption={peak ? <>You study most between <b>{hourLabel(peak.from)}</b> and <b>{hourLabel(peak.to)}</b>.</> : undefined}
      >
        {peak ? (
          <MinutesBarChart data={hourData} interval={5} dimOthers />
        ) : (
          <ChartEmpty>Your daily rhythm will show up after a few sessions.</ChartEmpty>
        )}
      </InsightCard>

      <InsightCard title="Weekday pattern" caption={total > 0 ? 'Average study time per weekday.' : undefined}>
        {total > 0 ? <MinutesBarChart data={weekdays} /> : <ChartEmpty>Study on a few different days to see your weekly pattern.</ChartEmpty>}
      </InsightCard>

      <InsightCard
        title="Productivity trend"
        caption={bestPart ? <>Your most productive time: <b>{bestPart}</b>.</> : undefined}
      >
        {trend.length > 0 ? (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={trend} margin={{ top: 8, right: 12, bottom: 0, left: -20 }}>
              <CartesianGrid {...GRID} />
              <XAxis dataKey="label" {...AXIS} interval="preserveStartEnd" minTickGap={8} />
              <YAxis {...AXIS} axisLine={false} domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} width={36} />
              <Tooltip content={<ChartTip format={(v) => `${v.toFixed(1)} / 5`} />} cursor={{ stroke: 'rgba(255,255,255,0.2)' }} />
              <Line
                type="monotone"
                dataKey="value"
                stroke={ACCENT}
                strokeWidth={2.5}
                dot={{ r: 3.5, fill: ACCENT, stroke: '#000', strokeWidth: 2 }}
                activeDot={{ r: 5 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <ChartEmpty>Rate your sessions to track how productive you feel.</ChartEmpty>
        )}
      </InsightCard>
    </main>
  )
}
