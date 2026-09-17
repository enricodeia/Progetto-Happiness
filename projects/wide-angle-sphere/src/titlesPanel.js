import { Pane } from "tweakpane";

// ─────────────────────────────────────────────────────────────────────────────
// The Titles panel — his own ask, 2026-09-16: ONE place to reach every title
// on the page (the bowl's own hero and act two, the ring act's step copy, the
// evidence panel, the Atlas header), instead of hunting through the section
// that happens to own each one.
//
// Every field here points at the SAME config object the rest of the page
// already reads — this is a second view onto it, not a second copy of it, so
// nothing can ever drift out of sync with what is actually on screen.
//
// Split (words | lines | chars) and align (left | center | right) are the two
// things that were missing before today: `reveal.js` now builds a `chars`
// unit for every letter of every word (see its own comment), and every block
// below reads its own `--align` custom property, set from here.
//
// Two different callbacks matter, and they are NOT interchangeable:
//   rebuild   the TEXT or its SPLIT changed — the reveal has to be torn down
//             and re-armed, because the unit count itself changed
//   style     align/size/position — a cheap re-paint that must NOT replay the
//             block's own entrance, or every drag of a slider would flash it
//             through its reveal
//
// A third one, `onReplayBeats`, fixes a bug he ran into (2026-09-16, "non
// capisco perché non funziona il control panel per i titoli"): the "fires
// at" / "plays in" / "unit → unit" / "leaves at" fields on act two's beats
// (`hero.js`'s scroll-triggered `drive()`) used to have NO change handler at
// all — they mutated the config, correctly, but nothing told the beat that
// had ALREADY fired to fire again, so dragging any of those four sliders
// after scrolling past its own trigger point did visibly nothing until a
// full reload. They now rearm that beat immediately: if the scroll is
// already past its mark, it replays right there with the new numbers.
// ─────────────────────────────────────────────────────────────────────────────

const opts = (arr) => Object.fromEntries(arr.map((v) => [v, v]));
const ALIGN = opts(["left", "center", "right"]);
const SPLIT = { "lines (in place)": "lines", "words (in place)": "words", "chars (in place)": "chars", fade: "fade" };
const SPLIT_NO_FADE = { "lines (in place)": "lines", "words (in place)": "words", "chars (in place)": "chars" };

