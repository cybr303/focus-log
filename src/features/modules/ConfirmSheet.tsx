import type { ReactNode } from 'react'
import { Sheet } from '../../components/Sheet'
import './modules.css'

/** Bottom-sheet confirmation for destructive actions. Render conditionally. */
export function ConfirmSheet({
  title, message, confirmLabel, onConfirm, onClose, danger = true,
}: { title: string; message: ReactNode; confirmLabel: string; onConfirm: () => void; onClose: () => void; danger?: boolean }) {
  return (
    <Sheet title={title} onClose={onClose}>
      <div className="confirm-message">{message}</div>
      <button
        className={`btn btn-block ${danger ? 'btn-danger' : 'btn-primary'}`}
        onClick={() => {
          onConfirm()
          onClose()
        }}
      >
        {confirmLabel}
      </button>
      <button className="btn btn-block" style={{ marginTop: 10 }} onClick={onClose}>
        Cancel
      </button>
    </Sheet>
  )
}
