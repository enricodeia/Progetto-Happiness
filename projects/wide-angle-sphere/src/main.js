import Lenis from "lenis";
import { CONFIG } from "./config.js";
import { createSphere } from "./sphere.js";
import { createCopy } from "./copy.js";
import { createDebug } from "./debug.js";
import { createTitlesPanel } from "./titlesPanel.js";
import { createBowl } from "./bowl.js";
import { createHero } from "./hero.js";
import { createLeft } from "./left.js";
import { createBowlPanel } from "./bowlPanel.js";
import { timeline, pinVh } from "./timeline.js";
import { createProgress } from "./progress.js";
import { createPlayer } from "./player.js";
import { createAtlas, ATLAS_STATE } from "./atlas/atlas.js";
import { createTeam } from "./team.js";
import { createFooter } from "./footer.js";
import { createV3Panel } from "./v3Panel.js";
import { createAtlasSketch } from "./atlasSketch.js";
import { createRing } from "./ring.js";
import { createGround } from "./ground.js";
import { createNetwork } from "./network.js";
import { createQuiet } from "./quiet.js";
import "./style.css";

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (x) => x * x * (3 - 2 * x);
const lerp = (a, b, t) => a + (b - a) * t;

/** Three keyframes read as one curve: `t` 0 → 1 walks arr[0] → arr[last]. */
function keyAt(arr, t) {
  if (!Array.isArray(arr) || !arr.length) return 0;
  const n = arr.length - 1;
  if (n <= 0) return arr[0];
  const x = clamp01(t) * n;
  const i = Math.min(n - 1, Math.floor(x));
  return lerp(arr[i], arr[i + 1], smooth(x - i));
}

/**
 * The pose a step's array holds, reached AHEAD OF TIME — during the TAIL of
 * the PRECEDING step — and then simply HELD, rather than a value transitioned
 * after arriving or smeared continuously across the whole three-step act.
 *
 * `step`/`local` are which of the three steps we are in and how far through
 * it (0→1); `share` is how much of a step's tail is spent transitioning
 * toward the NEXT one. So the last `share` of step i is where the pose for
 * step i+1 is reached, and step i+1 itself begins already sitting in it —
 * which is the whole point for step 3: it has to read as already looking
 * straight down on the bowl from the moment its own line arrives, not still
 * tipping into that view while the reader is trying to read it. It is the
 * same idiom the rest of this clock uses everywhere else (the sphere's
 * assembly starting inside step One, not at Sphere's own start) — the next
 * thing is already under way by the time its own step gets to speak.
 */
function stepLeadAt(arr, step, local, share) {
  if (!Array.isArray(arr) || !arr.length) return 0;
  const n = arr.length - 1;
  const i = Math.max(0, Math.min(n, Math.round(step)));
  if (i >= n) return arr[n];               // the last keyframe: nothing ahead of it
  const tailStart = 1 - Math.max(0.02, share);
  if (local <= tailStart) return arr[i];    // holding, not yet in the tail
  const t = smooth(clamp01((local - tailStart) / Math.max(0.02, share)));
  return lerp(arr[i], arr[i + 1], t);
}

const pinAEl = document.getElementById("pinA");
const pinBEl = document.getElementById("pinB");
const pinCEl = document.getElementById("pinC");
const stageEl = document.getElementById("stageA");
const stageBEl = document.getElementById("stageB");
const stageCEl = document.getElementById("stageC");
const canvasLayerEl = document.getElementById("canvasLayer");
const leftAEl = document.getElementById("leftA");
const leftBEl = document.getElementById("leftB");
const copyBoxEl = document.getElementById("copybox");
const copyBoxBEl = document.getElementById("copyboxB");
const networkBoxEl = document.getElementById("networkBox");
const bowlLayerEl = document.getElementById("bowlLayer");
const atlasViewEl = document.getElementById("atlasView");
const atlasTitleEl = document.getElementById("atlasTitle");
const atlasCardsEl = document.getElementById("atlasCards");
const navEl = document.getElementById("nav");
const heroEl = document.getElementById("hero");
const untilEl = document.getElementById("until");
const underEl = document.getElementById("under");
const groundEl = document.getElementById("ground");
const quietEl = document.getElementById("quiet");
const aboveEl = document.getElementById("above");
const belowEl = document.getElementById("below");
const footerEl = document.getElementById("footer");
const footerSpacerEl = document.getElementById("footerSpacer");
const rootStyle = document.documentElement.style;

let sphere = null;
let copyA = null;
let copyB = null;
let left = null;
let debug = null;
let io = null;

// The split never moves: the canvas holds the right half from the first step
// to the last, so the frustum skew is set once and stays.
function applyColumns() {
  const c = CONFIG.columns;
  const k = CONFIG.sections;
  rootStyle.setProperty("--split", `${c.split}%`);
  rootStyle.setProperty("--copyw", `${c.split}%`);
  rootStyle.setProperty("--copy-ink", c.leftInk);
  const held = (CONFIG.left.card.w / 100) * (c.split / 100) * 0.86 * window.innerWidth;
  rootStyle.setProperty("--copy-max", `${Math.round(held)}px`);
  // In V2 the canvas has a box of its own in the corner, so there is no column
  // to compose around: the frustum skew goes to zero and it centres in its box.
  sphere?.setSplit(CONFIG.v2.on ? 0 : c.split / 100);
  rootStyle.setProperty("--left-bg", c.leftBg);
  rootStyle.setProperty("--left-ink", c.leftInk);
  rootStyle.setProperty("--right-bg", c.rightBg);
  rootStyle.setProperty("--pad", `${c.pad}vw`);
  rootStyle.setProperty("--page-bg", k.pageBg);
  // the last stage is the Atlas's own ground, so the DOM behind the canvas
  // and the canvas itself can never disagree on the colour of the paper
  rootStyle.setProperty("--atlas-bg", ATLAS_STATE.scene.background);
  rootStyle.setProperty("--nav-fade", `${CONFIG.hero.nav.fade}px`);
  // 0 takes the band out entirely rather than drawing a zero-height one
  rootStyle.setProperty("--nav-fade-on", CONFIG.hero.nav.fade > 0 ? "1" : "0");
  rootStyle.setProperty("--v2-ink", CONFIG.v2.ink);
  document.body.classList.toggle("is-nav-sticky", !!CONFIG.hero.nav.sticky);
  aboveEl.style.height = `${k.aboveVh}vh`;
  // `#below` used to be an empty spacer, forced to a fixed vh; now it holds
  // the team section, which has to size to its own real content instead.
  belowEl.style.removeProperty("height");
  lastOn = null;
  lastAtlasOn = null;
  sphere?.setClear(c.rightBg);
  left?.style();
  copyA?.style();
  copyB?.style();
}

function applyScrollStyle() {
  const stack = CONFIG.scroll.style === "stack";
  document.body.classList.toggle("is-stack", stack);
  document.body.classList.toggle(
    "is-stack-shadow",
    stack && !!CONFIG.scroll.stackShadow
  );
  rootStyle.setProperty("--overlap", `${CONFIG.scroll.overlapVh}vh`);
  applyPinHeight();
}

