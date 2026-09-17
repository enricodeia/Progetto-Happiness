/**
 * Single source of truth for every tunable.
 *
 * The whole object is plain JSON: the panel binds directly to it, presets are a
 * structuredClone of it, and nothing in the render code keeps a second copy.
 * Anything under `curve` / `section` rebuilds geometry; everything else is a
 * live uniform or transform.
 *
 * There is exactly ONE animation in this piece — the reveal — and exactly one
 * number that drives it: `reveal.progress`, 0 to 1. Scroll writes it. That is
 * the whole clock.
 */

export const PALETTE = {
  paper: '#EEE9E2',
  porcelain: '#ffffff',
  ink: '#1b1a17',
}

export const DEFAULTS = {
  scene: {
    background: PALETTE.paper,
    dpr: 2,
    toneMapping: 'neutral',
    exposure: 1.0,
    // Deliberately low: the environment is unshadowed, so a bright one fills
    // the shadows back in and the white form goes flat.
    envIntensity: 0.22,
  },

  camera: {
    fov: 30,
    distance: 13.6,
    autoFit: true,
    padding: 0.36, // margin left around the mark when fitting, room for the cards
    offsetX: 0, // world units — pans the fit composition sideways in the frame
    offsetY: 0, // ...and vertically: positive moves the mark DOWN the frame
  },

  /**
   * The only motion the mark has once it is revealed: it leans towards the
   * pointer and springs back. No auto-rotation, no idle loop, and no drag —
   * the camera is not yours to move, so the composition can never be broken.
   */
  pointer: {
    enabled: true,
    amount: 9, // degrees at the edge of the viewport
    stiffness: 26, // how hard it is pulled towards the pointer
    damping: 7.5, // lower = more overshoot and a longer settle
  },

  object: {
    rotX: 0,
    rotY: 0,
    rotZ: 0,
    scale: 1.0,
  },

  curve: {
    type: 'harmonic', // harmonic = sinuous lobed trefoil | torus = (p,q) torus knot
    lobes: 3,
    amplitude: 2.0, // lobe swing; the centre hole is radius·(A-1)/(A+1)
    p: 2,
    q: 3,
    radius: 2.2,
    depth: 0.55, // Z squash: enough separation for the crossings to read
    pathSegments: 1100,
  },

  section: {
    shape: 'superellipse', // superellipse | polygon
    radialSegments: 28,
    sides: 5,
    width: 0.32,
    thickness: 0.11, // its lit side face is what reads at a crossing
    squareness: 3.2,
    frame: 'up', // up = the band keeps facing the up axis | frenet
    upAxis: 'z',
    twist: 0.0,
    roll: 0.0,
    uvRepeat: 1.0,
  },

  /**
   * White porcelain. With no colour to carry the form, everything is light:
   * a studio environment for the soft falloff across the rounded edges, one
   * key light for self-shadowing at the crossings, and a rim to lift the
   * silhouette off the paper.
   */
  material: {
    color: PALETTE.porcelain,
    roughness: 0.42,
    metalness: 0.0,
    clearcoat: 0.35,
    clearcoatRoughness: 0.5,
    sheen: 0.0,
    rim: 0.16, // fresnel lift along the silhouette
    rimPower: 3.4,
    rimColor: '#ffffff',
  },

  light: {
    keyIntensity: 3.4,
    keyAzimuth: -22,
    keyElevation: 28,
    fillIntensity: 0.03,
    shadows: true,
    shadowSoftness: 2.0, // blur radius of the soft shadow map
    shadowBias: -0.0006,
    shadowOpacity: 1.0,
  },

  /**
   * The reveal. One front travels once around the loop; the band grows out of
   * its own centre line behind it and a two-tone edge rides on it.
   *
   * `progress` is the clock: 0 = nothing, 1 = the closed mark. Everything else
   * here is shape, not timing.
   */
  reveal: {
    enabled: true,
    progress: 0,
    ease: 'linear', // scroll already has a feel of its own; don't fight it
    anchor: 0.0431, // where the band opens and closes (an under-crossing)
    autoAnchor: true, // keep the anchor on a crossing when the curve changes

    // How far behind the front the band takes to reach full section. This is
    // the whole "materialising" gesture, measured along the path.
    grow: 0.035,

    // The front is not a straight cut across the band: it is a wave running
    // around the section, so the band opens like liquid rather than like a
    // guillotine. `turns` must stay whole or the wave breaks at the seam.
    waveAmount: 0.03,
    waveTurns: 3,

    // Optional tooth on top of the wave. Low by default: this is texture, not
    // the effect. Push it and the edge frays.
    grain: 0.01,
    grainScale: 9.0,

    // A soft bulge right at the front, as if the surface were being pushed out
    // from inside. Reads as weight; costs one line of vertex shader.
    swell: 0.018,
    swellWidth: 0.05,

    // The travelling stripe, in two parts. White on white is invisible, so the
    // wide trail goes DARKER than the porcelain (the surface has not set yet)
    // and a tight bright lip sits right on the edge. The pair is what reads.
    trailWidth: 0.07,
    trailAmount: 0.85,
    trailColor: '#a2988a',
    lipWidth: 0.009,
    lipAmount: 0.9,
    lipColor: '#ffffff',
  },

  /**
   * How scroll drives it.
   *
   * `length` is the height of the sticky section in viewport units: it is the
   * only thing that decides how much wheel the reveal costs.
   */
  scroll: {
    driver: 'scroll', // scroll = the page owns progress | manual = the panel does
    length: 400, // vh of the sticky section
    smooth: true, // lerped wheel scrolling, Locomotive-style
    lerp: 0.09, // per frame at 60fps; lower = heavier
    wheel: 1.0, // wheel sensitivity
  },

  /**
   * Content cards pinned to the lobes.
   *
   * `t` is the curve parameter of the vertex: 1/6, 1/2 and 5/6 are the outer
   * extremes of a three-lobed knot, and they are listed in the order the front
   * reaches them, so the narrative order and the reveal order are the same
   * thing by construction.
   *
   * Each card carries its own accent. Hovering it recolours that stretch of the
   * band, which is the only thing in the piece that ties a paragraph to a
   * physical part of the mark.
   *
   * `stats` always has three slots; an empty value renders nothing, so a card
   * with one number and a card with three are the same shape of data.
   */
  cards: {
    enabled: true,
    fade: 0.075, // measured in front units along the path, not in seconds
    marker: 24, // px square sitting on the vertex
    // This page has a sticky nav the studio did not: a card must never be
    // laid out under it, so the top clamp is its own number.
    padTop: 104,
    distance: 34, // px of clearance beyond the mark's silhouette box
    maxWidth: 324,
    tintWidth: 0.11, // how much of the path a hovered card recolours
    tintAmount: 0.9,
    // The colour does not fade in, it SPREADS out of the chip along the band.
    // Expo-out over a second and a half: most of the travel is over almost at
    // once, and the last of it drifts.
    tintIn: 1.5,
    tintOut: 0.45,
    items: [
      {
        t: 0.1667,
        color: '#3f68d4',
        title: 'The library and the science',
        body: 'Teachers built the world’s largest free library of contemplative practice: organised, searchable, and mapped to what it helps. Every technique in The Atlas begins here, named and classified by the people who teach it.',
        stats: [
          { value: '26,000', label: 'teachers' },
          { value: '350,000', label: 'recordings' },
          { value: '970', label: 'techniques' },
        ],
      },
      {
        t: 0.5,
        color: '#46a07c',
        title: 'Members',
        body: 'Gentle check-ins and long-run practice data, volunteered by a community that trusts us. One honest answer at a time, across years of real life: this is what practice actually does outside the lab.',
        stats: [
          { value: '30M+', label: 'members' },
          { value: '17', label: 'years of practice' },
          { value: '', label: '' },
        ],
      },
      {
        t: 0.8333,
        color: '#d99f2b',
        title: 'Therapists',
        body: 'Clinicians enrich, validate and challenge the research with what they see in their clients: who a practice helped, who it did not, and what they would never prescribe. It is the layer no study can supply on its own.',
        stats: [
          { value: '125,000', label: 'therapists' },
          { value: '', label: 'in the referral network' },
          { value: '', label: '' },
        ],
      },
    ],
  },

  debug: {
    wireframe: false,
    showCurve: false,
    transparentExport: false,
  },

  /**
   * Post-processing (his ask, 2026-09-16). Off costs NOTHING — `frame()`
   * renders straight to the canvas exactly as before, no composer even built —
   * so this is additive, not a tax on the section's own performance pass.
   *
   * Kept deliberately subtle: this is a lit white porcelain studio shot, not a
   * neon scene — bloom only catches the real specular hotspots (a high
   * threshold), and the vignette is a whisper, not a frame.
   */
  post: {
    enabled: true,
    bloomStrength: 0.25,
    bloomRadius: 0.3,
    bloomThreshold: 0.88,
    vignette: 0.18,
  },
}

