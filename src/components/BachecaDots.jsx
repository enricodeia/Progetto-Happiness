import { useRef, useEffect, useCallback, useMemo } from 'react';
import { gsap } from 'gsap';

/* ═══ Grid constants ═══ */
const COLS = 400;
const ROWS = 250;
const TOTAL = COLS * ROWS; // 100 000
const WORLD_W = 4000;
const WORLD_H = 2500;
const STEP_X = WORLD_W / COLS;
const STEP_Y = WORLD_H / ROWS;
const DARK_THRESHOLD = 0.2;
const MAX_ZOOM_FACTOR = 5;

const DEFAULT_COLOR = [0.173, 0.129, 0.094]; // #2C2118

/* ═══ Shaders ═══ */
const VERT = `
  attribute vec2  a_position;
  attribute float a_alpha;
  attribute float a_state;   // 0=empty-bg, 1=drawing-free, 2=occupied, 3=target
  attribute vec3  a_color;

  uniform vec2  u_resolution;
  uniform vec2  u_camera;
  uniform float u_zoom;
  uniform float u_basePt;

  varying float v_alpha;
  varying float v_state;
  varying vec3  v_color;

  void main() {
    vec2 screen = (a_position - u_camera) * u_zoom + u_resolution * 0.5;
    vec2 ndc = (screen / u_resolution) * 2.0 - 1.0;
    gl_Position = vec4(ndc.x, -ndc.y, 0.0, 1.0);

    float isOcc = step(1.5, a_state);
    float isTarget = step(2.5, a_state);
    // Occupied dots are 1.8x bigger, target 2.5x
    gl_PointSize = max(1.0, u_basePt * (1.0 + isOcc * 0.8 + isTarget * 1.5));

    v_alpha = a_alpha;
    v_state = a_state;
    v_color = a_color;
  }
`;

const FRAG = `
  precision mediump float;
  uniform float u_time;
  varying float v_alpha;
  varying float v_state;
  varying vec3  v_color;

  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    if (d > 1.0) discard;
    float soft = 1.0 - smoothstep(0.5, 1.0, d);

    float isBg      = 1.0 - step(0.5, v_state);           // state 0
    float isDraw     = step(0.5, v_state) * (1.0 - step(1.5, v_state)); // state 1
    float isOcc      = step(1.5, v_state) * (1.0 - step(2.5, v_state)); // state 2
    float isTarget   = step(2.5, v_state);                  // state 3

    // Color
    vec3 darkCol = vec3(0.173, 0.129, 0.094);
    vec3 color = darkCol;
    color = mix(color, v_color, isOcc + isTarget);

    // Alpha — occupied dots are fully opaque and pop out
    float bgAlpha   = 0.04;
    float drawAlpha = 0.15;
    float occAlpha  = 1.0;
    float pulse     = 0.8 + 0.2 * sin(u_time * 4.0);
    float targetAlpha = pulse;

    float alpha = bgAlpha * isBg
                + drawAlpha * isDraw
                + occAlpha * isOcc
                + targetAlpha * isTarget;
    alpha *= soft;

    // 3D sticker effect for occupied/target — stronger
    float elevation = isOcc + isTarget;
    float gradient = 1.0 + (0.5 - gl_PointCoord.y) * 0.25 * elevation;
    float hlDist = length(gl_PointCoord - vec2(0.35, 0.28)) * 3.0;
    float highlight = (1.0 - smoothstep(0.0, 1.0, hlDist)) * 0.35 * elevation;
    color = color * gradient + highlight;

    // Shadow for occupied — stronger drop shadow
    float shadowD = length(gl_PointCoord - vec2(0.55, 0.58)) * 2.0;
    float shadow = (1.0 - smoothstep(0.6, 1.0, shadowD)) * 0.2 * elevation;

    // Target glow
    float halo = smoothstep(0.3, 0.9, d) * isTarget * 0.35 * pulse;
    color += vec3(halo * 0.8, halo * 0.65, 0.0);

    gl_FragColor = vec4(color, alpha + shadow);
  }
`;

