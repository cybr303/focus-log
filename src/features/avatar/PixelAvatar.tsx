import { useMemo } from 'react'
import type { Mood } from './catalog'
import { composeAvatar, type Look } from './compose'
import { H, W } from './sprite'
import './avatar.css'

/** Renders the pixel character as crisp SVG. `scale` is screen pixels per art pixel. */
export function PixelAvatar({
  look, mood = 'idle', scale = 4, book, animate = true, className = '',
}: { look: Look; mood?: Mood; scale?: number; book?: string; animate?: boolean; className?: string }) {
  const { body, fx } = useMemo(() => composeAvatar(look, mood, book), [look, mood, book])
  return (
    <svg
      className={`px-avatar ${animate ? `mood-${mood}` : ''} ${className}`}
      width={W * scale}
      height={H * scale}
      viewBox={`0 0 ${W} ${H}`}
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      <g className="px-body">
        {body.map((r, i) => (
          <rect key={i} x={r.x} y={r.y} width={r.w} height={1} fill={r.color} />
        ))}
      </g>
      <g className="px-fx">
        {fx.map((r, i) => (
          <rect key={i} x={r.x} y={r.y} width={r.w} height={1} fill={r.color} />
        ))}
      </g>
    </svg>
  )
}
