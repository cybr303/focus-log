/** Small inline SVG icon set (SF Symbols-ish). Add new icons here rather than pulling in an icon library. */
const paths = {
  home: 'M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z',
  book: 'M3 5.5C5.5 4.5 8.5 4.5 11 6v14c-2.5-1.5-5.5-1.5-8-.5zM21 5.5c-2.5-1-5.5-1-8 .5v14c2.5-1.5 5.5-1.5 8-.5z',
  calendar: 'M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zM4 9h16M8 2v4M16 2v4',
  sparkles: 'M12 2l2.2 6.3L21 10l-6.8 1.9L12 18l-2.2-6.1L3 10l6.8-1.7zM19 15l.9 2.4 2.1.6-2.1.7L19 21l-.9-2.3L16 18l2.1-.6z',
  gear: 'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM19.4 13a7.5 7.5 0 0 0 0-2l2-1.6-2-3.4-2.4 1a7.6 7.6 0 0 0-1.7-1L15 3h-4l-.4 2.6a7.6 7.6 0 0 0-1.7 1l-2.4-1-2 3.4 2 1.6a7.5 7.5 0 0 0 0 2l-2 1.6 2 3.4 2.4-1a7.6 7.6 0 0 0 1.7 1L11 21h4l.4-2.6a7.6 7.6 0 0 0 1.7-1l2.4 1 2-3.4z',
  plus: 'M12 5v14M5 12h14',
  close: 'M6 6l12 12M18 6 6 18',
  pause: 'M8 5v14M16 5v14',
  play: 'M7 4.5v15l13-7.5z',
  check: 'M5 12.5l4.5 4.5L19 7',
  chevronRight: 'M9 5l7 7-7 7',
  chevronLeft: 'M15 5l-7 7 7 7',
  timer: 'M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM12 9v4l2.5 2.5M9 2h6',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
  edit: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4',
  flame: 'M12 22c4 0 7-2.7 7-6.8 0-4-3-6.2-4-9.2-1 2-2 3-3.5 3.5C12 7 11.5 4 9 2c0 4-4 6.7-4 11.2C5 19.3 8 22 12 22z',
  walk: 'M13 4a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM9 22l2.5-7 2.5 2.5V22M8 11l2-4 4 1 2 3M10 7l1.5 8',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  download: 'M12 4v11M7 10l5 5 5-5M4 20h16',
  upload: 'M12 20V9M7 14l5-5 5 5M4 4h16',
} as const

export type IconName = keyof typeof paths

export function Icon({ name, size = 22, stroke = 2, className }: { name: IconName; size?: number; stroke?: number; className?: string }) {
  const filled = name === 'play' || name === 'home'
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={name === 'more' ? 3.5 : stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  )
}
