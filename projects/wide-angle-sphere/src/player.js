// The player, fixed bottom-left (his ask, 2026-09-17) — in place of the fanned
// deck of video cards the hero used to carry. Christopher's own photo on the
// left (the same file the team grid uses, not a second copy), play / pause,
// his name and what the track is, an equaliser of pills, and a hairline of
// progress along the bottom edge of the bar.
//
// The audio is a drop-in, `src/media/*` — the first file there, in filename
// order. While the folder is empty the label says so ("Audio coming soon"),
// and — with `player.fake` on, his own ask — the button still works: it
// drives the equaliser from smooth noise and a slow fake progress, so the
// whole thing can be seen and tuned before the real track exists. Nothing
// that isn't his ever actually plays.
//
// The equaliser (his description: "pills... si alzano e si abbassano, però
// con la base al centro"): a row of bars, each growing and shrinking about the
// bar's own centre line — both ends move, there is no floor. It sits along the
// BOTTOM of the bar (his ask, 2026-09-17), under the name, which is what makes
// the component a little taller and lets it breathe. Driven by a per-frame
// loop that only runs while something is playing.
//
// THE OUTLINE IS THE TIMELINE (his ask, 2026-09-17: "lo stroke possa diventare
// invece la nostra linea del tempo, quindi che si compone attorno allo stroke
// del componente"). There is no hairline of progress inside the bar any more —
// that read as a mistake and is gone. Instead the component's own edge is an
// SVG rounded rectangle drawn twice: a faint TRACK, which is the edge the bar
// always has, and over it a solid stroke that composes itself around the box,
// clockwise from the top-left corner, as the track plays. `pathLength="1"`
// normalises the outline to a length of 1, so the dash pattern IS the
// progress — `${p} 1` — with no arithmetic and nothing to keep in sync.
//
// The box is content-sized (his name decides its width), so the path is
// rebuilt from a ResizeObserver — which runs after layout, before paint — and
// never measured in the animation loop.
//
// White glass over whatever is behind it — the bowl's canvas included — with
// a hairline highlight along the top edge, so it reads as a pane, not a card.
// The outline is BLACK on the white page and WHITE over the shader (his ask):
// both come off `--pl-ink` / `--pl-track`, which the `is-ground` theme swaps.

import gsap from "gsap";
import photo from "./team/Christopher Plowman.webp";

const MEDIA = import.meta.glob("./media/*.{mp3,m4a,wav,ogg,aac}", {
  eager: true, query: "?url", import: "default",
});

const ICON_PLAY = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.5 6.2v11.6l9.2-5.8z" fill="currentColor"/></svg>`;
const ICON_PAUSE = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.5 6h3.4v12H7.5zM13.1 6h3.4v12h-3.4z" fill="currentColor"/></svg>`;

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const FAKE_LENGTH = 72;   // s — how long a fake "track" runs before it loops

