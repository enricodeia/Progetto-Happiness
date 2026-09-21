import * as THREE from "three";
import gsap from "gsap";
import { bowlGeometries } from "./bowlGeo.js";
import { makeSlotMaterial, applySlot, classifyImage } from "./bowlMaterial.js";
import { createEnv } from "./env.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { VIGNETTE } from "./postfx.js";

// The singing bowl, on its own fixed transparent WebGL layer over the page.
// It never leaves and it never moves off centre: it rises into the hero, turns
// with the scroll, settles dead centre exactly as the pinned section engages
// and holds the centre of the frame through all six steps, dissolving only in
// the last sliver so the closing statement has the page to itself.
//
// Geometry, materials and studio are the bowl studio's (bowl-studio-source 2):
// two shells on one MeshPhysicalMaterial recipe, the outer one carrying a
// procedural hammered relief, the inner one a gaseous colour ramp, lit by a
// PMREM-baked rig of emissive panels that is ALSO mirrored as real
// RectAreaLights — the inner surface runs at envMapIntensity 0 and sees only
// those.

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerp = (a, b, t) => a + (b - a) * t;

/** V5's wireframe (his ask, 2026-09-21): NOT the mesh's own triangles — at
    1.1M of them `wireframe: true` is a solid, shaded surface with extra
    steps, and a million 15%-opacity lines stack up to nearly opaque. This is
    the wireframe a designer means: a lattice of rings and meridians fitted to
    the ACTUAL bowl's profile — for each of `rings` height bands, the widest
    radius any vertex reaches in it — so it is this bowl's silhouette, not a
    generic hemisphere. Built once, in the geometry's own space, and parented
    under `norm` so it inherits the same normalisation and pose. */
