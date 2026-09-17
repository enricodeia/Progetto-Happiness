import * as THREE from "three";
import gsap from "gsap";
import { makeCardMaterial } from "./lib/itemMesh.js";
import { ringMedia, ringSource } from "./data/ringMedia.js";

// ─────────────────────────────────────────────────────────────────────────────
// V2 — the rings.
//
// Real orbits of images AROUND the bowl, built inside the BOWL'S OWN SCENE.
// That is the whole point: sharing the scene means sharing the depth buffer, so
// the half of an orbit that is behind the object is occluded BY the object and
// the half in front covers it. A ring drawn on its own layer over the top would
// be a circle of pictures; this one is depth.
//
// There are two of them and they are the same object twice:
//
//   a   the PEOPLE, close in — it arrives on the first step of the ring act
//   b   the EXPERIENCES, outside it, turning the other way — the second step
//
// The orbit is the circle (R cosθ, R sinθ, 0) — a ring in the PLANE OF THE
// SCREEN — leant back by `lean`. That lean is the whole trick: at 0 the circle
// has no depth at all and nothing can pass behind anything, and every degree of
// it sends the top of the ring further back and brings the bottom forward. By
// the last step both rings lean almost flat and the bowl tips over to meet
// them, which together IS the view from above the object.
//
// Everything is measured in the bowl's own diameter (`radius`, `card`, `z`), so
// a ring keeps its proportions wherever the bowl is and whatever size it is at:
// it is anchored to the object, not to the viewport.
//
// `radius` → `radiusEnd`, `lean` → `leanEnd` and `card` → `cardEnd` are all
// scrubbed across the ring's own window (`from` → `to`, in steps of the ring
// act), so the two orbits converge as the act closes instead of holding one
// shape all the way through.
// ─────────────────────────────────────────────────────────────────────────────

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (x) => x * x * (3 - 2 * x);
const rad = THREE.MathUtils.degToRad;
const TAU = Math.PI * 2;

