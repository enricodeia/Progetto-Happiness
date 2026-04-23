import { useEffect, useRef } from 'react'

// Two-layer cursor (dot + ring), each built as an outer WRAPPER and an inner VISUAL:
//   - Wrapper: absolute-positioned, sized to the base dimensions, translated every RAF to track
//     the pointer (or the morph target) — NO CSS transition, so position snaps instantly.
//   - Inner:   fixed base size, CSS `transform: scale(...)` transitioned with a power4-style ease.
//     `transform-origin: center` guarantees the radius grows/shrinks from the center.
//
// This split is what lets size animate smoothly from the center while position snaps reactively.
export default function CustomCursor({
  ringColor = '#ffffff',
  ringBorderPx = 1.5,
  dotColor = '#ffffff',
  dotIdleSizePx = 12,
  dotHoverSizePx = 2,
  ringIdleSizePx = 26,
  hoverSizePx = 40,
  morphDurationS = 1.0,
  morphPadPx = 5,
  morphRect = null,
  hoverActive = false,
  enabled = true,
  blendMode = 'normal',
  dotOpacity = 1,
  ringOpacity = 1,
  easing = 'cubic-bezier(0.23, 1, 0.32, 1)', // power4.out
}) {
  const dotWrapRef = useRef(null)
  const dotInnerRef = useRef(null)
  const ringWrapRef = useRef(null)
  const ringInnerRef = useRef(null)
  const rafRef = useRef(0)
  const targetRef = useRef({ x: 0, y: 0 })

  // Hide native cursor while active.
  useEffect(() => {
    if (!enabled) return
    const prev = document.body.style.cursor
    document.body.style.cursor = 'none'
    return () => { document.body.style.cursor = prev }
  }, [enabled])

  useEffect(() => {
    if (!enabled) return
    const onMove = (e) => {
      targetRef.current.x = e.clientX
      targetRef.current.y = e.clientY
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [enabled])

  useEffect(() => {
    if (!enabled) return
    const tick = () => {
      const rect = typeof morphRect === 'function' ? morphRect() : morphRect
      const t = targetRef.current
      const isActive = !!rect || hoverActive

      // ---- DOT ----
      const dotWrap = dotWrapRef.current
      const dotInner = dotInnerRef.current
      if (dotWrap && dotInner) {
        // Wrapper snaps to pointer (no transition on translate)
        dotWrap.style.transform = `translate(${t.x - dotIdleSizePx / 2}px, ${t.y - dotIdleSizePx / 2}px)`
        // Inner scales from center via CSS transition
        const dotScale = isActive ? (dotHoverSizePx / dotIdleSizePx) : 1
        dotInner.style.transform = `scale(${dotScale})`
      }

      // ---- RING ----
      const ringWrap = ringWrapRef.current
      const ringInner = ringInnerRef.current
      if (ringWrap && ringInner) {
        if (rect) {
          // Sticky morph to the element's rect — set real width/height on the inner so the
          // ring hugs the button as a pill (no stretched ellipse from scale).
          const cx = rect.left + rect.width / 2
          const cy = rect.top + rect.height / 2
          const w = rect.width  + morphPadPx * 2
          const h = rect.height + morphPadPx * 2
          ringWrap.style.transform = `translate(${cx - w / 2}px, ${cy - h / 2}px)`
          ringInner.style.width   = `${w}px`
          ringInner.style.height  = `${h}px`
          ringInner.style.transform = `scale(1)`
          ringInner.style.opacity   = String(ringOpacity)
        } else if (hoverActive) {
          // Plain circle grow from center (pills) via uniform scale on the base size.
          ringWrap.style.transform = `translate(${t.x - ringIdleSizePx / 2}px, ${t.y - ringIdleSizePx / 2}px)`
          ringInner.style.width   = `${ringIdleSizePx}px`
          ringInner.style.height  = `${ringIdleSizePx}px`
          const s = hoverSizePx / ringIdleSizePx
          ringInner.style.transform = `scale(${s})`
          ringInner.style.opacity   = String(ringOpacity)
        } else {
          ringWrap.style.transform = `translate(${t.x - ringIdleSizePx / 2}px, ${t.y - ringIdleSizePx / 2}px)`
          ringInner.style.width   = `${ringIdleSizePx}px`
          ringInner.style.height  = `${ringIdleSizePx}px`
          ringInner.style.transform = `scale(1)`
          ringInner.style.opacity   = '0'
        }
      }

      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [enabled, morphRect, hoverActive, dotIdleSizePx, dotHoverSizePx, ringIdleSizePx, hoverSizePx, morphPadPx, ringOpacity])

  if (!enabled) return null

  const transitionStr = `transform ${morphDurationS}s ${easing}, width ${morphDurationS}s ${easing}, height ${morphDurationS}s ${easing}, opacity ${morphDurationS}s ${easing}`

  return (
    <>
      {/* RING wrapper + inner */}
      <div
        ref={ringWrapRef}
        aria-hidden
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: `${ringIdleSizePx}px`,
          height: `${ringIdleSizePx}px`,
          pointerEvents: 'none',
          mixBlendMode: blendMode,
          zIndex: 99998,
          willChange: 'transform',
        }}
      >
        <div
          ref={ringInnerRef}
          style={{
            width: '100%',
            height: '100%',
            border: `${ringBorderPx}px solid ${ringColor}`,
            borderRadius: '999px',
            background: 'transparent',
            transformOrigin: 'center center',
            transform: 'scale(1)',
            opacity: 0,
            transition: transitionStr,
            willChange: 'transform, opacity',
          }}
        />
      </div>

      {/* DOT wrapper + inner */}
      <div
        ref={dotWrapRef}
        aria-hidden
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: `${dotIdleSizePx}px`,
          height: `${dotIdleSizePx}px`,
          pointerEvents: 'none',
          zIndex: 99999,
          willChange: 'transform',
        }}
      >
        <div
          ref={dotInnerRef}
          style={{
            width: '100%',
            height: '100%',
            background: dotColor,
            borderRadius: '999px',
            opacity: dotOpacity,
            transformOrigin: 'center center',
            transform: 'scale(1)',
            transition: `transform ${morphDurationS}s ${easing}`,
            willChange: 'transform',
          }}
        />
      </div>
    </>
  )
}
