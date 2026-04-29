import { useState, useEffect, useRef } from 'react'

const PEOPLE = [
  { src: 'https://i.pravatar.cc/150?img=32', size: 64 },
  { src: 'https://i.pravatar.cc/150?img=12', size: 56 },
  { src: 'https://i.pravatar.cc/150?img=47', size: 60 },
  { src: 'https://i.pravatar.cc/150?img=51', size: 52 },
  { src: 'https://i.pravatar.cc/150?img=25', size: 58 },
  { src: 'https://i.pravatar.cc/150?img=9', size: 50 },
  { src: 'https://i.pravatar.cc/150?img=33', size: 56 },
  { src: 'https://i.pravatar.cc/150?img=44', size: 62 },
  { src: 'https://i.pravatar.cc/150?img=3', size: 54 },
  { src: 'https://i.pravatar.cc/150?img=18', size: 58 },
]

const MAX_CONNECTIONS = 2
const CONNECTION_DIST = 260

const DEFAULTS = {
  orbitSpeed: 0.15,
  radiusX: 0.30,
  radiusY: 0.30,
  wobble: 0,
  wobbleSpeed: 0,
  introDelay: 0.18,
  introDuration: 0.8,
  introScale: 0.4,
  brightness: 0.65,
  borderOpacity: 0.15,
  glowOpacity: 0.08,
  lineOpacity: 0.25,
  connectionDist: 260,
}

