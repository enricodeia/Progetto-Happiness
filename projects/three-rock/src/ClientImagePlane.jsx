import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// Ease functions matching MaskedVideo.jsx
const circInOut = (t) =>
  t < 0.5
    ? (1 - Math.sqrt(1 - 4 * t * t)) / 2
    : (Math.sqrt(1 - 4 * (t - 1) * (t - 1)) + 1) / 2

function makeTween(v = 0) {
  return {
    from: v, to: v, startTime: 0, duration: 0.001,
    easing: (t) => t, current: v,
    setTarget(target, secs, ease) {
      this.from = this.current
      this.to = target
      this.startTime = performance.now()
      this.duration = Math.max(0.001, secs) * 1000
      this.easing = ease
    },
    update() {
      const t = Math.min(1, (performance.now() - this.startTime) / this.duration)
      this.current = this.from + (this.to - this.from) * this.easing(t)
    },
  }
}

// Procedural gradient fallback (when a client has no image URL).
// Draws a dark radial gradient keyed by the client id, wraps into a CanvasTexture.
const GRADIENT_STOPS = {
  robinhood:   ['#263d2d', '#0a0f0c', '#050606'],
  midjourney:  ['#4a365f', '#110e1d', '#060509'],
  uber:        ['#2a2a2a', '#0a0a0a', '#000000'],
  suno:        ['#331e4a', '#0e0815', '#040308'],
  ro:          ['#2a2a2a', '#101010', '#050505'],
  atoms:       ['#3a2a1a', '#120d08', '#060403'],
  atlantic:    ['#152740', '#080f1b', '#02050b'],
  calvinklein: ['#0f0f0f', '#000000', '#000000'],
  headspace:   ['#3f2212', '#170b06', '#070302'],
  allwork:     ['#1a1a1a', '#0a0a0a', '#000000'],
}

function makeGradientTexture(id, w = 1024, h = 1024) {
  const cnv = document.createElement('canvas')
  cnv.width = w
  cnv.height = h
  const ctx = cnv.getContext('2d')
  const [a, b, c] = GRADIENT_STOPS[id] || ['#1a1a1a', '#0a0a0a', '#000000']
  const g = ctx.createRadialGradient(w * 0.7, h * 0.4, w * 0.08, w * 0.5, h * 0.5, w * 0.85)
  g.addColorStop(0, a)
  g.addColorStop(0.55, b)
  g.addColorStop(1, c)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
  const tex = new THREE.CanvasTexture(cnv)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.minFilter = THREE.LinearFilter
  tex.magFilter = THREE.LinearFilter
  return tex
}

// Renders a plane in the Canvas scene behind the 3D logo, showing the hovered client's image.
// Re-uses the same plane concept as MaskedVideo's full-video plane so the 3D glass sits in front
// and naturally refracts the image.
export default function ClientImagePlane({
  client,                      // { id, name, image? } | null
  planeWidth = 10,
  planeHeight = 5.625,
  z = -0.5,
  fadeDurationS = 0.3,
}) {
  const matRef = useRef()
  const opacityTween = useRef(makeTween(0))
  const textureCache = useRef(new Map())
  const [currentTex, setCurrentTex] = useState(null)

  // Memoized default texture per client (cached).
  const getTextureFor = (c) => {
    if (!c) return null
    const cache = textureCache.current
    const key = `${c.id}|${c.image || ''}`
    if (cache.has(key)) return cache.get(key)

    if (c.image) {
      // Async load for real image URL; return placeholder immediately, update when loaded.
      const placeholder = makeGradientTexture(c.id)
      cache.set(key, placeholder)
      new THREE.TextureLoader().load(c.image, (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace
        tex.minFilter = THREE.LinearFilter
        tex.magFilter = THREE.LinearFilter
        cache.set(key, tex)
        // Swap in if still the active one
        setCurrentTex((prev) => (prev === placeholder ? tex : prev))
      })
      return placeholder
    }

    const tex = makeGradientTexture(c.id)
    cache.set(key, tex)
    return tex
  }

  useEffect(() => {
    const tex = getTextureFor(client)
    if (tex) setCurrentTex(tex)
    opacityTween.current.setTarget(client ? 1 : 0, fadeDurationS, circInOut)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client?.id, client?.image, fadeDurationS])

  // Dispose textures on unmount
  useEffect(() => {
    return () => {
      textureCache.current.forEach((t) => { try { t.dispose() } catch {} })
      textureCache.current.clear()
    }
  }, [])

  useFrame(() => {
    opacityTween.current.update()
    if (matRef.current) {
      matRef.current.opacity = opacityTween.current.current
    }
  })

  const geom = useMemo(() => new THREE.PlaneGeometry(planeWidth, planeHeight), [planeWidth, planeHeight])

  if (!currentTex) return null
  return (
    <mesh position={[0, 0, z]} geometry={geom}>
      <meshBasicMaterial
        ref={matRef}
        map={currentTex}
        transparent
        opacity={0}
        toneMapped={false}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  )
}
