import gsap from "gsap";
import { createReveal } from "./reveal.js";

// The opening act's DOM: the Insight Timer nav bar, the hero line, its
// paragraph, and the second act's two beats.
//
// The hero is ONE line with the bowl sitting in the middle of it —
// "We Guide" · the bowl · "You Through" — so the object is part of the
// sentence rather than a decoration behind it.
//
// The two halves are placed INDEPENDENTLY and both are measured from the
// CENTRE LINE of the viewport: `leftGap` is how far the end of the left half
// sits from it, `rightGap` how far the start of the right half does. That is
// what keeps the composition symmetrical around the bowl however long the
// lettering is — anchoring a centred row would push the whole thing off centre
// the moment one side was a word longer than the other — and each half still
// has its own Y, so either can be put exactly where it is wanted.
//
// It arrives as ONE GSAP timeline, staggered word by word and overlapping all
// the way through — We · Guide · the bowl · You · Through. Nothing is sequenced
// by a delay: every unit is a tween at its own position on one timeline, so the
// hand-over between them is a real overlap (`seq.stagger` is smaller than
// `seq.wordDur`, and the leads are negative) and the whole thing can be
// retimed, reversed or scrubbed as a single object.
//
// As the page scrolls the two halves slide apart, and scrolling back up closes
// them again: the offset is a pure function of the scroll, so it can never be
// left out of place.
//
// Act two is 200vh of sticky with the bowl big and tilted behind it. The two
// beats alternate across it — the long one on the LEFT, revealed line by line,
// then "Until now" on the RIGHT, word by word — and neither of them is
// scrubbed: the scroll only says WHEN, and each beat then plays itself out.
// Neither leaves, so the first is still standing when the second arrives.

const ICON_SEARCH = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M20 20l-4.6-4.6"/></svg>`;
const ICON_SLIDERS = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M8 4v6M8 14v6M16 4v3M16 11v9"/><path d="M5.5 12h5M13.5 9h5"/></svg>`;

