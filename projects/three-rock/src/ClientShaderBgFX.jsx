import { useEffect, useMemo, useRef, useState } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import gsap from 'gsap'

// Cross-fade shader — adapted from the user's carousel. Two modes:
//   uShape = 0  →  "strip": curved vertical strip sweeps horizontally with a bent brightness edge
//   uShape = 1  →  "radial": transition expands from the center outward (ring-shaped brightness edge)
//
// Texture A = outgoing, Texture B = incoming.
// uHasA / uHasB gate the output alpha so the plane stays transparent (doesn't block DOM behind
// the canvas) when no texture is loaded yet.
const VERT = /* glsl */ `
  uniform float uProgress;
  uniform float uWaveProgress;
  uniform float uDirection;
  uniform float uWaveWidth;
  uniform float uWavePower;
  varying vec2 vUv;
  varying float vWaveValue;

  void main() {
    vUv = uv;
    vec3 pos = position;

    float wavePosition = uDirection > 0.0 ? uWaveProgress : (1.0 - uWaveProgress);
    float centerY = 0.5;
    float yFromCenter = (uv.y - centerY) / centerY;
    float uCurve = -pow(yFromCenter, 2.0) * 0.0;

    float waveCurveCenterX = wavePosition + 1.0 * uCurve * 0.22;
    float distFromWave = uv.x - waveCurveCenterX;
    float waveDistance = distFromWave / max(uWaveWidth, 0.001);
    float waveValue = sin(waveDistance * 3.14159) * exp(-abs(waveDistance) * uWavePower);
    vWaveValue = waveValue;

    vec4 modelPosition = modelMatrix * vec4(pos, 1.0);
    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectedPosition = projectionMatrix * viewPosition;

    gl_Position = projectedPosition;
  }
`

const FRAG = /* glsl */ `
  precision highp float;

  uniform float uProgress;
  uniform sampler2D uTexture;
  uniform sampler2D uTexture2;
  uniform float uHasA;
  uniform float uHasB;
  uniform float uTranslateProgress;
  uniform vec2 uQuadSize;
  uniform vec2 uTextureSize;
  uniform vec2 uTexture2Size;
  uniform float uBrightnessWidth;
  uniform float uBrightnessIntensity;
  uniform float uDirection;
  uniform float uDisplaceProgress;
  uniform float uWaveProgress;
  uniform float uTranslateOffsetMultiplier;
  uniform float uBulgeDepthStrength;
  uniform float uShape;            // 0 = strip, 1 = radial
  uniform float uEdgeWidth;
  uniform float uCurvature;
  uniform vec3  uBrightnessTint;
  uniform float uBackdropDarkness;

  varying vec2 vUv;
  varying float vWaveValue;

  vec2 getCoverUv(vec2 uv, vec2 textureSize, vec2 quadSize) {
    vec2 tempUv = uv - vec2(0.5);
    float quadAspect = quadSize.x / quadSize.y;
    float textureAspect = textureSize.x / textureSize.y;
    if (quadAspect < textureAspect) {
      tempUv *= vec2(quadAspect / textureAspect, 1.0);
    } else {
      tempUv *= vec2(1.0, textureAspect / quadAspect);
    }
    tempUv += vec2(0.5);
    return tempUv;
  }

  void main() {
    vec2 uv1 = getCoverUv(vUv, uTextureSize,  uQuadSize);
    vec2 uv2 = getCoverUv(vUv, uTexture2Size, uQuadSize);

    // Bulge driven by the vertex wave — pushes texels outward from the plane center.
    vec2 uvFromCenter = vUv - vec2(0.5);
    float bulgeAmount = vWaveValue * uBulgeDepthStrength * uProgress;
    vec2 bulgedUv1 = uv1 + uvFromCenter * bulgeAmount;
    vec2 bulgedUv2 = uv2 + uvFromCenter * bulgeAmount;

    // Horizontal displacement on the outgoing image (mirrored by direction).
    float directionSign = step(0.0, uDirection);
    vec2 displacedUv1 = bulgedUv1;
    float translateOffset = uDisplaceProgress * uTranslateOffsetMultiplier * 0.333333;
    displacedUv1.x += mix(translateOffset, -translateOffset, directionSign);
    float resetMask = step(1.0, uTranslateProgress);
    displacedUv1 = mix(displacedUv1, uv1, resetMask);

    vec3 tex1Color = texture2D(uTexture,  displacedUv1).rgb * uBackdropDarkness;
    vec3 tex2Color = texture2D(uTexture2, bulgedUv2).rgb * uBackdropDarkness;

    float width = uEdgeWidth;
    float transition;
    float brightnessMask;
    float progress = mix(1.0 - uProgress, uProgress, directionSign);

    if (uShape > 0.5) {
      // -------- RADIAL: expands from center outward (or inward if direction = 'in') --------
      float aspect = uQuadSize.x / uQuadSize.y;
      vec2 p = vUv - 0.5;
      p.x *= aspect;
      float dist = length(p);
      float maxDist = sqrt(aspect * aspect * 0.25 + 0.25);
      float nd = dist / maxDist;
      float edge = progress;
      // inside the growing circle = NEW image (transition = 0), outside = OLD (transition = 1)
      transition = smoothstep(edge - width, edge + width, nd);
      if (directionSign < 0.5) transition = 1.0 - transition;
      brightnessMask = 1.0 - smoothstep(0.0, uBrightnessWidth, abs(nd - edge));
    } else {
      // -------- STRIP: bent vertical strip sweeps horizontally --------
      float yFromCenter = (vUv.y - 0.5) * 2.0;
      float uShapeBend = -pow(yFromCenter, 2.0);
      uShapeBend *= mix(1.0, -1.0, 1.0 - directionSign);

      float progressOffset = mix(0.1, -0.1, directionSign);
      float curveStrength = progress + progressOffset;
      float bentTransition = progress + curveStrength * uShapeBend * uCurvature + progressOffset;

      transition = smoothstep(bentTransition - width, bentTransition + width, vUv.x);
      transition = mix(1.0 - transition, transition, directionSign);

      // Brightness strip: bent vertical line that travels with the transition.
      float baseStrip = mix(1.0 - uTranslateProgress, uTranslateProgress, directionSign);
      float stripBend = 1.0 - uTranslateProgress;
      float bentStrip = baseStrip + stripBend * uShapeBend * uCurvature;
      float stripDist = abs(vUv.x - bentStrip);
      brightnessMask = 1.0 - smoothstep(0.0, uBrightnessWidth, stripDist);
    }

    // Blend the two images along the transition. If one side's texture is missing,
    // force that side's weight to 0 so nothing draws where there is no image data.
    float tA = (1.0 - transition) * uHasA + transition * 0.0; // no — simpler below
    vec3 color = mix(tex2Color, tex1Color, transition);

    // Highlight the transition edge briefly (tinted via uBrightnessTint).
    vec3 brightenedColor = color * (1.0 + brightnessMask * uBrightnessIntensity);
    // Mix toward the tint color based on brightness intensity, so a non-white tint actually shows.
    brightenedColor = mix(brightenedColor, brightenedColor * uBrightnessTint, brightnessMask * min(1.0, uBrightnessIntensity));
    float overlayStrength = brightnessMask * max(0.0, 1.0 - transition);
    color = mix(color, brightenedColor, overlayStrength);

    // Alpha gating — fade out where there is no image on either side of the transition.
    // When the outgoing side has no texture, its weight is 0; same for incoming.
    float alpha = mix(uHasB, uHasA, transition);
    // Also overall: if neither texture is loaded, fully transparent.
    alpha *= max(uHasA, uHasB);

    gl_FragColor = vec4(color, alpha);
  }
`

