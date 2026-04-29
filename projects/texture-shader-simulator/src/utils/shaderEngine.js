// Offscreen GLSL renderer with a rich tileable prelude.
// Uses ONE persistent canvas + GL context, reused across calls, so the
// browser's context-limit isn't exhausted when rendering preset thumbnails.

const VERTEX_SHADER = `
attribute vec2 aPosition;
varying vec2 vUv;
void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

const FRAG_PRELUDE = `
precision highp float;
varying vec2 vUv;

uniform float uTime;
uniform float uSeed;
uniform vec2  uSize;
uniform float uP1;
uniform float uP2;
uniform float uP3;
uniform float uP4;
uniform float uP5;
uniform float uP6;
uniform float uP7;
uniform float uP8;
uniform float uP9;
uniform float uP10;
uniform float uP11;
uniform float uP12;
uniform vec3  uColorA;
uniform vec3  uColorB;
uniform vec3  uColorC;
uniform vec3  uColorD;

#define PI  3.141592653589793
#define TAU 6.283185307179586

// ------ period-wrapped hash (seamless foundation) ------
float hashP(vec2 p, float period, float seed) {
  vec2 q = mod(p, period);
  return fract(sin(dot(q, vec2(127.1, 311.7)) + seed * 19.19) * 43758.5453);
}

float vnoiseP(vec2 p, float period, float seed) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hashP(i,                   period, seed);
  float b = hashP(i + vec2(1.0, 0.0),  period, seed);
  float c = hashP(i + vec2(0.0, 1.0),  period, seed);
  float d = hashP(i + vec2(1.0, 1.0),  period, seed);
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
    norm += amp;
    amp *= 0.5;
    freq *= 2.0;
  }
  return sum / norm;
}

float tridge(vec2 uv, float period, int octaves) {
  float sum = 0.0, amp = 1.0, norm = 0.0, freq = 1.0;
  for (int i = 0; i < 10; i++) {
    if (i >= octaves) break;
    float P = max(1.0, floor(period * freq));
    float n = 1.0 - abs(vnoiseP(uv * P, P, uSeed + float(i) * 7.0) * 2.0 - 1.0);
    sum += n * n * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2.0;
  }
  return sum / norm;
}

float tturbulence(vec2 uv, float period, int octaves) {
  float sum = 0.0, amp = 1.0, norm = 0.0, freq = 1.0;
  for (int i = 0; i < 10; i++) {
    if (i >= octaves) break;
    float P = max(1.0, floor(period * freq));
    sum += abs(vnoiseP(uv * P, P, uSeed + float(i) * 7.0) * 2.0 - 1.0) * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2.0;
  }
  return sum / norm;
}

float dwarp(vec2 uv, float period, int octaves) {
  vec2 q = vec2(tfbm(uv, period, octaves),
                tfbm(uv + vec2(5.2, 1.3), period, octaves));
  vec2 r = vec2(tfbm(uv + 4.0 * q + vec2(1.7, 9.2), period, octaves),
                tfbm(uv + 4.0 * q + vec2(8.3, 2.8), period, octaves));
  return tfbm(uv + 4.0 * r, period, octaves);
}

vec3 worley(vec2 uv, float cells) {
  float C = max(2.0, floor(cells));
  vec2 p = uv * C;
  vec2 ip = floor(p);
  vec2 fp = fract(p);
  float d1 = 10.0;
  float d2 = 10.0;
  float id = 0.0;
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
}

// small helper: animated scroll offset (tiles because it's just uv + offset mod 1)
vec2 uvScroll(vec2 uv, vec2 velocity) {
  return fract(uv + velocity * uTime);
}
`;

// --- Shader library (50+ presets) ----------------------------------------

export const SHADER_PRESETS = [
  // --- Geometric ---------------------------------------------------------
  {
    id: 'checker',
    label: 'Checker',
    defaults: { p1: 8, p2: 0, p3: 0, p4: 0, colorA: '#e0e0e0', colorB: '#1a1a1a' },
    code: `float cells = max(1.0, floor(uP1));
vec2 g = floor(vUv * cells);
float c = mod(g.x + g.y, 2.0);
gl_FragColor = vec4(mix(uColorA, uColorB, c), 1.0);
`
  },
  {
    id: 'stripes',
    label: 'Stripes',
    defaults: { p1: 12, p2: 0.5, p3: 0, p4: 0, colorA: '#fafafa', colorB: '#0a0a0a' },
    code: `float count = max(1.0, floor(uP1));
float w = clamp(uP2, 0.02, 0.98);
float s = fract(vUv.x * count);
gl_FragColor = vec4(mix(uColorA, uColorB, step(w, s)), 1.0);
`
  },
  {
    id: 'rings',
    label: 'Rings',
    defaults: { p1: 14, p2: 0.15, p3: 0, p4: 0, colorA: '#efe3c6', colorB: '#452b14' },
    code: `float rings = max(1.0, floor(uP1));
float warp = tfbm(vUv, 3.0, 4) * uP2;
float r = sin((vUv.x + warp) * rings * TAU) * 0.5 + 0.5;
gl_FragColor = vec4(mix(uColorA, uColorB, r), 1.0);
`
  },
  {
    id: 'hex',
    label: 'Hex grid',
    defaults: { p1: 10, p2: 0.04, p3: 0, p4: 0, colorA: '#151518', colorB: '#9dc6ff' },
    code: `float cells = max(2.0, floor(uP1));
float thick = clamp(uP2, 0.0, 0.2);
vec2 p = vUv * cells;
p.x *= 1.1547;
vec2 a = vec2(mod(p.x, 1.0), mod(p.y + mod(floor(p.x), 2.0) * 0.5, 1.0)) - 0.5;
float d = max(abs(a.x) * 0.866 + a.y * 0.5, abs(a.y));
float line = smoothstep(0.5 - thick, 0.5, d);
gl_FragColor = vec4(mix(uColorA, uColorB, line), 1.0);
`
  },
  {
    id: 'hex-fill',
    label: 'Hex cells',
    defaults: { p1: 8, p2: 0.45, p3: 0, p4: 0, colorA: '#1b1b22', colorB: '#f0b04f' },
    code: `// filled hex cells with per-cell hue shift
float cells = max(2.0, floor(uP1));
vec2 p = vUv * cells;
p.x *= 1.1547;
vec2 ip = vec2(floor(p.x), floor(p.y + mod(floor(p.x), 2.0) * 0.5));
float h = hashP(ip, cells, uSeed);
vec3 c = mix(uColorA, uColorB, smoothstep(uP2, 1.0, h));
gl_FragColor = vec4(c, 1.0);
`
  },
  {
    id: 'scales',
    label: 'Fish scales',
    defaults: { p1: 12, p2: 0.7, p3: 0, p4: 0, colorA: '#15202e', colorB: '#7db0d6' },
    code: `float cells = max(2.0, floor(uP1));
float rad = clamp(uP2, 0.2, 1.0);
vec2 p = vUv * cells;
p.y += 0.5 * mod(floor(p.x), 2.0);
vec2 f = fract(p) - 0.5;
float m = smoothstep(rad, rad - 0.05, length(f));
gl_FragColor = vec4(mix(uColorA, uColorB, m), 1.0);
`
  },
  {
    id: 'truchet',
    label: 'Truchet tiles',
    defaults: { p1: 8, p2: 0.08, p3: 0, p4: 0, colorA: '#11141b', colorB: '#ffc269' },
    code: `float N = max(2.0, floor(uP1));
float w = clamp(uP2, 0.02, 0.4);
vec2 p = vUv * N;
vec2 ip = floor(p);
vec2 fp = fract(p);
float h = hashP(ip, N, uSeed);
if (h > 0.5) fp.x = 1.0 - fp.x;
float d1 = abs(length(fp) - 0.5);
float d2 = abs(length(fp - vec2(1.0, 1.0)) - 0.5);
float d = min(d1, d2);
float line = smoothstep(w, w * 0.5, d);
gl_FragColor = vec4(mix(uColorA, uColorB, line), 1.0);
`
  },
  {
    id: 'truchet-squares',
    label: 'Square maze',
    defaults: { p1: 10, p2: 0.05, p3: 0, p4: 0, colorA: '#0c0c11', colorB: '#63d2c5' },
    code: `// randomly-oriented line tiles (maze look)
float N = max(3.0, floor(uP1));
float w = clamp(uP2, 0.02, 0.2);
vec2 p = vUv * N;
vec2 ip = floor(p);
vec2 fp = fract(p) - 0.5;
float h = hashP(ip, N, uSeed);
// 2 orientations: diagonal or anti-diagonal line
float d = h > 0.5 ? abs(fp.x + fp.y) : abs(fp.x - fp.y);
float line = smoothstep(w, w * 0.5, d);
gl_FragColor = vec4(mix(uColorA, uColorB, line), 1.0);
`
  },
  {
    id: 'triangles',
    label: 'Triangles',
    defaults: { p1: 10, p2: 0.04, p3: 0, p4: 0, colorA: '#14100f', colorB: '#ff5544' },
    code: `float N = max(2.0, floor(uP1));
float thick = clamp(uP2, 0.005, 0.2);
vec2 p = vUv * N;
p.x += 0.5 * mod(floor(p.y), 2.0);
vec2 f = fract(p);
float up = step(f.x, f.y);
vec2 ft = up > 0.5 ? f : vec2(1.0 - f.x, 1.0 - f.y);
float d = min(ft.x, min(ft.y, 1.0 - ft.x - ft.y));
float line = smoothstep(thick, thick * 0.5, d);
gl_FragColor = vec4(mix(uColorA, uColorB, line), 1.0);
`
  },
  {
    id: 'diamonds',
    label: 'Diamonds',
    defaults: { p1: 10, p2: 0.3, p3: 0, p4: 0, colorA: '#241c31', colorB: '#e8d37a' },
    code: `float N = max(2.0, floor(uP1));
vec2 p = vUv * N;
p.y += 0.5 * mod(floor(p.x), 2.0);
vec2 f = fract(p) - 0.5;
float d = abs(f.x) + abs(f.y);
float m = smoothstep(uP2, uP2 - 0.05, d);
gl_FragColor = vec4(mix(uColorA, uColorB, m), 1.0);
`
  },
  {
    id: 'quilted',
    label: 'Quilted',
    defaults: { p1: 6, p2: 0.08, p3: 0, p4: 0, colorA: '#a52a2a', colorB: '#ffd1c9' },
    code: `// puffy quilted diamonds
float N = max(2.0, floor(uP1));
float thick = clamp(uP2, 0.02, 0.25);
vec2 p = vUv * N;
p.y += 0.5 * mod(floor(p.x), 2.0);
vec2 f = fract(p) - 0.5;
float d = abs(f.x) + abs(f.y);
float stitch = smoothstep(0.5, 0.5 - thick, d);
float puff = 1.0 - d * 2.0;
puff = clamp(puff, 0.0, 1.0);
vec3 c = mix(uColorA, uColorB, stitch + puff * 0.35);
gl_FragColor = vec4(c, 1.0);
`
  },
  {
    id: 'weave',
    label: 'Basket weave',
    defaults: { p1: 8, p2: 0.35, p3: 0, p4: 0, colorA: '#3a1f11', colorB: '#dea071' },
    code: `float N = max(2.0, floor(uP1));
float w = clamp(uP2, 0.1, 0.5);
vec2 p = vUv * N;
vec2 ip = floor(p);
vec2 fp = fract(p);
bool horizontal = mod(ip.x + ip.y, 2.0) < 1.0;
vec2 local = horizontal ? vec2(fp.y, fp.x) : fp;
float strand = smoothstep(0.5 - w, 0.5, local.x) * (1.0 - smoothstep(0.5 + w, 0.5 + w + 0.02, local.x));
float shade = 0.5 + 0.5 * sin((local.y) * TAU * 2.0);
gl_FragColor = vec4(mix(uColorA, uColorB, strand * shade), 1.0);
`
  },
  {
    id: 'damask',
    label: 'Damask',
    defaults: { p1: 4, p2: 0.6, p3: 0, p4: 0, colorA: '#1a0e23', colorB: '#c8a85a' },
    code: `// classic damask-style sum-of-sines periodic ornament
float N = max(1.0, floor(uP1));
vec2 p = vUv * N * TAU;
float a = sin(p.x) * sin(p.y);
float b = cos(p.x * 2.0) + cos(p.y * 2.0);
float v = 0.5 + 0.5 * sin(a * 3.0 + b);
v = smoothstep(0.5 - uP2 * 0.3, 0.5 + uP2 * 0.3, v);
gl_FragColor = vec4(mix(uColorA, uColorB, v), 1.0);
`
  },
  {
    id: 'snake',
    label: 'Snake skin',
    defaults: { p1: 14, p2: 0.35, p3: 0, p4: 0, colorA: '#2c3419', colorB: '#c9d17a' },
    code: `// overlapping teardrops with per-cell hue
float N = max(3.0, floor(uP1));
vec2 p = vUv * N;
p.y += 0.5 * mod(floor(p.x), 2.0);
vec2 ip = floor(p);
vec2 fp = fract(p) - vec2(0.5, 0.3);
float d = length(fp * vec2(1.0, 1.5));
float m = smoothstep(uP2, uP2 - 0.08, d);
float h = hashP(ip, N, uSeed);
vec3 c = mix(uColorA, uColorB, m * (0.4 + 0.6 * h));
gl_FragColor = vec4(c, 1.0);
`
  },

  // --- Noise based -------------------------------------------------------
  {
    id: 'fbm',
    label: 'FBM noise',
    defaults: { p1: 4, p2: 5, p3: 0, p4: 0, colorA: '#3a2a1a', colorB: '#e6c89a' },
    code: `float n = tfbm(vUv, max(1.0, floor(uP1)), int(clamp(uP2, 1.0, 8.0)));
gl_FragColor = vec4(mix(uColorA, uColorB, n), 1.0);
`
  },
  {
    id: 'ridged',
    label: 'Ridged noise',
    defaults: { p1: 5, p2: 5, p3: 0, p4: 0, colorA: '#1a1c24', colorB: '#e8dfd0' },
    code: `float n = tridge(vUv, max(1.0, floor(uP1)), int(clamp(uP2, 1.0, 8.0)));
gl_FragColor = vec4(mix(uColorA, uColorB, n), 1.0);
`
  },
  {
    id: 'turbulence',
    label: 'Turbulence',
    defaults: { p1: 5, p2: 5, p3: 0, p4: 0, colorA: '#0a0a0f', colorB: '#ffab5e' },
    code: `float n = tturbulence(vUv, max(1.0, floor(uP1)), int(clamp(uP2, 1.0, 8.0)));
gl_FragColor = vec4(mix(uColorA, uColorB, n), 1.0);
`
  },
  {
    id: 'warp',
    label: 'Domain warp',
    defaults: { p1: 4, p2: 4, p3: 0, p4: 0, colorA: '#101820', colorB: '#f9c976' },
    code: `float n = dwarp(vUv, max(1.0, floor(uP1)), int(clamp(uP2, 1.0, 5.0)));
gl_FragColor = vec4(mix(uColorA, uColorB, n), 1.0);
`
  },
  {
    id: 'perlin-warp',
    label: 'Warped rings',
    defaults: { p1: 10, p2: 0.5, p3: 4, p4: 0, colorA: '#e8e2d4', colorB: '#4a2318' },
    code: `float rings = max(1.0, floor(uP1));
float warp = tfbm(vUv, max(2.0, floor(uP3)), 5) * uP2;
float v = sin((vUv.x + vUv.y * 0.3 + warp) * rings * TAU) * 0.5 + 0.5;
float mask = pow(v, 8.0);
gl_FragColor = vec4(mix(uColorA, uColorB, mask), 1.0);
`
  },
  {
    id: 'lava',
    label: 'Lava',
    defaults: { p1: 5, p2: 0.6, p3: 4, p4: 0, colorA: '#150302', colorB: '#ffba3a' },
    code: `float scale = max(1.0, floor(uP1));
