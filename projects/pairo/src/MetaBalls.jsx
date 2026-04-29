import { useEffect, useRef } from 'react';
import { Renderer, Program, Mesh, Triangle, Transform, Vec3, Camera } from 'ogl';
import './MetaBalls.css';

function parseHexColor(hex) {
  const c = hex.replace('#', '');
  return [
    parseInt(c.substring(0, 2), 16) / 255,
    parseInt(c.substring(2, 4), 16) / 255,
    parseInt(c.substring(4, 6), 16) / 255,
  ];
}

function fract(x) { return x - Math.floor(x); }

function hash31(p) {
  let r = [p * 0.1031, p * 0.103, p * 0.0973].map(fract);
  const r_yzx = [r[1], r[2], r[0]];
  const dotVal = r[0] * (r_yzx[0] + 33.33) + r[1] * (r_yzx[1] + 33.33) + r[2] * (r_yzx[2] + 33.33);
  for (let i = 0; i < 3; i++) r[i] = fract(r[i] + dotVal);
  return r;
}

function hash33(v) {
  let p = [v[0] * 0.1031, v[1] * 0.103, v[2] * 0.0973].map(fract);
  const p_yxz = [p[1], p[0], p[2]];
  const dotVal = p[0] * (p_yxz[0] + 33.33) + p[1] * (p_yxz[1] + 33.33) + p[2] * (p_yxz[2] + 33.33);
  for (let i = 0; i < 3; i++) p[i] = fract(p[i] + dotVal);
  const p_xxy = [p[0], p[0], p[1]];
  const p_yxx = [p[1], p[0], p[0]];
  const p_zyx = [p[2], p[1], p[0]];
  return [0, 1, 2].map(i => fract((p_xxy[i] + p_yxx[i]) * p_zyx[i]));
}

const vertex = `#version 300 es
precision highp float;
layout(location = 0) in vec2 position;
void main() { gl_Position = vec4(position, 0.0, 1.0); }
`;

const fragmentSolid = `#version 300 es
precision highp float;
uniform vec3 iResolution;
uniform float iTime;
uniform vec3 iMouse;
uniform vec3 iColor;
uniform vec3 iCursorColor;
uniform float iAnimationSize;
uniform int iBallCount;
uniform float iCursorBallSize;
uniform vec3 iMetaBalls[50];
uniform float iClumpFactor;
uniform bool enableTransparency;
out vec4 outColor;

float getMetaBallValue(vec2 c, float r, vec2 p) {
  vec2 d = p - c;
  float dist2 = dot(d, d);
  return (r * r) / dist2;
}

void main() {
  vec2 fc = gl_FragCoord.xy;
  float scale = iAnimationSize / iResolution.y;
  vec2 coord = (fc - iResolution.xy * 0.5) * scale;
  vec2 mouseW = (iMouse.xy - iResolution.xy * 0.5) * scale;
  float m1 = 0.0;
  for (int i = 0; i < 50; i++) {
    if (i >= iBallCount) break;
    m1 += getMetaBallValue(iMetaBalls[i].xy, iMetaBalls[i].z, coord);
  }
  float m2 = getMetaBallValue(mouseW, iCursorBallSize, coord);
  float total = m1 + m2;
  float f = smoothstep(-1.0, 1.0, (total - 1.3) / min(1.0, fwidth(total)));
  vec3 cFinal = vec3(0.0);
  if (total > 0.0) {
    float alpha1 = m1 / total;
    float alpha2 = m2 / total;
    cFinal = iColor * alpha1 + iCursorColor * alpha2;
  }
  outColor = vec4(cFinal * f, enableTransparency ? f : 1.0);
}
`;

