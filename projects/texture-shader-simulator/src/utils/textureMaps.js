// Pure canvas-based texture-map generation.
// Input: an ImageData (the "source" image, interpreted as color).
// Output: { diffuse, height, normal, roughness, ao, displacement } as ImageData.
//
// Every filter samples with WRAP addressing, and uploaded images get
// mirror-blended at the borders so tiling never shows a visible seam.

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

const luminance = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

// Positive-modulo (handles negative indices).
const wrap = (x, n) => ((x % n) + n) % n;

export const toImageData = (canvas) => {
  const ctx = canvas.getContext('2d');
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
};

export const cloneImageData = (src) => {
  const out = new ImageData(src.width, src.height);
  out.data.set(src.data);
  return out;
};

// Make any source seamless by mirror-blending near the edges.
// `strength` in [0,1] controls how far the blend reaches (fraction of size).
export const makeSeamless = (source, strength = 0.2) => {
  const { width, height, data } = source;
  const out = new ImageData(width, height);
  out.data.set(data);

  if (strength <= 0) return out;

  const rx = Math.max(1, Math.floor(width * strength));
  const ry = Math.max(1, Math.floor(height * strength));

  const getPixel = (src, x, y) => {
    const i = (y * width + x) * 4;
    return [src[i], src[i + 1], src[i + 2]];
  };
  const setP = (x, y, rgb) => {
    const i = (y * width + x) * 4;
    out.data[i] = rgb[0];
    out.data[i + 1] = rgb[1];
    out.data[i + 2] = rgb[2];
    out.data[i + 3] = 255;
  };
  const lerp = (a, b, t) => a * (1 - t) + b * t;
  const mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

  // Horizontal mirror blend (left <-> right seam).
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < rx; x++) {
      const t = 0.5 * (1 - x / rx); // fades from 0.5 at the edge -> 0 at rx
      const a = getPixel(data, x, y);
      const b = getPixel(data, width - 1 - x, y);
      setP(x, y, mix(a, b, t));
      setP(width - 1 - x, y, mix(b, a, t));
    }
  }

  // Vertical mirror blend (top <-> bottom seam). Reads from `out` so the
  // horizontal blend is already applied at corners.
  const buf = new Uint8ClampedArray(out.data);
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < ry; y++) {
      const t = 0.5 * (1 - y / ry);
      const a = getPixel(buf, x, y);
      const b = getPixel(buf, x, height - 1 - y);
      setP(x, y, mix(a, b, t));
      setP(x, height - 1 - y, mix(b, a, t));
    }
  }

  return out;
};

// Adjust brightness/contrast/saturation on the source.
export const buildDiffuse = (source, { brightness = 0, contrast = 0, saturation = 1 } = {}) => {
  const { width, height, data } = source;
  const out = new ImageData(width, height);
  const c = 1 + contrast;
  const b = brightness * 255;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let bl = data[i + 2];

    const l = luminance(r, g, bl);
    r = l + (r - l) * saturation;
    g = l + (g - l) * saturation;
    bl = l + (bl - l) * saturation;

    r = (r - 128) * c + 128 + b;
    g = (g - 128) * c + 128 + b;
    bl = (bl - 128) * c + 128 + b;

    out.data[i] = clamp(r, 0, 255);
    out.data[i + 1] = clamp(g, 0, 255);
    out.data[i + 2] = clamp(bl, 0, 255);
    out.data[i + 3] = 255;
  }
  return out;
};

// Heightmap = grayscale luminance with levels + optional invert.
export const buildHeight = (source, { invert = false, levels = 1 } = {}) => {
  const { width, height, data } = source;
  const out = new ImageData(width, height);

  for (let i = 0; i < data.length; i += 4) {
    let l = luminance(data[i], data[i + 1], data[i + 2]) / 255;
    if (levels !== 1) l = Math.pow(l, 1 / levels);
    if (invert) l = 1 - l;
    const v = clamp(l * 255, 0, 255);
    out.data[i] = v;
    out.data[i + 1] = v;
    out.data[i + 2] = v;
    out.data[i + 3] = 255;
  }
  return out;
};

