import * as THREE from "three";
import { CATEGORIES } from "./data/techniques.js";

// The pills, as meshes ON the sphere — the same 3D as the photos, not a layer
// in front of them. Children of the drum, so they turn with it, pass behind it
// and sort against the cards like any other object. Every one is billboarded
// each frame: always face to camera.
//
// They have ONE life, on one clock: step 3, `tl.pill`. They appear among the
// photographs on their own shell, staggered, and that is the end of the canvas
// experience — what used to follow (the cloud opening out, the techniques in
// orbit, the net) belongs to another piece and is not on this page.

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerp = (a, b, t) => a + (b - a) * t;
const expoOut = (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x));
const rad = THREE.MathUtils.degToRad;
const GOLD = Math.PI * (3 - Math.sqrt(5));

// deterministic per-index noise so a rebuild keeps the same scatter
const hash = (i, s) => {
  const v = Math.sin((i + 1) * 127.1 + s * 311.7) * 43758.5453;
  return v - Math.floor(v);
};

export function parseLabels(text) {
  return String(text || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

const TEX_SCALE = 4; // label texture supersampling

/** A stadium label baked into a canvas texture. `style` carries the skin. */
function makeLabelTexture(label, style, fontSize, radius, padX) {
  const fontPx = fontSize * TEX_SCALE;
  const c = document.createElement("canvas");
  const font = `${fontPx}px Inter, "Helvetica Neue", -apple-system, sans-serif`;
  const m = c.getContext("2d");
  m.font = font;
  const textW = m.measureText(label).width;
  const bw = (style.border || 0) * TEX_SCALE;
  const h = Math.round(fontPx * 2.7 + bw * 2);
  const w = Math.round(textW + fontPx * padX * 2 + bw * 2);
  c.width = w;
  c.height = h;
  const g = c.getContext("2d");
  g.font = font;
  g.textAlign = "center";
  g.textBaseline = "middle";

  const inset = bw / 2;
  const hh = h - bw;
  const r = (hh / 2) * Math.min(1, radius / 0.5);
  const x0 = inset, y0 = inset, x1 = w - inset, y1 = h - inset;
  g.beginPath();
  g.moveTo(x0 + r, y0);
  g.lineTo(x1 - r, y0);
  g.quadraticCurveTo(x1, y0, x1, y0 + r);
  g.lineTo(x1, y1 - r);
  g.quadraticCurveTo(x1, y1, x1 - r, y1);
  g.lineTo(x0 + r, y1);
  g.quadraticCurveTo(x0, y1, x0, y1 - r);
  g.lineTo(x0, y0 + r);
  g.quadraticCurveTo(x0, y0, x0 + r, y0);
  g.closePath();
  g.fillStyle = style.bg;
  g.fill();
  if (bw > 0) {
    g.lineWidth = bw;
    g.strokeStyle = style.borderColor;
    g.stroke();
  }
  g.fillStyle = style.ink;
  g.fillText(label, w / 2, h / 2 + fontPx * 0.04);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return { tex, aspect: w / h };
}

export function createPills3D({ parent, camera, cfg }) {
  const geo = new THREE.PlaneGeometry(1, 1);
  let pills = [];

  function disposePills() {
    for (const p of pills) {
      parent.remove(p.group);
      p.mat.map?.dispose();
      p.mat.dispose();
    }
    pills = [];
  }

  /** Which categories become pills. */
  function pick() {
    const P = cfg.pills3d;
    const custom = parseLabels(P.text);
    return custom.length ? custom : CATEGORIES.slice(0, P.count);
  }

  function build() {
    disposePills();
    const P = cfg.pills3d;
    const names = pick();
    const n = names.length;

    names.forEach((name, i) => {
      const skin = { bg: P.bg, ink: P.ink, border: 0, borderColor: P.bg };
      const { tex, aspect } = makeLabelTexture(name, skin, P.fontSize, P.radius, P.padX);
      const mat = new THREE.MeshBasicMaterial({
        map: tex, transparent: true, opacity: 0,
        side: THREE.FrontSide, toneMapped: false, depthWrite: false,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.renderOrder = 3;
      const group = new THREE.Group();
      group.add(mesh);
      group.visible = false;
      parent.add(group);

      // own fibonacci shell, twisted off the photos' distribution
      const yN = n > 1 ? 1 - (i / (n - 1)) * 2 : 0;
      const rAtY = Math.sqrt(Math.max(0, 1 - yN * yN));
      const a = GOLD * i + P.twist * Math.PI * 2;
      const dir = new THREE.Vector3(Math.cos(a) * rAtY, yN, Math.sin(a) * rAtY);
      if (dir.lengthSq() < 1e-6) dir.set(0, yN >= 0 ? 1 : -1, 0);
      dir.normalize();

      pills.push({
        group, mesh, mat, aspect, label: name, dir,
        jitter: hash(i, 1) * 2 - 1,
        phase: hash(i, 2) * Math.PI * 2,
        rank: i,
        index: i,
      });
    });

    // reveal order
    if (P.order === "random") {
      const shuffled = [...pills].sort((a, b) => hash(a.index, 7) - hash(b.index, 7));
      shuffled.forEach((p, i) => { p.rank = i; });
    }
  }

  const _camW = new THREE.Vector3();
  const _m = new THREE.Matrix4();
  const _pq = new THREE.Quaternion();
  const _a = new THREE.Vector3();

  /** `t` carries the one clock this needs: `pill`. */
  function update(t, time) {
    const P = cfg.pills3d;
    const q = clamp01(t.pill);
    if (q <= 0) {
      for (const p of pills) p.group.visible = false;
      return;
    }

    camera.getWorldPosition(_camW);
    parent.updateWorldMatrix(true, false);
    _m.extractRotation(parent.matrixWorld);
    _pq.setFromRotationMatrix(_m).invert();

    const R = cfg.layout.radius * P.shell;
    const n = Math.max(1, pills.length - 1);
    const spread = clamp01(P.stagger) * 0.9;
    const w = 1 - spread;

    for (const p of pills) {
      const t0 = (p.rank / n) * spread;
      const e = expoOut(clamp01((q - t0) / w));
      p.group.visible = e > 0.002;
      if (!p.group.visible) continue;

      const breathe =
        Math.sin(time * P.floatSpeed * Math.PI * 2 + p.phase) * P.pillH * P.float;
      p.group.position
        .copy(p.dir)
        .multiplyScalar(R * (1 + p.jitter * P.jitter) + breathe);

      const s = lerp(P.enterScale, 1, e);
      p.mesh.scale.set(P.pillH * p.aspect * s, P.pillH * s, 1);
      p.mat.opacity = e;

      if (P.faceMode === "point") p.mesh.lookAt(_camW);
      else p.mesh.quaternion.copy(camera.quaternion).premultiply(_pq);
      if (P.tilt > 0.01) {
        p.mesh.rotateZ(rad(P.tilt) * Math.sin(time * P.floatSpeed * Math.PI * 1.7 + p.phase));
      }
    }
  }

  function dispose() {
    disposePills();
    geo.dispose();
  }

  build();

  return {
    build,
    update,
    dispose,
    get count() { return pills.length; },
    get labels() { return pills.map((p) => p.label); },
    /** where the pills land, in NDC — for the assertions */
    nodes() {
      return pills.map((p) => {
        p.group.updateWorldMatrix(true, false);
        _a.setFromMatrixPosition(p.group.matrixWorld).project(camera);
        return { x: +_a.x.toFixed(4), y: +_a.y.toFixed(4), z: +_a.z.toFixed(4) };
      });
    },
    /** the live opacities, for the assertions */
    probe() {
      return {
        first: pills.length ? +pills[0].mat.opacity.toFixed(2) : 0,
        last: pills.length ? +pills[pills.length - 1].mat.opacity.toFixed(2) : 0,
        visible: pills.filter((p) => p.group.visible).length,
      };
    },
  };
}
