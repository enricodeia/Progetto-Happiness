import { useRef, useEffect, useMemo, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useGLTF, useTexture, Environment } from '@react-three/drei'
import { useControls, folder, button } from 'leva'
import * as THREE from 'three'

const MODEL_URL = 'https://cdn.jsdelivr.net/gh/eettoree/gltf@744f8b7aa58ff7ee1c8866293b07c4d322b413d2/OcchialiLundini.glb'
const WOOD_URL = 'https://raw.githubusercontent.com/eettoree/gltf/86fb4858927585465410da172c626b5368bda33d/w02661-small.jpg'
const ENV_PRESETS = ['night', 'studio', 'city', 'sunset', 'dawn', 'warehouse', 'forest', 'apartment', 'lobby', 'park']

const mouseState = { x: 0, y: 0 }

function Glasses() {
  const { scene: gltfScene } = useGLTF(MODEL_URL)
  const groupRef = useRef()
  const velocityRef = useRef({ x: 0, y: 0 })
  const rotationRef = useRef({ x: 0, y: 0 })
  const isDragging = useRef(false)

  // Idle animation
  const idle = useControls('Idle Animation', {
    bobAmplitude: { value: 0.05, min: 0, max: 0.3, step: 0.005, label: 'Bob Amplitude' },
    bobSpeed: { value: 1.5, min: 0, max: 5, step: 0.1, label: 'Bob Speed' },
    swayAmplitude: { value: 0.02, min: 0, max: 0.2, step: 0.005, label: 'Sway Amplitude' },
    swaySpeed: { value: 0.75, min: 0, max: 3, step: 0.05, label: 'Sway Speed' },
    rotOscAmplitude: { value: 0, min: 0, max: 0.5, step: 0.01, label: 'Rotation Oscillation' },
    rotOscSpeed: { value: 1, min: 0, max: 5, step: 0.1, label: 'Rot Osc Speed' },
    rotOscAxis: { value: 'Y', options: ['X', 'Y', 'Z'], label: 'Rot Osc Axis' },
  })

  // Cursor interaction
  const interaction = useControls('Cursor Interaction', {
    mode: { value: 'lookAt', options: ['lookAt', 'drag', 'none'], label: 'Mode' },
    lookStrength: { value: 0.5, min: 0, max: 2, step: 0.05, label: 'Look Strength' },
    followAmount: { value: 0.08, min: 0, max: 0.5, step: 0.01, label: 'Follow Amount' },
    followDamping: { value: 0.05, min: 0.005, max: 0.3, step: 0.005, label: 'Follow Damping' },
    dragFriction: { value: 0.95, min: 0.8, max: 0.99, step: 0.005, label: 'Drag Friction' },
    dragSensitivity: { value: 0.005, min: 0.001, max: 0.02, step: 0.001, label: 'Drag Sensitivity' },
  })

  // Model transform (hardcoded from clessio defaults adapted)
  const transform = useControls('Model', {
    scale: { value: 1.3, min: 0.1, max: 5, step: 0.01 },
    posX: { value: 0, min: -2, max: 2, step: 0.01, label: 'Position X' },
    posY: { value: 0, min: -2, max: 2, step: 0.01, label: 'Position Y' },
  })

  const glassMat = useMemo(() => new THREE.MeshPhysicalMaterial({
    name: 'glass.001',
    color: 0xffffff,
    metalness: 0,
    roughness: 0,
    transmission: 1,
    ior: 1.5,
    thickness: 0.02,
    transparent: true,
    opacity: 0.44,
    envMapIntensity: 5.0,
    depthWrite: false,
    clearcoat: 1.0,
    clearcoatRoughness: 0,
  }), [])

  const model = useMemo(() => {
    gltfScene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true
        child.receiveShadow = true
        if (Array.isArray(child.material)) {
          child.material = child.material.map((mat) =>
            mat.name === 'glass.001' ? glassMat : mat
          )
        } else if (child.material?.name === 'glass.001') {
          child.material = glassMat
        }
      }
    })
    const box = new THREE.Box3().setFromObject(gltfScene)
    const center = box.getCenter(new THREE.Vector3())
    gltfScene.position.sub(center)
    return gltfScene
  }, [gltfScene, glassMat])

  // Drag events
  const { gl } = useThree()
  useEffect(() => {
    const el = gl.domElement
    const down = () => { isDragging.current = true }
    const up = () => { isDragging.current = false }
    const move = (e) => {
      if (isDragging.current && interaction.mode === 'drag') {
        velocityRef.current.y = e.movementX * interaction.dragSensitivity
        velocityRef.current.x = e.movementY * interaction.dragSensitivity
      }
    }
    el.addEventListener('mousedown', down)
    window.addEventListener('mouseup', up)
    window.addEventListener('mousemove', move)
    return () => {
      el.removeEventListener('mousedown', down)
      window.removeEventListener('mouseup', up)
      window.removeEventListener('mousemove', move)
    }
  }, [gl, interaction.mode, interaction.dragSensitivity])

  useFrame((state) => {
    if (!groupRef.current) return
    const time = state.clock.elapsedTime

    // Idle animation
    const bobY = Math.sin(time * idle.bobSpeed) * idle.bobAmplitude
    const swayX = Math.cos(time * idle.swaySpeed * 0.5) * idle.swayAmplitude

    if (interaction.mode === 'lookAt') {
      // LookAt mode
      const target = new THREE.Vector3(
        mouseState.x * interaction.lookStrength,
        mouseState.y * interaction.lookStrength,
        1
      )
      groupRef.current.lookAt(target)

      // Position follow + idle
      const tx = transform.posX + swayX + mouseState.x * interaction.followAmount
      const ty = transform.posY + bobY + mouseState.y * interaction.followAmount
      groupRef.current.position.x += (tx - groupRef.current.position.x) * interaction.followDamping
      groupRef.current.position.y += (ty - groupRef.current.position.y) * interaction.followDamping

    } else if (interaction.mode === 'drag') {
      // Drag mode (like shoe-lab)
      if (!isDragging.current) {
        velocityRef.current.x *= interaction.dragFriction
        velocityRef.current.y *= interaction.dragFriction
      }
      rotationRef.current.x += velocityRef.current.x
      rotationRef.current.y += velocityRef.current.y
      groupRef.current.rotation.x = rotationRef.current.x
      groupRef.current.rotation.y = rotationRef.current.y

      groupRef.current.position.x = transform.posX + swayX
      groupRef.current.position.y = transform.posY + bobY

    } else {
      // None
      groupRef.current.position.x = transform.posX + swayX
      groupRef.current.position.y = transform.posY + bobY
    }

    // Rotation oscillation
    if (idle.rotOscAmplitude > 0) {
      const osc = Math.sin(time * idle.rotOscSpeed) * idle.rotOscAmplitude
      const axis = idle.rotOscAxis.toLowerCase()
      if (interaction.mode !== 'drag') {
        groupRef.current.rotation[axis] += osc
      }
    }

    groupRef.current.scale.setScalar(transform.scale)
  })

  return (
    <group ref={groupRef}>
      <primitive object={model} />
    </group>
  )
}

