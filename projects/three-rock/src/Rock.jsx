import { useMemo, useRef, useState, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { createNoise2D } from 'simplex-noise'
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js'
import * as THREE from 'three'

const circInOut = (t) =>
  t < 0.5
    ? (1 - Math.sqrt(1 - 4 * t * t)) / 2
    : (Math.sqrt(1 - 4 * (t - 1) * (t - 1)) + 1) / 2
const circIn  = (t) => 1 - Math.sqrt(Math.max(0, 1 - t * t))
const circOut = (t) => Math.sqrt(Math.max(0, 1 - (t - 1) * (t - 1)))

function makeTween(initialValue = 0) {
  return {
    from: initialValue,
    to: initialValue,
    startTime: 0,
    duration: 0,
    easing: (t) => t,
    current: initialValue,
    setTarget(target, durationSec, easing) {
      this.from = this.current
      this.to = target
      this.startTime = performance.now()
      this.duration = Math.max(0.001, durationSec) * 1000
      this.easing = easing
    },
    update() {
      if (this.duration <= 0) return
      const t = Math.min(1, (performance.now() - this.startTime) / this.duration)
      this.current = this.from + (this.to - this.from) * this.easing(t)
    },
  }
}

const SVG_STRING = `<svg width="353" height="354" viewBox="0 0 353 354" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M265.582 266.189L352.398 0H271.002L203.251 203.366L0 270.131V353.156L265.582 266.189Z" fill="white"/>
</svg>`

const SVG_W = 353
const SVG_H = 354

function hexToRgb(hex) {
  const h = hex.replace('#', '')
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ]
}

function createWarpedNoiseCanvas(size, octaves, baseFreq, warpStrength, gamma = 1.2) {
  const c = document.createElement('canvas')
  c.width = c.height = size
  const ctx = c.getContext('2d')
  const img = ctx.createImageData(size, size)
  const n2 = createNoise2D()

  const fbm = (x, y, oct, f0) => {
    let v = 0, a = 1, f = f0, max = 0
    for (let o = 0; o < oct; o++) {
      v += n2(x * f, y * f) * a
      max += a
      a *= 0.5
      f *= 2.03
    }
    return v / max
  }

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size
      const v = y / size
      const wx = fbm(u + 3.7, v + 1.3, 4, baseFreq * 0.6) * warpStrength
      const wy = fbm(u + 8.1, v + 5.9, 4, baseFreq * 0.6) * warpStrength
      const n = fbm(u + wx, v + wy, octaves, baseFreq)
      const val = Math.pow((n + 1) * 0.5, gamma)
      const i = (y * size + x) * 4
      img.data[i] = img.data[i + 1] = img.data[i + 2] = Math.min(255, val * 255)
      img.data[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  return c
}

function canvasToColorPalette(heightCanvas, hexShadow, hexMid, hexHigh) {
  const a = hexToRgb(hexShadow)
  const b = hexToRgb(hexMid)
  const c = hexToRgb(hexHigh)
  const size = heightCanvas.width
  const srcData = heightCanvas.getContext('2d').getImageData(0, 0, size, size).data
  const out = document.createElement('canvas')
  out.width = out.height = size
  const outCtx = out.getContext('2d')
  const outData = outCtx.createImageData(size, size)

  for (let i = 0; i < srcData.length; i += 4) {
    const t = srcData[i] / 255
    let r, g, bl
    if (t < 0.5) {
      const k = t * 2
      r  = a[0] + (b[0] - a[0]) * k
      g  = a[1] + (b[1] - a[1]) * k
      bl = a[2] + (b[2] - a[2]) * k
    } else {
      const k = (t - 0.5) * 2
      r  = b[0] + (c[0] - b[0]) * k
      g  = b[1] + (c[1] - b[1]) * k
      bl = b[2] + (c[2] - b[2]) * k
    }
    outData.data[i]     = r
    outData.data[i + 1] = g
    outData.data[i + 2] = bl
    outData.data[i + 3] = 255
  }
  outCtx.putImageData(outData, 0, 0)
  return out
}

function heightToNormal(src, strength) {
  const size = src.width
  const data = src.getContext('2d').getImageData(0, 0, size, size).data
  const out = document.createElement('canvas')
  out.width = out.height = size
  const outCtx = out.getContext('2d')
  const outData = outCtx.createImageData(size, size)
  const h = (x, y) => {
    x = ((x % size) + size) % size
    y = ((y % size) + size) % size
    return data[(y * size + x) * 4] / 255
  }
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const tl = h(x - 1, y - 1), t = h(x, y - 1), tr = h(x + 1, y - 1)
      const l  = h(x - 1, y),                       r  = h(x + 1, y)
      const bl = h(x - 1, y + 1), b = h(x, y + 1), br = h(x + 1, y + 1)
      const dX = (tr + 2 * r + br) - (tl + 2 * l + bl)
      const dY = (bl + 2 * b + br) - (tl + 2 * t + tr)
      let nx = -dX * strength, ny = -dY * strength, nz = 1
      const L = Math.sqrt(nx * nx + ny * ny + nz * nz)
      nx /= L; ny /= L; nz /= L
      const i = (y * size + x) * 4
      outData.data[i]     = (nx * 0.5 + 0.5) * 255
      outData.data[i + 1] = (ny * 0.5 + 0.5) * 255
      outData.data[i + 2] = (nz * 0.5 + 0.5) * 255
      outData.data[i + 3] = 255
    }
  }
  outCtx.putImageData(outData, 0, 0)
  return out
}

