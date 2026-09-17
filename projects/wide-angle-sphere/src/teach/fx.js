import * as THREE from "three";

/**
 * The post-FX kit.
 *
 * `src/lib/itemMesh.js` ships a full effects chain in the card shader — every
 * uniform defaults to a no-op, so nothing here costs anything until it is
 * switched on. The webkit presets already carry a `postfx` block for it. This
 * file is the one place that knows the mapping, so the panel and the renderer
 * cannot drift apart: `FX` drives both.
 *
 * Each effect is `{ key, label, note, fields }`, and each field is
 * `{ key, label, min, max, step }` (a number), `{ options }` (a select),
 * or `{ color: true }`. `applyFx` writes the whole block to a material.
 *
 * Two of the eleven are driven by the pointer rather than by a slider —
 * `ripple` and `liquid` read the cursor and its velocity, and `velStreak`
 * reads the drag — so they only show themselves when you move.
 */

export const FX = [
  {
    key: "bloom",
    label: "Bloom",
    note: "4-tap bright pass inside each card",
    fields: [
      { key: "strength", label: "strength", min: 0, max: 3, step: 0.01 },
      { key: "radius", label: "radius", min: 0, max: 2, step: 0.01 },
      { key: "threshold", label: "threshold", min: 0, max: 1, step: 0.01 },
    ],
  },
  {
    key: "chromatic",
    label: "Chromatic aberration",
    note: "radial splits from the card centre, lateral is a flat shift",
    fields: [
      { key: "strength", label: "strength", min: 0, max: 0.06, step: 0.0005 },
      { key: "mode", label: "mode", options: { radial: "radial", lateral: "lateral" } },
    ],
  },
  {
    key: "rgbSplit",
    label: "RGB split (cursor)",
    note: "splits around the pointer and falls off with distance",
    fields: [
      { key: "strength", label: "strength", min: 0, max: 3, step: 0.01 },
      { key: "falloff", label: "falloff", min: 0.2, max: 12, step: 0.1 },
    ],
  },
  {
    key: "ripple",
    label: "Ripple (cursor)",
    note: "a travelling wave centred on the pointer",
    fields: [
      { key: "strength", label: "strength", min: 0, max: 4, step: 0.01 },
      { key: "radius", label: "radius", min: 0.02, max: 1.5, step: 0.01 },
      { key: "speed", label: "speed", min: 0, max: 24, step: 0.1 },
    ],
  },
  {
    key: "liquid",
    label: "Liquid warp",
    note: "flowing distortion, pushed harder by pointer speed",
    fields: [
      { key: "strength", label: "strength", min: 0, max: 4, step: 0.01 },
      { key: "frequency", label: "frequency", min: 1, max: 30, step: 0.1 },
      { key: "speed", label: "speed", min: 0, max: 6, step: 0.05 },
    ],
  },
  {
    key: "velStreak",
    label: "Drag streak",
    note: "directional smear along the spin — only while it moves",
    fields: [
      { key: "strength", label: "strength", min: 0, max: 1, step: 0.01 },
      { key: "length", label: "length", min: 0, max: 60, step: 0.5 },
      { key: "falloff", label: "falloff", min: 0.2, max: 8, step: 0.1 },
      { key: "fromDrag", label: "driven by drag" },
    ],
  },
  {
    key: "colorGrade",
    label: "Colour grade",
    note: "brightness, contrast, saturation, hue, tint",
    fields: [
      { key: "brightness", label: "brightness", min: 0, max: 3, step: 0.01 },
      { key: "contrast", label: "contrast", min: 0, max: 3, step: 0.01 },
      { key: "saturation", label: "saturation", min: 0, max: 3, step: 0.01 },
      { key: "hue", label: "hue", min: -3.15, max: 3.15, step: 0.01 },
      { key: "tint", label: "tint", color: true },
      { key: "tintMix", label: "tint mix", min: 0, max: 1, step: 0.01 },
    ],
  },
  {
    key: "vignette",
    label: "Vignette",
    note: "darkens the edge of each card, not the page",
    fields: [
      { key: "strength", label: "strength", min: 0, max: 1, step: 0.01 },
      { key: "smoothness", label: "smoothness", min: 0, max: 1, step: 0.01 },
    ],
  },
  {
    key: "grain",
    label: "Grain",
    fields: [
      { key: "intensity", label: "intensity", min: 0, max: 1, step: 0.01 },
      { key: "scale", label: "scale", min: 0.2, max: 8, step: 0.05 },
    ],
  },
  {
    key: "noise",
    label: "Smooth noise",
    fields: [
      { key: "intensity", label: "intensity", min: 0, max: 1, step: 0.01 },
      { key: "scale", label: "scale", min: 4, max: 400, step: 1 },
    ],
  },
  {
    key: "imgParallax",
    label: "Image parallax",
    note: "the card holds still and the picture pans inside it",
    fields: [
      { key: "strength", label: "strength", min: 0, max: 0.4, step: 0.002 },
      { key: "ease", label: "ease", min: 0.01, max: 0.4, step: 0.005 },
    ],
  },
];

