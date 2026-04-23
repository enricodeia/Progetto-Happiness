import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'

// Right-side image panel for Version D. A fixed container anchored to the
// right edge that reveals via clip-path (from bottom by default) when a client
// becomes active; cross-fades the image when the active client changes.
export default function ClientImageRight({
  items,
  activeId,
  enabled = true,
  rightVw = 3,
  topVh = 20,
  widthVw = 34,
  heightVh = 60,
  radiusVw = 0.2,
  growS = 0.8,
  growFrom = 'bottom',                 // 'bottom' | 'top' | 'left' | 'right'
  growEasing = 'circ.out',
  crossfadeS = 1.0,
  crossfadeEasing = 'power2.out',
  zIndex = 10,
  objectFit = 'cover',
}) {
  const [frontSlot, setFrontSlot] = useState(0)
  const imgRefs = [useRef(null), useRef(null)]
  const wrapRef = useRef(null)
  const prevIdRef = useRef(null)
  const [revealed, setRevealed] = useState(false)

  // Reveal / unreveal via clip-path animation.
  useEffect(() => {
    if (!enabled) return
    const el = wrapRef.current
    if (!el) return
    const shouldReveal = !!activeId
    if (shouldReveal === revealed) return
    const initial = getClip(growFrom, 'closed')
    const open    = getClip(growFrom, 'open')
    if (shouldReveal) {
      el.style.clipPath = initial
      requestAnimationFrame(() => {
        gsap.to(el, {
          clipPath: open,
          duration: growS,
          ease: growEasing,
          onComplete: () => setRevealed(true),
        })
      })
    } else {
      gsap.to(el, {
        clipPath: initial,
        duration: growS * 0.8,
        ease: growEasing,
        onComplete: () => setRevealed(false),
      })
    }
  }, [enabled, activeId, growFrom, growS, growEasing, revealed])

  // Cross-fade images between slots on activeId change.
  useEffect(() => {
    if (!enabled || !activeId) { prevIdRef.current = activeId; return }
    if (activeId === prevIdRef.current) return
    prevIdRef.current = activeId
    const client = items.find((c) => c.id === activeId)
    if (!client?.image) return
    const backIdx  = 1 - frontSlot
    const frontIdx = frontSlot
    const backImg  = imgRefs[backIdx].current
    const frontImg = imgRefs[frontIdx].current
    if (!backImg || !frontImg) return
    backImg.src = client.image
    const swap = () => {
      gsap.to(backImg,  { opacity: 1, duration: crossfadeS, ease: crossfadeEasing })
      gsap.to(frontImg, { opacity: 0, duration: crossfadeS, ease: crossfadeEasing,
        onComplete: () => setFrontSlot(backIdx) })
    }
    if (backImg.complete) swap()
    else backImg.onload = swap
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, enabled, items, crossfadeS, crossfadeEasing])

  if (!enabled) return null

  return (
    <div
      ref={wrapRef}
      aria-hidden
      style={{
        position: 'fixed',
        top: `${topVh}vh`,
        right: `${rightVw}vw`,
        width: `${widthVw}vw`,
        height: `${heightVh}vh`,
        zIndex,
        borderRadius: `${radiusVw}vw`,
        overflow: 'hidden',
        clipPath: getClip(growFrom, activeId ? 'open' : 'closed'),
        willChange: 'clip-path',
        pointerEvents: 'none',
      }}
    >
      {[0, 1].map((slot) => (
        <img
          key={slot}
          ref={imgRefs[slot]}
          alt=""
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit,
            opacity: slot === frontSlot ? 1 : 0,
            willChange: 'opacity',
          }}
        />
      ))}
    </div>
  )
}

function getClip(from, state) {
  // Inset clip-path rectangles.
  if (state === 'open') return 'inset(0% 0% 0% 0%)'
  switch (from) {
    case 'top':    return 'inset(100% 0% 0% 0%)'
    case 'left':   return 'inset(0% 100% 0% 0%)'
    case 'right':  return 'inset(0% 0% 0% 100%)'
    case 'bottom':
    default:       return 'inset(0% 0% 100% 0%)'
  }
}
