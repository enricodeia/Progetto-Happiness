import * as THREE from "three";
import gsap from "gsap";
import { placeItem, itemCount } from "../lib/layout.js";
import { makeBentGeometry, makeCardMaterial } from "../lib/itemMesh.js";
import { photoMedia } from "../data/photos.js";
import { metalabMedia } from "../data/metalab.js";
import { applyFx } from "./fx.js";

/**
 * The Metalab Webkit "Tower of Pisa" carousel, ported from the React
 * CylinderCarousel to plain three.js.
 *
 * Everything the preset switches off (orbit, scroll camera, scroll reveal,
 * smooothy, the whole post-FX kit) is simply absent here rather than written
 * and disabled. What is left is exactly what the preset turns on:
 *
 *   · spiral placement          layout.{radius, spiralTurns, spiralRise, spiralGrow}
 *   · a leaning drum            camera.{tiltX, tiltZ}   ← the lean
 *   · auto-spin + drag + glide  motion.autoSpin, interaction.momentum.decay
 *   · pointer parallax          interaction.parallax
 *   · click-to-focus            interaction.focus  (swing front + zoom-to-fit)
 *
 * ── Full-bleed canvas, framed composition ────────────────────────────────
 * The canvas is the WHOLE viewport, so nothing is ever clipped by a column
 * box: a card thrown out by the parallax or by the focus zoom keeps drawing
 * across the page. What is confined is the FRAMING — `cfg.region` is the
 * rectangle the tower is composed into (the left half on desktop, the whole
 * screen on mobile), and two things read it:
 *
 *   · `camera.fit`    dollies back until the tower's horizontal extent
 *                     matches what the preset framed at `fitAspect`, measured
 *                     against the REGION's aspect rather than the canvas's.
 *                     `fov` is vertical and the region is full-height, so
 *                     this is the only axis that needs correcting.
 *   · `setViewOffset` pans the frustum so the region's centre becomes the
 *                     optical centre. `filmOffset` (what `sphere.js` uses)
 *                     only skews horizontally; the view offset does both
 *                     axes, which is what `region.yPct` needs.
 *
 * Raycasting reads the same projection matrix, so click-to-focus keeps
 * hitting the card under the cursor with the frustum panned.
 */

const DRAG_K = 0.0011;   // px → radians, the webkit component's constant
const SPIN_K = 0.0026;   // autoSpin → radians per frame, ditto
const PLACEHOLDER = new THREE.Color("#e6e3da");

