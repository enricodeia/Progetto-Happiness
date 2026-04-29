import * as THREE from 'three'

// Bioluminescent mushrooms that grow on mouse hover.
// - Two InstancedMeshes (stem + cap), one slot per mushroom.
// - Light pool (point lights are expensive, capped).
// - Object pool of animation slots — no per-spawn allocations.

const DEFAULTS = {
  poolSize: 60,
  maxActiveLights: 8,

  stemHeight: 1.0,
  stemRadiusBase: 0.07,
  stemRadiusMid: 0.04,
  stemRadiusTop: 0.05,
  capRadius: 0.28,
  capHeight: 0.18,

  scaleMin: 0.7,
  scaleMax: 1.3,

  spawnRadius: 0.35,
  minPerSpawn: 1,
  maxPerSpawn: 4,
  minCursorMove: 0.15,
  spawnCooldownMs: 120,

  growDuration: 0.7,
  lifetime: 3.0,
  shrinkDuration: 0.6,
  bounceOvershoot: 1.15,

  yGrowthBias: 1.0,
  xzGrowthBias: 0.7,

  lightIntensityMax: 1.2,
  lightDistance: 2.5,
  lightColor: 0x40e0ff,

  stemColor: 0xe8dcc8,
  capColor: 0x0a2a35,
  capEmissive: 0x40c4ff,
  capEmissiveIntensity: 1.8,

  scale: 1.0, // global scale multiplier on top of per-instance variation
}

function buildStemGeometry(c) {
  const segments = 8
  const heightSegs = 16
  const h = c.stemHeight
  const points = []
  for (let i = 0; i <= heightSegs; i++) {
    const t = i / heightSegs
    let r
    if (t < 0.15) {
      const u = t / 0.15
      r = THREE.MathUtils.lerp(c.stemRadiusBase, c.stemRadiusMid, u * u)
    } else if (t < 0.85) {
      const u = (t - 0.15) / 0.7
      r = THREE.MathUtils.lerp(c.stemRadiusMid, c.stemRadiusMid * 1.05, u)
    } else {
      const u = (t - 0.85) / 0.15
      r = THREE.MathUtils.lerp(c.stemRadiusMid * 1.05, c.stemRadiusTop, u)
    }
    points.push(new THREE.Vector2(r, t * h))
  }
  const g = new THREE.LatheGeometry(points, segments)
  g.computeVertexNormals()
  return g
}

function buildCapGeometry(c) {
  const radialSegs = 24
  const heightSegs = 14
  const R = c.capRadius
  const H = c.capHeight
  const points = []
  for (let i = 0; i <= heightSegs; i++) {
    const t = i / heightSegs
    const r = R * Math.pow(t, 0.75)
    let y
    if (t < 0.85) {
      const u = t / 0.85
      y = H * Math.cos(u * Math.PI * 0.5)
    } else {
      const u = (t - 0.85) / 0.15
      y = -H * 0.45 * u * u
    }
    points.push(new THREE.Vector2(r, y))
  }
  const g = new THREE.LatheGeometry(points, radialSegs)
  g.computeVertexNormals()
  return g
}

const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3)
const easeInCubic = (t) => t * t * t
function easeOutBack(t, overshoot) {
  const c1 = (overshoot - 1) * 10
  const c3 = c1 + 1
  const u = t - 1
  return 1 + c3 * u * u * u + c1 * u * u
}

export default class Mushrooms {
  constructor({ scene, config = {} } = {}) {
    this.scene = scene
    this.config = { ...DEFAULTS, ...config }

    this._enabled = true
    this._lastSpawnPoint = new THREE.Vector3()
    this._hasLastSpawnPoint = false
    this._lastSpawnTime = 0

    // Temps reused in update loop to avoid allocations
    this._m = new THREE.Matrix4()
    this._pos = new THREE.Vector3()
    this._scaleV = new THREE.Vector3()
    this._capOff = new THREE.Vector3()
    this._lightOff = new THREE.Vector3()
    this._tangent = new THREE.Vector3()
    this._bitangent = new THREE.Vector3()
    this._arbitrary = new THREE.Vector3()
    this._tmpQuat = new THREE.Quaternion()
    this._alignQuat = new THREE.Quaternion()
    this._offset = new THREE.Vector3()
    this._up = new THREE.Vector3(0, 1, 0)
    this._hiddenMatrix = new THREE.Matrix4().makeScale(0, 0, 0)

    this._build()
  }