// ── three sections, one clock ──────────────────────────────────────────────
// `#pinA` is the canvas experience (steps 1 → `canvasSteps`), `#pinB` the held
// section that carries the rest of the same clock, and `#pinC` the Atlas.
//
// A and B are ordinary stickies on ONE clock: A's tail IS B's run-in (the
// `scroll.handoverVh` in which B rises over it), and B gives that tail back
// out of its own share, so together they span exactly `pinVh` with no frozen
// stretch anywhere in the middle.
//
// Then B holds one last `atlas.overlapVh` while the Atlas — which starts that
// same stretch early, by a negative margin — slides up OVER it. Nothing is
// faded or cut: the Atlas stage is opaque.
const canvasSteps = () =>
  Math.max(1, Math.min(CONFIG.steps.length, Math.round(CONFIG.sections.canvasSteps)));
const vhOf = (a, b) =>
  CONFIG.steps.slice(a, b).reduce((t, s) => t + Math.max(1, s.vh), 0);
const vhA = () => vhOf(0, canvasSteps());
const vhB = () => vhOf(canvasSteps(), CONFIG.steps.length);
const gapVh = () => Math.max(0, CONFIG.scroll.handoverVh);
// Zero when the Atlas is off: with nothing to rise over `#pinB`, keeping this
// allowance would leave it holding its pin for `overlapVh` extra vh of empty
// scroll after its own three steps are already done.
const overlapVh = () => (CONFIG.atlas.show ? Math.max(0, CONFIG.atlas.overlapVh) : 0);
const atlasVh = () => Math.max(100, CONFIG.atlas.vh);
// how far through the whole clock the canvas experience runs
const canvasFrac = () => vhA() / Math.max(1, pinVh(CONFIG));

// V2 only: `#pinB` is pulled up by this much and made that much taller — it
// starts rising over the ring act's last stretch, the page and the clock do
// not move an inch (his ask, 2026-09-17).
const earlyRiseVh = () => (CONFIG.v2.on ? Math.max(0, CONFIG.scroll.earlyRiseVh || 0) : 0);

function applyPinHeight() {
  pinAEl.style.height = `${100 + vhA()}vh`;
  pinBEl.style.height = `${Math.max(100, 100 + vhB() - gapVh() + overlapVh() + earlyRiseVh())}vh`;
  pinBEl.style.marginTop = `${-earlyRiseVh()}vh`;
  pinCEl.style.height = `${100 + atlasVh()}vh`;
  pinCEl.style.marginTop = `${-overlapVh()}vh`;
  pinCEl.hidden = !CONFIG.atlas.show;
  document.body.classList.toggle("is-atlas-shadow", !!CONFIG.atlas.shadow);
  debug?.build();
}

// Fire the 2s height-open as the section comes into view, so the card is
// already open by the time the pin engages.
//
// It has to watch whichever stage is ACTUALLY hosting the canvas right now —
// #stageA in V1, #stageB in V2 (`placeStages()` moves the canvas there) — or
// in V2 it watches a stage the canvas has already left, the observer never
// crosses its threshold, `startHeroIntro()` never fires, and the box in the
// evidence section sits there with every card at opacity 0 forever.
function observeEnter() {
  io?.disconnect();
  io = new IntersectionObserver(
    (entries) => {
      for (const en of entries) if (en.intersectionRatio > 0.6) sphere.startHeroIntro();
    },
    { threshold: [0, 0.6, 1] }
  );
  io.observe(CONFIG.v2.on ? stageBEl : stageEl);
}

/**
 * A synchronous backstop for `observeEnter`'s own check: switching version
 * can place the canvas's box somewhere ALREADY on screen, with no further
 * scroll to trigger a fresh intersection callback. `startHeroIntro()` is
 * idempotent (`state.started` guards it), so calling it here costs nothing
 * when the observer was going to fire anyway.
 */
function maybeStartHeroIntro() {
  const host = CONFIG.v2.on ? stageBEl : stageEl;
  const r = host.getBoundingClientRect();
  const vh = window.innerHeight;
  if (r.height <= 0) return;
  const visible = Math.max(0, Math.min(vh, r.bottom) - Math.max(0, r.top));
  if (visible / Math.min(r.height, vh) > 0.6) sphere?.startHeroIntro();
}

function mountScene() {
  sphere = createSphere({ mount: canvasLayerEl, cfg: CONFIG });
  sphere.setSplit(CONFIG.columns.split / 100);
  observeEnter();
}

function rebuildScene() {
  const p = progress;
  sphere?.dispose();
  mountScene();
  if (p > 0) sphere.startHeroIntro();
  sphere.resize();
  applyColumns();
}

// ── smooth scroll ──────────────────────────────────────────────────────────
let lenis = null;
function applySmooth() {
  if (CONFIG.scroll.smooth && !lenis) {
    lenis = new Lenis({ lerp: CONFIG.scroll.lerp, smoothWheel: true });
  } else if (!CONFIG.scroll.smooth && lenis) {
    lenis.destroy();
    lenis = null;
  }
  if (lenis) lenis.options.lerp = CONFIG.scroll.lerp;
}

// ── the clocks ─────────────────────────────────────────────────────────────
let progress = 0;
let tl = timeline(CONFIG, 0);

let bowlQ = 0;
function readBowlProgress() {
  // the opening act ends exactly when the pinned section starts pinning
  const act = pinAEl.offsetTop;
  return act > 0 ? clamp01(window.scrollY / act) : 1;
}

// The canvas clock, measured straight off the page: 0 where the stage pins,
// 1 where the last step ends — which is also where the Atlas starts to rise.
let rawProgress = 0;
function readProgress() {
  const travel = (pinVh(CONFIG) / 100) * window.innerHeight;
  const q = travel > 0 ? (window.scrollY - pinAEl.offsetTop) / travel : 0;
  rawProgress = q;                     // negative on the approach, by design
  return clamp01(q);
}

// pinA's OWN clock (his ask, 2026-09-18 — the scroll bar should read the
// first pinned module alone, not the combined six-step travel): 0 where
// #pinA starts pinning, 1 where it releases (its own `vhA()`, not `pinVh`).
// #pinA is always steps 0..canvasSteps — the ring act in V2/V3/V4, the
// canvas in V1 — regardless of which content is parented into it.
let rawProgressA = 0;
function readProgressA() {
  const travel = (vhA() / 100) * window.innerHeight;
  const q = travel > 0 ? (window.scrollY - pinAEl.offsetTop) / travel : 0;
  rawProgressA = q;
  return clamp01(q);
}

// the hero's own scroll — it conducts the line, the drift and the paragraph
function readHero() {
  const span = Math.max(1, (CONFIG.hero.vh / 100) * window.innerHeight);
  return clamp01(window.scrollY / span);
}

// act two's own scroll — it conducts the two beats, it does not scrub them
function readUntil() {
  const span = Math.max(1, untilEl.offsetHeight - window.innerHeight);
  return clamp01((window.scrollY - untilEl.offsetTop) / span);
}

// the Atlas's own scroll: 0 the moment it has finished covering the section
// below it, 1 when the mark has closed on itself
function readAtlas() {
  const span = Math.max(1, pinCEl.offsetHeight - window.innerHeight);
  return clamp01((window.scrollY - pinCEl.offsetTop) / span);
}