function buildBowlWire(geometry, rings = 14, meridians = 24, seg = 72) {
  const pos = geometry.attributes.position;
  const bb = geometry.boundingBox;
  const y0 = bb.min.y, y1 = bb.max.y, span = y1 - y0 || 1;
  const cx = (bb.min.x + bb.max.x) / 2, cz = (bb.min.z + bb.max.z) / 2;
  const prof = new Float32Array(rings);
  const stride = Math.max(1, Math.floor(pos.count / 250000));
  for (let i = 0; i < pos.count; i += stride) {
    const x = pos.getX(i) - cx, y = pos.getY(i), z = pos.getZ(i) - cz;
    const k = Math.min(rings - 1, Math.max(0, Math.floor(((y - y0) / span) * rings)));
    const r = Math.hypot(x, z);
    if (r > prof[k]) prof[k] = r;
  }
  const yOf = (k) => y0 + ((k + 0.5) / rings) * span;
  const pts = [];
  for (let k = 0; k < rings; k++) {
    const r = prof[k];
    if (r <= 0) continue;
    const y = yOf(k);
    for (let s = 0; s < seg; s++) {
      const a0 = (s / seg) * Math.PI * 2, a1 = ((s + 1) / seg) * Math.PI * 2;
      pts.push(cx + Math.cos(a0) * r, y, cz + Math.sin(a0) * r, cx + Math.cos(a1) * r, y, cz + Math.sin(a1) * r);
    }
  }
  for (let m = 0; m < meridians; m++) {
    const a = (m / meridians) * Math.PI * 2;
    let prev = null;
    for (let k = 0; k < rings; k++) {
      const r = prof[k];
      if (r <= 0) continue;
      const p = [cx + Math.cos(a) * r, yOf(k), cz + Math.sin(a) * r];
      if (prev) pts.push(...prev, ...p);
      prev = p;
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  return g;
}
const smooth = (x) => x * x * (3 - 2 * x);
const expoOut = (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x));
const rad = THREE.MathUtils.degToRad;

const TONE = {
  none: THREE.NoToneMapping,
  linear: THREE.LinearToneMapping,
  reinhard: THREE.ReinhardToneMapping,
  cineon: THREE.CineonToneMapping,
  aces: THREE.ACESFilmicToneMapping,
  agx: THREE.AgXToneMapping,
  neutral: THREE.NeutralToneMapping,
};

const EASES = { expo: expoOut, smooth, linear: (x) => x };

function mixPose(a, b, t) {
  return {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
    size: lerp(a.size, b.size, t),
    opacity: lerp(a.opacity, b.opacity, t),
    tilt: lerp(a.tilt || 0, b.tilt || 0, t),
    tiltZ: lerp(a.tiltZ || 0, b.tiltZ || 0, t),
  };
}

export function createBowl({ mount, cfg }) {
  const B = cfg.bowl;

  // Perf pass (2026-09-17): with the post chain on, the scene is drawn into
  // the composer's own (non-multisampled) targets and the canvas only ever
  // receives a full-screen quad — so `antialias` on the context bought a
  // multisample resolve every frame and not one smoother edge. It is asked
  // for only when the page boots with post OFF, where the direct path needs it.
  const renderer = new THREE.WebGLRenderer({
    antialias: !B.post.enabled,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.className = "was-bowl-canvas";
  mount.appendChild(renderer.domElement);
  // V5's white (his ask, 2026-09-21 — "la fine della sezione arrivi sempre
  // con sfondo bianco"): a sheet UNDER the canvas, inside this same fixed
  // layer, so it sits above the ground shader (z 2) and below the bowl — the
  // pinned sections' own white, faded in as the shader closes. Nothing above
  // z 4 is touched, so V5's see-through stage still shows the bowl on it.
  const sheet = document.createElement("div");
  sheet.className = "was-bowl-sheet";
  mount.insertBefore(sheet, renderer.domElement);
  let sheetA = 0;
  function setSheet(a) {
    const v = clamp01(a);
    if (v === sheetA) return;
    sheetA = v;
    sheet.style.opacity = v.toFixed(3);
  }

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(B.cam.fov, 1, 0.05, 200);
  camera.position.set(0, 0, B.cam.dist);
  camera.lookAt(0, 0, 0);

  // ── post-processing (his ask, 2026-09-16 — on THIS canvas, not the Atlas's;
  // bloom removed 2026-09-17, his ask — vignette only now)
  // The layer is transparent over the page (`alpha:true`, cleared to 0 alpha),
  // so every pass here has to carry that channel through: `RenderPass` with no
  // explicit clear colour/alpha of its own just reuses the renderer's, which
  // is already transparent. Built once; `frame()` below skips the whole
  // composer when `post.enabled` is off, so this costs nothing on a page
  // where the bowl renders almost everywhere.
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const vignettePass = new ShaderPass(VIGNETTE);
  composer.addPass(vignettePass);
  composer.addPass(new OutputPass());
  function applyPostSettings() {
    vignettePass.uniforms.amount.value = B.post.vignette;
  }

  const env = createEnv(renderer, scene, B.studio);
  scene.add(env.sceneGroup);
  // A real captured environment when there is one, the panel rig otherwise.
  // Either way it lights the 3D ONLY: `scene.background` is never set and the
  // canvas is a transparent layer over the page.
  // Perf pass (2026-09-17): the EXR/HDR loaders (~36 kB minified, and two
  // fetches at boot) are only pulled in once an HDR is actually switched on —
  // with none in public/hdr/ the page never asks for them. The stand-in keeps
  // every reader (setWorld, dispose, the panel's `sync`, the verify) working
  // before, and without, the real thing.
  const hdrStub = {
    state: { loaded: 0, files: [], active: false },
    get source() { return null; },
    sync() { applyEnv(false); },
    dispose() {},
  };
  let hdr = hdrStub;
  async function applyEnv(force = false) {
    const h = B.studio.hdr;
    const files = (h?.files || []).filter(Boolean);
    // the rig FIRST, so the object is never unlit while an HDR is in flight
    env.build(true);
    if (force) env.syncLights();
    if (!h?.on || !files.length) {
      hdr.state.active = false;
      return;
    }
    if (hdr === hdrStub) {
      const { createHdrEnv } = await import("./envHdr.js");
      hdr = createHdrEnv(renderer, scene);
    }
    const ok = await hdr.build(h);
    if (!ok) {
      console.warn("[bowl] no HDR found in public/hdr — falling back to the panel rig");
      env.build(true);
    }
  }
  applyEnv(true);

  // group that animates ← group that normalises the raw geometry
  const group = new THREE.Group();
  // ZXY, so the matrix is Rz · Rx · Ry: the spin stays about the bowl's own
  // axis, the lean tips it toward the camera on top of that, and the roll is
  // the OUTERMOST rotation — which is what makes it a roll on screen rather
  // than a second turn about its own axis.
  group.rotation.order = "ZXY";
  const norm = new THREE.Group();
  group.add(norm);
  scene.add(group);

  // ── the relief map ──────────────────────────────────────────────────────
  // A real TEXTURE, per slot, not noise evaluated per pixel. Procedural noise
  // has no footprint: every fragment samples it fresh, so at any size where one
  // pixel spans more than a noise cell it aliases into glitter and no amount of
  // scaling helps. A map has mipmaps, so it stays a surface at every size.
  //
  // `bowl-normal.webp` is the hammered map the old procedural relief was
  // calibrated against, and it is the default for a slot set to "image". Any
  // image can take its place — see `loadReliefImage`.
  let builtIn = null;
  const custom = { A: null, B: null };

  function builtInMap() {
    if (!builtIn) {
      builtIn = new THREE.TextureLoader().load("/images/bowl-normal.webp");
      builtIn.wrapS = builtIn.wrapT = THREE.RepeatWrapping;
      builtIn.colorSpace = THREE.NoColorSpace;   // it is data, not colour
      builtIn.anisotropy = 8;
      builtIn.userData.kind = "normal";
      builtIn.userData.name = "bowl-normal.webp";
    }
    return builtIn;
  }

  function reliefFor(slot) {
    const s = B.material[slot];
    if (!(s.relief.enabled && s.relief.source === "image")) return null;
    return custom[slot] || builtInMap();
  }

  /**
   * Use `src` — a File from a picker, a Blob, or a URL — as this slot's relief.
   *
   * The image classifies itself: a blue-dominant one is used as a NORMAL map,
   * anything else as a height map, so a grey noise PNG and a baked normal both
   * just work without a switch to get wrong.
   */
  function loadReliefImage(slot, src) {
    return new Promise((resolve, reject) => {
      const isUrl = typeof src === "string";
      const url = isUrl ? src : URL.createObjectURL(src);
      const name = isUrl ? url.split("/").pop() : src.name || "image";
      new THREE.TextureLoader().load(
        url,
        (tex) => {
          let kind = "height";
          try { kind = classifyImage(tex.image).kind; } catch { /* keep height */ }
          tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
          tex.colorSpace = THREE.NoColorSpace;
          tex.anisotropy = 8;
          tex.userData.kind = kind;
          tex.userData.name = name;
          custom[slot]?.dispose?.();
          custom[slot] = tex;
          const s = B.material[slot];
          s.relief.enabled = true;
          s.relief.source = "image";
          applyMaterials();
          if (!isUrl) URL.revokeObjectURL(url);
          resolve({ slot, name, kind });
        },
        undefined,
        (err) => { if (!isUrl) URL.revokeObjectURL(url); reject(err); }
      );
    });
  }

  /** Back to the built-in hammered map. */
  function clearReliefImage(slot) {
    custom[slot]?.dispose?.();
    custom[slot] = null;
    applyMaterials();
  }

  /** What this slot is actually using, for the panel and the assertions. */
  function reliefInfo(slot) {
    const t = reliefFor(slot);
    const s = B.material[slot];
    return {
      source: s.relief.enabled ? s.relief.source : "off",
      map: t ? t.userData.name : null,
      kind: t ? t.userData.kind : null,
      custom: !!custom[slot],
      tiling: s.relief.imageScale,
    };
  }

  const shells = {}; // slot → { mesh, mat }
  let ready = false;
  let disposed = false;

  function applyMaterials() {
    for (const slot of Object.keys(shells)) {
      const s = B.material[slot];
      if (!s) continue;
      applySlot(shells[slot].mat, s, B.model.noiseSpace, { relief: reliefFor(slot) });
      shells[slot].mat.userData.u.uReliefAA.value = B.model.reliefAA || 0;
      shells[slot].mat.wireframe = !!B.model.wireframe;
    }
  }

  function applyRender() {
    renderer.toneMapping = TONE[B.render.toneMapping] ?? THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = B.render.exposure;
  }
  applyRender();

  bowlGeometries(B.model).then((list) => {
    if (disposed) return;
    const box = new THREE.Box3();
    for (const part of list) {
      const mat = makeSlotMaterial(part.slot);
      // one flag, set once: toggling `transparent` later would recompile
      mat.transparent = true;
      mat.opacity = 1;
      const mesh = new THREE.Mesh(part.geometry, mat);
      mesh.name = part.name;
      norm.add(mesh);
      shells[part.slot] = { mesh, mat, name: part.name };
      box.union(part.geometry.boundingBox);
    }
    // V5's lattice, fitted to the OUTER shell (the widest one)
    {
      const size = (p) => p.geometry.boundingBox.getSize(new THREE.Vector3()).x;
      const outer = list.reduce((a, p) => (!a || size(p) > size(a) ? p : a), null);
      if (outer) {
        wireMat = new THREE.LineBasicMaterial({
          color: 0x0a0a0a, transparent: true, opacity: 0, depthWrite: false,
        });
        wire = new THREE.LineSegments(buildBowlWire(outer.geometry), wireMat);
        wire.visible = false;
        norm.add(wire);
      }
    }
    // normalise: widest span 1, centred on its own bounding box
    const size = box.getSize(new THREE.Vector3());
    const centre = box.getCenter(new THREE.Vector3());
    const d = Math.max(size.x, size.z) || 1;
    rimY = (size.y / d) / 2;   // the rim's height in group space (the top of the box)
    norm.scale.setScalar(1 / d);
    norm.position.set(-centre.x / d, -centre.y / d, -centre.z / d);
    applyMaterials();
    ready = true;
    if (pendingIntro) play();
    readyCbs.splice(0).forEach((fn) => fn());
  });

  // ── things that ride the bowl ────────────────────────────────────────────
  // An attachment (V2's ring) is built into THIS scene, so it shares the depth
  // buffer with the object and can really pass behind it. It is handed the
  // bowl's pose every frame, just before the render, and it says whether it
  // needs the layer alive on its own account — otherwise a bowl at opacity 0
  // would take its own ring down with it.
  const frameHooks = [];
  const onFrame = (fn) => { frameHooks.push(fn); return () => {
    const i = frameHooks.indexOf(fn);
    if (i >= 0) frameHooks.splice(i, 1);
  }; };

  // ...and the pose itself can be taken over from outside (V2 owns the bowl
  // through act two: it does not shrink into `hand` there, it DESCENDS).
  let poseHook = null;
  const setPoseHook = (fn) => { poseHook = fn; };

  // ── the hard cutoff ───────────────────────────────────────────────────
  // Once the section that OCCLUDES the bowl has risen to cover the entire
  // viewport, nothing of it could possibly be on screen — continuing to pose,
  // spin and render it is pure waste. `main.js` sets this the instant that
  // section's own sticky stage is fully pinned (its rect covers 0..vh), and
  // `frame()` below is the ONLY thing that checks it: skip everything, not
  // just the draw call, because the pose/spin/attachment maths costs real CPU
  // too and none of it can be seen.
  let hidden = false;
  const setHidden = (v) => {
    hidden = !!v;
    if (hidden) renderer.domElement.style.display = "none";
  };

  // ── intro: it rises from below ───────────────────────────────────────────
  const state = { intro: { v: 0 }, q1: 0, q2: 0, size: 0, x: 0, y: 0, spin: 0, tilt: 0, opacity: 0 };
  let tween = null;
  // The hero's opening timeline owns the bowl's arrival, so it must not start
  // before the geometry is there — or the bowl pops in half way through it.
  const readyCbs = [];
  let pendingIntro = false;
  let started = false;

  function play() {
    if (!ready) { pendingIntro = true; return; }
    pendingIntro = false;
    if (started) return;
    started = true;
    tween?.kill();
    state.intro.v = 0;
    tween = gsap.to(state.intro, {
      v: 1,
      duration: B.intro.dur,
      delay: B.intro.delay,
      ease: B.intro.ease,
      overwrite: true,
    });
  }

  function replay() {
    started = false;
    tween?.kill();
    state.intro.v = 0;
    play();
  }

  // ── look at the cursor ────────────────────────────────────────────────
  // A small extra turn on top of whatever pose the scroll/act already put the
  // bowl in: pure pointer state, smoothed toward every frame in `frame()`
  // rather than snapped to, or it would read as jittering instead of turning.
  // Tracked off the WHOLE window, not just the bowl's own canvas — the layer
  // sits over the entire page and the object should notice the cursor
  // wherever it is, not only while it happens to be over the bowl.
  const pointer = { x: 0, y: 0 };
  let lookX = 0, lookY = 0;

  // ── V5's wireframe crossfade (his ask, 2026-09-21) — set by circles.js as
  // a pure function of ITS OWN scroll progress, read here every frame. The
  // shell material already has a `wireframe` flag (a debug toggle, `B.model.
  // wireframe`) but it is a hard boolean — there is no such thing as a
  // half-wireframe triangle. So the crossfade is an opacity trick instead:
  // fade the solid shell OUT to nothing, flip the flag at the bottom of that
  // dip (invisible either way at opacity 0), then fade the wireframe IN —
  // one continuous, reversible ramp with no pop anywhere a viewer can see it.
  let wireframeMix = 0;
  let wireframeTarget = 0.15;
  let wire = null, wireMat = null;   // the lattice, built once the geometry is in
  let rimY = 0.25;                   // the rim's height in group space, set at load
  function onPointerMove(e) {
    pointer.x = (e.clientX / Math.max(1, window.innerWidth)) * 2 - 1;
    pointer.y = (e.clientY / Math.max(1, window.innerHeight)) * 2 - 1;
  }
  window.addEventListener("pointermove", onPointerMove, { passive: true });

  // ── the camera's distance, drivable from outside ────────────────────────
  // A real DOLLY, not a zoom. The placement maths is derived from the same
  // number (`worldH`), so pulling the camera in leaves the bowl exactly the
  // same size on screen and only deepens the perspective — which is what makes
  // the rings around it separate instead of flattening.
  let distOverride = null;
  const camDist = () => (distOverride === null ? B.cam.dist : distOverride);
  const setDist = (d) => { distOverride = Number.isFinite(d) ? d : null; };

  // world units spanned by the viewport height at the bowl's depth
  const worldH = () => 2 * camDist() * Math.tan(rad(B.cam.fov) / 2);

  let clock = 0;

  /**
   * q1 — 0 at the top of the page, 1 when the pinned section engages.
   * q2 — 0 there, 1 at the end of the pinned clock (and it stays 1 after).
   */
  function frame(dt, q1, q2, gain = 1) {
    if (!B.show || hidden) {
      // the exposed state has to read as "not visible" too, not just the
      // canvas — a probe (or anything else reading `state`) must never find
      // a stale, still-fully-opaque bowl just because the expensive half of
      // this function stopped running
      state.opacity = 0;
      renderer.domElement.style.display = "none";
      return;
    }
    clock += dt;
    state.q1 = q1;
    state.q2 = q2;

    const P = B.poses;
    const easeIn = EASES[B.handEase] || smooth;
    // The opening act is two moves, not one: it grows and leans into `until`
    // while the two beats play across it, then squares up and shrinks back
    // down into `hand` as the first sticky comes up to meet it.
    const easeOutOf = EASES[B.fallEase] || smooth;
    const rise = easeIn(clamp01(q1 / Math.max(1e-4, B.riseAt)));
    // ...and the way back down gets its own ease: `smooth` starts from zero
    // velocity, so the top of the arc is a turn and not a corner.
    const fall = easeOutOf(
      clamp01((q1 - B.fallAt) / Math.max(1e-4, 1 - B.fallAt))
    );
    let pose = mixPose(mixPose(P.hero, P.until, rise), P.hand, fall);
    if (q2 > 0) {
      pose = mixPose(P.hand, P.pin, smooth(clamp01(q2 / Math.max(1e-4, B.parkIn))));
      // `lockLast` is the switch: off, it hands over to the `end` pose in the
      // last stretch; on, it simply stays where it is, dead centre, for the
      // whole of the last step.
      if (!B.lockLast) {
        const b = smooth(clamp01((q2 - B.endFrom) / Math.max(1e-4, B.endTo - B.endFrom)));
        if (b > 0) pose = mixPose(pose, P.end, b);
      }
    }

    // V2 takes the bowl over from here: it is handed the pose the page would
    // have given it and the same mixer, and what it returns is what happens.
    if (poseHook) pose = poseHook(pose, { q1, q2, mix: mixPose, poses: P }) || pose;

    const i = state.intro.v;
    const opacity = pose.opacity * i * clamp01(gain);
    state.opacity = opacity;

    camera.position.z = camDist();
    const H = worldH();
    const W = H * (camera.aspect || 1);

    const size = pose.size * lerp(B.intro.fromScale, 1, i);
    state.size = size;
    state.x = pose.x;
    state.y = pose.y - (1 - i) * B.intro.fromVh;
    group.scale.setScalar(size * H);
    group.position.set(state.x * W, state.y * H, 0);

    state.spin =
      rad(B.spin.start) +
      (q1 * B.spin.turns + q2 * B.spin.pinTurns) * Math.PI * 2 +
      clock * B.spin.idle;
    state.tilt = pose.tilt;

    // the pointer is smoothed toward here, not in the input handler, so it is
    // one lerp per frame regardless of how often pointermove actually fires
    const LC = B.lookCursor;
    const chase = LC?.enabled ? clamp01(LC.ease) : 0.1;
    lookX = lerp(lookX, LC?.enabled ? pointer.x : 0, chase);
    lookY = lerp(lookY, LC?.enabled ? pointer.y : 0, chase);
    const lookYaw = LC?.enabled ? lookX * (LC.strengthX || 0) : 0;
    const lookLean = LC?.enabled ? -lookY * (LC.strengthY || 0) : 0;

    group.rotation.set(
      rad(B.model.rotX + pose.tilt + lookLean),
      state.spin + rad(lookYaw),
      rad(B.model.rotZ + pose.tiltZ)
    );

    // V5's crossfade: the solid shells fade OUT as the lattice fades IN, both
    // still under the pose's own opacity, the intro and the gain
    const wf = wireframeMix;
    for (const slot of Object.keys(shells)) shells[slot].mat.opacity = opacity * (1 - wf);
    if (wireMat) {
      wireMat.opacity = wireframeTarget * wf * opacity;
      wire.visible = wf > 0.001;
    }

    // The attachments go last: the bowl is already placed, so what they get is
    // where it actually IS this frame, not where it was on the one before.
    let attached = false;
    if (frameHooks.length) {
      const ctx = {
        dt, camera, worldH: H, worldW: W,
        size, opacity, position: group.position, pose,
      };
      for (const fn of frameHooks) attached = fn(ctx) || attached;
    }

    // Nothing to draw and nothing riding it: stop paying for the layer.
    if (opacity <= 0.002 && !attached) {
      renderer.domElement.style.display = "none";
      return;
    }
    renderer.domElement.style.display = "";

    if (B.post.enabled) {
      applyPostSettings();
      composer.render();
    } else {
      renderer.render(scene, camera);
    }
  }

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    composer.setPixelRatio(renderer.getPixelRatio());
    composer.setSize(w, h);
    camera.aspect = w / Math.max(1, h);
    camera.fov = B.cam.fov;
    camera.position.z = B.cam.dist;
    camera.updateProjectionMatrix();
  }
  resize();

  function dispose() {
    disposed = true;
    tween?.kill();
    window.removeEventListener("pointermove", onPointerMove);
    env.dispose();
    hdr.dispose();
    for (const slot of Object.keys(shells)) shells[slot].mat.dispose();
    wire?.geometry.dispose();
    wireMat?.dispose();
    composer.dispose();
    renderer.dispose();
    renderer.domElement.remove();
  }

  /** V5's crossfade (his ask, 2026-09-21) — `mix` 0..1, `target` the
   * wireframe's own settled opacity (circles.js passes `v2.circles.
   * wireframeOpacity`) */
  function setWireframe(mix, target = 0.15) {
    wireframeMix = clamp01(mix);
    wireframeTarget = target;
  }

  return {
    frame,
    resize,
    dispose,
    play,
    replay,
    setWireframe,
    setSheet,
    /** the white under the bowl, for the assertions */
    get sheet() { return +sheetA.toFixed(3); },
    loadReliefImage,
    clearReliefImage,
    reliefInfo,
    /** run `fn` once the geometry is in (immediately, if it already is) */
    onReady(fn) { if (ready) fn(); else readyCbs.push(fn); },
    /** ride the bowl: `fn(ctx)` runs every frame, just before the render */
    onFrame,
    setDist,
    setHidden,
    get hidden() { return hidden; },
    get dist() { return camDist(); },
    /**
     * The environment as the WORLD BACKGROUND (V2's second step). Only a real
     * captured equirect can do this — a PMREM target is not samplable as one —
     * so with no HDR in `public/hdr/` it stays off and the ground layer's own
     * field is what is behind the object. It reports whether it took.
     */
    setWorld({ on = false, blur = 0.3, intensity = 1 } = {}) {
      const src = on ? hdr.source : null;
      if (!src) {
        if (scene.background) scene.background = null;
        return false;
      }
      scene.background = src;
      scene.backgroundBlurriness = blur;
      scene.backgroundIntensity = intensity;
      return true;
    },
    get world() { return !!scene.background; },
    /** the environment turns slowly under the object — `deg` is absolute */
    setEnvRotation(deg) {
      scene.environmentRotation.set(0, (deg * Math.PI) / 180, 0);
      if (scene.backgroundRotation) scene.backgroundRotation.set(0, (deg * Math.PI) / 180, 0);
    },
    /** take the pose over: `fn(pose, ctx)` returns the pose that happens */
    setPoseHook,
    state,
    env,
    scene,
    camera,
    applyMaterials,
    applyRender,
    rebake: () => applyEnv(true),
    get hdr() { return hdr; },
    applyPreset: (name) => env.apply(name),
    get ready() { return ready; },
    /** the live post-processing numbers, for the assertions */
    get post() {
      return {
        enabled: !!B.post.enabled,
        vignette: vignettePass.uniforms.amount.value,
        antialias: !!renderer.getContextAttributes?.().antialias,
      };
    },
    /** the smoothed cursor-look offset, for the assertions */
    get look() { return { x: +lookX.toFixed(3), y: +lookY.toFixed(3) }; },
    get shells() { return shells; },
    /** the bowl's centre, in CSS pixels of the viewport */
    projected() {
      // the matrices only refresh inside a render — and the canvas is skipped
      // entirely at opacity 0 — so bring them up to date here, or a reader
      // gets wherever the bowl last DREW, not where it is
      group.updateMatrixWorld(true);
      const v = new THREE.Vector3(0, 0, 0)
        .applyMatrix4(group.matrixWorld)
        .project(camera);
      // the canvas is display:none once the bowl is covered, and a hidden
      // element measures 0 — fall back to the viewport so anything reading this
      // (the ground opens from it) never gets a garbage point
      const w = renderer.domElement.clientWidth || window.innerWidth || 1;
      const h = renderer.domElement.clientHeight || window.innerHeight || 1;
      return { x: ((v.x + 1) / 2) * w, y: ((1 - v.y) / 2) * h };
    },
    /** the bowl's own on-screen radius, in CSS pixels (his ask, 2026-09-21 —
     * V5's fourth circle has to land exactly on the bowl's silhouette).
     * `norm` (not `group`) carries the "widest span 1" normalisation, so its
     * own local 0.5 on X is the actual rendered edge — the equatorial one,
     * which is what a 2D circle drawn around it should match. */
    projectedRadius() {
      group.updateMatrixWorld(true);
      // the rim, sampled all the way round and read as its on-screen
      // half-WIDTH — a single point on local X would swing with the idle
      // spin (foreshortened whenever it points at the camera) and the
      // diagram built on it would breathe. The silhouette's width does not.
      const w = renderer.domElement.clientWidth || window.innerWidth || 1;
      let minX = Infinity, maxX = -Infinity;
      const v = new THREE.Vector3();
      for (let i = 0; i < 32; i++) {
        const a = (i / 32) * Math.PI * 2;
        // GROUP space: after `norm`'s normalisation the bowl is centred on the
        // origin, half a unit wide, its rim at `rimY`
        v.set(Math.cos(a) * 0.5, rimY, Math.sin(a) * 0.5).applyMatrix4(group.matrixWorld).project(camera);
        const x = ((v.x + 1) / 2) * w;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
      }
      return (maxX - minX) / 2;
    },
    /** the wireframe crossfade's own numbers, for the assertions */
    get wireframe() {
      return {
        mix: +wireframeMix.toFixed(3),
        on: wireframeMix >= 0.5,
        lines: wire ? wire.geometry.attributes.position.count / 2 : 0,
        alpha: wireMat ? +wireMat.opacity.toFixed(3) : 0,
      };
    },
  };
}
