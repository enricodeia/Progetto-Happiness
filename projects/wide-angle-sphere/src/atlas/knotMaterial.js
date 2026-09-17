import { Color, DoubleSide, FrontSide, MeshDepthMaterial, MeshPhysicalMaterial, RGBADepthPacking } from 'three'
import { SETTLED } from './revealMath.js'
import { VERT_HEAD, VERT_BODY, FRAG_HEAD, FRAG_CUT, FRAG_EDGE } from './shaders.js'

/** Uniforms shared by the surface and its shadow-depth twin. */
export function createRevealUniforms() {
  return {
    uAnchor: { value: 0 },
    uFront: { value: 3 },
    uGrow: { value: 0.055 },
    uWaveAmount: { value: 0.035 },
    uWaveTurns: { value: 3 },
    uGrain: { value: 0.01 },
    uGrainScale: { value: 9 },
    uSeal: { value: 0 },
    uSwell: { value: 0.018 },
    uSwellWidth: { value: 0.05 },
    uTrailWidth: { value: 0.075 },
    uTrailAmount: { value: 0.55 },
    uTrailColor: { value: new Color(0xb7ae9f) },
    uLipWidth: { value: 0.012 },
    uLipAmount: { value: 0.85 },
    uLipColor: { value: new Color(0xffffff) },
    uEdgeFade: { value: 0 },
    uTintT: { value: 0 },
    uTintWidth: { value: 0.11 },
    uTintAmount: { value: 0 },
    uTintColor: { value: new Color(0xffffff) },
    uRim: { value: 0.16 },
    uRimPower: { value: 3.4 },
    uRimColor: { value: new Color(0xffffff) },
  }
}

function injectVertex(shader, uniforms) {
  Object.assign(shader.uniforms, uniforms)
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', `${VERT_HEAD}\n#include <common>`)
    .replace('#include <begin_vertex>', `#include <begin_vertex>\n${VERT_BODY}`)
}

function injectFragment(shader) {
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', `${FRAG_HEAD}\n#include <common>`)
    .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>\n${FRAG_CUT}`)
}

/** The porcelain surface. */
export function createKnotMaterial(uniforms) {
  const material = new MeshPhysicalMaterial({
    color: 0xffffff,
    roughness: 0.42,
    metalness: 0,
    clearcoat: 0.35,
    clearcoatRoughness: 0.5,
    side: FrontSide,
  })
  material.name = 'Porcelain'
  material.onBeforeCompile = (shader) => {
    injectVertex(shader, uniforms)
    injectFragment(shader)
    // The stripe goes in after lighting and tone mapping, so it reads as the
    // surface itself changing rather than as a paler material.
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <dithering_fragment>',
      `${FRAG_EDGE}\n#include <dithering_fragment>`,
    )
    material.userData.shader = shader
  }
  material.customProgramCacheKey = () => 'atlas-porcelain'
  return material
}

/**
 * Depth twin for the shadow map. Without the same displacement and the same
 * cut, the knot would cast the shadow of a shape that is not there yet.
 */
export function createKnotDepthMaterial(uniforms) {
  const material = new MeshDepthMaterial({ depthPacking: RGBADepthPacking })
  material.onBeforeCompile = (shader) => {
    injectVertex(shader, uniforms)
    injectFragment(shader)
  }
  material.customProgramCacheKey = () => 'atlas-porcelain-depth'
  return material
}

export function syncKnotMaterial(material, state, reveal = SETTLED, uniforms, tint) {
  const m = state.material
  const r = state.reveal

  material.color.set(m.color)
  material.roughness = m.roughness
  material.metalness = m.metalness
  material.clearcoat = m.clearcoat
  material.clearcoatRoughness = m.clearcoatRoughness
  material.sheen = m.sheen
  material.wireframe = !!state.debug.wireframe
  material.side = state.debug.wireframe ? DoubleSide : FrontSide

  uniforms.uAnchor.value = r.anchor
  uniforms.uFront.value = reveal.front
  uniforms.uGrow.value = r.grow
  uniforms.uWaveAmount.value = r.waveAmount
  uniforms.uWaveTurns.value = Math.round(r.waveTurns)
  uniforms.uGrain.value = r.grain
  uniforms.uGrainScale.value = r.grainScale
  uniforms.uSeal.value = reveal.seal ?? 1
  uniforms.uSwell.value = r.swell
  uniforms.uSwellWidth.value = r.swellWidth
  uniforms.uTrailWidth.value = r.trailWidth
  uniforms.uTrailAmount.value = r.trailAmount
  uniforms.uTrailColor.value.set(r.trailColor)
  uniforms.uLipWidth.value = r.lipWidth
  uniforms.uLipAmount.value = r.lipAmount
  uniforms.uLipColor.value.set(r.lipColor)
  uniforms.uEdgeFade.value = reveal.edgeFade ?? 0
  uniforms.uTintT.value = tint?.t ?? 0
  // Reach, not opacity: this is what makes the colour travel out of the chip.
  uniforms.uTintWidth.value = state.cards.tintWidth * (tint?.spread ?? 1)
  uniforms.uTintAmount.value = (tint?.amount ?? 0) * state.cards.tintAmount
  if (tint) uniforms.uTintColor.value.copy(tint.color)
  uniforms.uRim.value = m.rim
  uniforms.uRimPower.value = m.rimPower
  uniforms.uRimColor.value.set(m.rimColor)
}
