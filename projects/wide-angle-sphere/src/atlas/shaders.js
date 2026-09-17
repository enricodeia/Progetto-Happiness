/**
 * The reveal, as GLSL injected into three's standard material.
 *
 * Building the porcelain on MeshPhysicalMaterial rather than a hand-rolled
 * shader buys real image-based lighting, soft self-shadowing and tone mapping,
 * which is the whole reason a white object reads as a solid at all. Only the
 * reveal is ours.
 *
 * The idea is one front travelling once around the loop:
 *
 *   - it is not a straight cut across the band but a WAVE running around the
 *     section, so the band opens like liquid instead of like a guillotine;
 *   - behind it the band grows out of its own centre line, so the reveal is
 *     geometric and the silhouette and the crossings are honest at every
 *     instant — an alpha fade would lie about both;
 *   - right at the front the surface swells, as if pushed out from inside;
 *   - and a two-tone stripe rides the edge: a wide trail that goes DARKER than
 *     the porcelain, with a tight bright lip on the leading line. White on
 *     white is invisible; the pair is what reads.
 *
 * The edge geometry is described once, in `EDGE_FN`, and compiled into both
 * stages — and into the depth material, so the shadow is cast by the shape that
 * is actually there.
 */

/** Shared uniforms + the edge function. Identical in vertex and fragment. */
export const EDGE_FN = /* glsl */ `
uniform float uAnchor;
uniform float uFront;
uniform float uGrow;
uniform float uWaveAmount;
uniform float uWaveTurns;
uniform float uGrain;
uniform float uGrainScale;
uniform float uSeal;

float atlasHash21(vec2 p) {
  p = fract(p * vec2(123.34, 345.45));
  p += dot(p, p + 34.345);
  return fract(p.x * p.y);
}

float atlasNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(atlasHash21(i), atlasHash21(i + vec2(1.0, 0.0)), f.x),
    mix(atlasHash21(i + vec2(0.0, 1.0)), atlasHash21(i + vec2(1.0, 1.0)), f.x),
    f.y
  );
}

/**
 * How far the front is displaced at (d along the path, v around the section).
 *
 * Both terms are sampled on circles so they are seamless where the path closes
 * AND where the section closes: a noise fed a raw coordinate tears visibly at
 * both seams. uWaveTurns is whole for the same reason.
 */
float atlasEdge(float d, float v) {
  float a = d * 6.28318530718 * uWaveTurns;
  float w = sin(v * 6.28318530718 + a) * 0.62
          + sin(v * 12.56637061436 - a * 1.618) * 0.38;

  vec2 gp = vec2(cos(d * 6.28318530718), sin(d * 6.28318530718)) * uGrainScale
          + vec2(cos(v * 6.28318530718), sin(v * 6.28318530718)) * uGrainScale * 0.45;
  float g = atlasNoise(gp) * 0.7 + atlasNoise(gp * 2.3 + 19.0) * 0.3 - 0.5;

  return w * uWaveAmount + g * uGrain;
}

/** Signed distance behind the front. > 0 is revealed, 0 is the leading line. */
float atlasSignal(float t, float v) {
  float d = fract(t - uAnchor);
  return uFront + atlasEdge(d, v) - d;
}

/**
 * How much section the band is allowed at the open end.
 *
 * Without this the reveal starts as a cut pipe sitting in mid air, which is the
 * one frame of the whole thing that looks like a mistake. Instead the band
 * grows out of nothing at the anchor, and as the front comes back round to meet
 * it uSeal runs to 1 and the seam heals into a continuous loop.
 */
float atlasOpen(float t) {
  float d = fract(t - uAnchor);
  return mix(smoothstep(0.0, uGrow, d), 1.0, uSeal);
}
`

export const VERT_HEAD = /* glsl */ `
attribute float aT;
attribute float aV;
attribute vec3 aCentre;
uniform float uSwell;
uniform float uSwellWidth;
varying float vT;
varying float vV;
varying float vGrow;
${EDGE_FN}
`

