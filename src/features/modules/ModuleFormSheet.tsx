import { useState } from 'react'
import { Icon } from '../../components/Icon'
import { ModuleBadge } from '../../components/ModuleBadge'
import { Sheet } from '../../components/Sheet'
import { MODULE_COLORS, MODULE_EMOJIS } from '../../lib/colors'
import type { Module } from '../../lib/types'
import { useStore } from '../../store/store'
import { cleanEmoji, moduleNameError } from './logic'
import './modules.css'

/** Create (no `module`) or edit a module. Render conditionally. */
export function ModuleFormSheet({ module, onClose, onSaved }: { module?: Module; onClose: () => void; onSaved?: (m: Module) => void }) {
  const modules = useStore((s) => s.modules)
  const addModule = useStore((s) => s.addModule)
  const updateModule = useStore((s) => s.updateModule)

  const [name, setName] = useState(module?.name ?? '')
  const [color, setColor] = useState<string>(module?.color ?? MODULE_COLORS[modules.length % MODULE_COLORS.length])
  const [emoji, setEmoji] = useState<string>(module?.emoji ?? MODULE_EMOJIS[0])
  const [custom, setCustom] = useState(
    module && !(MODULE_EMOJIS as readonly string[]).includes(module.emoji) ? module.emoji : '',
  )
  const [examDate, setExamDate] = useState(module?.examDate ?? '')
  const [touched, setTouched] = useState(false)

  const error = moduleNameError(name, modules, module?.id)
  const showError = error && (touched || name.trim() !== '')

  const save = () => {
    setTouched(true)
    if (error) return
    const fields = { name: name.trim(), color, emoji, examDate: examDate || undefined }
    if (module) {
      updateModule(module.id, fields)
      onSaved?.({ ...module, ...fields })
    } else {
      // Call addModule outside the optional call: `onSaved?.(x)` skips evaluating x when onSaved is unset.
      const created = addModule(fields)
      onSaved?.(created)
    }
    onClose()
  }

  const onCustom = (v: string) => {
    const e = cleanEmoji(v)
    setCustom(e)
    if (e) setEmoji(e)
  }

  return (
    <Sheet
      title={module ? 'Edit Module' : 'New Module'}
      onClose={onClose}
      actions={
        <button className="link-btn mf-save" onClick={save} disabled={!!error && touched}>
          {module ? 'Save' : 'Add'}
        </button>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault()
          save()
        }}
      >
        <div className="mf-preview">
          <ModuleBadge module={{ emoji, color }} size={72} />
          <div className="mf-preview-name">{name.trim() || 'New module'}</div>
        </div>

        <label className="field">
          <span className="field-label">Name</span>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => setTouched(true)}
            placeholder="e.g. Linear Algebra"
            maxLength={60}
            autoFocus={!module}
            aria-invalid={!!showError}
          />
          {showError && <span className="mf-error">{error}</span>}
        </label>

        <div className="field">
          <span className="field-label">Colour</span>
          <div className="mf-swatches" role="radiogroup" aria-label="Colour">
            {MODULE_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={c === color}
                aria-label={c}
                className="mf-swatch"
                style={{ background: c, color: c }}
                onClick={() => setColor(c)}
              >
                {c === color && <Icon name="check" size={18} stroke={3} />}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <span className="field-label">Emoji</span>
          <div className="mf-emojis" role="radiogroup" aria-label="Emoji">
            {MODULE_EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                role="radio"
                aria-checked={e === emoji}
                className="mf-emoji"
                onClick={() => {
                  setEmoji(e)
                  setCustom('')
                }}
              >
                {e}
              </button>
            ))}
            <input
              className={`mf-emoji mf-emoji-custom${custom && custom === emoji ? ' is-on' : ''}`}
              value={custom}
              onChange={(e) => onCustom(e.target.value)}
              placeholder="+"
              aria-label="Custom emoji"
            />
          </div>
        </div>

        <div className="field">
          <span className="field-label">Exam date (optional)</span>
          <div className="row">
            <input className="input" type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
            {examDate && (
              <button type="button" className="btn-icon" aria-label="Clear exam date" onClick={() => setExamDate('')}>
                <Icon name="close" size={18} />
              </button>
            )}
          </div>
        </div>

        <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: 8 }}>
          {module ? 'Save changes' : 'Create module'}
        </button>
      </form>
    </Sheet>
  )
}
