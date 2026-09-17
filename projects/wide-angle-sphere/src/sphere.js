import * as THREE from "three";
import gsap from "gsap";
import { placeItem, itemCount } from "./lib/layout.js";
import { makeBentGeometry, makeCardMaterial } from "./lib/itemMesh.js";
import { metalabMedia } from "./data/metalab.js";
import { photoMedia } from "./data/photos.js";
import { createPills3D } from "./pills3d.js";

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerp = (a, b, t) => a + (b - a) * t;
const expoOut = (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x));
const smooth = (x) => x * x * (3 - 2 * x);
const rad = THREE.MathUtils.degToRad;

const AXIS_X = new THREE.Vector3(1, 0, 0);
const AXIS_Y = new THREE.Vector3(0, 1, 0);
// Placeholder tint: light, so a not-yet-loaded card reads as paper.
const PLACEHOLDER = new THREE.Color("#ececec");

/**
 * The canvas: Wide Angle Sphere + the pills that live on it, driven by the
 * shared timeline.
 *
 *  · step 1 (tl.asm 0)    one portrait, dead centre in whatever the panel
 *                         leaves exposed, narrow lens, no reveal
 *  · step 2 (tl.asm 0→1)  the rest bloom out of it, lens widens to fov 90
 *  · step 3 (tl.pill 0→1) the pills appear among the photos, on their own shell
 *
 * ...and that is the whole of it: the section after this one is the Atlas,
 * which collapses over this stage rather than continuing it.
 *
 * The drawing buffer is sized once per resize and never during the scroll:
 * the canvas is always the whole frame and the composition is placed with
 * `camera.filmOffset` (a frustum skew) instead.
 */