float n = tturbulence(vUv, scale, int(clamp(uP3, 1.0, 6.0)));
float warp = tfbm(vUv + n * uP2, scale, 4);
float glow = smoothstep(0.3, 0.9, warp);
gl_FragColor = vec4(mix(uColorA, uColorB, glow), 1.0);
`
  },
  {
    id: 'sandstone',
    label: 'Sandstone',
    defaults: { p1: 6, p2: 5, p3: 0.35, p4: 0, colorA: '#b4895a', colorB: '#e8c694' },
    code: `float s = tfbm(vec2(vUv.x * uP3, vUv.y), max(1.0, floor(uP1)), int(clamp(uP2, 1.0, 8.0)));
float bands = sin(vUv.y * 20.0 * TAU + s * 6.0) * 0.5 + 0.5;
float v = mix(s, bands, 0.5);
gl_FragColor = vec4(mix(uColorA, uColorB, v), 1.0);
`
  },
  {
    id: 'clay',
    label: 'Clay',
    defaults: { p1: 3, p2: 6, p3: 0.3, p4: 0, colorA: '#7d463a', colorB: '#d69a80' },
    code: `// smooth fbm + subtle dimples
float base = tfbm(vUv, max(2.0, floor(uP1)), int(clamp(uP2, 3.0, 8.0)));
vec3 w = worley(vUv, 10.0);
float dimples = smoothstep(0.1, 0.0, w.x) * uP3;
float v = clamp(base - dimples, 0.0, 1.0);
gl_FragColor = vec4(mix(uColorA, uColorB, v), 1.0);
`
  },
  {
    id: 'stucco',
    label: 'Stucco',
    defaults: { p1: 6, p2: 0.55, p3: 0.1, p4: 0, colorA: '#b4b0a4', colorB: '#605a4e' },
    code: `// rough fbm with hard threshold
float n = tfbm(vUv, max(2.0, floor(uP1)), 6);
float m = smoothstep(uP2 - uP3, uP2 + uP3, n);
gl_FragColor = vec4(mix(uColorA, uColorB, m), 1.0);
`
  },
  {
    id: 'cork',
    label: 'Cork board',
    defaults: { p1: 30, p2: 6, p3: 0, p4: 0, colorA: '#a67141', colorB: '#3f2612' },
    code: `// small bubbles + coarse fbm
vec3 w = worley(vUv, uP1);
float bubbles = smoothstep(0.15, 0.0, w.x);
float grain = tfbm(vUv, max(2.0, floor(uP2)), 5);
float v = clamp(grain * 0.6 + bubbles * 0.6, 0.0, 1.0);
gl_FragColor = vec4(mix(uColorA, uColorB, v), 1.0);
`
  },
  {
    id: 'mountain',
    label: 'Topographic',
    defaults: { p1: 4, p2: 12, p3: 0.04, p4: 0, colorA: '#0e2b1e', colorB: '#d8e4c6' },
    code: `// layered contour lines from fbm — topo-map look
float n = tfbm(vUv, max(2.0, floor(uP1)), 6);
float contours = max(0.0, 1.0 - mod(n * uP2, 1.0) / uP3);
float v = mix(n, contours, 0.5);
gl_FragColor = vec4(mix(uColorA, uColorB, v), 1.0);
`
  },
  {
    id: 'dune',
    label: 'Dune',
    defaults: { p1: 3, p2: 18, p3: 0.6, p4: 0, colorA: '#a07438', colorB: '#efd6a4' },
    code: `// wind-swept stripes warped by fbm
float warp = tfbm(vUv, max(1.0, floor(uP1)), 4);
float lines = sin((vUv.y + warp * uP3) * floor(max(4.0, uP2)) * TAU) * 0.5 + 0.5;
gl_FragColor = vec4(mix(uColorA, uColorB, lines), 1.0);
`
  },
  {
    id: 'wrinkled',
    label: 'Wrinkled',
    defaults: { p1: 3, p2: 8, p3: 0, p4: 0, colorA: '#1a1a22', colorB: '#c6c6cf' },
    code: `// iterated turbulence produces fine creases
float v = 0.0;
vec2 p = vUv;
for (int i = 0; i < 5; i++) {
  v += tturbulence(p, max(2.0, floor(uP1)) * pow(2.0, float(i)), 2);
  p = fract(p + v * 0.05);
}
v /= 5.0;
gl_FragColor = vec4(mix(uColorA, uColorB, v), 1.0);
`
  },

  // --- Cellular / worley derivatives -------------------------------------
  {
    id: 'voronoi',
    label: 'Voronoi',
    defaults: { p1: 6, p2: 0.6, p3: 0, p4: 0, colorA: '#1c1c20', colorB: '#e4e4e8' },
    code: `vec3 w = worley(vUv, uP1);
float edge = smoothstep(0.0, 0.05 + (1.0 - uP2) * 0.2, w.y - w.x);
vec3 c = mix(uColorA, uColorB, edge);
gl_FragColor = vec4(c * (0.55 + 0.45 * w.z), 1.0);
`
  },
  {
    id: 'terrazzo',
    label: 'Terrazzo',
    defaults: { p1: 10, p2: 0.04, p3: 0, p4: 0, colorA: '#f1ece3', colorB: '#23211c' },
    code: `vec3 w = worley(vUv, uP1);
float edge = smoothstep(uP2, uP2 + 0.005, w.y - w.x);
vec3 col = mix(uColorA, uColorB, fract(w.z * 13.37));
col = mix(uColorB, col, edge);
gl_FragColor = vec4(col, 1.0);
`
  },
  {
    id: 'cracked',
    label: 'Cracked earth',
    defaults: { p1: 7, p2: 0.015, p3: 0, p4: 0, colorA: '#8a6b48', colorB: '#1a1109' },
    code: `vec3 w = worley(vUv, uP1);
float edge = smoothstep(uP2, 0.0, w.y - w.x);
float dirt = tfbm(vUv, 5.0, 5);
vec3 col = mix(uColorA, uColorB, edge);
col *= 0.7 + 0.3 * dirt;
gl_FragColor = vec4(col, 1.0);
`
  },
  {
    id: 'metaballs',
    label: 'Metaballs',
    defaults: { p1: 5, p2: 0.5, p3: 0, p4: 0, colorA: '#0b0d13', colorB: '#5ee5c6' },
    code: `vec3 w = worley(vUv, uP1);
float blob = smoothstep(uP2, uP2 - 0.15, w.x);
gl_FragColor = vec4(mix(uColorA, uColorB, blob), 1.0);
`
  },
  {
    id: 'rock-wall',
    label: 'Rock wall',
    defaults: { p1: 6, p2: 0.06, p3: 5, p4: 0, colorA: '#2d2824', colorB: '#9c8f7e' },
    code: `// worley cells broken up by fbm, inner stones shaded
vec3 w = worley(vUv, uP1);
float edge = smoothstep(uP2, 0.0, w.y - w.x);
float inner = pow(1.0 - w.x * 1.2, 2.0);
float grain = tfbm(vUv, max(3.0, floor(uP3)), 5);
vec3 col = mix(uColorB, uColorA, edge);
col *= 0.6 + 0.4 * (inner * grain);
gl_FragColor = vec4(col, 1.0);
`
  },
  {
    id: 'mesh-gradient',
    label: 'Mesh gradient',
    defaults: { p1: 3, p2: 0, p3: 0, p4: 0, colorA: '#ff6e9c', colorB: '#6e7aff' },
    code: `// smooth blend between nearest cell colors
float C = max(2.0, floor(uP1));
vec2 p = vUv * C;
vec2 ip = floor(p);
vec2 fp = fract(p);
vec3 col = vec3(0.0);
float wSum = 0.0;
for (int y = -1; y <= 1; y++) {
  for (int x = -1; x <= 1; x++) {
    vec2 off = vec2(float(x), float(y));
    vec2 cell = ip + off;
    vec2 cellOff = vec2(hashP(cell, C, uSeed),
                        hashP(cell + 17.0, C, uSeed + 11.0));
    vec2 r = off + cellOff - fp;
    float d = exp(-dot(r, r) * 3.0);
    float t = hashP(cell, C, uSeed + 5.0);
    col += mix(uColorA, uColorB, t) * d;
    wSum += d;
  }
}
gl_FragColor = vec4(col / wSum, 1.0);
`
  },
  {
    id: 'crystal',
    label: 'Crystal facets',
    defaults: { p1: 8, p2: 0.6, p3: 0, p4: 0, colorA: '#0a0d1a', colorB: '#9ec4ff' },
    code: `// voronoi cells stepped for sharp faceted look
vec3 w = worley(vUv, uP1);
float facet = floor(w.z * 6.0) / 6.0;
float edge = smoothstep(0.03, 0.0, w.y - w.x);
vec3 col = mix(uColorA, uColorB, facet);
col = mix(col, uColorA, edge);
gl_FragColor = vec4(col, 1.0);
`
  },

  // --- Wave based --------------------------------------------------------
  {
    id: 'waves',
    label: 'Interference',
    defaults: { p1: 20, p2: 20, p3: 0.5, p4: 0, colorA: '#0a0a1e', colorB: '#8ad6ff' },
    code: `float fx = floor(max(1.0, uP1));
float fy = floor(max(1.0, uP2));
float a = sin(vUv.x * fx * TAU);
float b = sin(vUv.y * fy * TAU);
float v = mix(a, a * b, clamp(uP3, 0.0, 1.0)) * 0.5 + 0.5;
gl_FragColor = vec4(mix(uColorA, uColorB, v), 1.0);
`
  },
  {
    id: 'caustics',
    label: 'Caustics',
    defaults: { p1: 4, p2: 6, p3: 0, p4: 0, colorA: '#051422', colorB: '#8fe5ff' },
    code: `float c = tcaustics(vUv, max(1.0, floor(uP1)), max(1.0, floor(uP2)));
vec3 col = mix(uColorA, uColorB, pow(c, 1.5));
gl_FragColor = vec4(col, 1.0);
`
  },
  {
    id: 'plasma',
    label: 'Plasma',
    defaults: { p1: 6, p2: 4, p3: 0, p4: 0, colorA: '#2b0845', colorB: '#ffb37a' },
    code: `float a = sin(vUv.x * floor(max(1.0, uP1)) * TAU);
float b = sin(vUv.y * floor(max(1.0, uP2)) * TAU);
float c = sin((vUv.x + vUv.y) * floor(max(1.0, uP1 + uP2)) * TAU * 0.5);
float v = (a + b + c) / 3.0 * 0.5 + 0.5;
gl_FragColor = vec4(mix(uColorA, uColorB, v), 1.0);
`
  },
  {
    id: 'water',
    label: 'Water surface',
    defaults: { p1: 6, p2: 0.6, p3: 0, p4: 0, colorA: '#04283d', colorB: '#aee4ff' },
    code: `float scale = max(2.0, floor(uP1));
float n = tfbm(vUv, scale, 5);
float crest = sin((vUv.y + n * uP2) * 8.0 * TAU) * 0.5 + 0.5;
float v = mix(n, crest, 0.4);
gl_FragColor = vec4(mix(uColorA, uColorB, v), 1.0);
`
  },
  {
    id: 'flow',
    label: 'Flow field',
    defaults: { p1: 5, p2: 20, p3: 0, p4: 0, colorA: '#1a1c2a', colorB: '#fcd581' },
    code: `float scale = max(2.0, floor(uP1));
float freq = max(4.0, floor(uP2));
float angle = tfbm(vUv, scale, 4) * TAU;
vec2 dir = vec2(cos(angle), sin(angle));
float lines = sin(dot(vUv, dir) * freq * TAU) * 0.5 + 0.5;
gl_FragColor = vec4(mix(uColorA, uColorB, lines), 1.0);
`
  },
  {
    id: 'ripple',
    label: 'Standing wave',
    defaults: { p1: 10, p2: 10, p3: 0, p4: 0, colorA: '#0a1522', colorB: '#ffd27a' },
    code: `// 2D standing wave, all integer frequencies so it tiles
float fx = max(1.0, floor(uP1));
float fy = max(1.0, floor(uP2));
float v = cos(vUv.x * fx * TAU) * cos(vUv.y * fy * TAU);
v = 0.5 + 0.5 * v;
gl_FragColor = vec4(mix(uColorA, uColorB, v), 1.0);
`
  },

  // --- Materials ---------------------------------------------------------
  {
    id: 'circuit',
    label: 'Circuit board',
    defaults: { p1: 12, p2: 0.08, p3: 0, p4: 0, colorA: '#061b10', colorB: '#54ff8c' },
    code: `float N = max(4.0, floor(uP1));
float t = clamp(uP2, 0.02, 0.2);
vec2 p = vUv * N;
vec2 ip = floor(p);
vec2 fp = fract(p) - 0.5;
float h = hashP(ip, N, uSeed);
float hx = hashP(ip + vec2(1.0, 0.0), N, uSeed);
float hy = hashP(ip + vec2(0.0, 1.0), N, uSeed);
float traceH = step(abs(fp.y), t) * step(h, 0.6);
float traceV = step(abs(fp.x), t) * step(hx, 0.6);
float pad = step(length(fp), t * 2.0) * step(hy, 0.4);
float v = max(max(traceH, traceV), pad);
gl_FragColor = vec4(mix(uColorA, uColorB, v), 1.0);
`
  },
  {
    id: 'brick',
    label: 'Brick wall',
    defaults: { p1: 6, p2: 10, p3: 0.04, p4: 0, colorA: '#5a2a1c', colorB: '#1a0f09' },
    code: `float cols = max(1.0, floor(uP1));
float rows = max(1.0, floor(uP2));
float mortar = clamp(uP3, 0.01, 0.2);
float row = floor(vUv.y * rows);
float offset = mod(row, 2.0) * 0.5;
float bx = fract((vUv.x + offset / cols) * cols);
float by = fract(vUv.y * rows);
bool inBrick = bx > mortar && bx < 1.0 - mortar && by > mortar && by < 1.0 - mortar;
float n = tfbm(vUv, 40.0, 4);
vec3 col = inBrick ? mix(uColorA, uColorA * 1.4, n) : uColorB;
gl_FragColor = vec4(col, 1.0);
`
  },
  {
    id: 'tiles',
    label: 'Ceramic tiles',
    defaults: { p1: 6, p2: 0.04, p3: 0, p4: 0, colorA: '#f5efe4', colorB: '#777777' },
    code: `float N = max(2.0, floor(uP1));
vec2 p = vUv * N;
vec2 ip = floor(p);
vec2 fp = fract(p);
float edge = min(min(fp.x, fp.y), min(1.0 - fp.x, 1.0 - fp.y));
float line = smoothstep(uP2, uP2 * 0.3, edge);
float h = hashP(ip, N, uSeed);
vec3 tile = mix(uColorA, uColorA * (0.8 + 0.4 * h), 1.0);
vec3 col = mix(uColorB, tile, line);
gl_FragColor = vec4(col, 1.0);
`
  },
  {
    id: 'dots',
    label: 'Halftone dots',
    defaults: { p1: 24, p2: 0.35, p3: 0, p4: 0, colorA: '#ffffff', colorB: '#000000' },
    code: `float N = max(2.0, floor(uP1));
vec2 p = vUv * N;
vec2 f = fract(p) - 0.5;
float r = clamp(uP2, 0.05, 0.5);
float m = smoothstep(r, r - 0.02, length(f));
gl_FragColor = vec4(mix(uColorA, uColorB, m), 1.0);
`
  },
  {
    id: 'stars',
    label: 'Star field',
    defaults: { p1: 30, p2: 0.92, p3: 0, p4: 0, colorA: '#020417', colorB: '#ffffff' },
    code: `float N = max(6.0, floor(uP1));
