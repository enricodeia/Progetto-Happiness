// Procedural preset generators. Each returns an ImageData (RGBA).
// All presets are seamless: sampling at u=0 matches u=1 (and same for v),
// so the material tiles cleanly on any geometry.

import { seamlessFbm, seamlessRidge, seamlessNoise } from './noise.js';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const TAU = Math.PI * 2;

const setPixel = (data, i, r, g, b) => {
  data[i] = r;
  data[i + 1] = g;
  data[i + 2] = b;
  data[i + 3] = 255;
};

const mixColor = (a, b, t) => [
  a[0] * (1 - t) + b[0] * t,
  a[1] * (1 - t) + b[1] * t,
  a[2] * (1 - t) + b[2] * t
];

const makeCanvasImageData = (size, fill) => {
  const img = new ImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const u = x / size;
      const v = y / size;
      const [r, g, b] = fill(u, v);
      setPixel(img.data, i, clamp(r, 0, 255), clamp(g, 0, 255), clamp(b, 0, 255));
    }
  }
  return img;
};

// --- Individual presets --------------------------------------------------
// Every preset ONLY uses functions that are periodic in u/v to avoid seams:
//   - seamlessFbm / seamlessRidge / seamlessNoise
//   - sin(k * TAU * u), cos(k * TAU * v) with integer k

const sand = (size) =>
  makeCanvasImageData(size, (u, v) => {
    const n = seamlessFbm(u, v, 18, 5);
    const grain = seamlessNoise(u, v, 200) * 0.15;
    const t = clamp(n * 0.85 + grain + 0.1, 0, 1);
    return mixColor([196, 162, 108], [235, 210, 160], t);
  });

const wood = (size) =>
  makeCanvasImageData(size, (u, v) => {
    // Concentric rings warped by noise. Use sin on u with integer cycles
    // so the pattern wraps; warp field is itself seamless.
    const warp = seamlessFbm(u, v, 3, 3) * 0.2;
    const rings = Math.sin((u + warp) * 40 * TAU) * 0.5 + 0.5;
    const grain = seamlessNoise(u, v, 300) * 0.2;
    const t = clamp(rings * 0.7 + grain, 0, 1);
    return mixColor([82, 49, 27], [168, 118, 70], t);
  });

const stone = (size) =>
  makeCanvasImageData(size, (u, v) => {
    const base = seamlessFbm(u, v, 10, 5);
    const r = seamlessRidge(u, v, 6, 4) * 0.4;
    const t = clamp(base + r, 0, 1);
    return mixColor([70, 72, 78], [150, 150, 155], t);
  });

const metal = (size) =>
  makeCanvasImageData(size, (u, v) => {
    const brushed = Math.sin(v * 400 * TAU) * 0.02 + 0.5;
    const scratches = seamlessNoise(u, v, 500) * 0.1;
    const n = seamlessFbm(u, v, 4, 3) * 0.2;
    const t = clamp(brushed + scratches + n * 0.2, 0, 1);
    return mixColor([120, 122, 128], [210, 214, 220], t);
  });

const fabric = (size) =>
  makeCanvasImageData(size, (u, v) => {
    // Weave: product of two sine waves at integer frequencies -> seamless.
    const weave =
      (Math.sin(u * 60 * TAU) * Math.sin(v * 60 * TAU)) * 0.5 + 0.5;
    const n = seamlessFbm(u, v, 12, 3) * 0.3;
    const t = clamp(weave * 0.6 + n, 0, 1);
    return mixColor([50, 40, 80], [160, 130, 210], t);
  });

const brick = (size) =>
  makeCanvasImageData(size, (u, v) => {
    // 6 columns, 10 rows; staggered rows. All integer counts -> seamless.
    const row = Math.floor(v * 10);
    const offset = row % 2 === 0 ? 0 : 0.5;
    const bx = ((u + offset) * 6) % 1;
    const by = (v * 10) % 1;
    const mortar = 0.06;
    const inBrick = bx > mortar && bx < 1 - mortar && by > mortar && by < 1 - mortar;
    const n = seamlessFbm(u, v, 40, 4);
    if (!inBrick) {
      const t = clamp(0.3 + n * 0.2, 0, 1);
      return mixColor([60, 60, 60], [120, 120, 120], t);
    }
    const t = clamp(0.3 + n * 0.7, 0, 1);
    return mixColor([130, 50, 35], [200, 100, 75], t);
  });

const concrete = (size) =>
  makeCanvasImageData(size, (u, v) => {
    const base = seamlessFbm(u, v, 8, 5);
    const pits = seamlessNoise(u, v, 120);
    const pitMask = pits < 0.15 ? 0.3 : 1;
    const t = clamp(base * pitMask * 0.8 + 0.1, 0, 1);
    return mixColor([110, 110, 112], [190, 190, 192], t);
  });

