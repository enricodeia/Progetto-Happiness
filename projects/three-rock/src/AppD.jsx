import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { useControls, folder, Leva } from 'leva'
import { useNavigate } from 'react-router-dom'
import Core from 'smooothy'
import Lenis from 'lenis'

import ClientShaderBgVert from './ClientShaderBgVert.jsx'
import ClientVideoBg from './ClientVideoBg.jsx'
import ClientImageRight from './ClientImageRight.jsx'
import TopNavC from './TopNavC.jsx'
import AnimatedLines from './AnimatedLines.jsx'
import { CLIENTS } from './logos.js'

// Version D — vertical infinite-snap scroll experience.
//
//  · smooothy drives the section index: vertical, infinite, snap, scrollInput.
//    It owns wheel/trackpad/touch input and handles the "sticky" centering
//    (the active section always lerps to center on release). It keeps internal
//    deltaTime and lerpFactor, so no page scroll is needed.
//
//  · Lenis is mounted on the page body to keep any secondary scroll surfaces
//    smooth (e.g. if we later add a subpage). It is configured with
//    smoothWheel: false so it doesn't fight smooothy for wheel events.
//
//  · Background = full-screen <video> stack that crossfades between client
//    videos when the active index changes.
//
//  · Canvas overlay = shader plane that fades the OUTGOING client image into
//    the INCOMING one with a bent HORIZONTAL strip sweeping vertically. The
//    direction sign flips with scroll direction (down → bottom-to-top,
//    up → top-to-bottom).
//
//  · Right-side image panel = ClientImageRight. Reveals via clip-path on first
//    section change, then cross-fades images as the active client changes.
const SECTIONS = CLIENTS.filter((c) => c.video || c.image)

