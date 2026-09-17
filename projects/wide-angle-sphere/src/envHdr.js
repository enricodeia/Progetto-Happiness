import * as THREE from "three";
import { EXRLoader } from "three/examples/jsm/loaders/EXRLoader.js";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";

// ─────────────────────────────────────────────────────────────────────────────
// A real captured environment for the bowl — one or two equirectangular
// HDRs/EXRs, pre-filtered through PMREM into `scene.environment`.
//
// It lights the 3D and NOTHING ELSE: `scene.background` is never touched, and
// the bowl's own canvas is a transparent layer over the page, so the page's
// paper shows straight through. An HDR that also painted the backdrop would
// put a photograph of a studio behind the whole site.
//
// Two files blend into one: they are composited into a single equirect target
// first (`mix` 0 = the first, 1 = the second, 0.5 = half of each) and PMREM
// runs once on the result. Pre-filtering two maps and cross-fading the
// reflections afterwards is not the same thing and costs twice as much.
//
// Files live in `public/hdr/`. If one is missing the rig falls back to the
// panel studio (src/env.js) and says so — the page must never break because an
// asset has not been dropped in yet.
// ─────────────────────────────────────────────────────────────────────────────

const BLEND_VS = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const BLEND_FS = /* glsl */ `
varying vec2 vUv;
uniform sampler2D uA;
uniform sampler2D uB;
uniform float uMix;
uniform float uHasB;
void main() {
  vec3 a = texture2D(uA, vUv).rgb;
  vec3 b = uHasB > 0.5 ? texture2D(uB, vUv).rgb : a;
  gl_FragColor = vec4(mix(a, b, clamp(uMix, 0.0, 1.0)), 1.0);
}
`;

const loaderFor = (url) =>
  /\.exr(\?|$)/i.test(url) ? new EXRLoader() : new RGBELoader();

/** One equirect map, or null if it is not there. */
async function loadMap(url) {
  if (!url) return null;
  try {
    const tex = await loaderFor(url).loadAsync(url);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    return tex;
  } catch (err) {
    console.warn(`[bowl] environment not loaded: ${url}`, err?.message || err);
    return null;
  }
}

export function createHdrEnv(renderer, scene) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();

  let maps = [];          // the loaded source textures
  let blendRT = null;     // the composite the PMREM actually reads
  let current = null;     // the pre-filtered cube
  let key = "";
  const state = { loaded: 0, files: [], active: false };

  const quad = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.ShaderMaterial({
      vertexShader: BLEND_VS,
      fragmentShader: BLEND_FS,
      uniforms: {
        uA: { value: null },
        uB: { value: null },
        uMix: { value: 0.5 },
        uHasB: { value: 0 },
      },
      depthTest: false,
      depthWrite: false,
    })
  );
  const blendScene = new THREE.Scene().add(quad);
  const blendCam = new THREE.Camera();

  /** Composite the loaded maps into one equirect texture. */
  function composite(mix) {
    const [a, b] = maps;
    if (!a) return null;
    if (!b) return a;
    const w = Math.max(a.image.width, b.image.width);
    const h = Math.max(a.image.height, b.image.height);
    if (!blendRT || blendRT.width !== w || blendRT.height !== h) {
      blendRT?.dispose();
      blendRT = new THREE.WebGLRenderTarget(w, h, {
        type: THREE.HalfFloatType,
        colorSpace: THREE.LinearSRGBColorSpace,
      });
    }
    quad.material.uniforms.uA.value = a;
    quad.material.uniforms.uB.value = b;
    quad.material.uniforms.uMix.value = mix;
    quad.material.uniforms.uHasB.value = 1;
    const prev = renderer.getRenderTarget();
    renderer.setRenderTarget(blendRT);
    renderer.render(blendScene, blendCam);
    renderer.setRenderTarget(prev);
    blendRT.texture.mapping = THREE.EquirectangularReflectionMapping;
    return blendRT.texture;
  }

  let srcTex = null;

  const api = {
    state,
    /** the composited EQUIRECT the PMREM was baked from — the only thing that
        can be used as a world background, since a PMREM target cannot be */
    get source() { return srcTex; },

    /**
     * Load (once per file list) and bake. Resolves to true when the
     * environment is actually up, false when it fell back.
     */
    async build(hdr) {
      const files = (hdr.files || []).filter(Boolean);
      const next = files.join("|");
      if (next !== key) {
        key = next;
        for (const m of maps) m.dispose?.();
        maps = (await Promise.all(files.map(loadMap))).filter(Boolean);
        state.loaded = maps.length;
        state.files = files;
      }
      if (!maps.length) {
        state.active = false;
        return false;
      }
      const src = composite(hdr.mix ?? 0.5);
      srcTex = src;
      current?.dispose();
      current = pmrem.fromEquirectangular(src);
      // the 3D only — the page's own ground is never touched
      scene.environment = current.texture;
      scene.background = null;
      api.sync(hdr);
      state.active = true;
      return true;
    },

    /** Cheap: intensity + rotation of the already-baked environment. */
    sync(hdr) {
      scene.environmentIntensity = hdr.intensity ?? 1;
      scene.environmentRotation.set(0, ((hdr.rotation ?? 0) * Math.PI) / 180, 0);
    },

    dispose() {
      current?.dispose();
      blendRT?.dispose();
      for (const m of maps) m.dispose?.();
      quad.geometry.dispose();
      quad.material.dispose();
      pmrem.dispose();
    },
  };

  return api;
}