/* ═══ GL helpers ═══ */
function mkShader(gl, type, src) {
  const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.error(gl.getShaderInfoLog(s)); gl.deleteShader(s); return null; }
  return s;
}
function mkProgram(gl, vs, fs) {
  const p = gl.createProgram(); gl.attachShader(p, vs); gl.attachShader(p, fs); gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { console.error(gl.getProgramInfoLog(p)); gl.deleteProgram(p); return null; }
  return p;
}

/* ═══ Coordinate helpers ═══ */
export function dotIndexToWorld(index) {
  return { x: (index % COLS + 0.5) * STEP_X, y: (Math.floor(index / COLS) + 0.5) * STEP_Y };
}
export function worldToScreen(wx, wy, camera, zoom, pan, viewW, viewH) {
  return { x: (wx - camera.x) * zoom + viewW / 2 + (pan?.x || 0), y: (wy - camera.y) * zoom + viewH / 2 + (pan?.y || 0) };
}
export function screenToDotIndex(sx, sy, cam, viewW, viewH) {
  const wx = (sx - viewW / 2) / cam.zoom + cam.cx;
  const wy = (sy - viewH / 2) / cam.zoom + cam.cy;
  const col = Math.round(wx / STEP_X - 0.5);
  const row = Math.round(wy / STEP_Y - 0.5);
  if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return -1;
  const dotCx = (col + 0.5) * STEP_X, dotCy = (row + 0.5) * STEP_Y;
  if (Math.hypot(wx - dotCx, wy - dotCy) > STEP_X * 0.8) return -1;
  return row * COLS + col;
}
export function hexToRGB(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
}