// Both sections ride inside their own sticky stage, so there is nothing to
// fade, clip or switch on. All this does is stop paying for the draw once a
// section is off screen.
let lastOn = null;
let lastAtlasOn = null;
let canvasOpen = 0;
let pinBTopPx = Infinity;
function applyLive() {
  const vh = window.innerHeight;
  // The canvas experience does not always live in #pinA: in V2 `placeStages()`
  // physically moves it into #pinB (a box in the evidence section), and this
  // has to track it there or the sphere reads its OLD section's visibility —
  // which in V2 is the ring act — and never turns itself on once the reader
  // has actually scrolled to where the canvas now is.
  const canvasHost = CONFIG.v2.on ? pinBEl : pinAEl;
  const a = canvasHost.getBoundingClientRect();
  // ...unless the trust network has replaced it in that corner entirely: then
  // there is nothing for the sphere to be active FOR, whatever `canvasHost`'s
  // own visibility says.
  const on = !networkOn() && a.bottom > 0 && a.top < vh;
  canvasOpen = on ? clamp01((Math.min(vh, a.bottom) - Math.max(0, a.top)) / vh) : 0;
  if (on !== lastOn) {
    lastOn = on;
    sphere?.setActive(on);
  }
  const b = pinBEl.getBoundingClientRect();
  // ...and how far the three-step section's own top edge still is from the
  // top of the viewport: its summary reveals the instant that reaches 0
  // (his ask, 2026-09-17), which is a fact about the SECTION rather than a
  // fraction of the pinned clock
  pinBTopPx = b.top;
  const c = pinCEl.getBoundingClientRect();
  const cOn = CONFIG.atlas.show && c.bottom > -vh && c.top < vh * 2;

  // ── the hard cutoff: the bowl and the ground stop entirely ─────────────
  // Not "covers(b)" — that is true for pinB's whole tall wrapper, most of
  // which is NOT the moment its sticky stage is actually filling the screen.
  // This checks the STAGE itself: once it spans exactly 0..vh (fully pinned,
  // fully covering), nothing behind it can possibly be seen, so both layers
  // stop posing/spinning/rendering — not just drawing — the instant that
  // happens, and come back the instant it stops being true on the way up.
  const sb = stageBEl.getBoundingClientRect();
  const stageBCovers = sb.top <= 1 && sb.bottom >= vh - 1;
  bowl.setHidden(stageBCovers);
  ground.setHidden(stageBCovers);

  // ── the footer's reveal (his ask, 2026-09-16) ───────────────────────────
  // It can only become true once `.was-below` has scrolled up far enough to
  // stop filling the viewport's own bottom edge — which is to say, only after
  // every pinned section is long gone — so this never has to race the hard
  // cutoff above for the same pixel.
  footerEl.classList.toggle("is-revealed", belowEl.getBoundingClientRect().bottom <= vh);

  // ── the player parks as the three-step section arrives (his ask,
  //    2026-09-17): 0 while it rides along, 1 once pinB's top has risen
  //    through the last `parkOver` of the viewport — a pure function of the
  //    scroll, so it comes straight back on the way up ─────────────────────
  if (CONFIG.player.parkAt === "evidence") {
    const bt = pinBEl.getBoundingClientRect().top;
    player.setPark(clamp01((vh - bt) / Math.max(1, vh * (CONFIG.player.parkOver ?? 0.4))));
  } else {
    player.setPark(0);
  }
  if (cOn !== lastAtlasOn) {
    lastAtlasOn = cOn;
    atlas?.setActive(cOn);
    stageCEl.classList.toggle("is-live", cOn);
  }
  // ...and the nav's own backing follows whatever ground is under it, so the
  // fade under the type never shows as a band of the wrong paper. Three
  // grounds on this page: the warm paper, the white of the pinned sections,
  // and the Atlas's own.
  const covers = (r) => r.top <= 1 && r.bottom > 1;
  // V2: once the ground is open it is the paper, and everything standing on it
  // — the statements, the step copy, the nav — is set in light instead of ink.
  const onGround = !!CONFIG.v2.on && ground.open > 0.35 && !covers(b) && !covers(c);
  document.body.classList.toggle("is-ground", onGround);
  const navBg = onGround
    ? CONFIG.v2.ground.color2
    : CONFIG.atlas.show && covers(c)
      ? ATLAS_STATE.scene.background
      : covers(b) || covers(a)
        ? CONFIG.columns.rightBg
        : CONFIG.sections.pageBg;
  rootStyle.setProperty("--nav-bg", navBg);
}

left = createLeft({ mount: leftAEl, mountB: leftBEl, cfg: CONFIG });
// the bowl first: the hero's opening timeline owns its arrival, so it has to
// exist before that timeline is built
const bowl = createBowl({ mount: bowlLayerEl, cfg: CONFIG });
const hero = createHero({ nav: navEl, heroEl, untilEl, underEl, cfg: CONFIG, bowl });
// The fanned deck of video cards is gone from the hero (his ask, 2026-09-17
// — `cardswap.js` stays on disk, just not mounted). In its place: the player,
// fixed bottom-left, and the scroll bar along the bottom — both live on the
// body, not in any section, because both ride the viewport.
const player = createPlayer({ mount: document.body, cfg: CONFIG });
const scrollBar = createProgress({ mount: document.body, cfg: CONFIG });
// V2 — the ring is built into the BOWL's scene (it has to share the depth
// buffer to pass behind the object), and the quiet section is the page the
// bowl descends into.
// Both rings are built into the BOWL's scene — they have to share its depth
// buffer to pass behind it — and the ground is the field they all sit on.
const ringA = createRing({ bowl, cfg: CONFIG, key: "a" });
const ringB = createRing({ bowl, cfg: CONFIG, key: "b" });
const rings = [ringA, ringB];
// ...and what the ground uncovers is his three step images, the same squares
// the left column of V1 opens on
const ground = createGround({ mount: groundEl, cfg: CONFIG, images: left.images });
// V2's answer to what actually sits in that corner: users → teachers →
// techniques, chained, fired by the evidence rows' own three ramps. Replaces
// the sphere box below when `v2.network.show` is on.
const network = createNetwork({ mount: networkBoxEl, cfg: CONFIG });
const quiet = createQuiet({ el: quietEl, images: left.images, cfg: CONFIG });
const atlas = createAtlas({ mount: atlasViewEl, cardsMount: atlasCardsEl });
const team = createTeam({ mount: belowEl, cfg: CONFIG });
const footer = createFooter({ mount: footerEl, cfg: CONFIG });

// The footer is `position: fixed` now (his ask, 2026-09-16 — see style.css),
// so it takes NOTHING of its own height out of the document any more; this
// spacer is what puts that room back, right where the footer used to sit, so
// the page still scrolls exactly as far and `.was-below` still has something
// to scroll AWAY from before the footer is revealed underneath it.
function syncFooterSpacer() {
  // its own numbers and then its vertical budget — the wordmark is sized off
  // the budget, and the footer's own height off the wordmark
  footer.style();
  footerSpacerEl.style.height = `${footerEl.offsetHeight}px`;
}
syncFooterSpacer();

