// ─────────────────────────────────────────────────────────────────────────────
// V2 — the quiet section the bowl descends into.
//
// It is deliberately empty. It is the beat AFTER the act: no interaction, no
// copy, nothing to scrub — one full frame of the same square photograph the
// left column of the pinned steps opens on, so the page has somewhere to land
// before the canvas experience starts.
//
// Its one structural job is the descent. It is OPAQUE and it sits above the
// bowl's layer (5 against 4), so as it rises it takes the bowl over. That is
// what "the ball goes down INTO the next section" actually means here: the bowl
// keeps travelling down and this section closes over it, the same way every
// other handover on this page works.
//
// In V1 it is `hidden` — display: none, not just invisible — so it adds nothing
// to the page's height and every landmark the rest of the piece measures from
// stays exactly where it was.
// ─────────────────────────────────────────────────────────────────────────────

export function createQuiet({ el, images, cfg }) {
  el.innerHTML = `<div class="was-quiet-bg"></div>`;
  const bg = el.querySelector(".was-quiet-bg");

  function style() {
    const q = cfg.v2.quiet;
    const on = !!cfg.v2.on && !!q.show;
    el.hidden = !on;
    if (!on) return;
    el.style.height = `${Math.max(10, q.vh)}vh`;
    const src = images[Math.min(Math.max(0, Math.round(q.image)), images.length - 1)];
    bg.style.backgroundImage = src ? `url("${src}")` : "none";
    bg.style.backgroundSize = q.fit === "contain" ? "contain" : "cover";
    bg.style.setProperty("--dim", String(Math.max(0, Math.min(1, q.dim))));
  }

  style();

  return {
    style,
    get on() { return !el.hidden; },
    /** what the section is actually showing, for the assertions */
    probe() {
      const r = el.getBoundingClientRect();
      return {
        on: !el.hidden,
        image: bg.style.backgroundImage,
        h: Math.round(r.height),
        top: Math.round(r.top),
        z: +getComputedStyle(el).zIndex || 0,
      };
    },
  };
}
