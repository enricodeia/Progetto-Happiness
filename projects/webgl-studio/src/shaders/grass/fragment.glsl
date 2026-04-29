#include ../perlin.glsl;

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

uniform vec3 uColorBlue;      // grass mid green
uniform vec3 uColorDeepBlue;  // grass dark / shadow
uniform vec3 uColorGreen;     // grass tip / highlight
uniform vec3 uColorAccent;    // wildflower color
uniform float uCrackScale;    // blade density
uniform float uCrackIntensity;
uniform float uFrostedIntensity;
uniform float uPerlinDetailScale;
uniform float uVignetteStart;
uniform float uVignetteEnd;
uniform vec3 uBgColor;

uniform vec3 uTrailTint;
uniform float uTrailGlow;

uniform vec3 uDeepWaterColor;
uniform float uDeepRevealThreshold;
uniform float uDeepRevealIntensity;

varying vec2 vParallax;
varying vec2 vUv;

// Hash for blade randomization
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

// 2D blade cell pattern
float bladeCell(vec2 uv, float windOffset) {
  vec2 cell = floor(uv);
  vec2 local = fract(uv) - 0.5;

  float h = hash(cell);
  // Blade lean direction from hash + wind
  float lean = (h - 0.5) * 0.6 + windOffset;
  // Blade width varies
  float width = 0.06 + h * 0.08;

  // Blade shape: vertical line with lean
  local.x -= local.y * lean;
  float blade = smoothstep(width, width * 0.2, abs(local.x));
  // Taper at top
  blade *= smoothstep(-0.5, 0.0, local.y);
  // Soft at bottom
  blade *= smoothstep(0.5, 0.2, local.y);

  return blade * (0.6 + h * 0.4);
}

