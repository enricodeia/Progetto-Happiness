import { createBowl } from "./bowl.js";
import { createBowlVoice } from "./bowlVoice.js";
import { createMallet } from "./mallet.js";
import { createField } from "./field.js";
import { TECHNIQUES, CATEGORIES } from "./data/techniques.js";
import { $, $$, clamp01, reduce, TEAM, PARTNERS, mountNav, mountVersion, mountFooter } from "./common.js";

// ─────────────────────────────────────────────────────────────────────────────
// Edition 7 — the ripple. The bowl of edition 6, still an instrument, and
// around it the whole of Insight Timer laid out on the table, a layer per
// chapter of scroll: the 45 categories on the rim, the thirty teachers
// standing round it, the three sources of evidence meeting under it, the
// thirty million members as a field of light. A strike sends a ripple
// through every layer. What is shown is a pure function of the scroll; what
// is lit is a pure function of the ripples; nothing owns a timeline.
// ─────────────────────────────────────────────────────────────────────────────

const navUpdate = mountNav();
mountVersion(7);
mountFooter();

const TAU = Math.PI * 2;
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const sm = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const fmt = (n) => Math.round(n).toLocaleString("en-US");

const section = $("#ripple");
const stage = $("#stage");
const glow = $("#glow");
const pad = $("#pad");
const cursor = $("#cursor");
const TOUCH = matchMedia("(hover: none)").matches;
const HOVER = TOUCH ? "Tap" : "Hover";

const bowl = createBowl({
  canvas: $("#bowl"), host: stage,
  size: 0.44, lean: 24, shrink: 0.22,
  hover: !reduce, hoverAmount: 0.3, ring: true, ringScale: reduce ? 0.3 : 1,
});
const voice = createBowlVoice({ f0: 246.94, banks: 3 });
const field = createField({ back: $("#fieldBack"), front: $("#fieldFront"), bowl });
field.resize();
addEventListener("resize", () => field.resize());
const mallet = createMallet(bowl, { rest: 0.6 });

// ── the directory: 45 categories as a crown of lines on the rim ──────────
// Each line is as long as the techniques in its category; the longest stand
// at the back, the shortest meet at the front. Each category sings in its own
// note, deeper the more it holds.
const NOTES = [[29, 146.83, "D3"], [26, 164.81, "E3"], [16, 196.0, "G3"], [10, 220.0, "A3"], [7, 246.94, "B3"], [5, 293.66, "D4"], [3, 329.63, "E4"], [0, 392.0, "G4"]];
const DIAL_R0 = 0.6;
const MAXC = Math.max(...CATEGORIES.map((c) => TECHNIQUES[c].length));
const cats = CATEGORIES
  .map((name) => ({ name, list: TECHNIQUES[name], count: TECHNIQUES[name].length }))
  .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
const STEP = TAU / cats.length;
cats.forEach((c, i) => {
  const n = Math.ceil(i / 2), side = i % 2 ? 1 : -1;
  c.angle = -Math.PI / 2 + side * n * STEP;
  const note = NOTES.find(([min]) => c.count >= min);
  c.f0 = note[1];
  c.note = note[2];
  c.len = 0.035 + 0.2 * (c.count / MAXC);
  c.flash = 0;
});
const byAngle = [...cats].sort((a, b) => ((a.angle + TAU) % TAU) - ((b.angle + TAU) % TAU));
function nearestCat(theta) {
  let best = cats[0], bd = 9;
  for (const c of cats) { const d = Math.abs(wrap(theta - c.angle)); if (d < bd) { bd = d; best = c; } }
  return best;
}
function techSentence(c) {
  const shown = c.list.slice(0, 7);
  const more = c.list.length - shown.length;
  return shown.join(", ") + (more > 0 ? `, and ${more} more.` : ".");
}

