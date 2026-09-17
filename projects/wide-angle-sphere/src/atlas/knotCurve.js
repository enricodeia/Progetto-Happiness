import { Curve, Vector3 } from 'three'

const TAU = Math.PI * 2

/**
 * Harmonic lobed knot — the curve behind classic hand-drawn trefoil marks.
 *
 *   x = sin t + A sin((L-1) t)
 *   y = cos t - A cos((L-1) t)
 *   z = -D sin(L t)
 *
 * L = 3, A = 2 is the textbook trefoil: three round lobes, smooth sinuous
 * crossings, no curvature spike on the inner passes (which is exactly what the
 * (p,q) torus-knot parametrisation gets wrong — its radius swings 3:1 and
 * pinches the inside of the braid).
 *
 * `A` is the real shape dial: low values give a tight rosette, ~2 the balanced
 * trefoil, higher values swing the lobes out and slim the centre hole.
 * Everything is normalised so the outer extent equals `radius`.
 */
export class HarmonicKnotCurve extends Curve {
  constructor({ lobes = 3, amplitude = 2, radius = 2.2, depth = 0.62 } = {}) {
    super()
    this.lobes = Math.max(2, Math.round(lobes))
    this.amplitude = amplitude
    this.radius = radius
    this.depth = depth
  }

  get k() {
    return this.lobes - 1
  }

  /** Scale that maps the curve's own extent onto `radius`. */
  get scale() {
    return this.radius / (1 + Math.abs(this.amplitude))
  }

  getPoint(t, target = new Vector3()) {
    const u = t * TAU
    const { amplitude: A, lobes: L, k } = this
    const s = this.scale
    return target.set(
      (Math.sin(u) + A * Math.sin(k * u)) * s,
      (Math.cos(u) - A * Math.cos(k * u)) * s,
      -Math.sin(L * u) * this.depth * s,
    )
  }

  getTangent(t, target = new Vector3()) {
    const u = t * TAU
    const { amplitude: A, lobes: L, k } = this
    return target
      .set(
        Math.cos(u) + A * k * Math.cos(k * u),
        -Math.sin(u) + A * k * Math.sin(k * u),
        -L * Math.cos(L * u) * this.depth,
      )
      .normalize()
  }
}

/**
 * (p,q) torus knot, matching THREE.TorusKnotGeometry's parametrisation so p/q
 * behave as expected, with a Z squash. Kept as the second curve family: it is
 * the right tool for higher-order knots, less so for an elegant trefoil.
 */
export class TorusKnotCurve extends Curve {
  constructor({ p = 2, q = 3, radius = 2.2, depth = 0.62 } = {}) {
    super()
    this.p = Math.max(1, Math.round(p))
    this.q = Math.max(1, Math.round(q))
    this.radius = radius
    this.depth = depth
  }

  getPoint(t, target = new Vector3()) {
    const u = t * TAU * this.p
    const quOverP = (this.q / this.p) * u
    const cs = Math.cos(quOverP)
    const r = this.radius * (2 + cs) * 0.5
    return target.set(
      r * Math.cos(u),
      r * Math.sin(u),
      this.radius * this.depth * Math.sin(quOverP) * 0.5,
    )
  }

  getTangent(t, target = new Vector3()) {
    const u = t * TAU * this.p
    const k = this.q / this.p
    const quOverP = k * u
    const cs = Math.cos(quOverP)
    const sn = Math.sin(quOverP)
    const r = this.radius * (2 + cs) * 0.5
    const dr = this.radius * -sn * k * 0.5
    const cu = Math.cos(u)
    const su = Math.sin(u)
    return target
      .set(dr * cu - r * su, dr * su + r * cu, this.radius * this.depth * cs * k * 0.5)
      .normalize()
  }
}

/** Build the curve described by the `curve` slice of the state. */
export function createCurve(c) {
  return c.type === 'torus'
    ? new TorusKnotCurve({ p: c.p, q: c.q, radius: c.radius, depth: c.depth })
    : new HarmonicKnotCurve({
        lobes: c.lobes,
        amplitude: c.amplitude,
        radius: c.radius,
        depth: c.depth,
      })
}