void main() {
  float discDist = length(vUv - 0.5);
  if (discDist > uDiscRadius) discard;

  vec3 trail = texture(uTrailMap, vUv).rgb;
  float trailIntensity = max(trail.r, max(trail.g, trail.b));

  // Wind - large and small scale
  float windLarge = cnoise(vec3(vUv * 3.0, uTime * 0.4)) * 0.5 + 0.5;
  float windMed   = cnoise(vec3(vUv * 7.0, uTime * 0.7));
  float windSmall  = cnoise(vec3(vUv * 15.0 + 50.0, uTime * 1.2));
  float windDir = sin(uTime * 0.3) * 0.3 + windMed * 0.15;

  // === LAYER 1: Base ground / soil ===
  float soilNoise = texture(uPerlin, vUv * 6.0).r;
  vec3 soilColor = uColorDeepBlue * (0.5 + soilNoise * 0.5);

  // === LAYER 2: Dense short grass (low frequency) ===
  float shortGrass = cnoise(vec3(vUv * uCrackScale * 2.0 + windDir * 0.5, 0.0));
  shortGrass = shortGrass * 0.5 + 0.5;
  shortGrass = pow(shortGrass, 0.6);
  vec3 shortGrassColor = mix(uColorDeepBlue, uColorBlue, shortGrass);
  // Sunlight variation
  float sun = texture(uPerlin, vUv * uPerlinDetailScale * 0.5 + uTime * 0.01).r;
  shortGrassColor += sun * uColorGreen * uFrostedIntensity * 0.3;

  // === LAYER 3: Tall blade grass (high frequency, individual blades) ===
  float bladeScale = uCrackScale * 8.0;
  vec2 bladeUV = vUv * bladeScale;
  // Apply wind bend to blade UV
  bladeUV.x += windDir * 2.0 + windSmall * 0.5;
  // Parallax offset for depth
  bladeUV += vParallax * 0.5;

  float blades1 = bladeCell(bladeUV, windDir);
  float blades2 = bladeCell(bladeUV * 0.7 + 17.3, windDir * 0.8);
  float blades3 = bladeCell(bladeUV * 1.3 + 43.7, windDir * 1.2);
  float blades = max(blades1, max(blades2 * 0.8, blades3 * 0.6));

  // Blade color: tips are brighter
  vec3 bladeColor = mix(uColorBlue, uColorGreen, blades * 1.2);
  // Wind-lit highlights on blades
  float windHighlight = pow(windLarge, 2.0) * 0.4;
  bladeColor += windHighlight * uColorGreen;

  // === LAYER 4: Parallax depth layers ===
  float depthGrass = 0.0;
  float depthWeight = 0.0;
  for (int i = 0; i < 20; i++) {
    float layer = float(i) / 20.0;
    float amp = 1.0 - layer;
    vec2 layerUV = vUv * uCrackScale * 3.0 + vParallax * 0.004 * float(i + 1);
    layerUV.x += windDir * layer * 3.0 + sin(uTime * 1.5 + vUv.y * 10.0) * 0.02 * layer;

    float layerPattern = cnoise(vec3(layerUV, float(i) * 1.7));
    layerPattern = max(0.0, layerPattern);
    layerPattern = pow(layerPattern, 0.8);

    // Trail pushes top layers more
    float push = pow(trailIntensity, 0.5) * layer;
    layerPattern *= 1.0 - push;

    depthGrass += layerPattern * amp;
    depthWeight += amp;
  }
  depthGrass /= depthWeight;

  // === COMPOSE ===
  // Start with soil
  vec3 color = soilColor;
  // Short grass on top
  color = mix(color, shortGrassColor, 0.85);
  // Depth grass adds density variation
  color = mix(color, uColorGreen * 1.5, depthGrass * 0.5 * uCrackIntensity);
  // Tall blades on top of everything
  color = mix(color, bladeColor, blades * uCrackIntensity);

  // === WILDFLOWERS ===
  float flowerNoise = cnoise(vec3(vUv * 45.0, uTime * 0.03));
  float flowers = smoothstep(0.75, 0.85, flowerNoise * 0.5 + 0.5);
  // Second species
  float flower2 = cnoise(vec3(vUv * 55.0 + 100.0, uTime * 0.02));
  float flowers2 = smoothstep(0.8, 0.9, flower2 * 0.5 + 0.5);
  vec3 flower2Color = vec3(uColorAccent.b, uColorAccent.r, uColorAccent.g); // shifted hue
  color = mix(color, uColorAccent, flowers * 0.7 * (1.0 - trailIntensity));
  color = mix(color, flower2Color, flowers2 * 0.5 * (1.0 - trailIntensity));

  // === WIND WAVES (visible shimmer across field) ===
  float windWave = sin(vUv.x * 30.0 + vUv.y * 10.0 + uTime * 3.0 + windMed * 5.0);
  windWave = windWave * 0.5 + 0.5;
  windWave = pow(windWave, 4.0) * 0.15;
  color += windWave * uColorGreen * (1.0 - trailIntensity * 0.8);

  // === TRAIL PATH (grass parted) ===
  float pathIntensity = pow(trailIntensity, 0.4);
  // Flatten blades, reveal lower layers
  vec3 flatGrass = mix(uColorDeepBlue * 0.7, uColorBlue * 0.5, soilNoise);
  flatGrass *= uTrailTint;
  color = mix(color, flatGrass, pathIntensity * 0.7);

  // Trail glow
  color += uTrailGlow * pow(trailIntensity, 2.0) * uTrailTint;

  // === DEEP REVEAL (dirt/earth) ===
  float deepReveal = smoothstep(uDeepRevealThreshold, uDeepRevealThreshold + 0.15, trailIntensity);
  float dirtDetail = texture(uPerlin, vUv * 12.0).r;
  float dirtDetail2 = texture(uPerlin, vUv * 20.0 + 0.3).r;
  vec3 dirt = uDeepWaterColor;
  dirt += dirtDetail * 0.06;
  // Small stones
  float stones = cnoise(vec3(vUv * 80.0, 0.0));
  stones = smoothstep(0.8, 0.85, stones * 0.5 + 0.5);
  dirt += stones * vec3(0.12, 0.1, 0.08);
  // Roots
  float roots = abs(cnoise(vec3(vUv * 40.0, 1.0)));
  roots = smoothstep(0.02, 0.0, roots) * 0.15;
  dirt += roots * vec3(0.1, 0.06, 0.02);
  color = mix(color, dirt, deepReveal * uDeepRevealIntensity);

  // === VIGNETTE ===
  vec2 uv = vUv - 0.5;
  uv *= 2.0;
  color = mix(color, uBgColor, smoothstep(uVignetteStart, uVignetteEnd, length(uv)));

  gl_FragColor = vec4(color, 1.0);

  float fogFactor = smoothstep(uFogNear, uFogFar, vFogDepth) * uFogEnabled;
  gl_FragColor.rgb = mix(gl_FragColor.rgb, uFogColor, fogFactor);

  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
