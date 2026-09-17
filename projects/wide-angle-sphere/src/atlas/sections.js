/**
 * 2D cross-sections that get swept along the knot path.
 *
 * Every generator returns a closed ring of points in section space
 * (x = across the band, y = through its thickness) plus outward normals.
 * Normals are derived from the ring's own tangents, so one code path covers
 * ellipses, rounded rectangles and hard polygons alike.
 */

const TAU = Math.PI * 2

/**
 * Superellipse: |x/a|^n + |y/b|^n = 1.
 * n = 2 is an ellipse (round tube), n >> 2 approaches a rounded rectangle
 * (the flat ribbon of the reference).
 */
function superellipse(segments, a, b, n) {
  const pts = []
  const e = 2 / Math.max(n, 0.2)
  for (let i = 0; i < segments; i++) {
    const th = (i / segments) * TAU
    const c = Math.cos(th)
    const s = Math.sin(th)
    pts.push([Math.sign(c) * Math.abs(c) ** e * a, Math.sign(s) * Math.abs(s) ** e * b])
  }
  return pts
}

/** Regular polygon — deliberately faceted, so face count is visible. */
function polygon(sides, a, b) {
  const pts = []
  const n = Math.max(3, Math.round(sides))
  for (let i = 0; i < n; i++) {
    const th = (i / n) * TAU + Math.PI / n
    pts.push([Math.cos(th) * a, Math.sin(th) * b])
  }
  return pts
}

/**
 * Build a section ring for the given config, inflated by `grow` on every side
 * (used for the outline shell).
 */
export function buildSection(section, grow = 0) {
  const a = Math.max(section.width * 0.5 + grow, 1e-4)
  const b = Math.max(section.thickness * 0.5 + grow, 1e-4)

  const pts =
    section.shape === 'polygon'
      ? polygon(section.sides, a, b)
      : superellipse(Math.max(3, Math.round(section.radialSegments)), a, b, section.squareness)

  const count = pts.length
  const normals = []
  const arcs = [0]
  let perimeter = 0

  for (let i = 0; i < count; i++) {
    const prev = pts[(i - 1 + count) % count]
    const next = pts[(i + 1) % count]
    // Outward normal = section tangent rotated -90°, flipped if it points in.
    let nx = next[1] - prev[1]
    let ny = -(next[0] - prev[0])
    const len = Math.hypot(nx, ny) || 1
    nx /= len
    ny /= len
    if (nx * pts[i][0] + ny * pts[i][1] < 0) {
      nx = -nx
      ny = -ny
    }
    normals.push([nx, ny])
  }

  // Perimeter-proportional V coordinate keeps texel density even around
  // non-circular sections.
  for (let i = 1; i <= count; i++) {
    const prev = pts[i - 1]
    const cur = pts[i % count]
    perimeter += Math.hypot(cur[0] - prev[0], cur[1] - prev[1])
    arcs.push(perimeter)
  }
  const v = arcs.map((d) => (perimeter > 0 ? d / perimeter : 0))

  return { pts, normals, v, count, perimeter }
}
