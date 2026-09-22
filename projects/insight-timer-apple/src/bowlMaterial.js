// Vendored from the bowl studio (bowl-studio-source 2/src/material.js).
// This is the whole reason the bowl reads as a real object: the hammered
// relief and the inner colour ramp are procedural, evaluated per pixel, and
// every control is a uniform — a slider drag never recompiles the shader.
// ---------------------------------------------------------------------------
// Two material slots on one MeshPhysicalMaterial recipe.
//   A · outer shell  — relief only. No colour noise, ever.
//   B · inner surface — colour ramp noise only. No relief, ever.
// Everything is uniform-gated: a slider drag writes a uniform and nothing else.
// needsUpdate is only touched when a real #define changes (map slots).
// ---------------------------------------------------------------------------
import * as THREE from 'three';
import { NOISE_GLSL, noiseUniform } from "./bowlNoise.js";

const SIDE = { front: THREE.FrontSide, back: THREE.BackSide, double: THREE.DoubleSide };

// The relief height field is tiny by design (contrast -0.955 squeezes the
// Voronoi to ~±0.02). BUMP_GAIN maps the artist-facing 0..0.1 strength onto
// that field so 0.012 reads as hammered metal and 0.05 reads as bubble wrap.
const BUMP_GAIN = 30.0;

export function makeSlotMaterial(slotKey) {
  const mat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, roughness: 0.4, metalness: 1.0
  });
  mat.name = 'slot' + slotKey;
  mat.userData.slot = slotKey;

  const u = {
    uBsPosScale:  { value: 8.0 },        // noiseSpace
    uReliefAA:    { value: 0 },          // 0 = off; > 0 fades the relief when
                                         // a pixel spans that many noise cells
    uReliefOn:    { value: 0.0 },
    uReliefGain:  { value: 0.0 },
    uRampMix:     { value: 0.0 },
    uRampPos:     { value: 0.5 },
    uRampSoft:    { value: 0.9 },
    uRampA:       { value: new THREE.Color(1, 1, 1) },
    uRampB:       { value: new THREE.Color(1, 1, 1) },
    uReliefNoise: { value: noiseUniform({ ...ZERO }, false) },
    uRampNoise:   { value: noiseUniform({ ...ZERO }, false) }
  };
  mat.userData.u = u;

  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, u);
    mat.userData.shader = shader;

    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vBsPos;\nvarying float vBsScale;')
      // vBsPos is OBJECT space, so the pattern is welded to the geometry and
      // does not slide when the bowl is scaled. vBsScale carries the object →
      // world scale, which the relief needs to stay the same depth at any
      // size (see the fragment side).
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n  vBsPos = transformed;\n  vBsScale = length(modelMatrix[0].xyz);');

    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
varying vec3 vBsPos;
varying float vBsScale;
${NOISE_GLSL}
uniform float uBsPosScale;
uniform float uReliefOn;
uniform float uReliefGain;
uniform float uReliefAA;
uniform float uRampMix;
uniform float uRampPos;
uniform float uRampSoft;
uniform vec3  uRampA;
uniform vec3  uRampB;
uniform BsNoise uReliefNoise;
uniform BsNoise uRampNoise;
`)
      // ---- colour ramp (slot B) ------------------------------------------
      .replace('#include <color_fragment>', `#include <color_fragment>
{
  if (uRampMix > 0.0001) {
    float n = bsNoise(vBsPos * uBsPosScale, uRampNoise);
    float hw = max(uRampSoft, 0.0001) * 0.5;
    float t = smoothstep(uRampPos - hw, uRampPos + hw, n);
    vec3 ramp = mix(uRampA, uRampB, t);
    diffuseColor.rgb = mix(diffuseColor.rgb, ramp, uRampMix);
  }
}`)
      // ---- relief (slot A) -------------------------------------------------
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
{
  if (uReliefOn > 0.5 && uReliefGain != 0.0) {
    vec3 bp = vBsPos * uBsPosScale;
    float h = bsNoise(bp, uReliefNoise);

    // Mikkelsen's perturbation is invariant to SCREEN size, but not to the
    // object's own scale: the height is sampled in object space while the
    // surface derivatives are in view space, so a bowl scaled down by k gets
    // its relief multiplied by 1/k and turns to crunch. Put the k back.
    float k = max(vBsScale, 1e-6);

    // ...and one pixel covering more than one noise cell is aliasing, not
    // hammering. Fade the relief out across the last octave of footprint so
    // a small bowl goes smooth instead of boiling.
    float fw = max(length(vec2(dFdx(bp.x), dFdy(bp.x))),
                   length(vec2(dFdx(bp.y), dFdy(bp.y))));
    float lod = uReliefAA <= 0.0
      ? 1.0
      : 1.0 - 0.85 * smoothstep(uReliefAA, uReliefAA * 4.0, fw);

    vec2 dH = vec2(dFdx(h), dFdy(h)) * uReliefGain * k * lod;
    vec3 sX = dFdx(-vViewPosition);
    vec3 sY = dFdy(-vViewPosition);
    vec3 vN = normal;
    vec3 R1 = cross(sY, vN);
    vec3 R2 = cross(vN, sX);
    float fDet = dot(sX, R1) * faceDirection;
    vec3 vGrad = sign(fDet) * (dH.x * R1 + dH.y * R2);
    normal = normalize(abs(fDet) * vN - vGrad);
  }
}`);
  };

  return mat;
}