function Room() {
  const texture = useTexture(WOOD_URL)

  const room = useControls('Room', {
    visible: { value: true },
    width: { value: 5, min: 1, max: 20, step: 0.5 },
    height: { value: 2.2, min: 1, max: 10, step: 0.1 },
    depth: { value: 5, min: 1, max: 20, step: 0.5 },
    floorY: { value: -0.22, min: -2, max: 0, step: 0.01, label: 'Floor Y' },
    wallColor: { value: '#1a1a1a', label: 'Wall Color' },
    floorColor: { value: '#ffffff', label: 'Floor Tint' },
    roughness: { value: 0.816, min: 0, max: 1, step: 0.001 },
    metalness: { value: 0.1, min: 0, max: 1, step: 0.01 },
    floorRepeat: { value: 1.1, min: 0.1, max: 10, step: 0.1, label: 'Floor Tex Repeat' },
  })

  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(room.floorRepeat, room.floorRepeat)

  if (!room.visible) return null

  const hw = room.width / 2
  const hh = room.height / 2
  const hd = room.depth / 2
  const cy = room.floorY + hh

  return (
    <group>
      {/* Floor */}
      <mesh rotation-x={-Math.PI / 2} position-y={room.floorY} receiveShadow>
        <planeGeometry args={[room.width, room.depth]} />
        <meshStandardMaterial map={texture} roughness={room.roughness} metalness={room.metalness} color={room.floorColor} />
      </mesh>
      {/* Ceiling */}
      <mesh rotation-x={Math.PI / 2} position-y={room.floorY + room.height}>
        <planeGeometry args={[room.width, room.depth]} />
        <meshStandardMaterial color={room.wallColor} roughness={room.roughness} metalness={room.metalness} />
      </mesh>
      {/* Back wall */}
      <mesh position={[0, cy, -hd]}>
        <planeGeometry args={[room.width, room.height]} />
        <meshStandardMaterial color={room.wallColor} roughness={room.roughness} metalness={room.metalness} />
      </mesh>
      {/* Left wall */}
      <mesh position={[-hw, cy, 0]} rotation-y={Math.PI / 2}>
        <planeGeometry args={[room.depth, room.height]} />
        <meshStandardMaterial color={room.wallColor} roughness={room.roughness} metalness={room.metalness} />
      </mesh>
      {/* Right wall */}
      <mesh position={[hw, cy, 0]} rotation-y={-Math.PI / 2}>
        <planeGeometry args={[room.depth, room.height]} />
        <meshStandardMaterial color={room.wallColor} roughness={room.roughness} metalness={room.metalness} />
      </mesh>
    </group>
  )
}

