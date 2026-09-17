// Vendored verbatim from the bowl studio (bowl-studio-source 2/src/noise.glsl.js).
// Maxon-compatible procedural noise in GLSL: the hammered relief on the outer
// shell and the gaseous colour ramp inside are both this, evaluated per pixel.
// ---------------------------------------------------------------------------
export const NOISE_ID = {
  'Perlin': 0, 'Turbulence': 1, 'Gaseous': 2, 'Ridged': 3, 'Dents': 4,
  'Voronoi 1': 5, 'Voronoi 2': 6, 'Cell': 7, 'Marble': 8, 'Wood': 9
};

export const NOISE_GLSL = /* glsl */`
#ifndef BS_NOISE_INCLUDED
#define BS_NOISE_INCLUDED
#define BS_MAX_OCT 16

struct BsNoise {
  vec3  scale;      // per-axis scale
  vec3  offset;     // domain offset
  vec3  rot;        // euler XYZ, radians
  float type;
  float seed;
  float octaves;
  float lacunarity;
  float gain;
  float exponent;
  float absolute;   // 0/1
  float oscale;     // global scale, per cent
  float cycles;
  float lowClip;
  float highClip;
  float brightness;
  float contrast;
  float enabled;
};

// -- hashing ----------------------------------------------------------------
vec3 bsHash33(vec3 p) {
  p = vec3(dot(p, vec3(127.1, 311.7, 74.7)),
           dot(p, vec3(269.5, 183.3, 246.1)),
           dot(p, vec3(113.5, 271.9, 124.6)));
  return fract(sin(p) * 43758.5453123);
}
float bsHash13(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
vec3 bsGrad(vec3 p) { return normalize(bsHash33(p) * 2.0 - 1.0); }

// -- classic gradient (Perlin) noise, -1..1 ---------------------------------
float bsPerlin(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  vec3 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float n000 = dot(bsGrad(i + vec3(0,0,0)), f - vec3(0,0,0));
  float n100 = dot(bsGrad(i + vec3(1,0,0)), f - vec3(1,0,0));
  float n010 = dot(bsGrad(i + vec3(0,1,0)), f - vec3(0,1,0));
  float n110 = dot(bsGrad(i + vec3(1,1,0)), f - vec3(1,1,0));
  float n001 = dot(bsGrad(i + vec3(0,0,1)), f - vec3(0,0,1));
  float n101 = dot(bsGrad(i + vec3(1,0,1)), f - vec3(1,0,1));
  float n011 = dot(bsGrad(i + vec3(0,1,1)), f - vec3(0,1,1));
  float n111 = dot(bsGrad(i + vec3(1,1,1)), f - vec3(1,1,1));
  float nx00 = mix(n000, n100, u.x), nx10 = mix(n010, n110, u.x);
  float nx01 = mix(n001, n101, u.x), nx11 = mix(n011, n111, u.x);
  return mix(mix(nx00, nx10, u.y), mix(nx01, nx11, u.y), u.z) * 1.1547;
}

// -- Worley / cellular: returns (F1, F2, cellRandom) -------------------------
// F1 is accumulated with an exponential smooth-min. A hard min gives every cell
// a constant gradient, so the relief reads as flat polygonal facets; the smooth
// version rounds the ridges into the dimples a hammered surface actually has.
// .y (F2) keeps the hard minimum so Voronoi 2 still has crisp edges.
#define BS_SMIN_K 7.0
vec3 bsWorley(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  float f1 = 8.0, f2 = 8.0, id = 0.0, acc = 0.0;
  for (int z = -1; z <= 1; z++)
  for (int y = -1; y <= 1; y++)
  for (int x = -1; x <= 1; x++) {
    vec3 g = vec3(float(x), float(y), float(z));
    vec3 o = bsHash33(i + g);
    vec3 d = g + o - f;
    float dist = length(d);
    acc += exp(-BS_SMIN_K * dist);
    if (dist < f1) { f2 = f1; f1 = dist; id = bsHash13(i + g); }
    else if (dist < f2) { f2 = dist; }
  }
  float smin = -log(max(acc, 1e-9)) / BS_SMIN_K;
  return vec3(max(smin, 0.0), f2, id);
}

// -- base noise selector, all normalised to 0..1 ----------------------------
float bsBase(vec3 p, float type) {
  int t = int(type + 0.5);
  if (t == 0) return 0.5 + 0.5 * bsPerlin(p);                        // Perlin
  if (t == 1) return abs(bsPerlin(p));                               // Turbulence
  if (t == 2) return 0.5 + 0.5 * bsPerlin(p);                        // Gaseous band (composed later)
  if (t == 3) { float n = 1.0 - abs(bsPerlin(p)); return n * n; }    // Ridged
  if (t == 4) { float n = abs(bsPerlin(p)); n = 1.0 - n; return n * n * n; } // Dents
  if (t == 5) return clamp(bsWorley(p).x * 1.35, 0.0, 1.0);          // Voronoi 1  (smooth F1)
  if (t == 6) { vec3 w = bsWorley(p); return clamp(w.y - w.x, 0.0, 1.0); } // Voronoi 2 (F2-F1)
  if (t == 7) return bsWorley(p).z;                                  // Cell (flat per-cell value)
  if (t == 8) {                                                      // Marble
    float turb = abs(bsPerlin(p)) + 0.5 * abs(bsPerlin(p * 2.03));
    return 0.5 + 0.5 * sin((p.x + turb * 3.0) * 3.14159265);
  }
  // Wood
  float turb = abs(bsPerlin(p * 0.9)) * 1.4;
  float r = length(p.xz) + turb;
  return 0.5 + 0.5 * sin(r * 6.2831853);
}

// -- fractal sum, fractional octave count ------------------------------------
float bsFbm(vec3 p, BsNoise N, float type) {
  float sum = 0.0, amp = 1.0, freq = 1.0, tot = 0.0;
  float oct = clamp(N.octaves, 0.0, float(BS_MAX_OCT));
  for (int i = 0; i < BS_MAX_OCT; i++) {
    float fi = float(i);
    if (fi >= oct) break;
    float w = clamp(oct - fi, 0.0, 1.0);          // fractional final octave
    vec3 sp = p * freq + vec3(fi * 17.13 + N.seed * 0.618, fi * 31.7 + N.seed * 0.271, fi * 11.9 + N.seed * 0.917);
    float n = bsBase(sp, type);
    if (N.absolute > 0.5) n = abs(n * 2.0 - 1.0);
    sum += n * amp * w;
    tot += amp * w;
    amp *= N.gain;
    freq *= N.lacunarity;
  }
  return tot > 0.0 ? sum / tot : 0.0;
}

mat3 bsRotMat(vec3 r) {
  float cx = cos(r.x), sx = sin(r.x);
  float cy = cos(r.y), sy = sin(r.y);
  float cz = cos(r.z), sz = sin(r.z);
  // GLSL mat3(...) takes COLUMNS — these are the column-major forms of the
  // usual row-major rotation matrices.
  mat3 rx = mat3(1.0, 0.0, 0.0,   0.0,  cx,  sx,   0.0, -sx,  cx);
  mat3 ry = mat3( cy, 0.0, -sy,   0.0, 1.0, 0.0,    sy, 0.0,  cy);
  mat3 rz = mat3( cz,  sz, 0.0,   -sz,  cz, 0.0,   0.0, 0.0, 1.0);
  return rz * ry * rx;
}

// -- the full pipeline -------------------------------------------------------
float bsNoise(vec3 pw, BsNoise N) {
  if (N.enabled < 0.5) return 0.0;
  vec3 p = bsRotMat(N.rot) * pw;
  p = p * N.scale + N.offset;
  p /= max(N.oscale, 0.0001) * 0.01;          // "global scale" is a per cent

  // Per-type natural frequency. In C4D the noise types do not share a feature
  // size at the same Global Scale — the cellular family (Voronoi 1/2, Cell) has
  // far larger natural cells than the Perlin family, which is why a hammered
  // relief needs a Global Scale near 10% while a gaseous ramp needs ~270%.
  // 0.123 is calibrated against the supplied hammered normal map: its radial
  // FFT peaks at 15 cycles across the texture, and the map reads right on this
  // bowl at 3x tiling — ~45 dimples around a 4.4-unit circumference, a 0.098
  // unit period. That is what the default Voronoi relief produces here at
  // Global Scale 9.67% and noise space 8.
  {
    int bt = int(N.type + 0.5);
    if (bt >= 5 && bt <= 7) p *= 0.123;
  }

  float v;
  int t = int(N.type + 0.5);
  if (t == 2) {
    // Gaseous: two turbulent bands folded through a sine
    float g = bsFbm(p, N, 1.0);
    float d = bsFbm(p * 2.7, N, 1.0);
    v = mix(0.5 + 0.5 * g, 0.5 + 0.5 * sin((g * 2.3 + d * 3.4) * 3.14159265), 0.62);
  } else {
    v = bsFbm(p, N, N.type);
  }

  v = clamp(v, 0.0, 1.0);
  if (abs(N.exponent - 1.0) > 0.0001) v = pow(v, max(N.exponent, 0.0001));
  if (N.cycles > 1.0001) v = 1.0 - abs(1.0 - 2.0 * fract(v * N.cycles * 0.5));   // triangle, stays continuous
  float lo = N.lowClip, hi = max(N.highClip, N.lowClip + 1e-4);
  v = clamp((v - lo) / (hi - lo), 0.0, 1.0);
  v = (v - 0.5) * (1.0 + N.contrast) + 0.5 + N.brightness;
  return clamp(v, 0.0, 1.0);
}
#endif
`;

/** Flatten a JS noise param object into the uniform struct value. */
export function noiseUniform(n, enabled = true) {
  const d = Math.PI / 180;
  return {
    scale: n.scale, offset: n.offset,
    rot: [n.rotation[0] * d, n.rotation[1] * d, n.rotation[2] * d],
    type: NOISE_ID[n.type] ?? 0,
    seed: n.seed, octaves: n.octaves, lacunarity: n.lacunarity, gain: n.gain,
    exponent: n.exponent, absolute: n.absolute ? 1 : 0, oscale: n.oscale,
    cycles: n.cycles, lowClip: n.lowClip, highClip: n.highClip,
    brightness: n.brightness, contrast: n.contrast,
    enabled: enabled ? 1 : 0
  };
}
