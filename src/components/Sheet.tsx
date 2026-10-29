import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import './Sheet.css'

/** iOS-style bottom sheet. Render conditionally: `{open && <Sheet ...>}`. */
export function Sheet({ title, onClose, children, actions }: { title: string; onClose: () => void; children: ReactNode; actions?: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  return createPortal(
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grabber" />
        <div className="sheet-header">
          <button className="link-btn" onClick={onClose}>Cancel</button>
          <h2>{title}</h2>
          <div className="sheet-actions">{actions}</div>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
