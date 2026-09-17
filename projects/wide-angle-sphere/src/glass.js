// ---------------------------------------------------------------------------
// GlassSurface, ported from the React Bits component to vanilla.
//
// The idea: instead of `backdrop-filter: blur()`, which only softens, run the
// backdrop through an SVG filter that DISPLACES it. A gradient map (red across,
// blue down) drives three feDisplacementMaps — one per channel, each at a
// slightly different scale — so the edges of the panel bend the background and
// split it into colour, the way a real piece of glass does. The three channels
// are recombined with screen blends and a last small blur.
//
// `backdrop-filter: url(#id)` is Chromium-only, so `supported()` gates it and
// everything falls back to a plain frosted blur elsewhere.
// ---------------------------------------------------------------------------

const SVG_NS = "http://www.w3.org/2000/svg";
let uid = 0;

/** Does this browser run an SVG filter as a backdrop-filter? */
export function glassSupported() {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent;
  const isWebkit = /Safari/.test(ua) && !/Chrome/.test(ua);
  const isFirefox = /Firefox/.test(ua);
  if (isWebkit || isFirefox) return false;
  const d = document.createElement("div");
  d.style.backdropFilter = "url(#glass-probe)";
  return d.style.backdropFilter !== "";
}

const el = (name, attrs) => {
  const n = document.createElementNS(SVG_NS, name);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  return n;
};

/**
 * Attaches the filter to `host` and returns a handle.
 * `params` is the live config object (see CONFIG.left.card.glass).
 */
export function createGlass({ host, params }) {
  const id = `was-glass-${++uid}`;
  const redGrad = `${id}-r`;
  const blueGrad = `${id}-b`;
  const supported = glassSupported();

  // the filter lives in its own invisible svg, next to the surface it drives
  const svg = el("svg", { class: "was-glass-defs", xmlns: SVG_NS });
  const defs = el("defs", {});
  const filter = el("filter", {
    id,
    "color-interpolation-filters": "sRGB",
    x: "0%", y: "0%", width: "100%", height: "100%",
  });

  const feImage = el("feImage", {
    x: "0", y: "0", width: "100%", height: "100%",
    preserveAspectRatio: "none", result: "map",
  });

  const channel = (name, result) =>
    el("feDisplacementMap", { in: "SourceGraphic", in2: "map", id: `${id}-${name}`, result });
  const dispR = channel("r", "dispRed");
  const dispG = channel("g", "dispGreen");
  const dispB = channel("b", "dispBlue");

  const matrix = (input, values, result) =>
    el("feColorMatrix", { in: input, type: "matrix", values, result });
  const mR = matrix("dispRed", "1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0", "red");
  const mG = matrix("dispGreen", "0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0", "green");
  const mB = matrix("dispBlue", "0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0", "blue");

  const blendRG = el("feBlend", { in: "red", in2: "green", mode: "screen", result: "rg" });
  const blendRGB = el("feBlend", { in: "rg", in2: "blue", mode: "screen", result: "output" });
  const blur = el("feGaussianBlur", { in: "output", stdDeviation: "0.7" });

  filter.append(feImage, dispR, mR, dispG, mG, dispB, mB, blendRG, blendRGB, blur);
  defs.appendChild(filter);
  svg.appendChild(defs);
  host.appendChild(svg);

  host.classList.add(supported ? "is-glass-svg" : "is-glass-fallback");

  let size = { w: 0, h: 0 };

  /** The displacement map itself, rebuilt as a data: URI whenever size changes. */
  function map(w, h) {
    const g = params;
    const edge = Math.min(w, h) * (g.borderWidth * 0.5);
    const r = g.radius;
    const svgStr = `<svg viewBox="0 0 ${w} ${h}" xmlns="${SVG_NS}">
<defs>
<linearGradient id="${redGrad}" x1="100%" y1="0%" x2="0%" y2="0%"><stop offset="0%" stop-color="#0000"/><stop offset="100%" stop-color="red"/></linearGradient>
<linearGradient id="${blueGrad}" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#0000"/><stop offset="100%" stop-color="blue"/></linearGradient>
</defs>
<rect x="0" y="0" width="${w}" height="${h}" fill="black"/>
<rect x="0" y="0" width="${w}" height="${h}" rx="${r}" fill="url(#${redGrad})"/>
<rect x="0" y="0" width="${w}" height="${h}" rx="${r}" fill="url(#${blueGrad})" style="mix-blend-mode:${g.blend}"/>
<rect x="${edge}" y="${edge}" width="${Math.max(0, w - edge * 2)}" height="${Math.max(0, h - edge * 2)}" rx="${r}" fill="hsl(0 0% ${g.brightness}% / ${g.opacity})" style="filter:blur(${g.blur}px)"/>
</svg>`;
    return `data:image/svg+xml,${encodeURIComponent(svgStr)}`;
  }

  function apply(w = size.w, h = size.h) {
    size = { w, h };
    const g = params;
    if (!supported || !g.on) {
      host.style.backdropFilter = g.on
        ? `blur(${g.fallbackBlur}px) saturate(${g.saturation})`
        : "";
      host.style.webkitBackdropFilter = host.style.backdropFilter;
      return;
    }
    if (w > 0 && h > 0) feImage.setAttribute("href", map(w, h));
    dispR.setAttribute("scale", String(g.scale + g.redOffset));
    dispG.setAttribute("scale", String(g.scale + g.greenOffset));
    dispB.setAttribute("scale", String(g.scale + g.blueOffset));
    for (const d of [dispR, dispG, dispB]) {
      d.setAttribute("xChannelSelector", g.xChannel);
      d.setAttribute("yChannelSelector", g.yChannel);
    }
    blur.setAttribute("stdDeviation", String(g.displace));
    host.style.backdropFilter = `url(#${id}) saturate(${g.saturation})`;
    host.style.webkitBackdropFilter = host.style.backdropFilter;
  }

  return {
    apply,
    get supported() { return supported; },
    get id() { return id; },
    dispose() { svg.remove(); },
  };
}
