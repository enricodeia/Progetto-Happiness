import { useRef, useEffect, useCallback } from 'react';

const VERT = `
  attribute vec2 a_position;
  attribute float a_alpha;
  uniform vec2 u_resolution;
  uniform vec2 u_offset;
  uniform float u_scale;
  uniform float u_pointSize;
  varying float v_alpha;

  void main() {
    vec2 pos = (a_position + u_offset) * u_scale;
    vec2 clip = (pos / u_resolution) * 2.0 - 1.0;
    gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
    gl_PointSize = u_pointSize * u_scale;
    v_alpha = a_alpha;
  }
`;

const FRAG = `
  precision mediump float;
  uniform vec3 u_color;
  varying float v_alpha;

  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    if (d > 1.0) discard;
    float soft = 1.0 - smoothstep(0.6, 1.0, d);
    gl_FragColor = vec4(u_color, v_alpha * soft);
  }
`;

const TARGET_DOTS = 100000;
const DOT_COLOR = [0.173, 0.129, 0.094]; // #2C2118

function createShader(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(s));
    gl.deleteShader(s);
    return null;
  }
  return s;
}

function createProgram(gl, vs, fs) {
  const p = gl.createProgram();
  gl.attachShader(p, vs);
  gl.attachShader(p, fs);
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(p));
    gl.deleteProgram(p);
    return null;
  }
  return p;
}

function buildGrid(imageData, imgW, imgH, canvasW, canvasH, target) {
  const data = imageData.data;
  const aspect = canvasW / canvasH;

  // Compute grid: cols/rows matches canvas aspect, cols * rows ~ target
  const cols = Math.round(Math.sqrt(target * aspect));
  const rows = Math.round(cols / aspect);
  const total = cols * rows;

  const stepX = canvasW / cols;
  const stepY = canvasH / rows;

  const positions = new Float32Array(total * 2);
  const alphas = new Float32Array(total);

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const i = row * cols + col;

      // Grid position (center of each cell)
      positions[i * 2] = (col + 0.5) * stepX;
      positions[i * 2 + 1] = (row + 0.5) * stepY;

      // Sample image at this grid position
      const imgX = Math.min(Math.floor((col / cols) * imgW), imgW - 1);
      const imgY = Math.min(Math.floor((row / rows) * imgH), imgH - 1);
      const idx = (imgY * imgW + imgX) * 4;

      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];
      const lum = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
      const darkness = (1 - lum) * (a / 255);

      // Alpha driven by image darkness: light areas nearly invisible, dark areas opaque
      alphas[i] = darkness * darkness * 0.85 + 0.04;
    }
  }

  return { positions, alphas, total };
}

const BachecaDots = ({ offset = { x: 0, y: 0 } }) => {
  const canvasRef = useRef(null);
  const glRef = useRef(null);
  const programRef = useRef(null);
  const uniformsRef = useRef({});
  const dotsReady = useRef(false);
  const dotCount = useRef(0);
  const rafRef = useRef(null);

  const init = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const gl = canvas.getContext('webgl', { alpha: true, antialias: false, premultipliedAlpha: false });
    if (!gl) return;
    glRef.current = gl;

    const vs = createShader(gl, gl.VERTEX_SHADER, VERT);
    const fs = createShader(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return;

    const program = createProgram(gl, vs, fs);
    if (!program) return;
    programRef.current = program;

    uniformsRef.current = {
      u_resolution: gl.getUniformLocation(program, 'u_resolution'),
      u_offset: gl.getUniformLocation(program, 'u_offset'),
      u_scale: gl.getUniformLocation(program, 'u_scale'),
      u_pointSize: gl.getUniformLocation(program, 'u_pointSize'),
      u_color: gl.getUniformLocation(program, 'u_color'),
    };

    const a_position = gl.getAttribLocation(program, 'a_position');
    const a_alpha = gl.getAttribLocation(program, 'a_alpha');

    // Load image and sample dots
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      // Draw image to offscreen canvas to read pixels
      const offscreen = document.createElement('canvas');
      // Sample at reduced resolution for performance
      const sampleW = Math.min(img.naturalWidth, 512);
      const sampleH = Math.round(sampleW * (img.naturalHeight / img.naturalWidth));
      offscreen.width = sampleW;
      offscreen.height = sampleH;
      const ctx2d = offscreen.getContext('2d');
      ctx2d.drawImage(img, 0, 0, sampleW, sampleH);
      const imageData = ctx2d.getImageData(0, 0, sampleW, sampleH);

      const { positions, alphas, total } = buildGrid(
        imageData, sampleW, sampleH,
        canvas.width, canvas.height,
        TARGET_DOTS
      );
      dotCount.current = total;

      // Upload position buffer
      const posBuf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
      gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(a_position);
      gl.vertexAttribPointer(a_position, 2, gl.FLOAT, false, 0, 0);

      // Upload alpha buffer
      const alphaBuf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, alphaBuf);
      gl.bufferData(gl.ARRAY_BUFFER, alphas, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(a_alpha);
      gl.vertexAttribPointer(a_alpha, 1, gl.FLOAT, false, 0, 0);

      dotsReady.current = true;
    };
    img.src = '/sfondo-bacheca.webp';
  }, []);

  useEffect(() => {
    init();

    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      // Re-init on resize to re-sample at new dimensions
      dotsReady.current = false;
      init();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [init]);

  useEffect(() => {
    const render = () => {
      const gl = glRef.current;
      const program = programRef.current;
      const canvas = canvasRef.current;
      if (!gl || !program || !canvas) {
        rafRef.current = requestAnimationFrame(render);
        return;
      }

      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      if (!dotsReady.current) {
        rafRef.current = requestAnimationFrame(render);
        return;
      }

      const dpr = window.devicePixelRatio || 1;

      gl.useProgram(program);
      gl.uniform2f(uniformsRef.current.u_resolution, canvas.width, canvas.height);
      gl.uniform2f(uniformsRef.current.u_offset, offset.x * dpr, offset.y * dpr);
      gl.uniform1f(uniformsRef.current.u_scale, 1.0);
      gl.uniform1f(uniformsRef.current.u_pointSize, 2.5 * dpr);
      gl.uniform3f(uniformsRef.current.u_color, ...DOT_COLOR);

      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

      gl.drawArrays(gl.POINTS, 0, dotCount.current);

      rafRef.current = requestAnimationFrame(render);
    };

    rafRef.current = requestAnimationFrame(render);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [offset]);

  return (
    <canvas
      ref={canvasRef}
      className="bacheca__dots"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
    />
  );
};

export default BachecaDots;
