import * as THREE from "three";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";

// ---------------------------------------------------------------------------
// The light rig IS the environment. Ported from the bowl studio
// (bowl-studio-source 2/src/env.js) and decoupled from its store.
//
// On a metal a punctual light does essentially nothing — what you see is the
// environment. So there are no fake directional lights here: a gradient dome
// plus soft-edged emissive panels are built into a small scene and pre-filtered
// through PMREM into `scene.environment`. Move a panel, the reflection moves.
//
// The same panels are ALSO mirrored as real RectAreaLights, because the inner
// surface runs at envMapIntensity 0 and is lit by those alone.
// ---------------------------------------------------------------------------

const DEG = Math.PI / 180;

// Panel "intensity" is an artist number, not a radiance. PANEL_GAIN maps it to
// emitted radiance so the dialled rig (key 11.0 × envMapIntensity 0.53 ×
// studio 1.93) lands at ~4.4 linear on the shell — a bright specular that
// still has falloff, rather than a white blob after ACES.
const PANEL_GAIN = 0.39;

const PANEL_VS = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;

const PANEL_FS = /* glsl */ `
varying vec2 vUv;
uniform vec3 uColor;
uniform float uIntensity;
uniform float uSoft;
void main() {
  vec2 q = abs(vUv - 0.5) * 2.0;
  float s = clamp(uSoft, 0.001, 1.0);
  // separable soft edges keep the panel rectangular at low softness ...
  float ex = 1.0 - smoothstep(1.0 - s, 1.0, q.x);
  float ey = 1.0 - smoothstep(1.0 - s, 1.0, q.y);
  // ... plus a gentle radial bias so the centre stays hottest
  float r = length(q);
  float rad = 1.0 - smoothstep(0.0, 1.6, r) * (0.35 + 0.55 * s);
  gl_FragColor = vec4(uColor * uIntensity * ex * ey * rad, 1.0);
}
`;