float threshold = clamp(uP2, 0.7, 0.99);
vec2 p = vUv * N;
vec2 ip = floor(p);
vec2 fp = fract(p);
float h = hashP(ip, N, uSeed);
vec2 off = vec2(hashP(ip + 1.0, N, uSeed + 3.0), hashP(ip + 2.0, N, uSeed + 7.0));
float d = length(fp - off);
float star = step(threshold, h) * smoothstep(0.03, 0.0, d);
gl_FragColor = vec4(mix(uColorA, uColorB, star), 1.0);
`
  },
  {
    id: 'leather',
    label: 'Leather',
    defaults: { p1: 30, p2: 0.6, p3: 0, p4: 0, colorA: '#2a1309', colorB: '#a96a42' },
    code: `vec3 w = worley(vUv, uP1);
float grain = tfbm(vUv, 8.0, 4);
float v = mix(pow(1.0 - w.x, 2.0), grain, 0.45) * uP2 + grain * (1.0 - uP2);
gl_FragColor = vec4(mix(uColorA, uColorB, v), 1.0);
`
  },
  {
    id: 'rust-metal',
    label: 'Rust',
    defaults: { p1: 5, p2: 3, p3: 0, p4: 0, colorA: '#2a1006', colorB: '#d36a2a' },
    code: `float patches = tfbm(vUv, max(1.0, floor(uP1)), int(clamp(uP2, 1.0, 6.0)));
float fine = tnoise(vUv, 180.0) * 0.2;
float v = clamp(patches + fine, 0.0, 1.0);
gl_FragColor = vec4(mix(uColorA, uColorB, v), 1.0);
`
  },
  {
    id: 'marble',
    label: 'Marble',
    defaults: { p1: 5, p2: 6, p3: 0, p4: 0, colorA: '#ebebe4', colorB: '#4a4a45' },
    code: `float scale = max(2.0, floor(uP1));
int oct = int(clamp(uP2, 2.0, 8.0));
vec2 q = vec2(tfbm(vUv, scale, oct), tfbm(vUv + 3.0, scale, oct));
float v = abs(sin((vUv.x * 6.0 + q.x * 4.0) * TAU));
float veins = pow(1.0 - v, 5.0);
float base = tfbm(vUv, scale * 0.5, 3);
gl_FragColor = vec4(mix(uColorA, uColorB, clamp(veins + base * 0.3, 0.0, 1.0)), 1.0);
`
  },
  {
    id: 'clouds',
    label: 'Clouds',
    defaults: { p1: 4, p2: 6, p3: 0, p4: 0, colorA: '#1e3250', colorB: '#eef6ff' },
    code: `float n = tfbm(vUv, max(2.0, floor(uP1)), int(clamp(uP2, 2.0, 8.0)));
float v = smoothstep(0.35, 0.85, n);
gl_FragColor = vec4(mix(uColorA, uColorB, v), 1.0);
`
  },
  {
    id: 'tree-bark',
    label: 'Tree bark',
    defaults: { p1: 3, p2: 16, p3: 0.4, p4: 0, colorA: '#3a2515', colorB: '#7a4e2a' },
    code: `float scale = max(1.0, floor(uP1));
float freq = max(4.0, floor(uP2));
float ridges = tridge(vec2(vUv.x * 3.0, vUv.y), scale, 4);
float cracks = sin((vUv.y + tfbm(vUv, scale, 4) * uP3) * freq * TAU) * 0.5 + 0.5;
float v = mix(ridges, cracks * ridges, 0.5);
gl_FragColor = vec4(mix(uColorA, uColorB, v), 1.0);
`
  },
  {
    id: 'wood',
    label: 'Wood grain',
    defaults: { p1: 40, p2: 0.2, p3: 3, p4: 0, colorA: '#3d2211', colorB: '#c89064' },
    code: `float rings = max(1.0, floor(uP1));
float warp = tfbm(vUv, max(1.0, floor(uP3)), 4) * uP2;
float v = sin((vUv.x + warp) * rings * TAU) * 0.5 + 0.5;
float grain = tnoise(vUv, 300.0) * 0.15;
gl_FragColor = vec4(mix(uColorA, uColorB, clamp(v * 0.8 + grain, 0.0, 1.0)), 1.0);
`
  },
  {
    id: 'concrete',
    label: 'Concrete',
    defaults: { p1: 8, p2: 5, p3: 0, p4: 0, colorA: '#6a6a6c', colorB: '#b8b8ba' },
    code: `float base = tfbm(vUv, max(1.0, floor(uP1)), int(clamp(uP2, 2.0, 8.0)));
float pits = step(tnoise(vUv, 120.0), 0.15);
float v = clamp(base * (1.0 - pits * 0.6) + 0.1, 0.0, 1.0);
gl_FragColor = vec4(mix(uColorA, uColorB, v), 1.0);
`
  },
  {
    id: 'carbon-fiber',
    label: 'Carbon fiber',
    defaults: { p1: 40, p2: 0.5, p3: 0, p4: 0, colorA: '#0b0b0f', colorB: '#37373f' },
    code: `// woven diagonal strands
float N = max(4.0, floor(uP1));
vec2 p = vUv * N;
vec2 ip = floor(p);
vec2 fp = fract(p);
bool a = mod(ip.x + ip.y, 2.0) < 1.0;
vec2 local = a ? fp : vec2(fp.y, fp.x);
float strand = smoothstep(0.45, 0.5, local.x) * (1.0 - smoothstep(0.5, 0.55, local.x));
float hl = 0.3 + 0.7 * cos((local.y - 0.5) * PI);
gl_FragColor = vec4(mix(uColorA, uColorB, 0.2 + strand * hl * uP2), 1.0);
`
  },
  {
    id: 'denim',
    label: 'Denim',
    defaults: { p1: 120, p2: 0.5, p3: 0, p4: 0, colorA: '#1a3e6a', colorB: '#78a0c6' },
    code: `// diagonal warp threads with noise
float freq = max(20.0, floor(uP1));
float diag = sin((vUv.x + vUv.y) * freq * TAU) * 0.5 + 0.5;
float thread = tnoise(vUv, 200.0) * uP2;
float v = clamp(diag * 0.6 + thread, 0.0, 1.0);
gl_FragColor = vec4(mix(uColorA, uColorB, v), 1.0);
`
  },
  {
    id: 'linen',
    label: 'Linen',
    defaults: { p1: 80, p2: 80, p3: 0.3, p4: 0, colorA: '#e9e2cc', colorB: '#b8a882' },
    code: `// fine crosshatch
float fx = max(10.0, floor(uP1));
float fy = max(10.0, floor(uP2));
float h = sin(vUv.x * fx * TAU) * 0.5 + 0.5;
float v = sin(vUv.y * fy * TAU) * 0.5 + 0.5;
float grain = tnoise(vUv, 300.0) * uP3;
float mixv = clamp(0.5 * h + 0.5 * v + grain - 0.3, 0.0, 1.0);
gl_FragColor = vec4(mix(uColorA, uColorB, mixv), 1.0);
`
  },
  {
    id: 'glitch',
    label: 'Glitch bars',
    defaults: { p1: 60, p2: 0.5, p3: 0, p4: 0, colorA: '#0a0a14', colorB: '#ff3166' },
    code: `// horizontal bars with random offsets per-row
float rows = max(4.0, floor(uP1));
float r = floor(vUv.y * rows);
float h = hashP(vec2(r, 0.0), rows, uSeed);
float off = (h - 0.5) * uP2;
float stripe = sin((vUv.x + off) * 30.0 * TAU) * 0.5 + 0.5;
float pick = step(0.7, h);
vec3 col = mix(uColorA, uColorB, stripe * pick);
gl_FragColor = vec4(col, 1.0);
`
  },
  {
    id: 'neon-grid',
    label: 'Neon grid',
    defaults: { p1: 10, p2: 0.04, p3: 0, p4: 0, colorA: '#0a0014', colorB: '#ff48ff' },
    code: `// perspective-less neon lines with bloom falloff
float N = max(4.0, floor(uP1));
vec2 p = vUv * N;
vec2 fp = abs(fract(p) - 0.5);
float d = min(fp.x, fp.y);
float line = exp(-d * d / (uP2 * uP2));
gl_FragColor = vec4(mix(uColorA, uColorB, line), 1.0);
`
  },
  {
    id: 'honey',
    label: 'Honey comb',
    defaults: { p1: 10, p2: 0.06, p3: 0.5, p4: 0, colorA: '#f2b142', colorB: '#4a2e0a' },
    code: `// filled hex with inner gradient + edges
float cells = max(2.0, floor(uP1));
float thick = clamp(uP2, 0.01, 0.2);
vec2 p = vUv * cells;
p.x *= 1.1547;
vec2 a = vec2(mod(p.x, 1.0), mod(p.y + mod(floor(p.x), 2.0) * 0.5, 1.0)) - 0.5;
float d = max(abs(a.x) * 0.866 + a.y * 0.5, abs(a.y));
float cell = 1.0 - smoothstep(0.5 - 0.1, 0.5, d);
float edge = smoothstep(0.5 - thick, 0.5, d);
vec3 col = mix(uColorA * (0.7 + 0.3 * cell), uColorB, edge);
gl_FragColor = vec4(col, 1.0);
`
  },
  {
    id: 'mosaic',
    label: 'Pixel mosaic',
    defaults: { p1: 32, p2: 0, p3: 0, p4: 0, colorA: '#1a1a1c', colorB: '#f0f0f0' },
    code: `// fbm snapped to pixel grid — seamless because snapping preserves wrap
float N = max(4.0, floor(uP1));
vec2 p = floor(vUv * N) / N;
float n = tfbm(p, 6.0, 5);
gl_FragColor = vec4(mix(uColorA, uColorB, n), 1.0);
`
  },
  {
    id: 'mushrooms',
    label: 'Mushroom caps',
    defaults: { p1: 8, p2: 0.35, p3: 0, p4: 0, colorA: '#f4e9d2', colorB: '#b9472a' },
    code: `// hex-packed circles with per-cell size variation
float N = max(3.0, floor(uP1));
vec2 p = vUv * N;
p.y += 0.5 * mod(floor(p.x), 2.0);
vec2 ip = floor(p);
vec2 fp = fract(p) - 0.5;
float h = hashP(ip, N, uSeed);
float r = uP2 * (0.7 + 0.5 * h);
float m = smoothstep(r, r - 0.05, length(fp));
gl_FragColor = vec4(mix(uColorA, uColorB, m), 1.0);
`
  },
  {
    id: 'scratches',
    label: 'Scratched metal',
    defaults: { p1: 300, p2: 0.3, p3: 0, p4: 0, colorA: '#5a5d66', colorB: '#e6e8ec' },
    code: `// fine horizontal streaks with noise modulation
float freq = max(50.0, floor(uP1));
float streaks = sin(vUv.y * freq * TAU) * 0.5 + 0.5;
float mask = tnoise(vec2(vUv.y, 0.0), 300.0);
float v = mix(0.5, streaks, mask * uP2);
gl_FragColor = vec4(mix(uColorA, uColorB, v), 1.0);
`
  },
  {
    id: 'galvanized',
    label: 'Galvanized',
    defaults: { p1: 8, p2: 0, p3: 0, p4: 0, colorA: '#5a5d63', colorB: '#c6cbd4' },
    code: `// crystalline metal: large worley facets with inner fbm
vec3 w = worley(vUv, uP1);
float inner = pow(1.0 - w.x * 1.3, 1.5);
float grain = tfbm(vUv, 30.0, 4);
float edge = smoothstep(0.04, 0.0, w.y - w.x);
vec3 col = mix(uColorA, uColorB, inner * grain);
col = mix(col, uColorA * 0.7, edge);
gl_FragColor = vec4(col, 1.0);
`
  },
  {
    id: 'galaxy',
    label: 'Nebula',
    defaults: { p1: 3, p2: 6, p3: 0.6, p4: 0, colorA: '#0a0420', colorB: '#e080ff' },
    code: `// soft domain-warped nebula + sparkle
float scale = max(2.0, floor(uP1));
int oct = int(clamp(uP2, 2.0, 8.0));
float n = dwarp(vUv, scale, oct);
float sparkle = step(0.995, tnoise(vUv, 400.0));
vec3 col = mix(uColorA, uColorB, pow(n, 1.5) * uP3);
col += sparkle * vec3(1.0);
gl_FragColor = vec4(col, 1.0);
`
  },
  {
    id: 'caustic-veil',
    label: 'Caustic veil',
    defaults: { p1: 3, p2: 8, p3: 0, p4: 0, colorA: '#001828', colorB: '#80ffe4' },
    code: `// sum of animated-able caustic layers
float n1 = tcaustics(vUv + uTime * 0.03, max(1.0, floor(uP1)), uP2);
float n2 = tcaustics(vUv * 1.3 + uTime * -0.02, max(1.0, floor(uP1)), uP2 * 0.7);
vec3 col = mix(uColorA, uColorB, pow(max(n1, n2), 2.0));
gl_FragColor = vec4(col, 1.0);
`
  },

  // --- V5 expansion: organic, ornamental, fabrics, surfaces --------------
  {
    id: 'oil-slick',
    label: 'Oil slick',
    defaults: { p1: 3, p2: 6, p3: 0.5, p4: 0, colorA: '#110a24', colorB: '#ffaa40' },
    code: `// iridescent: fbm drives hue rotation
float n = tfbm(vUv, max(2.0, floor(uP1)), int(clamp(uP2, 2.0, 8.0)));
float hue = n * uP3 + uTime * 0.05;
vec3 rainbow = 0.5 + 0.5 * cos(TAU * (vec3(0.0, 0.33, 0.67) + hue));
vec3 col = mix(uColorA, rainbow, smoothstep(0.3, 0.9, n));
col = mix(col, uColorB, n * 0.3);
gl_FragColor = vec4(col, 1.0);
`
  },
  {
    id: 'bamboo',
    label: 'Bamboo',
    defaults: { p1: 6, p2: 12, p3: 0.15, p4: 0, colorA: '#1e2a12', colorB: '#b8c963' },
    code: `// vertical stripes + periodic knots
float cols = max(2.0, floor(uP1));
float knots = max(2.0, floor(uP2));
float stripe = sin(vUv.x * cols * TAU) * 0.5 + 0.5;
float node = sin(vUv.y * knots * TAU);
node = smoothstep(0.8, 1.0, node) * uP3 * 20.0;
float v = clamp(stripe * (1.0 - node * 0.6), 0.0, 1.0);
gl_FragColor = vec4(mix(uColorA, uColorB, v), 1.0);
`
  },
  {
    id: 'moss',
    label: 'Moss',
    defaults: { p1: 5, p2: 60, p3: 0.25, p4: 0, colorA: '#1a2b14', colorB: '#5a8a2c' },
    code: `// fbm + sparse bright specks
float base = tfbm(vUv, max(2.0, floor(uP1)), 5);
float specks = step(1.0 - uP3, tnoise(vUv, max(10.0, floor(uP2))));
vec3 col = mix(uColorA, uColorB, base);
col += specks * vec3(0.8, 1.0, 0.4) * 0.4;
gl_FragColor = vec4(col, 1.0);
`
  },
  {
    id: 'ceramic-crackle',
    label: 'Ceramic crackle',
    defaults: { p1: 40, p2: 0.02, p3: 0, p4: 0, colorA: '#f5f1ea', colorB: '#786f5e' },
    code: `// tight small voronoi cells with thin dark edges
vec3 w = worley(vUv, uP1);
float edge = smoothstep(uP2, 0.0, w.y - w.x);
float grain = tfbm(vUv, 8.0, 4);
vec3 col = mix(uColorA * (0.9 + 0.1 * grain), uColorB, edge);
gl_FragColor = vec4(col, 1.0);
`
  },
  {
    id: 'chainmail',
    label: 'Chainmail',
    defaults: { p1: 10, p2: 0.07, p3: 0, p4: 0, colorA: '#2a2f36', colorB: '#c9d1dc' },
    code: `// interlocking circle outlines on staggered grid
