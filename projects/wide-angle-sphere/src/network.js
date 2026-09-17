import { ringMedia } from "./data/ringMedia.js";
import { TECHNIQUES } from "./data/techniques.js";

// ─────────────────────────────────────────────────────────────────────────────
// The trust network — V2's answer to "what goes in that corner".
//
// A FIELD of plain, unnamed, unstyled black vertices — evenly spread over the
// surface of a sphere, so the corner reads as a small WORLD rather than a
// diagram — and three of its own subsets get ASSIGNED a role as the section
// scrolls: some become USERS (stock photos), some TEACHERS (portraits), some
// TECHNIQUES (pills). The rest just stay what they always were: the mesh the
// assigned ones sit on.
//
//   step 1 (ev[0])  the whole field appears, and the USER dots pop out of it
//   step 2 (ev[1])  the TEACHER dots pop, each wired to its own user by a
//                    curved line bowed along the sphere's own surface
//   step 3 (ev[2])  the TECHNIQUE pills pop further out — "the tree of
//                    connections widens" — each wired to its nearest teacher
//
// It is still driven by the SAME three ramps that scrub the evidence panel's
// own three rows (`tl.ev[0..2]`): the diagram lands in lock-step with the
// claim it illustrates, not on a separate clock of its own. Pure scrub, no
// state: scrolling back up un-draws it exactly the way it drew.
//
// The sphere itself never turns — its orientation (`tiltX`/`rotateY`) is
// fixed at layout time, so paint order (who occludes whom) can be sorted
// ONCE, back-to-front, rather than re-sorted every frame. That is what keeps
// this as cheap as it was when it was a flat fan: still plain SVG, still one
// layout pass, nothing per-frame but opacity/scale/dash-offset.
// ─────────────────────────────────────────────────────────────────────────────

const SVG_NS = "http://www.w3.org/2000/svg";
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerp = (a, b, t) => a + (b - a) * t;
const rad = (deg) => (deg * Math.PI) / 180;

/** Robert Penner's back-out, as a closed-form function of x — no tween, no
    timeline: the diagram is scrubbed, so the "pop" has to be a pure function
    of progress like everything else in it. */
/** ease-in-out, as a closed form — the fold has to be a function of scroll */
function smoothIO(x) {
  const t = x < 0 ? 0 : x > 1 ? 1 : x;
  return t * t * (3 - 2 * t);
}

function backOut(x, s = 1.70158) {
  const t = clamp01(x) - 1;
  return 1 + (s + 1) * t * t * t + s * t * t;
}

/** One unit's own share of a scrubbed ramp — the same spread/stagger formula
    `reveal.js` uses for words and lines, so a branch behaves exactly like
    every other staggered thing on this page. */
function branchProgress(v, i, n, spread) {
  const t0 = n <= 1 ? 0 : (i / (n - 1)) * clamp01(spread);
  const w = 1 - clamp01(spread);
  return clamp01((v - t0) / Math.max(0.05, w));
}

const el = (tag, attrs = {}) => {
  const e = document.createElementNS(SVG_NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  return e;
};

/** N points evenly spread over a unit sphere — the golden-angle spiral, so
    there is no pole crowding the way a lat/long grid would have. */
function fibonacciSphere(n) {
  const pts = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = n <= 1 ? 0 : 1 - (i / (n - 1)) * 2; // 1 → −1
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = golden * i;
    pts.push({ x: Math.cos(theta) * r, y, z: Math.sin(theta) * r });
  }
  return pts;
}

/** fixed orientation: yaw (rotateY) first, then lean it back (tiltX) */
function orient(p, tiltXRad, rotYRad) {
  const x = p.x * Math.cos(rotYRad) + p.z * Math.sin(rotYRad);
  const z0 = -p.x * Math.sin(rotYRad) + p.z * Math.cos(rotYRad);
  const y = p.y * Math.cos(tiltXRad) - z0 * Math.sin(tiltXRad);
  const z = p.y * Math.sin(tiltXRad) + z0 * Math.cos(tiltXRad);
  return { x, y, z };
}

/** Greedily spreads `n` roles across `total` indices, avoiding whatever is
    already in `used` — so USERS, TEACHERS and TECHNIQUES are woven through
    the whole sphere rather than landing on the same handful of vertices. */
function pickRole(total, n, used) {
  const out = [];
  if (n <= 0 || total <= 0) return out;
  const step = total / n;
  for (let i = 0; i < n; i++) {
    let idx = Math.round(i * step) % total;
    let tries = 0;
    while (used.has(idx) && tries < total) {
      idx = (idx + 1) % total;
      tries++;
    }
    used.add(idx);
    out.push(idx);
  }
  return out;
}

/** nearest OTHER point by angle on the sphere (plain unit-vector dot product
    — no trig needed, just whichever cosine is largest) */
function nearest(from, candidates, pts) {
  let best = -1, bestDot = -Infinity;
  for (const c of candidates) {
    const d = pts[from].x * pts[c].x + pts[from].y * pts[c].y + pts[from].z * pts[c].z;
    if (d > bestDot) { bestDot = d; best = c; }
  }
  return best;
}