// The header above the mark — plain opacity, no travel: it is the first
// thing the section says, so `styleAtlasTitle` writes the copy once (and on
// a panel edit) and the raf loop only ever touches `opacity`.
atlasTitleEl.innerHTML =
  `<div class="was-atlas-sketch-mount"></div><h2 class="was-atlas-h"></h2><p class="was-atlas-sub"></p>`;
const atlasHEl = atlasTitleEl.querySelector(".was-atlas-h");
const atlasSubEl = atlasTitleEl.querySelector(".was-atlas-sub");
// The small 2D curve above the heading — a preview sketch of the mark that
// draws itself in 3D below it, MORPHING from a plain circle into a 3-lobed
// curve once as the section arrives, on the SAME mark as the header text.
const atlasSketch = createAtlasSketch({ mount: atlasTitleEl.querySelector(".was-atlas-sketch-mount") });
function styleAtlasTitle() {
  const t = CONFIG.atlas.title;
  atlasTitleEl.hidden = !t.show;
  if (!t.show) return;
  atlasHEl.innerHTML = t.heading.split("\n").map((l) => `<span>${l}</span>`).join("<br/>");
  atlasSubEl.textContent = t.sub;
  atlasTitleEl.style.setProperty("--atlas-title-top", `${t.top}px`);
  atlasTitleEl.style.setProperty("--atlas-title-w", `${t.maxWidth}px`);
  atlasTitleEl.style.setProperty("--atlas-title-size", `${t.size}vw`);
  atlasTitleEl.style.setProperty("--atlas-sub-size", `${t.subSize}vw`);
  atlasTitleEl.style.setProperty("--align", t.align || "center");
}
styleAtlasTitle();

applySmooth();
mountScene();
// One copy box per sticky section, because the two sections do not hold the
// same thing in both versions: in V1 the first carries the canvas experience
// and the second the evidence steps; in V2 the first carries the RING ACT and
// the second the canvas experience, which has moved down.
const split = () =>
  Math.max(1, Math.min(CONFIG.steps.length, Math.round(CONFIG.sections.canvasSteps)));
copyA = createCopy({ mount: copyBoxEl, cfg: CONFIG, from: 0, to: split(), which: "A" });
copyB = createCopy({ mount: copyBoxBEl, cfg: CONFIG, from: split(), which: "B" });
debug = createDebug({ cfg: CONFIG, host: document.body });
applyColumns();
applyScrollStyle();

// ONE timeline runs the whole opening: We · Guide · the bowl · You · Through.
// It waits for the bowl's geometry, which is the only thing in it that has to
// be loaded before it can be animated.
bowl.onReady(() => hero.playHero());

// the pill labels are drawn into canvas textures — redo them once the UI
// font is actually there, or they bake in the fallback metrics
document.fonts?.ready.then(() => {
  sphere.pills.build();
  // the giant wordmark is set in that same font — its height (and so the
  // footer's) isn't final until it has actually swapped in
  syncFooterSpacer();
});

// The big "Wide Angle Sphere" scroll panel is GONE (his ask, 2026-09-16 —
// "togli il control panel wide angle sphere che non abbiamo più"). Its
// bindings lived entirely in `panel.js`, still on disk but never
// instantiated now — ring / network / Atlas-mark / steps / pills / columns /
// sphere-rebuild / camera / motion / parallax lost their UI surface as a
// direct result; every one of those values is still live in `src/config.js`
// and still does exactly what it always did, there is just no slider for it
// any more. Say the word and any of it can be folded into Titles or Bowl.
const bowlPanel = createBowlPanel({
  cfg: CONFIG,
  bowl,
  onLayout: () => bowl.resize(),
  // the bowl's arrival belongs to the hero's timeline, so replaying it
  // replays the whole opening
  onReplay: () => hero.playHero(),
  // the scroll bar and the player live in this panel too (2026-09-17)
  onProgress: () => scrollBar.style(),
  onPlayer: () => player.style(),
  onPinHeight: () => applyPinHeight(),
  onNetwork: () => network.resize(),
});

// The THIRD panel (his ask, 2026-09-17) — everything version three decides,
// in one place: the golden-angle disc, the hero's two halves and how they
// slide apart, and the footer/team treatments that came with them. `V`.
const v3Panel = createV3Panel({
  cfg: CONFIG,
  onVariant: (v) => setVariant(v),
  onNetwork: () => network.resize(),
  onHeroRebuild: () => { hero.rebuild(); hero.replayAll(); },
  onHeroStyle: () => hero.style(),
  onPlayer: () => player.style(),
  onFooter: () => {
    document.body.classList.toggle(
      "is-team-bw", CONFIG.variant >= 3 && CONFIG.team.grayscale !== false
    );
    document.body.classList.toggle(
      "is-team-caps", CONFIG.variant === 4 && CONFIG.team.captions !== false
    );
    team.style();
    footer.style();
    syncFooterSpacer();
  },
});

// One place for every title on the page (his ask, 2026-09-16) — every field
// in it points at the exact same config objects the sections above already
// read, so it can never drift out of sync with what they draw. Docked on the
// LEFT now (same message, later in it — "il control panel titles mettilo a
// sinistra"), its own `.was-panel-titles` rule in style.css.
const titlesPanel = createTitlesPanel({
  cfg: CONFIG,
  onHeroRebuild: () => { hero.rebuild(); hero.replayAll(); },
  onHeroStyle: () => hero.style(),
  onV2Rebuild: () => hero.rebuildV2(),
  onV2Style: () => { hero.style(); copyA.style(); copyB.style(); placeStages(); sphere?.resize(); },
  onEvidenceBuild: () => left.build(),
  onEvidenceStyle: () => left.style(),
  onAtlasTitle: () => styleAtlasTitle(),
  // "fires at" / "plays in" / stagger / "leaves at" need the beat that has
  // ALREADY fired to rearm and replay right there — a plain re-paint (the
  // style callback) never touches it, which is why these read as broken
  // before this existed (his ask, 2026-09-16).
  onReplayBeats: () => hero.playUntil(),
});

// ── 1 / 2 — the two versions ───────────────────────────────────────────────
// ONE switch, and it changes the SHAPE of the middle of the page, not just what
// act two says:
//
//   V1   #pinA the canvas experience (steps 1-3) · #pinB the evidence (4-6)
//   V2   #pinA the RING ACT          (steps 1-3) · #pinB the canvas   (4-6)
//
// So three things move with it: the steps array (each version has its own), the
// `canvasFrom` index the clock measures the assembly and the pills from, and
// the canvas DOM itself, which is simply re-parented into the other stage.
// V4 is the shipped default (his ask, 2026-09-18) — no persistence, every
// load starts there; the panels (below) can still switch live for review.
const STEPS_V1 = CONFIG.steps;
const STEPS_V2 = CONFIG.v2.steps;
const EVIDENCE_V1 = CONFIG.evidence.show;

/**
 * Where the canvas experience lives.
 *
 *   V1   the first stage, full bleed, with its photograph column beside it
 *   V2   the SECOND stage, in a box in the bottom-left corner of the evidence
 *        section — and with no photograph column at all, because the evidence
 *        panel has that section to say its piece in.
 */
