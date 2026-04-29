// Build a self-contained JS snippet that recreates the current material
// LIVE in another three.js project — no PNG files needed.
//
// The emitted file:
//   • inlines the GLSL prelude (period-wrapped tileable hash + fbm + worley
//     + caustics + warp + smin) — same one the app uses internally
//   • inlines the picked shader body, parameters, colors, seed
//   • renders the shader to a 1024² render target (sRGB)
//   • derives a height + Sobel-normal + box-blurred AO into more RTs
//   • returns a fully-configured THREE.MeshPhysicalMaterial with every
//     physical field copied verbatim from the current state
//
// One-shot call: `const material = createMaterial(renderer)`. Drop into any
// scene, attach to any mesh.

const PARAM_KEYS = ['p1','p2','p3','p4','p5','p6','p7','p8','p9','p10','p11','p12'];

const PRELUDE = `precision highp float;
varying vec2 vUv;
uniform float uTime;
uniform float uSeed;
uniform vec2  uSize;
uniform float uP1; uniform float uP2; uniform float uP3; uniform float uP4;
uniform float uP5; uniform float uP6; uniform float uP7; uniform float uP8;
uniform float uP9; uniform float uP10; uniform float uP11; uniform float uP12;
uniform vec3  uColorA; uniform vec3 uColorB; uniform vec3 uColorC; uniform vec3 uColorD;

#define PI  3.141592653589793
#define TAU 6.283185307179586

float hashP(vec2 p, float period, float seed) {
  vec2 q = mod(p, period);
  return fract(sin(dot(q, vec2(127.1, 311.7)) + seed * 19.19) * 43758.5453);
}
float vnoiseP(vec2 p, float period, float seed) {
  vec2 i = floor(p); vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hashP(i, period, seed);
  float b = hashP(i + vec2(1.0, 0.0), period, seed);
  float c = hashP(i + vec2(0.0, 1.0), period, seed);
  float d = hashP(i + vec2(1.0, 1.0), period, seed);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
float tnoise(vec2 uv, float period) {
  float P = max(1.0, floor(period));
  return vnoiseP(uv * P, P, uSeed);
}
float tfbm(vec2 uv, float period, int octaves) {
  float sum = 0.0, amp = 1.0, norm = 0.0, freq = 1.0;
  for (int i = 0; i < 10; i++) {
    if (i >= octaves) break;
    float P = max(1.0, floor(period * freq));
    sum += vnoiseP(uv * P, P, uSeed + float(i) * 7.0) * amp;
    norm += amp; amp *= 0.5; freq *= 2.0;
  }
  return sum / norm;
}
float tridge(vec2 uv, float period, int octaves) {
  float sum = 0.0, amp = 1.0, norm = 0.0, freq = 1.0;
  for (int i = 0; i < 10; i++) {
    if (i >= octaves) break;
    float P = max(1.0, floor(period * freq));
    float n = 1.0 - abs(vnoiseP(uv * P, P, uSeed + float(i) * 7.0) * 2.0 - 1.0);
    sum += n * n * amp; norm += amp; amp *= 0.5; freq *= 2.0;
  }
  return sum / norm;
}
float tturbulence(vec2 uv, float period, int octaves) {
  float sum = 0.0, amp = 1.0, norm = 0.0, freq = 1.0;
  for (int i = 0; i < 10; i++) {
    if (i >= octaves) break;
    float P = max(1.0, floor(period * freq));
    sum += abs(vnoiseP(uv * P, P, uSeed + float(i) * 7.0) * 2.0 - 1.0) * amp;
    norm += amp; amp *= 0.5; freq *= 2.0;
  }
  return sum / norm;
}
float dwarp(vec2 uv, float period, int octaves) {
  vec2 q = vec2(tfbm(uv, period, octaves), tfbm(uv + vec2(5.2, 1.3), period, octaves));
  vec2 r = vec2(tfbm(uv + 4.0 * q + vec2(1.7, 9.2), period, octaves),
                tfbm(uv + 4.0 * q + vec2(8.3, 2.8), period, octaves));
  return tfbm(uv + 4.0 * r, period, octaves);
}
vec3 worley(vec2 uv, float cells) {
  float C = max(2.0, floor(cells));
  vec2 p = uv * C; vec2 ip = floor(p); vec2 fp = fract(p);
  float d1 = 10.0, d2 = 10.0, id = 0.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 off = vec2(float(x), float(y));
      vec2 cell = ip + off;
      vec2 cellOff = vec2(hashP(cell, C, uSeed),
                          hashP(cell + vec2(17.0, 31.0), C, uSeed + 11.0));
      vec2 r = off + cellOff - fp;
      float d = dot(r, r);
      if (d < d1) { d2 = d1; d1 = d; id = hashP(cell, C, uSeed + 2.0); }
      else if (d < d2) { d2 = d; }
    }
  }
  return vec3(sqrt(d1), sqrt(d2), id);
}
float tcaustics(vec2 uv, float period, float k) {
  float n = tfbm(uv, period, 4);
  float a = cos((uv.x + n * 0.4) * k * TAU);
  float b = cos((uv.y + n * 0.4) * k * TAU);
  return 1.0 - abs(a * b);
}
float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}`;