const DOME_VS = /* glsl */ `
varying vec3 vDir;
void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;

const DOME_FS = /* glsl */ `
varying vec3 vDir;
uniform vec3 uTop, uBottom;
uniform float uIntensity, uGradient;
void main() {
  float t = clamp(normalize(vDir).y * 0.5 + 0.5, 0.0, 1.0);
  t = pow(t, max(uGradient, 0.001));
  gl_FragColor = vec4(mix(uBottom, uTop, t) * uIntensity, 1.0);
}
`;

// Starting points only — a preset fills light values, nothing hidden.
export const STUDIO_PRESETS = {
  "Studio warm": {
    domeTop: "#8a7a60", domeBottom: "#1d1913", domeIntensity: 0.88, domeGradient: 1.5,
    intensity: 1.93, rotation: 176,
    lights: [
      { on: true, color: "#fff2dc", intensity: 11.0, w: 21, h: 17, soft: 0.62, az: -54, el: 28, dist: 13 },
      { on: true, color: "#dfe8ff", intensity: 5.9,  w: 22, h: 16, soft: 0.90, az: 78,  el: 10, dist: 16 },
      { on: true, color: "#ffd9a4", intensity: 7.0,  w: 11, h: 7,  soft: 0.45, az: 166, el: 24, dist: 12 },
    ],
  },
  "Hard studio": {
    domeTop: "#e8e6e2", domeBottom: "#8f8b85", domeIntensity: 0.5, domeGradient: 1.0,
    intensity: 1.5, rotation: 160,
    lights: [
      { on: true, color: "#ffffff", intensity: 14.0, w: 6,  h: 6,  soft: 0.28, az: -35, el: 50, dist: 11 },
      { on: true, color: "#dfe6f5", intensity: 3.0,  w: 22, h: 16, soft: 0.90, az: 90,  el: 5,  dist: 16 },
      { on: true, color: "#ffe6c8", intensity: 8.0,  w: 7,  h: 5,  soft: 0.35, az: 160, el: 20, dist: 11 },
    ],
  },
  "Soft box": {
    domeTop: "#8d857b", domeBottom: "#2a2622", domeIntensity: 0.8, domeGradient: 1.4,
    intensity: 1.8, rotation: 150,
    lights: [
      { on: true,  color: "#fff8ee", intensity: 4.2, w: 22, h: 16, soft: 0.90, az: -30, el: 40, dist: 14 },
      { on: true,  color: "#f2f5ff", intensity: 2.0, w: 24, h: 18, soft: 0.95, az: 80,  el: 12, dist: 16 },
      { on: false, color: "#ffe6c8", intensity: 3.0, w: 12, h: 8,  soft: 0.60, az: 170, el: 25, dist: 12 },
    ],
  },
  "Rim only": {
    domeTop: "#4a4a4c", domeBottom: "#141414", domeIntensity: 0.35, domeGradient: 1.0,
    intensity: 2.2, rotation: 180,
    lights: [
      { on: false, color: "#ffffff", intensity: 6.0,  w: 12, h: 9,  soft: 0.6, az: -40, el: 45, dist: 12 },
      { on: true,  color: "#cfe0ff", intensity: 2.0,  w: 16, h: 12, soft: 0.8, az: 60,  el: 0,  dist: 14 },
      { on: true,  color: "#ffd7a0", intensity: 16.0, w: 9,  h: 6,  soft: 0.4, az: 175, el: 30, dist: 11 },
    ],
  },
};

function place(obj, az, el, dist, targetY = 0) {
  const a = az * DEG;
  const e = el * DEG;
  obj.position.set(
    dist * Math.cos(e) * Math.sin(a),
    dist * Math.sin(e) + targetY,
    dist * Math.cos(e) * Math.cos(a)
  );
  obj.lookAt(0, targetY, 0);
}

/** `studio` is the live config object — build() re-bakes from it. */
export function createEnv(renderer, scene, studio) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  RectAreaLightUniformsLib.init();

  const rig = new THREE.Scene();
  const root = new THREE.Group();
  rig.add(root);

  const domeMat = new THREE.ShaderMaterial({
    vertexShader: DOME_VS,
    fragmentShader: DOME_FS,
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uTop: { value: new THREE.Color("#8a7a60") },
      uBottom: { value: new THREE.Color("#1d1913") },
      uIntensity: { value: 0.88 },
      uGradient: { value: 1.5 },
    },
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(60, 48, 32), domeMat);
  root.add(dome);

  const panels = [];
  const sceneLights = [];
  const sceneGroup = new THREE.Group();

  function panel() {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.ShaderMaterial({
        vertexShader: PANEL_VS,
        fragmentShader: PANEL_FS,
        side: THREE.DoubleSide,
        depthWrite: false,
        uniforms: {
          uColor: { value: new THREE.Color(1, 1, 1) },
          uIntensity: { value: 1 },
          uSoft: { value: 0.6 },
        },
      })
    );
    root.add(m);
    panels.push(m);
    return m;
  }

  let current = null;
  let sig = "";

  const signature = () =>
    JSON.stringify([
      studio.domeTop, studio.domeBottom, studio.domeIntensity, studio.domeGradient,
      studio.pmremSigma, studio.isolate,
      studio.lights.map((l) => [l.on, l.color, l.intensity, l.w, l.h, l.soft, l.az, l.el, l.dist, l.roll, l.toEnv]),
    ]);

  const api = {
    rig, dome, panels, sceneGroup,

    /** Re-bake the PMREM. Expensive — debounce it, never call it per frame. */
    build(force = false) {
      const s = signature();
      if (!force && s === sig && current) {
        api.sync();
        return current.texture;
      }
      sig = s;

      domeMat.uniforms.uTop.value.set(studio.domeTop);
      domeMat.uniforms.uBottom.value.set(studio.domeBottom);
      domeMat.uniforms.uIntensity.value = studio.domeIntensity;
      domeMat.uniforms.uGradient.value = studio.domeGradient;

      const iso = Number.isFinite(studio.isolate) ? studio.isolate : -1;
      while (panels.length < studio.lights.length) panel();
      for (let i = 0; i < panels.length; i++) {
        const p = panels[i];
        const L = studio.lights[i];
        const toEnv = L && L.toEnv != null ? L.toEnv : 1;
        if (!L || !L.on || toEnv <= 0 || (iso >= 0 && iso !== i)) {
          p.visible = false;
          continue;
        }
        p.visible = true;
        p.scale.set(Math.max(0.05, L.w), Math.max(0.05, L.h), 1);
        place(p, L.az, L.el, L.dist);
        if (L.roll) p.rotateZ(L.roll * DEG);
        p.material.uniforms.uColor.value.set(L.color);
        p.material.uniforms.uIntensity.value = L.intensity * toEnv * PANEL_GAIN;
        p.material.uniforms.uSoft.value = L.soft;
      }

      if (current) current.dispose();
      // sigma 0.05 trips a clipping warning; 0.028 is the sweet spot
      current = pmrem.fromScene(rig, studio.pmremSigma ?? 0.028, 0.1, 200);
      scene.environment = current.texture;
      api.syncLights();
      api.sync();
      return current.texture;
    },

    /** Cheap: intensity + rotation of the already-baked environment. */
    sync() {
      scene.environmentIntensity = studio.intensity;
      scene.environmentRotation.set(0, studio.rotation * DEG, 0);
    },

    /** The real RectAreaLights — this is what lights the inner surface. */
    syncLights() {
      while (sceneLights.length < studio.lights.length) {
        const l = new THREE.RectAreaLight(0xffffff, 1, 1, 1);
        sceneGroup.add(l);
        sceneLights.push(l);
      }
      const iso = Number.isFinite(studio.isolate) ? studio.isolate : -1;
      const rot = studio.rotation * DEG;
      const k = studio.sceneLightScale ?? 0.055;
      for (let i = 0; i < sceneLights.length; i++) {
        const l = sceneLights[i];
        const L = studio.lights[i];
        const toScene = L && L.toScene != null ? L.toScene : 1;
        if (!L || !L.on || toScene <= 0 || (iso >= 0 && iso !== i)) {
          l.visible = false;
          continue;
        }
        l.visible = true;
        l.color.set(L.color);
        l.intensity = L.intensity * toScene * k;
        l.width = Math.max(0.05, L.w);
        l.height = Math.max(0.05, L.h);
        const a = L.az * DEG + rot;
        const e = L.el * DEG;
        l.position.set(
          L.dist * Math.cos(e) * Math.sin(a),
          L.dist * Math.sin(e),
          L.dist * Math.cos(e) * Math.cos(a)
        );
        l.lookAt(0, 0, 0);
      }
    },

    apply(name) {
      const p = STUDIO_PRESETS[name];
      if (!p) return;
      studio.domeTop = p.domeTop;
      studio.domeBottom = p.domeBottom;
      studio.domeIntensity = p.domeIntensity;
      studio.domeGradient = p.domeGradient;
      studio.intensity = p.intensity;
      studio.rotation = p.rotation;
      p.lights.forEach((L, i) => studio.lights[i] && Object.assign(studio.lights[i], L));
      api.build(true);
    },

    dispose() {
      if (current) current.dispose();
      pmrem.dispose();
      dome.geometry.dispose();
      domeMat.dispose();
      for (const p of panels) {
        p.geometry.dispose();
        p.material.dispose();
      }
    },
  };

  return api;
}