const fragmentAscii = `#version 300 es
precision highp float;
uniform vec3 iResolution;
uniform float iTime;
uniform vec3 iMouse;
uniform vec3 iColor;
uniform vec3 iCursorColor;
uniform float iAnimationSize;
uniform int iBallCount;
uniform float iCursorBallSize;
uniform vec3 iMetaBalls[50];
uniform float iClumpFactor;
uniform bool enableTransparency;
uniform float iCharSize;
out vec4 outColor;

float getMetaBallValue(vec2 c, float r, vec2 p) {
  vec2 d = p - c;
  float dist2 = dot(d, d);
  return (r * r) / dist2;
}

// Simple bitmap font for ASCII characters (4x5 grid per char)
// Characters: " .:-=+*#%@"  (10 levels of density)
float getCharPixel(int charIdx, vec2 uv) {
  // 4x5 pixel bitmaps encoded as floats
  // Row 0 is top, col 0 is left
  int col = int(uv.x * 4.0);
  int row = int(uv.y * 5.0);
  if (col < 0 || col > 3 || row < 0 || row > 4) return 0.0;

  int bit = row * 4 + col;

  // Bitmap data for each character (20 bits each)
  // Space
  if (charIdx == 0) return 0.0;
  // .
  if (charIdx == 1) {
    int b = 0x00020; // single dot bottom center
    return float((b >> bit) & 1);
  }
  // :
  if (charIdx == 2) {
    int b = 0x20200; // two dots
    return float((b >> (19 - bit)) & 1);
  }
  // -
  if (charIdx == 3) {
    int b = 0x00F00; // horizontal line middle
    return float((b >> (19 - bit)) & 1);
  }
  // =
  if (charIdx == 4) {
    int b = 0x0F0F0; // two horizontal lines
    return float((b >> (19 - bit)) & 1);
  }
  // +
  if (charIdx == 5) {
    int b = 0x04E40; // plus shape
    return float((b >> (19 - bit)) & 1);
  }
  // *
  if (charIdx == 6) {
    int b = 0xA4E4A; // star
    return float((b >> (19 - bit)) & 1);
  }
  // #
  if (charIdx == 7) {
    int b = 0xAFAFA; // hash
    return float((b >> (19 - bit)) & 1);
  }
  // %
  if (charIdx == 8) {
    int b = 0x92492; // percent-ish
    return float((b >> (19 - bit)) & 1);
  }
  // @
  if (charIdx == 9) {
    int b = 0xFFFFF; // full block
    return float((b >> (19 - bit)) & 1);
  }
  return 0.0;
}

void main() {
  vec2 fc = gl_FragCoord.xy;
  float charW = iCharSize;
  float charH = iCharSize * 1.6; // taller than wide for char aspect ratio

  // Snap to grid cell center for metaball sampling
  vec2 cellId = floor(fc / vec2(charW, charH));
  vec2 cellCenter = (cellId + 0.5) * vec2(charW, charH);

  float scale = iAnimationSize / iResolution.y;
  vec2 coord = (cellCenter - iResolution.xy * 0.5) * scale;
  vec2 mouseW = (iMouse.xy - iResolution.xy * 0.5) * scale;

  float m1 = 0.0;
  for (int i = 0; i < 50; i++) {
    if (i >= iBallCount) break;
    m1 += getMetaBallValue(iMetaBalls[i].xy, iMetaBalls[i].z, coord);
  }
  float m2 = getMetaBallValue(mouseW, iCursorBallSize, coord);
  float total = m1 + m2;

  // Smooth metaball threshold
  float f = smoothstep(0.3, 2.0, total);

  // Map intensity to character index (0-9)
  int charIdx = int(clamp(f * 10.0, 0.0, 9.0));

  // UV within the current cell
  vec2 cellUV = fract(fc / vec2(charW, charH));

  // Get pixel from bitmap font
  float pixel = getCharPixel(charIdx, cellUV);

  // Color mixing
  vec3 cFinal = iColor;
  if (total > 0.0) {
    float alpha1 = m1 / total;
    float alpha2 = m2 / total;
    cFinal = iColor * alpha1 + iCursorColor * alpha2;
  }

  // Glow effect: softer color for lower density chars
  float glow = f * 0.15;
  vec3 finalColor = cFinal * (pixel * f + glow);
  float alpha = enableTransparency ? max(pixel * f, glow * 0.5) : 1.0;

  outColor = vec4(finalColor, alpha);
}
`;