export default function ClientShaderBgFX({
  items,
  hoveredId,
  enabled = true,
  planeZ = -5,
  planeWidth = 20.6,
  planeHeight = 14.3,
  durationS = 0.8,
  easing = 'circ.out',
  direction = 'out',
  shape = 'radial',                       // 'radial' | 'strip'
  // FX params
  edgeWidth = 0.05,
  brightnessWidth = 0.18,
  brightnessIntensity = 1.5,
  translateOffsetMultiplier = 1.0,
  bulgeDepthStrength = 0.5,
  waveWidth = 0.4,
  wavePower = 2.0,
  curvature = 0.2,
  brightnessTint = '#ffffff',
  backdropDarkness = 1.0,
}) {
  const matRef = useRef(null)
  const meshRef = useRef(null)
  const texCache = useRef(new Map())       // id → { tex, size }
  const prevIdRef = useRef(null)
  const [anyLoaded, setAnyLoaded] = useState(false)
  const { gl } = useThree()

  // Eagerly preload every client image to a THREE.Texture on mount. The
  // previous lazy-on-hover approach meant the first hover kicked off a
  // fetch + decode + GPU upload — the transition started with uHasB=0, the
  // texture arrived mid-animation and the image flashed in only AFTER the
  // user had already let go of the pill. By preloading here, all 15
  // textures are live in GPU memory by the time the user touches anything.
  // Initial cost is amortised behind the splash-overlay preload gate, so
  // from a user-facing latency standpoint it's free.
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
        const size = img && img.width && img.height
          ? new THREE.Vector2(img.width, img.height)
          : new THREE.Vector2(2500, 1500)
        texCache.current.set(c.id, { tex, size })
        setAnyLoaded(true)
        // If the user is already hovering this pill, patch the incoming
        // uniforms live so the current transition isn't stuck on null.
        if (matRef.current && hoveredId === c.id) {
          matRef.current.uniforms.uTexture2.value     = tex
          matRef.current.uniforms.uTexture2Size.value = size
          matRef.current.uniforms.uHasB.value         = 1
        }
      })
    })
    return () => {
      texCache.current.forEach((entry) => { try { entry?.tex?.dispose() } catch {} })
      texCache.current.clear()
    }
  }, [enabled, items, gl])

  const uniforms = useMemo(() => ({
    uProgress:                  { value: 0 },
    uTexture:                   { value: null },
    uTexture2:                  { value: null },
    uHasA:                      { value: 0 },
    uHasB:                      { value: 0 },
    uTranslateProgress:         { value: 0 },
    uQuadSize:                  { value: new THREE.Vector2(planeWidth, planeHeight) },
    uTextureSize:               { value: new THREE.Vector2(2500, 1500) },
    uTexture2Size:              { value: new THREE.Vector2(2500, 1500) },
    uBrightnessWidth:           { value: brightnessWidth },
    uBrightnessIntensity:       { value: brightnessIntensity },
    uDirection:                 { value: direction === 'in' ? -1 : 1 },
    uDisplaceProgress:          { value: 0 },
    uWaveProgress:              { value: 0 },
    uTranslateOffsetMultiplier: { value: translateOffsetMultiplier },
    uBulgeDepthStrength:        { value: bulgeDepthStrength },
    uShape:                     { value: shape === 'radial' ? 1 : 0 },
    uEdgeWidth:                 { value: edgeWidth },
    uCurvature:                 { value: curvature },
    uWaveWidth:                 { value: waveWidth },
    uWavePower:                 { value: wavePower },
    uBrightnessTint:            { value: new THREE.Color(brightnessTint) },
    uBackdropDarkness:          { value: backdropDarkness },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [])

  useEffect(() => {
    const m = matRef.current
    if (!m) return
    m.uniforms.uQuadSize.value.set(planeWidth, planeHeight)
    m.uniforms.uDirection.value                 = direction === 'in' ? -1 : 1
    m.uniforms.uShape.value                     = shape === 'radial' ? 1 : 0
    m.uniforms.uBrightnessWidth.value           = brightnessWidth
    m.uniforms.uBrightnessIntensity.value       = brightnessIntensity
    m.uniforms.uTranslateOffsetMultiplier.value = translateOffsetMultiplier
    m.uniforms.uBulgeDepthStrength.value        = bulgeDepthStrength
    m.uniforms.uEdgeWidth.value                 = edgeWidth
    m.uniforms.uCurvature.value                 = curvature
    m.uniforms.uWaveWidth.value                 = waveWidth
    m.uniforms.uWavePower.value                 = wavePower
    m.uniforms.uBrightnessTint.value.set(brightnessTint)
    m.uniforms.uBackdropDarkness.value          = backdropDarkness
  }, [
    planeWidth, planeHeight, direction, shape,
    brightnessWidth, brightnessIntensity,
    translateOffsetMultiplier, bulgeDepthStrength,
    edgeWidth, curvature, waveWidth, wavePower, brightnessTint, backdropDarkness,
  ])

  useEffect(() => {
    const m = matRef.current
    if (!m) return
    const prev = prevIdRef.current
    const curr = hoveredId
    if (prev === curr) { prevIdRef.current = curr; return }

    const prevEntry = prev ? texCache.current.get(prev) : null
    const currEntry = curr ? texCache.current.get(curr) : null

    m.uniforms.uTexture.value      = prevEntry?.tex  || null
    m.uniforms.uTextureSize.value  = prevEntry?.size || new THREE.Vector2(2500, 1500)
    m.uniforms.uHasA.value         = prevEntry ? 1 : 0
    m.uniforms.uTexture2.value     = currEntry?.tex  || null
    m.uniforms.uTexture2Size.value = currEntry?.size || new THREE.Vector2(2500, 1500)
    m.uniforms.uHasB.value         = currEntry ? 1 : 0

    gsap.killTweensOf([
      m.uniforms.uProgress,
      m.uniforms.uTranslateProgress,
      m.uniforms.uDisplaceProgress,
      m.uniforms.uWaveProgress,
    ])
    m.uniforms.uProgress.value          = 0
    m.uniforms.uTranslateProgress.value = 0
    m.uniforms.uDisplaceProgress.value  = 0
    m.uniforms.uWaveProgress.value      = 0

    const tl = gsap.timeline({ defaults: { ease: easing } })
    tl.to(m.uniforms.uProgress,          { value: 1, duration: durationS }, 0)
      .to(m.uniforms.uTranslateProgress, { value: 1, duration: durationS }, 0)
      .to(m.uniforms.uWaveProgress,      { value: 1, duration: durationS }, 0)
      .fromTo(m.uniforms.uDisplaceProgress,
        { value: 0 },
        { value: 1, duration: durationS * 0.5, ease: 'power2.out', yoyo: true, repeat: 1 }, 0)

    prevIdRef.current = curr
  }, [hoveredId, durationS, easing])

  // Don't render the mesh until at least one image has finished loading — otherwise the
  // plane would paint opaque black over whatever sits behind it (DOM marquees, etc.).
  if (!enabled || !anyLoaded) return null

  return (
    <mesh ref={meshRef} position={[0, 0, planeZ]}>
      <planeGeometry args={[planeWidth, planeHeight, 64, 36]} />
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
