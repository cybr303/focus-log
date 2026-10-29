import { format, parseISO } from 'date-fns'
import { useState } from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { ModuleBadge } from '../components/ModuleBadge'
import '../features/history/history.css'
import { ConfirmSheet } from '../features/modules/ConfirmSheet'
import {
  formToSession, isAfterMidnight, newForm, sessionToForm, validateForm, type SessionForm,
} from '../features/history/sessionForm'
import { dayKey } from '../lib/time'
import type { Productivity, Session } from '../lib/types'
import { useStore } from '../store/store'

const RATING_LABELS = ['Poor', 'Meh', 'Okay', 'Good', 'Great'] as const

export function SessionFormPage() {
  const { id } = useParams()
  const session = useStore((s) => (id ? s.sessions.find((x) => x.id === id) : undefined))
  // Avoids flashing "not found" between deleting a session and navigating away.
  const [existedOnOpen] = useState(!!session)

  if (id && !session) {
    if (existedOnOpen) return null
    return (
      <main className="page">
        <BackLink />
        <h1 className="page-title">Session</h1>
        <div className="card empty">
          This session doesn’t exist anymore.
          <div style={{ marginTop: 16 }}>
            <Link to="/sessions" className="btn">All sessions</Link>
          </div>
        </div>
      </main>
    )
  }
  // Remount on id change so the form state resets.
  return <SessionFormBody key={id ?? 'new'} session={session} />
}

function BackLink() {
  const goBack = useGoBack()
  return (
    <button className="back-link" onClick={goBack}>
      <Icon name="chevronLeft" size={20} /> Back
    </button>
  )
}

/** Goes back in history, or to the session list when the page was opened directly. */
function useGoBack() {
  const navigate = useNavigate()
  const location = useLocation()
  return () => (location.key === 'default' ? navigate('/sessions', { replace: true }) : navigate(-1))
}

