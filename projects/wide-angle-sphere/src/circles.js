// ─────────────────────────────────────────────────────────────────────────────
// V5 (his ask, 2026-09-21) — two circles around the bowl.
//
// Not the vertex field: a four-beat diagram of plain SVG circles and paths,
// all of it sized off the BOWL'S OWN on-screen radius so the last circle lands
// exactly on its silhouette. In his words, and his four reference frames:
//
//   1  two circles, left and right of the bowl, "vicine tra loro che si
//      toccano ma che non si intersecano" — their captions reveal, and the
//      bowl behind crossfades to a 15%-opacity WIREFRAME
//   2  "le sfere si allontanano, creano un'area che contiene i due cerchi" —
//      they pull apart; two BIG circles close around them (their union drawn
//      solid, their overlap — the lens between — drawn dashed)
//   3  "far comparire il terzo cerchio al centro" — a third grows in the gap
//   4  "il cerchio grande che compone tutto, il diametro della bowl" — a
//      dashed fourth, the bowl's own diameter, around all three, title above.
//      The proportions are chosen so the union of the two big circles is
//      exactly 2R wide: the fourth circle is tangent to it, left and right.
//
// Everything is rebuilt each frame from ONE number: the canvas's own 0→1
// progress (`tl.canvasS0..S1`, the same span the network's three `ev` ramps
// are cut from), read against four stage windows. Pure scrub, no tween: back
// up the page and it un-draws exactly the way it drew.
// ─────────────────────────────────────────────────────────────────────────────

const SVG_NS = "http://www.w3.org/2000/svg";
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerp = (a, b, t) => a + (b - a) * t;
const smoothIO = (x) => { const t = clamp01(x); return t * t * (3 - 2 * t); };
const f2 = (v) => v.toFixed(2);