const VERT = `varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

const NORMAL_FRAG = `precision highp float;
varying vec2 vUv;
uniform sampler2D uHeight;
uniform vec2  uTexel;
uniform float uStrength;
uniform float uInvertY;
void main() {
  float l  = texture2D(uHeight, vUv + vec2(-uTexel.x, 0.0)).r;
  float r  = texture2D(uHeight, vUv + vec2( uTexel.x, 0.0)).r;
  float t  = texture2D(uHeight, vUv + vec2(0.0, -uTexel.y)).r;
  float b  = texture2D(uHeight, vUv + vec2(0.0,  uTexel.y)).r;
  float dx = (r - l) * uStrength;
  float dy = (b - t) * uStrength * (uInvertY > 0.5 ? -1.0 : 1.0);
  vec3 n = normalize(vec3(-dx, -dy, 1.0));
  gl_FragColor = vec4(n * 0.5 + 0.5, 1.0);
}`;

const HEIGHT_FRAG = `precision highp float;
varying vec2 vUv;
uniform sampler2D uSource;
uniform float uLevels;
uniform float uInvert;
void main() {
  vec3 c = texture2D(uSource, vUv).rgb;
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  if (uLevels != 1.0) l = pow(l, 1.0 / uLevels);
  if (uInvert > 0.5) l = 1.0 - l;
  gl_FragColor = vec4(vec3(l), 1.0);
}`;

const ROUGH_FRAG = `precision highp float;
varying vec2 vUv;
uniform sampler2D uSource;
uniform float uBase;
uniform float uVariation;
uniform float uInvert;
void main() {
  vec3 c = texture2D(uSource, vUv).rgb;
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  if (uInvert > 0.5) l = 1.0 - l;
  float v = clamp(uBase + (l - 0.5) * uVariation, 0.0, 1.0);
  gl_FragColor = vec4(vec3(v), 1.0);
}`;

const AO_FRAG = `precision highp float;
varying vec2 vUv;
uniform sampler2D uHeight;
uniform vec2  uTexel;
uniform float uStrength;
uniform float uRadius;
void main() {
  float self = texture2D(uHeight, vUv).r;
  float sum = 0.0; float n = 0.0;
  float r = max(1.0, uRadius);
  for (int i = -3; i <= 3; i++) {
    for (int j = -3; j <= 3; j++) {
      if (float(i) > r || float(-i) > r || float(j) > r || float(-j) > r) continue;
      vec2 off = vec2(float(i), float(j)) * uTexel;
      sum += texture2D(uHeight, vUv + off).r;
      n += 1.0;
    }
  }
  float avg = sum / n;
  float occ = clamp(1.0 - (avg - self) * uStrength * 4.0, 0.0, 1.0);
  gl_FragColor = vec4(vec3(occ), 1.0);
}`;

const hexLit = (h) => JSON.stringify(h || '#000000');

export const buildLiveShaderSnippet = ({ shader = {}, gen = {}, material = {}, prefix = 'tssMaterial' } = {}) => {
  const params = {};
  PARAM_KEYS.forEach((k) => { params[k] = Number((shader[k] ?? 0).toFixed(4)); });

  const m = material;
  const g = gen;

  return `// =============================================================
// Live PBR material — generated by Texture Shader Simulator.
// Pure GLSL, no PNG textures needed. Drop into any three.js project,
// call createMaterial(renderer) once, attach the result to any mesh.
//
// Bonus: the shader runs LIVE — pass uniforms.uTime in your render loop
// to animate, or call rebuildSourceMap(renderer) after changing params.
// =============================================================
import * as THREE from 'three';

