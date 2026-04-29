#include ../simplex.glsl;

uniform sampler2D uTrailSmokeMap;
uniform sampler2D uPerlin;
uniform float uTime;

uniform float uGlitterScale;
uniform float uGlitterPower;
uniform float uGlitterIntensity;
uniform float uPerlinScale1;
uniform float uPerlinScale2;
uniform float uPerlinSpeed;
uniform float uAlphaPower;
uniform float uMaxAlpha;
uniform vec3 uFrostColor;
uniform float uFrostVignetteStart;
uniform float uFrostVignetteEnd;
uniform vec3 uFrostBgColor;

varying vec2 vUv;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  vec3 trail = texture(uTrailSmokeMap, vUv).rgb;
  float trailIntensity = max(trail.r, max(trail.g, trail.b));

  // Soft pollen haze - large slow-moving puffs
  float haze1 = texture(uPerlin, vUv * uPerlinScale1 * 0.5 + vec2(uTime * uPerlinSpeed, 0.0)).r;
  float haze2 = texture(uPerlin, vUv * uPerlinScale2 + vec2(0.0, uTime * uPerlinSpeed * 0.7)).r;
  float haze = haze1 * 0.6 + haze2 * 0.4;

  // === POLLEN PARTICLES ===
  // Cell-based pollen for distinct dots that drift
  vec2 pollenUV = vUv * uGlitterScale * 0.3;
  // Drifting motion
  pollenUV.x += sin(uTime * 0.4 + vUv.y * 5.0) * 0.3;
  pollenUV.y += cos(uTime * 0.3 + vUv.x * 4.0) * 0.2 + uTime * 0.05;

  vec2 pollenCell = floor(pollenUV);
  vec2 pollenLocal = fract(pollenUV) - 0.5;
  float pollenH = hash(pollenCell);
  // Each pollen has random offset within its cell
  pollenLocal -= vec2(pollenH - 0.5, hash(pollenCell + 17.3) - 0.5) * 0.6;
  float pollenDist = length(pollenLocal);
  float pollenSize = 0.05 + pollenH * 0.08;
  float pollen = smoothstep(pollenSize, 0.0, pollenDist);
  pollen *= step(0.4, pollenH); // Only some cells have pollen
  pollen *= 0.3 + pollenH * 0.7; // Vary brightness

  // === FIREFLIES (rare bright glows) ===
  vec2 ffUV = vUv * uGlitterScale * 0.08;
  ffUV.x += sin(uTime * 0.6 + vUv.y * 3.0) * 0.5;
  ffUV.y += cos(uTime * 0.4 + vUv.x * 2.5) * 0.4;
  vec2 ffCell = floor(ffUV);
  vec2 ffLocal = fract(ffUV) - 0.5;
  float ffH = hash(ffCell + 99.0);
  ffLocal -= vec2(ffH - 0.5, hash(ffCell + 33.0) - 0.5) * 0.7;
  float ffDist = length(ffLocal);
  // Firefly pulses
  float ffPulse = sin(uTime * 3.0 + ffH * 6.28) * 0.5 + 0.5;
  ffPulse = pow(ffPulse, 2.0);
  float firefly = smoothstep(0.05, 0.0, ffDist) * ffPulse;
  firefly *= step(0.92, ffH); // Very rare

  // Halo around firefly
  float ffHalo = smoothstep(0.18, 0.04, ffDist) * 0.3 * ffPulse * step(0.92, ffH);

  // === COMPOSE ===
  // Base haze color (warm pollen tint)
  vec3 baseColor = uFrostColor * (0.5 + haze * 0.8);

  vec3 color = baseColor;
  // Pollen as warm glow
  color += pollen * uGlitterIntensity * uFrostColor * 1.5;
  // Firefly warm yellow-green glow
  vec3 fireflyColor = vec3(1.0, 0.9, 0.4);
  color += firefly * 6.0 * fireflyColor;
  color += ffHalo * fireflyColor;

  // Trail makes particles more dense
  float trailHaze = pow(trailIntensity, 0.4);

  // Alpha: combine haze + trail + particles
  float a = haze * 0.3 + pollen * 0.6 + firefly + ffHalo * 0.5;
  a *= 0.5 + trailHaze * 0.5;
  a = pow(a, uAlphaPower);

  // Vignette
  vec2 uv = vUv - 0.5;
  uv *= 2.0;
  color = mix(color, uFrostBgColor, smoothstep(uFrostVignetteStart, uFrostVignetteEnd, length(uv)));

  gl_FragColor = vec4(color, clamp(a, 0.0, uMaxAlpha));

  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
