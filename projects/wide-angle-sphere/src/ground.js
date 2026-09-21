import * as THREE from "three";
import gsap from "gsap";

// ─────────────────────────────────────────────────────────────────────────────
// V2 — the ground.
//
// The field the page opens out into, on its own layer BEHIND the bowl (2,
// against the under-layer's 3 and the bowl's 4). It is a MASK, not a picture:
// inside it the field is uncovered, outside it the page's own paper is
// untouched and nothing has changed.
//
// The mask starts as a point behind the object and propagates outward. Its edge
// is broken up by FBM — so it reads as something spreading rather than a circle
// growing — and its centre drifts slowly around the bowl (`wander`) instead of
// sitting still, which is what stops the whole thing looking like a wipe.
//
// What it uncovers is the THREE STEP IMAGES (src/values/*), one per step of the
// ring act, crossfaded at each boundary and seen THROUGH GLASS: a wide frosted
// sample, the same FBM pushing the lookup around (refraction), a small split
// between the channels, and a breath of white over the top. It is the left
// column's GlassSurface done in the shader that is already drawing the field,
// rather than a second DOM layer trying to line up with it.
//
// A video takes the MASK over when there is one: drop a webm in `public/video/`
// and name it in `v2.ground.video`, and its luminance becomes the mask — same
// scale, same centre, same everything else.
// ─────────────────────────────────────────────────────────────────────────────

