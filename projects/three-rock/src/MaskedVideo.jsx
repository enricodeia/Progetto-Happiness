import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const SVG_W = 353
const SVG_H = 354

const ARM_RAW = [
  [265.582, 266.189],
  [352.398, 0],
  [271.002, 0],
  [203.251, 203.366],
  [0, 270.131],
  [0, 353.156],
]

const circInOut = (t) =>
  t < 0.5
    ? (1 - Math.sqrt(1 - 4 * t * t)) / 2
    : (Math.sqrt(1 - 4 * (t - 1) * (t - 1)) + 1) / 2
const circOut = (t) => Math.sqrt(Math.max(0, 1 - (t - 1) * (t - 1)))
const circIn  = (t) => 1 - Math.sqrt(Math.max(0, 1 - t * t))

function makeTween(v = 0) {
  return {
    from: v, to: v, startTime: 0, duration: 0,
    easing: (t) => t, current: v,
    setTarget(target, secs, ease) {
      this.from = this.current
      this.to = target
      this.startTime = performance.now()
      this.duration = Math.max(0.001, secs) * 1000
      this.easing = ease
    },
    update() {
      if (this.duration <= 0) return
      const t = Math.min(1, (performance.now() - this.startTime) / this.duration)
      this.current = this.from + (this.to - this.from) * this.easing(t)
    },
  }
}

function getArmLocalPoints(targetSize) {
  const scale = targetSize / SVG_W
  return ARM_RAW.map(([x, y]) => ({
    x: (x - SVG_W / 2) * scale,
    y: -(y - SVG_H / 2) * scale,
  }))
}

function buildLogoShapes(pieces, targetSize, centroid, autoCenter, logoOffset) {
  const localPoints = getArmLocalPoints(targetSize)
  const gX = (autoCenter ? -centroid.x : 0) + logoOffset.x
  const gY = (autoCenter ? -centroid.y : 0) + logoOffset.y
  const shapes = []
  for (const piece of pieces) {
    if (!piece.enabled) continue
    const rz = THREE.MathUtils.degToRad(piece.rotation.z)
    const cosR = Math.cos(rz)
    const sinR = Math.sin(rz)
    const px = piece.position.x + gX
    const py = piece.position.y + gY
    const shape = new THREE.Shape()
    localPoints.forEach((pt, i) => {
      const sx = pt.x * piece.scale
      const sy = pt.y * piece.scale
      const rx = sx * cosR - sy * sinR
      const ry = sx * sinR + sy * cosR
      const wx = rx + px
      const wy = ry + py
      if (i === 0) shape.moveTo(wx, wy)
      else shape.lineTo(wx, wy)
    })
    shapes.push(shape)
  }
  return shapes
}

