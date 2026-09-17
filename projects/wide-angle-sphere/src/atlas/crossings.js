/**
 * Where does the knot pass under itself?
 *
 * The colour blocks change exactly at those parameters, so the change happens
 * while the band is hidden behind another strand and is never seen. Everything
 * is derived from the curve itself, which means it stays correct when the shape
 * is edited.
 */

/** 2D segment intersection, returning the two curve parameters. */
function intersect(a1, a2, b1, b2) {
  const d = (a2.x - a1.x) * (b2.y - b1.y) - (a2.y - a1.y) * (b2.x - b1.x)
  if (Math.abs(d) < 1e-12) return null
  const s = ((b1.x - a1.x) * (b2.y - b1.y) - (b1.y - a1.y) * (b2.x - b1.x)) / d
  const u = ((b1.x - a1.x) * (a2.y - a1.y) - (b1.y - a1.y) * (a2.x - a1.x)) / d
  if (s < 0 || s > 1 || u < 0 || u > 1) return null
  return { ta: a1.t + (a2.t - a1.t) * s, tb: b1.t + (b2.t - b1.t) * u }
}

/**
 * Curve parameters where the projected path dips behind itself, sorted.
 * `samples` trades accuracy for cost; 1400 resolves a trefoil to ~1e-3.
 */
export function findUnderCrossings(curve, samples = 1400) {
  const pts = []
  for (let i = 0; i <= samples; i++) {
    const t = i / samples
    const p = curve.getPoint(t)
    pts.push({ t, x: p.x, y: p.y, z: p.z })
  }

  const unders = []
  for (let i = 0; i < samples; i++) {
    // Skip neighbouring segments (they always touch) and the closing wrap.
    for (let j = i + 4; j < samples; j++) {
      if (i === 0 && j === samples - 1) continue
      const r = intersect(pts[i], pts[i + 1], pts[j], pts[j + 1])
      if (!r) continue
      const za = curve.getPoint(r.ta).z
      const zb = curve.getPoint(r.tb).z
      const t = za < zb ? r.ta : r.tb
      // One entry per crossing, even if the sampling grazes it twice.
      if (unders.some((u) => Math.min(Math.abs(u - t), 1 - Math.abs(u - t)) < 0.01)) continue
      unders.push(t)
    }
  }
  return unders.sort((a, b) => a - b)
}

/**
 * Boundaries for the colour blocks: one per under-crossing when they can be
 * found, otherwise an even split so the mark still reads.
 */
export function segmentBoundaries(curve, segments) {
  const n = Math.max(2, Math.round(segments.count))
  let bounds
  if (segments.auto) {
    const unders = findUnderCrossings(curve)
    bounds =
      unders.length >= 2
        ? // More colours than crossings: split the longest gaps evenly.
          resample(unders, n)
        : evenSplit(n)
  } else {
    bounds = segments.manual.slice(0, n)
  }
  return bounds.map((b) => (b + segments.offset + 1) % 1).sort((a, b) => a - b)
}

const evenSplit = (n) => Array.from({ length: n }, (_, i) => i / n)

/** Keep the real crossings, then subdivide the widest arcs if more are needed. */
function resample(unders, n) {
  const out = unders.slice(0, n)
  while (out.length < n) {
    out.sort((a, b) => a - b)
    let widest = 0
    let idx = 0
    for (let i = 0; i < out.length; i++) {
      const next = i === out.length - 1 ? out[0] + 1 : out[i + 1]
      const gap = next - out[i]
      if (gap > widest) {
        widest = gap
        idx = i
      }
    }
    const next = idx === out.length - 1 ? out[0] + 1 : out[idx + 1]
    out.push((out[idx] + next) / 2 % 1)
  }
  return out.sort((a, b) => a - b)
}