/** is the trust network the thing actually occupying the corner right now? */
const networkOn = () => !!CONFIG.v2.on && !!CONFIG.v2.network.show;

function placeStages() {
  const on = !!CONFIG.v2.on;
  const netOn = networkOn();
  const host = on ? stageBEl : stageEl;
  host.insertBefore(canvasLayerEl, host.firstChild);
  if (!on) host.insertBefore(leftAEl, canvasLayerEl.nextSibling);
  leftAEl.hidden = on;
  canvasLayerEl.classList.toggle("is-box", on);
  // ...and only ONE of the two ever actually occupies the corner: the network
  // replaces the sphere box, not stacks on top of it. The sphere stays mounted
  // (nothing here disposes it) but hidden, and `applyLive` below is told to
  // never turn its draw back on while the network has the corner.
  canvasLayerEl.hidden = netOn;
  if (netOn) sphere?.setActive(false);
  // V3 and V4 draw in a bigger frame than V2's sphere was composed for
  const b = (CONFIG.variant >= 3 && CONFIG.v2.canvasBoxBig) || CONFIG.v2.canvasBox;
  canvasLayerEl.style.setProperty("--cb-x", `${b.x}%`);
  canvasLayerEl.style.setProperty("--cb-y", `${b.y}%`);
  canvasLayerEl.style.setProperty("--cb-w", `${b.w}%`);
  canvasLayerEl.style.setProperty("--cb-h", `${b.h}%`);
  // they SHARE the box: same rect, same vars
  networkBoxEl.style.setProperty("--cb-x", `${b.x}%`);
  networkBoxEl.style.setProperty("--cb-y", `${b.y}%`);
  networkBoxEl.style.setProperty("--cb-w", `${b.w}%`);
  networkBoxEl.style.setProperty("--cb-h", `${b.h}%`);
  network.style();
}

function applyVariant() {
  const on = !!CONFIG.v2.on;
  document.body.classList.toggle("is-v2", on);
  // V3 is V2 plus four deltas — the disc, the hero's titles, the team in
  // black and white, the lighter footer — so it carries BOTH classes
  document.body.classList.toggle("is-v3", CONFIG.variant === 3);
  document.body.classList.toggle("is-v4", CONFIG.variant === 4);
  // the team's black and white: V3's treatment, and liftable from the panel
  document.body.classList.toggle(
    "is-team-bw", CONFIG.variant >= 3 && CONFIG.team.grayscale !== false
  );
  // V4 names the faces under the card instead of in a cursor tooltip
  document.body.classList.toggle(
    "is-team-caps", CONFIG.variant === 4 && CONFIG.team.captions !== false
  );
  CONFIG.steps = on ? STEPS_V2 : STEPS_V1;
  CONFIG.sections.canvasFrom = on ? split() : 0;
  // The evidence panel is in BOTH: it always rides the second sticky. In V2 it
  // simply shares that section with the canvas, which has a corner of it.
  CONFIG.evidence.show = EVIDENCE_V1;
  leftBEl.hidden = false;
  placeStages();
  // the canvas may just have moved to (or from) a stage that is ALREADY on
  // screen — retarget the observer for future scrolls, and check right now
  observeEnter();
  maybeStartHeroIntro();
  quiet.style();
  network.update(tl);
  hero.variant();
  for (const r of rings) r.build();
  left.build();
  copyA.build();
  copyB.build();
  applyColumns();
  applyPinHeight();
  sphere?.resize();
  debug?.build();
  // the team's black and white is pure CSS off `body.is-v3`, and the footer's
  // new shape is not variant-dependent at all — neither needs rebuilding here
  // the panel may not exist yet on the very first applyVariant()
  v3Panel?.refresh();
}

function setVariant(n) {
  const raw = Number(n);
  const v = raw >= 1 && raw <= 4 ? Math.round(raw) : 1;
  if (v === CONFIG.variant) return;
  CONFIG.variant = v;
  // the derived flag, written in ONE place: every `v2.on` read means
  // "at least V2", and V3 wants V2's behaviour for all of them
  CONFIG.v2.on = v >= 2;
  applyVariant();
}
CONFIG.v2.on = CONFIG.variant >= 2;
applyVariant();

// ── V2: the bowl's own arc ────────────────────────────────────────────────
// In V1 the bowl grows into `until`, shrinks back into `hand`, and is simply
// there through the pinned steps. In V2 it IS the pinned act: it holds the
// centre the whole way and never leaves it, and the only thing that ever takes
// it off the screen is the canvas section rising over it — the same occlusion
// every other handover on this page uses.
const untilTravel = () => Math.max(1, untilEl.offsetHeight - window.innerHeight);
/** act two's last frame, in page pixels */
const untilEnd = () => untilEl.offsetTop + untilEl.offsetHeight - window.innerHeight;

/**
 * How far the RING ACT has taken the bowl over from act two: 0 at act two's
 * last frame, 1 where the pinned section engages. A landmark on the page, not a
 * fraction of a clock, so adding or removing a section cannot move it.
 */
const actTakeover = () => {
  const a = untilEnd();
  const b = pinAEl.offsetTop;
  return clamp01((window.scrollY - a) / Math.max(1, b - a));
};

// the descent — off by default now, and still a pure function of the scroll
function v2Drop() {
  if (!CONFIG.v2.drop.on) return { down: 0, up: 0 };
  const vh = window.innerHeight;
  const y = window.scrollY;
  const a = untilEl.offsetTop + clamp01(CONFIG.v2.drop.at) * untilTravel();
  const b = untilEnd();
  const down = clamp01((y - a) / Math.max(1, b - a));
  const c = quietEl.hidden ? b : quietEl.offsetTop + quietEl.offsetHeight - vh;
  const d = pinAEl.offsetTop;
  const span = Math.max(1, d - c) * clamp01(CONFIG.v2.drop.back);
  const up = clamp01((y - (d - span)) / span);
  return { down, up };
}