export function createTitlesPanel({
  cfg,
  onHeroRebuild, onHeroStyle,     // hero.title/titleB/para
  onV2Rebuild, onV2Style,         // until.left/right, v2.top/bottom/until, v2.act copy
  onEvidenceBuild, onEvidenceStyle,
  onAtlasTitle,
  onReplayBeats,                  // "fires at" / "plays in" / stagger / "leaves at"
  dock,
}) {
  const host = document.createElement("div");
  host.className = "was-panel was-panel-titles";
  host.setAttribute("data-lenis-prevent", "");
  host.addEventListener("wheel", (e) => e.stopPropagation(), { passive: true });
  (dock || document.body).appendChild(host);

  const pane = new Pane({ container: host, title: "Titles" });

  /** one title's full set of controls, in one small folder */
  function block(title, obj, { split = SPLIT, onRebuild, onStyle } = {}) {
    const f = pane.addFolder({ title, expanded: false });
    if ("text" in obj) f.addBinding(obj, "text", { label: "text ( | = line )" }).on("change", onRebuild);
    if ("mode" in obj) f.addBinding(obj, "mode", { options: split, label: "split" }).on("change", onRebuild);
    if ("align" in obj) f.addBinding(obj, "align", { options: ALIGN }).on("change", onStyle);
    if ("size" in obj) f.addBinding(obj, "size", { min: 0.5, max: 8, step: 0.02, label: "size (vw)" }).on("change", onStyle);
    if ("width" in obj) f.addBinding(obj, "width", { min: 8, max: 80, step: 0.5, label: "measure (vw)" }).on("change", onStyle);
    if ("x" in obj) f.addBinding(obj, "x", { min: 0, max: 100, step: 0.5, label: "x (vw or %)" }).on("change", onStyle);
    if ("y" in obj) f.addBinding(obj, "y", { min: 0, max: 100, step: 0.5, label: "y (%)" }).on("change", onStyle);
    if ("at" in obj) f.addBinding(obj, "at", { min: 0, max: 1, step: 0.01, label: "fires at" }).on("change", onReplayBeats);
    if ("dur" in obj) f.addBinding(obj, "dur", { min: 0.2, max: 5, step: 0.05, label: "plays in (s)" }).on("change", onReplayBeats);
    if ("stagger" in obj) f.addBinding(obj, "stagger", { min: 0, max: 1.2, step: 0.02, label: "unit → unit (s)" }).on("change", onReplayBeats);
    if ("out" in obj) f.addBinding(obj, "out", { min: 0, max: 1, step: 0.01, label: "leaves at (0 = stays)" }).on("change", onReplayBeats);
    return f;
  }

  // ── the hero itself (bowl clock) ─────────────────────────────────────────
  // Hand-built, not through `block()`: the paragraph's fields are named
  // `para`/`paraMode`/… on `cfg.hero`, not the generic `text`/`mode`/… every
  // V2 block below shares.
  {
    const f = pane.addFolder({ title: "Hero — paragraph", expanded: false });
    f.addBinding(cfg.hero, "para", { label: "text ( | = line )" }).on("change", onHeroRebuild);
    f.addBinding(cfg.hero, "paraMode", { options: SPLIT, label: "split" }).on("change", onHeroRebuild);
    f.addBinding(cfg.hero, "paraAlign", { options: ALIGN, label: "align" }).on("change", onHeroStyle);
    f.addBinding(cfg.hero, "paraSize", { min: 0.3, max: 3, step: 0.02, label: "size (vw)" }).on("change", onHeroStyle);
    f.addBinding(cfg.hero, "paraLeft", { min: 0, max: 20, step: 0.1, label: "x (vw)" }).on("change", onHeroStyle);
    f.addBinding(cfg.hero, "paraBottom", { min: 0, max: 30, step: 0.5, label: "y — from bottom (vh)" }).on("change", onHeroStyle);
  }

  // ── the nav's search field — light glass (his ask, 2026-09-17) ───────────
  {
    const f = pane.addFolder({ title: "Nav — search glass", expanded: false });
    const sg = cfg.hero.nav.searchGlass;
    f.addBinding(sg, "alpha", { min: 0, max: 1, step: 0.01, label: "white" }).on("change", onHeroStyle);
    f.addBinding(sg, "blur", { min: 0, max: 40, step: 1, label: "blur (px)" }).on("change", onHeroStyle);
  }

  // ── "Until now" act — its two beats ──────────────────────────────────────
  const U = cfg.until;
  {
    const f = pane.addFolder({ title: '"Until now" act — 1 · left statement', expanded: false });
    f.addBinding(U, "left", { label: "text ( | = line )" }).on("change", onHeroRebuild);
    f.addBinding(U, "leftMode", { options: SPLIT_NO_FADE, label: "split" }).on("change", onHeroRebuild);
    f.addBinding(U, "leftAlign", { options: ALIGN, label: "align" }).on("change", onHeroStyle);
    f.addBinding(U, "leftSize", { min: 0.8, max: 7, step: 0.05, label: "size (vw)" }).on("change", onHeroStyle);
    f.addBinding(U, "leftWidth", { min: 10, max: 60, step: 1, label: "measure (vw)" }).on("change", onHeroStyle);
    f.addBinding(U, "leftX", { min: 0, max: 30, step: 0.5, label: "x (vw)" }).on("change", onHeroStyle);
    f.addBinding(U, "leftY", { min: 0, max: 90, step: 1, label: "y (%)" }).on("change", onHeroStyle);
    f.addBinding(U, "leftAt", { min: 0, max: 0.9, step: 0.01, label: "fires at" }).on("change", onReplayBeats);
    f.addBinding(U, "leftDur", { min: 0.2, max: 5, step: 0.05, label: "plays in (s)" }).on("change", onReplayBeats);
    f.addBinding(U, "leftStagger", { min: 0, max: 1.2, step: 0.02, label: "line → line (s)" }).on("change", onReplayBeats);
  }
  {
    const f = pane.addFolder({ title: '"Until now" act — 2 · "Until now"', expanded: false });
    f.addBinding(U, "right", { label: "text ( | = line )" }).on("change", onHeroRebuild);
    f.addBinding(U, "rightMode", { options: SPLIT_NO_FADE, label: "split" }).on("change", onHeroRebuild);
    f.addBinding(U, "rightAlign", { options: ALIGN, label: "align" }).on("change", onHeroStyle);
    f.addBinding(U, "rightSize", { min: 0.8, max: 7, step: 0.05, label: "size (vw)" }).on("change", onHeroStyle);
    f.addBinding(U, "rightWidth", { min: 10, max: 60, step: 1, label: "measure (vw)" }).on("change", onHeroStyle);
    f.addBinding(U, "rightX", { min: 0, max: 30, step: 0.5, label: "x (vw)" }).on("change", onHeroStyle);
    f.addBinding(U, "rightY", { min: 0, max: 90, step: 1, label: "y (%)" }).on("change", onHeroStyle);
    f.addBinding(U, "rightAt", { min: 0, max: 0.9, step: 0.01, label: "fires at" }).on("change", onReplayBeats);
    f.addBinding(U, "rightDur", { min: 0.2, max: 5, step: 0.05, label: "plays in (s)" }).on("change", onReplayBeats);
    f.addBinding(U, "rightStagger", { min: 0, max: 1.2, step: 0.02, label: "word → word (s)" }).on("change", onReplayBeats);
  }

  // ── V2 — act two's two statements (+ "Until now", off by his ask) ───────
  block("V2 act two — 1 · top left", cfg.v2.top, { onRebuild: onV2Rebuild, onStyle: onV2Style });
  block("V2 act two — 2 · bottom right", cfg.v2.bottom, { onRebuild: onV2Rebuild, onStyle: onV2Style });
  block('V2 act two — 3 · "Until now" (off by his ask)', cfg.v2.until, { onRebuild: onV2Rebuild, onStyle: onV2Style });

  // ── V2 — the ring act's own step copy, one keyframe per step ─────────────
  {
    const A = cfg.v2.act;
    const f = pane.addFolder({ title: "V2 ring act — step copy (3 keyframes)", expanded: false });
    f.addBinding(A, "copyMode", { options: SPLIT_NO_FADE, label: "split" }).on("change", onV2Style);
    f.addBinding(A, "copyAlign", { options: ALIGN, label: "align" }).on("change", onV2Style);
    const RANGE = {
      copySize: { min: 0.8, max: 6, step: 0.05, title: "size (vw)" },
      copyWidth: { min: 10, max: 60, step: 0.5, title: "measure (vw)" },
      copyX: { min: 0, max: 40, step: 0.5, title: "x (vw)" },
      copyY: { min: 0, max: 80, step: 0.5, title: "y (%)" },
    };
    for (const [name, r] of Object.entries(RANGE)) {
      const kf = f.addFolder({ title: r.title, expanded: false });
      for (let i = 0; i < 3; i++) {
        kf.addBinding(A[name], String(i), {
          min: r.min, max: r.max, step: r.step, label: `step ${i + 1}`,
        }).on("change", onV2Style);
      }
    }
  }

  // ── the evidence panel ────────────────────────────────────────────────────
  {
    const E = cfg.evidence;
    const f = pane.addFolder({ title: "Evidence — statement (painted once, static)", expanded: false });
    f.addBinding(E, "title", { label: "text ( | = line )" }).on("change", onEvidenceBuild);
    f.addBinding(E, "titleMode", { options: SPLIT_NO_FADE, label: "split" }).on("change", onEvidenceBuild);
    f.addBinding(E, "titleAlign", { options: ALIGN, label: "align" }).on("change", onEvidenceStyle);
    f.addBinding(E, "titleSize", { min: 0.8, max: 4, step: 0.02, label: "size (vw)" }).on("change", onEvidenceStyle);
    f.addBinding(E, "titleWidth", { min: 16, max: 90, step: 1, label: "measure (vw)" }).on("change", onEvidenceStyle);
    f.addBinding(E, "titleX", { min: 0, max: 60, step: 0.5, label: "x (vw)" }).on("change", onEvidenceStyle);
    f.addBinding(E, "titleTop", { min: 0, max: 60, step: 0.5, label: "y (%)" }).on("change", onEvidenceStyle);
  }
  {
    const E = cfg.evidence;
    const f = pane.addFolder({ title: "Evidence — summary (bottom-left, reveals)", expanded: false });
    f.addBinding(E, "summary", { label: "text ( | = line )" }).on("change", onEvidenceBuild);
    f.addBinding(E, "summaryMode", { options: SPLIT_NO_FADE, label: "split" }).on("change", onEvidenceBuild);
    f.addBinding(E, "summaryAlign", { options: ALIGN, label: "align" }).on("change", onEvidenceStyle);
    f.addBinding(E, "summarySize", { min: 0.4, max: 2.5, step: 0.02, label: "size (vw)" }).on("change", onEvidenceStyle);
    f.addBinding(E, "summaryWidth", { min: 10, max: 60, step: 1, label: "measure (vw)" }).on("change", onEvidenceStyle);
    f.addBinding(E, "summaryX", { min: 0, max: 60, step: 0.5, label: "x (vw)" }).on("change", onEvidenceStyle);
    f.addBinding(E, "summaryBottom", { min: 0, max: 60, step: 0.5, label: "y — from bottom (%)" }).on("change", onEvidenceStyle);
  }

  // ── the Atlas header ──────────────────────────────────────────────────────
  {
    const T = cfg.atlas.title;
    const f = pane.addFolder({ title: "Atlas — header (heading + sub)", expanded: false });
    f.addBinding(T, "heading", { label: "heading" }).on("change", onAtlasTitle);
    f.addBinding(T, "sub", { label: "sub" }).on("change", onAtlasTitle);
    f.addBinding(T, "align", { options: ALIGN }).on("change", onAtlasTitle);
    f.addBinding(T, "size", { min: 1, max: 4, step: 0.05, label: "size (vw)" }).on("change", onAtlasTitle);
    f.addBinding(T, "subSize", { min: 0.5, max: 2, step: 0.05, label: "sub size (vw)" }).on("change", onAtlasTitle);
    f.addBinding(T, "maxWidth", { min: 320, max: 960, step: 10, label: "measure (px)" }).on("change", onAtlasTitle);
    f.addBinding(T, "top", { min: 0, max: 300, step: 2, label: "top (px)" }).on("change", onAtlasTitle);
  }

  return {
    pane,
    toggle: () => host.classList.toggle("is-hidden"),
    hide: () => host.classList.add("is-hidden"),
    get isOpen() { return !host.classList.contains("is-hidden"); },
    refresh: () => pane.refresh(),
    dispose() {
      pane.dispose();
      host.remove();
    },
  };
}
