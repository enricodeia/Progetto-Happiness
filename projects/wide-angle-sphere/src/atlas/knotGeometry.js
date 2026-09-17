import { BufferAttribute, BufferGeometry, Vector3 } from 'three'
import { createCurve } from './knotCurve.js'
import { buildSection } from './sections.js'

const TAU = Math.PI * 2
const UP = { x: new Vector3(1, 0, 0), y: new Vector3(0, 1, 0), z: new Vector3(0, 0, 1) }

/**
 * Frames along the path.
 *
 * - `up`   : the section is oriented against a fixed world axis, so the band
 *            keeps facing the camera all the way round (this is what makes the
 *            reference read as a flat ribbon rather than a twisting tube).
 * - `frenet`: parallel-transported normal, i.e. the section follows the curve's
 *            own torsion.
 *
 * Both fall back to the previous frame when the reference direction becomes
 * degenerate, which keeps the ribbon from flipping.
 */
function buildFrames(curve, samples, mode, upAxis) {
  const tangents = []
  const xAxes = []
  const yAxes = []
  const up = UP[upAxis] || UP.z

  for (let i = 0; i <= samples; i++) {
    tangents.push(curve.getTangent(i / samples))
  }

  let prevX = null
  for (let i = 0; i <= samples; i++) {
    const T = tangents[i]
    let X = new Vector3()

    if (mode === 'frenet' && prevX) {
      // Parallel transport: project the previous X onto the new normal plane.
      X.copy(prevX).addScaledVector(T, -prevX.dot(T))
      if (X.lengthSq() < 1e-10) X.crossVectors(up, T)
    } else {
      X.crossVectors(up, T)
      if (X.lengthSq() < 1e-8) {
        // Tangent parallel to the up axis: reuse the last good frame.
        X = prevX ? prevX.clone().addScaledVector(T, -prevX.dot(T)) : new Vector3(1, 0, 0)
      }
    }

    if (X.lengthSq() < 1e-10) X.set(1, 0, 0)
    X.normalize()
    const Y = new Vector3().crossVectors(T, X).normalize()
    xAxes.push(X)
    yAxes.push(Y)
    prevX = X
  }

  // Close the loop smoothly: distribute the residual twist between the first
  // and last frame over the whole path (classic closed-tube correction).
  if (mode === 'frenet') {
    const first = xAxes[0]
    const last = xAxes[samples]
    let theta = Math.acos(Math.min(1, Math.max(-1, first.dot(last))))
    if (theta > 1e-6) {
      if (tangents[samples].dot(new Vector3().crossVectors(first, last)) > 0) theta = -theta
      for (let i = 1; i <= samples; i++) {
        const a = (theta * i) / samples
        xAxes[i].applyAxisAngle(tangents[i], a).normalize()
        yAxes[i].crossVectors(tangents[i], xAxes[i]).normalize()
      }
    }
  }

  return { tangents, xAxes, yAxes }
}

/**
 * Sweep a section along the knot and return an indexed BufferGeometry with
 * position / normal / uv and an extra `aArc` attribute (normalised arc length,
 * so gradients and dots can advance at a constant speed in space).
 *
 * @param {object} cfg   full state object
 * @param {number} grow  inflate the section on every side (outline shell)
 */