// ── the teachers: the thirty most followed, standing round the bowl ──────
const T = [];
const parseFollowers = (s) => {
  const m = String(s || "").match(/([\d.]+)\s*([kKmM]?)/);
  if (!m) return 0;
  const u = m[2].toLowerCase();
  return parseFloat(m[1]) * (u === "m" ? 1e6 : u === "k" ? 1e3 : 1);
};
function loadSprite(t) {
  const img = new Image();
  img.decoding = "async";
  img.onload = () => {
    const S = 128;
    const c = document.createElement("canvas");
    c.width = c.height = S;
    const x = c.getContext("2d");
    x.beginPath(); x.arc(S / 2, S / 2, S / 2, 0, TAU); x.clip();
    const k = Math.max(S / img.width, S / img.height);
    x.drawImage(img, (S - img.width * k) / 2, (S - img.height * k) / 2, img.width * k, img.height * k);
    // the same face in grey, for before the sound reaches it
    const g = document.createElement("canvas");
    g.width = g.height = S;
    const gx = g.getContext("2d");
    gx.drawImage(c, 0, 0);
    const d = gx.getImageData(0, 0, S, S), p = d.data;
    for (let i = 0; i < p.length; i += 4) { const l = (p[i] * 0.299 + p[i + 1] * 0.587 + p[i + 2] * 0.114) * 0.9; p[i] = p[i + 1] = p[i + 2] = l; }
    gx.putImageData(d, 0, 0);
    t.colour = c;
    t.grey = g;
  };
  img.src = "/" + t.img;
}
fetch("/teachers.json").then((r) => r.json()).then((list) => {
  const sorted = list.map((t) => ({ ...t, f: parseFollowers(t.followers) })).sort((a, b) => b.f - a.f);
  const fmax = sorted[0]?.f || 1;
  const step = TAU / sorted.length;
  sorted.forEach((t, i) => {
    const n = Math.ceil(i / 2), side = i % 2 ? 1 : -1;
    t.i = i;
    t.angle = Math.PI / 2 + side * n * step;           // the most followed at the front
    t.r = 1.14;
    t.x = Math.cos(t.angle) * t.r;
    t.z = Math.sin(t.angle) * t.r;
    t.d = 0.085 + 0.075 * Math.sqrt(t.f / fmax);        // the diameter, in group units
    t.sat = 0; t.alpha = 0; t.sx = 0; t.sy = 0; t.sr = 0; t.w = 1;
    T.push(t);
    loadSprite(t);
  });
}).catch(() => {});

// ── the three sources: three circles meeting under the bowl ──────────────
const SOURCES = [
  { name: "Validated practices", text: "Data from peer-reviewed research is mapped to every technique in our library." },
  { name: "Member feedback", text: "Self-reported data from users shows impact over time." },
  { name: "Therapist reporting", text: "Clinical observation tells us what works in context." },
];
const S_OFF = 0.42, S_R = 0.82;
SOURCES.forEach((s, j) => {
  s.a = -Math.PI / 2 + (j * TAU) / 3;                 // one behind, two in front
  s.cx = Math.cos(s.a) * S_OFF;
  s.cz = Math.sin(s.a) * S_OFF;
  const lr = S_OFF + S_R + (j === 0 ? 0.42 : 0.1);   // the one behind stands clear of the back row of faces
  s.lx = Math.cos(s.a) * lr;
  s.lz = Math.sin(s.a) * lr;
  s.hot = 0; s.lsx = 0; s.lsy = 0;
});

// ── the members: 3,000 points, one for every ten thousand ────────────────
const DOTS = 3000, PER_DOT = 10000;
const R0 = 1.42, R1 = 2.6;
const dx = new Float32Array(DOTS), dz = new Float32Array(DOTS), dr = new Float32Array(DOTS);
const rank = new Float32Array(DOTS), dAlpha = new Float32Array(DOTS);
{
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const GA = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < DOTS; i++) {
    const t = (i + 0.5) / DOTS;
    const r = Math.sqrt(R0 * R0 + (R1 * R1 - R0 * R0) * t) + (rnd() - 0.5) * 0.035;
    const a = i * GA + (rnd() - 0.5) * 0.03;
    dx[i] = Math.cos(a) * r; dz[i] = Math.sin(a) * r; dr[i] = r;
  }
  // the order they appear in is shuffled, so the field fills evenly
  const order = Array.from({ length: DOTS }, (_, i) => i);
  for (let i = DOTS - 1; i > 0; i--) { const j = (rnd() * (i + 1)) | 0; [order[i], order[j]] = [order[j], order[i]]; }
  order.forEach((idx, k) => { rank[idx] = k; });
}

// ── ripples on the table ──────────────────────────────────────────────────
const RIP = Array.from({ length: 6 }, () => ({ on: false, t: 0, s: 1 }));
const RIP_SPEED = 1.3, RIP_LIFE = 2.8, RIP_W = 0.1;
function emitRipple(s = 1) {
  const r = RIP.find((x) => !x.on) || RIP.reduce((a, b) => (a.t > b.t ? a : b));
  r.on = true; r.t = 0; r.s = s;
}
const ripR = (x) => bowl.rim.r + RIP_SPEED * x.t;
function waveAt(r) {
  let v = 0;
  for (const x of RIP) {
    if (!x.on) continue;
    const d = (r - ripR(x)) / RIP_W;
    if (d > -3 && d < 3) v += x.s * Math.exp(-d * d) * (1 - x.t / RIP_LIFE);
  }
  return v > 1 ? 1 : v;
}

