import { Canvas } from '@react-three/fiber'
import { Suspense, useEffect } from 'react'
import { Leva } from 'leva'
import { EffectComposer, Bloom, Vignette, ChromaticAberration, Noise, DepthOfField, HueSaturation, BrightnessContrast } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import { useControls, folder } from 'leva'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import Experience from './Experience'

const TONE_MAPPINGS = {
  'None': THREE.NoToneMapping,
  'Linear': THREE.LinearToneMapping,
  'Reinhard': THREE.ReinhardToneMapping,
  'Cineon': THREE.CineonToneMapping,
  'ACES Filmic': THREE.ACESFilmicToneMapping,
  'AgX': THREE.AgXToneMapping,
  'Neutral': THREE.NeutralToneMapping,
}

function CameraControls() {
  const { camera } = useThree()

  const cam = useControls('Camera', {
    fov: { value: 45, min: 10, max: 120, step: 1 },
    distance: { value: 0.45, min: 0.1, max: 5, step: 0.01 },
    height: { value: 0, min: -2, max: 2, step: 0.01, label: 'Height' },
    offsetX: { value: 0, min: -2, max: 2, step: 0.01, label: 'X Offset' },
  })

  useEffect(() => {
    camera.fov = cam.fov
    camera.position.set(cam.offsetX, cam.height, cam.distance)
    camera.updateProjectionMatrix()
  }, [camera, cam])

  return null
}

function PostProcessing() {
  const fx = useControls('Post-Processing', {
    Bloom: folder({
      bloomEnabled: { value: true, label: 'Enabled' },
      bloomStrength: { value: 0.567, min: 0, max: 3, step: 0.001, label: 'Strength' },
      bloomRadius: { value: 0.496, min: 0, max: 1, step: 0.001, label: 'Radius' },
      bloomThreshold: { value: 0.619, min: 0, max: 1, step: 0.001, label: 'Threshold' },
    }),
    Vignette: folder({
      vignetteEnabled: { value: true, label: 'Enabled' },
      vignetteOffset: { value: 0.3, min: 0, max: 1, step: 0.01, label: 'Offset' },
      vignetteDarkness: { value: 0.7, min: 0, max: 1.5, step: 0.01, label: 'Darkness' },
    }),
    'Chromatic Aberration': folder({
      caEnabled: { value: false, label: 'Enabled' },
      caOffsetX: { value: 0.0005, min: 0, max: 0.02, step: 0.0001, label: 'Offset X' },
      caOffsetY: { value: 0.0005, min: 0, max: 0.02, step: 0.0001, label: 'Offset Y' },
    }),
    Noise: folder({
      noiseEnabled: { value: true, label: 'Enabled' },
      noiseOpacity: { value: 0.03, min: 0, max: 0.3, step: 0.005, label: 'Opacity' },
      noiseBlend: { value: 'SOFT_LIGHT', options: ['SOFT_LIGHT', 'OVERLAY', 'SCREEN', 'MULTIPLY', 'NORMAL'], label: 'Blend' },
    }),
    'Depth of Field': folder({
      dofEnabled: { value: false, label: 'Enabled' },
      dofFocusDistance: { value: 0.01, min: 0, max: 0.1, step: 0.001, label: 'Focus Dist' },
      dofFocalLength: { value: 0.02, min: 0, max: 0.1, step: 0.001, label: 'Focal Length' },
      dofBokehScale: { value: 3, min: 0, max: 15, step: 0.5, label: 'Bokeh Scale' },
    }),
    'Color Grading': folder({
      colorEnabled: { value: false, label: 'Enabled' },
      hue: { value: 0, min: -Math.PI, max: Math.PI, step: 0.01, label: 'Hue Shift' },
      saturation: { value: 0, min: -1, max: 1, step: 0.01, label: 'Saturation' },
      brightness: { value: 0, min: -0.5, max: 0.5, step: 0.01, label: 'Brightness' },
      contrast: { value: 0, min: -0.5, max: 0.5, step: 0.01, label: 'Contrast' },
    }),
  })

  return (
    <EffectComposer>
      {fx.bloomEnabled && (
        <Bloom
          luminanceThreshold={fx.bloomThreshold}
          luminanceSmoothing={fx.bloomRadius}
          intensity={fx.bloomStrength}
        />
      )}
      {fx.vignetteEnabled && (
        <Vignette offset={fx.vignetteOffset} darkness={fx.vignetteDarkness} />
      )}
      {fx.caEnabled && (
        <ChromaticAberration offset={[fx.caOffsetX, fx.caOffsetY]} />
      )}
      {fx.noiseEnabled && (
        <Noise
          premultiply
          blendFunction={BlendFunction[fx.noiseBlend]}
          opacity={fx.noiseOpacity}
        />
      )}
      {fx.dofEnabled && (
        <DepthOfField
          focusDistance={fx.dofFocusDistance}
          focalLength={fx.dofFocalLength}
          bokehScale={fx.dofBokehScale}
        />
      )}
      {fx.colorEnabled && (
        <>
          <HueSaturation hue={fx.hue} saturation={fx.saturation} />
          <BrightnessContrast brightness={fx.brightness} contrast={fx.contrast} />
        </>
      )}
    </EffectComposer>
  )
}

export default function GlassesScene() {
  return (
    <>
      <Leva
        collapsed={false}
        titleBar={{ title: 'Lundini Controls' }}
      />
      <Canvas
        shadows
        dpr={[1, 1.5]}
        gl={{ antialias: true, outputColorSpace: 'srgb', toneMapping: THREE.ReinhardToneMapping }}
        camera={{ fov: 45, near: 0.1, far: 100, position: [0, 0, 0.45] }}
        style={{ width: '100vw', height: '100vh', background: '#000' }}
      >
        <Suspense fallback={null}>
          <CameraControls />
          <Experience />
        </Suspense>
        <PostProcessing />
      </Canvas>
    </>
  )
}