const VS = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const FS = /* glsl */ `
precision highp float;
varying vec2 vUv;

uniform vec2  uRes;        // the viewport, in px
uniform vec2  uCentre;     // where it opens from, in 0-1 of the viewport
uniform float uRadius;     // how far it reaches, in viewport HEIGHTS
uniform float uSoft;       // the edge, as a share of the radius
uniform float uFbm;        // how much the FBM breaks the edge up
uniform float uFreq;
uniform float uTime;
uniform float uSpeed;
uniform float uOct;
uniform vec3  uColorA;     // the tint at the centre
uniform vec3  uColorB;     // ...and at the edge
uniform float uTint;       // how much of it is laid over the photograph
uniform float uAlpha;
uniform sampler2D uVideo;
uniform float uHasVideo;

// the field: two of his images, crossfaded, behind glass
uniform sampler2D uTexA;
uniform sampler2D uTexB;
uniform float uHasTex;
uniform float uMix;
uniform float uAspectA;
uniform float uAspectB;
uniform float uGlass;      // 0 = the photograph plain, 1 = the full treatment
uniform float uGBlur;
uniform float uGTaps;
uniform float uGRefract;
uniform float uGSplit;
uniform vec3  uGTintCol;
uniform float uGTint;
uniform float uGBright;
uniform float uGSat;
uniform float uZoom;       // > 1 — how much the photograph is enlarged, i.e. the room there is to pan
uniform float uPan;        // the pan, in UV of the zoomed photograph; + shows its TOP, − its BOTTOM

// value noise + fbm — cheap, and it only ever runs on one full-screen quad
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 6; i++) {
    if (float(i) >= uOct) break;
    v += a * noise(p);
    p *= 2.02;
    a *= 0.5;
  }
  return v;
}

/** cover-fit: the image fills the frame and is cropped, never letterboxed */
vec2 cover(vec2 uv, float ia, float sa) {
  vec2 s = ia > sa ? vec2(sa / ia, 1.0) : vec2(1.0, ia / sa);
  return (uv - 0.5) * s + 0.5;
}

/** ...then zoomed in by uZoom and panned by uPan — the parallax itself */
vec2 pan(vec2 cuv) {
  vec2 z = (cuv - 0.5) / max(1.0, uZoom) + 0.5;
  z.y += uPan;
  return z;
}

/**
 * The frost. A golden-angle disc of taps, with the three channels pulled apart
 * slightly along each one — which is what makes it read as glass rather than as
 * a blur: the colour separates at the edges the way it does through a lens.
 */
vec3 frost(sampler2D tex, vec2 uv, float r, float seed) {
  vec3 acc = vec3(0.0);
  float n = 0.0;
  for (int i = 0; i < 16; i++) {
    if (float(i) >= uGTaps) break;
    float a = float(i) * 2.39996 + seed;
    float rad = r * sqrt((float(i) + 0.5) / max(1.0, uGTaps));
    vec2 d = vec2(cos(a), sin(a)) * rad;
    acc.r += texture2D(tex, clamp(uv + d * (1.0 + uGSplit), 0.0, 1.0)).r;
    acc.g += texture2D(tex, clamp(uv + d, 0.0, 1.0)).g;
    acc.b += texture2D(tex, clamp(uv + d * (1.0 - uGSplit), 0.0, 1.0)).b;
    n += 1.0;
  }
  return acc / max(1.0, n);
}

void main() {
  // measure in viewport HEIGHTS, so the shape is a circle and not an ellipse
  float ar = uRes.x / max(1.0, uRes.y);
  vec2 p = vec2((vUv.x - uCentre.x) * ar, vUv.y - uCentre.y);

  float m;
  if (uHasVideo > 0.5) {
    // the footage IS the mask: its luminance, scaled about the same centre
    vec2 vuv = p / max(0.0001, uRadius * 2.0) + 0.5;
    vec3 c = texture2D(uVideo, clamp(vuv, 0.0, 1.0)).rgb;
    float luma = dot(c, vec3(0.2126, 0.7152, 0.0722));
    float inside = step(0.0, vuv.x) * step(vuv.x, 1.0) * step(0.0, vuv.y) * step(vuv.y, 1.0);
    m = smoothstep(0.5 - uSoft, 0.5 + uSoft, luma) * inside;
  } else {
    float d = length(p);
    // the edge, broken up — the noise is sampled in the SAME space as the
    // distance, so the break-up rides the shape instead of the screen
    float n = (fbm(p * uFreq + uTime * uSpeed) - 0.5) * 2.0;
    d += n * uFbm * uRadius;
    float soft = max(0.001, uSoft * uRadius);
    m = 1.0 - smoothstep(uRadius - soft, uRadius + soft, d);
  }

  if (m <= 0.001) discard;

  float t = clamp(length(p) / max(0.0001, uRadius), 0.0, 1.0);
  vec3 tintCol = mix(uColorA, uColorB, t * t);
  vec3 col = tintCol;

  if (uHasTex > 0.5) {
    // the same FBM that broke the edge up bends the lookup: the glass and the
    // opening are the same piece of noise, so they belong to each other
    vec2 g = vec2(fbm(p * uFreq * 0.8 + uTime * uSpeed),
                  fbm(p * uFreq * 0.8 + 11.7 - uTime * uSpeed)) - 0.5;
    vec2 off = g * 2.0 * uGRefract * uGlass;
    float seed = hash(floor(vUv * 512.0)) * 6.2831;
    float r = uGBlur * uGlass;
    // only the picture(s) actually showing are frosted: uMix sits at exactly
    // 0 or 1 for most of the act, and each frost() is up to 48 taps. The
    // thresholds are exact, so the output is bit-identical to frosting both.
    float mx = clamp(uMix, 0.0, 1.0);
    vec3 a = vec3(0.0);
    vec3 b = vec3(0.0);
    if (mx < 1.0) a = frost(uTexA, pan(cover(vUv + off, uAspectA, ar)), r, seed);
    if (mx > 0.0) b = frost(uTexB, pan(cover(vUv + off, uAspectB, ar)), r, seed);
    col = mix(a, b, mx);
    col = mix(col, uGTintCol, uGTint * uGlass);
    col *= mix(1.0, uGBright, uGlass);
    float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
    col = mix(vec3(l), col, mix(1.0, uGSat, uGlass));
    col = mix(col, tintCol, clamp(uTint, 0.0, 1.0));
  }

  gl_FragColor = vec4(col, m * uAlpha);
}
`;

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

