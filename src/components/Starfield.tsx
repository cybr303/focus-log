import { useMemo } from 'react'

/** Static starry-night backdrop. Deterministic so stars don't jump between renders. */
export function Starfield() {
  const stars = useMemo(() => {
    let seed = 7
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    return Array.from({ length: 90 }, () => ({
      x: rand() * 100,
      y: rand() * 100,
      r: rand() < 0.08 ? 1.4 : 0.6 + rand() * 0.5,
      o: 0.25 + rand() * 0.6,
    }))
  }, [])
  return (
    <svg className="starfield" width="100%" height="100%" aria-hidden="true">
      {stars.map((s, i) => (
        <circle key={i} cx={`${s.x}%`} cy={`${s.y}%`} r={s.r} fill="#fff" opacity={s.o} />
      ))}
    </svg>
  )
}