// Normal map via Sobel on heightmap. Samples WRAP so there's no seam.
export const buildNormal = (heightMap, { strength = 2, invertY = false } = {}) => {
  const { width, height, data } = heightMap;
  const out = new ImageData(width, height);

  const getH = (x, y) => {
    const xi = wrap(x, width);
    const yi = wrap(y, height);
    return data[(yi * width + xi) * 4] / 255;
  };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const tl = getH(x - 1, y - 1);
      const l = getH(x - 1, y);
      const bl = getH(x - 1, y + 1);
      const tr = getH(x + 1, y - 1);
      const r = getH(x + 1, y);
      const br = getH(x + 1, y + 1);
      const t = getH(x, y - 1);
      const b = getH(x, y + 1);

      const dx = (tr + 2 * r + br) - (tl + 2 * l + bl);
      let dy = (bl + 2 * b + br) - (tl + 2 * t + tr);
      if (invertY) dy = -dy;

      const nx = -dx * strength;
      const ny = -dy * strength;
      const nz = 1;
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;

      const i = (y * width + x) * 4;
      out.data[i] = ((nx / len) * 0.5 + 0.5) * 255;
      out.data[i + 1] = ((ny / len) * 0.5 + 0.5) * 255;
      out.data[i + 2] = ((nz / len) * 0.5 + 0.5) * 255;
      out.data[i + 3] = 255;
    }
  }
  return out;
};

export const buildRoughness = (source, { base = 0.5, variation = 0.5, invert = false } = {}) => {
  const { width, height, data } = source;
  const out = new ImageData(width, height);

  for (let i = 0; i < data.length; i += 4) {
    let l = luminance(data[i], data[i + 1], data[i + 2]) / 255;
    if (invert) l = 1 - l;
    const v = clamp((base + (l - 0.5) * variation) * 255, 0, 255);
    out.data[i] = v;
    out.data[i + 1] = v;
    out.data[i + 2] = v;
    out.data[i + 3] = 255;
  }
  return out;
};

// AO: wrap-aware box-blur of heightmap, darker where the pixel sits in a crevice.
export const buildAO = (heightMap, { strength = 1, radius = 2 } = {}) => {
  const { width, height, data } = heightMap;
  const out = new ImageData(width, height);

  const getH = (x, y) => {
    const xi = wrap(x, width);
    const yi = wrap(y, height);
    return data[(yi * width + xi) * 4] / 255;
  };

  const r = Math.max(1, Math.round(radius));
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      let n = 0;
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          sum += getH(x + dx, y + dy);
          n++;
        }
      }
      const avg = sum / n;
      const self = getH(x, y);
      const occ = clamp(1 - (avg - self) * strength * 4, 0, 1);
      const v = clamp(occ * 255, 0, 255);
      const i = (y * width + x) * 4;
      out.data[i] = v;
      out.data[i + 1] = v;
      out.data[i + 2] = v;
      out.data[i + 3] = 255;
    }
  }
  return out;
};

// Displacement map: gamma-adjusted height, usable as bumpMap AND for real
// vertex displacement (mesh extrusion). Returned as grayscale ImageData.
export const buildDisplacement = (heightMap, { gamma = 1, bias = 0 } = {}) => {
  const { width, height, data } = heightMap;
  const out = new ImageData(width, height);
  for (let i = 0; i < data.length; i += 4) {
    let l = data[i] / 255;
    l = Math.pow(l, gamma);
    l = clamp(l + bias, 0, 1);
    const v = l * 255;
    out.data[i] = v;
    out.data[i + 1] = v;
    out.data[i + 2] = v;
    out.data[i + 3] = 255;
  }
  return out;
};

// Wrap-aware separable box blur — fast O(w*h*r) approximation of gaussian
// that we use to smooth the height map before computing normals. This is the
// standard trick to avoid pixelated/aliased shading on coarse heightmaps.
export const blurImageData = (imageData, radius = 1) => {
  if (radius <= 0) return imageData;
  const { width, height, data } = imageData;
  const r = Math.max(1, Math.round(radius));
  const tmp = new Uint8ClampedArray(data);
  const out = new ImageData(width, height);
  out.data.set(data);

  // horizontal pass — into out
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let s = 0;
      for (let k = -r; k <= r; k++) {
        const xi = wrap(x + k, width);
        s += data[(y * width + xi) * 4];
      }
      const v = s / (r * 2 + 1);
      const i = (y * width + x) * 4;
      out.data[i] = v; out.data[i + 1] = v; out.data[i + 2] = v; out.data[i + 3] = 255;
    }
  }
  // vertical pass — read out, write tmp, then copy back
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let s = 0;
      for (let k = -r; k <= r; k++) {
        const yi = wrap(y + k, height);
        s += out.data[(yi * width + x) * 4];
      }
      tmp[(y * width + x) * 4] = s / (r * 2 + 1);
    }
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const v = tmp[(y * width + x) * 4];
      const i = (y * width + x) * 4;
      out.data[i] = v; out.data[i + 1] = v; out.data[i + 2] = v; out.data[i + 3] = 255;
    }
  }
  return out;
};

