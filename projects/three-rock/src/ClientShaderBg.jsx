import { useEffect, useMemo, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import gsap from 'gsap'

// Full-screen shader plane that cross-fades between the previous and the current client image
// with a circular (radial) reveal expanding from the center outward. Lives inside the 3D scene
// so the rock's glass transmission refracts the background naturally.
//
// Uniforms:
//   uTexA / uHasA   — outgoing image
//   uTexB / uHasB   — incoming image
//   uProgress       — 0 → 1 (animated via GSAP)
//   uSoftness       — edge softness of the circular mask
//   uAspect         — plane aspect (W/H) to keep the mask circular
//   uImgAspectA/B   — image aspect ratios (w/h) for cover-fit sampling
//   uOldScale       — scale applied to outgoing image as it pushes out
//   uDirection      — +1 = reveal from center outward; -1 = collapse inward

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const FRAG = /* glsl */ `
  precision highp float;
  uniform sampler2D uTexA;
  uniform sampler2D uTexB;
  uniform float uHasA;
  uniform float uHasB;
  uniform float uProgress;
  uniform float uSoftness;
  uniform float uAspect;
  uniform float uImgAspectA;
  uniform float uImgAspectB;
  uniform float uOldScale;
  uniform float uDirection;
  varying vec2 vUv;

  // Cover-fit sampling: scale UVs so the image fills the plane without distortion.
  vec2 coverUv(vec2 uv, float planeAspect, float imgAspect, float extraScale) {
    vec2 c = uv - 0.5;
    if (imgAspect > planeAspect) {
      // Image wider → scale X down
      c.x *= planeAspect / imgAspect;
    } else {
      c.y *= imgAspect / planeAspect;
    }
    c /= extraScale;
    return c + 0.5;
  }

  void main() {
    // Aspect-corrected distance from center
    vec2 p = vUv - 0.5;
    p.x *= uAspect;
    float dist = length(p);
    float maxDist = sqrt(uAspect*uAspect*0.25 + 0.25);
    float nd = dist / maxDist; // 0 center, 1 corner

    float prog = uDirection > 0.0 ? uProgress : (1.0 - uProgress);
    float soft = max(uSoftness, 0.0001);
    // Mask = 1 where the NEW image shows (inside the expanding circle)
    float mask = smoothstep(prog + soft, prog - soft, nd);
    if (uDirection < 0.0) mask = 1.0 - mask;

    // Outgoing image scales up as it pushes outward
    float scaleOut = 1.0 + (uOldScale - 1.0) * uProgress;
    vec2 uvA = coverUv(vUv, uAspect, uImgAspectA, scaleOut);
    vec2 uvB = coverUv(vUv, uAspect, uImgAspectB, 1.0);

    vec4 a = uHasA > 0.5 ? texture2D(uTexA, uvA) : vec4(0.0);
    vec4 b = uHasB > 0.5 ? texture2D(uTexB, uvB) : vec4(0.0);

    vec3 col = mix(a.rgb, b.rgb, mask);
    float alpha = mix(a.a * uHasA, b.a * uHasB, mask);
    gl_FragColor = vec4(col, alpha);
  }
`

export default function ClientShaderBg({
  items,
  hoveredId,
  enabled = true,
  planeZ = -2,
  planeWidth = 20,
  planeHeight = 11.25,
  durationS = 0.6,
  easing = 'power2.inOut',
  softness = 0.08,
  oldScale = 1.15,
  direction = 'out',        // 'out' → from center to edges, 'in' → opposite
}) {
  const matRef = useRef(null)
  const meshRef = useRef(null)
  const texCache = useRef(new Map())  // id → { tex, aspect }
  const prevIdRef = useRef(null)
  const progressObj = useRef({ v: 0 })
  const { gl } = useThree()

  // Preload all client images once. Anisotropic filtering for sharpness at glancing angles.
  useEffect(() => {
    if (!enabled) return
    const loader = new THREE.TextureLoader()
    loader.crossOrigin = 'anonymous'
    items.forEach((c) => {
      if (!c?.image || texCache.current.has(c.id)) return
      loader.load(c.image, (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace
        tex.minFilter = THREE.LinearMipmapLinearFilter
        tex.magFilter = THREE.LinearFilter
        tex.anisotropy = gl.capabilities.getMaxAnisotropy()
        tex.generateMipmaps = true
        const img = tex.image
        const aspect = img && img.width && img.height ? img.width / img.height : 16 / 9
        texCache.current.set(c.id, { tex, aspect })
        // If the currently hovered client just finished loading, plug it in live
        if (matRef.current && hoveredId === c.id) {
          matRef.current.uniforms.uTexB.value = tex
          matRef.current.uniforms.uImgAspectB.value = aspect
          matRef.current.uniforms.uHasB.value = 1
        }
      })
    })
    return () => {
      // Dispose on unmount
      texCache.current.forEach(({ tex }) => { try { tex.dispose() } catch {} })
      texCache.current.clear()
    }
  }, [enabled, items, gl])

  // Static uniforms — created once; values updated via refs on prop changes below.
  const uniforms = useMemo(() => ({
    uTexA:       { value: null },
    uTexB:       { value: null },
    uHasA:       { value: 0 },
    uHasB:       { value: 0 },
    uProgress:   { value: 0 },
    uSoftness:   { value: softness },
    uAspect:     { value: planeWidth / planeHeight },
    uImgAspectA: { value: 16 / 9 },
    uImgAspectB: { value: 16 / 9 },
    uOldScale:   { value: oldScale },
    uDirection:  { value: direction === 'in' ? -1 : 1 },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [])

  // Live-update uniforms when Leva knobs change
  useEffect(() => {
    const m = matRef.current
    if (!m) return
    m.uniforms.uSoftness.value  = softness
    m.uniforms.uOldScale.value  = oldScale
    m.uniforms.uDirection.value = direction === 'in' ? -1 : 1
    m.uniforms.uAspect.value    = planeWidth / planeHeight
  }, [softness, oldScale, direction, planeWidth, planeHeight])

  // React to hoveredId changes: swap A/B and tween progress 0→1.
  useEffect(() => {
    const m = matRef.current
    if (!m) return
    const prev = prevIdRef.current
    const curr = hoveredId
    if (prev === curr) { prevIdRef.current = curr; return }

    const prevEntry = prev ? texCache.current.get(prev) : null
    const currEntry = curr ? texCache.current.get(curr) : null

    m.uniforms.uTexA.value       = prevEntry?.tex || null
    m.uniforms.uImgAspectA.value = prevEntry?.aspect || 16 / 9
    m.uniforms.uHasA.value       = prevEntry ? 1 : 0
    m.uniforms.uTexB.value       = currEntry?.tex || null
    m.uniforms.uImgAspectB.value = currEntry?.aspect || 16 / 9
    m.uniforms.uHasB.value       = currEntry ? 1 : 0

    gsap.killTweensOf(progressObj.current)
    progressObj.current.v = 0
    m.uniforms.uProgress.value = 0
    gsap.to(progressObj.current, {
      v: 1,
      duration: durationS,
      ease: easing,
      onUpdate: () => {
        if (matRef.current) matRef.current.uniforms.uProgress.value = progressObj.current.v
      },
    })

    prevIdRef.current = curr
  }, [hoveredId, durationS, easing])

  if (!enabled) return null

  return (
    <mesh ref={meshRef} position={[0, 0, planeZ]}>
      <planeGeometry args={[planeWidth, planeHeight]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={VERT}
        fragmentShader={FRAG}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  )
}
