import { Pane } from "tweakpane";

// ─────────────────────────────────────────────────────────────────────────────
// The V3 panel — his ask, 2026-09-17: "aggiungi un nuovo control panel per
// poterli posizionare bene assieme a tutto il resto del codice che ti ho
// appena chiesto".
//
// There were deliberately only TWO panels (Titles on the left, Bowl on the
// right) and that rule is worth keeping, so this is the third only because it
// answers a different question from either of them: not "what does this title
// say" and not "what does the object look like", but "how is VERSION THREE
// laid out". Everything he asked for in one dictation is in one place —
// the golden-angle disc, the hero's two halves and how they slide apart, and
// the footer and team treatments that came with them.
//
// It docks as a SECOND COLUMN on the left, beside Titles rather than under it
// (stacking would have cost the longest pane on the page half its height).
// Left on purpose: the disc it tunes sits in the bottom-RIGHT box, which the
// Bowl panel already overlooks. `V` toggles it; `C` (clean) hides it with the
// others, because it carries the same `.was-panel` class they do.
//
// Every binding points at the same config object the page already reads —
// this is a second view onto it, never a second copy.
// ─────────────────────────────────────────────────────────────────────────────

const opts = (arr) => Object.fromEntries(arr.map((v) => [v, v]));
const ALIGN = opts(["left", "center", "right"]);