const marble = (size) =>
  makeCanvasImageData(size, (u, v) => {
    const turbulence = seamlessFbm(u, v, 4, 6) * 4;
    // Integer cycle count keeps the vein pattern periodic.
    const veins = Math.abs(
      Math.sin((u * 6 + turbulence * 0.2) * TAU)
    );
    const t = clamp(1 - Math.pow(veins, 2), 0, 1);
    const base = seamlessFbm(u, v, 2, 3);
    return mixColor(
      [235, 235, 230],
      [120, 120, 115],
      clamp(t * 0.7 + base * 0.3, 0, 1)
    );
  });

const leather = (size) =>
  makeCanvasImageData(size, (u, v) => {
    const cells = seamlessRidge(u, v, 30, 3);
    const n = seamlessFbm(u, v, 8, 4);
    const t = clamp(cells * 0.6 + n * 0.4, 0, 1);
    return mixColor([60, 30, 20], [140, 80, 55], t);
  });

const rust = (size) =>
  makeCanvasImageData(size, (u, v) => {
    const patches = seamlessFbm(u, v, 6, 5);
    const fine = seamlessNoise(u, v, 200) * 0.2;
    const t = clamp(patches + fine, 0, 1);
    return mixColor([55, 25, 15], [200, 95, 40], t);
  });

const grass = (size) =>
  makeCanvasImageData(size, (u, v) => {
    const blades = seamlessFbm(u, v, 40, 4);
    const patches = seamlessFbm(u, v, 4, 3);
    const t = clamp(blades * 0.6 + patches * 0.4, 0, 1);
    return mixColor([35, 60, 25], [120, 170, 60], t);
  });

const snow = (size) =>
  makeCanvasImageData(size, (u, v) => {
    const sparkle = seamlessNoise(u, v, 400);
    const drifts = seamlessFbm(u, v, 6, 4);
    const t = clamp(0.85 + sparkle * 0.1 + drifts * 0.1, 0, 1);
    return mixColor([220, 225, 235], [255, 255, 255], t);
  });

// --- Registry ------------------------------------------------------------

export const PRESETS = [
  {
    id: 'sand',
    label: 'Sand',
    generate: sand,
    params: { roughnessBase: 0.9, roughnessVariation: 0.3, normalStrength: 1.5 }
  },
  {
    id: 'wood',
    label: 'Wood',
    generate: wood,
    params: { roughnessBase: 0.6, roughnessVariation: 0.5, normalStrength: 2 }
  },
  {
    id: 'stone',
    label: 'Stone',
    generate: stone,
    params: { roughnessBase: 0.85, roughnessVariation: 0.3, normalStrength: 3 }
  },
  {
    id: 'metal',
    label: 'Brushed Metal',
    generate: metal,
    params: {
      roughnessBase: 0.35,
      roughnessVariation: 0.3,
      normalStrength: 0.8,
      metalness: 0.9
    }
  },
  {
    id: 'fabric',
    label: 'Fabric',
    generate: fabric,
    params: { roughnessBase: 0.8, roughnessVariation: 0.2, normalStrength: 1.2 }
  },
  {
    id: 'brick',
    label: 'Brick',
    generate: brick,
    params: { roughnessBase: 0.9, roughnessVariation: 0.2, normalStrength: 3.5 }
  },
  {
    id: 'concrete',
    label: 'Concrete',
    generate: concrete,
    params: { roughnessBase: 0.9, roughnessVariation: 0.15, normalStrength: 2 }
  },
  {
    id: 'marble',
    label: 'Marble',
    generate: marble,
    params: { roughnessBase: 0.25, roughnessVariation: 0.1, normalStrength: 0.5 }
  },
  {
    id: 'leather',
    label: 'Leather',
    generate: leather,
    params: { roughnessBase: 0.7, roughnessVariation: 0.3, normalStrength: 1.8 }
  },
  {
    id: 'rust',
    label: 'Rust',
    generate: rust,
    params: {
      roughnessBase: 0.8,
      roughnessVariation: 0.4,
      normalStrength: 2,
      metalness: 0.2
    }
  },
  {
    id: 'grass',
    label: 'Grass',
    generate: grass,
    params: { roughnessBase: 0.95, roughnessVariation: 0.2, normalStrength: 1.5 }
  },
  {
    id: 'snow',
    label: 'Snow',
    generate: snow,
    params: { roughnessBase: 0.5, roughnessVariation: 0.2, normalStrength: 0.8 }
  }
];

export const getPreset = (id) => PRESETS.find((p) => p.id === id);
