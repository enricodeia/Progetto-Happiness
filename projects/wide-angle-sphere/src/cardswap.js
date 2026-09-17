import gsap from "gsap";

// The video cards in the corner of the hero — React Bits' `Stack`, ported to
// vanilla. A deck fanned by a few degrees each, the top one live:
//
//   · drag it     it tilts in 3D towards the pointer (rotateX / rotateY from
//                 the drag offset) and is thrown to the BACK of the deck if
//                 you pull it further than `sensitivity`; otherwise it springs
//                 home
//   · click it    same thing, straight to the back (`clickToBack`)
//
// Nothing moves on its own. The spring is the component's own — stiffness 260,
// damping 20 — integrated here as a GSAP ease so the motion matches rather
// than being an eased approximation of it.
//
// Cards are whatever sits in `src/cards/` (drop-in, filename order); with that
// folder empty it falls back to the portraits the sphere already uses.

const FILES = import.meta.glob("./cards/*.{webp,jpg,jpeg,png,avif}", {
  eager: true,
  query: "?url",
  import: "default",
});
const PHOTOS = import.meta.glob("./photos/*.{webp,jpg,jpeg,png,avif}", {
  eager: true,
  query: "?url",
  import: "default",
});

const pick = () => {
  const own = Object.keys(FILES).sort().map((k) => FILES[k]);
  if (own.length) return own;
  return Object.keys(PHOTOS).sort().map((k) => PHOTOS[k]);
};

const ICON_PLAY = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 7.5v9l7.5-4.5z" fill="currentColor"/></svg>`;

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

/**
 * A real damped-spring solution, as a GSAP ease plus the duration it needs to
 * settle. `stiffness` / `damping` are the component's own numbers.
 */
function spring(stiffness, damping) {
  const w0 = Math.sqrt(Math.max(1, stiffness));
  const z = Math.max(0.02, damping / (2 * w0));
  const decay = z * w0;
  const duration = clamp(6.9 / decay, 0.2, 4);
  if (z >= 1) {
    return {
      duration,
      ease: (p) => {
        const s = p * duration;
        return 1 - Math.exp(-w0 * s) * (1 + w0 * s);
      },
    };
  }
  const wd = w0 * Math.sqrt(1 - z * z);
  return {
    duration,
    ease: (p) => {
      const s = p * duration;
      return 1 - Math.exp(-decay * s) * (Math.cos(wd * s) + (decay / wd) * Math.sin(wd * s));
    },
  };
}

// deterministic per-card jitter, so `randomRotation` survives a rebuild
const hash = (i) => {
  const v = Math.sin((i + 1) * 91.7) * 43758.5453;
  return v - Math.floor(v);
};

