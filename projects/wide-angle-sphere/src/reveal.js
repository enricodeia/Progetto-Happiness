import gsap from "gsap";

// The one type-animation primitive, shared by the pinned copy (scroll-driven)
// and the hero / "Until now" titles (time-driven).
//
//   intro  — the opening treatment: every word is clipped by its own box and
//            rises into it while Exposure's EXPO axis travels from
//            over-exposed to rest, overshooting past it and settling back.
//            Set `intro.rise: 0` for a purely in-place version of the same.
//   words  — strictly in place: each word only travels along the EXPO axis,
//            +100 → −10 → +100, staggered. This is the pinned copy.
//   lines  — per line, clipped: the line rises into its own mask on the way in
//            and keeps rising out of it on the way out.
//   fade   — the whole block at once.

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerp = (a, b, t) => a + (b - a) * t;
const expoOut = (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x));

const EASES = {
  "expo.out": expoOut,
  "power4.out": (x) => 1 - Math.pow(1 - x, 4),
  "power3.out": (x) => 1 - Math.pow(1 - x, 3),
  "power2.out": (x) => 1 - Math.pow(1 - x, 2),
  "circ.out": (x) => Math.sqrt(1 - Math.pow(x - 1, 2)),
  "back.out": (x) => 1 + 2.2 * Math.pow(x - 1, 3) + 1.2 * Math.pow(x - 1, 2),
  linear: (x) => x,
};

const isLines = (mode) => mode === "lines" || mode === "mask";

/** "\n" or " | " both start a new line. */
export const splitLines = (text) => String(text || "").split(/\n|\s*\|\s*/);

/** Builds the line / word / char spans inside `el` and returns the block handle. */
export function buildBlock(el, text) {
  el.textContent = "";
  const lines = [];
  const words = [];
  const inners = [];
  // Every character of every word gets its OWN span too — always built, not
  // just when `chars` mode is picked, because a plain child span is invisible
  // to the word/line treatments above it (they paint the ANCESTOR's opacity
  // and transform, which every descendant simply inherits). That is what lets
  // a block switch into "chars" from the panel with no structural rebuild.
  const chars = [];
  splitLines(text).forEach((lineText) => {
    const mask = document.createElement("span");
    mask.className = "was-line";
    const inner = document.createElement("span");
    inner.className = "was-line-in";
    const lineWords = [];
    lineText
      .split(/\s+/)
      .filter(Boolean)
      .forEach((w, wi, arr) => {
        // the outer span is the clip box, the inner one is what moves
        const word = document.createElement("span");
        word.className = "was-word";
        const wIn = document.createElement("span");
        wIn.className = "was-word-in";
        for (const ch of w) {
          const c = document.createElement("span");
          c.className = "was-char";
          c.textContent = ch;
          wIn.appendChild(c);
          chars.push(c);
        }
        // the trailing space is plain text, not a unit — animating a space
        // does nothing, and keeping it a real text node is what keeps word
        // wrapping identical to a block that was never split at all
        if (wi < arr.length - 1) wIn.appendChild(document.createTextNode(" "));
        word.appendChild(wIn);
        inner.appendChild(word);
        words.push(word);
        inners.push(wIn);
        lineWords.push(word);
      });
    mask.appendChild(inner);
    el.appendChild(mask);
    lines.push({ mask, inner, words: lineWords });
  });
  return { el, lines, words, inners, chars, alive: true, st: { alpha: 0, expo: 0 } };
}

const expoAt = (t, aIn, aOut) =>
  lerp(lerp(t.expoFrom, t.expoRest, aIn), t.expoTo, aOut);

