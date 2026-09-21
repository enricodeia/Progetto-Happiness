import {
  ACESFilmicToneMapping,
  AgXToneMapping,
  AmbientLight,
  Box3,
  Color,
  DirectionalLight,
  Euler,
  Matrix4,
  Quaternion,
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

  // `alpha: true` (2026-09-21): Experience 2 draws the knot OVER the three
  // circles, so the canvas has to be see-through there. It costs nothing when
  // the section paints its own paper — the clear colour is opaque then.
  const renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setClearColor(new Color(st.scene.background), 1);
  let transparent = false;
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
    /**
     * The three lobes as circles on screen (Experience 2, 2026-09-21): for
     * each lobe, the outer stretch of the curve around its vertex — `span` of
     * the parameter either side of it — projected through this camera at the
     * knot's REST pose (the pointer lean left out, or the circles would
     * wobble with the mouse), then the least-squares circle through those
     * points (Kåsa's fit: linear in the circle's own equation). In mount
     * pixels, with the vertex parameter so a card can be seated on it.
     */
    lobeCircles(span = 0.11) {
      if (!knot.curve || !knot.stats) return null;
      const o = st.object;
      const rest = new Matrix4().compose(
        knot.group.position,
        new Quaternion().setFromEuler(new Euler(o.rotX * DEG, o.rotY * DEG, o.rotZ * DEG)),
        new Vector3(o.scale, o.scale, o.scale)
      );
      camera.updateMatrixWorld(true);
      const [cx0, cy0, cz0] = knot.stats.centre;
      const { w, h } = api.size;
      const v = new Vector3();
      const out = [];
      const N = 40;
      for (let k = 0; k < 3; k++) {
        const tk = (2 * k + 1) / 6;
        let sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0, sxz = 0, syz = 0, sz = 0;
        for (let i = 0; i <= N; i++) {
          const t = tk - span + (2 * span * i) / N;
          const p = knot.curve.getPoint(((t % 1) + 1) % 1);
          v.set(p.x - cx0, p.y - cy0, p.z - cz0).applyMatrix4(rest).project(camera);
          const x = ((v.x + 1) / 2) * w, y = ((1 - v.y) / 2) * h;
          const z = x * x + y * y;
          sx += x; sy += y; sxx += x * x; syy += y * y; sxy += x * y; sxz += x * z; syz += y * z; sz += z;
        }
        const n = N + 1;
        // normal equations for x² + y² + A·x + B·y + C = 0
        const a11 = sxx, a12 = sxy, a13 = sx, a22 = syy, a23 = sy, a33 = n;
        const b1 = -sxz, b2 = -syz, b3 = -sz;
        const det = a11 * (a22 * a33 - a23 * a23) - a12 * (a12 * a33 - a23 * a13) + a13 * (a12 * a23 - a22 * a13);
        if (Math.abs(det) < 1e-9) return null;
        const A = (b1 * (a22 * a33 - a23 * a23) - a12 * (b2 * a33 - a23 * b3) + a13 * (b2 * a23 - a22 * b3)) / det;
        const B = (a11 * (b2 * a33 - a23 * b3) - b1 * (a12 * a33 - a23 * a13) + a13 * (a12 * b3 - b2 * a13)) / det;
        const C = (a11 * (a22 * b3 - b2 * a23) - a12 * (a12 * b3 - b2 * a13) + b1 * (a12 * a23 - a22 * a13)) / det;
        const cx = -A / 2, cy = -B / 2;
        const r = Math.sqrt(Math.max(0, cx * cx + cy * cy - C));
        out.push({ k, t: tk, cx, cy, r });
      }
      return out;
    },
  };
  const DEG = Math.PI / 180;

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
    // see-through (Experience 2): no background, a fully transparent clear
    if (transparent) {
      if (scene.background) scene.background = null;
      renderer.setClearColor(0x000000, 0);
    } else {
      scene.background = new Color(s.background);
      renderer.setClearColor(scene.background, 1);
    }
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
    // the composer's passes write an opaque frame, so over the circles the
    // knot is rendered straight — the bloom and the vignette are the paper's
    if (st.post.enabled && !transparent) {
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
    /** the three lobes as fitted circles on screen — see `api.lobeCircles` */
    lobeCircles: (span) => api.lobeCircles(span),
    /** the mount's own rect — the pixel space `lobeCircles` reports in */
    rect: () => mount.getBoundingClientRect(),
    /** Experience 2: draw over whatever is under the canvas */
    setTransparent(v) { transparent = !!v; },
    get transparent() { return transparent; },
    setActive(v) {
      active = !!v;
      renderer.domElement.style.display = active ? "" : "none";
      // ...and the cards with it: `syncCards` only runs while active, so an
      // inactive Atlas hosted in a VISIBLE stage (Experience 2, before the
      // knot's window) would otherwise show three unplaced white cards
      // stacked in the corner. `syncCards` sets the host's display back.
      if (!active) cardsMount.style.display = "none";
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
        transparent,
        active,
        post: {
          enabled: !!st.post.enabled,
          bloomStrength: bloomPass.strength,
          vignette: vignettePass.uniforms.amount.value,
        },
      };
    },
  };
}