export function createNetwork({ mount, cfg }) {
  const N = () => cfg.v2.network;

  const svg = el("svg", { class: "was-network-svg" });
  const defs = el("defs");
  svg.appendChild(defs);
  mount.appendChild(svg);

  let field = [];      // { dot, z }  — every plain vertex, always visible once on
  let people = [];      // { i, pt, dot, group, unit, z }
  let teachers = [];     // { i, pt, dot, group, unit, z, lineToUser, lenU }
  let techniques = [];   // { i, pt, pillGroup, unit, z, lineToTeacher, lenT, label }
  let discRings = [];    // V3 only — the two discs' own rings, drawn on by scroll
  let braidSegs = [];    // (the braid, kept but no longer the V4 default)
  let braidBits = [];
  let gorePaths = [];    // V4 — the flat strips
  let goreDots = [];     // V4 — every vertex, with BOTH of its true positions
  let goreLayers = null; // V4 — the six paths the vertices are drawn into
  let goreGeom = null;   // V4 — what the fold needs to know each frame
  let discOrigin = null; // ...and where that disc is centred, for the probe
  let w = 0, h = 0;

  function clear() {
    svg.textContent = "";
    svg.appendChild(defs);
    defs.textContent = "";
    field = []; people = []; teachers = []; techniques = []; discRings = []; discOrigin = null;
    braidSegs = []; braidBits = [];
    gorePaths = []; goreDots = []; goreLayers = null; goreGeom = null;
  }

  /** the connector between two screen points, bowed AWAY from the sphere's
      own centre so it reads as an arc across the surface, not a ruler line */
  function bowedPath(a, b, origin, bow) {
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    let px = -dy / len;
    let py = dx / len;
    const toMid = { x: mx - origin.x, y: my - origin.y };
    if (px * toMid.x + py * toMid.y < 0) { px = -px; py = -py; }
    const cx = mx + px * len * bow;
    const cy = my + py * len * bow;
    return `M ${a.x.toFixed(1)} ${a.y.toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
  }

  const clipId = (kind, i) => `was-net-clip-${kind}-${i}`;
  function photo(point, size, src, id) {
    const r = size / 2;
    const clip = el("clipPath", { id });
    clip.appendChild(el("circle", { cx: point.x, cy: point.y, r }));
    defs.appendChild(clip);
    const g = el("g");
    const ring = el("circle", { cx: point.x, cy: point.y, r, fill: "#fff", "fill-opacity": 0.9 });
    const img = el("image", {
      x: point.x - r, y: point.y - r, width: size, height: size,
      preserveAspectRatio: "xMidYMid slice", "clip-path": `url(#${id})`,
    });
    if (src) img.setAttributeNS("http://www.w3.org/1999/xlink", "href", src);
    g.appendChild(ring);
    g.appendChild(img);
    return g;
  }

  /** a pill, centred on `anchor` — the technique's own label */
  function pill(anchor, label, P) {
    const text = el("text", {
      x: anchor.x, y: anchor.y, "text-anchor": "middle", "dominant-baseline": "central",
      "font-family": "var(--ui)", "font-size": P.fontSize, fill: P.ink,
    });
    text.textContent = label;
    svg.appendChild(text);
    const tw = text.getBBox().width;
    const pw = tw + P.padX * 2;
    const rect = el("rect", {
      x: anchor.x - pw / 2, y: anchor.y - P.h / 2, width: pw, height: P.h,
      rx: P.h / 2, ry: P.h / 2, fill: P.bg,
    });
    const g = el("g");
    svg.appendChild(g);
    g.appendChild(rect);
    g.appendChild(text);
    return { g, pw };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // V3 — the flat golden-angle DISC (his ask, 2026-09-17).
  //
  // Not a sphere with roles scattered over it, but ONE continuous
  // phyllotactic spiral read outward in three bands:
  //
  //   the inner disc     the PEOPLE
  //   the annulus on it  the THERAPISTS
  //   the ring outside   the TECHNIQUE pills
  //
  // Point i sits at angle `i × 137.507°` (the golden angle) and radius
  // `R·√(i/N)`. The square root is the whole trick: area grows as r², so
  // radius ∝ √i is the only law that keeps the density even instead of
  // crowding the middle — it is why a sunflower looks the way it does.
  //
  // And the CHAIN, which is what he actually asked for ("per ogni persona,
  // un terapista; per ogni terapista, una pill"): person i pairs with
  // therapist P+i and with pill P+T+i. Because the three bands hold the SAME
  // count, the angular step between a person and its therapist —
  // (P × 137.507°) mod 360 — is exactly the step between that therapist and
  // its pill. Every chain is therefore the same shape rotated by 360/P, so
  // the eight of them nest as a pinwheel and CANNOT cross each other. No
  // untangling pass, no heuristics: it falls out of the geometry.
  //
  // The centre stays EMPTY and there is no field of dots (his correction,
  // 2026-09-17: "non deve essere riempito... non voglio neanche i puntini").
  // What is there instead is the two discs' own rings, drawn in a very light
  // grey and drawn ON as you scroll, with the content growing over them.
  // ═══════════════════════════════════════════════════════════════════════
  const GOLDEN = Math.PI * (3 - Math.sqrt(5));

  // ═══════════════════════════════════════════════════════════════════════
  // V4 — THE GORES. A globe unpeeled, then folded back up (his idea).
  //
  // Step 1  the flat strips draw on, left to right — a globemaker's sheet
  // Step 2  the vertices appear ON the strips, in three weights
  // Step 3  the sheet closes: every vertex travels from its place on the
  //         flat projection to its place on the sphere, and the strips go
  //
  // A vertex therefore has two TRUE positions, both computed from the same
  // (latitude, longitude) — the sinusoidal projection for the flat sheet and
  // the orthographic projection of the real sphere for the ball — and the
  // fold is a straight interpolation between them. Nothing about it is a
  // fake; scrolling back up genuinely unfolds the globe.
  //
  // All the vertices live in SIX paths (three weights × front/back), each
  // rebuilt as one `d` string per frame. That is six attribute writes rather
  // than ~250, which is what makes a 250-point morph cheap enough to scrub.
  // ═══════════════════════════════════════════════════════════════════════
  const circleD = (x, y, r) =>
    `M${x.toFixed(1)},${y.toFixed(1)}m${(-r).toFixed(2)},0a${r.toFixed(2)},${r.toFixed(2)} 0 1,0 ${(r * 2).toFixed(2)},0a${r.toFixed(2)},${r.toFixed(2)} 0 1,0 ${(-r * 2).toFixed(2)},0`;

  function layoutGlobe(n) {
    const G = n.globe;
    const cx = w / 2;
    const cy = h / 2;
    const short = Math.min(w, h);
    const Rf = (Math.max(5, G.flatR) / 100) * short;     // outermost flat ring
    const R = (Math.max(5, G.radius) / 100) * short;      // the sphere
    const latMax = rad(Math.min(88, G.latMax));
    const thetaMax = Math.PI / 2 + latMax;
    const persp = Math.max(0, Math.min(0.8, G.perspective ?? 0));

    // AZIMUTHAL EQUIDISTANT: the pole at the centre, every parallel at a
    // radius proportional to its angular distance from it.
    const flatAt = (phi, lam) => {
      const rho = (Rf * (Math.PI / 2 - phi)) / thetaMax;
      return { x: cx + rho * Math.cos(lam), y: cy + rho * Math.sin(lam) };
    };
    const baseTilt = rad(G.tilt);
    // the ball, spun and leant, with a little PERSPECTIVE: the near side is
    // drawn larger than the far one. `k` is the scale a thing at that depth
    // takes, so dots and pills can shrink with distance too.
    const ballAt = (phi, lam, spin, tiltOff, scale = 1) => {
      const l = lam + spin;
      const tilt = baseTilt + tiltOff;
      const X = Math.cos(phi) * Math.sin(l);
      const Y0 = Math.sin(phi);
      const Z0 = Math.cos(phi) * Math.cos(l);
      const Y = Y0 * Math.cos(tilt) - Z0 * Math.sin(tilt);
      const Z = Y0 * Math.sin(tilt) + Z0 * Math.cos(tilt);
      const k = 1 + persp * 0.5 * Z * scale;
      return { x: cx + X * R * scale * k, y: cy - Y * R * scale * k, z: Z, k };
    };
    const morph = (phi, lam, f, spin, tiltOff, scale = 1) => {
      const fl = flatAt(phi, lam);
      if (f <= 0) return { x: fl.x, y: fl.y, z: 1, k: 1 };
      const bp = ballAt(phi, lam, spin, tiltOff, scale);
      return {
        x: fl.x + (bp.x - fl.x) * f, y: fl.y + (bp.y - fl.y) * f,
        z: bp.z, k: 1 + (bp.k - 1) * f,
      };
    };

    // ── paint order, back to front, as DOM order ──────────────────────────
    // far rings · far dots · far chains · far halos · far pills
    // near rings · near dots · near chains · near halos · near pills
    const layer = () => svg.appendChild(el("g"));
    const Lb = { rings: layer(), dots: layer(), chains: layer(), halos: layer(), pills: layer() };
    const Lf = { rings: layer(), dots: layer(), chains: layer(), halos: layer(), pills: layer() };

    // ── the rings: flat contours that become the sphere's parallels ───────
    const ringN = Math.max(2, Math.round(G.rings));
    const samples = Math.max(16, Math.round(G.ringSamples));
    for (let j = 0; j < ringN; j++) {
      const phi = -latMax + ((j + 0.5) / ringN) * latMax * 2;
      const mk = (parent) => parent.appendChild(el("path", {
        fill: "none", stroke: G.ringColor, "stroke-width": G.ringWidth,
        "stroke-linejoin": "round", "stroke-linecap": "round", opacity: 0,
      }));
      gorePaths.push({ back: mk(Lb.rings), front: mk(Lf.rings), j, phi, samples });
    }

    // ── the vertices: even on the SPHERE first, then projected flat ───────
    const total = Math.max(24, Math.round(G.points));
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < total; i++) {
      const sy = 1 - (i / (total - 1)) * 2;
      const phi = Math.asin(Math.max(-1, Math.min(1, sy)));
      let lam = (i * golden) % (Math.PI * 2);
      if (lam > Math.PI) lam -= Math.PI * 2;
      const tier = i % Math.max(2, Math.round(G.bigEvery)) === 0 ? 2
        : i % Math.max(2, Math.round(G.midEvery)) === 0 ? 1 : 0;
      goreDots.push({ phi, lam, tier, i, flat: flatAt(phi, lam), lit: 0 });
    }
    for (const p of goreDots) {
      p.q = Math.hypot(p.flat.x - cx, p.flat.y - cy) / Math.max(1, Rf);
    }
    const mkDot = (parent, tier) => parent.appendChild(el("path", {
      fill: tier === 2 ? G.bigColor : n.lineColor, stroke: "none", opacity: 0,
    }));
    goreLayers = [0, 1, 2].map((tier) => ({ tier, back: mkDot(Lb.dots, tier), front: mkDot(Lf.dots, tier) }));
    const halos = {
      back: Lb.halos.appendChild(el("path", { fill: "none", stroke: n.lineColor, "stroke-width": 1, opacity: 0 })),
      front: Lf.halos.appendChild(el("path", { fill: "none", stroke: n.lineColor, "stroke-width": 1, opacity: 0 })),
    };

    // ── the techniques, in orbit, each the END of a chain of vertices ─────
    const gc = (aP, aL, bP, bL) => Math.acos(Math.max(-1, Math.min(1,
      Math.sin(aP) * Math.sin(bP) + Math.cos(aP) * Math.cos(bP) * Math.cos(aL - bL))));
    const bearing = (aP, aL, bP, bL) => Math.atan2(
      Math.sin(bL - aL) * Math.cos(bP),
      Math.cos(aP) * Math.sin(bP) - Math.sin(aP) * Math.cos(bP) * Math.cos(bL - aL));

    const pillN = Math.max(0, Math.round(G.pills));
    const techLabels = Object.keys(TECHNIQUES);
    const band = rad(Math.min(80, G.pillBand ?? 46));
    const orbit = [];
    const taken = new Set();
    for (let i = 0; i < pillN; i++) {
      // An EVEN spread over the band, not a random-looking one: even in
      // sin(latitude) — which is even in AREA on a sphere — down the band,
      // and the golden angle round it. That is a Fibonacci sphere confined
      // to a belt, and it is what keeps twelve labels from ever bunching.
      const phi = Math.asin(Math.sin(band) * (2 * ((i + 0.5) / pillN) - 1));
      let lam = (i * golden + Math.PI * 0.37) % (Math.PI * 2);
      if (lam > Math.PI) lam -= Math.PI * 2;
      const label = techLabels[i % Math.max(1, techLabels.length)] || "Practice";
      const { g, pw } = pill({ x: cx, y: cy }, label, n.pill);
      g.setAttribute("opacity", "0");
      Lf.pills.appendChild(g);
      const halfW = pw / 2;

      const chainN = Math.max(0, Math.round(G.arcsPer));
      const linkN = Math.max(1, Math.round(G.chainLen));
      const chains = [];
      const seeds = goreDots
        .filter((q) => !taken.has(q.i))
        .map((q) => ({ p: q, d: gc(phi, lam, q.phi, q.lam), b: bearing(phi, lam, q.phi, q.lam) }))
        .sort((x, y) => Math.abs(x.d - G.arcSpan) - Math.abs(y.d - G.arcSpan));
      for (const sd of seeds) {
        if (chains.length >= chainN) break;
        if (chains.some((c) => {
          const dd = Math.abs(c.b - sd.b) % (Math.PI * 2);
          return Math.min(dd, Math.PI * 2 - dd) < 1.2;
        })) continue;
        const link = [sd.p];
        taken.add(sd.p.i);
        for (let hIdx = 1; hIdx < linkN; hIdx++) {
          const t = hIdx / linkN;
          const targetD = sd.d * (1 - t);
          let best = null;
          let bestScore = Infinity;
          const last = link[link.length - 1];
          for (const q of goreDots) {
            if (taken.has(q.i)) continue;
            const d = gc(phi, lam, q.phi, q.lam);
            const step = gc(last.phi, last.lam, q.phi, q.lam);
            const score = Math.abs(d - targetD) + step * 0.8;
            if (score < bestScore) { bestScore = score; best = q; }
          }
          if (!best) break;
          taken.add(best.i);
          link.push(best);
        }
        chains.push({ b: sd.b, link });
      }
      const hops = [];
      for (const ch of chains) {
        for (let hIdx = 0; hIdx < ch.link.length; hIdx++) {
          hops.push({
            from: ch.link[hIdx],
            to: hIdx + 1 < ch.link.length ? ch.link[hIdx + 1] : { phi, lam, isPill: true },
            seq: hIdx, of: ch.link.length,
          });
        }
      }
      // ONE path per side for all of a technique's hops
      const mkChain = (parent) => parent.appendChild(el("path", {
        fill: "none", stroke: n.lineColor, "stroke-width": G.arcWidth,
        "stroke-linecap": "round", "stroke-linejoin": "round", opacity: 0,
      }));
      orbit.push({ g, phi, lam, i, hops, halfW, shiftX: 0, chainBack: mkChain(Lb.chains), chainFront: mkChain(Lf.chains), side: "front" });
    }

    goreGeom = { G, R, Rf, cx, cy, morph, ballAt, orbit, latMax, Lb, Lf, halos };
    armDrag();
  }

  // ── turning it by hand ──────────────────────────────────────────────────
  // The drag is an OFFSET on top of the scroll's own rotation — both axes,
  // with a little inertia when it is let go — and it settles back to zero,
  // so the ball is never left somewhere the scroll did not put it. The same
  // rule `sphere.js` follows in the hero.
  let dragSpin = 0;
  let dragTilt = 0;
  let velSpin = 0;
  let velTilt = 0;
  let dragging = false;
  let lastPX = 0;
  let lastPY = 0;
  let dragArmed = false;
  function armDrag() {
    if (dragArmed) return;
    dragArmed = true;
    const down = (e) => {
      if (cfg.variant !== 4 || !N().globe.drag) return;
      dragging = true;
      velSpin = 0; velTilt = 0;
      lastPX = e.clientX; lastPY = e.clientY;
      mount.setPointerCapture?.(e.pointerId);
      mount.classList.add("is-grabbing");
    };
    const move = (e) => {
      if (!dragging) return;
      const G = N().globe;
      const ds = (e.clientX - lastPX) * rad(G.dragSpeed);
      const dt = -(e.clientY - lastPY) * rad(G.dragTilt ?? 0.18);
      dragSpin += ds; dragTilt += dt;
      velSpin = ds; velTilt = dt;
      lastPX = e.clientX; lastPY = e.clientY;
      e.preventDefault();
    };
    const up = (e) => {
      dragging = false;
      mount.releasePointerCapture?.(e.pointerId);
      mount.classList.remove("is-grabbing");
    };
    mount.addEventListener("pointerdown", down);
    mount.addEventListener("pointermove", move);
    mount.addEventListener("pointerup", up);
    mount.addEventListener("pointercancel", up);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // V4's FIRST proposal — THE BRAID. Three strands, plaited into one answer.
  //
  // Strand k is a sine wave in y, the three of them 120° apart in phase:
  //
  //     angle(t) = 2π·t·twists + k·2π/3
  //     y_k(t)   = cy + A(t)·cos(angle)      A(t) closes toward the right
  //     z_k(t)   = sin(angle)                > 0 is in FRONT
  //
  // Winding three phase-shifted waves around one axis IS a three-strand
  // plait, and `z` is what makes it read as one: every strand is painted as
  // short segments, all of them sorted back-to-front, so a strand passing
  // behind is really drawn under the one in front and dimmed by `backAlpha`.
  // Without that they are just three crossing lines.
  //
  // It draws itself on left to right — each segment carries its own `t`, and
  // its opacity is a soft leading edge swept by its strand's own ramp, so the
  // whole thing is a pure function of the scroll and un-draws coming back up.
  // ═══════════════════════════════════════════════════════════════════════
  const STRANDS = ["Reporting from users", "Reporting from therapists", "Clinical research"];

  function layoutBraid(n) {
    const B = n.braid;
    const padX = (Math.max(0, B.padX) / 100) * w;
    const x0 = padX;
    const x1 = w - padX;
    const cy = h / 2;
    const amp0 = (Math.max(1, B.spread) / 100) * h;
    const conv = Math.max(0, Math.min(1, B.converge));
    const TAU = Math.PI * 2;

    const ampAt = (t) => amp0 * (1 - conv * t);
    const angleAt = (t, k) => TAU * t * B.twists + (k * TAU) / 3 + rad(B.phase ?? -90);
    const at = (t, k) => {
      const a = angleAt(t, k);
      return {
        x: x0 + t * (x1 - x0),
        y: cy + ampAt(t) * Math.cos(a),
        z: Math.sin(a),
        depth: 1,
      };
    };

    // ── the three strands, as segments, all sorted back to front ──────────
    const segN = Math.max(6, Math.round(B.segments));
    const segs = [];
    for (let k = 0; k < 3; k++) {
      for (let i = 0; i < segN; i++) {
        const t0 = i / segN;
        const t1 = (i + 1) / segN;
        const a = at(t0, k);
        const b = at(t1, k);
        const zm = (a.z + b.z) / 2;
        segs.push({ k, t: t0, a, b, z: zm });
      }
    }
    segs.sort((p, q) => p.z - q.z);
    for (const sg of segs) {
      // a quadratic through the midpoint keeps the join smooth at this count
      const mt = (sg.t + 1 / segN / 2);
      const m = at(Math.min(1, mt), sg.k);
      const path = el("path", {
        d: `M ${sg.a.x.toFixed(1)} ${sg.a.y.toFixed(1)} Q ${m.x.toFixed(1)} ${m.y.toFixed(1)} ${sg.b.x.toFixed(1)} ${sg.b.y.toFixed(1)}`,
        fill: "none",
        stroke: n.lineColor,
        "stroke-width": (B.lineWidth * (sg.z > 0 ? 1 : 0.8)).toFixed(2),
        "stroke-linecap": "round",
        opacity: 0,
      });
      svg.appendChild(path);
      braidSegs.push({ el: path, k: sg.k, t: sg.t, front: sg.z > 0 });
    }

    // ── what each strand carries ──────────────────────────────────────────
    // A bead only ever sits where its own strand is at the FRONT, so a photo
    // is never half-covered by a line crossing over it.
    // Evenly spread along the strand FIRST, then each one walks to the
    // nearest place its own strand is in front. Filtering a list of
    // front-facing t values instead would bunch them wherever the winding
    // happens to face forward, which is not where the eye wants them.
    const beadsN = Math.max(1, Math.round(B.beads));
    const frontTs = (k) => Array.from({ length: beadsN }, (_, i) => {
      const t = 0.12 + (beadsN === 1 ? 0.3 : (i / (beadsN - 1)) * 0.7);
      if (at(t, k).z > B.beadFront) return t;
      let best = t;
      let bestZ = at(t, k).z;
      for (let d = 1; d <= 80; d++) {
        for (const sgn of [-1, 1]) {
          const tt = Math.min(0.94, Math.max(0.05, t + sgn * d * 0.004));
          const z = at(tt, k).z;
          if (z > bestZ) { bestZ = z; best = tt; }
        }
        if (bestZ > B.beadFront) break;
      }
      return best;
    });

    const userMedia = ringMedia("people");
    const teacherMedia = ringMedia("teachers");
    const techLabels = Object.keys(TECHNIQUES);

    frontTs(0).forEach((t, i) => {
      const pt = at(t, 0);
      const src = userMedia[i % Math.max(1, userMedia.length)]?.image;
      const group = photo(pt, n.dotUser, src, clipId("p", i));
      svg.appendChild(group);
      people[i] = { i, pt, group, idx: i };
    });
    frontTs(1).forEach((t, i) => {
      const pt = at(t, 1);
      const src = teacherMedia[i % Math.max(1, teacherMedia.length)]?.image;
      const group = photo(pt, n.dotTeacher, src, clipId("t", i));
      svg.appendChild(group);
      teachers[i] = { i, pt, group, idx: i };
    });
    // The pills all ride ONE strand, so two whose `t` landed close can
    // overlap. They are separated along Y — which keeps each one beside the
    // point of the strand it belongs to — before a single one is drawn.
    const pillTs = frontTs(2);
    const pillAnchors = pillTs.map((t, i) => {
      const pt = at(t, 2);
      const label = techLabels[i % Math.max(1, techLabels.length)] || "Practice";
      const half = label.length * n.pill.fontSize * 0.32 + n.pill.padX + 4;
      return { x: Math.min(Math.max(pt.x, half), w - half), y: pt.y, hw: half, label };
    });
    const pillH = n.pill.h + 6;
    for (let pass = 0; pass < 6; pass++) {
      for (let i = 0; i < pillAnchors.length; i++) {
        for (let j = i + 1; j < pillAnchors.length; j++) {
          const a = pillAnchors[i], c = pillAnchors[j];
          if (Math.abs(a.x - c.x) > a.hw + c.hw) continue;
          const dy = c.y - a.y;
          const need = pillH - Math.abs(dy);
          if (need <= 0) continue;
          const push = (need / 2 + 0.5) * (dy < 0 ? -1 : 1);
          a.y -= push; c.y += push;
        }
      }
    }
    pillAnchors.forEach((a, i) => {
      a.y = Math.min(Math.max(a.y, pillH / 2), h - pillH / 2);
      const { g } = pill({ x: a.x, y: a.y }, a.label, n.pill);
      techniques[i] = { i, pt: { x: a.x, y: a.y }, pillGroup: g, label: a.label, idx: i };
    });

    // ── the node the three converge into, and the three names ─────────────
    const end = at(1, 0);
    const endY = (at(1, 0).y + at(1, 1).y + at(1, 2).y) / 3;
    const node = el("circle", {
      cx: end.x.toFixed(1), cy: endY.toFixed(1), r: Math.max(2, B.outcome / 2),
      fill: n.lineColor, opacity: 0,
    });
    svg.appendChild(node);
    braidBits.push({ el: node, step: 2, kind: "node" });

    if (B.labels !== false) {
      for (let k = 0; k < 3; k++) {
        const p0 = at(0, k);
        const tx = el("text", {
          x: (p0.x + 12).toFixed(1), y: (p0.y - 13).toFixed(1),
          "font-family": "var(--ui)", "font-size": B.labelSize,
          fill: n.lineColor, opacity: 0,
          // the strands pass right where these sit, so each one carries its
          // own halo: a fat white stroke painted UNDER the glyphs
          stroke: "#ffffff", "stroke-width": 3.5, "stroke-linejoin": "round",
          "paint-order": "stroke fill",
        });
        tx.textContent = STRANDS[k];
        svg.appendChild(tx);
        braidBits.push({ el: tx, step: k, kind: "label" });
      }
    }
  }

  function layoutDisc(n) {
    const D = n.disc;
    const peopleN = Math.max(0, Math.round(n.peopleCount));
    const teacherN = Math.max(0, Math.round(n.teacherCount));
    // ONE pill per therapist — the chain is 1:1:1, which is the point
    const techN = teacherN;
    const total = Math.max(1, peopleN + teacherN + techN);

    const short = Math.min(w, h);
    const origin = { x: ((D.centerX ?? n.centerX) / 100) * w, y: ((D.centerY ?? n.centerY) / 100) * h };
    const R = (Math.max(1, D.radius) / 100) * short;
    const spin = rad(D.rotate);
    discOrigin = origin;

    const at = (i) => {
      const th = i * GOLDEN + spin;
      const r = R * Math.sqrt((i + 0.5) / total);
      return { x: origin.x + Math.cos(th) * r, y: origin.y + Math.sin(th) * r, r, depth: 1, z: 0 };
    };
    const pts = Array.from({ length: total }, (_, i) => at(i));
    // the clean boundary between two bands, which is where a ring is drawn
    const edge = (i) => R * Math.sqrt(i / total);

    const userMedia = ringMedia("people");
    const teacherMedia = ringMedia("teachers");
    const techLabels = Object.keys(TECHNIQUES);

    // ── the rings first: they are the ground the rest grows on ───────────
    for (const [i, rr] of [edge(peopleN), edge(peopleN + teacherN), R].entries()) {
      const c = el("circle", {
        cx: origin.x.toFixed(1), cy: origin.y.toFixed(1), r: rr.toFixed(1),
        fill: "none", stroke: D.ringColor, "stroke-width": D.ringWidth,
        opacity: 0,
      });
      svg.appendChild(c);
      const len = 2 * Math.PI * rr;
      c.setAttribute("stroke-dasharray", String(len));
      c.setAttribute("stroke-dashoffset", String(len));
      discRings.push({ el: c, len, step: Math.min(2, i) });
    }

    // ── the chains, under everything they join ───────────────────────────
    const mkLine = (a, b, width, alpha) => {
      const path = el("path", {
        d: bowedPath(a, b, origin, D.chainBow), fill: "none",
        stroke: n.lineColor, "stroke-width": width,
        "stroke-linecap": "round", opacity: alpha,
      });
      svg.appendChild(path);
      const len = path.getTotalLength();
      path.setAttribute("stroke-dasharray", String(len));
      return { path, len };
    };

    // The pills sit ON the spiral, in the outer band the last ring closes —
    // "le pills che stanno sempre tutti attorno, sempre seguendo questa
    // sezione aurea". No `pillReach` push here: that is the sphere's trick
    // for getting a pill off a vertex, and on the disc it would throw them
    // clean out of the box (the band already ends at R).
    //
    // A pill is WIDE, though, and one on the left or right extreme would
    // hang over the edge, so each is clamped into the box by its own rough
    // half-width — estimated from the label before anything is created, the
    // same way the sphere does it, so nothing has to be moved after the fact.
    const techLabelAt = (i) => techLabels[i % Math.max(1, techLabels.length)] || "Practice";
    const anchors = Array.from({ length: techN }, (_, i) => {
      const p = pts[peopleN + teacherN + i];
      const hw = techLabelAt(i).length * n.pill.fontSize * 0.32 + n.pill.padX + 4;
      const hh = n.pill.h / 2 + 3;
      return {
        x: Math.min(Math.max(p.x, hw), w - hw),
        y: Math.min(Math.max(p.y, hh), h - hh),
      };
    });

    for (let i = 0; i < Math.min(peopleN, teacherN); i++) {
      const { path, len } = mkLine(pts[i], pts[peopleN + i], n.lineWidth, n.lineAlpha);
      people[i] = { ...(people[i] || {}), lineToTeacher: path, lineLen: len };
    }
    for (let i = 0; i < techN; i++) {
      const { path, len } = mkLine(anchors[i], pts[peopleN + i], n.lineWidth * 0.85, n.lineAlpha * 0.85);
      techniques[i] = { ...(techniques[i] || {}), lineToTeacher: path, lineLen: len };
    }

    // ── and the content growing on the spiral ────────────────────────────
    for (let i = 0; i < peopleN; i++) {
      const src = userMedia[i % Math.max(1, userMedia.length)]?.image;
      const group = photo(pts[i], D.dotUser ?? n.dotUser, src, clipId("p", i));
      svg.appendChild(group);
      people[i] = { ...(people[i] || {}), i, pt: pts[i], group, idx: i };
    }
    for (let i = 0; i < teacherN; i++) {
      const src = teacherMedia[i % Math.max(1, teacherMedia.length)]?.image;
      const group = photo(pts[peopleN + i], D.dotTeacher ?? n.dotTeacher, src, clipId("t", i));
      svg.appendChild(group);
      teachers[i] = { ...(teachers[i] || {}), i, pt: pts[peopleN + i], group, idx: peopleN + i };
    }
    for (let i = 0; i < techN; i++) {
      const { g } = pill(anchors[i], techLabelAt(i), n.pill);
      techniques[i] = {
        ...(techniques[i] || {}), i, pt: anchors[i], pillGroup: g,
        label: techLabelAt(i), idx: peopleN + teacherN + i,
      };
    }
  }

  function layout() {
    w = mount.clientWidth || 1;
    h = mount.clientHeight || 1;
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    clear();

    const n = N();
    // V3 is a flat golden-angle disc and V4 a braid — both whole other layouts
    if (cfg.variant === 4) return layoutGlobe(n);
    if (cfg.variant === 3) return layoutDisc(n);
    const total = Math.max(1, Math.round(n.fieldCount));
    const peopleN = Math.max(0, Math.round(n.peopleCount));
    const teacherN = Math.max(0, Math.round(n.teacherCount));
    const techN = Math.max(0, Math.round(n.techniqueCount));

    const raw = fibonacciSphere(total).map((p) => orient(p, rad(n.tiltX), rad(n.rotateY)));
    const short = Math.min(w, h);
    const origin = { x: (n.centerX / 100) * w, y: (n.centerY / 100) * h };
    const R = (n.radius / 100) * short;
    const depthOf = (z) => lerp(1 - clamp01(n.perspective), 1, (z + 1) / 2);
    const screen = (p) => ({ x: origin.x + p.x * R, y: origin.y + p.y * R, z: p.z, depth: depthOf(p.z) });

    const used = new Set();
    const peopleIdx = pickRole(total, peopleN, used);
    const teacherIdx = pickRole(total, teacherN, used);
    const techIdx = pickRole(total, techN, used);

    const userMedia = ringMedia("people");
    const teacherMedia = ringMedia("teachers");
    const techLabels = Object.keys(TECHNIQUES);

    // The technique anchors, resolved BEFORE anything is drawn: two nearby
    // vertices can project to almost the same spot once pushed out by
    // `pillReach`, and two pills sharing a spot is exactly the "porcata" this
    // whole vertex-assignment idea was meant to avoid. A few passes of plain
    // AABB separation, using the label's own rough width, settle that before
    // a single element exists — moving a pill after it is already on screen
    // would read as a jump, so this has to happen first.
    const reach = 1 + Math.max(0, n.pillReach - 1);
    const techAnchors = techIdx.map((idx) => ({
      x: origin.x + raw[idx].x * R * reach,
      y: origin.y + raw[idx].y * R * reach,
    }));
    const techHalf = techIdx.map((idx, i) => {
      const label = techLabels[i % Math.max(1, techLabels.length)] || "Practice";
      return { hw: label.length * n.pill.fontSize * 0.32 + n.pill.padX + 4, hh: n.pill.h / 2 + 3 };
    });
    for (let pass = 0; pass < 8; pass++) {
      for (let i = 0; i < techAnchors.length; i++) {
        for (let j = i + 1; j < techAnchors.length; j++) {
          const a = techAnchors[i], b = techAnchors[j];
          const dx = b.x - a.x, dy = b.y - a.y;
          const ox = techHalf[i].hw + techHalf[j].hw - Math.abs(dx);
          const oy = techHalf[i].hh + techHalf[j].hh - Math.abs(dy);
          if (ox <= 0 || oy <= 0) continue;
          if (ox < oy) {
            const push = ox / 2 + 0.5;
            const s = dx < 0 ? -1 : 1;
            a.x -= push * s; b.x += push * s;
          } else {
            const push = oy / 2 + 0.5;
            const s = dy < 0 ? -1 : 1;
            a.y -= push * s; b.y += push * s;
          }
        }
      }
    }

    // ...and, whatever the separation above did, a pill can never be pushed
    // OUTSIDE the box itself — a near-polar vertex reached out by `pillReach`
    // can otherwise clear the top or a side edge entirely. This is the same
    // "never leaves the frame it lives in" floor `ring.js`'s `minRadius`
    // enforces on the 3D side, just in 2D.
    for (let i = 0; i < techAnchors.length; i++) {
      const a = techAnchors[i], half = techHalf[i];
      a.x = Math.min(Math.max(a.x, half.hw), w - half.hw);
      a.y = Math.min(Math.max(a.y, half.hh), h - half.hh);
    }

    // ── every element, tagged with a z to sort back-to-front ────────────────
    const items = [];

    // an assigned vertex still shows through faintly under its photo/pill —
    // that IS the "this dot became something" read — so nothing is skipped.
    for (let idx = 0; idx < total; idx++) {
      const pt = screen(raw[idx]);
      items.push({ kind: "field", idx, pt, z: pt.z });
    }
    peopleIdx.forEach((idx, i) => items.push({ kind: "person", idx, i, pt: screen(raw[idx]), z: raw[idx].z }));
    teacherIdx.forEach((idx, i) => items.push({ kind: "teacher", idx, i, pt: screen(raw[idx]), z: raw[idx].z }));
    techIdx.forEach((idx, i) => items.push({ kind: "technique", idx, i, pt: screen(raw[idx]), z: raw[idx].z }));

    // lines carry the AVERAGE z of their two ends
    const pairN = Math.min(peopleN, teacherN);
    for (let i = 0; i < pairN; i++) {
      const a = raw[peopleIdx[i]], b = raw[teacherIdx[i]];
      items.push({ kind: "lineUT", i, z: (a.z + b.z) / 2 });
    }
    const techPairs = techIdx.map((idx) => nearest(idx, teacherIdx.length ? teacherIdx : [idx], raw));
    techIdx.forEach((idx, i) => {
      const a = raw[idx], b = raw[techPairs[i]];
      items.push({ kind: "lineTTech", i, z: (a.z + b.z) / 2 });
    });

    items.sort((a, b) => a.z - b.z); // back → front

    // one pass, in the z-sorted order already decided — DOM order IS paint
    // order in SVG, which is the whole reason the sort happened up front.
    for (const it of items) {
      if (it.kind === "field") {
        const p = it.pt;
        const r = Math.max(0.5, (n.dotField / 2) * lerp(0.55, 1, p.depth));
        const dot = el("circle", {
          cx: p.x.toFixed(1), cy: p.y.toFixed(1), r: r.toFixed(2),
          fill: n.fieldColor,
        });
        svg.appendChild(dot);
        field.push({ dot, z: it.z, depth: p.depth });
      } else if (it.kind === "lineUT") {
        const a = screen(raw[peopleIdx[it.i]]);
        const b = screen(raw[teacherIdx[it.i]]);
        const path = el("path", {
          d: bowedPath(a, b, origin, n.bow), fill: "none",
          stroke: n.lineColor, "stroke-width": n.lineWidth,
          "stroke-linecap": "round", opacity: n.lineAlpha,
        });
        svg.appendChild(path);
        const len = path.getTotalLength();
        path.setAttribute("stroke-dasharray", String(len));
        people[it.i] = people[it.i] || {};
        people[it.i].lineToTeacher = path;
        people[it.i].lineLen = len;
      } else if (it.kind === "lineTTech") {
        // ends AT the pill's real (possibly nudged-apart) anchor, not the
        // raw vertex projection it started from — otherwise a relaxed pill
        // would visibly detach from the line pointing at it
        const a = techAnchors[it.i];
        const b = screen(raw[techPairs[it.i]]);
        const path = el("path", {
          d: bowedPath(a, b, origin, n.bow), fill: "none",
          stroke: n.lineColor, "stroke-width": n.lineWidth * 0.85,
          "stroke-linecap": "round", opacity: n.lineAlpha * 0.85,
        });
        svg.appendChild(path);
        const len = path.getTotalLength();
        path.setAttribute("stroke-dasharray", String(len));
        techniques[it.i] = techniques[it.i] || {};
        techniques[it.i].lineToTeacher = path;
        techniques[it.i].lineLen = len;
      } else if (it.kind === "person") {
        const src = userMedia[it.i % Math.max(1, userMedia.length)]?.image;
        const size = n.dotUser * lerp(0.75, 1, it.pt.depth);
        const group = photo(it.pt, size, src, clipId("p", it.i));
        svg.appendChild(group);
        people[it.i] = { ...(people[it.i] || {}), i: it.i, pt: it.pt, group, idx: it.idx };
      } else if (it.kind === "teacher") {
        const src = teacherMedia[it.i % Math.max(1, teacherMedia.length)]?.image;
        const size = n.dotTeacher * lerp(0.75, 1, it.pt.depth);
        const group = photo(it.pt, size, src, clipId("t", it.i));
        svg.appendChild(group);
        teachers[it.i] = { ...(teachers[it.i] || {}), i: it.i, pt: it.pt, group, idx: it.idx };
      } else if (it.kind === "technique") {
        const label = techLabels[it.i % Math.max(1, techLabels.length)] || "Practice";
        const anchor = techAnchors[it.i];
        const P = n.pill;
        const text = el("text", {
          x: anchor.x, y: anchor.y, "text-anchor": "middle", "dominant-baseline": "central",
          "font-family": "var(--ui)", "font-size": P.fontSize, fill: P.ink,
        });
        text.textContent = label;
        svg.appendChild(text);
        const tw = text.getBBox().width;
        const pw = tw + P.padX * 2;
        const rect = el("rect", {
          x: anchor.x - pw / 2, y: anchor.y - P.h / 2, width: pw, height: P.h,
          rx: P.h / 2, ry: P.h / 2, fill: P.bg,
        });
        svg.insertBefore(rect, text);
        const pillGroup = el("g");
        svg.appendChild(pillGroup);
        pillGroup.appendChild(rect);
        pillGroup.appendChild(text);
        techniques[it.i] = { ...(techniques[it.i] || {}), i: it.i, pt: anchor, pillGroup, label, idx: it.idx };
      }
    }
  }

  /** `tl` — the pinned clock. `tl.ev[0..2]` are the three evidence-row ramps
      this whole diagram rides. Pure scrub: no state, always reversible. */
  function update(tl) {
    if (!N().show || mount.hidden) return;
    // it is called every frame of the WHOLE page's scroll, not just its own
    // section's — a hard skip once its own box is off screen (the hero, the
    // ring act) saves writing ~100 SVG attributes for nothing every frame
    const r = mount.getBoundingClientRect();
    if (r.bottom <= 0 || r.top >= window.innerHeight) return;
    const n = N();
    const ev = tl?.ev || [0, 0, 0];
    const scaleAbout = (p, s) =>
      `translate(${p.x} ${p.y}) scale(${Math.max(0.001, s)}) translate(${-p.x} ${-p.y})`;

    // V3: the two discs' own rings draw themselves ON as you scroll, in a
    // very light grey, BEFORE anything grows on them — the ground the
    // content arrives onto. Pure scrub, so coming back up they un-draw.
    if (discRings.length) {
      const D = n.disc;
      for (const rg of discRings) {
        const prog = clamp01((ev[rg.step] ?? 0) / Math.max(0.05, D.ringIn));
        rg.el.setAttribute("stroke-dashoffset", (rg.len * (1 - prog)).toFixed(1));
        rg.el.setAttribute("opacity", (prog * D.ringAlpha).toFixed(3));
      }
    }

    // ── V4: the contours, inflated ────────────────────────────────────
    // HIS order: the techniques first, then the dots with the circles, then
    // the world. Everything below is a pure function of the three ramps
    // plus a drag offset that decays to zero.
    if (goreLayers && goreGeom) {
      const g0 = goreGeom;
      const G = g0.G;
      const e0 = clamp01(ev[0] ?? 0);
      const e1 = clamp01(ev[1] ?? 0);
      const e2 = clamp01(ev[2] ?? 0);
      const fold = smoothIO(clamp01(e2 / Math.max(0.2, G.foldOver)));
      if (!dragging) {
        // a fling keeps turning, then everything settles home
        dragSpin += velSpin; dragTilt += velTilt;
        velSpin *= G.inertia ?? 0.9; velTilt *= G.inertia ?? 0.9;
        const rc = 1 - Math.min(0.5, G.recenter);
        dragSpin *= rc; dragTilt *= rc;
      }
      const spin = rad(G.spin) * fold + dragSpin * fold;
      const tiltOff = dragTilt * fold;
      mount.classList.toggle("is-world", fold > 0.5 && !!G.drag);

      // the rings, each split at the horizon so the far half is dimmer
      for (const rg of gorePaths) {
        const prog = branchProgress(e1, rg.j, gorePaths.length, G.ringIn);
        let dF = "", dB = "";
        if (prog > 0.001) {
          const nS = rg.samples;
          let prevFront = null;
          for (let i = 0; i <= nS; i++) {
            const lam = -Math.PI + (i / nS) * Math.PI * 2;
            const p = g0.morph(rg.phi, lam, fold, spin, tiltOff);
            const front = fold < 0.02 || p.z >= 0;
            const seg = `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
            if (front) dF += (prevFront === true ? "L" : "M") + seg;
            else dB += (prevFront === false ? "L" : "M") + seg;
            prevFront = front;
          }
        }
        if (dF !== rg.lf) { rg.lf = dF; rg.front.setAttribute("d", dF); }
        if (dB !== rg.lb) { rg.lb = dB; rg.back.setAttribute("d", dB); }
        const aF = (prog * G.ringAlpha).toFixed(3);
        const aB = (prog * G.ringAlpha * (fold > 0.02 ? G.backAlpha / G.ringAlpha * 0.9 : 1)).toFixed(3);
        if (aF !== rg.laf) { rg.laf = aF; rg.front.setAttribute("opacity", aF); }
        if (aB !== rg.lab) { rg.lab = aB; rg.back.setAttribute("opacity", aB); }
      }

      // the chains first, because they decide which vertices are lit
      for (const p of goreDots) p.lit = 0;
      const oIn = clamp01((e0 - G.pillIn) / Math.max(0.05, 1 - G.pillIn));
      for (const o of g0.orbit) {
        let dF = "", dB = "";
        if (fold > 0.05) {
          const nS = Math.max(4, Math.round(G.arcSamples));
          for (const hop of o.hops) {
            const hp = branchProgress(e2, hop.seq, hop.of + 1, 0.55);
            if (hp <= 0.02) continue;
            hop.from.lit = Math.max(hop.from.lit, hp);
            if (!hop.to.isPill) hop.to.lit = Math.max(hop.to.lit, clamp01((hp - 0.6) / 0.4));
            let dl = hop.to.lam - hop.from.lam;
            if (dl > Math.PI) dl -= Math.PI * 2;
            if (dl < -Math.PI) dl += Math.PI * 2;
            const end = Math.max(0.02, hp);
            // into the technique itself the hop climbs off the surface up to
            // the orbit, so the line arrives AT the pill rather than under it
            let prevFront = null;
            for (let i = 0; i <= nS; i++) {
              const t = (i / nS) * end;
              const ph = hop.from.phi + (hop.to.phi - hop.from.phi) * t;
              const lm = hop.from.lam + dl * t;
              const sc = hop.to.isPill ? 1 + (G.pillOrbit - 1) * t * t : 1;
              const pt = g0.morph(ph, lm, fold, spin, tiltOff, sc);
              // ...and if the pill had to be held inside the frame, the last
              // hop bends with it so the line still arrives AT the label
              const px = pt.x + (hop.to.isPill ? o.shiftX * t * t : 0);
              const front = pt.z >= 0;
              const seg = `${px.toFixed(1)},${pt.y.toFixed(1)}`;
              if (front) dF += (prevFront === true ? "L" : "M") + seg;
              else dB += (prevFront === false ? "L" : "M") + seg;
              prevFront = front;
            }
          }
        }
        if (dF !== o.lcf) { o.lcf = dF; o.chainFront.setAttribute("d", dF); }
        if (dB !== o.lcb) { o.lcb = dB; o.chainBack.setAttribute("d", dB); }
        const aF = (G.arcAlpha * fold).toFixed(3);
        const aB = (G.arcAlpha * fold * (G.backAlpha / Math.max(0.05, G.arcAlpha)) * 1.4).toFixed(3);
        if (aF !== o.laf) { o.laf = aF; o.chainFront.setAttribute("opacity", aF); }
        if (aB !== o.lab) { o.lab = aB; o.chainBack.setAttribute("opacity", aB); }

        // the technique itself: flat on the map first, carried into orbit by
        // the fold, scaled by perspective, and moved behind the ball's near
        // side when it swings round the back
        const prog = branchProgress(oIn, o.i, g0.orbit.length, 0.5);
        const at = g0.morph(o.phi, o.lam, fold, spin, tiltOff, G.pillOrbit);
        const behind = fold > 0.02 && at.z < 0;
        const depthK = at.k * (behind ? lerp(1, G.pillBackScale ?? 0.84, Math.min(1, -at.z)) : 1);
        const sc = backOut(prog) * depthK;
        // a label at the limb, pushed out to the orbit and grown by the
        // perspective, can reach past the frame — it is held inside by its
        // own half width, and the chain's last hop follows it (see above)
        const hw = o.halfW * sc + 6;
        const cxp = Math.min(Math.max(at.x, hw), w - hw);
        o.shiftX = cxp - at.x;
        o.g.setAttribute(
          "transform",
          `translate(${cxp.toFixed(1)} ${at.y.toFixed(1)}) scale(${Math.max(0.001, sc).toFixed(3)}) translate(${(-g0.cx).toFixed(1)} ${(-g0.cy).toFixed(1)})`
        );
        const dim = behind ? lerp(1, 0.3, Math.min(1, -at.z * 1.5)) : 1;
        const oa = (clamp01(prog / 0.4) * dim).toFixed(3);
        if (oa !== o.loa) { o.loa = oa; o.g.setAttribute("opacity", oa); }
        const side = behind ? "back" : "front";
        if (side !== o.side) {
          o.side = side;
          (behind ? g0.Lb : g0.Lf).pills.appendChild(o.g);
        }
      }

      // the vertices — six buckets, three weights × near/far — sized by
      // perspective, plus a halo on every one a chain has reached
      const dBack = ["", "", ""];
      const dFront = ["", "", ""];
      let hF = "", hB = "";
      const rOf = [G.dot, G.dotMid, G.dotBig];
      for (const p of goreDots) {
        const grow = branchProgress(e1, Math.round(p.q * 100), 101, G.stagger);
        if (grow <= 0.001) continue;
        const pt = g0.morph(p.phi, p.lam, fold, spin, tiltOff);
        const r = rOf[p.tier] * backOut(grow) * pt.k;
        const behind = fold > 0.02 && pt.z < 0;
        (behind ? dBack : dFront)[p.tier] += circleD(pt.x, pt.y, r);
        if (G.halo && p.lit > 0.02) {
          const hr = (G.haloR ?? 6) * pt.k * backOut(p.lit);
          (behind ? (hB += circleD(pt.x, pt.y, hr)) : (hF += circleD(pt.x, pt.y, hr)));
        }
      }
      for (const L of goreLayers) {
        const back = dBack[L.tier];
        const front = dFront[L.tier];
        if (back !== L.lb) { L.lb = back; L.back.setAttribute("d", back); }
        if (front !== L.lf) { L.lf = front; L.front.setAttribute("d", front); }
        const ab = (e1 > 0 ? G.backAlpha : 0).toFixed(3);
        const af = (e1 > 0 ? G.dotAlpha : 0).toFixed(3);
        if (ab !== L.lab) { L.lab = ab; L.back.setAttribute("opacity", ab); }
        if (af !== L.laf) { L.laf = af; L.front.setAttribute("opacity", af); }
      }
      if (hF !== g0.halos.lf) { g0.halos.lf = hF; g0.halos.front.setAttribute("d", hF); }
      if (hB !== g0.halos.lb) { g0.halos.lb = hB; g0.halos.back.setAttribute("d", hB); }
      const ha = (G.haloAlpha ?? 0.7) * fold;
      g0.halos.front.setAttribute("opacity", ha.toFixed(3));
      g0.halos.back.setAttribute("opacity", (ha * G.backAlpha * 2).toFixed(3));
    }

    // V4's first proposal, the braid: each strand draws itself on left to
    // V4's first proposal, the braid: each strand draws itself on left to
    // soft leading edge swept across its `t`. A segment that passes BEHIND
    // another strand is dimmed, which is what makes the plait read as one
    // object rather than three crossing lines.
    if (braidSegs.length) {
      const B = n.braid;
      const f = Math.max(0.02, B.feather);
      for (const sg of braidSegs) {
        const ramp = clamp01(ev[sg.k] ?? 0);
        const a = clamp01((ramp * (1 + f) - sg.t) / f) * (sg.front ? 1 : B.backAlpha);
        const v = a.toFixed(3);
        if (v !== sg.lv) { sg.lv = v; sg.el.setAttribute("opacity", v); }
      }
      for (const bit of braidBits) {
        const ramp = clamp01(ev[bit.step] ?? 0);
        const a = bit.kind === "node"
          ? clamp01((ramp - 0.72) / 0.28)
          : clamp01(ramp / 0.22) * 0.55;
        const v = a.toFixed(3);
        if (v !== bit.lv) { bit.lv = v; bit.el.setAttribute("opacity", v); }
      }
    }

    // the field: appears together, fast, right at the start — it is the
    // ground everything else gets assigned OUT of, not a beat of its own
    const fieldA = clamp01(ev[0] / Math.max(0.02, n.fieldIn));
    for (const f of field) {
      f.dot.setAttribute("opacity", (fieldA * n.fieldAlpha * lerp(0.5, 1, f.depth)).toFixed(3));
    }

    const peopleN = people.length;
    for (let i = 0; i < peopleN; i++) {
      const p = people[i];
      if (!p || !p.group) continue;
      const prog = branchProgress(ev[0], i, peopleN, n.stagger);
      const s = backOut(prog);
      p.group.setAttribute("transform", scaleAbout(p.pt, s));
      p.group.setAttribute("opacity", clamp01(prog / 0.4).toFixed(3));
      p.lastProg = prog;
    }

    const teacherN = teachers.length;
    for (let i = 0; i < teacherN; i++) {
      const t = teachers[i];
      if (!t || !t.group) continue;
      const prog = branchProgress(ev[1], i, teacherN, n.stagger);
      const s = backOut(prog);
      t.group.setAttribute("transform", scaleAbout(t.pt, s));
      t.group.setAttribute("opacity", clamp01(prog / 0.4).toFixed(3));
      const p = people[i];
      if (p?.lineToTeacher) {
        p.lineToTeacher.setAttribute("stroke-dashoffset", String(p.lineLen * (1 - prog)));
        p.lineToTeacher.style.opacity = prog > 0.02 ? "" : "0";
      }
    }

    const techN = techniques.length;
    for (let i = 0; i < techN; i++) {
      const tq = techniques[i];
      if (!tq || !tq.pillGroup) continue;
      const prog = branchProgress(ev[2], i, techN, n.stagger);
      const s = backOut(prog);
      tq.pillGroup.setAttribute("transform", scaleAbout(tq.pt, s));
      tq.pillGroup.setAttribute("opacity", clamp01(prog / 0.4).toFixed(3));
      if (tq.lineToTeacher) {
        tq.lineToTeacher.setAttribute("stroke-dashoffset", String(tq.lineLen * (1 - prog)));
        tq.lineToTeacher.style.opacity = prog > 0.02 ? "" : "0";
      }
    }
  }

  function style() {
    const on = !!cfg.v2.on && !!N().show;
    mount.hidden = !on;
    if (on) layout();
  }

  style();

  return {
    style,
    update,
    resize: layout,
    /** is IT the thing actually occupying the corner right now? */
    get show() { return !!cfg.v2.on && !!N().show; },
    /** what is actually on screen right now, for the assertions */
    probe() {
      const originX = discOrigin ? discOrigin.x : (N().centerX / 100) * w;
      const originY = discOrigin ? discOrigin.y : (N().centerY / 100) * h;
      const rOf = (p) => (p ? Math.hypot(p.pt.x - originX, p.pt.y - originY) : 0);
      return {
        show: N().show,
        field: { count: field.length, alpha: field.length ? +field[0].dot.getAttribute("opacity") : 0 },
        // V4 — the globe: the flat sheet, the vertices, and the fold
        globe: {
          on: cfg.variant === 4,
          rings: gorePaths.length,
          dots: goreDots.length,
          tiers: [0, 1, 2].map((t) => goreDots.filter((p) => p.tier === t).length),
          layers: goreLayers ? goreLayers.length * 2 : 0,
          // the flat state is an azimuthal disc, so it is ROUND — measured
          // off the vertices themselves, not asserted from the config
          flatBox: (() => {
            if (!goreDots.length) return null;
            const xs = goreDots.map((p) => p.flat.x);
            const ys = goreDots.map((p) => p.flat.y);
            return {
              w: Math.round(Math.max(...xs) - Math.min(...xs)),
              h: Math.round(Math.max(...ys) - Math.min(...ys)),
            };
          })(),
          sphereR: goreGeom ? Math.round(goreGeom.R) : 0,
          // the flat rings are evenly spaced, which is what an azimuthal
          // equidistant projection of even latitudes has to give
          ringGaps: (() => {
            if (!goreGeom) return [];
            const rr = gorePaths.map((g) =>
              (goreGeom.Rf * (Math.PI / 2 - g.phi)) / (Math.PI / 2 + goreGeom.latMax));
            return rr.slice(1).map((v, i) => +(v - rr[i]).toFixed(2));
          })(),
          ringAlpha: gorePaths.length
            ? +(gorePaths.reduce((t, g) => t + (+(g.front || g.el).getAttribute("opacity") || 0), 0) / gorePaths.length).toFixed(3)
            : 0,
          pillsOn: goreGeom
            ? goreGeom.orbit.filter((o) => +o.g.getAttribute("opacity") > 0.5).length : 0,
          orbit: goreGeom ? goreGeom.orbit.length : 0,
          arcs: goreGeom ? goreGeom.orbit.reduce((t, o) => t + (o.hops ? o.hops.length : 0), 0) : 0,
          chains: goreGeom ? goreGeom.orbit.reduce((t, o) => t + (o.hops ? o.hops.filter((h) => h.seq === 0).length : 0), 0) : 0,
          lit: goreDots.filter((p) => p.lit > 0.5).length,
          persp: goreGeom ? goreGeom.G.perspective : 0,
          drag: +dragSpin.toFixed(4),
          dragTilt: +dragTilt.toFixed(4),
          drawn: goreLayers
            ? goreLayers.reduce((t, L) =>
                t + ((L.front.getAttribute("d") || "").match(/M/g) || []).length +
                    ((L.back.getAttribute("d") || "").match(/M/g) || []).length, 0)
            : 0,
          behind: goreLayers
            ? goreLayers.reduce((t, L) => t + ((L.back.getAttribute("d") || "").match(/M/g) || []).length, 0)
            : 0,
        },
        // V4's first proposal — the braid: the three strands, and whether it
        // goes over AND under (both z signs present on every strand)
        braid: {
          on: cfg.variant === 4,
          segs: braidSegs.length,
          front: braidSegs.filter((x) => x.front).length,
          back: braidSegs.filter((x) => !x.front).length,
          perStrand: [0, 1, 2].map((k) => ({
            front: braidSegs.filter((x) => x.k === k && x.front).length,
            back: braidSegs.filter((x) => x.k === k && !x.front).length,
          })),
          labels: braidBits.filter((b) => b.kind === "label").length,
          // it really does close up: the three strands' y at the right-hand
          // end are all but the same point
          endSpread: (() => {
            if (!braidSegs.length) return -1;
            const ys = [0, 1, 2].map((k) => {
              const last = braidSegs.filter((x) => x.k === k).sort((a, b) => b.t - a.t)[0];
              return last ? +last.el.getAttribute("d").split(" ").slice(-1)[0] : 0;
            });
            return +(Math.max(...ys) - Math.min(...ys)).toFixed(1);
          })(),
        },
        // V3 — the disc: no field at all, three rings, and the three bands in
        // strict radial order with a 1:1:1 chain through them
        disc: {
          on: cfg.variant === 3,
          rings: discRings.map((r) => ({ r: +(+r.el.getAttribute("r")).toFixed(1), step: r.step })),
          ringAlpha: discRings.length ? +discRings[0].el.getAttribute("opacity") : 0,
          bands: {
            person: people.filter(Boolean).map((p) => +rOf(p).toFixed(1)),
            teacher: teachers.filter(Boolean).map((t) => +rOf(t).toFixed(1)),
            pill: techniques.filter(Boolean).map((t) => +rOf(t).toFixed(1)),
          },
          chain: people.filter(Boolean).length === teachers.filter(Boolean).length &&
                 teachers.filter(Boolean).length === techniques.filter(Boolean).length,
        },
        people: people.map((p) => ({
          opacity: p?.group ? +p.group.getAttribute("opacity") : 0,
          pt: p?.pt,
        })),
        teachers: teachers.map((t) => ({
          opacity: t?.group ? +t.group.getAttribute("opacity") : 0,
          pt: t?.pt,
          lineDraw: t && people[t.i]?.lineToTeacher
            ? 1 - +people[t.i].lineToTeacher.getAttribute("stroke-dashoffset") / Math.max(1e-4, people[t.i].lineLen)
            : 0,
        })),
        techniques: techniques.map((tq) => ({
          opacity: tq?.pillGroup ? +tq.pillGroup.getAttribute("opacity") : 0,
          label: tq?.label,
          pt: tq?.pt,
          lineDraw: tq?.lineToTeacher
            ? 1 - +tq.lineToTeacher.getAttribute("stroke-dashoffset") / Math.max(1e-4, tq.lineLen)
            : 0,
        })),
        box: { w, h },
      };
    },
  };
}
