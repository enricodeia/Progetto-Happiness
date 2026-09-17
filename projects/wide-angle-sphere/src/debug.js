// Scroll markers. A vertical track of the pinned scroll with one segment per
// step and the animation windows drawn on top of it, plus a numeric HUD —
// so it is obvious where a block starts, where it hands over, and how long
// each one actually lasts. Toggle with M (or the panel).

import { stepRanges, pinVh } from "./timeline.js";

export function createDebug({ cfg, host }) {
  const root = document.createElement("div");
  root.className = "was-debug";
  root.innerHTML = `
    <div class="was-track">
      <div class="was-track-bar"></div>
      <div class="was-track-dot"></div>
    </div>
    <div class="was-hud"></div>`;
  host.appendChild(root);

  const bar = root.querySelector(".was-track-bar");
  const dot = root.querySelector(".was-track-dot");
  const hud = root.querySelector(".was-hud");

  function build() {
    const ranges = stepRanges(cfg);
    const total = pinVh(cfg);
    bar.textContent = "";

    ranges.forEach((r, i) => {
      const seg = document.createElement("div");
      seg.className = "was-seg";
      seg.style.top = `${r.s0 * 100}%`;
      seg.style.height = `${r.len * 100}%`;
      seg.dataset.odd = String(i % 2);
      seg.innerHTML =
        `<span class="was-seg-label">${i + 1} · ${cfg.steps[i].name}` +
        `<em>${cfg.steps[i].vh}vh</em></span>`;
      bar.appendChild(seg);

      // copy in / out windows for this step
      const cin = document.createElement("div");
      cin.className = "was-win was-win-copy";
      const inStart = r.s0 - cfg.text.overlap * r.len;
      const inEnd = r.s0 + cfg.steps[i].textIn * r.len;
      cin.style.top = `${inStart * 100}%`;
      cin.style.height = `${(inEnd - inStart) * 100}%`;
      bar.appendChild(cin);

      const cout = document.createElement("div");
      cout.className = "was-win was-win-copy is-out";
      cout.style.top = `${(r.s1 - cfg.steps[i].textOut * r.len) * 100}%`;
      cout.style.height = `${cfg.steps[i].textOut * r.len * 100}%`;
      bar.appendChild(cout);
    });

    // animation windows
    const r1 = ranges[1] || ranges[ranges.length - 1];
    const r2 = ranges[2] || ranges[ranges.length - 1];
    const asmStart = r1.s0;
    const asmEnd = Math.min(r1.s1, r1.s0 + cfg.assembly.endFrac * r1.len);
    const pillStart = r2.s0 + cfg.pills3d.startFrac * r2.len;
    const pillEnd = Math.min(r2.s1, pillStart + cfg.pills3d.span * r2.len);

    const win = (a, b, cls, label) => {
      const d = document.createElement("div");
      d.className = `was-win ${cls}`;
      d.style.top = `${a * 100}%`;
      d.style.height = `${(b - a) * 100}%`;
      d.innerHTML = `<span>${label}</span>`;
      bar.appendChild(d);
    };
    win(asmStart, asmEnd, "was-win-asm", "assembly");
    win(pillStart, pillEnd, "was-win-pill", "pills");

    root.dataset.total = String(total);
  }

  // Perf pass (2026-09-17): the HUD used to rebuild its innerHTML on every
  // frame, which dirtied layout whether or not a digit had changed. It is six
  // text cells built once, each written only when its string differs — and
  // not written at all while hidden (M, or C's clean view).
  const cells = ["p", "step", "local", "scroll", "asm", "pills"].map((label) => {
    const b = document.createElement("b");
    b.textContent = label;
    const v = document.createElement("span");
    hud.append(b, v);
    return v;
  });
  const last = cells.map(() => "");
  let lastTop = "";

  function update(tl) {
    if (!cfg.debug.markers || document.body.classList.contains("is-clean")) return;
    const top = `${(tl.p * 100).toFixed(2)}%`;
    if (top !== lastTop) {
      lastTop = top;
      dot.style.top = top;
    }
    const s = cfg.steps[tl.step];
    const vals = [
      tl.p.toFixed(3),
      `${tl.step + 1}/${cfg.steps.length} ${s ? s.name : ""}`,
      tl.local.toFixed(2),
      `${Math.round(tl.p * tl.pinVh)}/${tl.pinVh}vh`,
      tl.asm.toFixed(2),
      tl.pill.toFixed(2),
    ];
    for (let i = 0; i < vals.length; i++) {
      if (vals[i] !== last[i]) {
        last[i] = vals[i];
        cells[i].textContent = vals[i];
      }
    }
  }

  function apply() {
    root.classList.toggle("is-hidden", !cfg.debug.markers);
    document.body.classList.toggle("is-grid", !!cfg.debug.grid);
  }

  build();
  apply();

  return {
    build,
    update,
    apply,
    toggle: () => {
      cfg.debug.markers = !cfg.debug.markers;
      apply();
    },
  };
}
