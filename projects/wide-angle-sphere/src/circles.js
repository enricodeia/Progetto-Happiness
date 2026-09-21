// ─────────────────────────────────────────────────────────────────────────────
// V5 (his ask, 2026-09-21, reworked the same day) — two circles around the bowl.
//
// A diagram of plain SVG circles and paths that DRAW THEMSELVES ON — a path
// reveal, not a fade ("devono venire con una SVG path reveal") — sized off
// the BOWL'S OWN on-screen radius so the last one lands exactly on its
// silhouette. His order, in his words:
//
//   (before this, in the handover into pinB — main.js) the ring act's shader
//   CLOSES back into the bowl, the intro run backwards, and the page goes
//   white under it. Nothing here starts until that is done.
//   1  the bowl crossfades to a 15%-opacity WIREFRAME lattice, alone, on white
//   2  the two circles draw on, both from the point where they touch —
//      "prima le due sfere" — tangent at the bowl's centre
//   3  they pull apart; two big circles draw around them (union solid, the
//      lens between dashed) — one continuous move with 2
//   4  the third draws on in the gap ("il terzo che arriva in seguito, però
//      deve essere un continuo")
//   5  the fourth — the bowl's own diameter — draws on around all three
//
// Draw-on is `pathLength="1"` + `stroke-dashoffset = 1 − t` on solid shapes;
// the DASHED ones can't carry a second dasharray, so each is revealed through
// a mask holding a fat solid copy of itself that draws on the same way.
// Everything is rebuilt each frame from ONE number, the canvas block's own
// 0→1 progress, read against five abutting windows. Pure scrub, no tween.
// ─────────────────────────────────────────────────────────────────────────────

const SVG_NS = "http://www.w3.org/2000/svg";
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smoothIO = (x) => { const t = clamp01(x); return t * t * (3 - 2 * t); };
const f2 = (v) => v.toFixed(2);

