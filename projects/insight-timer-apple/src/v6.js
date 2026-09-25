import * as THREE from "three";
import { createBowl } from "./bowl.js";
import { createBowlVoice } from "./bowlVoice.js";
import { createWaves } from "./waves.js";
import { $, $$, clamp01, reduce, mountNav, mountVersion } from "./common.js";

// ─────────────────────────────────────────────────────────────────────────────
// Edition 6 — the instrument. The bowl is played: a strike puts energy into
// its six modes (the voice rings, the shells bend, rings leave the rim), a
// circling mallet on the rim feeds the fundamental until it sings. The text
// is a pure function of the loudness: it develops while the bowl sounds.
// Everything here is state read off the pointer and the voice, every frame.
// ─────────────────────────────────────────────────────────────────────────────

const navUpdate = mountNav();
mountVersion(6);
navUpdate();

const stage = $("#stage");
const glow = $("#glow");
const bowl = createBowl({
  canvas: $("#bowl"), host: stage,
  size: 0.56, lean: 0, shrink: 0, offsetY: 0.1,
  hover: true, hoverAmount: 0.45, ring: true,
});
const voice = createBowlVoice({ f0: 246 });
const waves = createWaves($("#waves"));
waves.resize();
addEventListener("resize", () => waves.resize());

// ── the story ─────────────────────────────────────────────────────────────
const LINES = [
  "Where practice makes progress.",
  "Across traditions and cultures, people have found practices that improve wellbeing.",
  "But we’ve never had a full picture of what works for each of us and why.",
  "We connect people and trusted teachers.",
  "With thousands of ways to feel good.",
  "Three sources of evidence come together.",
  "Practices that people actually live by.",
  "Insight Timer is making the impact of practice clear for everybody.",
];
const lineEl = $("#line"), lineN = $("#lineN"), ctaRow = $("#ctaRow");
$("#lineOf").textContent = `/ ${String(LINES.length).padStart(2, "0")}`;
let lineIdx = 0, lastAdvance = -1e9, struckOnce = false, rubbedOnce = false;
function showLine(i) {
  lineIdx = i;
  lineEl.textContent = LINES[i];
  lineN.textContent = String(i + 1).padStart(2, "0");
  ctaRow.classList.toggle("is-on", i === LINES.length - 1);
}
const hint = $("#hint");
function setHint(text) { if (!text) { hint.classList.add("is-off"); return; } hint.textContent = text; hint.classList.remove("is-off"); }

// ── sound state ───────────────────────────────────────────────────────────
const soundBtn = $("#sound"), soundLabel = $("#soundLabel");
function soundUI() {
  soundBtn.classList.toggle("is-on", voice.ready && !voice.muted);
  soundBtn.classList.toggle("is-muted", voice.ready && voice.muted);
  soundBtn.setAttribute("aria-pressed", String(voice.ready && !voice.muted));
  soundLabel.textContent = !voice.ready ? "Sound off" : voice.muted ? "Muted" : "Sound on";
}
async function wake() { if (!voice.ready) { await voice.ensure(); soundUI(); } }
soundBtn.addEventListener("click", async () => { if (!voice.ready) await wake(); else voice.setMuted(!voice.muted); soundUI(); });

// ── the mallet: lives in the bowl's group, so it leans with it, not spins ──
const mallet = new THREE.Group();
const wood = new THREE.MeshStandardMaterial({ color: 0x6f4a2e, roughness: 0.55, metalness: 0 });
const felt = new THREE.MeshStandardMaterial({ color: 0x4a2f22, roughness: 0.95, metalness: 0 });
const head = new THREE.Mesh(new THREE.SphereGeometry(0.072, 28, 20), felt);
head.scale.set(1, 0.86, 1);
const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.017, 0.46, 16), wood);
mallet.add(head, handle);
bowl.group.add(mallet);
const REST = 0.6;   // front-right of the rim, where a mallet is laid down
// on a phone there is no room beside the bowl, so it rests close to the rim
const TOUCH = matchMedia("(hover: none)").matches;
const REST_LIFT = TOUCH ? 0.12 : 0.09, REST_OUT = TOUCH ? 0.13 : 0.27;
const M = { theta: REST, r: 0.5, lift: 0.16, out: 0.15, hitT: 9, target: { theta: REST, pressed: false, present: false } };
const up = new THREE.Vector3(0, 1, 0), dir = new THREE.Vector3(), q = new THREE.Quaternion();
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
function placeMallet(dt) {
  const t = M.target;
  // ease the angle the short way round
  M.theta = wrap(M.theta + wrap(t.theta - M.theta) * Math.min(1, dt * 12));
  const hit = M.hitT < 0.12;
  const pressed = t.pressed || hit;
  const liftTo = !t.present ? REST_LIFT : pressed ? 0.028 : 0.15;
  const outTo = !t.present ? REST_OUT : pressed ? 0.045 : 0.15;
  M.lift += (liftTo - M.lift) * Math.min(1, dt * (hit ? 40 : 10));
  M.out += (outTo - M.out) * Math.min(1, dt * (hit ? 40 : 10));
  const R = bowl.rim.r + M.out;
  const y = bowl.rim.y + M.lift;
  head.position.set(Math.cos(M.theta) * R, y, Math.sin(M.theta) * R);
  // the handle leans outward and up from the head
  dir.set(Math.cos(M.theta), 0, Math.sin(M.theta)).multiplyScalar(0.9).addScaledVector(up, 0.44).normalize();
  handle.position.copy(head.position).addScaledVector(dir, 0.26);
  q.setFromUnitVectors(up, dir);
  handle.quaternion.copy(q);
  M.hitT += dt;
}