// ── the rail ────────────────────────────────────────────────────────────────
// A block can travel on a RAIL instead of climbing out of a clip box: it comes
// up from `lineShift` em below, settles, and then KEEPS GOING UP by `lineExit`
// em as it fades out, so the whole beat reads as one continuous drift rather
// than an arrival and a retreat back the way it came.
//
// The two treatments are exclusive. With a rail there is no clip box at all and
// OPACITY is what reveals — which is also the fix for a block being visible
// before it has fired: the clipped variant pins opacity to 1 (the mask is doing
// the hiding), and a block with nothing to climb out of was inheriting that.
const railOf = (t) => {
  const shift = t.lineShift || 0;
  const exit = t.lineExit === undefined ? shift : t.lineExit;
  return { shift, exit, on: Math.abs(shift) > 0.001 || Math.abs(exit) > 0.001 };
};
/** a unit is either a plain 0→1 number or a { v, o } pair (in, out) */
const inOf = (u) => (typeof u === "number" ? u : u?.v ?? 0);
const outOf = (u) => (typeof u === "number" ? 0 : u?.o ?? 0);

function paintLines(b, eIn, eOut, t) {
  b.st.alpha = 0;
  const n = Math.max(1, b.lines.length - 1);
  const spread = clamp01(t.stagger) * 0.9;
  const w = 1 - spread;
  const rise = t.lineRise === undefined ? 105 : t.lineRise;
  const rail = railOf(t);
  const clipped = !rail.on && rise > 0.5;
  for (let j = 0; j < b.lines.length; j++) {
    const t0 = (j / n) * spread;
    const aIn = expoOut(clamp01((eIn - t0) / w));
    const aOut = expoOut(clamp01((eOut - t0) / w));
    const expo = expoAt(t, aIn, aOut);
    const el = b.lines[j].inner;
    const alpha = clamp01(aIn / Math.max(0.05, t.fadeIn)) * (1 - aOut);
    if (rail.on) {
      const y = (1 - aIn) * rail.shift - aOut * rail.exit;
      el.style.transform = `translate3d(0,${y.toFixed(3)}em,0)`;
    } else {
      el.style.transform = `translate3d(0,${((1 - aIn) * rise - aOut * rise).toFixed(2)}%,0)`;
    }
    // Only a block that is really CLIPPED gets a hard 1 — the mask is what is
    // hiding it. Everything else is revealed by opacity, which is what stops a
    // block being on screen at EXPO +100 before it has fired.
    el.style.opacity = clipped ? "1" : alpha.toFixed(3);
    el.style.fontVariationSettings = `"EXPO" ${expo.toFixed(1)}`;
    el.style.filter = "none";
    b.st.alpha = Math.max(b.st.alpha, clipped ? clamp01(aIn - aOut) : alpha);
    if (j === 0) b.st.expo = expo;
  }
}

function paintUnits(b, units, eIn, eOut, t) {
  b.st.alpha = 0;
  const n = Math.max(1, units.length - 1);
  const spread = clamp01(t.stagger) * 0.9;
  const w = 1 - spread;
  for (let j = 0; j < units.length; j++) {
    const t0 = (j / n) * spread;
    const aIn = expoOut(clamp01((eIn - t0) / w));
    const aOut = expoOut(clamp01((eOut - t0) / w));
    // the EXPO axis does the work, so the opacity ramp is deliberately faster
    // than the axis move: a word is solid early and only keeps settling
    const a =
      clamp01(aIn / Math.max(0.05, t.fadeIn)) *
      (1 - clamp01((aOut - (1 - t.fadeOut)) / Math.max(0.05, t.fadeOut)));
    const expo = expoAt(t, aIn, aOut);
    const blur = ((1 - aIn) + aOut) * t.blur;
    const el = units[j];
    el.style.opacity = a.toFixed(3);
    el.style.transform =
      `translate3d(0,${((1 - aIn) * t.rise - aOut * t.rise * 0.5).toFixed(3)}em,0)`;
    el.style.fontVariationSettings = `"EXPO" ${expo.toFixed(1)}`;
    el.style.filter = blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : "none";
    b.st.alpha = Math.max(b.st.alpha, a);
    if (j === 0) b.st.expo = expo;
  }
}