export default function MetaBalls({
  className = '',
  color = '#ffffff',
  speed = 0.3,
  enableMouseInteraction = true,
  hoverSmoothness = 0.05,
  animationSize = 30,
  ballCount = 15,
  clumpFactor = 1,
  cursorBallSize = 3,
  cursorBallColor = '#ffffff',
  enableTransparency = true,
  asciiMode = false,
  asciiCharSize = 8,
}) {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const dpr = 1;
    const renderer = new Renderer({ dpr, alpha: true, premultipliedAlpha: false });
    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, enableTransparency ? 0 : 1);
    container.appendChild(gl.canvas);

    const camera = new Camera(gl, { left: -1, right: 1, top: 1, bottom: -1, near: 0.1, far: 10 });
    camera.position.z = 1;

    const geometry = new Triangle(gl);
    const [r1, g1, b1] = parseHexColor(color);
    const [r2, g2, b2] = parseHexColor(cursorBallColor);

    const metaBallsUniform = [];
    for (let i = 0; i < 50; i++) metaBallsUniform.push(new Vec3(0, 0, 0));

    const activeFragment = asciiMode ? fragmentAscii : fragmentSolid;

    const uniforms = {
      iTime: { value: 0 },
      iResolution: { value: new Vec3(0, 0, 0) },
      iMouse: { value: new Vec3(0, 0, 0) },
      iColor: { value: new Vec3(r1, g1, b1) },
      iCursorColor: { value: new Vec3(r2, g2, b2) },
      iAnimationSize: { value: animationSize },
      iBallCount: { value: ballCount },
      iCursorBallSize: { value: cursorBallSize },
      iMetaBalls: { value: metaBallsUniform },
      iClumpFactor: { value: clumpFactor },
      enableTransparency: { value: enableTransparency },
    };

    if (asciiMode) {
      uniforms.iCharSize = { value: asciiCharSize };
    }

    const program = new Program(gl, {
      vertex,
      fragment: activeFragment,
      uniforms,
    });

    const mesh = new Mesh(gl, { geometry, program });
    const scene = new Transform();
    mesh.setParent(scene);

    const maxBalls = 50;
    const effectiveBallCount = Math.min(ballCount, maxBalls);
    const ballParams = [];
    for (let i = 0; i < effectiveBallCount; i++) {
      const idx = i + 1;
      const h1 = hash31(idx);
      const st = h1[0] * (2 * Math.PI);
      const dtFactor = 0.1 * Math.PI + h1[1] * (0.4 * Math.PI - 0.1 * Math.PI);
      const baseScale = 5.0 + h1[1] * (10.0 - 5.0);
      const h2 = hash33(h1);
      const toggle = Math.floor(h2[0] * 2.0);
      const radiusVal = 0.5 + h2[2] * (2.0 - 0.5);
      ballParams.push({ st, dtFactor, baseScale, toggle, radius: radiusVal });
    }

    const mouseBallPos = { x: 0, y: 0 };
    let pointerInside = false;
    let pointerX = 0;
    let pointerY = 0;

    function resize() {
      if (!container) return;
      const width = container.clientWidth;
      const height = container.clientHeight;
      renderer.setSize(width * dpr, height * dpr);
      gl.canvas.style.width = width + 'px';
      gl.canvas.style.height = height + 'px';
      program.uniforms.iResolution.value.set(gl.canvas.width, gl.canvas.height, 0);
    }
    window.addEventListener('resize', resize);
    resize();

    function onPointerMove(e) {
      if (!enableMouseInteraction) return;
      const rect = container.getBoundingClientRect();
      pointerX = ((e.clientX - rect.left) / rect.width) * gl.canvas.width;
      pointerY = (1 - (e.clientY - rect.top) / rect.height) * gl.canvas.height;
      pointerInside = true;
    }
    function onPointerLeave() { if (enableMouseInteraction) pointerInside = false; }
    window.addEventListener('pointermove', onPointerMove);
    container.addEventListener('pointerleave', onPointerLeave);

    const startTime = performance.now();
    let animationFrameId;
    function update(t) {
      animationFrameId = requestAnimationFrame(update);
      const elapsed = (t - startTime) * 0.001;
      program.uniforms.iTime.value = elapsed;

      for (let i = 0; i < effectiveBallCount; i++) {
        const p = ballParams[i];
        const dt = elapsed * speed * p.dtFactor;
        const th = p.st + dt;
        metaBallsUniform[i].set(
          Math.cos(th) * p.baseScale * clumpFactor,
          Math.sin(th + dt * p.toggle) * p.baseScale * clumpFactor,
          p.radius,
        );
      }

      let targetX, targetY;
      if (pointerInside) {
        targetX = pointerX;
        targetY = pointerY;
      } else {
        const cx = gl.canvas.width * 0.5;
        const cy = gl.canvas.height * 0.5;
        targetX = cx + Math.cos(elapsed * speed) * gl.canvas.width * 0.15;
        targetY = cy + Math.sin(elapsed * speed) * gl.canvas.height * 0.15;
      }
      mouseBallPos.x += (targetX - mouseBallPos.x) * hoverSmoothness;
      mouseBallPos.y += (targetY - mouseBallPos.y) * hoverSmoothness;
      program.uniforms.iMouse.value.set(mouseBallPos.x, mouseBallPos.y, 0);

      renderer.render({ scene, camera });
    }
    animationFrameId = requestAnimationFrame(update);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointerMove);
      container.removeEventListener('pointerleave', onPointerLeave);
      if (gl.canvas.parentNode === container) container.removeChild(gl.canvas);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, [color, cursorBallColor, speed, enableMouseInteraction, hoverSmoothness, animationSize, ballCount, clumpFactor, cursorBallSize, enableTransparency, asciiMode, asciiCharSize]);

  return <div ref={containerRef} className={`metaballs-container ${className}`} />;
}