float N = max(3.0, floor(uP1));
float w = clamp(uP2, 0.02, 0.2);
vec2 p = vUv * N;
p.y += 0.5 * mod(floor(p.x), 2.0);
vec2 fp = fract(p) - 0.5;
float ring = abs(length(fp) - 0.45);
float line = smoothstep(w, w * 0.5, ring);
float hi = smoothstep(0.45, 0.0, length(fp)) * 0.3;
vec3 col = mix(uColorA, uColorB, line + hi);
gl_FragColor = vec4(col, 1.0);
`
  },
  {
    id: 'herringbone',
    label: 'Herringbone',
    defaults: { p1: 10, p2: 0.05, p3: 0, p4: 0, colorA: '#3b2a1c', colorB: '#b88f68' },
    code: `// classic zigzag brick — integer-grid so it tiles
float N = max(3.0, floor(uP1));
vec2 p = vUv * N;
vec2 ip = floor(p);
vec2 fp = fract(p);
// alternating row-orientation
bool rot = mod(ip.y, 2.0) < 1.0;
vec2 q = rot ? fp : vec2(fp.y, fp.x);
// two offset strips per cell
float strip = mod(ip.x + ip.y, 2.0);
float band = fract(q.x * 2.0 + strip * 0.5);
float edge = smoothstep(uP2, 0.0, min(band, 1.0 - band));
vec3 col = mix(uColorB, uColorA, step(q.y, 0.5));
col = mix(col, uColorA * 0.4, edge);
gl_FragColor = vec4(col, 1.0);
`
  },
  {
    id: 'leopard',
    label: 'Leopard',
    defaults: { p1: 8, p2: 0.55, p3: 0, p4: 0, colorA: '#dca95a', colorB: '#1d120a' },
    code: `// voronoi cells with ring-shaped dark rosettes
vec3 w = worley(vUv, uP1);
float ring = smoothstep(uP2, uP2 - 0.08, w.x) - smoothstep(uP2 - 0.08, uP2 - 0.18, w.x);
float noise = tfbm(vUv, 12.0, 4);
vec3 col = mix(uColorA * (0.8 + 0.2 * noise), uColorB, ring);
gl_FragColor = vec4(col, 1.0);
`
  },
  {
    id: 'zebra',
    label: 'Zebra',
    defaults: { p1: 12, p2: 0.4, p3: 5, p4: 0, colorA: '#f2ede0', colorB: '#0e0d09' },
    code: `// warped vertical stripes
float count = max(2.0, floor(uP1));
float warp = tfbm(vUv, max(2.0, floor(uP3)), 4) * uP2;
float v = step(0.5, fract((vUv.x + warp) * count));
gl_FragColor = vec4(mix(uColorA, uColorB, v), 1.0);
`
  },
  {
    id: 'cow',
    label: 'Cow spots',
    defaults: { p1: 3, p2: 5, p3: 0.55, p4: 0, colorA: '#f4f1ec', colorB: '#1a120b' },
    code: `// large fbm thresholded — irregular holstein shapes
float n = tfbm(vUv, max(1.0, floor(uP1)), int(clamp(uP2, 3.0, 8.0)));
float spots = smoothstep(uP3 - 0.04, uP3 + 0.04, n);
gl_FragColor = vec4(mix(uColorA, uColorB, spots), 1.0);
`
  },
  {
    id: 'wool',
    label: 'Wool',
    defaults: { p1: 120, p2: 0.4, p3: 0, p4: 0, colorA: '#d2cab8', colorB: '#6a5e4e' },
    code: `// directional noise — like felted fibers
float freq = max(30.0, floor(uP1));
float warp = tfbm(vUv, 6.0, 4);
float fibers = sin((vUv.x + vUv.y * 0.3 + warp * 0.4) * freq) * 0.5 + 0.5;
float grain = tfbm(vUv, 20.0, 4);
float v = clamp(grain * 0.6 + fibers * uP2, 0.0, 1.0);
gl_FragColor = vec4(mix(uColorA, uColorB, v), 1.0);
`
  },
  {
    id: 'velvet',
    label: 'Velvet',
    defaults: { p1: 80, p2: 0.4, p3: 0, p4: 0, colorA: '#2a0a2a', colorB: '#ea72b4' },
    code: `// tight fbm + soft directional shimmer
float n = tfbm(vUv, max(20.0, floor(uP1)), 6);
float sheen = pow(0.5 + 0.5 * cos(vUv.y * TAU), 1.2);
float v = mix(n, sheen, uP2);
gl_FragColor = vec4(mix(uColorA, uColorB, v), 1.0);
`
  },
  {
    id: 'crystal-lattice',
    label: 'Crystal lattice',
    defaults: { p1: 10, p2: 0.04, p3: 0, p4: 0, colorA: '#0a0f1c', colorB: '#9ee7ff' },
    code: `// hex-packed bright nodes + thin lattice lines
float N = max(3.0, floor(uP1));
float w = clamp(uP2, 0.01, 0.1);
vec2 p = vUv * N;
p.y += 0.5 * mod(floor(p.x), 2.0);
vec2 ip = floor(p);
vec2 fp = fract(p) - 0.5;
float node = smoothstep(0.15, 0.0, length(fp));
float latX = smoothstep(w, 0.0, abs(fp.x));
float latY = smoothstep(w, 0.0, abs(fp.y));
float v = max(max(node * 1.2, latX * 0.4), latY * 0.4);
gl_FragColor = vec4(mix(uColorA, uColorB, clamp(v, 0.0, 1.0)), 1.0);
`
  },
  {
    id: 'asteroid',
    label: 'Asteroid',
    defaults: { p1: 4, p2: 30, p3: 0.3, p4: 0, colorA: '#2a2820', colorB: '#b0a896' },
    code: `// rough fbm + small worley craters
float base = tfbm(vUv, max(2.0, floor(uP1)), 6);
vec3 w = worley(vUv, uP2);
float crater = smoothstep(0.2, 0.0, w.x) * uP3;
float v = clamp(base - crater, 0.0, 1.0);
gl_FragColor = vec4(mix(uColorA, uColorB, v), 1.0);
`
  },
  {
    id: 'coral',
    label: 'Coral',
    defaults: { p1: 4, p2: 0.5, p3: 0, p4: 0, colorA: '#2b0a1f', colorB: '#ff9080' },
    code: `// organic turbulence with warped mask
float scale = max(2.0, floor(uP1));
float t = tturbulence(vUv, scale, 6);
float w = tfbm(vUv + t * uP2, scale, 4);
float mask = smoothstep(0.3, 0.75, w);
gl_FragColor = vec4(mix(uColorA, uColorB, mask), 1.0);
`
  },
  {
    id: 'crosshatch',
    label: 'Crosshatch',
    defaults: { p1: 40, p2: 0.3, p3: 0, p4: 0, colorA: '#fbf8ef', colorB: '#111111' },
    code: `// two diagonal sine grids at opposing 45°
float f = max(10.0, floor(uP1));
float a = sin((vUv.x + vUv.y) * f * TAU);
float b = sin((vUv.x - vUv.y) * f * TAU);
float v = 0.5 + 0.5 * (a * b);
v = smoothstep(0.5 - uP2 * 0.2, 0.5 + uP2 * 0.2, v);
gl_FragColor = vec4(mix(uColorA, uColorB, v), 1.0);
`
  },
  {
    id: 'parquet',
    label: 'Parquet',
    defaults: { p1: 5, p2: 10, p3: 0, p4: 0, colorA: '#6a401e', colorB: '#b07a44' },
    code: `// wood blocks arranged in alternating groups
float N = max(3.0, floor(uP1));
vec2 p = vUv * N;
vec2 ip = floor(p);
vec2 fp = fract(p);
bool rot = mod(ip.x + ip.y, 2.0) < 1.0;
vec2 q = rot ? fp : vec2(fp.y, fp.x);
float plank = smoothstep(0.02, 0.05, min(q.y, 1.0 - q.y));
float grain = sin(q.x * max(4.0, floor(uP2)) * TAU + tfbm(ip * 0.5, 2.0, 3) * 6.0) * 0.5 + 0.5;
float hue = hashP(ip, N, uSeed);
vec3 col = mix(uColorA, uColorB, 0.3 + 0.7 * grain);
col *= 0.8 + 0.4 * hue;
col = mix(col * 0.4, col, plank);
gl_FragColor = vec4(col, 1.0);
`
  },
  {
    id: 'perforated',
    label: 'Perforated metal',
    defaults: { p1: 12, p2: 0.18, p3: 0, p4: 0, colorA: '#6a6d72', colorB: '#13141a' },
    code: `// regular holes on staggered grid
float N = max(3.0, floor(uP1));
vec2 p = vUv * N;
p.y += 0.5 * mod(floor(p.x), 2.0);
vec2 fp = fract(p) - 0.5;
float hole = smoothstep(uP2, uP2 - 0.04, length(fp));
float grain = tnoise(vUv, 200.0) * 0.1;
vec3 col = mix(uColorA * (0.9 + grain), uColorB, hole);
gl_FragColor = vec4(col, 1.0);
`
  },
  {
    id: 'fingerprint',
    label: 'Fingerprint',
    defaults: { p1: 8, p2: 20, p3: 0, p4: 0, colorA: '#ede6d6', colorB: '#281e10' },
    code: `// warped concentric lines tiled on a grid so it's seamless
float N = max(2.0, floor(uP1));
vec2 p = vUv * N;
vec2 ip = floor(p);
vec2 fp = fract(p) - 0.5;
float d = length(fp);
float warp = tfbm(vUv * 6.0, 12.0, 4) * 0.3;
float rings = sin((d + warp) * max(6.0, floor(uP2)) * TAU) * 0.5 + 0.5;
gl_FragColor = vec4(mix(uColorA, uColorB, smoothstep(0.35, 0.55, rings)), 1.0);
`
  },
  {
    id: 'oil-paint',
    label: 'Oil paint',
    defaults: { p1: 3, p2: 5, p3: 0.7, p4: 0, colorA: '#0a1a3a', colorB: '#ffca5a' },
    code: `// chunky warped fbm with heavy brush strokes
float n = dwarp(vUv, max(2.0, floor(uP1)), int(clamp(uP2, 2.0, 5.0)));
float strokes = sin(vUv.x * 40.0 + n * 20.0) * 0.5 + 0.5;
float v = mix(n, n * strokes, uP3);
gl_FragColor = vec4(mix(uColorA, uColorB, v), 1.0);
`
  },
  {
    id: 'papyrus',
    label: 'Papyrus',
    defaults: { p1: 40, p2: 80, p3: 0.4, p4: 0, colorA: '#b89f73', colorB: '#6b5431' },
    code: `// horizontal + vertical fibers on warm base
float fh = sin(vUv.y * max(20.0, floor(uP1)) * TAU + tnoise(vUv, 20.0) * 6.0) * 0.5 + 0.5;
float fv = sin(vUv.x * max(20.0, floor(uP2)) * TAU + tnoise(vUv * 1.3, 20.0) * 4.0) * 0.5 + 0.5;
float base = tfbm(vUv, 10.0, 4);
float v = mix(base, fh * fv, uP3);
gl_FragColor = vec4(mix(uColorA, uColorB, v), 1.0);
`
  },
  {
    id: 'slate',
    label: 'Slate',
    defaults: { p1: 2, p2: 5, p3: 0.6, p4: 0, colorA: '#2a2e36', colorB: '#787f8c' },
    code: `// thin layered bands (fbm flattened along y)
float layer = floor(vUv.y * max(4.0, floor(uP2))) / max(4.0, floor(uP2));
float n = tfbm(vec2(vUv.x, layer), max(1.0, floor(uP1)), 5);
float dirt = tfbm(vUv, 20.0, 5) * uP3;
float v = clamp(n * 0.7 + dirt, 0.0, 1.0);
gl_FragColor = vec4(mix(uColorA, uColorB, v), 1.0);
`
  },
  {
    id: 'pebbles',
    label: 'Beach pebbles',
    defaults: { p1: 12, p2: 0.5, p3: 0, p4: 0, colorA: '#3a3228', colorB: '#d9cbb4' },
    code: `// voronoi cells, each with smooth inner gradient + per-id shade
vec3 w = worley(vUv, uP1);
float inner = 1.0 - clamp(w.x * 1.6, 0.0, 1.0);
float edge = smoothstep(0.04, 0.0, w.y - w.x);
vec3 col = mix(uColorA, uColorB, inner * (0.6 + 0.6 * w.z));
col = mix(col, uColorA * 0.4, edge * uP2);
gl_FragColor = vec4(col, 1.0);
`
  },
  {
    id: 'fur',
    label: 'Fur',
    defaults: { p1: 150, p2: 0.35, p3: 0, p4: 0, colorA: '#1e1713', colorB: '#a0815e' },
    code: `// directional fine strokes from fbm gradient
float freq = max(40.0, floor(uP1));
float warp = tfbm(vUv, 8.0, 4);
float strokes = sin((vUv.y + warp * uP2) * freq) * 0.5 + 0.5;
float base = tfbm(vUv, 4.0, 5);
gl_FragColor = vec4(mix(uColorA, uColorB, clamp(base * 0.5 + strokes * 0.5, 0.0, 1.0)), 1.0);
`
  },
  {
    id: 'lizard',
    label: 'Lizard scales',
    defaults: { p1: 14, p2: 0.25, p3: 0, p4: 0, colorA: '#16341d', colorB: '#a4c06a' },
    code: `// rounded square cells on hex-staggered grid
float N = max(3.0, floor(uP1));
vec2 p = vUv * N;
p.y += 0.5 * mod(floor(p.x), 2.0);
vec2 fp = fract(p) - 0.5;
float d = max(abs(fp.x), abs(fp.y));
float body = smoothstep(0.5, 0.5 - uP2, d);
float hl = smoothstep(0.0, 0.3, 0.5 - d) * 0.4;
vec3 col = mix(uColorA, uColorB, body + hl);
gl_FragColor = vec4(col, 1.0);
`
  },
  {
    id: 'pumpkin',
    label: 'Pumpkin ridges',
    defaults: { p1: 10, p2: 0.5, p3: 0, p4: 0, colorA: '#8a2e0b', colorB: '#ffb04a' },
    code: `// vertical soft ridges + fbm shading
float count = max(2.0, floor(uP1));
float ridges = pow(0.5 + 0.5 * cos(vUv.x * count * TAU), uP2 * 3.0);
float grain = tfbm(vUv, 6.0, 4);
float v = clamp(ridges * 0.7 + grain * 0.4, 0.0, 1.0);
gl_FragColor = vec4(mix(uColorA, uColorB, v), 1.0);
`
  },
  {
    id: 'patchwork',
    label: 'Aerial patchwork',
    defaults: { p1: 6, p2: 0, p3: 0, p4: 0, colorA: '#3a5a2a', colorB: '#d6c08a' },
    code: `// worley cells, each with random color + fbm texture
float C = max(2.0, floor(uP1));
vec2 p = vUv * C;
vec2 ip = floor(p);
vec2 fp = fract(p);
float d1 = 10.0;
vec2 bestCell = vec2(0.0);
for (int y = -1; y <= 1; y++) {
  for (int x = -1; x <= 1; x++) {
    vec2 off = vec2(float(x), float(y));
    vec2 cell = ip + off;
    vec2 o = vec2(hashP(cell, C, uSeed), hashP(cell + 17.0, C, uSeed + 11.0));
    vec2 r = off + o - fp;
    float d = dot(r, r);
    if (d < d1) { d1 = d; bestCell = cell; }
  }
}
float h = hashP(bestCell, C, uSeed + 5.0);
float grain = tfbm(vUv, 20.0, 4);
vec3 col = mix(uColorA, uColorB, h * 0.8 + grain * 0.2);
gl_FragColor = vec4(col, 1.0);
`
  },
  {
    id: 'gem',
    label: 'Gemstone',
    defaults: { p1: 8, p2: 0.7, p3: 0, p4: 0, colorA: '#0a0216', colorB: '#ff86ff' },
    code: `// voronoi with bright centers + facet edges
