import { Pane } from "tweakpane";
import { STUDIO_PRESETS } from "./env.js";
import { NOISE_ID } from "./bowlNoise.js";

// The bowl's own panel (B). Kept separate from the scroll panel because
// dialling a metal is its own job — and because everything in here is real:
// the relief and the inner ramp are procedural noise evaluated per pixel, and
// every light is a reflection in a baked environment, not a fake highlight.

const opts = (arr) => Object.fromEntries(arr.map((v) => [v, v]));
const NOISE_TYPES = Object.keys(NOISE_ID);

// Surface library. Colour is never part of a preset: a preset changes how the
// surface behaves, the colour stays yours.
export const SURFACES = {
  "Hammered gold": { metalness: 1.0, roughness: 0.365, ior: 1.5,  specularIntensity: 1.05, envMapIntensity: 0.53, clearcoat: 0.0,  clearcoatRoughness: 0.21 },
  "Polished gold": { metalness: 1.0, roughness: 0.08,  ior: 2.4,  specularIntensity: 1.2,  envMapIntensity: 1.10, clearcoat: 0.0,  clearcoatRoughness: 0.30 },
  "Brushed metal": { metalness: 1.0, roughness: 0.32,  ior: 2.0,  specularIntensity: 1.0,  envMapIntensity: 0.80, clearcoat: 0.0,  clearcoatRoughness: 0.30 },
  "Satin lacquer": { metalness: 0.0, roughness: 0.30,  ior: 1.52, specularIntensity: 0.8,  envMapIntensity: 0.90, clearcoat: 0.55, clearcoatRoughness: 0.12 },
  "Ceramic glaze": { metalness: 0.0, roughness: 0.09,  ior: 1.60, specularIntensity: 1.0,  envMapIntensity: 1.00, clearcoat: 0.85, clearcoatRoughness: 0.05 },
  "Matte clay":    { metalness: 0.0, roughness: 0.86,  ior: 1.45, specularIntensity: 0.3,  envMapIntensity: 0.55, clearcoat: 0.0,  clearcoatRoughness: 0.50 },
  "Waxed oak":     { metalness: 0.0, roughness: 0.48,  ior: 1.50, specularIntensity: 0.6,  envMapIntensity: 0.70, clearcoat: 0.40, clearcoatRoughness: 0.26 },
  "Glass coat":    { metalness: 0.0, roughness: 0.05,  ior: 1.52, specularIntensity: 1.0,  envMapIntensity: 1.20, clearcoat: 1.0,  clearcoatRoughness: 0.02 },
};

const SURFACE_ROWS = [
  ["metalness", 0, 1, 0.01],
  ["roughness", 0, 1, 0.005],
  ["ior", 1, 2.6, 0.01],
  ["specularIntensity", 0, 2, 0.01],
  ["envMapIntensity", 0, 4, 0.01],
  ["clearcoat", 0, 1, 0.01],
  ["clearcoatRoughness", 0, 1, 0.01],
];

