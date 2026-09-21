// ─────────────────────────────────────────────────────────────────────────────
// Wide Angle Sphere — one page, three acts.
//
//   act 1   nav + hero + "Until now"    the bowl rises, turns, leans
//   act 2   six pinned steps            1-3 the canvas experience,
//                                       4-6 the evidence panel
//   act 3   Atlas                       the knot draws itself, collapsing over
//
// The pinned stage is a canvas that is ALWAYS full bleed; the left column is
// an overlay on top of it, and the camera's frustum is skewed (filmOffset) so
// the composition sits centred in the exposed half. Nothing ever resizes the
// drawing buffer, and the split never moves.
//
//   step 1  one portrait, dead centre, narrow lens (no reveal — it is there)
//   step 2  the other cards bloom out of it, lens widens 30° → 90°
//   step 3  the category pills appear IN the sphere, among the photos
//
// Steps 4-6 are a SECOND sticky on the same clock: the statement, then the
// three sources of evidence stacked under it, one filling per step. Only then
// does the last section rise over it and the Atlas knot draw itself
// (src/atlas/, preset.json).
//
// P — scroll panel · B — bowl panel · M — markers · C — clean frame.
// ─────────────────────────────────────────────────────────────────────────────

import { BOWL_PRESET } from "./data/bowlPreset.js";