export default function AppD() {
  const versionD = useControls({
    'D · Smooothy': folder({
      lerpFactor:        { value: 0.08, min: 0.01, max: 0.6, step: 0.005, label: 'lerp' },
      snapStrength:      { value: 0.12, min: 0.01, max: 0.6, step: 0.005, label: 'snap strength' },
      scrollSensitivity: { value: 1.0,  min: 0.2,  max: 3,   step: 0.05,  label: 'scroll sens' },
      mouseMultiplier:   { value: 0.5,  min: 0.1,  max: 2,   step: 0.05,  label: 'wheel mult' },
      touchMultiplier:   { value: 2.0,  min: 0.2,  max: 5,   step: 0.1,   label: 'touch mult' },
      firefoxMultiplier: { value: 30,   min: 5,    max: 80,  step: 1,     label: 'firefox mult' },
    }, { collapsed: false }),
    'D · Shader (vertical)': folder({
      shaderOn:            { value: true, label: 'enabled' },
      shaderDurationS:     { value: 1.0,  min: 0.1, max: 3, step: 0.05, label: 'duration s' },
      shaderPlaneZ:        { value: -5,   min: -20, max: 0, step: 0.1,  label: 'plane z' },
      shaderPlaneW:        { value: 24,   min: 5,   max: 80, step: 0.1, label: 'plane w' },
      shaderPlaneH:        { value: 14,   min: 3,   max: 60, step: 0.1, label: 'plane h' },
      shaderEdgeWidth:     { value: 0.06, min: 0.005, max: 0.5, step: 0.005, label: 'edge width' },
      shaderBrightW:       { value: 0.22, min: 0.01, max: 1, step: 0.01, label: 'bright width' },
      shaderBrightI:       { value: 1.2,  min: 0, max: 5, step: 0.05, label: 'bright intensity' },
      shaderTransMul:      { value: 1.0,  min: 0, max: 3, step: 0.05, label: 'translate offset' },
      shaderBulge:         { value: 0.35, min: 0, max: 2, step: 0.01, label: 'bulge' },
      shaderWaveWidth:     { value: 0.42, min: 0.05, max: 1, step: 0.01, label: 'wave width' },
      shaderWavePower:     { value: 2.0,  min: 0.5, max: 6, step: 0.05, label: 'wave power' },
      shaderCurvature:     { value: 0.18, min: 0, max: 1, step: 0.01, label: 'curvature' },
      shaderBrightTint:    { value: '#ffffff', label: 'bright tint' },
      shaderDarkness:      { value: 1.0,  min: 0.2, max: 1.5, step: 0.01, label: 'backdrop dark' },
    }, { collapsed: true }),
    'D · Background video': folder({
      videoBgOn:      { value: true, label: 'enabled' },
      videoBgCrossS:  { value: 1.2,  min: 0.1, max: 3, step: 0.05, label: 'crossfade s' },
      videoBgFit:     { value: 'cover', options: ['cover', 'contain'], label: 'object-fit' },
      videoBgZ:       { value: 1,    min: 0, max: 20, step: 1, label: 'z-index' },
    }, { collapsed: true }),
    'D · Image panel (right)': folder({
      rightOn:        { value: true,   label: 'enabled' },
      rightRightVw:   { value: 3,      min: 0, max: 20, step: 0.1, label: 'right vw' },
      rightTopVh:     { value: 20,     min: 0, max: 80, step: 0.5, label: 'top vh' },
      rightWidthVw:   { value: 34,     min: 10, max: 70, step: 0.5, label: 'width vw' },
      rightHeightVh:  { value: 60,     min: 20, max: 95, step: 0.5, label: 'height vh' },
      rightRadiusVw:  { value: 0.2,    min: 0, max: 5, step: 0.05, label: 'radius vw' },
      rightGrowS:     { value: 0.8,    min: 0.1, max: 3, step: 0.05, label: 'grow s' },
      rightGrowFrom:  { value: 'bottom', options: ['bottom', 'top', 'left', 'right'], label: 'grow from' },
      rightCrossS:    { value: 1.0,    min: 0.1, max: 3, step: 0.05, label: 'crossfade s' },
      rightFit:       { value: 'cover', options: ['cover', 'contain'], label: 'object-fit' },
      rightZ:         { value: 10,     min: 1, max: 50, step: 1, label: 'z-index' },
    }, { collapsed: true }),
    'D · Text (center-left)': folder({
      textOn:         { value: true, label: 'enabled' },
      textLeftVw:     { value: 5,    min: 0, max: 40, step: 0.5, label: 'left vw' },
      textTopVh:      { value: 36,   min: 0, max: 90, step: 0.5, label: 'top vh' },
      textNameFontVw: { value: 4.0,  min: 1, max: 12, step: 0.1, label: 'name font vw' },
      textDescFontVw: { value: 1.0,  min: 0.6, max: 3, step: 0.05, label: 'desc font vw' },
      textMaxWVw:     { value: 28,   min: 10, max: 50, step: 0.5, label: 'desc max w vw' },
      textGapVh:      { value: 2.0,  min: 0, max: 10, step: 0.1, label: 'name↔desc gap vh' },
      textFadeS:      { value: 0.5,  min: 0.05, max: 2, step: 0.05, label: 'fade s' },
    }, { collapsed: true }),
    'D · Top Nav': folder({
      navOn:         { value: true, label: 'enabled' },
      navTopVh:      { value: 1.2,  min: 0, max: 10, step: 0.05, label: 'top vh' },
      navSideVw:     { value: 1.1,  min: 0, max: 10, step: 0.05, label: 'side pad vw' },
      navMenuLabel:  { value: 'Menu', label: 'menu label' },
      navMenuFontVw: { value: 0.7,  min: 0.4, max: 2, step: 0.01, label: 'menu font vw' },
      navMenuPadYVw: { value: 0.45, min: 0.1, max: 2, step: 0.02, label: 'menu pad y vw' },
      navMenuPadXVw: { value: 0.85, min: 0.2, max: 3, step: 0.02, label: 'menu pad x vw' },
      navLocLabel:   { value: 'YYZ 1:58 PM', label: 'location / time' },
      navLocFontVw:  { value: 0.7,  min: 0.4, max: 2, step: 0.01, label: 'location font vw' },
      navLocGapVw:   { value: 0.8,  min: 0.1, max: 4, step: 0.05, label: 'gap vw' },
      navCtaCirclePx:{ value: 32,   min: 20, max: 80, step: 1, label: 'cta circle px' },
      navCtaExp:     { value: 'Get in Touch', label: 'cta label' },
      navCtaFontVw:  { value: 0.7,  min: 0.4, max: 2, step: 0.01, label: 'cta font vw' },
      navCtaPadXVw:  { value: 0.95, min: 0.2, max: 3, step: 0.02, label: 'cta pad x vw' },
      navCtaIconPx:  { value: 14,   min: 10, max: 32, step: 1, label: 'cta icon px' },
      navBlurPx:     { value: 4,    min: 0, max: 20, step: 0.5, label: 'backdrop blur' },
    }, { collapsed: true }),
  })

  // Leva visibility + keyboard routing (1/2/3/4 switch between versions).
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

  // Lenis — body-level smoothing (wheel handled by smooothy, so smoothWheel off).
  useEffect(() => {
    const lenis = new Lenis({ smoothWheel: false, smoothTouch: false })
    let rafId = 0
    const raf = (t) => { lenis.raf(t); rafId = requestAnimationFrame(raf) }
    rafId = requestAnimationFrame(raf)
    return () => { cancelAnimationFrame(rafId); lenis.destroy() }
  }, [])

  // --- smooothy wiring ---
  const sliderWrapRef = useRef(null)
  const sliderRef = useRef(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [directionSign, setDirectionSign] = useState(1)
  const lastTargetRef = useRef(0)

  useEffect(() => {
    if (!sliderWrapRef.current) return
    const slider = new Core(sliderWrapRef.current, {
      vertical: true,
      infinite: true,
      snap: true,
      scrollInput: true,
      lerpFactor: versionD.lerpFactor,
      snapStrength: versionD.snapStrength,
      scrollSensitivity: versionD.scrollSensitivity,
      virtualScroll: {
        mouseMultiplier: versionD.mouseMultiplier,
        touchMultiplier: versionD.touchMultiplier,
        firefoxMultiplier: versionD.firefoxMultiplier,
      },
      onSlideChange: ({ current }) => setActiveIndex(current),
      onUpdate: ({ target }) => {
        const delta = target - lastTargetRef.current
        if (Math.abs(delta) > 0.001) {
          // target grows as we move forward → delta > 0 on scroll DOWN.
          // directionSign > 0 means incoming image sweeps from bottom → top.
          setDirectionSign(delta > 0 ? 1 : -1)
        }
        lastTargetRef.current = target
      },
    })
    sliderRef.current = slider

    let rafId = 0
    const animate = () => { slider.update(); rafId = requestAnimationFrame(animate) }
    rafId = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(rafId)
      try { slider.destroy() } catch {}
      sliderRef.current = null
    }
    // Re-create the slider whenever core tuning changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    versionD.lerpFactor, versionD.snapStrength, versionD.scrollSensitivity,
    versionD.mouseMultiplier, versionD.touchMultiplier, versionD.firefoxMultiplier,
  ])

  const activeClient = SECTIONS[activeIndex] || SECTIONS[0]
  const activeId = activeClient?.id || null

  // Typography reveal key — remount AnimatedLines on activeId change so the
  // in-easing replays for each new title/description.
  const [textKey, setTextKey] = useState(0)
  useEffect(() => { setTextKey((n) => n + 1) }, [activeId])

  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', background: '#000' }}>
      {levaVisible && <Leva hidden={false} collapsed={false} oneLineLabels />}

      {/* Background video stack — full screen, behind everything. */}
      <ClientVideoBg
        items={SECTIONS}
        activeId={activeId}
        crossfadeS={versionD.videoBgCrossS}
        objectFit={versionD.videoBgFit}
        zIndex={versionD.videoBgZ}
        enabled={versionD.videoBgOn}
      />

      {/* Canvas overlay — vertical-strip shader that paints on top of the
          video while the transition progresses. Transparent otherwise. */}
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 5,
          pointerEvents: 'none',
        }}
      >
        <Canvas
          dpr={[1, 2]}
          gl={{ alpha: true, antialias: true, preserveDrawingBuffer: false }}
          style={{ background: 'transparent' }}
          camera={{ position: [0, 0, 8], fov: 50 }}
        >
          <ClientShaderBgVert
            items={SECTIONS}
            activeId={activeId}
            directionSign={directionSign}
            enabled={versionD.shaderOn}
            planeZ={versionD.shaderPlaneZ}
            planeWidth={versionD.shaderPlaneW}
            planeHeight={versionD.shaderPlaneH}
            durationS={versionD.shaderDurationS}
            edgeWidth={versionD.shaderEdgeWidth}
            brightnessWidth={versionD.shaderBrightW}
            brightnessIntensity={versionD.shaderBrightI}
            translateOffsetMultiplier={versionD.shaderTransMul}
            bulgeDepthStrength={versionD.shaderBulge}
            waveWidth={versionD.shaderWaveWidth}
            wavePower={versionD.shaderWavePower}
            curvature={versionD.shaderCurvature}
            brightnessTint={versionD.shaderBrightTint}
            backdropDarkness={versionD.shaderDarkness}
          />
        </Canvas>
      </div>

      {/* Right-side image panel — clip-path grow + image crossfade. */}
      <ClientImageRight
        items={SECTIONS}
        activeId={activeId}
        enabled={versionD.rightOn}
        rightVw={versionD.rightRightVw}
        topVh={versionD.rightTopVh}
        widthVw={versionD.rightWidthVw}
        heightVh={versionD.rightHeightVh}
        radiusVw={versionD.rightRadiusVw}
        growS={versionD.rightGrowS}
        growFrom={versionD.rightGrowFrom}
        crossfadeS={versionD.rightCrossS}
        objectFit={versionD.rightFit}
        zIndex={versionD.rightZ}
      />

      {/* Center-left text stack (name + description). Lives above everything. */}
      {versionD.textOn && activeClient && (
        <div
          style={{
            position: 'fixed',
            left: `${versionD.textLeftVw}vw`,
            top: `${versionD.textTopVh}vh`,
            zIndex: 12,
            pointerEvents: 'none',
            maxWidth: `${versionD.textMaxWVw}vw`,
            color: '#fff',
          }}
        >
          <AnimatedLines
            key={`name-${textKey}`}
            text={activeClient.name}
            fontFamily="'PP Eiko', serif"
            fontSizeVw={versionD.textNameFontVw}
            lineHeight={1.02}
            staggerInS={0.05}
            durationInS={1.0}
            easeIn="circ.out"
          />
          <div style={{ height: `${versionD.textGapVh}vh` }} />
          <AnimatedLines
            key={`desc-${textKey}`}
            text={activeClient.description || ''}
            fontFamily="'Basis Grotesque Pro', sans-serif"
            fontSizeVw={versionD.textDescFontVw}
            lineHeight={1.45}
            staggerInS={0.02}
            durationInS={0.7}
            easeIn="circ.out"
            color="rgba(255,255,255,0.92)"
          />
        </div>
      )}

      {/* Top nav — Version C variant (right-to-left CTA). */}
      {versionD.navOn && (
        <TopNavC
          revealed
          topVh={versionD.navTopVh}
          leftVw={versionD.navSideVw}
          rightVw={versionD.navSideVw}
          menuLabel={versionD.navMenuLabel}
          menuFontVw={versionD.navMenuFontVw}
          menuPadYVw={versionD.navMenuPadYVw}
          menuPadXVw={versionD.navMenuPadXVw}
          locationLabel={versionD.navLocLabel}
          locationFontVw={versionD.navLocFontVw}
          locationGapVw={versionD.navLocGapVw}
          ctaCircleSizePx={versionD.navCtaCirclePx}
          ctaExpandedLabel={versionD.navCtaExp}
          ctaFontVw={versionD.navCtaFontVw}
          ctaPadXVw={versionD.navCtaPadXVw}
          ctaIconSize={versionD.navCtaIconPx}
          menuBlurPx={versionD.navBlurPx}
          ctaBlurPx={versionD.navBlurPx}
        />
      )}

      {/* Section index indicator (bottom-left). */}
      <div
        style={{
          position: 'fixed',
          left: `${versionD.textLeftVw}vw`,
          bottom: '3vh',
          zIndex: 12,
          color: 'rgba(255,255,255,0.7)',
          fontFamily: "'Basis Grotesque Pro', sans-serif",
          fontSize: '0.8vw',
          letterSpacing: '0.1em',
          fontVariantNumeric: 'tabular-nums',
          pointerEvents: 'none',
        }}
      >
        {String(activeIndex + 1).padStart(2, '0')} — {String(SECTIONS.length).padStart(2, '0')}
      </div>

      {/* Smooothy slider — invisible DOM but required for wheel/touch capture. */}
      <div
        ref={sliderWrapRef}
        aria-hidden
        style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          opacity: 0,
          pointerEvents: 'auto',
          zIndex: 2,
        }}
      >
        {SECTIONS.map((s) => (
          <div
            key={s.id}
            data-slide={s.id}
            style={{ flexShrink: 0, width: '100%', height: '100vh' }}
          />
        ))}
      </div>
    </div>
  )
}