// The opening treatment. Each word is a clip box; the inner span rises into it
// while EXPO travels from over-exposed to rest and overshoots slightly past it
// on the way — a half-sine bump, so it is continuous and never snaps.
function paintIntro(b, eIn, eOut, t) {
  b.st.alpha = 0;
  const n = Math.max(1, b.words.length - 1);
  const spread = clamp01(t.stagger) * 0.94;
  const w = 1 - spread;
  const ease = EASES[t.ease] || expoOut;
  for (let j = 0; j < b.words.length; j++) {
    const t0 = (j / n) * spread;
    const a = ease(clamp01((eIn - t0) / w));
    const o = ease(clamp01((eOut - t0) / w));

    const y = (1 - a) * t.rise - o * t.rise * t.riseOut;
    const bump = Math.sin(Math.PI * a) * t.overshoot;
    const expo = lerp(lerp(t.expoFrom, t.expoRest, a) + bump, t.expoFrom, o);
    const alpha = clamp01(a / Math.max(0.05, t.fadeIn)) * (1 - o);
    const blur = (1 - a) * t.blur;
    const skew = (1 - a) * t.skew;

    const el = b.inners[j];
    el.style.transform =
      `translate3d(0,${y.toFixed(2)}%,0)` + (skew ? ` skewY(${skew.toFixed(2)}deg)` : "");
    el.style.fontVariationSettings = `"EXPO" ${expo.toFixed(1)}`;
    el.style.filter = blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : "none";
    b.words[j].style.opacity = alpha.toFixed(3);

    b.st.alpha = Math.max(b.st.alpha, alpha);
    if (j === 0) b.st.expo = expo;
  }
}