export function buildKnotGeometry(cfg, grow = 0) {
  const { curve: c, section: s } = cfg
  const rings = Math.max(8, Math.round(c.pathSegments))
  const curve = createCurve(c)

  const sec = buildSection(s, grow)
  const ringVerts = sec.count + 1 // duplicated seam vertex for a clean UV wrap
  const total = (rings + 1) * ringVerts

  const position = new Float32Array(total * 3)
  const normal = new Float32Array(total * 3)
  const uv = new Float32Array(total * 2)
  const aArc = new Float32Array(total)
  // The path point each vertex hangs off, so the band can be collapsed back to
  // its centre line in the vertex shader and unfold from it.
  const aCentre = new Float32Array(total * 3)
  const aT = new Float32Array(total)
  const aV = new Float32Array(total)

  const points = []
  for (let i = 0; i <= rings; i++) points.push(curve.getPoint(i / rings))

  // Centre on the curve's arc-length-weighted centroid, not its bounding box:
  // a 3-fold symmetric knot has an off-centre bbox (like an equilateral
  // triangle), and centring on it would push the mark off its own symmetry
  // axis. The centroid is computed from the curve alone, so the band and the
  // inflated outline shell always share the exact same offset.
  const centre = new Vector3()
  let weight = 0
  for (let i = 0; i < rings; i++) {
    const seg = points[i].distanceTo(points[i + 1])
    centre.addScaledVector(points[i].clone().add(points[i + 1]).multiplyScalar(0.5), seg)
    weight += seg
  }
  centre.multiplyScalar(1 / (weight || 1))
  for (const P of points) P.sub(centre)

  // Cumulative arc length (measured on the polyline, closed).
  const arc = new Float32Array(rings + 1)
  for (let i = 1; i <= rings; i++) arc[i] = arc[i - 1] + points[i].distanceTo(points[i - 1])
  const totalLength = arc[rings] || 1

  const { xAxes, yAxes } = buildFrames(curve, rings, s.frame, s.upAxis)

  let w = 0
  for (let i = 0; i <= rings; i++) {
    const t = i / rings
    const P = points[i]
    const X = xAxes[i]
    const Y = yAxes[i]
    const ang = (s.twist * t + s.roll) * TAU
    const ca = Math.cos(ang)
    const sa = Math.sin(ang)
    const u = t * s.uvRepeat
    const arcN = arc[i] / totalLength

    for (let j = 0; j <= sec.count; j++) {
      const k = j % sec.count
      const [px, py] = sec.pts[k]
      const [nx, ny] = sec.normals[k]
      // Rotate the section in its own plane (twist + constant roll).
      const rx = px * ca - py * sa
      const ry = px * sa + py * ca
      const rnx = nx * ca - ny * sa
      const rny = nx * sa + ny * ca

      const o = w * 3
      position[o] = P.x + X.x * rx + Y.x * ry
      position[o + 1] = P.y + X.y * rx + Y.y * ry
      position[o + 2] = P.z + X.z * rx + Y.z * ry
      normal[o] = X.x * rnx + Y.x * rny
      normal[o + 1] = X.y * rnx + Y.y * rny
      normal[o + 2] = X.z * rnx + Y.z * rny
      uv[w * 2] = u
      uv[w * 2 + 1] = sec.v[j]
      aArc[w] = arcN
      aCentre[o] = P.x
      aCentre[o + 1] = P.y
      aCentre[o + 2] = P.z
      aT[w] = t
      aV[w] = sec.v[j]
      w++
    }
  }

  const indices = new (total > 65535 ? Uint32Array : Uint16Array)(rings * sec.count * 6)
  let ii = 0
  for (let i = 0; i < rings; i++) {
    for (let j = 0; j < sec.count; j++) {
      const a = i * ringVerts + j
      const b = a + 1
      const d = (i + 1) * ringVerts + j
      const e = d + 1
      // Wound so the outward-facing side is the front face: the section ring
      // runs counter-clockwise in (X,Y) and X x Y = T, so (a,b,d) gives an
      // outward normal. Getting this backwards would invert the outline shell.
      indices[ii++] = a
      indices[ii++] = b
      indices[ii++] = d
      indices[ii++] = b
      indices[ii++] = e
      indices[ii++] = d
    }
  }

  const geo = new BufferGeometry()
  geo.setAttribute('position', new BufferAttribute(position, 3))
  geo.setAttribute('normal', new BufferAttribute(normal, 3))
  geo.setAttribute('uv', new BufferAttribute(uv, 2))
  geo.setAttribute('aArc', new BufferAttribute(aArc, 1))
  geo.setAttribute('aCentre', new BufferAttribute(aCentre, 3))
  geo.setAttribute('aT', new BufferAttribute(aT, 1))
  geo.setAttribute('aV', new BufferAttribute(aV, 1))
  geo.setIndex(new BufferAttribute(indices, 1))
  geo.computeBoundingSphere()

  geo.userData.rings = rings
  geo.userData.ringVerts = ringVerts
  geo.userData.stats = {
    rings,
    sectionVerts: sec.count,
    vertices: total,
    triangles: rings * sec.count * 2,
    length: totalLength,
    perimeter: sec.perimeter,
    centre: centre.toArray(),
  }
  return geo
}
