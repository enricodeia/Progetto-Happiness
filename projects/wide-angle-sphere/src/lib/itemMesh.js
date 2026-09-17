// Vendored from projects/design-component-library/src/lib/itemMesh.js, with
// two deliberate changes:
//   · the osrPostShaders import is inlined
//   · the fragment shader now ends with `#include <colorspace_fragment>` —
//     without it the sRGB-decoded texture is written straight out, which is
//     why photos looked crushed and over-contrasty. Worth porting back.
import * as THREE from "three";
// Vendored from design-component-library/src/lib/osrPostShaders.js
function hexToRgb(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || "");
  return m
    ? [parseInt(m[1], 16) / 255, parseInt(m[2], 16) / 255, parseInt(m[3], 16) / 255]
    : [1, 1, 1];
}

// A subdivided plane whose vertices are optionally bent onto a cylinder of
// `radius` so the image follows the solid instead of staying flat.
// bend: 0 = flat quad, 1 = fully wrapped to the cylinder arc.
export function makeBentGeometry(planeW, planeH, segments, radius, bend) {
  const seg = Math.max(1, Math.round(segments));
  const geo = new THREE.PlaneGeometry(planeW, planeH, seg, 1);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const angle = x / radius;
    const cx = Math.sin(angle) * radius;
    const cz = Math.cos(angle) * radius - radius;
    pos.setX(i, x + (cx - x) * bend);
    pos.setZ(i, cz * bend);
    pos.setY(i, y);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

// Rounded-corner card material with:
//  • cover-fit image sampling (uPlaneAspect / uImgAspect)
//  • un-mirrored back face (gl_FrontFacing UV flip)
//  • full Post-FX kit (items target): cursor ripple + liquid + RGB split,
//    chromatic aberration, real colour grade (lift/gain/sat/hue/tint),
//    1-tap bloom, item-local vignette, grain + smooth noise.
// Every postfx uniform defaults to 0 so the shader compiles once and is
// identical to the old material when nothing in the kit is enabled.
export function makeCardMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    side: THREE.DoubleSide,
    uniforms: {
      uTex: { value: null },
      uHasTex: { value: 0 },
      uOpacity: { value: 0 },
      uRadius: { value: 0.12 },
      uCornerN: { value: 2 },       // 2 = circular corner, 4 = squircle
      uAspect: { value: 1 },        // plane w/h — corner-radius evenness
      uPlaneAspect: { value: 1 },   // plane w/h — cover fit
      uImgAspect: { value: 1 },     // texture w/h — cover fit
      uTint: { value: new THREE.Color("#222") },
      // ── Post-FX uniforms — all zero = no-op, shader stays cheap ──
      uPostTime: { value: 0 },
      uPostRes: { value: new THREE.Vector2(1, 1) },
      uPostCursor: { value: new THREE.Vector2(0.5, 0.5) },   // screen UV 0..1
      uPostVel: { value: new THREE.Vector2(0, 0) },
      uPostRipple: { value: 0 }, uPostRippleRadius: { value: 0.35 }, uPostRippleSpeed: { value: 7.0 },
      uPostLiquid: { value: 0 }, uPostLiquidFreq: { value: 9.0 }, uPostLiquidSpeed: { value: 1.6 },
      uPostChroma: { value: 0 }, uPostChromaMode: { value: 0 },
      uPostRgb: { value: 0 }, uPostRgbFall: { value: 3.0 },
      uPostBloom: { value: 0 }, uPostBloomRad: { value: 0.4 }, uPostBloomThr: { value: 0.7 },
      uPostGradeBri: { value: 1 }, uPostGradeCon: { value: 1 }, uPostGradeSat: { value: 1 }, uPostGradeHue: { value: 0 },
      uPostTintMix: { value: 0 }, uPostTintColor: { value: new THREE.Vector3(1, 1, 1) },
      uPostVignette: { value: 0 }, uPostVignSmooth: { value: 0.5 },
      uPostGrain: { value: 0 }, uPostGrainScale: { value: 1.6 },
      uPostNoise: { value: 0 }, uPostNoiseScale: { value: 80 },
      // ── Internal image parallax — the card stays put, the image shifts
      //    inside its rounded-rect frame by `uImgParallax` (UV units).
      //    Default 0 → no shift, no cost. Used by BentoGrid3D for the
      //    "cursor parallax" interaction (image-only, not whole-scene).
      uImgParallax: { value: new THREE.Vector2(0, 0) },
      // ── Velocity-driven streak (drag intensity → directional smear) ──
      uVelStreak:    { value: 0 },                               // 0..1
      uVelStreakDir: { value: new THREE.Vector2(1, 0) },
      uVelStreakLen: { value: 14 },
      uVelStreakFall:{ value: 2.4 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;
      uniform sampler2D uTex;
      uniform float uHasTex;
      uniform float uOpacity;
      uniform float uRadius;
      uniform float uCornerN;
      uniform float uAspect;
      uniform float uPlaneAspect;
      uniform float uImgAspect;
      uniform vec3  uTint;
      uniform float uPostTime;
      uniform vec2  uPostRes;
      uniform vec2  uPostCursor;
      uniform vec2  uPostVel;
      uniform float uPostRipple;  uniform float uPostRippleRadius; uniform float uPostRippleSpeed;
      uniform float uPostLiquid;  uniform float uPostLiquidFreq;   uniform float uPostLiquidSpeed;
      uniform float uPostChroma;  uniform float uPostChromaMode;
      uniform float uPostRgb;     uniform float uPostRgbFall;
      uniform float uPostBloom;   uniform float uPostBloomRad;     uniform float uPostBloomThr;
      uniform float uPostGradeBri;uniform float uPostGradeCon;     uniform float uPostGradeSat; uniform float uPostGradeHue;
      uniform float uPostTintMix; uniform vec3  uPostTintColor;
      uniform float uPostVignette;uniform float uPostVignSmooth;
      uniform float uPostGrain;   uniform float uPostGrainScale;
      uniform float uPostNoise;   uniform float uPostNoiseScale;
      uniform vec2  uImgParallax;
      uniform float uVelStreak;
      uniform vec2  uVelStreakDir;
      uniform float uVelStreakLen;
      uniform float uVelStreakFall;
      varying vec2 vUv;

      // The corner is the Lp unit ball of the offset vector: p = 2 gives the
      // usual circular round-rect, p = 4 the squircle every app icon uses.
      float sdRoundRect(vec2 p, vec2 b, float r, float n) {
        vec2 q = abs(p) - b + r;
        vec2 m = max(q, 0.0);
        float e = max(n, 2.0);
        float corner = (e <= 2.001)
          ? length(m)
          : pow(pow(m.x, e) + pow(m.y, e), 1.0 / e);
        return min(max(q.x, q.y), 0.0) + corner - r;
      }
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float vnoise(vec2 p){
        vec2 i=floor(p), f=fract(p);
        float a=hash(i), b=hash(i+vec2(1.0,0.0)), c=hash(i+vec2(0.0,1.0)), d=hash(i+vec2(1.0,1.0));
        vec2 u=f*f*(3.0-2.0*f);
        return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
      }
      vec3 hueShift(vec3 c, float h){
        const mat3 toYIQ = mat3(0.299, 0.587, 0.114, 0.596, -0.274, -0.322, 0.211, -0.523, 0.312);
        const mat3 toRGB = mat3(1.0, 0.956, 0.621, 1.0, -0.272, -0.647, 1.0, -1.106, 1.703);
        vec3 yiq = toYIQ * c;
        float hue = atan(yiq.z, yiq.y) + h;
        float chroma = length(yiq.yz);
        yiq.y = chroma * cos(hue);
        yiq.z = chroma * sin(hue);
        return toRGB * yiq;
      }

      void main() {
        // ── cover-fit: object-fit:cover so the image fills without distortion
        vec2 cuv = vUv;
        if (uImgAspect > uPlaneAspect) {
          cuv.x = (vUv.x - 0.5) * (uPlaneAspect / uImgAspect) + 0.5;
        } else {
          cuv.y = (vUv.y - 0.5) * (uImgAspect / uPlaneAspect) + 0.5;
        }
        if (!gl_FrontFacing) cuv.x = 1.0 - cuv.x;

        // Image-internal parallax: shifts the sampled UV by uImgParallax
        // so the picture pans inside the rounded-rect frame.
        cuv += uImgParallax;

        // ── ripple + liquid displacement (cursor in SCREEN uv) ──
        vec2 sUv = gl_FragCoord.xy / max(uPostRes, vec2(1.0));
        float sAspect = uPostRes.x / max(1.0, uPostRes.y);
        vec2 ma = vec2((sUv.x - uPostCursor.x) * sAspect, sUv.y - uPostCursor.y);
        float mDist = length(ma);
        vec2 mDir = mDist > 0.0001 ? ma / mDist : vec2(0.0);

        if (uPostRipple > 0.001) {
          float fall = exp(-mDist / max(uPostRippleRadius, 0.001));
          float w = sin(mDist * 26.0 - uPostTime * uPostRippleSpeed) * fall;
          cuv += mDir * w * uPostRipple * 0.06;
        }
        if (uPostLiquid > 0.001) {
          float sp = clamp(length(uPostVel) * 30.0, 0.0, 1.5);
          vec2 flow = vec2(
            sin(sUv.y * uPostLiquidFreq + uPostTime * uPostLiquidSpeed),
            cos(sUv.x * uPostLiquidFreq - uPostTime * uPostLiquidSpeed)
          );
          float fall = exp(-mDist * 2.2);
          cuv += (flow * 0.010 + mDir * sp * 0.04) * uPostLiquid * fall;
        }

        // ── chromatic aberration + cursor-radial RGB split → channel offset ──
        vec2 caOff = vec2(0.0);
        if (uPostChroma > 0.001) {
          if (uPostChromaMode > 0.5) caOff = vec2(uPostChroma * 1.2, 0.0);     // lateral
          else                        caOff = (cuv - 0.5) * uPostChroma * 2.0;  // radial
        }
        vec2 rgbOff = vec2(0.0);
        if (uPostRgb > 0.001) {
          float f = exp(-mDist * max(uPostRgbFall, 0.01));
          rgbOff = mDir * uPostRgb * 0.03 * f;
        }
        vec2 off = caOff + rgbOff;
        vec3 col;
        if (uHasTex > 0.5) {
          if (length(off) > 0.0001) {
            col.r = texture2D(uTex, cuv + off).r;
            col.g = texture2D(uTex, cuv).g;
            col.b = texture2D(uTex, cuv - off).b;
          } else {
            col = texture2D(uTex, cuv).rgb;
          }
        } else {
          col = uTint;
        }

        // ── velocity streak — drag-driven directional smear (real motion blur) ──
        if (uVelStreak > 0.001 && uHasTex > 0.5) {
          vec3 acc = vec3(0.0);
          float wsum = 0.0;
          for (int i = 1; i <= 4; i++) {
            float ti = float(i) / 4.0;
            float w  = exp(-ti * uVelStreakFall);
            vec2 off2 = uVelStreakDir * (uVelStreakLen * 0.0008) * ti * uVelStreak;
            acc += texture2D(uTex, cuv + off2).rgb * w;
            acc += texture2D(uTex, cuv - off2).rgb * w;
            wsum += 2.0 * w;
          }
          vec3 streakCol = acc / max(wsum, 0.001);
          col = mix(col, streakCol, clamp(uVelStreak, 0.0, 1.0));
        }

        // ── colour grade: brightness, contrast, saturation, hue, tint ──
        if (abs(uPostGradeBri - 1.0) > 0.001) col *= uPostGradeBri;
        if (abs(uPostGradeCon - 1.0) > 0.001) col = (col - 0.5) * uPostGradeCon + 0.5;
        if (abs(uPostGradeSat - 1.0) > 0.001) {
          float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
          col = mix(vec3(lum), col, uPostGradeSat);
        }
        if (abs(uPostGradeHue) > 0.001) col = hueShift(col, uPostGradeHue);
        if (uPostTintMix > 0.001) col = mix(col, col * uPostTintColor * 2.0, uPostTintMix);

        // ── bloom — 4-tap bright-pass ──
        if (uPostBloom > 0.001 && uHasTex > 0.5) {
          vec2 px = vec2(uPostBloomRad * 0.03);
          vec3 b = vec3(0.0);
          b += max(texture2D(uTex, cuv + vec2( px.x, 0.0)).rgb - uPostBloomThr, 0.0);
          b += max(texture2D(uTex, cuv + vec2(-px.x, 0.0)).rgb - uPostBloomThr, 0.0);
          b += max(texture2D(uTex, cuv + vec2(0.0,  px.y)).rgb - uPostBloomThr, 0.0);
          b += max(texture2D(uTex, cuv + vec2(0.0, -px.y)).rgb - uPostBloomThr, 0.0);
          col += b * 0.25 * uPostBloom;
        }

        // ── item-local vignette (within the card) ──
        if (uPostVignette > 0.001) {
          float v = pow(clamp(dot(vUv - 0.5, vUv - 0.5) * 4.0, 0.0, 1.0), 1.0 + uPostVignSmooth * 2.0);
          col *= 1.0 - v * uPostVignette;
        }
        // ── grain + smooth noise ──
        if (uPostGrain > 0.001) {
          vec2 g = floor(vUv * uPostRes / max(uPostGrainScale, 1.0));
          float n = hash(g + floor(uPostTime * 24.0));
          col += (n - 0.5) * uPostGrain;
        }
        if (uPostNoise > 0.001) {
          float n = vnoise(vUv * uPostNoiseScale + uPostTime * 0.3);
          col += (n - 0.5) * uPostNoise;
        }

        // ── original rounded-rect alpha mask (unchanged) ──
        vec2 p = (vUv - 0.5);
        p.x *= uAspect;
        vec2 b = vec2(0.5 * uAspect, 0.5);
        float r = clamp(uRadius, 0.0, 0.5);
        float d = sdRoundRect(p, b, r, uCornerN);
        float aa = max(fwidth(d), 0.0008);
        float alpha = 1.0 - smoothstep(0.0, aa, d);
        if (alpha <= 0.001) discard;
        gl_FragColor = vec4(clamp(col, 0.0, 1.0), alpha * uOpacity);

        // The sampled texture is decoded to linear (SRGBColorSpace), so the
        // output has to be encoded back or every photo reads far too dark and
        // contrasty. The library version of this shader is missing this line.
        #include <colorspace_fragment>
      }
    `,
  });
}

// Push the items-pass uniforms onto every card material. `cfg` is the full
// postfx config block; we mask each effect by `target === "items"` here so
// the card shader only runs the bits this target asked for.
export function setItemPostfxUniforms(u, cfg, time, cursor, vel, resW, resH) {
  if (!cfg) return;
  const on = (k) => cfg[k] && cfg[k].enabled && cfg[k].target === "items";
  u.uPostTime.value = time;
  u.uPostRes.value.set(resW, resH);
  u.uPostCursor.value.set(cursor.x, cursor.y);
  u.uPostVel.value.set(vel.x, vel.y);
  const rp = cfg.ripple, lq = cfg.liquid, c = cfg.chromatic, rg = cfg.rgbSplit,
        b  = cfg.bloom,  cg = cfg.colorGrade, v = cfg.vignette,
        gr = cfg.grain,  ns = cfg.noise;
  u.uPostRipple.value       = on("ripple") ? rp.strength : 0;
  u.uPostRippleRadius.value = rp.radius;
  u.uPostRippleSpeed.value  = rp.speed;
  u.uPostLiquid.value       = on("liquid") ? lq.strength : 0;
  u.uPostLiquidFreq.value   = lq.frequency;
  u.uPostLiquidSpeed.value  = lq.speed;
  u.uPostChroma.value       = on("chromatic") ? c.strength : 0;
  u.uPostChromaMode.value   = c.mode === "lateral" ? 1 : 0;
  u.uPostRgb.value          = on("rgbSplit") ? rg.strength : 0;
  u.uPostRgbFall.value      = rg.falloff;
  u.uPostBloom.value        = on("bloom") ? b.strength : 0;
  u.uPostBloomRad.value     = b.radius;
  u.uPostBloomThr.value     = b.threshold;
  const grade = on("colorGrade");
  u.uPostGradeBri.value     = grade ? cg.brightness : 1;
  u.uPostGradeCon.value     = grade ? cg.contrast   : 1;
  u.uPostGradeSat.value     = grade ? cg.saturation : 1;
  u.uPostGradeHue.value     = grade ? cg.hue        : 0;
  u.uPostTintMix.value      = grade ? cg.tintMix    : 0;
  const t = hexToRgb(cg.tint);
  u.uPostTintColor.value.set(t[0], t[1], t[2]);
  u.uPostVignette.value     = on("vignette") ? v.strength : 0;
  u.uPostVignSmooth.value   = v.smoothness;
  u.uPostGrain.value        = on("grain") ? gr.intensity : 0;
  u.uPostGrainScale.value   = gr.scale;
  u.uPostNoise.value        = on("noise") ? ns.intensity : 0;
  u.uPostNoiseScale.value   = ns.scale;
}
