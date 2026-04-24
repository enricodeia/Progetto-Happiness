import { Suspense, useEffect, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Environment, Sparkles } from '@react-three/drei'
import {
  EffectComposer, Vignette, ToneMapping, ChromaticAberration,
} from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import * as THREE from 'three'
import Rock from './Rock.jsx'
import MaskedVideo from './MaskedVideo.jsx'
import PlayReel from './PlayReel.jsx'
import ClientShaderBg from './ClientShaderBg.jsx'
import ClientShaderBgFX from './ClientShaderBgFX.jsx'

// This module owns all @react-three/* + three.js imports for Version B. It is
// imported lazily by AppB so the ~1 MB of three+r3f+postprocessing code does
// not block initial paint. Only loaded after the browser goes idle.

const EASE_CSS = {
  'circ.out':   'cubic-bezier(0, 0.55, 0.45, 1)',
  'circ.inOut': 'cubic-bezier(0.85, 0, 0.15, 1)',
  'expo.out':   'cubic-bezier(0.16, 1, 0.3, 1)',
  'quart.out':  'cubic-bezier(0.25, 1, 0.5, 1)',
  'quint.out':  'cubic-bezier(0.22, 1, 0.36, 1)',
  'sine.out':   'cubic-bezier(0.61, 1, 0.88, 1)',
  'back.out':   'cubic-bezier(0.34, 1.56, 0.64, 1)',
}

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

export default function AppBCanvas({ config }) {
  const {
    scene, cam, shape, fx, versionB, shaderFX, preloader,
    orderedClients, pieces, logoCentroid,
    cursorRef, cameraStateRef, playReelBtnRef,
    hoveredClientId, buttonHovered, introRevealed, resetting,
    logo3dRevealProgress, bevelLoadProgress,
    setVideoReady, setLogoHovered, setButtonHovered,
  } = config

  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      camera={{ position: [0, 0.4, 4.3], fov: 35 }}
      style={{ position: 'fixed', inset: 0, zIndex: 5 }}
      gl={{
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
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
            maskHidden={!!hoveredClientId}
            maskHideDuration={0.3}
            onReady={() => setVideoReady(true)}
          />
          {versionB.shaderOn && versionB.shaderMode === 'simple' && (
            <ClientShaderBg
              items={orderedClients}
              hoveredId={hoveredClientId}
              enabled={versionB.shaderOn}
              planeZ={versionB.shaderPlaneZ}
              planeWidth={versionB.shaderPlaneW}
              planeHeight={versionB.shaderPlaneH}
              durationS={versionB.shaderDurS}
              easing={versionB.shaderEase}
              softness={versionB.shaderSoftness}
              oldScale={versionB.shaderOutScale}
              direction={versionB.shaderDirection}
            />
          )}
          {versionB.shaderOn && versionB.shaderMode === 'fx' && (
            <ClientShaderBgFX
              items={orderedClients}
              hoveredId={hoveredClientId}
              enabled={versionB.shaderOn}
              planeZ={versionB.shaderPlaneZ}
              planeWidth={versionB.shaderPlaneW}
              planeHeight={versionB.shaderPlaneH}
              durationS={versionB.shaderDurS}
              easing={versionB.shaderEase}
              direction={versionB.shaderDirection}
              shape={shaderFX.shape}
              edgeWidth={shaderFX.edgeWidth}
              brightnessWidth={shaderFX.brightnessWidth}
              brightnessIntensity={shaderFX.brightnessIntensity}
              translateOffsetMultiplier={shaderFX.translateOffsetMultiplier}
              bulgeDepthStrength={shaderFX.bulgeDepthStrength}
              waveWidth={shaderFX.waveWidth}
              wavePower={shaderFX.wavePower}
              curvature={shaderFX.curvature}
              brightnessTint={shaderFX.brightnessTint}
              backdropDarkness={shaderFX.backdropDarkness}
            />
          )}
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
              buttonRef={playReelBtnRef}
              revealed={introRevealed}
              resetting={resetting}
              revealDelay={preloader.playReelDelay}
              revealDuration={preloader.playReelDuration}
              revealEasing={EASE_CSS[preloader.playReelEase] || EASE_CSS['circ.out']}
            />
          )}
        </ParallaxGroup>
        <Environment preset={scene.envPreset} background={false} environmentIntensity={scene.envBgIntensity} />
      </Suspense>
      {scene.sparklesOn && <Sparkles count={scene.sparklesCount} size={1.4} scale={[8, 6, 8]} speed={0.18} opacity={0.4} color="#d6c8b3" />}
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
      <EffectComposer multisampling={0}>
        {fx.caOn && <ChromaticAberration offset={[fx.caOffsetX, fx.caOffsetY]} />}
        {fx.vignOn && <Vignette offset={fx.vignOffset} darkness={fx.vignDark} eskil={false} />}
        <ToneMapping blendFunction={BlendFunction.NORMAL} />
      </EffectComposer>
    </Canvas>
  )
}
