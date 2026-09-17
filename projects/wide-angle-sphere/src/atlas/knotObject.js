import { BufferGeometry, Color, Group, Line, LineBasicMaterial, Mesh, Vector3 } from 'three'
import { buildKnotGeometry } from './knotGeometry.js'
import { createCurve } from './knotCurve.js'
import { findUnderCrossings } from './crossings.js'
import {
  createKnotMaterial,
  createKnotDepthMaterial,
  createRevealUniforms,
  syncKnotMaterial,
} from './knotMaterial.js'
import { computeReveal } from './revealMath.js'

const DEG = Math.PI / 180

/** Expo out. Fast, then a long drift — the reason it reads as elegant. */
const EXPO_OUT = (t) => (t >= 1 ? 1 : 1 - 2 ** (-10 * t))

/**
 * The mark: the swept band in white porcelain, unfolding from its centre line
 * and materialising through the reveal shader. It casts and receives shadows,
 * which is what separates the strands at the crossings now that there is no
 * colour to do it.
 *
 * `curveLine` is a debug polyline of the path, nothing else.
 */
export class KnotObject {
  constructor(state) {
    this.state = state
    this.group = new Group()
    this.lightDir = new Vector3(0.5, 0.7, 0.6)

    // Which card is being hovered, and the highlight it drives. -1 is nobody.
    this.hoverIndex = -1
    this.tint = { index: -1, t: 0, u: 0, spread: 0, amount: 0, color: new Color(0xffffff) }

    this.uniforms = createRevealUniforms()
    this.material = createKnotMaterial(this.uniforms)
    this.mesh = new Mesh(new BufferGeometry(), this.material)
    this.mesh.customDepthMaterial = createKnotDepthMaterial(this.uniforms)
    this.mesh.castShadow = true
    this.mesh.receiveShadow = true
    this.mesh.frustumCulled = false

    this.curveLine = new Line(
      new BufferGeometry(),
      new LineBasicMaterial({ color: 0x1b1a17, transparent: true, opacity: 0.5 }),
    )
    this.curveLine.frustumCulled = false

    this.rebuild()
    this.group.add(this.mesh, this.curveLine)
    this.sync()
  }

  /** Regenerate the band and the anchor. */
  rebuild() {
    const s = this.state
    const curve = createCurve(s.curve)
    this.curve = curve

    this.mesh.geometry.dispose()
    this.mesh.geometry = buildKnotGeometry(s, 0)
    this.stats = this.mesh.geometry.userData.stats

    // Anchoring the reveal on a crossing means it opens and closes where the
    // band is hidden behind another strand, so neither end is ever seen.
    this.crossings = findUnderCrossings(curve)
    if (s.reveal.autoAnchor && this.crossings.length) s.reveal.anchor = this.crossings[0]

    const pts = curve.getPoints(Math.min(2000, Math.round(s.curve.pathSegments)))
    const [cx, cy, cz] = this.stats.centre
    for (const p of pts) p.set(p.x - cx, p.y - cy, p.z - cz)
    this.curveLine.geometry.dispose()
    this.curveLine.geometry = new BufferGeometry().setFromPoints(pts)
  }

  /** World-space point on the curve, for anchoring DOM content to a lobe. */
  pointAt(t, target = new Vector3()) {
    const [cx, cy, cz] = this.stats.centre
    const p = this.curve.getPoint(t)
    target.set(p.x - cx, p.y - cy, p.z - cz)
    this.group.updateMatrixWorld(true)
    return target.applyMatrix4(this.group.matrixWorld)
  }

  /**
   * Live uniform / transform update — safe to call every frame.
   *
   * `tilt` is the pointer lean in degrees. It is the object that turns, not the
   * camera: the key light stays put, so the shading shifts across the form as
   * you move and the mark reads as a solid rather than as a turntable.
   */
  sync(tilt = { x: 0, y: 0 }, dt = 1 / 60) {
    const s = this.state
    this.reveal = computeReveal(s)
    this.syncTint(dt)
    syncKnotMaterial(this.material, s, this.reveal, this.uniforms, this.tint)

    this.curveLine.visible = !!s.debug.showCurve

    const o = s.object
    this.group.rotation.set((o.rotX + tilt.x) * DEG, (o.rotY + tilt.y) * DEG, o.rotZ * DEG)
    this.group.scale.setScalar(o.scale)
  }

  /**
   * Drive the vertex highlight.
   *
   * The colour does not cross-fade in: it SPREADS along the band out of the
   * chip, because `spread` drives the highlight's reach along the path while
   * the strength comes up almost immediately. Fading a static band in and out
   * reads as a lamp being switched; growing it out of the vertex reads as the
   * strand answering.
   *
   * One expo-out curve, run forwards to open and backwards to close, so
   * reversing mid-flight is continuous — two different curves would make the
   * value jump the instant the pointer changed its mind.
   *
   * There is one highlight slot, so moving from one card to another runs the
   * current one home BEFORE adopting the next: crossfading a single slot would
   * slide the colour along the band from one lobe to the other, which reads as
   * a bug rather than as two separate answers to two separate cards.
   */
  syncTint(dt) {
    const cfg = this.state.cards
    const items = cfg.items
    const want = this.hoverIndex >= 0 && this.hoverIndex < items.length ? this.hoverIndex : -1
    const t = this.tint
    const step = Math.min(dt, 0.1)

    if (want !== t.index) {
      t.u = Math.max(0, t.u - step / Math.max(cfg.tintOut, 1e-3))
      if (t.u <= 0) {
        t.u = 0
        t.index = want
        if (want >= 0) {
          t.t = items[want].t
          t.color.set(items[want].color)
        }
      }
    } else if (want >= 0) {
      t.u = Math.min(1, t.u + step / Math.max(cfg.tintIn, 1e-3))
    }

    t.spread = EXPO_OUT(t.u)
    // Strength arrives well ahead of the reach: at half spread a half-strength
    // colour is just a grey wash, and the travel is the thing worth watching.
    t.amount = Math.min(1, t.spread * 3)
  }

  dispose() {
    this.mesh.geometry.dispose()
    this.curveLine.geometry.dispose()
    this.material.dispose()
    this.mesh.customDepthMaterial.dispose()
    this.curveLine.material.dispose()
  }
}