// ── sound ─────────────────────────────────────────────────────────────────
const soundBtn = $("#sound"), soundLabel = $("#soundLabel");
function soundUI() {
  soundBtn.classList.toggle("is-on", voice.ready && !voice.muted);
  soundBtn.classList.toggle("is-muted", voice.ready && voice.muted);
  soundBtn.setAttribute("aria-pressed", String(voice.ready && !voice.muted));
  soundLabel.textContent = !voice.ready ? "Sound off" : voice.muted ? "Muted" : "Sound on";
}
// iOS keeps a page that only uses an AudioContext under the ring/silent
// switch; a looping silent <audio> started from the same gesture lifts it
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
let interacted = false;
function wake() {
  interacted = true;
  unlockMedia();
  voice.ensure().then(soundUI, soundUI);
}
soundBtn.addEventListener("click", () => {
  interacted = true;
  if (!voice.ready) wake(); else { voice.setMuted(!voice.muted); soundUI(); }
});

// ── playing ───────────────────────────────────────────────────────────────
let lastStrikeAt = -1e9, struck = null;
function strike({ thetaGroup = mallet.theta, theta = null, brightness = 0.5, strength = 1, f0 = null, cat = null, silent = false } = {}) {
  const now = performance.now() / 1000;
  if (now - lastStrikeAt < 0.06) return;   // a real mallet cannot bounce faster than this
  lastStrikeAt = now;
  voice.strike({ strength, brightness, f0 });   // before the AudioContext exists this only moves the model
  bowl.setModes(voice.energies(), theta ?? thetaGroup + bowl.spin);
  bowl.pulse(strength);
  emitRipple(strength);
  mallet.hit(thetaGroup);
  if (cat) { cat.flash = 1; struck = cat; }
  if (!silent) interacted = true;
}

// the state read every frame
const rv = { dial: 0, teachers: 0, science: 0, dots: 0 };
let chapter = -1, p = 0;
let selected = null, kbdAt = -1e9;
let hoverT = -1, hoverS = -1, focus = null, overBowl = false, nearCrown = false;
let press = null, rubRate = 0;
const ptr = { x: 0, y: 0, inside: false, overPanel: false, mouse: false };
const keys = new Set();

// pointer
stage.addEventListener("pointermove", (e) => {
  ptr.x = e.clientX; ptr.y = e.clientY; ptr.inside = true;
  ptr.overPanel = !!e.target.closest(".panel, .meta");
  ptr.mouse = e.pointerType === "mouse";
  stage.classList.toggle("is-over-panel", ptr.overPanel);
  if (ptr.mouse) {
    const r = stage.getBoundingClientRect();
    cursor.style.setProperty("--x", `${e.clientX - r.left}px`);
    cursor.style.setProperty("--y", `${e.clientY - r.top}px`);
    stage.classList.add("is-pointer");
  }
});
stage.addEventListener("pointerleave", () => {
  ptr.inside = false; hoverT = -1; hoverS = -1;
  stage.classList.remove("is-pointer");
  if (!press) mallet.lay();
});
stage.addEventListener("pointerdown", (e) => {
  // the panel, its links and buttons keep their own clicks
  if (e.target.closest("button, a, .panel, .meta")) return;
  if (e.button !== 0 && e.pointerType === "mouse") return;
  ptr.x = e.clientX; ptr.y = e.clientY; ptr.inside = true;
  wake();
  if (!bowl.ready) return;
  const pk = bowl.pick(e.clientX, e.clientY);
  // a face under the finger or the pointer: it becomes the one in the panel
  const ti = teacherAt(e.clientX, e.clientY, pk.hit);
  if (ti >= 0) { focus = { kind: "t", i: ti }; return; }
  const si = sourceAt(e.clientX, e.clientY);
  if (si >= 0 && !pk.hit) { focus = { kind: "s", i: si }; return; }
  const reach = rv.dial > 0.5 ? 1.85 : 1.12;   // with the crown out, a line can be struck directly
  if (!(pk.hit || (pk.plane && pk.planeR < reach))) return;
  stage.setPointerCapture(e.pointerId);
  press = { theta: pk.planeThetaGroup, t: performance.now() / 1000 };
  mallet.target.pressed = true;
  mallet.target.present = true;
  const cat = rv.dial > 0.5 ? nearestCat(pk.planeThetaGroup) : null;
  if (cat) selected = cat;
  focus = null;
  // high on the wall, near the rim: bright; low, on the belly: soft
  const rel = pk.hit ? clamp01((pk.y - 0.1) / 0.9) : 0.8;
  strike({ theta: pk.theta, thetaGroup: pk.hit ? pk.thetaGroup : pk.planeThetaGroup, brightness: 0.25 + 0.6 * rel, f0: cat?.f0 ?? null, cat });
});
function release() {
  press = null;
  mallet.target.pressed = keys.has("s");
  if (!keys.has("s")) rubRate = 0;
  if (!ptr.inside && !keys.size) mallet.lay();
}
stage.addEventListener("pointerup", () => { wake(); release(); });   // on touch this is the activation event
stage.addEventListener("pointercancel", release);