let untilQ = 0;
let actP = 0;              // 0 → 1 across the ring act's three steps
let actPExt = 0;           // ...the same, UNCLAMPED: > 1 through the hand-over
let actStep = 0;           // which of the three it is currently in (0-2)
let actLocal = 0;          // ...and how far through THAT one, 0 → 1
let warmNow = 0;           // ...and how far the field has turned orange
bowl.setPoseHook((pose, ctx) => {
  if (!CONFIG.v2.on) return pose;
  const V = CONFIG.v2;
  const P = ctx.poses;
  const mix = ctx.mix;

  // 1 · it rises into act two — and it is FINISHED rising exactly when act two
  //     starts pinning, which is a landmark on the page rather than a fraction
  //     of a clock that changes length every time a section is added.
  const riseEnd = Math.max(1, untilEl.offsetTop * Math.max(0.05, V.riseFrac));
  const rise = smooth(clamp01(window.scrollY / riseEnd));
  const big = { ...P.until, size: V.bowlSize };
  let out = mix(P.hero, big, rise);

  // 2 · ...and settles smaller across act two
  const settle = smooth(clamp01(untilQ));
  if (settle > 0) out = mix(out, { ...big, size: V.bowlSizeEnd }, settle);

  // 3 · the ring act takes it over: size, lean and roll are three keyframes,
  //     one per step, and the last one tips it right over so the view is over
  //     the top of the object.
  const A = V.act;
  const t = actTakeover();
  if (t > 0) {
    const share = Math.max(0.02, A.transitionShare ?? 0.32);
    const target = {
      ...P.until,
      size: stepLeadAt(A.size, actStep, actLocal, share),
      tilt: stepLeadAt(A.tilt, actStep, actLocal, share),
      tiltZ: stepLeadAt(A.tiltZ, actStep, actLocal, share),
    };
    out = mix(out, target, smooth(t));

    // 3b · ...and it SINKS as the rings go (his ask, 2026-09-17): from
    //     `exit.at` of the act's own clock — a touch before `outAt`, so it is
    //     already moving when the rings start to converge — down `exit.y`.
    //     Read off `actP`, so scrolling back up lifts it straight back.
    //     `through`: the clock's own `actP` stops at 1, so the sink is read
    //     off `actPExt` — the same clock, NOT clamped — and past its own
    //     `dur` it carries on at the same rate instead of parking: the bowl
    //     is still on its way down when the next section covers it.
    const E = A.exit;
    if (E) {
      const raw = (actPExt - E.at) / Math.max(0.02, E.dur || 0.18);
      const sink = raw <= 0 ? 0
        : raw < 1 ? smooth(raw)
        : E.through ? Math.min(3, raw) : 1;
      if (sink > 0) out = { ...out, y: out.y + E.y * sink * smooth(t) };
    }
  }

  // 4 · the descent, when it is on at all
  const { down, up } = v2Drop();
  if (down > 0) {
    const dropped = { ...out, y: V.drop.y, size: out.size * V.drop.scale };
    const tgt = up > 0 ? mix(dropped, P.hand, smooth(up)) : dropped;
    out = mix(out, tgt, smooth(down));
  }
  return out;
});

// C — the clean frame: both panels, the markers and the legend, gone. It is a
// single body class, so nothing can be left behind by a panel that happened to
// be open when it was pressed.
// Shipped default is CLEAN (his ask, 2026-09-18 — "lascami la possibilità di
// vedere tutti i control panel solo se schiaccio 'c'"): every load boots with
// every panel hidden, and `c` is the only way to bring any of them back. The
// per-panel keys (`v`/`b`/`t`) only answer once `c` has already opened the door.
let clean = true;
function setClean(v) {
  clean = v;
  document.body.classList.toggle("is-clean", clean);
  if (clean) {
    bowlPanel.hide();
    titlesPanel.hide();
  }
}
setClean(true);

addEventListener("keydown", (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const t = e.target;
  if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
  const k = e.key.toLowerCase();
  if (k === "1" || k === "2" || k === "3" || k === "4") { setVariant(k); return; }
  if (k === "c") { setClean(!clean); return; }
  if (clean) return;              // nothing else answers while it is clean — panels included
  if (k === "v") v3Panel.toggle();
  if (k === "b") bowlPanel.toggle();
  if (k === "t") titlesPanel.toggle();
  if (k === "m") debug.toggle();
});

addEventListener("resize", () => {
  sphere.resize();
  bowl.resize();
  ground.resize();
  atlas.resize();
  left.style();
  applyColumns();
  applyPinHeight();
  quiet.style();
  network.resize();
  syncFooterSpacer();
});

// the scroll's own speed, smoothed — the "force" the rings feel (his ask,
// 2026-09-17). Damped toward the raw px/s each frame, so a fling reads as a
// push that fades, never a jump, and it is exactly 0 whenever the page is
// still.
let scrollVel = 0;
let lastScrollY = window.scrollY;