// Composite an engraving mask into a height map. White pixels in the mask
// represent maximum cut (engrave) or maximum raise (emboss).
export const applyEngravingToHeight = (heightMap, engravingMap, depth = 0.5, mode = 'engrave') => {
  if (!engravingMap) return heightMap;
  const { width, height, data } = heightMap;
  const out = new ImageData(width, height);
  const sign = mode === 'engrave' ? -1 : 1;
  for (let i = 0; i < data.length; i += 4) {
    const baseH = data[i] / 255;
    const eng = engravingMap.data[i] / 255;
    const v = clamp(baseH + sign * eng * depth, 0, 1) * 255;
    out.data[i] = v;
    out.data[i + 1] = v;
    out.data[i + 2] = v;
    out.data[i + 3] = 255;
  }
  return out;
};

// Darken the diffuse where the engraving cut goes — simulates dust/shadow
// accumulating in the carved groove. `darken` ∈ [0,1].
export const applyEngravingToDiffuse = (diffuseMap, engravingMap, darken = 0.4) => {
  if (!engravingMap || darken <= 0) return diffuseMap;
  const { width, height, data } = diffuseMap;
  const out = new ImageData(width, height);
  for (let i = 0; i < data.length; i += 4) {
    const eng = engravingMap.data[i] / 255;
    const factor = 1 - eng * darken;
    out.data[i] = data[i] * factor;
    out.data[i + 1] = data[i + 1] * factor;
    out.data[i + 2] = data[i + 2] * factor;
    out.data[i + 3] = 255;
  }
  return out;
};

// Master pipeline.
export const generateMaps = (source, params = {}, engraving = null) => {
  const {
    brightness = 0,
    contrast = 0,
    saturation = 1,
    heightInvert = false,
    heightLevels = 1,
    normalStrength = 2,
    normalInvertY = false,
    roughnessBase = 0.5,
    roughnessVariation = 0.5,
    roughnessInvert = false,
    aoStrength = 1,
    aoRadius = 2,
    displacementGamma = 1,
    displacementBias = 0
  } = params;

  const baseDiffuse = buildDiffuse(source, { brightness, contrast, saturation });
  const baseHeight = buildHeight(source, { invert: heightInvert, levels: heightLevels });

  // Engraving overlay folded into the height + diffuse before computing the
  // derived maps (normal/AO/displacement) so the inscription gets real shading.
  const engravingDepth = params.engravingDepth ?? 0.6;
  const engravingMode = params.engravingMode ?? 'engrave';
  const engravingDarken = params.engravingDarken ?? 0.4;
  const height = applyEngravingToHeight(baseHeight, engraving, engravingDepth, engravingMode);
  const diffuse = applyEngravingToDiffuse(baseDiffuse, engraving, engravingDarken);

  // Optional gaussian-style smoothing on the height before computing the
  // normal map — this is what gives professional PBR materials their soft,
  // photographic shading instead of jagged pixel-derivatives.
  const smoothing = params.normalSmoothing ?? 0;
  const heightForNormal = smoothing > 0 ? blurImageData(height, smoothing) : height;
  const normal = buildNormal(heightForNormal, { strength: normalStrength, invertY: normalInvertY });
  const roughness = buildRoughness(source, {
    base: roughnessBase,
    variation: roughnessVariation,
    invert: roughnessInvert
  });
  const ao = buildAO(height, { strength: aoStrength, radius: aoRadius });
  const displacement = buildDisplacement(height, {
    gamma: displacementGamma,
    bias: displacementBias
  });

  return { diffuse, height, normal, roughness, ao, displacement };
};

export const imageDataToDataURL = (imageData) => {
  const canvas = document.createElement('canvas');
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  canvas.getContext('2d').putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
};

export const imageDataToCanvas = (imageData) => {
  const canvas = document.createElement('canvas');
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  canvas.getContext('2d').putImageData(imageData, 0, 0);
  return canvas;
};

export const loadImageToImageData = (src, size = 512) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, size, size);
      resolve(ctx.getImageData(0, 0, size, size));
    };
    img.onerror = reject;
    img.src = typeof src === 'string' ? src : URL.createObjectURL(src);
  });
