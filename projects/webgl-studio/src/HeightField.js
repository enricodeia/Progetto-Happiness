import * as THREE from 'three'

// Gaussian hill sum. Mirrors the ice/rice vertex-shader math so JS
// placement (mushrooms, instanced rice) agrees with what's drawn.

export function hillAt(x, z, hills) {
  let h = 0
  for (let i = 0; i < hills.length; i++) {
    const H = hills[i]
    if (!H || !H.enabled || H.height === 0 || H.radius < 0.001) continue
    const dx = x - H.x
    const dz = z - H.z
    const sigma = H.radius * 0.5
    const k = 1 / (2 * sigma * sigma)
    h += H.height * Math.exp(-(dx * dx + dz * dz) * k)
  }
  return h
}

export function hillNormalAt(x, z, hills, out = new THREE.Vector3()) {
  let dhdx = 0
  let dhdz = 0
  for (let i = 0; i < hills.length; i++) {
    const H = hills[i]
    if (!H || !H.enabled || H.height === 0 || H.radius < 0.001) continue
    const dx = x - H.x
    const dz = z - H.z
    const sigma = H.radius * 0.5
    const s2 = sigma * sigma
    const e = Math.exp(-(dx * dx + dz * dz) / (2 * s2))
    dhdx += -H.height * (dx / s2) * e
    dhdz += -H.height * (dz / s2) * e
  }
  return out.set(-dhdx, 1, -dhdz).normalize()
}
