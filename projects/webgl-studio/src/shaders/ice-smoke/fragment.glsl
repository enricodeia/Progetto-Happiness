#include ../simplex.glsl;

uniform sampler2D uTrailSmokeMap;
uniform sampler2D uPerlin;
uniform float uTime;

// Tweakable uniforms
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

float rand(vec2 n) {
	return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
}

void main() {

  float perlin = texture(uPerlin, vUv * uPerlinScale1 + uTime * uPerlinSpeed).r;
  float perlin2 = texture(uPerlin, vUv * uPerlinScale2 + uTime * uPerlinSpeed).r;
  vec3 trail = texture(uTrailSmokeMap, vUv).rgb;

  float t = perlin * 0.3 + perlin2 * 0.3;
  vec3 frosted = uFrostColor + t;

  float glitter = snoise(vec3(vUv * uGlitterScale, uTime * 1.)) * 0.5 + 0.5;
  glitter = pow(glitter, uGlitterPower);

  float a = pow(trail.r, uAlphaPower);

  vec3 color = frosted;
  float g = smoothstep(0.01, 0.06, glitter) * uGlitterIntensity;
  color += g;

  vec2 uv = vUv - 0.5;
  uv *= 2.0;
  color = mix(color, uFrostBgColor, smoothstep(uFrostVignetteStart, uFrostVignetteEnd, length(pow(abs(uv), vec2(1.)))));

  gl_FragColor = vec4(color, clamp(a * 1., 0., uMaxAlpha));

  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
