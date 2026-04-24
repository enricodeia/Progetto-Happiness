import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useControls, folder, Leva, LevaPanel, useCreateStore, button } from 'leva'
import HeroIntro from './HeroIntro.jsx'
import SideMarquees from './SideMarquees.jsx'
import ClientPillList from './ClientPillList.jsx'
import ClientPreview from './ClientPreview.jsx'
import CustomCursor from './CustomCursor.jsx'
import AnimatedLines from './AnimatedLines.jsx'
import ClientImageBg from './ClientImageBg.jsx'
import VideoContainer from './VideoContainer.jsx'
import TopNav from './TopNav.jsx'
import { useNavigate } from 'react-router-dom'
import { CLIENTS } from './logos.js'

// Three.js + R3F + post-processing all live inside AppBCanvas, which is lazy-
// imported below. That keeps the ~1 MB of 3D code out of the initial bundle so
// the first paint / LCP only pays for DOM + typography + pill list.
const AppBCanvas = lazy(() => import('./AppBCanvas.jsx'))

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
  { enabled: true, position: { x: 0,    y:  0,    z: 0 }, rotationZ: 0,
    introOffset: { x: -4, y:  4, z: -6 }, introRotOffset: { x:  60, y: -40, z: -90 } },
  { enabled: true, position: { x: 0,    y: -1.43, z: 0 }, rotationZ: 90,
    introOffset: { x: -4, y: -4, z: -6 }, introRotOffset: { x: -60, y: -40, z:  90 } },
  { enabled: true, position: { x: 1.44, y: -1.43, z: 0 }, rotationZ: 180,
    introOffset: { x:  4, y: -4, z: -6 }, introRotOffset: { x: -60, y:  40, z: -90 } },
  { enabled: true, position: { x: 1.44, y:  0,    z: 0 }, rotationZ: 270,
    introOffset: { x:  4, y:  4, z: -6 }, introRotOffset: { x:  60, y:  40, z:  90 } },
]

function usePieceControls(label, defaults) {
  return useControls(label, {
    enabled: defaults.enabled,
    position: { value: defaults.position, step: 0.01 },
    rotation: { value: { x: 0, y: 0, z: defaults.rotationZ }, step: 1, label: 'rotation °' },
    scale: { value: 1, min: 0.1, max: 3, step: 0.01 },
    // Intro: where the piece flies IN from. `introOffset` is the xyz delta
    // added to the default position at t=0, `introRotOffset` is the rotation
    // delta in degrees at t=0. Both are lerped to 0 over the intro tween.
    introOffset:    { value: defaults.introOffset    || { x: 0, y: 0, z: 0 }, step: 0.05, label: 'intro Δ xyz' },
    introRotOffset: { value: defaults.introRotOffset || { x: 0, y: 0, z: 0 }, step: 5,    label: 'intro Δ rot°' },
  }, { collapsed: true })
}