// normal is declared unconditionally in three's vertex prefix for every
// built-in material; objectNormal is NOT (the depth material only defines it
// under USE_DISPLACEMENTMAP), so the swell has to read the raw attribute or the
// shadow pass fails to compile.
export const VERT_BODY = /* glsl */ `
vT = aT;
vV = aV;
float atlasSig = atlasSignal(aT, aV);
float atlasG = clamp(atlasSig / max(uGrow, 1e-4), 0.0, 1.0);
atlasG = atlasG * atlasG * atlasG * (atlasG * (atlasG * 6.0 - 15.0) + 10.0); // smootherstep
atlasG = min(atlasG, atlasOpen(aT));
vGrow = atlasG;

transformed = mix(aCentre, transformed, atlasG);
float atlasSwell = 1.0 - smoothstep(0.0, max(uSwellWidth, 1e-4), abs(atlasSig));
transformed += normal * (uSwell * atlasSwell * atlasG);
`

export const FRAG_HEAD = /* glsl */ `
uniform float uTrailWidth;
uniform float uTrailAmount;
uniform vec3  uTrailColor;
uniform float uLipWidth;
uniform float uLipAmount;
uniform vec3  uLipColor;
uniform float uEdgeFade;   // 0 once the front has closed the loop
uniform float uTintT;      // curve parameter of the highlighted vertex
uniform float uTintWidth;  // how much of the path it reaches
uniform float uTintAmount; // 0 when no card is hovered
uniform float uRim;
uniform float uRimPower;
uniform vec3  uRimColor;
uniform vec3  uTintColor;
varying float vT;
varying float vV;
varying float vGrow;
${EDGE_FN}
`

// Recomputed per fragment rather than interpolated: fract wraps inside the
// one ring that straddles the anchor, and interpolating across that wrap would
// draw a bogus edge there.
export const FRAG_CUT = /* glsl */ `
// Declared here, read again at FRAG_EDGE: both injection points are inside the
// same main(), so one local carries the edge from the cut to the stripe.
float atlasSig = atlasSignal(vT, vV);
if (atlasSig < 0.0 || vGrow < 0.02) discard;
`

export const FRAG_EDGE = /* glsl */ `
// A BAND, not a falloff. A plain fade out of the edge reads as soft shading
// and vanishes into white-on-white; a band with two soft ends reads as a stripe
// travelling along the ribbon, which is the whole point of it.
//
// It sits just behind the leading line, so the tight bright lip has clear
// porcelain to sit against: bright edge, dark band, white band. The contrast
// between the pair is what carries it — either one alone is invisible.
float atlasX = atlasSig / max(uTrailWidth, 1e-4);
float atlasTrail = smoothstep(0.0, 0.18, atlasX) * (1.0 - smoothstep(0.45, 1.0, atlasX));
float atlasLip = 1.0 - smoothstep(0.0, max(uLipWidth, 1e-4), atlasSig);

gl_FragColor.rgb = mix(gl_FragColor.rgb, uTrailColor, clamp(atlasTrail * uTrailAmount * uEdgeFade, 0.0, 1.0));
gl_FragColor.rgb = mix(gl_FragColor.rgb, uLipColor, clamp(atlasLip * uLipAmount * uEdgeFade, 0.0, 1.0));

// White on warm paper needs its silhouette drawn: a fresnel lift separates the
// band from the background without an outline.
float atlasFacing = abs(dot(normalize(vNormal), normalize(vViewPosition)));
gl_FragColor.rgb += uRimColor * pow(clamp(1.0 - atlasFacing, 0.0, 1.0), max(uRimPower, 0.01)) * uRim;

// Hovering a card recolours the stretch of band around its own vertex, which is
// the only thing in the piece that ties a paragraph to a physical part of the
// mark. Measured the short way round the loop, so a vertex near the seam still
// gets a symmetric falloff.
//
// Multiplying porcelain by a hue goes muddy. Re-keying the colour against the
// pixel's own luminance instead keeps every highlight and shadow the lighting
// already produced and only swaps what the surface appears to be made of.
float atlasTintD = abs(fract(vT - uTintT + 0.5) - 0.5);
float atlasTintW = max(uTintWidth, 1e-5);
float atlasTint = (1.0 - smoothstep(atlasTintW * 0.5, atlasTintW, atlasTintD)) * uTintAmount;
float atlasLuma = dot(gl_FragColor.rgb, vec3(0.2126, 0.7152, 0.0722));
gl_FragColor.rgb = mix(gl_FragColor.rgb, uTintColor * (0.45 + 0.8 * atlasLuma), atlasTint);
`