// ---------- shader source ----------
const PRELUDE = ${'`'}${PRELUDE}${'`'};
const VERT = ${'`'}${VERT}${'`'};
const SHADER_BODY = ${'`'}${(shader.code || '').trim()}${'`'};

// ---------- parameters ----------
export const PARAMS = ${JSON.stringify(params, null, 2)};
export const COLORS = {
  A: ${hexLit(shader.colorA)},
  B: ${hexLit(shader.colorB)},
  C: ${hexLit(shader.colorC || '#ffffff')},
  D: ${hexLit(shader.colorD || '#000000')}
};
export const SEED = ${Number(shader.seed ?? 0)};

// ---------- generation params (drive map derivation) ----------
const GEN = {
  normalStrength: ${Number(g.normalStrength ?? 3)},
  normalInvertY: ${g.normalInvertY ? 1 : 0},
  roughnessBase: ${Number(g.roughnessBase ?? 0.6)},
  roughnessVariation: ${Number(g.roughnessVariation ?? 0.5)},
  roughnessInvert: ${g.roughnessInvert ? 1 : 0},
  heightLevels: ${Number(g.heightLevels ?? 1)},
  heightInvert: ${g.heightInvert ? 1 : 0},
  aoStrength: ${Number(g.aoStrength ?? 1.5)},
  aoRadius: ${Number(g.aoRadius ?? 2)}
};

// ---------- physical material settings ----------
const MAT = ${JSON.stringify({
    metalness: m.metalness ?? 0,
    roughness: m.roughness ?? 0.85,
    normalScale: m.normalScale ?? 1,
    bumpScale: m.bumpScale ?? 0.05,
    repeat: m.repeat ?? 1,
    envMapIntensity: m.envIntensity ?? 1,
    transmission: m.transmission ?? 0,
    thickness: m.thickness ?? 0,
    ior: m.ior ?? 1.5,
    clearcoat: m.clearcoat ?? 0,
    clearcoatRoughness: m.clearcoatRoughness ?? 0.1,
    sheen: m.sheen ?? 0,
    sheenRoughness: m.sheenRoughness ?? 0.5,
    sheenColor: m.sheenColor ?? '#ffffff',
    anisotropy: m.anisotropy ?? 0,
    anisotropyRotation: m.anisotropyRotation ?? 0,
    iridescence: m.iridescence ?? 0,
    iridescenceIOR: m.iridescenceIOR ?? 1.3,
    iridescenceThicknessMin: m.iridescenceThicknessMin ?? 100,
    iridescenceThicknessMax: m.iridescenceThicknessMax ?? 400,
    attenuationDistance: m.attenuationDistance ?? 0,
    attenuationColor: m.attenuationColor ?? '#ffffff',
    specularIntensity: m.specularIntensity ?? 1,
    specularColor: m.specularColor ?? '#ffffff',
    emissiveColor: m.emissiveColor ?? '#000000',
    emissiveIntensity: m.emissiveIntensity ?? 0,
    displacementScale: m.displacementScale ?? 0
  }, null, 2)};

// ---------- helpers ----------
const NORMAL_FRAG = ${'`'}${NORMAL_FRAG}${'`'};
const HEIGHT_FRAG = ${'`'}${HEIGHT_FRAG}${'`'};
const ROUGH_FRAG  = ${'`'}${ROUGH_FRAG}${'`'};
const AO_FRAG     = ${'`'}${AO_FRAG}${'`'};

const hexToVec3 = (hex) => {
  const v = (hex || '#000000').replace('#', '');
  const n = parseInt(v.length === 3 ? v.split('').map(c => c + c).join('') : v, 16);
  return new THREE.Vector3(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
};

const fullscreenQuad = () => {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
    -1, -1, 3, -1, -1, 3
  ]), 2));
  geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([
    0, 0, 2, 0, 0, 2
  ]), 2));
  return geo;
};

