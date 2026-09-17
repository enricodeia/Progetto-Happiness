// The left columns of the two pinned stages:
//
//   sticky 1 (`mount`)   one photograph per step, crossfading on the same
//                        clock as the copy, with a glass card on top of it
//   sticky 2 (`mountB`)  the evidence panel: the statement at the TOP, then
//                        the three sources stacked under it with a rail from
//                        each one down to the next, filling as its step plays
//
// The card's silhouette is a real squircle — straight edges joined by
// superellipse corners (|x|^n + |y|^n = r^n), not a circular border-radius.
// It is applied as `clip-path: path(...)` in CSS pixels, which is also what
// makes `backdrop-filter` follow the shape: a border or a box-shadow would be
// cut off by the clip, so the hairline and the shadow are drawn as SVG paths
// from the very same geometry.
//
// Everything is sized in VIEWPORT units, never in per cent of the column, so
// that when the column closes in step 4 the card is WIPED by the moving edge
// instead of being squeezed.

import { createGlass } from "./glass.js";
import { createReveal, splitLines } from "./reveal.js";

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (x) => x * x * (3 - 2 * x);

const FILES = import.meta.glob("./values/*.{webp,jpg,jpeg,png,avif}", {
  eager: true,
  query: "?url",
  import: "default",
});
const VALUE_IMAGES = Object.keys(FILES)
  .sort()
  .map((k) => FILES[k]);

/**
 * One closed superellipse path, in the element's own pixel space.
 * `n` = 2 is a plain circular corner; 4–5 is the app-icon squircle.
 */
export function squirclePath(w, h, r, n, steps = 18) {
  const R = Math.max(0, Math.min(r, Math.min(w, h) / 2));
  const p = 2 / Math.max(2, n);
  const q = (t) => Math.pow(Math.max(0, t), p);
  const d = [];

  // One corner, walked from its own start point to its own end point. The
  // mirrored corners run the parameter backwards — walking them forwards is
  // what turns the silhouette into a dog-ear.
  const corner = (ox, oy, sx, sy, rev) => {
    for (let i = 0; i <= steps; i++) {
      const th = ((rev ? steps - i : i) / steps) * (Math.PI / 2);
      const x = ox + sx * (R - R * q(Math.cos(th)));
      const y = oy + sy * (R - R * q(Math.sin(th)));
      d.push(`${x.toFixed(2)} ${y.toFixed(2)}`);
    }
  };

  corner(0, 0, 1, 1, false);          // top-left     (0,R) → (R,0)
  corner(w, 0, -1, 1, true);          // top-right    (w-R,0) → (w,R)
  corner(w, h, -1, -1, false);        // bottom-right (w,h-R) → (w-R,h)
  corner(0, h, 1, -1, true);          // bottom-left  (R,h) → (0,h-R)

  return `M ${d[0]} L ${d.slice(1).join(" L ")} Z`;
}

const SVG = "http://www.w3.org/2000/svg";
const svgEl = (cls) => {
  const s = document.createElementNS(SVG, "svg");
  s.setAttribute("class", cls);
  const p = document.createElementNS(SVG, "path");
  s.appendChild(p);
  return s;
};