function buildArmGeometry({ depth, bevelSize, bevelThickness, bevelSegments, targetSize }) {
  const loader = new SVGLoader()
  const data = loader.parse(SVG_STRING)
  const shape = data.paths[0].toShapes(true)[0]

  const extrudeSettings = {
    depth,
    bevelEnabled: bevelSize > 0.001,
    bevelThickness,
    bevelSize,
    bevelSegments,
    curveSegments: 2,
    steps: 1,
  }

  const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings)
  geo.translate(-SVG_W / 2, -SVG_H / 2, 0)
  geo.rotateX(Math.PI)
  const scale = targetSize / SVG_W
  geo.scale(scale, scale, scale)

  geo.computeBoundingBox()
  const bb = geo.boundingBox
  geo.translate(0, 0, -(bb.max.z + bb.min.z) / 2)
  geo.computeVertexNormals()
  return geo
}

function Piece({ geometry, material, config, onTrail, onHoverChange, onPieceClick }) {
  // Intro tween: `introProgress` goes 0 → 1. At 0 the piece sits at
  // (default + introOffset / + introRotOffset); at 1 it's at the default
  // position + rotation. Missing fields default to identity so callers that
  // don't wire intros (Version A, etc.) behave as before.
  const progress = typeof config.introProgress === 'number' ? config.introProgress : 1
  const k = 1 - progress
  const off    = config.introOffset    || { x: 0, y: 0, z: 0 }
  const rotOff = config.introRotOffset || { x: 0, y: 0, z: 0 }

  const animatedPos = [
    config.position.x + off.x * k,
    config.position.y + off.y * k,
    config.position.z + off.z * k,
  ]
  const baseRot = [
    THREE.MathUtils.degToRad(config.rotation.x + rotOff.x * k),
    THREE.MathUtils.degToRad(config.rotation.y + rotOff.y * k),
    THREE.MathUtils.degToRad(config.rotation.z + rotOff.z * k),
  ]

  if (!config.enabled) return null

  return (
    <mesh
      geometry={geometry}
      material={material}
      position={animatedPos}
      rotation={baseRot}
      scale={config.scale}
      castShadow
      receiveShadow
      onPointerOver={(e) => {
        e.stopPropagation()
        onHoverChange?.(+1)
      }}
      onPointerOut={(e) => {
        e.stopPropagation()
        onHoverChange?.(-1)
      }}
      onPointerMove={(e) => {
        e.stopPropagation()
        onTrail?.(e.point)
      }}
      onClick={(e) => {
        e.stopPropagation()
        onPieceClick?.()
      }}
    />
  )
}

const TRAIL_SIZE = 512

function createTrailCanvas() {
  const c = document.createElement('canvas')
  c.width = c.height = TRAIL_SIZE
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, TRAIL_SIZE, TRAIL_SIZE)
  return c
}