let last = performance.now();
function raf(now) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  lenis?.raf(now);
  {
    const raw = dt > 0 ? (window.scrollY - lastScrollY) / dt : 0;
    lastScrollY = window.scrollY;
    scrollVel += (raw - scrollVel) * Math.min(1, dt * 8);
    for (const r of rings) r.push(scrollVel);
    // ...and the player closes on the way down, opens on the way back up
    player.setScrollDir(scrollVel);
  }
  progress = readProgress();
  readProgressA();
  bowlQ = readBowlProgress();
  applyLive();
  hero.heroSet(readHero());
  untilQ = readUntil();
  // Perf pass (2026-09-17): the frame's remaining layout READS are taken here,
  // together, before any style is written — a read that lands after a write
  // makes the browser lay the page out again in the middle of the frame.
  const atlasQ = readAtlas();
  const untilRect = CONFIG.v2.on ? untilEl.getBoundingClientRect() : null;
  hero.untilSet(untilQ);

  // the clock first: everything V2 does on the pinned scroll is measured off it
  tl = timeline(CONFIG, progress);
  actP = tl.actP;
  actStep = tl.actStep;
  actLocal = tl.actLocal;
  {
    const a0 = tl.ranges[tl.a0]?.s0 ?? 0;
    actPExt = (progress - a0) / Math.max(1e-4, tl.actS1 - a0);
  }

  // V2 — the two rings are fired by the PINNED clock (one per step), and the
  // ground is fired by act two's, where it opens out from behind the bowl.
  for (const r of rings) r.drive(tl);
  ground.drive(untilQ);
  // ...and what the ground is showing is one of his three images per step,
  // crossfaded across the BOUNDARY rather than all the way through the step,
  // so each one is itself for most of the time it is up.
  if (CONFIG.v2.on) {
    const x = clamp01(actP) * 2;
    const i = Math.min(1, Math.floor(x));
    const f = x - i;
    ground.setFrame(i, i + 1, smooth(clamp01((f - 0.66) / 0.34)));
  }
  // ...and the layer "Until now" lives on is only lit while act two is
  // actually on screen: it is fixed, so otherwise it would hang over the page.
  if (CONFIG.v2.on) {
    const u = untilRect;
    underEl.classList.toggle("is-on", u.top < window.innerHeight && u.bottom > 0);
  } else if (underEl.classList.contains("is-on")) {
    underEl.classList.remove("is-on");
  }

  // ── V2: the camera really dollies in, and the light turns ────────────────
  // `dist` moves the camera, not the lens: the bowl's placement is derived from
  // the same number, so it holds its size on screen and only the PERSPECTIVE
  // deepens — which is what makes the rings around it separate.
  let warm = 0;
  if (CONFIG.v2.on) {
    const A = CONFIG.v2.act;
    const t = smooth(actTakeover());
    const distShare = Math.max(0.02, A.transitionShare ?? 0.32);
    bowl.setDist(lerp(
      CONFIG.bowl.cam.dist,
      stepLeadAt(A.dist, actStep, actLocal, distShare),
      t
    ));
    bowl.setEnvRotation((CONFIG.bowl.studio.hdr.rotation || 0) + A.bg.envSpin * actP);
    const bi = Math.min(2, Math.max(0, Math.round(A.bg.at)));
    const br = tl.ranges[Math.min(tl.ranges.length - 1, tl.a0 + bi)];
    warm = clamp01((progress - br.s0) / Math.max(1e-4, br.len * Math.max(0.05, A.bg.span)));
    warmNow = warm;
    bowl.setWorld({
      on: !!A.bg.hdr && warm > 0.5,
      blur: A.bg.blur,
      intensity: A.bg.intensity,
    });
  } else {
    warmNow = 0;
    bowl.setDist(null);
    bowl.setWorld({ on: false });
  }

  // The bowl rides two clocks: the opening act, then the pinned act it belongs
  // to — the canvas experience in V1, the RING ACT in V2 — so its run ends
  // exactly where that act's last step does...
  const bowlEnd = CONFIG.v2.on ? tl.actS1 : tl.canvasS1;
  const bowlP = clamp01(progress / Math.max(1e-4, bowlEnd));
  // ...and then it simply STAYS there, dead centre, turning, to the last frame
  // of that section — which is the last frame anyone sees of it. It is not
  // faded away: the next section rises OVER it (it sits above the bowl's own
  // layer) and covers it, so the bowl leaves the way everything else on this
  // page leaves, by being taken over. Scrolling back up uncovers it in place.
  //
  // The opacity ramp below is not that event. It starts only once the cover is
  // already complete — one handover past the end of the first pinned act — so
  // it is never seen; it is there so the bowl is not still being drawn, and
  // cannot come back out over the empty tail of the page.
  let bowlGain = 1;
  if (CONFIG.bowl.fadeAfter > 0) {
    const vh = window.innerHeight;
    const covered = pinAEl.offsetTop + ((vhA() + gapVh()) / 100) * vh;
    bowlGain = 1 - clamp01((window.scrollY - covered) / (CONFIG.bowl.fadeAfter * vh));
  }
  bowl.frame(dt, bowlQ, bowlP, bowlGain);

  // ── the ground: where the bowl actually IS this frame, and the ring act's
  //    own colour + parallax (his ask, 2026-09-17) ───────────────────────────
  // One colour per step, handed over in each step's TAIL — the same
  // `transitionShare` idiom the bowl's own size/tilt already lead with, so the
  // field and the object change key together. The parallax is cumulative
  // across the steps (a pure function of step + local, never accumulated over
  // time), so the field never jumps back at a boundary and unwinds on the way
  // up. Both are gated by how far the act has taken the bowl over, so act two
  // still owns the field's colour until the ring act actually arrives.
  let actBg = {};
  if (CONFIG.v2.on) {
    const A = CONFIG.v2.act;
    const cols = A.bg.colors || [];
    const share = Math.max(0.02, A.transitionShare ?? 0.32);
    const tailStart = 1 - share;
    const u = actLocal <= tailStart ? 0 : smooth(clamp01((actLocal - tailStart) / share));
    const take = smooth(actTakeover());
    // the pan: the room the zoom leaves (± half of what is hidden), travelled
    // top → bottom across the act, each step taking its `parallax` share
    const zoom = Math.max(1, A.bg.zoom || 1);
    // ── the pan: ONE continuous run over the page's own pixels ─────────────
    // Five stretches — act two from the moment the ground opens, the 40vh
    // above the act, the three steps, the hand-over until pinB covers — each
    // weighted by its LENGTH × its speed multiplier. Constant speed per pixel
    // by default, no plateau at any seam (the run-in and the hand-over were
    // exactly where the first cut stood still), and a pure function of
    // `scrollY`, so it unwinds on the way up.
    const vh = window.innerHeight;
    const g = CONFIG.v2.ground;
    const bounds = [untilEl.offsetTop + clamp01(g.at ?? 0) * untilTravel(), pinAEl.offsetTop];
    let yb = pinAEl.offsetTop;
    for (let i = 0; i < 3; i++) {
      yb += ((CONFIG.steps[i]?.vh || 0) / 100) * vh;
      bounds.push(yb);
    }
    bounds.push(pinBEl.offsetTop);
    const P = A.bg.parallax || [];
    const mult = [A.bg.preSpeed ?? 1, P[0] ?? 1, P[1] ?? 1, P[2] ?? 1, A.bg.postSpeed ?? 1];
    let total = 0, done = 0;
    for (let i = 0; i < 5; i++) {
      const len = Math.max(0, bounds[i + 1] - bounds[i]);
      const w = len * Math.max(0, mult[i]);
      total += w;
      done += w * clamp01((window.scrollY - bounds[i]) / Math.max(1, len));
    }
    const frac = total > 0 ? clamp01(done / total) : 0;
    actBg = {
      from: cols[Math.min(actStep, cols.length - 1)],
      to: cols[Math.min(actStep + 1, cols.length - 1)],
      u,
      mix: take * (A.bg.strength ?? 1),
      zoom,
      // 0 → 1 across the whole travel; ground.js turns it into a pan using
      // the picture's own aspect, which only it knows
      frac,
    };
  }
  // the network measures its own mount (inside the sticky stage), so it runs
  // with the reads, ahead of the frame's transform and opacity writes
  network.update(tl);
  ground.frame(dt, bowl.projected(), actBg);
  // the scroll bar rides pinA's own UNCLAMPED clock (his ask, 2026-09-18),
  // so it can fade in and out across THAT module, not the combined one
  scrollBar.set(rawProgressA);

  // the summary's own trigger, measured in applyLive above — no second read
  tl.evTopped = pinBTopPx <= 1;
  left.update(tl);
  // The canvas runs on a clock of its own that STOPS where its experience
  // does — the last thing it holds is its third step — but the SPIN is left
  // live, so the sphere never stops turning just because its section has been
  // covered over.
  const cEnd = tl.canvasS1;
  sphere.frame(
    dt,
    progress <= cEnd ? tl : { ...timeline(CONFIG, cEnd), spinP: tl.spinP }
  );
  const lead = CONFIG.text.lead / Math.max(1, tl.pinVh);
  copyA.update(rawProgress, tl.ranges, lead);
  copyB.update(rawProgress, tl.ranges, lead);
  atlas.setProgress(atlasQ);
  atlas.frame(dt);
  if (CONFIG.atlas.title.show) {
    const a = clamp01(atlasQ / Math.max(0.001, CONFIG.atlas.title.dur));
    atlasHEl.style.opacity = a.toFixed(3);
    atlasSubEl.style.opacity = a.toFixed(3);
    atlasSketch.set(a);
  }
  debug.update(tl);
  requestAnimationFrame(raf);
}
requestAnimationFrame(raf);

