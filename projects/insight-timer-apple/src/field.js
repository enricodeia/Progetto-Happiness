import * as THREE from "three";

// Everything that lies around the bowl, on the table or at the height of its
// rim, drawn in 2D on two canvases that sandwich the WebGL one. A point
// farther than the bowl's centre (group-space z < 0) is drawn on the canvas
// behind, so the metal hides it where they overlap; everything else is drawn
// on the canvas in front. Lines stay one CSS pixel at any DPR, labels are
// real text, and nothing here allocates per frame.

export function createField({ back, front, bowl, rgb = "224,176,111" }) {
  const CTX = [back.getContext("2d"), front.getContext("2d")];
  const GOLD = `rgb(${rgb})`;
  let W = 1, H = 1, dpr = 1;

  function resize() {
    const r = front.getBoundingClientRect();
    W = Math.max(1, r.width);
    H = Math.max(1, r.height);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    for (const c of [back, front]) {
      c.width = Math.round(W * dpr);
      c.height = Math.round(H * dpr);
    }
  }

  // group space → CSS px of the stage, with the camera the bowl renders with
  const pvm = new THREE.Matrix4();
  const m = pvm.elements;
  let k = 1;
  const P = { x: 0, y: 0, w: 1, s: 1 };
  function project(x, y, z, o = P) {
    const w = m[3] * x + m[7] * y + m[11] * z + m[15];
    const iw = 1 / w;
    o.x = ((m[0] * x + m[4] * y + m[8] * z + m[12]) * iw + 1) * 0.5 * W;
    o.y = (1 - (m[1] * x + m[5] * y + m[9] * z + m[13]) * iw) * 0.5 * H;
    o.w = w;
    o.s = k * iw;   // CSS px per group unit at this depth
    return o;
  }

  function begin() {
    const cam = bowl.camera, g = bowl.group;
    g.updateMatrixWorld();
    pvm.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse).multiply(g.matrixWorld);
    k = (g.scale.x * H) / (2 * Math.tan((cam.fov * Math.PI) / 360));
    for (const c of CTX) {
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.clearRect(0, 0, c.canvas.width, c.canvas.height);
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.strokeStyle = GOLD;
      c.fillStyle = GOLD;
      c.lineCap = "round";
      c.globalAlpha = 1;
    }
  }

  // a closed or partial polyline on a horizontal plane, split front/back by
  // each segment's own depth; `radius(i, a)` gives the radius at step i
  function arc(y, n, from, span, cx, cz, radius, alpha, width, style) {
    const [b, f] = CTX;
    b.beginPath(); f.beginPath();
    let side = -1, px = 0, py = 0, pz = 0;
    for (let i = 0; i <= n; i++) {
      const a = from + (span * i) / n;
      const r = radius(i, a);
      const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
      project(x, y, z);
      if (i > 0) {
        const sd = (z + pz) * 0.5 < 0 ? 0 : 1;
        if (sd !== side) CTX[sd].moveTo(px, py);
        CTX[sd].lineTo(P.x, P.y);
        side = sd;
      }
      px = P.x; py = P.y; pz = z;
    }
    for (const c of CTX) { c.globalAlpha = alpha; c.lineWidth = width; c.strokeStyle = style; c.stroke(); }
  }

  /** a circle of radius r at height y, centred at (cx, cz); `span` < 2π draws part of it */
  function ring(r, y, alpha, { cx = 0, cz = 0, width = 1, from = 0, span = Math.PI * 2, steps = 160, style = GOLD } = {}) {
    if (alpha <= 0.003 || span <= 0.001 || r <= 0) return;
    const n = Math.max(2, Math.ceil((steps * span) / (Math.PI * 2)));
    arc(y, n, from, span, cx, cz, () => r, alpha, width, style);
  }

  /** the waveform bent around a circle, rotating slowly */
  function scope(samples, r, y, gain, alpha, rot = 0, n = 192) {
    if (alpha <= 0.003) return;
    const stride = Math.max(1, Math.floor(samples.length / n));
    arc(y, n, rot, Math.PI * 2, 0, 0, (i) => r + samples[(i % n) * stride] * gain, alpha, 1, GOLD);
  }

  /** one straight line between two group-space points */
  function segment(x1, y1, z1, x2, y2, z2, alpha, width = 1, style = GOLD) {
    if (alpha <= 0.003) return;
    const c = CTX[(z1 + z2) * 0.5 < 0 ? 0 : 1];
    project(x1, y1, z1);
    const ax = P.x, ay = P.y;
    project(x2, y2, z2);
    c.globalAlpha = alpha; c.lineWidth = width; c.strokeStyle = style;
    c.beginPath(); c.moveTo(ax, ay); c.lineTo(P.x, P.y); c.stroke();
  }

  // many small squares on a plane, binned by alpha so a whole field is a
  // dozen fills rather than thousands
  const BINS = 8;
  let dpx = null, dpy = null, dsz = null, dbin = null;
  function dots(xs, zs, y, alpha, sizeU) {
    const n = xs.length;
    if (!dpx || dpx.length !== n) {
      dpx = new Float32Array(n); dpy = new Float32Array(n); dsz = new Float32Array(n); dbin = new Uint8Array(n);
    }
    for (let i = 0; i < n; i++) {
      const a = alpha[i];
      if (a <= 0.01) { dbin[i] = 255; continue; }
      project(xs[i], y, zs[i]);
      dpx[i] = P.x; dpy[i] = P.y; dsz[i] = Math.max(1, sizeU * P.s);
      dbin[i] = Math.min(BINS - 1, (a * BINS) | 0) + (zs[i] < 0 ? 0 : 16);
    }
    for (let sd = 0; sd < 2; sd++) {
      const c = CTX[sd];
      c.fillStyle = GOLD;
      for (let b = 0; b < BINS; b++) {
        const code = b + sd * 16;
        c.globalAlpha = (b + 0.75) / BINS;
        c.beginPath();
        let any = false;
        for (let i = 0; i < n; i++) {
          if (dbin[i] !== code) continue;
          const s = dsz[i];
          c.rect(dpx[i] - s * 0.5, dpy[i] - s * 0.5, s, s);
          any = true;
        }
        if (any) c.fill();
      }
    }
  }

  /** text on the front canvas, in CSS px */
  function label(text, x, y, { align = "left", font = "500 13px -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif", alpha = 1, color = "#fff", baseline = "middle", spacing = "0px", margin = -1 } = {}) {
    if (alpha <= 0.003) return;
    const c = CTX[1];
    c.globalAlpha = alpha;
    c.fillStyle = color;
    c.font = font;
    c.textAlign = align;
    c.textBaseline = baseline;
    if ("letterSpacing" in c) c.letterSpacing = spacing;
    // kept inside the stage when a margin is given
    if (margin >= 0) {
      const w = c.measureText(text).width;
      const lo = align === "center" ? w / 2 : align === "right" ? w : 0;
      const hi = align === "center" ? w / 2 : align === "right" ? 0 : w;
      x = Math.min(W - margin - hi, Math.max(margin + lo, x));
    }
    c.fillText(text, x, y);
    if ("letterSpacing" in c) c.letterSpacing = "0px";
    c.fillStyle = GOLD;
  }

  return {
    resize, begin, project, ring, scope, segment, dots, label,
    /** the canvas a point of this depth belongs on */
    ctx: (z) => CTX[z < 0 ? 0 : 1],
    GOLD,
    get W() { return W; },
    get H() { return H; },
  };
}
