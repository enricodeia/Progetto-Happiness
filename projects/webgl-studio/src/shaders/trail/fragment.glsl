#include ../perlin.glsl;

uniform vec2 uResolution;
uniform sampler2D uMap;
uniform vec2 uUVPointer;
uniform float uDt;
uniform float uTime;

// Tweakable uniforms
uniform float uBrushSize;
uniform float uBrushSoftness;
uniform float uDecayRate;
uniform float uNoiseScale1;
uniform float uNoiseScale2;
uniform float uNoiseAmount1;
uniform float uNoiseAmount2;
uniform float uTexelScale;
uniform float uTrailIntensity;

// Symmetry
uniform int uSymmetry;

// Trail color
uniform vec3 uTrailColor;

// Impact
uniform float uImpactStrength;
uniform float uImpactRadius;
uniform int uImpactRays;

varying vec2 vUv;

float getSymmetricDistance(vec2 uv, vec2 ptr) {
  vec2 c = vec2(0.5);
  float d = distance(uv, ptr);

  if (uSymmetry == 1 || uSymmetry == 3) {
    d = min(d, distance(uv, vec2(1.0 - ptr.x, ptr.y)));
  }
  if (uSymmetry == 2 || uSymmetry == 3) {
    d = min(d, distance(uv, vec2(ptr.x, 1.0 - ptr.y)));
  }
  if (uSymmetry == 3) {
    d = min(d, distance(uv, vec2(1.0 - ptr.x, 1.0 - ptr.y)));
  }

  if (uSymmetry >= 4) {
    int segments = 4;
    if (uSymmetry == 5) segments = 6;
    if (uSymmetry == 6) segments = 8;

    vec2 rel = ptr - c;
    float baseAngle = 6.28318530718 / float(segments);

    for (int i = 1; i < 8; i++) {
      if (i >= segments) break;
      float a = baseAngle * float(i);
      float ca = cos(a), sa = sin(a);
      vec2 rotated = c + vec2(rel.x * ca - rel.y * sa, rel.x * sa + rel.y * ca);
      d = min(d, distance(uv, rotated));
    }
  }

  return d;
}

