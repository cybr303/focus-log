import { Link } from 'react-router-dom'
import { tint } from '../../lib/colors'
import { useNow } from '../../lib/useNow'
import { useStore } from '../../store/store'
import { upcomingExams } from './calendar'
import './history.css'

const daysText = (d: number) => (d === 0 ? 'today' : d === 1 ? 'tomorrow' : `${d} days`)

/** Home strip of exams in the next 30 days. Renders nothing when there are none. */
export function ExamCountdown() {
  const modules = useStore((s) => s.modules)
  const now = useNow(60000)
  const exams = upcomingExams(modules, now, 30)
  if (!exams.length) return null
  return (
    <div className="exam-strip" aria-label="Upcoming exams">
      {exams.map(({ module: m, days }) => (
        <Link
          key={m.id}
          to={`/modules/${m.id}`}
          className="exam-chip"
          style={{ background: tint(m.color, 0.16), borderColor: tint(m.color, 0.5), color: m.color }}
        >
          <span aria-hidden="true">{m.emoji}</span>
          <span style={{ color: 'var(--text)' }}>{m.name}</span>
          <span className="exam-chip-days">· {daysText(days)}</span>
        </Link>
      ))}
    </div>
  )
}
