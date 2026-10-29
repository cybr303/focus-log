import { useRef, useState, type ChangeEvent } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { ConfirmSheet } from '../features/modules/ConfirmSheet'
import '../features/modules/modules.css'
import { backupFilename, buildBackup, parseBackup, summarizeData } from '../lib/backup'
import type { AppData } from '../lib/types'
import { useStore } from '../store/store'

type Notice = { kind: 'ok' | 'error'; text: string }

export function SettingsPage() {
  const modules = useStore((s) => s.modules)
  const sessions = useStore((s) => s.sessions)
  const active = useStore((s) => s.active)
  const replaceAll = useStore((s) => s.replaceAll)

  const fileRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<{ data: AppData; fileName: string } | null>(null)
  const [confirmErase, setConfirmErase] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)

  const current: AppData = { modules, sessions, active }
  const isEmpty = modules.length === 0 && sessions.length === 0 && !active

  const exportData = () => {
    const blob = new Blob([JSON.stringify(buildBackup(current), null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = backupFilename()
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    setNotice({ kind: 'ok', text: `Exported ${summarizeData(current)}.` })
  }

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow picking the same file again
    if (!file) return
    let text: string
    try {
      text = await file.text()
    } catch {
      return setNotice({ kind: 'error', text: "Couldn't read that file." })
    }
    const result = parseBackup(text)
    if (!result.ok) return setNotice({ kind: 'error', text: result.error })
    setNotice(null)
    setPending({ data: result.data, fileName: file.name })
  }

  return (
    <main className="page">
      <div className="page-header">
        <Link to="/" className="link-btn md-back">
          <Icon name="chevronLeft" size={20} /> Home
        </Link>
      </div>
      <h1 className="page-title" style={{ marginTop: 4 }}>Settings</h1>

      <section className="section">
        <h2 className="section-title">Backup</h2>
        <div className="list">
          <button className="list-item set-row" onClick={exportData}>
            <span className="set-icon" style={{ background: 'rgba(10,132,255,0.2)', color: 'var(--accent)' }}>
              <Icon name="download" size={18} />
            </span>
            <span className="set-text">
              <span>Export backup</span>
              <span className="muted set-sub">{summarizeData(current)} · JSON file</span>
            </span>
          </button>
          <button className="list-item set-row" onClick={() => fileRef.current?.click()}>
            <span className="set-icon" style={{ background: 'rgba(48,209,88,0.2)', color: 'var(--success)' }}>
              <Icon name="upload" size={18} />
            </span>
            <span className="set-text">
              <span>Import backup</span>
              <span className="muted set-sub">Replaces everything on this device</span>
            </span>
          </button>
        </div>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={onFile} />
        {notice && (
          <div className={`set-notice ${notice.kind === 'error' ? 'is-error' : 'is-ok'}`} role={notice.kind === 'error' ? 'alert' : 'status'}>
            {notice.text}
          </div>
        )}
      </section>

      <section className="section">
        <h2 className="section-title">Study days</h2>
        <div className="card set-info">
          <strong>Days end at 4:00 AM.</strong>{' '}
          <span className="muted">Sessions started after midnight but before 4:00 AM count toward the previous day, so late nights don't break your streak.</span>
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">Danger zone</h2>
        <button className="btn btn-danger btn-block" onClick={() => setConfirmErase(true)} disabled={isEmpty}>
          <Icon name="trash" size={20} /> Erase all data
        </button>
      </section>

      <p className="set-about faint">FocusLog · data stays on this device</p>

      {pending && (
        <ConfirmSheet
          title="Import Backup"
          message={
            <>
              <strong>{pending.fileName}</strong> contains <strong>{summarizeData(pending.data)}</strong>
              {pending.data.active ? ' and a running session' : ''}.
              <br />
              <br />
              Importing <strong className="confirm-warn">replaces all current data</strong> ({summarizeData(current)}). Export a backup
              first if you want to keep it.
            </>
          }
          confirmLabel="Replace my data"
          onConfirm={() => {
            replaceAll(pending.data)
            setNotice({ kind: 'ok', text: `Imported ${summarizeData(pending.data)}.` })
          }}
          onClose={() => setPending(null)}
        />
      )}
      {confirmErase && (
        <ConfirmSheet
          title="Erase All Data"
          message={
            <>
              This permanently deletes <strong className="confirm-warn">{summarizeData(current)}</strong>
              {active ? ' and the running session' : ''} from this device. It can't be undone.
            </>
          }
          confirmLabel="Erase everything"
          onConfirm={() => {
            replaceAll({ modules: [], sessions: [], active: null })
            setNotice({ kind: 'ok', text: 'All data erased.' })
          }}
          onClose={() => setConfirmErase(false)}
        />
      )}
    </main>
  )
}