float getSymmetricCrack(vec2 uv, vec2 ptr) {
  vec2 c = vec2(0.5);
  float result = 0.0;

  // Compute crack for a single pointer position
  vec2 dir = uv - ptr;
  float dist = length(dir);
  float angle = atan(dir.y, dir.x);

  float raySpacing = 6.28318 / float(uImpactRays);
  float crackLines = abs(sin(angle * float(uImpactRays) * 0.5 + cnoise(vec3(uv * 15.0, uTime * 0.3)) * 1.5));
  crackLines = smoothstep(0.15, 0.0, crackLines);

  // Sub-cracks: finer cracks branching off
  float subCracks = abs(sin(angle * float(uImpactRays) * 2.0 + cnoise(vec3(uv * 30.0, uTime * 0.2)) * 2.0));
  subCracks = smoothstep(0.1, 0.0, subCracks) * 0.5;

  float crack = max(crackLines, subCracks);
  crack *= smoothstep(uImpactRadius, uImpactRadius * 0.1, dist);
  crack *= uImpactStrength;

  result = crack;

  // Apply symmetry to cracks
  if (uSymmetry == 1 || uSymmetry == 3) {
    vec2 mPtr = vec2(1.0 - ptr.x, ptr.y);
    dir = uv - mPtr; dist = length(dir); angle = atan(dir.y, dir.x);
    crackLines = abs(sin(angle * float(uImpactRays) * 0.5 + cnoise(vec3(uv * 15.0, uTime * 0.3)) * 1.5));
    crackLines = smoothstep(0.15, 0.0, crackLines);
    crack = crackLines * smoothstep(uImpactRadius, uImpactRadius * 0.1, dist) * uImpactStrength;
    result = max(result, crack);
  }
  if (uSymmetry == 2 || uSymmetry == 3) {
    vec2 mPtr = vec2(ptr.x, 1.0 - ptr.y);
    dir = uv - mPtr; dist = length(dir); angle = atan(dir.y, dir.x);
    crackLines = abs(sin(angle * float(uImpactRays) * 0.5 + cnoise(vec3(uv * 15.0, uTime * 0.3)) * 1.5));
    crackLines = smoothstep(0.15, 0.0, crackLines);
    crack = crackLines * smoothstep(uImpactRadius, uImpactRadius * 0.1, dist) * uImpactStrength;
    result = max(result, crack);
  }
  if (uSymmetry == 3) {
    vec2 mPtr = vec2(1.0 - ptr.x, 1.0 - ptr.y);
    dir = uv - mPtr; dist = length(dir); angle = atan(dir.y, dir.x);
    crackLines = abs(sin(angle * float(uImpactRays) * 0.5 + cnoise(vec3(uv * 15.0, uTime * 0.3)) * 1.5));
    crackLines = smoothstep(0.15, 0.0, crackLines);
    crack = crackLines * smoothstep(uImpactRadius, uImpactRadius * 0.1, dist) * uImpactStrength;
    result = max(result, crack);
  }

  if (uSymmetry >= 4) {
    int segments = 4;
    if (uSymmetry == 5) segments = 6;
    if (uSymmetry == 6) segments = 8;
    vec2 rel = ptr - c;
    float ba = 6.28318530718 / float(segments);
    for (int i = 1; i < 8; i++) {
      if (i >= segments) break;
      float a = ba * float(i);
      vec2 rotated = c + vec2(rel.x * cos(a) - rel.y * sin(a), rel.x * sin(a) + rel.y * cos(a));
      dir = uv - rotated; dist = length(dir); angle = atan(dir.y, dir.x);
      crackLines = abs(sin(angle * float(uImpactRays) * 0.5 + cnoise(vec3(uv * 15.0, uTime * 0.3)) * 1.5));
      crackLines = smoothstep(0.15, 0.0, crackLines);
      crack = crackLines * smoothstep(uImpactRadius, uImpactRadius * 0.1, dist) * uImpactStrength;
      result = max(result, crack);
    }
  }

  return result;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  vec2 texel = vec2(1.0) / uResolution;

  texel *= uTexelScale;

  vec3 mapColor = texture(uMap,uv).rgb;
  vec3 mapColor1 = texture(uMap,uv + texel).rgb;
  vec3 mapColor2 = texture(uMap,uv - texel).rgb;
  vec3 mapColor3 = texture(uMap,uv + texel * vec2(-1,1)).rgb;
  vec3 mapColor4 = texture(uMap,uv + texel * vec2(1,-1)).rgb;
  vec3 mapMix = (mapColor1 + mapColor2 + mapColor3 + mapColor4) / 4.0;
  vec3 mapMin = min(min(mapColor1,mapColor2), min(mapColor3, mapColor4));

  if(mapMix.r < mapColor.r) {
    mapColor = mapMix;
  } else {
    mapColor = mapMin;
  }
  mapColor *= 1.0 - uDt * uDecayRate;

  // Normal brush
  float d = getSymmetricDistance(uv, uUVPointer);
  d += cnoise(vec3(uv * uNoiseScale1, uTime)) * uNoiseAmount1;
  d += cnoise(vec3(uv * uNoiseScale2 + 100., uTime)) * uNoiseAmount2;

  float outer = uBrushSize;
  float inner = uBrushSize * uBrushSoftness;
  float t = smoothstep(outer, inner, d) * uTrailIntensity;

  // Impact cracks (additive)
  if (uImpactStrength > 0.0) {
    float crackT = getSymmetricCrack(uv, uUVPointer);
    t = max(t, crackT);
  }

  vec3 color = mix(mapColor, uTrailColor, clamp(t, 0.0, 1.0));
  color = clamp(color, 0.0, 1.0);

  gl_FragColor = vec4(color, 1.0);
}
