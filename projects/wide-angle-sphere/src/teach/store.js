// localStorage for the teach page: the live config (so a Vite reload never
// costs you a tuning session) and the saved presets (so you can keep several
// alternatives side by side and flip between them).
//
// Two keys, both versioned so a shape change can be dropped rather than
// crash-loop on a stale value:
//
//   tch.live.v1     the working config, rewritten on every panel change
//   tch.presets.v1  [{ id, name, ts, config, thumb }] — thumb is a webp
//                   data URL of the framing region, grabbed off the canvas
//
// Every read is defensive: a corrupt or half-written value is treated as
// "nothing saved" rather than thrown, because losing a session to a parse
// error is exactly what this file exists to prevent.

const LIVE_KEY = "tch.live.v1";
const PRESETS_KEY = "tch.presets.v1";

const read = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const v = JSON.parse(raw);
    return v ?? fallback;
  } catch {
    return fallback;
  }
};

const write = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    // quota, private mode, disabled storage — the page still works
    return false;
  }
};

/** Deep-assign in place. The panel holds references to the live sub-objects,
 *  so restoring has to MUTATE them, never replace them. Keys the target does
 *  not have are ignored, so an old save cannot inject a stale shape. */
export function applyInto(target, src) {
  if (!src || typeof src !== "object") return target;
  for (const k of Object.keys(src)) {
    if (!(k in target)) continue;
    const t = target[k];
    const v = src[k];
    if (t && v && typeof t === "object" && typeof v === "object" && !Array.isArray(t)) {
      applyInto(t, v);
    } else if (typeof t === typeof v || t === null) {
      target[k] = v;
    }
  }
  return target;
}

const clone = (v) => JSON.parse(JSON.stringify(v));

/**
 * Text that has been emptied comes back.
 *
 * A config saved with a blank title/paragraph/button wiped the page, and the
 * autosave then restored that blank state on every reload — the page had no
 * way back short of clearing storage by hand. So blank copy is treated as
 * "nothing was set" rather than as "show nothing": `show*` is what hides a
 * block, and it is a toggle you can see and undo in the panel.
 */
export function sanitize(cfg, defaults) {
  const blank = (v) => typeof v !== "string" || !v.trim();
  for (const k of ["title", "para", "cta"]) {
    if (blank(cfg.hero?.[k])) cfg.hero[k] = defaults.hero[k];
  }
  for (const [k, d] of [["bg", defaults.page.bg], ["ink", defaults.page.ink]]) {
    if (blank(cfg.page?.[k])) cfg.page[k] = d;
  }
  if (blank(cfg.hero?.ctaBg)) cfg.hero.ctaBg = defaults.hero.ctaBg;
  // a region of zero width would make the composition unreachable
  const r = cfg.tower?.region;
  if (r) {
    if (!(r.width > 1)) r.width = defaults.tower.region.width;
    if (!(r.mobile?.width > 1)) r.mobile.width = defaults.tower.region.mobile.width;
  }
  if (!(cfg.tower?.images?.count >= 1)) cfg.tower.images.count = defaults.tower.images.count;
  return cfg;
}

// ── the live config ───────────────────────────────────────────────────────

export function loadLive(cfg, defaults) {
  const saved = read(LIVE_KEY, null);
  if (!saved) return false;
  applyInto(cfg, saved);
  if (defaults) sanitize(cfg, defaults);
  return true;
}

/** Debounced — the panel fires a change per pointer-move on a slider. */
export function makeAutosave(cfg, ms = 350) {
  let t = null;
  return function save() {
    clearTimeout(t);
    t = setTimeout(() => write(LIVE_KEY, cfg), ms);
  };
}

export function clearLive() {
  try {
    localStorage.removeItem(LIVE_KEY);
  } catch {
    /* nothing to do */
  }
}

// ── the presets ───────────────────────────────────────────────────────────

export function listPresets() {
  const v = read(PRESETS_KEY, []);
  return Array.isArray(v) ? v : [];
}

function persist(list) {
  if (write(PRESETS_KEY, list)) return list;
  // Almost always the 5MB quota, and almost always the thumbnails. Drop the
  // oldest thumbnails (keeping the configs, which are what matter) and retry.
  const stripped = list.map((p, i) => (i < list.length - 6 ? { ...p, thumb: null } : p));
  if (write(PRESETS_KEY, stripped)) return stripped;
  return list;
}

export function savePreset({ name, config, thumb }) {
  const list = listPresets();
  const entry = {
    id: `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    name: String(name || "Untitled").slice(0, 60),
    ts: Date.now(),
    config: clone(config),
    thumb: thumb || null,
  };
  return { list: persist([...list, entry]), entry };
}

export function updatePreset(id, { config, thumb, name }) {
  const list = listPresets().map((p) =>
    p.id === id
      ? {
          ...p,
          ts: Date.now(),
          name: name === undefined ? p.name : String(name).slice(0, 60),
          config: config ? clone(config) : p.config,
          thumb: thumb === undefined ? p.thumb : thumb,
        }
      : p
  );
  return persist(list);
}

export function deletePreset(id) {
  return persist(listPresets().filter((p) => p.id !== id));
}

export function renamePreset(id, name) {
  return updatePreset(id, { name });
}

/** The whole workspace as one JSON string — presets included. */
export function exportAll(cfg) {
  return JSON.stringify({ live: cfg, presets: listPresets() }, null, 2);
}

/** Merges an exported file back in. Presets are appended, never replaced. */
export function importAll(text, cfg) {
  const data = JSON.parse(text);
  if (data.live) applyInto(cfg, data.live);
  if (Array.isArray(data.presets) && data.presets.length) {
    const have = new Set(listPresets().map((p) => p.id));
    const add = data.presets.filter((p) => p && p.config && !have.has(p.id));
    persist([...listPresets(), ...add]);
  }
  return listPresets();
}
