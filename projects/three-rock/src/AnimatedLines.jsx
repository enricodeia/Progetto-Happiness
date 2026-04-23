import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

// Renders `text` with a per-word animation keyed by the line each word wraps into.
// Lines are detected by measuring the word spans' offsetTop, re-measured on resize + text changes.
// `active=true`  → reveal (words translate to 0 + fade in)       with inEase / inDurationS / stagger
// `active=false` → unreveal (words translate to fromYpx + fade out) with outEase / outDurationS / stagger
export default function AnimatedLines({
  text,
  active,
  fromYpx = 15,
  inDurationS = 0.9,
  outDurationS = 0.5,
  inEasing = 'cubic-bezier(0, 0.55, 0.45, 1)',   // circ.out
  outEasing = 'cubic-bezier(0.55, 0, 1, 0.45)',  // circ.in
  staggerMs = 80,
  delayS = 0,
  reverseStaggerOnOut = true,   // unreveal starts from the LAST line (bottom-up)
  style,
  className,
}) {
  const ref = useRef(null)
  const wordRefs = useRef([])
  const words = useMemo(() => text.split(/\s+/).filter(Boolean), [text])
  const [lineIdx, setLineIdx] = useState([])

  const measure = () => {
    if (!wordRefs.current.length) return
    const tops = wordRefs.current.map((el) => (el ? Math.round(el.offsetTop) : null))
    const unique = [...new Set(tops.filter((t) => t !== null))].sort((a, b) => a - b)
    setLineIdx(tops.map((t) => (t == null ? 0 : unique.indexOf(t))))
  }

  useLayoutEffect(() => { measure() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [text])
  useEffect(() => {
    const onResize = () => measure()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const dur = active ? inDurationS : outDurationS
  const ease = active ? inEasing : outEasing
  const totalLines = lineIdx.length
    ? Math.max(1, Math.max(...lineIdx) + 1)
    : 1

  return (
    <div ref={ref} className={className} style={style}>
      {words.map((w, i) => {
        const line = lineIdx[i] ?? 0
        const effectiveLine = (!active && reverseStaggerOnOut)
          ? (totalLines - 1 - line)
          : line
        const totalDelayS = delayS + effectiveLine * (staggerMs / 1000)
        return (
          <span
            key={i}
            ref={(el) => { wordRefs.current[i] = el }}
            style={{
              display: 'inline-block',
              whiteSpace: 'pre',
              transform: active ? 'translateY(0)' : `translateY(${fromYpx}px)`,
              opacity: active ? 1 : 0,
              transition: `transform ${dur}s ${ease} ${totalDelayS}s, opacity ${dur}s ${ease} ${totalDelayS}s`,
              willChange: 'transform, opacity',
            }}
          >
            {w}{i < words.length - 1 ? ' ' : ''}
          </span>
        )
      })}
    </div>
  )
}
