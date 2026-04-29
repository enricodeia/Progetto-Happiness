// Build a fully-fledged THREE.MeshPhysicalMaterial from a saved Asset
// state (the same state shape used by the asset library).
//
// Each call runs the source pipeline (preset / shader) → generateMaps →
// CanvasTextures → MeshPhysicalMaterial with every PBR + physical field
// applied. Cached per asset.id so dropping the same asset onto multiple
// meshes doesn't re-render the source every time.

import * as THREE from 'three';
import { PRESETS, getPreset } from './presets.js';
import { renderShader } from './shaderEngine.js';
import { renderEngraving } from './engraving.js';
import { generateMaps, imageDataToCanvas, makeSeamless } from './textureMaps.js';

const PARAM_KEYS = ['p1','p2','p3','p4','p5','p6','p7','p8','p9','p10','p11','p12'];

const buildSource = (state, size) => {
  if (!state) return null;
  if (state.mode === 'preset') {
    const preset = getPreset(state.activePresetId) || PRESETS[0];
    return preset.generate(size);
  }
  if (state.mode === 'shader' && state.shader) {
    const params = {};
    PARAM_KEYS.forEach((k) => { params[k] = state.shader[k] ?? 0; });
    const { imageData } = renderShader({
      size,
      body: state.shader.code,
      params,
      colorA: state.shader.colorA,
      colorB: state.shader.colorB,
      colorC: state.shader.colorC,
      colorD: state.shader.colorD,
      seed: state.shader.seed ?? 0
    });
    return imageData;
  }
  // Image / GLB modes don't carry their bitmap in the asset; fall back to
  // a neutral mid-grey source so the material still looks reasonable.
  if (state.mode === 'image' || state.mode === 'glb') {
    const out = new ImageData(size, size);
    for (let i = 0; i < out.data.length; i += 4) {
      out.data[i] = out.data[i+1] = out.data[i+2] = 128;
      out.data[i+3] = 255;
    }
    return out;
  }
  return null;
};

const makeTex = (imageData, colorSpace = THREE.NoColorSpace, repeat = 1) => {
  if (!imageData) return null;
  const canvas = imageDataToCanvas(imageData);
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 16;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.generateMipmaps = true;
  t.colorSpace = colorSpace;
  t.repeat.set(repeat, repeat);
  t.needsUpdate = true;
  return t;
};

// Apply all physical scalar + color fields onto a freshly-created material.
const applyMaterialFields = (mat, m = {}) => {
  mat.roughness = m.roughness ?? 0.85;
  mat.metalness = m.metalness ?? 0;
  mat.bumpScale = m.bumpScale ?? 0.05;
  mat.displacementScale = m.displacementScale ?? 0;
  mat.displacementBias = -(m.displacementScale ?? 0) * 0.5;
  mat.normalScale = new THREE.Vector2(m.normalScale ?? 1, m.normalScale ?? 1);
  mat.envMapIntensity = m.envIntensity ?? 1;
  mat.transmission = m.transmission ?? 0;
  mat.thickness = m.thickness ?? 0;
  mat.ior = m.ior ?? 1.5;
  mat.clearcoat = m.clearcoat ?? 0;
  mat.clearcoatRoughness = m.clearcoatRoughness ?? 0;
  mat.sheen = m.sheen ?? 0;
  mat.sheenRoughness = m.sheenRoughness ?? 0;
  mat.sheenColor = new THREE.Color(m.sheenColor || '#ffffff');
  if ('anisotropy' in mat) {
    mat.anisotropy = m.anisotropy ?? 0;
    mat.anisotropyRotation = m.anisotropyRotation ?? 0;
  }
  if ('iridescence' in mat) {
    mat.iridescence = m.iridescence ?? 0;
    mat.iridescenceIOR = m.iridescenceIOR ?? 1.3;
    mat.iridescenceThicknessRange = [
      m.iridescenceThicknessMin ?? 100,
      m.iridescenceThicknessMax ?? 400
    ];
  }
  if ('specularIntensity' in mat) {
    mat.specularIntensity = m.specularIntensity ?? 1;
    mat.specularColor = new THREE.Color(m.specularColor || '#ffffff');
  }
  mat.attenuationDistance = (m.attenuationDistance ?? 0) > 0
    ? m.attenuationDistance
    : Infinity;
  mat.attenuationColor = new THREE.Color(m.attenuationColor || '#ffffff');
  mat.emissive = new THREE.Color(m.emissiveColor || '#000000');
  mat.emissiveIntensity = m.emissiveIntensity ?? 0;
  mat.needsUpdate = true;
};

export const buildMaterialFromAsset = (asset, size = 512) => {
  if (!asset?.state) return null;
  const state = asset.state;

  // 1. source bitmap
  const source = buildSource(state, size);
  if (!source) return null;

  // 2. engraving overlay (optional)
  let engravingMap = null;
  if (state.engraving?.enabled) {
    engravingMap = renderEngraving({ size, ...state.engraving });
  }

  // 3. seamless smoothing for image sources (skip — no bitmap in asset)
  // 4. generate the 6-map set
  const engParams = state.engraving?.enabled ? {
    engravingDepth: state.engraving.depth,
    engravingMode: state.engraving.mode,
    engravingDarken: state.engraving.darken
  } : {};
  const maps = generateMaps(source, { ...(state.gen || {}), ...engParams }, engravingMap);

  // 5. textures
  const m = state.material || {};
  const repeat = m.repeat ?? 1;
  const map = makeTex(maps.diffuse, THREE.SRGBColorSpace, repeat);
  const normalMap = makeTex(maps.normal, THREE.NoColorSpace, repeat);
  const roughnessMap = makeTex(maps.roughness, THREE.NoColorSpace, repeat);
  const bumpMap = makeTex(maps.height, THREE.NoColorSpace, repeat);
  const aoMap = makeTex(maps.ao, THREE.NoColorSpace, repeat);
  const displacementMap = (m.displacementScale ?? 0) > 0
    ? makeTex(maps.displacement, THREE.NoColorSpace, repeat)
    : null;

  // 6. material
  const mat = new THREE.MeshPhysicalMaterial({
    map,
    normalMap,
    roughnessMap,
    bumpMap,
    aoMap,
    displacementMap
  });
  mat.userData = { tssAssetId: asset.id, tssAssetName: asset.name };
  applyMaterialFields(mat, m);
  return mat;
};

// Dispose helper so we don't leak GPU memory when re-building the cache.
export const disposeMaterial = (mat) => {
  if (!mat) return;
  ['map', 'normalMap', 'roughnessMap', 'bumpMap', 'aoMap', 'displacementMap']
    .forEach((k) => mat[k]?.dispose?.());
  mat.dispose();
};