export function createLeft({ mount, mountB, cfg }) {
  const media = document.createElement("div");
  media.className = "was-left-media";

  const dim = document.createElement("div");
  dim.className = "was-left-dim";

  const card = document.createElement("div");
  card.className = "was-card";
  const shadow = svgEl("was-card-shadow");
  // The card itself is solid white. The GLASS is a layer of its own, BEHIND
  // it and in front of the photograph — by default the whole column, edge to
  // edge (`card.glassFull`), so the entire background is refracted and a
  // change of image reads through the glass.
  const frost = document.createElement("div");
  frost.className = "was-card-frost";
  const glass = document.createElement("div");
  glass.className = "was-card-glass";
  const edge = svgEl("was-card-edge");
  card.append(shadow, glass, edge);

  mount.append(media, dim, frost, card);

  // ── the evidence panel (steps 4–6) ─────────────────────────────────────
  const ev = document.createElement("div");
  ev.className = "was-evidence";
  const evTitle = document.createElement("p");
  evTitle.className = "was-ev-title";
  const evRows = document.createElement("div");
  evRows.className = "was-ev-rows";
  const evSummary = document.createElement("p");
  evSummary.className = "was-ev-summary";
  ev.append(evTitle, evRows, evSummary);
  mountB.appendChild(ev);
  mountB.hidden = false;
  let titleRev = null;
  let summaryRev = null;
  let titleOn = false;
  let rows = [];

  // React Bits' GlassSurface: it refracts the photograph behind the card
  // instead of only blurring it
  const refract = createGlass({ host: frost, params: cfg.left.card.glass });

  let layers = [];
  const state = { images: VALUE_IMAGES.length, w: 0, h: 0 };

  function buildEvidence() {
    const E = cfg.evidence;
    // The statement is ALREADY THERE — no scroll trigger, no stagger, not
    // even a fire-once reveal: it is painted at full visibility the moment
    // it is built, because he wants it read as soon as the section is on
    // screen, not performed. `lineRise: 0` still keeps it strictly in place
    // in case its own text is ever swapped for something that needs a mask.
    const titleMode = E.titleMode || "lines";
    if (titleRev) titleRev.rebuild(E.title, titleMode);
    else titleRev = createReveal({ el: evTitle, text: E.title, mode: titleMode, cfg });
    titleRev.setParams(() => ({ ...cfg.text, lineRise: cfg.evidence.titleRise }));
    const titleUnits = titleRev.arm();
    for (const u of titleUnits) { u.v = 1; u.o = 0; }
    titleRev.drawUnits();
    // the summary is the ONE that actually reveals — line by line, fired at
    // the section's own mark, same as everything else on this page
    const summaryMode = E.summaryMode || "lines";
    if (summaryRev) summaryRev.rebuild(E.summary, summaryMode);
    else summaryRev = createReveal({ el: evSummary, text: E.summary, mode: summaryMode, cfg });
    summaryRev.setParams(() => ({ ...cfg.text, lineRise: cfg.evidence.titleRise }));
    summaryRev.arm();
    titleOn = false;
    evRows.textContent = "";
    // a HORIZONTAL row now — one column per step, a thin rail ABOVE the
    // label that fills left→right as its own ramp plays, and its own line of
    // copy underneath while it is the active one
    rows = E.rows.map((r, i) => {
      const el = document.createElement("div");
      el.className = "was-ev-row";
      if (i === E.rows.length - 1) el.classList.add("is-last");
      el.innerHTML =
        `<div class="was-ev-rail"><i></i></div>` +
        `<div class="was-ev-label">${r.label}</div>` +
        `<p class="was-ev-para">${splitLines(r.para)
          .map((l) => `<span>${l}</span>`)
          .join("")}</p>`;
      evRows.appendChild(el);
      return {
        el,
        fill: el.querySelector(".was-ev-rail i"),
        para: el.querySelector(".was-ev-para"),
      };
    });
  }

  function build() {
    buildEvidence();
    media.textContent = "";
    // one photograph per step of the CANVAS experience — the steps after it
    // belong to another section and never show this column
    const n = Math.max(1, Math.min(cfg.steps.length, Math.round(cfg.sections.canvasSteps)));
    layers = cfg.steps.slice(0, n).map((_, i) => {
      const el = document.createElement("div");
      el.className = "was-left-img";
      const src = VALUE_IMAGES[Math.min(i, VALUE_IMAGES.length - 1)];
      if (src && cfg.left.images) el.style.backgroundImage = `url(${src})`;
      el.style.opacity = i === 0 ? "1" : "0";
      media.appendChild(el);
      return el;
    });
    media.hidden = !cfg.left.images || !VALUE_IMAGES.length;
    style();
  }

  /** Card geometry + glass, in viewport pixels. */
  function style() {
    const L = cfg.left;
    const c = L.card;
    const colW = (cfg.columns.split / 100) * window.innerWidth;
    const w = (c.w / 100) * colW;
    // Square by default: the height comes from the width in real pixels, so it
    // is a true square whatever the viewport is doing.
    const h = c.square ? w : (c.h / 100) * window.innerHeight;
    state.w = w;
    state.h = h;

    const r = (c.r / 100) * Math.min(w, h);
    const d = squirclePath(w, h, r, c.n);
    const cardLeft = colW / 2 - w / 2;
    const cardTop = ((50 + c.y) / 100) * window.innerHeight - h / 2;

    // ── the glass ────────────────────────────────────────────────────────
    // Full: the whole column, so the effect is on the ENTIRE background and
    // not on a patch of it. Otherwise: a concentric squircle mat, the same
    // silhouette as the card grown by `frost` on every side.
    let fw, fh;
    if (c.glassFull) {
      fw = colW;
      fh = window.innerHeight;
      frost.style.left = "0px";
      frost.style.top = "0px";
      frost.style.clipPath = "none";
    } else {
      fw = w + c.frost * 2;
      fh = h + c.frost * 2;
      frost.style.left = `${cardLeft - c.frost}px`;
      frost.style.top = `${cardTop - c.frost}px`;
      frost.style.clipPath = `path("${squirclePath(fw, fh, r + c.frost, c.n)}")`;
    }
    frost.style.width = `${fw}px`;
    frost.style.height = `${fh}px`;
    frost.style.background = `rgba(255,255,255,${c.frostTint})`;
    frost.hidden = !c.glassFull && c.frost <= 0;
    refract.apply(fw, fh);

    card.hidden = !c.show;
    card.style.width = `${w}px`;
    card.style.height = `${h}px`;
    card.style.left = `${cardLeft}px`;
    card.style.top = `${cardTop}px`;

    glass.style.clipPath = `path("${d}")`;
    glass.style.background = c.tint;
    glass.style.opacity = String(c.alpha);
    // Perf pass (2026-09-17): a backdrop-filter under a fully OPAQUE card is
    // computed and then completely covered — the frost behind the card is
    // where the glass actually lives. It is only asked for when the card
    // itself lets anything through.
    const solid = c.alpha >= 0.999 && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(c.tint);
    glass.style.backdropFilter = solid ? "" : `blur(${c.blur}px) saturate(${c.sat})`;
    glass.style.webkitBackdropFilter = glass.style.backdropFilter;

    for (const [s, stroke] of [[edge, true], [shadow, false]]) {
      s.setAttribute("width", w);
      s.setAttribute("height", h);
      s.setAttribute("viewBox", `0 0 ${w} ${h}`);
      const path = s.firstChild;
      path.setAttribute("d", d);
      if (stroke) {
        path.setAttribute("fill", "none");
        path.setAttribute("stroke", `rgba(255,255,255,${c.edge})`);
        path.setAttribute("stroke-width", "1");
      } else {
        path.setAttribute("fill", "#000");
      }
    }
    shadow.style.opacity = String(c.shadow);
    shadow.style.filter = `blur(${c.shadowBlur}px)`;
    shadow.style.transform = `translateY(${c.shadowY}px)`;
    shadow.hidden = c.shadow <= 0.001;

    media.style.width = `${colW}px`;
    dim.style.width = `${colW}px`;
    dim.style.opacity = String(L.dim);

    const E = cfg.evidence;
    ev.hidden = !E.show;
    ev.style.setProperty("--ev-top", `${E.titleTop}%`);
    ev.style.setProperty("--ev-title-x", `${E.titleX}vw`);
    ev.style.setProperty("--ev-rows-top", `${E.rowsTop}%`);
    ev.style.setProperty("--ev-rows-x", `${E.rowsX}vw`);
    ev.style.setProperty("--ev-row-w", `${E.rowW}vw`);
    ev.style.setProperty("--ev-row-gap", `${E.rowGap}vw`);
    ev.style.setProperty("--ev-label", `${E.labelSize}vw`);
    ev.style.setProperty("--ev-para", `${E.paraSize}vw`);
    ev.style.setProperty("--ev-bar-h", `${E.barH}px`);
    ev.style.setProperty("--ev-bar-bg", E.barBg);
    ev.style.setProperty("--ev-bar-ink", E.barInk);
    evTitle.style.setProperty("--copy-size", `${E.titleSize}vw`);
    evTitle.style.setProperty("--copy-lh", String(E.titleLh));
    evTitle.style.setProperty("--ev-title-w", `${E.titleWidth}vw`);
    evTitle.style.setProperty("--align", E.titleAlign || "left");
    evSummary.style.setProperty("--ev-summary-x", `${E.summaryX}vw`);
    evSummary.style.setProperty("--ev-summary-bottom", `${E.summaryBottom}%`);
    evSummary.style.setProperty("--ev-summary-w", `${E.summaryWidth}vw`);
    evSummary.style.setProperty("--ev-summary-size", `${E.summarySize}vw`);
    evSummary.style.setProperty("--align", E.summaryAlign || "left");
  }

  /**
   * `tl` is the one clock. The photographs change over in the last `cross` of
   * each step, which is the same window the copy leaves in.
   */
  function update(tl) {
    const p = tl.p;
    const ranges = tl.ranges;

    // ── the evidence panel ───────────────────────────────────────────────
    const E = cfg.evidence;
    // the statement is already there (painted once, in `buildEvidence`) —
    // only the summary actually fires, at the section's own mark
    // It fires when the SECTION reaches the top of the viewport (his ask,
    // 2026-09-17) — `tl.evTopped`, measured off pinB's own rect in main.js —
    // rather than at a fraction of the pinned clock. Same beat, read off the
    // thing he is actually looking at. `summaryOnTop: false` restores the
    // clock mark.
    const mark = tl.evTitleAt ?? 1;
    const armed = E.summaryOnTop === false ? p >= mark : !!tl.evTopped;
    if (summaryRev) {
      if (!titleOn && armed) {
        titleOn = true;
        summaryRev.playStagger({
          duration: E.titleDur, stagger: E.titleStagger, ease: "power2.out",
        });
      } else if (titleOn && !armed) {
        // never visibly un-reveal: hold as shown until it has scrolled
        // fully off screen, then reset silently — same rule as every other
        // scroll-triggered title on the page
        const r = evSummary.getBoundingClientRect();
        const onscreen = r.bottom > 0 && r.top < window.innerHeight;
        if (!onscreen) {
          titleOn = false;
          summaryRev.reset();
        }
      }
    }
    const fade = Math.max(0.02, E.paraFade);
    for (let i = 0; i < rows.length; i++) {
      const a = clamp01(tl.ev?.[i] ?? 0);
      rows[i].fill.style.transform = `scaleX(${a.toFixed(4)})`;
      const next = i + 1 < rows.length ? clamp01(tl.ev?.[i + 1] ?? 0) : 0;
      const alpha = clamp01(a / fade) * (1 - clamp01(next / fade));
      rows[i].para.style.opacity = alpha.toFixed(3);
      rows[i].el.classList.toggle("is-active", alpha > 0.5);
    }

    if (!layers.length || media.hidden) return;
    const L = cfg.left;

    // position in "step space": 0 … steps.length
    let f = 0;
    for (let i = 0; i < ranges.length; i++) {
      if (p >= ranges[i].s0) f = i + clamp01((p - ranges[i].s0) / ranges[i].len);
    }
    const s = Math.min(layers.length - 1, Math.max(0, Math.floor(f)));
    const u = clamp01(f - s);
    const cross = Math.max(0.02, L.cross);
    // nothing to cross into on the last step — it must not fade to nothing
    const hasNext = s + 1 < layers.length;
    const over = hasNext && u > 1 - cross ? smooth((u - (1 - cross)) / cross) : 0;

    for (let i = 0; i < layers.length; i++) {
      const a = i === s ? 1 - over : i === s + 1 ? over : 0;
      const el = layers[i];
      el.style.opacity = a.toFixed(3);
      if (a > 0.001) {
        const own = i === s ? u : 0;
        el.style.transform = `scale(${(1 + L.zoom * own).toFixed(4)})`;
      }
    }
  }

  build();
  return {
    build,
    style,
    update,
    refract,
    state,
    card,
    get images() { return VALUE_IMAGES; },
    /** per-step photograph opacity, for the assertions */
    alphas: () => layers.map((el) => +(+el.style.opacity || 0).toFixed(2)),
    evidence: () => ({
      on: ev.getBoundingClientRect().height > 0 ? 1 : 0,
      // the statement is painted once, at build time, and never touched
      // again — this is always 1, on purpose
      title: titleRev ? +titleRev.alpha.toFixed(2) : 0,
      titleRise: cfg.evidence.titleRise,
      titleY: [...evTitle.querySelectorAll(".was-line-in")].map(
        (e) => +(e.style.transform.match(/,\s*(-?[\d.]+)%/)?.[1] ?? 0)
      ),
      titleA: [...evTitle.querySelectorAll(".was-line-in")].map(
        (e) => +(+e.style.opacity || 0).toFixed(2)
      ),
      titleBox: (() => {
        const r = evTitle.getBoundingClientRect();
        return { x: Math.round(r.left), right: Math.round(r.right) };
      })(),
      // the summary is the one that actually fires, at the section's mark
      summary: summaryRev ? +summaryRev.alpha.toFixed(2) : 0,
      summaryA: [...evSummary.querySelectorAll(".was-line-in")].map(
        (e) => +(+e.style.opacity || 0).toFixed(2)
      ),
      rowsX: rows.length ? Math.round(rows[0].el.getBoundingClientRect().left) : 0,
      bars: rows.map((r) => {
        const m = /scaleX\(([\d.]+)\)/.exec(r.fill.style.transform || "");
        return m ? +(+m[1]).toFixed(2) : 0;
      }),
      paras: rows.map((r) => +(+r.para.style.opacity || 0).toFixed(2)),
      labels: rows.map((r) => r.el.querySelector(".was-ev-label").textContent),
      titleTop: Math.round(evTitle.getBoundingClientRect().top),
      rowTops: rows.map((r) => Math.round(r.el.getBoundingClientRect().top)),
    }),
    glass: () => ({
      clip: (glass.style.clipPath || "").slice(0, 12),
      backdrop: glass.style.backdropFilter || "",
      // fully opaque = nothing behind it can show through, so a backdrop-filter
      // under it would be computed and then covered. Chrome normalises the
      // inline `#ffffff` to `rgb(255, 255, 255)`, so this asks the only
      // question that matters: is there an alpha channel below 1 anywhere.
      solid: glass.style.opacity === "1" && !/rgba\(/.test(glass.style.background || ""),
      frostBackdrop: frost.style.backdropFilter || "",
      frostOn: !frost.hidden,
    }),
    /** the card's box in CSS pixels, for the assertions */
    box() {
      const r = card.getBoundingClientRect();
      return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) };
    },
    /** how far the silhouette departs from a plain rounded rect, in px */
    squircleBulge() {
      const c = cfg.left.card;
      const R = (c.r / 100) * Math.min(state.w, state.h);
      const p = 2 / Math.max(2, c.n);
      const k = Math.pow(Math.cos(Math.PI / 4), p); // the 45° point
      return +(R * (k - Math.SQRT1_2)).toFixed(2);
    },
  };
}