vec3 w = worley(vUv, uP1);
float center = smoothstep(uP2, 0.0, w.x);
float edge = smoothstep(0.08, 0.0, w.y - w.x);
vec3 col = mix(uColorA, uColorB, center * (0.5 + 0.5 * w.z));
col = mix(col, uColorB, edge * 0.6);
gl_FragColor = vec4(col, 1.0);
`
  },
  {
    id: 'halftone-gradient',
    label: 'Halftone fade',
    defaults: { p1: 30, p2: 0.3, p3: 0, p4: 0, colorA: '#fefaf2', colorB: '#222' },
    code: `// halftone dots whose size follows an fbm mask (seamless)
float N = max(4.0, floor(uP1));
vec2 p = vUv * N;
vec2 f = fract(p) - 0.5;
float mask = tfbm(vUv, 3.0, 4);
float r = uP2 * mask;
float dot_ = smoothstep(r, r - 0.03, length(f));
gl_FragColor = vec4(mix(uColorA, uColorB, dot_), 1.0);
`
  },
  {
    id: 'radial-dots',
    label: 'Radial dots',
    defaults: { p1: 6, p2: 0.1, p3: 0, p4: 0, colorA: '#0c0c12', colorB: '#ffd37a' },
    code: `// concentric dot rings repeated on a tile grid
float N = max(2.0, floor(uP1));
vec2 p = vUv * N;
vec2 fp = fract(p) - 0.5;
float d = length(fp);
float rings = sin(d * 30.0 * TAU) * 0.5 + 0.5;
float m = smoothstep(uP2, 0.0, abs(rings - 0.5));
gl_FragColor = vec4(mix(uColorA, uColorB, m), 1.0);
`
  },
  {
    id: 'neon-wire',
    label: 'Neon wire',
    defaults: { p1: 8, p2: 0.015, p3: 0, p4: 0, colorA: '#0a0014', colorB: '#30ffe0' },
    code: `// glowing voronoi edges on dark background
vec3 w = worley(vUv, uP1);
float edge = w.y - w.x;
float glow = exp(-edge * edge / (uP2 * uP2));
gl_FragColor = vec4(mix(uColorA, uColorB, glow), 1.0);
`
  },
  {
    id: 'ink-splatter',
    label: 'Ink splatter',
    defaults: { p1: 20, p2: 0.4, p3: 0, p4: 0, colorA: '#f3efe4', colorB: '#080810' },
    code: `// worley with threshold + noise erosion -> splatter shapes
vec3 w = worley(vUv, uP1);
float blob = smoothstep(uP2, uP2 - 0.1, w.x);
float erosion = tfbm(vUv, 20.0, 5);
float v = clamp(blob - erosion * 0.5, 0.0, 1.0);
gl_FragColor = vec4(mix(uColorA, uColorB, v), 1.0);
`
  },
  {
    id: 'kaleidoscope',
    label: 'Kaleidoscope',
    defaults: { p1: 4, p2: 6, p3: 0, p4: 0, colorA: '#1a0630', colorB: '#ffdd80' },
    code: `// symmetrized fbm tile — reflect uv into a wedge so seams stay flat
float N = max(2.0, floor(uP1));
vec2 p = vUv * N;
vec2 fp = fract(p) - 0.5;
// reflect into upper-right quadrant
fp = abs(fp);
// reflect across diagonal for extra symmetry
if (fp.x < fp.y) fp = fp.yx;
float n = tfbm(fp * 2.0, max(2.0, floor(uP2)), 5);
gl_FragColor = vec4(mix(uColorA, uColorB, n), 1.0);
`
  },

  // --- V5 expansion: tech / sacred / op-art / nature / gradient ----------
  {
    id: 'matrix',
    label: 'Matrix code',
    defaults: { p1: 24, p2: 36, p3: 0.6, p4: 0, colorA: '#020a04', colorB: '#54ff8c' },
    code: `// vertical streams of glyphs — falling-code aesthetic
float cols = max(8.0, floor(uP1));
float rows = max(8.0, floor(uP2));
vec2 p = vUv * vec2(cols, rows);
vec2 ip = floor(p);
vec2 fp = fract(p);
float colSeed = hashP(vec2(ip.x, 0.0), cols, uSeed);
float dropOff = floor(uTime * (0.5 + colSeed) + colSeed * rows);
float lit = step(uP3, hashP(ip + dropOff, cols, uSeed + 7.0));
float glyph = step(0.4, hashP(ip + dropOff, cols, uSeed + 11.0)) *
              step(abs(fp.x - 0.5), 0.35) *
              step(abs(fp.y - 0.5), 0.4);
float head = smoothstep(0.0, 0.2, fp.y) * (1.0 - step(0.05, dropOff - floor(dropOff)));
float v = lit * glyph + head * 0.6;
gl_FragColor = vec4(mix(uColorA, uColorB, v), 1.0);
`
  },
  {
    id: 'qr',
    label: 'QR-like grid',
    defaults: { p1: 24, p2: 0.5, p3: 0, p4: 0, colorA: '#fafafa', colorB: '#0a0a0a' },
    code: `// random binary cell grid with finder-pattern corners
float N = max(8.0, floor(uP1));
vec2 p = vUv * N;
vec2 ip = floor(p);
float h = hashP(ip, N, uSeed);
float on = step(uP2, h);
// finder pattern in 3 corners
vec2 f = abs(ip - vec2(N * 0.5));
float corner = step(N * 0.5 - 4.0, f.x) * step(N * 0.5 - 4.0, f.y);
float ring = step(2.0, max(f.x, f.y)) - step(3.0, max(f.x, f.y));
on = mix(on, ring, corner);
gl_FragColor = vec4(mix(uColorA, uColorB, on), 1.0);
`
  },
  {
    id: 'blueprint',
    label: 'Blueprint',
    defaults: { p1: 20, p2: 5, p3: 0, p4: 0, colorA: '#0d2a4a', colorB: '#a8d8ff' },
    code: `// fine grid + emphasized major lines (engineering paper)
float N = max(4.0, floor(uP1));
float major = max(2.0, floor(uP2));
vec2 p = vUv * N;
vec2 fp = abs(fract(p) - 0.5);
float fine = smoothstep(0.49, 0.5, max(fp.x, fp.y));
vec2 fpM = abs(fract(p / major) - 0.5);
float maj = smoothstep(0.49, 0.5, max(fpM.x, fpM.y));
float v = max(fine * 0.4, maj);
gl_FragColor = vec4(mix(uColorA, uColorB, v), 1.0);
`
  },
  {
    id: 'binary',
    label: 'Binary stream',
    defaults: { p1: 30, p2: 60, p3: 0, p4: 0, colorA: '#020608', colorB: '#3aff90' },
    code: `// rows of 0/1 glyphs (hashed)
float cols = max(8.0, floor(uP1));
float rows = max(8.0, floor(uP2));
vec2 p = vUv * vec2(cols, rows);
vec2 ip = floor(p);
vec2 fp = fract(p) - 0.5;
float bit = step(0.5, hashP(ip, cols, uSeed));
// crude 0 vs 1 glyph using sdf-ish primitives
float glyph;
if (bit > 0.5) {
  glyph = step(abs(fp.x), 0.06) * step(abs(fp.y), 0.35);
} else {
  float d = length(fp * vec2(1.0, 1.4));
  glyph = step(0.32, d) - step(0.42, d);
}
gl_FragColor = vec4(mix(uColorA, uColorB, glyph), 1.0);
`
  },
  {
    id: 'circuit-die',
    label: 'Chip die',
    defaults: { p1: 20, p2: 0.05, p3: 0, p4: 0, colorA: '#1a1408', colorB: '#ffd16a' },
    code: `// dense orthogonal traces with junction nodes
float N = max(8.0, floor(uP1));
float t = clamp(uP2, 0.02, 0.15);
vec2 p = vUv * N;
vec2 ip = floor(p);
vec2 fp = fract(p) - 0.5;
float h = hashP(ip, N, uSeed);
float h2 = hashP(ip + 7.0, N, uSeed);
float horiz = step(abs(fp.y), t) * step(0.3, h);
float vert = step(abs(fp.x), t) * step(0.3, h2);
float pad = step(length(fp), t * 1.5) * step(0.7, hashP(ip + 13.0, N, uSeed));
float v = max(max(horiz, vert), pad * 1.3);
gl_FragColor = vec4(mix(uColorA, uColorB, v), 1.0);
`
  },
  {
    id: 'mandala',
    label: 'Mandala',
    defaults: { p1: 4, p2: 12, p3: 0.15, p4: 0, colorA: '#170a30', colorB: '#ffcb50' },
    code: `// per-tile radial symmetry with petals — seamless because each tile is centered
float N = max(2.0, floor(uP1));
float petals = max(3.0, floor(uP2));
vec2 p = vUv * N;
vec2 fp = fract(p) - 0.5;
float r = length(fp);
float a = atan(fp.y, fp.x);
float pet = pow(0.5 + 0.5 * cos(a * petals), 3.0);
float ring = step(uP3, abs(sin(r * 20.0)));
float v = clamp((1.0 - r * 1.6) * pet + ring * 0.3, 0.0, 1.0);
gl_FragColor = vec4(mix(uColorA, uColorB, v), 1.0);
`
  },
  {
    id: 'sacred',
    label: 'Sacred grid',
    defaults: { p1: 6, p2: 0.06, p3: 0, p4: 0, colorA: '#0c0a18', colorB: '#fff0c8' },
    code: `// flower-of-life-like: 7 overlapping circles per tile
float N = max(2.0, floor(uP1));
float w = clamp(uP2, 0.02, 0.2);
vec2 p = vUv * N;
vec2 fp = fract(p) - 0.5;
float r = 0.4;
float d = abs(length(fp) - r);
for (int i = 0; i < 6; i++) {
  float ang = float(i) * TAU / 6.0;
  vec2 c = vec2(cos(ang), sin(ang)) * r;
  d = min(d, abs(length(fp - c) - r));
}
float line = smoothstep(w, 0.0, d);
gl_FragColor = vec4(mix(uColorA, uColorB, line), 1.0);
`
  },
  {
    id: 'op-art',
    label: 'Op art rings',
    defaults: { p1: 6, p2: 30, p3: 0, p4: 0, colorA: '#ffffff', colorB: '#000000' },
    code: `// concentric rings per tile that get denser toward center — vibrating moiré
float N = max(2.0, floor(uP1));
float freq = max(8.0, floor(uP2));
vec2 p = vUv * N;
vec2 fp = fract(p) - 0.5;
float r = length(fp);
float v = step(0.5, fract(r * freq));
gl_FragColor = vec4(mix(uColorA, uColorB, v), 1.0);
`
  },
  {
    id: 'moire',
    label: 'Moiré',
    defaults: { p1: 80, p2: 0.05, p3: 0, p4: 0, colorA: '#0c0c14', colorB: '#ffd070' },
    code: `// two slightly different sine grids — beating creates moiré bands
float f = max(20.0, floor(uP1));
float off = uP2;
float a = sin(vUv.x * f * TAU) * sin(vUv.y * f * TAU);
float b = sin(vUv.x * f * (1.0 + off) * TAU) * sin(vUv.y * f * (1.0 - off) * TAU);
float v = 0.5 + 0.5 * (a + b) * 0.5;
gl_FragColor = vec4(mix(uColorA, uColorB, v), 1.0);
`
  },
  {
    id: 'op-vibrate',
    label: 'Op vibrate',
    defaults: { p1: 30, p2: 0.5, p3: 0, p4: 0, colorA: '#ff2c8a', colorB: '#1ad3ff' },
    code: `// alternating curved stripes — high-contrast retinal vibration
float f = max(6.0, floor(uP1));
float warp = sin(vUv.y * 4.0 * TAU) * uP2 * 0.05;
float v = step(0.5, fract((vUv.x + warp) * f));
gl_FragColor = vec4(mix(uColorA, uColorB, v), 1.0);
`
  },
  {
    id: 'snowflake',
    label: 'Snowflake tile',
    defaults: { p1: 4, p2: 6, p3: 0.06, p4: 0, colorA: '#0a1830', colorB: '#e8f5ff' },
    code: `// 6-arm symmetric pattern — folds the cell uv 6 times
float N = max(2.0, floor(uP1));
float arms = max(3.0, floor(uP2));
vec2 p = vUv * N;
vec2 fp = fract(p) - 0.5;
float a = atan(fp.y, fp.x);
float r = length(fp);
// fold into a wedge
a = mod(a, TAU / arms);
a = abs(a - TAU / arms * 0.5);
vec2 q = vec2(cos(a), sin(a)) * r;
float branch = smoothstep(uP3, 0.0, abs(q.y));
float side = smoothstep(uP3, 0.0, abs(q.y - 0.15) - 0.001) * step(0.05, q.x) * step(q.x, 0.35);
float v = max(branch * smoothstep(0.45, 0.0, r), side);
gl_FragColor = vec4(mix(uColorA, uColorB, v), 1.0);
`
  },
  {
    id: 'feather',
    label: 'Feather',
    defaults: { p1: 8, p2: 30, p3: 0.4, p4: 0, colorA: '#102a44', colorB: '#a4d8ff' },
    code: `// curved fronds emanating from tile center — looks like peacock feathers
float N = max(2.0, floor(uP1));
float fronds = max(8.0, floor(uP2));
vec2 p = vUv * N;
vec2 fp = fract(p) - 0.5;
float a = atan(fp.y, fp.x);
float r = length(fp);
float wave = cos(a * fronds + r * 6.0);
float petal = pow(max(wave, 0.0), 4.0);
float fade = smoothstep(0.5, 0.0, r);
float v = petal * fade + fade * uP3 * 0.4;
gl_FragColor = vec4(mix(uColorA, uColorB, v), 1.0);
`
  },
  {
    id: 'butterfly',
    label: 'Butterfly wing',
    defaults: { p1: 4, p2: 0.55, p3: 0, p4: 0, colorA: '#1a0830', colorB: '#ff7eff' },
    code: `// per-cell radial fbm with thresholded eyespots
float N = max(2.0, floor(uP1));
vec2 p = vUv * N;
vec2 fp = fract(p) - 0.5;
float r = length(fp);
float n = tfbm(fp + vec2(0.5), 6.0, 5);
float eyespot = smoothstep(0.18, 0.12, r) - smoothstep(0.12, 0.06, r);
float wing = smoothstep(0.45, 0.1, r) * n;
float v = clamp(wing + eyespot * uP2, 0.0, 1.0);
gl_FragColor = vec4(mix(uColorA, uColorB, v), 1.0);
`
  },
  {
    id: 'aurora',
    label: 'Aurora',
    defaults: { p1: 3, p2: 0.6, p3: 0, p4: 0, colorA: '#020822', colorB: '#5cffb0' },
    code: `// soft warped fbm bands with rainbow shimmer
float n = tfbm(vUv * vec2(2.0, 1.0), max(2.0, floor(uP1)), 6);
float band = smoothstep(0.3, 0.7, n + vUv.y * uP2 - 0.3);
vec3 rainbow = 0.5 + 0.5 * cos(TAU * (vec3(0.0, 0.33, 0.67) + n));
vec3 col = mix(uColorA, mix(rainbow, uColorB, 0.6), band);
gl_FragColor = vec4(col, 1.0);
`
  },
  {
    id: 'sunset',
    label: 'Sunset bands',
    defaults: { p1: 12, p2: 0.4, p3: 0, p4: 0, colorA: '#1a0830', colorB: '#ffa450' },
    code: `// horizontal smooth bands with subtle haze