export const EASINGS = {
  linear: (t) => t,
  inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  outQuad: (t) => 1 - (1 - t) ** 2,
  inOutQuad: (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2),
  outCubic: (t) => 1 - (1 - t) ** 3,
  inOutCubic: (t) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2),
  outQuart: (t) => 1 - (1 - t) ** 4,
  inOutQuart: (t) => (t < 0.5 ? 8 * t ** 4 : 1 - (-2 * t + 2) ** 4 / 2),
}

export const EASING_NAMES = Object.keys(EASINGS)

export const cloneState = (s) => structuredClone(s)

/** Merge a loaded preset over the defaults so old presets keep working. */
export function mergeState(base, patch) {
  // Arrays of primitives reach here too, so leaves must be handled before the
  // object spread.
  if (base === null || typeof base !== 'object') {
    return typeof patch === typeof base ? patch : base
  }
  const out = Array.isArray(base) ? base.slice() : { ...base }
  if (!patch || typeof patch !== 'object') return out
  for (const [k, v] of Object.entries(patch)) {
    if (!(k in out)) continue
    const cur = out[k]
    if (Array.isArray(cur) && Array.isArray(v)) {
      out[k] = cur.map((item, i) => (v[i] === undefined ? item : mergeState(item, v[i])))
    } else if (cur && typeof cur === 'object' && v && typeof v === 'object') {
      out[k] = mergeState(cur, v)
    } else if (typeof cur === typeof v) {
      out[k] = v
    }
  }
  return out
}
