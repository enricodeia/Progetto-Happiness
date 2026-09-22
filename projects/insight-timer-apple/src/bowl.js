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

export function createBowl({ canvas, host, size = 0.66 }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = P.render?.exposure ?? 1;
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

  const state = { ready: false, q: 0, spin: 0, visible: true };

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
      const mesh = new THREE.Mesh(part.geometry, mat);
      norm.add(mesh);
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
      const s = size * (1 - 0.18 * q);
      group.scale.setScalar(s * H);
      group.rotation.x = rad(P.model.rotX + 14 * q);
      group.rotation.z = rad(P.model.rotZ || 0);
      group.position.y = 0.06 * H * q;
      norm.rotation.y = state.spin;
      renderer.render(scene, camera);
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // only work while on screen
  const io = new IntersectionObserver((es) => { for (const e of es) state.visible = e.isIntersecting; }, { threshold: 0 });
  io.observe(canvas);

  resize();
  addEventListener("resize", resize);

  return {
    /** 0 at the top of the page, 1 once the hero has scrolled past */
    setScroll(q) { state.q = clamp01(q); },
    resize,
    get ready() { return state.ready; },
    probe() { return { ready: state.ready, q: state.q, meshes: norm.children.length, size: group.scale.x }; },
  };
}