function SessionFormBody({ session }: { session?: Session }) {
  const modules = useStore((s) => s.modules)
  const addSession = useStore((s) => s.addSession)
  const updateSession = useStore((s) => s.updateSession)
  const deleteSession = useStore((s) => s.deleteSession)
  const [params] = useSearchParams()
  const goBack = useGoBack()

  const [form, setForm] = useState<SessionForm>(() => {
    if (session) return sessionToForm(session)
    const { sessions } = useStore.getState()
    const lastModule = [...sessions].sort((a, b) => b.start - a.start)[0]?.moduleId
    const moduleId = modules.find((m) => m.id === lastModule)?.id ?? modules[0]?.id ?? ''
    const date = params.get('date')
    return newForm(Date.now(), moduleId, date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined)
  })
  const [error, setError] = useState<string | null>(null)

  const module = modules.find((m) => m.id === form.moduleId)
  const set = (patch: Partial<SessionForm>) => {
    setForm((f) => ({ ...f, ...patch }))
    setError(null)
  }
  const toggleTopic = (tid: string) =>
    set({ topicIds: form.topicIds.includes(tid) ? form.topicIds.filter((t) => t !== tid) : [...form.topicIds, tid] })

  const save = () => {
    const err = validateForm(form, module, Date.now())
    if (err) return setError(err)
    const data = formToSession(form, session)
    if (session) {
      // Explicit undefined clears a removed rating or note.
      updateSession(session.id, { productivity: undefined, note: undefined, ...data })
    } else {
      addSession(data)
    }
    goBack()
  }
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const remove = () => {
    if (!session) return
    deleteSession(session.id)
    goBack()
  }

  if (modules.length === 0) {
    return (
      <main className="page">
        <BackLink />
        <h1 className="page-title">Log session</h1>
        <div className="card empty">
          Add a module first, then you can log sessions for it.
          <div style={{ marginTop: 16 }}>
            <Link to="/modules" className="btn btn-primary">Go to Modules</Link>
          </div>
        </div>
      </main>
    )
  }

  const today = dayKey(Date.now())
  const timedWithPauses = session && !session.manual && session.pausedMs > 0

  return (
    <main className="page">
      <BackLink />
      <h1 className="page-title">{session ? 'Edit session' : 'Log session'}</h1>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          save()
        }}
        noValidate
      >
        <div className="field">
          <label className="field-label" htmlFor="sf-module">Module</label>
          <div className="row">
            {module && <ModuleBadge module={module} size={50} />}
            <select
              id="sf-module"
              className="input"
              value={form.moduleId}
              onChange={(e) => set({ moduleId: e.target.value, topicIds: [] })}
            >
              {!module && <option value="">Choose a module</option>}
              {modules.map((m) => (
                <option key={m.id} value={m.id}>{m.emoji} {m.name}</option>
              ))}
            </select>
          </div>
        </div>

        {module && module.topics.length > 0 && (
          <div className="field">
            <span className="field-label">Topics</span>
            <div className="chips" role="group" aria-label="Topics">
              {module.topics.map((t) => (
                <button
                  type="button"
                  key={t.id}
                  className="chip"
                  aria-pressed={form.topicIds.includes(t.id)}
                  onClick={() => toggleTopic(t.id)}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="form-row">
          <div className="field">
            <label className="field-label" htmlFor="sf-date">Date</label>
            <input id="sf-date" className="input" type="date" max={today} value={form.date} onChange={(e) => set({ date: e.target.value })} />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="sf-time">Start</label>
            <input id="sf-time" className="input" type="time" value={form.time} onChange={(e) => set({ time: e.target.value })} />
          </div>
        </div>
        {isAfterMidnight(form.time) && form.date && (
          <p className="field-hint" style={{ marginTop: -8, marginBottom: 16 }}>
            After midnight — counts toward {format(parseISO(form.date), 'EEE d MMM')}.
          </p>
        )}

        <div className="field">
          <span className="field-label">Duration</span>
          <div className="duration-inputs">
            <input
              aria-label="Hours" className="input" type="number" inputMode="numeric" min={0} max={16}
              value={form.hours} onChange={(e) => set({ hours: e.target.value })}
            />
            <span>h</span>
            <input
              aria-label="Minutes" className="input" type="number" inputMode="numeric" min={0} max={59} step={5}
              value={form.minutes} onChange={(e) => set({ minutes: e.target.value })}
            />
            <span>m</span>
          </div>
          {timedWithPauses && (
            <span className="field-hint">Changing the duration removes this session’s recorded pauses.</span>
          )}
        </div>

        <div className="field">
          <span className="field-label">Productivity (optional)</span>
          <div className="rating" role="group" aria-label="Productivity">
            {([1, 2, 3, 4, 5] as Productivity[]).map((p) => (
              <button
                type="button"
                key={p}
                aria-pressed={form.productivity === p}
                aria-label={`${p} – ${RATING_LABELS[p - 1]}`}
                title={RATING_LABELS[p - 1]}
                onClick={() => set({ productivity: form.productivity === p ? undefined : p })}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label className="field-label" htmlFor="sf-note">Note</label>
          <textarea id="sf-note" className="input" placeholder="What did you work on?" value={form.note} onChange={(e) => set({ note: e.target.value })} />
        </div>

        {error && <p className="form-error" role="alert">{error}</p>}

        <div className="form-actions">
          <button type="submit" className="btn btn-primary btn-block">
            {session ? 'Save changes' : 'Save session'}
          </button>
          {session && (
            <button type="button" className="btn btn-danger btn-block" onClick={() => setConfirmingDelete(true)}>
              <Icon name="trash" size={18} /> Delete session
            </button>
          )}
        </div>
      </form>
      {confirmingDelete && (
        <ConfirmSheet
          title="Delete session"
          message="Delete this session? This can’t be undone."
          confirmLabel="Delete session"
          onConfirm={remove}
          onClose={() => setConfirmingDelete(false)}
        />
      )}
    </main>
  )
}