// keys: Space strikes, the arrows walk the crown, S held sings, M mutes
const stageOnScreen = () => { const r = section.getBoundingClientRect(); return r.top < innerHeight * 0.5 && r.bottom > innerHeight * 0.5; };
addEventListener("keydown", (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.target.closest("button, a, input, textarea, [contenteditable]")) return;
  if (!stageOnScreen()) return;
  const now = performance.now() / 1000;
  if (e.key === " ") {
    e.preventDefault();
    wake();
    const c = rv.dial > 0.5 ? selected || nearestCat(mallet.theta) : null;
    if (c) selected = c;
    strike({ thetaGroup: c ? c.angle : mallet.theta, f0: c?.f0 ?? null, cat: c });
    kbdAt = now;
  } else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
    if (rv.dial < 0.5) return;
    e.preventDefault();
    const cur = selected || nearestCat(mallet.theta);
    const i = byAngle.indexOf(cur);
    selected = byAngle[(i + (e.key === "ArrowRight" ? -1 : 1) + byAngle.length) % byAngle.length];
    mallet.target.theta = selected.angle;
    mallet.target.present = true;
    kbdAt = now;
  } else if (e.key === "s" || e.key === "S") {
    wake();
    keys.add("s");
    mallet.target.present = true;
    mallet.target.pressed = true;
  } else if (e.key === "m" || e.key === "M") {
    if (voice.ready) { voice.setMuted(!voice.muted); soundUI(); }
  }
});
addEventListener("keyup", (e) => {
  if (e.key === "s" || e.key === "S") { keys.delete("s"); if (!press) { mallet.target.pressed = false; rubRate = 0; } }
});
// the window goes away: nothing stays held, nothing keeps droning
function letGo() { keys.clear(); release(); rubRate = 0; }
addEventListener("blur", letGo);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) { letGo(); voice.suspend(); }
  else { voice.resume(); last = performance.now(); }
});

// ── the chapters ──────────────────────────────────────────────────────────
const CH = 7;
const TITLES = ["Practice", "Ways", "People", "Science", "Members", "Team", "Everybody"];
const chaps = $$(".chap");
const railItems = $$("#rail li");
const railN = $("#railN"), railT = $("#railT");
const railSpans = railItems.map((li) => $("button span", li));
const readNavH = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--nav-h")) || 48;
let NAVH = readNavH();
addEventListener("resize", () => { NAVH = readNavH(); });
const navH = () => NAVH;
function progress() {
  const r = section.getBoundingClientRect();
  return Math.min(CH, Math.max(0, (navH() - r.top) / Math.max(1, stage.clientHeight)));
}
function setChapter(i) {
  if (i === chapter) return;
  chapter = i;
  chaps.forEach((c, k) => c.classList.toggle("is-on", k === i));
  railItems.forEach((li, k) => li.classList.toggle("is-on", k === i));
  railN.textContent = String(i).padStart(2, "0");
  railT.textContent = TITLES[i];
  focus = null;
}
railItems.forEach((li, i) => $("button", li).addEventListener("click", () => {
  const top = section.getBoundingClientRect().top + scrollY - navH() + (i + 0.4) * stage.clientHeight;
  scrollTo({ top, behavior: reduce ? "auto" : "smooth" });
}));

