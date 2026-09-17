import { buildBlock, paintBlock, modeClass } from "./reveal.js";

// Copy for the pinned steps. One block per step, swapped on the same clock as
// whatever that step is driving: the outgoing block is still leaving while the
// next one arrives. The painting itself lives in reveal.js, shared with the
// hero.
//
// There are TWO of these, one per sticky section, because the two sections do
// not hold the same thing in both versions:
//
//   V1   A = the canvas experience (left column)   B = the evidence steps
//   V2   A = the RING ACT (top left)               B = the canvas experience
//
// So each instance owns a slice of `cfg.steps` — `from` → `to` — and paints it
// against that slice of the ranges. `which` is only used to know whether this
// box is the one carrying V2's ring act, which is styled and revealed
// differently from every other block of copy on the page.

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

export function createCopy({ mount, cfg, from = 0, to = Infinity, which = "A" }) {
  const root = document.createElement("div");
  root.className = "was-copy-stack";
  mount.appendChild(root);

  let blocks = [];

  /** is this box carrying V2's ring act? */
  const isAct = () => !!cfg.v2.on && which === "A";
  const slice = () => cfg.steps.slice(from, to === Infinity ? undefined : to);
  const mode = () => (isAct() ? cfg.v2.act.copyMode : cfg.text.mode);
  // Every block in V2 is revealed the same way: opacity 0 → 1 while EXPO
  // travels +100 → −10, strictly in place, and the exit is that run backwards.
  const params = () =>
    isAct()
      ? { ...cfg.text, ...cfg.v2.reveal }
      : cfg.text.mode === "intro"
        ? cfg.intro
        : cfg.text;

  function build() {
    root.textContent = "";
    blocks = slice().map((step, i) => {
      const el = document.createElement("div");
      el.className = "was-copy";
      el.dataset.step = String(from + i + 1);
      root.appendChild(el);
      return buildBlock(el, step.text);
    });
    style();
  }

  /** one array value per step of the ring act, falling back past its end */
  const at = (arr, i, fallback) =>
    Array.isArray(arr) ? arr[Math.min(arr.length - 1, Math.max(0, i))] ?? fallback : arr ?? fallback;

  function style() {
    const act = isAct();
    mount.classList.toggle("is-act", act);
    const t = cfg.text;
    const A = cfg.v2.act;
    root.style.setProperty("--copy-size", `${act ? at(A.copySize, 0, 2) : t.size}vw`);
    root.style.setProperty("--copy-lh", String(t.lineHeight));
    root.style.setProperty("--copy-track", `${t.tracking}em`);
    root.style.setProperty("--copy-align", act ? A.copyAlign || "left" : t.align);
    root.style.setProperty("--copy-font", t.font);
    if (act) {
      // the real per-step position is applied every frame in `update()`, from
      // whichever step is actually the visible one — this is only the resting
      // paint, before the clock has run once
      mount.style.setProperty("--act-x", `${at(A.copyX, 0, 4)}vw`);
      mount.style.setProperty("--act-y", `${at(A.copyY, 0, 18)}%`);
      mount.style.setProperty("--act-w", `${at(A.copyWidth, 0, 40)}vw`);
    }
    const m = mode();
    for (const b of blocks) modeClass(b.el, m);
  }

  // ranges[i] = { s0, s1, len } in global-p units. `p` is UNCLAMPED — it is
  // negative while the section is still approaching, which is what lets the
  // first block be fully in by the time the pin engages.
  function update(p, ranges, leadNorm = 0) {
    const t = cfg.text;
    const m = mode();
    const pr = params();
    const act = isAct();
    const A = cfg.v2.act;
    // which step is actually the visible one right now, so its OWN keyframe
    // of position/size can be applied to the shared box — the three steps
    // never show at once, so the box only ever needs one at a time
    let activeI = -1;
    let activeAlpha = -1;
    for (let i = 0; i < blocks.length; i++) {
      const gi = from + i;                  // the step's index on the page
      const b = blocks[i];
      const r = ranges[gi];
      const step = cfg.steps[gi];
      if (!r || !step) continue;

      const delay = step.textDelay || 0;
      // only the very first block on the page gets the approach lead
      const inStart =
        gi === 0 ? -leadNorm : r.s0 + (delay - t.overlap) * r.len;
      const inEnd = inStart + Math.max(0.01, step.textIn) * r.len;
      // `textOut: 0` means it NEVER leaves — the same convention the hero's
      // beats use. Without the guard a zero would be read as an instant exit
      // at the very end of the step, which is the opposite of what it says.
      const stays = !(step.textOut > 0);
      const outEnd = r.s1;
      const outStart = r.s1 - Math.max(0.01, step.textOut) * r.len;

      const eIn = clamp01((p - inStart) / Math.max(1e-4, inEnd - inStart));
      const eOut = stays
        ? 0
        : clamp01((p - outStart) / Math.max(1e-4, outEnd - outStart));

      // fully gone → stop touching the DOM
      if (eIn <= 0 || eOut >= 1) {
        if (b.alive) {
          b.el.style.visibility = "hidden";
          b.alive = false;
        }
        b.st.alpha = 0;
        continue;
      }
      if (!b.alive) {
        b.el.style.visibility = "visible";
        b.alive = true;
      }
      b.el.style.opacity = "1";
      paintBlock(b, m, eIn, eOut, pr);
      if (act && b.st.alpha > activeAlpha) {
        activeAlpha = b.st.alpha;
        activeI = i;
      }
    }
    // the ring act's three steps never share the box, so it only ever needs
    // ONE step's own position/size — whichever one is actually the most
    // visible this frame (falls back to step 0 before anything has fired yet)
    if (act) {
      const i = activeI >= 0 ? activeI : 0;
      mount.style.setProperty("--act-x", `${at(A.copyX, i, 4)}vw`);
      mount.style.setProperty("--act-y", `${at(A.copyY, i, 18)}%`);
      mount.style.setProperty("--act-w", `${at(A.copyWidth, i, 40)}vw`);
      root.style.setProperty("--copy-size", `${at(A.copySize, i, 2)}vw`);
    }
  }

  build();
  return {
    build, style, update, root, which, from,
    get blocks() { return blocks; },
    get isAct() { return isAct(); },
    alphas: () => blocks.map((b) => +b.st.alpha.toFixed(2)),
    expos: () => blocks.map((b) => Math.round(b.st.expo)),
  };
}