function Lighting() {
  const lightRef = useRef()

  const lights = useControls('Lighting', {
    Ambient: folder({
      ambientColor: { value: '#7f6c6c', label: 'Color' },
      ambientIntensity: { value: 0.635, min: 0, max: 5, step: 0.005, label: 'Intensity' },
    }),
    'Spot 1': folder({
      spot1Intensity: { value: 5, min: 0, max: 100, step: 0.1, label: 'Intensity' },
      spot1Pos: { value: [0.5, 2.5, 1.2], label: 'Position' },
    }),
    'Spot 2': folder({
      spot2Intensity: { value: 3.1, min: 0, max: 100, step: 0.1, label: 'Intensity' },
      spot2Pos: { value: [2, 1, 3], label: 'Position' },
    }),
    'Spot 3': folder({
      spot3Intensity: { value: 5, min: 0, max: 100, step: 0.1, label: 'Intensity' },
      spot3Pos: { value: [-1, 1, -2.5], label: 'Position' },
    }),
    'Mouse Light': folder({
      mouseEnabled: { value: true, label: 'Enabled' },
      mouseIntensity: { value: 1.3, min: 0, max: 10, step: 0.1, label: 'Intensity' },
      mouseColor: { value: '#ffffff', label: 'Color' },
      mouseDistance: { value: 0.3, min: 0.1, max: 5, step: 0.1, label: 'Distance' },
      mouseRange: { value: 2, min: 0.5, max: 5, step: 0.1, label: 'Range' },
      mouseZ: { value: 0.65, min: -1, max: 2, step: 0.05, label: 'Z Depth' },
    }),
  })

  useFrame(() => {
    if (!lightRef.current || !lights.mouseEnabled) return
    lightRef.current.position.x = mouseState.x * lights.mouseRange
    lightRef.current.position.y = mouseState.y * lights.mouseRange
    lightRef.current.position.z = lights.mouseZ
  })

  const spotProps = { castShadow: true, penumbra: 0.8, angle: 0.5, decay: 2 }

  return (
    <>
      <ambientLight color={lights.ambientColor} intensity={lights.ambientIntensity} />

      <spotLight position={lights.spot1Pos} intensity={lights.spot1Intensity} {...spotProps}
        shadow-mapSize-width={2048} shadow-mapSize-height={2048} />
      <spotLight position={lights.spot2Pos} intensity={lights.spot2Intensity} {...spotProps}
        shadow-mapSize-width={2048} shadow-mapSize-height={2048} />
      <spotLight position={lights.spot3Pos} intensity={lights.spot3Intensity} {...spotProps}
        shadow-mapSize-width={2048} shadow-mapSize-height={2048} />

      {lights.mouseEnabled && (
        <pointLight
          ref={lightRef}
          intensity={lights.mouseIntensity}
          color={lights.mouseColor}
          distance={lights.mouseDistance}
          decay={2}
        />
      )}
    </>
  )
}