// ── verification handle (repro.mjs) ────────────────────────────────────────
window.__was = {
  cfg: CONFIG,
  atlasState: ATLAS_STATE,
  get state() {
    return {
      progress,
      step: tl.step,
      local: tl.local,
      asm: tl.asm,
      pill: tl.pill,
      split: +getComputedStyle(leftAEl).width.replace("px", ""),
      tumble: { ...sphere.state.tumble },
      intro: sphere.state.intro.v,
      spin: sphere.state.spin,
      heroIdx: sphere.state.heroIdx,
      sphereCards: sphere.state.total,
      pills: sphere.pills.count,
      pillLabels: sphere.pills.labels,
      pillProbe: sphere.pills.probe(),
      bowlQ,
      bowl: {
        ready: bowl.ready,
        opacity: +bowl.state.opacity.toFixed(3),
        size: +bowl.state.size.toFixed(3),
        x: +bowl.state.x.toFixed(3),
        y: +bowl.state.y.toFixed(3),
        spin: +bowl.state.spin.toFixed(3),
        tilt: +bowl.state.tilt.toFixed(2),
        shells: Object.keys(bowl.shells),
        at: bowl.projected(),
      },
      left: {
        images: left.state.images,
        ev: left.evidence(),
        card: left.box(),
        bulge: left.squircleBulge(),
        alphas: left.alphas(),
        glass: left.glass(),
      },
      hero: hero.state,
      v2: {
        on: !!CONFIG.v2.on,
        variant: CONFIG.variant,
        body: document.body.classList.contains("is-v2"),
        bodyV3: document.body.classList.contains("is-v3"),
        rings: rings.map((r) => ({
          key: r.key,
          source: r.source,
          count: r.count,
          alpha: r.alpha,
          k: r.k,
          cards: r.probe(),
        })),
        ground: ground.probe(),
        warm: +warmNow.toFixed(3),
        quiet: quiet.probe(),
        drop: (() => { const d = v2Drop(); return { down: +d.down.toFixed(3), up: +d.up.toFixed(3) }; })(),
        under: underEl.classList.contains("is-on"),
        underZ: +getComputedStyle(underEl).zIndex || 0,
        untilVh: Math.round(untilEl.offsetHeight / window.innerHeight * 100),
        canvasFrom: CONFIG.sections.canvasFrom,
        canvasInB: stageBEl.contains(canvasLayerEl),
        canvasHidden: canvasLayerEl.hidden,
        leftInB: stageBEl.contains(leftAEl),
        network: { on: networkOn(), ...network.probe() },
        ev: tl.ev,
        actP: +tl.actP.toFixed(3),
        actStep: tl.actStep,
        scrollVel: Math.round(scrollVel),
        earlyRiseVh: earlyRiseVh(),
        dist: +bowl.dist.toFixed(2),
        world: bowl.world,
        stepNames: CONFIG.steps.map((x) => x.name),
      },
      atlas: atlas.probe(),
      atlasQ: +readAtlas().toFixed(3),
      atlasTop: Math.round(pinCEl.getBoundingClientRect().top),
      heldTop: Math.round(pinBEl.getBoundingClientRect().top),
      pinATop: Math.round(pinAEl.getBoundingClientRect().top),
      stageATop: Math.round(stageEl.getBoundingClientRect().top),
      canvasFrac: +canvasFrac().toFixed(3),
      pinVh: tl.pinVh,
      scrollStyle: CONFIG.scroll.style,
      photos: sphere.state.photos,
      pinHeight:
        pinAEl.getBoundingClientRect().height + pinBEl.getBoundingClientRect().height,
      // how much of the frame the canvas is allowed to paint, 0 → 1
      canvasAlpha: +canvasOpen.toFixed(2),
      canvasOn: canvasOpen > 0.001,
      canvasInStage: stageEl.contains(canvasLayerEl),
      stagePos: getComputedStyle(stageEl).position,
      clean,
      heroQ: +readHero().toFixed(3),
      untilQ: +readUntil().toFixed(3),
      player: player.probe(),
      scrollBar: scrollBar.probe(),
      vh: window.innerHeight,
      copyAlpha: copyA.alphas(),
      copyExpo: copyA.expos(),
      copyB: copyB.alphas(),
      copyAct: copyA.isAct,
      copyMode: CONFIG.text.mode,
      centre: sphere.projectCenter(),
      heroAt: sphere.projectHero(),
      leftWidth: leftAEl.getBoundingClientRect().width,
      leftWidthB: leftBEl.getBoundingClientRect().width,
      heroSeq: { t: hero.introTime, dur: hero.introDur },
      copyWidth: copyBoxEl.getBoundingClientRect().width,
      canvasWidth: canvasLayerEl.getBoundingClientRect().width,
    };
  },
  scrollTo(p) {
    const vh = window.innerHeight;
    const y = pinAEl.offsetTop + clamp01(p) * (pinVh(CONFIG) / 100) * vh;
    if (lenis) lenis.scrollTo(y, { immediate: true });
    else window.scrollTo(0, y);
  },
  /** scroll to a fraction of pinA's OWN clock (his ask, 2026-09-18 — the
   * scroll bar's span), distinct from `scrollTo`'s combined six-step one */
  scrollToA(p) {
    const vh = window.innerHeight;
    const y = pinAEl.offsetTop + clamp01(p) * (vhA() / 100) * vh;
    if (lenis) lenis.scrollTo(y, { immediate: true });
    else window.scrollTo(0, y);
  },
  /** scroll to a fraction inside a given step (0-indexed) */
  scrollToStep(i, f = 0.5) {
    const r = tl.ranges[i];
    if (r) this.scrollTo(r.s0 + r.len * f);
  },
  /** scroll to a fraction of the Atlas's own clock */
  scrollToAtlas(f = 0.5) {
    const y = pinCEl.offsetTop + clamp01(f) * (pinCEl.offsetHeight - window.innerHeight);
    if (lenis) lenis.scrollTo(y, { immediate: true });
    else window.scrollTo(0, y);
  },
  setPointer(nx, ny) {
    const r = canvasLayerEl.getBoundingClientRect();
    const x0 = r.left + r.width * (CONFIG.columns.split / 100);
    const w = r.width * (1 - CONFIG.columns.split / 100);
    dispatchEvent(
      new PointerEvent("pointermove", {
        clientX: x0 + ((nx + 1) / 2) * w,
        clientY: r.top + ((ny + 1) / 2) * r.height,
      })
    );
  },
  /** drag the sphere: dx, dy in px */
  drag(dx, dy) {
    const r = canvasLayerEl.getBoundingClientRect();
    const cx = r.left + r.width * 0.75;
    const cy = r.top + r.height * 0.5;
    const canvas = document.querySelector(".was-canvas");
    canvas.dispatchEvent(new PointerEvent("pointerdown", { clientX: cx, clientY: cy, bubbles: true }));
    dispatchEvent(new PointerEvent("pointermove", { clientX: cx + dx, clientY: cy + dy }));
    dispatchEvent(new PointerEvent("pointerup", {}));
  },
  /** where the pills land, in NDC */
  nodes: () => sphere.pills.nodes(),
  bowlPanel,
  titlesPanel,
  debug,
  setClean,
  left,
  bowl,
  atlas,
  atlasSketch,
  team,
  footer,
  player,
  scrollBar,
  get sphereScene() { return sphere.scene; },
  hero,
  setVariant,
  v3Panel,
  /** re-decide which of the sphere box / trust network occupies the corner —
      exposed so the verify can flip `cfg.v2.network.show` and confirm the
      sphere fallback still works without a full version round-trip */
  placeStages,
  rings,
  ground,
  network,
  quiet,
  /** scroll to a fraction of act two's own clock */
  scrollToUntil(f = 0.5) {
    const y = untilEl.offsetTop + clamp01(f) * (untilEl.offsetHeight - window.innerHeight);
    if (lenis) lenis.scrollTo(y, { immediate: true });
    else window.scrollTo(0, y);
  },
  playHero: () => hero.playHero(),
  playUntil: () => hero.playUntil(),
  replayAll: () => hero.replayAll(),
};
