import { Pane } from "tweakpane";

const EASES = ["expo.out", "power4.out", "power3.out", "power2.out", "circ.out", "back.out"];
const opts = (arr) => Object.fromEntries(arr.map((v) => [v, v]));

// Live control panel. Structural params (they rebuild the WebGL scene) sit in
// "Sphere (rebuild)"; everything else is read every frame.
export function createPanel({
  cfg, atlas, onPinHeight, onScrollStyle, onSmooth, onColumns, onRebuild, onCopy,
  onCopyStyle, onCopyMode, onPills, onDebug, onReplay,
  onResetTumble, onHero, onHeroStyle, onLeft, onLeftBuild, onIntro,
  onCards, onCardStyle, onCardOpen, onAtlas, onAtlasView, onAtlasTitle,
  onV2, onV2Text, onV2Style, onRing, onRingStyle, onQuiet, onNetwork,
  dock,
}) {
  const host = document.createElement("div");
  host.className = "was-panel";
  // Lenis hijacks the wheel on the whole window, which stops this panel from
  // scrolling internally. `data-lenis-prevent` is the opt-out; the listener is
  // the belt to its braces (and covers smooth-scroll off).
  host.setAttribute("data-lenis-prevent", "");
  host.addEventListener("wheel", (e) => e.stopPropagation(), { passive: true });
  // Every panel docks in the SAME right-hand row now (his ask, 2026-09-16) —
  // `dock` is that shared flex container; falling back to <body> keeps this
  // panel usable even if it is ever built standalone.
  (dock || document.body).appendChild(host);

  const pane = new Pane({ container: host, title: "Wide Angle Sphere" });

  // ── scroll style, first thing in the panel ──────────────────────────────
  const fStyle = pane.addFolder({ title: "Scroll style", expanded: true });
  fStyle.addBinding(cfg.scroll, "style", {
    options: { "pin (release)": "pin", "stack (collapse over)": "stack" },
    label: "mode",
  }).on("change", onScrollStyle);
  fStyle.addBinding(cfg.scroll, "overlapVh", {
    min: 20, max: 200, step: 10, label: "collapse (vh)",
  }).on("change", onScrollStyle);
  fStyle.addBinding(cfg.scroll, "stackShadow", { label: "collapse shadow" })
    .on("change", onScrollStyle);
  fStyle.addBinding(cfg.scroll, "smooth", { label: "smooth (Lenis)" }).on("change", onSmooth);
  fStyle.addBinding(cfg.scroll, "lerp", { min: 0.02, max: 0.3, step: 0.005 })
    .on("change", onSmooth);

  // ── the opening act ─────────────────────────────────────────────────────
  const fHero = pane.addFolder({ title: "Hero + Until now", expanded: false });
  fHero.addBinding(cfg.hero.nav, "show", { label: "nav bar" }).on("change", onHero);
  fHero.addBinding(cfg.hero.nav, "sticky", { label: "nav sticky" }).on("change", onColumns);
  fHero.addBinding(cfg.hero.nav, "fade", { min: 0, max: 90, step: 1, label: "nav fade (px)" })
    .on("change", onColumns);
  fHero.addBinding(cfg.hero.nav, "logo").on("change", onHero);
  fHero.addBinding(cfg.hero.nav, "search", { label: "search" }).on("change", onHero);
  fHero.addBinding(cfg.hero.nav, "cta", { label: "button" }).on("change", onHero);
  fHero.addBinding(cfg.hero, "vh", { min: 60, max: 220, step: 5, label: "hero (vh)" })
    .on("change", onHeroStyle);
  fHero.addBinding(cfg.hero, "title", { label: "left of the bowl" }).on("change", onHero);
  fHero.addBinding(cfg.hero, "titleB", { label: "right of the bowl" }).on("change", onHero);
  fHero.addBinding(cfg.hero, "titleMode", {
    options: { "intro (clipped words)": "intro", "words (in place)": "words", "chars (in place)": "chars", "lines (clipped)": "lines", fade: "fade" },
    label: "title reveal",
  }).on("change", onHero);
  fHero.addBinding(cfg.hero, "titleSize", { min: 1.5, max: 12, step: 0.05, label: "title (vw)" })
    .on("change", onHeroStyle);
  fHero.addBinding(cfg.hero, "titleLh", { min: 0.85, max: 1.6, step: 0.01, label: "title lh" })
    .on("change", onHeroStyle);
  // Each half is placed on its own, measured from the CENTRE of the viewport,
  // so the composition stays symmetrical around the bowl however long the
  // lettering is — and either can still be put exactly where it is wanted.
  const fHalves = fHero.addFolder({ title: "Placing the two halves", expanded: true });
  fHalves.addBinding(cfg.hero, "leftGap", { min: -20, max: 46, step: 0.1, label: "◀ ends before centre (vw)" })
    .on("change", onHeroStyle);
  fHalves.addBinding(cfg.hero, "leftY", { min: 0, max: 100, step: 0.5, label: "◀ at (%)" })
    .on("change", onHeroStyle);
  fHalves.addBinding(cfg.hero, "rightGap", { min: -20, max: 46, step: 0.1, label: "▶ starts after centre (vw)" })
    .on("change", onHeroStyle);
  fHalves.addBinding(cfg.hero, "rightY", { min: 0, max: 100, step: 0.5, label: "▶ at (%)" })
    .on("change", onHeroStyle);
  fHalves.addBinding(cfg.hero, "drift", { min: 0, max: 24, step: 0.1, label: "they drift apart (vw)" })
    .on("change", onHeroStyle);
  fHero.addBinding(cfg.hero, "para", { label: "para ( | = line )" }).on("change", onHero);
  fHero.addBinding(cfg.hero, "paraMode", {
    options: { "lines (clipped)": "lines", "intro (clipped words)": "intro", "words (in place)": "words", "chars (in place)": "chars", fade: "fade" },
    label: "para reveal",
  }).on("change", onHero);
  fHero.addBinding(cfg.hero, "paraSize", { min: 0.5, max: 3, step: 0.02, label: "para (vw)" })
    .on("change", onHeroStyle);
  fHero.addBinding(cfg.hero, "paraLeft", { min: 0, max: 20, step: 0.1, label: "para left (vw)" })
    .on("change", onHeroStyle);
  fHero.addBinding(cfg.hero, "paraBottom", { min: 0, max: 30, step: 0.5, label: "para bottom (vh)" })
    .on("change", onHeroStyle);
  fHero.addBinding(cfg.hero, "paraAlign", { options: opts(["left", "center", "right"]), label: "para align" })
    .on("change", onHeroStyle);
  // ── the opening, as ONE timeline ──────────────────────────────────────
  // Not delays: every word is a tween at its own position, and they OVERLAP —
  // `stagger` is smaller than the durations, so a word starts while the one
  // before it is still arriving. Both leads are negative for the same reason.
  const fSeq = fHero.addFolder({ title: "The opening (one timeline)", expanded: true });
  const S = cfg.hero.seq;
  fSeq.addBinding(S, "firstDur", { min: 0.2, max: 4, step: 0.05, label: "1st word (s)" })
    .on("change", onHero);
  fSeq.addBinding(S, "wordDur", { min: 0.2, max: 4, step: 0.05, label: "every word (s)" })
    .on("change", onHero);
  fSeq.addBinding(S, "stagger", { min: 0, max: 2.5, step: 0.02, label: "word → word (s)" })
    .on("change", onHero);
  fSeq.addBinding(S, "bowlLead", { min: -3, max: 2, step: 0.05, label: "bowl starts (s)" })
    .on("change", onHero);
  fSeq.addBinding(S, "rightLead", { min: -3, max: 2, step: 0.05, label: "right half (s)" })
    .on("change", onHero);
  fSeq.addBinding(S, "paraAt", { min: 0, max: 5, step: 0.05, label: "paragraph at (s)" })
    .on("change", onHero);
  fSeq.addBinding(S, "ease", { options: opts(EASES), label: "ease" }).on("change", onHero);
  fSeq.addButton({ title: "Replay the opening" }).on("click", onHero);

  // ── act two: 200vh of sticky, two beats that alternate sides ───────────
  const fAct2 = pane.addFolder({ title: "Act two — the two beats", expanded: false });
  fAct2.addBinding(cfg.until, "vh", { min: 100, max: 400, step: 10, label: "section (vh)" })
    .on("change", onHeroStyle);
  const fA2L = fAct2.addFolder({ title: "1 · title, on the left", expanded: true });
  fA2L.addBinding(cfg.until, "left", { label: "text ( | = line )" }).on("change", onHero);
  fA2L.addBinding(cfg.until, "leftMode", {
    options: { "lines (clipped)": "lines", "words (in place)": "words", "chars (in place)": "chars", "intro (clipped words)": "intro" },
    label: "reveal",
  }).on("change", onHero);
  fA2L.addBinding(cfg.until, "leftAlign", { options: opts(["left", "center", "right"]), label: "align" })
    .on("change", onHeroStyle);
  fA2L.addBinding(cfg.until, "leftSize", { min: 0.8, max: 7, step: 0.05, label: "size (vw)" })
    .on("change", onHeroStyle);
  fA2L.addBinding(cfg.until, "leftWidth", { min: 10, max: 60, step: 1, label: "measure (vw)" })
    .on("change", onHeroStyle);
  fA2L.addBinding(cfg.until, "leftX", { min: 0, max: 30, step: 0.5, label: "from left (vw)" })
    .on("change", onHeroStyle);
  fA2L.addBinding(cfg.until, "leftY", { min: 0, max: 90, step: 1, label: "top (%)" })
    .on("change", onHeroStyle);
  fA2L.addBinding(cfg.until, "leftAt", { min: 0, max: 0.9, step: 0.01, label: "fires at" });
  fA2L.addBinding(cfg.until, "leftDur", { min: 0.2, max: 5, step: 0.05, label: "plays in (s)" });
  fA2L.addBinding(cfg.until, "leftStagger", { min: 0, max: 1.2, step: 0.02, label: "line → line (s)" });
  fA2L.addBinding(cfg.until, "leftOut", { min: 0, max: 1, step: 0.01, label: "leaves at" });
  fA2L.addBinding(cfg.until, "leftOutDur", { min: 0.2, max: 4, step: 0.05, label: "leaves in (s)" });

  const fA2R = fAct2.addFolder({ title: "2 · \"Until now\", on the right", expanded: true });
  fA2R.addBinding(cfg.until, "right", { label: "text ( | = line )" }).on("change", onHero);
  fA2R.addBinding(cfg.until, "rightMode", {
    options: { "lines (clipped)": "lines", "words (in place)": "words", "chars (in place)": "chars", "intro (clipped words)": "intro" },
    label: "reveal",
  }).on("change", onHero);
  fA2R.addBinding(cfg.until, "rightAlign", { options: opts(["left", "center", "right"]), label: "align" })
    .on("change", onHeroStyle);
  fA2R.addBinding(cfg.until, "rightSize", { min: 0.8, max: 7, step: 0.05, label: "size (vw)" })
    .on("change", onHeroStyle);
  fA2R.addBinding(cfg.until, "rightWidth", { min: 10, max: 60, step: 1, label: "measure (vw)" })
    .on("change", onHeroStyle);
  fA2R.addBinding(cfg.until, "rightX", { min: 0, max: 30, step: 0.5, label: "from right (vw)" })
    .on("change", onHeroStyle);
  fA2R.addBinding(cfg.until, "rightY", { min: 0, max: 90, step: 1, label: "top (%)" })
    .on("change", onHeroStyle);
  fA2R.addBinding(cfg.until, "rightAt", { min: 0, max: 0.9, step: 0.01, label: "fires at" });
  fA2R.addBinding(cfg.until, "rightDur", { min: 0.2, max: 5, step: 0.05, label: "plays in (s)" });
  fA2R.addBinding(cfg.until, "rightStagger", { min: 0, max: 1.2, step: 0.02, label: "word → word (s)" });
  fA2R.addBinding(cfg.until, "rightOut", { min: 0, max: 1, step: 0.01, label: "leaves at" });
  fA2R.addBinding(cfg.until, "rightOutDur", { min: 0.2, max: 4, step: 0.05, label: "leaves in (s)" });

  // ── V2 — the ring act ───────────────────────────────────────────────────
  // The same switch the keyboard throws (1 / 2). It changes the SHAPE of the
  // middle of the page: the first pinned section becomes the ring act and the
  // canvas experience moves down into the second one.
  const fV2 = pane.addFolder({ title: "V2 — the ring act (key 2)", expanded: true });
  fV2.addBinding(cfg.v2, "on", { label: "V2 on (key 1 / 2)" }).on("change", onV2);
  fV2.addBinding(cfg.v2, "vh", { min: 150, max: 600, step: 10, label: "act two (vh)" })
    .on("change", onV2Style);
  fV2.addBinding(cfg.v2, "riseFrac", { min: 0.2, max: 1, step: 0.01, label: "grown by" });
  fV2.addBinding(cfg.v2, "bowlSize", { min: 0.1, max: 0.9, step: 0.005, label: "bowl, in act two" });
  fV2.addBinding(cfg.v2, "bowlSizeEnd", { min: 0.1, max: 0.9, step: 0.005, label: "...by its end" });

  // ── the one animation every block in V2 uses ────────────────────────────
  const fRev = fV2.addFolder({ title: "the reveal (all of V2)", expanded: false });
  fRev.addBinding(cfg.v2.reveal, "expoFrom", { min: -100, max: 100, step: 1, label: "EXPO from" })
    .on("change", onV2Style);
  fRev.addBinding(cfg.v2.reveal, "expoRest", { min: -100, max: 100, step: 1, label: "...to" })
    .on("change", onV2Style);
  fRev.addBinding(cfg.v2.reveal, "fadeIn", { min: 0.1, max: 1, step: 0.01, label: "opacity over" })
    .on("change", onV2Style);
  fRev.addBinding(cfg.v2.reveal, "lineShift", { min: 0, max: 6, step: 0.05, label: "rail: up from (em)" })
    .on("change", onV2Style);
  fRev.addBinding(cfg.v2.reveal, "lineExit", { min: 0, max: 8, step: 0.05, label: "rail: carries on by (em)" })
    .on("change", onV2Style);
  fRev.addBinding(cfg.v2.reveal, "riseExit", { min: 0, max: 8, step: 0.05, label: "...the same, in words" })
    .on("change", onV2Style);
  fRev.addBinding(cfg.v2.reveal, "lineRise", { min: 0, max: 130, step: 1, label: "clip box (0 = no box)" })
    .on("change", onV2Style);

  // one block, three times: the two statements and "Until now"
  const v2Block = (parent, title, obj, sided, expanded) => {
    const f = parent.addFolder({ title, expanded });
    f.addBinding(obj, "text", { label: "text ( | = line )" }).on("change", onV2Text);
    f.addBinding(obj, "mode", {
      options: { "lines (in place)": "lines", "words (in place)": "words", "chars (in place)": "chars", fade: "fade" },
      label: "reveal",
    }).on("change", onV2Text);
    f.addBinding(obj, "align", { options: opts(["left", "center", "right"]) })
      .on("change", onV2Style);
    if (sided) {
      f.addBinding(obj, "side", {
        options: { "from the left": "left", "from the right": "right" }, label: "measured",
      }).on("change", onV2Style);
    } else {
      f.addBinding(obj, "ink", { label: "colour" }).on("change", onV2Style);
    }
    f.addBinding(obj, "size", { min: 0.8, max: 8, step: 0.05, label: "size (vw)" })
      .on("change", onV2Style);
    f.addBinding(obj, "width", { min: 10, max: 70, step: 1, label: "measure (vw)" })
      .on("change", onV2Style);
    f.addBinding(obj, "x", { min: 0, max: 100, step: 0.5, label: sided ? "inset (vw)" : "at x (%)" })
      .on("change", onV2Style);
    f.addBinding(obj, "y", { min: 0, max: 100, step: 0.5, label: sided ? "top (%)" : "at y (%)" })
      .on("change", onV2Style);
    f.addBinding(obj, "at", { min: 0, max: 1, step: 0.01, label: "fires at" });
    f.addBinding(obj, "dur", { min: 0.2, max: 5, step: 0.05, label: "plays in (s)" });
    f.addBinding(obj, "stagger", { min: 0, max: 1.2, step: 0.02, label: "unit → unit (s)" });
    f.addBinding(obj, "out", { min: 0, max: 1, step: 0.01, label: "leaves at (0 = stays)" });
    f.addBinding(obj, "outDur", { min: 0.2, max: 4, step: 0.05, label: "leaves in (s)" });
    return f;
  };
  const fA2 = fV2.addFolder({ title: "act two — the two statements", expanded: false });
  v2Block(fA2, "1 · top left", cfg.v2.top, true, false);
  v2Block(fA2, "2 · bottom right", cfg.v2.bottom, true, false);
  const fUntil = v2Block(fA2, '3 · "Until now" — BEHIND the bowl', cfg.v2.until, false, false);
  fUntil.addBinding(cfg.v2.until, "show", { label: "on (off by his own ask)" }).on("change", onV2Text);

  // ── the ground: the mask that opens out from behind the bowl ────────────
  // `video` is the seam: drop a webm in public/video/ and its luminance takes
  // the mask over, at the same scale and about the same centre.
  const fGround = fV2.addFolder({ title: "the ground (the mask that opens)", expanded: true });
  fGround.addBinding(cfg.v2.ground, "show", { label: "ground" });
  fGround.addBinding(cfg.v2.ground, "video", { label: "webm (public/video/…)" });
  fGround.addBinding(cfg.v2.ground, "at", { min: 0, max: 1, step: 0.01, label: "opens at" });
  fGround.addBinding(cfg.v2.ground, "dur", { min: 0.3, max: 8, step: 0.05, label: "opens over (s)" });
  fGround.addBinding(cfg.v2.ground, "scale", { min: 0.1, max: 3, step: 0.01, label: "reaches (vh)" });
  fGround.addBinding(cfg.v2.ground, "soft", { min: 0, max: 1, step: 0.005, label: "edge" });
  fGround.addBinding(cfg.v2.ground, "fbm", { min: 0, max: 1.5, step: 0.005, label: "FBM break-up" });
  fGround.addBinding(cfg.v2.ground, "freq", { min: 0.2, max: 14, step: 0.1, label: "...at scale" });
  fGround.addBinding(cfg.v2.ground, "speed", { min: 0, max: 1, step: 0.005, label: "...crawling at" });
  fGround.addBinding(cfg.v2.ground, "octaves", { min: 1, max: 6, step: 1 });
  fGround.addBinding(cfg.v2.ground, "wander", { min: 0, max: 0.3, step: 0.002, label: "drifts (vh)" });
  fGround.addBinding(cfg.v2.ground, "wanderSpeed", { min: 0, max: 1.2, step: 0.01, label: "...at" });
  fGround.addBinding(cfg.v2.ground, "images", { label: "his three images" });
  fGround.addBinding(cfg.v2.ground, "tint", { min: 0, max: 1, step: 0.01, label: "colour over them" });
  fGround.addBinding(cfg.v2.ground, "color", { label: "field, centre" });
  fGround.addBinding(cfg.v2.ground, "color2", { label: "field, edge" });
  const fGroundGlass = fGround.addFolder({ title: "the glass over them", expanded: false });
  fGroundGlass.addBinding(cfg.v2.ground.glass, "on", { label: "glass" });
  fGroundGlass.addBinding(cfg.v2.ground.glass, "blur", { min: 0, max: 0.12, step: 0.001, label: "frost" });
  fGroundGlass.addBinding(cfg.v2.ground.glass, "taps", { min: 4, max: 16, step: 1, label: "samples" });
  fGroundGlass.addBinding(cfg.v2.ground.glass, "refract", { min: 0, max: 0.1, step: 0.001, label: "refraction" });
  fGroundGlass.addBinding(cfg.v2.ground.glass, "split", { min: 0, max: 0.04, step: 0.0005, label: "channel split" });
  fGroundGlass.addBinding(cfg.v2.ground.glass, "tint", { label: "veil" });
  fGroundGlass.addBinding(cfg.v2.ground.glass, "tintAmount", { min: 0, max: 1, step: 0.01, label: "...amount" });
  fGroundGlass.addBinding(cfg.v2.ground.glass, "brightness", { min: 0.5, max: 2, step: 0.01 });
  fGroundGlass.addBinding(cfg.v2.ground.glass, "saturation", { min: 0, max: 2, step: 0.01 });
  fGround.addBinding(cfg.v2.ground, "out", { min: 0, max: 1, step: 0.01, label: "closes at (0 = stays)" });

  // ── the ring act, on the three pinned steps ─────────────────────────────
  const fAct = fV2.addFolder({ title: "the ring act — three pinned steps", expanded: true });
  fAct.addBinding(cfg.v2.act, "transitionShare", {
    min: 0.05, max: 0.9, step: 0.01, label: "next pose reached in the tail (share)",
  });
  fAct.addBinding(cfg.v2.act, "copyMode", {
    options: {
      "lines (in place)": "lines", "words (in place)": "words",
      "chars (in place)": "chars", fade: "fade",
    },
    label: "step copy",
  }).on("change", onV2Style);
  fAct.addBinding(cfg.v2.act, "copyAlign", { options: opts(["left", "center", "right"]) })
    .on("change", onV2Style);
  // three keyframes, one per step
  const key3 = (parent, obj, name, label, min, max, step, onChange) => {
    const f = parent.addFolder({ title: label, expanded: false });
    for (let i = 0; i < 3; i++) {
      const b = f.addBinding(obj[name], String(i), { min, max, step, label: `step ${i + 1}` });
      if (onChange) b.on("change", onChange);
    }
    return f;
  };
  key3(fAct, cfg.v2.act, "copySize", "step copy — size (vw), per step", 0.8, 6, 0.05, onV2Style);
  key3(fAct, cfg.v2.act, "copyWidth", "step copy — measure (vw), per step", 10, 60, 1, onV2Style);
  key3(fAct, cfg.v2.act, "copyX", "step copy — from left (vw), per step", 0, 40, 0.5, onV2Style);
  key3(fAct, cfg.v2.act, "copyY", "step copy — top (%), per step", 0, 80, 0.5, onV2Style);
  key3(fAct, cfg.v2.act, "size", "bowl size, per step", 0.1, 0.9, 0.005);
  key3(fAct, cfg.v2.act, "tilt", "bowl lean (°), per step", -20, 90, 1);
  key3(fAct, cfg.v2.act, "tiltZ", "bowl roll (°), per step", -45, 45, 1);
  key3(fAct, cfg.v2.act, "dist", "CAMERA distance, per step", 1.6, 8, 0.05);
  const fBg = fAct.addFolder({ title: "the world turns orange", expanded: false });
  fBg.addBinding(cfg.v2.act.bg, "at", { min: 0, max: 2, step: 1, label: "at step" });
  fBg.addBinding(cfg.v2.act.bg, "span", { min: 0.05, max: 1, step: 0.01, label: "over (of that step)" });
  fBg.addBinding(cfg.v2.act.bg, "color", { label: "colour" });
  fBg.addBinding(cfg.v2.act.bg, "envSpin", { min: -180, max: 180, step: 1, label: "env turns (°)" });
  fBg.addBinding(cfg.v2.act.bg, "hdr", { label: "HDR as the world (needs public/hdr)" });
  fBg.addBinding(cfg.v2.act.bg, "blur", { min: 0, max: 1, step: 0.01, label: "...blurred" });
  fBg.addBinding(cfg.v2.act.bg, "intensity", { min: 0, max: 3, step: 0.01, label: "...intensity" });
  const fBox = fAct.addFolder({ title: "where the canvas sits, after", expanded: false });
  fBox.addBinding(cfg.v2.canvasBox, "x", { min: 0, max: 60, step: 0.5, label: "from left (%)" })
    .on("change", onV2Style);
  fBox.addBinding(cfg.v2.canvasBox, "y", { min: 0, max: 60, step: 0.5, label: "from bottom (%)" })
    .on("change", onV2Style);
  fBox.addBinding(cfg.v2.canvasBox, "w", { min: 10, max: 80, step: 0.5, label: "width (%)" })
    .on("change", onV2Style);
  fBox.addBinding(cfg.v2.canvasBox, "h", { min: 10, max: 90, step: 0.5, label: "height (%)" })
    .on("change", onV2Style);
  fAct.addBinding(cfg.v2.act, "outAt", { min: 0.4, max: 1, step: 0.01, label: "everything leaves at" });
  fAct.addBinding(cfg.v2.act, "outDur", { min: 0.2, max: 4, step: 0.05, label: "...over (s)" });
  fAct.addBinding(cfg.v2.act, "outStagger", { min: 0, max: 0.4, step: 0.005, label: "...image → image (s)" });

  // ── the two rings ───────────────────────────────────────────────────────
  // `lean` is the one that matters: it is what gives a circle depth. At 0 it is
  // flat to the screen and nothing can pass behind anything; every degree of it
  // sends the top of the ring further behind the bowl.
  const ringFolder = (title, obj, expanded) => {
    const f = fV2.addFolder({ title, expanded });
    f.addBinding(obj, "show", { label: "ring" });
    f.addBinding(obj, "source", {
      options: { "ordinary people": "people", "the experiences": "experiences", teachers: "teachers" },
      label: "images",
    }).on("change", onRing);
    f.addBinding(obj, "count", { min: 3, max: 28, step: 1, label: "how many" }).on("change", onRing);
    f.addBinding(obj, "from", { min: 0, max: 2, step: 1, label: "blooms on step" });
    f.addBinding(obj, "at", { min: 0, max: 0.9, step: 0.01, label: "...at" });
    f.addBinding(obj, "to", { min: 0, max: 2, step: 1, label: "converged by step" });
    f.addBinding(obj, "lean", { min: 0, max: 85, step: 1, label: "leans back (°) ← depth" });
    f.addBinding(obj, "leanEnd", { min: 0, max: 85, step: 1, label: "...to" });
    f.addBinding(obj, "radius", { min: 0.2, max: 3, step: 0.01, label: "radius (× bowl)" });
    f.addBinding(obj, "radiusEnd", { min: 0.2, max: 3, step: 0.01, label: "...to" });
    f.addBinding(obj, "minRadius", { min: 0.3, max: 1.2, step: 0.01, label: "never closer than (× bowl) ← no clipping" });
    f.addBinding(obj, "card", { min: 0.04, max: 0.8, step: 0.005, label: "image (× bowl)" });
    f.addBinding(obj, "cardEnd", { min: 0.04, max: 0.8, step: 0.005, label: "...to" });
    f.addBinding(obj, "aspect", { min: 0.4, max: 2, step: 0.01, label: "image w/h" })
      .on("change", onRingStyle);
    f.addBinding(obj, "corner", { min: 0, max: 0.5, step: 0.005, label: "corner" })
      .on("change", onRingStyle);
    f.addBinding(obj, "cornerN", { min: 2, max: 8, step: 0.1, label: "squircle n" })
      .on("change", onRingStyle);
    f.addBinding(obj, "y", { min: -0.5, max: 0.5, step: 0.005, label: "y (vh from the bowl)" });
    f.addBinding(obj, "z", { min: -2, max: 2, step: 0.01, label: "z (× bowl, fore/aft)" });
    f.addBinding(obj, "tiltY", { min: -60, max: 60, step: 1, label: "yaw (°)" });
    f.addBinding(obj, "tiltZ", { min: -45, max: 45, step: 1, label: "roll (°)" });
    f.addBinding(obj, "speed", { min: -0.6, max: 0.6, step: 0.005, label: "turns (rad/s)" });
    f.addBinding(obj, "offset", { min: 0, max: 360, step: 1, label: "starts at (°)" });
    f.addBinding(obj, "faceCamera", { label: "face to camera" });
    f.addBinding(obj, "opacity", { min: 0, max: 1, step: 0.01 });
    f.addBinding(obj, "dur", { min: 0.2, max: 4, step: 0.05, label: "blooms in (s)" });
    f.addBinding(obj, "stagger", { min: 0, max: 0.6, step: 0.01, label: "image → image (s)" });
    f.addBinding(obj, "enterScale", { min: 0.05, max: 1, step: 0.01, label: "starts at (scale)" });
    f.addBinding(obj, "enterRadius", { min: 0.05, max: 2.5, step: 0.01, label: "...and (× radius)" });
    return f;
  };
  ringFolder("ring A — the people (inner)", cfg.v2.rings.a, false);
  ringFolder("ring B — the experiences (outer)", cfg.v2.rings.b, false);

  // ── the quiet section + the descent, both off by default now ────────────
  const fQuiet = fV2.addFolder({ title: "the quiet section · the descent", expanded: false });
  fQuiet.addBinding(cfg.v2.drop, "on", { label: "the bowl descends" });
  fQuiet.addBinding(cfg.v2.drop, "at", { min: 0.2, max: 0.98, step: 0.01, label: "starts at" });
  fQuiet.addBinding(cfg.v2.drop, "y", { min: -2, max: 0, step: 0.01, label: "down to (vh)" });
  fQuiet.addBinding(cfg.v2.drop, "back", { min: 0.1, max: 1, step: 0.01, label: "comes back over" });
  fQuiet.addBinding(cfg.v2.quiet, "show", { label: "quiet section" }).on("change", onQuiet);
  fQuiet.addBinding(cfg.v2.quiet, "vh", { min: 60, max: 300, step: 5, label: "height (vh)" })
    .on("change", onQuiet);
  fQuiet.addBinding(cfg.v2.quiet, "image", { min: 0, max: 8, step: 1, label: "which image" })
    .on("change", onQuiet);
  fQuiet.addBinding(cfg.v2.quiet, "dim", { min: 0, max: 1, step: 0.01 }).on("change", onQuiet);

  // ── the trust network — what actually sits in the corner ────────────────
  // A field of plain vertices on a sphere, three subsets of which get
  // assigned USER / TEACHER / TECHNIQUE as the section scrolls. It REPLACES
  // the sphere box above when it is on — the two never share the corner.
  const fNet = fV2.addFolder({ title: "the corner — trust network (a world of users → teachers → techniques)", expanded: true });
  fNet.addBinding(cfg.v2.network, "show", { label: "network (off = the sphere box)" }).on("change", onNetwork);
  fNet.addBinding(cfg.v2.network, "fieldCount", { min: 8, max: 220, step: 1, label: "the whole sphere" }).on("change", onNetwork);
  fNet.addBinding(cfg.v2.network, "peopleCount", { min: 0, max: 40, step: 1, label: "→ users" }).on("change", onNetwork);
  fNet.addBinding(cfg.v2.network, "teacherCount", { min: 0, max: 40, step: 1, label: "→ teachers" }).on("change", onNetwork);
  fNet.addBinding(cfg.v2.network, "techniqueCount", { min: 0, max: 60, step: 1, label: "→ techniques" }).on("change", onNetwork);
  fNet.addBinding(cfg.v2.network, "centerX", { min: 0, max: 100, step: 1, label: "centre x (% of box)" }).on("change", onNetwork);
  fNet.addBinding(cfg.v2.network, "centerY", { min: 0, max: 100, step: 1, label: "centre y (% of box)" }).on("change", onNetwork);
  fNet.addBinding(cfg.v2.network, "radius", { min: 10, max: 60, step: 1, label: "sphere radius (% short side)" }).on("change", onNetwork);
  fNet.addBinding(cfg.v2.network, "tiltX", { min: -60, max: 60, step: 1, label: "lean back (°)" }).on("change", onNetwork);
  fNet.addBinding(cfg.v2.network, "rotateY", { min: -180, max: 180, step: 1, label: "yaw (°)" }).on("change", onNetwork);
  fNet.addBinding(cfg.v2.network, "perspective", { min: 0, max: 1, step: 0.01, label: "depth (size/opacity)" }).on("change", onNetwork);
  fNet.addBinding(cfg.v2.network, "pillReach", { min: 1, max: 2.5, step: 0.02, label: "pills sit outside by" }).on("change", onNetwork);
  fNet.addBinding(cfg.v2.network, "dotField", { min: 1, max: 16, step: 0.5, label: "field dot (px)" }).on("change", onNetwork);
  fNet.addBinding(cfg.v2.network, "fieldColor", { label: "field colour" }).on("change", onNetwork);
  fNet.addBinding(cfg.v2.network, "fieldAlpha", { min: 0, max: 1, step: 0.01, label: "field opacity" }).on("change", onNetwork);
  fNet.addBinding(cfg.v2.network, "fieldIn", { min: 0.01, max: 0.5, step: 0.01, label: "field appears over" }).on("change", onNetwork);
  fNet.addBinding(cfg.v2.network, "bow", { min: 0, max: 0.8, step: 0.01, label: "connector bow" }).on("change", onNetwork);
  fNet.addBinding(cfg.v2.network, "stagger", { min: 0, max: 0.95, step: 0.01, label: "dot → dot stagger" }).on("change", onNetwork);
  fNet.addBinding(cfg.v2.network, "dotUser", { min: 10, max: 60, step: 1, label: "user photo (px)" }).on("change", onNetwork);
  fNet.addBinding(cfg.v2.network, "dotTeacher", { min: 10, max: 70, step: 1, label: "teacher photo (px)" }).on("change", onNetwork);
  fNet.addBinding(cfg.v2.network, "lineWidth", { min: 0.5, max: 5, step: 0.1 }).on("change", onNetwork);
  fNet.addBinding(cfg.v2.network, "lineColor", { label: "line colour" }).on("change", onNetwork);
  fNet.addBinding(cfg.v2.network, "lineAlpha", { min: 0, max: 1, step: 0.01, label: "line opacity" }).on("change", onNetwork);
  const fPill = fNet.addFolder({ title: "the technique pill", expanded: false });
  fPill.addBinding(cfg.v2.network.pill, "bg", { label: "background" }).on("change", onNetwork);
  fPill.addBinding(cfg.v2.network.pill, "ink", { label: "text" }).on("change", onNetwork);
  fPill.addBinding(cfg.v2.network.pill, "fontSize", { min: 7, max: 18, step: 0.5, label: "size (px)" }).on("change", onNetwork);
  fPill.addBinding(cfg.v2.network.pill, "padX", { min: 4, max: 24, step: 1, label: "padding (px)" }).on("change", onNetwork);
  fPill.addBinding(cfg.v2.network.pill, "h", { min: 14, max: 40, step: 1, label: "height (px)" }).on("change", onNetwork);

  // ── the intro reveal: clipped words rising on the EXPO axis ─────────────
  const fIntro = pane.addFolder({ title: "Intro reveal (hero · until)", expanded: false });
  fIntro.addBinding(cfg.intro, "stagger", { min: 0, max: 0.98, step: 0.01, label: "word stagger" })
    .on("change", onIntro);
  fIntro.addBinding(cfg.intro, "ease", { options: opts(EASES), label: "per-word ease" })
    .on("change", onIntro);
  fIntro.addBinding(cfg.intro, "rise", { min: 0, max: 140, step: 1, label: "rise (% of box)" })
    .on("change", onIntro);
  fIntro.addBinding(cfg.intro, "riseOut", { min: 0, max: 1.5, step: 0.05, label: "leave by" })
    .on("change", onIntro);
  fIntro.addBinding(cfg.intro, "expoFrom", { min: -100, max: 100, step: 1, label: "EXPO from" })
    .on("change", onIntro);
  fIntro.addBinding(cfg.intro, "expoRest", { min: -100, max: 100, step: 1, label: "EXPO rest" })
    .on("change", onIntro);
  fIntro.addBinding(cfg.intro, "overshoot", { min: -80, max: 80, step: 1, label: "EXPO overshoot" })
    .on("change", onIntro);
  fIntro.addBinding(cfg.intro, "fadeIn", { min: 0.05, max: 1, step: 0.01, label: "opacity ramp" })
    .on("change", onIntro);
  fIntro.addBinding(cfg.intro, "blur", { min: 0, max: 14, step: 0.1 }).on("change", onIntro);
  fIntro.addBinding(cfg.intro, "skew", { min: -20, max: 20, step: 0.5, label: "skew °" })
    .on("change", onIntro);
  fIntro.addButton({ title: "Replay" }).on("click", onHero);

  // ── the three steps ─────────────────────────────────────────────────────
  const fSteps = pane.addFolder({ title: "Steps — height + copy", expanded: true });
  cfg.steps.forEach((step, i) => {
    const f = fSteps.addFolder({ title: `${i + 1} · ${step.name}`, expanded: i === 0 });
    f.addBinding(step, "name").on("change", onDebug);
    f.addBinding(step, "vh", { min: 40, max: 500, step: 10, label: "scroll (vh)" })
      .on("change", onPinHeight);
    f.addBinding(step, "text", { label: "copy ( | = line )" }).on("change", onCopy);
    f.addBinding(step, "textIn", { min: 0.02, max: 0.8, step: 0.01, label: "copy in" })
      .on("change", onDebug);
    f.addBinding(step, "textOut", { min: 0.02, max: 0.8, step: 0.01, label: "copy out" })
      .on("change", onDebug);
    if (step.textDelay !== undefined) {
      f.addBinding(step, "textDelay", { min: 0, max: 0.9, step: 0.01, label: "copy waits" })
        .on("change", onDebug);
    }
  });

  // ── copy look + the EXPO reveal ─────────────────────────────────────────
  const fText = pane.addFolder({ title: "Copy — Exposure EXPO", expanded: true });
  fText.addBinding(cfg.text, "mode", {
    options: { "mask (clipped lines)": "mask", words: "words", fade: "fade" },
    label: "reveal",
  }).on("change", onCopyMode);
  fText.addBinding(cfg.text, "size", { min: 1, max: 6, step: 0.05, label: "size (vw)" })
    .on("change", onCopyStyle);
  fText.addBinding(cfg.text, "lineHeight", { min: 0.85, max: 1.8, step: 0.01 })
    .on("change", onCopyStyle);
  fText.addBinding(cfg.text, "tracking", { min: -0.06, max: 0.1, step: 0.002, label: "tracking (em)" })
    .on("change", onCopyStyle);
  fText.addBinding(cfg.text, "align", { options: opts(["left", "center"]) })
    .on("change", onCopyStyle);
  fText.addBinding(cfg.text, "stagger", { min: 0, max: 1, step: 0.01 });
  fText.addBinding(cfg.text, "overlap", { min: 0, max: 0.4, step: 0.01, label: "crossfade" })
    .on("change", onDebug);
  fText.addBinding(cfg.text, "rise", { min: 0, max: 2, step: 0.02, label: "rise (em)" });
  fText.addBinding(cfg.text, "blur", { min: 0, max: 24, step: 0.5, label: "blur (px)" });
  fText.addBinding(cfg.text, "lead", { min: 0, max: 100, step: 5, label: "1st in (vh)" });
  fText.addBinding(cfg.text, "expoFrom", { min: -100, max: 100, step: 1, label: "EXPO in" });
  fText.addBinding(cfg.text, "expoRest", { min: -100, max: 100, step: 1, label: "EXPO rest" });
  fText.addBinding(cfg.text, "expoTo", { min: -100, max: 100, step: 1, label: "EXPO out" });
  fText.addBinding(cfg.text, "fadeIn", { min: 0.05, max: 1, step: 0.05, label: "fade in ×" });
  fText.addBinding(cfg.text, "fadeOut", { min: 0.05, max: 1, step: 0.05, label: "fade out ×" });

  // ── columns ─────────────────────────────────────────────────────────────
  const fSec = pane.addFolder({ title: "Sections around", expanded: false });
  fSec.addBinding(cfg.sections, "aboveVh", { min: 0, max: 300, step: 10, label: "above (vh)" })
    .on("change", onColumns);
  // "below (vh)" removed: #below now holds the team section and sizes to
  // its own content, so a forced vh no longer means anything.
  fSec.addBinding(cfg.sections, "pageBg", { view: "color", label: "page" })
    .on("change", onColumns);
  fSec.addBinding(cfg.scroll, "handoverVh", {
    min: 0, max: 200, step: 10, label: "section handover (vh)",
  }).on("change", onPinHeight);
  fSec.addBinding(cfg.sections, "canvasSteps", {
    min: 1, max: 6, step: 1, label: "canvas lasts (steps)",
  }).on("change", () => { onPinHeight(); onLeftBuild(); });
  fSec.addBinding(cfg.atlas, "overlapVh", {
    min: 0, max: 200, step: 10, label: "atlas collapses over (vh)",
  }).on("change", onPinHeight);

  const fCol = pane.addFolder({ title: "Columns", expanded: false });
  fCol.addBinding(cfg.columns, "split", { min: 20, max: 80, step: 1, label: "left (%)" })
    .on("change", onColumns);
  fCol.addBinding(cfg.columns, "leftBg", { view: "color", label: "left bg" }).on("change", onColumns);
  fCol.addBinding(cfg.columns, "leftInk", { view: "color", label: "left ink" }).on("change", onColumns);
  fCol.addBinding(cfg.columns, "rightBg", { view: "color", label: "canvas bg" }).on("change", onColumns);
  fCol.addBinding(cfg.columns, "pad", { min: 0, max: 16, step: 0.5, label: "pad (vw)" })
    .on("change", onColumns);

  // ── the video cards in the hero ────────────────────────────────────────
  const fSwap = pane.addFolder({ title: "Hero — video cards (the deck)", expanded: false });
  const C = cfg.cards;
  fSwap.addBinding(C, "show").on("change", onCardStyle);
  fSwap.addBinding(C, "caption", { label: "caption ( | = line )" }).on("change", onCardStyle);
  fSwap.addBinding(C, "count", { min: 2, max: 6, step: 1, label: "in the stack" }).on("change", onCards);
  fSwap.addBinding(C, "w", { min: 120, max: 520, step: 4 }).on("change", onCardStyle);
  fSwap.addBinding(C, "h", { min: 80, max: 360, step: 4 }).on("change", onCardStyle);
  fSwap.addBinding(C, "radius", { min: 0, max: 40, step: 1 }).on("change", onCardStyle);
  fSwap.addBinding(C, "right", { min: 0, max: 12, step: 0.1, label: "right (vw)" }).on("change", onCardStyle);
  fSwap.addBinding(C, "bottom", { min: 0, max: 20, step: 0.5, label: "bottom (vh)" }).on("change", onCardStyle);
  fSwap.addBinding(C, "capSize", { min: 0.4, max: 2, step: 0.02, label: "caption (vw)" }).on("change", onCardStyle);
  const fDeck = fSwap.addFolder({ title: "The deck", expanded: true });
  fDeck.addBinding(C, "fan", { min: 0, max: 20, step: 0.5, label: "turn each (°)" }).on("change", onCardStyle);
  fDeck.addBinding(C, "scaleStep", { min: 0, max: 0.2, step: 0.005, label: "smaller each" }).on("change", onCardStyle);
  fDeck.addBinding(C, "origin", { label: "turns about" }).on("change", onCardStyle);
  fDeck.addBinding(C, "randomRotation", { label: "random tilt" }).on("change", onCardStyle);
  fDeck.addBinding(C, "perspective", { min: 200, max: 2000, step: 20 }).on("change", onCardStyle);

  const fSpring = fSwap.addFolder({ title: "Spring + drag", expanded: true });
  fSpring.addBinding(C, "stiffness", { min: 40, max: 800, step: 10 });
  fSpring.addBinding(C, "damping", { min: 4, max: 80, step: 1 });
  fSpring.addBinding(C, "sensitivity", { min: 40, max: 400, step: 10, label: "throw at (px)" });
  fSpring.addBinding(C, "elastic", { min: 0.1, max: 1, step: 0.05, label: "follows pointer" });
  fSpring.addBinding(C, "tiltMax", { min: 0, max: 80, step: 1, label: "tilt (°)" });
  fSpring.addBinding(C, "tiltRange", { min: 20, max: 300, step: 10, label: "...over (px)" });
  fSpring.addBinding(C, "clickToBack", { label: "click sends to back" });
  fSpring.addButton({ title: "Send the top card back" }).on("click", () => onCardOpen(true));

  // ── the left column: photograph per step + the glass card ──────────────
  const fLeft = pane.addFolder({ title: "Left column — image + glass", expanded: true });
  fLeft.addBinding(cfg.left, "images", { label: "photographs" }).on("change", onLeftBuild);
  fLeft.addBinding(cfg.left, "cross", { min: 0.05, max: 0.9, step: 0.01, label: "crossfade" });
  fLeft.addBinding(cfg.left, "zoom", { min: 0, max: 0.4, step: 0.005, label: "slow zoom" });
  fLeft.addBinding(cfg.left, "dim", { min: 0, max: 0.8, step: 0.01, label: "darken" })
    .on("change", onLeft);
  const fCard = fLeft.addFolder({ title: "Glass card (squircle)", expanded: true });
  fCard.addBinding(cfg.left.card, "square", { label: "square (h from w)" })
    .on("change", onLeft);
  fCard.addBinding(cfg.left.card, "show").on("change", onLeft);
  fCard.addBinding(cfg.left.card, "glassFull", { label: "glass = whole column" })
    .on("change", onLeft);
  fCard.addBinding(cfg.left.card, "w", { min: 30, max: 100, step: 1, label: "width (% col)" })
    .on("change", onLeft);
  fCard.addBinding(cfg.left.card, "h", { min: 20, max: 100, step: 1, label: "height (vh)" })
    .on("change", onLeft);
  fCard.addBinding(cfg.left.card, "y", { min: -30, max: 30, step: 1, label: "offset y (vh)" })
    .on("change", onLeft);
  fCard.addBinding(cfg.left.card, "r", { min: 0, max: 50, step: 0.5, label: "radius (%)" })
    .on("change", onLeft);
  fCard.addBinding(cfg.left.card, "n", { min: 2, max: 8, step: 0.1, label: "squircle n" })
    .on("change", onLeft);
  fCard.addBinding(cfg.left.card, "blur", { min: 0, max: 60, step: 1, label: "glass blur" })
    .on("change", onLeft);
  fCard.addBinding(cfg.left.card, "sat", { min: 0.2, max: 2.5, step: 0.01, label: "saturation" })
    .on("change", onLeft);
  fCard.addBinding(cfg.left.card, "tint", { view: "color" }).on("change", onLeft);
  fCard.addBinding(cfg.left.card, "alpha", { min: 0, max: 1, step: 0.01, label: "opacity" })
    .on("change", onLeft);
  fCard.addBinding(cfg.left.card, "edge", { min: 0, max: 1, step: 0.01, label: "hairline" })
    .on("change", onLeft);
  fCard.addBinding(cfg.left.card, "frost", { min: 0, max: 220, step: 2, label: "glass mat (px)" })
    .on("change", onLeft);
  const G = cfg.left.card.glass;
  const fGlass = fCard.addFolder({ title: "Glass surface (refraction)", expanded: true });
  fGlass.addBinding(G, "on").on("change", onLeft);
  fGlass.addBinding(G, "scale", { min: -400, max: 400, step: 1, label: "displacement" }).on("change", onLeft);
  fGlass.addBinding(G, "redOffset", { min: -60, max: 60, step: 1, label: "red" }).on("change", onLeft);
  fGlass.addBinding(G, "greenOffset", { min: -60, max: 60, step: 1, label: "green" }).on("change", onLeft);
  fGlass.addBinding(G, "blueOffset", { min: -60, max: 60, step: 1, label: "blue" }).on("change", onLeft);
  fGlass.addBinding(G, "displace", { min: 0, max: 6, step: 0.05, label: "soften" }).on("change", onLeft);
  fGlass.addBinding(G, "blur", { min: 0, max: 40, step: 0.5, label: "map blur" }).on("change", onLeft);
  fGlass.addBinding(G, "brightness", { min: 0, max: 100, step: 1 }).on("change", onLeft);
  fGlass.addBinding(G, "opacity", { min: 0, max: 1, step: 0.01, label: "map opacity" }).on("change", onLeft);
  fGlass.addBinding(G, "borderWidth", { min: 0, max: 0.5, step: 0.005, label: "edge width" }).on("change", onLeft);
  fGlass.addBinding(G, "saturation", { min: 0.2, max: 2.5, step: 0.01 }).on("change", onLeft);
  fGlass.addBinding(G, "radius", { min: 0, max: 300, step: 2, label: "map radius" }).on("change", onLeft);
  fGlass.addBinding(G, "blend", {
    options: opts(["difference", "screen", "overlay", "multiply", "normal"]),
  }).on("change", onLeft);
  fGlass.addBinding(G, "xChannel", { options: opts(["R", "G", "B", "A"]) }).on("change", onLeft);
  fGlass.addBinding(G, "yChannel", { options: opts(["R", "G", "B", "A"]) }).on("change", onLeft);
  fGlass.addBinding(G, "fallbackBlur", { min: 0, max: 60, step: 1, label: "safari blur" }).on("change", onLeft);
  fCard.addBinding(cfg.left.card, "frostTint", { min: 0, max: 1, step: 0.01, label: "mat white" })
    .on("change", onLeft);
  fCard.addBinding(cfg.left.card, "shadow", { min: 0, max: 1, step: 0.01 }).on("change", onLeft);
  fCard.addBinding(cfg.left.card, "shadowBlur", { min: 0, max: 160, step: 2, label: "shadow blur" })
    .on("change", onLeft);
  fCard.addBinding(cfg.left.card, "shadowY", { min: -60, max: 120, step: 1, label: "shadow y" })
    .on("change", onLeft);

  // ── step 1 ──────────────────────────────────────────────────────────────
  const fPortrait = pane.addFolder({ title: "1 · the portrait", expanded: false });
  fPortrait.addBinding(cfg.portrait, "intro", {
    options: { "fade in": "fade", "already there": "none" },
  });
  fPortrait.addBinding(cfg.portrait, "introDur", { min: 0.1, max: 3, step: 0.05, label: "fade (s)" });
  fPortrait.addBinding(cfg.portrait, "fill", { min: 0.2, max: 1.2, step: 0.01 });
  fPortrait.addBinding(cfg.portrait, "fov", { min: 12, max: 70, step: 1, label: "start fov" });
  fPortrait.addBinding(cfg.portrait, "index", { min: -1, max: 40, step: 1, label: "card (-1 auto)" })
    .on("change", onRebuild);
  fPortrait.addButton({ title: "Replay intro" }).on("click", onReplay);

  // ── step 2 ──────────────────────────────────────────────────────────────
  const fAsm = pane.addFolder({ title: "2 · assembly", expanded: false });
  fAsm.addBinding(cfg.assembly, "startFrac", { min: 0, max: 1, step: 0.01, label: "starts at (of step 1)" })
    .on("change", onDebug);
  fAsm.addBinding(cfg.assembly, "endFrac", { min: 0.1, max: 1, step: 0.01, label: "done at (of step 2)" })
    .on("change", onDebug);
  fAsm.addBinding(cfg.assembly, "stagger", { min: 0, max: 1, step: 0.01 });
  fAsm.addBinding(cfg.assembly, "window", { min: 0.05, max: 1, step: 0.01 });
  fAsm.addBinding(cfg.assembly, "distance", { min: 0, max: 14, step: 0.1 });
  fAsm.addBinding(cfg.assembly, "order", { options: opts(["center", "index", "random"]) })
    .on("change", onRebuild);

  // ── steps 4–6: the evidence panel ──────────────────────────────────────
  const fEv = pane.addFolder({ title: "4–6 · evidence panel", expanded: true });
  const E = cfg.evidence;
  fEv.addBinding(E, "show", { label: "panel" }).on("change", onLeft);
  fEv.addBinding(E, "title", { label: "statement ( | = line )" }).on("change", onLeftBuild);
  fEv.addBinding(E, "titleSize", { min: 0.8, max: 4, step: 0.02, label: "statement (vw)" })
    .on("change", onLeft);
  fEv.addBinding(E, "titleWidth", { min: 16, max: 90, step: 1, label: "measure (vw)" })
    .on("change", onLeft);
  fEv.addBinding(E, "titleLh", { min: 0.9, max: 1.6, step: 0.01, label: "statement lh" })
    .on("change", onLeft);
  fEv.addBinding(E, "titleTop", { min: 0, max: 60, step: 0.5, label: "statement top (%)" })
    .on("change", onLeft);
  fEv.addBinding(E, "titleX", { min: 0, max: 60, step: 0.5, label: "statement x (vw)" })
    .on("change", onLeft);
  fEv.addBinding(E, "titleAt", { min: 0, max: 0.9, step: 0.01, label: "fires at" });
  fEv.addBinding(E, "titleDur", { min: 0.2, max: 4, step: 0.05, label: "one line (s)" });
  fEv.addBinding(E, "titleStagger", { min: 0, max: 1.2, step: 0.02, label: "line → line (s)" });
  fEv.addBinding(E, "titleRise", { min: 0, max: 120, step: 1, label: "rise (% — 0 = in place)" })
    .on("change", onLeft);
  fEv.addBinding(E, "titleMode", {
    options: { "lines (in place)": "lines", "words (in place)": "words", "chars (in place)": "chars" },
    label: "statement split",
  }).on("change", onLeftBuild);
  fEv.addBinding(E, "titleAlign", { options: opts(["left", "center", "right"]), label: "statement align" })
    .on("change", onLeft);
  const fEvRows = fEv.addFolder({ title: "the three steps — a row", expanded: true });
  fEvRows.addBinding(E, "rowsX", { min: 0, max: 60, step: 0.5, label: "row x (vw)" })
    .on("change", onLeft);
  fEvRows.addBinding(E, "rowsTop", { min: 2, max: 90, step: 1, label: "row top (%)" })
    .on("change", onLeft);
  fEvRows.addBinding(E, "rowW", { min: 6, max: 30, step: 0.5, label: "step width (vw)" })
    .on("change", onLeft);
  fEvRows.addBinding(E, "rowGap", { min: 0, max: 10, step: 0.2, label: "step gap (vw)" })
    .on("change", onLeft);
  fEvRows.addBinding(E, "labelSize", { min: 0.4, max: 2, step: 0.02, label: "label (vw)" })
    .on("change", onLeft);
  fEvRows.addBinding(E, "paraSize", { min: 0.3, max: 2, step: 0.02, label: "para (vw)" })
    .on("change", onLeft);
  fEvRows.addBinding(E, "barH", { min: 1, max: 10, step: 1, label: "rail (px)" }).on("change", onLeft);
  fEvRows.addBinding(E, "barBg", { view: "color", label: "rail track" }).on("change", onLeft);
  fEvRows.addBinding(E, "barInk", { view: "color", label: "rail fill" }).on("change", onLeft);
  fEvRows.addBinding(E, "paraFade", { min: 0.02, max: 0.6, step: 0.01, label: "para fade" });
  E.rows.forEach((r, i) => {
    const f = fEvRows.addFolder({ title: `${i + 1} · ${r.label}`, expanded: false });
    f.addBinding(r, "label").on("change", onLeftBuild);
    f.addBinding(r, "para", { label: "para ( | = line )" }).on("change", onLeftBuild);
  });
  const fEvSum = fEv.addFolder({ title: "the summary — bottom left", expanded: false });
  fEvSum.addBinding(E, "summary", { label: "text ( | = line )" }).on("change", onLeftBuild);
  fEvSum.addBinding(E, "summarySize", { min: 0.4, max: 2.5, step: 0.02, label: "size (vw)" })
    .on("change", onLeft);
  fEvSum.addBinding(E, "summaryWidth", { min: 10, max: 60, step: 1, label: "measure (vw)" })
    .on("change", onLeft);
  fEvSum.addBinding(E, "summaryX", { min: 0, max: 60, step: 0.5, label: "x (vw)" })
    .on("change", onLeft);
  fEvSum.addBinding(E, "summaryBottom", { min: 0, max: 60, step: 0.5, label: "from bottom (%)" })
    .on("change", onLeft);
  fEvSum.addBinding(E, "summaryMode", {
    options: { "lines (in place)": "lines", "words (in place)": "words", "chars (in place)": "chars" },
    label: "split",
  }).on("change", onLeftBuild);
  fEvSum.addBinding(E, "summaryAlign", { options: opts(["left", "center", "right"]), label: "align" })
    .on("change", onLeft);

  const P = cfg.pills3d;
  const fPills = pane.addFolder({ title: "3 · pills (in the sphere)", expanded: true });
  fPills.addBinding(P, "text", { label: "override (comma)" }).on("change", onPills);
  fPills.addBinding(P, "startFrac", { min: 0, max: 0.8, step: 0.01, label: "start at" })
    .on("change", onDebug);
  fPills.addBinding(P, "span", { min: 0.1, max: 1, step: 0.01 }).on("change", onDebug);
  fPills.addBinding(P, "stagger", { min: 0, max: 1, step: 0.01 });
  fPills.addBinding(P, "order", { options: opts(["index", "random"]) }).on("change", onPills);
  fPills.addBinding(P, "count", { min: 4, max: 45, step: 1, label: "categories" })
    .on("change", onPills);
  fPills.addBinding(P, "shell", { min: 0.6, max: 2, step: 0.01, label: "radius ×" });
  fPills.addBinding(P, "jitter", { min: 0, max: 0.6, step: 0.01, label: "radius ±" });
  fPills.addBinding(P, "twist", { min: 0, max: 1, step: 0.01 }).on("change", onPills);
  fPills.addBinding(P, "pillH", { min: 0.15, max: 2, step: 0.01, label: "size" });
  fPills.addBinding(P, "float", { min: 0, max: 1, step: 0.01 });
  fPills.addBinding(P, "floatSpeed", { min: 0, max: 2, step: 0.02 });
  fPills.addBinding(P, "tilt", { min: 0, max: 20, step: 0.5, label: "wobble (°)" });
  fPills.addBinding(P, "faceMode", {
    options: { plane: "plane", point: "point" }, label: "face to camera",
  });
  fPills.addBinding(P, "enterScale", { min: 0.05, max: 1, step: 0.05, label: "grow from" });
  fPills.addBinding(P, "radius", { min: 0.05, max: 0.5, step: 0.01 }).on("change", onPills);
  fPills.addBinding(P, "bg", { view: "color" }).on("change", onPills);
  fPills.addBinding(P, "ink", { view: "color" }).on("change", onPills);
  fPills.addBinding(P, "fontSize", { min: 8, max: 30, step: 1, label: "label px" })
    .on("change", onPills);
  fPills.addBinding(P, "padX", { min: 0.4, max: 2.5, step: 0.05, label: "pad (em)" })
    .on("change", onPills);

  // ── the last section ────────────────────────────────────────────────────
  // Everything the MARK is lives in src/atlas/preset.json. These are the page's
  // own decisions about it, plus the handful of dials worth reaching for.
  const fAtlas = pane.addFolder({ title: "Atlas — the last section", expanded: true });
  fAtlas.addBinding(cfg.atlas, "show", { label: "section on" }).on("change", onPinHeight);
  fAtlas.addBinding(cfg.atlas, "vh", { min: 150, max: 900, step: 10, label: "scroll (vh)" })
    .on("change", onPinHeight);
  fAtlas.addBinding(cfg.atlas, "overlapVh", { min: 0, max: 200, step: 10, label: "collapses over (vh)" })
    .on("change", onPinHeight);
  fAtlas.addBinding(cfg.atlas, "shadow", { label: "collapse shadow" }).on("change", onPinHeight);
  fAtlas.addBinding(atlas.scene, "background", { view: "color", label: "ground" })
    .on("change", onColumns);
  fAtlas.addBinding(atlas.camera, "fov", { min: 14, max: 70, step: 1, label: "lens" })
    .on("change", onAtlasView);
  fAtlas.addBinding(atlas.camera, "padding", { min: 0, max: 3, step: 0.02, label: "margin (size)" })
    .on("change", onAtlasView);
  fAtlas.addBinding(atlas.camera, "offsetY", { min: -3, max: 3, step: 0.02, label: "vertical position" })
    .on("change", onAtlasView);
  fAtlas.addBinding(atlas.camera, "offsetX", { min: -3, max: 3, step: 0.02, label: "horizontal position" })
    .on("change", onAtlasView);
  fAtlas.addBinding(atlas.pointer, "amount", { min: 0, max: 30, step: 0.5, label: "lean (°)" });

  const fAtlasTitle = fAtlas.addFolder({ title: "The header", expanded: false });
  fAtlasTitle.addBinding(cfg.atlas.title, "show", { label: "on" }).on("change", onAtlasTitle);
  fAtlasTitle.addBinding(cfg.atlas.title, "heading", { label: "heading" }).on("change", onAtlasTitle);
  fAtlasTitle.addBinding(cfg.atlas.title, "sub", { label: "sub" }).on("change", onAtlasTitle);
  fAtlasTitle.addBinding(cfg.atlas.title, "top", { min: 0, max: 300, step: 2, label: "top (px)" })
    .on("change", onAtlasTitle);
  fAtlasTitle.addBinding(cfg.atlas.title, "maxWidth", { min: 320, max: 960, step: 10, label: "width (px)" })
    .on("change", onAtlasTitle);
  fAtlasTitle.addBinding(cfg.atlas.title, "size", { min: 1, max: 4, step: 0.05, label: "size (vw)" })
    .on("change", onAtlasTitle);
  fAtlasTitle.addBinding(cfg.atlas.title, "subSize", { min: 0.5, max: 2, step: 0.05, label: "sub size (vw)" })
    .on("change", onAtlasTitle);
  fAtlasTitle.addBinding(cfg.atlas.title, "dur", { min: 0.01, max: 0.3, step: 0.01, label: "fades in over" });
  fAtlasTitle.addBinding(cfg.atlas.title, "align", { options: opts(["left", "center", "right"]) })
    .on("change", onAtlasTitle);

  const fMark = fAtlas.addFolder({ title: "The mark", expanded: false });
  fMark.addBinding(atlas.curve, "amplitude", { min: 0.6, max: 3.4, step: 0.02, label: "lobe swing" })
    .on("change", onAtlas);
  fMark.addBinding(atlas.curve, "radius", { min: 1, max: 4, step: 0.05 }).on("change", onAtlas);
  fMark.addBinding(atlas.curve, "depth", { min: 0, max: 1.6, step: 0.01 }).on("change", onAtlas);
  fMark.addBinding(atlas.section, "width", { min: 0.05, max: 0.9, step: 0.01, label: "band w" })
    .on("change", onAtlas);
  fMark.addBinding(atlas.section, "thickness", { min: 0.02, max: 0.5, step: 0.005 })
    .on("change", onAtlas);
  fMark.addBinding(atlas.material, "roughness", { min: 0, max: 1, step: 0.01 });
  fMark.addBinding(atlas.material, "rim", { min: 0, max: 1, step: 0.01, label: "silhouette" });

  const fDraw = fAtlas.addFolder({ title: "The reveal", expanded: false });
  fDraw.addBinding(atlas.reveal, "grow", { min: 0.005, max: 0.2, step: 0.001, label: "band grows over" });
  fDraw.addBinding(atlas.reveal, "waveAmount", { min: 0, max: 0.12, step: 0.002, label: "front wave" });
  fDraw.addBinding(atlas.reveal, "swell", { min: 0, max: 0.08, step: 0.001 });
  fDraw.addBinding(atlas.reveal, "trailAmount", { min: 0, max: 1, step: 0.01, label: "trail" });
  fDraw.addBinding(atlas.reveal, "trailColor", { view: "color" });
  fDraw.addBinding(atlas.reveal, "lipAmount", { min: 0, max: 1, step: 0.01, label: "lip" });

  // ── post-processing (his ask, 2026-09-16) ────────────────────────────────
  // Every number here is read live, every frame — no rebuild needed, not even
  // for the on/off switch (`frame()` just takes the plain-render branch).
  const fPost = fAtlas.addFolder({ title: "Post-processing", expanded: false });
  fPost.addBinding(atlas.post, "enabled", { label: "on" });
  fPost.addBinding(atlas.post, "bloomStrength", { min: 0, max: 1.5, step: 0.01, label: "bloom" });
  fPost.addBinding(atlas.post, "bloomRadius", { min: 0, max: 1, step: 0.01, label: "bloom radius" });
  fPost.addBinding(atlas.post, "bloomThreshold", { min: 0, max: 1, step: 0.01, label: "bloom threshold" });
  fPost.addBinding(atlas.post, "vignette", { min: 0, max: 1, step: 0.01 });

  const fCards2 = fAtlas.addFolder({ title: "The three cards", expanded: false });
  fCards2.addBinding(atlas.cards, "enabled", { label: "cards" });
  fCards2.addBinding(atlas.cards, "fade", { min: 0.01, max: 0.4, step: 0.005, label: "arrive over" });
  fCards2.addBinding(atlas.cards, "distance", { min: 0, max: 160, step: 2, label: "clearance (px)" });
  fCards2.addBinding(atlas.cards, "maxWidth", { min: 180, max: 520, step: 4, label: "width (px)" });
  fCards2.addBinding(atlas.cards, "padTop", { min: 0, max: 360, step: 4, label: "clear the header (px)" });
  atlas.cards.items.forEach((it, i) => {
    const f = fCards2.addFolder({ title: `${i + 1} · ${it.title}`, expanded: false });
    f.addBinding(it, "title");
    f.addBinding(it, "body");
    f.addBinding(it, "color", { view: "color" });
    f.addBinding(it, "t", { min: 0, max: 1, step: 0.0001, label: "on the path" });
  });

  const fSphere = pane.addFolder({ title: "Sphere (rebuild)", expanded: false });
  fSphere.addBinding(cfg.images, "source", {
    options: { "photos (src/photos)": "photos", "metalab cases": "metalab" },
  }).on("change", onRebuild);
  fSphere.addBinding(cfg.images, "count", { min: 3, max: 60, step: 1, label: "cards" })
    .on("change", onRebuild);
  fSphere.addBinding(cfg.images, "video", { label: "play videos" }).on("change", onRebuild);
  fSphere.addBinding(cfg.layout, "radius", { min: 3, max: 24, step: 0.1 }).on("change", onRebuild);
  fSphere.addBinding(cfg.geometry, "planeW", { min: 0.5, max: 9, step: 0.05, label: "card w" })
    .on("change", onRebuild);
  fSphere.addBinding(cfg.geometry, "aspect", { min: 0.4, max: 3, step: 0.01 })
    .on("change", onRebuild);
  fSphere.addBinding(cfg.geometry, "bend", { min: 0, max: 1, step: 0.01 }).on("change", onRebuild);
  fSphere.addBinding(cfg.geometry, "segments", { min: 1, max: 40, step: 1 }).on("change", onRebuild);
  fSphere.addBinding(cfg.geometry, "borderRadius", { min: 0, max: 0.5, step: 0.005 });
  fSphere.addBinding(cfg.geometry, "cornerN", { min: 2, max: 8, step: 0.1, label: "squircle n" });
  fSphere.addBinding(cfg.layout, "faceCamera");

  const fCam = pane.addFolder({ title: "Camera (wide angle)", expanded: false });
  fCam.addBinding(cfg.camera, "fov", { min: 30, max: 130, step: 1, label: "end fov" });
  fCam.addBinding(cfg.camera, "z", { min: 4, max: 60, step: 0.1 });
  fCam.addBinding(cfg.camera, "y", { min: -12, max: 12, step: 0.1 });
  fCam.addBinding(cfg.camera, "lookAtY", { min: -12, max: 12, step: 0.1 });
  fCam.addBinding(cfg.camera, "tiltX", { min: -45, max: 45, step: 0.5 });
  fCam.addBinding(cfg.camera, "tiltZ", { min: -45, max: 45, step: 0.5 });

  const fMotion = pane.addFolder({ title: "Motion", expanded: false });
  fMotion.addBinding(cfg.motion, "autoSpin", { min: 0, max: 4, step: 0.05 });
  fMotion.addBinding(cfg.motion, "scrollSpin", { min: 0, max: 6, step: 0.05, label: "turns / scroll" });
  fMotion.addBinding(cfg.motion, "preSpin", { min: 0, max: 0.5, step: 0.01, label: "spin while asm" });
  fMotion.addBinding(cfg.motion, "spinUntil", { min: 0.2, max: 1, step: 0.01, label: "spin finishes by" });
  fMotion.addBinding(cfg.motion, "recenter", { min: 0, max: 0.4, step: 0.005, label: "recentre on step 1" });
  fMotion.addBinding(cfg.motion, "drag", { label: "drag to turn" });
  fMotion.addBinding(cfg.motion, "dragX", { label: "...vertically too" });
  fMotion.addBinding(cfg.motion, "dragSense", { min: 0.0005, max: 0.01, step: 0.0002, label: "sensitivity" });
  fMotion.addBinding(cfg.motion, "momentum", { min: 0.6, max: 0.99, step: 0.005 });
  fMotion.addButton({ title: "Reset rotation" }).on("click", onResetTumble);

  const fPar = pane.addFolder({ title: "Mouse parallax", expanded: false });
  fPar.addBinding(cfg.parallax, "enabled");
  fPar.addBinding(cfg.parallax, "strengthX", { min: 0, max: 6, step: 0.05 });
  fPar.addBinding(cfg.parallax, "strengthY", { min: 0, max: 6, step: 0.05 });
  fPar.addBinding(cfg.parallax, "ease", { min: 0.01, max: 0.3, step: 0.005 });

  const fDbg = pane.addFolder({ title: "Debug", expanded: true });
  fDbg.addBinding(cfg.debug, "markers", { label: "scroll markers (M)" }).on("change", onDebug);
  fDbg.addBinding(cfg.debug, "grid", { label: "column outlines" }).on("change", onDebug);

  pane.addButton({ title: "Copy config JSON" }).on("click", () => {
    navigator.clipboard?.writeText(JSON.stringify(cfg, null, 2));
  });
  pane.addButton({ title: "Copy Atlas preset JSON" }).on("click", () => {
    navigator.clipboard?.writeText(JSON.stringify(atlas, null, 2));
  });

  return {
    pane,
    toggle: () => host.classList.toggle("is-hidden"),
    hide: () => host.classList.add("is-hidden"),
    /** pull every control back from the config */
    refresh: () => pane.refresh(),
    get isOpen() { return !host.classList.contains("is-hidden"); },
    /** V2 swaps the whole `steps` array, so the pane is REBUILT, not refreshed */
    dispose() {
      pane.dispose();
      host.remove();
    },
  };
}