function MouseTracker() {
  const { gl } = useThree()

  useEffect(() => {
    const onMove = (e) => {
      const clientX = e.touches ? e.touches[0].clientX : e.clientX
      const clientY = e.touches ? e.touches[0].clientY : e.clientY
      mouseState.x = (clientX / window.innerWidth) * 2 - 1
      mouseState.y = -(clientY / window.innerHeight) * 2 + 1
    }
    const el = gl.domElement
    el.addEventListener('mousemove', onMove)
    el.addEventListener('touchmove', onMove, { passive: true })
    return () => {
      el.removeEventListener('mousemove', onMove)
      el.removeEventListener('touchmove', onMove)
    }
  }, [gl])

  return null
}

function CustomEnvMap() {
  const { scene } = useThree()
  const texture = useTexture('/hdri.webp')

  useEffect(() => {
    texture.mapping = THREE.EquirectangularReflectionMapping
    texture.colorSpace = THREE.SRGBColorSpace
    scene.environment = texture
    return () => { scene.environment = null }
  }, [texture, scene])

  return null
}

function SceneEnvironment() {
  const env = useControls('Environment', {
    source: { value: 'custom', options: ['custom', ...ENV_PRESETS], label: 'Source' },
    intensity: { value: 1.0, min: 0, max: 5, step: 0.1 },
    showBg: { value: false, label: 'Show as Background' },
    bgBlur: { value: 0, min: 0, max: 1, step: 0.05, label: 'Background Blur' },
  })

  if (env.source === 'custom') {
    return <CustomEnvMap />
  }

  return (
    <Environment
      preset={env.source}
      background={env.showBg}
      backgroundBlurriness={env.bgBlur}
      environmentIntensity={env.intensity}
    />
  )
}

let boxIdCounter = 0

function SceneBoxes() {
  const [boxes, setBoxes] = useState([])

  // Add / Export / Clear buttons
  useControls('Boxes', {
    'Add Box': button(() => {
      setBoxes(prev => [...prev, {
        id: ++boxIdCounter,
        pos: [0, 0, 0],
        scale: [0.1, 0.1, 0.1],
        rot: [0, 0, 0],
        color: '#ffffff',
        metalness: 0,
        roughness: 0.5,
        opacity: 1,
        wireframe: false,
      }])
    }),
    'Copy JSON': button(() => {
      const json = JSON.stringify(boxes.map(({ id, ...b }) => b), null, 2)
      navigator.clipboard.writeText(json).then(() => alert('Copied to clipboard!'))
    }),
    'Clear All': button(() => { setBoxes([]); boxIdCounter = 0 }),
  })

  const updateBox = (id, key, val) => {
    setBoxes(prev => prev.map(b => b.id === id ? { ...b, [key]: val } : b))
  }

  const removeBox = (id) => {
    setBoxes(prev => prev.filter(b => b.id !== id))
  }

  return (
    <>
      {boxes.map((box) => (
        <BoxInstance key={box.id} box={box} onChange={updateBox} onRemove={removeBox} />
      ))}
    </>
  )
}

