// ─────────────────────────────────────────────────────────────────────────────
// The small 2D sketch above the Atlas header — his ask, 2026-09-15: a curve
// that MORPHS into shape once, on entry, as a preview of the mark about to
// draw itself in 3D below it. No MorphSVGPlugin (unused everywhere else in
// his own projects too — nothing to license or port): a closed curve is just
// N points, and morphing between two shapes with the SAME point count is a
// per-point lerp, recomputed into a fresh `d` each frame while it plays.
//
// Circle → a 3-lobed curve (matching the Atlas's own `lobes`), so it reads as
// a sketch of the SAME mark, not a generic decoration.
// ─────────────────────────────────────────────────────────────────────────────

const SVG_NS = "http://www.w3.org/2000/svg";
const TAU = Math.PI * 2;
const N = 120;
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (x) => x * x * (3 - 2 * x);

function ring(radiusFn) {
  const pts = [];
  for (let i = 0; i < N; i++) {
    const a = (i / N) * TAU;
    const r = radiusFn(a);
    pts.push([50 + r * Math.cos(a), 50 + r * Math.sin(a)]);
  }
  return pts;
}

function pathFrom(pts) {
  let d = `M${pts[0][0].toFixed(2)},${pts[0][1].toFixed(2)}`;
  for (let i = 1; i < pts.length; i++) d += `L${pts[i][0].toFixed(2)},${pts[i][1].toFixed(2)}`;
  return d + "Z";
}

export function createAtlasSketch({ mount, lobes = 3, amplitude = 0.34, radius = 32 }) {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("class", "was-atlas-sketch");
  svg.setAttribute("viewBox", "0 0 100 100");
  const path = document.createElementNS(SVG_NS, "path");
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", "currentColor");
  path.setAttribute("stroke-width", "1.1");
  path.setAttribute("stroke-linejoin", "round");
  svg.appendChild(path);
  mount.appendChild(svg);

  const start = ring(() => radius);
  const end = ring((a) => radius * (1 + amplitude * Math.cos(lobes * a)));

  let last = -1;
  function set(t) {
    const c = clamp01(t);
    if (c === last) return;
    last = c;
    const e = smooth(c);
    const pts = start.map((p, i) => [lerp(p[0], end[i][0], e), lerp(p[1], end[i][1], e)]);
    path.setAttribute("d", pathFrom(pts));
    // a small settle-spin, dying out as it finishes — not part of the shape
    // interpolation itself, just what makes it read as "arriving"
    svg.style.transform = `rotate(${((1 - e) * -24).toFixed(2)}deg)`;
    svg.style.opacity = c.toFixed(3);
  }
  set(0);

  return {
    set,
    get el() { return svg; },
    probe() { return { d: path.getAttribute("d"), opacity: +svg.style.opacity, t: last }; },
  };
}
