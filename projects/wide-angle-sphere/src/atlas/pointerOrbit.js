/**
 * Pointer lean with momentum.
 *
 * The mark leans towards the pointer and springs back past it before settling.
 * That overshoot is the whole point: a plain lerp reads as a sticker following
 * the mouse, a spring reads as mass.
 *
 * Deliberately NOT OrbitControls: there is no drag, no zoom and no inertia you
 * can fling, so the composition the page was designed around cannot be broken
 * by a stray click. It also leaves the wheel entirely to the page, which is
 * what makes the sticky scroll possible at all.
 */
export function createPointerOrbit(state) {
  const target = { x: 0, y: 0 }
  const angle = { x: 0, y: 0 }
  const vel = { x: 0, y: 0 }
  let seen = false

  const onMove = (e) => {
    seen = true
    // Against the viewport, not the canvas: the cards sit on top of it and
    // would otherwise punch dead zones into the field.
    const nx = (e.clientX / window.innerWidth) * 2 - 1
    const ny = (e.clientY / window.innerHeight) * 2 - 1
    target.x = ny // pointer down = lean away from the viewer
    target.y = nx
  }
  const onLeave = () => {
    target.x = 0
    target.y = 0
  }

  window.addEventListener('pointermove', onMove, { passive: true })
  window.addEventListener('pointerleave', onLeave)
  window.addEventListener('blur', onLeave)

  return {
    angle,
    /** Advance the spring. Returns the lean in degrees. */
    update(dt) {
      const p = state.pointer
      const step = Math.min(dt, 1 / 30) // a long frame must not blow the spring up
      const on = p.enabled && seen
      const tx = on ? target.x * p.amount : 0
      const ty = on ? target.y * p.amount : 0

      // Semi-implicit Euler with exponential damping: stable at any frame rate,
      // unlike `v *= 0.9` which silently changes feel between 60 and 120Hz.
      const decay = Math.exp(-p.damping * step)
      vel.x = (vel.x + (tx - angle.x) * p.stiffness * step) * decay
      vel.y = (vel.y + (ty - angle.y) * p.stiffness * step) * decay
      angle.x += vel.x * step
      angle.y += vel.y * step
      return angle
    },
    dispose() {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerleave', onLeave)
      window.removeEventListener('blur', onLeave)
    },
  }
}
