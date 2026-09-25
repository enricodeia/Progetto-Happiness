import * as THREE from "three";
import { bowlGeometries } from "./bowlGeo.js";
import { makeSlotMaterial, applySlot } from "./bowlMaterial.js";
import { createEnv } from "./env.js";
import { BOWL_PRESET as P } from "./data/bowlPreset.js";

// The bowl, photographed rather than choreographed: one object, centred,
// lit by the studio he dialled (the same shells, materials and light rig as
// the scroll piece — `bowlGeo` / `bowlMaterial` / `env` are that project's
// modules, untouched — driven by his own preset JSON). The only motion is a
// slow idle turn and a lean that follows the hero's own scroll, so it never
// moves unless the reader does.

const rad = (d) => (d * Math.PI) / 180;
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

export function createBowl({
  canvas, host, size = 0.66, exposure = 1, lean = 14, shrink = 0.18,
  hover = false,            // the object tilts a little toward the cursor, wherever it is
  hoverAmount = 1,          // how much — 1 is the default pull
  reveal = false,           // a soft disc around the cursor turns the metal into its wireframe
  wireColor = 0x1d1d1f, wireAlpha = 0.32, revealRadius = 170,
  ring = false,             // the shells can vibrate: the (2,0), (3,0)... modes of a real bowl, as a vertex displacement
  offsetY = 0,              // the object's resting height, as a share of the visible height
}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  // `exposure` scales his preset's own — the second edition asks for a
  // touch more light on the metal
  renderer.toneMappingExposure = (P.render?.exposure ?? 1) * exposure;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(P.cam.fov, 1, 0.05, 200);
  camera.position.set(0, 0, P.cam.dist);

  // the studio: his preset's rig, baked once into the environment and mirrored
  // as real area lights for the inner surface
  const studio = P.studio;
  studio.pmremSigma ??= 0.028;
  studio.sceneLightScale ??= 0.055;
  studio.isolate ??= -1;
  const env = createEnv(renderer, scene, studio);
  scene.add(env.sceneGroup);
  env.build();

  const group = new THREE.Group();
  const norm = new THREE.Group();
  group.add(norm);
  scene.add(group);

  const relief = new THREE.TextureLoader().load("/images/bowl-normal.webp");
  relief.wrapS = relief.wrapT = THREE.RepeatWrapping;
  relief.colorSpace = THREE.NoColorSpace;
  relief.anisotropy = 8;
  relief.userData.kind = "normal";
  relief.userData.name = "bowl-normal.webp";

  const state = {
    ready: false, shown: false, q: 0, spin: 0, turn: 0, exposure: 1, visible: true,
    // pointer: target and eased, in −1…1 across the window; client px for the mask
    tx: 0, ty: 0, hx: 0, hy: 0, cx: -1e4, cy: -1e4, revealTarget: 0, reveal: 0,
  };
  // the mask lives in device pixels of this canvas — shared by every material
  const maskU = {
    uPointer: { value: new THREE.Vector2(-1e4, -1e4) },
    uRadius: { value: revealRadius },
    uReveal: { value: 0 },
  };
  const MASK_GLSL = `
uniform vec2 uPointer; uniform float uRadius; uniform float uReveal;
float revealMask() {
  float d = distance(gl_FragCoord.xy, uPointer);
  return uReveal * (1.0 - smoothstep(uRadius * 0.55, uRadius, d));
}`;
  // every injection adds to the material's program key, so two on one material still compile apart
  function addKey(mat, key) {
    (mat.userData.keys ??= []).push(key);
    mat.customProgramCacheKey = () => (mat.name || "m") + ":" + mat.userData.keys.join("|");
  }
  // chain onto a material's own onBeforeCompile (the bowl materials already inject the relief)
  function withMask(mat, expr) {
    const prev = mat.onBeforeCompile;
    mat.onBeforeCompile = (shader, renderer) => {
      prev?.(shader, renderer);
      Object.assign(shader.uniforms, maskU);
      shader.fragmentShader = shader.fragmentShader
        .replace("#include <common>", "#include <common>\n" + MASK_GLSL)
        .replace("#include <opaque_fragment>", "#include <opaque_fragment>\n  " + expr);
    };
    addKey(mat, "mask:" + expr);
    mat.transparent = true;
  }

  // ── the ring: six radial modes, amplitude and phase from outside ──────────
  // In the shells' own space the rim is a circle of radius 1 and the foot
  // sits on y = 0. Mode k bends the wall into cos((k+2)·θ), most at the rim,
  // not at all at the foot, which is what a struck bowl really does (slowed
  // down a thousandfold so the eye can follow it).
  const ringU = {
    uModeAmp: { value: new Float32Array(6) },
    uModePhase: { value: new Float32Array(6) },
    uModeOsc: { value: new Float32Array(6) },
    uYRange: { value: new THREE.Vector2(0, 1) },
  };
  const RING_GLSL = `
uniform float uModeAmp[6]; uniform float uModePhase[6]; uniform float uModeOsc[6]; uniform vec2 uYRange;
vec3 ringDisp(vec3 p) {
  float th = atan(p.z, p.x);
  float h = smoothstep(uYRange.x, uYRange.y, p.y);
  h *= h;
  float d = 0.0;
  for (int k = 0; k < 6; k++) {
    d += uModeAmp[k] * cos(float(k + 2) * th - uModePhase[k]) * uModeOsc[k];
  }
  vec2 rdir = normalize(p.xz + vec2(1e-5, 0.0));
  return vec3(rdir.x, 0.0, rdir.y) * d * h;
}`;
  function withRing(mat) {
    const prev = mat.onBeforeCompile;
    mat.onBeforeCompile = (shader, renderer) => {
      prev?.(shader, renderer);
      Object.assign(shader.uniforms, ringU);
      let v = shader.vertexShader.replace("#include <common>", "#include <common>\n" + RING_GLSL);
      // the relief reads the undisplaced position, so it stays welded to the metal
      v = v.includes("vBsPos = transformed;")
        ? v.replace("vBsPos = transformed;", "vBsPos = transformed;\n  transformed += ringDisp(transformed);")
        : v.replace("#include <begin_vertex>", "#include <begin_vertex>\n  transformed += ringDisp(transformed);");
      shader.vertexShader = v;
    };
    addKey(mat, "ring");
  }
  const rim = { r: 0.5, y: 0, foot: 0, height: 1 };   // in the group's units, once the parts arrive
  const ringState = { osc: new Float32Array(6), t: 0, pulse: 0, pulseT: 9 };
  const RING_AMP = [0.055, 0.036, 0.024, 0.016, 0.011, 0.007];   // in shell units (rim radius 1)
  const RING_HZ = [1.7, 2.6, 3.6, 4.8, 6.1, 7.5];                 // the slowed-down wobble the eye follows
  const wireMat = new THREE.MeshBasicMaterial({ color: wireColor, wireframe: true, transparent: true, depthWrite: false });
  wireMat.name = "wire";
  if (reveal) withMask(wireMat, `gl_FragColor.a *= revealMask() * ${wireAlpha.toFixed(3)};`);
  if (ring) withRing(wireMat);
  const baseExposure = renderer.toneMappingExposure;

  bowlGeometries(P.model).then((parts) => {
    const box = new THREE.Box3();
    for (const part of parts) {
      const s = P.material[part.slot] || P.material.A;
      s.ior ??= 1.5;
      s.specularIntensity ??= 1;
      s.envMapIntensity ??= 1;
      s.relief.imageRepeat ??= [1, 1];
      const mat = makeSlotMaterial(part.slot);
      applySlot(mat, s, P.model.noiseSpace, { relief });
      if (reveal) withMask(mat, "gl_FragColor.a *= 1.0 - revealMask();");
      if (ring) withRing(mat);
      const mesh = new THREE.Mesh(part.geometry, mat);
      mesh.userData.shell = true;
      norm.add(mesh);
      if (reveal) {
        // the same shell drawn as lines, visible only inside the disc
        const wire = new THREE.Mesh(part.geometry, wireMat);
        wire.renderOrder = 2;
        norm.add(wire);
      }
      box.union(part.geometry.boundingBox);
    }
    // the parts arrive with the widest span 2 and sitting on y = 0 — centre
    // them on the object's own middle and bring the diameter to 1
    const c = box.getCenter(new THREE.Vector3());
    norm.position.set(-c.x * 0.5, -c.y * 0.5, -c.z * 0.5);
    norm.scale.setScalar(0.5);
    rim.y = (box.max.y - c.y) * 0.5;
    rim.foot = (box.min.y - c.y) * 0.5;
    rim.height = (box.max.y - box.min.y) * 0.5;
    ringU.uYRange.value.set(box.min.y + (box.max.y - box.min.y) * 0.25, box.max.y);
    state.ready = true;
  });

  const worldH = () => 2 * P.cam.dist * Math.tan(rad(P.cam.fov) / 2);
  // the shorter side of the stage, in world units — so a phone gets a bowl
  // sized to its width, not to a height it cannot show
  const worldMin = () => { const H = worldH(); return Math.min(H, H * camera.aspect); };

  function resize() {
    const r = host.getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width));
    const h = Math.max(1, Math.round(r.height));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (state.visible) {
      state.spin += dt * 0.12;
      const q = state.q;
      // the diameter as a share of the visible height; it eases down a touch
      // as the hero scrolls away, and leans forward with it
      const H = worldH();
      const s = size * (1 - shrink * q);
      group.scale.setScalar(s * worldMin());
      // the cursor's pull, eased so it never snaps
      state.hx += (state.tx - state.hx) * 0.06;
      state.hy += (state.ty - state.hy) * 0.06;
      state.reveal += (state.revealTarget - state.reveal) * 0.1;
      group.rotation.x = rad(P.model.rotX + lean * q) - state.hy * 0.07 * hoverAmount;
      group.rotation.z = rad(P.model.rotZ || 0) + state.hx * 0.03 * hoverAmount;
      group.position.y = (offsetY + 0.06 * q) * H;
      norm.rotation.y = state.spin + state.turn + state.hx * 0.16 * hoverAmount;
      if (ring) {
        ringState.t += dt;
        ringState.pulseT += dt;
        for (let k = 0; k < 6; k++) ringState.osc[k] = Math.cos(2 * Math.PI * RING_HZ[k] * ringState.t);
        ringU.uModeOsc.value.set(ringState.osc);
        // the strike itself: a quick squash that springs back
        const pt = ringState.pulseT;
        const squash = pt < 1 ? 0.02 * ringState.pulse * Math.cos(2 * Math.PI * 5.5 * pt) * Math.exp(-pt / 0.22) : 0;
        group.scale.setScalar(s * worldMin() * (1 - squash));
      }
      if (reveal) {
        const r = canvas.getBoundingClientRect();
        const dpr = renderer.getPixelRatio();
        maskU.uPointer.value.set((state.cx - r.left) * dpr, (r.height - (state.cy - r.top)) * dpr);
        maskU.uRadius.value = revealRadius * dpr;
        maskU.uReveal.value = state.reveal;
      }
      renderer.toneMappingExposure = baseExposure * state.exposure;
      renderer.render(scene, camera);
      // the first frame with the metal on it: let the canvas fade in
      if (state.ready && !state.shown) { state.shown = true; canvas.classList.add("is-ready"); }
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // only work while on screen
  const io = new IntersectionObserver((es) => { for (const e of es) state.visible = e.isIntersecting; }, { threshold: 0 });
  io.observe(canvas);

  resize();
  addEventListener("resize", resize);

  // the cursor, anywhere in the window
  if ((hover || reveal) && matchMedia("(hover: hover)").matches) {
    addEventListener("pointermove", (e) => {
      if (hover) {
        state.tx = (e.clientX / innerWidth) * 2 - 1;
        state.ty = (e.clientY / innerHeight) * 2 - 1;
      }
      state.cx = e.clientX; state.cy = e.clientY;
      state.revealTarget = 1;
    }, { passive: true });
    document.addEventListener("mouseleave", () => { state.revealTarget = 0; state.tx = 0; state.ty = 0; });
  }

  // ── picking: where on the bowl (or on the plane of its rim) the pointer is ─
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const planeN = new THREE.Vector3();
  const planeP = new THREE.Vector3();
  const plane = new THREE.Plane();
  const hitP = new THREE.Vector3();
  const tmp = new THREE.Vector3();
  function pick(clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const out = { hit: false, plane: false, theta: 0, thetaGroup: 0, rLocal: 0, y: 0, point: null, planePoint: null };
    const shells = norm.children.filter((m) => m.userData.shell);
    const hits = raycaster.intersectObjects(shells, false);
    if (hits.length) {
      out.hit = true;
      out.point = hits[0].point.clone();
      const l = norm.worldToLocal(hits[0].point.clone());
      out.theta = Math.atan2(l.z, l.x);
      out.y = l.y;
      const g = group.worldToLocal(hits[0].point.clone());
      out.thetaGroup = Math.atan2(g.z, g.x);
      out.rLocal = Math.hypot(l.x, l.z);
    }
    // the plane of the rim, in the world
    planeP.set(0, rim.y, 0); group.localToWorld(planeP);
    planeN.set(0, 1, 0).applyQuaternion(group.quaternion);
    plane.setFromNormalAndCoplanarPoint(planeN, planeP);
    if (raycaster.ray.intersectPlane(plane, hitP)) {
      out.plane = true;
      out.planePoint = hitP.clone();
      const l = norm.worldToLocal(hitP.clone());
      const g = group.worldToLocal(hitP.clone());
      out.planeTheta = Math.atan2(l.z, l.x);
      out.planeThetaGroup = Math.atan2(g.z, g.x);
      out.planeR = Math.hypot(l.x, l.z);          // 1 = the rim, in shell units
      if (!out.hit) { out.theta = out.planeTheta; out.thetaGroup = out.planeThetaGroup; out.rLocal = out.planeR; }
    }
    return out;
  }
  /** a point of the group (its units: rim radius 0.5) → CSS px inside the canvas */
  function toScreen(x, y, z) {
    tmp.set(x, y, z); group.localToWorld(tmp); tmp.project(camera);
    const r = canvas.getBoundingClientRect();
    return { x: (tmp.x + 1) / 2 * r.width, y: (1 - tmp.y) / 2 * r.height };
  }

  return {
    /** 0 at the top of the page, 1 once the hero has scrolled past */
    setScroll(q) { state.q = clamp01(q); },
    /** the six modes' energies (0..1) and the angle (shell space) the antinode should sit at */
    setModes(energies, theta = null) {
      const a = ringU.uModeAmp.value;
      for (let k = 0; k < 6; k++) a[k] = clamp01(energies[k] || 0) * RING_AMP[k];
      if (theta !== null) { const ph = ringU.uModePhase.value; for (let k = 0; k < 6; k++) ph[k] = (k + 2) * theta; }
    },
    /** the squash of a strike, 0..1 */
    pulse(strength = 1) { ringState.pulse = clamp01(strength); ringState.pulseT = 0; },
    pick, toScreen,
    rim, group, norm, scene, camera, renderer,
    get spin() { return norm.rotation.y; },
    /** an extra turn about the vertical axis, in radians, on top of the idle spin */
    setTurn(rad) { state.turn = rad || 0; },
    /** a multiplier on the preset's exposure — 1 is his light as dialled */
    setExposure(mult) { state.exposure = Math.max(0.05, mult || 1); },
    resize,
    get ready() { return state.ready; },
    probe() { return { ready: state.ready, q: state.q, meshes: norm.children.length, size: group.scale.x, reveal: +state.reveal.toFixed(2), hx: +state.hx.toFixed(3), modes: Array.from(ringU.uModeAmp.value, (v) => +v.toFixed(4)), rimY: +rim.y.toFixed(3) }; },
  };
}