export function createRing({ bowl, cfg, key }) {
  const R = () => cfg.v2.rings[key];

  const group = new THREE.Group();
  group.visible = false;
  bowl.scene.add(group);

  // one shared unit quad — the size is all in the mesh's scale
  const geo = new THREE.PlaneGeometry(1, 1, 1, 1);
  const loader = new THREE.TextureLoader();

  let cards = [];        // { mesh, mat, unit, i }
  let units = [];        // the tweenables the stagger drives
  let tween = null;
  let collapseTween = null;
  // 0 → 1 as the ring gathers into the bowl's own centre and vanishes there —
  // NOT a fade in place: radius and card size are both scaled by (1 - collapse),
  // so the ring is seen travelling inward and disappearing INTO the object,
  // together with the same opacity stagger that already drives its exit.
  const collapse = { v: 0 };
  let spin = 0;
  let kick = 0;          // the scroll's speed, px/s, handed in every frame by main.js
  let on = false;
  let gone = false;
  let k = 0;             // how far through its own window it is, 0 → 1
  let buildGen = 0;      // so a rebuild's in-flight image loads land nowhere

  function clear() {
    tween?.kill();
    tween = null;
    for (const c of cards) {
      group.remove(c.mesh);
      // the material never frees its texture on its own (perf pass, 2026-09-17)
      c.mat.uniforms.uTex.value?.dispose?.();
      c.mat.dispose();
    }
    cards = [];
    units = [];
  }

  function build() {
    clear();
    const gen = ++buildGen;
    const c = R();
    const media = ringMedia(c.source);
    const n = Math.max(0, Math.round(c.count));
    for (let i = 0; i < n; i++) {
      const mat = makeCardMaterial();
      mat.uniforms.uOpacity.value = 0;
      const mesh = new THREE.Mesh(geo, mat);
      mesh.frustumCulled = false;   // billboards on a moving anchor
      group.add(mesh);
      const unit = { v: 0 };
      cards.push({ mesh, mat, unit, i });
      units.push(unit);

      const entry = media[i % Math.max(1, media.length)];
      if (entry?.image) {
        loader.load(entry.image, (tex) => {
          if (gen !== buildGen) return;   // a later build() owns the ring now
          tex.colorSpace = THREE.SRGBColorSpace;
          mat.uniforms.uTex.value = tex;
          mat.uniforms.uHasTex.value = 1;
          mat.uniforms.uImgAspect.value =
            (tex.image?.width || 1) / (tex.image?.height || 1);
        });
      }
    }
    style();
  }

  /** the look of a card — no rebuild needed */
  function style() {
    const c = R();
    for (const card of cards) {
      card.mat.uniforms.uRadius.value = c.corner;
      card.mat.uniforms.uCornerN.value = c.cornerN;
      card.mat.uniforms.uAspect.value = c.aspect;
      card.mat.uniforms.uPlaneAspect.value = c.aspect;
    }
  }

  // ── the reveal: it blooms out of the bowl, card by card ──────────────────
  const play = (to) => {
    tween?.kill();
    const c = R();
    tween = gsap.to(units, {
      v: to,
      duration: Math.max(0.1, c.dur),
      stagger: Math.max(0, c.stagger),
      ease: c.ease || "power2.out",
      overwrite: "auto",
    });
  };

  function reset() {
    tween?.kill();
    collapseTween?.kill();
    tween = null;
    collapseTween = null;
    collapse.v = 0;
    for (const u of units) u.v = 0;
  }

  /**
   * Driven by the PINNED clock. A ring is not scrubbed into existence: it FIRES
   * when the act reaches its own step and then plays itself out, and crossing
   * that mark backwards rewinds it, so the beat can always be seen again.
   *
   * What IS scrubbed is its shape — radius, lean and card size travel from
   * their first value to their second across `from` → `to`.
   */
  function drive(tl) {
    const c = R();
    if (!cfg.v2.on || !c.show) {
      if (on) { on = false; gone = false; reset(); }
      k = 0;
      return;
    }
    const rs = tl.ranges;
    const last = rs.length - 1;
    const first = rs[Math.min(last, tl.a0 + Math.max(0, c.from))];
    const end = rs[Math.min(last, tl.a0 + Math.min(2, c.to))];
    const fire = first.s0 + clamp01(c.at) * first.len;
    k = smooth(clamp01((tl.p - first.s0) / Math.max(1e-4, end.s1 - first.s0)));

    if (!on && tl.p >= fire) {
      on = true;
      gone = false;
      play(1);
    } else if (on && tl.p < fire - 0.004) {
      // scrolled back above its own mark: it leaves THE WAY IT CAME (his
      // ask, 2026-09-17: "allo stesso modo di come è entrato, deve uscire")
      // — the same stagger run backwards, last card in first out — not a
      // snap to nothing. The tween is left running; crossing the mark again
      // on the way down simply overwrites it with the bloom.
      on = false;
      gone = false;
      collapseTween?.kill();
      collapse.v = 0;
      tween?.kill();
      tween = gsap.to(units, {
        v: 0,
        duration: Math.max(0.1, c.dur),
        stagger: { each: Math.max(0, c.stagger), from: "end" },
        ease: c.ease || "power2.out",
        overwrite: "auto",
      });
    }
    if (!on) return;

    // ...and at the end of the act everything staggers out together, AND
    // gathers into the bowl's own centre as it goes — a real convergence, not
    // a fade at whatever radius the ring happened to be holding.
    const A = cfg.v2.act;
    if (!gone && tl.actP >= A.outAt) {
      gone = true;
      tween?.kill();
      collapseTween?.kill();
      tween = gsap.to(units, {
        v: 0,
        duration: Math.max(0.1, A.outDur),
        stagger: Math.max(0, A.outStagger),
        ease: c.ease || "power2.out",
        overwrite: "auto",
      });
      collapseTween = gsap.to(collapse, {
        v: 1,
        duration: Math.max(0.1, A.outDur) + Math.max(0, A.outStagger) * cards.length,
        ease: "power2.in",
        overwrite: "auto",
      });
    } else if (gone && tl.actP < A.outAt - 0.004) {
      gone = false;
      play(1);
      collapseTween?.kill();
      collapseTween = gsap.to(collapse, { v: 0, duration: 0.5, ease: "power2.out", overwrite: "auto" });
    }
  }

  // ── every frame, from inside the bowl's own render ───────────────────────
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const v = new THREE.Vector3();

  /**
   * `ctx` — handed over by the bowl right before it renders:
   *   { dt, camera, worldH, worldW, size, opacity, position }
   * Returns whether the ring needs the canvas alive on its own account.
   */
  function frame(ctx) {
    const c = R();
    const live = cfg.v2.on && c.show && cards.length > 0;
    if (!live) {
      group.visible = false;
      return false;
    }

    // the base turn, pushed along by the scroll's own speed — in the ring's
    // OWN direction, capped so a fling can never spin it into a blur
    const boost = Math.min(4, Math.abs(kick) * Math.max(0, c.force || 0));
    spin += ctx.dt * c.speed * (1 + boost);

    // the bowl's own diameter, in world units — everything is measured in it
    const D = Math.max(1e-4, ctx.size * ctx.worldH);
    group.position.copy(ctx.position);
    group.position.y += c.y * ctx.worldH;
    group.position.z += c.z * D;

    // The lean first (it is what puts the top of the ring behind the object),
    // then the yaw, then the roll on screen: Euler order "ZYX" is
    // v' = Rz · Ry · Rx · v, so Rx is applied first. It is NEGATIVE because a
    // positive `lean` has to send +y backwards, away from the camera.
    const lean = lerp(c.lean, c.leanEnd === undefined ? c.lean : c.leanEnd, k);
    e.set(rad(-lean), rad(c.tiltY), rad(c.tiltZ), "ZYX");
    q.setFromEuler(e);

    // gathered in toward the centre on the way out — but never PAST the
    // bowl's own surface. Collapsing all the way to 0 would send the image
    // plane straight through the mesh; instead the shrink (whichever of the
    // three things is causing it — the end-of-ring k-scrub, the entry bloom,
    // or the end-of-act collapse) is clamped to `minRadius`, so the cards
    // gather in close around the rim and fade there, never inside it.
    const toCentre = 1 - collapse.v;
    const radius = lerp(c.radius, c.radiusEnd === undefined ? c.radius : c.radiusEnd, k) * D * toCentre;
    const w = lerp(c.card, c.cardEnd === undefined ? c.card : c.cardEnd, k) * D * toCentre;
    const h = w / Math.max(0.05, c.aspect);
    const n = cards.length;
    const minR = Math.max(0, c.minRadius || 0) * D;
    let any = 0;

    for (const card of cards) {
      // The RAW value, not clamped: an ease like "back.out" overshoots past 1
      // for a beat before it settles, and clamping here would iron that pop
      // straight back out of the position and scale — the two things it is
      // actually there to be felt in. Opacity is a separate value below and
      // IS clamped, so an overshoot never reads as a card going translucent
      // past full or flashing brighter than the rest.
      const raw = card.unit.v;
      const a = clamp01(raw);
      const th = spin + rad(c.offset) + (card.i / n) * TAU;
      const r = Math.max(minR, radius * lerp(Math.max(0.01, c.enterRadius), 1, raw));
      v.set(Math.cos(th) * r, Math.sin(th) * r, 0).applyQuaternion(q);
      card.mesh.position.copy(v);
      // face to camera, always: the orbit turns, the image does not
      if (c.faceCamera) card.mesh.quaternion.copy(ctx.camera.quaternion);
      else card.mesh.quaternion.identity();
      const s = lerp(Math.max(0.01, c.enterScale), 1, raw);
      card.mesh.scale.set(w * s, h * s, 1);
      const o = a * c.opacity * Math.max(ctx.opacity, 0);
      card.mat.uniforms.uOpacity.value = o;
      card.mesh.visible = o > 0.002;
      any = Math.max(any, o);
    }

    group.visible = any > 0.002;
    return group.visible;
  }

  build();
  bowl.onFrame(frame);

  return {
    key,
    build,
    style,
    drive,
    reset,
    /** the scroll's speed this frame, px/s — the force the orbit feels */
    push(v) { kick = Number.isFinite(v) ? v : 0; },
    get boost() { return +Math.min(4, Math.abs(kick) * Math.max(0, R().force || 0)).toFixed(3); },
    get count() { return cards.length; },
    get k() { return +k.toFixed(3); },
    get source() { return ringSource(R().source); },
    get alpha() {
      return cards.length
        ? +Math.max(...cards.map((c) => c.mat.uniforms.uOpacity.value)).toFixed(3)
        : 0;
    },
    /**
     * Where every card actually IS — depth against the bowl's own centre, and
     * the screen point. This is what proves a ring encircles the object rather
     * than sitting on a plane in front of it.
     */
    probe() {
      const cam = bowl.camera;
      const out = [];
      const p = new THREE.Vector3();
      for (const card of cards) {
        p.setFromMatrixPosition(card.mesh.matrixWorld);
        const s = p.clone().project(cam);
        out.push({
          // the group is only translated, so a card's local z IS how far in
          // front of (+) or behind (−) the object it sits
          dz: +card.mesh.position.z.toFixed(3),
          x: +s.x.toFixed(3),
          y: +s.y.toFixed(3),
          a: +card.mat.uniforms.uOpacity.value.toFixed(3),
        });
      }
      return out;
    },
    dispose() {
      clear();
      geo.dispose();
      bowl.scene.remove(group);
    },
  };
}