export function createGround({ mount, cfg, images = [] }) {
  const G = () => cfg.v2.ground;

  // No `preserveDrawingBuffer` (perf pass, 2026-09-17): on a full-viewport
  // canvas it makes the browser COPY the back buffer on every composited frame.
  // `sample()` below re-renders the current uniforms and reads back in the same
  // task, which the spec guarantees — so the verify still reads his photograph
  // behind glass off the layer, not a flat colour, and not a cleared buffer.
  const renderer = new THREE.WebGLRenderer({
    alpha: true, antialias: false, preserveDrawingBuffer: false,
  });
  // DPR 1, on purpose. The layer is FROSTED by design — three FBMs and up to
  // 96 texture taps per pixel, and then a blur — so device pixels buy nothing
  // here: on a retina screen this is a 4× cut in fragments, and the browser's
  // bilinear upscale of already-soft content is not visible.
  renderer.setPixelRatio(1);
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.className = "was-ground-canvas";
  mount.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.Camera();
  const blank = new THREE.Texture();
  const uniforms = {
    uRes: { value: new THREE.Vector2(1, 1) },
    uCentre: { value: new THREE.Vector2(0.5, 0.5) },
    uRadius: { value: 0 },
    uSoft: { value: 0.2 },
    uFbm: { value: 0.3 },
    uFreq: { value: 2.6 },
    uTime: { value: 0 },
    uSpeed: { value: 0.06 },
    uOct: { value: 4 },
    uColorA: { value: new THREE.Color("#3a2a20") },
    uColorB: { value: new THREE.Color("#17100b") },
    uTint: { value: 0.16 },
    uAlpha: { value: 1 },
    uVideo: { value: null },
    uHasVideo: { value: 0 },
    uTexA: { value: blank },
    uTexB: { value: blank },
    uHasTex: { value: 0 },
    uMix: { value: 0 },
    uAspectA: { value: 1 },
    uAspectB: { value: 1 },
    uGlass: { value: 1 },
    uGBlur: { value: 0.022 },
    uGTaps: { value: 12 },
    uGRefract: { value: 0.014 },
    uGSplit: { value: 0.004 },
    uGTintCol: { value: new THREE.Color("#ffffff") },
    uGTint: { value: 0.1 },
    uGBright: { value: 1.04 },
    uGSat: { value: 1.06 },
    uZoom: { value: 1 },
    uPan: { value: 0 },
  };
  const quad = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.ShaderMaterial({
      vertexShader: VS,
      fragmentShader: FS,
      uniforms,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    })
  );
  scene.add(quad);

  // ── his three images ────────────────────────────────────────────────────
  const loader = new THREE.TextureLoader();
  const texs = [];
  let loaded = 0;
  images.forEach((src, i) => {
    loader.load(src, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.minFilter = THREE.LinearFilter;
      tex.generateMipmaps = false;
      texs[i] = tex;
      loaded++;
      if (loaded === 1) setFrame(0, 0, 0);
    });
  });

  /** which image, which next, and how far between them */
  function setFrame(a, b, mix) {
    const n = texs.length;
    if (!n || !G().images) {
      uniforms.uHasTex.value = 0;
      return;
    }
    const ta = texs[Math.min(Math.max(0, a), n - 1)];
    const tb = texs[Math.min(Math.max(0, b), n - 1)];
    if (!ta || !tb) return;
    uniforms.uTexA.value = ta;
    uniforms.uTexB.value = tb;
    uniforms.uAspectA.value = (ta.image?.width || 1) / (ta.image?.height || 1);
    uniforms.uAspectB.value = (tb.image?.width || 1) / (tb.image?.height || 1);
    uniforms.uMix.value = clamp01(mix);
    uniforms.uHasTex.value = 1;
  }

  // ── the video, when there is one ────────────────────────────────────────
  let video = null;
  let videoTex = null;
  let videoSrc = "";
  function syncVideo() {
    const src = (G().video || "").trim();
    if (src === videoSrc) return;
    videoSrc = src;
    videoTex?.dispose();
    videoTex = null;
    video?.pause();
    video = null;
    uniforms.uHasVideo.value = 0;
    uniforms.uVideo.value = null;
    if (!src) return;
    video = document.createElement("video");
    Object.assign(video, { src, loop: true, muted: true, playsInline: true, preload: "auto" });
    video.setAttribute("playsinline", "");
    video.addEventListener("loadeddata", () => {
      videoTex = new THREE.VideoTexture(video);
      videoTex.colorSpace = THREE.SRGBColorSpace;
      uniforms.uVideo.value = videoTex;
      uniforms.uHasVideo.value = 1;
      video.play().catch(() => {});
    });
    video.addEventListener("error", () => {
      console.warn(`[ground] video not loaded: ${src} — the FBM mask stays`);
    });
    video.load();
  }

  // ── the hard cutoff ───────────────────────────────────────────────────
  // Once the section behind it has risen to cover the whole viewport, this
  // layer cannot be seen either way — a full-viewport FBM + glass shader is
  // not cheap, so it stops rendering entirely rather than continuing under an
  // opaque stage on top of it.
  let hidden = false;
  const setHidden = (v) => {
    hidden = !!v;
    if (hidden) renderer.domElement.style.display = "none";
  };

  // ── it FIRES at its mark and plays itself out ───────────────────────────
  const open = { v: 0 };
  let tween = null;
  let on = false;
  let gone = false;
  let clock = 0;

  const play = (to) => {
    tween?.kill();
    tween = gsap.to(open, {
      v: to,
      duration: Math.max(0.1, G().dur),
      ease: G().ease || "power2.out",
      overwrite: "auto",
    });
  };

  /** `q` — act two's own scroll. */
  function drive(q) {
    const g = G();
    if (!cfg.v2.on || !g.show) {
      if (on) { on = false; gone = false; tween?.kill(); open.v = 0; }
      return;
    }
    if (!on && q >= g.at) {
      on = true;
      gone = false;
      play(1);
    } else if (on && q < g.at - 0.012) {
      // it CLOSES the way it opened — an animated tween back to 0, not a
      // snap: scrolling back up past its own mark must read as the same
      // shader reversing, not the field vanishing on the spot
      on = false;
      gone = false;
      play(0);
    }
    if (!(g.out > g.at)) return;     // 0 = it stays, and the ring act is on it
    if (on && !gone && q >= g.out) { gone = true; play(0); }
    else if (gone && q < g.out - 0.012) { gone = false; play(1); }
  }

  // scratch colours, so the per-frame blend never allocates
  const stepFrom = new THREE.Color();
  const stepTo = new THREE.Color();
  let lastParallax = 0;
  let lastRoom = 0;

  /**
   * `at` — where the bowl is, in CSS pixels. `act` — the ring act's own
   * colouring and parallax (his asks, 2026-09-17): `from`/`to` are the
   * current step's colour and the next one's, `u` how far into the hand-over
   * between them (0 for most of a step, climbing only in its tail), `mix` how
   * much of that colour is laid over the field's own base colour at all (0
   * while act two still owns the field, 1 once the ring act has taken over),
   * `zoom` how much the photograph is enlarged and `pan` where in that room
   * it is showing — `+` its top, `−` its bottom — ONE value for both images
   * of a crossfade, so they match. A pure function of the scroll, so it
   * unwinds on the way up.
   */
  // V5's outro (his ask, 2026-09-21 — "lo shader scomparisse con una
  // chiusura... l'animazione al contrario rispetto all'intro"): the intro is
  // the radius GROWING out of the bowl's centre (`open.v`, a tween fired at
  // its mark); this is the same radius shrinking back into it — but scrubbed
  // by the scroll, a pure function of it, so it unwinds on the way up.
  let close = 0;
  const setClose = (k) => { close = clamp01(k); };

  function frame(dt, at, act = {}) {
    const g = G();
    const live = !hidden && cfg.v2.on && g.show && open.v > 0.001 && close < 0.999;
    renderer.domElement.style.display = live ? "" : "none";
    if (!live) return;
    clock += dt;
    syncVideo();

    const w = window.innerWidth;
    const h = window.innerHeight;
    // The room there is to pan is worked out HERE, where the picture's own
    // aspect is known: `cover()` on a landscape screen already hides part of a
    // square (or portrait) picture above and below — "le immagini verticali"
    // — and the zoom hides a little more. `frac` (0 → 1 across the travel)
    // walks the whole of it, top to bottom, so nothing is ever sampled off
    // the picture and nothing of the room is left unused.
    const zoom = Math.max(1, act.zoom || 1);
    const ar = w / Math.max(1, h);
    const ia = uniforms.uAspectA.value || 1;
    const shown = (ia < ar ? ia / ar : 1) / zoom;   // share of the picture's height on screen
    lastRoom = Math.max(0, 0.5 - shown / 2);
    lastParallax = lastRoom - 2 * lastRoom * clamp01(act.frac ?? 0);
    uniforms.uZoom.value = zoom;
    uniforms.uPan.value = lastParallax;
    // it opens from BEHIND the object, and drifts slowly around it
    const wx = Math.cos(clock * g.wanderSpeed) * g.wander;
    const wy = Math.sin(clock * g.wanderSpeed * 0.8) * g.wander;
    uniforms.uCentre.value.set(
      (at ? at.x / w : 0.5) + wx * (h / Math.max(1, w)),
      1 - (at ? at.y / h : 0.5) + wy
    );
    uniforms.uRadius.value = g.scale * open.v * (1 - close);
    uniforms.uSoft.value = g.soft;
    uniforms.uFbm.value = g.fbm;
    uniforms.uFreq.value = g.freq;
    uniforms.uSpeed.value = g.speed;
    uniforms.uOct.value = Math.round(g.octaves);
    uniforms.uTime.value = clock;
    uniforms.uAlpha.value = 1;
    uniforms.uTint.value = g.tint;
    const gl = g.glass;
    uniforms.uGlass.value = gl.on ? 1 : 0;
    uniforms.uGBlur.value = gl.blur;
    uniforms.uGTaps.value = Math.round(gl.taps);
    uniforms.uGRefract.value = gl.refract;
    uniforms.uGSplit.value = gl.split;
    uniforms.uGTintCol.value.set(gl.tint);
    uniforms.uGTint.value = gl.tintAmount;
    uniforms.uGBright.value = gl.brightness;
    uniforms.uGSat.value = gl.saturation;
    if (!g.images) uniforms.uHasTex.value = 0;
    // the field takes on the ACT's colour — one per step, handed over in each
    // step's tail — over its own base colour, by `mix`
    uniforms.uColorA.value.set(g.color);
    if (act.from) {
      stepFrom.set(act.from);
      if (act.to) stepFrom.lerp(stepTo.set(act.to), clamp01(act.u || 0));
      uniforms.uColorA.value.lerp(stepFrom, clamp01(act.mix ?? 0));
    }
    uniforms.uColorB.value.set(g.color2);
    renderer.render(scene, camera);
  }

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    uniforms.uRes.value.set(w, h);
  }
  resize();

  return {
    drive,
    frame,
    resize,
    setFrame,
    setHidden,
    get hidden() { return hidden; },
    get open() { return +open.v.toFixed(3); },
    get images() { return texs.filter(Boolean).length; },
    /**
     * What is actually on the layer, read off the drawing buffer. `n` points on
     * a small grid, as [r, g, b, a] 0-255 — a flat colour field has almost no
     * variance between them, a photograph has plenty.
     */
    sample(n = 5) {
      // the buffer is not preserved between frames: draw this one again, with
      // the uniforms exactly as the last frame() left them, then read it
      renderer.render(scene, camera);
      const gl = renderer.getContext();
      const w = renderer.domElement.width;
      const h = renderer.domElement.height;
      const out = [];
      const px = new Uint8Array(4);
      for (let i = 0; i < n; i++) {
        const x = Math.round(((i + 1) / (n + 1)) * w);
        const y = Math.round(h * 0.5 + Math.sin(i * 1.7) * h * 0.22);
        gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
        out.push([px[0], px[1], px[2], px[3]]);
      }
      return out;
    },
    setClose,
    probe() {
      return {
        open: +open.v.toFixed(3),
        close: +close.toFixed(3),
        radius: +uniforms.uRadius.value.toFixed(3),
        video: !!uniforms.uHasVideo.value,
        centre: [+uniforms.uCentre.value.x.toFixed(3), +uniforms.uCentre.value.y.toFixed(3)],
        on: renderer.domElement.style.display !== "none",
        dpr: renderer.getPixelRatio(),
        z: +getComputedStyle(mount).zIndex || 0,
        tex: !!uniforms.uHasTex.value,
        loaded: texs.filter(Boolean).length,
        mix: +uniforms.uMix.value.toFixed(3),
        glass: !!uniforms.uGlass.value,
        colorA: `#${uniforms.uColorA.value.getHexString()}`,
        pan: +lastParallax.toFixed(4),
        room: +lastRoom.toFixed(4),
        zoom: +uniforms.uZoom.value.toFixed(3),
      };
    },
    dispose() {
      tween?.kill();
      videoTex?.dispose();
      for (const t of texs) t?.dispose();
      quad.geometry.dispose();
      quad.material.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
