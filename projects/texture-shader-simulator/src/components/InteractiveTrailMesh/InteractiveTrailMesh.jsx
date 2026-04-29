// Hover-reactive trail mesh — proper digital-paint engine.
//
// The trail accumulates into a 2K ping-pong FBO and drives map+bumpMap
// (and optional displacementMap) on a clean PBR primitive.
//
// What makes this look like real paint and not a "pattern hole-punch":
//  • The brush is sampled in BRUSH-LOCAL UV (pattern lives inside the
//    footprint, not stretched across the surface).
//  • The footprint stretches along the smoothed VELOCITY vector — fast
//    drags become elongated marks, like real bristles dragging.
//  • Edges are perturbed by the pattern itself (UV warp), so each stroke
//    has organic boundaries instead of a crisp circle.
//  • A subtle bright SPECULAR core keeps the centre of the brush punchy.
//  • Compositing is additive in HDR with `min(col, 2.0)` headroom so over-
//    paints saturate gracefully.
//  • We multi-stamp along the segment between the previous and current
//    cursor positions (8 sub-samples) so even fast moves leave a continuous
//    brush stroke instead of dotted gaps.

import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useFBO } from '@react-three/drei';
import * as THREE from 'three';

const VERT = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const FRAG = `
precision highp float;

uniform sampler2D uPrev;
uniform sampler2D uBrush;
uniform vec2  uMouse;
uniform vec2  uMousePrev;
uniform vec2  uVelocity;     // smoothed cursor velocity in UV/frame
uniform float uDecay;
uniform float uRadius;
uniform float uStrength;
uniform float uActive;
uniform float uHardness;     // 0 soft → 1 sharp
uniform float uFlow;         // 0..1 per-frame opacity
uniform float uPatternMix;   // 0 white brush → 1 full pattern
uniform float uStretch;      // 0 round → 1 highly elongated along velocity
uniform float uWarp;         // 0..1 organic edge perturbation
uniform float uHighlight;    // 0..1 bright specular core
varying vec2 vUv;

mat2 rot(float a) {
  float c = cos(a), s = sin(a);
  return mat2(c, -s, s, c);
}

// Sample the brush stamp inside an anisotropic, rotated, organically warped
// brush footprint centred at sample point \`cp\`. Returns the brush
// contribution colour at this fragment.
vec3 sampleBrush(vec2 vUvLocal, vec2 cp, float angle) {
  vec2 rel = vUvLocal - cp;

  // Rotate INTO the brush's velocity-aligned local frame.
  vec2 local = rot(-angle) * rel;

  // Anisotropic scale: stretch along x (velocity direction).
  float aspect = 1.0 + uStretch * 1.6;
  vec2 scaled = local / vec2(uRadius * aspect, uRadius);

  float r = length(scaled);
  if (r > 1.5) return vec3(0.0);

  // Brush-local UV in [0,1] for the texture lookup.
  vec2 brushUV = scaled * 0.5 + 0.5;

  // Organic edge warp: perturb the lookup by the pattern itself.
  vec2 warpV = vec2(0.0);
  if (uWarp > 0.0) {
    vec3 base = texture2D(uBrush, clamp(brushUV, 0.0, 1.0)).rgb;
    warpV = (base.rg - 0.5) * uWarp * 0.18;
  }
  vec2 lookup = clamp(brushUV + warpV, 0.0, 1.0);
  vec3 pattern = texture2D(uBrush, lookup).rgb;

  // Smooth gaussian falloff.
  float falloff = exp(-r * r * mix(2.5, 14.0, uHardness));

  // Mix between flat-white brush and full shader pattern.
  vec3 brushColor = mix(vec3(1.0), pattern, clamp(uPatternMix, 0.0, 1.0));

  // Optional bright specular core to make the centre pop.
  float core = exp(-r * r * 18.0) * uHighlight;
  brushColor += vec3(core);

  return brushColor * falloff;
}

void main() {
  vec3 prev = texture2D(uPrev, vUv).rgb * uDecay;

  // Velocity direction (fall back to +X when nearly still so the brush
  // still has a defined orientation).
  vec2 vNorm = length(uVelocity) > 1e-4 ? normalize(uVelocity) : vec2(1.0, 0.0);
  float angle = atan(vNorm.y, vNorm.x);

  // Multi-stamp along the segment for continuous strokes even on fast moves.
  vec3 brush = vec3(0.0);
  const int STAMPS = 8;
  for (int i = 0; i < STAMPS; i++) {
    float t = (float(i) + 0.5) / float(STAMPS);
    vec2 cp = mix(uMousePrev, uMouse, t);
    brush = max(brush, sampleBrush(vUv, cp, angle));
  }

  brush *= uStrength * uFlow * uActive;

  vec3 col = prev + brush;
  col = min(col, vec3(2.0));   // small HDR headroom

  gl_FragColor = vec4(col, 1.0);
}
`;

