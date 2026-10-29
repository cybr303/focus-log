import { tint } from '../lib/colors'
import type { Module } from '../lib/types'

/** Emoji in a tinted rounded square, in the module's colour. */
export function ModuleBadge({ module, size = 40 }: { module: Pick<Module, 'emoji' | 'color'>; size?: number }) {
  return (
    <span
      style={{
        width: size, height: size, borderRadius: size * 0.3, flexShrink: 0,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: tint(module.color, 0.22), fontSize: size * 0.5,
      }}
      aria-hidden="true"
    >
      {module.emoji}
    </span>
  )
}