// ── playing ───────────────────────────────────────────────────────────────
const demo = new Float32Array(6);          // the silent attract strike, before any sound
const DEMO_TAU = [5, 3.5, 2.4, 1.6, 1.1, 0.8];
let lastStrikeAt = -1e9;
function strike({ theta = 0, thetaGroup = M.theta, brightness = 0.5, strength = 1, silent = false } = {}) {
  const now = performance.now() / 1000;
  if (now - lastStrikeAt < 0.06) return;   // a real mallet cannot bounce faster than this
  lastStrikeAt = now;
  bowl.setModes(silent ? demo : voice.energies(), theta);
  bowl.pulse(strength);
  waves.strike(strength);
  M.target.theta = thetaGroup; M.hitT = 0;
  if (silent) { for (let k = 0; k < 6; k++) demo[k] = Math.min(1, demo[k] + strength * [1, .45, .18, .07, .03, .01][k]); return; }
  voice.strike({ strength, brightness });
  // the story: the first strike shows the first line; later strikes, once the
  // bowl has fallen quiet, bring the next
  // (a real bowl rings for ten seconds, so "quiet" here means past its peak:
  // a strike while it still sings at full voice only feeds the same line)
  if (!struckOnce) { struckOnce = true; lastAdvance = now; setHint("Now circle the rim, slowly."); }
  else if (now - lastAdvance > 3 && aSmooth < 0.85) { showLine((lineIdx + 1) % LINES.length); lastAdvance = now; }
}

let press = null, rubRate = 0, rubbing = false, pointerOn = false;
stage.addEventListener("pointerenter", () => { pointerOn = true; M.target.present = true; });
stage.addEventListener("pointerleave", () => { pointerOn = false; stage.classList.remove("is-pointer"); if (!press) { M.target.present = false; M.target.theta = REST; } });
const cursor = $("#cursor");
stage.addEventListener("pointermove", (e) => {
  if (e.pointerType === "mouse") {
    const r = stage.getBoundingClientRect();
    cursor.style.setProperty("--x", `${e.clientX - r.left}px`);
    cursor.style.setProperty("--y", `${e.clientY - r.top}px`);
    stage.classList.add("is-pointer");
  }
  if (!bowl.ready) return;
  const p = bowl.pick(e.clientX, e.clientY);
  if (p.plane) M.target.theta = p.planeThetaGroup;
  M.target.present = true;
  if (press) {
    const now = performance.now() / 1000;
    const dth = wrap(p.planeThetaGroup - press.theta);
    const dt = Math.max(1e-3, now - press.t);
    const omega = Math.abs(dth) / dt;
    press.theta = p.planeThetaGroup; press.t = now;
    // on the rim band and moving: that is rubbing
    const onRim = p.planeR > 0.78 && p.planeR < 1.5;
    const rate = onRim ? clamp01(omega / 2.4) : 0;
    rubRate = rubRate * 0.75 + rate * 0.25;
    press.moved = press.moved || Math.abs(dth) > 0.02;
  }
});
stage.addEventListener("pointerdown", async (e) => {
  if (e.button !== 0 && e.pointerType === "mouse") return;
  stage.setPointerCapture(e.pointerId);
  await wake();
  if (!bowl.ready) return;
  const p = bowl.pick(e.clientX, e.clientY);
  press = { theta: p.planeThetaGroup ?? M.theta, t: performance.now() / 1000, moved: false };
  M.target.pressed = true;
  M.target.present = true;
  // a strike lands on the metal, or just inside the rim
  if (p.hit || (p.plane && p.planeR < 1.12)) {
    // high on the wall, near the rim: bright; low, on the belly: soft
    const rel = p.hit ? clamp01((p.y - 0.1) / 0.9) : 0.8;
    strike({ theta: p.theta, thetaGroup: p.thetaGroup, brightness: 0.25 + 0.6 * rel, strength: 1 });
  }
});
const release = () => { press = null; M.target.pressed = false; rubRate = 0; if (!pointerOn) { M.target.present = false; M.target.theta = REST; } };
stage.addEventListener("pointerup", release);
stage.addEventListener("pointercancel", release);

