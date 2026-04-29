// Tileable value noise with period-wrapped integer hash.
//
// The key idea: hash(i, j) mod period produces the SAME value at (i, j) and
// (i + period, j). So valueNoise sampled on a [0, period] × [0, period] grid
// wraps perfectly at the boundaries — no seams.

const TAU = Math.PI * 2;

const smooth = (t) => t * t * (3 - 2 * t);
const mod = (a, n) => ((a % n) + n) % n;

// Unbounded (non-seamless) hash + noise — still useful for internal helpers
// like warp offsets that don't need to tile.
const hash2 = (x, y, seed = 0) => {
  const h = Math.sin(x * 127.1 + y * 311.7 + seed * 19.19) * 43758.5453;
  return h - Math.floor(h);
};

export const valueNoise = (x, y, seed = 0) => {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const v00 = hash2(xi, yi, seed);
  const v10 = hash2(xi + 1, yi, seed);
  const v01 = hash2(xi, yi + 1, seed);
  const v11 = hash2(xi + 1, yi + 1, seed);
  const u = smooth(xf);
  const v = smooth(yf);
  return v00 * (1 - u) * (1 - v) + v10 * u * (1 - v) + v01 * (1 - u) * v + v11 * u * v;
};

export const fbm = (x, y, octaves = 5, lacunarity = 2.0, gain = 0.5, seed = 0) => {
  let sum = 0;
  let amp = 1;
  let freq = 1;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += valueNoise(x * freq, y * freq, seed + i * 7) * amp;
    norm += amp;
    amp *= gain;
    freq *= lacunarity;
  }
  return sum / norm;
};

// --- Seamless (period-wrapped) variants ----------------------------------

// Hash that wraps integer coordinates at `period` — the foundation of tiling.
const hashP = (x, y, period, seed = 0) => {
  const xw = mod(x, period);
  const yw = mod(y, period);
  const h = Math.sin(xw * 127.1 + yw * 311.7 + seed * 19.19) * 43758.5453;
  return h - Math.floor(h);
};

// Tileable value noise: argument `period` should be an integer; at u=1 the
// hash lookups land on cell `(period, ...)` which mods to cell `0` — same as u=0.
export const seamlessNoise = (u, v, period = 4, seed = 0) => {
  const P = Math.max(1, Math.round(period));
  const x = u * P;
  const y = v * P;
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const v00 = hashP(xi, yi, P, seed);
  const v10 = hashP(xi + 1, yi, P, seed);
  const v01 = hashP(xi, yi + 1, P, seed);
  const v11 = hashP(xi + 1, yi + 1, P, seed);
  const su = smooth(xf);
  const sv = smooth(yf);
  return v00 * (1 - su) * (1 - sv) + v10 * su * (1 - sv) + v01 * (1 - su) * sv + v11 * su * sv;
};

export const seamlessFbm = (u, v, period = 4, octaves = 5, gain = 0.5, seed = 0) => {
  let sum = 0;
  let amp = 1;
  let freqMul = 1;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += seamlessNoise(u, v, period * freqMul, seed + i * 7) * amp;
    norm += amp;
    amp *= gain;
    freqMul *= 2;
  }
  return sum / norm;
};

export const seamlessRidge = (u, v, period = 4, octaves = 5, seed = 0) => {
  let sum = 0;
  let amp = 1;
  let freqMul = 1;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    const n = 1 - Math.abs(seamlessNoise(u, v, period * freqMul, seed + i * 7) * 2 - 1);
    sum += n * n * amp;
    norm += amp;
    amp *= 0.5;
    freqMul *= 2;
  }
  return sum / norm;
};

// Seamless cellular / Worley noise. Returns distance to the closest feature point
// in the tiled cell grid. `cells` is the integer cell count across [0,1].
export const seamlessWorley = (u, v, cells = 6, seed = 0) => {
  const C = Math.max(2, Math.round(cells));
  const x = u * C;
  const y = v * C;
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  let md = Infinity;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const cx = ix + dx;
      const cy = iy + dy;
      const ox = hashP(cx, cy, C, seed);
      const oy = hashP(cx + 17, cy + 31, C, seed + 11);
      const rx = dx + ox - fx;
      const ry = dy + oy - fy;
      const d = rx * rx + ry * ry;
      if (d < md) md = d;
    }
  }
  return Math.sqrt(md);
};

export { TAU };