export default function MaskedVideo({
  src, enabled,
  pieces, centroid, autoCenter, logoOffset, targetSize,
  videoWidth, videoHeight, videoZ, fullZ,
  maskOpacity,
  fullOpacityIdle, fullOpacityHover, fullRevealInDuration, fullRevealOutDuration,
  loopStart, loopEnd, playbackRate,
  buttonHovered,
  maskRevealDuration = 1.0,
  maskHidden = false,
  maskHideDuration = 0.3,
  onReady,
}) {
  const videoRef = useRef(null)
  const textureRef = useRef(null)
  const loopStartRef = useRef(loopStart)
  const loopEndRef = useRef(loopEnd)
  const [ready, setReady] = useState(false)
  const [, forceRender] = useState(0)

  useEffect(() => { loopStartRef.current = loopStart }, [loopStart])
  useEffect(() => { loopEndRef.current = loopEnd }, [loopEnd])

  useEffect(() => {
    if (!enabled || !src) {
      setReady(false)
      return
    }
    const v = document.createElement('video')
    v.src = src
    v.crossOrigin = 'anonymous'
    v.loop = false
    v.muted = true
    v.playsInline = true
    v.preload = 'auto'

    const onLoaded = () => {
      try { v.currentTime = Math.max(0, loopStartRef.current) } catch (e) {}
      v.play().catch(() => {})
      setReady(true)
      forceRender((n) => n + 1)
      if (typeof onReady === 'function') onReady()
    }
    const onTime = () => {
      const s = Math.max(0, loopStartRef.current)
      const e = loopEndRef.current
      if (e > s && v.currentTime >= e) v.currentTime = s
    }
    const onEnded = () => {
      v.currentTime = Math.max(0, loopStartRef.current)
      v.play().catch(() => {})
    }

    v.addEventListener('loadeddata', onLoaded)
    v.addEventListener('timeupdate', onTime)
    v.addEventListener('ended', onEnded)

    const tex = new THREE.VideoTexture(v)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.minFilter = THREE.LinearFilter
    tex.magFilter = THREE.LinearFilter

    videoRef.current = v
    textureRef.current = tex
    v.load()

    return () => {
      setReady(false)
      v.pause()
      v.removeEventListener('loadeddata', onLoaded)
      v.removeEventListener('timeupdate', onTime)
      v.removeEventListener('ended', onEnded)
      v.removeAttribute('src')
      try { v.load() } catch (e) {}
      tex.dispose()
      videoRef.current = null
      textureRef.current = null
    }
  }, [src, enabled])

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    v.playbackRate = Math.max(0.1, playbackRate)
  }, [playbackRate])

  const shapes = useMemo(
    () => buildLogoShapes(pieces, targetSize, centroid, autoCenter, logoOffset),
    [pieces, targetSize, centroid, autoCenter, logoOffset],
  )
  const shapeGeometry = useMemo(() => {
    if (!shapes.length) return null
    const geo = new THREE.ShapeGeometry(shapes, 24)
    const pos = geo.attributes.position
    const uvArr = new Float32Array(pos.count * 2)
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const y = pos.getY(i)
      uvArr[i * 2]     = (x + videoWidth  / 2) / videoWidth
      uvArr[i * 2 + 1] = (y + videoHeight / 2) / videoHeight
    }
    geo.setAttribute('uv', new THREE.BufferAttribute(uvArr, 2))
    return geo
  }, [shapes, videoWidth, videoHeight])

  const fullMatRef = useRef()
  const shapeMatRef = useRef()
  const fullOpacityTween = useRef(makeTween(fullOpacityIdle ?? 0))
  const maskRevealTween = useRef(makeTween(0))
  const maskHideTween = useRef(makeTween(1))

  useEffect(() => {
    fullOpacityTween.current.setTarget(
      buttonHovered ? fullOpacityHover : fullOpacityIdle,
      buttonHovered ? fullRevealInDuration : fullRevealOutDuration,
      buttonHovered ? circOut : circIn,
    )
  }, [buttonHovered, fullOpacityIdle, fullOpacityHover, fullRevealInDuration, fullRevealOutDuration])

  useEffect(() => {
    if (ready) maskRevealTween.current.setTarget(1, maskRevealDuration, circOut)
    else maskRevealTween.current.setTarget(0, 0.001, circOut)
  }, [ready, maskRevealDuration])

  useEffect(() => {
    maskHideTween.current.setTarget(maskHidden ? 0 : 1, maskHideDuration, circInOut)
  }, [maskHidden, maskHideDuration])

  useFrame(() => {
    fullOpacityTween.current.update()
    maskRevealTween.current.update()
    maskHideTween.current.update()
    const reveal = maskRevealTween.current.current
    const hide   = maskHideTween.current.current
    if (shapeMatRef.current) {
      const o = maskOpacity * reveal * hide
      shapeMatRef.current.opacity = o
      shapeMatRef.current.transparent = o < 1
    }
    if (fullMatRef.current) {
      fullMatRef.current.opacity = fullOpacityTween.current.current * reveal
    }
  })

  if (!enabled || !ready || !textureRef.current) return null

  return (
    <>
      {/* Rectangular full video — behind logo, reveals on button hover */}
      <mesh position={[0, 0, fullZ]}>
        <planeGeometry args={[videoWidth, videoHeight]} />
        <meshBasicMaterial
          ref={fullMatRef}
          map={textureRef.current}
          transparent
          opacity={0}
          toneMapped={false}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Shape-clipped video through the logo — always visible */}
      {shapeGeometry && (
        <mesh geometry={shapeGeometry} position={[0, 0, videoZ]}>
          <meshBasicMaterial
            ref={shapeMatRef}
            map={textureRef.current}
            transparent
            opacity={0}
            toneMapped={false}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}
    </>
  )
}
