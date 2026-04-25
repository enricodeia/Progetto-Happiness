import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Environment, Sparkles } from '@react-three/drei'
import {
  EffectComposer, Bloom, Vignette, ToneMapping,
  ChromaticAberration, Noise, DepthOfField,
  BrightnessContrast, HueSaturation, Scanline, Pixelation,
  DotScreen, ColorAverage, Sepia,
} from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import { useControls, folder, LevaPanel, useCreateStore, button } from 'leva'
import * as THREE from 'three'
import Rock from './Rock.jsx'
import MaskedVideo from './MaskedVideo.jsx'
import PlayReel from './PlayReel.jsx'
import MarqueeLogos from './MarqueeLogos.jsx'
import Navigation from './Navigation.jsx'
import HeroIntro from './HeroIntro.jsx'
import { useNavigate } from 'react-router-dom'

function ParallaxGroup({ enabled, strength, damping, cursorRef, children }) {
  const groupRef = useRef()
  const lerpedRef = useRef({ x: 0, y: 0 })
  useFrame(() => {
    if (!groupRef.current) return
    const tx = enabled ? cursorRef.current.x : 0
    const ty = enabled ? cursorRef.current.y : 0
    lerpedRef.current.x += (tx - lerpedRef.current.x) * damping
    lerpedRef.current.y += (ty - lerpedRef.current.y) * damping
    groupRef.current.rotation.y = lerpedRef.current.x * strength * 0.18
    groupRef.current.rotation.x = -lerpedRef.current.y * strength * 0.18
    groupRef.current.position.x = lerpedRef.current.x * strength * 0.12
    groupRef.current.position.y = lerpedRef.current.y * strength * 0.12
  })
  return <group ref={groupRef}>{children}</group>
}

function CameraRig({ target, azimuth, polar, distance, fov, autoRotate, autoRotateSpeed, stateRef }) {
  const { camera } = useThree()
  const controlsRef = useRef()

  useEffect(() => {
    if (!controlsRef.current) return
    const sph = new THREE.Spherical(
      distance,
      THREE.MathUtils.degToRad(polar),
      THREE.MathUtils.degToRad(azimuth),
    )
    const offset = new THREE.Vector3().setFromSpherical(sph)
    camera.position.set(target.x + offset.x, target.y + offset.y, target.z + offset.z)
    camera.fov = fov
    camera.updateProjectionMatrix()
    controlsRef.current.target.set(target.x, target.y, target.z)
    controlsRef.current.update()
  }, [camera, target.x, target.y, target.z, azimuth, polar, distance, fov])

  useEffect(() => {
    stateRef.current.getState = () => {
      const t = controlsRef.current?.target || new THREE.Vector3()
      const offset = new THREE.Vector3().subVectors(camera.position, t)
      const sph = new THREE.Spherical().setFromVector3(offset)
      return {
        azimuth: THREE.MathUtils.radToDeg(sph.theta),
        polar: THREE.MathUtils.radToDeg(sph.phi),
        distance: sph.radius,
        target: { x: t.x, y: t.y, z: t.z },
        fov: camera.fov,
      }
    }
  }, [camera, stateRef])

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={false}
      enableRotate={false}
      enableZoom={false}
      enableDamping={false}
      autoRotate={autoRotate}
      autoRotateSpeed={autoRotateSpeed}
    />
  )
}

const ENV_PRESETS = [
  'sunset', 'dawn', 'night', 'warehouse', 'forest',
  'apartment', 'studio', 'city', 'park', 'lobby',
]

const EASE_CSS = {
  'circ.out':   'cubic-bezier(0, 0.55, 0.45, 1)',
  'circ.inOut': 'cubic-bezier(0.85, 0, 0.15, 1)',
  'expo.out':   'cubic-bezier(0.16, 1, 0.3, 1)',
  'quart.out':  'cubic-bezier(0.25, 1, 0.5, 1)',
  'quint.out':  'cubic-bezier(0.22, 1, 0.36, 1)',
  'sine.out':   'cubic-bezier(0.61, 1, 0.88, 1)',
  'back.out':   'cubic-bezier(0.34, 1.56, 0.64, 1)',
}