const ZERO = {
  type: 'Perlin', seed: 0, octaves: 1, lacunarity: 2, gain: 0.5, exponent: 1,
  absolute: false, oscale: 100, scale: [1, 1, 1], offset: [0, 0, 0],
  rotation: [0, 0, 0], cycles: 1, lowClip: 0, highClip: 1, brightness: 0, contrast: 0
};

function writeNoise(target, src, enabled) {
  const n = noiseUniform(src, enabled);
  const t = target.value;
  t.scale = n.scale; t.offset = n.offset; t.rot = n.rot;
  t.type = n.type; t.seed = n.seed; t.octaves = n.octaves;
  t.lacunarity = n.lacunarity; t.gain = n.gain; t.exponent = n.exponent;
  t.absolute = n.absolute; t.oscale = n.oscale; t.cycles = n.cycles;
  t.lowClip = n.lowClip; t.highClip = n.highClip;
  t.brightness = n.brightness; t.contrast = n.contrast; t.enabled = n.enabled;
}

/**
 * Push slot state onto the material. Only flips needsUpdate when a define
 * actually changed (a map slot appeared or disappeared, or side changed).
 */
export function applySlot(mat, s, noiseSpace, textures) {
  const u = mat.userData.u;
  const before = defineKey(mat);

  mat.color.set(s.color);
  mat.roughness = s.roughness;
  mat.metalness = s.metalness;
  mat.ior = s.ior;
  mat.specularIntensity = s.specularIntensity;
  mat.envMapIntensity = s.envMapIntensity;
  mat.clearcoat = s.clearcoat;
  mat.clearcoatRoughness = s.clearcoatRoughness;
  mat.side = SIDE[s.side] ?? THREE.FrontSide;

  u.uBsPosScale.value = noiseSpace;

  // ---- relief -----------------------------------------------------------
  const img = textures && textures.relief;
  const useImage = s.relief.enabled && s.relief.source === 'image' && img;
  const isNormalMap = useImage && img.userData.kind === 'normal';

  mat.normalMap = (useImage && isNormalMap) ? img : null;
  mat.bumpMap = (useImage && !isNormalMap) ? img : null;
  if (mat.normalMap) mat.normalScale.set(s.relief.strength * 24, s.relief.strength * 24);
  if (mat.bumpMap) mat.bumpScale = s.relief.strength * 24;
  if (useImage) {
    const t = img;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(s.relief.imageRepeat[0] * s.relief.imageScale, s.relief.imageRepeat[1] * s.relief.imageScale);
    t.needsUpdate = false;
  }

  const proceduralRelief = s.relief.enabled && s.relief.source === 'noise';
  u.uReliefOn.value = proceduralRelief ? 1 : 0;
  u.uReliefGain.value = proceduralRelief ? s.relief.strength * BUMP_GAIN : 0;
  writeNoise(u.uReliefNoise, s.reliefNoise, proceduralRelief);

  // ---- colour ramp -------------------------------------------------------
  const rampOn = !!(s.colorNoise && s.colorNoise.enabled) && s.ramp.mix > 0.0001;
  u.uRampMix.value = rampOn ? s.ramp.mix : 0;
  u.uRampPos.value = s.ramp.pos;
  u.uRampSoft.value = s.ramp.soft;
  u.uRampA.value.set(s.ramp.a);
  u.uRampB.value.set(s.ramp.b);
  writeNoise(u.uRampNoise, s.rampNoise, rampOn);

  if (defineKey(mat) !== before) mat.needsUpdate = true;
}

function defineKey(mat) {
  return [!!mat.normalMap, !!mat.bumpMap, mat.side, !!mat.map, mat.clearcoat > 0].join('|');
}

/**
 * Auto-detect: a normal map has a mean near (0.5, 0.5, 1.0) with blue dominant.
 * Anything else is a height map.
 */
export function classifyImage(image) {
  const n = 64;
  const c = document.createElement('canvas');
  c.width = c.height = n;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(image, 0, 0, n, n);
  const d = g.getImageData(0, 0, n, n).data;
  let r = 0, gg = 0, b = 0;
  for (let i = 0; i < d.length; i += 4) { r += d[i]; gg += d[i + 1]; b += d[i + 2]; }
  const px = d.length / 4;
  r /= px * 255; gg /= px * 255; b /= px * 255;
  const isNormal = b > 0.72 && b > r + 0.12 && b > gg + 0.12 &&
                   Math.abs(r - 0.5) < 0.22 && Math.abs(gg - 0.5) < 0.22;
  return { kind: isNormal ? 'normal' : 'height', mean: [r, gg, b] };
}
