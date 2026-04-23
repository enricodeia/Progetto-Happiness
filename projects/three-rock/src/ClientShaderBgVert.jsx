import { useEffect, useMemo, useRef, useState } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import gsap from 'gsap'

// Vertical-strip version of the FX cross-fade. Same transition logic as
// ClientShaderBgFX but swept along Y instead of X, so it reads as "from bottom
// to top" (directionSign +1 → scrolling forward / down, the new image pushes
// up) or "from top to bottom" (directionSign -1 → scrolling back / up).
//
// Mounts an image pair (A = outgoing, B = incoming) and animates all progresses
// on change. Keep transparent when textures are not loaded.
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
    float distFromWave = uv.y - wavePosition;
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
  uniform float uTranslateOffsetMultiplier;
  uniform float uBulgeDepthStrength;
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

    // Bulge along the vertex wave.
    vec2 uvFromCenter = vUv - vec2(0.5);
    float bulgeAmount = vWaveValue * uBulgeDepthStrength * uProgress;
    vec2 bulgedUv1 = uv1 + uvFromCenter * bulgeAmount;
    vec2 bulgedUv2 = uv2 + uvFromCenter * bulgeAmount;

    // Vertical displacement on the outgoing image.
    float directionSign = step(0.0, uDirection);
    vec2 displacedUv1 = bulgedUv1;
    float translateOffset = uDisplaceProgress * uTranslateOffsetMultiplier * 0.333333;
    displacedUv1.y += mix(translateOffset, -translateOffset, directionSign);
    float resetMask = step(1.0, uTranslateProgress);
    displacedUv1 = mix(displacedUv1, uv1, resetMask);

    vec3 tex1Color = texture2D(uTexture,  displacedUv1).rgb * uBackdropDarkness;
    vec3 tex2Color = texture2D(uTexture2, bulgedUv2).rgb * uBackdropDarkness;

    float width = uEdgeWidth;
    float progress = mix(1.0 - uProgress, uProgress, directionSign);

    // Bent horizontal strip sweeping vertically.
    float xFromCenter = (vUv.x - 0.5) * 2.0;
    float bend = -pow(xFromCenter, 2.0);
    bend *= mix(1.0, -1.0, 1.0 - directionSign);

    float progressOffset = mix(0.1, -0.1, directionSign);
    float curveStrength = progress + progressOffset;
    float bentTransition = progress + curveStrength * bend * uCurvature + progressOffset;

    float transition = smoothstep(bentTransition - width, bentTransition + width, vUv.y);
    transition = mix(1.0 - transition, transition, directionSign);

    // Brightness strip: bent horizontal line traveling with the transition.
    float baseStrip = mix(1.0 - uTranslateProgress, uTranslateProgress, directionSign);
    float stripBend = 1.0 - uTranslateProgress;
    float bentStrip = baseStrip + stripBend * bend * uCurvature;
    float stripDist = abs(vUv.y - bentStrip);
    float brightnessMask = 1.0 - smoothstep(0.0, uBrightnessWidth, stripDist);

    vec3 color = mix(tex2Color, tex1Color, transition);

    vec3 brightenedColor = color * (1.0 + brightnessMask * uBrightnessIntensity);
    brightenedColor = mix(brightenedColor, brightenedColor * uBrightnessTint, brightnessMask * min(1.0, uBrightnessIntensity));
    float overlayStrength = brightnessMask * max(0.0, 1.0 - transition);
    color = mix(color, brightenedColor, overlayStrength);

    float alpha = mix(uHasB, uHasA, transition);
    alpha *= max(uHasA, uHasB);

    gl_FragColor = vec4(color, alpha);
  }
`

export default function ClientShaderBgVert({
  items,                  // [{ id, image, ... }]
  activeId,               // currently-centered client id
  directionSign = 1,      // +1 on scroll-down (transition bottom→top), -1 on scroll-up (top→bottom)
  enabled = true,
  planeZ = -5,
  planeWidth = 20.6,
  planeHeight = 14.3,
  durationS = 1.0,
  easing = 'circ.out',
  edgeWidth = 0.06,
  brightnessWidth = 0.2,
  brightnessIntensity = 1.4,
  translateOffsetMultiplier = 1.0,
  bulgeDepthStrength = 0.4,
  waveWidth = 0.4,
  wavePower = 2.0,
  curvature = 0.18,
  brightnessTint = '#ffffff',
  backdropDarkness = 1.0,
}) {
  const matRef = useRef(null)
  const meshRef = useRef(null)
  const texCache = useRef(new Map())
  const prevIdRef = useRef(null)
  const [anyLoaded, setAnyLoaded] = useState(false)
  const { gl } = useThree()

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
        if (matRef.current && activeId === c.id) {
          matRef.current.uniforms.uTexture2.value     = tex
          matRef.current.uniforms.uTexture2Size.value = size
          matRef.current.uniforms.uHasB.value         = 1
        }
      })
    })
    return () => {
      texCache.current.forEach(({ tex }) => { try { tex.dispose() } catch {} })
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
    uDirection:                 { value: directionSign >= 0 ? 1 : -1 },
    uDisplaceProgress:          { value: 0 },
    uWaveProgress:              { value: 0 },
    uTranslateOffsetMultiplier: { value: translateOffsetMultiplier },
    uBulgeDepthStrength:        { value: bulgeDepthStrength },
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
    planeWidth, planeHeight,
    brightnessWidth, brightnessIntensity,
    translateOffsetMultiplier, bulgeDepthStrength,
    edgeWidth, curvature, waveWidth, wavePower, brightnessTint, backdropDarkness,
  ])

  useEffect(() => {
    const m = matRef.current
    if (!m) return
    const prev = prevIdRef.current
    const curr = activeId
    if (prev === curr) { prevIdRef.current = curr; return }

    const prevEntry = prev ? texCache.current.get(prev) : null
    const currEntry = curr ? texCache.current.get(curr) : null

    m.uniforms.uTexture.value      = prevEntry?.tex  || null
    m.uniforms.uTextureSize.value  = prevEntry?.size || new THREE.Vector2(2500, 1500)
    m.uniforms.uHasA.value         = prevEntry ? 1 : 0
    m.uniforms.uTexture2.value     = currEntry?.tex  || null
    m.uniforms.uTexture2Size.value = currEntry?.size || new THREE.Vector2(2500, 1500)
    m.uniforms.uHasB.value         = currEntry ? 1 : 0
    // Scroll-driven direction sign is latched at the moment the transition starts.
    m.uniforms.uDirection.value    = directionSign >= 0 ? 1 : -1

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
  }, [activeId, durationS, easing, directionSign])

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
