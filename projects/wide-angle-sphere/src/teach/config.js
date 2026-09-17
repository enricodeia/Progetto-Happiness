import { TOWER_OF_PISA } from "./preset.js";
import { defaultFx } from "./fx.js";

// The teach page = the webkit preset + the handful of things the preset
// cannot know: the rectangle it is composed into, and the copy next to it.
//
// `deep` keeps the preset object pristine — everything below is an OVERRIDE,
// so re-pasting a fresh `preset.js` from the webkit panel picks up cleanly.
const deep = (base, over) => {
  const out = Array.isArray(base) ? base.slice() : { ...base };
  for (const k of Object.keys(over || {})) {
    const b = out[k];
    const o = over[k];
    out[k] = b && o && typeof b === "object" && typeof o === "object" && !Array.isArray(o)
      ? deep(b, o)
      : o;
  }
  return out;
};

export const cfg = {
  // ── the carousel ────────────────────────────────────────────────────────
  tower: deep(TOWER_OF_PISA, {
    images: {
      // The teacher portraits — the same `src/photos/*` the sphere uses.
      // The preset shipped pointing at the Metalab case media; that is still
      // one switch away in the panel.
      source: "photos",
      count: 18,
      video: false,
    },
    camera: {
      // Framing correction. `fov` is vertical, so composing into a region
      // narrower than the canvas crops horizontally; `fit` dollies back until
      // the horizontal extent matches what the preset framed at `fitAspect`.
      // 0 = the raw preset distance. Only used when `autoFrame` is off.
      fit: 0.88,
      fitAspect: 1.62,
      // Measure where the carousel actually is over a full turn and drop it
      // into the region at `autoFill` of it. This is what lets every webkit
      // preset land here, including the ones composed off-centre for a
      // full-bleed 16:9 frame (the corner decos, the bottom rings).
      autoFrame: true,
      autoFill: 0.86,
    },
    look: {
      // The page is paper, not the preset's #0c0c0c — draw straight onto it.
      solidBg: false,
      bgColor: "#0c0c0c",
    },
    // The card shader's effects chain (src/lib/itemMesh.js). Every one is off
    // by default and costs nothing until it is switched on — see fx.js, which
    // is the single source the panel and the renderer both read.
    postfx: defaultFx(),
    // The rectangle the tower is COMPOSED into. The canvas itself is always
    // the whole viewport, so nothing here clips — this only sizes and moves
    // the composition (see tower.js → "Full-bleed canvas, framed
    // composition"). Desktop: the left half, centred inside it.
    region: {
      width: 48,        // % of the viewport the framing rectangle spans
      xPct: 24,         // where its centre sits horizontally, % of viewport
      yPct: 50,         // ...and vertically
      breakpoint: 900,  // below this viewport width, `mobile` takes over
      mobile: {
        width: 100,     // the whole screen
        xPct: 50,       // dead centre
        yPct: 50,
      },
    },
  }),

  // ── the page ────────────────────────────────────────────────────────────
  nav: {
    show: true,
    logo: "Insight Timer",
    links: "Home, Explore, About, Research, Teach",
    pill: "About us",
    search: "Search",
    cta: "Log In",
  },
  hero: {
    // Emptying one of these is NOT how you hide it — `sanitize()` puts the
    // default text back, because a config saved with blank copy used to wipe
    // the page and come back on the next reload. Use the show toggles.
    title: "Make an impact and an | income on Insight Timer.",
    showTitle: true,
    titleSize: 3,       // vw
    titleLh: 1.06,
    para: "Millions of people come to Insight Timer to | learn and discover practices from eastern | and western spiritual tradition.",
    showPara: true,
    paraSize: 1.05,     // vw
    cta: "Become a teacher",
    showCta: true,
    ctaBg: "#16301f",
    x: 55,              // vw — where the copy column starts
    width: 37,          // vw — its measure
    y: 50,              // % — vertical centre of the block
    reveal: true,
  },
  page: {
    bg: "#faf9f2",
    ink: "#0a0a0a",
  },
};

export const DEFAULTS = JSON.parse(JSON.stringify(cfg));