// ── the panel's live part: whatever is under the pointer, else the chapter ─
const live = $("#live"), status = $("#status");
let liveKey = "";
function setLive(key, html, announce = "") {
  if (key === liveKey) return;
  liveKey = key;
  countShown = -1;   // new content: whatever it shows must be written again
  live.innerHTML = html;
  if (announce) status.textContent = announce;
}
let countShown = -1;
const CREW = `<ul class="crew">${TEAM.map((p) => `<li><b>${p.name}</b><span>${p.role || "Founder"}</span></li>`).join("")}</ul>
  <p class="crew-partners"><b>Partners</b> · ${PARTNERS.map((p) => p.name + (p.role ? ` (${p.role})` : "")).join(", ")}.</p>`;
function updateLive() {
  const f = focus || (hoverT >= 0 ? { kind: "t", i: hoverT } : hoverS >= 0 ? { kind: "s", i: hoverS } : null);
  if (f && f.kind === "t" && T[f.i]) {
    const t = T[f.i];
    setLive("t" + t.slug, `<p class="live-k">Teacher</p><b class="live-t">${t.name}</b><span class="live-m">${t.loc} · ${t.followers} followers</span><a class="link" href="https://insighttimer.com/${t.slug}" target="_blank" rel="noopener">Listen on Insight Timer<span class="chev">›</span></a>`, `${t.name}, ${t.followers} followers`);
    return;
  }
  if (f && f.kind === "s") {
    const s = SOURCES[f.i];
    setLive("s" + f.i, `<p class="live-k">Source ${String(f.i + 1).padStart(2, "0")}</p><b class="live-t">${s.name}</b><p class="live-b">${s.text}</p>`, s.name);
    return;
  }
  switch (chapter) {
    case 0:
      setLive("c0", `<p class="live-hint">Strike the bowl. Press on the rim and circle it slowly, and it sings.</p>`);
      break;
    case 1: {
      const c = selected;   // kept after the pointer leaves, so it can be read
      if (c) setLive("k" + c.name, `<p class="live-k">Category</p><b class="live-t">${c.name}</b><span class="live-m">${c.count} ${c.count === 1 ? "technique" : "techniques"} · sings in <i>${c.note}</i></span><p class="live-b">${techSentence(c)}</p>`, `${c.name}, ${c.count} techniques`);
      else setLive("c1", `<p class="live-hint">${TOUCH ? "Tap a line of the crown" : "Move around the bowl"} to choose one of the 45 categories. Strike to hear it.</p>`);
      break;
    }
    case 2:
      setLive("c2", `<p class="live-hint">Strike the bowl and watch the sound reach each of them. ${HOVER} a face to meet them.</p>`);
      break;
    case 3:
      setLive("c3", `<p class="live-hint">One circle for each source of evidence. ${HOVER} a name.</p>`);
      break;
    case 4: {
      setLive("c4", `<b class="live-count" id="liveCount">0</b><span class="live-m">members, one point of light for every ten thousand. Strike the bowl to reach them.</span>`);
      const n = Math.round(rv.dots * DOTS) * PER_DOT;
      if (n !== countShown) { countShown = n; const el = $("#liveCount"); if (el) el.textContent = fmt(n); }
      return;
    }
    case 5:
      setLive("c5", CREW);
      break;
    case 6:
      setLive("c6", `<div class="links"><a class="btn" href="#">Get the app</a><a class="link" href="/v3#guided">Become a teacher<span class="chev">›</span></a></div>`);
      break;
  }
  countShown = -1;
}

// ── hit tests, in screen space ────────────────────────────────────────────
function teacherAt(cx, cy, onBowl) {
  if (rv.teachers < 0.5) return -1;
  const r = stage.getBoundingClientRect();
  const x = cx - r.left, y = cy - r.top;
  let best = -1, bw = Infinity;
  for (const t of T) {
    if (t.alpha < 0.5) continue;
    if (t.z < 0 && onBowl) continue;               // behind the metal
    const d = Math.hypot(x - t.sx, y - t.sy);
    if (d < t.sr + 6 && t.w < bw) { bw = t.w; best = t.i; }
  }
  return best;
}
function sourceAt(cx, cy) {
  if (rv.science < 0.6) return -1;
  const r = stage.getBoundingClientRect();
  const x = cx - r.left, y = cy - r.top;
  let best = -1, bd = 60;
  SOURCES.forEach((s, j) => { const d = Math.hypot(x - s.lsx, y - s.lsy); if (d < bd) { bd = d; best = j; } });
  return best;
}