float v = vUv.y;
float bands = sin(v * max(4.0, floor(uP1)) * TAU) * uP2 * 0.5;
float n = tfbm(vUv, 4.0, 4) * 0.15;
gl_FragColor = vec4(mix(uColorA, uColorB, clamp(v + bands + n, 0.0, 1.0)), 1.0);
`
  },
  {
    id: 'hologram',
    label: 'Holographic',
    defaults: { p1: 60, p2: 0.6, p3: 0, p4: 0, colorA: '#100018', colorB: '#80fff0' },
    code: `// scanlines + chromatic shimmer
float lines = 0.5 + 0.5 * sin(vUv.y * floor(max(20.0, uP1)) * TAU);
float n = tfbm(vUv + uTime * 0.05, 5.0, 5);
vec3 rainbow = 0.5 + 0.5 * cos(TAU * (vec3(0.0, 0.33, 0.67) + vUv.x + n));
vec3 col = mix(uColorA, mix(rainbow, uColorB, 0.5), lines * uP2 + n * 0.4);
gl_FragColor = vec4(col, 1.0);
`
  },
  {
    id: 'iridescent-foil',
    label: 'Iridescent foil',
    defaults: { p1: 4, p2: 0.7, p3: 0, p4: 0, colorA: '#101428', colorB: '#ffffff' },
    code: `// fbm-driven hue spectrum with metal sheen
float n = dwarp(vUv, max(2.0, floor(uP1)), 4);
vec3 spectrum = 0.5 + 0.5 * cos(TAU * (vec3(0.0, 0.33, 0.67) + n * 2.0));
vec3 col = mix(uColorA, spectrum, smoothstep(0.2, 0.9, n) * uP2);
col += pow(n, 3.0) * 0.4;
gl_FragColor = vec4(col, 1.0);
`
  },
  {
    id: 'roman-mosaic',
    label: 'Roman mosaic',
    defaults: { p1: 16, p2: 0.04, p3: 0, p4: 0, colorA: '#3a2a18', colorB: '#dec99a' },
    code: `// small square tiles with per-tile fbm shading
float N = max(6.0, floor(uP1));
vec2 p = vUv * N;
vec2 ip = floor(p);
vec2 fp = fract(p);
float edge = min(min(fp.x, fp.y), min(1.0 - fp.x, 1.0 - fp.y));
float gap = smoothstep(uP2, 0.0, edge);
float h = hashP(ip, N, uSeed);
float n = tfbm(vUv, 30.0, 4);
vec3 tile = mix(uColorA, uColorB, h * 0.7 + n * 0.3);
gl_FragColor = vec4(mix(tile, uColorA * 0.4, gap), 1.0);
`
  },
  {
    id: 'art-deco',
    label: 'Art deco',
    defaults: { p1: 6, p2: 0.4, p3: 0, p4: 0, colorA: '#0a0c1a', colorB: '#d8b873' },
    code: `// fan-rays from each tile center
float N = max(2.0, floor(uP1));
float arms = 12.0;
vec2 p = vUv * N;
vec2 fp = fract(p) - 0.5;
float r = length(fp);
float a = atan(fp.y, fp.x);
float fan = step(0.5, fract(a * arms / TAU + 0.5));
float ring = smoothstep(0.05, 0.0, abs(r - uP2));
float v = (fan * smoothstep(0.5, 0.05, r)) + ring;
gl_FragColor = vec4(mix(uColorA, uColorB, v), 1.0);
`
  },
  {
    id: 'fractured-glass',
    label: 'Fractured glass',
    defaults: { p1: 12, p2: 0.04, p3: 0, p4: 0, colorA: '#0e1726', colorB: '#aacaff' },
    code: `// voronoi panes with thin cracks + faceted shading
vec3 w = worley(vUv, uP1);
float crack = smoothstep(uP2, 0.0, w.y - w.x);
float shade = pow(1.0 - w.x * 1.4, 2.0);
vec3 col = mix(uColorA, uColorB, shade * (0.6 + 0.4 * w.z));
col = mix(col, uColorA * 0.3, crack);
gl_FragColor = vec4(col, 1.0);
`
  },
  {
    id: 'cells-3d',
    label: 'Voronoi depth',
    defaults: { p1: 8, p2: 0.5, p3: 0, p4: 0, colorA: '#0a0a14', colorB: '#a4ff8c' },
    code: `// cells with smooth depth field (cell-id luminance lookup)
vec3 w = worley(vUv, uP1);
float depth = mix(w.x, w.y, uP2);
float cell = pow(1.0 - depth * 1.5, 2.0);
vec3 col = mix(uColorA, uColorB, cell * (0.5 + 0.5 * w.z));
gl_FragColor = vec4(col, 1.0);
`
  },
  {
    id: 'trichrome',
    label: 'Tri-color noise',
    defaults: { p1: 4, p2: 6, p3: 0, p4: 0, colorA: '#ff5566', colorB: '#5566ff' },
    code: `// 3-color blend driven by 2 noise channels (uses uColorC if non-zero)
float n1 = tfbm(vUv, max(2.0, floor(uP1)), int(clamp(uP2, 2.0, 8.0)));
float n2 = tfbm(vUv + 7.0, max(2.0, floor(uP1)), int(clamp(uP2, 2.0, 8.0)));
vec3 col = mix(uColorA, uColorB, n1);
col = mix(col, uColorC, n2 * 0.5);
gl_FragColor = vec4(col, 1.0);
`
  },
  {
    id: 'gradient-mesh',
    label: 'Gradient bloom',
    defaults: { p1: 4, p2: 0.5, p3: 0, p4: 0, colorA: '#ff6e9c', colorB: '#6e7aff' },
    code: `// soft blob gradient using smoothmin of voronoi cells (uses uColorC if set)
float N = max(2.0, floor(uP1));
vec3 w = worley(vUv, N);
float t = smoothstep(0.0, uP2 + 0.4, w.x);
vec3 c1 = mix(uColorA, uColorB, fract(w.z));
vec3 c2 = mix(uColorB, uColorC, fract(w.z * 1.7));
vec3 col = mix(c1, c2, t);
gl_FragColor = vec4(col, 1.0);
`
  },
  {
    id: 'wave-field',
    label: 'Wave field',
    defaults: { p1: 6, p2: 6, p3: 4, p4: 0, colorA: '#02243a', colorB: '#aaffea' },
    code: `// sum of 3 wave directions at integer freqs — tiles + complex interference
float f1 = floor(max(1.0, uP1));
float f2 = floor(max(1.0, uP2));
float f3 = floor(max(1.0, uP3));
float a = sin(vUv.x * f1 * TAU);
float b = sin(vUv.y * f2 * TAU);
float c = sin((vUv.x + vUv.y) * f3 * TAU);
float v = (a + b + c) / 3.0 * 0.5 + 0.5;
gl_FragColor = vec4(mix(uColorA, uColorB, v), 1.0);
`
  },
  {
    id: 'maze',
    label: 'Random maze',
    defaults: { p1: 14, p2: 0.08, p3: 0, p4: 0, colorA: '#06090e', colorB: '#ffaa3a' },
    code: `// per-cell random choice of 4 wall configurations
float N = max(4.0, floor(uP1));
float w = clamp(uP2, 0.02, 0.2);
vec2 p = vUv * N;
vec2 ip = floor(p);
vec2 fp = fract(p) - 0.5;
float h = hashP(ip, N, uSeed);
float wall;
if (h < 0.25)      wall = step(abs(fp.x), w);
else if (h < 0.5)  wall = step(abs(fp.y), w);
else if (h < 0.75) wall = step(abs(fp.x + fp.y), w);
else               wall = step(abs(fp.x - fp.y), w);
gl_FragColor = vec4(mix(uColorA, uColorB, wall), 1.0);
`
  },
  {
    id: 'starburst',
    label: 'Starburst tile',
    defaults: { p1: 5, p2: 12, p3: 0, p4: 0, colorA: '#0a0a14', colorB: '#ffe070' },
    code: `// per-tile star with N points
float N = max(2.0, floor(uP1));
float points = max(4.0, floor(uP2));
vec2 p = vUv * N;
vec2 fp = fract(p) - 0.5;
float a = atan(fp.y, fp.x);
float r = length(fp);
float star = pow(max(0.0, cos(a * points * 0.5)), 6.0);
float v = smoothstep(0.45, 0.0, r) * (0.4 + 0.6 * star);
gl_FragColor = vec4(mix(uColorA, uColorB, v), 1.0);
`
  },
  {
    id: 'recursion',
    label: 'Recursive cells',
    defaults: { p1: 4, p2: 16, p3: 0, p4: 0, colorA: '#0c0c14', colorB: '#aaffaa' },
    code: `// outer voronoi with inner voronoi — fractal cells
vec3 w1 = worley(vUv, uP1);
vec3 w2 = worley(vUv * 4.0, uP2);
float v = mix(w1.x * 1.4, w2.x, 0.4);
vec3 col = mix(uColorA, uColorB, 1.0 - v);
gl_FragColor = vec4(col, 1.0);
`
  },
  {
    id: 'wood-deep',
    label: 'Deep wood',
    defaults: { p1: 30, p2: 0.4, p3: 5, p4: 0, colorA: '#2a1408', colorB: '#a87248' },
    code: `// rings warped by 2-layer fbm — more believable than basic wood
float rings = max(8.0, floor(uP1));
float w1 = tfbm(vUv, max(2.0, floor(uP3)), 4);
float w2 = tfbm(vUv * 2.5 + 7.0, max(2.0, floor(uP3)), 3);
float warp = (w1 + w2 * 0.5) * uP2;
float v = sin((vUv.x + warp) * rings * TAU) * 0.5 + 0.5;
v = smoothstep(0.3, 0.7, v);
float grain = tnoise(vUv, 400.0) * 0.18;
gl_FragColor = vec4(mix(uColorA, uColorB, clamp(v * 0.85 + grain, 0.0, 1.0)), 1.0);
`
  },
  {
    id: 'ripple-pond',
    label: 'Pond ripples',
    defaults: { p1: 5, p2: 12, p3: 0.08, p4: 0, colorA: '#021830', colorB: '#a8e8ff' },
    code: `// repeating concentric rings on a tile grid + noise distortion
float N = max(2.0, floor(uP1));
vec2 p = vUv * N;
vec2 fp = fract(p) - 0.5;
float r = length(fp) + tfbm(vUv, 6.0, 4) * uP3;
float waves = 0.5 + 0.5 * sin(r * max(2.0, floor(uP2)) * TAU - uTime * 2.0);
gl_FragColor = vec4(mix(uColorA, uColorB, waves), 1.0);
`
  },

  // --- V6 PRO: complex, multi-color, well-labelled high-quality shaders --
  {
    id: 'pro-marble',
    label: 'Pro Marble',
    category: 'cellular',
    paramCount: 8,
    usesColorC: true,
    usesColorD: false,
    paramLabels: {
      p1: 'Vein scale',
      p2: 'Vein count',
      p3: 'Turbulence',
      p4: 'Octaves',
      p5: 'Vein sharpness',
      p6: 'Base contrast',
      p7: 'Highlight',
      p8: 'Color blend'
    },
    defaults: {
      p1: 4, p2: 6, p3: 0.4, p4: 6, p5: 5, p6: 0.5, p7: 0.4, p8: 0.5,
      colorA: '#f0ece2', colorB: '#1a1814', colorC: '#cab47a', colorD: '#000000'
    },
    code: `// Multi-layer marble: turbulent fbm drives sinusoidal veins, second pass
// adds ambient base, third blends a gold accent for that Carrara-meets-Calacatta look.
float scale = max(2.0, floor(uP1));
float veinCount = max(1.0, floor(uP2));
float warp1 = tfbm(vUv, scale, int(clamp(uP4, 2.0, 8.0))) * uP3;
float warp2 = tfbm(vUv * 1.7 + 5.1, scale, int(clamp(uP4, 2.0, 8.0))) * uP3;
float v = abs(sin((vUv.x + vUv.y * 0.3 + warp1 * 4.0 + warp2 * 2.0) * veinCount * TAU));
float veins = pow(1.0 - v, max(2.0, uP5));
float base = tfbm(vUv, scale * 0.5, 4);
float accent = smoothstep(0.65, 0.95, veins + base * 0.2);
vec3 col = mix(uColorA, uColorB, clamp(veins * uP6 + base * 0.3, 0.0, 1.0));
col = mix(col, uColorC, accent * uP8);
col += pow(veins, 4.0) * uP7;
gl_FragColor = vec4(col, 1.0);
`
  },
  {
    id: 'pro-stained-glass',
    label: 'Stained Glass',
    category: 'cellular',
    paramCount: 6,
    usesColorC: true,
    usesColorD: true,
    paramLabels: {
      p1: 'Pane count',
      p2: 'Lead width',
      p3: 'Color split',
      p4: 'Inner glow',
      p5: 'Texture',
      p6: 'Saturation'
    },
    defaults: {
      p1: 9, p2: 0.04, p3: 0.5, p4: 0.6, p5: 0.4, p6: 1,
      colorA: '#ff5a3a', colorB: '#3a8eff', colorC: '#ffd13a', colorD: '#0a0a14'
    },
    code: `// Voronoi panes lit from behind: 4-color cell assignment + dark leading
vec3 w = worley(vUv, uP1);
float lead = smoothstep(uP2, 0.0, w.y - w.x);
float inner = pow(1.0 - w.x * 1.4, 2.0);
float h = w.z;
vec3 c1 = mix(uColorA, uColorB, step(uP3, h));
vec3 c2 = mix(uColorC, uColorA, step(uP3 + 0.25, h));
vec3 cell = mix(c1, c2, smoothstep(0.4, 0.7, h));
cell *= 0.4 + uP6 * (0.5 + 0.5 * inner * uP4);
float texture = tnoise(vUv * 4.0, 80.0) * uP5;
cell += texture * 0.15;
gl_FragColor = vec4(mix(cell, uColorD, lead), 1.0);
`
  },
  {
    id: 'pro-circuit',
    label: 'PCB Detailed',
    category: 'tech',
    paramCount: 7,
    usesColorC: true,
    usesColorD: true,
    paramLabels: {
      p1: 'Trace density',
      p2: 'Trace width',
      p3: 'Pad density',
      p4: 'Pad size',
      p5: 'Component density',
      p6: 'Solder mask',
      p7: 'Silk noise'
    },
    defaults: {
      p1: 16, p2: 0.06, p3: 0.5, p4: 0.12, p5: 0.3, p6: 0.7, p7: 0.4,
      colorA: '#06321a', colorB: '#cdb86a', colorC: '#ffffff', colorD: '#0c0c10'
    },
    code: `// Three-layer PCB: solder mask (A) + traces/pads (B copper) + silkscreen (C white) + components (D black)
float N = max(6.0, floor(uP1));
float t = clamp(uP2, 0.02, 0.18);
vec2 p = vUv * N;
vec2 ip = floor(p);
vec2 fp = fract(p) - 0.5;
float h1 = hashP(ip, N, uSeed);
float h2 = hashP(ip + 7.0, N, uSeed + 3.0);
float h3 = hashP(ip + 17.0, N, uSeed + 11.0);
float traceH = step(abs(fp.y), t) * step(0.4, h1);
float traceV = step(abs(fp.x), t) * step(0.4, h2);
float pad = step(length(fp), uP4) * step(1.0 - uP3, h3);
float copper = max(max(traceH, traceV), pad);
// components (rectangles)
vec2 cf = abs(fp);
float comp = step(cf.x, 0.32) * step(cf.y, 0.18) * step(1.0 - uP5, hashP(ip + 23.0, N, uSeed + 17.0));
// silkscreen labels (thin outlines)
float silk = step(abs(cf.x - 0.32), 0.02) * step(cf.y, 0.18) * comp;
silk += tnoise(vUv, 200.0) * uP7 * 0.3;
vec3 col = uColorA * uP6;
col = mix(col, uColorB, copper);
col = mix(col, uColorD, comp);
col = mix(col, uColorC, silk);
gl_FragColor = vec4(col, 1.0);
`
  },
  {
    id: 'pro-watercolor',
    label: 'Watercolor',
    category: 'gradient',
    paramCount: 6,
    usesColorC: true,
    usesColorD: true,
    paramLabels: {
      p1: 'Wash scale',
      p2: 'Bleed amount',
      p3: 'Edge darkness',
      p4: 'Paper grain',
      p5: 'Color spread',
      p6: 'Layer mix'
    },
    defaults: {
      p1: 3, p2: 0.45, p3: 0.5, p4: 0.4, p5: 0.5, p6: 0.6,
      colorA: '#ffe6b8', colorB: '#ff7a8a', colorC: '#80b4ff', colorD: '#3a2c4a'
    },
    code: `// Three pigment washes warp-blended + paper grain + edge darkening
