/* ═══════════════════════════════════════════════════════════════════════════
   SHADERS — FBM reveal post-processing shader
   ═══════════════════════════════════════════════════════════════════════════ */

const revealShader = {
  uniforms: {
    tDiffuse: { value: null },
    uReveal: { value: 0.0 },
    uTime: { value: 0.0 },
    uResolution: { value: new THREE.Vector2(390, 844) },
    uMaskOpacity: { value: 1.0 }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    precision highp float;

    uniform sampler2D tDiffuse;
    uniform float uReveal;
    uniform float uTime;
    uniform vec2 uResolution;
    uniform float uMaskOpacity;

    varying vec2 vUv;

    // Dark color — matches CSS #2B2D26
    const vec3 DARK_COLOR = vec3(0.1686274510, 0.1764705882, 0.1490196078);

    float hash(vec2 p) {
      vec3 p3 = fract(vec3(p.xyx) * 0.1031);
      p3 += dot(p3, p3.yzx + 33.33);
      return fract((p3.x + p3.y) * p3.z);
    }

    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
      float a = hash(i);
      float b = hash(i + vec2(1.0, 0.0));
      float c = hash(i + vec2(0.0, 1.0));
      float d = hash(i + vec2(1.0, 1.0));
      return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
    }

    float fbm(vec2 p) {
      float value = 0.0;
      float amplitude = 0.5;
      float frequency = 1.0;
      for (int i = 0; i < 4; i++) {
        value += amplitude * noise(p * frequency);
        amplitude *= 0.5;
        frequency *= 2.0;
      }
      return value;
    }

    void main() {
      // Bulletproof blackout
      if (uMaskOpacity >= 0.99) {
        gl_FragColor = vec4(DARK_COLOR, 1.0);
        return;
      }

      vec4 texColor = texture2D(tDiffuse, vUv);

      // Full passthrough when reveal complete
      if (uReveal >= 0.98 && uMaskOpacity <= 0.01) {
        gl_FragColor = texColor;
        return;
      }

      vec3 resultColor;

      if (uReveal < 0.01) {
        resultColor = DARK_COLOR;
      } else {
        vec2 center = vUv - 0.5;
        float aspect = uResolution.x / uResolution.y;
        center.x *= aspect;
        float dist = length(center);

        vec2 noiseCoord1 = center * 2.5 + uTime * 0.005;
        vec2 noiseCoord2 = center * 5.0 - uTime * 0.003;
        float totalNoise = fbm(noiseCoord1) * 0.08 + fbm(noiseCoord2) * 0.04;

        float revealRadius = uReveal * 1.5;
        float noisyDist = dist + totalNoise;
        float edgeSoft = 0.1 + uReveal * 0.05;
        float mask = smoothstep(revealRadius - edgeSoft * 0.3, revealRadius + edgeSoft, noisyDist);
        float fadeOut = 1.0 - smoothstep(0.8, 0.98, uReveal);
        mask *= fadeOut;

        // Glow effects
        float edgeDist = abs(noisyDist - revealRadius);
        float glowStrength = smoothstep(0.01, 0.08, uReveal);
        float glow = exp(-edgeDist * 15.0) * 0.25 * fadeOut * glowStrength;
        vec3 glowColor = vec3(0.4, 0.5, 0.25);
        float innerGlow = exp(-edgeDist * 8.0) * 0.12 * fadeOut * step(noisyDist, revealRadius) * glowStrength;
        vec3 innerGlowColor = vec3(0.35, 0.55, 0.25);

        vec3 sceneWithGlow = texColor.rgb + glow * glowColor + innerGlow * innerGlowColor;
        resultColor = mix(sceneWithGlow, DARK_COLOR, mask);
      }

      vec3 finalColor = mix(resultColor, DARK_COLOR, uMaskOpacity);
      gl_FragColor = vec4(finalColor, 1.0);
    }
  `
};