export function createV3Panel({
  cfg,
  onVariant,      // 1 … 5 — a LEGACY version, by hand: rebuilds the whole page for it
  onExperience,   // 1 | 2 — the two experiences (2026-09-21)
  onPaper,        // Experience 1's white page: on/off, its colours
  onNav,          // the nav bar's copy or mode changed: rebuild it
  onNavStyle,     // ...only its numbers: repaint
  onTrio,         // Experience 2's circles: restyle and re-lay them out
  onTrioBlock,    // ...the block's own length changed: re-lay the page out
  onTrioAtlas,    // ...the Atlas's seat in it changed: re-fit, re-seat the cards
  onNetwork,      // the disc's geometry changed: re-lay it out
  onCircles,      // V5's circles changed: restyle and re-lay them out
  onBowlWire,     // V5's bowl lattice: re-fit its density, re-ink it
  onHeroRebuild,  // the title TEXT changed: tear the reveal down and re-arm it
  onHeroStyle,    // position/size only: a cheap repaint, no replay
  onFooter,       // the footer's own vertical budget has to be re-measured
  onPlayer,       // which corner the playback bar lives in
  dock,
}) {
  const host = document.createElement("div");
  host.className = "was-panel was-panel-v3";
  host.setAttribute("data-lenis-prevent", "");
  host.addEventListener("wheel", (e) => e.stopPropagation(), { passive: true });
  (dock || document.body).appendChild(host);

  const pane = new Pane({ container: host, title: "V" });
  let syncVariant = null;
  // `pane.refresh()` re-reads a binding's target and — if the value moved —
  // EMITS `change` exactly as a hand on the control would. The keyboard
  // moves these two dropdowns from outside, so while they are being synced
  // the handlers must stay quiet, or `1` would land in `onVariant` and undo
  // the very experience it had just set.
  let syncing = false;

  // ── the two experiences (his ask, 2026-09-21), and the legacy versions ───
  {
    const f = pane.addFolder({ title: "Experience", expanded: true });
    const state = { e: cfg.experience, v: cfg.variant };
    f.addBinding(state, "e", {
      label: "1 / 2",
      options: {
        "1 — white page · the globe": 1,
        "2 — shader · trio + Atlas": 2,
        "— a legacy version (below)": 0,
      },
    }).on("change", (e) => {
      if (syncing) return;
      if (e.value === 1 || e.value === 2) onExperience(e.value);
      else onVariant(cfg.variant);
    });
    const P = cfg.exp.paper;
    f.addBinding(P, "on", { label: "1 · white page" }).on("change", onPaper);
    f.addBinding(P, "bg", { label: "1 · the page" }).on("change", onPaper);
    f.addBinding(P, "ink", { label: "1 · scroll bar ink" }).on("change", onPaper);
    f.addBinding(state, "v", {
      label: "legacy version",
      options: {
        "1 — the first cut": 1, "2 — the ring act": 2,
        "3 — the disc": 3, "4 — the globe": 4, "5 — the circles": 5,
      },
    }).on("change", (e) => { if (!syncing) onVariant(e.value); });
    // the 1/2 keys move these from outside, so the dropdowns have to follow
    syncVariant = () => {
      syncing = true;
      state.v = cfg.variant;
      state.e = cfg.experience;
      pane.refresh();
      syncing = false;
    };
  }

  // ── the nav bar — two bars, hover dropdowns (2026-09-21) ────────────────
  {
    const n = cfg.nav;
    const f = pane.addFolder({ title: "Nav — the two bars", expanded: false });
    f.addBinding(n, "mode", {
      label: "bar",
      options: { "auto — follows the experience": "auto", "1 — Log In": 1, "2 — Get the app": 2 },
    }).on("change", onNav);
    f.addBinding(n, "dot", { label: "the dot in the head" }).on("change", onNav);
    const l = f.addFolder({ title: "Layout", expanded: false });
    l.addBinding(n, "linkSize", { min: 12, max: 20, step: 0.5, label: "links (px)" }).on("change", onNavStyle);
    l.addBinding(n, "itemGap", { min: 16, max: 90, step: 1, label: "between links (px)" }).on("change", onNavStyle);
    l.addBinding(n, "linksX", { min: 0, max: 240, step: 2, label: "from the logo (px)" }).on("change", onNavStyle);
    l.addBinding(n, "menuWidth", { min: 150, max: 360, step: 2, label: "card (px)" }).on("change", onNavStyle);
    l.addBinding(n, "megaWidth", { min: 300, max: 1000, step: 10, label: "wide panel (px)" }).on("change", onNavStyle);
    l.addBinding(n, "megaCols", { min: 1, max: 5, step: 1, label: "...its columns" }).on("change", onNavStyle);
    l.addBinding(n, "megaCount", { min: 6, max: 45, step: 1, label: "...techniques listed" }).on("change", onNav);
    l.addBinding(n, "pad", { min: 8, max: 28, step: 1, label: "card padding (px)" }).on("change", onNavStyle);
    l.addBinding(n, "gap", { min: 0, max: 30, step: 1, label: "card ↔ panel (px)" }).on("change", onNavStyle);
    l.addBinding(n, "radius", { min: 0, max: 32, step: 1, label: "corners (px)" }).on("change", onNavStyle);
    l.addBinding(n, "rowSize", { min: 12, max: 20, step: 0.5, label: "rows (px)" }).on("change", onNavStyle);
    l.addBinding(n, "rowHeight", { min: 30, max: 64, step: 1, label: "row height (px)" }).on("change", onNavStyle);
    l.addBinding(n, "shadow", { min: 0, max: 0.5, step: 0.01, label: "shadow" }).on("change", onNavStyle);
    const m = f.addFolder({ title: "Motion — the card opens, then the rows", expanded: false });
    m.addBinding(n, "openDelay", { min: 0, max: 400, step: 10, label: "opens after (ms)" });
    m.addBinding(n, "closeDelay", { min: 0, max: 600, step: 10, label: "closes after (ms)" });
    m.addBinding(n, "subDelay", { min: 0, max: 400, step: 10, label: "wide panel after (ms)" });
    m.addBinding(n, "dur", { min: 0.15, max: 1.2, step: 0.01, label: "card opens over (s)" });
    m.addBinding(n, "megaDur", { min: 0.15, max: 1.2, step: 0.01, label: "wide panel over (s)" });
    m.addBinding(n, "rowsAt", { min: 0, max: 1, step: 0.02, label: "rows start at (of card)" });
    m.addBinding(n, "rowDur", { min: 0.1, max: 1, step: 0.01, label: "one row (s)" });
    m.addBinding(n, "rowStagger", { min: 0, max: 0.2, step: 0.005, label: "row after row (s)" });
    m.addBinding(n, "megaStagger", { min: 0, max: 0.08, step: 0.002, label: "item after item (s)" });
    m.addBinding(n, "rowRise", { min: 0, max: 24, step: 1, label: "rise (px)" });
    m.addBinding(n, "swapDur", { min: 0.05, max: 0.5, step: 0.01, label: "list swap (s)" });
    m.addBinding(n, "closeSpeed", { min: 0.5, max: 3, step: 0.1, label: "closing, × faster" });
    m.addBinding(n, "ease", {
      options: opts(["power1.out", "power2.out", "power3.out", "power4.out", "expo.out", "back.out(1.2)", "sine.out"]),
    });
  }

  // ── Experience 2: the three circles, and the Atlas over them (2026-09-21) ─
  {
    const t = cfg.v2.trio;
    const f = pane.addFolder({ title: "Experience 2 — the trio, then the Atlas", expanded: false });
    f.addBinding(t, "show").on("change", onTrio);
    f.addBinding(t, "fit", { options: { "the knot's own lobes": "knot", "by hand (below)": "manual" }, label: "circles from" }).on("change", onTrio);
    f.addBinding(t, "radiusScale", { min: 0.6, max: 1.4, step: 0.01, label: "× lobe radius" }).on("change", onTrio);
    f.addBinding(t, "fitSpan", { min: 0.04, max: 0.16, step: 0.005, label: "fit reads ± (of curve)" }).on("change", onTrioAtlas);
    f.addBinding(t, "blockVh", { min: 300, max: 1400, step: 20, label: "the block's scroll (vh)" }).on("change", onTrioBlock);
    const bw = f.addFolder({ title: "The bowl behind (this block)", expanded: false });
    bw.addBinding(t.bowl, "x", { min: -0.5, max: 0.5, step: 0.005, label: "x (of width)" });
    bw.addBinding(t.bowl, "y", { min: -0.5, max: 0.5, step: 0.005, label: "y (of height)" });
    bw.addBinding(t.bowl, "size", { min: 0.2, max: 1.6, step: 0.01, label: "size (vh)" });
    bw.addBinding(t.bowl, "tilt", { min: -40, max: 80, step: 1, label: "lean (°)" });
    bw.addBinding(t.bowl, "tiltZ", { min: -45, max: 45, step: 1, label: "roll (°)" });
    bw.addBinding(t.bowl, "spin", { min: 0, max: 3, step: 0.05, label: "idle turn (× normal)" });
    const h = f.addFolder({ title: "By hand (fit: manual)", expanded: false });
    h.addBinding(t.manual, "cx", { min: 0.2, max: 0.8, step: 0.005, label: "centre x" }).on("change", onTrio);
    h.addBinding(t.manual, "cy", { min: 0.2, max: 0.8, step: 0.005, label: "centre y" }).on("change", onTrio);
    h.addBinding(t.manual, "D", { min: 0.1, max: 0.45, step: 0.005, label: "spread (× short side)" }).on("change", onTrio);
    h.addBinding(t.manual, "rFrac", { min: 0.3, max: 1.2, step: 0.01, label: "radius (× spread)" }).on("change", onTrio);
    const s = f.addFolder({ title: "Where each beat ends (of the block)", expanded: false });
    s.addBinding(t.marks, "wire", { min: 0.02, max: 0.3, step: 0.01, label: "1 · lattice" });
    s.addBinding(t.marks, "c1", { min: 0.05, max: 0.5, step: 0.01, label: "2 · top-right" });
    s.addBinding(t.marks, "c2", { min: 0.1, max: 0.6, step: 0.01, label: "3 · bottom" });
    s.addBinding(t.marks, "c3", { min: 0.15, max: 0.7, step: 0.01, label: "4 · top-left" });
    s.addBinding(t.marks, "arcs", { min: 0.2, max: 0.8, step: 0.01, label: "5 · the arcs" });
    s.addBinding(t.marks, "knot", { min: 0.25, max: 0.9, step: 0.01, label: "6 · the Atlas from" });
    s.addBinding(t.bowlOut, "at", { min: 0.2, max: 0.9, step: 0.01, label: "lattice goes at" });
    s.addBinding(t.bowlOut, "dur", { min: 0.02, max: 0.3, step: 0.01, label: "...over" });
    s.addBinding(t, "textReveal", { min: 0.1, max: 1, step: 0.01, label: "captions, last share of" });
    s.addBinding(t, "captionsOut", { label: "captions go as the knot draws" });
    s.addBinding(t, "captionsOutDur", { min: 0.02, max: 0.3, step: 0.01, label: "...over" });
    const l = f.addFolder({ title: "The line and the arcs", expanded: false });
    l.addBinding(t, "strokeWidth", { min: 0.5, max: 3, step: 0.25, label: "circles (px)" }).on("change", onTrio);
    l.addBinding(t, "ink", { label: "ink" }).on("change", onTrio);
    l.addBinding(t, "arcFrac", { min: 0.8, max: 1.8, step: 0.01, label: "arc radius (× spacing)" });
    l.addBinding(t, "arcOver", { min: 0, max: 40, step: 1, label: "arcs run past by (°)" });
    l.addBinding(t, "arcWidth", { min: 0.25, max: 3, step: 0.25, label: "arcs (px)" }).on("change", onTrio);
    l.addBinding(t, "arcAlpha", { min: 0.05, max: 1, step: 0.01, label: "arcs opacity" }).on("change", onTrio);
    l.addBinding(t, "arcStagger", { min: 0, max: 1, step: 0.05, label: "one arc after the next" });
    const ty = f.addFolder({ title: "Type (× circle radius)", expanded: false });
    ty.addBinding(t, "nameSize", { min: 0.04, max: 0.2, step: 0.002, label: "name" });
    ty.addBinding(t, "descSize", { min: 0.03, max: 0.12, step: 0.002, label: "description" });
    ty.addBinding(t, "descLh", { min: 1, max: 1.8, step: 0.02, label: "...line height" });
    ty.addBinding(t, "nameY", { min: 0, max: 0.4, step: 0.01, label: "name above centre" });
    ty.addBinding(t, "descY", { min: 0, max: 0.5, step: 0.01, label: "description below" });
    ty.addBinding(t, "sideSize", { min: 0.04, max: 0.2, step: 0.002, label: "side labels" });
    ty.addBinding(t, "sideOut", { min: 0, max: 1, step: 0.01, label: "...outside by" });
    ty.addBinding(t, "sideDown", { min: -0.5, max: 1, step: 0.01, label: "...below the middle by" });
    const a = f.addFolder({ title: "The Atlas over the circles", expanded: false });
    a.addBinding(t.atlas, "paper", { label: "its paper" }).on("change", onTrio);
    a.addBinding(t.atlas, "paperAt", { min: 0.2, max: 0.9, step: 0.01, label: "paper from" });
    a.addBinding(t.atlas, "paperDur", { min: 0.02, max: 0.3, step: 0.01, label: "...over" });
    a.addBinding(t.atlas, "circlesUnder", { min: 0, max: 1, step: 0.01, label: "circles' ink under it" });
    a.addBinding(t.atlas, "offsetY", { min: -2, max: 2, step: 0.05, label: "camera pan" }).on("change", onTrioAtlas);
    a.addBinding(t.atlas, "padding", { min: 0.9, max: 2.2, step: 0.02, label: "camera fit" }).on("change", onTrioAtlas);
    a.addBinding(t.atlas, "cardsPadTop", { min: 0, max: 400, step: 4, label: "cards clear the top (px)" }).on("change", onTrioAtlas);
    a.addBinding(t.atlas, "pointer", { label: "leans to the pointer" }).on("change", onTrioAtlas);
    const c = a.addFolder({ title: "Which card on which circle", expanded: false });
    const ROLE = { "top-left": "tl", "top-right": "tr", "bottom": "b" };
    c.addBinding(t.atlas.cards, "library", { options: ROLE, label: "the library" }).on("change", onTrioAtlas);
    c.addBinding(t.atlas.cards, "members", { options: ROLE, label: "members" }).on("change", onTrioAtlas);
    c.addBinding(t.atlas.cards, "therapists", { options: ROLE, label: "therapists" }).on("change", onTrioAtlas);
  }

  // ── the three steps, as a golden-angle disc ───────────────────────────────
  {
    const D = cfg.v2.network.disc;
    const N = cfg.v2.network;
    const f = pane.addFolder({ title: "V3 — the disc (three steps)", expanded: false });
    f.addBinding(D, "radius", { min: 20, max: 60, step: 0.5, label: "outer edge (% box)" }).on("change", onNetwork);
    f.addBinding(D, "rotate", { min: -180, max: 180, step: 1, label: "spin (°)" }).on("change", onNetwork);
    f.addBinding(D, "centerX", { min: 20, max: 80, step: 0.5, label: "centre x (%)" }).on("change", onNetwork);
    f.addBinding(D, "centerY", { min: 20, max: 80, step: 0.5, label: "centre y (%)" }).on("change", onNetwork);
    f.addBinding(N, "peopleCount", { min: 3, max: 20, step: 1, label: "people" }).on("change", onNetwork);
    f.addBinding(N, "teacherCount", { min: 3, max: 20, step: 1, label: "therapists (= pills)" }).on("change", onNetwork);
    f.addBinding(D, "dotUser", { min: 10, max: 120, step: 1, label: "people (px)" }).on("change", onNetwork);
    f.addBinding(D, "dotTeacher", { min: 10, max: 160, step: 1, label: "therapists (px)" }).on("change", onNetwork);

    const r = f.addFolder({ title: "The rings", expanded: false });
    r.addBinding(D, "ringColor", { view: "color", label: "colour" }).on("change", onNetwork);
    r.addBinding(D, "ringAlpha", { min: 0, max: 1, step: 0.01, label: "opacity" }).on("change", onNetwork);
    r.addBinding(D, "ringWidth", { min: 0.25, max: 4, step: 0.25, label: "width (px)" }).on("change", onNetwork);
    r.addBinding(D, "ringIn", { min: 0.1, max: 1, step: 0.05, label: "draws on over" });

    const c = f.addFolder({ title: "The chain", expanded: false });
    c.addBinding(D, "chainBow", { min: 0, max: 0.5, step: 0.01, label: "bow" }).on("change", onNetwork);
    c.addBinding(N, "lineAlpha", { min: 0, max: 1, step: 0.01, label: "opacity" }).on("change", onNetwork);
    c.addBinding(N, "lineWidth", { min: 0.5, max: 4, step: 0.25, label: "width (px)" }).on("change", onNetwork);
    c.addBinding(N, "stagger", { min: 0, max: 0.95, step: 0.05, label: "one after the next" });
  }

  // ── V4: the contours, inflated into a sphere ──────────────────────────────
  {
    const R = cfg.v2.network.globe;
    const f = pane.addFolder({ title: "V4 — the globe (three steps)", expanded: false });
    f.addBinding(R, "rings", { min: 3, max: 24, step: 1, label: "contour rings" }).on("change", onNetwork);
    f.addBinding(R, "points", { min: 60, max: 700, step: 10, label: "vertices" }).on("change", onNetwork);
    f.addBinding(R, "flatR", { min: 15, max: 60, step: 0.5, label: "flat map (% box)" }).on("change", onNetwork);
    f.addBinding(R, "radius", { min: 12, max: 60, step: 0.5, label: "sphere (% box)" }).on("change", onNetwork);
    f.addBinding(R, "latMax", { min: 50, max: 88, step: 1, label: "how near the poles (°)" }).on("change", onNetwork);
    f.addBinding(R, "tilt", { min: -60, max: 60, step: 1, label: "lean (°)" }).on("change", onNetwork);
    f.addBinding(R, "perspective", { min: 0, max: 0.8, step: 0.01, label: "perspective" }).on("change", onNetwork);
    f.addBinding(R, "spin", { min: -180, max: 180, step: 1, label: "turn as it inflates (°)" });
    f.addBinding(R, "foldOver", { min: 0.3, max: 1, step: 0.02, label: "inflated by" });

    const v = f.addFolder({ title: "The vertices", expanded: false });
    v.addBinding(R, "dot", { min: 0.3, max: 8, step: 0.1, label: "members (px)" });
    v.addBinding(R, "dotMid", { min: 0.3, max: 12, step: 0.1, label: "therapists (px)" });
    v.addBinding(R, "dotBig", { min: 0.3, max: 16, step: 0.1, label: "trials (px)" });
    v.addBinding(R, "dotAlpha", { min: 0.05, max: 1, step: 0.01, label: "opacity" });
    v.addBinding(R, "midEvery", { min: 2, max: 20, step: 1, label: "1 therapist every" }).on("change", onNetwork);
    v.addBinding(R, "bigEvery", { min: 5, max: 80, step: 1, label: "1 trial every" }).on("change", onNetwork);
    v.addBinding(R, "bigColor", { view: "color", label: "trial colour" }).on("change", onNetwork);
    v.addBinding(R, "backAlpha", { min: 0, max: 1, step: 0.01, label: "far side" });
    v.addBinding(R, "stagger", { min: 0, max: 0.95, step: 0.05, label: "one after the next" });

    const rg = f.addFolder({ title: "The rings", expanded: false });
    rg.addBinding(R, "ringColor", { view: "color", label: "colour" }).on("change", onNetwork);
    rg.addBinding(R, "ringAlpha", { min: 0, max: 1, step: 0.01, label: "opacity" });
    rg.addBinding(R, "ringWidth", { min: 0.25, max: 4, step: 0.25, label: "width (px)" }).on("change", onNetwork);
    rg.addBinding(R, "ringIn", { min: 0.1, max: 1, step: 0.05, label: "draws on over" });

    const o = f.addFolder({ title: "Techniques in orbit", expanded: false });
    o.addBinding(R, "pills", { min: 0, max: 16, step: 1, label: "how many" }).on("change", onNetwork);
    o.addBinding(R, "pillOrbit", { min: 1, max: 2.2, step: 0.02, label: "orbit (× radius)" });
    o.addBinding(R, "pillBand", { min: 10, max: 80, step: 1, label: "orbit band (°)" }).on("change", onNetwork);
    o.addBinding(R, "pillBackScale", { min: 0.4, max: 1, step: 0.01, label: "shrink behind" });
    o.addBinding(R, "halo", { label: "light the vertices" });
    o.addBinding(R, "haloR", { min: 2, max: 16, step: 0.5, label: "halo (px)" });
    o.addBinding(R, "haloAlpha", { min: 0, max: 1, step: 0.01, label: "halo opacity" });
    o.addBinding(R, "pillIn", { min: 0, max: 0.9, step: 0.05, label: "arrive at" });
    o.addBinding(R, "arcAlpha", { min: 0, max: 1, step: 0.01, label: "arc opacity" });
    o.addBinding(R, "arcWidth", { min: 0.25, max: 4, step: 0.25, label: "arc width (px)" }).on("change", onNetwork);
    o.addBinding(R, "arcSamples", { min: 6, max: 48, step: 2, label: "arc smoothness" });
    o.addBinding(R, "arcsPer", { min: 1, max: 6, step: 1, label: "chains per technique" }).on("change", onNetwork);
    o.addBinding(R, "chainLen", { min: 1, max: 6, step: 1, label: "hops in a chain" }).on("change", onNetwork);
    o.addBinding(R, "arcSpan", { min: 0.15, max: 1.8, step: 0.02, label: "how far round" }).on("change", onNetwork);

    const d = f.addFolder({ title: "Turning it by hand", expanded: false });
    d.addBinding(R, "drag", { label: "draggable" });
    d.addBinding(R, "dragSpeed", { min: 0.05, max: 1.5, step: 0.01, label: "° per px (turn)" });
    d.addBinding(R, "dragTilt", { min: 0, max: 1, step: 0.01, label: "° per px (lean)" });
    d.addBinding(R, "inertia", { min: 0.5, max: 0.98, step: 0.01, label: "fling" });
    d.addBinding(R, "recenter", { min: 0, max: 0.2, step: 0.002, label: "settles back" });
  }

  // ── V5: the two circles around the bowl (his ask, 2026-09-21) ────────────
  //    Four stage windows along the canvas's own 0→1, every radius a share of
  //    the bowl's own on-screen radius, so the fourth circle always lands on it.
  {
    const K = cfg.v2.circles;
    const f = pane.addFolder({ title: "V5 (legacy) — the two circles", expanded: false });
    f.addBinding(K, "show").on("change", onCircles);
    f.addBinding(K, "radiusFrac", { min: 0.2, max: 0.7, step: 0.01, label: "circle (× bowl r)" }).on("change", onCircles);
    f.addBinding(K, "spreadFrac", { min: 0, max: 1.5, step: 0.01, label: "pull apart (× r)" }).on("change", onCircles);
    const s = f.addFolder({ title: "Where each beat ends (of the block)", expanded: false });
    s.addBinding(K.marks, "wire", { min: 0.02, max: 0.4, step: 0.01, label: "1 · wireframe" });
    s.addBinding(K.marks, "ab", { min: 0.1, max: 0.6, step: 0.01, label: "2 · two circles" });
    s.addBinding(K.marks, "spread", { min: 0.2, max: 0.8, step: 0.01, label: "3 · pull apart" });
    s.addBinding(K.marks, "third", { min: 0.4, max: 0.95, step: 0.01, label: "4 · the third" });
    s.addBinding(K, "textReveal", { min: 0.1, max: 1, step: 0.01, label: "captions, last share of" });
    const l = f.addFolder({ title: "The line and the bowl behind", expanded: false });
    l.addBinding(K, "strokeWidth", { min: 0.5, max: 3, step: 0.25, label: "stroke (px)" }).on("change", onCircles);
    l.addBinding(K, "ink", { label: "ink" }).on("change", onCircles);
    l.addBinding(K, "dashInner", { label: "dash — lens" }).on("change", onCircles);
    l.addBinding(K, "dashOuter", { label: "dash — bowl circle" }).on("change", onCircles);
    // ── the bowl behind (his ask, 2026-09-21 — "dammi i controlli sulla
    //    bowl"): its pose for this block, and the lattice it turns into ──
    const b = f.addFolder({ title: "The bowl behind", expanded: false });
    b.addBinding(K, "bowlX", { min: -0.5, max: 0.5, step: 0.005, label: "x (of width)" });
    b.addBinding(K, "bowlY", { min: -0.5, max: 0.5, step: 0.005, label: "y (of height)" });
    b.addBinding(K, "bowlSize", { min: 0.2, max: 1.6, step: 0.01, label: "size (vh)" });
    b.addBinding(K, "bowlTilt", { min: -40, max: 80, step: 1, label: "lean (°)" });
    b.addBinding(K, "bowlTiltZ", { min: -45, max: 45, step: 1, label: "roll (°)" });
    b.addBinding(K, "bowlSpin", { min: 0, max: 3, step: 0.05, label: "idle turn (× normal)" });
    const w = b.addFolder({ title: "The lattice", expanded: false });
    w.addBinding(K, "wireframeOpacity", { min: 0.02, max: 0.6, step: 0.01, label: "alpha" });
    w.addBinding(K, "wireRings", { min: 3, max: 40, step: 1, label: "rings" }).on("change", onBowlWire);
    w.addBinding(K, "wireMeridians", { min: 3, max: 72, step: 1, label: "meridians" }).on("change", onBowlWire);
    w.addBinding(K, "wireInk", { label: "ink" }).on("change", onBowlWire);
    const t = f.addFolder({ title: "Type (× bowl radius)", expanded: false });
    t.addBinding(K, "nameSize", { min: 0.03, max: 0.12, step: 0.002, label: "name" });
    t.addBinding(K, "descSize", { min: 0.02, max: 0.09, step: 0.002, label: "description" });
    t.addBinding(K, "descGap", { min: 0.04, max: 0.25, step: 0.005, label: "name ↔ description" });
    t.addBinding(K, "outerLabelSize", { min: 0.03, max: 0.1, step: 0.002, label: "outer labels" });
    t.addBinding(K, "titleSize", { min: 0.04, max: 0.14, step: 0.002, label: "title" });
  }

  // ── the player, and where it lives ────────────────────────────────────────
  {
    const P = cfg.player;
    const f = pane.addFolder({ title: "Player — corner", expanded: false });
    f.addBinding(P, "side", { options: { "bottom left": "left", "bottom right": "right" }, label: "corner" }).on("change", onPlayer);
    f.addBinding(P, "left", { min: 0, max: 20, step: 0.1, label: "inset (vw)" }).on("change", onPlayer);
    f.addBinding(P, "bottom", { min: 0, max: 20, step: 0.5, label: "bottom (vh)" }).on("change", onPlayer);
  }

  // ── the hero's two halves ─────────────────────────────────────────────────
  {
    const h = cfg.hero;
    const f = pane.addFolder({ title: "Hero — the two halves", expanded: false });
    f.addBinding(h, "title", { label: "left (| = new line)" }).on("change", onHeroRebuild);
    f.addBinding(h, "titleB", { label: "right (| = new line)" }).on("change", onHeroRebuild);
    f.addBinding(h, "titleSize", { min: 2, max: 9, step: 0.1, label: "size (vw)" }).on("change", onHeroStyle);
    f.addBinding(h, "titleLh", { min: 0.8, max: 1.6, step: 0.01, label: "line height" }).on("change", onHeroStyle);

    const l = f.addFolder({ title: "Left half", expanded: false });
    l.addBinding(h, "leftGap", { min: 0, max: 40, step: 0.5, label: "x — from centre (vw)" }).on("change", onHeroStyle);
    l.addBinding(h, "leftY", { min: 10, max: 90, step: 0.5, label: "y (%)" }).on("change", onHeroStyle);
    l.addBinding(h, "leftAlign", { options: ALIGN, label: "align" }).on("change", onHeroStyle);
    l.addBinding(h, "drift", { min: 0, max: 30, step: 0.25, label: "slides LEFT by (vw)" });

    const r = f.addFolder({ title: "Right half", expanded: false });
    r.addBinding(h, "rightGap", { min: 0, max: 40, step: 0.5, label: "x — from centre (vw)" }).on("change", onHeroStyle);
    r.addBinding(h, "rightY", { min: 10, max: 90, step: 0.5, label: "y (%)" }).on("change", onHeroStyle);
    r.addBinding(h, "rightAlign", { options: ALIGN, label: "align" }).on("change", onHeroStyle);
    r.addBinding(h, "driftRight", { min: 0, max: 30, step: 0.25, label: "slides RIGHT by (vw)" });
    r.addBinding(h, "driftPhase", { min: 0, max: 0.8, step: 0.01, label: "...starting later by" });
  }

  // ── the footer and the team ───────────────────────────────────────────────
  {
    const f = pane.addFolder({ title: "Footer & team", expanded: false });
    const F = cfg.footer;
    f.addBinding(F, "linkAlpha", { min: 0.1, max: 1, step: 0.01, label: "links at rest" }).on("change", onFooter);
    f.addBinding(F, "colGap", { min: 0, max: 12, step: 0.1, label: "gap between categories (vw)" }).on("change", onFooter);
    // ...and the footer's own type and inner rhythm (his ask, 2026-09-21)
    f.addBinding(F, "subGap", { min: 0, max: 8, step: 0.1, label: "gap inside a category (vw)" }).on("change", onFooter);
    f.addBinding(F, "linkSize", { min: 9, max: 18, step: 0.5, label: "links (px)" }).on("change", onFooter);
    f.addBinding(F, "legalSize", { min: 8, max: 16, step: 0.5, label: "legal line (px)" }).on("change", onFooter);
    f.addBinding(F, "policySize", { min: 9, max: 16, step: 0.5, label: "policy links (px)" }).on("change", onFooter);
    f.addBinding(F, "padBottom", { min: 0, max: 120, step: 2, label: "air below (px)" }).on("change", onFooter);
    f.addBinding(F, "padTop", { min: 96, max: 320, step: 2, label: "links start at (px)" }).on("change", onFooter);
    f.addBinding(F, "gap", { min: 0, max: 200, step: 2, label: "min gap above the logo (px)" }).on("change", onFooter);
    f.addBinding(F, "wordBottom", { min: 0, max: 120, step: 2, label: "air under the logo (px)" }).on("change", onFooter);
    f.addBinding(cfg.team, "grayscale", { label: "team in black & white" }).on("change", onFooter);
    f.addBinding(cfg.team, "captions", { label: "V4 — names under the cards" }).on("change", onFooter);
    f.addBinding(cfg.team, "captionSize", { min: 9, max: 24, step: 0.5, label: "name (px)" }).on("change", onFooter);
    f.addBinding(cfg.team, "captionRoleSize", { min: 8, max: 22, step: 0.5, label: "role (px)" }).on("change", onFooter);
  }

  return {
    pane,
    toggle: () => host.classList.toggle("is-hidden"),
    hide: () => host.classList.add("is-hidden"),
    show: () => host.classList.remove("is-hidden"),
    get isOpen() { return !host.classList.contains("is-hidden"); },
    refresh: () => { syncVariant?.(); },
    dispose() {
      pane.dispose();
      host.remove();
    },
  };
}