const el = (tag, attrs = {}) => {
  const e = document.createElementNS(SVG_NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  return e;
};

/** Two equal circles of radius r, centres (ax,cy) and (bx,cy), overlapping.
    Their two crossing points sit on the vertical through the midpoint. */
function crossing(ax, bx, cy, r) {
  const cx = (ax + bx) / 2;
  const half = Math.min(Math.abs(bx - ax) / 2, r * 0.999);
  const h = Math.sqrt(Math.max(0, r * r - half * half));
  return { top: `${f2(cx)} ${f2(cy - h)}`, bot: `${f2(cx)} ${f2(cy + h)}`, R: `${f2(r)} ${f2(r)}` };
}
/** the OUTLINE of their union — the far arc of each (large-arc flags) */
function unionPath(ax, bx, cy, r) {
  const k = crossing(ax, bx, cy, r);
  return `M ${k.top} A ${k.R} 0 1 0 ${k.bot} A ${k.R} 0 1 0 ${k.top} Z`;
}
/** the LENS of their overlap — the near arc of each (small-arc flags) */
function lensPath(ax, bx, cy, r) {
  const k = crossing(ax, bx, cy, r);
  return `M ${k.top} A ${k.R} 0 0 1 ${k.bot} A ${k.R} 0 0 1 ${k.top} Z`;
}

/** a 0→1 window over [from, to] of a 0→1 value */
const win = (p, from, to) => clamp01((p - from) / Math.max(1e-4, to - from));

export function createCircles({ mount, cfg, bowl }) {
  const C = () => cfg.v2.circles;

  const svg = el("svg", { class: "was-circles-svg" });
  mount.appendChild(svg);
  const defs = el("defs");
  svg.appendChild(defs);

  // ── the shapes — one node each, redrawn per frame ─────────────────────
  const draw1 = { pathLength: 1, "stroke-dasharray": 1, "stroke-dashoffset": 1, fill: "none" };
  const cA = el("circle", { class: "was-circ was-circ-a", ...draw1 });
  const cB = el("circle", { class: "was-circ was-circ-b", ...draw1 });
  const cC = el("circle", { class: "was-circ was-circ-c", ...draw1 });
  const outer = el("path", { class: "was-circ was-circ-outer", ...draw1 });
  const lens = el("path", { class: "was-circ was-circ-lens", fill: "none", mask: "url(#was-circ-mask-lens)" });
  const big = el("circle", { class: "was-circ was-circ-big", fill: "none", mask: "url(#was-circ-mask-big)" });
  // the dashed ones reveal through a fat solid copy of themselves
  function maskFor(id, tag) {
    const m = el("mask", { id, maskUnits: "userSpaceOnUse", x: 0, y: 0, width: 1, height: 1 });
    const copy = el(tag, { ...draw1, stroke: "#fff", "stroke-width": 10 });
    m.appendChild(copy);
    defs.appendChild(m);
    return { m, copy };
  }
  const lensMask = maskFor("was-circ-mask-lens", "path");
  const bigMask = maskFor("was-circ-mask-big", "circle");
  for (const n of [big, outer, lens, cA, cB, cC]) svg.appendChild(n);

  // ── the words — `<text>` per block, one `<tspan>` per line ────────────
  function textBlock(cls) {
    const t = el("text", { class: `was-circ-text ${cls}`, "text-anchor": "middle", "font-family": "var(--ui)" });
    svg.appendChild(t);
    return t;
  }
  const labels = {
    aName: textBlock("was-circ-name"), aDesc: textBlock("was-circ-desc"),
    bName: textBlock("was-circ-name"), bDesc: textBlock("was-circ-desc"),
    cName: textBlock("was-circ-name"), cDesc: textBlock("was-circ-desc"),
    outerLeft: textBlock("was-circ-outer-label"),
    outerRight: textBlock("was-circ-outer-label"),
    title: textBlock("was-circ-title"),
  };
  function setLines(t, lines) {
    t.textContent = "";
    for (const line of lines) {
      const span = el("tspan", { x: 0, dy: 0 });
      span.textContent = line;
      t.appendChild(span);
    }
  }
  function place(t, x, y, size, lh, alpha) {
    const n = t.children.length;
    t.setAttribute("x", f2(x));
    t.setAttribute("y", f2(y));
    t.setAttribute("opacity", alpha.toFixed(3));
    let i = 0;
    for (const s of t.children) {
      s.setAttribute("x", f2(x));
      s.setAttribute("font-size", f2(size));
      s.setAttribute("dy", f2(i === 0 ? -((n - 1) / 2) * lh + size * 0.35 : lh));
      i++;
    }
  }

  let W = 0, H = 0;
  function resize() {
    const r = mount.getBoundingClientRect();
    W = Math.max(1, Math.round(r.width));
    H = Math.max(1, Math.round(r.height));
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.setAttribute("width", W);
    svg.setAttribute("height", H);
    for (const { m } of [lensMask, bigMask]) { m.setAttribute("width", W); m.setAttribute("height", H); }
    build();
  }

  /** everything that only changes when a config value does */
  function build() {
    const c = C();
    const L = c.labels;
    for (const n of [big, outer, lens, cA, cB, cC]) {
      n.setAttribute("stroke", c.ink);
      n.setAttribute("stroke-width", c.strokeWidth);
    }
    lens.setAttribute("stroke-dasharray", c.dashInner);
    big.setAttribute("stroke-dasharray", c.dashOuter);
    for (const k in labels) labels[k].setAttribute("fill", c.ink);
    setLines(labels.aName, [L.a.name]);
    setLines(labels.bName, [L.b.name]);
    setLines(labels.cName, [L.c.name]);
    setLines(labels.aDesc, L.a.desc.split("\n"));
    setLines(labels.bDesc, L.b.desc.split("\n"));
    setLines(labels.cDesc, L.c.desc.split("\n"));
    setLines(labels.outerLeft, [L.outerLeft]);
    setLines(labels.outerRight, [L.outerRight]);
    setLines(labels.title, L.title.split("\n"));
  }
  const style = build;

  /** how much of a shape is drawn — 0 nothing, 1 all of it */
  const drawn = (e, t) => e.setAttribute("stroke-dashoffset", (1 - clamp01(t)).toFixed(4));

  const state = {
    p: 0, stage: 0, cx: 0, cy: 0, R: 0, r: 0, sep: 0,
    a: { x: 0 }, b: { x: 0 }, big: { r: 0 }, outerR: 0, unionHalf: 0, wire: 0,
    draw: { a: 0, b: 0, c: 0, union: 0, lens: 0, big: 0 },
    text: { a: 0, c: 0, outer: 0, title: 0 },
  };

  function update(tl) {
    const c = C();
    if (!c.show || mount.hidden) return;
    const box = mount.getBoundingClientRect();
    if (box.bottom <= 0 || box.top >= window.innerHeight) return;

    // the canvas block's own 0→1, cut into five abutting windows
    const p = clamp01((tl.p - tl.canvasS0) / Math.max(1e-4, tl.canvasS1 - tl.canvasS0));
    const M = c.marks;
    const tWire = win(p, 0, M.wire);
    const tAB = win(p, M.wire, M.ab);
    const tSpread = win(p, M.ab, M.spread);
    const tThird = win(p, M.spread, M.third);
    const tFourth = win(p, M.third, 1);
    const stage = p < M.wire ? 1 : p < M.ab ? 2 : p < M.spread ? 3 : p < M.third ? 4 : 5;

    // the bowl, in this box's own pixels
    const bp = bowl.projected();
    const cx = bp.x - box.left;
    const cy = bp.y - box.top;
    const R = Math.max(8, bowl.projectedRadius());
    const r = R * c.radiusFrac;

    // ── 1 · the bowl behind turns to wireframe, alone ──
    const wire = smoothIO(tWire);
    bowl.setWireframe(wire, c.wireframeOpacity);

    // ── 2 · the two circles draw on, from the point where they touch ──
    const sep = smoothIO(tSpread) * r * c.spreadFrac;
    const ax = cx - r - sep;
    const bx = cx + r + sep;
    cA.setAttribute("cx", f2(ax)); cA.setAttribute("cy", f2(cy)); cA.setAttribute("r", f2(r));
    cB.setAttribute("cx", f2(bx)); cB.setAttribute("cy", f2(cy)); cB.setAttribute("r", f2(r));
    // a circle draws from its 3 o'clock; A's IS the touch point, B's is
    // turned half round so its start is the same point — they part company
    cB.setAttribute("transform", `rotate(180 ${f2(bx)} ${f2(cy)})`);
    const dAB = smoothIO(tAB);
    drawn(cA, dAB); drawn(cB, dAB);

    // ── 3 · they pull apart; the big circles draw around them ──
    // DERIVED, not tuned: sized so their union is exactly 2R wide once A and
    // B have finished moving — the fourth circle is tangent to it by
    // construction ("assicurati che combaci con la bowl")
    const rOuter = Math.max(r * 1.05, R - (r + r * c.spreadFrac));
    outer.setAttribute("d", unionPath(ax, bx, cy, rOuter));
    const dL = lensPath(ax, bx, cy, rOuter);
    lens.setAttribute("d", dL); lensMask.copy.setAttribute("d", dL);
    const dSpread = smoothIO(tSpread);
    drawn(outer, dSpread); drawn(lensMask.copy, dSpread);

    // ── 4 · the third draws on in the gap, from its top ──
    cC.setAttribute("cx", f2(cx)); cC.setAttribute("cy", f2(cy)); cC.setAttribute("r", f2(r));
    cC.setAttribute("transform", `rotate(-90 ${f2(cx)} ${f2(cy)})`);
    const dC = smoothIO(tThird);
    drawn(cC, dC);

    // ── 5 · the fourth — the bowl — draws on around all three, from its top ──
    for (const n of [big, bigMask.copy]) {
      n.setAttribute("cx", f2(cx)); n.setAttribute("cy", f2(cy)); n.setAttribute("r", f2(R));
    }
    bigMask.copy.setAttribute("transform", `rotate(-90 ${f2(cx)} ${f2(cy)})`);
    const dBig = smoothIO(tFourth);
    drawn(bigMask.copy, dBig);

    // ── the words — each block arrives as its own shape finishes ──
    const tr = Math.max(0.05, c.textReveal);
    const late = (t) => clamp01((t - (1 - tr)) / tr);   // the last `tr` of a window
    const aText = late(tAB);
    const oText = late(tSpread);
    const cText = late(tThird);
    const tText = late(tFourth);
    const nameS = R * c.nameSize, descS = R * c.descSize, gap = R * c.descGap;
    const outS = R * c.outerLabelSize, titS = R * c.titleSize;
    const rise = (t) => (1 - t) * R * 0.03;
    place(labels.aName, ax, cy - gap * 0.55 + rise(aText), nameS, nameS * 1.2, aText);
    place(labels.aDesc, ax, cy + gap * 0.75 + rise(aText), descS, descS * 1.35, aText);
    place(labels.bName, bx, cy - gap * 0.55 + rise(aText), nameS, nameS * 1.2, aText);
    place(labels.bDesc, bx, cy + gap * 0.75 + rise(aText), descS, descS * 1.35, aText);
    place(labels.cName, cx, cy - gap * 0.55 + rise(cText), nameS, nameS * 1.2, cText);
    place(labels.cDesc, cx, cy + gap * 0.75 + rise(cText), descS, descS * 1.35, cText);
    place(labels.outerLeft, ax, cy - rOuter * 0.66 + rise(oText), outS, outS * 1.2, oText);
    place(labels.outerRight, bx, cy - rOuter * 0.66 + rise(oText), outS, outS * 1.2, oText);
    place(labels.title, cx, cy - (R + rOuter) / 2 + rise(tText), titS, titS * (c.titleLh || 1.3), tText);

    Object.assign(state, {
      p: +p.toFixed(4), stage, cx: +cx.toFixed(1), cy: +cy.toFixed(1),
      R: +R.toFixed(1), r: +r.toFixed(1), sep: +sep.toFixed(1),
      a: { x: +ax.toFixed(1) }, b: { x: +bx.toFixed(1) }, big: { r: +R.toFixed(1) },
      outerR: +rOuter.toFixed(1), unionHalf: +((bx - ax) / 2 + rOuter).toFixed(1),
      wire: +wire.toFixed(3),
      draw: { a: +dAB.toFixed(3), b: +dAB.toFixed(3), c: +dC.toFixed(3), union: +dSpread.toFixed(3), lens: +dSpread.toFixed(3), big: +dBig.toFixed(3) },
      text: { a: +aText.toFixed(3), c: +cText.toFixed(3), outer: +oText.toFixed(3), title: +tText.toFixed(3) },
    });
  }

  build();

  return {
    style,
    resize,
    update,
    get show() { return !!C().show; },
    probe() {
      return {
        show: !!C().show,
        hidden: mount.hidden,
        box: { w: W, h: H },
        ...state,
        // A's right edge to B's left edge — 0 is "touching"
        gapAB: +((state.b.x - state.a.x) - 2 * state.r).toFixed(1),
        // the fourth circle IS the bowl, and the union of the two big ones is tangent to it
        bigMatchesBowl: Math.abs(state.big.r - state.R) < 1.5,
        unionMatchesBowl: Math.abs(state.unionHalf - state.R) < 2,
        // what the DOM actually says the shapes have drawn
        dom: {
          a: +(1 - parseFloat(cA.getAttribute("stroke-dashoffset"))).toFixed(3),
          big: +(1 - parseFloat(bigMask.copy.getAttribute("stroke-dashoffset"))).toFixed(3),
          lensMasked: lens.getAttribute("mask") === "url(#was-circ-mask-lens)",
        },
      };
    },
  };
}