/* ═══ Component ═══ */
const BachecaDots = ({
  occupiedDots   = new Set(),
  dotColors      = new Map(),   // index → '#hex'
  targetDot      = null,
  zoomPhase      = 'idle',
  onZoomComplete = null,
  panEnabled     = false,
  onCameraChange = null,
  onDarkDotsReady = null,
  onDotHover     = null,
  onDotTap       = null,
  externalZoom   = null,
}) => {
  const canvasRef      = useRef(null);
  const glRef          = useRef(null);
  const programRef     = useRef(null);
  const uniformsRef    = useRef({});
  const attribsRef     = useRef({});
  const dotsReady      = useRef(false);
  const rafRef         = useRef(null);
  const startTime      = useRef(Date.now());
  const posBufferRef   = useRef(null);
  const alphaBufferRef = useRef(null);
  const stateBufferRef = useRef(null);
  const colorBufferRef = useRef(null);
  const darkDotsCache  = useRef([]);

  const cam = useRef({ cx: WORLD_W / 2, cy: WORLD_H / 2, zoom: 1.0 });
  const minZoomRef = useRef(1);
  const maxZoomRef = useRef(5);
  const panState   = useRef({ active: false, sx: 0, sy: 0, scx: 0, scy: 0, moved: false });
  const pinchState = useRef({ active: false, pointers: new Map(), startDist: 0, startZoom: 1 });
  const tlRef      = useRef(null);

  const onZoomCompleteRef = useRef(onZoomComplete); onZoomCompleteRef.current = onZoomComplete;
  const onCameraChangeRef = useRef(onCameraChange); onCameraChangeRef.current = onCameraChange;
  const onDarkDotsReadyRef = useRef(onDarkDotsReady); onDarkDotsReadyRef.current = onDarkDotsReady;
  const onDotHoverRef = useRef(onDotHover); onDotHoverRef.current = onDotHover;
  const onDotTapRef = useRef(onDotTap); onDotTapRef.current = onDotTap;
  const occupiedRef = useRef(occupiedDots); occupiedRef.current = occupiedDots;

  const positions = useMemo(() => {
    const arr = new Float32Array(TOTAL * 2);
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const i = r * COLS + c;
      arr[i * 2] = (c + 0.5) * STEP_X;
      arr[i * 2 + 1] = (r + 0.5) * STEP_Y;
    }
    return arr;
  }, []);

  const PAD = 40;
  /**
   * fitZoom: the image must fill the viewport completely — no empty space on any side.
   * Takes the LARGER of fitW and fitH so both dimensions are covered.
   * The user can then pan to see parts that extend beyond the viewport.
   */
  const fitZoom = useCallback(() => {
    const c = canvasRef.current; if (!c) return 1;
    const r = c.getBoundingClientRect();
    const fitW = (r.width - PAD * 2) / WORLD_W;
    const fitH = (r.height - PAD * 2) / WORLD_H;
    // Use the larger zoom so no viewport side is left empty
    return Math.max(fitW, fitH);
  }, []);
  const clampCamera = useCallback(() => {
    const c = cam.current;
    const cvs = canvasRef.current;
    c.zoom = Math.max(minZoomRef.current, Math.min(maxZoomRef.current, c.zoom));
    if (!cvs) return;
    const r = cvs.getBoundingClientRect();

    // Visible world area at current zoom
    const viewW = (r.width - PAD * 2) / c.zoom;
    const viewH = (r.height - PAD * 2) / c.zoom;

    // Image must always fill the viewport:
    // If image is wider than view → user can pan horizontally, clamped to edges
    // If image fits within view → center it (no panning needed on that axis)
    const minCx = Math.min(viewW / 2, WORLD_W / 2);
    const maxCx = Math.max(WORLD_W - viewW / 2, WORLD_W / 2);
    const minCy = Math.min(viewH / 2, WORLD_H / 2);
    const maxCy = Math.max(WORLD_H - viewH / 2, WORLD_H / 2);

    c.cx = Math.max(minCx, Math.min(maxCx, c.cx));
    c.cy = Math.max(minCy, Math.min(maxCy, c.cy));
  }, []);
  const emitCamera = useCallback(() => {
    if (onCameraChangeRef.current) {
      const c = cam.current;
      onCameraChangeRef.current({ camera: { x: c.cx, y: c.cy }, zoom: c.zoom, pan: { x: 0, y: 0 } });
    }
  }, []);

  /* ═══ Init WebGL + load SVGs ═══ */
  const init = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr; canvas.height = rect.height * dpr;

    const gl = canvas.getContext('webgl', { alpha: true, antialias: false, premultipliedAlpha: false });
    if (!gl) return; glRef.current = gl;
    const vs = mkShader(gl, gl.VERTEX_SHADER, VERT);
    const fs = mkShader(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return;
    const prog = mkProgram(gl, vs, fs); if (!prog) return;
    programRef.current = prog;

    const loc = (n) => gl.getUniformLocation(prog, n);
    uniformsRef.current = {
      u_resolution: loc('u_resolution'), u_camera: loc('u_camera'),
      u_zoom: loc('u_zoom'), u_basePt: loc('u_basePt'), u_time: loc('u_time'),
    };
    attribsRef.current = {
      a_position: gl.getAttribLocation(prog, 'a_position'),
      a_alpha: gl.getAttribLocation(prog, 'a_alpha'),
      a_state: gl.getAttribLocation(prog, 'a_state'),
      a_color: gl.getAttribLocation(prog, 'a_color'),
    };

    const mkBuf = (data, usage) => { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, usage); return b; };
    posBufferRef.current = mkBuf(positions, gl.STATIC_DRAW);
    alphaBufferRef.current = mkBuf(new Float32Array(TOTAL).fill(0.04), gl.DYNAMIC_DRAW);
    stateBufferRef.current = mkBuf(new Float32Array(TOTAL), gl.DYNAMIC_DRAW);
    colorBufferRef.current = mkBuf(new Float32Array(TOTAL * 3), gl.DYNAMIC_DRAW);

    // Load both SVG halves and sample
    const loadImg = (src) => new Promise((resolve) => {
      const img = new Image(); img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });

    Promise.all([loadImg('/bacheca-sx.svg'), loadImg('/bacheca-dx.svg')]).then(([imgL, imgR]) => {
      // Combine into single canvas
      const fullW = (imgL?.naturalWidth || 534) + (imgR?.naturalWidth || 460);
      const fullH = Math.max(imgL?.naturalHeight || 754, imgR?.naturalHeight || 754);
      const off = document.createElement('canvas');
      const sw = Math.min(fullW, 800);
      const sh = Math.round(sw * (fullH / fullW));
      off.width = sw; off.height = sh;
      const ctx = off.getContext('2d');
      // White background (so we can detect dark paths)
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, sw, sh);
      const leftW = imgL ? Math.round(sw * (imgL.naturalWidth / fullW)) : Math.round(sw * 0.54);
      if (imgL) ctx.drawImage(imgL, 0, 0, leftW, sh);
      if (imgR) ctx.drawImage(imgR, leftW, 0, sw - leftW, sh);

      const idata = ctx.getImageData(0, 0, sw, sh).data;
      const alphas = new Float32Array(TOTAL);
      const darkIdx = [];

      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
        const i = r * COLS + c;
        const ix = Math.min(Math.floor((c / COLS) * sw), sw - 1);
        const iy = Math.min(Math.floor((r / ROWS) * sh), sh - 1);
        const p = (iy * sw + ix) * 4;
        const lum = (idata[p] * 0.299 + idata[p+1] * 0.587 + idata[p+2] * 0.114) / 255;
        const dark = (1 - lum) * (idata[p+3] / 255);
        const alpha = dark * dark * 0.85 + 0.04;
        alphas[i] = alpha;
        if (alpha >= DARK_THRESHOLD) darkIdx.push(i);
      }

      // Sort dark dots: bottom-left first (high row = bottom, low col = left)
      darkIdx.sort((a, b) => {
        const rowA = Math.floor(a / COLS), rowB = Math.floor(b / COLS);
        if (rowA !== rowB) return rowB - rowA; // bottom rows first
        return (a % COLS) - (b % COLS);        // left to right
      });

      gl.bindBuffer(gl.ARRAY_BUFFER, alphaBufferRef.current);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, alphas);
      darkDotsCache.current = darkIdx;
      dotsReady.current = true;

      const fz = fitZoom();
      minZoomRef.current = fz;
      maxZoomRef.current = fz * MAX_ZOOM_FACTOR;
      cam.current.zoom = fz;
      // Start at bottom-left origin
      const cvs = canvasRef.current;
      if (cvs) {
        const r = cvs.getBoundingClientRect();
        const viewW = (r.width - PAD * 2) / fz;
        const viewH = (r.height - PAD * 2) / fz;
        cam.current.cx = Math.min(viewW / 2, WORLD_W / 2);
        cam.current.cy = Math.max(WORLD_H - viewH / 2, WORLD_H / 2);
      }
      clampCamera();

      console.log(`[BachecaDots] ${darkIdx.length} drawing dots from SVG`);
      if (onDarkDotsReadyRef.current) onDarkDotsReadyRef.current(darkIdx);
    });
  }, [positions, fitZoom]);

  useEffect(() => {
    init();
    const onResize = () => {
      const c = canvasRef.current; if (!c) return;
      const dpr = window.devicePixelRatio || 1; const r = c.getBoundingClientRect();
      c.width = r.width * dpr; c.height = r.height * dpr;
      minZoomRef.current = fitZoom(); maxZoomRef.current = minZoomRef.current * MAX_ZOOM_FACTOR;
      clampCamera();
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [init, fitZoom, clampCamera]);

  /* ═══ Update state + color buffers ═══ */
  useEffect(() => {
    const gl = glRef.current; if (!gl || !stateBufferRef.current || !dotsReady.current) return;
    const states = new Float32Array(TOTAL);
    const colors = new Float32Array(TOTAL * 3);
    const darkSet = new Set(darkDotsCache.current);

    for (let i = 0; i < TOTAL; i++) {
      const isDark = darkSet.has(i);
      const isOcc = occupiedDots.has(i);
      const isTarget = targetDot !== null && i === targetDot;

      if (isTarget) states[i] = 3;
      else if (isOcc) states[i] = 2;
      else if (isDark) states[i] = 1;
      else states[i] = 0;

      const hex = dotColors.get(i);
      const rgb = hex ? hexToRGB(hex) : DEFAULT_COLOR;
      colors[i * 3] = rgb[0]; colors[i * 3 + 1] = rgb[1]; colors[i * 3 + 2] = rgb[2];
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, stateBufferRef.current);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, states);
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBufferRef.current);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, colors);
  }, [occupiedDots, dotColors, targetDot]);

  /* ═══ External zoom ═══ */
  useEffect(() => {
    if (externalZoom === null) return;
    cam.current.zoom = minZoomRef.current + externalZoom * (maxZoomRef.current - minZoomRef.current);
    clampCamera(); emitCamera();
  }, [externalZoom, clampCamera, emitCamera]);

  /* ═══ Zoom animation ═══ */
  useEffect(() => {
    if (tlRef.current) { tlRef.current.kill(); tlRef.current = null; }
    const c = cam.current;
    if (zoomPhase === 'zoomed-in' && targetDot !== null) {
      const w = dotIndexToWorld(targetDot);
      c.cx = w.x; c.cy = w.y; c.zoom = maxZoomRef.current;
      clampCamera(); emitCamera();
    }
    if (zoomPhase === 'zooming-out') {
      // Zoom out to fit, camera goes to bottom-left origin
      // clampCamera in onUpdate will keep it within bounds at every frame
      const endZoom = minZoomRef.current;
      const cvs = canvasRef.current;
      let endCx = WORLD_W / 2, endCy = WORLD_H / 2;
      if (cvs) {
        const r = cvs.getBoundingClientRect();
        const viewW = (r.width - PAD * 2) / endZoom;
        const viewH = (r.height - PAD * 2) / endZoom;
        endCx = Math.min(viewW / 2, WORLD_W / 2);    // left edge
        endCy = Math.max(WORLD_H - viewH / 2, WORLD_H / 2); // bottom edge
      }
      const tl = gsap.timeline({
        onUpdate: () => { clampCamera(); emitCamera(); },
        onComplete: () => { if (onZoomCompleteRef.current) onZoomCompleteRef.current(); },
      });
      tl.to(c, { zoom: endZoom, duration: 3.5, ease: 'power2.inOut' }, 0);
      tl.to(c, { cx: endCx, cy: endCy, duration: 3.5, ease: 'power2.inOut' }, 0);
      tlRef.current = tl;
    }
    if (zoomPhase === 'free' || zoomPhase === 'idle') {
      c.zoom = minZoomRef.current || fitZoom();
      clampCamera(); emitCamera();
    }
    return () => { if (tlRef.current) { tlRef.current.kill(); tlRef.current = null; } };
  }, [zoomPhase, targetDot, fitZoom, clampCamera, emitCamera]);

  /* ═══ Render loop ═══ */
  useEffect(() => {
    const render = () => {
      const gl = glRef.current, prog = programRef.current, cvs = canvasRef.current;
      if (!gl || !prog || !cvs || !dotsReady.current) { rafRef.current = requestAnimationFrame(render); return; }
      gl.viewport(0, 0, cvs.width, cvs.height);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(prog);

      const dpr = window.devicePixelRatio || 1, c = cam.current, u = uniformsRef.current;
      gl.uniform2f(u.u_resolution, cvs.width, cvs.height);
      gl.uniform2f(u.u_camera, c.cx, c.cy);
      gl.uniform1f(u.u_zoom, c.zoom * dpr);
      gl.uniform1f(u.u_basePt, 5.0 * dpr);
      gl.uniform1f(u.u_time, (Date.now() - startTime.current) / 1000);

      const a = attribsRef.current;
      gl.bindBuffer(gl.ARRAY_BUFFER, posBufferRef.current);
      gl.enableVertexAttribArray(a.a_position); gl.vertexAttribPointer(a.a_position, 2, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, alphaBufferRef.current);
      gl.enableVertexAttribArray(a.a_alpha); gl.vertexAttribPointer(a.a_alpha, 1, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, stateBufferRef.current);
      gl.enableVertexAttribArray(a.a_state); gl.vertexAttribPointer(a.a_state, 1, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, colorBufferRef.current);
      gl.enableVertexAttribArray(a.a_color); gl.vertexAttribPointer(a.a_color, 3, gl.FLOAT, false, 0, 0);

      gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.drawArrays(gl.POINTS, 0, TOTAL);
      rafRef.current = requestAnimationFrame(render);
    };
    rafRef.current = requestAnimationFrame(render);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  /* ═══ Interaction ═══ */
  const getRect = useCallback(() => {
    const c = canvasRef.current; if (!c) return { w: 1, h: 1, left: 0, top: 0 };
    const r = c.getBoundingClientRect(); return { w: r.width, h: r.height, left: r.left, top: r.top };
  }, []);

  const onPointerDown = useCallback((e) => {
    if (!panEnabled) return;
    const ps = pinchState.current;
    ps.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    e.currentTarget.setPointerCapture(e.pointerId);
    if (ps.pointers.size === 2) {
      const pts = [...ps.pointers.values()];
      ps.active = true; ps.startDist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y); ps.startZoom = cam.current.zoom;
      panState.current.active = false;
    } else if (ps.pointers.size === 1) {
      panState.current = { active: true, moved: false, sx: e.clientX, sy: e.clientY, scx: cam.current.cx, scy: cam.current.cy };
    }
  }, [panEnabled]);

  const onPointerMove = useCallback((e) => {
    if (!panEnabled) return;
    const ps = pinchState.current;
    ps.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ps.active && ps.pointers.size >= 2) {
      const pts = [...ps.pointers.values()];
      cam.current.zoom = ps.startZoom * (Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y) / ps.startDist);
      clampCamera(); emitCamera();
    } else if (panState.current.active) {
      const p = panState.current;
      const dx = e.clientX - p.sx, dy = e.clientY - p.sy;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) p.moved = true;
      cam.current.cx = p.scx - dx / cam.current.zoom;
      cam.current.cy = p.scy - dy / cam.current.zoom;
      clampCamera();
    }
    if (onDotHoverRef.current && !panState.current.active) {
      const cs = getRect();
      const idx = screenToDotIndex(e.clientX - cs.left, e.clientY - cs.top, cam.current, cs.w, cs.h);
      onDotHoverRef.current(idx >= 0 && occupiedRef.current.has(idx) ? idx : null, e.clientX, e.clientY);
    }
  }, [panEnabled, clampCamera, emitCamera, getRect]);

  const onPointerUp = useCallback((e) => {
    pinchState.current.pointers.delete(e.pointerId);
    if (pinchState.current.pointers.size < 2) pinchState.current.active = false;
    const p = panState.current;
    if (p.active && !p.moved && onDotTapRef.current) {
      const cs = getRect();
      const idx = screenToDotIndex(e.clientX - cs.left, e.clientY - cs.top, cam.current, cs.w, cs.h);
      onDotTapRef.current(idx >= 0 && occupiedRef.current.has(idx) ? idx : null, e.clientX, e.clientY);
    }
    p.active = false;
  }, [getRect]);

  const onWheel = useCallback((e) => {
    if (!panEnabled) return; e.preventDefault();
    cam.current.zoom *= (1 - e.deltaY * 0.001);
    clampCamera(); emitCamera();
  }, [panEnabled, clampCamera, emitCamera]);

  return (
    <canvas ref={canvasRef}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 1,
        pointerEvents: panEnabled ? 'auto' : 'none', cursor: panEnabled ? 'grab' : 'default', touchAction: 'none' }}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove}
      onPointerUp={onPointerUp} onPointerLeave={onPointerUp} onPointerCancel={onPointerUp}
      onWheel={onWheel} />
  );
};

export { COLS, ROWS, TOTAL, WORLD_W, WORLD_H, DARK_THRESHOLD };
export default BachecaDots;