const renderToRT = (renderer, fragment, size, uniforms = {}, colorSpace = THREE.NoColorSpace) => {
  const rt = new THREE.WebGLRenderTarget(size, size, {
    format: THREE.RGBAFormat,
    type: THREE.UnsignedByteType,
    minFilter: THREE.LinearMipmapLinearFilter,
    magFilter: THREE.LinearFilter,
    generateMipmaps: true,
    anisotropy: 16,
    colorSpace,
    depthBuffer: false,
    stencilBuffer: false
  });
  rt.texture.wrapS = rt.texture.wrapT = THREE.RepeatWrapping;
  const scene = new THREE.Scene();
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const mat = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: fragment,
    uniforms
  });
  const quad = new THREE.Mesh(fullscreenQuad(), mat);
  scene.add(quad);
  const prev = renderer.getRenderTarget();
  renderer.setRenderTarget(rt);
  renderer.render(scene, cam);
  renderer.setRenderTarget(prev);
  quad.geometry.dispose();
  mat.dispose();
  return rt;
};

// Build the source uniforms ONCE so we can tweak them at runtime
// (animation via uTime, live param edits, color swaps).
const buildSourceUniforms = (size) => {
  const u = {
    uTime: { value: 0 },
    uSeed: { value: SEED },
    uSize: { value: new THREE.Vector2(size, size) },
    uColorA: { value: hexToVec3(COLORS.A) },
    uColorB: { value: hexToVec3(COLORS.B) },
    uColorC: { value: hexToVec3(COLORS.C) },
    uColorD: { value: hexToVec3(COLORS.D) }
  };
  Object.entries(PARAMS).forEach(([k, v]) => {
    u['u' + k.toUpperCase()] = { value: v };
  });
  return u;
};

// Persistent source-render setup: a ShaderMaterial + scene + cam + RT that
// we re-render to whenever a param/time changes. Cheaper than rebuilding
// each frame.
const createSourceRenderer = (renderer, size, uniforms) => {
  const rt = new THREE.WebGLRenderTarget(size, size, {
    format: THREE.RGBAFormat,
    type: THREE.UnsignedByteType,
    minFilter: THREE.LinearMipmapLinearFilter,
    magFilter: THREE.LinearFilter,
    generateMipmaps: true,
    anisotropy: 16,
    colorSpace: THREE.SRGBColorSpace,
    depthBuffer: false,
    stencilBuffer: false
  });
  rt.texture.wrapS = rt.texture.wrapT = THREE.RepeatWrapping;
  const scene = new THREE.Scene();
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const mat = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: PRELUDE + '\\nvoid main() {\\n' + SHADER_BODY + '\\n}',
    uniforms
  });
  const geom = fullscreenQuad();
  const quad = new THREE.Mesh(geom, mat);
  scene.add(quad);
  const draw = () => {
    const prev = renderer.getRenderTarget();
    renderer.setRenderTarget(rt);
    renderer.render(scene, cam);
    renderer.setRenderTarget(prev);
  };
  draw();
  return {
    rt,
    redraw: draw,
    dispose: () => { geom.dispose(); mat.dispose(); rt.dispose(); }
  };
};