/** The default block — the shape `applyFx` and the panel both expect. */
export function defaultFx() {
  return {
    bloom: { enabled: false, strength: 0.38, radius: 0.4, threshold: 0.7 },
    chromatic: { enabled: false, strength: 0.006, mode: "radial" },
    rgbSplit: { enabled: false, strength: 0.6, falloff: 3 },
    ripple: { enabled: false, strength: 1, radius: 0.35, speed: 7 },
    liquid: { enabled: false, strength: 1, frequency: 9, speed: 1.6 },
    velStreak: { enabled: false, strength: 0.6, length: 14, falloff: 2.4, fromDrag: true },
    colorGrade: {
      enabled: false, brightness: 1, contrast: 1.05, saturation: 1.1,
      hue: 0, tint: "#ffd9a8", tintMix: 0,
    },
    vignette: { enabled: false, strength: 0.55, smoothness: 0.5 },
    grain: { enabled: false, intensity: 0.12, scale: 1.6 },
    noise: { enabled: false, intensity: 0.08, scale: 80 },
    imgParallax: { enabled: false, strength: 0.05, ease: 0.08 },
  };
}

const _tint = new THREE.Color();

/**
 * Write one post-FX block onto one card material.
 *
 * `live` carries what only the frame knows: the clock, the drawing-buffer
 * size, the cursor in screen UV, the pointer velocity, and the drag speed
 * that feeds the streak. A disabled effect writes its uniform to the no-op
 * value rather than being skipped, so switching one off actually turns it off.
 */
export function applyFx(u, fx, live) {
  u.uPostTime.value = live.time;
  u.uPostRes.value.set(live.width, live.height);
  u.uPostCursor.value.set(live.cursorX, live.cursorY);
  u.uPostVel.value.set(live.velX, live.velY);

  const on = (b) => (b && b.enabled ? b : null);

  const bloom = on(fx.bloom);
  u.uPostBloom.value = bloom ? bloom.strength : 0;
  if (bloom) {
    u.uPostBloomRad.value = bloom.radius;
    u.uPostBloomThr.value = bloom.threshold;
  }

  const ch = on(fx.chromatic);
  u.uPostChroma.value = ch ? ch.strength : 0;
  u.uPostChromaMode.value = ch && ch.mode === "lateral" ? 1 : 0;

  const rgb = on(fx.rgbSplit);
  u.uPostRgb.value = rgb ? rgb.strength : 0;
  if (rgb) u.uPostRgbFall.value = rgb.falloff;

  const rip = on(fx.ripple);
  u.uPostRipple.value = rip ? rip.strength : 0;
  if (rip) {
    u.uPostRippleRadius.value = rip.radius;
    u.uPostRippleSpeed.value = rip.speed;
  }

  const liq = on(fx.liquid);
  u.uPostLiquid.value = liq ? liq.strength : 0;
  if (liq) {
    u.uPostLiquidFreq.value = liq.frequency;
    u.uPostLiquidSpeed.value = liq.speed;
  }

  const vs = on(fx.velStreak);
  // `fromDrag` is the honest version: the smear only exists while the thing
  // actually moves. Off, it is a constant smear you can dial in and look at.
  u.uVelStreak.value = vs ? vs.strength * (vs.fromDrag ? live.dragAmt : 1) : 0;
  if (vs) {
    u.uVelStreakLen.value = vs.length;
    u.uVelStreakFall.value = vs.falloff;
    u.uVelStreakDir.value.set(live.dragDir, 0);
  }

  const cg = on(fx.colorGrade);
  u.uPostGradeBri.value = cg ? cg.brightness : 1;
  u.uPostGradeCon.value = cg ? cg.contrast : 1;
  u.uPostGradeSat.value = cg ? cg.saturation : 1;
  u.uPostGradeHue.value = cg ? cg.hue : 0;
  u.uPostTintMix.value = cg ? cg.tintMix : 0;
  if (cg && cg.tintMix > 0.001) {
    _tint.set(cg.tint || "#ffffff");
    u.uPostTintColor.value.set(_tint.r, _tint.g, _tint.b);
  }

  const vig = on(fx.vignette);
  u.uPostVignette.value = vig ? vig.strength : 0;
  if (vig) u.uPostVignSmooth.value = vig.smoothness;

  const gr = on(fx.grain);
  u.uPostGrain.value = gr ? gr.intensity : 0;
  if (gr) u.uPostGrainScale.value = gr.scale;

  const nz = on(fx.noise);
  u.uPostNoise.value = nz ? nz.intensity : 0;
  if (nz) u.uPostNoiseScale.value = nz.scale;

  const ip = on(fx.imgParallax);
  if (ip) u.uImgParallax.value.set(live.parX * ip.strength, live.parY * ip.strength);
  else u.uImgParallax.value.set(0, 0);
}