  _build() {
    const c = this.config

    this.stemGeo = buildStemGeometry(c)
    this.capGeo = buildCapGeometry(c)

    this.stemMat = new THREE.MeshStandardMaterial({
      color: c.stemColor,
      roughness: 0.85,
      metalness: 0.0,
    })
    this.capMat = new THREE.MeshStandardMaterial({
      color: c.capColor,
      roughness: 0.35,
      metalness: 0.1,
      emissive: c.capEmissive,
      emissiveIntensity: c.capEmissiveIntensity,
    })

    this.stemInst = new THREE.InstancedMesh(this.stemGeo, this.stemMat, c.poolSize)
    this.capInst = new THREE.InstancedMesh(this.capGeo, this.capMat, c.poolSize)
    this.stemInst.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    this.capInst.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    this.stemInst.count = c.poolSize
    this.capInst.count = c.poolSize
    this.stemInst.frustumCulled = false
    this.capInst.frustumCulled = false
    this.scene.add(this.stemInst, this.capInst)

    // Hide all slots initially
    for (let i = 0; i < c.poolSize; i++) {
      this.stemInst.setMatrixAt(i, this._hiddenMatrix)
      this.capInst.setMatrixAt(i, this._hiddenMatrix)
    }
    this.stemInst.instanceMatrix.needsUpdate = true
    this.capInst.instanceMatrix.needsUpdate = true

    // Light pool
    this.lightPool = []
    for (let i = 0; i < c.maxActiveLights; i++) {
      const l = new THREE.PointLight(c.lightColor, 0, c.lightDistance, 2)
      l.visible = false
      this.scene.add(l)
      this.lightPool.push({ light: l, ownerId: -1 })
    }

    // Mushroom slots
    this.mushrooms = []
    for (let i = 0; i < c.poolSize; i++) {
      this.mushrooms.push({
        id: i,
        active: false,
        position: new THREE.Vector3(),
        quaternion: new THREE.Quaternion(),
        scale: 1.0,
        age: 0,
        lightSlot: null,
      })
    }
  }

  // ─── Public API ───────────────────────────────────────────────

  setEnabled(v) {
    this._enabled = v
    this.stemInst.visible = v
    this.capInst.visible = v
    if (!v) {
      for (const m of this.mushrooms) if (m.active) this._release(m)
    }
  }

  setConfig(patch) {
    Object.assign(this.config, patch)
    if ('capEmissive' in patch) this.capMat.emissive.set(patch.capEmissive)
    if ('capEmissiveIntensity' in patch) this.capMat.emissiveIntensity = patch.capEmissiveIntensity
    if ('capColor' in patch) this.capMat.color.set(patch.capColor)
    if ('stemColor' in patch) this.stemMat.color.set(patch.stemColor)
    if ('lightColor' in patch) {
      for (const l of this.lightPool) l.light.color.set(patch.lightColor)
    }
    if ('lightDistance' in patch) {
      for (const l of this.lightPool) l.light.distance = patch.lightDistance
    }
  }

  /**
   * Attempt to spawn a burst of mushrooms at a world-space hit.
   * @param {THREE.Vector3} point - world position to spawn at
   * @param {THREE.Vector3} normal - surface normal in world space
   */
  trySpawnAt(point, normal) {
    if (!this._enabled) return false
    const now = performance.now()
    const moved = !this._hasLastSpawnPoint ||
      point.distanceTo(this._lastSpawnPoint) > this.config.minCursorMove
    const cooled = now - this._lastSpawnTime > this.config.spawnCooldownMs
    if (!moved || !cooled) return false
    this._spawnBurst(point, normal)
    this._lastSpawnPoint.copy(point)
    this._hasLastSpawnPoint = true
    this._lastSpawnTime = now
    return true
  }

  update(dt) {
    if (!this._enabled) return
    dt = Math.min(0.05, dt)
    let activeCount = 0
    for (const m of this.mushrooms) {
      if (m.active) {
        this._updateOne(m, dt)
        activeCount++
      }
    }
    this.stemInst.instanceMatrix.needsUpdate = true
    this.capInst.instanceMatrix.needsUpdate = true
    this._activeCount = activeCount
  }

  getActiveCount() {
    return this._activeCount ?? 0
  }

  dispose() {
    for (const m of this.mushrooms) if (m.active) this._release(m)
    this.scene.remove(this.stemInst, this.capInst)
    for (const l of this.lightPool) this.scene.remove(l.light)
    this.stemGeo.dispose()
    this.capGeo.dispose()
    this.stemMat.dispose()
    this.capMat.dispose()
  }

  // ─── Internals ────────────────────────────────────────────────

  _findFreeSlot() {
    for (const m of this.mushrooms) if (!m.active) return m
    return null
  }

