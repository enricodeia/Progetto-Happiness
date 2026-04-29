import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

// GLSL port of prinzipiell's scenic-backdrop TSL shader
// (https://github.com/prinzipiell/tsl/tree/main/scenic-backdrop).
// The original ran on three/tsl + WebGPURenderer + 2 noise textures
// (bmp01.jpg + tex12.png). We're on R3F v8 / WebGL, so the texture
// lookups are replaced with a 2D value-noise function that produces a
// comparable low-freq smoothness — the night sky / ocean / moon / horizon
// composition + tweakables (gamma, horizon, moonlight) are unchanged.

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`

const FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform vec2  uResolution;
  uniform float uTime;
  uniform float uGamma;
  uniform float uHorizon;
  uniform float uMoonlight;

  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }

  // Stand-ins for the original .x / .y / .z lookups
  float tex1(vec2 p) { return vnoise(p * 4.0); }
  vec3  tex1rgb(vec2 p) {
    return vec3(
      vnoise(p * 4.0),
      vnoise(p * 4.0 + 17.3),
      vnoise(p * 4.0 - 11.7)
    );
  }
  // Higher-freq star/sparkle field for the original tex02 lookups
  float tex2x(vec2 p) { return vnoise(p * 22.0); }
  float tex2y(vec2 p) { return vnoise(p * 22.0 + 31.7); }

  float fbm(vec2 p) {
    return 1.5000 * tex1(p * 1.00)
         + 1.2500 * tex1(p * 2.02)
         + 1.1250 * tex1(p * 4.02)
         + 1.0675 * tex1(p * 8.02);
  }

  float fbm2(vec2 p) {
    return 0.5000 * tex1(p * 1.00)
         + 0.2500 * tex1(p * 2.02)
         + 0.1250 * tex1(p * 4.02)
         + 0.0675 * tex1(p * 8.02);
  }

  vec3 applyGamma(vec3 v) {
    return pow(v, vec3(1.0 / uGamma));
  }

  void main() {
    float tick = mod(uTime * 0.4, 458.0);
    float aspect = uResolution.x / uResolution.y;
    vec2 uv = (vUv - 0.5) * vec2(aspect, -1.0) * 2.0;

    vec2 p = uv;
    p += vec2(1.0, 3.0) * 0.002 * 2.0 * cos(tick) * (2.0 + vec2(0.0, 1.5));
    p += vec2(1.0, 3.0) * 0.001 * 1.0 * cos(tick) * (5.0 + vec2(1.0, 4.5));
    p *= 0.95 + 0.05 * length(p);
    float an = 0.03 * sin(0.1 * tick);
    float co = cos(an);
    float si = sin(an);
    p = mat2(co, -si, si, co) * p;

    // water
    vec2 q = vec2(p.x, -1.0) / (p.y - 0.1);
    q.y -= 0.3 * tick * 0.001;
    float off = tex1(0.1 * mod(tick * 0.001, 2.0) * q * vec2(1.0, -1.0) - vec2(0.0, 0.007 * tick));
    q = (q + 0.4) / (1.0 + 50.0 * off);
    vec3 col = tex1rgb(1.9 * q * mod(tick * 0.0005, 12.0) * vec2(0.5, 8.0) + vec2(0.0, 0.01 * tick)).zyx;
    col *= 0.4;
    float re = 1.0 - smoothstep(0.0, 0.7, abs(p.x - 0.6) - (abs(p.y) * 0.3 + 0.2));
    col += 0.1 * vec3(1.0, 0.9, 0.73) * re * 0.2 * off * 5.0 * (1.0 - col.x);
    float re2 = 1.0 - smoothstep(0.0, 2.0, abs(p.x - 0.6) - abs(p.y + 0.2) * 0.85);
    col += 0.5 * vec3(1.0, 0.9, 0.73) * re * 0.2 * off * uMoonlight * (1.0 - col.x);

    // sky
    vec3 sky = vec3(0.01, 0.03, 0.10);
    sky += 2.8 * smoothstep(0.90, 1.0, tex2x(3.5 * (p + tick * 0.1) * 0.29)) * 1.6;
    sky += 2.1 * smoothstep(0.50, 1.0, tex2y(2.5 * (p / 0.01 + tick) * 0.02));
    sky += 2.3 * pow(abs(0.5 - max(0.0, p.y)), 5.0);

    // clouds
    float f = fbm(0.002 * vec2(p.x, 1.0) / p.y);
    vec3 cloud = vec3(0.3, 0.4, 0.5) * 0.7 * (1.0 - 0.85 * sqrt(smoothstep(0.4, 1.0, f)));
    sky = mix(sky, cloud, 0.95 * smoothstep(0.4, 0.6, f));
    sky = mix(sky, vec3(0.33, 0.34, 0.35), pow(1.0 - max(0.0, p.y), 5.0 + sin(uTime) * 2.0));
    col = mix(col, sky, smoothstep(0.0, 0.1, p.y));

    // moon
    float ddd = length(p - vec2(0.58, 0.45));
    float moontex = (0.8 + 0.2) * smoothstep(0.25, 0.7, fbm2((0.3 + sin(uTime) * (0.01 + sin(uTime) * 0.018)) * (1.0 - p)));
    vec3 moon = vec3(1.0, 0.97, 0.9);
    col += moon * exp((1.0 - 5.0) * ddd + moontex * 0.15 + col.r);

    // horizon
    col += uHorizon * cos(tick / 120.0) * pow(clamp(1.0 - abs(1.0 - (p.y + 0.96)), 0.0, 1.0), 9.0);

    // post
    col *= 1.4;
    col = pow(col, vec3(1.5, 1.2, 1.0));
    col = applyGamma(col);

    // blend-in
    col *= smoothstep(0.0, 4.0, tick);

    gl_FragColor = vec4(col, 1.0);
  }
`

export default function ScenicBackdrop({ gamma = 0.87, horizon = 0.36, moonlight = 8.0 }) {
  const matRef = useRef()
  const { size } = useThree()

  const uniforms = useMemo(() => ({
    uTime:       { value: 0 },
    uResolution: { value: new THREE.Vector2(size.width, size.height) },
    uGamma:      { value: gamma },
    uHorizon:    { value: horizon },
    uMoonlight:  { value: moonlight },
  }), []) // eslint-disable-line react-hooks/exhaustive-deps

  useFrame((state) => {
    if (!matRef.current) return
    const u = matRef.current.uniforms
    u.uTime.value = state.clock.elapsedTime
    u.uResolution.value.set(state.size.width, state.size.height)
    u.uGamma.value = gamma
    u.uHorizon.value = horizon
    u.uMoonlight.value = moonlight
  })

  return (
    <mesh frustumCulled={false} renderOrder={-1}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={VERT}
        fragmentShader={FRAG}
        uniforms={uniforms}
        depthTest={false}
        depthWrite={false}
      />
    </mesh>
  )
}
