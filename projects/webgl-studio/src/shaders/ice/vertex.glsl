uniform float uParallaxDistance;
uniform sampler2D uTrailMap;
uniform float uDisplacementStrength;
uniform vec3 uShockwave; // xy = UV position, z = progress 0-1
uniform float uShockwaveStrength;
uniform vec4 uHills[4];  // xy = center, z = height, w = radius
uniform vec3 uFogColor;
uniform float uFogNear;
uniform float uFogFar;

varying vec2 vParallax;
varying vec2 vUv;
varying float vFogDepth;
varying float vHillHeight;

float hillAt(vec2 xz) {
  float h = 0.0;
  for (int i = 0; i < 4; i++) {
    vec4 H = uHills[i];
    if (H.w < 0.001 || H.z == 0.0) continue;
    vec2 d = xz - H.xy;
    float sigma = H.w * 0.5;
    h += H.z * exp(-dot(d, d) / (2.0 * sigma * sigma));
  }
  return h;
}

void main() {

  vUv = uv;

  vec3 pos = position;

  // Sample trail map for displacement
  vec3 trail = texture(uTrailMap, uv).rgb;
  float trailIntensity = max(trail.r, max(trail.g, trail.b));

  // Displace along normal (works for any geometry)
  pos -= normal * trailIntensity * uDisplacementStrength;

  // Shockwave ring
  if (uShockwave.z > 0.0 && uShockwave.z < 1.0) {
    float shockDist = distance(uv, uShockwave.xy);
    float ringRadius = uShockwave.z * 0.6;
    float ringWidth = 0.03 + uShockwave.z * 0.02;
    float ring = smoothstep(ringRadius - ringWidth, ringRadius, shockDist) *
                 smoothstep(ringRadius + ringWidth, ringRadius, shockDist);
    float fade = 1.0 - uShockwave.z;
    fade = fade * fade; // Quadratic falloff
    pos += normal * ring * uShockwaveStrength * fade;
  }

  // Apply hill displacement in model space (plane is already rotated to XZ)
  float hillH = hillAt(pos.xz);
  pos.y += hillH;
  vHillHeight = hillH;

  vec4 wPos = modelMatrix * vec4(pos, 1.0);
  vFogDepth = -(viewMatrix * wPos).z;

  // Parallax
  mat3 tbn = mat3(vec3(1.,0,0), vec3(0,0.,-1.), vec3(0.,1.,0.));
  tbn = transpose(tbn);

  vec3 viewDir = normalize(wPos.xyz - cameraPosition);
  vec3 tbnViewDir = tbn * viewDir;

  vParallax = tbnViewDir.xy;
  vParallax *= uParallaxDistance / dot(-tbnViewDir, vec3(0.0,0.0,1.0));

  gl_Position = projectionMatrix * viewMatrix * wPos;

}