const el = (tag, attrs = {}) => {
  const e = document.createElementNS(SVG_NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  return e;
};

/** Two equal circles of radius r, centres (ax,cy) and (bx,cy), overlapping.
    Their two crossing points sit on the vertical through the midpoint, at
    cy ± h. Both shapes below are drawn from those two points. */
function crossing(ax, bx, cy, r) {
  const cx = (ax + bx) / 2;
  const half = Math.min(Math.abs(bx - ax) / 2, r * 0.999);
  const h = Math.sqrt(Math.max(0, r * r - half * half));
  return { cx, top: `${f2(cx)} ${f2(cy - h)}`, bot: `${f2(cx)} ${f2(cy + h)}`, R: `${f2(r)} ${f2(r)}` };
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

  // ── the shapes — one node each, redrawn per frame ─────────────────────
  const big = el("circle", { class: "was-circ was-circ-big", fill: "none" });
  const outer = el("path", { class: "was-circ was-circ-outer", fill: "none" });
  const lens = el("path", { class: "was-circ was-circ-lens", fill: "none" });
  const cA = el("circle", { class: "was-circ was-circ-a", fill: "none" });
  const cB = el("circle", { class: "was-circ was-circ-b", fill: "none" });
  const cC = el("circle", { class: "was-circ was-circ-c", fill: "none" });
  for (const n of [big, outer, lens, cA, cB, cC]) svg.appendChild(n);

  // ── the words — `<text>` per block, one `<tspan>` per line ────────────
  function textBlock(cls) {
    const t = el("text", {
      class: `was-circ-text ${cls}`,
      "text-anchor": "middle",
      "font-family": "var(--ui)",
    });
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
  /** (re)build a block's lines; sizes are in px, set per frame off R */
  function setLines(t, lines) {
    t.textContent = "";
    for (const line of lines) {
      const span = el("tspan", { x: 0, dy: 0 });
      span.textContent = line;
      t.appendChild(span);
    }
  }
  /** place a block: anchor, per-line size and leading, alpha */
  function place(t, x, y, size, lh, alpha) {
    const n = t.children.length;
    t.setAttribute("x", f2(x));
    t.setAttribute("y", f2(y));
    t.setAttribute("opacity", alpha.toFixed(3));
    let i = 0;
    for (const s of t.children) {
      s.setAttribute("x", f2(x));
      s.setAttribute("font-size", f2(size));
      // centre the block on its anchor: the first line sits (n-1)/2 up
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
  // `style()` is the panel's hook; same thing
  const style = build;

  // what the last frame drew, for the assertions
  const state = {
    p: 0, stage: 0, cx: 0, cy: 0, R: 0, r: 0, sep: 0,
    a: { x: 0 }, b: { x: 0 }, c: { r: 0 }, big: { r: 0, alpha: 0 },
    outerR: 0, unionHalf: 0, outerAlpha: 0, lensAlpha: 0, wire: 0,
    text: { a: 0, c: 0, outer: 0, title: 0 },
  };

  function update(tl) {
    const c = C();
    if (!c.show || mount.hidden) return;
    const box = mount.getBoundingClientRect();
    if (box.bottom <= 0 || box.top >= window.innerHeight) return;

    // the canvas's own 0→1, cut into the four windows
    const p = clamp01((tl.p - tl.canvasS0) / Math.max(1e-4, tl.canvasS1 - tl.canvasS0));
    const s2 = c.s2, s3 = c.s3, s4 = c.s4;
    const t1 = win(p, 0, s2);     // stage 1's own 0→1
    const t2 = win(p, s2, s3);    // stage 2's
    const t3 = win(p, s3, s4);    // stage 3's
    const t4 = win(p, s4, 1);     // stage 4's
    const stage = p < s2 ? 1 : p < s3 ? 2 : p < s4 ? 3 : 4;

    // the bowl, in this box's own pixels
    const bp = bowl.projected();
    const cx = bp.x - box.left;
    const cy = bp.y - box.top;
    const R = Math.max(8, bowl.projectedRadius());
    const r = R * c.radiusFrac;

    // ── the two base circles: touching, then pulled apart over stage 2 ──
    const sep = smoothIO(t2) * r * c.spreadFrac;          // extra half-gap each
    const ax = cx - r - sep;
    const bx = cx + r + sep;
    cA.setAttribute("cx", f2(ax)); cA.setAttribute("cy", f2(cy)); cA.setAttribute("r", f2(r));
    cB.setAttribute("cx", f2(bx)); cB.setAttribute("cy", f2(cy)); cB.setAttribute("r", f2(r));

    // ── stage 2: two big circles close around them — union solid, lens dashed ──
    const outerAlpha = smoothIO(t2);
    // DERIVED, not tuned: the big circles are exactly the size that makes
    // their union 2R wide once A and B have finished pulling apart — so the
    // fourth circle, the bowl's own, is tangent to it left and right
    // ("assicurati che combaci con la bowl"). Fixed at that final size while
    // A and B are still sliding, so they ride out with them, not resize.
    const rOuter = Math.max(r * 1.05, R - (r + r * c.spreadFrac));
    outer.setAttribute("d", unionPath(ax, bx, cy, rOuter));
    outer.setAttribute("opacity", outerAlpha.toFixed(3));
    lens.setAttribute("d", lensPath(ax, bx, cy, rOuter));
    lens.setAttribute("opacity", (outerAlpha * 0.7).toFixed(3));

    // ── stage 3: the third grows into the gap ──
    const grow = smoothIO(t3);
    const rC = r * grow;
    cC.setAttribute("cx", f2(cx)); cC.setAttribute("cy", f2(cy)); cC.setAttribute("r", f2(Math.max(0.01, rC)));
    cC.setAttribute("opacity", t3 > 0 ? "1" : "0");

    // ── stage 4: the fourth, the bowl's own diameter, and the title ──
    const bigAlpha = smoothIO(t4);
    const rBig = lerp(rOuter, R, smoothIO(t4));
    big.setAttribute("cx", f2(cx)); big.setAttribute("cy", f2(cy)); big.setAttribute("r", f2(rBig));
    big.setAttribute("opacity", bigAlpha.toFixed(3));

    // ── the bowl behind: crossfade to wireframe across stage 1, then hold ──
    const wire = smoothIO(t1);
    bowl.setWireframe(wire, c.wireframeOpacity);

    // ── the words — every size a share of R, like the shapes ──
    const tr = Math.max(0.05, c.textReveal);
    const aText = clamp01(t1 / tr);
    // the third's caption waits for its circle to be most of the way there
    const cText = clamp01((grow - 0.45) / 0.45);
    const oText = clamp01(t2 / tr);
    const tText = clamp01(t4 / tr);
    const nameS = R * c.nameSize, descS = R * c.descSize, gap = R * c.descGap;
    const outS = R * c.outerLabelSize, titS = R * c.titleSize;
    const rise = (t) => (1 - t) * R * 0.03;   // they rise into place
    place(labels.aName, ax, cy - gap * 0.55 + rise(aText), nameS, nameS * 1.2, aText);
    place(labels.aDesc, ax, cy + gap * 0.75 + rise(aText), descS, descS * 1.35, aText);
    place(labels.bName, bx, cy - gap * 0.55 + rise(aText), nameS, nameS * 1.2, aText);
    place(labels.bDesc, bx, cy + gap * 0.75 + rise(aText), descS, descS * 1.35, aText);
    place(labels.cName, cx, cy - gap * 0.55 + rise(cText), nameS, nameS * 1.2, cText);
    place(labels.cDesc, cx, cy + gap * 0.75 + rise(cText), descS, descS * 1.35, cText);
    // the outer labels sit in the top of each big circle, above the small one
    place(labels.outerLeft, ax, cy - rOuter * 0.66 + rise(oText), outS, outS * 1.2, oText);
    place(labels.outerRight, bx, cy - rOuter * 0.66 + rise(oText), outS, outS * 1.2, oText);
    // ...and the title in the top of the fourth, above the union
    place(labels.title, cx, cy - (rBig + rOuter) / 2 + rise(tText), titS, titS * (c.titleLh || 1.3), tText);

    Object.assign(state, {
      p: +p.toFixed(4), stage, cx: +cx.toFixed(1), cy: +cy.toFixed(1),
      R: +R.toFixed(1), r: +r.toFixed(1), sep: +sep.toFixed(1),
      a: { x: +ax.toFixed(1) }, b: { x: +bx.toFixed(1) }, c: { r: +rC.toFixed(1) },
      big: { r: +rBig.toFixed(1), alpha: +bigAlpha.toFixed(3) },
      outerR: +rOuter.toFixed(1), unionHalf: +((bx - ax) / 2 + rOuter).toFixed(1),
      outerAlpha: +outerAlpha.toFixed(3), lensAlpha: +(outerAlpha * 0.7).toFixed(3),
      wire: +wire.toFixed(3),
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
        // the gap between A's right edge and B's left edge — 0 is "touching"
        gapAB: +((state.b.x - state.a.x) - 2 * state.r).toFixed(1),
        // the fourth circle IS the bowl, and the union of the two big ones is tangent to it
        bigMatchesBowl: Math.abs(state.big.r - state.R) < 1.5,
        unionMatchesBowl: Math.abs(state.unionHalf - state.R) < 2,
      };
    },
  };
}