// keys: Space strikes, the arrows circle the rim, M mutes
const keys = new Set();
addEventListener("keydown", async (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === " ") { e.preventDefault(); await wake(); const th = M.theta; strike({ theta: th - bowl.spin, thetaGroup: th, brightness: 0.5 }); }
  else if (e.key === "ArrowLeft" || e.key === "ArrowRight") { e.preventDefault(); await wake(); keys.add(e.key); M.target.present = true; M.target.pressed = true; }
  else if (e.key === "m" || e.key === "M") { if (voice.ready) { voice.setMuted(!voice.muted); soundUI(); } }
});
addEventListener("keyup", (e) => { keys.delete(e.key); if (!keys.size && !press) { M.target.pressed = false; rubRate = 0; } });

// ── the frame ─────────────────────────────────────────────────────────────
let aSmooth = 0, last = performance.now(), demoAt = 2.6, tSinceLoad = 0;
const wave = new Float32Array(2048);
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now; tSinceLoad += dt;
  // the arrows: a steady circle of the rim
  if (keys.has("ArrowLeft") || keys.has("ArrowRight")) {
    M.target.theta += (keys.has("ArrowRight") ? 1 : -1) * 1.7 * dt;
    rubRate = rubRate * 0.8 + 0.8 * 0.2;
  }
  voice.rub(rubRate);
  if (rubRate > 0.3 && !rubbedOnce) { rubbedOnce = true; setHint(""); }
  rubbing = rubRate > 0.12;
  voice.update(dt);
  // the attract: a silent strike now and then, until the first real one
  if (!struckOnce && tSinceLoad > demoAt && bowl.ready) { strike({ theta: REST - bowl.spin, thetaGroup: REST, strength: 0.7, silent: true }); demoAt = tSinceLoad + 8; }
  for (let k = 0; k < 6; k++) demo[k] *= Math.exp(-dt / DEMO_TAU[k]);
  // the modes: the voice's energies, or the silent demo's
  const e = voice.energies();
  let level = voice.level;
  if (!voice.ready) { bowl.setModes(demo); level = demo[0] * 0.5 + demo[1] * 0.3; } else bowl.setModes(e);
  // loudness → the text develops, the glow breathes
  const a = clamp01(level * 2.2);
  aSmooth += (a - aSmooth) * Math.min(1, dt * (a > aSmooth ? 9 : 2.2));
  lineEl.style.fontVariationSettings = `"EXPO" ${(100 * (1 - aSmooth)).toFixed(1)}`;
  lineEl.style.opacity = (0.12 + 0.88 * aSmooth).toFixed(3);
  glow.style.setProperty("--a", aSmooth.toFixed(3));
  glow.style.setProperty("--g", (1 + 0.08 * aSmooth).toFixed(3));
  // the waves, from where the bowl really is on screen
  if (bowl.ready) {
    const c = bowl.toScreen(0, bowl.rim.y, 0);
    const r = bowl.toScreen(bowl.rim.r, bowl.rim.y, 0);
    const rimPx = Math.hypot(r.x - c.x, r.y - c.y);
    waves.setCenter(c.x, c.y, rimPx);
    waves.pulse(clamp01(level * 1.6));
    voice.waveform(wave);
    waves.scope(wave, 6 + 44 * aSmooth);
  }
  waves.draw(dt);
  placeMallet(dt);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
soundUI();

// for a scripted check
window.__it = {
  bowl, voice, waves,
  edition: 6,
  strike, showLine,
  get line() { return lineIdx; },
  get a() { return +aSmooth.toFixed(3); },
  get rub() { return +rubRate.toFixed(3); },
  get struck() { return struckOnce; },
  get mallet() { return { theta: +M.theta.toFixed(3), lift: +M.lift.toFixed(3), present: M.target.present }; },
  energies: () => Array.from(voice.energies(), (v) => +v.toFixed(3)),
};
