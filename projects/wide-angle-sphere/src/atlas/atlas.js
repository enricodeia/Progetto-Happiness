import {
  ACESFilmicToneMapping,
  AgXToneMapping,
  AmbientLight,
  Box3,
  Color,
  DirectionalLight,
  NeutralToneMapping,
  NoToneMapping,
  PCFSoftShadowMap,
  PMREMGenerator,
  PerspectiveCamera,
  Scene,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { KnotObject } from "./knotObject.js";
import { createPointerOrbit } from "./pointerOrbit.js";
import { createCards } from "./cards.js";
import { DEFAULTS, cloneState, mergeState } from "./defaults.js";
import { VIGNETTE } from "../postfx.js";
import PRESET from "./preset.json";

// ─────────────────────────────────────────────────────────────────────────────
// The closing section: Atlas, ported whole from projects/atlas-knot.
//
// A trefoil band in white porcelain that DRAWS ITSELF as the section scrolls:
// one front travels once around the loop, the band grows out of its own centre
// line behind it, and three cards arrive as the front passes their own vertex —
// the library, the members, the therapists. Same number, so a card can never
// drift out of sync with the mark.
//
// Everything it is comes from `preset.json`, the preset exported from the
// studio, merged over that project's defaults so an older preset keeps working.
// The only thing this page owns is WHEN: `setProgress` is written from the
// section's own scroll, exactly as `reveal.progress` was there.
// ─────────────────────────────────────────────────────────────────────────────

const TONE = {
  none: NoToneMapping,
  aces: ACESFilmicToneMapping,
  agx: AgXToneMapping,
  neutral: NeutralToneMapping,
};

/** The preset, over the defaults. This is the state the whole section reads. */
export const ATLAS_STATE = mergeState(cloneState(DEFAULTS), PRESET);

export function createAtlas({ mount, cardsMount, state = ATLAS_STATE }) {
  const st = state;

  const renderer = new WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
  renderer.setClearAlpha(1);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;
  renderer.domElement.className = "was-atlas-canvas";
  renderer.domElement.setAttribute("role", "img");
  renderer.domElement.setAttribute(
    "aria-label",
    "A three-lobed knot that draws itself as the page scrolls, one strand per source of evidence."
  );
  mount.appendChild(renderer.domElement);

  const scene = new Scene();
  scene.background = new Color(st.scene.background);

  // A generated studio room is what gives a white solid its soft falloff across
  // the rounded edges; without it the porcelain reads as flat paper.
  const pmrem = new PMREMGenerator(renderer);
  const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
  scene.environment = envRT.texture;
  scene.environmentIntensity = st.scene.envIntensity;
  pmrem.dispose();

  const key = new DirectionalLight(0xffffff, st.light.keyIntensity);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 40;
  const ext = 6;
  Object.assign(key.shadow.camera, { left: -ext, right: ext, top: ext, bottom: -ext });
  key.shadow.camera.updateProjectionMatrix();
  const fill = new AmbientLight(0xffffff, st.light.fillIntensity);
  scene.add(key, key.target, fill);

  const camera = new PerspectiveCamera(st.camera.fov, 1, 0.1, 200);
  camera.position.set(0, 0, st.camera.distance);
  const target = new Vector3();

  const knot = new KnotObject(st);
  scene.add(knot.group);
  const pointer = createPointerOrbit(st);

  let active = true;
  let dirtyGeometry = false;

  const api = {
    camera,
    knot,
    scene,
    state: st,
    get size() {
      return { w: mount.clientWidth || 1, h: mount.clientHeight || 1 };
    },
    /**
     * Frame the knot on its real extents. A 3-fold symmetric mark has an
     * off-centre bounding box, so we aim at the box centre and derive the
     * distance from its half-extents.
     */
    fitView() {
      const c = st.camera;
      knot.group.updateMatrixWorld(true);
      const box = new Box3().setFromObject(knot.mesh);
      if (box.isEmpty()) return;
      const centre = box.getCenter(new Vector3());
      const size = box.getSize(new Vector3());
      const halfFov = (c.fov * Math.PI) / 360;
      const aspect = Math.max(api.size.w / api.size.h, 0.2);
      const pad = 1 + c.padding;
      const fitH = ((size.y * 0.5) / Math.tan(halfFov)) * pad;
      const fitW = ((size.x * 0.5) / (Math.tan(halfFov) * aspect)) * pad;
      c.distance = Math.max(fitH, fitW) + size.z * 0.5;
      // Aimed a bit ABOVE the mark's own centre moves the mark DOWN the
      // frame — a plain pan, not a crop: the fit (and so the zoom level) is
      // still derived from the real extents above, this only decides where
      // in the frame that fit composition sits.
      const aim = centre.clone();
      aim.x += c.offsetX || 0;
      aim.y += c.offsetY || 0;
      target.copy(aim);
      camera.position.set(aim.x, aim.y, centre.z + c.distance);
      camera.lookAt(aim);
      camera.updateMatrixWorld(true);
    },
    /** Screen-space box of the WHOLE mark, so the cards can clear it. */
    markScreenBox() {
      knot.group.updateMatrixWorld(true);
      const box = new Box3().setFromObject(knot.mesh);
      const { w, h } = api.size;
      let left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity;
      const p = new Vector3();
      for (let i = 0; i < 8; i++) {
        p.set(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z);
        p.project(camera);
        const x = ((p.x + 1) / 2) * w;
        const y = ((1 - p.y) / 2) * h;
        left = Math.min(left, x); right = Math.max(right, x);
        top = Math.min(top, y); bottom = Math.max(bottom, y);
      }
      return { left, right, top, bottom };
    },
    holeScreenPosition() {
      const p = new Vector3(0, 0, 0).applyMatrix4(knot.group.matrixWorld).project(camera);
      const { w, h } = api.size;
      return { x: ((p.x + 1) / 2) * w, y: ((1 - p.y) / 2) * h };
    },
  };

  const syncCards = createCards(cardsMount, st, api);

  // ── post-processing (his ask, 2026-09-16) ────────────────────────────────
  // Built once, resized like everything else, and only ever USED when
  // `post.enabled` — `frame()` below renders straight to the canvas otherwise,
  // so turning it off is not just invisible, it is free.
  const composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  const bloomPass = new UnrealBloomPass(
    new Vector2(api.size.w, api.size.h),
    st.post.bloomStrength, st.post.bloomRadius, st.post.bloomThreshold
  );
  const vignettePass = new ShaderPass(VIGNETTE);
  const outputPass = new OutputPass();
  composer.addPass(renderPass);
  composer.addPass(bloomPass);
  composer.addPass(vignettePass);
  composer.addPass(outputPass);

  function applyPostSettings() {
    const p = st.post;
    bloomPass.strength = p.bloomStrength;
    bloomPass.radius = p.bloomRadius;
    bloomPass.threshold = p.bloomThreshold;
    vignettePass.uniforms.amount.value = p.vignette;
  }

  function applySceneSettings() {
    const s = st.scene;
    const l = st.light;
    scene.background = new Color(s.background);
    renderer.toneMapping = TONE[s.toneMapping] ?? NoToneMapping;
    renderer.toneMappingExposure = s.exposure;
    scene.environmentIntensity = s.envIntensity;
    camera.fov = st.camera.fov;
    camera.updateProjectionMatrix();

    const az = (l.keyAzimuth * Math.PI) / 180;
    const el = (l.keyElevation * Math.PI) / 180;
    knot.lightDir
      .set(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az))
      .normalize();
    key.position.copy(knot.lightDir).multiplyScalar(12);
    key.intensity = l.keyIntensity;
    key.castShadow = l.shadows;
    key.shadow.radius = l.shadowSoftness;
    key.shadow.bias = l.shadowBias;
    key.shadow.normalBias = 0.02;
    key.shadow.intensity = l.shadowOpacity;
    fill.intensity = l.fillIntensity;
  }

  function resize() {
    const { w, h } = api.size;
    const dpr = Math.min(st.scene.dpr, window.devicePixelRatio || 1);
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    composer.setPixelRatio(dpr);
    composer.setSize(w, h);
    camera.aspect = w / Math.max(1, h);
    camera.updateProjectionMatrix();
    if (st.camera.autoFit) api.fitView();
  }
  resize();

  /** The section's own scroll, 0 → 1. This is the whole clock. */
  function setProgress(q) {
    st.reveal.progress = q < 0 ? 0 : q > 1 ? 1 : q;
  }

  function frame(dt) {
    // A hard stop, not just a skipped draw call: while the section is off
    // screen there is nothing to sync, tone-map or project cards for either
    // — the same "stop ALL per-frame work, not just the render" rule the
    // bowl and the ground already follow once covered.
    if (!active) return;
    if (dirtyGeometry) {
      dirtyGeometry = false;
      knot.rebuild();
      if (st.camera.autoFit) api.fitView();
    }
    knot.sync(pointer.update(dt), dt);
    applySceneSettings();
    if (st.post.enabled) {
      applyPostSettings();
      composer.render();
    } else {
      renderer.render(scene, camera);
    }
    syncCards();
  }

  function dispose() {
    pointer.dispose();
    knot.dispose();
    envRT?.dispose();
    composer.dispose();
    renderer.dispose();
    renderer.domElement.remove();
  }

  return {
    frame,
    resize,
    setProgress,
    dispose,
    state: st,
    knot,
    camera,
    scene,
    fitView: () => api.fitView(),
    rebuild: () => { dirtyGeometry = true; },
    setActive(v) {
      active = !!v;
      renderer.domElement.style.display = active ? "" : "none";
    },
    /** the live numbers, for the assertions */
    probe() {
      const r = knot.reveal || { front: 0, progress: 0, seal: 0 };
      const cards = [...cardsMount.querySelectorAll(".was-atl-card")].map(
        (el) => +(+el.style.opacity || 0).toFixed(2)
      );
      return {
        progress: +(st.reveal.progress || 0).toFixed(3),
        front: +r.front.toFixed(3),
        seal: +(r.seal ?? 0).toFixed(3),
        anchor: +st.reveal.anchor.toFixed(4),
        crossings: knot.crossings ? knot.crossings.length : 0,
        tris: knot.stats ? knot.stats.triangles : 0,
        cards,
        titles: st.cards.items.map((i) => i.title),
        bg: st.scene.background,
        post: {
          enabled: !!st.post.enabled,
          bloomStrength: bloomPass.strength,
          vignette: vignettePass.uniforms.amount.value,
        },
      };
    },
  };
}