export const CONFIG = {
  scroll: {
    // "pin"   the stage sticks for the whole clock, then releases
    // "stack" the sections collapse over each other
    style: "pin",
    overlapVh: 100,
    stackShadow: true,
    smooth: true,      // Lenis
    lerp: 0.09,
    // The 100vh in which the first sticky lets go and the second arrives is
    // NOT a dead zone: it is the head of step 4, so the two sections are one
    // continuous clock with no pause anywhere in the middle.
    handoverVh: 100,
    // V2 only (his ask, 2026-09-17: "la sezione dei tre step inizi a salire
    // molto prima, quando la ball è praticamente appena partita"): `#pinB`
    // is pulled UP by this many vh (and made that much taller, so the page
    // and the clock do not move), so it starts rising over the ring act's
    // last stretch — while the bowl is already on its way down — instead
    // of only once the act's clock has ended. 90 keeps the very end of the
    // act (the rings' own stagger out at 0.9) still uncovered.
    earlyRiseVh: 90,
  },

  // ── the steps. `vh` = how much scroll that step owns while pinned ────────
  steps: [
    {
      name: "One",
      vh: 130,
      text: "Insight Timer is building a map\nof the world's wellbeing practices.",
      textIn: 0.26,
      textOut: 0.20,
      textDelay: 0,    // fraction of the step to wait before the copy arrives
    },
    {
      name: "Sphere",
      vh: 190,
      text: "On a platform\nguided by people",
      textIn: 0.22,
      textOut: 0.20,
      textDelay: 0,
    },
    {
      name: "Pills",
      vh: 200,
      text: "Connecting experience to evidence,\nvalidating techniques\nwith real outcomes.",
      textIn: 0.20,
      // 0 = it never leaves. The last thing the canvas section says stays on
      // screen until the section itself is gone.
      textOut: 0,
      textDelay: 0,
    },
    // ── the second sticky: the evidence panel, one source per step ─────────
    // The canvas experience is over (`sections.canvasSteps`); this section
    // carries the rest of the same clock. The Atlas only starts collapsing
    // once these three are done.
    { name: "Users", vh: 220, text: "", textIn: 0.2, textOut: 0.2, textDelay: 0 },
    { name: "Therapists", vh: 220, text: "", textIn: 0.2, textOut: 0.2, textDelay: 0 },
    { name: "Research", vh: 220, text: "", textIn: 0.2, textOut: 0.2, textDelay: 0 },
  ],

  // ── the pinned copy: Exposure VAR on its EXPO axis (−100 → +100) ─────────
  // Strictly in place: no rise, no blur — only the variable axis moving from
  // `expoFrom` to `expoRest`, word by word.
  text: {
    mode: "words",     // words (in place) | lines (clipped) | fade
    font: "Exposure",
    size: 1.35,        // vw — smaller type beside a smaller card
    lineHeight: 1.24,
    tracking: -0.01,   // em
    align: "center",
    overlap: 0.07,     // fraction of a step the incoming copy starts early by
    stagger: 0.62,     // per-word stagger inside the in/out window
    rise: 0,           // em — 0 = strictly in place
    blur: 0,           // px — 0 = no blur
    lead: 70,          // vh of the approach scroll the first copy comes in on
    expoFrom: 100,     // EXPO while entering  (over-exposed)
    expoRest: 0,       // EXPO at rest
    expoTo: 100,       // EXPO while leaving
    fadeIn: 0.35,      // how much of the in window is also an opacity fade
    fadeOut: 0.75,     // how much of the out window is an opacity fade
  },

  // ── the opening act: one line, split around the bowl ─────────────────────
  // The hero is a display line with the bowl sitting IN it: "We Guide" on the
  // left, the bowl, "You Through" on the right.
  //
  // The two halves are placed INDEPENDENTLY, each measured from the centre
  // line of the viewport — `leftGap` is how far the END of the left half sits
  // from the centre, `rightGap` how far the START of the right half does — so
  // the composition stays symmetrical around the bowl however long the two
  // pieces of lettering happen to be, and each one can still be put exactly
  // where it is wanted (`leftY` / `rightY`).
  //
  // It arrives in three beats, in this order: "We Guide", then the bowl, then
  // "You Through" (`titleDelay` → `bowl.intro.delay` → `titleBDelay`).
  //
  // As the page scrolls the two halves slide apart by `drift`, and sliding
  // back up closes them again — a pure function of the scroll, so it can never
  // end up out of place.
  // ── which version of the piece is on screen: 1, 2, 3 or 4 ──────────────
  // `v2.on` is kept as the DERIVED "is this at least V2", because twenty-odd
  // places already read it and every one of them wants V2's behaviour in V3
  // (and V4) too — V3/V4 are V2 plus deltas, not separate pages. main.js
  // keeps the two in step; nothing should ever write `v2.on` directly.
  // Shipped default is 4 (his ask, 2026-09-18) — no localStorage override any
  // more, every load starts here; the panels can still switch live, behind `c`.
  variant: 4,

  // ── the two EXPERIENCES (his ask, 2026-09-21 — the final task, "due tipi
  //    distinti di esperienze") ─────────────────────────────────────────────
  // `1` (keyboard 1, the DEFAULT): version four's page — the pill, the dots
  //     and the rings, the globe — on a WHITE page with no shader at all, its
  //     type in ink ("solo sfondo bianco con la bowl che scende giù, il ring...
  //     testi che saranno neri e non bianchi").
  // `2` (keyboard 2): the shader kept; after the bowl's V5 outro, the THREE
  //     circles of his frame drawn top-right → bottom → top-left, the big
  //     arcs, and the Atlas knot built over them (`v2.trio`).
  // `0`: a legacy version picked by hand from the panel (1-5), untouched.
  experience: 1,
  exp: {
    paper: {
      on: true,            // Experience 1's white page (off = V4 exactly as it was)
      bg: "#ffffff",       // "solo sfondo bianco"
      ink: "#0a0a0a",      // ...and the scroll bar's ink on it
    },
  },

  // ── the nav bar — two bars, hover dropdowns (2026-09-21) ────────────────
  // `src/nav.js`; what each bar lists is in `src/data/nav.js`.
  nav: {
    mode: "auto",          // auto (1 in Experience 1, 2 in Experience 2) | 1 | 2
    logo: "Insight Timer",
    search: "Search",
    // his first three frames: five links, the search, one black "Log In"
    one: { links: ["discover", "teach", "clinical", "research", "about"], cta: "Log In", icons: true },
    // frames four to six: three links, "For therapists" outlined, the search, "Get the app"
    two: { links: ["discover", "about", "teach"], cta: "Get the app", pill: "For therapists", icons: false },
    dot: true,             // the small black dot at the head's right, as in his frames
    // ── layout ───────────────────────────────────────────────────────────
    linkSize: 15,          // px — the bar's links
    itemGap: 44,           // px between them
    linksX: 96,            // px from the logo to the first link
    menuWidth: 214,        // px — the card
    megaWidth: 640,        // px — the wide second panel ("molto più larga")
    megaCols: 3,           // ...its columns
    megaCount: 24,         // how many of the directory's categories it lists
    pad: 16,               // px — the card's inner padding
    gap: 8,                // px between the card and the wide panel
    radius: 20,            // px — both panels' corners
    rowSize: 15,           // px — a row
    rowHeight: 44,         // px — a row's height
    shadow: 0.3,           // the panels' drop shadow, 0-1
    // ── motion: the card opens, THEN the rows arrive ─────────────────────
    openDelay: 70,         // ms of hover before it opens
    closeDelay: 180,       // ms of grace after the pointer leaves
    subDelay: 90,          // ms of hover on a row before its wide panel opens
    dur: 0.46,             // s — the card's own curtain
    megaDur: 0.5,          // s — the wide panel's
    ease: "power3.out",
    rowsAt: 0.3,           // the rows start this far into the card's opening
    rowDur: 0.38,          // s — one row's arrival
    rowStagger: 0.05,      // s between one row and the next
    megaStagger: 0.016,    // s between one wide-panel item and the next
    rowRise: 8,            // px an item rises into place
    swapDur: 0.14,         // s — the wide panel's list going, before the next arrives
    closeSpeed: 1.5,       // closing runs the same timeline backwards, this much faster
  },

  // ── the footer's own two knobs ─────────────────────────────────────────
  // Everything else about it is layout that measures itself (see
  // `footer.measure()`); these are the two numbers that are a judgement.
  footer: {
    linkAlpha: 0.5,   // the link list at rest — the hover always goes to 1
    gap: 56,          // px — the FLOOR under the space above the wordmark
    // The columns sit in ONE left-aligned row with a real gap between them
    // (his ask, 2026-09-17: "non sia space between, ma che abbia un gap di
    // 30 px tra uno e l'altro... partendo da sinistra"). The same number
    // separates a group from the next AND a group's own two sub-columns, so
    // the five tracks read as one even rhythm rather than two.
    // in vw, not px, so the whole row scales with the page (his ask,
    // 2026-09-17: "un gap di 60px, che però convertiremo con il valore di
    // vw, così che scali tutto bene"). 4vw is 60px at his own 1500.
    colGap: 4,        // vw — between one CATEGORY and the next
    // ...and a DIFFERENT, smaller gap between a category's own two
    // sub-columns (his ask, 2026-09-21: "il gap tra le categorie... deve
    // essere differente dal gap che hanno le colonne interne della singola
    // categoria") — so Browse's two lists read as one group, not five equal
    // tracks. Also in vw.
    subGap: 1.6,      // vw
    // the type, in px (his ask, same day: "senò non si capisce nulla di cosa
    // sia gerarchicamente parlando") — links 12, the legal line 10, the
    // policy links bottom-right 12
    linkSize: 12,
    legalSize: 10,
    policySize: 12,
    padBottom: 24,    // px — the air under the legal line (was 3vw ≈ 45)
    padTop: 150,      // px — the links start this far down (was 96)
    // how much air is left UNDER the wordmark, before the legal line. Making
    // it smaller moves the logo DOWN, which is what he asked for.
    wordBottom: 14,   // px
  },

  hero: {
    vh: 100,
    nav: {
      show: true,
      sticky: true,    // rides along at the top of the page
      // 0 = NO band behind the bar. The soft fade kept type clean as it passed
      // under it, but it also cuts a rectangle of the wrong paper across
      // everything the page opens into. Raise it and it comes back.
      fade: 0,
      // the bar's copy — logo, links, search, buttons — lives in `nav` now
      // (2026-09-21), one object for both bars
      // the search field is LIGHT glass (his ask, 2026-09-17: "così che si
      // veda la ui che passa sotto") — white at `alpha` over a backdrop blur
      searchGlass: { alpha: 0.55, blur: 14 },
    },
    // The real titles (his ask, 2026-09-17 — "questi, che sono i titoli
    // giusti"), two lines each, the bowl held between them. "|" starts a new
    // line, the same separator the paragraph already uses.
    title: "Building|space",
    titleB: "to|practice",
    titleMode: "intro",      // intro | words | lines | fade
    titleSize: 4.7,          // vw
    titleLh: 1.0,
    leftGap: 13,             // vw from the centre to the END of "Building space"
    leftY: 46,               // % of the viewport it is centred on
    rightGap: 13,            // vw from the centre to the START of "to practice"
    rightY: 56,              // ...and the right block sits LOWER, as in his layout
    // which edge of each block lines up — the left half reads in toward the
    // bowl, the right half away from it
    leftAlign: "right",      // left | center | right
    rightAlign: "left",
    // ── the two halves slide APART as the hero leaves ────────────────────
    // His ask, 2026-09-17: the left one travels left, the right one right,
    // "però devono sfasarsi sulla X" — so they are deliberately NOT a mirror
    // pair. They travel different distances, and the right one starts later
    // on the same clock, which is what stops the two reading as one object
    // being pulled apart. `smoothstep` is what makes it organic rather than
    // a linear slide; it stays a pure function of the scroll either way.
    drift: 5,                // vw — the LEFT half
    driftRight: 7,           // vw — the RIGHT half, further
    driftPhase: 0.18,        // 0-1: how much later the right half starts
    para: "It's never been understood in|a way that's useful to all of us.",
    paraMode: "lines",       // clipped line reveal
    paraAlign: "left",       // left | center | right
    paraSize: 0.92,          // vw
    paraLh: 1.45,
    // 4vw — the SAME left inset the whole page shares (`v2.top.x`, the act's
    // `copyX`, the evidence rows, the team grid). The player used to own this
    // corner, which is why it was 2.6; it has moved to the right (his ask,
    // 2026-09-17), so the paragraph can finally sit on the section's own
    // padding like everything else.
    paraLeft: 4,             // vw — it sits in the bottom-left corner...
    // ...and it has the corner to itself again now that the player sits on
    // the RIGHT (his ask, 2026-09-17), so it can come back down to the
    // section's own bottom padding instead of clearing an 84px bar.
    paraBottom: 6,           // vh
    // ── the opening, as ONE GSAP timeline ─────────────────────────────────
    // Every word is a tween at its own position — We · Guide · the bowl ·
    // You · Through — and they OVERLAP: `stagger` is smaller than the
    // durations, so a word starts while the one before it is still arriving.
    // Nothing here is a delay; it is all one timeline.
    seq: {
      firstDur: 1.35,   // s the FIRST word of a half takes to resolve
      wordDur: 1.0,     // s every word after it takes
      stagger: 0.6,     // s between one word starting and the next
      // expo.out front-loads almost all of its travel into the first 15% —
      // fine for a single word, wrong for a hand-over. power2 is the one that
      // actually reads as one word passing to the next.
      ease: "power2.out",
      // Both leads are NEGATIVE, i.e. overlaps: the bowl starts this many
      // seconds before the left half has finished, and the right half this
      // many before the bowl has.
      bowlLead: -0.45,
      rightLead: -0.8,
      // the corner paragraph joins in under the same clock
      paraAt: 0.9,
    },
  },

  // ── the video cards, bottom-right of the hero ───────────────────────────
  // React Bits' `Stack`, ported to vanilla in src/cardswap.js: a deck fanned
  // by `fan` degrees each. Drag the top one and it tilts in 3D towards the
  // pointer; pull it past `sensitivity` (or just click it) and it goes to the
  // back of the deck. Nothing moves on its own. Images are whatever sits in
  // src/cards/ (it falls back to the portraits).
  cards: {
    show: true,
    count: 4,          // how many are in the deck
    w: 210,
    h: 132,
    radius: 14,
    right: 2.6,        // vw
    bottom: 4,         // vh
    caption: 'Christopher Plowman, "Insight Timer"|Meditation App Co-Owner',
    capSize: 0.78,     // vw
    // the deck
    fan: 4,            // ° between one card and the next
    scaleStep: 0.06,   // ...and how much smaller each one behind is
    origin: "90% 90%", // they turn about the corner, not the middle
    randomRotation: false,
    perspective: 600,  // px — the 3D the tilt is read in
    // the spring the component ships with
    stiffness: 260,
    damping: 20,
    // the drag
    sensitivity: 200,  // px of pull that sends a card to the back
    elastic: 0.6,      // how much of the pointer the card actually follows
    tiltMax: 60,       // ° of rotateX / rotateY at the end of the range
    tiltRange: 100,    // px of travel that reaches it
    clickToBack: true,
  },

  // ── the intro reveal: EVERY title on the page ────────────────────────────
  // Strictly in place. A word only fades from 0 to 1 while Exposure's EXPO
  // axis travels +100 → 0, word by word. No rise, no clip, no travel —
  // `rise` is left in so it can be dialled back up, and the clip box only
  // exists while it is above zero.
  intro: {
    stagger: 0.72,     // share of the window spent handing over between words
    ease: "expo.out",  // per-word ease
    rise: 0,           // % of its own box each word rises from — 0 = in place
    riseOut: 0.55,     // ...and the share of that it leaves by
    expoFrom: 100,     // EXPO as the word arrives (over-exposed)
    expoRest: 0,       // EXPO at rest
    overshoot: 0,      // EXPO peak past rest, halfway through the travel
    // 1 = the opacity ramp IS the whole travel. Lower it and the word is
    // solid long before it has finished settling, which is what made the
    // hand-over between two words read as a snap rather than a cross-fade.
    fadeIn: 1,
    blur: 0,           // px at the start
    skew: 0,           // ° the word is sheared by on the way in
  },

  // ── the second act: 200vh of sticky, two beats ACROSS the bowl ──────────
  // The bowl is big and tilted between them: the statement on the LEFT, and
  // "Until now" on the RIGHT at the same height, so the eye reads straight
  // through the object. Neither beat is scrubbed: each one FIRES when the
  // scroll crosses its mark and then plays itself out, and NEITHER of them
  // leaves — the first one is still standing when the second arrives.
  //
  // They are revealed differently on purpose: the long one line by line, so
  // it reads as a paragraph settling, and the short one word by word, so
  // "Until now" lands as two separate beats.
  until: {
    vh: 200,
    // NOT the hero's paragraph again: this beat poses the problem that step 1
    // then answers ("Insight Timer is building a map...")
    left: "Across generations and|cultures, people have been|looking for practices that|help them.",
    right: "Until now",
    leftMode: "lines",   // clipped, line by line
    rightMode: "words",  // in place, word by word
    leftAlign: "left",
    rightAlign: "right",
    leftSize: 2.2,      // vw
    leftWidth: 30,      // vw of measure
    leftX: 2.6,         // vw from the left edge
    leftY: 47,          // % of the viewport
    rightSize: 2.2,
    rightWidth: 22,
    rightX: 16,         // vw from the right edge
    rightY: 47,         // ...the same height: they read across the bowl
    // the marks, as fractions of the section's own scroll. The first one
    // fires early and is given a long, slow reveal — it has to be READ —
    // and the second only starts once it is finished.
    // Each beat FIRES at its mark and then plays itself out as a real GSAP
    // stagger — one tween per line on the left, per word on the right, each
    // starting `Stagger` seconds after the last.
    leftAt: 0.04,
    leftDur: 1.15,      // s one line takes
    leftStagger: 0.19,  // s between one line and the next
    leftOut: 0,
    leftOutDur: 0.85,
    rightAt: 0.52,
    rightDur: 1.3,      // s one word takes
    rightStagger: 0.3,  // ...and "Until now" is two words, so it lands twice
    rightOut: 0,
    rightOutDur: 0.85,
    ease: "power2.out", // the stagger's own ease
  },

  // ═══════════════════════════════════════════════════════════════════════
  // V2 — the ring act. Keyboard 2 turns it on, 1 goes back to V1.
  //
  // V2 is not a different second act any more: it is a different SHAPE for the
  // whole middle of the page.
  //
  //   act two (#until)   the bowl holds the centre and never leaves it. The
  //                      GROUND opens out from behind it — an FBM-broken mask
  //                      that propagates and uncovers the new field — and
  //                      "Until now" lands on it in WHITE, over the object.
  //
  //   the first pin      THE RING ACT, on the three pinned steps. No canvas
  //   (#pinA, 1-3)       here: the bowl is the whole stage. One text per step,
  //                      top left; the TEACHERS ring on step 1, the
  //                      EXPERIENCES ring outside it on step 2 with the world
  //                      turning orange, and on step 3 the view goes over the
  //                      top of the bowl and everything converges and staggers
  //                      out.
  //
  //   the second pin     ...and the CANVAS EXPERIENCE — the sphere of
  //   (#pinB, 4-6)       portraits, the glass card, the pills — moves DOWN
  //                      here, keeping its own three steps. The evidence panel
  //                      is off in V2 (`evidence.show` is V1's).
  //
  // `sections.canvasFrom` is the one number that says which block of three the
  // canvas experience owns: 0 in V1, 3 in V2.
  // ═══════════════════════════════════════════════════════════════════════
  v2: {
    on: false,
    vh: 300,          // act two's own scroll in V2
    // The bowl reaches its big `until` pose exactly when act two starts
    // pinning; lower it and it gets there earlier.
    riseFrac: 1,
    bowlSize: 0.42,
    bowlSizeEnd: 0.34,

    // ── how EVERY block in V2 is revealed ─────────────────────────────────
    // One animation, everywhere: opacity 0 → 1 while Exposure's EXPO axis
    // travels +100 → −10. Strictly in place — `rise` and `lineRise` are both 0,
    // so nothing climbs into a clip box and nothing drops back out of one, and
    // the exit is that same travel run backwards. It is the whole of the
    // motion: no blur, no skew, no rise.
    reveal: {
      expoFrom: 100,
      // 0, not −10 (his ask, 2026-09-21 — "così che sia più asciutto il
      // font per i titoli"): the same rest the intro and the body text
      // already sit at, so every Exposure title on the page lands drier
      expoRest: 0,
      fadeIn: 1,      // the opacity ramp IS the whole travel
      // ── strictly in place ───────────────────────────────────────────────
      // No vertical travel AT ALL, in or out: a line unfolds exactly where it
      // already sits (opacity 0 → 1, EXPO +100 → −10) and the exit is that
      // same thing run backwards — a mirror, not a continuation upward. The
      // rail (rise from below, carry on past on the way out) was tried and
      // rejected: it read as arriving from underneath, which is exactly what
      // this reveal must never look like.
      //
      // The two knobs stay wired (`playUnitsOut`/`linesAt` still honour them)
      // so a rail can come back with two numbers if it's ever wanted again —
      // they default to 0, which is off.
      lineShift: 0,   // em it rises from — 0 = already in place
      lineExit: 0,    // em it carries on by as it leaves — 0 = mirrors the entry
      rise: 0,        // the same two, for a block set in words
      riseExit: 0,
      lineRise: 0,
      blur: 0,
      skew: 0,
      riseOut: 0,
      overshoot: 0,
    },

    // Everything that sits ON the opened field is set in this, not in ink.
    ink: "#f4ece1",

    // ── act two ───────────────────────────────────────────────────────────
    top: {
      text: "Across generations and cultures,|people have been looking for|practices that help them.",
      mode: "lines",
      align: "left",
      side: "left",
      // x: 4 — the SAME left inset as the ring act's own step copy below, the
      // evidence panel's title and the team section's padding (his ask,
      // 2026-09-16: "un padding delle sezioni che allinei perfettamente i
      // titoli" — one shared 4vw margin down the whole left-title chain,
      // rather than each section having picked its own close-but-not-quite
      // number over time).
      size: 2.0, width: 36, x: 4, y: 18,
      // it leaves before the ground opens, and the second one arrives on it
      at: 0.05, dur: 1.15, stagger: 0.19, out: 0.34, outDur: 0.9,
      ease: "power2.out",
    },
    bottom: {
      text: "This knowledge is carried by|people. It's never been understood|in a way that's useful to all of us.",
      mode: "lines",
      align: "right",
      side: "right",
      size: 2.0, width: 36, x: 5, y: 72,
      // ...while the ground is still opening under it
      at: 0.45, dur: 1.3, stagger: 0.22, out: 0, outDur: 0.9,
      ease: "power2.out",
    },
    // "Until now" — BEHIND the bowl, on the layer under it, and WHITE: by the
    // time it lands the ground beneath it is the opened field, not paper, so it
    // is the one line on the page that is not ink.
    // Off in V2 (his ask, 2026-09-15: "così non ci incasiniamo") — one fewer
    // beat to keep straight now that `top`/`bottom` carry act two on their
    // own. The beat itself stays wired (`show: false` pulls it out of
    // `hero.js`'s `drive()` cleanly), so it is one flag away from coming back.
    until: {
      show: false,
      text: "Until now",
      mode: "words",
      align: "center",
      size: 2.6, width: 60, x: 50, y: 35,
      ink: "#ffffff",
      at: 0.66, dur: 1.3, stagger: 0.3, out: 0, outDur: 0.85,
      ease: "power2.out",
    },

    // ── the ground: the mask that opens out from behind the bowl ───────────
    // It is a MASK, not a picture: inside it the new field is uncovered,
    // outside it the page's own paper is untouched. The edge is broken by FBM
    // so it reads as something spreading rather than a circle growing, and it
    // drifts slowly around the object (`wander`) instead of sitting still.
    //
    // `video` takes over the mask when there is one: drop a webm in
    // `public/video/` and put its path here, and its luminance becomes the
    // mask — the same `scale`, the same everything else.
    ground: {
      show: true,
      at: 0.4,         // it opens as the first statement leaves
      dur: 2.6,        // s it takes to open out
      ease: "power2.out",
      scale: 1.35,     // how far it reaches, in viewport heights
      soft: 0.22,      // how soft the edge is, as a share of the radius
      fbm: 0.34,       // how much the FBM breaks the edge up
      freq: 2.6,       // ...and at what scale
      speed: 0.06,     // how fast the break-up crawls
      octaves: 4,
      wander: 0.03,    // viewport heights the centre drifts around the bowl
      wanderSpeed: 0.18,
      // The field act two opens into is DARK and warm, not orange: the orange
      // is the ring act's, and it arrives on the second step. This is the
      // ground "Until now" lands on, which is why that line is the one piece
      // of type on the page that is not ink.
      // The field is HIS THREE IMAGES — the same squares the left column of
      // V1 opens on (src/values/*) — one per step of the ring act, crossfaded
      // at each boundary, and seen THROUGH GLASS. The colours below are only
      // the tint over them, and the fallback if a folder is ever empty.
      images: true,
      tint: 0.16,         // how much of the colour is laid over the photograph
      color: "#3a2a20",   // the field that is uncovered
      color2: "#17100b",  // ...and what it deepens to at the edge
      // ── the glass ─────────────────────────────────────────────────────
      // The same idea as the left column's GlassSurface, done in the shader
      // that is already drawing the field: a wide frosted sample, the FBM
      // pushing the lookup around (refraction), a small split between the
      // channels, and a breath of white over the top.
      glass: {
        on: true,
        blur: 0.022,      // frost radius, in UV
        taps: 12,
        refract: 0.014,   // how far the FBM bends the lookup
        split: 0.004,     // the offset between the channels
        tint: "#ffffff",
        tintAmount: 0.1,
        brightness: 1.04,
        saturation: 1.06,
      },
      video: "",       // a webm in public/video/ takes the mask over
      out: 0,          // 0 = it stays: the ring act happens on this ground
    },

    // ── V2's own six steps ────────────────────────────────────────────────
    // The first three are the RING ACT (the first sticky), the last three the
    // canvas experience, which has moved down into the second one. It is a
    // separate array rather than a rewrite of `steps`, so V1 keeps its own and
    // switching version is a swap, not a migration.
    //
    // The last three carry V1's copy for now — they are the same experience —
    // so the "guided by people" and "Connecting…" lines are said twice on the
    // page until they are rewritten.
    steps: [
      {
        name: "Guided",
        vh: 200,
        text: "On a platform|guided by people",
        textIn: 0.2, textOut: 0.16, textDelay: 0.04,
      },
      {
        name: "Experiences",
        vh: 220,
        text: "Practices that people|actually live by",
        textIn: 0.2, textOut: 0.16, textDelay: 0.04,
      },
      {
        // No copy of its own any more, and shortened hard — down from the
        // original 240, then 190, now this (his ask, 2026-09-16: the same
        // "Connecting…" line was said twice, here AND as `evidence.title`,
        // and the act was leaving a long empty stretch of scroll once
        // everything had converged and gone). The readable part of the ring
        // act now ends at step 2's own "Practices that people actually live
        // by" — this step is purely the transition: the camera swoops
        // overhead, both rings converge into the bowl and vanish, and the
        // evidence panel's own "Connecting…" statement (already static,
        // already there) is what the reader reads next.
        name: "Connecting",
        vh: 110,
        text: "",
        textIn: 0.2, textOut: 0, textDelay: 0.04,
      },
      // ...and the last three are V1's EVIDENCE section — the statement and
      // the three sources — with V1's canvas (One · Sphere · Pills) running
      // inside it, in a box in the bottom-left corner. The copy is the
      // evidence panel's own, so these carry none.
      { name: "Users", vh: 220, text: "", textIn: 0.2, textOut: 0.2, textDelay: 0 },
      { name: "Therapists", vh: 220, text: "", textIn: 0.2, textOut: 0.2, textDelay: 0 },
      { name: "Research", vh: 220, text: "", textIn: 0.2, textOut: 0, textDelay: 0 },
    ],

    // ── the trust network — what actually sits in that corner ────────────
    // A FIELD of plain, unnamed vertices spread over a sphere — so the corner
    // reads as a small WORLD — three subsets of which get ASSIGNED a role as
    // the section scrolls: USERS (stock photos), then TEACHERS (portraits),
    // wired to their own user by a curve, then TECHNIQUES (pills), wired to
    // their nearest teacher — "the tree of connections widens". It fires off
    // the SAME three ramps that already drive the evidence rows (`tl.ev`),
    // so the diagram lands in lock-step with "Reporting from users /
    // therapists / Clinical research" rather than running its own clock.
    //
    // `show: true` puts it in the box in place of the V1 sphere-and-portraits
    // canvas — off, and the box falls back to that (see `canvasBox`).
    network: {
      show: true,
      fieldCount: 72,      // the whole sphere — every plain, unassigned vertex
      peopleCount: 8,       // ...of which this many become USERS
      teacherCount: 8,       // ...and this many TEACHERS, paired 1:1 with a user
      techniqueCount: 16,     // ...and this many TECHNIQUES — deliberately more
      // than the teachers: every technique wires to its own NEAREST teacher
      // rather than a fixed one-per-teacher cap, so the pills can outnumber
      // them and still read as one connected fan, not orphaned dots.
      centerX: 46, centerY: 46,  // % of the box — the sphere's own centre
      radius: 34,           // % of the box's short side — the sphere's shell
      tiltX: -20,           // ° it is leant back by — 0 would read as a flat ring
      rotateY: 22,          // ° yaw — turns the seam away from dead-centre
      perspective: 0.55,    // 0..1 — how much depth affects size/opacity
      dotField: 5,          // px — the plain, unassigned vertices
      fieldColor: "#0a0a0a",
      fieldAlpha: 0.32,
      fieldIn: 0.14,        // share of step 1 the whole field takes to appear
      // The three steps ARE a hierarchy — the people, then the teachers who
      // carry what they know, then the techniques — so the teacher's photo is
      // decisively the bigger of the two (his ask, 2026-09-17: "più grande...
      // fatto bene"). 34 against 30 was a 13% difference: technically there,
      // visually not. 48 against 30 is 1.6×, which is read as a rank rather
      // than as a rendering accident. Bowl panel → "Network — the three steps".
      dotUser: 30,          // px — the user photo
      dotTeacher: 48,       // px — the teacher photo, and the point of the step
      pillReach: 1.55,      // how far outside the shell a technique pill sits,
      // along its own vertex's own direction from centre
      bow: 0.3,             // how much a connector bows outward — the "sphere"
      stagger: 0.55,        // share of a ramp spent staggering dot → dot
      lineWidth: 1.5,
      lineColor: "#0a0a0a",
      lineAlpha: 0.26,
      pill: {
        bg: "#0a0a0a", ink: "#ffffff", fontSize: 10.5, padX: 12, h: 24,
      },

      // ── V4 ONLY: THE CONTOURS — a sphere flattened, then inflated ─────
      // His idea and his correction, 2026-09-17: first the rings come out,
      // then the vertices ("molto piccoli... subtle"), and then the flat
      // thing inflates into a sphere you can turn with the pointer, with the
      // technique pills orbiting it and lines that follow the mesh.
      //
      // The flat state is not a decoration of a sphere, it IS one: the
      // AZIMUTHAL EQUIDISTANT projection — the one on the UN flag — puts the
      // pole at the centre and every parallel at a radius proportional to its
      // angular distance from it. So evenly spaced latitudes really do come
      // out as evenly spaced concentric rings, and the third step is that
      // projection being wrapped back onto the ball it came from.
      //
      //   flat   ρ = Rf · (π/2 − φ)/θmax ,  bearing λ
      //   ball   x = cosφ·sinλ ,  y = sinφ ,  z = cosφ·cosλ
      //
      // Both are true positions of the same (φ, λ), so the inflation is one
      // lerp and scrolling back up flattens it again exactly.
      globe: {
        rings: 10,         // the parallels — concentric contours when flat
        points: 320,       // vertices, spread evenly over the SPHERE
        latMax: 84,        // ° — how near the poles the lattice goes
        flatR: 43,         // % of the box's short side — the outermost ring
        radius: 37,        // % of the box's short side — the SPHERE
        // A little PERSPECTIVE, not orthographic: the near side of the ball
        // is drawn larger than the far side. It is what makes a wireframe
        // read as a solid turning in space rather than as a flat pattern —
        // and it is applied to positions, dot sizes and the pills alike.
        perspective: 0.26,
        ringColor: "#0a0a0a",
        ringAlpha: 0.13,
        ringWidth: 1,
        ringIn: 0.5,
        ringSamples: 64,
        // SMALL and quiet (his ask). A texture, not a population of marks.
        dot: 1.5,
        dotMid: 2.3,
        dotBig: 3.4,
        dotAlpha: 0.55,
        midEvery: 6,
        bigEvery: 29,
        bigColor: "#16302a",
        backAlpha: 0.15,   // the far side of the ball — rings, dots, chains
        tilt: -20,         // ° it is leant by
        spin: 42,          // ° it turns across the inflation
        foldOver: 0.7,
        stagger: 0.55,
        // ── the techniques: MORE of them, in a real orbit ───────────────
        pills: 12,
        pillOrbit: 1.3,    // × the sphere's radius
        pillIn: 0.06,      // where in STEP ONE they arrive
        pillBand: 46,      // ° — orbits stay within this latitude of the equator
        pillBackScale: 0.84, // extra shrink for a pill swinging behind
        // ── the chains: vertex → vertex → technique, on the surface ──────
        arcsPer: 2,        // chains per technique
        chainLen: 3,       // vertices in a chain before the technique
        arcSpan: 0.78,     // radians of great-circle distance a chain covers
        arcAlpha: 0.42,
        arcWidth: 1,
        arcSamples: 20,
        // the vertices a chain passes through LIGHT UP as it reaches them — a
        // hairline halo — so the connection is felt at the point, not only
        // read along the line
        halo: true,
        haloR: 6,          // px
        haloAlpha: 0.7,
        // ── turning it by hand: both axes, with inertia ──────────────────
        drag: true,
        dragSpeed: 0.3,    // ° per px, horizontal
        dragTilt: 0.18,    // ° per px, vertical
        inertia: 0.9,      // how much of a fling survives each frame
        recenter: 0.012,   // how fast it settles back per frame
      },

      // ── V4's first proposal — the BRAID. Kept, unused: he preferred the
      //    globe, and this is one `variant` branch away if it is ever wanted.
      //
      // The sphere and the disc are both RADIAL: they put the subject in the
      // middle and you read outward. This one is LINEAR and reads left to
      // right, like the sentence it illustrates.
      //
      // Three strands enter from the left — the people's own reports, the
      // therapists' reports, the clinical research — wind around one another
      // passing visibly over and under, and converge into a single node on
      // the right. That is the claim the section actually makes ("unifying
      // data from clinical research, reporting from therapists, and lived
      // outcomes"): three independent sources becoming one answer. A braid
      // is the plainest picture of that there is, and it fills a landscape
      // box the way a circle never can.
      //
      // Each strand is a sine wave in y, the three of them 120° apart in
      // phase, winding `twists` times over the box's width, with the
      // amplitude closing to almost nothing by the right-hand end. The
      // over-and-under is real: every strand is painted as short segments
      // sorted back-to-front by `sin(phase)`, so a strand that is behind is
      // genuinely drawn under the one in front of it, and dimmer.
      braid: {
        // A FUNNEL, not a uniform rope: wide at the left so the three enter
        // as three clearly separate things, winding as they run, and closed
        // to almost a point at the right. That shape is the sentence —
        // three sources, one answer — where an even rope is just a texture.
        twists: 1.65,      // how many times the three wind around each other
        spread: 33,        // % of the box's height — half-amplitude at the left
        converge: 0.96,    // 0-1 — how much of that has closed by the right end
        // Where the winding STARTS, and it matters more than it looks: at 0°
        // the three strands sit at cos 0° / 120° / 240°, and the last two are
        // the same number — two of them would enter the frame on exactly the
        // same line, with their labels on top of each other. −90° opens them
        // to 0 / +0.87 / −0.87: three distinct heights at the left edge.
        phase: -90,        // °
        segments: 44,      // per strand: the over/under is painted piece by piece
        feather: 0.16,     // softness of the leading edge as a strand draws in
        beads: 4,          // photos (or pills) carried along each strand
        beadFront: 0.3,    // only place one where its strand is this far forward
        lineWidth: 2,
        backAlpha: 0.3,    // how far a segment fades as it passes behind
        padX: 7,           // % of the box kept clear at each end
        outcome: 22,       // px — the node the three converge into
        labels: true,      // name the three strands at their left-hand ends
        labelSize: 11,     // px
      },

      // ── V3 ONLY: the flat golden-angle disc (his ask, 2026-09-17) ──────
      // The sphere above is untouched and is still what V2 draws. This is
      // the other reading of the same three steps: one continuous
      // phyllotactic spiral, read outward — the people, then the therapists
      // on the band outside them, then the technique pills outside that,
      // with a 1:1:1 chain joining the three.
      //
      // The centre stays EMPTY and there are no field dots (his correction:
      // "non deve essere riempito... non voglio neanche i puntini"). What
      // shows first is the discs' own RINGS, drawn on as you scroll in a
      // very light grey, with the content growing over them.
      disc: {
        // its OWN centre: the sphere sits at 46/46 to leave room for the
        // pills it throws outward, but the disc's outer band is where its
        // pills already are, so it wants the middle of the box or the widest
        // labels get clipped against the left edge
        centerX: 50,       // % of the box
        centerY: 50,
        radius: 44,        // % of the box's short side — the OUTER edge
        // its OWN photo sizes: the disc is much bigger than V2's sphere, so
        // the faces have to grow with it or they read as specks
        dotUser: 38,       // px
        dotTeacher: 62,    // px
        rotate: -22,       // ° the whole spiral is turned by
        ringColor: "#0a0a0a",
        ringAlpha: 0.12,   // "un grigino molto leggero"
        ringWidth: 1,
        ringIn: 0.55,      // share of its own step a ring takes to draw on
        chainBow: 0.1,     // how much a chain link bows — 0 is a ruler line
      },
    },

    // ── V5: two circles around the bowl (his ask, 2026-09-21) ────────────
    // Not the vertex field — a small, four-stage diagram of plain SVG circles
    // and paths, sized off the BOWL'S OWN on-screen radius so the last one
    // lands exactly on its silhouette. Pure scrub: one continuous 0→1 value
    // off the canvas's own progress (`tl.canvasS0..S1`, the same span the
    // network's three `ev` ramps come from), cut into four stage windows
    // instead of three discrete steps — his diagram has four beats, not three.
    //   stage 1  two circles, touching, flank the bowl — captions reveal, the
    //            bowl itself crossfades to a 15%-opacity wireframe
    //   stage 2  they pull apart; a solid "stadium" boundary and a dashed
    //            echo of where they used to touch both appear
    //   stage 3  a third circle grows in the gap they left
    //   stage 4  a fourth, dashed circle — the bowl's own diameter — appears
    //            around all three, with the closing title above it
    circles: {
      show: true,
      // which diagram the block draws (2026-09-21): `flank` — V5's two
      // circles beside the bowl, below; `trio` — Experience 2's three circles
      // and the Atlas over them (`v2.trio`). Written by main.js from the
      // experience; never by hand.
      layout: "flank",
      // Every length is a share of the BOWL'S OWN on-screen radius R, read
      // off the bowl each frame — so the diagram is always the bowl's size,
      // whatever the viewport. Measured off his fourth frame: the two base
      // circles are ~0.32R and end up centred at ±0.40R. The two big circles
      // drawn around them are NOT a knob: circles.js sizes them so their
      // union is exactly 2R wide — tangent to the fourth circle, the bowl's.
      // (his follow-up, same day: "il cerchio del centro non fosse così
      // attaccato ai due... mi va in overlap il testo") — at 0.32R / 0.25r
      // the third OVERLAPPED the two by 0.75r. Now A and B move a full
      // 1.12r each, so the third clears them by 0.12r, edge to edge, and
      // the captions no longer meet. The base radius comes down to keep
      // the derived big circles overlapping (r + spread must stay < 0.5R
      // for the union to be one shape, not two).
      radiusFrac: 0.23,     // each base circle's radius (× R)
      spreadFrac: 1.12,     // stage 2: how much further apart they move (× r)
      // the bowl itself, brought back to dead-centre for this block (instead
      // of the ring act sinking it off the bottom): its size (in viewport
      // heights, like `v2.bowlSize`) and a slight lean so the wireframe
      // still reads as a bowl and not a flat ring
      bowlSize: 1.0, bowlTilt: 14,   // ≈ a 0.7vh-wide silhouette at 1.0 (his frames)
      // ...and the rest of its pose for this block (his ask, 2026-09-21 —
      // "dammi i controlli sulla bowl"): where it sits (pose units, like the
      // bowl's own `poses.*.x/y` — 0,0 is dead-centre), its roll, and how
      // fast the idle turn runs here (1 = as everywhere else, 0 = still)
      bowlX: 0, bowlY: 0, bowlTiltZ: 0, bowlSpin: 1,
      // the lattice it turns into: how dense, and what ink
      wireRings: 14, wireMeridians: 24, wireInk: "#0a0a0a",
      strokeWidth: 1,
      ink: "#0a0a0a",
      dashInner: "2 5",
      dashOuter: "2 6",
      // where each beat ENDS, as a fraction of the canvas's own 0→1 — five
      // abutting windows, so the whole thing reads as one continuous draw:
      //   0..wire      the bowl turns to wireframe, alone, on white
      //   wire..ab     the two circles draw on, from the point they touch
      //   ab..spread   they pull apart, the big circles draw around them
      //   spread..third  the third draws on in the gap
      //   third..1     the fourth — the bowl's own — draws on, title above
      // (the shader's outro and the white come BEFORE 0: the handover into
      // pinB, see the raf in main.js)
      marks: { wire: 0.16, ab: 0.38, spread: 0.56, third: 0.74 },
      wireframeOpacity: 0.15, // the bowl's own opacity once fully turned to wireframe
      textReveal: 0.45,       // the LAST share of a beat over which its caption arrives
      // type, as shares of R too — measured off his frames: a name is ~0.03R
      // (three of them have to sit side by side, 0.4R apart, without touching)
      nameSize: 0.03, descSize: 0.021, descGap: 0.07,
      outerLabelSize: 0.026, titleSize: 0.032, titleLh: 1.3,
      labels: {
        a: { name: "Contextual Research", desc: "Connecting the dots between\n350k+ practices" },
        b: { name: "Therapist Observation", desc: "Therapists put practices to the test\ninputting on how to best implement" },
        c: { name: "Real World Application", desc: "Giving them to people for free to practice\non their terms provides feedback" },
        outerLeft: "User driven feedback",
        outerRight: "Clinical Validation",
        title: "Better Practice\nEffective Discovery\nInsight Timer",
      },
    },

    // ── Experience 2: the three circles, and the Atlas built over them ───
    // (his ask, 2026-09-21, the final task.) In V5's block, after the shader
    // has closed and the white has risen: the bowl's lattice, then the circle
    // top-right, the one at the bottom, the one top-left — each drawn on as a
    // path — the big arcs and "in the field" / "on platform", then the paper
    // warms to the Atlas's own and the knot draws itself OVER the circles,
    // its cards arriving as its front passes each lobe. `src/trio.js`.
    trio: {
      show: true,
      // where the circles are. `knot`: each IS the knot's own lobe — the
      // least-squares circle through the outer stretch of the curve around a
      // vertex, projected through the Atlas's camera — so the band lands on
      // the line that announced it. `manual`: the triangle below, by hand.
      fit: "knot",           // knot | manual
      radiusScale: 1.0,      // × the fitted lobe radius
      fitSpan: 0.11,         // how much of the curve either side of a vertex the fit reads
      manual: { cx: 0.5, cy: 0.52, D: 0.27, rFrac: 0.78 },   // centre, spread and radius, × min(W,H)
      strokeWidth: 1, ink: "#0a0a0a",
      // the big arcs, as in his frame: each centred on one circle, running
      // from the direction of one neighbour's centre to the other's
      arcFrac: 1.16,         // radius, × the circles' own centre-to-centre distance
      arcOver: 0,            // ° each arc runs past the two centres
      arcWidth: 0.75, arcAlpha: 0.5,
      arcStagger: 0.5,       // 0 = all three at once, 1 = strictly one after the next
      // where each beat ENDS, as a fraction of the block's own 0→1 — abutting,
      // so the whole thing reads as one continuous draw (the shader's outro
      // and the white come BEFORE 0, in the handover)
      marks: { wire: 0.07, c1: 0.19, c2: 0.31, c3: 0.43, arcs: 0.52, knot: 0.58 },
      // the lattice fades out once the arcs are in — the knot has the centre
      bowlOut: { at: 0.5, dur: 0.07 },
      textReveal: 0.45,      // the LAST share of a beat over which its caption arrives
      captionsOut: true,     // the captions go as the knot begins (the cards take over)
      captionsOutDur: 0.08,
      // type, × the circle radius — measured off his frame
      nameSize: 0.1, descSize: 0.058, descLh: 1.4, sideSize: 0.095,
      nameY: 0.1,            // the name sits this far ABOVE the centre (× r)
      descY: 0.14,           // ...the description this far below
      sideOut: 0.42,         // "in the field" / "on platform": outside the top circles by
      sideDown: 0.42,        // ...and below the midpoint between them and the bottom one
      labels: {
        tr: { name: "Member feedback", desc: "Feedback from users\npracticing daily" },
        b: { name: "Therapist reports", desc: "Therapist input on how to best\nimplement each practice" },
        tl: { name: "Clinical research", desc: "Linking our knowledge\nto 350k+ practices" },
        left: "in the field",
        right: "on platform",
      },
      blockVh: 720,          // the block's whole scroll, split evenly over its three steps
      // the bowl for THIS block — V5's flanking pair fills the frame with it
      // (the fourth circle IS the bowl); here it is the object the three
      // circles are drawn around before the knot takes the centre, so it
      // sits smaller. Same units as `v2.circles.bowl*`.
      bowl: { x: 0, y: 0, size: 0.6, tilt: 14, tiltZ: 0, spin: 1 },
      // the Atlas, as this stage wants it — put back as the preset had it
      // whenever the trio is off
      atlas: {
        paper: "#EEE9E2",    // the knot's own paper, faded in under the circles...
        paperAt: 0.46, paperDur: 0.1,   // ...over this window of the block
        circlesUnder: 0.55,  // the circles' ink once the knot is over them
        offsetY: 0.9,        // the camera's pan — the mark sits under the title (the preset's 1.3)
        padding: 1.12,       // ...and its fit: closer than the preset's 1.2, so the lobes read
        cardsPadTop: 96,     // px the cards keep clear of the top
        // each card seated on the lobe under ITS circle — Members on "Member
        // feedback", Therapists on "Therapist reports", the library on
        // "Clinical research" — by which circle, not by a number
        cards: { library: "tl", members: "tr", therapists: "b" },
        pointer: true,       // the knot still leans to the pointer here
      },
    },

    // The canvas experience does not take the frame in V2: it sits in a box
    // of its own on the RIGHT of the evidence section (his own reference,
    // 2026-09-15 — moved off the bottom-left corner once the summary
    // paragraph landed there too and the two started fighting for the same
    // patch of the frame), while the statement, the three steps and the
    // summary have the left column. In % of the viewport, measured from the
    // bottom-left.
    canvasBox: { x: 52, y: 20, w: 42, h: 58 },
    // ...and a BIGGER one for V3 and V4 (his note, 2026-09-17: the disc "is
    // too small"). The disc's own outer edge is limited by the box's WIDTH,
    // not by its radius — a pill at the 3 o'clock position needs its own half
    // width inside the frame too — so the only way to grow the drawing is to
    // grow the frame. V2's sphere keeps the box it was composed in.
    canvasBoxBig: { x: 49, y: 13, w: 48, h: 76 },

    // ── the ring act, on the three pinned steps ───────────────────────────
    act: {
      copyMode: "lines", // one line at a time, in place | words | chars | fade
      copyAlign: "left",
      // one keyframe per step now (his ask, 2026-09-16) — the same "one
      // number per step" idiom `size`/`tilt`/`dist` already use below. Every
      // step starts on the SAME value, so this is a no-op until he actually
      // dials one step apart from the others.
      copySize: [2.0, 2.0, 2.0],   // vw
      copyWidth: [40, 40, 40],     // vw
      // 4vw — the same shared left inset as `top.x` above, `evidence.titleX`
      // and the team section's own padding (his ask, 2026-09-16 — see the
      // comment on `top.x`).
      copyX: [4, 4, 4],            // vw from the left
      copyY: [18, 18, 18],         // % of the viewport
      // The bowl across the three steps. `dist` is the CAMERA's distance: the
      // bowl holds its size on screen whatever it is (the placement is derived
      // from the same number), so pulling it in is a real dolly — the
      // perspective deepens and the rings separate — rather than a zoom.
      //
      // Each step's pose is reached AHEAD OF TIME, during the TAIL of the
      // step BEFORE it — over the last `transitionShare` of that step's own
      // scroll — and then simply HELD once its own step begins. So the reader
      // arrives at step 3 already looking straight down on the bowl, rather
      // than still tipping into that view while trying to read its line —
      // which is what transitioning AFTER arrival (or smearing continuously
      // across all three steps) both used to do.
      transitionShare: 0.32,
      size: [0.34, 0.40, 0.44],
      tilt: [9, 9, 78],        // ° — step 3 takes the view over the top
      tiltZ: [11, 6, 0],
      dist: [5.0, 3.6, 2.8],
      // ...and the world turns orange under it. `at` is a STEP index: the
      // field starts travelling toward `color` when that step begins.
      //
      // `hdr` puts the captured environment itself behind the 3D. Only a real
      // equirect can be a world background (a PMREM target cannot), so it only
      // takes once the two EXRs are in `public/hdr/`; until then the ground
      // layer's own field is what is behind the object, and the environment's
      // slow turn (`envSpin`, ° across the act) is the light moving on it.
      bg: {
        at: 1, span: 0.55,
        // ONE colour per step of the ring act (his ask, 2026-09-17: "lo
        // sfondo verde, lo sfondo arancione e lo sfondo blu") — the field
        // blends from each to the next across the step boundary, so the
        // whole act reads as a descent through three coloured zones.
        // `parallax` is how far the field itself drifts UP, per step, in
        // viewport heights — "come se l'immagine avesse un parallax che
        // fingesse quasi la caduta di questo oggetto" — a pure function of
        // the scroll, cumulative across the steps so it never jumps at a
        // boundary. `strength` is how much of the step colour is laid over
        // the ground's own base colour once the act has taken over.
        colors: ["#2f6e4a", "#c8641e", "#2f5a86"],
        // The parallax is on the PHOTOGRAPHS themselves (his correction,
        // 2026-09-17: "ad ora non vedo nulla" — the first cut only nudged
        // the mask's centre, which the eye can't read). The image is zoomed
        // by `zoom` to make room, and that room is panned from the TOP of
        // the picture at the start of the act to the BOTTOM at its end
        // ("puntando verso l'alto all'inizio e andando verso il basso"),
        // ONE pan shared by both images of a crossfade so they match.
        // `parallax[i]` is each step's SHARE of that travel — its speed —
        // so the three always add up to exactly the room there is.
        zoom: 1.25,
        // ONE continuous run (his ask, 2026-09-17: "non voglio che si fermi
        // mai, se no si rovina l'esperienza di uno scroll"): the pan is a
        // single function of the page's own pixels, from the moment the
        // ground opens in act two, through the 40vh above the act, the three
        // steps, and the hand-over until the next section has covered it.
        // Each of those five stretches is weighted by its LENGTH × its
        // multiplier below, so by default the picture moves at one constant
        // speed per pixel scrolled and never pauses anywhere — a multiplier
        // only ever makes its stretch faster or slower, never still.
        preSpeed: 1,           // act two, from `ground.at`, and the run-in
        parallax: [1, 1, 1],   // the three steps
        postSpeed: 1,          // the hand-over, until pinB covers
        strength: 1.0,
        hdr: false, blur: 0.28, intensity: 1.0,
        envSpin: 40,
      },
      // everything staggers out at the end of the last step — and does not
      // just fade where it stands: both rings CONVERGE to the bowl's own
      // centre as they go (`ring.collapse` in ring.js), so they read as
      // gathering into the object and disappearing there, not dissolving in
      // place.
      outAt: 0.9, outDur: 1.0, outStagger: 0.06,
      // ...and the bowl SINKS as they go (his ask, 2026-09-17: "la ball...
      // tipo poco prima, vada verso il basso"): from `exit.at` of the act's
      // own clock — a touch BEFORE `outAt`, so it is already moving when the
      // rings start to converge — it travels `exit.y` viewport heights
      // (negative = down, the poses' own axis) over `exit.dur` of the clock.
      // A pure function of the scroll like everything else here, so
      // scrolling back up lifts it straight back into place.
      // `through: true` (his correction, 2026-09-17: "si blocca in basso
      // senza senso") — the sink does NOT stop where the act's clock ends: it
      // eases in over `dur`, then keeps going at that same rate through the
      // hand-over, so the bowl is still moving down when the next section
      // covers it and is never seen parked at the bottom of the frame.
      // ...timed to the section that rises over it (`scroll.earlyRiseVh`):
      // the bowl starts down at 0.78, `#pinB`'s top clears the viewport's
      // bottom at ~0.83, and the two travel together from there.
      exit: { at: 0.78, y: -0.5, dur: 0.22, through: true },
    },

    // ── the two rings ─────────────────────────────────────────────────────
    // Both are built into the BOWL's scene, so they share its depth buffer and
    // really pass behind it. `radius`, `card` and `z` are in BOWL DIAMETERS.
    //
    // `from` / `to` are steps of the ring act (0-based) — the ring blooms on
    // `from` and everything it is scrubbed between (radius, lean, card) travels
    // from its first value to its second across `from` → `to`.
    rings: {
      a: {
        show: true,
        // his ask, 2026-09-15: the FIRST ring must read as teachers, not
        // ordinary people — despite the step's own copy ("On a platform
        // guided by people"), the face he wants there is a teacher's
        source: "teachers",   // people | teachers | experiences
        count: 14,
        // it blooms on step `from` (a fraction `at` into it) and everything it
        // is scrubbed between has arrived by the end of step `to`
        from: 0, to: 2, at: 0.12,
        // by the last step it is a TIGHT inner ring around the rim, seen from
        // over the top of the object — small, close, and almost flat.
        // `minRadius` is the floor NEITHER this shrink NOR the entry bloom NOR
        // the end-of-act collapse may cross — the bowl's own world radius is
        // ~0.5 × its diameter, so anything much below that is the image plane
        // cutting into the mesh. It reads as "gathered close around the rim",
        // not "buried inside the object".
        // wider (his ask, 2026-09-17: "tocca la texture") — 0.78 → 0.9, and
        // the floor up with it so the end-of-act gather never grazes the rim
        radius: 0.9, radiusEnd: 0.42, minRadius: 0.68,
        lean: 34, leanEnd: 4,
        // Left alone (his correction, 2026-09-17: "per quanto riguarda le
        // immagini del ring dei therapy, lascia stare: più piccole come
        // prima"). The hierarchy he wanted is in the NETWORK, one section
        // later — see `network.dotTeacher`.
        card: 0.22, cardEnd: 0.12,
        aspect: 1, corner: 0.36, cornerN: 4,
        y: 0, z: 0, tiltY: 0, tiltZ: 0,
        speed: 0.07, offset: 8,
        faceCamera: true, opacity: 1,
        dur: 1.0, stagger: 0.1, ease: "power2.out",
        enterScale: 0.45, enterRadius: 0.5,
        // the scroll's own "force" (his ask, 2026-09-17): how much faster
        // the orbit turns per px/s of scroll speed, in its OWN direction —
        // a damped kick that dies away the moment the scroll stops, so it
        // can never leave the ring turned to somewhere it wouldn't otherwise be
        force: 0.0012,
      },
      b: {
        show: true,
        source: "experiences",
        count: 16,
        from: 1, to: 2, at: 0.1,
        // ...and this one stays OUTSIDE it, turning the other way
        // ...and the activities a touch wider too (same ask), keeping the
        // same gap outside the teachers' ring
        radius: 1.42, radiusEnd: 0.74, minRadius: 0.8,
        // more lean than the inner ring: the outer orbit reads as sitting
        // FURTHER behind/in front of the object, which is where the extra
        // depth actually comes from — not from making the ring itself bigger
        lean: 38, leanEnd: 8,
        card: 0.24, cardEnd: 0.14,
        aspect: 1, corner: 0.36, cornerN: 4,
        y: 0, z: 0, tiltY: 0, tiltZ: 0,
        speed: -0.09,       // the opposite way round to the teachers
        offset: 24,
        faceCamera: true, opacity: 1,
        dur: 1.15, stagger: 0.1, ease: "back.out(1.35)",
        // it BLOOMS — starts small and tucked in close, grows out to its full
        // radius as it arrives, with a touch of overshoot on the ease. Starting
        // further out than the final radius (enterRadius > 1) read as the ring
        // shrinking IN from off-stage, which is the opposite of a bloom.
        enterScale: 0.4, enterRadius: 0.4,
        force: 0.0012,
      },
    },

    // ── the quiet section ─────────────────────────────────────────────────
    // Off: the bowl does not descend any more, so there is nothing for it to
    // descend into. Left in, because it is one flag away.
    quiet: {
      show: false,
      vh: 110,
      image: 0,
      dim: 0,
      fit: "cover",
    },

    // ...and the descent, likewise: off. The bowl holds the centre all the way
    // through and leaves the only way this page lets anything leave — the
    // canvas section rises over it.
    drop: { on: false, at: 0.72, y: -0.95, scale: 1, back: 1 },
  },

  // ── act three: the Atlas knot, collapsing over the pinned canvas ────────
  // The whole section is src/atlas/, ported from projects/atlas-knot; every
  // number it has lives in src/atlas/preset.json (the preset exported from
  // that studio). These are the only things the PAGE decides about it.
  atlas: {
    // Off in the current version (his ask, 2026-09-16): after the evidence
    // panel's three steps, the page goes straight to "The Great Team Behind"
    // — no third background to scroll through. The section and every one of
    // its numbers are untouched underneath this flag; flip it back on and it
    // is exactly as it was.
    show: false,
    vh: 400,           // the section's own scroll — the whole reveal
    overlapVh: 100,    // how much of it slides up OVER the section before it
    // Off: the next scroll-through goes in the section underneath, and a
    // shadow creeping over it while it plays is exactly what he did not want.
    shadow: false,
    // The header that introduces the mark. It is the first thing the section
    // says, so it fires almost immediately (`dur` is a share of the Atlas's
    // OWN scroll) and then just stays — a plain opacity fade, no travel, the
    // same "strictly in place" treatment every other block on the page got.
    title: {
      show: true,
      heading: "Bringing this data\ntogether lets us create\nsomething powerful.",
      sub: "A map of how wellbeing practices change how we feel, based on precise circumstances, moment to moment.",
      align: "center",
      top: 108,      // px from the top of the section
      size: 2.15,    // vw
      subSize: 0.95, // vw
      maxWidth: 640, // px
      dur: 0.05,     // share of the Atlas's own scroll it fades in over
    },
  },

  // ── "The Great Team Behind" — the last section on the page, for now ─────
  // His own reference (2026-09-15): a black grid of the real team, a
  // cursor-follow tooltip on hover (ported from crnacura/PlayersClub's
  // `tooltip.js`, the one piece of that repo he asked for). Names and roles
  // live in `src/data/team.js`; photos are their own folder, `src/team/*`.
  team: {
    // V4 — the names live UNDER the card instead of in a cursor tooltip (his
    // ask, 2026-09-17): the name in the ink, the role in a grey under it.
    captions: true,
    captionSize: 13,      // px — the name
    captionRoleSize: 12,  // px — the role under it
    captionGap: 10,       // px between the photo and the name
    // V3 — the grid reads as one quiet block of faces until you point at one
    // (his ask, 2026-09-17). Only ever applied in V3; the flag is here so the
    // panel can take it off without editing CSS.
    grayscale: true,
    // "\n" is a real line break here (his ask, 2026-09-16 — "the great" on
    // its own line, "team behind" under it, per the screenshot)
    title: "The Great\nTeam Behind",
    desc: "Our small but dedicated team of 70 people has transformed a basic meditation timer into a community of 30 million people and 20,000 teachers.",
    // the second grid's own small label (his ask, 2026-09-16: two grids,
    // ALWAYS both on the page, no tab to switch between them any more)
    partnersTitle: "Partners",
    // the cards arrive ROW BY ROW as each row scrolls into view (his ask,
    // 2026-09-17: "ad ogni 20% di scroll... l'intera fila in stagger, da
    // opacità 0 da y 100 fino a y 0"). Rows are found from the cards' own
    // rendered position, not a column count, so the 3-column mobile grid
    // gets the same treatment as the 6-column one for free. `y` in px.
    reveal: { on: true, y: 100, dur: 0.8, stagger: 0.08, threshold: 0.2 },
  },

  // ── the scroll bar (his ask, 2026-09-17) ──────────────────────────────────
  // Not a percentage readout: a thin line along the bottom of the viewport
  // that fills left → right across the WHOLE pinned canvas clock. It fades in
  // over the first `fadeIn` of that clock ("così che non si veda che sta
  // iniziando a partire") and back out over `fadeOut` past its end, so it is
  // never a stark bar sitting there before anything has moved. The unfilled
  // track behind it is the same colour at `trackAlpha`. `wavy` is reserved
  // for the five-interlaced-lines version he sketched — off, not built yet.
  progress: {
    show: true,
    color: "#ffffff",
    height: 4,        // px
    radius: 2,        // px — "tonda"
    bottom: 18,       // px from the viewport's bottom edge
    inset: 4,         // vw from each side — the same 4vw the titles share
    trackAlpha: 0.1,
    // a 1px dark hairline around the fill at this alpha — invisible on the
    // ring act's dark field, and what keeps a WHITE bar from vanishing over
    // the evidence panel's white stage (half the clock). 0 = off.
    edge: 0.25,
    // shares of the clock — and the clock is ~1180vh long, so 0.03 is
    // already ~35vh of scroll: enough to arrive unnoticed, short enough that
    // it is gone before the team section has really begun
    fadeIn: 0.03,
    fadeOut: 0.03,
    wavy: false,
  },

  // ── the player, bottom-left (his ask, 2026-09-17) ─────────────────────────
  // Replaces the fanned deck of video cards the hero used to carry (that
  // component, `src/cardswap.js`, stays on disk but is no longer mounted).
  // Christopher's own photo on the left — the same file the team grid uses —
  // then play/pause, then his name and what the track is. The audio is a
  // drop-in: the first file in `src/media/` (see its README). While that
  // folder is empty the control is there but disabled, and says so.
  player: {
    show: true,
    name: "Christopher Plowman",
    label: "About Insight Timer",
    emptyLabel: "Audio coming soon",
    // which corner it lives in. RIGHT (his ask, 2026-09-17: "Mettiamolo a
    // destra... penso che sia la scelta migliore"), which also hands the
    // bottom-left back to the hero's paragraph.
    side: "right",    // left | right
    left: 4,          // vw — the inset from ITS OWN side, whichever that is
    bottom: 4,        // vh
    // the photo, and — since the column beside it is at least as tall — the
    // whole bar's inner height. A LITTLE taller than it was (his ask,
    // 2026-09-17: "leggermente più alto, così ci sta bene tutto senza che sia
    // tutto bello compatto"), which is also what makes room for the equaliser
    // to sit under the name rather than beside it. The image follows it, so
    // it scales in proportion with the bar and never has to be set twice.
    size: 72,         // px — the photo, and the bar's inner height
    // concentric corners (his ask, 2026-09-17: "16px... 4px di padding...
    // calcolala tu"): the bar is `radius`, the photo inside it sits `pad`
    // in, so its own corner is `radius - pad` — 14px — and the two curves
    // share a centre instead of fighting.
    radius: 20,       // px — the bar
    pad: 6,           // px — the photo's inset from the bar's edge
    // the bar's own outline, which IS the playback timeline (his ask,
    // 2026-09-17: "lo stroke possa diventare invece la nostra linea del
    // tempo"). It is drawn twice — a faint track, and the progress composing
    // itself clockwise around it — so this is the weight of both.
    stroke: 1.5,      // px
    // `fake`: with no file in src/media the button still works and drives
    // the visualiser below from smooth noise — a FAKE player, his own ask,
    // so the effect can be seen and tuned before the real track exists.
    // The label still says "Audio coming soon" while it is fake.
    fake: true,
    // white glass (his ask): white at `alpha`, a backdrop blur, a hairline
    // of highlight along the top edge (`bevel`) so it reads as a pane
    glass: { on: true, alpha: 0.26, blur: 18, saturate: 1.35, bevel: 0.6 },
    // it rides along only until the three-step section arrives (his ask,
    // 2026-09-17: "arresta lo scroll di corsa del componente playback fino
    // alla sezione di tre step prima del team"): as pinB's top rises through
    // the last `parkOver` of the viewport the bar slides down and out, and it
    // comes straight back on the way up. "never" keeps it fixed throughout.
    parkAt: "evidence",       // evidence | never
    parkOver: 0.4,            // share of the viewport the slide-out takes
    // the equaliser: `bars` pills laid out horizontally, each growing and
    // shrinking FROM THE CENTRE line (both ends, not from a floor), between
    // `min` and `max` px, at `speed`
    wave: { on: true, bars: 22, width: 3, gap: 3, min: 3, max: 26, speed: 1 },
    // ── it closes as you read down, and opens as you come back up ─────────
    // His ask, 2026-09-17, in place of the hover lift he didn't like ("non
    // voglio che si alzi leggermente in Y... fa un po' cagare"): scrolling
    // DOWN shrinks the bar to just the photo and the play button, with the
    // type going out letter by letter from the RIGHT; scrolling UP opens it
    // again, letters returning from the left. Hovering always opens it,
    // wherever the scroll left it, and leaving puts it back.
    //
    // Note this is the ONE piece of the page that is not a pure function of
    // the scroll POSITION — it reads the scroll's DIRECTION, so it is
    // hysteretic by design. It is chrome, not choreography: it holds no state
    // beyond a boolean, it always settles, and the two ends are both defined.
    collapse: {
      on: true,
      // px/s of scroll before a direction counts as a direction — under this
      // the bar ignores the wobble at the end of a Lenis glide
      velocity: 90,
      dur: 0.52,        // s — closing
      openDur: 0.58,    // s — opening, a touch slower so it unfurls
      ease: "power3.inOut",
      openEase: "power3.out",
      charDur: 0.2,     // s — one letter's own fade
      charStagger: 0.012, // s between one letter and the next
      charShift: 5,     // px each letter slides as it goes
    },
  },

  // ═══════════════════════════════════════════════════════════════════════
  // THE BOWL — geometry, materials and studio ported from the bowl studio
  // (bowl-studio-source 2). The relief and the inner ramp are procedural
  // noise evaluated per pixel; the lights ARE the environment (src/env.js).
  // Panel: B.
  // ═══════════════════════════════════════════════════════════════════════
  bowl: {
    show: true,

    model: {
      // "glb"    — BOWL_OPTION C, one mesh, one material, rendered double-sided
      // "studio" — the bowl studio's two welded shells (slots A and B)
      source: "glb",
      glb: "/models/bowl-option-c.glb",
      rotX: 16,          // ° — POSITIVE tips the rim toward the camera
      rotZ: 0,
      noiseSpace: 8.0,   // the domain the procedural noise is evaluated in
      // The relief is scale-invariant now (the shader puts the object's own
      // scale back into the perturbation), so this is off. Raise it and the
      // hammering fades out once a pixel spans that many noise cells, which
      // is the cure if a very small bowl ever starts to shimmer on scroll.
      reliefAA: 0,
      wireframe: false,
    },

    cam: { fov: 26, dist: 5 },   // 26° ≈ the studio's 85 mm on a 36 mm sensor

    // ── how it rides the page ─────────────────────────────────────────────
    // Four poses on one clock. `x` is in viewport widths, `y` in viewport
    // heights (+ is up), `size` is the bowl's diameter as a fraction of the
    // viewport height. In the hero it sits DEAD CENTRE, because it is part of
    // the line: "We Guide" · the bowl · "You Through".
    poses: {
      hero:  { x: 0, y: 0.00,  size: 0.30, opacity: 1, tilt: 0, tiltZ: 0 },
      until: { x: 0, y: 0.02,  size: 0.46, opacity: 1, tilt: 9, tiltZ: 11 },
      // `hand` and `pin` are the SAME pose on purpose: the bowl's whole run
      // finishes with act two, and it does not move or scale again for the
      // rest of the page — the pinned steps get a bowl that is simply there.
      hand:  { x: 0, y: 0.00,  size: 0.11, opacity: 1, tilt: 0, tiltZ: 0 },
      pin:   { x: 0, y: 0.00,  size: 0.11, opacity: 1, tilt: 0, tiltZ: 0 },
      end:   { x: 0, y: 0.00,  size: 0.11, opacity: 0, tilt: 0, tiltZ: 0 },
    },
    riseAt: 0.34,     // where hero → until has finished, on the opening clock
    fallAt: 0.70,     // ...and where it starts shrinking back down to `hand`
    // Its whole journey is the pinned section: by the last step it is dead
    // centre at `pin` and it simply stays there, turning.
    lockLast: true,
    // Its run ENDS with the third step and it simply stays there, dead centre,
    // turning, for the rest of the pinned clock — no fade out. `fadeAfter` is
    // measured from the end of the WHOLE clock instead, i.e. from the moment
    // the Atlas starts collapsing over it: by then it is already covered, so
    // nothing is ever seen to leave, and scrolling back up brings it straight
    // back.
    fadeAfter: 0.6,
    handEase: "expo",   // expo | smooth | linear — how it GROWS into `until`
    // ...and how it comes back down. `smooth` leaves and arrives with zero
    // velocity, so grow → shrink has no corner in it; `expo` would leave the
    // top of the arc at full speed, which is the snap he flagged.
    fallEase: "smooth",
    parkIn: 1,          // share of the pinned clock spent moving hand → pin —
                        // 1 means it finishes EXACTLY as the last of the three
                        // steps ends, and then it never moves again
    endFrom: 0.96,      // ...and the window it moves pin → end over
    endTo: 1.0,

    spin: {
      start: 38,        // ° it starts at (the studio's hero 3/4 view)
      turns: 0.55,      // turns across the opening act
      pinTurns: 0.85,   // ...and across the pinned act
      idle: 0.05,       // rad/s of drift on top, so it is never still
    },

    // 2 · it arrives AFTER "We Guide" and before "You Through"
    intro: {
      fromVh: 0.55,     // viewport heights below its pose it rises from
      fromScale: 0.84,
      dur: 1.6,
      delay: 1.15,
      ease: "expo.out",
    },

    render: { toneMapping: "aces", exposure: 1.0 },

    // ── post-processing (his ask, 2026-09-16 — moved here from the Atlas
    // scene, which is not what he meant; bloom removed 2026-09-17, his ask)
    // The bowl's own canvas is transparent over the page (`alpha:true`), so
    // every pass here has to carry that alpha channel through untouched —
    // `frame()` skips the whole composer when off, so this never costs
    // anything on a page where the bowl is rendering almost everywhere.
    post: {
      enabled: true,
      vignette: 0.14,
    },

    // ── look at the cursor (his ask, 2026-09-16 — "un po' di look at the
    // cursor sulla bowl, così possiamo avere qualcosa di più interattivo")
    // A small extra turn ON TOP of the scroll-driven pose: `ease` is how fast
    // it catches up to the pointer each frame (a lerp factor, not seconds —
    // 0 never moves, close to 1 is jittery/instant), `strengthX` is the yaw
    // it adds at the edge of the viewport, `strengthY` the lean. Purely
    // additive — turn it off and the pose is exactly what it was before this
    // existed.
    lookCursor: {
      enabled: true,
      strengthX: 6,   // ° of yaw at the horizontal edge of the viewport
      strengthY: 4,   // ° of lean at the vertical edge of the viewport
      ease: 0.06,
    },

    // ── the two material slots. A never gets colour noise, B never relief ──
    material: {
      A: {
        label: "outer shell",
        color: "#e2af73", roughness: 0.365, metalness: 1.0, ior: 1.5,
        specularIntensity: 1.05, envMapIntensity: 0.53,
        clearcoat: 0.0, clearcoatRoughness: 0.21,
        side: "front",
        // ── the relief is a MAP, not per-pixel noise ──────────────────────
        // `source: "image"` uses a real texture — `public/images/bowl-normal.webp`
        // by default, or whatever is loaded from the bowl panel (B → Relief →
        // "Load an image…"). A map has mipmaps, so it stays a surface at every
        // size; procedural noise has no footprint and aliases into glitter the
        // moment a pixel spans more than a cell.
        //
        // `imageScale` tiles it, `strength` is the bump depth (it becomes
        // `normalScale` for a normal map, `bumpScale` for a height map — the
        // image classifies itself).
        relief: { enabled: true, strength: 0.04, source: "image", imageScale: 5, imageRepeat: [1, 1] },
        // ...and the old procedural hammering is still here, one switch away:
        // Voronoi 1 with a smooth-min F1, ~45 dimples around. Set
        // `relief.source: "noise"` to go back to it.
        reliefNoise: {
          type: "Voronoi 1", seed: 143, octaves: 3.77, lacunarity: 1.75, gain: 0.17,
          exponent: 2.298, absolute: false, oscale: 9.67,
          scale: [1, 1, 1], offset: [0, 0, 0], rotation: [0, 0, 0],
          cycles: 1, lowClip: 0, highClip: 1, brightness: -0.366, contrast: -0.955,
        },
        colorNoise: { enabled: false },
        ramp: { mix: 0, pos: 0.5, soft: 0.9, a: "#ffffff", b: "#ffffff" },
        rampNoise: {
          type: "Perlin", seed: 0, octaves: 3, lacunarity: 2, gain: 0.5,
          exponent: 1, absolute: false, oscale: 100,
          scale: [1, 1, 1], offset: [0, 0, 0], rotation: [0, 0, 0],
          cycles: 1, lowClip: 0, highClip: 1, brightness: 0, contrast: 0,
        },
      },
      B: {
        label: "inner surface",
        color: "#c2856b", roughness: 0.57, metalness: 0.74, ior: 1.0,
        specularIntensity: 0.0, envMapIntensity: 0.0,
        clearcoat: 0.0, clearcoatRoughness: 0.0,
        side: "double",
        relief: { enabled: false, strength: 0, source: "noise", imageScale: 1, imageRepeat: [1, 1] },
        reliefNoise: {
          type: "Perlin", seed: 0, octaves: 3, lacunarity: 2, gain: 0.5,
          exponent: 1, absolute: false, oscale: 100,
          scale: [1, 1, 1], offset: [0, 0, 0], rotation: [0, 0, 0],
          cycles: 1, lowClip: 0, highClip: 1, brightness: 0, contrast: 0,
        },
        colorNoise: { enabled: true },
        ramp: { mix: 0.22, pos: 0.5, soft: 0.9, a: "#c9974e", b: "#eacd91" },
        // Gaseous — the slow burnt patina across the inside
        rampNoise: {
          // 8 octaves, not 13: at lacunarity 2.1 the top five were sub-pixel
          // at every pose size — 224 gradient evaluations per fragment for
          // nothing visible (perf pass, 2026-09-17)
          type: "Gaseous", seed: 248, octaves: 8, lacunarity: 2.1, gain: 0.5,
          exponent: 2.3265, absolute: false, oscale: 267.83,
          scale: [1, 0.38, 1], offset: [-1.33, -1.55, -5.7], rotation: [-50, 90, 20],
          cycles: 1, lowClip: 0, highClip: 1, brightness: 0.751, contrast: 0.764,
        },
      },
    },

    // ── the studio. These panels ARE the environment (PMREM) and they are
    //    also mirrored as real RectAreaLights, which is what lights slot B.
    studio: {
      // A REAL captured environment, when the files are there: one or two
      // equirectangular EXR/HDRs in public/hdr/, blended by `mix` and
      // pre-filtered into `scene.environment`. It lights the 3D and NOTHING
      // else — `scene.background` is never set, and the bowl's canvas is a
      // transparent layer over the page, so the paper shows straight through.
      // If a file is missing the panel rig below takes over.
      hdr: {
        // OFF until the files are actually in public/hdr/ (perf pass,
        // 2026-09-17): with `on` and no files the page fetched two 404s at
        // boot and ran the bowl unlit for a round-trip. Dropping the maps in
        // means flipping this too — the loaders are only pulled in when it is on.
        on: false,
        files: ["/hdr/creative_office.exr", "/hdr/gsg_prostudiosmetal_vol2_31_env.exr"],
        mix: 0.5,        // 0 = the first, 1 = the second
        intensity: 1.0,
        rotation: 0,     // °
      },
      preset: "Studio warm",
      intensity: 1.93,
      rotation: 176,
      domeTop: "#8a7a60", domeBottom: "#1d1913",
      domeIntensity: 0.88, domeGradient: 1.5,
      sceneLightScale: 0.055,
      pmremSigma: 0.028,   // 0.05 trips a clipping warning
      isolate: -1,         // solo one light while dialling it in
      lights: [
        { name: "key",  on: true, color: "#fff2dc", intensity: 11.0, w: 21, h: 17, soft: 0.62, az: -54, el: 28, dist: 13, roll: 0, toEnv: 1, toScene: 1 },
        { name: "fill", on: true, color: "#dfe8ff", intensity: 5.9,  w: 22, h: 16, soft: 0.90, az: 78,  el: 10, dist: 16, roll: 0, toEnv: 1, toScene: 1 },
        { name: "rim",  on: true, color: "#ffd9a4", intensity: 7.0,  w: 11, h: 7,  soft: 0.45, az: 166, el: 24, dist: 12, roll: 0, toEnv: 1, toScene: 1 },
      ],
    },
  },

  // the two clean sections around the piece
  sections: {
    aboveVh: 40,
    belowVh: 100,
    // The page is warm paper from the top until the first sticky, and the
    // canvas is the only white on it.
    pageBg: "#faf9f2",
    // Where the two sticky sections are cut: steps [0, canvasSteps) ride the
    // first one, the rest the second.
    canvasSteps: 3,
    // ...and WHICH block of three the canvas experience (the sphere of
    // portraits, the glass card, the pills) actually owns. 0 = the first
    // sticky, as in V1. V2 sets it to 3 and gives the first sticky to the ring
    // act instead.
    canvasFrom: 0,
  },

  // ── steps 4–6: the evidence panel takes the second sticky's left column ──
  // Rebuilt to his own reference (2026-09-15): the statement at the TOP, the
  // three sources in a HORIZONTAL row at the middle (each with a thin rail
  // ABOVE its label that fills as its step plays, and its own line of copy
  // underneath while it is the active one), and a smaller summary paragraph
  // at the BOTTOM — all sharing the same left margin, so the whole column
  // reads as one vertical stack of blocks rather than a title-and-list pair.
  evidence: {
    show: true,
    title: "Connecting experience to evidence,|validating techniques|with real outcomes.",
    titleMode: "lines",  // lines | words | chars — the split, not the trigger:
    // this block is painted once, in full, the moment the section is built
    titleAlign: "left",
    titleSize: 2.0,    // vw
    titleWidth: 40,    // vw of measure
    titleLh: 1.16,
    titleX: 4,         // vw from the left edge
    titleTop: 12,      // % of the viewport — it has to clear the sticky nav
    // The statement is NOT scrubbed: it fires when the scroll crosses
    // `titleAt` (a fraction of its step, after the column has arrived) and then
    // plays itself out LINE BY LINE on the variable axis — and strictly in
    // place, `titleRise: 0`, so it resolves where it already is instead of
    // climbing into frame.
    titleAt: 0.1,
    titleDur: 1.2,     // s one line takes
    titleStagger: 0.2, // s between one line and the next
    titleRise: 0,      // % of its own box a line travels — 0 = already there
    // ── the three steps, now a ROW ──────────────────────────────────────
    rowsX: 4,          // vw — the SAME left margin as the title and the summary
    rowsTop: 47,       // % of the viewport — roughly the vertical middle
    // narrow enough that the whole row (3 columns + 2 gaps) stays clear of
    // the bowl, which holds the exact centre of the frame right through
    // this section
    rowW: 11,          // vw — each step's own column width
    rowGap: 2,         // vw between one column and the next
    barH: 2,           // px — the rail is HORIZONTAL now, sitting above the label
    barBg: "#d7d5d1",
    barInk: "#0a0a0a",
    labelSize: 0.85,   // vw
    paraSize: 0.62,    // vw
    paraFade: 0.18,    // share of a step the paragraph fades over
    rows: [
      {
        label: "Reporting from users",
        para: "It's never been understood in|a way that's useful to all of us.",
      },
      {
        label: "Reporting from therapists",
        para: "Clinicians log what they prescribe and what comes back,|in their own words.",
      },
      {
        label: "Clinical research",
        para: "Peer-reviewed trials, mapped onto the techniques|they actually tested.",
      },
    ],
    // ── the summary, bottom-left — the statement this whole section used to
    // open on, demoted to a smaller supporting line once the steps carry it
    summary: "We're unifying data from clinical research,|reporting from therapists, and lived|outcomes from members to understand|the effect of wellbeing practices.",
    summaryMode: "lines",  // lines | words | chars
    summaryAlign: "left",
    summarySize: 0.95,   // vw
    summaryWidth: 27,    // vw
    summaryX: 4,         // vw — same left margin again
    summaryBottom: 10,   // % of the viewport from the bottom
    // It reveals the moment the SECTION ITSELF reaches the top of the
    // viewport (his ask, 2026-09-17: "quando la sezione tocca il top del
    // viewport"), rather than at a fraction of the pinned clock — which is
    // the same instant read off the thing he is actually looking at. Off,
    // and it goes back to firing at `titleAt` of its own range.
    summaryOnTop: true,
  },

  columns: {
    split: 50,         // % width of the left column during the three steps
    leftBg: "#ffffff",
    leftInk: "#0a0a0a",
    rightBg: "#ffffff", // the canvas ground
    pad: 4,            // vw of inner padding on the copy
  },

  // ── the left column: one photograph per step, with the glass card on top ─
  // Images are whatever sits in src/values/ (filename order).
  left: {
    images: true,
    cross: 0.22,       // share of a step the crossfade takes (the copy's own exit)
    zoom: 0.06,        // slow scale drift across a step (Ken Burns)
    dim: 0,            // 0–1, darkens the photograph
    card: {
      show: true,
      w: 54,           // % of the column
      // Square, always: the height is taken from the width in real pixels, so
      // the card is a true square whatever the viewport does. Turn it off and
      // `h` (% of the viewport height) takes over again.
      square: true,
      h: 46,           // % of the viewport height (only when `square` is off)
      y: 0,            // % of the viewport height, vertical offset
      r: 15,           // corner radius, % of the short side
      n: 4.2,          // squircle exponent — 2 is a plain circular corner
      blur: 14,        // px of backdrop blur under the card itself
      sat: 1.28,       // backdrop saturation
      tint: "#ffffff",
      alpha: 1,        // the card is SOLID white, like the reference
      // ...and the glass lives BEHIND it. `glassFull` puts the refraction
      // across the whole left column, edge to edge, so the entire photograph
      // is seen through it and the change of image reads through the glass;
      // off, it falls back to a squircle mat `frost` px around the card.
      glassFull: true,
      frost: 46,       // px the mat extends past the card (glassFull: false)
      frostTint: 0.06, // a whisper of white in the glass
      // React Bits' GlassSurface, ported to vanilla in src/glass.js: an SVG
      // displacement filter run as a backdrop-filter, so the mat bends and
      // splits what is behind it instead of only blurring it.
      glass: {
        on: true,
        borderWidth: 0.07,
        brightness: 50,
        opacity: 0.93,
        blur: 11,          // px, inside the displacement map
        displace: 0.4,     // the last small blur on the recombined channels
        saturation: 1.25,
        scale: -180,       // displacement strength
        redOffset: 0,
        greenOffset: 10,
        blueOffset: 20,
        xChannel: "R",
        yChannel: "G",
        blend: "difference",
        radius: 90,        // the map's own corner radius
        fallbackBlur: 26,  // Safari / Firefox: a plain frost
      },
      edge: 0.55,      // hairline on the squircle
      shadow: 0.0,
      shadowBlur: 70,
      shadowY: 26,
    },
  },

  // ── the single portrait the pinned section opens on ─────────────────────
  portrait: {
    intro: "fade",     // fade | none  (no height reveal — it holds the centre)
    introDur: 0.9,     // seconds
    fill: 0.44,        // fraction of the exposed canvas the portrait fills
    fov: 30,           // narrow lens → widens to camera.fov
    index: -1,         // -1 = auto (the card nearest the sphere equator)
  },

  // ── Wide Angle Sphere preset (design-component-library / cylinder.json) ──
  layout: {
    shape: "sphere",
    perRow: 21, rows: 4, radius: 9.8, rowGap: 3.1, curve: -0.12,
    faceCenter: true, faceCamera: true,
    spiralTurns: 2.9, spiralRise: 16.5, spiralGrow: -2.4,
  },
  images: {
    source: "photos",  // photos (src/photos/*) | metalab (the preset's media)
    count: 18,
    video: false,
  },
  geometry: {
    planeW: 3.2, aspect: 1, segments: 20, bend: 1,
    borderRadius: 0.22,
    cornerN: 4,        // 2 = circular corners, 4 = squircle (the app-icon look)
  },
  camera: {
    x: 0, y: 0, z: 15, lookAtX: 0, lookAtY: 0,
    fov: 90, tiltX: -4, tiltZ: -10,
  },
  motion: {
    autoSpin: 0.5,     // idle drift
    scrollSpin: 3.4,   // turns across the pinned scroll
    preSpin: 0.05,     // share of them spent while still assembling
    drag: true,        // drag to tumble
    dragX: true,       // ...vertically too (full trackball freedom)
    dragSense: 0.0026,
    momentum: 0.93,
    recenter: 0.06,    // how fast a hand-turned sphere squares up on step 1
    // 1 = it never stops: the spin runs to the very end of the pinned clock,
    // so the sphere is still turning when its section is covered over.
    spinUntil: 1,
  },
  parallax: {          // the preset's default mouse effect
    enabled: true, strengthX: 1.4, strengthY: 0.9, ease: 0.06,
  },
  assembly: {
    // The sphere does not wait for step 2: it starts blooming this far into
    // step ONE, so "One" hands over to "Sphere" with no seam in the middle.
    startFrac: 0.52,
    endFrac: 0.55,     // the sphere is complete this far into step 2
    stagger: 0.55,
    window: 0.45,
    distance: 3.5,
    order: "center",   // center | index | random
  },

  // ── step 3: the pills, as meshes ON the sphere — same 3D as the photos ──
  pills3d: {
    // the parent pills are the CATEGORIES from insighttimer.com/techniques
    // (src/data/techniques.js). A comma list here overrides them.
    text: "",
    count: 16,         // how many categories, in the dataset's order
    startFrac: 0,      // they start the moment step 3 does
    span: 0.72,        // fraction of step 3 the whole reveal takes
    stagger: 0.6,
    shell: 1.2,        // radius, as a multiple of the sphere's
    jitter: 0.1,       // ± radius scatter, as a fraction of the shell
    twist: 0.35,       // rotate their fibonacci ring off the photos'
    pillH: 0.9,        // world height of a pill
    float: 0.12,       // radial breathing, in pill heights
    floatSpeed: 0.3,
    tilt: 1.5,         // ° of lazy wobble around the billboard
    faceMode: "plane", // plane = aligned to the screen | point = at the camera
    enterScale: 0.55,
    order: "index",    // index | random
    bg: "#0a0a0a",
    ink: "#ffffff",
    radius: 0.5,       // 0.5 = stadium
    fontSize: 15,      // px in the label texture (crispness, not scale)
    padX: 1.05,        // horizontal padding, in ems
  },

  debug: {
    markers: true,     // scroll track + HUD (M)
    grid: false,       // column outlines
  },

  look: {
    opacity: 1,
  },
};

