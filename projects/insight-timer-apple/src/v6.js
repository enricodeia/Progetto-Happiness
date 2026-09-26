import { createBowl } from "./bowl.js";
import { createBowlVoice } from "./bowlVoice.js";
import { createWaves } from "./waves.js";
import { createMallet } from "./mallet.js";
import { $, $$, clamp01, reduce, mountNav, mountVersion } from "./common.js";

// ─────────────────────────────────────────────────────────────────────────────
// Edition 6 — the instrument. The bowl is played: a strike puts energy into
// its six modes (the voice rings, the shells bend, rings leave the rim), a
// circling mallet on the rim feeds the fundamental until it sings. The text
// is a pure function of the loudness: it develops while the bowl sounds.
// Input is never gated on the audio: the model and the picture answer at
// once, the AudioContext catches up from the same gesture.
// ─────────────────────────────────────────────────────────────────────────────

const navUpdate = mountNav();
mountVersion(6);
navUpdate();

const stage = $("#stage");
const glow = $("#glow");
const bowl = createBowl({
  canvas: $("#bowl"), host: stage,
  size: 0.56, lean: 0, shrink: 0, offsetY: 0.1,
  hover: !reduce, hoverAmount: 0.45, ring: true, ringScale: reduce ? 0.3 : 1,
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
let lineIdx = 0, lastAdvance = -1e9, struckOnce = false, rubbedOnce = false, interacted = false;
function showLine(i) {
  lineIdx = i;
  lineEl.textContent = LINES[i];
  lineN.textContent = String(i + 1).padStart(2, "0");
  ctaRow.classList.toggle("is-on", i === LINES.length - 1);
}
const hint = $("#hint");
function setHint(text) { if (!text) { hint.classList.add("is-off"); return; } hint.textContent = text; hint.classList.remove("is-off"); }

// ── sound ─────────────────────────────────────────────────────────────────
const soundBtn = $("#sound"), soundLabel = $("#soundLabel");
function soundUI() {
  soundBtn.classList.toggle("is-on", voice.ready && !voice.muted);
  soundBtn.classList.toggle("is-muted", voice.ready && voice.muted);
  soundBtn.setAttribute("aria-pressed", String(voice.ready && !voice.muted));
  soundLabel.textContent = !voice.ready ? "Sound off" : voice.muted ? "Muted" : "Sound on";
}
// iOS keeps a page that only uses an AudioContext under the ring/silent
// switch; a looping silent <audio> started from the same gesture moves it
// to the media session, so the bowl is heard with the switch on silent
let unlocked = false;
function unlockMedia() {
  if (unlocked) return;
  unlocked = true;
  try {
    const rate = 8000, n = rate / 2;
    const buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
    const str = (o, t) => { for (let i = 0; i < t.length; i++) v.setUint8(o + i, t.charCodeAt(i)); };
    str(0, "RIFF"); v.setUint32(4, 36 + n * 2, true); str(8, "WAVE"); str(12, "fmt ");
    v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
    str(36, "data"); v.setUint32(40, n * 2, true);
    const a = new Audio(URL.createObjectURL(new Blob([buf], { type: "audio/wav" })));
    a.loop = true; a.playsInline = true; a.volume = 0.01;
    a.play().catch(() => {});
  } catch {}
}
// never awaited on the input path: the picture and the model answer now
function wake() {
  interacted = true;
  unlockMedia();
  voice.ensure().then(soundUI, soundUI);
}
soundBtn.addEventListener("click", () => {
  interacted = true;
  if (!voice.ready) wake(); else { voice.setMuted(!voice.muted); soundUI(); }
});

// ── the mallet ────────────────────────────────────────────────────────────
const REST = 0.6;   // front-right of the rim, where a mallet is laid down
const mallet = createMallet(bowl, { rest: REST });
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

// ── playing ───────────────────────────────────────────────────────────────
let lastStrikeAt = -1e9;
/** a strike at a group angle; the shell angle (where the antinode sits) is derived */
function strike({ thetaGroup = mallet.theta, theta = null, brightness = 0.5, strength = 1, silent = false } = {}) {
  const now = performance.now() / 1000;
  if (now - lastStrikeAt < 0.06) return;   // a real mallet cannot bounce faster than this
  lastStrikeAt = now;
  voice.strike({ strength, brightness });   // before the AudioContext exists this only moves the model
  bowl.setModes(voice.energies(), theta ?? thetaGroup + bowl.spin);
  bowl.pulse(strength);
  waves.strike(strength);
  mallet.hit(thetaGroup);
  if (silent) return;
  // the story: the first strike shows the first line; each later strike,
  // given a breath since the last, brings the next
  if (!struckOnce) { struckOnce = true; lastAdvance = now; setHint("Now circle the rim, slowly."); }
  else if (now - lastAdvance > 2.5) { showLine((lineIdx + 1) % LINES.length); lastAdvance = now; }
}

let press = null, rubRate = 0, pointerOn = false;
const ptr = { x: 0, y: 0, dirty: false, mouse: false };
const cursor = $("#cursor");
stage.addEventListener("pointerenter", () => { pointerOn = true; mallet.target.present = true; });
stage.addEventListener("pointerleave", () => {
  pointerOn = false; stage.classList.remove("is-pointer");
  if (!press) mallet.lay();
});
stage.addEventListener("pointermove", (e) => {
  ptr.x = e.clientX; ptr.y = e.clientY; ptr.dirty = true; ptr.mouse = e.pointerType === "mouse";
  mallet.target.present = true;
});
stage.addEventListener("pointerdown", (e) => {
  // the buttons and links in the stage keep their own clicks
  if (e.target.closest("button, a")) return;
  if (e.button !== 0 && e.pointerType === "mouse") return;
  stage.setPointerCapture(e.pointerId);
  wake();
  if (!bowl.ready) return;
  const p = bowl.pick(e.clientX, e.clientY);
  const now = performance.now() / 1000;
  press = { theta: p.planeThetaGroup, t: now, id: e.pointerId };
  mallet.target.pressed = true;
  mallet.target.present = true;
  ptr.x = e.clientX; ptr.y = e.clientY; ptr.dirty = false;
  // a strike lands on the metal, or just inside the rim
  if (p.hit || (p.plane && p.planeR < 1.12)) {
    // high on the wall, near the rim: bright; low, on the belly: soft
    const rel = p.hit ? clamp01((p.y - 0.1) / 0.9) : 0.8;
    strike({ theta: p.theta, thetaGroup: p.thetaGroup, brightness: 0.25 + 0.6 * rel, strength: 1 });
  }
});
function release() {
  press = null; mallet.target.pressed = keys.size > 0; rubRate = keys.size ? rubRate : 0;
  if (!pointerOn && !keys.size) mallet.lay();
}
stage.addEventListener("pointerup", () => { wake(); release(); });   // on touch this is the activation event
stage.addEventListener("pointercancel", release);

// keys: Space strikes, the arrows circle the rim, M mutes
const keys = new Set();
addEventListener("keydown", (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.target.closest("button, a, input, textarea, [contenteditable]")) return;
  if (e.key === " ") { e.preventDefault(); wake(); strike({ thetaGroup: mallet.theta, brightness: 0.5 }); }
  else if (e.key === "ArrowLeft" || e.key === "ArrowRight") { e.preventDefault(); wake(); keys.add(e.key); mallet.target.present = true; mallet.target.pressed = true; }
  else if (e.key === "m" || e.key === "M") { if (voice.ready) { voice.setMuted(!voice.muted); soundUI(); } }
});
addEventListener("keyup", (e) => { keys.delete(e.key); if (!keys.size && !press) { mallet.target.pressed = false; rubRate = 0; } });
// the window goes away: nothing stays held, nothing keeps droning
function letGo() { keys.clear(); release(); rubRate = 0; }
addEventListener("blur", letGo);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) { letGo(); voice.suspend(); }
  else { voice.resume(); last = performance.now(); }
});