const InteractiveTrailMesh = ({
  patternCanvas,
  baseMaterial,
  rotate = false,
  geometry = 'sphere',
  settings = {
    decay: 0.987,
    radius: 0.18,
    strength: 1.7,
    hardness: 0.35,
    flow: 0.7,
    bumpScale: 0.32,
    displacement: 0,
    patternMix: 1,
    stretch: 0.45,
    warp: 0.6,
    highlight: 0.35
  }
}) => {
  const { gl } = useThree();
  const meshRef = useRef();

  // 2K accumulator — gives the trail enough resolution to read sharply on
  // close-up surfaces, with HalfFloat to keep additive accumulation smooth.
  const fboOpts = {
    minFilter: THREE.LinearMipmapLinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat,
    type: THREE.HalfFloatType,
    depthBuffer: false,
    stencilBuffer: false,
    generateMipmaps: true,
    anisotropy: 16
  };
  const fboA = useFBO(2048, 2048, fboOpts);
  const fboB = useFBO(2048, 2048, fboOpts);
  const swapRef = useRef(0);

  const mouseRef = useRef(new THREE.Vector2(0.5, 0.5));
  const mousePrevRef = useRef(new THREE.Vector2(0.5, 0.5));
  const velocityRef = useRef(new THREE.Vector2(0, 0));
  const activeRef = useRef(0);

  // Brush stamp texture. ClampToEdge prevents wrap artifacts at the brush
  // border. Mipmaps + trilinear keep it sharp at any brush size.
  const brushTex = useMemo(() => {
    if (!patternCanvas) return null;
    const t = new THREE.CanvasTexture(patternCanvas);
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.magFilter = THREE.LinearFilter;
    t.generateMipmaps = true;
    t.anisotropy = 16;
    return t;
  }, [patternCanvas]);

  useEffect(() => () => brushTex?.dispose(), [brushTex]);

  // Offscreen brush scene.
  const brushScene = useMemo(() => new THREE.Scene(), []);
  const brushCam = useMemo(() => new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), []);
  const brushMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        uniforms: {
          uPrev: { value: null },
          uBrush: { value: brushTex },
          uMouse: { value: new THREE.Vector2(0.5, 0.5) },
          uMousePrev: { value: new THREE.Vector2(0.5, 0.5) },
          uVelocity: { value: new THREE.Vector2(0, 0) },
          uDecay: { value: settings.decay },
          uRadius: { value: settings.radius },
          uStrength: { value: settings.strength },
          uActive: { value: 0 },
          uHardness: { value: settings.hardness ?? 0.35 },
          uFlow: { value: settings.flow ?? 0.7 },
          uPatternMix: { value: settings.patternMix },
          uStretch: { value: settings.stretch ?? 0.45 },
          uWarp: { value: settings.warp ?? 0.6 },
          uHighlight: { value: settings.highlight ?? 0.35 }
        }
      }),
    [brushTex] // eslint-disable-line react-hooks/exhaustive-deps
  );

  useEffect(() => {
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), brushMat);
    brushScene.add(quad);
    return () => {
      brushScene.remove(quad);
      quad.geometry.dispose();
    };
  }, [brushScene, brushMat]);

  // Sphere material — clone of shared one so material-type chips
  // (Glass / Pearl / Brushed metal) are honoured, but stripped of pre-baked
  // maps so the surface starts clean.
  const sphereMat = useMemo(() => {
    const m = baseMaterial?.clone ? baseMaterial.clone() : new THREE.MeshPhysicalMaterial();
    m.map = null;
    m.normalMap = null;
    m.roughnessMap = null;
    m.bumpMap = null;
    m.aoMap = null;
    m.displacementMap = null;
    return m;
  }, [baseMaterial]);

  useFrame(() => {
    if (!brushMat) return;
    const r = swapRef.current;
    const read = r === 0 ? fboA : fboB;
    const write = r === 0 ? fboB : fboA;

    // Smooth the velocity so the brush orientation doesn't jitter.
    const newVel = new THREE.Vector2().subVectors(mouseRef.current, mousePrevRef.current);
    velocityRef.current.lerp(newVel, 0.35);

    brushMat.uniforms.uPrev.value = read.texture;
    brushMat.uniforms.uBrush.value = brushTex;
    if (brushTex) brushTex.needsUpdate = true;
    brushMat.uniforms.uMouse.value.copy(mouseRef.current);
    brushMat.uniforms.uMousePrev.value.copy(mousePrevRef.current);
    brushMat.uniforms.uVelocity.value.copy(velocityRef.current);
    brushMat.uniforms.uDecay.value = settings.decay;
    brushMat.uniforms.uRadius.value = settings.radius;
    brushMat.uniforms.uStrength.value = settings.strength;
    brushMat.uniforms.uActive.value = activeRef.current;
    brushMat.uniforms.uHardness.value = settings.hardness ?? 0.35;
    brushMat.uniforms.uFlow.value = settings.flow ?? 0.7;
    brushMat.uniforms.uPatternMix.value = settings.patternMix;
    brushMat.uniforms.uStretch.value = settings.stretch ?? 0.45;
    brushMat.uniforms.uWarp.value = settings.warp ?? 0.6;
    brushMat.uniforms.uHighlight.value = settings.highlight ?? 0.35;

    gl.setRenderTarget(write);
    gl.render(brushScene, brushCam);
    gl.setRenderTarget(null);

    sphereMat.map = write.texture;
    if (sphereMat.map) sphereMat.map.colorSpace = THREE.SRGBColorSpace;
    sphereMat.bumpMap = write.texture;
    sphereMat.bumpScale = settings.bumpScale;
    if (settings.displacement > 0) {
      sphereMat.displacementMap = write.texture;
      sphereMat.displacementScale = settings.displacement;
      sphereMat.displacementBias = -settings.displacement * 0.5;
    } else {
      sphereMat.displacementMap = null;
      sphereMat.displacementScale = 0;
    }

    swapRef.current = 1 - r;
    mousePrevRef.current.copy(mouseRef.current);

    if (meshRef.current && rotate) {
      meshRef.current.rotation.y += 0.0025;
    }
  });

  const onMove = (e) => {
    if (e.uv) {
      mouseRef.current.set(e.uv.x, e.uv.y);
      activeRef.current = 1;
    }
  };
  const onLeave = () => { activeRef.current = 0; };

  const geo =
    geometry === 'box' ? (
      <boxGeometry args={[1.3, 1.3, 1.3, 256, 256, 256]} />
    ) : geometry === 'torus' ? (
      <torusKnotGeometry args={[0.7, 0.22, 320, 48]} />
    ) : geometry === 'plane' ? (
      <planeGeometry args={[2, 2, 256, 256]} />
    ) : (
      <sphereGeometry args={[1, 256, 256]} />
    );

  return (
    <mesh
      ref={meshRef}
      castShadow
      receiveShadow
      onPointerMove={onMove}
      onPointerEnter={onMove}
      onPointerLeave={onLeave}
    >
      {geo}
      <primitive attach="material" object={sphereMat} />
    </mesh>
  );
};

export default InteractiveTrailMesh;
