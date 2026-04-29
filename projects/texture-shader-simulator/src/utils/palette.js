// Color helpers + favorites persistence.

const hexToRgb = (hex) => {
  const v = (hex || '#000000').replace('#', '');
  const n = parseInt(
    v.length === 3 ? v.split('').map((c) => c + c).join('') : v,
    16
  );
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const rgbToHex = ([r, g, b]) =>
  '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');

const rgbToHsl = ([r, g, b]) => {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0));
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return [h, s, l];
};

const hslToRgb = ([h, s, l]) => {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
};

export const shiftHue = (hex, degrees, sMul = 1, lDelta = 0) => {
  const [h, s, l] = rgbToHsl(hexToRgb(hex));
  return rgbToHex(
    hslToRgb([
      h + degrees,
      Math.max(0, Math.min(1, s * sMul)),
      Math.max(0, Math.min(1, l + lDelta))
    ])
  );
};

// Given a base hex color, return a harmonized partner color.
export const harmonize = (hex, type) => {
  switch (type) {
    case 'complement':
      return shiftHue(hex, 180);
    case 'analogous':
      return shiftHue(hex, 30);
    case 'triadic':
      return shiftHue(hex, 120);
    case 'splitA':
      return shiftHue(hex, 150);
    case 'splitB':
      return shiftHue(hex, 210);
    case 'mono-dark':
      return shiftHue(hex, 0, 0.8, -0.35);
    case 'mono-light':
      return shiftHue(hex, 0, 0.6, 0.35);
    case 'invert': {
      const [r, g, b] = hexToRgb(hex);
      return rgbToHex([255 - r, 255 - g, 255 - b]);
    }
    default:
      return hex;
  }
};

// --- Favorites -----------------------------------------------------------
const FAV_KEY = 'tss::favorites::v1';

export const loadFavorites = () => {
  try {
    return new Set(JSON.parse(localStorage.getItem(FAV_KEY) || '[]'));
  } catch {
    return new Set();
  }
};

export const saveFavorites = (set) => {
  try {
    localStorage.setItem(FAV_KEY, JSON.stringify([...set]));
  } catch {
    /* ignore */
  }
};