export function createTower({ mount, cfg }) {
  const scene = new THREE.Scene();
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.domElement.className = "tch-canvas";
  renderer.domElement.setAttribute("role", "img");
  renderer.domElement.setAttribute(
    "aria-label",
    "A leaning spiral of teacher portraits. Drag to turn it, click a portrait to bring it forward."
  );
  mount.appendChild(renderer.domElement);
  const canvas = renderer.domElement;

  const camera = new THREE.PerspectiveCamera(cfg.camera.fov, 1, 0.1, 800);
  const drum = new THREE.Group();
  scene.add(drum);

  let W = 1;
  let H = 1;

  // ── the framing region ───────────────────────────────────────────────────
  // Desktop uses `cfg.region`; anything narrower than `region.breakpoint`
  // uses `region.mobile`, where the tower is centred on the whole screen.
  function region() {
    const r = cfg.region;
    const m = W < r.breakpoint ? r.mobile : r;
    const w = Math.max(1, (W * m.width) / 100);
    return {
      w,
      h: H,
      aspect: w / Math.max(1, H),
      // centre of the region, as NDC (−1 = left edge, 0 = middle, +1 = right)
      ndcX: m.xPct / 50 - 1,
      ndcY: 1 - m.yPct / 50,
    };
  }

  // ── build ────────────────────────────────────────────────────────────────
  const loader = new THREE.TextureLoader();
  loader.crossOrigin = "anonymous";
  let items = [];
  let geo = null;
  let planeH = 1;
  let disposed = false;

  function media() {
    return cfg.images.source === "metalab" ? metalabMedia() : photoMedia();
  }

  function build() {
    teardown();
    const L = cfg.layout;
    const G = cfg.geometry;
    const K = cfg.look;
    const list = media();
    const total = Math.min(
      itemCount(L.shape, L.perRow, L.rows, Math.round(cfg.images.count)),
      Math.max(1, list.length)
    );
    planeH = G.planeW / G.aspect;
    const planeAspect = G.planeW / planeH;
    geo = makeBentGeometry(G.planeW, planeH, G.segments, L.radius, G.bend);

    for (let idx = 0; idx < total; idx++) {
      const pos = placeItem(L.shape, idx, total, {
        perRow: Math.max(1, Math.round(L.perRow)),
        rows: Math.max(1, Math.round(L.rows)),
        radius: L.radius,
        rowGap: L.rowGap,
        curve: L.curve,
        spiralTurns: L.spiralTurns,
        spiralRise: L.spiralRise,
        spiralGrow: L.spiralGrow,
      });
      const holder = new THREE.Group();
      holder.position.set(pos.x, pos.y, pos.z);
      const baseRy = L.faceCenter ? pos.ry : 0;
      holder.rotation.y = baseRy;

      const mat = makeCardMaterial();
      mat.uniforms.uRadius.value = G.borderRadius;
      mat.uniforms.uCornerN.value = G.cornerN ?? 2;
      mat.uniforms.uAspect.value = planeAspect;
      mat.uniforms.uPlaneAspect.value = planeAspect;
      mat.uniforms.uTint.value = PLACEHOLDER.clone();
      mat.uniforms.uOpacity.value = 0;

      const mesh = new THREE.Mesh(geo, mat);
      mesh.userData.index = idx;
      holder.add(mesh);
      drum.add(holder);

      const it = {
        idx, holder, mesh, mat, baseRy,
        baseA: Math.atan2(pos.x, pos.z),
        basePos: new THREE.Vector3(pos.x, pos.y, pos.z), // drum-local, for autoFrame
        tex: null,
        video: null,
      };
      items.push(it);

      const m = list[idx % list.length] || {};
      const reveal = () => {
        if (disposed) return;
        gsap.to(mat.uniforms.uOpacity, {
          value: K.opacity,
          duration: 0.9,
          delay: Math.min(idx * 0.035, 0.8),
          ease: "circ.out",
        });
      };
      if (cfg.images.video && m.video) {
        const v = document.createElement("video");
        v.src = m.video;
        v.crossOrigin = "anonymous";
        v.loop = true;
        v.muted = true;
        v.playsInline = true;
        v.setAttribute("playsinline", "");
        const vt = new THREE.VideoTexture(v);
        vt.colorSpace = THREE.SRGBColorSpace;
        v.addEventListener("loadeddata", () => {
          if (disposed) return;
          mat.uniforms.uImgAspect.value = (v.videoWidth || 16) / (v.videoHeight || 9);
          mat.uniforms.uTex.value = vt;
          mat.uniforms.uHasTex.value = 1;
          reveal();
          v.play().catch(() => {});
        });
        it.video = v;
        it.tex = vt;
        v.load();
      } else if (m.image) {
        loader.load(m.image, (t) => {
          if (disposed) {
            t.dispose();
            return;
          }
          t.colorSpace = THREE.SRGBColorSpace;
          mat.uniforms.uImgAspect.value = (t.image.width || 1) / (t.image.height || 1);
          mat.uniforms.uTex.value = t;
          mat.uniforms.uHasTex.value = 1;
          it.tex = t;
          reveal();
        });
      }
    }
    focusedI = -1;
    focusing = false;
    FOC.amt = 0;
  }

  function teardown() {
    gsap.killTweensOf(FOC);
    for (const it of items) {
      drum.remove(it.holder);
      it.mat.dispose();
      if (it.tex) it.tex.dispose();
      if (it.video) {
        it.video.pause();
        it.video.removeAttribute("src");
        it.video.load();
      }
    }
    items = [];
    if (geo) geo.dispose();
    geo = null;
  }

  // ── interaction ──────────────────────────────────────────────────────────
  const R = { v: 0 };          // drum rotation, radians
  let velocity = 0;            // drag glide
  let dragging = false;
  let lastX = 0;
  let loopT = 0;

  const ptr = { x: 0, y: 0 };  // −1..1 across the REGION, so the parallax is
  const par = { x: 0, y: 0 };  // anchored to the tower, not to the page

  // What the cursor-driven effects need: the pointer in SCREEN uv (the shader
  // works in gl_FragCoord space), its velocity, and a smoothed image-parallax
  // offset. `cur` is where it is, `vel` how fast, `img` the eased pan.
  const cur = { x: 0.5, y: 0.5 };
  const vel = { x: 0, y: 0 };
  const img = { x: 0, y: 0 };
  let lastMoveT = 0;

  function onPointerMove(e) {
    const r = canvas.getBoundingClientRect();
    if (r.width && r.height) {
      const g = region();
      const cx = r.left + (r.width * (g.ndcX + 1)) / 2;
      const cy = r.top + (r.height * (1 - g.ndcY)) / 2;
      ptr.x = (e.clientX - cx) / (g.w / 2);
      ptr.y = (e.clientY - cy) / (g.h / 2);

      // screen uv, y up — what gl_FragCoord.xy / uPostRes gives the shader
      const ux = (e.clientX - r.left) / r.width;
      const uy = 1 - (e.clientY - r.top) / r.height;
      const now = performance.now();
      const dt = Math.max(1, now - lastMoveT);
      lastMoveT = now;
      vel.x = ((ux - cur.x) / dt) * 16;
      vel.y = ((uy - cur.y) / dt) * 16;
      cur.x = ux;
      cur.y = uy;
    }
    if (dragging && cfg.motion.dragToSpin) {
      velocity += (e.clientX - lastX) * DRAG_K * (cfg.motion.invertDrag ? 1 : -1);
      lastX = e.clientX;
    }
  }
  function onDown(e) {
    dragging = true;
    lastX = e.clientX;
    canvas.setPointerCapture?.(e.pointerId);
  }
  function onUp() {
    dragging = false;
  }
  canvas.addEventListener("pointerdown", onDown);
  window.addEventListener("pointerup", onUp);
  window.addEventListener("pointermove", onPointerMove, { passive: true });

  // Click-to-focus — the card swings front and the camera zoom-to-fits it.
  const RC = new THREE.Raycaster();
  const MP = new THREE.Vector2();
  const _cw = new THREE.Vector3();
  const FOC = { amt: 0 };
  let focusedI = -1;
  let focusing = false;

  function focusDistance() {
    const F = cfg.interaction.focus;
    const vF = THREE.MathUtils.degToRad(cfg.camera.fov);
    const fitH = planeH / 2 / Math.tan(vF / 2);
    // fit against the REGION — a focused card fills its frame, not the page
    const hF = 2 * Math.atan(Math.tan(vF / 2) * region().aspect);
    const fitW = cfg.geometry.planeW / 2 / Math.tan(hF / 2);
    const fill = Math.min(0.98, Math.max(0.2, F.fill || 0.72));
    return Math.max(fitH, fitW) / fill;
  }
  function focusTo(i) {
    const F = cfg.interaction.focus;
    focusedI = i;
    focusing = true;
    let tgt = -items[i].baseA;
    const tp = Math.PI * 2;
    while (tgt - R.v > Math.PI) tgt -= tp;
    while (tgt - R.v < -Math.PI) tgt += tp;
    gsap.killTweensOf(R);
    gsap.killTweensOf(FOC);
    velocity = 0;
    gsap.to(R, { v: tgt, duration: F.duration, ease: F.ease });
    gsap.to(FOC, { amt: 1, duration: F.duration, ease: F.ease });
  }
  function focusOff() {
    if (focusedI < 0) return;
    const F = cfg.interaction.focus;
    gsap.killTweensOf(FOC);
    gsap.to(FOC, {
      amt: 0,
      duration: F.duration,
      ease: F.ease,
      onComplete: () => {
        focusing = false;
        focusedI = -1;
      },
    });
  }

  canvas.addEventListener("click", (e) => {
    if (!cfg.interaction.focus.enabled) return;
    if (Math.abs(velocity) > 0.02) return; // still gliding from a drag
    const r = canvas.getBoundingClientRect();
    MP.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    MP.y = -((e.clientY - r.top) / r.height) * 2 + 1;
    RC.setFromCamera(MP, camera);
    const hit = RC.intersectObjects(items.map((it) => it.mesh), false)[0];
    if (hit) {
      const i = hit.object.userData.index;
      if (i === focusedI) focusOff();
      else focusTo(i);
    } else if (focusedI >= 0) {
      focusOff();
    }
  });
  function onKey(e) {
    if (e.key === "Escape") focusOff();
  }
  window.addEventListener("keydown", onKey);

  // ── frame ────────────────────────────────────────────────────────────────
  function resize() {
    W = Math.max(1, mount.clientWidth);
    H = Math.max(1, mount.clientHeight);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    renderer.setSize(W, H, false);
  }
  const ro = new ResizeObserver(resize);
  ro.observe(mount);
  resize();

  // Dolly factor that keeps the preset's horizontal framing inside the region.
  function fitScale(g) {
    const C = cfg.camera;
    if (!C.fit) return 1;
    const ref = C.fitAspect || 1.6;
    const raw = ref / Math.max(0.05, g.aspect);
    return 1 + (raw - 1) * C.fit;
  }

  // ── autoFrame ────────────────────────────────────────────────────────────
  // The library presets were each composed for a full-bleed ~16:9 canvas, and
  // several sit deliberately OFF-CENTRE in it (the corner decos in a corner,
  // the simple rings along the bottom). Dropping one into a half-width region
  // just carries that offset along and the subject lands outside the frame.
  // `autoFrame` measures where the thing actually is and puts it in the
  // region instead:
  //
  //   1. sweep the drum through a full turn — a carousel that spins must be
  //      framed by its swept extent, or it fits now and pops out in a second
  //   2. project every card, as a sphere of the card's own half-diagonal, with
  //      a measuring camera at the BASE pose (no parallax, no focus) so the
  //      frame cannot wobble
  //   3. solve a zoom and an NDC shift from that box
  //
  // Zoom, not a dolly: a dolly changes the perspective the preset was authored
  // with, `camera.zoom` only changes the crop. `camera.fit` is the manual
  // alternative and is ignored while this is on.
  //
  // ── two geometries, two answers ─────────────────────────────────────────
  // Half the library puts the camera INSIDE the solid — Spiral Loop sits at
  // z 7.5 inside a radius-9.8 spiral, the Simple Rings and Corner Decos at
  // z 7 inside a radius 9.8–11.1 ring. Being inside the loop IS the
  // composition, and for it "fit everything in frame" is not just wrong but
  // undefined: the cards behind the camera project to garbage and the
  // measured box runs away (that is what emptied the corner decos on the
  // first pass). So the solver picks its mode from the geometry:
  //
  //   detached — the whole sweep is comfortably in front: fit it, zoom + pan
  //   enclosed — any card straddles or passes behind the camera: PAN only,
  //              on the centroid of what is actually visible, and shrink only
  //              if that overflows the region. The preset keeps its scale.
  const mCam = new THREE.PerspectiveCamera();
  const _rot = new THREE.Matrix4();
  const _eul = new THREE.Euler();
  const _pp = new THREE.Vector3();
  const _fwd = new THREE.Vector3();
  const _depth = new THREE.Vector3();
  const SWEEP = 12;
  let frame = null;
  let frameSig = "";

  function measure(g) {
    const C = cfg.camera;
    const G = cfg.geometry;
    if (!items.length) return null;

    mCam.fov = C.fov;
    mCam.aspect = W / H;
    mCam.near = 0.1;
    mCam.far = 800;
    mCam.zoom = 1;
    mCam.position.set(C.x, C.y, C.z);
    mCam.lookAt(C.lookAtX, C.lookAtY, 0);
    mCam.updateMatrixWorld(true);
    mCam.updateProjectionMatrix();
    mCam.getWorldDirection(_fwd);

    const tanH = Math.tan(THREE.MathUtils.degToRad(C.fov) / 2);
    const rCard = 0.5 * Math.hypot(G.planeW, planeH);
    // a card this close straddles the lens; anything nearer is behind it
    const nearLimit = rCard * 1.2 + mCam.near;

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    let sumX = 0, sumY = 0, seen = 0, enclosed = false;

    for (let s = 0; s < SWEEP; s++) {
      // the drum's own transform: rotation.x/.y/.z on the default XYZ order
      _eul.set(
        THREE.MathUtils.degToRad(C.tiltX),
        (s / SWEEP) * Math.PI * 2,
        THREE.MathUtils.degToRad(C.tiltZ)
      );
      _rot.makeRotationFromEuler(_eul);
      for (const it of items) {
        _pp.copy(it.basePos).applyMatrix4(_rot);
        _depth.subVectors(_pp, mCam.position);
        const depth = _depth.dot(_fwd);
        if (depth < nearLimit) {
          enclosed = true;
          continue;
        }
        _pp.project(mCam);
        // a sphere of rCard at `depth` covers this much of the frame, clamped
        // so one card close to the lens cannot run the whole box away
        const hy = Math.min(1.5, rCard / (depth * tanH));
        const hx = Math.min(1.5, hy / mCam.aspect);
        if (_pp.x - hx < minX) minX = _pp.x - hx;
        if (_pp.x + hx > maxX) maxX = _pp.x + hx;
        if (_pp.y - hy < minY) minY = _pp.y - hy;
        if (_pp.y + hy > maxY) maxY = _pp.y + hy;
        sumX += _pp.x;
        sumY += _pp.y;
        seen += 1;
      }
    }
    // nothing usable in front of the lens — leave the preset alone
    if (!seen || !Number.isFinite(minX)) return null;

    const hx = Math.max(1e-3, (maxX - minX) / 2);
    const hy = Math.max(1e-3, (maxY - minY) / 2);
    // the region in NDC half-extents: full height, `width`% of the frame
    const rx = g.w / W;
    const fill = Math.min(1.2, Math.max(0.2, C.autoFill ?? 0.86));
    const fitZoom = fill * Math.min(rx / hx, 1 / hy);

    if (!enclosed) {
      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;
      return { mode: "fit", zoom: fitZoom, x: g.ndcX - fitZoom * cx, y: g.ndcY - fitZoom * cy };
    }

    // Inside the solid: pan the visible mass into the region, and only shrink
    // it if it overflows — never magnify a composition that already works.
    const zoom = Math.min(1, fitZoom);
    const cx = sumX / seen;
    const cy = sumY / seen;
    return { mode: "pan", zoom, x: g.ndcX - zoom * cx, y: g.ndcY - zoom * cy };
  }

  // Only remeasure when something it depends on has moved — a sweep is cheap
  // but not free, and nothing about it changes frame to frame.
  function refit(g) {
    const C = cfg.camera;
    const L = cfg.layout;
    const G = cfg.geometry;
    const sig = [
      C.x, C.y, C.z, C.lookAtX, C.lookAtY, C.fov, C.tiltX, C.tiltZ, C.autoFill,
      L.shape, L.radius, L.spiralTurns, L.spiralRise, L.spiralGrow, L.perRow,
      L.rows, L.rowGap, L.curve, G.planeW, G.aspect,
      items.length, W, H, g.w, g.ndcX, g.ndcY,
    ].join("|");
    if (sig !== frameSig) {
      frameSig = sig;
      frame = measure(g);
    }
    return frame;
  }

  // Pan the frustum so the subject lands where it should. A pure pan: full
  // frame and sub-window are both the canvas, only the offsets move.
  //
  // The offsets move the FRUSTUM, so they are the negative of where the
  // subject should land: three shifts `left` by `+offsetX * width / fullWidth`
  // (frustum right → subject left) and `top` by `-offsetY * height /
  // fullHeight` (frustum down → subject up). Hence −x and +y. The NDC shift a
  // given offset produces does not depend on `zoom`, so the two compose.
  function applyPlacement(x, y) {
    if (Math.abs(x) < 1e-4 && Math.abs(y) < 1e-4) {
      if (camera.view && camera.view.enabled) camera.clearViewOffset();
      return;
    }
    camera.setViewOffset(W, H, (-x * W) / 2, (y * H) / 2, W, H);
  }

  let capture = null; // one-shot frame grab, resolved right after a render

  function tick(_time, dms) {
    if (disposed) return;
    const C = cfg.camera;
    const M = cfg.motion;
    const IM = cfg.itemMotion;
    const L = cfg.layout;
    const PA = cfg.interaction.parallax;
    const dt = Math.min(dms / 1000, 0.05);
    loopT += dt * (IM.loopSpeed || 1);
    const g = region();

    camera.fov = C.fov;
    drum.rotation.x = THREE.MathUtils.degToRad(C.tiltX);
    drum.rotation.z = THREE.MathUtils.degToRad(C.tiltZ);

    if (!focusing) {
      R.v += SPIN_K * M.autoSpin + velocity;
      velocity *= cfg.interaction.momentum.enabled
        ? cfg.interaction.momentum.decay
        : 0;
    }
    drum.rotation.y = R.v;
    drum.updateWorldMatrix(true, true);

    let ox = 0;
    let oy = 0;
    if (PA.enabled) {
      par.x += (ptr.x - par.x) * PA.ease;
      par.y += (ptr.y - par.y) * PA.ease;
      ox = par.x * PA.strengthX;
      oy = -par.y * PA.strengthY;
    }

    // autoFrame owns the sizing when it is on, so the manual dolly stands down
    const auto = C.autoFrame ? refit(g) : null;
    const k = auto ? 1 : fitScale(g);
    let px = C.x * k + ox;
    let py = C.y * k + oy;
    let pz = C.z * k;
    let lx = C.lookAtX;
    let ly = C.lookAtY;
    let lz = 0;

    if (FOC.amt > 0.0001 && focusedI >= 0 && items[focusedI]) {
      items[focusedI].holder.getWorldPosition(_cw);
      const D = focusDistance();
      const a = FOC.amt;
      px += (_cw.x - px) * a;
      py += (_cw.y - py) * a;
      pz += (_cw.z + D - pz) * a;
      lx += (_cw.x - lx) * a;
      ly += (_cw.y - ly) * a;
      lz += (_cw.z - lz) * a;
    }

    camera.position.set(px, py, pz);
    camera.lookAt(lx, ly, lz);
    // A focused card is framed by focusDistance() against the region, so the
    // auto zoom and shift hand over to the plain region centre as it closes in.
    const a = FOC.amt;
    const zoom = auto ? auto.zoom + (1 - auto.zoom) * a : 1;
    const sx = auto ? auto.x + (g.ndcX - auto.x) * a : g.ndcX;
    const sy = auto ? auto.y + (g.ndcY - auto.y) * a : g.ndcY;
    camera.zoom = zoom;
    applyPlacement(sx, sy);
    camera.updateProjectionMatrix();

    if (L.faceCamera) {
      camera.getWorldPosition(_cw);
      for (const it of items) {
        const p = it.holder.getWorldPosition(new THREE.Vector3());
        it.holder.lookAt(2 * p.x - _cw.x, 2 * p.y - _cw.y, 2 * p.z - _cw.z);
      }
    } else {
      for (const it of items) it.holder.rotation.set(0, it.baseRy, 0);
    }

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const ph = i * (IM.stagger || 0);
      const inner = it.mesh;
      inner.rotation.y = loopT * (IM.spinY || 0) + Math.sin(loopT + ph) * (IM.swing || 0);
      inner.rotation.x = Math.sin(loopT * (IM.flipSpeed || 1) + ph) * (IM.flip || 0);
      inner.rotation.z =
        Math.sin(ph) * (IM.tiltZ || 0) + Math.sin(loopT * 0.5 + ph) * (IM.tiltAnim || 0);
      inner.position.y = Math.sin(loopT * (IM.bobSpeed || 1) + ph) * (IM.bob || 0);
      const pulse = 1 + Math.sin(loopT * (IM.pulseSpeed || 1) + ph) * (IM.pulse || 0);
      inner.scale.setScalar(pulse);
    }

    // ── the post-FX kit ──────────────────────────────────────────────────
    // Every uniform is written every frame, disabled ones included, so turning
    // an effect off actually turns it off. The pointer decays back to rest
    // between moves; without that, ripple and liquid would freeze mid-wave
    // wherever the cursor last was.
    const FXB = cfg.postfx;
    if (FXB) {
      vel.x *= 0.88;
      vel.y *= 0.88;
      const ipEase = (FXB.imgParallax && FXB.imgParallax.ease) || 0.08;
      img.x += (par.x - img.x) * ipEase;
      img.y += (-par.y - img.y) * ipEase;
      // how hard the drum is being pushed, 0..1, and which way
      const dragAmt = Math.min(1, Math.abs(velocity) / 0.06);
      const dragDir = velocity >= 0 ? 1 : -1;
      const live = {
        time: loopT,
        width: renderer.domElement.width,
        height: renderer.domElement.height,
        cursorX: cur.x,
        cursorY: cur.y,
        velX: vel.x,
        velY: vel.y,
        dragAmt,
        dragDir,
        parX: img.x,
        parY: img.y,
      };
      for (const it of items) applyFx(it.mat.uniforms, FXB, live);
    }

    renderer.render(scene, camera);

    // The drawing buffer is cleared after compositing, so a thumbnail has to
    // be taken HERE, in the same frame as the render that filled it. That is
    // why `preserveDrawingBuffer` stays off.
    if (capture) {
      const { resolve, w: cw, h: ch } = capture;
      capture = null;
      try {
        const thumb = document.createElement("canvas");
        thumb.width = cw;
        thumb.height = ch;
        const ctx = thumb.getContext("2d");
        // the paper the page draws on — the canvas itself is transparent
        ctx.fillStyle = getComputedStyle(document.body).backgroundColor || "#faf9f2";
        ctx.fillRect(0, 0, cw, ch);
        // the region the tower is framed in, not the whole canvas...
        const rw = Math.max(1, (canvas.width * g.w) / W);
        const rx = Math.max(0, (canvas.width * (g.ndcX + 1)) / 2 - rw / 2);
        const rh = canvas.height;
        // ...letterboxed rather than cropped: comparing alternatives means
        // seeing the WHOLE composition, not a band out of its middle
        const k = Math.min(cw / rw, ch / rh);
        const dw = rw * k;
        const dh = rh * k;
        ctx.drawImage(canvas, rx, 0, rw, rh, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
        resolve(thumb.toDataURL("image/webp", 0.72));
      } catch {
        resolve(null);
      }
    }
  }
  gsap.ticker.add(tick);

  build();
  applyLook();

  function applyLook() {
    const K = cfg.look;
    if (K.solidBg) renderer.setClearColor(new THREE.Color(K.bgColor), 1);
    else renderer.setClearAlpha(0);
    for (const it of items) {
      if (it.mat.uniforms.uHasTex.value > 0.5) it.mat.uniforms.uOpacity.value = K.opacity;
    }
  }

  return {
    rebuild: build,
    applyLook,
    resize,
    release: focusOff,
    /** A webp data URL of the framing region, grabbed on the next frame. */
    snapshot(w = 268, h = 158) {
      return new Promise((resolve) => {
        capture = { resolve, w, h };
      });
    },
    get focused() {
      return focusedI;
    },
    get itemCount() {
      return items.length;
    },
    /** One card's shader uniforms — what the effects are actually written to. */
    uniformsOf(i) {
      return items[i] ? items[i].mat.uniforms : null;
    },
    get region() {
      return region();
    },
    /** Where a card is on screen right now, in client px — the render's own
     *  projection, so a test that clicks here is testing that the raycast and
     *  the picture agree (zoom and view offset included). */
    screenOf(i) {
      const it = items[i];
      if (!it) return null;
      const r = canvas.getBoundingClientRect();
      // the MESH, not its holder: the per-card motion (bob, pulse, flip) moves
      // the mesh inside the holder, so the holder is not where the card is
      it.mesh.getWorldPosition(_pp);
      _pp.project(camera);
      return {
        x: r.left + ((_pp.x + 1) / 2) * r.width,
        y: r.top + ((1 - _pp.y) / 2) * r.height,
        infront: _pp.z < 1,
      };
    },
    destroy() {
      disposed = true;
      gsap.ticker.remove(tick);
      ro.disconnect();
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("keydown", onKey);
      teardown();
      renderer.dispose();
      canvas.remove();
    },
  };
}