export function createSphere({ mount, cfg }) {
  const scene = new THREE.Scene();
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(new THREE.Color(cfg.columns.rightBg), 1);
  renderer.domElement.className = "was-canvas";
  renderer.domElement.setAttribute("role", "img");
  renderer.domElement.setAttribute(
    "aria-label",
    "A sphere of teacher portraits that turns as the page scrolls, with floating topic pills. Drag to turn it."
  );
  mount.appendChild(renderer.domElement);

  const camera = new THREE.PerspectiveCamera(cfg.portrait.fov, 1, 0.1, 800);
  const drum = new THREE.Group();
  scene.add(drum);

  // fraction of the frame the left panel covers (0 = full bleed)
  let split = cfg.columns.split / 100;

  // ── build the sphere ─────────────────────────────────────────────────────
  // `src/photos/*` by default (drop files in, they show up); the Metalab case
  // media the preset shipped with is still one switch away.
  const media = cfg.images.source === "metalab" ? metalabMedia() : photoMedia();
  const L = cfg.layout;
  const G = cfg.geometry;
  const total = itemCount(L.shape, L.perRow, L.rows, Math.round(cfg.images.count));
  const planeH = G.planeW / G.aspect;
  const planeAspect = G.planeW / planeH;
  const geo = makeBentGeometry(G.planeW, planeH, G.segments, L.radius, G.bend);
  const loader = new THREE.TextureLoader();
  loader.crossOrigin = "anonymous";
  const videoEls = [];
  const mats = [];
  const items = [];
  let disposed = false;

  for (let idx = 0; idx < total; idx++) {
    const pos = placeItem(L.shape, idx, total, {
      perRow: Math.max(1, Math.round(L.perRow)),
      rows: Math.max(1, Math.round(L.rows)),
      radius: L.radius,
      rowGap: L.rowGap,
      curve: L.curve,
      spiralTurns: L.spiralTurns,
      spiralRise: L.spiralRise,
      spiralGrow: L.spiralGrow,
    });
    const holder = new THREE.Group();
    holder.position.set(pos.x, pos.y, pos.z);
    holder.rotation.y = L.faceCenter ? pos.ry : 0;

    const mat = makeCardMaterial();
    mat.uniforms.uRadius.value = G.borderRadius;
    mat.uniforms.uCornerN.value = G.cornerN ?? 2;
    mat.uniforms.uAspect.value = planeAspect;
    mat.uniforms.uPlaneAspect.value = planeAspect;
    mat.uniforms.uTint.value = PLACEHOLDER.clone();
    mat.uniforms.uOpacity.value = 0;
    mats.push(mat);

    const mesh = new THREE.Mesh(geo, mat);
    holder.add(mesh);
    drum.add(holder);

    items.push({
      holder, mesh, mat, idx,
      pos: new THREE.Vector3(pos.x, pos.y, pos.z),
      baseRy: holder.rotation.y,
      rank: 0,
      loaded: false,
    });
  }

  // ── hero card: the portrait we open on ───────────────────────────────────
  let heroIdx = Math.round(cfg.portrait.index);
  if (!(heroIdx >= 0 && heroIdx < total)) {
    heroIdx = 0;
    let best = Infinity;
    for (const it of items) {
      const d = Math.abs(it.pos.y);
      if (d < best) { best = d; heroIdx = it.idx; }
    }
  }
  const hero = items[heroIdx];
  // Spinning the drum by -atan2(x, z) puts the hero at (0, y, r) — dead on the
  // camera axis, whatever the fibonacci distribution did.
  const heroRotY = -Math.atan2(hero.pos.x, hero.pos.z);
  const heroRxz = Math.hypot(hero.pos.x, hero.pos.z);
  const heroY = hero.pos.y;

  // Assembly order: out of the hero card (angular distance on the sphere).
  const rest = items.filter((it) => it !== hero);
  const heroDir = hero.pos.clone().normalize();
  if (cfg.assembly.order === "index") {
    rest.sort((a, b) => a.idx - b.idx);
  } else if (cfg.assembly.order === "random") {
    rest.sort((a, b) => Math.sin(a.idx * 12.9898) - Math.sin(b.idx * 12.9898));
  } else {
    rest.sort(
      (a, b) =>
        b.pos.clone().normalize().dot(heroDir) - a.pos.clone().normalize().dot(heroDir)
    );
  }
  rest.forEach((it, i) => { it.rank = i; });

  // ── textures ─────────────────────────────────────────────────────────────
  const heroReady = { done: false, cbs: [] };
  const markHeroReady = () => {
    if (heroReady.done) return;
    heroReady.done = true;
    heroReady.cbs.splice(0).forEach((fn) => fn());
  };
  setTimeout(markHeroReady, 3000); // never block the piece on the network

  items.forEach((it) => {
    const entry = media[it.idx % media.length] || {};
    const onTex = (tex, w, h) => {
      if (disposed) return;
      tex.colorSpace = THREE.SRGBColorSpace;
      it.mat.uniforms.uImgAspect.value = (w || 1) / (h || 1);
      it.mat.uniforms.uTex.value = tex;
      it.mat.uniforms.uHasTex.value = 1;
      it.loaded = true;
      if (it === hero) markHeroReady();
    };
    if (cfg.images.video && entry.video) {
      const vid = document.createElement("video");
      Object.assign(vid, {
        src: entry.video, crossOrigin: "anonymous", loop: true,
        muted: true, playsInline: true, preload: "auto",
      });
      vid.setAttribute("playsinline", "");
      videoEls.push(vid);
      const vtex = new THREE.VideoTexture(vid);
      vid.addEventListener("loadeddata", () => {
        onTex(vtex, vid.videoWidth || 16, vid.videoHeight || 9);
        vid.play().catch(() => {});
      });
      vid.load();
    }
    if (entry.image) {
      loader.load(
        entry.image,
        (tex) => {
          if (it.loaded && cfg.images.video) return; // video already won
          onTex(tex, tex.image?.width, tex.image?.height);
        },
        undefined,
        () => { if (it === hero) markHeroReady(); }
      );
    } else if (it === hero) markHeroReady();
  });

  // ── the pills, on their own shell inside the same drum ───────────────────
  const pills = createPills3D({ parent: drum, camera, cfg });

  // ── interaction: mouse parallax + drag to tumble (X and Y) ──────────────
  const ptr = { x: 0, y: 0 };
  const par = { x: 0, y: 0 };
  const onPointerMove = (e) => {
    // normalised against the exposed part of the frame
    const r = mount.getBoundingClientRect();
    const x0 = r.left + r.width * split;
    const w = Math.max(1, r.width * (1 - split));
    ptr.x = ((e.clientX - x0) / w) * 2 - 1;
    ptr.y = ((e.clientY - r.top) / Math.max(1, r.height)) * 2 - 1;
  };
  window.addEventListener("pointermove", onPointerMove, { passive: true });

  // Free tumble: the drag is a quaternion applied in world space on top of
  // the framing tilt and the scroll spin, so the sphere can be turned in any
  // direction and keeps its momentum.
  const qDrag = new THREE.Quaternion();
  const qTilt = new THREE.Quaternion();
  const qSpin = new THREE.Quaternion();
  const qStep = new THREE.Quaternion();
  const eTilt = new THREE.Euler();
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let velY = 0; // about Y (horizontal drag)
  let velX = 0; // about X (vertical drag)

  const el = renderer.domElement;
  el.style.cursor = "grab";
  const onDown = (e) => {
    if (!cfg.motion.drag) return;
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    el.style.cursor = "grabbing";
  };
  const onDrag = (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    velY += dx * cfg.motion.dragSense;
    if (cfg.motion.dragX) velX += dy * cfg.motion.dragSense;
  };
  const onUp = () => { dragging = false; el.style.cursor = "grab"; };
  el.addEventListener("pointerdown", onDown);
  window.addEventListener("pointermove", onDrag, { passive: true });
  window.addEventListener("pointerup", onUp);

  // ── state ────────────────────────────────────────────────────────────────
  const state = {
    intro: { v: cfg.portrait.intro === "none" ? 1 : 0 },
    asm: 0,
    spin: 0,
    pill: 0,
    tumble: { x: 0, y: 0 },
    heroIdx,
    total,
    photos: media.length,
    started: false,
  };
  let introTween = null;

  function startHeroIntro() {
    if (state.started) return;
    state.started = true;
    if (cfg.portrait.intro === "none") {
      state.intro.v = 1;
      return;
    }
    const run = () => {
      if (disposed) return;
      introTween = gsap.to(state.intro, {
        v: 1,
        duration: cfg.portrait.introDur,
        ease: "power2.out",
        overwrite: true,
      });
    };
    if (heroReady.done) run();
    else heroReady.cbs.push(run);
  }

  function resetHeroIntro() {
    if (introTween) introTween.kill();
    introTween = null;
    state.intro.v = cfg.portrait.intro === "none" ? 1 : 0;
    state.started = false;
  }

  // Distance the camera needs so one portrait fills `fill` of the exposed
  // part of the frame.
  function heroCamZ() {
    const vFov = rad(cfg.portrait.fov);
    const exposed = (camera.aspect || 1) * (1 - split);
    const dH = planeH / cfg.portrait.fill / (2 * Math.tan(vFov / 2));
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * exposed);
    const dW = G.planeW / cfg.portrait.fill / (2 * Math.tan(hFov / 2));
    return heroRxz + Math.max(dH, dW);
  }

  // Frustum skew that lands the scene centre in the middle of the exposed
  // part: for a panel covering `split` of the width, that is NDC x = split.
  function applyFilmOffset() {
    const a = camera.aspect || 1;
    camera.filmOffset =
      -split * Math.tan(rad(camera.fov) / 2) * a * camera.getFilmWidth();
  }

  const _camW = new THREE.Vector3();
  const _hold = new THREE.Vector3();
  const Q_ID = new THREE.Quaternion();
  let spinDrift = 0;
  let clock = 0;
  // the scene keeps its state up to date even when the layer is off, but
  // there is no point paying for the draw
  let active = true;

  function frame(dt, tl) {
    clock += dt;
    const a = tl.asm;
    const e = smooth(a);
    state.asm = a;
    state.pill = tl.pill;

    // ── camera: narrow + close on the portrait → wide angle on the ball ───
    camera.fov = lerp(cfg.portrait.fov, cfg.camera.fov, e);
    const camY = lerp(heroY, cfg.camera.y, e);
    const camZ = lerp(heroCamZ(), cfg.camera.z, e);
    const lookY = lerp(heroY, cfg.camera.lookAtY, e);

    let ox = 0, oy = 0;
    if (cfg.parallax.enabled) {
      par.x += (ptr.x - par.x) * cfg.parallax.ease;
      par.y += (ptr.y - par.y) * cfg.parallax.ease;
      ox = par.x * cfg.parallax.strengthX * e;
      oy = -par.y * cfg.parallax.strengthY * e;
    }
    camera.position.set(cfg.camera.x + ox, camY + oy, camZ);
    camera.lookAt(cfg.camera.lookAtX, lookY, 0);
    applyFilmOffset();
    camera.updateProjectionMatrix();

    // ── drum: tilt eases in, scroll spin about its own axis, free tumble ──
    eTilt.set(rad(cfg.camera.tiltX) * e, 0, rad(cfg.camera.tiltZ) * e, "XYZ");
    qTilt.setFromEuler(eTilt);

    // Idle drift is the one thing on the clock that does not reverse, so it
    // is applied THROUGH `e` and unwound whenever the piece is back on the
    // portrait. Without this, scrolling down and back up leaves the opening
    // card a few degrees off centre.
    spinDrift += dt * 0.16 * cfg.motion.autoSpin * e;
    if (e <= 0.02) spinDrift *= Math.pow(0.0015, dt);
    state.spin =
      heroRotY + tl.spinP * cfg.motion.scrollSpin * Math.PI * 2 + spinDrift * e;
    qSpin.setFromAxisAngle(AXIS_Y, state.spin);

    if (Math.abs(velY) > 1e-6) {
      qStep.setFromAxisAngle(AXIS_Y, velY);
      qDrag.premultiply(qStep);
      state.tumble.y += velY;
    }
    if (Math.abs(velX) > 1e-6) {
      qStep.setFromAxisAngle(AXIS_X, velX);
      qDrag.premultiply(qStep);
      state.tumble.x += velX;
    }
    velY *= cfg.motion.momentum;
    velX *= cfg.motion.momentum;

    // ...and the same for a hand-turned sphere: back on step 1 it recentres,
    // so the opening portrait is ALWAYS square to the camera.
    if (!dragging && e <= 0.02 && cfg.motion.recenter > 0) {
      const k = 1 - Math.pow(1 - clamp01(cfg.motion.recenter), dt * 60);
      qDrag.slerp(Q_ID, k);
      state.tumble.x *= 1 - k;
      state.tumble.y *= 1 - k;
      if (Math.abs(state.tumble.x) < 1e-4 && Math.abs(state.tumble.y) < 1e-4) {
        qDrag.identity();
        state.tumble.x = 0;
        state.tumble.y = 0;
      }
    }

    drum.quaternion.copy(qDrag).multiply(qTilt).multiply(qSpin);
    // Perf pass (2026-09-17): the spin, the drag and the recentre above keep
    // running, so the sphere is never caught stopped mid-turn — but the
    // billboard pass (18 lookAt), the assembly pop and the pills are only
    // worth computing on a frame that is going to be drawn. They are pure
    // functions of the scroll, so the first active frame lands on exactly the
    // picture it would have anyway.
    if (!active) return;
    drum.updateWorldMatrix(true, true);

    // ── billboard every card (look away from the camera → un-mirrored) ────
    if (cfg.layout.faceCamera) {
      camera.getWorldPosition(_camW);
      for (const it of items) {
        it.holder.getWorldPosition(_hold);
        it.holder.lookAt(
          2 * _hold.x - _camW.x,
          2 * _hold.y - _camW.y,
          2 * _hold.z - _camW.z
        );
      }
    } else {
      for (const it of items) it.holder.rotation.set(0, it.baseRy, 0);
    }

    // ── per-card assembly pop, staggered out of the hero ──────────────────
    const n = Math.max(1, rest.length - 1);
    const w = Math.max(0.02, cfg.assembly.window);
    const spread = (1 - w) * clamp01(cfg.assembly.stagger);

    for (const it of items) {
      if (it === hero) {
        // the portrait we open on: it is simply there, holding the centre
        it.mesh.scale.set(1, 1, 1);
        it.mesh.position.z = 0;
        it.mat.uniforms.uOpacity.value = cfg.look.opacity * state.intro.v;
      } else {
        const t0 = (it.rank / n) * spread;
        const s = expoOut(clamp01((a - t0) / w));
        it.mesh.scale.set(s, s, 1);
        it.mesh.position.z = -(1 - s) * cfg.assembly.distance;
        it.mat.uniforms.uOpacity.value = cfg.look.opacity * s * state.intro.v;
      }
      it.mat.uniforms.uRadius.value = cfg.geometry.borderRadius;
      it.mat.uniforms.uCornerN.value = cfg.geometry.cornerN ?? 2;
    }

    pills.update(tl, clock);
    if (active) renderer.render(scene, camera);
  }

  function setSplit(s) {
    split = clamp01(s);
  }

  function resize() {
    const w = mount.clientWidth || window.innerWidth;
    const h = mount.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(1, h);
    applyFilmOffset();
    camera.updateProjectionMatrix();
  }
  resize();

  function dispose() {
    disposed = true;
    if (introTween) introTween.kill();
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointermove", onDrag);
    window.removeEventListener("pointerup", onUp);
    el.removeEventListener("pointerdown", onDown);
    videoEls.forEach((v) => { v.pause(); v.removeAttribute("src"); v.load(); });
    pills.dispose();
    geo.dispose();
    mats.forEach((m) => {
      m.uniforms.uTex.value?.dispose?.();
      m.dispose();
    });
    renderer.dispose();
    el.remove();
  }

  // Where does the centre of the sphere actually land on screen? The piece
  // has to hold that spot: dead centre of whatever the panel leaves exposed.
  const _proj = new THREE.Vector3();
  function projectPoint(target) {
    const w = renderer.domElement.clientWidth || 1;
    const h = renderer.domElement.clientHeight || 1;
    _proj.copy(target).project(camera);
    return {
      x: ((_proj.x + 1) / 2) * w,
      y: ((1 - _proj.y) / 2) * h,
      wantX: w * split + (w * (1 - split)) / 2,
      wantY: h / 2,
    };
  }
  const _origin = new THREE.Vector3();
  const projectCenter = () => projectPoint(_origin.set(0, 0, 0));
  // the portrait we open on — this is the spot the piece must hold
  const projectHero = () => {
    hero.holder.getWorldPosition(_hold);
    return projectPoint(_hold);
  };

  return {
    frame,
    resize,
    scene,
    setSplit,
    setActive: (v) => { active = !!v; },
    projectCenter,
    projectHero,
    dispose,
    state,
    pills,
    startHeroIntro,
    resetHeroIntro,
    resetTumble: () => {
      qDrag.identity();
      velX = 0;
      velY = 0;
      state.tumble.x = 0;
      state.tumble.y = 0;
    },
    setClear: (hex) => renderer.setClearColor(new THREE.Color(hex), 1),
  };
}
