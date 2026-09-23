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
  reveal = false,           // a soft disc around the cursor turns the metal into its wireframe
  wireColor = 0x1d1d1f, wireAlpha = 0.32, revealRadius = 170,
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
    mat.customProgramCacheKey = () => (mat.name || "m") + ":mask:" + expr;
    mat.transparent = true;
  }
  const wireMat = new THREE.MeshBasicMaterial({ color: wireColor, wireframe: true, transparent: true, depthWrite: false });
  wireMat.name = "wire";
  if (reveal) withMask(wireMat, `gl_FragColor.a *= revealMask() * ${wireAlpha.toFixed(3)};`);
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
      const mesh = new THREE.Mesh(part.geometry, mat);
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
      group.rotation.x = rad(P.model.rotX + lean * q) - state.hy * 0.07;
      group.rotation.z = rad(P.model.rotZ || 0) + state.hx * 0.03;
      group.position.y = 0.06 * H * q;
      norm.rotation.y = state.spin + state.turn + state.hx * 0.16;
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

  return {
    /** 0 at the top of the page, 1 once the hero has scrolled past */
    setScroll(q) { state.q = clamp01(q); },
    /** an extra turn about the vertical axis, in radians, on top of the idle spin */
    setTurn(rad) { state.turn = rad || 0; },
    /** a multiplier on the preset's exposure — 1 is his light as dialled */
    setExposure(mult) { state.exposure = Math.max(0.05, mult || 1); },
    resize,
    get ready() { return state.ready; },
    probe() { return { ready: state.ready, q: state.q, meshes: norm.children.length, size: group.scale.x, reveal: +state.reveal.toFixed(2), hx: +state.hx.toFixed(3) }; },
  };
}
