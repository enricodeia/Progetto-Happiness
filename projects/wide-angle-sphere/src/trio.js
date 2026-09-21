// ─────────────────────────────────────────────────────────────────────────────
// Experience 2 — the three circles, and the Atlas built on top of them
// (his ask, 2026-09-21, the final task — "quella struttura che vedi nella foto
// 7 ... prima il cerchio in alto a destra, quello in basso, quello in alto a
// sinistra ... sempre con l'svg path ... e sopra questi cerchi si creerà quello
// che noi abbiamo creato come The Atlas").
//
// It takes over from V5's flanking circles inside the same block (the canvas
// block of #pinB, after the shader has closed into the bowl and the white has
// risen). Six abutting windows on the block's own 0→1:
//
//   0..wire       the bowl crossfades to its 15% lattice, alone
//   wire..c1      the TOP-RIGHT circle draws on
//   c1..c2        the BOTTOM circle draws on
//   c2..c3        the TOP-LEFT circle draws on
//   c3..arcs      the three big arcs draw on, the side labels arrive
//   arcs..knot    the paper warms to the Atlas's own, the lattice goes
//   knot..1       the Atlas knot DRAWS ITSELF over the circles, cards arrive
//
// The circles are not placed by hand: each is the least-squares circle
// through the outer stretch of ONE LOBE of the knot, projected through the
// Atlas's own camera at its rest pose — so the porcelain band lands exactly on
// the line that announced it ("SVG lines che si intersecano perfettamente" was
// what he loved about V5's fourth circle). The knot's front travels TR → B →
// TL, the order he asked the circles for, and the three cards are re-seated on
// the lobes so Members sits on "Member feedback", Therapists on "Therapist
// reports", the library on "Clinical research".
//
// Draw-on is `pathLength="1"` + `stroke-dashoffset = 1 − t`, as in circles.js.
// Everything is rebuilt each frame from one number. Pure scrub, no tween.
// ─────────────────────────────────────────────────────────────────────────────

const SVG_NS = "http://www.w3.org/2000/svg";
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smoothIO = (x) => { const t = clamp01(x); return t * t * (3 - 2 * t); };
const f2 = (v) => v.toFixed(2);
const win = (p, from, to) => clamp01((p - from) / Math.max(1e-4, to - from));
const DEG = Math.PI / 180;

