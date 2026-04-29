uniform sampler2D uCracksMap;
uniform sampler2D uTrailMap;
uniform sampler2D uPerlin;
uniform float uTime;
uniform float uDiscRadius;
uniform vec3 uFogColor;
uniform float uFogNear;
uniform float uFogFar;
uniform float uFogEnabled;

varying float vFogDepth;

// Tweakable uniforms
uniform vec3 uColorBlue;
uniform vec3 uColorDeepBlue;
uniform vec3 uColorGreen;
uniform vec3 uColorAccent;
uniform float uCrackScale;
uniform float uCrackIntensity;
uniform float uFrostedIntensity;
uniform float uPerlinDetailScale;
uniform float uVignetteStart;
uniform float uVignetteEnd;
uniform vec3 uBgColor;

// Trail tint & glow
uniform vec3 uTrailTint;
uniform float uTrailGlow;

// Deep water reveal
uniform vec3 uDeepWaterColor;
uniform float uDeepRevealThreshold;
uniform float uDeepRevealIntensity;

varying vec2 vParallax;
varying vec2 vUv;

void main() {
  float discDist = length(vUv - 0.5);
  if (discDist > uDiscRadius) discard;

  float perlin = texture(uPerlin, vUv).r;
  float perlin2 = texture(uPerlin, vUv * uPerlinDetailScale).r;
  vec3 trail = texture(uTrailMap, vUv).rgb;
  float trailIntensity = max(trail.r, max(trail.g, trail.b));
  float cracks = texture(uCracksMap, vUv * uCrackScale).r;
  float nomalization = 1.0;

  float accumulateFrosted = 0.;

  for (int i = 0; i < 50; i++) {
    float aplitude = float(70 - i) / 1.;
    vec2 uv = vUv * uCrackScale + vParallax * 0.002 * float(i + 1);

    float currCrack = (1. - texture(uCracksMap, uv ).r) * aplitude;

    float currTrail = texture(uTrailMap, vUv + vParallax * 0.0025 * float(i + 1)).r;
    currTrail = max(currTrail, texture(uTrailMap, vUv + vParallax * 0.0025 * float(i + 1)).g);
    currTrail = max(currTrail, texture(uTrailMap, vUv + vParallax * 0.0025 * float(i + 1)).b);

    currCrack = currCrack * step(0.7, 1. - pow(currTrail,0.7));

    cracks += currCrack * uCrackIntensity;
    nomalization += aplitude;

    accumulateFrosted += currTrail * aplitude;
  }
  cracks /= nomalization;
  accumulateFrosted /= nomalization;
  cracks += pow(1. - texture(uCracksMap, vUv * uCrackScale).r, 3.) * 3. * step(0.92, 1. - pow(trailIntensity,0.6));

  vec3 cracksParallax = texture(uCracksMap, vUv * 2. + vParallax * 0.1).rgb;

  vec3 frosted = uColorBlue * 3. + perlin * uFrostedIntensity + perlin2 * uFrostedIntensity;
  frosted *= uTrailTint;

  vec3 cracksColor = mix(uColorBlue, uColorGreen, pow(cracks,1.) * 1.);
  cracksColor += pow(cracks,1.) * 2.;
  cracksColor *= perlin * 8. * uColorBlue;
  cracksColor += pow(cracks,1.) * 0.5;

  vec3 prxCracksColor = mix(uColorDeepBlue, uColorBlue, pow(1. - cracksParallax.r,3.) * 10.);
  prxCracksColor *= perlin;

  cracksColor = mix(cracksColor, prxCracksColor, 0.3);

  vec3 deepColor = mix(uColorAccent, vec3(0., 0.3, 1.), 1. - pow(accumulateFrosted,1.5));
  cracksColor = mix(cracksColor, deepColor, pow(accumulateFrosted,1.5));
  vec3 color = mix(cracksColor, frosted, pow(trailIntensity,0.5) );

  // Additive trail glow
  color += uTrailGlow * pow(trailIntensity, 2.0) * uTrailTint;

  // Deep water reveal
  float deepReveal = smoothstep(uDeepRevealThreshold, uDeepRevealThreshold + 0.25, trailIntensity);
  // Animated caustics under the ice
  float caustic1 = texture(uPerlin, vUv * 3.0 + uTime * 0.03).r;
  float caustic2 = texture(uPerlin, vUv * 5.0 - uTime * 0.02 + 0.5).r;
  float caustics = pow(caustic1 * caustic2, 0.5) * 0.3;
  vec3 waterColor = uDeepWaterColor + caustics * uDeepWaterColor * 2.0;
  color = mix(color, waterColor, deepReveal * uDeepRevealIntensity);

  // Vignette
  vec2 uv = vUv - 0.5;
  uv *= 2.0;
  color = mix(color, uBgColor, smoothstep(uVignetteStart, uVignetteEnd, length(pow(abs(uv), vec2(1.)))));

  gl_FragColor = vec4(color,1.);

  float fogFactor = smoothstep(uFogNear, uFogFar, vFogDepth) * uFogEnabled;
  gl_FragColor.rgb = mix(gl_FragColor.rgb, uFogColor, fogFactor);

  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
