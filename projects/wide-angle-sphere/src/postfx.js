// A whisper of a vignette, shared by every scene that wants post-processing
// (the bowl, the Atlas) — one uniform, one line of math, corners only, never
// the subject itself.
export const VIGNETTE = {
  uniforms: { tDiffuse: { value: null }, amount: { value: 0.18 } },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float amount;
    varying vec2 vUv;
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      vec2 d = vUv - 0.5;
      float vig = 1.0 - smoothstep(0.35, 0.85, length(d)) * amount;
      gl_FragColor = vec4(c.rgb * vig, c.a);
    }
  `,
};