float scale = max(2.0, floor(uP1));
float w1 = dwarp(vUv, scale, 4);
float w2 = dwarp(vUv + 5.0, scale, 4);
vec3 col = mix(uColorA, uColorB, smoothstep(0.3, 0.7, w1));
col = mix(col, uColorC, smoothstep(0.5, 0.85, w2 * uP5 + w1 * 0.2));
// Edge darkening (where the wash dries with high gradient)
vec2 e = vec2(
  dwarp(vUv + vec2(0.005, 0.0), scale, 4) - dwarp(vUv - vec2(0.005, 0.0), scale, 4),
  dwarp(vUv + vec2(0.0, 0.005), scale, 4) - dwarp(vUv - vec2(0.0, 0.005), scale, 4)
);
float edge = length(e) * uP3 * 30.0;
col = mix(col, uColorD, clamp(edge, 0.0, 1.0));
// Paper grain
float grain = tfbm(vUv, 200.0, 4) * uP4;
col *= 0.85 + grain * 0.3;
col = mix(col, col * 1.1, uP6 * smoothstep(0.4, 0.7, w1 * w2));
col += (uP2 - 0.5) * 0.1;
gl_FragColor = vec4(col, 1.0);
`
  },
  {
    id: 'pro-damascus',
    label: 'Damascus Steel',
    category: 'material',
    paramCount: 6,
    usesColorC: false,
    usesColorD: false,
    paramLabels: {
      p1: 'Layer count',
      p2: 'Forge warp',
      p3: 'Acid contrast',
      p4: 'Polish',
      p5: 'Edge highlight',
      p6: 'Fineness'
    },
    defaults: {
      p1: 18, p2: 0.55, p3: 0.7, p4: 0.5, p5: 0.4, p6: 4,
      colorA: '#1a1a20', colorB: '#d6dde6'
    },
    code: `// Folded steel layers: warped sinusoidal stripes + acid-etched contrast
float layers = max(4.0, floor(uP1));
float warp = tfbm(vUv, max(2.0, floor(uP6)), 5) * uP2;
float bands = sin((vUv.y + warp) * layers * TAU) * 0.5 + 0.5;
bands = pow(bands, 2.0 + uP3 * 4.0);
float polish = mix(0.4, 1.0, uP4);
float ridge = abs(sin((vUv.y + warp) * layers * TAU * 2.0));
float hi = pow(ridge, 8.0) * uP5;
float v = bands * polish + hi;
gl_FragColor = vec4(mix(uColorA, uColorB, clamp(v, 0.0, 1.0)), 1.0);
`
  },
  {
    id: 'pro-sky',
    label: 'Sky Gradient',
    category: 'gradient',
    paramCount: 6,
    usesColorC: true,
    usesColorD: true,
    paramLabels: {
      p1: 'Horizon blur',
      p2: 'Cloud scale',
      p3: 'Cloud density',
      p4: 'Sun X',
      p5: 'Sun glow',
      p6: 'Star density'
    },
    defaults: {
      p1: 0.3, p2: 4, p3: 0.5, p4: 0.5, p5: 0.6, p6: 0,
      colorA: '#0a1228', colorB: '#ff9050', colorC: '#ffe8b0', colorD: '#ffffff'
    },
    code: `// Vertical blend (zenith → horizon) + sun + procedural clouds + stars
vec3 zenith = uColorA;
vec3 horizon = uColorB;
float t = smoothstep(uP1, 1.0 - uP1, vUv.y);
vec3 col = mix(horizon, zenith, t);
// Sun
vec2 sunPos = vec2(uP4, 1.0 - uP1 - 0.05);
float sun = exp(-pow(distance(vUv, sunPos), 2.0) * 200.0);
float halo = exp(-pow(distance(vUv, sunPos), 2.0) * 30.0) * uP5;
col += sun * uColorD;
col += halo * uColorC * 0.4;
// Clouds
float clouds = tfbm(vUv * vec2(2.0, 1.0) + uTime * 0.02, max(2.0, floor(uP2)), 5);
col = mix(col, uColorC, smoothstep(1.0 - uP3, 1.0, clouds) * (1.0 - t * 0.3));
// Stars (in upper sky only)
float stars = step(1.0 - uP6 * 0.005, tnoise(vUv, 400.0)) * t;
col += stars * uColorD;
gl_FragColor = vec4(col, 1.0);
`
  },
  {
    id: 'pro-pearlescent',
    label: 'Pearlescent',
    category: 'optical',
    paramCount: 5,
    usesColorC: true,
    usesColorD: false,
    paramLabels: {
      p1: 'Shimmer scale',
      p2: 'Shift speed',
      p3: 'Sheen power',
      p4: 'Spectrum width',
      p5: 'Base luminance'
    },
    defaults: {
      p1: 4, p2: 0.5, p3: 1.5, p4: 0.7, p5: 0.4,
      colorA: '#dadffa', colorB: '#fad6e8', colorC: '#fff4c8'
    },
    code: `// 3-color sheen blended by warped fbm + cosine spectrum overlay
float n = dwarp(vUv, max(2.0, floor(uP1)), 5);
vec3 spectrum = 0.5 + 0.5 * cos(TAU * (vec3(0.0, 0.33, 0.67) + n * uP4 + uTime * uP2 * 0.1));
vec3 base = mix(uColorA, uColorB, n);
base = mix(base, uColorC, smoothstep(0.4, 0.8, n));
vec3 col = base + spectrum * pow(n, uP3) * 0.5 + uP5;
gl_FragColor = vec4(col, 1.0);
`
  },
  {
    id: 'pro-quilt',
    label: 'Patchwork Quilt',
    category: 'fabric',
    paramCount: 6,
    usesColorC: true,
    usesColorD: true,
    paramLabels: {
      p1: 'Patch count',
      p2: 'Stitch width',
      p3: 'Patch variety',
      p4: 'Texture',
      p5: 'Fade between',
      p6: 'Border darken'
    },
    defaults: {
      p1: 6, p2: 0.04, p3: 0.7, p4: 0.5, p5: 0.3, p6: 0.4,
      colorA: '#3a4a72', colorB: '#c47a72', colorC: '#7aa472', colorD: '#1a1414'
    },
    code: `// 4-color random patches with stitched borders + woven fabric texture
float N = max(2.0, floor(uP1));
vec2 p = vUv * N;
vec2 ip = floor(p);
vec2 fp = fract(p);
float edge = min(min(fp.x, fp.y), min(1.0 - fp.x, 1.0 - fp.y));
float stitch = smoothstep(uP2, uP2 * 0.4, edge);
// 4-color choice per patch
float h = hashP(ip, N, uSeed);
vec3 c;
if (h < 0.25) c = uColorA;
else if (h < 0.5) c = uColorB;
else if (h < 0.75) c = uColorC;
else c = uColorA * 1.3;
// Cross-hatch fabric weave
float weave = (sin(vUv.x * 200.0 * TAU) * sin(vUv.y * 200.0 * TAU)) * 0.5 + 0.5;
c *= 0.7 + 0.3 * weave * uP4;
// Subtle inter-patch fade
c = mix(c, c * 0.85, smoothstep(0.0, uP5, edge));
gl_FragColor = vec4(mix(c, uColorD, (1.0 - stitch) * uP6), 1.0);
`
  },
  {
    id: 'pro-tropical',
    label: 'Tropical Leaf',
    category: 'nature',
    paramCount: 6,
    usesColorC: true,
    usesColorD: false,
    paramLabels: {
      p1: 'Cell size',
      p2: 'Vein width',
      p3: 'Vein detail',
      p4: 'Color variance',
      p5: 'Highlight',
      p6: 'Edge fade'
    },
    defaults: {
      p1: 8, p2: 0.05, p3: 4, p4: 0.6, p5: 0.4, p6: 0.5,
      colorA: '#1a3818', colorB: '#73b85a', colorC: '#cce28a'
    },
    code: `// Voronoi cells with secondary fbm vein detail in 3 greens
vec3 w = worley(vUv, uP1);
float vein = smoothstep(uP2, 0.0, w.y - w.x);
float detail = tridge(vUv, max(2.0, floor(uP3)) * 4.0, 4) * uP3 * 0.3;
float depth = pow(1.0 - w.x * 1.5, 2.0);
float h = fract(w.z * 7.3);
vec3 cell = mix(uColorA, uColorB, depth);
cell = mix(cell, uColorC, smoothstep(0.5 + (1.0 - uP4) * 0.4, 1.0, h));
cell *= 1.0 + detail;
cell += pow(depth, 4.0) * uP5;
gl_FragColor = vec4(mix(cell, uColorA, vein * uP6), 1.0);
`
  },
  {
    id: 'pro-galaxy',
    label: 'Deep Galaxy',
    category: 'nature',
    paramCount: 7,
    usesColorC: true,
    usesColorD: true,
    paramLabels: {
      p1: 'Nebula scale',
      p2: 'Spiral arms',
      p3: 'Dust density',
      p4: 'Star density',
      p5: 'Star brightness',
      p6: 'Color shift',
      p7: 'Glow'
    },
    defaults: {
      p1: 3, p2: 4, p3: 0.5, p4: 0.5, p5: 0.6, p6: 0.4, p7: 0.5,
      colorA: '#0a0820', colorB: '#ff80ff', colorC: '#80c8ff', colorD: '#ffffff'
    },
    code: `// Spiral nebula made of warped fbm + bright pink/blue clouds + dense stars
vec2 c = vUv - 0.5;
float r = length(c);
float a = atan(c.y, c.x);
float spiral = sin(a * max(1.0, floor(uP2)) + r * 30.0);
float n1 = dwarp(vUv + spiral * 0.05, max(2.0, floor(uP1)), 5);
float n2 = dwarp(vUv * 1.5 + 5.0, max(2.0, floor(uP1)), 4);
vec3 nebula = mix(uColorA, uColorB, smoothstep(0.3, 0.9, n1) * uP6);
nebula = mix(nebula, uColorC, smoothstep(0.4, 0.9, n2) * uP6);
// Dust lanes
float dust = smoothstep(0.0, 0.3, abs(spiral)) * uP3;
nebula *= 1.0 - dust * 0.5;
// Star field
float starMask = step(1.0 - uP4 * 0.005, tnoise(vUv, 600.0));
vec3 col = nebula + starMask * uColorD * uP5;
col += pow(n1, 4.0) * uP7 * uColorB;
gl_FragColor = vec4(col, 1.0);
`
  },
  {
    id: 'pro-weathered-wood',
    label: 'Weathered Wood',
    category: 'material',
    paramCount: 8,
    usesColorC: true,
    usesColorD: false,
    paramLabels: {
      p1: 'Ring frequency',
      p2: 'Warp',
      p3: 'Warp scale',
      p4: 'Crack density',
      p5: 'Moss patches',
      p6: 'Patina',
      p7: 'Grain noise',
      p8: 'Highlight'
    },
    defaults: {
      p1: 30, p2: 0.3, p3: 4, p4: 0.4, p5: 0.4, p6: 0.5, p7: 0.5, p8: 0.3,
      colorA: '#3a2412', colorB: '#a87248', colorC: '#3a5a2a'
    },
    code: `// Wood rings + cracks (worley) + moss patches + patina overlay
float rings = max(8.0, floor(uP1));
float w1 = tfbm(vUv, max(1.0, floor(uP3)), 4);
float v = sin((vUv.x + w1 * uP2) * rings * TAU) * 0.5 + 0.5;
v = smoothstep(0.3, 0.7, v);
// Cracks
vec3 cw = worley(vUv, 8.0);
float cracks = smoothstep(0.04, 0.0, cw.y - cw.x) * uP4;
// Moss in low spots
float moss = smoothstep(1.0 - uP5, 1.0 - uP5 * 0.5, tfbm(vUv, 5.0, 4));
// Grain
float grain = tnoise(vUv, 400.0) * uP7 * 0.15;
vec3 wood = mix(uColorA, uColorB, clamp(v * 0.85 + grain, 0.0, 1.0));
wood *= 1.0 - cracks * 0.7;
wood = mix(wood, uColorC, moss);
wood *= 1.0 - uP6 * 0.2 * (1.0 - v);
wood += pow(v, 4.0) * uP8 * 0.3;
gl_FragColor = vec4(wood, 1.0);
`
  },
  {
    id: 'pro-quantum',
    label: 'Quantum Field',
    category: 'optical',
    paramCount: 6,
    usesColorC: true,
    usesColorD: false,
    paramLabels: {
      p1: 'Field scale',
      p2: 'Energy',
      p3: 'Phase shift',
      p4: 'Interference',
      p5: 'Glow falloff',
      p6: 'Color rotate'
    },
    defaults: {
      p1: 6, p2: 0.7, p3: 0.5, p4: 0.5, p5: 2, p6: 0.5,
      colorA: '#020216', colorB: '#3a8eff', colorC: '#ff3a8e'
    },
    code: `// Layered interference of warped fields — looks like probability density
float scale = max(2.0, floor(uP1));
float n1 = tfbm(vUv + uTime * 0.05, scale, 5);
float n2 = tfbm(vUv * 1.5 + uTime * -0.04, scale, 5);
float n3 = tfbm(vUv * 0.7 + uTime * 0.07, scale, 4);
float field = abs(n1 - n2) * uP4 + (n3 - 0.5) * uP3;
field = pow(field * uP2, uP5);
vec3 col = mix(uColorA, uColorB, smoothstep(0.0, 0.5, field));
col = mix(col, uColorC, smoothstep(0.4, 1.0, field) * uP6);
col += pow(field, 8.0) * 1.5;
gl_FragColor = vec4(col, 1.0);
`
  },

  // --- Inspired by prinzipiell/tsl scenic-backdrop (Tinker Day 12/22/23) ---
  {
    id: 'scenic-pond',
    label: 'Scenic pond (fbm)',
    category: 'waves',
    paramCount: 6,
    usesColorC: true,
    usesColorD: true,
    paramLabels: {
      p1: 'Ripple scale',
      p2: 'Flow speed',
      p3: 'Distortion',
      p4: 'Sky blend',
      p5: 'Moon glow',
      p6: 'Gamma'
    },
    defaults: {
      p1: 4, p2: 0.4, p3: 0.35, p4: 0.55, p5: 5, p6: 0.87,
      colorA: '#0a1626', colorB: '#3a6f9c',
      colorC: '#fff3d0', colorD: '#0a0418'
    },
    code: `// Stylized pond: fbm-warped water + sky horizon + moon glow.
// Inspired by prinzipiell/tsl scenic-backdrop (Tinker Day 12).
vec2 uv = vUv * 2.0 - 1.0;
float t = uTime * 0.4 * uP2;

// fbm-driven distortion of the surface
vec2 q = uv;
q.y -= 0.3 * t * 0.001;
float n1 = tfbm(q * uP1 + vec2(0.0, t * 0.05), 6.0, 5);
float n2 = tfbm(q * (uP1 * 1.7) + vec2(t * 0.03, -t * 0.04), 6.0, 5);
vec2 off = vec2(n1, n2) - 0.5;