// ── the frame ─────────────────────────────────────────────────────────────
const wave = new Float32Array(2048);
const PT = { x: 0, y: 0, w: 1, s: 1 }, PB = { x: 0, y: 0, w: 1, s: 1 };
let last = performance.now(), tLoad = 0, demoAt = 2.6, idleAt = 0, rot = 0, level = 0;
const SANS = "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif";
const SERIF = "Exposure, Georgia, serif";

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now; tLoad += dt;
  const tNow = now / 1000;
  navUpdate();

  // what the scroll shows
  p = progress();
  setChapter(Math.min(CH - 1, Math.floor(p)));
  for (let i = 0; i < railSpans.length; i++) railSpans[i].style.setProperty("--f", clamp01(p - i).toFixed(3));
  rv.dial = sm(0.55, 1.25, p);
  rv.teachers = sm(1.5, 2.3, p);
  rv.science = sm(2.5, 3.4, p);
  rv.dots = sm(3.45, 4.6, p);

  // the framing: an object at first, then, tilting, a map
  const W = stage.clientWidth, H = stage.clientHeight;
  const portrait = W < H;
  const q = sm(0.25, 1.6, p);
  bowl.setScroll(q);
  bowl.setSize(portrait ? 0.4 : 0.44);
  if (portrait) bowl.setShift(0, 0.2 - 0.06 * q);
  else bowl.setShift(0.1 * (W / Math.max(1, H)), -0.02 - 0.06 * q);

  // the pointer: the mallet's angle, the line under it, the face under it
  hoverT = -1; hoverS = -1; overBowl = false; nearCrown = false;
  if (bowl.ready && ptr.inside && !ptr.overPanel) {
    const pk = bowl.pick(ptr.x, ptr.y);
    overBowl = pk.hit;
    if (pk.plane) {
      mallet.target.theta = pk.planeThetaGroup;
      mallet.target.present = true;
      // the crown only answers a pointer that is near it
      nearCrown = rv.dial > 0.5 && (pk.hit || (pk.planeR > 0.7 && pk.planeR < 2.05));
      if (nearCrown && !press) selected = nearestCat(pk.planeThetaGroup);
    }
    if (press && pk.plane) {
      const dth = wrap(pk.planeThetaGroup - press.theta);
      const omega = Math.abs(dth) / Math.max(1e-3, dt);
      press.theta = pk.planeThetaGroup;
      if (Math.abs(dth) > 0.003) press.t = tNow;
      const onRim = pk.planeR > 0.78 && pk.planeR < (rv.dial > 0.5 ? 1.9 : 1.5);
      rubRate = rubRate * 0.75 + (onRim ? clamp01(omega / 2.4) : 0) * 0.25;
    }
    if (!press) {
      hoverT = teacherAt(ptr.x, ptr.y, overBowl);
      if (hoverT < 0) hoverS = sourceAt(ptr.x, ptr.y);
      if (hoverT >= 0) focus = { kind: "t", i: hoverT };
      else if (hoverS >= 0) focus = { kind: "s", i: hoverS };
      else if (overBowl) focus = null;
    }
  } else if (ptr.overPanel && !press && !keys.size && !(tNow - kbdAt < 2)) {
    mallet.lay();
  }
  if (press && tNow - press.t > 0.08) rubRate *= Math.exp(-dt / 0.12);   // a mallet held still is not rubbing
  if (keys.has("s")) {
    mallet.target.theta += 1.7 * dt;
    rubRate = rubRate * 0.8 + 0.8 * 0.2;
  }
  voice.rub(rubRate);
  voice.update(dt);

  // life before anyone plays, and at the very end
  if (!interacted && !reduce && chapter === 0 && !mallet.target.present && tLoad > demoAt && bowl.ready) {
    strike({ thetaGroup: mallet.rest, strength: 0.7, silent: true });
    demoAt = tLoad + 8;
  }
  if (chapter === CH - 1 && !reduce && tLoad > idleAt) { emitRipple(0.45); idleAt = tLoad + 3.2; }

  bowl.setModes(voice.energies());
  level = voice.level;
  for (const r of RIP) if (r.on && (r.t += dt) > RIP_LIFE) r.on = false;

  // ── draw the table ──
  field.begin();
  const yT = bowl.rim.foot, yR = bowl.rim.y;

  // the members
  if (rv.dots > 0.001) {
    const shown = rv.dots * DOTS;
    for (let i = 0; i < DOTS; i++) {
      const born = clamp01((shown - rank[i]) / 90);
      if (born <= 0) { dAlpha[i] = 0; continue; }
      const fade = 1 - 0.45 * ((dr[i] - R0) / (R1 - R0));
      dAlpha[i] = Math.min(1, (0.18 + 0.82 * waveAt(dr[i])) * fade * born);
    }
    field.dots(dx, dz, yT, dAlpha, 0.0072);
  }

  // the three sources
  if (rv.science > 0.001) SOURCES.forEach((s, j) => {
    const prog = clamp01(rv.science * 1.5 - j * 0.25);
    s.hot += ((hoverS === j || (focus && focus.kind === "s" && focus.i === j) ? 1 : 0) - s.hot) * Math.min(1, dt * 8);
    field.ring(S_R, yT, (0.3 + 0.5 * s.hot) * prog + 0.3 * waveAt(S_R) * prog, { cx: s.cx, cz: s.cz, from: s.a, span: prog * TAU, width: 1 });
    field.project(s.lx, yT, s.lz, PT);
    s.lsx = PT.x; s.lsy = PT.y;
  });

  // the ripples
  for (const r of RIP) if (r.on) field.ring(ripR(r), yT, 0.6 * r.s * (1 - r.t / RIP_LIFE) ** 2, { width: 1 });

  // the teachers, far ones first
  if (rv.teachers > 0.001 && T.length) {
    for (const t of T) {
      const rise = clamp01(rv.teachers * 1.6 - (t.i / T.length) * 0.6);
      t.alpha = rise;
      const lit = Math.max(waveAt(t.r), hoverT === t.i || (focus && focus.kind === "t" && focus.i === t.i) ? 1 : 0);
      t.sat = lit > t.sat ? lit : Math.max(lit, t.sat - dt / 1.6);
      field.project(t.x, yT + t.d / 2 + 0.03 - (1 - rise) * 0.05, t.z, PT);
      t.sx = PT.x; t.sy = PT.y; t.sr = (t.d / 2) * PT.s; t.w = PT.w;
    }
    const order = [...T].sort((a, b) => b.w - a.w);
    for (const t of order) {
      if (t.alpha <= 0.01 || !t.grey) continue;
      const c = field.ctx(t.z);
      // a hairline from the table, so they stand rather than float
      field.project(t.x, yT, t.z, PB);
      c.globalAlpha = 0.22 * t.alpha;
      c.lineWidth = 1;
      c.strokeStyle = field.GOLD;
      c.beginPath(); c.moveTo(PB.x, PB.y); c.lineTo(t.sx, t.sy + t.sr); c.stroke();
      const s = t.sr * 2;
      c.globalAlpha = 0.88 * t.alpha;
      c.drawImage(t.grey, t.sx - t.sr, t.sy - t.sr, s, s);
      if (t.sat > 0.01) { c.globalAlpha = t.alpha * t.sat; c.drawImage(t.colour, t.sx - t.sr, t.sy - t.sr, s, s); }
      const on = hoverT === t.i || (focus && focus.kind === "t" && focus.i === t.i);
      if (on || t.sat > 0.3) {
        c.globalAlpha = t.alpha * (on ? 1 : t.sat * 0.6);
        c.beginPath(); c.arc(t.sx, t.sy, t.sr + 2.5, 0, TAU); c.stroke();
      }
    }
  }

  // the crown of categories on the rim
  if (rv.dial > 0.001) {
    for (let i = 0; i < cats.length; i++) {
      const c = cats[i];
      const grow = sm(0, 1, rv.dial * 1.7 - (i / cats.length) * 0.7);
      if (grow <= 0) continue;
      c.flash = Math.max(waveAt(DIAL_R0 + c.len * 0.5), c.flash - dt * 1.2);
      const ca = Math.cos(c.angle), sa = Math.sin(c.angle);
      const r1 = DIAL_R0 + c.len * grow;
      const isSel = selected === c && (nearCrown || tNow - kbdAt < 3 || press);
      const a = isSel ? 1 : 0.4 + 0.55 * c.flash;
      field.segment(ca * DIAL_R0, yR, sa * DIAL_R0, ca * r1, yR, sa * r1, a * grow, isSel ? 1.8 : 1.2, isSel || c.flash > 0.6 ? "#fff" : field.GOLD);
    }
  }

  // the sound itself, bent round the rim
  voice.waveform(wave);
  rot += dt * 0.05;
  const lv = clamp01(level * 2.2);
  field.scope(wave, 0.565, yR, 0.015 + 0.075 * lv, 0.12 + 0.5 * lv, rot);

  // ── labels, always in front ──
  field.project(0, yR, 0, PB);
  const cxs = PB.x, cys = PB.y;
  if (rv.dial > 0.5 && selected && (nearCrown || tNow - kbdAt < 3 || press)) {
    const c = selected;
    field.project(Math.cos(c.angle) * (DIAL_R0 + c.len + 0.05), yR, Math.sin(c.angle) * (DIAL_R0 + c.len + 0.05), PT);
    const right = PT.x >= cxs;
    const ox = right ? 8 : -8;
    field.label(c.name.toUpperCase(), PT.x + ox, PT.y - 8, { align: right ? "left" : "right", font: `600 11px ${SANS}`, spacing: "0.08em", color: "#fff", margin: 14 });
    field.label(`${c.count} · ${c.note}`, PT.x + ox, PT.y + 9, { align: right ? "left" : "right", font: `15px ${SERIF}`, color: field.GOLD, margin: 14 });
  }
  if (rv.science > 0.5) SOURCES.forEach((s, j) => {
    // on a narrow stage the two in front sit below the faces and stay on screen
    const dy = portrait && j > 0 ? 46 : 0;
    field.label(s.name.toUpperCase(), s.lsx, s.lsy + dy, { align: "center", font: `600 10px ${SANS}`, spacing: "0.1em", alpha: (0.45 + 0.55 * s.hot) * rv.science, color: s.hot > 0.5 ? "#fff" : field.GOLD, margin: 14 });
  });
  if (hoverT >= 0 && T[hoverT]) {
    const t = T[hoverT];
    field.label(t.name, t.sx, t.sy - t.sr - 12, { align: "center", font: `500 12px ${SANS}`, color: "#fff", margin: 14 });
  }

  // the glow behind the metal, and the touch zone over it
  glow.style.setProperty("--gx", `${cxs}px`);
  glow.style.setProperty("--gy", `${cys}px`);
  glow.style.setProperty("--gs", `${Math.round(bowl.rim.r * 2 * PB.s * 2.4)}px`);
  glow.style.setProperty("--a", lv.toFixed(3));
  if (TOUCH) {
    const rp = (rv.dial > 0.5 ? 0.85 : 0.62) * PB.s * 2;
    pad.style.width = pad.style.height = `${rp}px`;
    pad.style.transform = `translate(${cxs - rp / 2}px, ${cys - rp / 2}px)`;
  }

  mallet.place(dt);
  updateLive();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