function installTriplanarShader(material, trailTexture) {
  material.userData.uniforms = {
    uTriplanarOn:     { value: 1 },
    uTriplanarScale:  { value: 0.8 },
    uTrailMap:        { value: trailTexture },
    uTrailOn:         { value: 1 },
    uTrailIntensity:  { value: 2.9 },
    uTrailColor:      { value: new THREE.Color('#b8e8ff') },
    uTrailFresnel:    { value: 4.0 },
    uTrailPattern:    { value: 1.2 },
    uTrailEdge:       { value: 2.5 },
    uTrailShimmer:    { value: 0.6 },
    uTrailCellScale:  { value: 8.0 },
    uTrailWarp:       { value: 0.06 },
    uTrailWarpScale:  { value: 2.5 },
    uTrailSoftness:   { value: 1.6 },
    uTrailActivation: { value: 0 },
    uTrailCenter:     { value: new THREE.Vector2(0, 0) },
    uTrailExtent:     { value: 3.5 },
    uTime:            { value: 0 },
  }

  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, material.userData.uniforms)

    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vWorldPos;
        varying vec3 vWorldNrm;`,
      )
      .replace(
        '#include <worldpos_vertex>',
        `#include <worldpos_vertex>
        vWorldPos = worldPosition.xyz;
        vWorldNrm = normalize(mat3(modelMatrix) * objectNormal);`,
      )

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vWorldPos;
        varying vec3 vWorldNrm;
        uniform float uTriplanarOn;
        uniform float uTriplanarScale;

        uniform sampler2D uTrailMap;
        uniform float uTrailOn;
        uniform float uTrailIntensity;
        uniform vec3  uTrailColor;
        uniform float uTrailFresnel;
        uniform float uTrailPattern;
        uniform float uTrailEdge;
        uniform float uTrailShimmer;
        uniform float uTrailCellScale;
        uniform float uTrailWarp;
        uniform float uTrailWarpScale;
        uniform float uTrailSoftness;
        uniform float uTrailActivation;
        uniform vec2  uTrailCenter;
        uniform float uTrailExtent;
        uniform float uTime;

        vec4 triSample(sampler2D t, vec3 p, vec3 n, float s) {
          vec3 b = pow(abs(n), vec3(4.0));
          b /= dot(b, vec3(1.0)) + 1e-4;
          vec4 cx = texture2D(t, p.yz * s);
          vec4 cy = texture2D(t, p.xz * s);
          vec4 cz = texture2D(t, p.xy * s);
          return cx * b.x + cy * b.y + cz * b.z;
        }

        vec2 _trH2(vec2 p) {
          p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
          return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
        }

        vec2 _trVoronoi(vec2 x) {
          vec2 n = floor(x);
          vec2 f = fract(x);
          float d1 = 8.0;
          float d2 = 8.0;
          for (int j = -1; j <= 1; j++) {
            for (int i = -1; i <= 1; i++) {
              vec2 g = vec2(float(i), float(j));
              vec2 o = 0.5 + 0.5 * _trH2(n + g);
              vec2 r = g + o - f;
              float d = dot(r, r);
              if (d < d1) { d2 = d1; d1 = d; }
              else if (d < d2) { d2 = d; }
            }
          }
          return vec2(sqrt(d1), sqrt(d2));
        }

        float _trValueN(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          float a = dot(_trH2(i),               f);
          float b = dot(_trH2(i + vec2(1,0)),  f - vec2(1,0));
          float c = dot(_trH2(i + vec2(0,1)),  f - vec2(0,1));
          float d = dot(_trH2(i + vec2(1,1)),  f - vec2(1,1));
          return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
        }

        float _trFbm(vec2 p) {
          float v = 0.0;
          float a = 0.5;
          for (int i = 0; i < 4; i++) {
            v += a * _trValueN(p);
            p = p * 2.03 + vec2(1.7, 9.2);
            a *= 0.5;
          }
          return v;
        }`,
      )
      .replace(
        '#include <map_fragment>',
        `#ifdef USE_MAP
          vec4 sampledDiffuseColor;
          if (uTriplanarOn > 0.5) {
            sampledDiffuseColor = triSample(map, vWorldPos, vWorldNrm, uTriplanarScale);
          } else {
            sampledDiffuseColor = texture2D(map, vMapUv);
          }
          diffuseColor *= sampledDiffuseColor;
        #endif`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `float roughnessFactor = roughness;
        #ifdef USE_ROUGHNESSMAP
          vec4 tr;
          if (uTriplanarOn > 0.5) {
            tr = triSample(roughnessMap, vWorldPos, vWorldNrm, uTriplanarScale);
          } else {
            tr = texture2D(roughnessMap, vRoughnessMapUv);
          }
          roughnessFactor *= tr.g;
        #endif

        if (uTrailOn > 0.5) {
          vec2 _tuv = vec2(
            (vWorldPos.x - uTrailCenter.x) / uTrailExtent + 0.5,
            (vWorldPos.y - uTrailCenter.y) / uTrailExtent + 0.5
          );
          if (_tuv.x > 0.0 && _tuv.x < 1.0 && _tuv.y > 0.0 && _tuv.y < 1.0) {
            float _tr = texture2D(uTrailMap, _tuv).r;
            roughnessFactor = mix(roughnessFactor, 0.03, clamp(_tr * 1.5, 0.0, 1.0));
          }
        }`,
      )
      .replace(
        '#include <opaque_fragment>',
        `#ifdef OPAQUE
          diffuseColor.a = 1.0;
        #endif
        #ifdef USE_TRANSMISSION
          diffuseColor.a *= material.transmissionAlpha;
        #endif

        vec3 _outColor = outgoingLight;
        float _outAlpha = diffuseColor.a;

        if (uTrailOn > 0.5) {
          vec2 _baseUV = vec2(
            (vWorldPos.x - uTrailCenter.x) / uTrailExtent + 0.5,
            (vWorldPos.y - uTrailCenter.y) / uTrailExtent + 0.5
          );

          // fbm domain warp for organic edges (ice-like fingers)
          vec2 _warpIn = vWorldPos.xy * uTrailWarpScale + vec2(uTime * 0.08, uTime * -0.06);
          vec2 _warp = vec2(
            _trFbm(_warpIn),
            _trFbm(_warpIn + vec2(43.3, 7.1))
          ) * uTrailWarp;
          vec2 _tuv = _baseUV + _warp;

          if (_tuv.x > 0.0 && _tuv.x < 1.0 && _tuv.y > 0.0 && _tuv.y < 1.0) {
            float _tRaw = texture2D(uTrailMap, _tuv).r;
            // soft falloff: pow > 1 emphasizes core, softens outer halo
            float _t = pow(_tRaw, max(uTrailSoftness, 0.001));

            // gradient of trail → ring-pulse on growing edges (warped too)
            float _eps = 1.5 / 512.0;
            float _gx = texture2D(uTrailMap, _tuv + vec2(_eps, 0.0)).r
                      - texture2D(uTrailMap, _tuv - vec2(_eps, 0.0)).r;
            float _gy = texture2D(uTrailMap, _tuv + vec2(0.0, _eps)).r
                      - texture2D(uTrailMap, _tuv - vec2(0.0, _eps)).r;
            float _edge = length(vec2(_gx, _gy)) * smoothstep(0.0, 0.2, _tRaw);

            // voronoi crystal cells in world space, slow drift with time
            vec2 _vorUV = vWorldPos.xy * uTrailCellScale + vec2(uTime * 0.04, -uTime * 0.025);
            vec2 _vor = _trVoronoi(_vorUV);
            float _cellEdge = 1.0 - smoothstep(0.0, 0.12, _vor.y - _vor.x);
            float _cellCore = smoothstep(0.0, 0.55, _vor.x);

            // shimmer: time-anim pulse across cells
            float _sh = 0.5 + 0.5 * sin(uTime * 3.6 + _vor.x * 22.0 + vWorldPos.x * 4.0);

            // fresnel for edge 3D feel
            vec3 _view = normalize(cameraPosition - vWorldPos);
            float _fres = pow(1.0 - abs(dot(_view, normalize(vWorldNrm))), 2.2);

            // compose
            float _core = _t * (0.30 + uTrailFresnel * _fres);
            float _ring = _edge * uTrailEdge;
            float _pattern = _t * (_cellEdge * 0.9 + _cellCore * 0.2)
                            * uTrailPattern
                            * mix(1.0, _sh, clamp(uTrailShimmer, 0.0, 1.0));

            float _glow = (_core + _ring + _pattern) * uTrailIntensity * uTrailActivation;

            // white highlight on crystal edges inside trail
            vec3 _col = mix(uTrailColor, vec3(1.25), _t * _cellEdge * 0.6);

            _outColor += _col * _glow;
            _outAlpha = clamp(
              _outAlpha + (_t * 0.65 + _edge * uTrailEdge * 0.4) * uTrailIntensity * uTrailActivation,
              0.0, 1.0
            );
          }
        }

        gl_FragColor = vec4(_outColor, _outAlpha);`,
      )
  }
}

