import { useEffect, useRef } from 'react'
import gsap from 'gsap'

// Full-viewport background stack for client hover previews.
// One <div> per client is always mounted; GSAP drives the in/out animations so we get
// tight control over easing + clip-path without CSS transition quirks.
//
// Cross-fade choreography on hovered-id change (A → B):
//   OUTGOING A: opacity 1→0, scale 1→outScale,  duration outDurS, ease outEasing
//   INCOMING B: opacity 0→1, clip-path circle(0%) → circle(radius%) at 50% 50%,
//               duration inDurS, ease inEasing
// The simultaneous scale-up + clipped-circle-reveal gives the "rivelata dal centro verso le estremità"
// feel the user asked for while the outgoing image pushes outward before vanishing.
export default function ClientImageBg({
  items,                 // array of { id, image }
  hoveredId,
  widthVw = 100,
  heightVh = 100,
  rightVw = null,        // if null → horizontally centered
  topVh = 0,
  zIndex = 2,
  // Timing knobs
  outDurS = 0.4,
  outScale = 1.15,
  outEasing = 'circ.in',
  inDurS = 0.4,
  inEasing = 'circ.out',
  clipToPct = 75,        // final radius (circle reaches the corners around ~71%)
}) {
  const refs = useRef(new Map())
  const prevIdRef = useRef(null)

  useEffect(() => {
    const prev = prevIdRef.current
    const curr = hoveredId

    // OUT animation for previously active layer (if it changed / cleared).
    if (prev && prev !== curr) {
      const el = refs.current.get(prev)
      if (el) {
        gsap.killTweensOf(el)
        gsap.to(el, {
          opacity: 0,
          scale: outScale,
          duration: outDurS,
          ease: outEasing,
          overwrite: 'auto',
        })
      }
    }

    // IN animation for newly active layer (reveal from center via expanding clip circle).
    if (curr && curr !== prev) {
      const el = refs.current.get(curr)
      if (el) {
        gsap.killTweensOf(el)
        gsap.fromTo(el,
          {
            opacity: 0,
            scale: 1,
            '--clip-r': '0%',
          },
          {
            opacity: 1,
            '--clip-r': `${clipToPct}%`,
            duration: inDurS,
            ease: inEasing,
            overwrite: 'auto',
          },
        )
      }
    }

    prevIdRef.current = curr
  }, [hoveredId, outDurS, outScale, outEasing, inDurS, inEasing, clipToPct])

  const posStyle = rightVw == null
    ? { left: '50%', transform: 'translateX(-50%)' }
    : { right: `${rightVw}vw` }

  return (
    <>
      {items.map((c) => {
        if (!c?.image) return null
        return (
          <div
            key={c.id}
            ref={(el) => {
              if (el) refs.current.set(c.id, el)
              else refs.current.delete(c.id)
            }}
            style={{
              position: 'fixed',
              top: `${topVh}vh`,
              ...posStyle,
              width: `${widthVw}vw`,
              height: `${heightVh}vh`,
              pointerEvents: 'none',
              zIndex,
              backgroundImage: `url("${c.image}")`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              // Initial state — invisible & fully clipped; GSAP drives the reveal.
              opacity: 0,
              transform: rightVw == null ? 'translateX(-50%) scale(1)' : 'scale(1)',
              transformOrigin: 'center center',
              '--clip-r': '0%',
              clipPath: 'circle(var(--clip-r) at 50% 50%)',
              WebkitClipPath: 'circle(var(--clip-r) at 50% 50%)',
              willChange: 'opacity, transform, clip-path',
            }}
          />
        )
      })}
    </>
  )
}
