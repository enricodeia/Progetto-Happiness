import { useEffect, useRef, useState } from 'react'

// DOM video container with:
//   - clip-path "grow" reveal on show/hide
//   - double <video> cross-fade when switching client A → B (avoids black flash)
// Internal gradient mask was removed per user request.
export default function VideoContainer({
  client,
  topVh = 18.5,
  leftVw = 28,
  widthVw = 42,
  heightVh = 62,
  borderRadiusVw = 0,
  growDurationS = 0.8,
  growEasing = 'cubic-bezier(0, 0.55, 0.45, 1)', // circ.out
  growFrom = 'bottom',
  revealDelayS = 0,
  holdOnLeaveS = 0,
  objectFit = 'cover',
  muted = true,
  loop = true,
  zIndex = 10,
  enabled = true,
  fadeOpacity = true,
  // Cross-fade between consecutive client videos
  videoCrossfadeS = 1.0,
  videoCrossfadeEasing = 'cubic-bezier(0, 0.55, 0.45, 1)', // circ.out
}) {
  const v0Ref = useRef(null)
  const v1Ref = useRef(null)
  const active = !!(enabled && client?.video)

  const [frontSlot, setFrontSlot] = useState(0)
  const [srcA, setSrcA] = useState(null)
  const [srcB, setSrcB] = useState(null)
  const lastVideoRef = useRef(null)

  // On client.video change: put new src on back slot, then flip so it cross-fades into front.
  useEffect(() => {
    const nextSrc = client?.video || null
    if (nextSrc === lastVideoRef.current) return
    if (frontSlot === 0) setSrcB(nextSrc)
    else setSrcA(nextSrc)
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setFrontSlot((s) => (s === 0 ? 1 : 0)))
    })
    lastVideoRef.current = nextSrc
    return () => cancelAnimationFrame(id)
  }, [client?.video, frontSlot])

  useEffect(() => {
    const playing = (v, should) => {
      if (!v) return
      if (should) { try { v.currentTime = 0 } catch {}; v.play().catch(() => {}) }
      else v.pause()
    }
    playing(v0Ref.current, active && !!srcA)
    playing(v1Ref.current, active && !!srcB)
  }, [active, frontSlot, srcA, srcB])

  const clipHidden =
    growFrom === 'bottom' ? 'inset(100% 0 0 0)' :
    growFrom === 'top'    ? 'inset(0 0 100% 0)' :
    growFrom === 'left'   ? 'inset(0 100% 0 0)' :
                            'inset(0 0 0 100%)'
  const clipShown = 'inset(0 0 0 0)'

  const containerTransition = [
    `clip-path ${growDurationS}s ${growEasing} ${active ? revealDelayS : holdOnLeaveS}s`,
    `-webkit-clip-path ${growDurationS}s ${growEasing} ${active ? revealDelayS : holdOnLeaveS}s`,
    fadeOpacity ? `opacity ${growDurationS * 0.6}s ${growEasing} ${active ? revealDelayS : 0}s` : null,
  ].filter(Boolean).join(', ')

  const videoBaseStyle = {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit,
    display: 'block',
    transition: `opacity ${videoCrossfadeS}s ${videoCrossfadeEasing}`,
    willChange: 'opacity',
  }

  if (!enabled) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: `${topVh}vh`,
        left: `${leftVw}vw`,
        width: `${widthVw}vw`,
        height: `${heightVh}vh`,
        borderRadius: `${borderRadiusVw}vw`,
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex,
        background: '#000',
        clipPath: active ? clipShown : clipHidden,
        WebkitClipPath: active ? clipShown : clipHidden,
        opacity: fadeOpacity ? (active ? 1 : 0) : 1,
        transition: containerTransition,
        willChange: 'clip-path, opacity',
      }}
    >
      <video
        ref={v0Ref}
        src={srcA || undefined}
        muted={muted}
        loop={loop}
        playsInline
        preload="auto"
        style={{ ...videoBaseStyle, opacity: frontSlot === 0 ? 1 : 0, zIndex: frontSlot === 0 ? 2 : 1 }}
      />
      <video
        ref={v1Ref}
        src={srcB || undefined}
        muted={muted}
        loop={loop}
        playsInline
        preload="auto"
        style={{ ...videoBaseStyle, opacity: frontSlot === 1 ? 1 : 0, zIndex: frontSlot === 1 ? 2 : 1 }}
      />
    </div>
  )
}