/** eIn / eOut are 0→1 ramps. `mode`: intro | words | chars | lines | fade. */
export function paintBlock(b, mode, eIn, eOut, t) {
  if (mode === "intro") paintIntro(b, eIn, eOut, t);
  else if (isLines(mode)) paintLines(b, eIn, eOut, t);
  else if (mode === "fade") paintUnits(b, [b.el], eIn, eOut, t);
  else if (mode === "chars") paintUnits(b, b.chars, eIn, eOut, t);
  else paintUnits(b, b.words, eIn, eOut, t);
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-unit painting.
//
// Everything above derives each word from ONE block-level ramp plus an
// internal stagger. That is right for scroll-scrubbed copy, but it cannot be
// choreographed: the hero has to hand over from "We" to "Guide" to the bowl to
// "You" to "Through" with each one starting before the last has finished, and
// with its own duration.
//
// So a block can also be painted from an EXPLICIT value per unit — one per
// word, or one per line in `lines` mode — which is what lets a real GSAP
// timeline own the stagger instead of a formula.
// ─────────────────────────────────────────────────────────────────────────────

/** How many things a mode animates, one at a time. */
export const unitCount = (b, mode) =>
  isLines(mode) ? b.lines.length : mode === "chars" ? b.chars.length : b.words.length;

function introAt(b, vals, t) {
  b.st.alpha = 0;
  for (let j = 0; j < b.words.length; j++) {
    const a = clamp01(inOf(vals[j]));
    const y = (1 - a) * t.rise;
    const bump = Math.sin(Math.PI * a) * t.overshoot;
    const expo = lerp(t.expoFrom, t.expoRest, a) + bump;
    const alpha = clamp01(a / Math.max(0.05, t.fadeIn));
    const blur = (1 - a) * t.blur;
    const skew = (1 - a) * t.skew;
    const el = b.inners[j];
    el.style.transform =
      `translate3d(0,${y.toFixed(2)}%,0)` + (skew ? ` skewY(${skew.toFixed(2)}deg)` : "");
    el.style.fontVariationSettings = `"EXPO" ${expo.toFixed(1)}`;
    el.style.filter = blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : "none";
    b.words[j].style.opacity = alpha.toFixed(3);
    b.st.alpha = Math.max(b.st.alpha, alpha);
    if (j === 0) b.st.expo = expo;
  }
}

// `lineRise` is how far (in % of its own box) a line travels into place.
// 0 means it is ALREADY in position and only the variable axis moves, which is
// the treatment for a block that must not look like it is arriving from below.
function linesAt(b, vals, t) {
  b.st.alpha = 0;
  const rise = t.lineRise === undefined ? 105 : t.lineRise;
  const rail = railOf(t);
  const clipped = !rail.on && rise > 0.5;
  for (let j = 0; j < b.lines.length; j++) {
    const a = clamp01(inOf(vals[j]));
    const o = clamp01(outOf(vals[j]));
    const expo = lerp(t.expoFrom, t.expoRest, a);
    const el = b.lines[j].inner;
    const alpha = clamp01(a / Math.max(0.05, t.fadeIn)) * (1 - o);
    if (rail.on) {
      // up from below, settle, then KEEP going up as it goes
      const y = (1 - a) * rail.shift - o * rail.exit;
      el.style.transform = `translate3d(0,${y.toFixed(3)}em,0)`;
    } else {
      el.style.transform = `translate3d(0,${((1 - a) * rise).toFixed(2)}%,0)`;
    }
    el.style.opacity = clipped ? "1" : alpha.toFixed(3);
    el.style.fontVariationSettings = `"EXPO" ${expo.toFixed(1)}`;
    el.style.filter = "none";
    b.st.alpha = Math.max(b.st.alpha, clipped ? clamp01(a - o) : alpha);
    if (j === 0) b.st.expo = expo;
  }
}

function unitsAt(b, units, vals, t) {
  b.st.alpha = 0;
  const exit = t.riseExit === undefined ? 0 : t.riseExit;
  for (let j = 0; j < units.length; j++) {
    const a = clamp01(inOf(vals[j]));
    const o = clamp01(outOf(vals[j]));
    const alpha = clamp01(a / Math.max(0.05, t.fadeIn)) * (1 - o);
    const expo = lerp(t.expoFrom, t.expoRest, a);
    const el = units[j];
    el.style.opacity = alpha.toFixed(3);
    el.style.transform =
      `translate3d(0,${((1 - a) * t.rise - o * exit).toFixed(3)}em,0)`;
    el.style.fontVariationSettings = `"EXPO" ${expo.toFixed(1)}`;
    el.style.filter = "none";
    b.st.alpha = Math.max(b.st.alpha, alpha);
    if (j === 0) b.st.expo = expo;
  }
}

/** Paint a block from one 0→1 value per unit. */
export function paintAt(b, mode, vals, t) {
  if (mode === "intro") introAt(b, vals, t);
  else if (isLines(mode)) linesAt(b, vals, t);
  else if (mode === "chars") unitsAt(b, b.chars, vals, t);
  else unitsAt(b, b.words, vals, t);
}

/** The class that gives a mode its clipping. `clip` gates the intro's box. */
export function modeClass(el, mode, clip = false) {
  el.classList.toggle("is-lines", isLines(mode));
  el.classList.toggle("is-intro", mode === "intro");
  el.classList.toggle("is-chars", mode === "chars");
  el.classList.toggle("is-clip", mode === "intro" && !!clip);
}

/**
 * A time-driven reveal for a standalone element (hero title, paragraph,
 * "Until now"): the same painter, scrubbed by a GSAP tween instead of scroll.
 * `cfg` is the whole CONFIG — the intro mode reads `cfg.intro`, the rest
 * `cfg.text`.
 */
export function createReveal({ el, text, mode, cfg }) {
  let block = buildBlock(el, text);
  const p = { in: 0, out: 0 };
  let tween = null;
  let outTween = null;
  // one {v} per word (or per line) — the handles a GSAP timeline staggers
  let units = [];
  // a block can carry its own type params — the evidence statement is painted
  // in place, which the shared `cfg.text` must not have to know about
  let override = null;
  const params = () => (override ? override() : mode === "intro" ? cfg.intro : cfg.text);
  modeClass(el, mode);

  const draw = () => {
    const t = params();
    if (mode === "intro") el.classList.toggle("is-clip", t.rise > 0.01);
    // the units themselves, not their `v`: a unit carries BOTH its in and its
    // out, so a block can leave on the rail instead of retreating the way it came
    if (units.length) paintAt(block, mode, units, t);
    else paintBlock(block, mode, p.in, p.out, t);
  };
  // One handle per unit, with BOTH halves of its journey on it: `v` is how far
  // in it is, `o` how far out. Two values rather than one is what lets a block
  // leave the way it arrived — onward, up the rail — instead of walking `v`
  // back down and retreating into the floor it came from.
  function arm() {
    units = Array.from({ length: unitCount(block, mode) }, () => ({ v: 0, o: 0 }));
    draw();
    return units;
  }

  draw();

  return {
    get block() { return block; },
    get mode() { return mode; },
    rebuild(nextText, nextMode) {
      if (nextMode) mode = nextMode;
      block = buildBlock(el, nextText ?? text);
      modeClass(el, mode);
      if (units.length) arm();
      draw();
    },
    /** Hand the block over to a timeline: one tweenable {v} per unit, all 0. */
    arm,
    get units() { return units; },
    get unitCount() { return unitCount(block, mode); },
    drawUnits: draw,
    redraw: draw,
    set(eIn, eOut = 0) {
      p.in = eIn;
      p.out = eOut;
      draw();
    },
    play({ duration = 1.6, ease = "none", delay = 0 } = {}) {
      tween?.kill();
      outTween?.kill();
      p.in = 0;
      p.out = 0;
      draw();
      tween = gsap.to(p, {
        in: 1,
        duration,
        delay,
        ease,
        onUpdate: draw,
        overwrite: "auto",
      });
      return tween;
    },
    /**
     * Fire the block as a REAL GSAP stagger: one tween per unit (word, or line
     * in `lines` mode), each starting `stagger` seconds after the last. This is
     * what a beat wants — `play()` derives its stagger from a formula inside
     * one ramp, which cannot overlap the way a timeline can.
     */
    playStagger({ duration = 1.1, stagger = 0.16, ease = "power2.out", params } = {}) {
      tween?.kill();
      outTween?.kill();
      const u = arm();
      if (params) override = params;
      tween = gsap.to(u, { v: 1, duration, stagger, ease, onUpdate: draw, overwrite: "auto" });
      return tween;
    },
    /**
     * The same stagger, BACKWARDS: every unit walks its own `v` back to 0, so
     * the block leaves the way it arrived — opacity down, EXPO climbing back to
     * `expoFrom`, a clipped line dropping back into its box.
     *
     * This is the exit a block that was ARMED needs. `playOut` below drives
     * `p.out`, which the per-unit painter does not read at all: once a block is
     * on a timeline, the only thing that can move it is its units.
     */
    playUnitsOut({ duration = 1, stagger = 0.16, ease = "power2.out", to = 1 } = {}) {
      outTween?.kill();
      if (!units.length) arm();
      // `o`, not `v`: the block carries ON — it fades while it keeps climbing —
      // rather than winding its arrival back. `to: 0` walks that exit back in,
      // which is what a beat needs when the reader scrolls up into it again.
      outTween = gsap.to(units, { o: to, duration, stagger, ease, onUpdate: draw, overwrite: "auto" });
      return outTween;
    },
    /** the params this block is painted with, when they are not the defaults */
    setParams(fn) { override = fn; draw(); },
    /**
     * The same stagger, backwards: the words hand themselves out one by one
     * while EXPO climbs back to `expoFrom`. `to: 0` walks it back in, which is
     * what a beat needs when the reader scrolls up into it again.
     */
    playOut({ duration = 1, ease = "none", delay = 0, to = 1 } = {}) {
      outTween?.kill();
      outTween = gsap.to(p, {
        out: to,
        duration,
        delay,
        ease,
        onUpdate: draw,
        overwrite: "auto",
      });
      return outTween;
    },
    reset() {
      tween?.kill();
      outTween?.kill();
      tween = null;
      outTween = null;
      p.in = 0;
      p.out = 0;
      // both halves of a unit's journey — leaving `o` at 1 from a completed
      // exit costs nothing visually (alpha is already 0 whenever v is), but a
      // block reset while its exit is only PART way through should not be
      // found half-exited the next time it arms
      for (const u of units) { u.v = 0; u.o = 0; }
      draw();
    },
    get alpha() { return block.st.alpha; },
    get expo() { return block.st.expo; },
  };
}