// ── the frame ─────────────────────────────────────────────────────────────
let aSmooth = 0, last = performance.now(), demoAt = 2.6, tSinceLoad = 0;
const wave = new Float32Array(2048);
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now; tSinceLoad += dt;
  const tNow = now / 1000;
  // the pointer, once per frame: the mallet's angle, and the rub while pressed
  if (bowl.ready && ptr.dirty) {
    ptr.dirty = false;
    if (ptr.mouse) {
      const r = stage.getBoundingClientRect();
      cursor.style.setProperty("--x", `${ptr.x - r.left}px`);
      cursor.style.setProperty("--y", `${ptr.y - r.top}px`);
      stage.classList.add("is-pointer");
    }
    const p = bowl.pick(ptr.x, ptr.y);
    if (p.plane) mallet.target.theta = p.planeThetaGroup;
    if (press && p.plane) {
      const dth = wrap(p.planeThetaGroup - press.theta);
      const omega = Math.abs(dth) / Math.max(1e-3, dt);
      press.theta = p.planeThetaGroup;
      if (Math.abs(dth) > 0.003) press.t = tNow;
      // on the rim band and moving: that is rubbing
      const onRim = p.planeR > 0.78 && p.planeR < 1.5;
      const rate = onRim ? clamp01(omega / 2.4) : 0;
      rubRate = rubRate * 0.75 + rate * 0.25;
    }
  }
  // a mallet held still is not rubbing
  if (press && tNow - press.t > 0.08) rubRate *= Math.exp(-dt / 0.12);
  // the arrows: a steady circle of the rim
  if (keys.has("ArrowLeft") || keys.has("ArrowRight")) {
    mallet.target.theta += (keys.has("ArrowRight") ? 1 : -1) * 1.7 * dt;
    rubRate = rubRate * 0.8 + 0.8 * 0.2;
  }
  voice.rub(rubRate);
  if (rubRate > 0.3 && !rubbedOnce) { rubbedOnce = true; setHint(""); }
  voice.update(dt);
  // the attract: a silent strike now and then, until anyone touches anything
  if (!interacted && !reduce && !mallet.target.present && tSinceLoad > demoAt && bowl.ready) {
    strike({ thetaGroup: REST, strength: 0.7, silent: true });
    demoAt = tSinceLoad + 8;
  }
  // the modes follow the model, audible or not
  bowl.setModes(voice.energies());
  const level = voice.level;
  // loudness → the text develops, the glow breathes
  const a = reduce ? 1 : clamp01(level * 2.2);
  aSmooth += (a - aSmooth) * Math.min(1, dt * (a > aSmooth ? 9 : 2.2));
  lineEl.style.fontVariationSettings = `"EXPO" ${(100 * (1 - aSmooth)).toFixed(1)}`;
  lineEl.style.opacity = (0.12 + 0.88 * aSmooth).toFixed(3);
  glow.style.setProperty("--a", clamp01(level * 2.2).toFixed(3));
  glow.style.setProperty("--g", (1 + 0.08 * aSmooth).toFixed(3));
  // the waves, from where the bowl really is on screen
  if (bowl.ready) {
    const c = bowl.toScreen(0, bowl.rim.y, 0);
    const r = bowl.toScreen(bowl.rim.r, bowl.rim.y, 0);
    waves.setCenter(c.x, c.y, Math.hypot(r.x - c.x, r.y - c.y));
    waves.pulse(clamp01(level * 1.6));
    voice.waveform(wave);
    waves.scope(wave, 6 + 44 * clamp01(level * 2.2));
  }
  waves.draw(dt);
  mallet.place(dt);
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
  get interacted() { return interacted; },
  get mallet() { return { theta: +mallet.theta.toFixed(3), lift: +mallet.lift.toFixed(3), present: mallet.target.present, pressed: mallet.target.pressed }; },
  energies: () => Array.from(voice.energies(), (v) => +v.toFixed(3)),
};
