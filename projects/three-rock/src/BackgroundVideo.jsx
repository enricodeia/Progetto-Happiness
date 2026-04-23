import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

export default function BackgroundVideo({
  src,
  enabled,
  position,
  rotation,
  width,
  height,
  opacity,
  loopStart,
  loopEnd,
  playbackRate,
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
      try {
        v.currentTime = Math.max(0, loopStartRef.current)
      } catch (e) {}
      v.play().catch(() => {})
      setReady(true)
      forceRender((n) => n + 1)
    }
    const onTime = () => {
      const s = Math.max(0, loopStartRef.current)
      const e = loopEndRef.current
      if (e > s && v.currentTime >= e) {
        v.currentTime = s
      }
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

  if (!enabled || !ready || !textureRef.current) return null

  return (
    <mesh
      position={[position.x, position.y, position.z]}
      rotation={[
        THREE.MathUtils.degToRad(rotation.x),
        THREE.MathUtils.degToRad(rotation.y),
        THREE.MathUtils.degToRad(rotation.z),
      ]}
    >
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial
        map={textureRef.current}
        transparent={opacity < 1}
        opacity={opacity}
        toneMapped={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}