const EASE_FN = {
  'circ.out':   (t) => Math.sqrt(Math.max(0, 1 - (t - 1) * (t - 1))),
  'circ.inOut': (t) => t < 0.5
    ? (1 - Math.sqrt(Math.max(0, 1 - 4 * t * t))) / 2
    : (Math.sqrt(Math.max(0, 1 - 4 * (t - 1) * (t - 1))) + 1) / 2,
  'expo.out':   (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  'quart.out':  (t) => 1 - Math.pow(1 - t, 4),
  'quint.out':  (t) => 1 - Math.pow(1 - t, 5),
  'sine.out':   (t) => Math.sin((t * Math.PI) / 2),
  'back.out':   (t) => {
    const c1 = 1.70158, c3 = c1 + 1
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
  },
}

const EASE_NAMES = Object.keys(EASE_FN)

const PIECE_DEFAULTS = [
  { enabled: true, position: { x: 0,    y:  0,    z: 0 }, rotationZ: 0   },
  { enabled: true, position: { x: 0,    y: -1.43, z: 0 }, rotationZ: 90  },
  { enabled: true, position: { x: 1.44, y: -1.43, z: 0 }, rotationZ: 180 },
  { enabled: true, position: { x: 1.44, y:  0,    z: 0 }, rotationZ: 270 },
]

function usePieceControls(label, defaults, store) {
  return useControls(label, {
    enabled: defaults.enabled,
    position: { value: defaults.position, step: 0.01 },
    rotation: {
      value: { x: 0, y: 0, z: defaults.rotationZ },
      step: 1,
      label: 'rotation °',
    },
    scale: { value: 1, min: 0.1, max: 3, step: 0.01 },
  }, { collapsed: true, store })
}

export default function App() {
  // Dedicated Leva store isolates Version A from /b /c /d so the global
  // singleton store can't carry tuned values across routes.
  const mainStore = useCreateStore()
  const shape = useControls({
    Shape: folder({
      depth: { value: 61, min: 10, max: 250, step: 1 },
      bevelSize: { value: 3.0, min: 0, max: 60, step: 0.5 },
      bevelThickness: { value: 1.5, min: 0, max: 80, step: 0.5 },
      bevelSegments: { value: 1, min: 1, max: 14, step: 1 },
      targetSize: { value: 1.45, min: 0.5, max: 4, step: 0.05 },
    }, { collapsed: false }),
    Material: folder({
      colorShadow: { value: '#e2d7ce', label: 'shadow' },
      colorMid:    { value: '#e2dedc', label: 'mid' },
      colorHigh:   { value: '#fff9f2', label: 'highlight' },
      roughness: { value: 0.00, min: 0, max: 1, step: 0.01 },
      metalness: { value: 0.00, min: 0, max: 1, step: 0.01 },
      normalScale: { value: 0.00, min: 0, max: 3, step: 0.05 },
      envIntensity: { value: 0.00, min: 0, max: 2.5, step: 0.05 },
      textureRepeat: { value: 1.0, min: 1, max: 10, step: 0.5, hint: 'UV mode only' },
      aoIntensity: { value: 1.25, min: 0, max: 2, step: 0.05 },
      anisotropy: { value: 0.57, min: 0, max: 1, step: 0.01 },
      anisotropyRotation: { value: 2.37, min: 0, max: Math.PI, step: 0.01 },
      clearcoat: { value: 0.93, min: 0, max: 1, step: 0.01 },
      clearcoatRoughness: { value: 0.23, min: 0, max: 1, step: 0.01 },
      sheen: { value: 0.54, min: 0, max: 1, step: 0.01 },
      sheenRoughness: { value: 0.40, min: 0, max: 1, step: 0.01 },
      sheenColor: '#b1e5e5',
      ior: { value: 1.24, min: 1, max: 2.333, step: 0.01 },
      emissive: { value: '#000000', label: 'emissive color' },
      emissiveIntensity: { value: 0, min: 0, max: 5, step: 0.02 },
      reflectivity: { value: 0.5, min: 0, max: 1, step: 0.01, hint: 'F0 at normal incidence' },
      clearcoatNormalScale: { value: 1.0, min: 0, max: 3, step: 0.05 },
      flatShading: { value: false, label: 'flat shading' },
    }, { collapsed: true }),
    Triplanar: folder({
      triplanarOn: { value: true, label: 'enabled' },
      triplanarScale: { value: 0.8, min: 0.05, max: 5, step: 0.05, hint: 'world-space texture freq' },
    }, { collapsed: true }),
    Glass: folder({
      glassOn: { value: true, label: 'enabled' },
      transmission: { value: 1.00, min: 0, max: 1, step: 0.01 },
      thickness: { value: 2.31, min: 0, max: 5, step: 0.01 },
      attenuationColor: '#ffffff',
      attenuationDistance: { value: 8.60, min: 0.01, max: 20, step: 0.05 },
      dispersion: { value: 3.6, min: 0, max: 10, step: 0.1, hint: 'chromatic prism effect' },
      iridescence: { value: 0.03, min: 0, max: 1, step: 0.01 },
      iridescenceIOR: { value: 1.19, min: 1, max: 2.333, step: 0.01 },
      iridescenceMin: { value: 70, min: 0, max: 1000, step: 10, label: 'iri. min nm' },
      iridescenceMax: { value: 800, min: 0, max: 2000, step: 10, label: 'iri. max nm' },
      specularIntensity: { value: 0.64, min: 0, max: 1, step: 0.01 },
      specularColor: '#ffffff',
      transmissionResScale: { value: 1.0, min: 0.25, max: 1, step: 0.05, label: 'refraction quality' },
    }, { collapsed: true }),
    '✦ Trail (cursor)': folder({
      trailOn: { value: true, label: 'enabled' },
      trailIntensity: { value: 5.85, min: 0, max: 8, step: 0.05 },
      trailColor: { value: '#96b0ff', label: 'color' },
      trailRadius: { value: 85, min: 4, max: 120, step: 1, label: 'brush radius px' },
      trailDecay: { value: 0.07, min: 0, max: 0.3, step: 0.005, label: 'fade speed' },
      trailFresnel: { value: 1.80, min: 0, max: 4, step: 0.05 },
      trailPattern: { value: 2.65, min: 0, max: 3, step: 0.05, label: 'crystal pattern' },
      trailEdge: { value: 1.55, min: 0, max: 8, step: 0.05, label: 'ring edge glow' },
      trailShimmer: { value: 0.48, min: 0, max: 1, step: 0.02, label: 'time shimmer' },
      trailCellScale: { value: 5.5, min: 1, max: 40, step: 0.5, label: 'cell size' },
      trailWarp: { value: 0.14, min: 0, max: 0.25, step: 0.005, label: 'fbm warp' },
      trailWarpScale: { value: 4.8, min: 0.2, max: 15, step: 0.1, label: 'fbm freq' },
      trailSoftness: { value: 2.35, min: 0.3, max: 4, step: 0.05, label: 'falloff pow' },
      trailBrushSoft: { value: 1.85, min: 0.3, max: 4, step: 0.05, label: 'brush feather' },
      trailRevealDuration: { value: 0.5, min: 0.05, max: 2, step: 0.05, label: 'reveal s' },
    }, { collapsed: false }),
    Orbit: folder({
      autoRotate: false,
      autoRotateSpeed: { value: 0.35, min: 0, max: 3, step: 0.05 },
    }, { collapsed: true }),
    '✦ Parallax': folder({
      parallaxOn:       { value: false, label: 'enabled' },
      parallaxStrength: { value: 0.30, min: 0, max: 1.5, step: 0.01, label: 'strength' },
      parallaxDamping:  { value: 0.08, min: 0.01, max: 0.3, step: 0.01, label: 'damping' },
    }, { collapsed: true }),
    '✦ Layout': folder({
      heroLayout: { value: 'bottom', options: ['bottom', 'center'], label: 'layout' },
      // 'center' mode titles
      centerLeftTitleTopVh:     { value: 23, min: 0, max: 100, step: 0.5, label: 'A | left top vh' },
      centerLeftTitleLeftVw:    { value: 10, min: 0, max: 100, step: 0.5, label: 'A | left left vw' },
      centerRightTitleBottomVh: { value: 25, min: 0, max: 100, step: 0.5, label: 'A | right bottom vh' },
      centerRightTitleLeftVw:   { value: 5,  min: 0, max: 100, step: 0.5, label: 'A | right left vw' },
      centerMarqueeTopVh:       { value: 50, min: 0, max: 100, step: 0.5, label: 'A | marquee y vh (center)' },
      centerMarqueeHoverFadeS:  { value: 0.5, min: 0.05, max: 2, step: 0.05, label: 'A | marquee hover fade s' },
    }, { collapsed: false }),
    '✦ Reel Video': folder({
      bgOn: { value: true, label: 'enabled' },
      bgSrc: { value: '/bg-video.mp4', label: 'file path' },
      bgPosZ: { value: -0.1, min: -20, max: 5, step: 0.01, label: 'mask z' },
      bgFullZ: { value: -0.5, min: -20, max: 5, step: 0.01, label: 'full bg z' },
      bgWidth: { value: 10, min: 0.5, max: 30, step: 0.1, label: 'video width' },
      bgHeight: { value: 5.625, min: 0.5, max: 30, step: 0.1, label: 'video height' },
      bgMaskOpacity: { value: 1, min: 0, max: 1, step: 0.01, label: 'mask opacity' },
      bgFullOpacityIdle: { value: 0, min: 0, max: 1, step: 0.01, label: 'full idle' },
      bgFullOpacityHover: { value: 1, min: 0, max: 1, step: 0.01, label: 'full on-hover' },
      bgRevealInDuration: { value: 1.0, min: 0.05, max: 3, step: 0.05, label: 'reveal-in s (circ.out)' },
      bgRevealOutDuration: { value: 1.0, min: 0.05, max: 3, step: 0.05, label: 'reveal-out s (circ.in)' },
      bgLoopStart: { value: 8, min: 0, max: 600, step: 0.1, label: 'loop start (s)' },
      bgLoopEnd: { value: 23, min: 0.5, max: 600, step: 0.1, label: 'loop end (s)' },
      bgPlaybackRate: { value: 1, min: 0.1, max: 4, step: 0.05, label: 'speed' },
      playReelButton: { value: true, label: 'play-reel button' },
    }, { collapsed: false }),
    '✦ Partners Marquee': folder({
      marqueeOn: { value: true, label: 'enabled' },
      marqueeDuration: { value: 41, min: 5, max: 180, step: 1, label: 'loop s' },
      marqueeGap: { value: 3.4, min: 0.2, max: 12, step: 0.1, label: 'gap vw' },
      marqueeEndGap: { value: 3.4, min: 0, max: 12, step: 0.1, label: 'end-of-loop gap vw' },
      marqueeLogoH: { value: 0.85, min: 0.4, max: 4, step: 0.05, label: 'logo height vw' },
      marqueeBottom: { value: 0.8, min: 0, max: 15, step: 0.1, label: 'bottom vw' },
      marqueeHeight: { value: 4.4, min: 1, max: 10, step: 0.1, label: 'row height vw' },
      marqueeMaxVw: { value: 31, min: 20, max: 100, step: 1, label: 'max width vw' },
      marqueeFadeW: { value: 9.3, min: 1, max: 30, step: 0.1, label: 'fade width vw' },
      marqueeBlurI: { value: 0.75, min: 0, max: 4, step: 0.05, label: 'blur intensity' },
      marqueeEdgeW: { value: 2.8, min: 0, max: 30, step: 0.2, label: 'edge mask width vw' },
      marqueeEdgeColor: { value: '#090b0d', label: 'edge mask color' },
      marqueeInvert: { value: true, label: 'invert (white logos)' },
      marqueeSideLabelOn: { value: true, label: 'side labels' },
      marqueeLeftLabel: { value: 'We make', label: 'left h1' },
      marqueeRightLabel: { value: 'interfaces', label: 'right h1' },
      marqueeLabelSize: { value: 6.7, min: 1.5, max: 16, step: 0.1, label: 'h1 size vw' },
      marqueeLabelPad: { value: 1.1, min: 0, max: 15, step: 0.1, label: 'viewport pad vw' },
      marqueeLabelItalic: { value: false, label: 'right in italic' },
    }, { collapsed: true }),
    'Logo Group': folder({
      autoCenter: { value: true, label: 'auto-center (avg of pieces)' },
      logoOffsetX: { value: 0, min: -3, max: 3, step: 0.01, label: 'offset.x (fine tune)' },
      logoOffsetY: { value: 0, min: -3, max: 3, step: 0.01, label: 'offset.y (fine tune)' },
      logoOffsetZ: { value: 0, min: -3, max: 3, step: 0.01, label: 'offset.z (fine tune)' },
    }, { collapsed: false }),
  }, { store: mainStore })

  const p1 = usePieceControls('Piece 1', PIECE_DEFAULTS[0], mainStore)
  const p2 = usePieceControls('Piece 2', PIECE_DEFAULTS[1], mainStore)
  const p3 = usePieceControls('Piece 3', PIECE_DEFAULTS[2], mainStore)
  const p4 = usePieceControls('Piece 4', PIECE_DEFAULTS[3], mainStore)
  const pieces = [p1, p2, p3, p4]

  const logoCentroid = useMemo(() => {
    const enabled = pieces.filter((p) => p.enabled)
    if (enabled.length === 0) return { x: 0, y: 0, z: 0 }
    const s = enabled.reduce(
      (a, p) => ({ x: a.x + p.position.x, y: a.y + p.position.y, z: a.z + p.position.z }),
      { x: 0, y: 0, z: 0 },
    )
    return { x: s.x / enabled.length, y: s.y / enabled.length, z: s.z / enabled.length }
  }, [pieces])

  const [logoHovered, setLogoHovered] = useState(false)
  const [buttonHovered, setButtonHovered] = useState(false)
  const [videoReady, setVideoReady] = useState(false)
  const [introRevealed, setIntroRevealed] = useState(false)
  const [resetting, setResetting] = useState(false)

  // Leva panel is hidden by default; press "c" to toggle.
  // Numeric 1 / 2 / 3 switch between Version A (/), Version B (/b), Version C (/c).
  const [levaVisible, setLevaVisible] = useState(false)
  const navigate = useNavigate()
  useEffect(() => {
    const onKey = (e) => {
      const tag = (e.target?.tagName || '').toLowerCase()
      if (tag === 'input' || tag === 'textarea' || e.target?.isContentEditable) return
      if (e.key === 'c' || e.key === 'C') setLevaVisible((v) => !v)
      else if (e.key === '1') navigate('/a')
      else if (e.key === '2') navigate('/b')
      else if (e.key === '3') navigate('/c')
      else if (e.key === '4') navigate('/d')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate])

  const cursorRef = useRef({ x: 0, y: 0 })
  useEffect(() => {
    const onMove = (e) => {
      cursorRef.current.x = (e.clientX / window.innerWidth) * 2 - 1
      cursorRef.current.y = -((e.clientY / window.innerHeight) * 2 - 1)
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [])

  useEffect(() => { if (videoReady) setIntroRevealed(true) }, [videoReady])

  const replayIntro = useCallback(() => {
    setResetting(true)
    setIntroRevealed(false)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setResetting(false)
        setIntroRevealed(true)
      })
    })
  }, [])

  const preloader = useControls('✦ Preloader', {
    Overlay: folder({
      overlayDuration: { value: 1.0, min: 0.1, max: 3, step: 0.05, label: 'duration s' },
      overlayEase:     { value: 'circ.inOut', options: EASE_NAMES, label: 'easing' },
    }, { collapsed: false }),
    Logo: folder({
      logoStartVw:  { value: 9,  min: 4,  max: 60,  step: 0.5, label: 'start size vw' },
      logoEndPx:    { value: 90, min: 40, max: 200, step: 1,   label: 'end size px' },
      logoDuration: { value: 1.4, min: 0.1, max: 3,  step: 0.05, label: 'duration s' },
      logoEase:     { value: 'circ.inOut', options: EASE_NAMES, label: 'easing' },
      loaderBarOn:      { value: true, label: 'loader bar' },
      loaderBarWidthPx: { value: 120, min: 40, max: 400, step: 2, label: 'bar width px' },
      loaderBarGapPx:   { value: 18,  min: 0,  max: 80,  step: 1, label: 'bar gap px' },
      letterEntryOn:        { value: true, label: 'letter entry' },
      letterEntryDuration:  { value: 0.6, min: 0.1, max: 2,   step: 0.05, label: 'entry s' },
      letterEntryStaggerMs: { value: 80,  min: 0,   max: 300, step: 5,    label: 'entry stagger ms' },
    }, { collapsed: false }),
    Titles: folder({
      titleFromY:     { value: 100, min: 0,   max: 300,  step: 2,   label: 'from-y px' },
      titleDelay:     { value: 0.5, min: 0,   max: 3,    step: 0.05, label: 'delay s' },
      titleDuration:  { value: 1.4, min: 0.1, max: 3,    step: 0.05, label: 'duration s' },
      titleEase:      { value: 'circ.out', options: EASE_NAMES, label: 'easing' },
      titleStaggerMs: { value: 350, min: 0,   max: 1200, step: 10,  label: 'stagger ms' },
    }, { collapsed: false }),
    Bevel: folder({
      bevelStart:    { value: 80,  min: 0,   max: 200, step: 1,    label: 'start value' },
      bevelDelay:    { value: 1.4, min: 0,   max: 3,   step: 0.05, label: 'delay s' },
      bevelDuration: { value: 2.0, min: 0.2, max: 5,   step: 0.05, label: 'duration s' },
      bevelEase:     { value: 'circ.inOut', options: EASE_NAMES, label: 'easing' },
    }, { collapsed: false }),
    '3D opacity': folder({
      logo3dDelay:    { value: 0.0, min: 0,   max: 3, step: 0.05, label: 'delay s' },
      logo3dDuration: { value: 1.5, min: 0.1, max: 3, step: 0.05, label: 'duration s' },
      logo3dEase:     { value: 'circ.out', options: EASE_NAMES, label: 'easing' },
    }, { collapsed: false }),
    Letters: folder({
      lettersAnim:      { value: true, label: 'enabled' },
      lettersDisperseY: { value: 50, min: 0, max: 200, step: 2, label: 'disperse y px' },
      lettersStaggerMs: { value: 80, min: 0, max: 300, step: 5, label: 'stagger ms' },
      lettersDuration:  { value: 0.55, min: 0.1, max: 2, step: 0.05, label: 'per-letter s' },
      lettersEase:      { value: 'circ.inOut', options: EASE_NAMES, label: 'easing' },
    }, { collapsed: false }),
    Gloss: folder({
      glossOn:       { value: false, label: 'Metalab gloss' },
      glossLight:    { value: '#ffffff', label: 'light' },
      glossMid:      { value: '#b8bcc4', label: 'mid' },
      glossDark:     { value: '#5c626f', label: 'dark' },
      glossSweepOn:      { value: false, label: 'sweep animation' },
      glossSweepDur:     { value: 1.2,   min: 0.3, max: 8, step: 0.1, label: 'sweep duration s' },
      glossHoverTrigger: { value: false, label: 'sweep on hover only' },
    }, { collapsed: true }),
    Marquee: folder({
      marqueeDelay:    { value: 0.4, min: 0,   max: 4, step: 0.05, label: 'delay s' },
      marqueeRevealDuration: { value: 1.0, min: 0.1, max: 3, step: 0.05, label: 'duration s' },
      marqueeRevealEase:     { value: 'circ.out', options: EASE_NAMES, label: 'easing' },
    }, { collapsed: false }),
    PlayReel: folder({
      playReelDelay:    { value: 2.0, min: 0,   max: 4, step: 0.05, label: 'delay s' },
      playReelDuration: { value: 1.0, min: 0.1, max: 3, step: 0.05, label: 'duration s' },
      playReelEase:     { value: 'circ.out', options: EASE_NAMES, label: 'easing' },
    }, { collapsed: false }),
  }, { collapsed: false, store: mainStore })

  // 3D opacity reveal: 0 → 1 when intro reveals (after logo3dDelay, over logo3dDuration).
  const [logo3dRevealProgress, setLogo3dRevealProgress] = useState(0)
  useEffect(() => {
    if (!introRevealed) {
      setLogo3dRevealProgress(0)
      return
    }
    let raf = 0
    const durationMs = preloader.logo3dDuration * 1000
    const easeFn = EASE_FN[preloader.logo3dEase] || EASE_FN['circ.out']
    const run = () => {
      const startMs = performance.now()
      const tick = () => {
        const t = Math.min(1, (performance.now() - startMs) / durationMs)
        setLogo3dRevealProgress(easeFn(t))
        if (t < 1) raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
    }
    const timeout = window.setTimeout(run, preloader.logo3dDelay * 1000)
    return () => {
      window.clearTimeout(timeout)
      cancelAnimationFrame(raf)
    }
  }, [introRevealed, preloader.logo3dDelay, preloader.logo3dDuration, preloader.logo3dEase])

  // Preloader: bevelThickness tweens bevelStart → target whenever the intro reveals.
  const [bevelLoadProgress, setBevelLoadProgress] = useState(0)
  useEffect(() => {
    if (!introRevealed) {
      setBevelLoadProgress(0)
      return
    }
    let raf = 0
    const durationMs = preloader.bevelDuration * 1000
    const easeFn = EASE_FN[preloader.bevelEase] || EASE_FN['circ.out']
    const run = () => {
      const startMs = performance.now()
      const tick = () => {
        const t = Math.min(1, (performance.now() - startMs) / durationMs)
        setBevelLoadProgress(easeFn(t))
        if (t < 1) raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
    }
    const timeout = window.setTimeout(run, preloader.bevelDelay * 1000)
    return () => {
      window.clearTimeout(timeout)
      cancelAnimationFrame(raf)
    }
  }, [introRevealed, preloader.bevelDelay, preloader.bevelDuration, preloader.bevelEase])

  // Replay the intro whenever ANY preloader parameter changes (only after initial video load).
  useEffect(() => {
    if (!videoReady) return
    replayIntro()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    preloader.overlayDuration, preloader.overlayEase,
    preloader.logoStartVw, preloader.logoEndPx, preloader.logoDuration, preloader.logoEase,
    preloader.titleFromY, preloader.titleDelay, preloader.titleDuration, preloader.titleEase, preloader.titleStaggerMs,
    preloader.bevelStart, preloader.bevelDelay, preloader.bevelDuration, preloader.bevelEase,
    preloader.logo3dDelay, preloader.logo3dDuration, preloader.logo3dEase,
    preloader.lettersAnim, preloader.lettersDisperseY, preloader.lettersStaggerMs, preloader.lettersDuration, preloader.lettersEase,
    preloader.glossOn, preloader.glossLight, preloader.glossMid, preloader.glossDark, preloader.glossSweepOn, preloader.glossSweepDur, preloader.glossHoverTrigger,
    preloader.loaderBarOn, preloader.loaderBarWidthPx, preloader.loaderBarGapPx,
    preloader.letterEntryOn, preloader.letterEntryDuration, preloader.letterEntryStaggerMs,
    preloader.marqueeDelay, preloader.marqueeRevealDuration, preloader.marqueeRevealEase,
    preloader.playReelDelay, preloader.playReelDuration, preloader.playReelEase,
  ])

  const scene = useControls({
    Lighting: folder({
      ambientIntensity: { value: 0.40, min: 0, max: 2, step: 0.02 },
      keyIntensity: { value: 5.2, min: 0, max: 8, step: 0.1 },
      keyColor: '#a8c0fc',
      keyPosition: { value: { x: 2.2, y: 0.7, z: 3.7 }, step: 0.1, label: 'key pos' },
      rimIntensity: { value: 2.85, min: 0, max: 8, step: 0.05 },
      rimColor: '#a8c0fc',
      rimPosition: { value: { x: -2.4, y: -8.1, z: 9.3 }, step: 0.1, label: 'rim pos' },
      fillIntensity: { value: 0.00, min: 0, max: 4, step: 0.05 },
      fillColor: '#a8c0fc',
      fillPosition: { value: { x: 0, y: -2, z: -3 }, step: 0.1, label: 'fill pos' },
    }, { collapsed: true }),
    Environment: folder({
      envPreset: { value: 'warehouse', options: ENV_PRESETS },
      envBgIntensity: { value: 0.30, min: 0, max: 2.5, step: 0.05 },
      background: '#090b0d',
      sparklesOn: { value: false, label: 'sparkles' },
      sparklesCount: { value: 0, min: 0, max: 300, step: 1 },
    }, { collapsed: true }),
  }, { store: mainStore })

  const cameraStateRef = useRef({ getState: () => null })
  const [cam, setCam] = useControls(() => ({
    'Camera': folder({
      azimuth:   { value: 0,    min: -180, max: 180, step: 0.5, label: 'azimuth °' },
      polar:     { value: 90.5, min: 1,    max: 179, step: 0.5, label: 'polar °' },
      distance:  { value: 9.45, min: 0.5,  max: 20,  step: 0.05 },
      targetX:   { value: 0,    min: -5,   max: 5,   step: 0.01, label: 'target.x' },
      targetY:   { value: 0,    min: -5,   max: 5,   step: 0.01, label: 'target.y' },
      targetZ:   { value: 0,    min: -5,   max: 5,   step: 0.01, label: 'target.z' },
      fov:       { value: 29.0, min: 10,   max: 120, step: 0.5 },
      exposure:  { value: 1.05, min: 0.1, max: 3,   step: 0.05 },
      'copy current view 📋': button(() => {
        const s = cameraStateRef.current.getState?.()
        if (!s) return
        setCam({
          azimuth: +s.azimuth.toFixed(2),
          polar: +s.polar.toFixed(2),
          distance: +s.distance.toFixed(3),
          targetX: +s.target.x.toFixed(3),
          targetY: +s.target.y.toFixed(3),
          targetZ: +s.target.z.toFixed(3),
          fov: s.fov,
        })
      }),
      'reset view ↺': button(() => {
        setCam({
          azimuth: 0, polar: 90.5, distance: 9.45,
          targetX: 0, targetY: 0, targetZ: 0, fov: 29,
        })
      }),
    }, { collapsed: false }),
  }), { store: mainStore })

  const fx = useControls({
    'Post FX': folder({
      Bloom: folder({
        bloomOn: { value: true, label: 'enabled' },
        bloomIntensity: { value: 0.06, min: 0, max: 3, step: 0.02, label: 'intensity' },
        bloomThreshold: { value: 0.16, min: 0, max: 1, step: 0.01, label: 'threshold' },
        bloomSmooth: { value: 0.62, min: 0, max: 1, step: 0.01, label: 'smoothing' },
      }, { collapsed: false }),
      Vignette: folder({
        vignOn: { value: true, label: 'enabled' },
        vignDark: { value: 0.6, min: 0, max: 1, step: 0.02, label: 'darkness' },
        vignOffset: { value: 0.15, min: 0, max: 1, step: 0.02, label: 'offset' },
      }, { collapsed: true }),
      'Chromatic Aberration': folder({
        caOn: { value: true, label: 'enabled' },
        caOffsetX: { value: -0.0003, min: -0.02, max: 0.02, step: 0.0001, label: 'offsetX' },
        caOffsetY: { value: 0.00, min: -0.02, max: 0.02, step: 0.0001, label: 'offsetY' },
      }, { collapsed: true }),
      DoF: folder({
        dofOn: { value: false, label: 'enabled' },
        dofFocus: { value: 4.3, min: 0, max: 15, step: 0.1, label: 'focusDist' },
        dofFocalLength: { value: 0.02, min: 0, max: 0.3, step: 0.001, label: 'focal' },
        dofBokeh: { value: 2, min: 0, max: 10, step: 0.1, label: 'bokeh' },
      }, { collapsed: true }),
      Noise: folder({
        noiseOn: { value: false, label: 'enabled' },
        noiseOpacity: { value: 0.2, min: 0, max: 1, step: 0.01, label: 'opacity' },
      }, { collapsed: true }),
      'Brightness/Contrast': folder({
        bcOn: { value: true, label: 'enabled' },
        brightness: { value: 0.01, min: -0.5, max: 0.5, step: 0.01 },
        contrast: { value: 0.24, min: -0.5, max: 0.5, step: 0.01 },
      }, { collapsed: true }),
      'Hue/Saturation': folder({
        hsOn: { value: false, label: 'enabled' },
        hue: { value: 0, min: -Math.PI, max: Math.PI, step: 0.01 },
        saturation: { value: 0, min: -1, max: 1, step: 0.01 },
      }, { collapsed: true }),
      Scanlines: folder({
        scanOn: { value: false, label: 'enabled' },
        scanDensity: { value: 1.25, min: 0.1, max: 5, step: 0.05, label: 'density' },
        scanOpacity: { value: 0.35, min: 0, max: 1, step: 0.01, label: 'opacity' },
      }, { collapsed: true }),
      Pixelation: folder({
        pixOn: { value: false, label: 'enabled' },
        pixGranularity: { value: 5, min: 1, max: 20, step: 1, label: 'granularity' },
      }, { collapsed: true }),
      'Dot Screen': folder({
        dotOn: { value: false, label: 'enabled' },
        dotAngle: { value: 3.14, min: 0, max: Math.PI, step: 0.01, label: 'angle' },
        dotScale: { value: 0.65, min: 0.1, max: 3, step: 0.05, label: 'scale' },
      }, { collapsed: true }),
      'Color Tricks': folder({
        bwOn: { value: false, label: 'black & white' },
        sepiaOn: { value: false, label: 'sepia' },
        sepiaIntensity: { value: 0.7, min: 0, max: 1, step: 0.01, label: 'sepia amount' },
      }, { collapsed: true }),
    }, { collapsed: true }),
  }, { store: mainStore })

  return (
    <>
      <LevaPanel store={mainStore} hidden={!levaVisible} collapsed={false} oneLineLabels />
      <HeroIntro
        revealed={introRevealed}
        resetting={resetting}
        logoStartVw={preloader.logoStartVw}
        logoEndPx={preloader.logoEndPx}
        logoDuration={preloader.logoDuration}
        logoEasing={EASE_CSS[preloader.logoEase] || EASE_CSS['circ.inOut']}
        overlayDuration={preloader.overlayDuration}
        overlayEasing={EASE_CSS[preloader.overlayEase] || EASE_CSS['circ.inOut']}
        lettersAnim={preloader.lettersAnim}
        lettersDisperseY={preloader.lettersDisperseY}
        lettersStaggerMs={preloader.lettersStaggerMs}
        lettersDuration={preloader.lettersDuration}
        lettersEasing={EASE_CSS[preloader.lettersEase] || EASE_CSS['circ.inOut']}
        glossOn={preloader.glossOn}
        glossLight={preloader.glossLight}
        glossMid={preloader.glossMid}
        glossDark={preloader.glossDark}
        glossSweepOn={preloader.glossSweepOn}
        glossSweepDur={preloader.glossSweepDur}
        glossHoverTrigger={preloader.glossHoverTrigger}
        loaderBarOn={preloader.loaderBarOn}
        loaderBarWidthPx={preloader.loaderBarWidthPx}
        loaderBarGapPx={preloader.loaderBarGapPx}
        letterEntryOn={preloader.letterEntryOn}
        letterEntryDuration={preloader.letterEntryDuration}
        letterEntryStaggerMs={preloader.letterEntryStaggerMs}
      />
      {/* Page backdrop — lets the marquee sit BEHIND the canvas in 'center' layout. */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: scene.background,
          zIndex: 0,
          pointerEvents: 'none',
        }}
      />
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [0, 0.4, 4.3], fov: 35 }}
        style={{ position: 'fixed', inset: 0, zIndex: 5 }}
        gl={{
          antialias: true,
          alpha: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: cam.exposure,
          outputColorSpace: THREE.SRGBColorSpace,
        }}
      >

        <ambientLight intensity={scene.ambientIntensity} />

        <directionalLight
          position={[scene.keyPosition.x, scene.keyPosition.y, scene.keyPosition.z]}
          intensity={scene.keyIntensity}
          color={scene.keyColor}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-left={-3}
          shadow-camera-right={3}
          shadow-camera-top={3}
          shadow-camera-bottom={-3}
          shadow-bias={-0.0001}
        />
        <directionalLight
          position={[scene.rimPosition.x, scene.rimPosition.y, scene.rimPosition.z]}
          intensity={scene.rimIntensity}
          color={scene.rimColor}
        />
        <directionalLight
          position={[scene.fillPosition.x, scene.fillPosition.y, scene.fillPosition.z]}
          intensity={scene.fillIntensity}
          color={scene.fillColor}
        />

        <Suspense fallback={null}>
          <ParallaxGroup
            enabled={shape.parallaxOn}
            strength={shape.parallaxStrength}
            damping={shape.parallaxDamping}
            cursorRef={cursorRef}
          >
          <MaskedVideo
            src={shape.bgSrc}
            enabled={shape.bgOn}
            pieces={pieces}
            centroid={logoCentroid}
            autoCenter={shape.autoCenter}
            logoOffset={{ x: shape.logoOffsetX, y: shape.logoOffsetY, z: shape.logoOffsetZ }}
            targetSize={shape.targetSize}
            videoWidth={shape.bgWidth}
            videoHeight={shape.bgHeight}
            videoZ={shape.bgPosZ}
            fullZ={shape.bgFullZ}
            maskOpacity={shape.bgMaskOpacity}
            fullOpacityIdle={shape.bgFullOpacityIdle}
            fullOpacityHover={shape.bgFullOpacityHover}
            fullRevealInDuration={shape.bgRevealInDuration}
            fullRevealOutDuration={shape.bgRevealOutDuration}
            loopStart={shape.bgLoopStart}
            loopEnd={shape.bgLoopEnd}
            playbackRate={shape.bgPlaybackRate}
            buttonHovered={buttonHovered}
            onReady={() => setVideoReady(true)}
          />
          <Rock
            {...shape}
            bevelThickness={preloader.bevelStart + (shape.bevelThickness - preloader.bevelStart) * bevelLoadProgress}
            revealOpacity={logo3dRevealProgress}
            pieces={pieces}
            logoOffset={{ x: shape.logoOffsetX, y: shape.logoOffsetY, z: shape.logoOffsetZ }}
            autoCenter={shape.autoCenter}
            onHoverChange={setLogoHovered}
          />
          {shape.playReelButton && (
            <PlayReel
              position={[
                shape.autoCenter ? shape.logoOffsetX : (logoCentroid.x + shape.logoOffsetX),
                shape.autoCenter ? shape.logoOffsetY : (logoCentroid.y + shape.logoOffsetY),
                0.25,
              ]}
              expanded={false}
              onHoverChange={setButtonHovered}
              revealed={shape.heroLayout === 'center' ? (introRevealed && logoHovered) : introRevealed}
              resetting={resetting}
              revealDelay={shape.heroLayout === 'center' ? 0 : preloader.playReelDelay}
              revealDuration={shape.heroLayout === 'center' ? shape.centerMarqueeHoverFadeS : preloader.playReelDuration}
              revealEasing={EASE_CSS[preloader.playReelEase] || EASE_CSS['circ.out']}
            />
          )}
          </ParallaxGroup>
          <Environment
            preset={scene.envPreset}
            background={false}
            environmentIntensity={scene.envBgIntensity}
          />
        </Suspense>

        {scene.sparklesOn && (
          <Sparkles
            count={scene.sparklesCount}
            size={1.4}
            scale={[8, 6, 8]}
            speed={0.18}
            opacity={0.4}
            color="#d6c8b3"
          />
        )}

        <CameraRig
          target={{ x: cam.targetX, y: cam.targetY, z: cam.targetZ }}
          azimuth={cam.azimuth}
          polar={cam.polar}
          distance={cam.distance}
          fov={cam.fov}
          autoRotate={shape.autoRotate}
          autoRotateSpeed={shape.autoRotateSpeed}
          stateRef={cameraStateRef}
        />

        <EffectComposer multisampling={4}>
          {fx.bloomOn && (
            <Bloom
              intensity={fx.bloomIntensity}
              luminanceThreshold={fx.bloomThreshold}
              luminanceSmoothing={fx.bloomSmooth}
              mipmapBlur
            />
          )}
          {fx.dofOn && (
            <DepthOfField
              focusDistance={fx.dofFocus / 20}
              focalLength={fx.dofFocalLength}
              bokehScale={fx.dofBokeh}
            />
          )}
          {fx.caOn && (
            <ChromaticAberration offset={[fx.caOffsetX, fx.caOffsetY]} />
          )}
          {fx.bcOn && (
            <BrightnessContrast brightness={fx.brightness} contrast={fx.contrast} />
          )}
          {fx.hsOn && (
            <HueSaturation hue={fx.hue} saturation={fx.saturation} />
          )}
          {fx.pixOn && <Pixelation granularity={fx.pixGranularity} />}
          {fx.scanOn && (
            <Scanline density={fx.scanDensity} opacity={fx.scanOpacity} />
          )}
          {fx.dotOn && (
            <DotScreen angle={fx.dotAngle} scale={fx.dotScale} />
          )}
          {fx.sepiaOn && <Sepia intensity={fx.sepiaIntensity} />}
          {fx.bwOn && <ColorAverage blendFunction={BlendFunction.NORMAL} />}
          {fx.noiseOn && <Noise opacity={fx.noiseOpacity} premultiply />}
          {fx.vignOn && (
            <Vignette offset={fx.vignOffset} darkness={fx.vignDark} eskil={false} />
          )}
          <ToneMapping blendFunction={BlendFunction.NORMAL} />
        </EffectComposer>
      </Canvas>

      <MarqueeLogos
        enabled={shape.marqueeOn}
        duration={shape.marqueeDuration}
        gap={shape.marqueeGap}
        endGap={shape.marqueeEndGap}
        logoHeight={shape.marqueeLogoH}
        bottom={shape.marqueeBottom}
        height={shape.marqueeHeight}
        maxWidthVw={shape.marqueeMaxVw}
        fadeWidth={shape.marqueeFadeW}
        blurIntensity={shape.marqueeBlurI}
        edgeMaskWidth={shape.marqueeEdgeW}
        edgeMaskColor={shape.marqueeEdgeColor}
        invert={shape.marqueeInvert}
        sideLabelOn={shape.marqueeSideLabelOn}
        leftLabel={shape.marqueeLeftLabel}
        rightLabel={shape.marqueeRightLabel}
        labelSize={shape.marqueeLabelSize}
        labelPad={shape.marqueeLabelPad}
        labelItalic={shape.marqueeLabelItalic}
        buttonHovered={buttonHovered}
        fadeInDuration={shape.bgRevealInDuration}
        fadeOutDuration={shape.bgRevealOutDuration}
        introStarted={introRevealed}
        resetting={resetting}
        introDuration={preloader.titleDuration}
        introEasing={EASE_CSS[preloader.titleEase] || EASE_CSS['circ.out']}
        introStaggerMs={preloader.titleStaggerMs}
        introFromY={preloader.titleFromY}
        introDelay={preloader.titleDelay}
        marqueeRevealDelay={preloader.marqueeDelay}
        marqueeRevealDuration={preloader.marqueeRevealDuration}
        marqueeRevealEasing={EASE_CSS[preloader.marqueeRevealEase] || EASE_CSS['circ.out']}
        heroLayout={shape.heroLayout}
        logoHovered={logoHovered}
        centerLeftTitleTopVh={shape.centerLeftTitleTopVh}
        centerLeftTitleLeftVw={shape.centerLeftTitleLeftVw}
        centerRightTitleBottomVh={shape.centerRightTitleBottomVh}
        centerRightTitleLeftVw={shape.centerRightTitleLeftVw}
        centerMarqueeTopVh={shape.centerMarqueeTopVh}
        centerHoverFadeS={shape.centerMarqueeHoverFadeS}
      />
    </>
  )
}