function BoxInstance({ box, onChange, onRemove }) {
  const label = `Box ${box.id}`

  useControls(label, {
    position: { value: box.pos, step: 0.01, label: 'Position',
      onChange: (v) => onChange(box.id, 'pos', v) },
    scale: { value: box.scale, step: 0.01, label: 'Scale',
      onChange: (v) => onChange(box.id, 'scale', v) },
    rotation: { value: box.rot, step: 0.01, label: 'Rotation',
      onChange: (v) => onChange(box.id, 'rot', v) },
    color: { value: box.color, label: 'Color',
      onChange: (v) => onChange(box.id, 'color', v) },
    metalness: { value: box.metalness, min: 0, max: 1, step: 0.01,
      onChange: (v) => onChange(box.id, 'metalness', v) },
    roughness: { value: box.roughness, min: 0, max: 1, step: 0.01,
      onChange: (v) => onChange(box.id, 'roughness', v) },
    opacity: { value: box.opacity, min: 0, max: 1, step: 0.01,
      onChange: (v) => onChange(box.id, 'opacity', v) },
    wireframe: { value: box.wireframe,
      onChange: (v) => onChange(box.id, 'wireframe', v) },
    'Remove': button(() => onRemove(box.id)),
  }, [box.id])

  return (
    <mesh
      position={box.pos}
      scale={box.scale}
      rotation={box.rot}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        color={box.color}
        metalness={box.metalness}
        roughness={box.roughness}
        opacity={box.opacity}
        transparent={box.opacity < 1}
        wireframe={box.wireframe}
      />
    </mesh>
  )
}

const FRAME_DEFAULTS = [
  { pos: [-1.14, 0.36, -2],    scale: [0.6,  0.6,  0.05], color: '#101010', metalness: 0.06, roughness: 1,    opacity: 1 },
  { pos: [0.96,  0.38, -2],    scale: [0.5,  0.5,  0.05], color: '#ffffff', metalness: 1,    roughness: 0.45, opacity: 1 },
  { pos: [-0.95,-0.08, -2.12], scale: [0.45, 0.45, 0.05], color: '#5f606c', metalness: 0,    roughness: 0.5,  opacity: 1 },
  { pos: [-0.76, 0.81, -2.08], scale: [0.35, 0.35, 0.05], color: '#5f606c', metalness: 0,    roughness: 0.5,  opacity: 1 },
  { pos: [0.59,  0,    -1.9],  scale: [0.5,  0.5,  0.1],  color: '#ffffff', metalness: 0,    roughness: 0.5,  opacity: 1 },
]

function Frames() {
  // Build one folder per frame with position/scale/material controls
  const schema = {}
  FRAME_DEFAULTS.forEach((f, i) => {
    schema[`Frame ${i + 1}`] = folder({
      [`f${i}_pos`]:       { value: f.pos,       step: 0.01, label: 'Position' },
      [`f${i}_scale`]:     { value: f.scale,     step: 0.01, label: 'Scale' },
      [`f${i}_color`]:     { value: f.color,                label: 'Color' },
      [`f${i}_metalness`]: { value: f.metalness, min: 0, max: 1, step: 0.01, label: 'Metalness' },
      [`f${i}_roughness`]: { value: f.roughness, min: 0, max: 1, step: 0.01, label: 'Roughness' },
      [`f${i}_opacity`]:   { value: f.opacity,   min: 0, max: 1, step: 0.01, label: 'Opacity' },
    }, { collapsed: true })
  })

  const values = useControls('Frames', {
    ...schema,
    'Copy All Frames JSON': button(() => {
      const data = FRAME_DEFAULTS.map((_, i) => ({
        pos: values[`f${i}_pos`],
        scale: values[`f${i}_scale`],
        color: values[`f${i}_color`],
        metalness: values[`f${i}_metalness`],
        roughness: values[`f${i}_roughness`],
        opacity: values[`f${i}_opacity`],
      }))
      navigator.clipboard.writeText(JSON.stringify(data, null, 2))
        .then(() => alert('Frames JSON copied!'))
    }),
  })

  return (
    <>
      {FRAME_DEFAULTS.map((_, i) => (
        <mesh
          key={i}
          position={values[`f${i}_pos`]}
          scale={values[`f${i}_scale`]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial
            color={values[`f${i}_color`]}
            metalness={values[`f${i}_metalness`]}
            roughness={values[`f${i}_roughness`]}
            opacity={values[`f${i}_opacity`]}
            transparent={values[`f${i}_opacity`] < 1}
          />
        </mesh>
      ))}
    </>
  )
}

export default function Experience() {
  return (
    <>
      <MouseTracker />
      <SceneEnvironment />
      <Lighting />
      <Room />
      <Glasses />
      <Frames />
      <SceneBoxes />
    </>
  )
}

useGLTF.preload(MODEL_URL)