vec2 wp = q + off * uP3;
float waterN = tfbm(wp * uP1 * 0.9, 6.0, 5);
vec3 water = mix(uColorA, uColorB, smoothstep(0.25, 0.75, waterN));
water += pow(max(0.0, n2 - 0.55), 2.0) * vec3(1.0, 0.9, 0.73) * 0.6;

// sky band (top of texture)
float horizon = smoothstep(-0.05, 0.5, vUv.y - 0.5);
float clouds = tfbm(vec2(uv.x, 1.0) * 1.2, 6.0, 5);
vec3 sky = mix(uColorD, uColorB * 0.5 + 0.1, horizon);
sky += vec3(0.33, 0.34, 0.38) * smoothstep(0.4, 0.95, clouds) * 0.6;

// moon
vec2 moonPos = vec2(0.32, 0.32);
float md = length(uv - moonPos);
float moon = smoothstep(0.18, 0.12, md);
float moonHalo = exp(-md * 6.0) * 0.4;
sky += uColorC * (moon + moonHalo) * uP5 * 0.25;

// blend sky into water based on uP4
vec3 col = mix(water, sky, smoothstep(0.0, 0.4, vUv.y - 0.5) * uP4);

// reflective shimmer near horizon
float shim = pow(max(0.0, n1), 4.0) * (1.0 - vUv.y) * 0.6;
col += uColorC * shim * uP5 * 0.08;

// gamma
col = pow(max(col, 0.0), vec3(1.0 / max(uP6, 0.2)));
gl_FragColor = vec4(col, 1.0);
`
  },
  {
    id: 'toon-rock',
    label: 'Toon rock',
    category: 'material',
    paramCount: 6,
    usesColorC: true,
    usesColorD: false,
    paramLabels: {
      p1: 'Rock scale',
      p2: 'Crack depth',
      p3: 'Toon bands',
      p4: 'Rim light',
      p5: 'Moss amount',
      p6: 'Chip detail'
    },
    defaults: {
      p1: 5, p2: 0.55, p3: 4, p4: 0.45, p5: 0.25, p6: 0.5,
      colorA: '#2a2a32', colorB: '#88909c', colorC: '#3d6a3a'
    },
    code: `// Stylized toon-shaded rock (inspired by Tinker Day 12 rocks).
float P = max(2.0, floor(uP1));
vec3 w = worley(vUv, P);
float rock = w.x;

// large-scale shape
float shape = tfbm(vUv * uP1 * 0.6, 6.0, 5);
float h = mix(rock, shape, 0.55);

// cracks between cells
float crack = smoothstep(0.0, 0.04, w.y - w.x);
crack = 1.0 - crack;

// micro chips
float chip = tturbulence(vUv * uP1 * 4.0, 6.0, 4);

// posterized "toon" lighting bands
float bands = max(2.0, floor(uP3));
float lit = floor(h * bands) / bands;

vec3 base = mix(uColorA, uColorB, lit);
base *= 1.0 - crack * uP2;
base = mix(base, base * 0.5, chip * uP6 * 0.3);

// rim along cell edge
float rim = smoothstep(0.0, 0.08, w.y - w.x);
base += rim * uP4 * 0.25;

// moss on top half + low ridges
float moss = smoothstep(0.55, 0.85, tfbm(vUv * uP1 * 1.4 + 7.7, 6.0, 5));
moss *= smoothstep(0.4, 0.0, vUv.y) + 0.3;
base = mix(base, uColorC, clamp(moss * uP5, 0.0, 0.85));

gl_FragColor = vec4(base, 1.0);
`
  },
  {
    id: 'fbm-water',
    label: 'fbm water',
    category: 'waves',
    paramCount: 5,
    usesColorC: true,
    usesColorD: false,
    paramLabels: {
      p1: 'Wave scale',
      p2: 'Flow speed',
      p3: 'Domain warp',
      p4: 'Highlight',
      p5: 'Depth tint'
    },
    defaults: {
      p1: 5, p2: 0.5, p3: 0.45, p4: 0.7, p5: 0.5,
      colorA: '#0b2230', colorB: '#3aa9c9', colorC: '#e6f9ff'
    },
    code: `// Pure fbm-warped water surface (Day 12 study).
float t = uTime * 0.3 * uP2;
vec2 q = vec2(tfbm(vUv * uP1 + vec2(t, 0.0), 6.0, 5),
              tfbm(vUv * uP1 + vec2(5.2, 1.3 - t), 6.0, 5));
vec2 r = vec2(tfbm(vUv * uP1 + 4.0 * q + vec2(1.7, 9.2 + t * 0.5), 6.0, 5),
              tfbm(vUv * uP1 + 4.0 * q + vec2(8.3, 2.8 - t * 0.5), 6.0, 5));
float n = tfbm(vUv * uP1 + uP3 * 4.0 * r, 6.0, 6);

vec3 col = mix(uColorA, uColorB, smoothstep(0.2, 0.8, n));
// foam / spec on the wave crests
float crest = pow(smoothstep(0.55, 0.9, n + (r.x - 0.5) * 0.3), 3.0);
col = mix(col, uColorC, crest * uP4);
// depth tint where fbm value is low
col *= mix(1.0, mix(1.0, 0.55, uP5), 1.0 - n);

gl_FragColor = vec4(col, 1.0);
`
  }
];


// --- Categories ----------------------------------------------------------
// Used by the search/filter chips in the LeftPanel shader tab.

const CATEGORY_MAP = {
  // geometric
  checker: 'geometric', stripes: 'geometric', rings: 'geometric', hex: 'geometric',
  'hex-fill': 'geometric', scales: 'geometric', truchet: 'geometric',
  'truchet-squares': 'geometric', triangles: 'geometric', diamonds: 'geometric',
  quilted: 'geometric', weave: 'geometric', damask: 'geometric',
  herringbone: 'geometric', chainmail: 'geometric', perforated: 'geometric',
  parquet: 'geometric', tiles: 'geometric', mosaic: 'geometric',
  'crystal-lattice': 'geometric', crosshatch: 'geometric', honey: 'geometric',
  // noise
  fbm: 'noise', ridged: 'noise', turbulence: 'noise', warp: 'noise',
  'perlin-warp': 'noise', lava: 'noise', sandstone: 'noise', clay: 'noise',
  stucco: 'noise', cork: 'noise', mountain: 'noise', dune: 'noise',
  wrinkled: 'noise', 'oil-paint': 'noise', papyrus: 'noise', slate: 'noise',
  asteroid: 'noise', clouds: 'noise', galaxy: 'noise',
  // cellular
  voronoi: 'cellular', terrazzo: 'cellular', cracked: 'cellular',
  metaballs: 'cellular', 'rock-wall': 'cellular', 'mesh-gradient': 'cellular',
  crystal: 'cellular', 'ceramic-crackle': 'cellular', leopard: 'cellular',
  patchwork: 'cellular', pebbles: 'cellular', gem: 'cellular',
  'ink-splatter': 'cellular', 'neon-wire': 'cellular',
  // waves
  waves: 'waves', caustics: 'waves', plasma: 'waves', water: 'waves',
  flow: 'waves', ripple: 'waves', 'caustic-veil': 'waves',
  // fabric / textile
  snake: 'fabric', 'carbon-fiber': 'fabric', denim: 'fabric',
  linen: 'fabric', wool: 'fabric', velvet: 'fabric', fur: 'fabric',
  // surface / material
  circuit: 'material', brick: 'material', dots: 'material', stars: 'material',
  leather: 'material', 'rust-metal': 'material', marble: 'material',
  'tree-bark': 'material', wood: 'material', concrete: 'material',
  glitch: 'material', 'neon-grid': 'material', mushrooms: 'material',
  scratches: 'material', galvanized: 'material', 'oil-slick': 'material',
  bamboo: 'material', moss: 'material', zebra: 'material', cow: 'material',
  coral: 'material', pumpkin: 'material', lizard: 'material',
  fingerprint: 'material', 'halftone-gradient': 'material',
  'radial-dots': 'material', kaleidoscope: 'material',
  // V5 additions
  matrix: 'tech', qr: 'tech', blueprint: 'tech', binary: 'tech',
  'circuit-die': 'tech',
  mandala: 'sacred', sacred: 'sacred', 'art-deco': 'sacred',
  starburst: 'sacred',
  'op-art': 'optical', moire: 'optical', 'op-vibrate': 'optical',
  hologram: 'optical', 'iridescent-foil': 'optical',
  snowflake: 'nature', feather: 'nature', butterfly: 'nature',
  'wood-deep': 'nature', 'ripple-pond': 'waves',
  aurora: 'gradient', sunset: 'gradient', 'gradient-mesh': 'gradient',
  trichrome: 'gradient',
  'roman-mosaic': 'material', 'fractured-glass': 'cellular',
  'cells-3d': 'cellular', 'wave-field': 'waves', maze: 'geometric',
  recursion: 'cellular'
};

export const SHADER_CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'geometric', label: 'Geometric' },
  { id: 'noise', label: 'Noise' },
  { id: 'cellular', label: 'Cellular' },
  { id: 'waves', label: 'Waves' },
  { id: 'material', label: 'Materials' },
  { id: 'fabric', label: 'Fabric' },
  { id: 'tech', label: 'Tech' },
  { id: 'sacred', label: 'Sacred' },
  { id: 'optical', label: 'Optical' },
  { id: 'nature', label: 'Nature' },
  { id: 'gradient', label: 'Gradient' }
];

// Patch presets with a category so downstream filtering stays simple.
// Respect an explicit `category` already set on the preset definition.
SHADER_PRESETS.forEach((p) => {
  if (!p.category) p.category = CATEGORY_MAP[p.id] || 'material';
});

export const getShaderPreset = (id) => SHADER_PRESETS.find((s) => s.id === id);

// Pick a random preset + random params/colors. Used by the ⚄ Randomize button.
export const randomShaderState = (current = {}) => {
  const preset = SHADER_PRESETS[Math.floor(Math.random() * SHADER_PRESETS.length)];
  const jitter = (v, spread) => v * (1 + (Math.random() - 0.5) * 2 * spread);
  // Pleasant random HSL palette.
  const randomHex = () => {
    const h = Math.random();
    const s = 0.4 + Math.random() * 0.45;
    const l = 0.15 + Math.random() * 0.7;
    const hue = h * 6;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((hue % 2) - 1));
    let r = 0, g = 0, b = 0;
    if (hue < 1) [r, g, b] = [c, x, 0];
    else if (hue < 2) [r, g, b] = [x, c, 0];
    else if (hue < 3) [r, g, b] = [0, c, x];
    else if (hue < 4) [r, g, b] = [0, x, c];
    else if (hue < 5) [r, g, b] = [x, 0, c];
    else [r, g, b] = [c, 0, x];
    const m = l - c / 2;
    const to = (v) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
    return `#${to(r)}${to(g)}${to(b)}`;
  };
  return {
    ...current,
    presetId: preset.id,
    code: preset.code,
    p1: jitter(preset.defaults.p1 || 1, 0.3),
    p2: jitter(preset.defaults.p2 || 1, 0.3),
    p3: jitter(preset.defaults.p3 || 1, 0.3),
    p4: jitter(preset.defaults.p4 || 1, 0.3),
    colorA: randomHex(),
    colorB: randomHex(),
    seed: Math.floor(Math.random() * 100)
  };
};

// ----- Persistent renderer -----------------------------------------------
// Reuses a single <canvas> + WebGL context across calls so we don't hit the
// browser's per-document context limit when rendering thumbnails or animating.

let _canvas = null;
let _gl = null;
let _vbo = null;

const ensureContext = (size) => {
  if (!_canvas) {
    _canvas = document.createElement('canvas');
  }
  if (_canvas.width !== size || _canvas.height !== size) {
    _canvas.width = size;
    _canvas.height = size;
  }
  if (!_gl || _gl.isContextLost?.()) {
    _gl = _canvas.getContext('webgl', { preserveDrawingBuffer: true, antialias: false });
    _vbo = null;
  }
  if (_gl && !_vbo) {
    _vbo = _gl.createBuffer();
    _gl.bindBuffer(_gl.ARRAY_BUFFER, _vbo);
    _gl.bufferData(_gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), _gl.STATIC_DRAW);
  }
  return _gl;
};

const hexToRgb = (hex) => {
  const v = (hex || '#000000').replace('#', '');
  const n = parseInt(
    v.length === 3 ? v.split('').map((c) => c + c).join('') : v,
    16
  );
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

const compile = (gl, type, src) => {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(log || 'Shader compile failed');
  }
  return shader;
};

export const renderShader = ({
  size = 512,
  body = '',
  params = {},
  colorA = '#ffffff',
  colorB = '#000000',
  colorC = '#ffffff',
  colorD = '#000000',
  time = 0,
  seed = 0
}) => {
  const gl = ensureContext(size);
  if (!gl) return { imageData: null, error: 'WebGL not available' };

  const fragSrc = `${FRAG_PRELUDE}
void main() {
${body}
}`;

  let program = null;
  try {
    const vs = compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    const fs = compile(gl, gl.FRAGMENT_SHADER, fragSrc);
    program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program) || 'Program link failed');
    }
    gl.useProgram(program);

    gl.bindBuffer(gl.ARRAY_BUFFER, _vbo);
    const loc = gl.getAttribLocation(program, 'aPosition');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const setF = (name, v) => {
      const l = gl.getUniformLocation(program, name);
      if (l) gl.uniform1f(l, v);
    };
    const setV2 = (name, a, b) => {
      const l = gl.getUniformLocation(program, name);
      if (l) gl.uniform2f(l, a, b);
    };
    const setV3 = (name, arr) => {
      const l = gl.getUniformLocation(program, name);
      if (l) gl.uniform3f(l, arr[0], arr[1], arr[2]);
    };

    setF('uTime', time);
    setF('uSeed', seed);
    setV2('uSize', size, size);
    setF('uP1', params.p1 ?? 0);
    setF('uP2', params.p2 ?? 0);
    setF('uP3', params.p3 ?? 0);
    setF('uP4', params.p4 ?? 0);
    setF('uP5', params.p5 ?? 0);
    setF('uP6', params.p6 ?? 0);
    setF('uP7', params.p7 ?? 0);
    setF('uP8', params.p8 ?? 0);
    setF('uP9', params.p9 ?? 0);
    setF('uP10', params.p10 ?? 0);
    setF('uP11', params.p11 ?? 0);
    setF('uP12', params.p12 ?? 0);
    setV3('uColorA', hexToRgb(colorA));
    setV3('uColorB', hexToRgb(colorB));
    setV3('uColorC', hexToRgb(colorC || '#ffffff'));
    setV3('uColorD', hexToRgb(colorD || '#000000'));

    gl.viewport(0, 0, size, size);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    const pixels = new Uint8Array(size * size * 4);
    gl.readPixels(0, 0, size, size, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

    // Flip rows (WebGL reads bottom-up).
    const out = new ImageData(size, size);
    for (let y = 0; y < size; y++) {
      const srcRow = (size - 1 - y) * size * 4;
      const dstRow = y * size * 4;
      out.data.set(pixels.subarray(srcRow, srcRow + size * 4), dstRow);
    }
    return { imageData: out, error: null };
  } catch (err) {
    return { imageData: null, error: String(err.message || err) };
  } finally {
    if (program) gl.deleteProgram(program);
  }
};

// Convenience: render a preset to a data URL (for thumbnail buttons).
export const renderPresetThumb = (preset, { size = 56, seed = 0 } = {}) => {
  const { imageData } = renderShader({
    size,
    body: preset.code,
    params: preset.defaults,
    colorA: preset.defaults.colorA,
    colorB: preset.defaults.colorB,
    seed
  });
  if (!imageData) return null;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  canvas.getContext('2d').putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
};
