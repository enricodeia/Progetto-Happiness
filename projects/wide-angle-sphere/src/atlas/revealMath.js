/**
 * The reveal, as numbers.
 *
 * One front travels once around the loop. `reveal.progress` (0..1) is the only
 * input; scroll writes it. There are no stages, no holds and no second act —
 * the cards arrive because the front reaches their vertex, which is the same
 * number, so they can never drift out of sync with it.
 */
import { EASINGS } from './defaults.js'

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)

export const SETTLED = { front: 3, edgeFade: 0, seal: 1, progress: 1 }

/**
 * How far past each end the front has to travel.
 *
 * The wave and the grain displace the leading line by up to `waveAmount +
 * grain`, so the front must start that far below 0 for the mark to be
 * genuinely empty, and finish that far past 1 — plus `grow` — for the last
 * millimetre of band to reach full section. Deriving it here rather than
 * hard-coding a margin is why changing the edge shape can never leave a sliver
 * showing at 0 or an unfinished seam at 1.
 */
export function frontRange(r) {
  const slack = r.waveAmount + r.grain + 0.02
  return { start: -slack, end: 1 + r.grow + slack }
}

export function computeReveal(state) {
  const r = state.reveal
  if (!r.enabled) return SETTLED

  const ease = EASINGS[r.ease] ?? EASINGS.linear
  const u = ease(clamp01(r.progress))
  const { start, end } = frontRange(r)
  const front = start + (end - start) * u

  // The last stretch does two things at once: the stripe dies out and the open
  // end swells back to full section, so the loop closes on itself instead of
  // ending on a visible join.
  const closing = clamp01((front - 1) / Math.max(end - 1, 1e-4))

  return {
    front,
    seal: closing,
    // The stripe belongs to the act of materialising. Once the front has run
    // past the closing point there is nothing left to draw, and leaving it on
    // marks the settled mark with a stale smear at the seam.
    edgeFade: 1 - closing,
    progress: u,
  }
}