const el = (tag, attrs = {}) => {
  const e = document.createElementNS(SVG_NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  return e;
};

/** #rrggbb → [r,g,b] */
function rgb(hex) {
  const h = String(hex).replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function mixColor(a, b, t) {
  const A = rgb(a), B = rgb(b);
  const k = clamp01(t);
  return `rgb(${Math.round(A[0] + (B[0] - A[0]) * k)}, ${Math.round(A[1] + (B[1] - A[1]) * k)}, ${Math.round(A[2] + (B[2] - A[2]) * k)})`;
}

/** the minor arc of the circle (cx,cy,R) from angle a1 to a2 (radians, screen) */
function arcPath(cx, cy, R, a1, a2) {
  let d = a2 - a1;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  const x1 = cx + R * Math.cos(a1), y1 = cy + R * Math.sin(a1);
  const x2 = cx + R * Math.cos(a1 + d), y2 = cy + R * Math.sin(a1 + d);
  const sweep = d > 0 ? 1 : 0;
  return `M ${f2(x1)} ${f2(y1)} A ${f2(R)} ${f2(R)} 0 0 ${sweep} ${f2(x2)} ${f2(y2)}`;
}

export function createTrio({ mount, cfg, bowl, atlas }) {
  const T = () => cfg.v2.trio;
  const K = () => cfg.v2.circles;

  const svg = el("svg", { class: "was-trio-svg" });
  mount.appendChild(svg);

  const draw1 = { pathLength: 1, "stroke-dasharray": 1, "stroke-dashoffset": 1, fill: "none" };
  // the three circles, in the order they draw: top-right, bottom, top-left
  const ROLES = ["tr", "b", "tl"];
  const circles = Object.fromEntries(ROLES.map((r) => [r, el("circle", { class: `was-trio-circ is-${r}`, ...draw1 })]));
  const arcs = ROLES.map((r) => el("path", { class: `was-trio-arc is-${r}`, ...draw1 }));
  const gArcs = el("g", { class: "was-trio-arcs" });
  const gCirc = el("g", { class: "was-trio-circles" });
  for (const a of arcs) gArcs.appendChild(a);
  for (const r of ROLES) gCirc.appendChild(circles[r]);
  svg.appendChild(gArcs);
  svg.appendChild(gCirc);

  function textBlock(cls) {
    const t = el("text", { class: `was-trio-text ${cls}`, "text-anchor": "middle", "font-family": "var(--ui)" });
    svg.appendChild(t);
    return t;
  }
  const labels = {
    tr: { name: textBlock("was-trio-name"), desc: textBlock("was-trio-desc") },
    b: { name: textBlock("was-trio-name"), desc: textBlock("was-trio-desc") },
    tl: { name: textBlock("was-trio-name"), desc: textBlock("was-trio-desc") },
    left: textBlock("was-trio-side"),
    right: textBlock("was-trio-side"),
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
    build();
  }

  function build() {
    const t = T();
    const L = t.labels;
    for (const r of ROLES) {
      circles[r].setAttribute("stroke", t.ink);
      circles[r].setAttribute("stroke-width", t.strokeWidth);
    }
    for (const a of arcs) {
      a.setAttribute("stroke", t.ink);
      a.setAttribute("stroke-width", t.arcWidth);
      a.setAttribute("stroke-opacity", t.arcAlpha);
    }
    for (const r of ROLES) {
      labels[r].name.setAttribute("fill", t.ink);
      labels[r].desc.setAttribute("fill", t.ink);
      setLines(labels[r].name, [L[r].name]);
      setLines(labels[r].desc, L[r].desc.split("\n"));
    }
    labels.left.setAttribute("fill", t.ink);
    labels.right.setAttribute("fill", t.ink);
    setLines(labels.left, [L.left]);
    setLines(labels.right, [L.right]);
  }
  const style = build;

  const drawn = (e, v) => e.setAttribute("stroke-dashoffset", (1 - clamp01(v)).toFixed(4));

  // ── where the three circles are ─────────────────────────────────────────
  /**
   * The lobes of the knot, projected — each as a fitted circle in THIS box's
   * pixels, keyed by where it sits on screen (`tr` / `b` / `tl`), with the
   * curve parameter of its vertex so the cards can be seated on it too.
   */
  function fromKnot() {
    const fits = atlas.lobeCircles(T().fitSpan);
    if (!fits || fits.length !== 3) return null;
    const ar = atlas.rect();
    const box = mount.getBoundingClientRect();
    const dx = ar.left - box.left, dy = ar.top - box.top;
    const L = fits.map((f) => ({ cx: f.cx + dx, cy: f.cy + dy, r: f.r * T().radiusScale, t: f.t, k: f.k }));
    // the lowest one is the bottom; of the other two, the right-hand one is TR
    const byY = [...L].sort((a, b) => b.cy - a.cy);
    const b = byY[0];
    const rest = byY.slice(1).sort((a, b) => a.cx - b.cx);
    return { tl: rest[0], tr: rest[1], b, source: "knot" };
  }
  function fromManual() {
    const m = T().manual;
    const S = Math.min(W, H);
    const cx = W * m.cx, cy = H * m.cy, D = S * m.D, r = D * m.rFrac;
    return {
      tl: { cx: cx - 0.866 * D, cy: cy - 0.5 * D, r, t: 5 / 6, k: 2 },
      tr: { cx: cx + 0.866 * D, cy: cy - 0.5 * D, r, t: 1 / 6, k: 0 },
      b: { cx, cy: cy + D, r, t: 1 / 2, k: 1 },
      source: "manual",
    };
  }
  function geometry() {
    return (T().fit === "knot" ? fromKnot() : null) || fromManual();
  }

  const state = {
    p: 0, stage: 0, wire: 0, source: "", knotQ: 0, paper: 0, bowlOut: 0, under: 1,
    circles: { tr: null, b: null, tl: null },
    draw: { tr: 0, b: 0, tl: 0, arcs: [0, 0, 0] },
    text: { tr: 0, b: 0, tl: 0, side: 0 },
  };
  let sheetColor = "";

  function update(tl) {
    const t = T();
    if (!t.show || mount.hidden) return;
    const box = mount.getBoundingClientRect();
    if (box.bottom <= 0 || box.top >= window.innerHeight) return;

    const p = clamp01((tl.p - tl.canvasS0) / Math.max(1e-4, tl.canvasS1 - tl.canvasS0));
    const M = t.marks;
    const tWire = win(p, 0, M.wire);
    const tC1 = win(p, M.wire, M.c1);
    const tC2 = win(p, M.c1, M.c2);
    const tC3 = win(p, M.c2, M.c3);
    const tArcs = win(p, M.c3, M.arcs);
    const tKnot = win(p, M.knot, 1);
    const stage = p < M.wire ? 1 : p < M.c1 ? 2 : p < M.c2 ? 3 : p < M.c3 ? 4 : p < M.arcs ? 5 : p < M.knot ? 6 : 7;

    // ── 1 · the lattice, then — once the arcs are in — the bowl goes ──
    const wire = smoothIO(tWire);
    const out = smoothIO(win(p, t.bowlOut.at, t.bowlOut.at + t.bowlOut.dur));
    bowl.setWireframe(wire, K().wireframeOpacity * (1 - out));

    // ── the paper warms to the Atlas's own, under everything ──
    const paper = smoothIO(win(p, t.atlas.paperAt, t.atlas.paperAt + t.atlas.paperDur));
    const col = mixColor(cfg.columns.rightBg, t.atlas.paper, paper);
    if (col !== sheetColor) { sheetColor = col; bowl.setSheetColor(paper > 0.001 ? col : ""); }

    // ── the three circles, TR → B → TL ──
    const G = geometry();
    const draws = { tr: smoothIO(tC1), b: smoothIO(tC2), tl: smoothIO(tC3) };
    const order = { tr: "b", b: "tl", tl: "tr" };   // each starts drawing toward the next
    for (const r of ROLES) {
      const c = G[r];
      const nxt = G[order[r]];
      const e = circles[r];
      e.setAttribute("cx", f2(c.cx)); e.setAttribute("cy", f2(c.cy)); e.setAttribute("r", f2(c.r));
      // a circle draws from its 3 o'clock — turn it so it starts on the point
      // nearest the circle that draws next, and the three read as one line
      const start = Math.atan2(nxt.cy - c.cy, nxt.cx - c.cx) / DEG;
      e.setAttribute("transform", `rotate(${f2(start)} ${f2(c.cx)} ${f2(c.cy)})`);
      drawn(e, draws[r]);
    }

    // ── the big arcs: each centred on one circle, spanning the other two ──
    const dist = (a, b) => Math.hypot(b.cx - a.cx, b.cy - a.cy);
    const dMean = (dist(G.tr, G.b) + dist(G.b, G.tl) + dist(G.tl, G.tr)) / 3;
    const R = dMean * t.arcFrac;
    const over = t.arcOver * DEG;
    const arcDraws = [];
    ROLES.forEach((r, i) => {
      const c = G[r];
      const o1 = G[ROLES[(i + 1) % 3]], o2 = G[ROLES[(i + 2) % 3]];
      let a1 = Math.atan2(o1.cy - c.cy, o1.cx - c.cx);
      let a2 = Math.atan2(o2.cy - c.cy, o2.cx - c.cx);
      // stretch both ends outward by `arcOver`, away from the middle of the span
      let d = a2 - a1;
      while (d > Math.PI) d -= 2 * Math.PI;
      while (d < -Math.PI) d += 2 * Math.PI;
      const s = d > 0 ? 1 : -1;
      arcs[i].setAttribute("d", arcPath(c.cx, c.cy, R, a1 - s * over, a2 + s * over));
      // one after the next, overlapping: the i-th runs over [i·st, i·st + (1 − 2st)]
      const st = clamp01(t.arcStagger) * 0.5;
      const k = smoothIO(win(tArcs, i * st, i * st + (1 - 2 * st)));
      arcDraws.push(k);
      drawn(arcs[i], k);
    });

    // ── the words — each block arrives over the last share of its own window ──
    const tr = Math.max(0.05, t.textReveal);
    const late = (v) => clamp01((v - (1 - tr)) / tr);
    const texts = { tr: late(tC1), b: late(tC2), tl: late(tC3) };
    const side = late(tArcs);
    // ...and go again as the knot takes the story over, if asked to
    const gone = t.captionsOut ? smoothIO(win(p, M.knot, M.knot + Math.max(0.02, t.captionsOutDur))) : 0;
    const rBase = (G.tr.r + G.b.r + G.tl.r) / 3;
    const nameS = rBase * t.nameSize, descS = rBase * t.descSize, sideS = rBase * t.sideSize;
    const rise = (v) => (1 - v) * rBase * 0.05;
    for (const r of ROLES) {
      const c = G[r];
      const a = texts[r] * (1 - gone);
      place(labels[r].name, c.cx, c.cy - c.r * t.nameY + rise(texts[r]), nameS, nameS * 1.2, a);
      place(labels[r].desc, c.cx, c.cy + c.r * t.descY + rise(texts[r]), descS, descS * t.descLh, a);
    }
    const midY = (G.tl.cy + G.b.cy) / 2 + rBase * t.sideDown;
    const sideA = side * (1 - gone);
    place(labels.left, G.tl.cx - rBase * t.sideOut, midY + rise(side), sideS, sideS * 1.2, sideA);
    place(labels.right, G.tr.cx + rBase * t.sideOut, midY + rise(side), sideS, sideS * 1.2, sideA);

    // ── the knot over it all: the ink settles back under the porcelain ──
    const under = 1 - (1 - t.atlas.circlesUnder) * smoothIO(tKnot);
    gCirc.setAttribute("opacity", under.toFixed(3));
    gArcs.setAttribute("opacity", under.toFixed(3));

    Object.assign(state, {
      p: +p.toFixed(4), stage, wire: +wire.toFixed(3), source: G.source,
      knotQ: +tKnot.toFixed(4), paper: +paper.toFixed(3), bowlOut: +out.toFixed(3), under: +under.toFixed(3),
      circles: {
        tr: { cx: +G.tr.cx.toFixed(1), cy: +G.tr.cy.toFixed(1), r: +G.tr.r.toFixed(1), t: +G.tr.t.toFixed(4) },
        b: { cx: +G.b.cx.toFixed(1), cy: +G.b.cy.toFixed(1), r: +G.b.r.toFixed(1), t: +G.b.t.toFixed(4) },
        tl: { cx: +G.tl.cx.toFixed(1), cy: +G.tl.cy.toFixed(1), r: +G.tl.r.toFixed(1), t: +G.tl.t.toFixed(4) },
      },
      arcR: +R.toFixed(1),
      draw: { tr: +draws.tr.toFixed(3), b: +draws.b.toFixed(3), tl: +draws.tl.toFixed(3), arcs: arcDraws.map((v) => +v.toFixed(3)) },
      text: { tr: +texts.tr.toFixed(3), b: +texts.b.toFixed(3), tl: +texts.tl.toFixed(3), side: +side.toFixed(3), gone: +gone.toFixed(3) },
    });
  }

  /** leaving the trio (a legacy version, or Experience 1): what it wrote onto
   *  the bowl — the paper's colour, the lattice — is handed back, so nothing
   *  of it can outlive the layout that asked for it */
  function reset() {
    sheetColor = "";
    bowl.setSheetColor("");
    bowl.setWireframe(0, K().wireframeOpacity);
    Object.assign(state, { p: 0, stage: 0, wire: 0, knotQ: 0, paper: 0, bowlOut: 0, under: 1 });
  }

  build();

  return {
    style,
    resize,
    update,
    reset,
    /** the knot's own 0→1 inside this block — main.js hands it to the Atlas */
    get knotQ() { return state.knotQ; },
    /** the bowl is entirely gone once the lattice has faded — nothing to draw */
    get bowlGone() { return state.bowlOut >= 0.999 && state.wire >= 0.999; },
    get show() { return !!T().show; },
    /** the circle each card should sit on — the vertex `t` of the lobe under a role */
    roleT(role) { const c = state.circles[role]; return c ? c.t : null; },
    probe() {
      return {
        show: !!T().show,
        hidden: mount.hidden,
        box: { w: W, h: H },
        ...state,
        // what the DOM itself says has drawn
        dom: {
          tr: +(1 - parseFloat(circles.tr.getAttribute("stroke-dashoffset"))).toFixed(3),
          b: +(1 - parseFloat(circles.b.getAttribute("stroke-dashoffset"))).toFixed(3),
          tl: +(1 - parseFloat(circles.tl.getAttribute("stroke-dashoffset"))).toFixed(3),
          arc0: +(1 - parseFloat(arcs[0].getAttribute("stroke-dashoffset"))).toFixed(3),
        },
        // the geometry reads as his frame: two up, one down, the top pair level
        shape: (() => {
          const c = state.circles;
          if (!c.tr || !c.b || !c.tl) return null;
          return {
            topPairLevel: Math.abs(c.tr.cy - c.tl.cy) < Math.max(c.tr.r, c.tl.r) * 0.35,
            trRightOfTl: c.tr.cx > c.tl.cx + c.tl.r,
            bottomLowest: c.b.cy > Math.max(c.tr.cy, c.tl.cy) + c.b.r * 0.5,
            noOverlap: [["tr", "b"], ["b", "tl"], ["tl", "tr"]].every(([a, b2]) =>
              Math.hypot(c[a].cx - c[b2].cx, c[a].cy - c[b2].cy) > c[a].r + c[b2].r - 2),
          };
        })(),
      };
    },
  };
}