export function createPlayer({ mount, cfg }) {
  const src = Object.keys(MEDIA).sort().map((k) => MEDIA[k])[0] || "";

  const root = document.createElement("div");
  root.className = "was-player";
  root.innerHTML = `
    <svg class="was-player-ring" aria-hidden="true" focusable="false">
      <path class="was-player-ring-track" pathLength="1" fill="none" d="" />
      <path class="was-player-ring-fill" pathLength="1" fill="none" d="" />
    </svg>
    <img class="was-player-photo" src="${photo}" alt="" />
    <button class="was-player-btn" type="button" aria-label="Play">${ICON_PLAY}</button>
    <div class="was-player-main">
      <div class="was-player-text">
        <span class="was-player-name"></span>
        <span class="was-player-label"></span>
      </div>
      <div class="was-player-wave" aria-hidden="true"></div>
    </div>
  `;
  mount.appendChild(root);

  const btn = root.querySelector(".was-player-btn");
  const nameEl = root.querySelector(".was-player-name");
  const labelEl = root.querySelector(".was-player-label");
  const textEl = root.querySelector(".was-player-text");
  const mainEl = root.querySelector(".was-player-main");
  const waveEl = root.querySelector(".was-player-wave");
  const ringSvg = root.querySelector(".was-player-ring");
  const ringTrack = root.querySelector(".was-player-ring-track");
  const ringFill = root.querySelector(".was-player-ring-fill");

  const audio = src ? new Audio(src) : null;
  if (audio) audio.preload = "metadata";
  let playing = false;
  let park = 0;            // 0 = riding along, 1 = slid down and out of the frame
  let fakeOn = false;      // the fake track is "playing"
  let fakeT = 0;           // ...and how far into it, in seconds
  let progress = 0;
  let bars = [];
  let raf = 0;
  let last = 0;
  let clock = 0;
  let boxW = 0;            // the bar's own box, kept by the ResizeObserver
  let boxH = 0;

  const isFake = () => !audio && !!cfg.player.fake;
  const live = () => playing || fakeOn;

  // ── the outline ────────────────────────────────────────────────────────
  /**
   * A rounded rectangle as a path, inset by HALF the stroke so the whole
   * stroke lands inside the box — the bar clips its own overflow, and a
   * stroke straddles its path, so a path on the box's edge would lose its
   * outer half. It starts at the top-left corner and runs CLOCKWISE, which
   * is the direction the progress then composes itself in.
   */
  function outlinePath(w, h, rl, rr, sw) {
    const i = sw / 2;
    const W = Math.max(0, w - sw);
    const H = Math.max(0, h - sw);
    const cap = Math.min(W / 2, H / 2);
    const L = Math.max(0, Math.min(rl - i, cap));
    const R = Math.max(0, Math.min(rr - i, cap));
    const n = (v) => (Math.round(v * 100) / 100).toString();
    return (
      `M${n(i + L)},${n(i)}` +
      `H${n(i + W - R)}` +
      `A${n(R)},${n(R)} 0 0 1 ${n(i + W)},${n(i + R)}` +
      `V${n(i + H - R)}` +
      `A${n(R)},${n(R)} 0 0 1 ${n(i + W - R)},${n(i + H)}` +
      `H${n(i + L)}` +
      `A${n(L)},${n(L)} 0 0 1 ${n(i)},${n(i + H - L)}` +
      `V${n(i + L)}` +
      `A${n(L)},${n(L)} 0 0 1 ${n(i + L)},${n(i)}Z`
    );
  }

  /** the dash pattern IS the progress: `pathLength="1"` did the arithmetic */
  const paintRing = () => {
    ringFill.style.strokeDasharray = `${progress.toFixed(4)} 1`;
  };

  function syncRing(w = boxW, h = boxH) {
    boxW = w;
    boxH = h;
    if (!(w > 0 && h > 0)) return;
    const P = cfg.player;
    const sw = Math.max(0.5, P.stroke ?? 1.5);
    ringSvg.setAttribute("width", String(w));
    ringSvg.setAttribute("height", String(h));
    ringSvg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    // closed, the RIGHT end is a half-circle that sits exactly around the play
    // button (his ask: "il border radius di destra... 100%"); the left keeps
    // the square-ish corner it shares with the photo
    const rr = P.radius + (h / 2 - P.radius) * collapse.v;
    root.style.setProperty("--pl-rr", `${rr.toFixed(2)}px`);
    const d = outlinePath(w, h, P.radius, rr, sw);
    ringTrack.setAttribute("d", d);
    ringFill.setAttribute("d", d);
    root.style.setProperty("--pl-sw", `${sw}px`);
    paintRing();
  }

  // ResizeObserver, not a per-frame measure: it runs after layout and before
  // paint, so the outline follows the box (his name decides its width) for
  // free — the animation loop never touches geometry.
  const ro = new ResizeObserver((entries) => {
    // `borderBoxSize` is the box the outline is drawn on, and it is
    // fractional — `contentRect` would be the CONTENT box, short by the
    // padding on both axes, and would draw the outline inside the bar
    const b = entries[0]?.borderBoxSize?.[0];
    if (b) syncRing(b.inlineSize, b.blockSize);
    else syncRing(root.offsetWidth, root.offsetHeight);
  });
  ro.observe(root);

  // ── it closes as you read down ─────────────────────────────────────────
  // One number drives the whole thing — the box's width, its right-hand
  // radius and the SVG outline all come off `collapse.v`, so the outline can
  // never lag the box it is drawn on. GSAP owns it, because this is a STATE
  // change (down / up / hovered), not a per-frame function of the scroll: a
  // transition is exactly right here, and exactly wrong for the park.
  const collapse = { v: 0 };
  let boxTween = null;
  let charTween = null;
  let wantClosed = false;   // what the SCROLL last asked for
  let hovering = false;
  let mainW = 0;            // the column's natural width, measured while open
  let btnW = 40;            // the play button, for the closed end's geometry

  function paintCollapse() {
    const c = collapse.v;
    const P = cfg.player;
    root.style.setProperty("--pl-collapse", c.toFixed(4));
    root.style.setProperty("--pl-main-w", `${(mainW * (1 - c)).toFixed(2)}px`);
    // The right inset, closed, is what makes the half-circle end CONCENTRIC
    // with the play button rather than merely near it — his ask was that the
    // two "calzano a pennello". The end's centre sits half the bar's height in
    // from the right edge, so the inset has to be that less half the button.
    const h = boxH || P.size + P.pad * 2;
    const closedPr = Math.max(P.pad, h / 2 - btnW / 2);
    const openPr = P.pad + 14;
    root.style.setProperty("--pl-pr", `${(openPr + (closedPr - openPr) * c).toFixed(2)}px`);
    root.classList.toggle("is-collapsed", c > 0.5);
    // the box is mid-tween, so redraw the outline against what we already
    // know; the ResizeObserver corrects it with the real width on the same
    // frame, and neither path forces a layout
    syncRing();
  }

  /** the natural width of the name/equaliser column, measured only while open */
  function measureMain() {
    const had = root.style.getPropertyValue("--pl-main-w");
    root.style.setProperty("--pl-main-w", "auto");
    const w = mainEl.getBoundingClientRect().width;
    if (had) root.style.setProperty("--pl-main-w", had);
    if (w > 0) mainW = w;
    btnW = btn.getBoundingClientRect().width || btnW;
    return mainW;
  }

  /** every letter, ordered right → left and left → right, for the stagger */
  let charsRtl = [];
  let charsLtr = [];
  function splitChars(el, text) {
    el.textContent = "";
    for (const ch of [...text]) {
      const span = document.createElement("span");
      span.className = "was-player-ch";
      // a real space collapses inside an inline-block, so it gets the entity
      span.textContent = ch === " " ? "\u00a0" : ch;
      el.appendChild(span);
    }
    return [...el.querySelectorAll(".was-player-ch")];
  }
  function buildChars() {
    const all = [
      ...splitChars(nameEl, cfg.player.name || ""),
      ...splitChars(labelEl, audio ? cfg.player.label : cfg.player.emptyLabel),
    ];
    // sorted by where each letter actually SITS, not by which line it is on:
    // "da destra verso sinistra" has to read across the block, not down it
    const x = new Map(all.map((el) => [el, el.offsetLeft]));
    charsLtr = [...all].sort((a, b) => x.get(a) - x.get(b));
    charsRtl = [...charsLtr].reverse();
    gsap.set(all, { opacity: 1, x: 0 });
  }

  /** `closed` is what the scroll wants; hovering always overrides it open */
  function applyCollapse(immediate = false) {
    const C = cfg.player.collapse || {};
    const want = C.on === false ? false : wantClosed && !hovering;
    const to = want ? 1 : 0;
    if (!immediate && Math.abs(collapse.v - to) < 0.001 && !boxTween) return;
    boxTween?.kill();
    charTween?.kill();
    if (immediate) {
      collapse.v = to;
      paintCollapse();
      gsap.set(charsLtr, { opacity: 1 - to, x: 0 });
      return;
    }
    if (!mainW) measureMain();
    boxTween = gsap.to(collapse, {
      v: to,
      duration: want ? (C.dur ?? 0.52) : (C.openDur ?? 0.58),
      ease: want ? (C.ease || "power3.inOut") : (C.openEase || "power3.out"),
      onUpdate: paintCollapse,
    });
    // the letters go out from the RIGHT and come back from the LEFT
    charTween = gsap.to(want ? charsRtl : charsLtr, {
      opacity: want ? 0 : 1,
      x: want ? -(C.charShift ?? 5) : 0,
      duration: C.charDur ?? 0.2,
      ease: want ? "power2.in" : "power2.out",
      stagger: C.charStagger ?? 0.012,
    });
  }

  root.addEventListener("pointerenter", () => { hovering = true; applyCollapse(); });
  root.addEventListener("pointerleave", () => { hovering = false; applyCollapse(); });

  const paint = () => {
    const on = live();
    btn.innerHTML = on ? ICON_PAUSE : ICON_PLAY;
    btn.setAttribute("aria-label", on ? "Pause" : "Play");
    root.classList.toggle("is-playing", on);
    paintRing();
  };

  // ── the equaliser ──────────────────────────────────────────────────────
  // Smooth noise per bar — three sines at unrelated rates, so no two bars
  // ever move in step — settling back to `min` when nothing is playing.
  function buildWave() {
    const W = cfg.player.wave;
    waveEl.textContent = "";
    waveEl.hidden = !W.on;
    // with the equaliser off the column has ONE child, and `space-between`
    // would push the name to the top of a bar sized by the photo — so the
    // column centres instead (the panel can switch the wave off at any time)
    root.classList.toggle("is-nowave", !W.on);
    bars = [];
    if (!W.on) return;
    for (let i = 0; i < Math.max(1, Math.round(W.bars)); i++) {
      const b = document.createElement("i");
      waveEl.appendChild(b);
      bars.push({ el: b, seed: i * 1.7 + 0.3, h: W.min });
    }
    waveEl.style.setProperty("--wv-w", `${W.width}px`);
    waveEl.style.setProperty("--wv-gap", `${W.gap}px`);
    waveEl.style.setProperty("--wv-max", `${W.max}px`);
  }
  function tickWave(dt) {
    const W = cfg.player.wave;
    if (!W.on || !bars.length) return;
    const on = live();
    clock += dt * (W.speed || 1);
    for (const b of bars) {
      const target = on
        ? W.min + (W.max - W.min) * (0.5 + 0.5 * (
            0.55 * Math.sin(clock * 3.1 + b.seed * 2.3) +
            0.30 * Math.sin(clock * 5.7 + b.seed * 1.1) +
            0.15 * Math.sin(clock * 9.3 + b.seed * 3.7)))
        : W.min;
      // the bars ease toward their target, so a pause settles instead of snapping
      b.h += (target - b.h) * Math.min(1, dt * 14);
      b.el.style.height = `${b.h.toFixed(2)}px`;
    }
  }
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000 || 0);
    last = now;
    if (fakeOn) {
      fakeT += dt;
      if (fakeT >= FAKE_LENGTH) { fakeT = 0; }
      progress = fakeT / FAKE_LENGTH;
      paintRing();
    }
    tickWave(dt);
    // keep running until every bar has settled after a pause
    const settled = !live() && bars.every((b) => Math.abs(b.h - cfg.player.wave.min) < 0.05);
    raf = settled ? 0 : requestAnimationFrame(loop);
  }
  function wake() {
    if (raf) return;
    last = performance.now();
    raf = requestAnimationFrame(loop);
  }

  function toggle() {
    if (audio) {
      if (playing) audio.pause();
      else audio.play().catch(() => {});
      return;
    }
    if (!isFake()) return;
    fakeOn = !fakeOn;
    paint();
    wake();
  }

  if (audio) {
    audio.addEventListener("play", () => { playing = true; paint(); wake(); });
    audio.addEventListener("pause", () => { playing = false; paint(); wake(); });
    audio.addEventListener("ended", () => { playing = false; progress = 0; paint(); });
    audio.addEventListener("timeupdate", () => {
      progress = audio.duration ? clamp01(audio.currentTime / audio.duration) : 0;
      paintRing();
    });
  }
  btn.addEventListener("click", toggle);

  function style() {
    const P = cfg.player;
    root.hidden = !P.show;
    root.style.setProperty("--pl-left", `${P.left}vw`);
    root.classList.toggle("is-right", (P.side || "left") === "right");
    root.style.setProperty("--pl-bottom", `${P.bottom}vh`);
    root.style.setProperty("--pl-size", `${P.size}px`);
    root.style.setProperty("--pl-r", `${P.radius}px`);
    root.style.setProperty("--pl-pad", `${P.pad}px`);
    // concentric: the photo's corner is the bar's, less the inset
    root.style.setProperty("--pl-r-in", `${Math.max(2, P.radius - P.pad)}px`);
    const G = P.glass || {};
    root.classList.toggle("is-glass", !!G.on);
    root.style.setProperty("--pl-alpha", String(G.on ? G.alpha : 1));
    root.style.setProperty("--pl-blur", `${G.on ? G.blur : 0}px`);
    root.style.setProperty("--pl-sat", String(G.on ? G.saturate : 1));
    root.style.setProperty("--pl-bevel", String(G.on ? G.bevel : 0));
    root.classList.toggle("is-empty", !audio);
    root.classList.toggle("is-fake", isFake());
    btn.disabled = !audio && !isFake();
    if (btn.disabled && fakeOn) { fakeOn = false; }
    buildWave();
    // the type is rebuilt letter by letter (the collapse staggers them), and
    // the column's natural width re-measured, before anything is drawn
    buildChars();
    mainW = 0;
    measureMain();
    applyCollapse(true);
    // the corner (and so the outline) may have just changed under us
    syncRing();
    paint();
    wake();
  }
  style();

  /** 0 → 1: slides the whole bar down and out — written every frame by main.js */
  function setPark(t) {
    const v = Math.max(0, Math.min(1, t));
    if (Math.abs(v - park) < 0.0005) return;
    park = v;
    root.style.setProperty("--pl-park", v.toFixed(4));
    root.classList.toggle("is-parked", v > 0.9);
  }

  /**
   * The scroll's own direction, handed in by main.js: down closes the bar,
   * up opens it. Under `collapse.velocity` nothing counts, so the wobble at
   * the end of a Lenis glide cannot flutter it.
   */
  function setScrollDir(v) {
    const C = cfg.player.collapse || {};
    if (C.on === false) return;
    const t = Math.max(1, C.velocity ?? 90);
    const next = v > t ? true : v < -t ? false : wantClosed;
    if (next === wantClosed) return;
    wantClosed = next;
    applyCollapse();
  }

  return {
    style,
    toggle,
    setPark,
    setScrollDir,
    get collapsed() { return +collapse.v.toFixed(3); },
    get playing() { return live(); },
    get hasSource() { return !!audio; },
    probe() {
      const r = root.getBoundingClientRect();
      const heights = bars.map((b) => +b.h.toFixed(1));
      return {
        hasSource: !!audio,
        fake: isFake(),
        park: +park.toFixed(3),
        playing: live(),
        progress: +progress.toFixed(3),
        // split into letters for the collapse stagger, so the spaces are
        // non-breaking ones — read them back as the words they are
        name: nameEl.textContent.replace(/\u00a0/g, " "),
        label: labelEl.textContent.replace(/\u00a0/g, " "),
        disabled: btn.disabled,
        hidden: root.hidden,
        position: getComputedStyle(root).position,
        radius: getComputedStyle(root).borderRadius,
        photoRadius: getComputedStyle(root.querySelector(".was-player-photo")).borderRadius,
        pad: getComputedStyle(root).paddingLeft,
        glass: {
          on: root.classList.contains("is-glass"),
          bg: getComputedStyle(root).backgroundColor,
          backdrop: getComputedStyle(root).backdropFilter || getComputedStyle(root).webkitBackdropFilter || "",
        },
        // the outline IS the timeline: how far round it has composed, in what
        // colour, over what track — and that there is no inner bar left
        stroke: {
          p: +progress.toFixed(4),
          dash: ringFill.style.strokeDasharray || "",
          drawn: +(parseFloat(ringFill.style.strokeDasharray) || 0).toFixed(4),
          color: getComputedStyle(ringFill).stroke,
          track: getComputedStyle(ringTrack).stroke,
          width: getComputedStyle(ringFill).strokeWidth,
          len: +((ringFill.getTotalLength && ringFill.getTotalLength()) || 0).toFixed(1),
          border: getComputedStyle(root).borderTopWidth,
          innerBar: root.querySelectorAll(".was-player-bar").length,
        },
        // ...and closed, it is just the photo and the play button, with the
        // right-hand end a half-circle around the button
        collapse: {
          v: +collapse.v.toFixed(3),
          closed: root.classList.contains("is-collapsed"),
          wantClosed,
          hovering,
          mainW: Math.round(mainW),
          width: Math.round(r.width),
          // closed, the button's centre and the round end's centre are the
          // same point — that is what "calza a pennello" means, measured
          btnMid: Math.round(btn.getBoundingClientRect().left - r.left + btnW / 2),
          capMid: Math.round(r.width - r.height / 2),
          radii: getComputedStyle(root).borderRadius,
          chars: charsLtr.length,
          charAlphas: charsLtr.map((el) => +(+getComputedStyle(el).opacity).toFixed(2)),
        },
        // the equaliser sits UNDER the name now, not beside it
        layout: {
          h: Math.round(r.height),
          textTop: Math.round(textEl.getBoundingClientRect().top - r.top),
          waveTop: Math.round(waveEl.getBoundingClientRect().top - r.top),
          waveBottomGap: Math.round(r.bottom - waveEl.getBoundingClientRect().bottom),
        },
        wave: {
          bars: bars.length,
          heights,
          spread: heights.length ? +(Math.max(...heights) - Math.min(...heights)).toFixed(1) : 0,
          align: getComputedStyle(waveEl).alignItems,
        },
        left: Math.round(r.left),
        rightGap: Math.round(window.innerWidth - r.right),
        side: (cfg.player.side || "left"),
        bottomGap: Math.round(window.innerHeight - r.bottom),
        photo: root.querySelector(".was-player-photo").getAttribute("src"),
        icon: btn.getAttribute("aria-label"),
      };
    },
    dispose() {
      audio?.pause();
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
      root.remove();
    },
  };
}