// Builds the full PBR map set + a configured MeshPhysicalMaterial.
// material.userData.tss exposes:
//   .update(time)       pump uTime + re-render the source pattern
//                       (call from your render loop for animated shaders)
//   .setParam(key, val) live-edit a uniform, e.g. setParam('p1', 12)
//   .dispose()          free all GPU resources
export const createMaterial = (renderer, options = {}) => {
  const size = options.size || 1024;
  const sourceUniforms = buildSourceUniforms(size);

  // 1. base shader pattern (sRGB diffuse) — persistent re-renderable
  const source = createSourceRenderer(renderer, size, sourceUniforms);
  const texel = new THREE.Vector2(1 / size, 1 / size);

  // 2. height (linear grayscale)
  const heightRT = renderToRT(renderer, HEIGHT_FRAG, size, {
    uSource: { value: source.rt.texture },
    uLevels: { value: GEN.heightLevels },
    uInvert: { value: GEN.heightInvert }
  });

  // 3. normal (Sobel on height)
  const normalRT = renderToRT(renderer, NORMAL_FRAG, size, {
    uHeight: { value: heightRT.texture },
    uTexel: { value: texel },
    uStrength: { value: GEN.normalStrength * 0.05 },
    uInvertY: { value: GEN.normalInvertY }
  });

  // 4. roughness (luminance-based)
  const roughRT = renderToRT(renderer, ROUGH_FRAG, size, {
    uSource: { value: source.rt.texture },
    uBase: { value: GEN.roughnessBase },
    uVariation: { value: GEN.roughnessVariation },
    uInvert: { value: GEN.roughnessInvert }
  });

  // 5. AO (blur-difference of height)
  const aoRT = renderToRT(renderer, AO_FRAG, size, {
    uHeight: { value: heightRT.texture },
    uTexel: { value: texel },
    uStrength: { value: GEN.aoStrength },
    uRadius: { value: GEN.aoRadius }
  });

  const setRepeat = (t, r) => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(r, r); t.needsUpdate = true; };
  [source.rt.texture, heightRT.texture, normalRT.texture, roughRT.texture, aoRT.texture]
    .forEach(t => setRepeat(t, MAT.repeat));

  const mat = new THREE.MeshPhysicalMaterial({
    map: source.rt.texture,
    normalMap: normalRT.texture,
    roughnessMap: roughRT.texture,
    bumpMap: heightRT.texture,
    aoMap: aoRT.texture,
    displacementMap: MAT.displacementScale > 0 ? heightRT.texture : null,
    displacementScale: MAT.displacementScale,
    displacementBias: -MAT.displacementScale * 0.5,
    normalScale: new THREE.Vector2(MAT.normalScale, MAT.normalScale),
    roughness: MAT.roughness,
    metalness: MAT.metalness,
    bumpScale: MAT.bumpScale,
    envMapIntensity: MAT.envMapIntensity,
    transmission: MAT.transmission,
    thickness: MAT.thickness,
    ior: MAT.ior,
    clearcoat: MAT.clearcoat,
    clearcoatRoughness: MAT.clearcoatRoughness,
    sheen: MAT.sheen,
    sheenRoughness: MAT.sheenRoughness,
    sheenColor: new THREE.Color(MAT.sheenColor),
    iridescence: MAT.iridescence,
    iridescenceIOR: MAT.iridescenceIOR,
    iridescenceThicknessRange: [MAT.iridescenceThicknessMin, MAT.iridescenceThicknessMax],
    attenuationDistance: MAT.attenuationDistance > 0 ? MAT.attenuationDistance : Infinity,
    attenuationColor: new THREE.Color(MAT.attenuationColor),
    specularIntensity: MAT.specularIntensity,
    specularColor: new THREE.Color(MAT.specularColor),
    emissive: new THREE.Color(MAT.emissiveColor),
    emissiveIntensity: MAT.emissiveIntensity
  });

  if ('anisotropy' in mat) {
    mat.anisotropy = MAT.anisotropy;
    mat.anisotropyRotation = MAT.anisotropyRotation;
  }

  // Live helpers + cleanup
  mat.userData.tss = {
    source, heightRT, normalRT, roughRT, aoRT, uniforms: sourceUniforms,
    update(time) {
      sourceUniforms.uTime.value = time;
      source.redraw();
    },
    setParam(key, value) {
      const k = 'u' + String(key).toUpperCase();
      if (sourceUniforms[k]) {
        sourceUniforms[k].value = value;
        source.redraw();
      }
    },
    setColor(slot, hex) {
      const k = 'uColor' + String(slot).toUpperCase();
      if (sourceUniforms[k]) {
        sourceUniforms[k].value.copy(hexToVec3(hex));
        source.redraw();
      }
    },
    dispose() {
      source.dispose();
      heightRT.dispose();
      normalRT.dispose();
      roughRT.dispose();
      aoRT.dispose();
      mat.dispose();
    }
  };

  return mat;
};

// ---------- usage ----------
//
//   import { createMaterial } from './${prefix}.js';
//
//   const material = createMaterial(renderer, { size: 1024 });
//   const mesh = new THREE.Mesh(geometry, material);
//
//   // Animate the shader (uTime drives any preset that uses it):
//   const tss = material.userData.tss;
//   const clock = new THREE.Clock();
//   renderer.setAnimationLoop(() => {
//     tss.update(clock.getElapsedTime());
//     renderer.render(scene, camera);
//   });
//
//   // Live-edit a param or color:
//   tss.setParam('p1', 12);
//   tss.setColor('A', '#ff8a3a');
//
//   // Cleanup when the mesh is removed:
//   tss.dispose();
//
// Renderer must be configured for proper PBR:
//   renderer.outputColorSpace = THREE.SRGBColorSpace;
//   renderer.toneMapping = THREE.ACESFilmicToneMapping;
//
// Don't forget an environment map for transmission/clearcoat to look right.
`;
};
