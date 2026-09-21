// The scroll bar (his ask, 2026-09-17) — a thin line along the bottom of the
// viewport that fills left → right across the whole pinned canvas clock. Not a
// readout ("non per vedere la percentuale"): it is there so the length of the
// scroll can be FELT. Driven from the raf loop with the UNCLAMPED clock, so it
// can fade in over its first few percent and out again once the clock is done
// — a stark white bar sitting fully lit before anything has moved is exactly
// what "così che non si veda che sta iniziando a partire" rules out.
//
// The fill is a `scaleX` transform, never a width: one composited property,
// no layout per frame.

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** `ink()` — an override for the bar's colour (Experience 1's white page,
 *  2026-09-21: a white bar over a white page is no bar), null for `cfg` */
export function createProgress({ mount, cfg, ink = () => null }) {
  const root = document.createElement("div");
  root.className = "was-progress";
  root.innerHTML = `<div class="was-progress-fill"></div>`;
  mount.appendChild(root);
  const fill = root.querySelector(".was-progress-fill");

  let value = 0;
  let alpha = 0;

  function style() {
    const P = cfg.progress;
    root.hidden = !P.show;
    root.style.setProperty("--pg-h", `${P.height}px`);
    root.style.setProperty("--pg-r", `${P.radius}px`);
    root.style.setProperty("--pg-bottom", `${P.bottom}px`);
    root.style.setProperty("--pg-inset", `${P.inset}vw`);
    const over = ink();
    root.style.setProperty("--pg-color", over || P.color);
    root.style.setProperty("--pg-track", String(P.trackAlpha));
    // the hairline exists to keep a WHITE fill readable over white — an ink
    // bar has no such problem, and the line would only muddy it
    root.style.setProperty("--pg-edge", String(over ? 0 : (P.edge ?? 0)));
    root.classList.toggle("is-wavy", !!P.wavy);
  }

  /** `raw` — the canvas clock, UNCLAMPED: negative on the approach, > 1 after */
  function set(raw) {
    const P = cfg.progress;
    value = clamp01(raw);
    const inA = clamp01(raw / Math.max(0.001, P.fadeIn));
    const outA = 1 - clamp01((raw - 1) / Math.max(0.001, P.fadeOut));
    alpha = inA * outA;
    root.style.opacity = alpha.toFixed(3);
    fill.style.transform = `scaleX(${value.toFixed(4)})`;
  }

  style();
  set(-1);

  return {
    style,
    set,
    probe() {
      const r = root.getBoundingClientRect();
      return {
        value: +value.toFixed(3),
        alpha: +alpha.toFixed(3),
        hidden: root.hidden,
        height: Math.round(r.height),
        bottomGap: Math.round(window.innerHeight - r.bottom),
        fillScale: fill.style.transform,
        color: getComputedStyle(fill).backgroundColor,
      };
    },
  };
}