export default function AppB() {
  // Dedicated Leva store for the advanced shader FX — shown as its own detachable panel
  // so the user can tune the effect without scrolling through the massive main panel.
  const fxStore = useCreateStore()
  const shaderFX = useControls({
    'Effect': folder({
      shape:                     { value: 'radial', options: ['radial', 'strip'], label: 'shape' },
      edgeWidth:                 { value: 0.05,  min: 0.001, max: 0.3, step: 0.001, label: 'transition edge width' },
      brightnessWidth:           { value: 0.18,  min: 0, max: 1, step: 0.005, label: 'brightness width' },
      brightnessIntensity:       { value: 1.50,  min: 0, max: 5, step: 0.05,  label: 'brightness intensity' },
    }, { collapsed: false }),
    'Distortion': folder({
      translateOffsetMultiplier: { value: 1.0,   min: 0, max: 3, step: 0.05,  label: 'translate offset' },
      bulgeDepthStrength:        { value: 0.50,  min: 0, max: 2, step: 0.02,  label: 'bulge strength' },
      waveWidth:                 { value: 0.40,  min: 0.05, max: 1.5, step: 0.01, label: 'wave width' },
      wavePower:                 { value: 2.00,  min: 0.5, max: 6, step: 0.05,  label: 'wave falloff' },
      curvature:                 { value: 0.20,  min: 0, max: 1, step: 0.01,    label: 'strip curvature' },
    }, { collapsed: false }),
    'Tint': folder({
      brightnessTint:            { value: '#ffffff', label: 'edge tint' },
      backdropDarkness:          { value: 1.0,   min: 0.2, max: 1.5, step: 0.01, label: 'image darkness' },
    }, { collapsed: true }),
  }, { store: fxStore })

  const shape = useControls({
    Shape: folder({
      depth: { value: 61, min: 10, max: 250, step: 1 },
      bevelSize: { value: 3.0, min: 0, max: 60, step: 0.5 },
      bevelThickness: { value: 1.5, min: 0, max: 80, step: 0.5 },
      bevelSegments: { value: 1, min: 1, max: 14, step: 1 },
      targetSize: { value: 1.45, min: 0.5, max: 4, step: 0.05 },
    }, { collapsed: true }),
    Material: folder({
      colorShadow: { value: '#e2d7ce', label: 'shadow' },
      colorMid:    { value: '#e2dedc', label: 'mid' },
      colorHigh:   { value: '#fff9f2', label: 'highlight' },
      roughness: { value: 0.00, min: 0, max: 1, step: 0.01 },
      metalness: { value: 0.00, min: 0, max: 1, step: 0.01 },
      normalScale: { value: 0.00, min: 0, max: 3, step: 0.05 },
      envIntensity: { value: 0.00, min: 0, max: 2.5, step: 0.05 },
      textureRepeat: { value: 1.0, min: 1, max: 10, step: 0.5 },
      aoIntensity: { value: 1.25, min: 0, max: 2, step: 0.05 },
      anisotropy: { value: 0.57, min: 0, max: 1, step: 0.01 },
      anisotropyRotation: { value: 2.37, min: 0, max: Math.PI, step: 0.01 },
      clearcoat: { value: 0.93, min: 0, max: 1, step: 0.01 },
      clearcoatRoughness: { value: 0.23, min: 0, max: 1, step: 0.01 },
      sheen: { value: 0.54, min: 0, max: 1, step: 0.01 },
      sheenRoughness: { value: 0.40, min: 0, max: 1, step: 0.01 },
      sheenColor: '#b1e5e5',
      ior: { value: 1.24, min: 1, max: 2.333, step: 0.01 },
      emissive: { value: '#000000' },
      emissiveIntensity: { value: 0, min: 0, max: 5, step: 0.02 },
      reflectivity: { value: 0.5, min: 0, max: 1, step: 0.01 },
      clearcoatNormalScale: { value: 1.0, min: 0, max: 3, step: 0.05 },
      flatShading: { value: false },
    }, { collapsed: true }),
    Triplanar: folder({
      triplanarOn: { value: true, label: 'enabled' },
      triplanarScale: { value: 0.8, min: 0.05, max: 5, step: 0.05 },
    }, { collapsed: true }),
    Glass: folder({
      glassOn: { value: true, label: 'enabled' },
      transmission: { value: 1.00, min: 0, max: 1, step: 0.01 },
      thickness: { value: 2.31, min: 0, max: 5, step: 0.01 },
      attenuationColor: '#ffffff',
      attenuationDistance: { value: 8.60, min: 0.01, max: 20, step: 0.05 },
      dispersion: { value: 3.6, min: 0, max: 10, step: 0.1 },
      iridescence: { value: 0.03, min: 0, max: 1, step: 0.01 },
      iridescenceIOR: { value: 1.19, min: 1, max: 2.333, step: 0.01 },
      iridescenceMin: { value: 70, min: 0, max: 1000, step: 10 },
      iridescenceMax: { value: 800, min: 0, max: 2000, step: 10 },
      specularIntensity: { value: 0.64, min: 0, max: 1, step: 0.01 },
      specularColor: '#ffffff',
      transmissionResScale: { value: 1.0, min: 0.25, max: 1, step: 0.05 },
    }, { collapsed: true }),
    '✦ Trail (cursor)': folder({
      trailOn: { value: true, label: 'enabled' },
      trailIntensity: { value: 5.85, min: 0, max: 8, step: 0.05 },
      trailColor: { value: '#96b0ff' },
      trailRadius: { value: 85, min: 4, max: 120, step: 1 },
      trailDecay: { value: 0.07, min: 0, max: 0.3, step: 0.005 },
      trailFresnel: { value: 1.80, min: 0, max: 4, step: 0.05 },
      trailPattern: { value: 2.65, min: 0, max: 3, step: 0.05 },
      trailEdge: { value: 1.55, min: 0, max: 8, step: 0.05 },
      trailShimmer: { value: 0.48, min: 0, max: 1, step: 0.02 },
      trailCellScale: { value: 5.5, min: 1, max: 40, step: 0.5 },
      trailWarp: { value: 0.14, min: 0, max: 0.25, step: 0.005 },
      trailWarpScale: { value: 4.8, min: 0.2, max: 15, step: 0.1 },
      trailSoftness: { value: 2.35, min: 0.3, max: 4, step: 0.05 },
      trailBrushSoft: { value: 1.85, min: 0.3, max: 4, step: 0.05 },
      trailRevealDuration: { value: 0.5, min: 0.05, max: 2, step: 0.05 },
    }, { collapsed: true }),
    Orbit: folder({
      autoRotate: false,
      autoRotateSpeed: { value: 0.35, min: 0, max: 3, step: 0.05 },
    }, { collapsed: true }),
    '✦ Parallax': folder({
      parallaxOn:       { value: false, label: 'enabled' },
      parallaxStrength: { value: 0.30, min: 0, max: 1.5, step: 0.01 },
      parallaxDamping:  { value: 0.08, min: 0.01, max: 0.3, step: 0.01 },
    }, { collapsed: true }),
    '✦ Reel Video': folder({
      bgOn: { value: true, label: 'enabled' },
      bgSrc: { value: '/bg-video.mp4' },
      bgPosZ: { value: -0.1, min: -20, max: 5, step: 0.01 },
      bgFullZ: { value: -0.5, min: -20, max: 5, step: 0.01 },
      bgWidth: { value: 10, min: 0.5, max: 30, step: 0.1 },
      bgHeight: { value: 5.625, min: 0.5, max: 30, step: 0.1 },
      bgMaskOpacity: { value: 1, min: 0, max: 1, step: 0.01 },
      bgFullOpacityIdle: { value: 0, min: 0, max: 1, step: 0.01 },
      bgFullOpacityHover: { value: 1, min: 0, max: 1, step: 0.01 },
      bgRevealInDuration: { value: 1.0, min: 0.05, max: 3, step: 0.05 },
      bgRevealOutDuration: { value: 1.0, min: 0.05, max: 3, step: 0.05 },
      bgLoopStart: { value: 0, min: 0, max: 600, step: 0.1 },
      bgLoopEnd: { value: 15, min: 0.5, max: 600, step: 0.1 },
      bgPlaybackRate: { value: 1, min: 0.1, max: 4, step: 0.05 },
      playReelButton: { value: true },
    }, { collapsed: true }),
    'Logo Group': folder({
      autoCenter: { value: true },
      logoOffsetX: { value: 0, min: -3, max: 3, step: 0.01 },
      logoOffsetY: { value: 0, min: -3, max: 3, step: 0.01 },
      logoOffsetZ: { value: 0, min: -3, max: 3, step: 0.01 },
    }, { collapsed: true }),
  })

  const versionB = useControls({
    'B · Side Marquees': folder({
      sideOn:            { value: true, label: 'enabled' },
      sideWidthVw:       { value: 34,   min: 10, max: 50, step: 0.5, label: 'rail width vw' },
      sideGapVw:         { value: 0,    min: 0,  max: 20, step: 0.1, label: 'edge inset vw' },
      sideCenterYVh:     { value: 50,   min: 0, max: 100, step: 0.5, label: 'center y vh' },
      sideHeightVw:      { value: 4.5,  min: 1,  max: 12, step: 0.1, label: 'rail height vw' },
      sideDurationS:     { value: 55,   min: 10, max: 180, step: 1, label: 'loop s' },
      sideLogoGapVw:     { value: 3,    min: 0.5, max: 12, step: 0.1, label: 'logo gap vw' },
      sideLogoHeightVw:  { value: 0.85, min: 0.4, max: 4, step: 0.05, label: 'logo height vw' },
      sideInvert:        { value: true, label: 'invert logos' },
      sideOppositeDir:   { value: true, label: 'opposite directions' },
      sideLogoBrightness:{ value: 4.00, min: 0, max: 8, step: 0.05, label: 'logo brightness' },
      sideLogoGlowPx:    { value: 0.5,  min: 0, max: 30, step: 0.1, label: 'logo glow px' },
      sideLogoGlowColor: { value: '#ffffff', label: 'logo glow color' },
      // Inner (center-facing) glow — A-style
      sideInnerFadeVw:   { value: 9.3,  min: 0, max: 30, step: 0.1, label: 'inner fade vw' },
      sideInnerBlurI:    { value: 1.4,  min: 0, max: 4,  step: 0.05, label: 'inner blur' },
      sideInnerEdgeVw:   { value: 2.8,  min: 0, max: 20, step: 0.1, label: 'inner edge vw' },
      // Outer (viewport-edge) fade — lighter
      sideOuterFadeVw:   { value: 4,    min: 0, max: 30, step: 0.1, label: 'outer fade vw' },
      sideOuterBlurI:    { value: 0.6,  min: 0, max: 4,  step: 0.05, label: 'outer blur' },
      sideOuterEdgeVw:   { value: 1.5,  min: 0, max: 20, step: 0.1, label: 'outer edge vw' },
      sideEdgeColor:     { value: '#090b0d', label: 'edge mask color' },
    }, { collapsed: false }),
    'B · Pill List': folder({
      pillBottomVh:   { value: 2.5,  min: 0, max: 40, step: 0.1, label: 'bottom vh' },
      pillMaxWidthVw: { value: 50,   min: 20, max: 100, step: 1, label: 'max width vw' },
      pillGapVw:      { value: 0.52, min: 0, max: 3, step: 0.02, label: 'column gap vw' },
      pillRowGapVw:   { value: 0.52, min: 0, max: 3, step: 0.02, label: 'row gap vw' },
      pillPadYVw:     { value: 0.4,  min: 0.1, max: 2, step: 0.02, label: 'pad y vw' },
      pillPadXVw:     { value: 1.10, min: 0.2, max: 3, step: 0.02, label: 'pad x vw' },
      pillFontVw:     { value: 0.79, min: 0.4, max: 2.5, step: 0.01, label: 'font vw' },
      pillBlurPx:     { value: 4,    min: 0, max: 20, step: 0.5, label: 'backdrop blur px' },
      pillIdleBg:     { value: '#ffffff14', label: 'idle bg' },
      pillHoverBg:    { value: 'rgba(0,0,0,0.45)', label: 'hover bg (darker)' },
      pillHoverBorder:{ value: 'rgba(255,255,255,0.9)',  label: 'hover border' },
    }, { collapsed: false }),
    'B · Intro Copy': folder({
      introCopyOn:       { value: true, label: 'enabled' },
      introCopy:         { value: 'Since 2006, we’ve helped the most innovative startups and reputable brands design, build and ship products worth talking about.', label: 'text' },
      introCopyTopVh:    { value: 20,   min: 0, max: 60, step: 0.5, label: 'top vh' },
      introCopyRightVw:  { value: 15,   min: 0, max: 30, step: 0.2, label: 'right vw' },
      introCopyMaxVw:    { value: 14,   min: 6, max: 40, step: 0.5, label: 'max width vw' },
      introCopyFontVw:   { value: 0.81, min: 0.4, max: 2.5, step: 0.01, label: 'font vw' },
      introCopyLineH:    { value: 1.34, min: 1, max: 2, step: 0.02, label: 'line height' },
      introCopyDelayS:   { value: 2.0,  min: 0, max: 6, step: 0.05, label: 'reveal delay s' },
      introCopyDurS:     { value: 0.9,  min: 0.1, max: 3, step: 0.05, label: 'per-line s' },
      introCopyStaggerMs:{ value: 80,   min: 0, max: 300, step: 5, label: 'stagger ms' },
      introCopyFromYpx:  { value: 15,   min: 0, max: 80, step: 1, label: 'from y px' },
      introCopyOutDurS:  { value: 0.5,  min: 0.05, max: 2, step: 0.05, label: 'out s' },
    }, { collapsed: true }),
    'B · Client Preview': folder({
      previewWidthVw:     { value: 100, min: 30, max: 100, step: 1, label: 'image width vw' },
      previewHeightVh:    { value: 100, min: 30, max: 100, step: 1, label: 'image height vh' },
      bgInDurS:           { value: 0.4, min: 0.05, max: 2, step: 0.05, label: 'bg in s' },
      bgOutDurS:          { value: 0.4, min: 0.05, max: 2, step: 0.05, label: 'bg out s' },
      bgOutScale:         { value: 1.15, min: 1, max: 2, step: 0.01, label: 'bg out scale' },
      bgClipPct:          { value: 75,  min: 10, max: 150, step: 1, label: 'bg clip radius %' },
      previewTitleTopVh:  { value: 18,  min: 0, max: 40, step: 0.5, label: 'title top vh' },
      previewTitleLeftVw: { value: 1.5, min: 0, max: 30, step: 0.1, label: 'title left vw' },
      previewTitleFontVw: { value: 3.9, min: 2, max: 12, step: 0.1, label: 'title font vw' },
      previewDescRightVw: { value: 8.0, min: 0, max: 30, step: 0.1, label: 'desc right vw' },
      previewDescBottomVh:{ value: 24.0, min: 0, max: 40, step: 0.5, label: 'desc bottom vh' },
      previewDescMaxVw:   { value: 11.0, min: 5, max: 50, step: 0.5, label: 'desc max vw' },
      previewDescFontVw:  { value: 0.85, min: 0.5, max: 3, step: 0.01, label: 'desc font vw' },
      previewFadeS:       { value: 0.80, min: 0.05, max: 2, step: 0.05, label: 'fade s' },
    }, { collapsed: false }),
    'B · Shader Transition': folder({
      shaderOn:        { value: true, label: 'enabled (replaces DOM bg)' },
      shaderMode:      { value: 'fx',   options: ['simple', 'fx'], label: 'mode' },
      shaderPlaneZ:    { value: -5.0,  min: -10, max: 0, step: 0.05, label: 'plane z' },
      shaderPlaneW:    { value: 20.6,  min: 5, max: 60, step: 0.1, label: 'plane width (units)' },
      shaderPlaneH:    { value: 14.3,  min: 3, max: 40, step: 0.05, label: 'plane height (units)' },
      shaderDurS:      { value: 0.80,  min: 0.05, max: 3, step: 0.05, label: 'duration s' },
      shaderEase:      {
        value: 'circ.out',
        options: [
          'none', 'power1.in', 'power1.out', 'power1.inOut',
          'power2.in', 'power2.out', 'power2.inOut',
          'power3.in', 'power3.out', 'power3.inOut',
          'power4.in', 'power4.out', 'power4.inOut',
          'circ.in',  'circ.out',  'circ.inOut',
          'expo.in',  'expo.out',  'expo.inOut',
          'sine.in',  'sine.out',  'sine.inOut',
          'back.in',  'back.out',  'back.inOut',
        ],
        label: 'easing',
      },
      shaderSoftness:  { value: 0.30, min: 0, max: 0.4, step: 0.005, label: 'edge softness' },
      shaderOutScale:  { value: 1.16, min: 1, max: 2, step: 0.01, label: 'outgoing scale' },
      shaderDirection: { value: 'out', options: ['out', 'in'], label: 'direction' },
    }, { collapsed: false }),
    'B · Video Reveal': folder({
      videoOn:           { value: true, label: 'enabled' },
      videoTopVh:        { value: 18.5, min: 0, max: 80, step: 0.1, label: 'top vh' },
      videoLeftVw:       { value: 27.8, min: 0, max: 100, step: 0.1, label: 'left vw' },
      videoWidthVw:      { value: 44.8, min: 10, max: 100, step: 0.1, label: 'width vw' },
      videoHeightVh:     { value: 62.0, min: 10, max: 100, step: 0.1, label: 'height vh' },
      videoRadiusVw:     { value: 0.00, min: 0, max: 5, step: 0.05, label: 'radius vw' },
      videoGrowS:        { value: 0.8,  min: 0.1, max: 4, step: 0.05, label: 'grow s' },
      videoGrowFrom:     { value: 'bottom', options: ['bottom', 'top', 'left', 'right'], label: 'grow from' },
      videoRevealDelayS: { value: 0,    min: 0, max: 2, step: 0.05, label: 'reveal delay s' },
      videoHoldOutS:     { value: 1.8,  min: 0, max: 4, step: 0.05, label: 'hold on leave s' },
      videoObjectFit:    { value: 'cover', options: ['cover', 'contain'], label: 'object-fit' },
      videoFadeOpacity:  { value: true, label: 'also fade opacity' },
      videoZIndex:       { value: 10, min: 1, max: 50, step: 1, label: 'z-index' },
      videoCrossfadeS:   { value: 1.0, min: 0.05, max: 3, step: 0.05, label: 'video crossfade s' },
    }, { collapsed: false }),
    'B · Top Nav': folder({
      navTopVh:         { value: 1.4, min: 0, max: 10, step: 0.05, label: 'top vh' },
      navSidePadVw:     { value: 1.3, min: 0, max: 10, step: 0.05, label: 'side pad vw' },
      // Left pill ("Menu" — small, tight)
      navMenuOn:        { value: true, label: 'menu pill' },
      navMenuLabel:     { value: 'Menu', label: 'menu label' },
      navMenuFontVw:    { value: 0.75, min: 0.4, max: 2, step: 0.01, label: 'menu font vw' },
      navMenuPadYVw:    { value: 0.55, min: 0.1, max: 2, step: 0.02, label: 'menu pad y vw' },
      navMenuPadXVw:    { value: 0.95, min: 0.2, max: 3, step: 0.02, label: 'menu pad x vw' },
      // Right cluster (location + envelope button)
      navRightOn:       { value: true, label: 'right cluster' },
      navLocationLabel: { value: 'YYZ 1:58 PM', label: 'location / time' },
      navLocationFontVw:{ value: 0.75, min: 0.4, max: 2, step: 0.01, label: 'location font vw' },
      navLocationGapVw: { value: 0.9,  min: 0.1, max: 4, step: 0.05, label: 'gap vw (text ↔ btn)' },
      navCtaCirclePx:   { value: 36,   min: 24, max: 80, step: 1, label: 'cta circle px' },
      navCtaExpanded:   { value: 'Get in Touch', label: 'cta expanded label' },
      navCtaFontVw:     { value: 0.75, min: 0.4, max: 2, step: 0.01, label: 'cta font vw' },
      navCtaPadYVw:     { value: 0.45, min: 0.1, max: 2, step: 0.02, label: 'cta pad y vw' },
      navCtaPadXVw:     { value: 0.9,  min: 0.2, max: 3, step: 0.02, label: 'cta pad x vw' },
      navCtaIconPx:     { value: 14,   min: 10, max: 32, step: 1, label: 'cta icon px' },
      navBlurPx:        { value: 4,    min: 0, max: 20, step: 0.5, label: 'backdrop blur px' },
      navRevealS:       { value: 1.0,  min: 0.1, max: 3, step: 0.05, label: 'reveal s' },
      navRevealDelayS:  { value: 0.35, min: 0, max: 3, step: 0.05, label: 'reveal delay s' },
    }, { collapsed: true }),
    'B · Top Nav — Colors': folder({
      // MENU pill (left) — idle + hover
      navMenuIdleBg:        { value: 'rgba(255,255,255,0.08)', label: 'menu · idle bg' },
      navMenuIdleBorder:    { value: 'rgba(255,255,255,0)',    label: 'menu · idle border' },
      navMenuHoverBg:       { value: 'rgba(255,255,255,0)',    label: 'menu · hover bg' },
      navMenuHoverBorder:   { value: 'rgba(255,255,255,0.9)',  label: 'menu · hover border' },
      // ENVELOPE CTA (right) — idle + hover
      navCtaIdleBg:         { value: 'rgba(255,255,255,0.08)', label: 'cta · idle bg' },
      navCtaIdleBorder:     { value: 'rgba(255,255,255,0)',    label: 'cta · idle border' },
      navCtaHoverBg:        { value: 'rgba(255,255,255,0)',    label: 'cta · hover bg' },
      navCtaHoverBorder:    { value: 'rgba(255,255,255,0.9)',  label: 'cta · hover border' },
      // Hover easing + duration (shared by both pills)
      navHoverDurationS:    { value: 0.45, min: 0.05, max: 2, step: 0.01, label: 'hover duration s' },
    }, { collapsed: true }),
    'B · Logo Intro': folder({
      logoIntroOn:        { value: true, label: 'enabled' },
      logoIntroDurationS: { value: 1.2,  min: 0.1, max: 4, step: 0.05, label: 'duration s' },
      logoIntroDelayS:    { value: 0.25, min: 0, max: 3, step: 0.05, label: 'start delay s' },
      logoIntroStaggerS:  { value: 0.08, min: 0, max: 0.6, step: 0.01, label: 'stagger per piece s' },
      logoIntroEase: {
        value: 'circ.out',
        options: ['circ.out', 'expo.out', 'power4.out', 'power3.out', 'power2.out', 'back.out', 'sine.out'],
        label: 'ease',
      },
    }, { collapsed: false }),
    'B · Bottom Gradient': folder({
      gradOn:        { value: true, label: 'enabled' },
      gradColor:     { value: '#000000', label: 'color' },
      gradBottomOp:  { value: 0.65, min: 0, max: 1, step: 0.01, label: 'bottom opacity' },
      gradTopOp:     { value: 0,    min: 0, max: 1, step: 0.01, label: 'top opacity' },
      gradHeightVh:  { value: 40,   min: 5, max: 100, step: 0.5, label: 'height vh' },
      gradZIndex:    { value: 4,    min: 1, max: 20, step: 1, label: 'z-index' },
    }, { collapsed: false }),
    'B · Cursor': folder({
      cursorOn:          { value: true, label: 'enabled' },
      cursorDotColor:    { value: '#ffffff', label: 'dot color' },
      cursorDotIdlePx:   { value: 12, min: 2, max: 30, step: 1, label: 'dot idle px' },
      cursorDotHoverPx:  { value: 2, min: 1, max: 30, step: 1, label: 'dot hover px' },
      cursorRingColor:   { value: '#ffffff', label: 'ring color' },
      cursorRingBorderPx:{ value: 0.6, min: 0.1, max: 4, step: 0.1, label: 'ring border px' },
      cursorRingIdlePx:  { value: 12, min: 8, max: 60, step: 1, label: 'ring idle px' },
      cursorHoverSizePx: { value: 40, min: 16, max: 160, step: 1, label: 'ring hover px' },
      cursorMorphS:      { value: 1.00, min: 0.05, max: 2, step: 0.01, label: 'morph s' },
      cursorPadPx:       { value: 5, min: 0, max: 30, step: 1, label: 'morph pad px (all sides)' },
      cursorBlend:       { value: 'normal', options: ['normal', 'difference'], label: 'blend mode' },
      cursorRingOpacity: { value: 1, min: 0, max: 1, step: 0.02, label: 'ring opacity' },
      cursorDotOpacity:  { value: 1, min: 0, max: 1, step: 0.02, label: 'dot opacity' },
    }, { collapsed: false }),
    'B · Titles': folder({
      titlesOn:          { value: true, label: 'enabled' },
      leftTitle:         { value: 'We make', label: 'left text' },
      rightTitle:        { value: 'interfaces', label: 'right text' },
      titleSizeVw:       { value: 6.4, min: 1.5, max: 16, step: 0.1, label: 'size vw' },
      titleBottomVw:     { value: 1.1, min: 0, max: 15, step: 0.1, label: 'bottom vw' },
      titlePadVw:        { value: 1.1, min: 0, max: 15, step: 0.1, label: 'side pad vw' },
      titleItalic:       { value: false, label: 'right italic' },
      titleIdleOpacity:  { value: 1.00, min: 0, max: 1, step: 0.01, label: 'idle opacity' },
      titleHoverOpacity: { value: 0.25, min: 0, max: 1, step: 0.01, label: 'hover opacity' },
      titleHoverDurS:    { value: 1.0, min: 0.1, max: 3, step: 0.05, label: 'hover fade s' },
    }, { collapsed: true }),
  }, { collapsed: false })

  const p1 = usePieceControls('Piece 1', PIECE_DEFAULTS[0])
  const p2 = usePieceControls('Piece 2', PIECE_DEFAULTS[1])
  const p3 = usePieceControls('Piece 3', PIECE_DEFAULTS[2])
  const p4 = usePieceControls('Piece 4', PIECE_DEFAULTS[3])
  const rawPieces = [p1, p2, p3, p4]
  // Per-piece intro progress (0 = at offset origin, 1 = at default). Driven
  // by the RAF tween effect further below; starts at 1 so pieces render at
  // default until the intro tween kicks in.
  const [pieceIntroProgress, setPieceIntroProgress] = useState([1, 1, 1, 1])
  const pieces = rawPieces.map((p, i) => ({ ...p, introProgress: pieceIntroProgress[i] ?? 1 }))

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

  // --- Full media preload gate ---------------------------------------------
  // The splash stays on screen until *everything* the page will need is
  // already in the HTTP cache: the hero reel, every pill image, every pill
  // video. No lazy loading — by the time the user sees the page, every
  // hover interaction is a cache hit.
  //
  // Timeout cap of 15s so a user on a flaky connection never sees an
  // infinite splash.
  const [allMediaReady, setAllMediaReady] = useState(false)
  const mediaProgressRef = useRef({ done: 0, total: 0 })
  const [progress, setProgress] = useState(0)
  useEffect(() => {
    const controllers = []
    const totalAssets = 1 + CLIENTS.reduce((n, c) => n + (c.image ? 1 : 0) + (c.video ? 1 : 0), 0)
    mediaProgressRef.current = { done: 0, total: totalAssets }
    let cancelled = false

    const bump = () => {
      if (cancelled) return
      mediaProgressRef.current.done++
      setProgress(mediaProgressRef.current.done / mediaProgressRef.current.total)
    }

    const fetchAsBlob = (url) => {
      const ctrl = new AbortController()
      controllers.push(ctrl)
      return fetch(url, { cache: 'force-cache', signal: ctrl.signal })
        .then((r) => r.blob())
        .catch(() => {})
        .finally(bump)
    }

    const preloadImage = (url) =>
      new Promise((resolve) => {
        const img = new Image()
        img.decoding = 'async'
        const done = () => { bump(); resolve() }
        img.onload = done
        img.onerror = done
        img.src = url
      })

    const tasks = [fetchAsBlob('/bg-video.mp4')]
    CLIENTS.forEach((c) => {
      if (c?.image) tasks.push(preloadImage(c.image))
      if (c?.video) tasks.push(fetchAsBlob(c.video))
    })

    const timeout = new Promise((resolve) => setTimeout(resolve, 15000))
    Promise.race([Promise.all(tasks), timeout]).then(() => {
      if (!cancelled) setAllMediaReady(true)
    })

    return () => {
      cancelled = true
      controllers.forEach((c) => c.abort())
    }
  }, [])

  // Canvas mounts only once every asset is cached — three.js setup piles
  // onto the main thread AFTER the user sees a ready page, not during the
  // splash. This is the user-preferred trade-off for a director review:
  // wait longer, present a complete experience.
  const [canvasMounted, setCanvasMounted] = useState(false)
  useEffect(() => {
    if (!allMediaReady) return
    const ric = window.requestIdleCallback || ((fn) => setTimeout(fn, 80))
    const handle = ric(() => setCanvasMounted(true), { timeout: 200 })
    return () => {
      const cancel = window.cancelIdleCallback || clearTimeout
      cancel(handle)
    }
  }, [allMediaReady])

  // Pill list hover → feeds ClientPreview + ClientShaderBg + CustomCursor (hoverActive only,
  // no sticky morph).
  const [hoveredClientId, setHoveredClientId] = useState(null)
  const onPillHover = (id) => { setHoveredClientId(id) }

  // Pill display order = array order in logos.js CLIENTS. DnD panel removed.
  const orderedClients = CLIENTS

  // Numeric 1 / 2 / 3 / 4 switch between the variants (stealth shortcut; the
  // control panels are removed for the director review).
  // Leva control panels are hidden by default. Press "c" to toggle.
  // Numeric 1 / 2 / 3 / 4 switch between the variants.
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
  const hoveredClient = hoveredClientId
    ? CLIENTS.find((c) => c.id === hoveredClientId)
    : null

  // Play Reel button ref — used so the sticky cursor can follow the magnetic button each frame.
  const playReelBtnRef = useRef(null)

  // Sticky cursor target — ONLY the Play Reel button. Pills use the simpler
  // `hoverActive` ring-grow flow (no morph).
  const morphRectResolver = () => {
    if (buttonHovered && playReelBtnRef.current) {
      return playReelBtnRef.current.getBoundingClientRect()
    }
    return null
  }

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
      overlayDuration: { value: 1.0, min: 0.1, max: 3, step: 0.05 },
      overlayEase:     { value: 'circ.inOut', options: EASE_NAMES },
    }, { collapsed: true }),
    Logo: folder({
      logoStartVw:  { value: 9,  min: 4,  max: 60,  step: 0.5 },
      logoEndPx:    { value: 90, min: 40, max: 200, step: 1 },
      logoDuration: { value: 1.4, min: 0.1, max: 3,  step: 0.05 },
      logoEase:     { value: 'circ.inOut', options: EASE_NAMES },
      loaderBarOn:      { value: true },
      loaderBarWidthPx: { value: 120, min: 40, max: 400, step: 2 },
      loaderBarGapPx:   { value: 18,  min: 0,  max: 80,  step: 1 },
      letterEntryOn:        { value: true },
      letterEntryDuration:  { value: 0.6, min: 0.1, max: 2, step: 0.05 },
      letterEntryStaggerMs: { value: 80, min: 0, max: 300, step: 5 },
    }, { collapsed: true }),
    Bevel: folder({
      bevelStart:    { value: 80,  min: 0,   max: 200, step: 1 },
      bevelDelay:    { value: 1.4, min: 0,   max: 3,   step: 0.05 },
      bevelDuration: { value: 2.0, min: 0.2, max: 5,   step: 0.05 },
      bevelEase:     { value: 'circ.inOut', options: EASE_NAMES },
    }, { collapsed: true }),
    '3D opacity': folder({
      logo3dDelay:    { value: 0.0, min: 0,   max: 3, step: 0.05 },
      logo3dDuration: { value: 1.5, min: 0.1, max: 3, step: 0.05 },
      logo3dEase:     { value: 'circ.out', options: EASE_NAMES },
    }, { collapsed: true }),
    Letters: folder({
      lettersAnim:      { value: true },
      lettersDisperseY: { value: 50, min: 0, max: 200, step: 2 },
      lettersStaggerMs: { value: 80, min: 0, max: 300, step: 5 },
      lettersDuration:  { value: 0.55, min: 0.1, max: 2, step: 0.05 },
      lettersEase:      { value: 'circ.inOut', options: EASE_NAMES },
    }, { collapsed: true }),
    Gloss: folder({
      glossOn:           { value: false },
      glossLight:        { value: '#ffffff' },
      glossMid:          { value: '#b8bcc4' },
      glossDark:         { value: '#5c626f' },
      glossSweepOn:      { value: false },
      glossSweepDur:     { value: 1.2, min: 0.3, max: 8, step: 0.1 },
      glossHoverTrigger: { value: false, label: 'sweep on hover only' },
    }, { collapsed: true }),
    PlayReel: folder({
      playReelDelay:    { value: 2.0, min: 0, max: 4, step: 0.05 },
      playReelDuration: { value: 1.0, min: 0.1, max: 3, step: 0.05 },
      playReelEase:     { value: 'circ.out', options: EASE_NAMES },
    }, { collapsed: true }),
    Titles: folder({
      titleFromY:     { value: 100, min: 0, max: 300, step: 2 },
      titleDelay:     { value: 0.5, min: 0, max: 3, step: 0.05 },
      titleDuration:  { value: 1.4, min: 0.1, max: 3, step: 0.05 },
      titleEase:      { value: 'circ.out', options: EASE_NAMES },
      titleStaggerMs: { value: 350, min: 0, max: 1200, step: 10 },
    }, { collapsed: true }),
  }, { collapsed: true })

  const [logo3dRevealProgress, setLogo3dRevealProgress] = useState(0)
  useEffect(() => {
    if (!introRevealed) { setLogo3dRevealProgress(0); return }
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
    return () => { window.clearTimeout(timeout); cancelAnimationFrame(raf) }
  }, [introRevealed, preloader.logo3dDelay, preloader.logo3dDuration, preloader.logo3dEase])

  const [bevelLoadProgress, setBevelLoadProgress] = useState(0)
  useEffect(() => {
    if (!introRevealed) { setBevelLoadProgress(0); return }
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
    return () => { window.clearTimeout(timeout); cancelAnimationFrame(raf) }
  }, [introRevealed, preloader.bevelDelay, preloader.bevelDuration, preloader.bevelEase])

  // Per-piece intro progress (0 = flown-in-offset, 1 = at default). One RAF
  // loop stamps all four progress values; each piece has its own staggered
  // start time. Uses EASE_FN (same lookup used for bevel/logo3d animations)
  // so the ease dropdown in Leva picks whichever curve the designer wants.
  useEffect(() => {
    if (!introRevealed) {
      // Pre-intro: snap pieces to their offset origin so they're in the
      // "flown-in" position, not popping from default.
      setPieceIntroProgress([0, 0, 0, 0])
      return
    }
    if (!versionB.logoIntroOn) {
      setPieceIntroProgress([1, 1, 1, 1])
      return
    }
    let raf = 0
    const durationMs = versionB.logoIntroDurationS * 1000
    const staggerMs  = versionB.logoIntroStaggerS  * 1000
    const baseDelayMs = versionB.logoIntroDelayS  * 1000
    const easeFn = EASE_FN[versionB.logoIntroEase] || EASE_FN['circ.out']
    const startMs = performance.now()
    const tick = () => {
      const now = performance.now() - startMs
      const next = [0, 0, 0, 0]
      let stillRunning = false
      for (let i = 0; i < 4; i++) {
        const pieceStart = baseDelayMs + i * staggerMs
        const local = now - pieceStart
        if (local <= 0) { next[i] = 0; stillRunning = true }
        else if (local >= durationMs) { next[i] = 1 }
        else { next[i] = easeFn(local / durationMs); stillRunning = true }
      }
      setPieceIntroProgress(next)
      if (stillRunning) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [introRevealed, versionB.logoIntroOn, versionB.logoIntroDurationS, versionB.logoIntroDelayS, versionB.logoIntroStaggerS, versionB.logoIntroEase])

  const scene = useControls({
    Lighting: folder({
      ambientIntensity: { value: 0.40, min: 0, max: 2, step: 0.02 },
      keyIntensity: { value: 5.2, min: 0, max: 8, step: 0.1 },
      keyColor: '#a8c0fc',
      keyPosition: { value: { x: 2.2, y: 0.7, z: 3.7 }, step: 0.1 },
      rimIntensity: { value: 2.85, min: 0, max: 8, step: 0.05 },
      rimColor: '#a8c0fc',
      rimPosition: { value: { x: -2.4, y: -8.1, z: 9.3 }, step: 0.1 },
      fillIntensity: { value: 0.00, min: 0, max: 4, step: 0.05 },
      fillColor: '#a8c0fc',
      fillPosition: { value: { x: 0, y: -2, z: -3 }, step: 0.1 },
    }, { collapsed: true }),
    Environment: folder({
      envPreset: { value: 'warehouse', options: ENV_PRESETS },
      envBgIntensity: { value: 0.30, min: 0, max: 2.5, step: 0.05 },
      background: '#090b0d',
      sparklesOn: { value: false },
      sparklesCount: { value: 0, min: 0, max: 300, step: 1 },
    }, { collapsed: true }),
  })

  const cameraStateRef = useRef({ getState: () => null })
  const [cam, setCam] = useControls(() => ({
    'Camera': folder({
      azimuth:   { value: 0,    min: -180, max: 180, step: 0.5 },
      polar:     { value: 90.5, min: 1,    max: 179, step: 0.5 },
      distance:  { value: 9.45, min: 0.5,  max: 20,  step: 0.05 },
      targetX:   { value: 0,    min: -5,   max: 5,   step: 0.01 },
      targetY:   { value: 0,    min: -5,   max: 5,   step: 0.01 },
      targetZ:   { value: 0,    min: -5,   max: 5,   step: 0.01 },
      fov:       { value: 29.0, min: 10,   max: 120, step: 0.5 },
      exposure:  { value: 1.05, min: 0.1,  max: 3,   step: 0.05 },
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
        setCam({ azimuth: 0, polar: 90.5, distance: 9.45, targetX: 0, targetY: 0, targetZ: 0, fov: 29 })
      }),
    }, { collapsed: true }),
  }))

  const fx = useControls({
    'Post FX': folder({
      Vignette: folder({
        vignOn: { value: true }, vignDark: { value: 1.00, min: 0, max: 1, step: 0.01 },
        vignOffset: { value: 0.03, min: 0, max: 1, step: 0.01 },
      }, { collapsed: true }),
      'Chromatic Aberration': folder({
        caOn: { value: true }, caOffsetX: { value: -0.0003, min: -0.02, max: 0.02, step: 0.0001 },
        caOffsetY: { value: 0.00, min: -0.02, max: 0.02, step: 0.0001 },
      }, { collapsed: true }),
    }, { collapsed: true }),
  })

  // --- side titles (bottom "We make / interfaces") ---
  const sideTitlesVisible = versionB.titlesOn && introRevealed
  const titleRevealEase = EASE_CSS[preloader.titleEase] || EASE_CSS['circ.out']
  const titleHoverEase  = 'cubic-bezier(0.33, 1, 0.68, 1)' // cubic.out
  // Once revealed, use the hover-fade transition (reacts to pill hover).
  // Before reveal, use the intro stagger transition.
  const titleTransition = (extraDelayS) => {
    if (resetting) return 'none'
    if (!sideTitlesVisible) {
      return `transform ${preloader.titleDuration}s ${titleRevealEase} ${extraDelayS}s, opacity ${preloader.titleDuration}s ${titleRevealEase} ${extraDelayS}s`
    }
    return `opacity ${versionB.titleHoverDurS}s ${titleHoverEase}, transform ${preloader.titleDuration}s ${titleRevealEase}`
  }
  const titleOpacity = sideTitlesVisible
    ? (hoveredClientId ? versionB.titleHoverOpacity : versionB.titleIdleOpacity)
    : 0
  const titleBaseStyle = {
    position: 'fixed',
    margin: 0,
    fontFamily: "'PP Eiko', serif",
    fontWeight: 100,
    fontSize: `${versionB.titleSizeVw}vw`,
    lineHeight: 0.9,
    letterSpacing: '-0.03em',
    color: '#ecedf0',
    pointerEvents: 'none',
    zIndex: 14,
    whiteSpace: 'nowrap',
    userSelect: 'none',
  }

  return (
    <>
      {/* Splash overlay — stays on screen until every asset the page uses
          (hero reel + all 14 pill images + all 14 pill videos) is fully in
          the HTTP cache. No lazy loading anywhere: by the time this fades,
          every hover is a cache hit. Fades out over 600 ms. */}
      <div
        aria-hidden
        style={{
          position: 'fixed',
          inset: 0,
          background: '#000',
          zIndex: 99997,
          opacity: allMediaReady ? 0 : 1,
          pointerEvents: allMediaReady ? 'none' : 'auto',
          transition: 'opacity 0.6s cubic-bezier(0.23, 1, 0.32, 1)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '20px',
        }}
      >
        <div
          style={{
            width: 180,
            height: 1,
            background: 'rgba(255,255,255,0.1)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(255,255,255,0.85)',
              transformOrigin: 'left center',
              transform: `scaleX(${Math.min(1, progress)})`,
              transition: 'transform 0.25s cubic-bezier(0.23, 1, 0.32, 1)',
            }}
          />
        </div>
        <div
          style={{
            fontFamily: "'Basis Grotesque Pro', sans-serif",
            fontSize: 11,
            letterSpacing: '0.18em',
            color: 'rgba(255,255,255,0.55)',
            textTransform: 'uppercase',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {String(Math.round(Math.min(1, progress) * 100)).padStart(3, '0')}
        </div>
      </div>

      {/* Leva auto-mounts a root panel in document.body as soon as any
          useControls() is called. We have to render <Leva /> ourselves so we
          own that mount point and can keep it hidden; otherwise Leva injects
          its own unhidden panel and the "c" toggle becomes a no-op.
          hidden={!levaVisible} applies display:none until the user presses
          "c", so the review experience is clean by default. */}
      <Leva hidden={!levaVisible} collapsed={false} oneLineLabels />
      <LevaPanel
        store={fxStore}
        hidden={!levaVisible}
        oneLineLabels
        collapsed={false}
        titleBar={{ title: 'Shader FX', drag: true }}
      />
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

      {/* Top nav — "Menu" pill (left) + location / time + envelope CTA (right) — metalab.com */}
      <TopNav
        revealed={introRevealed}
        resetting={resetting}
        topVh={versionB.navTopVh}
        leftVw={versionB.navSidePadVw}
        rightVw={versionB.navSidePadVw}
        menuOn={versionB.navMenuOn}
        menuLabel={versionB.navMenuLabel}
        menuFontVw={versionB.navMenuFontVw}
        menuPadYVw={versionB.navMenuPadYVw}
        menuPadXVw={versionB.navMenuPadXVw}
        menuIdleBg={versionB.navMenuIdleBg}
        menuIdleBorder={versionB.navMenuIdleBorder}
        menuHoverBg={versionB.navMenuHoverBg}
        menuHoverBorder={versionB.navMenuHoverBorder}
        menuBlurPx={versionB.navBlurPx}
        rightOn={versionB.navRightOn}
        locationLabel={versionB.navLocationLabel}
        locationFontVw={versionB.navLocationFontVw}
        locationGapVw={versionB.navLocationGapVw}
        ctaCircleSizePx={versionB.navCtaCirclePx}
        ctaExpandedLabel={versionB.navCtaExpanded}
        ctaFontVw={versionB.navCtaFontVw}
        ctaPadYVw={versionB.navCtaPadYVw}
        ctaPadXVw={versionB.navCtaPadXVw}
        ctaIdleBg={versionB.navCtaIdleBg}
        ctaIdleBorder={versionB.navCtaIdleBorder}
        ctaHoverBg={versionB.navCtaHoverBg}
        ctaHoverBorder={versionB.navCtaHoverBorder}
        ctaIconSize={versionB.navCtaIconPx}
        ctaBlurPx={versionB.navBlurPx}
        hoverDurationS={versionB.navHoverDurationS}
        durationS={versionB.navRevealS}
        delayS={versionB.navRevealDelayS}
      />

      {/* Bottom titles (optional, same look as Version A) */}
      {versionB.titlesOn && (
        <>
          <h1
            style={{
              ...titleBaseStyle,
              bottom: `${versionB.titleBottomVw}vw`,
              left: `${versionB.titlePadVw}vw`,
              textAlign: 'left',
              opacity: titleOpacity,
              transform: sideTitlesVisible ? 'translateY(0)' : `translateY(${preloader.titleFromY}px)`,
              transition: titleTransition(preloader.titleDelay),
              willChange: 'transform, opacity',
            }}
          >
            {versionB.leftTitle}
          </h1>
          <h1
            style={{
              ...titleBaseStyle,
              bottom: `${versionB.titleBottomVw}vw`,
              right: `${versionB.titlePadVw}vw`,
              textAlign: 'right',
              fontStyle: versionB.titleItalic ? 'italic' : 'normal',
              opacity: titleOpacity,
              transform: sideTitlesVisible ? 'translateY(0)' : `translateY(${preloader.titleFromY}px)`,
              transition: titleTransition(preloader.titleDelay + preloader.titleStaggerMs / 1000),
              willChange: 'transform, opacity',
            }}
          >
            {versionB.rightTitle}
          </h1>
        </>
      )}

      {/* Page backdrop */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: scene.background,
          zIndex: 0,
          pointerEvents: 'none',
        }}
      />

      {/* DOM cross-fade background (fallback). Disabled when the GLSL shader bg is active,
          to avoid rendering two background layers at once. */}
      {!versionB.shaderOn && (
        <ClientImageBg
          items={orderedClients}
          hoveredId={hoveredClientId}
          widthVw={versionB.previewWidthVw}
          heightVh={versionB.previewHeightVh}
          inDurS={versionB.bgInDurS}
          outDurS={versionB.bgOutDurS}
          outScale={versionB.bgOutScale}
          clipToPct={versionB.bgClipPct}
          zIndex={2}
        />
      )}

      {/* Client preview — title + description overlays (z:12, above Canvas) */}
      <ClientPreview
        client={hoveredClient}
        titleTopVh={versionB.previewTitleTopVh}
        titleLeftVw={versionB.previewTitleLeftVw}
        titleFontVw={versionB.previewTitleFontVw}
        descRightVw={versionB.previewDescRightVw}
        descBottomVh={versionB.previewDescBottomVh}
        descMaxWVw={versionB.previewDescMaxVw}
        descFontVw={versionB.previewDescFontVw}
        fadeDurationS={versionB.previewFadeS}
        zIndex={12}
      />

      {/* Video container — clip-path grow reveal on pill hover */}
      <VideoContainer
        client={hoveredClient}
        enabled={versionB.videoOn}
        topVh={versionB.videoTopVh}
        leftVw={versionB.videoLeftVw}
        widthVw={versionB.videoWidthVw}
        heightVh={versionB.videoHeightVh}
        borderRadiusVw={versionB.videoRadiusVw}
        growDurationS={versionB.videoGrowS}
        growFrom={versionB.videoGrowFrom}
        revealDelayS={versionB.videoRevealDelayS}
        holdOnLeaveS={versionB.videoHoldOutS}
        objectFit={versionB.videoObjectFit}
        fadeOpacity={versionB.videoFadeOpacity}
        zIndex={versionB.videoZIndex}
        videoCrossfadeS={versionB.videoCrossfadeS}
      />

      {/* Bottom gradient overlay — on top of the background image, below the Canvas */}
      {versionB.gradOn && (() => {
        const h = (x) => x.replace('#', '')
        const r = parseInt(h(versionB.gradColor).slice(0, 2), 16)
        const g = parseInt(h(versionB.gradColor).slice(2, 4), 16)
        const b = parseInt(h(versionB.gradColor).slice(4, 6), 16)
        return (
          <div
            style={{
              position: 'fixed',
              left: 0,
              right: 0,
              bottom: 0,
              height: `${versionB.gradHeightVh}vh`,
              background: `linear-gradient(to top, rgba(${r},${g},${b},${versionB.gradBottomOp}) 0%, rgba(${r},${g},${b},${versionB.gradTopOp}) 100%)`,
              pointerEvents: 'none',
              zIndex: versionB.gradZIndex,
            }}
          />
        )
      })()}

      {/* Side marquees — horizontal rails flanking the 3D logo */}
      <SideMarquees
        enabled={versionB.sideOn}
        widthVw={versionB.sideWidthVw}
        sideGapVw={versionB.sideGapVw}
        centerYVh={versionB.sideCenterYVh}
        heightVw={versionB.sideHeightVw}
        durationS={versionB.sideDurationS}
        gapVw={versionB.sideLogoGapVw}
        logoHeightVw={versionB.sideLogoHeightVw}
        invert={versionB.sideInvert}
        oppositeDirections={versionB.sideOppositeDir}
        logoBrightness={versionB.sideLogoBrightness}
        logoGlowPx={versionB.sideLogoGlowPx}
        logoGlowColor={versionB.sideLogoGlowColor}
        innerFadeWidthVw={versionB.sideInnerFadeVw}
        innerBlurIntensity={versionB.sideInnerBlurI}
        innerEdgeWidthVw={versionB.sideInnerEdgeVw}
        outerFadeWidthVw={versionB.sideOuterFadeVw}
        outerBlurIntensity={versionB.sideOuterBlurI}
        outerEdgeWidthVw={versionB.sideOuterEdgeVw}
        edgeMaskColor={versionB.sideEdgeColor}
        zIndex={4}
        opacity={introRevealed && !hoveredClient ? 1 : 0}
        transitionS={0.6}
      />

      {/* Top-right intro copy — line-by-line stagger reveal; un-reveals on pill hover */}
      {versionB.introCopyOn && (
        <AnimatedLines
          text={versionB.introCopy}
          active={introRevealed && !hoveredClientId}
          fromYpx={versionB.introCopyFromYpx}
          inDurationS={versionB.introCopyDurS}
          outDurationS={versionB.introCopyOutDurS}
          inEasing={'cubic-bezier(0, 0.55, 0.45, 1)'}
          outEasing={'cubic-bezier(0.55, 0, 1, 0.45)'}
          staggerMs={versionB.introCopyStaggerMs}
          delayS={introRevealed && !hoveredClientId ? versionB.introCopyDelayS : 0}
          style={{
            position: 'fixed',
            top: `${versionB.introCopyTopVh}vh`,
            right: `${versionB.introCopyRightVw}vw`,
            margin: 0,
            maxWidth: `${versionB.introCopyMaxVw}vw`,
            color: 'rgba(236, 237, 240, 0.82)',
            fontFamily: "'Basis Grotesque Pro', -apple-system, BlinkMacSystemFont, sans-serif",
            fontSize: `${versionB.introCopyFontVw}vw`,
            lineHeight: versionB.introCopyLineH,
            letterSpacing: '-0.005em',
            textAlign: 'right',
            zIndex: 14,
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        />
      )}

      {canvasMounted && (
        <Suspense fallback={null}>
          <AppBCanvas
            config={{
              scene, cam, shape, fx, versionB, shaderFX, preloader,
              orderedClients, pieces, logoCentroid,
              cursorRef, cameraStateRef, playReelBtnRef,
              hoveredClientId, buttonHovered, introRevealed, resetting,
              logo3dRevealProgress, bevelLoadProgress,
              setVideoReady, setLogoHovered, setButtonHovered,
            }}
          />
        </Suspense>
      )}

      {/* Pill list — compact, wrapped in 2 rows, centered at bottom */}
      <ClientPillList
        items={orderedClients}
        bottomVh={versionB.pillBottomVh}
        maxWidthVw={versionB.pillMaxWidthVw}
        gapVw={versionB.pillGapVw}
        rowGapVw={versionB.pillRowGapVw}
        pillPadYVw={versionB.pillPadYVw}
        pillPadXVw={versionB.pillPadXVw}
        fontSizeVw={versionB.pillFontVw}
        blurPx={versionB.pillBlurPx}
        idleBg={versionB.pillIdleBg}
        hoverBg={versionB.pillHoverBg}
        hoverBorder={versionB.pillHoverBorder}
        hoveredId={hoveredClientId}
        onHoverChange={onPillHover}
      />

      {/* Custom cursor — two-layer (white dot + colored ring). Ring morphs ONLY on Play Reel;
          on pills it just grows to a plain circle (hoverActive). */}
      <CustomCursor
        enabled={versionB.cursorOn}
        dotColor={versionB.cursorDotColor}
        dotIdleSizePx={versionB.cursorDotIdlePx}
        dotHoverSizePx={versionB.cursorDotHoverPx}
        ringColor={versionB.cursorRingColor}
        ringBorderPx={versionB.cursorRingBorderPx}
        ringIdleSizePx={versionB.cursorRingIdlePx}
        hoverSizePx={versionB.cursorHoverSizePx}
        morphDurationS={versionB.cursorMorphS}
        morphPadPx={versionB.cursorPadPx}
        morphRect={morphRectResolver}
        hoverActive={!!hoveredClientId}
        blendMode={versionB.cursorBlend}
        ringOpacity={versionB.cursorRingOpacity}
        dotOpacity={versionB.cursorDotOpacity}
      />
    </>
  )
}