  _findFreeLight() {
    for (const l of this.lightPool) if (l.ownerId === -1) return l
    return null
  }

  _spawnBurst(point, normal) {
    const c = this.config
    const count = c.minPerSpawn + Math.floor(Math.random() * (c.maxPerSpawn - c.minPerSpawn + 1))

    const n = normal.clone().normalize()

    // Orthonormal basis on the tangent plane
    this._arbitrary.set(0, 1, 0)
    if (Math.abs(n.y) > 0.99) this._arbitrary.set(1, 0, 0)
    this._tangent.crossVectors(this._arbitrary, n).normalize()
    this._bitangent.crossVectors(n, this._tangent).normalize()

    // Rotation to align local +Y with world normal
    this._alignQuat.setFromUnitVectors(this._up, n)

    for (let i = 0; i < count; i++) {
      const slot = this._findFreeSlot()
      if (!slot) break

      const angle = Math.random() * Math.PI * 2
      const r = Math.sqrt(Math.random()) * c.spawnRadius
      this._offset
        .copy(this._tangent).multiplyScalar(Math.cos(angle) * r)
        .addScaledVector(this._bitangent, Math.sin(angle) * r)

      slot.position.copy(point).add(this._offset).addScaledVector(n, 0.001)

      const spin = this._tmpQuat.setFromAxisAngle(n, Math.random() * Math.PI * 2)
      slot.quaternion.copy(spin).multiply(this._alignQuat)

      slot.scale = THREE.MathUtils.lerp(c.scaleMin, c.scaleMax, Math.random())
      slot.age = 0
      slot.active = true

      const lightSlot = this._findFreeLight()
      if (lightSlot) {
        lightSlot.ownerId = slot.id
        lightSlot.light.visible = true
        lightSlot.light.intensity = 0
        slot.lightSlot = lightSlot
      } else {
        slot.lightSlot = null
      }
    }
  }

  _updateOne(m, dt) {
    const c = this.config
    m.age += dt
    const tGrow = c.growDuration
    const tLife = c.lifetime
    const tShrink = c.shrinkDuration

    let sY = 0
    let sXZ = 0
    let lightFactor = 0

    if (m.age < tGrow) {
      const t = m.age / tGrow
      const tY = Math.min(1, t / c.yGrowthBias)
      const tXZ = Math.min(1, t / c.xzGrowthBias * c.xzGrowthBias)
      sY = easeOutBack(Math.min(1, tY), c.bounceOvershoot)
      sXZ = easeOutBack(Math.min(1, tXZ), c.bounceOvershoot * 0.9)
      lightFactor = THREE.MathUtils.clamp((t - 0.4) / 0.6, 0, 1)
      lightFactor = easeOutCubic(lightFactor)
    } else if (m.age < tGrow + tLife) {
      sY = 1; sXZ = 1; lightFactor = 1
    } else if (m.age < tGrow + tLife + tShrink) {
      const t = (m.age - tGrow - tLife) / tShrink
      sY = 1 - easeInCubic(t)
      sXZ = 1 - easeInCubic(t)
      lightFactor = 1 - easeInCubic(t)
    } else {
      this._release(m)
      return
    }

    const baseS = m.scale * c.scale

    // Stem matrix
    this._scaleV.set(baseS * sXZ, baseS * sY, baseS * sXZ)
    this._m.compose(m.position, m.quaternion, this._scaleV)
    this.stemInst.setMatrixAt(m.id, this._m)

    // Cap sits on top of stem along local +Y
    this._capOff.set(0, c.stemHeight * baseS * sY, 0).applyQuaternion(m.quaternion)
    this._pos.copy(m.position).add(this._capOff)
    this._m.compose(this._pos, m.quaternion, this._scaleV)
    this.capInst.setMatrixAt(m.id, this._m)

    if (m.lightSlot) {
      this._lightOff
        .set(0, c.stemHeight * baseS * sY - 0.03 * baseS, 0)
        .applyQuaternion(m.quaternion)
      m.lightSlot.light.position.copy(m.position).add(this._lightOff)
      m.lightSlot.light.intensity = c.lightIntensityMax * lightFactor * baseS
    }
  }

  _release(m) {
    m.active = false
    this.stemInst.setMatrixAt(m.id, this._hiddenMatrix)
    this.capInst.setMatrixAt(m.id, this._hiddenMatrix)
    if (m.lightSlot) {
      m.lightSlot.light.visible = false
      m.lightSlot.light.intensity = 0
      m.lightSlot.ownerId = -1
      m.lightSlot = null
    }
  }
}
