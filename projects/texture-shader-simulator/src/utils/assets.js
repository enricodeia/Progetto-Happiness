// Named asset slots — let the user save the current material configuration
// (mode, shader, material, gen) and recall it later. Stored in localStorage.

const KEY = 'tss::assets::v1';

export const loadAssets = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
};

export const saveAssets = (list) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* ignore quota */
  }
};

// Build a tiny PNG preview of the current diffuse map for the slot thumbnail.
export const buildThumbFromCanvas = (canvas, size = 96) => {
  if (!canvas) return null;
  const out = document.createElement('canvas');
  out.width = size;
  out.height = size;
  const ctx = out.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(canvas, 0, 0, size, size);
  return out.toDataURL('image/png');
};

export const newAsset = ({ name, state, thumb }) => ({
  id: Math.random().toString(36).slice(2, 10),
  name: (name || 'Untitled').slice(0, 40),
  createdAt: Date.now(),
  thumb,
  state
});