soundUI();

// for a scripted check
window.__it = {
  bowl, voice, field, cats, T, SOURCES,
  edition: 7,
  get p() { return +p.toFixed(3); },
  get chapter() { return chapter; },
  get rv() { return { ...rv }; },
  get selected() { return selected ? { name: selected.name, count: selected.count, f0: selected.f0, note: selected.note } : null; },
  get struck() { return struck ? struck.name : null; },
  get hoverT() { return hoverT; },
  get focus() { return focus; },
  get live() { return live.textContent.replace(/\s+/g, " ").trim(); },
  get members() { return Math.round(rv.dots * DOTS) * PER_DOT; },
  get lit() { return T.filter((t) => t.sat > 0.5).length; },
  get rub() { return +rubRate.toFixed(3); },
  get nearCrown() { return nearCrown; },
  get railFills() { return railSpans.map((s) => +(+s.style.getPropertyValue("--f")).toFixed(2)); },
  catScreen(name) {
    const c = cats.find((x) => x.name === name) || cats[0];
    const o = field.project(Math.cos(c.angle) * (DIAL_R0 + c.len * 0.6), bowl.rim.y, Math.sin(c.angle) * (DIAL_R0 + c.len * 0.6), { x: 0, y: 0, w: 1, s: 1 });
    const r = stage.getBoundingClientRect();
    return { x: r.left + o.x, y: r.top + o.y };
  },
  teacherScreen(i) { const t = T[i]; const r = stage.getBoundingClientRect(); return t ? { x: r.left + t.sx, y: r.top + t.sy, r: t.sr, name: t.name } : null; },
  sourceScreen(j) { const s = SOURCES[j]; const r = stage.getBoundingClientRect(); return { x: r.left + s.lsx, y: r.top + s.lsy }; },
  bowlScreen() { const o = field.project(0, bowl.rim.y, 0, { x: 0, y: 0, w: 1, s: 1 }); const r = stage.getBoundingClientRect(); return { x: r.left + o.x, y: r.top + o.y, r: bowl.rim.r * o.s }; },
  scrollToChapter(i, f = 0.5) { const top = section.getBoundingClientRect().top + scrollY - navH() + (i + f) * stage.clientHeight; scrollTo({ top, behavior: "instant" }); },
};