export function createCardSwap({ mount, cfg }) {
  const root = document.createElement("div");
  root.className = "was-swap";
  const cap = document.createElement("p");
  cap.className = "was-swap-cap";
  const stackEl = document.createElement("div");
  stackEl.className = "was-swap-stack";
  root.append(cap, stackEl);
  mount.appendChild(root);

  let cards = [];   // creation order, never reordered
  let stack = [];   // bottom → TOP; the last one is the live card
  let drag = null;

  /** where a card sits in the deck, by its place in `stack` */
  function pose(i, card) {
    const C = cfg.cards;
    const n = stack.length;
    return {
      rotateZ: (n - i - 1) * C.fan + (C.randomRotation ? card.jitter : 0),
      scale: 1 + i * C.scaleStep - n * C.scaleStep,
    };
  }

  function layout(animate = true) {
    const C = cfg.cards;
    const s = spring(C.stiffness, C.damping);
    stack.forEach((card, i) => {
      const p = pose(i, card);
      // The z-index belongs on the DRAG layer, not on the card inside it: the
      // wrappers are what the pointer hits, and with `z-index: auto` on them
      // the deck would always hand every click to the last one in the DOM.
      card.rot.style.zIndex = String(i);
      gsap.to(card.el, {
        ...p,
        transformOrigin: C.origin,
        duration: animate ? s.duration : 0,
        ease: s.ease,
        overwrite: true,
      });
    });
  }

  /** pull a card out of the deck and drop it in at the bottom */
  function sendToBack(card) {
    const i = stack.indexOf(card);
    if (i < 0 || stack.length < 2) return;
    stack.splice(i, 1);
    stack.unshift(card);
    layout(true);
  }

  /** the drag layer springs home; the deck layer keeps its own pose */
  function releaseDrag(card, animate = true) {
    const C = cfg.cards;
    const s = spring(C.stiffness, C.damping);
    gsap.to(card.rot, {
      x: 0, y: 0, rotateX: 0, rotateY: 0,
      duration: animate ? s.duration : 0,
      ease: s.ease,
      overwrite: true,
    });
  }

  function onDown(card, e) {
    if (e.button !== undefined && e.button !== 0) return;
    gsap.killTweensOf(card.rot);
    drag = { card, x0: e.clientX, y0: e.clientY, dx: 0, dy: 0, moved: false };
    card.rot.setPointerCapture?.(e.pointerId);
    card.rot.classList.add("is-dragging");
  }

  function onMove(e) {
    if (!drag) return;
    const C = cfg.cards;
    drag.dx = e.clientX - drag.x0;
    drag.dy = e.clientY - drag.y0;
    if (Math.abs(drag.dx) > 3 || Math.abs(drag.dy) > 3) drag.moved = true;
    // framer's dragElastic against constraints pinned to the origin: the card
    // follows a fraction of the pointer
    const x = drag.dx * C.elastic;
    const y = drag.dy * C.elastic;
    const k = C.tiltMax / Math.max(1, C.tiltRange);
    gsap.set(drag.card.rot, {
      x, y,
      rotateX: clamp(-y * k, -C.tiltMax, C.tiltMax),
      rotateY: clamp(x * k, -C.tiltMax, C.tiltMax),
    });
  }

  function onUp() {
    if (!drag) return;
    const { card, dx, dy, moved } = drag;
    const C = cfg.cards;
    card.rot.classList.remove("is-dragging");
    drag = null;
    // the threshold is on the RAW pointer offset, as in the component
    const thrown = Math.abs(dx) > C.sensitivity || Math.abs(dy) > C.sensitivity;
    if (thrown || (!moved && C.clickToBack)) sendToBack(card);
    releaseDrag(card, true);
  }

  function build() {
    gsap.killTweensOf(cards.map((c) => c.el));
    stackEl.textContent = "";
    const C = cfg.cards;
    const srcs = pick();
    const n = Math.max(2, Math.round(C.count));
    cards = Array.from({ length: n }, (_, i) => {
      // the drag layer, and the deck layer inside it — one transform each,
      // exactly like CardRotate wrapping the card
      const rot = document.createElement("div");
      rot.className = "was-swap-rotate";
      const el = document.createElement("article");
      el.className = "was-swap-card";
      el.style.backgroundImage = `url(${srcs[i % srcs.length]})`;
      el.innerHTML = `<button class="was-swap-play" type="button" aria-label="Play">${ICON_PLAY}</button>`;
      rot.appendChild(el);
      stackEl.appendChild(rot);
      const card = { el, rot, jitter: hash(i) * 10 - 5 };
      rot.addEventListener("pointerdown", (e) => onDown(card, e));
      return card;
    });
    stack = [...cards];
    style();
    layout(false);
    stack.forEach((c) => releaseDrag(c, false));
  }

  function style() {
    const C = cfg.cards;
    root.style.setProperty("--swap-w", `${C.w}px`);
    root.style.setProperty("--swap-h", `${C.h}px`);
    root.style.setProperty("--swap-r", `${C.radius}px`);
    root.style.setProperty("--swap-persp", `${C.perspective}px`);
    root.style.setProperty("--swap-right", `${C.right}vw`);
    root.style.setProperty("--swap-bottom", `${C.bottom}vh`);
    root.style.setProperty("--swap-cap", `${C.capSize}vw`);
    cap.innerHTML = String(C.caption || "")
      .split("|")
      .map((l) => `<span>${l.trim()}</span>`)
      .join("");
    root.hidden = !C.show;
  }

  window.addEventListener("pointermove", onMove, { passive: true });
  window.addEventListener("pointerup", onUp);
  window.addEventListener("pointercancel", onUp);

  build();

  return {
    build,
    style: () => { style(); layout(true); },
    /** the panel's button, and the assertions */
    cycle: () => sendToBack(stack[stack.length - 1]),
    dispose() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      root.remove();
    },
    get count() { return cards.length; },
    /** which card is on top, by creation index */
    get frontIndex() { return cards.indexOf(stack[stack.length - 1]); },
    get order() { return stack.map((c) => cards.indexOf(c)); },
    /** the live transforms, for the assertions */
    poses() {
      return stack.map((c, i) => ({
        i: cards.indexOf(c),
        rotateZ: +(gsap.getProperty(c.el, "rotateZ") || 0).toFixed(2),
        scale: +(gsap.getProperty(c.el, "scale") || 1).toFixed(3),
        z: +c.rot.style.zIndex,
      }));
    },
    box() {
      const r = stack[stack.length - 1]?.el.getBoundingClientRect();
      return r ? { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) } : null;
    },
  };
}