export function createBowlPanel({ cfg, bowl, onLayout, onReplay, onProgress, onPlayer, onPinHeight, onNetwork, dock }) {
  const B = cfg.bowl;
  const host = document.createElement("div");
  host.className = "was-panel was-panel-bowl";
  // Lenis owns the wheel on the window; this is the opt-out that lets the
  // panel scroll internally
  host.setAttribute("data-lenis-prevent", "");
  host.addEventListener("wheel", (e) => e.stopPropagation(), { passive: true });
  (dock || document.body).appendChild(host);

  const pane = new Pane({ container: host, title: "Bowl · look" });
  const mats = () => bowl.applyMaterials();

  // The PMREM bake is the expensive one — never let a slider drag run it per
  // frame. Coalesce to the next idle beat instead.
  let bakeTimer = 0;
  const bake = () => {
    clearTimeout(bakeTimer);
    bakeTimer = setTimeout(() => bowl.rebake(), 70);
  };

  pane.addBinding(B, "show", { label: "visible" });

  // ── a noise channel: the whole Maxon-style parameter set ────────────────
  function noiseFolder(parent, title, n, onChange, expanded = false) {
    const f = parent.addFolder({ title, expanded });
    f.addBinding(n, "type", { options: opts(NOISE_TYPES) }).on("change", onChange);
    f.addBinding(n, "oscale", { min: 1, max: 600, step: 0.01, label: "global scale %" }).on("change", onChange);
    f.addBinding(n, "seed", { min: 0, max: 999, step: 1 }).on("change", onChange);
    f.addBinding(n, "octaves", { min: 1, max: 16, step: 0.01 }).on("change", onChange);
    f.addBinding(n, "lacunarity", { min: 1, max: 4, step: 0.01 }).on("change", onChange);
    f.addBinding(n, "gain", { min: 0, max: 1, step: 0.01 }).on("change", onChange);
    f.addBinding(n, "exponent", { min: 0.1, max: 6, step: 0.001 }).on("change", onChange);
    f.addBinding(n, "absolute").on("change", onChange);
    vec3(f, "scale", n.scale, onChange, { step: 0.01 });
    vec3(f, "offset", n.offset, onChange, { step: 0.01 });
    vec3(f, "rotation °", n.rotation, onChange, { step: 1 });
    f.addBinding(n, "cycles", { min: 1, max: 12, step: 0.1 }).on("change", onChange);
    f.addBinding(n, "lowClip", { min: 0, max: 1, step: 0.01, label: "clip low" }).on("change", onChange);
    f.addBinding(n, "highClip", { min: 0, max: 1, step: 0.01, label: "clip high" }).on("change", onChange);
    f.addBinding(n, "brightness", { min: -1, max: 1, step: 0.001 }).on("change", onChange);
    f.addBinding(n, "contrast", { min: -1, max: 1, step: 0.001 }).on("change", onChange);
    return f;
  }

  // Tweakpane binds {x,y,z}, the shader wants a plain array — keep both.
  function vec3(folder, label, arr, onChange, extra = {}) {
    const o = { v: { x: arr[0], y: arr[1], z: arr[2] } };
    folder.addBinding(o, "v", { label, ...extra }).on("change", () => {
      arr[0] = o.v.x;
      arr[1] = o.v.y;
      arr[2] = o.v.z;
      onChange();
    });
  }

  // ── the two material slots ──────────────────────────────────────────────
  const surface = { preset: "Hammered gold", applyTo: "A" };
  const fSurf = pane.addFolder({ title: "Surface presets", expanded: false });
  fSurf.addBinding(surface, "preset", { options: opts(Object.keys(SURFACES)) });
  fSurf.addBinding(surface, "applyTo", { options: { "A · outer": "A", "B · inner": "B", both: "both" } });
  fSurf.addButton({ title: "Apply to surface" }).on("click", () => {
    const p = SURFACES[surface.preset];
    if (!p) return;
    const targets = surface.applyTo === "both" ? ["A", "B"] : [surface.applyTo];
    for (const t of targets) Object.assign(B.material[t], p);
    mats();
    pane.refresh();
  });

  for (const slot of ["A", "B"]) {
    const s = B.material[slot];
    const f = pane.addFolder({ title: `${slot} · ${s.label}`, expanded: slot === "A" });
    f.addBinding(s, "color", { view: "color" }).on("change", mats);
    for (const [key, min, max, step] of SURFACE_ROWS) {
      f.addBinding(s, key, { min, max, step }).on("change", mats);
    }
    f.addBinding(s, "side", { options: opts(["front", "back", "double"]) }).on("change", mats);

    // relief — a height field, never a colour
    const fr = f.addFolder({ title: "Relief", expanded: slot === "A" });
    fr.addBinding(s.relief, "enabled").on("change", mats);
    fr.addBinding(s.relief, "source", {
      options: { "image (a real map)": "image", "noise (per pixel)": "noise" },
    }).on("change", () => { mats(); readMap(); });
    fr.addBinding(s.relief, "strength", { min: 0, max: 0.1, step: 0.0005, label: "depth" })
      .on("change", mats);
    fr.addBinding(s.relief, "imageScale", { min: 0.1, max: 12, step: 0.1, label: "tiling" })
      .on("change", mats);

    // ── load your own map ─────────────────────────────────────────────────
    // A normal map or a height map, either way: the image classifies itself by
    // whether blue dominates, so there is no switch to get wrong.
    const ui = { map: "—" };
    const readMap = () => {
      const i = bowl.reliefInfo(slot);
      ui.map = i.map ? `${i.map} · ${i.kind}${i.custom ? "" : " (built in)"}` : "—";
      pane.refresh();
    };
    fr.addBinding(ui, "map", { readonly: true, label: "map" });
    const picker = document.createElement("input");
    picker.type = "file";
    picker.accept = "image/*";
    picker.hidden = true;
    host.appendChild(picker);
    picker.addEventListener("change", () => {
      const file = picker.files && picker.files[0];
      if (!file) return;
      bowl.loadReliefImage(slot, file).then(readMap).catch((e) => {
        console.warn("[bowl] could not read that image", e);
      });
      picker.value = "";
    });
    fr.addButton({ title: "Load an image…" }).on("click", () => picker.click());
    fr.addButton({ title: "Back to the built-in map" }).on("click", () => {
      bowl.clearReliefImage(slot);
      readMap();
    });
    setTimeout(readMap, 0);

    noiseFolder(fr, "Relief noise (when source = noise)", s.reliefNoise, mats, false);

    // colour ramp — the patina inside
    const fc = f.addFolder({ title: "Colour ramp", expanded: slot === "B" });
    fc.addBinding(s.colorNoise, "enabled").on("change", mats);
    fc.addBinding(s.ramp, "mix", { min: 0, max: 1, step: 0.01 }).on("change", mats);
    fc.addBinding(s.ramp, "pos", { min: 0, max: 1, step: 0.01, label: "threshold" }).on("change", mats);
    fc.addBinding(s.ramp, "soft", { min: 0.01, max: 2, step: 0.01, label: "softness" }).on("change", mats);
    fc.addBinding(s.ramp, "a", { view: "color", label: "colour A" }).on("change", mats);
    fc.addBinding(s.ramp, "b", { view: "color", label: "colour B" }).on("change", mats);
    noiseFolder(fc, "Ramp noise", s.rampNoise, mats, false);
  }

  // ── model ───────────────────────────────────────────────────────────────
  const fModel = pane.addFolder({ title: "Model", expanded: false });
  fModel.addBinding(B.model, "noiseSpace", { min: 0.5, max: 40, step: 0.1, label: "noise space" }).on("change", mats);
  // the relief is scale-invariant; this only matters if a tiny bowl shimmers
  fModel.addBinding(B.model, "reliefAA", { min: 0, max: 8, step: 0.1, label: "relief anti-alias" }).on("change", mats);
  fModel.addBinding(B.model, "rotX", { min: -60, max: 60, step: 0.5, label: "tilt X °" });
  fModel.addBinding(B.model, "rotZ", { min: -60, max: 60, step: 0.5, label: "tilt Z °" });
  fModel.addBinding(B.model, "wireframe").on("change", mats);

  // ── studio: these panels ARE the environment ────────────────────────────
  // ── the captured environment ────────────────────────────────────────────
  // One or two equirect EXR/HDRs in public/hdr/, blended and pre-filtered into
  // `scene.environment`. It lights the 3D and never the page: the bowl's canvas
  // is transparent and `scene.background` is never set. With no files there,
  // the panel rig below takes over.
  const fHdr = pane.addFolder({ title: "Environment (HDR)", expanded: true });
  const H = B.studio.hdr;
  fHdr.addBinding(H, "on", { label: "use the HDRs" }).on("change", () => bowl.rebake());
  fHdr.addBinding(H, "mix", { min: 0, max: 1, step: 0.01, label: "1 ◀ blend ▶ 2" })
    .on("change", () => bowl.rebake());
  fHdr.addBinding(H, "intensity", { min: 0, max: 4, step: 0.01 })
    .on("change", () => bowl.hdr.sync(H));
  fHdr.addBinding(H, "rotation", { min: -180, max: 180, step: 1, label: "rotation (°)" })
    .on("change", () => bowl.hdr.sync(H));
  fHdr.addButton({ title: "Reload the HDRs" }).on("click", () => bowl.rebake());

  const fStudio = pane.addFolder({ title: "Studio (the panel rig)", expanded: false });
  fStudio.addBinding(B.studio, "preset", { options: opts(Object.keys(STUDIO_PRESETS)) })
    .on("change", (ev) => { bowl.applyPreset(ev.value); pane.refresh(); });
  fStudio.addBinding(B.studio, "intensity", { min: 0, max: 5, step: 0.01 }).on("change", () => bowl.env.sync());
  fStudio.addBinding(B.studio, "rotation", { min: -180, max: 360, step: 1, label: "rotate °" })
    .on("change", () => { bowl.env.sync(); bowl.env.syncLights(); });
  fStudio.addBinding(B.studio, "domeTop", { view: "color", label: "dome top" }).on("change", bake);
  fStudio.addBinding(B.studio, "domeBottom", { view: "color", label: "dome bottom" }).on("change", bake);
  fStudio.addBinding(B.studio, "domeIntensity", { min: 0, max: 3, step: 0.01, label: "dome ×" }).on("change", bake);
  fStudio.addBinding(B.studio, "domeGradient", { min: 0.2, max: 4, step: 0.05, label: "dome falloff" }).on("change", bake);
  fStudio.addBinding(B.studio, "sceneLightScale", { min: 0, max: 0.3, step: 0.001, label: "area lights ×" })
    .on("change", () => bowl.env.syncLights());
  fStudio.addBinding(B.studio, "pmremSigma", { min: 0.005, max: 0.05, step: 0.001, label: "pmrem blur" }).on("change", bake);
  fStudio.addBinding(B.studio, "isolate", { min: -1, max: 2, step: 1, label: "solo light" }).on("change", bake);

  B.studio.lights.forEach((L, i) => {
    const f = pane.addFolder({ title: `Light ${i + 1} · ${L.name || i + 1}`, expanded: false });
    f.addBinding(L, "on").on("change", bake);
    f.addBinding(L, "color", { view: "color" }).on("change", bake);
    f.addBinding(L, "intensity", { min: 0, max: 40, step: 0.1 }).on("change", bake);
    f.addBinding(L, "w", { min: 0.2, max: 40, step: 0.2, label: "width" }).on("change", bake);
    f.addBinding(L, "h", { min: 0.2, max: 40, step: 0.2, label: "height" }).on("change", bake);
    f.addBinding(L, "soft", { min: 0.01, max: 1, step: 0.01, label: "edge soft" }).on("change", bake);
    f.addBinding(L, "az", { min: -180, max: 180, step: 1, label: "azimuth °" }).on("change", bake);
    f.addBinding(L, "el", { min: -89, max: 89, step: 1, label: "elevation °" }).on("change", bake);
    f.addBinding(L, "dist", { min: 2, max: 40, step: 0.2, label: "distance" }).on("change", bake);
    f.addBinding(L, "roll", { min: -180, max: 180, step: 1, label: "roll °" }).on("change", bake);
    f.addBinding(L, "toEnv", { min: 0, max: 2, step: 0.01, label: "→ reflection" }).on("change", bake);
    f.addBinding(L, "toScene", { min: 0, max: 2, step: 0.01, label: "→ direct" }).on("change", bake);
  });

  // ── render pass ─────────────────────────────────────────────────────────
  const fRender = pane.addFolder({ title: "Render", expanded: false });
  fRender.addBinding(B.render, "toneMapping", {
    options: opts(["none", "linear", "reinhard", "cineon", "aces", "agx", "neutral"]),
  }).on("change", () => bowl.applyRender());
  fRender.addBinding(B.render, "exposure", { min: 0.1, max: 3, step: 0.01 })
    .on("change", () => bowl.applyRender());

  // ── how it rides the page ───────────────────────────────────────────────
  const fMove = pane.addFolder({ title: "On scroll", expanded: true });
  const POSE_LABEL = {
    hero: "1 · hero",
    until: "2 · act two (big, leaning)",
    hand: "3 · handover (steps arrive)",
    pin: "4 · parked beside the steps",
    end: "5 · full bleed",
  };
  for (const key of ["hero", "until", "hand", "pin", "end"]) {
    const P = B.poses[key];
    const f = fMove.addFolder({ title: POSE_LABEL[key], expanded: key === "until" });
    f.addBinding(P, "size", { min: 0.02, max: 0.9, step: 0.005, label: "size (vh)" });
    f.addBinding(P, "x", { min: -0.6, max: 0.6, step: 0.005, label: "x (vw)" });
    f.addBinding(P, "y", { min: -0.6, max: 0.6, step: 0.005, label: "y (vh)" });
    f.addBinding(P, "tilt", { min: -45, max: 45, step: 0.5, label: "lean ° (X)" });
    f.addBinding(P, "tiltZ", { min: -45, max: 45, step: 0.5, label: "roll ° (Z)" });
    f.addBinding(P, "opacity", { min: 0, max: 1, step: 0.01 });
  }
  fMove.addBinding(B, "riseAt", { min: 0.05, max: 0.95, step: 0.01, label: "grows by" });
  fMove.addBinding(B, "fallAt", { min: 0.05, max: 0.99, step: 0.01, label: "shrinks from" });
  fMove.addBinding(B, "lockLast", { label: "lock centred to the end" });
  fMove.addBinding(B, "fadeAfter", { min: 0, max: 3, step: 0.05, label: "fade out after (vh)" });
  fMove.addBinding(B, "handEase", { options: opts(["expo", "smooth", "linear"]), label: "grows with" });
  // `smooth` leaves and arrives with zero velocity, so grow → shrink has no
  // corner in it; `expo` leaves the top of the arc at full speed.
  fMove.addBinding(B, "fallEase", { options: opts(["smooth", "expo", "linear"]), label: "shrinks with" });
  fMove.addBinding(B, "parkIn", { min: 0.02, max: 1, step: 0.01, label: "park over" });
  fMove.addBinding(B, "endFrom", { min: 0, max: 1, step: 0.01, label: "leave from" });
  fMove.addBinding(B, "endTo", { min: 0, max: 1, step: 0.01, label: "leave to" });
  fMove.addBinding(B.spin, "start", { min: -180, max: 180, step: 1, label: "start angle °" });
  fMove.addBinding(B.spin, "turns", { min: -3, max: 3, step: 0.05, label: "turns · act 1" });
  fMove.addBinding(B.spin, "pinTurns", { min: -3, max: 3, step: 0.05, label: "turns · act 2" });
  fMove.addBinding(B.spin, "idle", { min: 0, max: 1, step: 0.01, label: "idle spin" });

  // ── look at the cursor (his ask, 2026-09-16) ────────────────────────────
  const fLook = pane.addFolder({ title: "Look at cursor", expanded: false });
  fLook.addBinding(B.lookCursor, "enabled");
  fLook.addBinding(B.lookCursor, "strengthX", { min: 0, max: 25, step: 0.5, label: "yaw °" });
  fLook.addBinding(B.lookCursor, "strengthY", { min: 0, max: 25, step: 0.5, label: "lean °" });
  fLook.addBinding(B.lookCursor, "ease", { min: 0.01, max: 0.4, step: 0.005, label: "catch-up" });

  // ── post-fx on the bowl's own canvas. Strength/radius/threshold/vignette are
  //    read every frame; `bloomHiRes` re-sizes the bloom targets (perf pass,
  //    2026-09-17 — CSS px by default, device px for comparison). Note that
  //    `enabled` is also what decides at BOOT whether the context asks for
  //    MSAA, so flipping it live is a look preview, not the shipped path.
  const fPost = pane.addFolder({ title: "Post-fx", expanded: false });
  fPost.addBinding(B.post, "enabled");
  fPost.addBinding(B.post, "bloomStrength", { min: 0, max: 1.5, step: 0.01, label: "bloom" });
  fPost.addBinding(B.post, "bloomRadius", { min: 0, max: 1, step: 0.01, label: "radius" });
  fPost.addBinding(B.post, "bloomThreshold", { min: 0, max: 1, step: 0.01, label: "threshold" });
  fPost.addBinding(B.post, "vignette", { min: 0, max: 0.6, step: 0.01 });
  fPost.addBinding(B.post, "bloomHiRes", { label: "bloom @ device px" }).on("change", onLayout);

  // ── the ring act's own background: one colour per step + the falling
  //    parallax (his ask, 2026-09-17) ───────────────────────────────────────
  const fBg = pane.addFolder({ title: "Ring act — background (V2)", expanded: false });
  const BG = cfg.v2.act.bg;
  for (let i = 0; i < 3; i++) {
    fBg.addBinding(BG.colors, String(i), { view: "color", label: `step ${i + 1} colour` });
  }
  for (let i = 0; i < 3; i++) {
    fBg.addBinding(BG.parallax, String(i), { min: 0.1, max: 4, step: 0.05, label: `speed · step ${i + 1}` });
  }
  fBg.addBinding(BG, "strength", { min: 0, max: 1, step: 0.01, label: "colour over the field" });
  fBg.addBinding(BG, "zoom", { min: 1, max: 2, step: 0.01, label: "photo zoom (extra room)" });
  fBg.addBinding(BG, "preSpeed", { min: 0.1, max: 4, step: 0.05, label: "speed · act two + run-in" });
  fBg.addBinding(BG, "postSpeed", { min: 0.1, max: 4, step: 0.05, label: "speed · hand-over" });
  fBg.addBinding(cfg.v2.act.exit, "at", { min: 0.3, max: 1, step: 0.01, label: "bowl sinks from" });
  fBg.addBinding(cfg.v2.act.exit, "y", { min: -1.5, max: 0, step: 0.01, label: "...by (vh)" });
  fBg.addBinding(cfg.v2.act.exit, "dur", { min: 0.02, max: 0.6, step: 0.01, label: "...over" });
  fBg.addBinding(cfg.v2.act.exit, "through", { label: "keeps sinking through the hand-over" });
  fBg.addBinding(cfg.scroll, "earlyRiseVh", { min: 0, max: 200, step: 5, label: "3 steps rise early by (vh)" })
    .on("change", onPinHeight);
  fBg.addBinding(cfg.v2.rings.a, "force", { min: 0, max: 0.005, step: 0.0001, label: "scroll force · teachers" });
  fBg.addBinding(cfg.v2.rings.b, "force", { min: 0, max: 0.005, step: 0.0001, label: "scroll force · activities" });

  // ── the scroll bar (his ask, 2026-09-17) ─────────────────────────────────
  const fPg = pane.addFolder({ title: "Scroll bar", expanded: false });
  const PG = cfg.progress;
  fPg.addBinding(PG, "show").on("change", onProgress);
  fPg.addBinding(PG, "color", { view: "color" }).on("change", onProgress);
  fPg.addBinding(PG, "height", { min: 1, max: 24, step: 1, label: "thickness (px)" }).on("change", onProgress);
  fPg.addBinding(PG, "radius", { min: 0, max: 12, step: 0.5, label: "rounding (px)" }).on("change", onProgress);
  fPg.addBinding(PG, "bottom", { min: 0, max: 400, step: 1, label: "from the bottom (px)" }).on("change", onProgress);
  fPg.addBinding(PG, "inset", { min: 0, max: 40, step: 0.5, label: "side inset (vw)" }).on("change", onProgress);
  fPg.addBinding(PG, "trackAlpha", { min: 0, max: 1, step: 0.01, label: "track" }).on("change", onProgress);
  fPg.addBinding(PG, "edge", { min: 0, max: 1, step: 0.01, label: "dark hairline (for white stages)" }).on("change", onProgress);
  fPg.addBinding(PG, "fadeIn", { min: 0, max: 0.3, step: 0.005, label: "fades in over" });
  fPg.addBinding(PG, "fadeOut", { min: 0, max: 0.5, step: 0.005, label: "fades out over" });
  fPg.addBinding(PG, "wavy", { label: "wavy lines (not built yet)" }).on("change", onProgress);

  // ── the player, bottom-left (his ask, 2026-09-17) ────────────────────────
  const fPl = pane.addFolder({ title: "Player (bottom-left)", expanded: false });
  const PL = cfg.player;
  fPl.addBinding(PL, "show").on("change", onPlayer);
  fPl.addBinding(PL, "name").on("change", onPlayer);
  fPl.addBinding(PL, "label").on("change", onPlayer);
  fPl.addBinding(PL, "left", { min: 0, max: 40, step: 0.1, label: "left (vw)" }).on("change", onPlayer);
  fPl.addBinding(PL, "bottom", { min: 0, max: 40, step: 0.5, label: "bottom (vh)" }).on("change", onPlayer);
  fPl.addBinding(PL, "size", { min: 32, max: 120, step: 1, label: "photo (px)" }).on("change", onPlayer);
  fPl.addBinding(PL, "radius", { min: 0, max: 48, step: 1, label: "corner (px)" }).on("change", onPlayer);
  fPl.addBinding(PL, "pad", { min: 0, max: 24, step: 1, label: "photo inset (px)" }).on("change", onPlayer);
  fPl.addBinding(PL, "stroke", { min: 0.5, max: 6, step: 0.5, label: "outline / timeline (px)" }).on("change", onPlayer);
  fPl.addBinding(PL, "fake", { label: "fake player (no file yet)" }).on("change", onPlayer);
  fPl.addBinding(PL, "parkAt", { options: { "parks at the three steps": "evidence", "rides to the end": "never" }, label: "parks" });
  fPl.addBinding(PL, "parkOver", { min: 0.1, max: 1, step: 0.05, label: "...over (vh)" });
  const fGl = fPl.addFolder({ title: "Glass", expanded: false });
  fGl.addBinding(PL.glass, "on").on("change", onPlayer);
  fGl.addBinding(PL.glass, "alpha", { min: 0, max: 1, step: 0.01, label: "white" }).on("change", onPlayer);
  fGl.addBinding(PL.glass, "blur", { min: 0, max: 40, step: 1, label: "blur (px)" }).on("change", onPlayer);
  fGl.addBinding(PL.glass, "saturate", { min: 0.5, max: 2.5, step: 0.05 }).on("change", onPlayer);
  fGl.addBinding(PL.glass, "bevel", { min: 0, max: 1, step: 0.01, label: "top highlight" }).on("change", onPlayer);
  const fWv = fPl.addFolder({ title: "Equaliser", expanded: false });
  fWv.addBinding(PL.wave, "on").on("change", onPlayer);
  fWv.addBinding(PL.wave, "bars", { min: 4, max: 48, step: 1 }).on("change", onPlayer);
  fWv.addBinding(PL.wave, "width", { min: 1, max: 8, step: 0.5, label: "pill (px)" }).on("change", onPlayer);
  fWv.addBinding(PL.wave, "gap", { min: 0, max: 10, step: 0.5, label: "gap (px)" }).on("change", onPlayer);
  fWv.addBinding(PL.wave, "min", { min: 1, max: 20, step: 0.5, label: "at rest (px)" }).on("change", onPlayer);
  fWv.addBinding(PL.wave, "max", { min: 6, max: 60, step: 1, label: "peak (px)" }).on("change", onPlayer);
  fWv.addBinding(PL.wave, "speed", { min: 0.1, max: 4, step: 0.05 });

  // ── the three steps' own sphere: people → teachers → techniques. The
  //    photo sizes ARE the hierarchy (his ask, 2026-09-17), so they are the
  //    thing to have a slider on. Every change re-lays the whole field out.
  const fNet = pane.addFolder({ title: "Network — the three steps", expanded: false });
  const NT = cfg.v2.network;
  fNet.addBinding(NT, "dotUser", { min: 10, max: 90, step: 1, label: "people (px)" }).on("change", onNetwork);
  fNet.addBinding(NT, "dotTeacher", { min: 10, max: 120, step: 1, label: "therapists (px)" }).on("change", onNetwork);
  fNet.addBinding(NT, "dotField", { min: 1, max: 20, step: 0.5, label: "the field (px)" }).on("change", onNetwork);
  fNet.addBinding(NT, "radius", { min: 10, max: 60, step: 1, label: "sphere (% box)" }).on("change", onNetwork);
  fNet.addBinding(NT, "pillReach", { min: 1, max: 2.6, step: 0.01, label: "techniques out" }).on("change", onNetwork);

  const fCam = pane.addFolder({ title: "Bowl camera", expanded: false });
  fCam.addBinding(B.cam, "fov", { min: 8, max: 80, step: 1 }).on("change", onLayout);
  fCam.addBinding(B.cam, "dist", { min: 1, max: 20, step: 0.1 }).on("change", onLayout);

  const fIntro = pane.addFolder({ title: "Intro", expanded: false });
  fIntro.addBinding(B.intro, "fromVh", { min: 0, max: 1.5, step: 0.02, label: "from below" });
  fIntro.addBinding(B.intro, "fromScale", { min: 0.2, max: 1.4, step: 0.02, label: "from scale" });
  fIntro.addBinding(B.intro, "dur", { min: 0.2, max: 5, step: 0.05, label: "duration (s)" });
  fIntro.addBinding(B.intro, "delay", { min: 0, max: 3, step: 0.05, label: "delay (s)" });
  fIntro.addBinding(B.intro, "ease", {
    options: opts(["expo.out", "power4.out", "power2.out", "circ.out", "back.out"]),
  });
  fIntro.addButton({ title: "Replay bowl intro" }).on("click", onReplay);

  pane.addButton({ title: "Copy bowl JSON" }).on("click", () => {
    navigator.clipboard?.writeText(JSON.stringify(cfg.bowl, null, 2));
  });

  return {
    pane,
    refresh: () => pane.refresh(),
    toggle: () => host.classList.toggle("is-hidden"),
    hide: () => host.classList.add("is-hidden"),
  };
}