function FloatingNetwork({ showControls = false, onParamsChange }) {
  const containerRef = useRef(null)
  const frameRef = useRef(null)
  const startTime = useRef(Date.now())
  const positionsRef = useRef([])
  const linesRef = useRef([])
  const connectionOpacity = useRef({})
  const [, forceRender] = useState(0)
  const [params, setParams] = useState(DEFAULTS)

  // Sync params out if parent wants them
  useEffect(() => {
    if (onParamsChange) onParamsChange(params)
  }, [params, onParamsChange])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let renderCounter = 0

    // Two concentric rings: inner (4 avatars) and outer (6 avatars)
    const innerCount = 4
    const orbits = PEOPLE.map((_, i) => {
      const isInner = i < innerCount
      const ringIndex = isInner ? i : i - innerCount
      const ringTotal = isInner ? innerCount : PEOPLE.length - innerCount
      return {
        angleOffset: (ringIndex / ringTotal) * Math.PI * 2,
        rxScale: isInner ? 0.55 : 1.0,
        ryScale: isInner ? 0.55 : 1.0,
        tilt: 0,
        direction: isInner ? -1 : 1,
        wobblePhase: 0,
        speedMult: isInner ? 1.2 : 0.8,
      }
    })

    const animate = () => {
      const el = containerRef.current
      if (!el) return

      const r = el.getBoundingClientRect()
      const w = r.width
      const h = r.height
      const cx = w / 2
      const cy = h / 2
      const t = (Date.now() - startTime.current) * 0.001
      const p = params

      const baseRx = w * p.radiusX
      const baseRy = h * p.radiusY

      // Compute positions from circular orbits
      const nodes = PEOPLE.map((person, i) => {
        const orb = orbits[i]
        const angle = orb.angleOffset + t * p.orbitSpeed * orb.speedMult * orb.direction
        const rx = baseRx * orb.rxScale
        const ry = baseRy * orb.ryScale

        const orbitX = cx + Math.cos(angle) * rx
        const orbitY = cy + Math.sin(angle) * ry

        // Intro: lerp from center to orbit position
        const introT = t - p.introDelay * i
        const introProgress = Math.max(0, Math.min(1, introT / p.introDuration))
        const eased = 1 - Math.pow(1 - introProgress, 3)

        const x = cx + (orbitX - cx) * eased
        const y = cy + (orbitY - cy) * eased

        return { x, y, size: person.size, introProgress: eased }
      })

      // Connection lines
      const pairs = []
      const connDist = p.connectionDist
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x
          const dy = nodes[i].y - nodes[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < connDist) pairs.push({ i, j, dist })
        }
      }

      pairs.sort((a, b) => a.dist - b.dist)
      const connCount = {}
      const activePairs = []
      for (const pair of pairs) {
        const ci = connCount[pair.i] || 0
        const cj = connCount[pair.j] || 0
        if (ci < MAX_CONNECTIONS && cj < MAX_CONNECTIONS) {
          activePairs.push(pair)
          connCount[pair.i] = ci + 1
          connCount[pair.j] = cj + 1
        }
      }

      const activeKeys = new Set()
      const newLines = []
      const co = connectionOpacity.current

      for (const pair of activePairs) {
        const key = `${pair.i}-${pair.j}`
        activeKeys.add(key)
        const proximity = 1 - pair.dist / connDist
        const target = proximity * proximity * p.lineOpacity
        co[key] = (co[key] || 0) + (target - (co[key] || 0)) * 0.06
        if (co[key] > 0.005) {
          newLines.push({
            x1: nodes[pair.i].x, y1: nodes[pair.i].y,
            x2: nodes[pair.j].x, y2: nodes[pair.j].y,
            opacity: co[key], key,
          })
        }
      }

      for (const key of Object.keys(co)) {
        if (!activeKeys.has(key)) {
          co[key] *= 0.94
          if (co[key] < 0.005) { delete co[key] }
          else {
            const [si, sj] = key.split('-').map(Number)
            newLines.push({
              x1: nodes[si].x, y1: nodes[si].y,
              x2: nodes[sj].x, y2: nodes[sj].y,
              opacity: co[key], key,
            })
          }
        }
      }

      positionsRef.current = nodes
      linesRef.current = newLines

      renderCounter++
      if (renderCounter % 2 === 0) forceRender(c => c + 1)
      frameRef.current = requestAnimationFrame(animate)
    }

    frameRef.current = requestAnimationFrame(animate)

    return () => cancelAnimationFrame(frameRef.current)
  }, [params])

  const elapsed = (Date.now() - startTime.current) * 0.001
  const positions = positionsRef.current
  const lines = linesRef.current
  const p = params

  const updateParam = (key, val) => setParams(prev => ({ ...prev, [key]: val }))

  return (
    <>
      <div
        ref={containerRef}
        style={{
          position: 'absolute', inset: 0,
          pointerEvents: 'none', zIndex: 1, overflow: 'hidden',
        }}
      >
        {/* Connection lines */}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
          {lines.map((line) => (
            <line
              key={line.key}
              x1={line.x1} y1={line.y1}
              x2={line.x2} y2={line.y2}
              stroke={`rgba(255, 107, 53, ${line.opacity})`}
              strokeWidth="1"
            />
          ))}
        </svg>

        {/* Avatar nodes with staggered intro from center */}
        {positions.map((pos, i) => {
          const eased = pos.introProgress || 0
          const scale = p.introScale + (1 - p.introScale) * eased

          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: pos.x - pos.size / 2,
                top: pos.y - pos.size / 2,
                width: pos.size,
                height: pos.size,
                borderRadius: '50%',
                overflow: 'hidden',
                border: `2px solid rgba(255, 107, 53, ${p.borderOpacity * eased})`,
                boxShadow: `0 0 24px rgba(255, 107, 53, ${p.glowOpacity * eased})`,
                opacity: eased,
                transform: `scale(${scale})`,
                willChange: 'transform, opacity',
              }}
            >
              <img
                src={PEOPLE[i].src}
                alt=""
                style={{
                  width: '100%', height: '100%',
                  objectFit: 'cover',
                  filter: `brightness(${p.brightness})`,
                }}
              />
            </div>
          )
        })}
      </div>

      {/* Control panel */}
      {showControls && (
        <div style={{
          position: 'absolute', top: 12, right: 12, zIndex: 100,
          background: 'rgba(19,19,19,0.92)',
          backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 14, padding: '14px 16px',
          width: 240, maxHeight: '80vh', overflowY: 'auto',
          pointerEvents: 'auto',
          fontFamily: "'Space Grotesk', sans-serif",
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#FF6B35', marginBottom: 12 }}>
            Orbit Controls
          </div>
          {[
            { key: 'orbitSpeed', label: 'Orbit Speed', min: 0.01, max: 0.5, step: 0.01 },
            { key: 'radiusX', label: 'Radius X', min: 0.1, max: 0.5, step: 0.01 },
            { key: 'radiusY', label: 'Radius Y', min: 0.1, max: 0.45, step: 0.01 },
            { key: 'wobble', label: 'Wobble', min: 0, max: 40, step: 1 },
            { key: 'wobbleSpeed', label: 'Wobble Speed', min: 0.05, max: 1, step: 0.05 },
            { key: 'introDelay', label: 'Intro Stagger', min: 0.05, max: 0.5, step: 0.01 },
            { key: 'introDuration', label: 'Intro Duration', min: 0.2, max: 2, step: 0.1 },
            { key: 'introScale', label: 'Intro Scale', min: 0, max: 1, step: 0.05 },
            { key: 'brightness', label: 'Brightness', min: 0.2, max: 1, step: 0.05 },
            { key: 'borderOpacity', label: 'Border Opacity', min: 0, max: 0.5, step: 0.01 },
            { key: 'glowOpacity', label: 'Glow Opacity', min: 0, max: 0.3, step: 0.01 },
            { key: 'lineOpacity', label: 'Line Opacity', min: 0, max: 0.8, step: 0.01 },
            { key: 'connectionDist', label: 'Connect Dist', min: 100, max: 500, step: 10 },
          ].map(({ key, label, min, max, step }) => (
            <div key={key} style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.6)' }}>{label}</span>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontFamily: 'SF Mono, Menlo, monospace' }}>{params[key]}</span>
              </div>
              <input
                type="range" min={min} max={max} step={step}
                value={params[key]}
                onChange={(e) => updateParam(key, parseFloat(e.target.value))}
                style={{ width: '100%', height: 3, accentColor: '#FF6B35', cursor: 'pointer' }}
              />
            </div>
          ))}
          <button
            onClick={() => setParams(DEFAULTS)}
            style={{
              width: '100%', padding: '7px 0', borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.1)', background: 'transparent',
              color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: 500,
              cursor: 'pointer', marginTop: 4,
              fontFamily: "'Space Grotesk', sans-serif",
            }}
          >Reset to defaults</button>
        </div>
      )}
    </>
  )
}

export default FloatingNetwork
