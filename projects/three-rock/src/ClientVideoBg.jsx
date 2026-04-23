import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'

// Fullscreen background video stack. Two <video> elements alternate as front
// and back slots; when activeId changes, the incoming video is loaded onto the
// back slot and crossfaded to the front over `crossfadeS`.
//
// If activeId is null, both slots fade out so the DOM behind shows through.
export default function ClientVideoBg({
  items,           // [{ id, video }]
  activeId,
  crossfadeS = 1.0,
  easing = 'power2.out',
  zIndex = 1,
  objectFit = 'cover',
  enabled = true,
}) {
  const [frontSlot, setFrontSlot] = useState(0)  // 0 or 1 — which video element is in front
  const vidRefs = [useRef(null), useRef(null)]
  const wrapRefs = [useRef(null), useRef(null)]
  const curIdRefs = [useRef(null), useRef(null)]
  const prevIdRef = useRef(null)

  useEffect(() => {
    if (!enabled) return
    if (activeId === prevIdRef.current) return
    prevIdRef.current = activeId

    const frontIdx = frontSlot
    const backIdx = 1 - frontSlot
    const frontEl = wrapRefs[frontIdx].current
    const backEl  = wrapRefs[backIdx].current
    if (!frontEl || !backEl) return

    // If nothing is active, fade everything out.
    if (!activeId) {
      gsap.to([frontEl, backEl], { opacity: 0, duration: crossfadeS, ease: easing })
      return
    }

    const client = items.find((c) => c.id === activeId)
    const src = client?.video
    if (!src) {
      gsap.to([frontEl, backEl], { opacity: 0, duration: crossfadeS, ease: easing })
      return
    }

    // Load incoming video into the BACK slot, then crossfade.
    const vidBack = vidRefs[backIdx].current
    const needsLoad = curIdRefs[backIdx].current !== activeId
    if (vidBack && needsLoad) {
      vidBack.src = src
      try { vidBack.load() } catch {}
      curIdRefs[backIdx].current = activeId
      const onCanPlay = () => {
        vidBack.removeEventListener('canplay', onCanPlay)
        try { vidBack.currentTime = 0; vidBack.play() } catch {}
        startCrossfade()
      }
      vidBack.addEventListener('canplay', onCanPlay)
      // Fallback if canplay doesn't fire quickly:
      setTimeout(() => { try { vidBack.play() } catch {}; startCrossfade() }, 250)
    } else if (vidBack) {
      try { vidBack.play() } catch {}
      startCrossfade()
    }

    function startCrossfade() {
      gsap.to(backEl,  { opacity: 1, duration: crossfadeS, ease: easing })
      gsap.to(frontEl, {
        opacity: 0,
        duration: crossfadeS,
        ease: easing,
        onComplete: () => {
          setFrontSlot(backIdx)
          const vf = vidRefs[frontIdx].current
          if (vf) { try { vf.pause() } catch {} }
        },
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, enabled, items, crossfadeS, easing])

  if (!enabled) return null

  return (
    <>
      {[0, 1].map((slot) => (
        <div
          key={slot}
          ref={wrapRefs[slot]}
          aria-hidden
          style={{
            position: 'fixed',
            inset: 0,
            zIndex,
            opacity: slot === frontSlot ? 1 : 0,
            pointerEvents: 'none',
            willChange: 'opacity',
          }}
        >
          <video
            ref={vidRefs[slot]}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            style={{
              width: '100%',
              height: '100%',
              objectFit,
              display: 'block',
            }}
          />
        </div>
      ))}
    </>
  )
}
