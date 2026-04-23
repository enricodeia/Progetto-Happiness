import { Html } from '@react-three/drei'
import { useEffect, useRef, useState } from 'react'


export default function PlayReel({
  onClick,
  expanded,
  onHoverChange,
  position = [0, 0, 0.15],
  magneticRadius = 160,
  magneticStrength = 0.28,
  revealed = true,
  resetting = false,
  revealDelay = 2.0,
  revealDuration = 1.0,
  revealEasing = 'cubic-bezier(0, 0.55, 0.45, 1)',
  buttonRef,
}) {
  const btnRef = useRef(null)
  useEffect(() => {
    if (!buttonRef) return
    buttonRef.current = btnRef.current
    return () => { if (buttonRef) buttonRef.current = null }
  })
  const rafRef = useRef(0)
  const targetRef = useRef({ x: 0, y: 0 })
  const currentRef = useRef({ x: 0, y: 0 })
  const [, force] = useState(0)

  useEffect(() => {
    const onMove = (e) => {
      const btn = btnRef.current
      if (!btn) return
      const rect = btn.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      const dx = e.clientX - cx
      const dy = e.clientY - cy
      const d = Math.hypot(dx, dy)
      if (d < magneticRadius) {
        const f = (1 - d / magneticRadius) * magneticStrength
        targetRef.current = { x: dx * f * 0.9, y: dy * f * 0.9 }
      } else {
        targetRef.current = { x: 0, y: 0 }
      }
    }
    window.addEventListener('pointermove', onMove)
    return () => window.removeEventListener('pointermove', onMove)
  }, [magneticRadius, magneticStrength])

  // Pointer events only become active once the fade-in has actually started (after revealDelay).
  const [pointerEnabled, setPointerEnabled] = useState(false)
  useEffect(() => {
    if (!revealed) {
      setPointerEnabled(false)
      return
    }
    if (resetting) return
    const id = window.setTimeout(() => setPointerEnabled(true), revealDelay * 1000)
    return () => window.clearTimeout(id)
  }, [revealed, resetting, revealDelay])

  useEffect(() => {
    const tick = () => {
      const t = targetRef.current
      const c = currentRef.current
      c.x += (t.x - c.x) * 0.18
      c.y += (t.y - c.y) * 0.18
      const btn = btnRef.current
      if (btn) btn.style.transform = `translate(${c.x.toFixed(2)}px, ${c.y.toFixed(2)}px)`
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  return (
    <Html
      position={position}
      center
      zIndexRange={[100, 0]}
      style={{ pointerEvents: 'none' }}
    >
      <div
        style={{
          opacity: revealed ? 1 : 0,
          transition: resetting
            ? 'none'
            : `opacity ${revealDuration}s ${revealEasing} ${revealed ? revealDelay : 0}s`,
          pointerEvents: pointerEnabled ? 'auto' : 'none',
          willChange: 'opacity',
        }}
      >
      <button
        ref={btnRef}
        type="button"
        onPointerEnter={() => onHoverChange?.(true)}
        onPointerLeave={() => onHoverChange?.(false)}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          onClick?.()
        }}
        style={{
          pointerEvents: 'auto',
          background: 'rgba(10, 12, 18, 0.42)',
          border: '1px solid rgba(255, 255, 255, 0.32)',
          padding: '9px 16px 9px 13px',
          borderRadius: '999px',
          color: '#e8ecf7',
          cursor: 'pointer',
          backdropFilter: 'blur(14px) saturate(1.1)',
          WebkitBackdropFilter: 'blur(14px) saturate(1.1)',
          fontSize: '10px',
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          fontFamily: "'Basis Grotesque Pro', -apple-system, BlinkMacSystemFont, sans-serif",
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          gap: '9px',
          whiteSpace: 'nowrap',
          boxShadow: '0 4px 20px rgba(0,0,0,0.35), inset 0 0 0 1px rgba(255,255,255,0.05)',
          userSelect: 'none',
          willChange: 'transform',
        }}
      >
        {expanded ? (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
            <rect x="1.2" y="0.8" width="2.4" height="8.4" rx="0.4" fill="currentColor" />
            <rect x="6.4" y="0.8" width="2.4" height="8.4" rx="0.4" fill="currentColor" />
          </svg>
        ) : (
          <svg width="10" height="11" viewBox="0 0 10 11" fill="none" aria-hidden>
            <path d="M0.8 0.9 L9.2 5.5 L0.8 10.1 Z" fill="currentColor" />
          </svg>
        )}
        <span>{expanded ? 'Close reel' : 'Play reel'}</span>
      </button>
      </div>
    </Html>
  )
}