export default function Rock({
  depth, bevelSize, bevelThickness, bevelSegments, targetSize,
  colorShadow, colorMid, colorHigh,
  roughness, metalness, normalScale, envIntensity, textureRepeat,
  clearcoat, clearcoatRoughness, sheen, sheenRoughness, sheenColor, ior, aoIntensity,
  anisotropy, anisotropyRotation, emissive, emissiveIntensity,
  reflectivity, clearcoatNormalScale, flatShading,
  glassOn, transmission, thickness, attenuationColor, attenuationDistance,
  dispersion, iridescence, iridescenceIOR, iridescenceMin, iridescenceMax,
  specularIntensity, specularColor, transmissionResScale,
  triplanarOn, triplanarScale,
  trailOn, trailIntensity, trailColor, trailRadius, trailDecay, trailFresnel,
  trailPattern, trailEdge, trailShimmer, trailCellScale,
  trailWarp, trailWarpScale, trailSoftness, trailBrushSoft,
  trailRevealDuration,
  pieces,
  logoOffset, autoCenter,
  onHoverChange: onHoverChangeProp,
  onLogoClick,
  revealOpacity = 1,
}) {
  const geometry = useMemo(
    () => buildArmGeometry({ depth, bevelSize, bevelThickness, bevelSegments, targetSize }),
    [depth, bevelSize, bevelThickness, bevelSegments, targetSize],
  )

  const heightCanvas = useMemo(
    () => createWarpedNoiseCanvas(1024, 6, 4, 0.18, 1.2),
    [],
  )
  const fineHeightCanvas = useMemo(
    () => createWarpedNoiseCanvas(1024, 5, 18, 0.08, 1.0),
    [],
  )
  const normalCanvas = useMemo(
    () => heightToNormal(fineHeightCanvas, 3.2),
    [fineHeightCanvas],
  )
  const colorCanvas = useMemo(
    () => canvasToColorPalette(heightCanvas, colorShadow, colorMid, colorHigh),
    [heightCanvas, colorShadow, colorMid, colorHigh],
  )

  const { colorMap, roughnessMap, normalMap } = useMemo(() => {
    const cMap = new THREE.CanvasTexture(colorCanvas)
    const rMap = new THREE.CanvasTexture(heightCanvas)
    const nMap = new THREE.CanvasTexture(normalCanvas)
    for (const t of [cMap, rMap, nMap]) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping
      t.anisotropy = 16
    }
    cMap.colorSpace = THREE.SRGBColorSpace
    return { colorMap: cMap, roughnessMap: rMap, normalMap: nMap }
  }, [colorCanvas, heightCanvas, normalCanvas])

  useMemo(() => {
    const r = textureRepeat
    colorMap.repeat.set(r, r)
    roughnessMap.repeat.set(r, r)
    normalMap.repeat.set(r, r)
  }, [textureRepeat, colorMap, roughnessMap, normalMap])

  const trailCanvas = useMemo(() => createTrailCanvas(), [])
  const trailCtx = useMemo(() => trailCanvas.getContext('2d'), [trailCanvas])
  const trailTexture = useMemo(() => {
    const tex = new THREE.CanvasTexture(trailCanvas)
    tex.needsUpdate = true
    return tex
  }, [trailCanvas])
  const decayRef = useRef(0.035)

  const material = useMemo(() => {
    const mat = new THREE.MeshPhysicalMaterial({
      map: colorMap,
      roughnessMap,
      normalMap,
      aoMap: roughnessMap,
      normalScale: new THREE.Vector2(normalScale, normalScale),
    })
    installTriplanarShader(mat, trailTexture)
    return mat
  }, [colorMap, roughnessMap, normalMap, trailTexture])

  useFrame((state) => {
    trailCtx.globalCompositeOperation = 'source-over'
    trailCtx.fillStyle = `rgba(0,0,0,${decayRef.current})`
    trailCtx.fillRect(0, 0, TRAIL_SIZE, TRAIL_SIZE)
    trailTexture.needsUpdate = true
    if (material.userData.uniforms) {
      material.userData.uniforms.uTime.value = state.clock.elapsedTime
    }
  })


  useMemo(() => {
    material.roughness = roughness
    material.metalness = metalness
    material.envMapIntensity = envIntensity
    material.normalScale.set(normalScale, normalScale)
    material.clearcoat = clearcoat
    material.clearcoatRoughness = clearcoatRoughness
    material.sheen = sheen
    material.sheenRoughness = sheenRoughness
    material.sheenColor.set(sheenColor)
    material.ior = ior
    material.aoMapIntensity = aoIntensity
    material.anisotropy = anisotropy
    material.anisotropyRotation = anisotropyRotation
    material.emissive.set(emissive)
    material.emissiveIntensity = emissiveIntensity
    material.reflectivity = reflectivity
    material.clearcoatNormalScale = new THREE.Vector2(clearcoatNormalScale, clearcoatNormalScale)
    material.flatShading = flatShading

    if (glassOn) {
      material.transmission = transmission
      material.thickness = thickness
      material.attenuationColor.set(attenuationColor)
      material.attenuationDistance = attenuationDistance
      material.dispersion = dispersion
      material.iridescence = iridescence
      material.iridescenceIOR = iridescenceIOR
      material.iridescenceThicknessRange = [iridescenceMin, iridescenceMax]
      material.specularIntensity = specularIntensity
      material.specularColor.set(specularColor)
      if ('transmissionResolutionScale' in material) {
        material.transmissionResolutionScale = transmissionResScale
      }
    } else {
      material.transmission = 0
      material.thickness = 0
      material.dispersion = 0
      material.iridescence = 0
      material.specularIntensity = 1
      material.specularColor.set('#ffffff')
    }
    material.needsUpdate = true
  }, [material, roughness, metalness, envIntensity, normalScale,
      clearcoat, clearcoatRoughness, sheen, sheenRoughness, sheenColor, ior, aoIntensity,
      anisotropy, anisotropyRotation, emissive, emissiveIntensity,
      reflectivity, clearcoatNormalScale, flatShading,
      glassOn, transmission, thickness, attenuationColor, attenuationDistance,
      dispersion, iridescence, iridescenceIOR, iridescenceMin, iridescenceMax,
      specularIntensity, specularColor, transmissionResScale])

  // Intro opacity reveal: fade from 0 → 1 controlled by parent.
  useMemo(() => {
    const o = Math.max(0, Math.min(1, revealOpacity))
    material.transparent = o < 1
    material.opacity = o
    material.depthWrite = o >= 1
    material.needsUpdate = true
  }, [material, revealOpacity])

  useMemo(() => {
    const u = material.userData.uniforms
    if (!u) return
    u.uTriplanarOn.value = triplanarOn ? 1 : 0
    u.uTriplanarScale.value = triplanarScale
    u.uTrailOn.value = trailOn ? 1 : 0
    u.uTrailIntensity.value = trailIntensity
    u.uTrailColor.value.set(trailColor)
    u.uTrailFresnel.value = trailFresnel
    u.uTrailPattern.value = trailPattern
    u.uTrailEdge.value = trailEdge
    u.uTrailShimmer.value = trailShimmer
    u.uTrailCellScale.value = trailCellScale
    u.uTrailWarp.value = trailWarp
    u.uTrailWarpScale.value = trailWarpScale
    u.uTrailSoftness.value = trailSoftness
    decayRef.current = trailDecay
  }, [material, triplanarOn, triplanarScale,
      trailOn, trailIntensity, trailColor, trailFresnel, trailDecay,
      trailPattern, trailEdge, trailShimmer, trailCellScale,
      trailWarp, trailWarpScale, trailSoftness])

  const centroid = useMemo(() => {
    const enabled = pieces.filter((p) => p.enabled)
    if (enabled.length === 0) return { x: 0, y: 0, z: 0 }
    const sum = enabled.reduce(
      (s, p) => ({ x: s.x + p.position.x, y: s.y + p.position.y, z: s.z + p.position.z }),
      { x: 0, y: 0, z: 0 },
    )
    return { x: sum.x / enabled.length, y: sum.y / enabled.length, z: sum.z / enabled.length }
  }, [pieces])

  const groupPosition = [
    (autoCenter ? -centroid.x : 0) + logoOffset.x,
    (autoCenter ? -centroid.y : 0) + logoOffset.y,
    (autoCenter ? -centroid.z : 0) + logoOffset.z,
  ]

  // Dynamic trail bounds in world space — covers the full logo regardless
  // of piece layout, auto-center, or offset.
  const trailBounds = useMemo(() => {
    const enabled = pieces.filter((p) => p.enabled)
    if (enabled.length === 0) return { centerX: 0, centerY: 0, extent: 3 }
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
    for (const p of enabled) {
      if (p.position.x < minX) minX = p.position.x
      if (p.position.x > maxX) maxX = p.position.x
      if (p.position.y < minY) minY = p.position.y
      if (p.position.y > maxY) maxY = p.position.y
    }
    const halfPiece = 0.78 // approximate piece half-extent relative to targetSize ~ 1.45
    const localCX = (minX + maxX) / 2
    const localCY = (minY + maxY) / 2
    const worldCX = (autoCenter ? localCX - centroid.x : localCX) + logoOffset.x
    const worldCY = (autoCenter ? localCY - centroid.y : localCY) + logoOffset.y
    const spanX = (maxX - minX) + 2 * halfPiece
    const spanY = (maxY - minY) + 2 * halfPiece
    const extent = Math.max(spanX, spanY) * 1.25
    return { centerX: worldCX, centerY: worldCY, extent }
  }, [pieces, autoCenter, centroid, logoOffset])

  useMemo(() => {
    const u = material.userData.uniforms
    if (!u) return
    u.uTrailCenter.value.set(trailBounds.centerX, trailBounds.centerY)
    u.uTrailExtent.value = trailBounds.extent
  }, [material, trailBounds])

  const hoverCountRef = useRef(0)
  const [hovered, setHovered] = useState(false)
  const trailTween = useRef(makeTween(0))

  useEffect(() => {
    trailTween.current.setTarget(
      hovered ? 1 : 0,
      trailRevealDuration,
      hovered ? circIn : circOut,
    )
    onHoverChangeProp?.(hovered)
  }, [hovered, trailRevealDuration, onHoverChangeProp])

  const handleHoverChange = useMemo(() => (delta) => {
    hoverCountRef.current = Math.max(0, hoverCountRef.current + delta)
    setHovered(hoverCountRef.current > 0)
  }, [])

  useFrame(() => {
    trailTween.current.update()
    if (material.userData.uniforms) {
      material.userData.uniforms.uTrailActivation.value = trailTween.current.current
    }
  })

  const trailHandler = useMemo(() => {
    if (!trailOn) return null
    return (worldPoint) => {
      const u = (worldPoint.x - trailBounds.centerX) / trailBounds.extent + 0.5
      const v = (worldPoint.y - trailBounds.centerY) / trailBounds.extent + 0.5
      const cx = u * TRAIL_SIZE
      const cy = (1 - v) * TRAIL_SIZE
      const radius = trailRadius
      const soft = trailBrushSoft ?? 1.0
      const centerAlpha = Math.max(0.15, 0.7 / soft)
      const grad = trailCtx.createRadialGradient(cx, cy, 0, cx, cy, radius)
      grad.addColorStop(0,    `rgba(255,255,255,${centerAlpha.toFixed(3)})`)
      grad.addColorStop(0.15, `rgba(255,255,255,${(centerAlpha * 0.55).toFixed(3)})`)
      grad.addColorStop(0.40, `rgba(255,255,255,${(centerAlpha * 0.22).toFixed(3)})`)
      grad.addColorStop(0.70, `rgba(255,255,255,${(centerAlpha * 0.07).toFixed(3)})`)
      grad.addColorStop(0.90, `rgba(255,255,255,${(centerAlpha * 0.02).toFixed(3)})`)
      grad.addColorStop(1,    'rgba(255,255,255,0)')
      trailCtx.globalCompositeOperation = 'lighter'
      trailCtx.fillStyle = grad
      trailCtx.beginPath()
      trailCtx.arc(cx, cy, radius, 0, Math.PI * 2)
      trailCtx.fill()
    }
  }, [trailOn, trailCtx, trailRadius, trailBrushSoft, trailBounds])

  return (
    <group position={groupPosition}>
      {pieces.map((cfg, i) => (
        <Piece
          key={i}
          geometry={geometry}
          material={material}
          config={cfg}
          onTrail={trailHandler}
          onHoverChange={handleHoverChange}
          onPieceClick={onLogoClick}
        />
      ))}
    </group>
  )
}
