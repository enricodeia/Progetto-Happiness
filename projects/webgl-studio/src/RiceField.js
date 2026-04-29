import * as THREE from 'three'

// Single tapered-ribbon blade, shared across all instances.
function createBladeGeometry(segments = 3) {
  const positions = []
  const uvs = []
  const indices = []
  for (let i = 0; i <= segments; i++) {
    const t = i / segments
    positions.push(-0.5, t, 0)
    positions.push(0.5, t, 0)
    uvs.push(0, t)
    uvs.push(1, t)
  }
  for (let i = 0; i < segments; i++) {
    const a = i * 2
    const b = a + 1
    const c = a + 2
    const d = a + 3
    indices.push(a, b, c, b, d, c)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  g.setIndex(indices)
  return g
}

const vertexShader = /* glsl */ `
attribute vec3 instancePosition;
attribute float instanceScale;
attribute float instanceRotation;
attribute float instanceDarkness;
attribute float instanceCurl;
attribute float instanceHue;

uniform float uTime;
uniform float uBladeHeight;
uniform float uBladeWidth;
uniform float uWindStrength;
uniform float uWindScale;
uniform float uTrailBend;
uniform float uFieldSize;
uniform vec3 uMouseWorld;
uniform float uHoverRadius;
uniform float uHoverAmount;
uniform float uHoverEnabled;
uniform float uNaturalCurl;
uniform vec4 uHills[4];
uniform sampler2D uTrailMap;
uniform sampler2D uNoise;

varying float vT;
varying float vDarkness;
varying float vTrail;
varying float vHue;
varying float vFogDepth;

float hillAt(vec2 xz) {
  float h = 0.0;
  for (int i = 0; i < 4; i++) {
    vec4 H = uHills[i];
    if (H.w < 0.001 || H.z == 0.0) continue;
    vec2 d = xz - H.xy;
    float sigma = H.w * 0.5;
    h += H.z * exp(-dot(d, d) / (2.0 * sigma * sigma));
  }
  return h;
}

void main() {
  float t = position.y;
  vT = t;
  vDarkness = instanceDarkness;
  vHue = instanceHue;

  // Width taper — fatter near base, thinner at tip
  float w = uBladeWidth * (1.0 - smoothstep(0.35, 1.0, t)) * (0.85 + 0.3 * instanceScale);
  vec3 local = vec3(position.x * w, t * uBladeHeight * instanceScale, 0.0);

  // Natural forward curl (J-shape) — per-blade strength
  float curlT = t * t;
  local.z += curlT * instanceCurl * uNaturalCurl;

  // Rotate around Y
  float c = cos(instanceRotation);
  float s = sin(instanceRotation);
  local = vec3(c * local.x + s * local.z, local.y, -s * local.x + c * local.z);

  // Sit each blade on top of the hills at its XZ
  vec3 instPos = instancePosition;
  instPos.y += hillAt(instPos.xz);

  vec3 world = local + instPos;

  // Trail sample at blade's world XZ
  vec2 trailUV = world.xz / uFieldSize + 0.5;
  float trail = 0.0;
  if (trailUV.x > 0.0 && trailUV.x < 1.0 && trailUV.y > 0.0 && trailUV.y < 1.0) {
    trail = texture2D(uTrailMap, trailUV).r;
  }
  vTrail = trail;

  // Primary wind (slow, large scale)
  vec2 windUV = world.xz / uWindScale + vec2(uTime * 0.05, uTime * 0.03);
  vec3 windSample = texture2D(uNoise, windUV).rgb;
  float windX = (windSample.r - 0.5) * 2.0;
  float windZ = (windSample.g - 0.5) * 2.0;

  // Secondary micro-wind (fast, tiny amplitude — gives life even when still)
  vec2 microUV = world.xz * 0.4 + vec2(uTime * 0.6, uTime * 0.4);
  vec3 microSample = texture2D(uNoise, microUV).rgb;
  float microX = (microSample.r - 0.5) * 2.0;
  float microZ = (microSample.g - 0.5) * 2.0;

  float bend = t * t * uWindStrength;
  float microBend = t * uWindStrength * 0.12;
  float trailCut = smoothstep(0.1, 0.6, trail) * uTrailBend;

  // Hover proximity shrink
  float mouseDist = distance(instancePosition.xz, uMouseWorld.xz);
  float hoverMask = (1.0 - smoothstep(0.0, uHoverRadius, mouseDist)) * uHoverEnabled;
  float hoverShrink = hoverMask * uHoverAmount;

  float bladeScaleY = (1.0 - trailCut * 0.9) * (1.0 - hoverShrink);

  world.y = instPos.y + t * uBladeHeight * instanceScale * bladeScaleY;
  world.x += windX * bend + microX * microBend + windX * t * trailCut * 0.4;
  world.z += windZ * bend + microZ * microBend + windZ * t * trailCut * 0.4;

  vec4 viewPos = viewMatrix * vec4(world, 1.0);
  vFogDepth = -viewPos.z;
  gl_Position = projectionMatrix * viewPos;
}
`

const fragmentShader = /* glsl */ `
uniform vec3 uBaseColor;
uniform vec3 uTipColor;
uniform float uTrailCutAmount;
uniform float uTipBoost;
uniform vec3 uFogColor;
uniform float uFogNear;
uniform float uFogFar;
uniform float uFogEnabled;

varying float vT;
varying float vDarkness;
varying float vTrail;
varying float vHue;
varying float vFogDepth;

void main() {
  // Easing the gradient so it's not a linear blur — weighted toward tip
  float g = smoothstep(0.15, 1.0, vT);
  vec3 color = mix(uBaseColor, uTipColor, g);

  // AO at the base — darken root
  float ao = smoothstep(0.0, 0.25, vT);
  color *= mix(0.55, 1.0, ao);

  // Sharp tip highlight
  float tipHi = pow(vT, 6.0) * uTipBoost;
  color += tipHi * uTipColor * 0.8;

  // Per-blade darkness + small hue shift (green <-> yellow tilt)
  color *= vDarkness;
  color.r *= 1.0 + vHue * 0.18;
  color.g *= 1.0 - vHue * 0.08;

  // Trail cut: darken blades flattened by the trail
  float cut = smoothstep(0.1, 0.6, vTrail) * uTrailCutAmount;
  color = mix(color, color * 0.4, cut);

  gl_FragColor = vec4(color, 1.0);

  float fogFactor = smoothstep(uFogNear, uFogFar, vFogDepth) * uFogEnabled;
  gl_FragColor.rgb = mix(gl_FragColor.rgb, uFogColor, fogFactor);

  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`

export default class RiceField {
  constructor({ scene, params, fieldSize = 40 }) {
    this.scene = scene
    this.params = params
    this.fieldSize = fieldSize
    this._build()
  }

  _build() {
    const target = this.params.riceCount
    const base = createBladeGeometry(5)

    const geo = new THREE.InstancedBufferGeometry()
    geo.setAttribute('position', base.getAttribute('position'))
    geo.setAttribute('uv', base.getAttribute('uv'))
    geo.setIndex(base.getIndex())

    // Rejection-sample inside the disc radius so density stays uniform.
    const radius = this.params.riceDiscRadius
    const r2 = radius * radius
    const posList = []
    const scaleList = []
    const rotList = []
    const darkList = []
    const curlList = []
    const hueList = []
    let attempts = 0
    const maxAttempts = target * 8
    while (posList.length / 3 < target && attempts < maxAttempts) {
      attempts++
      const x = (Math.random() * 2 - 1) * radius
      const z = (Math.random() * 2 - 1) * radius
      if (x * x + z * z > r2) continue
      posList.push(x, 0, z)
      scaleList.push(0.7 + Math.random() * 0.6)
      rotList.push(Math.random() * Math.PI * 2)
      darkList.push(0.5 + Math.random() * 0.8)
      curlList.push(0.6 + Math.random() * 0.8)
      hueList.push((Math.random() - 0.5) * 2)
    }
    const count = posList.length / 3
    const instancePos = new Float32Array(posList)
    const instanceScale = new Float32Array(scaleList)
    const instanceRot = new Float32Array(rotList)
    const instanceDark = new Float32Array(darkList)
    const instanceCurl = new Float32Array(curlList)
    const instanceHue = new Float32Array(hueList)

    geo.instanceCount = count
    geo.setAttribute('instancePosition', new THREE.InstancedBufferAttribute(instancePos, 3))
    geo.setAttribute('instanceScale', new THREE.InstancedBufferAttribute(instanceScale, 1))
    geo.setAttribute('instanceRotation', new THREE.InstancedBufferAttribute(instanceRot, 1))
    geo.setAttribute('instanceDarkness', new THREE.InstancedBufferAttribute(instanceDark, 1))
    geo.setAttribute('instanceCurl', new THREE.InstancedBufferAttribute(instanceCurl, 1))
    geo.setAttribute('instanceHue', new THREE.InstancedBufferAttribute(instanceHue, 1))

    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      side: THREE.DoubleSide,
      uniforms: {
        uTime: new THREE.Uniform(0),
        uBladeHeight: new THREE.Uniform(this.params.riceBladeHeight),
        uBladeWidth: new THREE.Uniform(this.params.riceBladeWidth),
        uWindStrength: new THREE.Uniform(this.params.riceWindStrength),
        uWindScale: new THREE.Uniform(this.params.riceWindScale),
        uTrailBend: new THREE.Uniform(this.params.riceTrailBend),
        uTrailCutAmount: new THREE.Uniform(this.params.riceTrailCutAmount),
        uFieldSize: new THREE.Uniform(this.fieldSize),
        uMouseWorld: new THREE.Uniform(new THREE.Vector3(9999, 0, 9999)),
        uHoverRadius: new THREE.Uniform(this.params.riceHoverRadius),
        uHoverAmount: new THREE.Uniform(this.params.riceHoverAmount),
        uHoverEnabled: new THREE.Uniform(this.params.riceHoverEnabled ? 1 : 0),
        uNaturalCurl: new THREE.Uniform(this.params.riceNaturalCurl ?? 0.25),
        uTipBoost: new THREE.Uniform(this.params.riceTipBoost ?? 0.6),
        uHills: { value: Array.from({ length: 4 }, () => new THREE.Vector4(0, 0, 0, 0)) },
        uFogColor: new THREE.Uniform(new THREE.Color(this.params.fogColor.r, this.params.fogColor.g, this.params.fogColor.b)),
        uFogNear: new THREE.Uniform(this.params.fogNear),
        uFogFar: new THREE.Uniform(this.params.fogFar),
        uFogEnabled: new THREE.Uniform(this.params.fogEnabled ? 1 : 0),
        uTrailMap: new THREE.Uniform(null),
        uNoise: new THREE.Uniform(null),
        uBaseColor: new THREE.Uniform(new THREE.Color(this.params.riceBaseColor)),
        uTipColor: new THREE.Uniform(new THREE.Color(this.params.riceTipColor)),
      },
    })

    this.mesh = new THREE.Mesh(geo, this.material)
    this.mesh.frustumCulled = false
    this.mesh.visible = this.params.riceEnabled
    this.scene.add(this.mesh)
  }

  setTrailTexture(tex) {
    if (this.material) this.material.uniforms.uTrailMap.value = tex
  }

  setNoiseTexture(tex) {
    if (this.material) this.material.uniforms.uNoise.value = tex
  }

  setMouseWorld(pos) {
    if (this.material) this.material.uniforms.uMouseWorld.value.copy(pos)
  }

  clearMouseWorld() {
    if (this.material) this.material.uniforms.uMouseWorld.value.set(9999, 0, 9999)
  }

  update(time) {
    if (this.material) this.material.uniforms.uTime.value = time
  }

  setVisible(v) {
    if (this.mesh) this.mesh.visible = v
  }

  rebuild() {
    if (this.mesh) {
      this.scene.remove(this.mesh)
      this.mesh.geometry.dispose()
      this.material.dispose()
      this.mesh = null
    }
    this._build()
  }
}