// ── the bowl, as HE dialled it (his JSON, 2026-09-21) ──────────────────────
// "Utilizzassi questi valori per il materiale della bowl per entrambe le due
// esperienze": the Bowl panel's own export, kept verbatim in
// `src/data/bowlPreset.js` and merged over the annotated defaults above —
// the same way the Atlas takes its studio preset over its own defaults. Both
// experiences share the one bowl, so both get it. Arrays (the studio lights,
// a noise's scale/offset) are replaced whole, objects are merged key by key.
// Against the defaults above it moves 14 values, all in `material`: the outer
// shell rougher (0.365 → 0.555) with a much finer relief (0.04 → 0.0065 at
// 5.7× scale), the inner surface more metallic (0.74 → 0.97), lightly
// clearcoated (0.09 / 0.11), single-sided, its colour noise off and its ramp
// stronger and lower (mix 0.34, pos 0.32, soft 0.51).
function mergeInto(target, src) {
  for (const k of Object.keys(src)) {
    const v = src[k];
    if (v && typeof v === "object" && !Array.isArray(v) && target[k] && typeof target[k] === "object" && !Array.isArray(target[k])) {
      mergeInto(target[k], v);
    } else {
      target[k] = Array.isArray(v) ? v.slice() : v;
    }
  }
  return target;
}
mergeInto(CONFIG.bowl, BOWL_PRESET);