export function createHero({ nav, heroEl, untilEl, underEl, cfg, bowl }) {
  // ── nav ────────────────────────────────────────────────────────────────
  // Logo on the left, one black pill on the right, and the search field DEAD
  // CENTRE — on the viewport's own centre line, not in a row where the width
  // of the logo and the button would push it around.
  function buildNav() {
    const n = cfg.hero.nav;
    nav.hidden = !n.show;
    nav.innerHTML = `
      <a class="was-logo" href="#">${n.logo}</a>
      <div class="was-nav-mid">
        <button class="was-nav-icon" type="button" aria-label="Filters">${ICON_SLIDERS}</button>
        <label class="was-search">
          ${ICON_SEARCH}
          <input type="text" placeholder="${n.search}" aria-label="${n.search}" />
          <img class="was-search-bowl" src="/images/bowl.png" alt="" />
        </label>
      </div>
      <button class="was-cta" type="button">${n.cta}</button>`;
  }

  // ── hero + until ───────────────────────────────────────────────────────
  heroEl.innerHTML = `
    <h1 class="was-hero-line">
      <span class="was-hero-half is-a"></span>
      <span class="was-hero-half is-b"></span>
    </h1>
    <p class="was-hero-para"></p>`;
  const untilStage = untilEl.querySelector(".was-until-stage") || untilEl;
  // Both acts live in the same stage and only one of them is ever shown
  // (body.is-v2 decides). Building both up front means switching version is a
  // class and a rearm, not a teardown.
  untilStage.innerHTML = `
    <p class="was-until-left"></p>
    <p class="was-until-text"></p>
    <p class="was-v2-block is-top"></p>
    <p class="was-v2-block is-bottom"></p>`;
  // ...and "Until now" is NOT in that stage: it lives on the layer UNDER the
  // bowl, which is the only way the object can really be in front of the type.
  if (underEl) underEl.innerHTML = `<p class="was-v2-until"></p>`;

  const lineEl = heroEl.querySelector(".was-hero-line");
  const halfA = heroEl.querySelector(".was-hero-half.is-a");
  const halfB = heroEl.querySelector(".was-hero-half.is-b");
  const paraEl = heroEl.querySelector(".was-hero-para");
  const untilLeftEl = untilStage.querySelector(".was-until-left");
  const untilTextEl = untilStage.querySelector(".was-until-text");
  const v2TopEl = untilStage.querySelector(".was-v2-block.is-top");
  const v2BottomEl = untilStage.querySelector(".was-v2-block.is-bottom");
  const v2UntilEl = underEl?.querySelector(".was-v2-until") || null;

  const title = createReveal({
    el: halfA, text: cfg.hero.title, mode: cfg.hero.titleMode, cfg,
  });
  const titleB = createReveal({
    el: halfB, text: cfg.hero.titleB, mode: cfg.hero.titleMode, cfg,
  });
  const para = createReveal({
    el: paraEl, text: cfg.hero.para, mode: cfg.hero.paraMode, cfg,
  });
  const untilLeft = createReveal({
    el: untilLeftEl, text: cfg.until.left, mode: cfg.until.leftMode, cfg,
  });
  const until = createReveal({
    el: untilTextEl, text: cfg.until.right, mode: cfg.until.rightMode, cfg,
  });
  // ── V2's three blocks ──────────────────────────────────────────────────
  const v2Top = createReveal({
    el: v2TopEl, text: cfg.v2.top.text, mode: cfg.v2.top.mode, cfg,
  });
  const v2Bottom = createReveal({
    el: v2BottomEl, text: cfg.v2.bottom.text, mode: cfg.v2.bottom.mode, cfg,
  });
  const v2Until = v2UntilEl
    ? createReveal({ el: v2UntilEl, text: cfg.v2.until.text, mode: cfg.v2.until.mode, cfg })
    : null;
  // ONE animation for the whole of V2: opacity 0 → 1 while EXPO travels
  // +100 → −10, strictly in place. `lineRise: 0` is what takes the clip box out
  // of it — a line resolves where it already is instead of climbing into frame,
  // and the exit is that same travel run backwards rather than a drop back out.
  const v2Params = () => ({ ...cfg.text, ...cfg.v2.reveal });
  for (const r of [v2Top, v2Bottom, v2Until]) r?.setParams(v2Params);

  // ── every block on the page, on one driver ──────────────────────────────
  // `clock` says which scroll it listens to — the hero's own, or act two's —
  // and `k` is its prefix in the config: `<k>At` fires it, `<k>Dur` /
  // `<k>Delay` are its own timing, `<k>Out` fires the exit over `<k>OutDur`.
  // `At: 0` means it plays on load; `Out: 0` means it never leaves. Crossing
  // either mark backwards rewinds that half, so it can play again.
  // The hero's own three blocks are NOT on this driver — they are one
  // timeline (see `buildIntro`). Only act two's beats are scroll-fired.
  const beats = [
    { r: untilLeft, k: "left", clock: "until", src: () => cfg.until },
    { r: until, k: "right", clock: "until", src: () => cfg.until },
    // V2 — each block owns its own config object, so the prefix is empty and
    // the keys are simply `at`, `dur`, `stagger`, `out`, `outDur`.
    { r: v2Top, k: "", clock: "v2", src: () => cfg.v2.top },
    { r: v2Bottom, k: "", clock: "v2", src: () => cfg.v2.bottom },
    ...(v2Until ? [{ r: v2Until, k: "", clock: "v2", src: () => cfg.v2.until }] : []),
  ];
  for (const b of beats) { b.on = false; b.gone = false; }

  const num = (v, fallback) => (Number.isFinite(v) ? v : fallback);
  // `left` + `At` → `leftAt`, and no prefix at all → `at`
  const K = (k, n) => (k ? k + n[0].toUpperCase() + n.slice(1) : n);

  /**
   * ONE transition per call, decided from what `q` says the state OUGHT to be
   * right now — not two independent if-blocks that can both fire on the same
   * tick. A fast scroll (a big fling, or `scrollTo` jumping straight to a
   * point) can move `q` past an entire `at → out` window in a single frame;
   * with two separate checks that means the entry tween starts AND the exit
   * tween starts in the same call, and GSAP's `overwrite: "auto"` lets the
   * second one win — the block never actually finishes arriving before it is
   * told to leave, which reads as it simply not showing up. Checking "should
   * it be gone" FIRST and returning make that impossible: at most one of
   * enter / leave / re-enter ever fires per call, always the one `q` current
   * says is true, so a block scrolled straight past always lands in the
   * state a slower scroll would have left it in too.
   */
  function drive(b, q) {
    const c = b.src();
    // an explicit `show: false` pulls a beat out of the page entirely — used
    // to drop "Until now" from V2 without deleting the beat itself
    if (c.show === false) {
      if (b.on || b.gone) { b.on = false; b.gone = false; b.r.reset(); }
      return;
    }
    const at = num(c[K(b.k, "at")], 0);
    const out = num(c[K(b.k, "out")], 0);
    const stays = !(out > at);        // 0 (or before the entry) = it stays
    const ease = c.ease || "power2.out";
    const outDur = num(c[K(b.k, "outDur")], 0.9);
    const dur = num(c[K(b.k, "dur")], 1.2);
    const stagger = num(c[K(b.k, "stagger")], 0.18);

    // 1 · should it be GONE right now? Handle that before anything else, so
    //     a scroll that jumped straight past the whole window never also
    //     tries to play the entry it overtook.
    if (!stays && q >= out) {
      if (!b.gone) {
        b.on = true;
        b.gone = true;
        b.r.playUnitsOut({ duration: outDur, stagger, ease });
      }
      return;
    }
    // 2 · scrolled back UP into the window it had already left — it comes
    //     back DOWN the rail it left on, not by replaying its arrival.
    if (b.gone && q < out - 0.015) {
      b.gone = false;
      b.r.playUnitsOut({ duration: outDur, stagger, ease, to: 0 });
    }
    // 3 · should it be ON?
    if (!b.on && q >= at) {
      b.on = true;
      b.gone = false;
      b.r.playStagger({ duration: dur, stagger, ease });
    } else if (b.on && q < at - 0.015) {
      // Never visibly un-reveal: scrolled back up past its own mark, a block
      // must hold exactly as shown for as long as any part of it is still on
      // screen — reversing while he can see it is the whole complaint — and
      // only actually reset once it has scrolled fully out of the viewport,
      // where resetting costs nothing because nobody is looking. Re-checked
      // every frame until that becomes true, so it fires the moment it can.
      const r = b.r.block.el.getBoundingClientRect();
      const onscreen = r.bottom > 0 && r.top < window.innerHeight;
      if (!onscreen) {
        b.on = false;
        b.gone = false;
        b.r.reset();
      }
    }
  }

  const run = (clock, q) => {
    for (const b of beats) if (b.clock === clock) drive(b, q);
  };

  /** which act is on the page: "until" is V1's two beats, "v2" is the four */
  const act = () => (cfg.v2.on ? "v2" : "until");

  // ── the opening, as ONE timeline ────────────────────────────────────────
  // Each word is its own tween at its own position. `wordDur` is how long a
  // word takes to resolve, `firstDur` how long the FIRST one of a half takes
  // (it is the one the eye lands on, so it is allowed to be slower), and
  // `stagger` is how far apart they start — smaller than the duration, which
  // is what makes one word begin while the last is still arriving.
  //
  // The bowl and the right-hand half are placed by their LEADS, both negative:
  // the bowl starts that many seconds before the left half has finished, and
  // "You Through" starts that many seconds before the bowl has.
  let introTl = null;

  const drawIntro = () => {
    title.drawUnits();
    titleB.drawUnits();
    para.drawUnits();
  };

  function halfInto(tl, r, at) {
    const S = cfg.hero.seq;
    const u = r.arm();
    let end = at;
    u.forEach((unit, i) => {
      const dur = Math.max(0.05, i === 0 ? S.firstDur : S.wordDur);
      const t = at + i * Math.max(0, S.stagger);
      tl.to(unit, { v: 1, duration: dur, ease: S.ease }, t);
      end = Math.max(end, t + dur);
    });
    return end;
  }

  function buildIntro() {
    introTl?.kill();
    const S = cfg.hero.seq;
    const B = cfg.bowl.intro;
    const tl = gsap.timeline({ paused: true, onUpdate: drawIntro });

    const leftEnd = halfInto(tl, title, 0);

    // ...and the bowl comes up out of the middle of the line
    const bowlAt = Math.max(0, leftEnd + S.bowlLead);
    let bowlEnd = bowlAt;
    if (bowl) {
      bowl.state.intro.v = 0;
      tl.to(bowl.state.intro, { v: 1, duration: B.dur, ease: B.ease }, bowlAt);
      bowlEnd = bowlAt + B.dur;
    }

    halfInto(tl, titleB, Math.max(0, bowlEnd + S.rightLead));
    halfInto(tl, para, Math.max(0, S.paraAt));

    introTl = tl;
    return tl;
  }

  // The halves slide apart as the page leaves the hero, and close again on the
  // way back up. It is read straight off the scroll, never tweened, so there is
  // no state to get stuck.
  let driftQ = 0;
  const smoothstep = (t) => t * t * (3 - 2 * t);
  function applyDrift(q) {
    driftQ = q;
    const h = cfg.hero;
    // They are NOT a mirror pair (his ask, 2026-09-17: "devono sfasarsi
    // sulla X"): the right half travels further AND starts later on the same
    // clock, so the two never read as one object being pulled in half.
    // `smoothstep` is the organic part — still a pure function of the scroll,
    // just not a linear one.
    const lag = Math.max(0, Math.min(0.9, h.driftPhase ?? 0));
    const qa = smoothstep(Math.max(0, Math.min(1, q)));
    const qb = smoothstep(Math.max(0, Math.min(1, (q - lag) / Math.max(0.05, 1 - lag))));
    const a = (h.drift ?? 0) * qa;
    const b = (h.driftRight ?? h.drift ?? 0) * qb;
    // the -50% is the vertical centring: it lives in the transform, so the
    // drift has to carry it rather than overwrite it
    halfA.style.transform = `translate3d(${(-a).toFixed(3)}vw,-50%,0)`;
    halfB.style.transform = `translate3d(${b.toFixed(3)}vw,-50%,0)`;
  }

  function style() {
    const h = cfg.hero;
    const sg = h.nav.searchGlass || {};
    nav.style.setProperty("--search-alpha", String(sg.alpha ?? 1));
    nav.style.setProperty("--search-blur", `${sg.blur ?? 0}px`);
    lineEl.style.setProperty("--copy-size", `${h.titleSize}vw`);
    lineEl.style.setProperty("--copy-lh", String(h.titleLh));
    halfA.style.setProperty("--gap", `${h.leftGap}vw`);
    halfA.style.setProperty("--y", `${h.leftY}%`);
    halfA.style.textAlign = h.leftAlign || "right";
    halfB.style.setProperty("--gap", `${h.rightGap}vw`);
    halfB.style.setProperty("--y", `${h.rightY}%`);
    halfB.style.textAlign = h.rightAlign || "left";
    paraEl.style.setProperty("--copy-size", `${h.paraSize}vw`);
    paraEl.style.setProperty("--copy-lh", String(h.paraLh));
    paraEl.style.setProperty("--para-left", `${h.paraLeft}vw`);
    paraEl.style.setProperty("--para-bottom", `${h.paraBottom}vh`);
    paraEl.style.setProperty("--align", h.paraAlign || "left");
    const u = cfg.until;
    untilLeftEl.style.setProperty("--copy-size", `${u.leftSize}vw`);
    untilLeftEl.style.setProperty("--until-w", `${u.leftWidth}vw`);
    untilLeftEl.style.setProperty("--until-x", `${u.leftX}vw`);
    untilLeftEl.style.setProperty("--until-y", `${u.leftY}%`);
    untilLeftEl.style.setProperty("--align", u.leftAlign || "left");
    untilTextEl.style.setProperty("--copy-size", `${u.rightSize}vw`);
    untilTextEl.style.setProperty("--until-w", `${u.rightWidth}vw`);
    untilTextEl.style.setProperty("--until-x", `${u.rightX}vw`);
    untilTextEl.style.setProperty("--until-y", `${u.rightY}%`);
    untilTextEl.style.setProperty("--align", u.rightAlign || "right");

    // ── V2's blocks ──────────────────────────────────────────────────────
    // Both are placed the same way: a measure, an inset from their OWN side,
    // and a top. `side` is which edge the inset is measured from, so moving a
    // block across the page is one dropdown rather than a different rule.
    const place = (el, c) => {
      if (!el) return;
      el.style.setProperty("--copy-size", `${c.size}vw`);
      el.style.setProperty("--until-w", `${c.width}vw`);
      el.style.setProperty("--until-x", `${c.x}vw`);
      el.style.setProperty("--until-y", `${c.y}%`);
      el.style.setProperty("--align", c.align || (c.side === "right" ? "right" : "left"));
      el.classList.toggle("is-right", c.side === "right");
    };
    const V = cfg.v2;
    place(v2TopEl, V.top);
    place(v2BottomEl, V.bottom);
    if (v2UntilEl) {
      // this one is centred on a point, because it has to land BEHIND an
      // object that holds the middle of the frame
      v2UntilEl.style.color = V.until.ink || "";
      v2UntilEl.style.setProperty("--copy-size", `${V.until.size}vw`);
      v2UntilEl.style.setProperty("--until-w", `${V.until.width}vw`);
      v2UntilEl.style.setProperty("--until-x", `${V.until.x}%`);
      v2UntilEl.style.setProperty("--until-y", `${V.until.y}%`);
      v2UntilEl.style.setProperty("--align", V.until.align || "center");
    }

    heroEl.style.height = `${h.vh}vh`;
    untilEl.style.height = `${V.on ? V.vh : u.vh}vh`;
    applyDrift(driftQ);
  }

  function rebuild() {
    buildNav();
    title.rebuild(cfg.hero.title, cfg.hero.titleMode);
    titleB.rebuild(cfg.hero.titleB, cfg.hero.titleMode);
    para.rebuild(cfg.hero.para, cfg.hero.paraMode);
    untilLeft.rebuild(cfg.until.left, cfg.until.leftMode);
    until.rebuild(cfg.until.right, cfg.until.rightMode);
    v2Top.rebuild(cfg.v2.top.text, cfg.v2.top.mode);
    v2Bottom.rebuild(cfg.v2.bottom.text, cfg.v2.bottom.mode);
    v2Until?.rebuild(cfg.v2.until.text, cfg.v2.until.mode);
    replay();
    style();
    playHero();
  }

  /** rearm act two's beats so the driver plays them again */
  function replay() {
    for (const b of beats) {
      b.on = false;
      b.gone = false;
      b.r.reset();
    }
  }

  /** Rebuild the opening timeline and run it from zero. */
  function playHero() {
    buildIntro();
    introTl.restart(true);
  }

  /** `q` — the hero section's own scroll, 0 → 1 across `hero.vh` */
  const heroSet = (q) => {
    run("hero", q);
    applyDrift(q);
  };

  /** `q` — act two's own scroll, 0 → 1 across its sticky travel */
  const untilSet = (q) => run(act(), q);

  /** rearm act two's beats — whichever version is on the page */
  function playUntil() {
    for (const b of beats) {
      if (b.clock !== act()) continue;
      b.on = false;
      b.gone = false;
      b.r.reset();
    }
  }

  /** just V2's three blocks — editing its copy must not replay the opening */
  function rebuildV2() {
    v2Top.rebuild(cfg.v2.top.text, cfg.v2.top.mode);
    v2Bottom.rebuild(cfg.v2.bottom.text, cfg.v2.bottom.mode);
    v2Until?.rebuild(cfg.v2.until.text, cfg.v2.until.mode);
    variant();
  }

  /**
   * Switch version. The blocks of the act that is NOT on the page are wound
   * fully back, so coming back to it plays it from the top rather than finding
   * it already resolved.
   */
  function variant() {
    const a = act();
    for (const b of beats) {
      b.on = false;
      b.gone = false;
      b.r.reset();
      if (b.clock !== a) b.r.redraw();
    }
    style();
  }

  buildNav();
  style();
  buildIntro();

  return {
    rebuild, style, playHero, playUntil,
    heroSet, untilSet, replay,
    get introTime() { return introTl ? +introTl.time().toFixed(2) : 0; },
    get introDur() { return introTl ? +introTl.duration().toFixed(2) : 0; },
    /** scrub the opening — it pauses, because scrubbing a running clock is
        not scrubbing it */
    seek: (t) => { introTl?.pause(); introTl?.seek(t, false); },
    redraw: () => {
      title.redraw(); titleB.redraw(); para.redraw();
      untilLeft.redraw(); until.redraw();
      v2Top.redraw(); v2Bottom.redraw(); v2Until?.redraw();
    },
    replayAll: () => { replay(); playHero(); },
    variant, rebuildV2,
    get state() {
      return {
        title: +title.alpha.toFixed(2),
        titleB: +titleB.alpha.toFixed(2),
        titleExpo: Math.round(title.expo),
        para: +para.alpha.toFixed(2),
        untilLeft: +untilLeft.alpha.toFixed(2),
        until: +until.alpha.toFixed(2),
        v2Top: +v2Top.alpha.toFixed(2),
        v2Bottom: +v2Bottom.alpha.toFixed(2),
        v2Until: v2Until ? +v2Until.alpha.toFixed(2) : 0,
        act: act(),
        drift: +driftQ.toFixed(3),
        halfA: Math.round(halfA.getBoundingClientRect().left),
        halfAEnd: Math.round(halfA.getBoundingClientRect().right),
        halfBStart: Math.round(halfB.getBoundingClientRect().left),
        halfB: Math.round(halfB.getBoundingClientRect().right),
        gap: Math.round(
          halfB.getBoundingClientRect().left - halfA.getBoundingClientRect().right
        ),
        leftMode: untilLeft.mode,
        rightMode: until.mode,
      };
    },
  };
}
