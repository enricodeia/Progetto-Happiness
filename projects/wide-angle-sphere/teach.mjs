// Puppeteer pass over /teach.html — the carousel hero.
// `npm run verify:teach` → shots/teach-*.png + the checks below.
import puppeteer from "puppeteer-core";
import fs from "node:fs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const URL = process.env.URL || "http://localhost:5199/teach.html";
const OUT = process.env.OUT || "shots";
fs.mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--window-size=1500,1000", "--enable-webgl", "--use-gl=angle"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1500, height: 900, deviceScaleFactor: 1 });

const errors = [];
page.on("pageerror", (e) => errors.push("PAGEERROR: " + String(e.stack || e.message).split("\n")[0]));
page.on("console", (m) => {
  if (m.type() === "error" && !m.text().includes("favicon")) {
    errors.push("CONSOLE: " + m.text().split("\n")[0]);
  }
});
page.on("dialog", (d) => d.accept("Alt A"));

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const checks = [];
const ok = (name, pass, detail = "") => checks.push({ name, pass: !!pass, detail });

const boot = async () => {
  await page.goto(URL, { waitUntil: "networkidle2", timeout: 45000 });
  await page.waitForFunction("window.__tch && window.__tch.state.cards > 0", { timeout: 20000 });
  await wait(2200);
};

// A clean slate: the page restores its last session from localStorage, and a
// leftover one would make every check below meaningless.
await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 45000 });
await page.evaluate(() => {
  try {
    localStorage.clear();
  } catch {
    /* storage off */
  }
});
await boot();

// ── the copy is there, and it is the reference's ─────────────────────────
const copy = await page.evaluate(() => window.__tch.state.copy);
ok("title reads right", copy.title === "Make an impact and an income on Insight Timer.", copy.title);
ok(
  "paragraph reads right",
  copy.para.startsWith("Millions of people come to Insight Timer"),
  copy.para.slice(0, 40)
);
ok("button reads right", copy.cta === "Become a teacher", copy.cta);
ok(
  "all three are on screen",
  copy.shown.title && copy.shown.para && copy.shown.cta,
  JSON.stringify(copy.shown)
);

const layout = await page.evaluate(() => {
  const st = window.__tch.state;
  const c = document.getElementById("copy").getBoundingClientRect();
  const cta = document.querySelector(".tch-cta").getBoundingClientRect();
  return { ...st, copyLeft: c.left, ctaW: cta.width, ctaH: cta.height, vw: innerWidth, vh: innerHeight };
});
ok("18 portraits", layout.cards === 18, `cards=${layout.cards}`);
ok("canvas is the full viewport", layout.canvas.w === layout.vw && layout.canvas.h === layout.vh);
ok(
  "the composition is framed in the left half",
  Math.abs(layout.region.w / layout.vw - 0.48) < 0.02,
  `regionW=${layout.region.w}`
);
ok("copy clears the framing region", layout.copyLeft >= layout.region.w - 1, `copy@${layout.copyLeft}`);
ok("the button has a real box", layout.ctaW > 80 && layout.ctaH > 24, `${layout.ctaW}x${layout.ctaH}`);

// the button actually responds — it must not sit under the full-bleed canvas
const ctaLive = await page.evaluate(() => {
  const b = document.querySelector(".tch-cta");
  let hit = 0;
  b.addEventListener("click", () => (hit += 1), { once: true });
  const r = b.getBoundingClientRect();
  const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
  b.click();
  return { hit, onTop: top === b || b.contains(top), tag: top && top.className };
});
ok(
  "the button is clickable, not buried under the canvas",
  ctaLive.hit === 1 && ctaLive.onTop,
  JSON.stringify(ctaLive)
);

// ── the shelf is gone, the presets are in the panel ──────────────────────
const panelUi = await page.evaluate(() => ({
  shelf: document.querySelectorAll(".tch-shelf").length,
  panel: document.querySelectorAll(".was-panel").length,
  library: window.__tch.state.library,
  current: window.__tch.state.current,
  folders: [...document.querySelectorAll(".was-panel .tp-fldv_t")].map((e) => e.textContent.trim()),
}));
ok("no shelf across the bottom any more", panelUi.shelf === 0);
ok("one panel, on the right", panelUi.panel === 1);
ok("all 19 library presets are in it", panelUi.library === 19, `n=${panelUi.library}`);
ok("the list names the preset actually on screen", panelUi.current === "tower-of-pisa", panelUi.current);
for (const want of [
  "Presets", "Framing region", "Camera", "Shape (rebuild)", "Cards (rebuild)",
  "Motion", "Per-card motion", "Effects", "Copy + nav",
]) {
  ok(`panel has "${want}"`, panelUi.folders.includes(want), panelUi.folders.join(" · "));
}
await page.screenshot({ path: `${OUT}/teach-01-hero.png` });

// ── a blank saved config can no longer wipe the page ─────────────────────
// This is the failure that emptied the hero: a preset saved with the copy
// deleted, restored by the autosave on every reload afterwards.
await page.evaluate(() => {
  const bad = JSON.parse(JSON.stringify(window.__tch.cfg));
  bad.hero.title = "";
  bad.hero.para = "   ";
  bad.hero.cta = "";
  bad.page.bg = "";
  bad.tower.region.width = 0;
  localStorage.setItem("tch.live.v1", JSON.stringify(bad));
});
await boot();
const healed = await page.evaluate(() => ({
  copy: window.__tch.state.copy,
  restored: window.__tch.state.restored,
  regionW: window.__tch.state.region.w,
  bg: getComputedStyle(document.body).backgroundColor,
}));
ok(
  "blank copy in a saved session comes back",
  healed.copy.title.startsWith("Make an impact") &&
    healed.copy.para.startsWith("Millions") &&
    healed.copy.cta === "Become a teacher",
  JSON.stringify(healed.copy)
);
ok("...and it really was restored from storage", healed.restored === true);
ok("a zero-width region comes back too", healed.regionW > 100, `regionW=${healed.regionW}`);
ok("blank paper comes back too", healed.bg !== "rgba(0, 0, 0, 0)", healed.bg);

// hiding a block is the toggle, and it is reversible
const toggled = await page.evaluate(() => {
  window.__tch.cfg.hero.showPara = false;
  window.__tch.applyAll();
  const off = window.__tch.state.copy.shown.para;
  window.__tch.cfg.hero.showPara = true;
  window.__tch.applyAll();
  return { off, on: window.__tch.state.copy.shown.para };
});
ok("show toggles hide and un-hide", toggled.off === false && toggled.on === true, JSON.stringify(toggled));

// ── the effects chain ────────────────────────────────────────────────────
// Each one has to reach the shader: switching it on must move its uniform,
// and switching it off must put it back.
await page.evaluate(() => localStorage.clear());
await boot();
const fxReport = await page.evaluate(async () => {
  const frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  const probes = {
    bloom: "uPostBloom",
    chromatic: "uPostChroma",
    rgbSplit: "uPostRgb",
    ripple: "uPostRipple",
    liquid: "uPostLiquid",
    velStreak: "uVelStreak",
    colorGrade: "uPostGradeSat",
    vignette: "uPostVignette",
    grain: "uPostGrain",
    noise: "uPostNoise",
  };
  const out = [];
  for (const [key, uni] of Object.entries(probes)) {
    const block = window.__tch.cfg.tower.postfx[key];
    if (!block) {
      out.push({ key, missing: true });
      continue;
    }
    block.enabled = false;
    // the streak is driven by the drag by default, so pin it on for the probe
    if (key === "velStreak") block.fromDrag = false;
    await frame();
    const off = window.__tch.tower.uniformsOf(0)[uni].value;
    block.enabled = true;
    await frame();
    const on = window.__tch.tower.uniformsOf(0)[uni].value;
    block.enabled = false;
    if (key === "velStreak") block.fromDrag = true;
    await frame();
    const back = window.__tch.tower.uniformsOf(0)[uni].value;
    out.push({
      key, off, on, back,
      moved: Math.abs(on - off) > 1e-6,
      reset: Math.abs(back - off) < 1e-9,
    });
  }
  return out;
});
const fxBad = fxReport.filter((r) => r.missing || !r.moved || !r.reset);
ok(
  `all ${fxReport.length} effects reach the shader and switch back off`,
  fxBad.length === 0,
  fxBad.map((r) => `${r.key}: ${JSON.stringify(r)}`).join(" | ")
);

// the image parallax writes a vector, so it gets its own probe
const ipOk = await page.evaluate(async () => {
  const frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  const b = window.__tch.cfg.tower.postfx.imgParallax;
  b.enabled = true;
  b.strength = 0.3;
  b.ease = 0.4;
  // the pan follows the pointer parallax, so push the pointer well off centre
  window.dispatchEvent(new PointerEvent("pointermove", { clientX: 120, clientY: 780, bubbles: true }));
  for (let i = 0; i < 50; i++) await frame();
  const v = window.__tch.tower.uniformsOf(0).uImgParallax.value;
  // snapshot NOW — `v` is the live uniform and is about to be zeroed
  const at = { x: +v.x.toFixed(4), y: +v.y.toFixed(4) };
  const moved = Math.hypot(v.x, v.y) > 1e-4;
  b.enabled = false;
  for (let i = 0; i < 3; i++) await frame();
  const z = window.__tch.tower.uniformsOf(0).uImgParallax.value;
  return { moved, ...at, backToZero: Math.hypot(z.x, z.y) < 1e-9 };
});
ok("image parallax pans and resets", ipOk.moved && ipOk.backToZero, JSON.stringify(ipOk));

// a screenshot with a loud stack on, as a visual record
await page.evaluate(() => {
  const fx = window.__tch.cfg.tower.postfx;
  fx.colorGrade.enabled = true;
  fx.colorGrade.saturation = 0;
  fx.colorGrade.contrast = 1.3;
  fx.vignette.enabled = true;
  fx.grain.enabled = true;
  fx.chromatic.enabled = true;
  fx.chromatic.strength = 0.02;
  window.__tch.setClean(true);
});
await wait(900);
await page.screenshot({ path: `${OUT}/teach-02-effects.png` });
await page.evaluate(() => {
  const fx = window.__tch.cfg.tower.postfx;
  for (const k of Object.keys(fx)) fx[k].enabled = false;
  fx.colorGrade.saturation = 1.1;
  fx.colorGrade.contrast = 1.05;
  window.__tch.setClean(false);
});

// ── per-card motion reaches the meshes ───────────────────────────────────
const motion = await page.evaluate(async () => {
  const frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  const im = window.__tch.cfg.tower.itemMotion;
  const spin = window.__tch.cfg.tower.motion.autoSpin;
  window.__tch.cfg.tower.motion.autoSpin = 0; // hold the drum still
  im.bob = 0;
  for (let i = 0; i < 6; i++) await frame();
  const a = window.__tch.tower.screenOf(3);
  im.bob = 3;
  im.bobSpeed = 4;
  for (let i = 0; i < 25; i++) await frame();
  const b = window.__tch.tower.screenOf(3);
  im.bob = 0;
  window.__tch.cfg.tower.motion.autoSpin = spin;
  return { moved: Math.abs(a.y - b.y) > 2, a: +a.y.toFixed(1), b: +b.y.toFixed(1) };
});
ok("per-card motion moves the cards", motion.moved, JSON.stringify(motion));

// ── presets: save from the panel, then load it back ──────────────────────
const savedRun = await page.evaluate(() => {
  window.__tch.cfg.tower.camera.tiltZ = -38;
  window.__tch.applyAll();
  const btn = [...document.querySelectorAll(".was-panel button")].find((b) =>
    b.textContent.trim().startsWith("Save the current look")
  );
  if (!btn) return { noButton: true };
  btn.click();
  return { clicked: true };
});
await wait(900);
const savedState = await page.evaluate(() => {
  const list = JSON.parse(localStorage.getItem("tch.presets.v1") || "[]");
  return {
    count: list.length,
    name: list[0]?.name,
    tiltZ: list[0]?.config?.tower?.camera?.tiltZ,
    inPanel: window.__tch.state.presets,
  };
});
ok(
  "the panel saves a preset",
  !savedRun.noButton && savedState.count === 1 && savedState.tiltZ === -38 && savedState.inPanel === 1,
  JSON.stringify({ ...savedRun, ...savedState })
);

const loadedBack = await page.evaluate(() => {
  window.__tch.cfg.tower.camera.tiltZ = -5;
  window.__tch.applyAll();
  const changed = window.__tch.cfg.tower.camera.tiltZ;
  const saved = JSON.parse(localStorage.getItem("tch.presets.v1"))[0];
  window.__tch.applyPreset(saved.config);
  return { changed, after: window.__tch.cfg.tower.camera.tiltZ };
});
ok(
  "loading it back restores it, in place",
  loadedBack.changed === -5 && loadedBack.after === -38,
  JSON.stringify(loadedBack)
);

// ── every library preset loads, and lands inside its region ──────────────
const libraryReport = [];
const lib = await page.evaluate(() =>
  window.__tch.panel.library.map((e) => ({ slug: e.slug, shape: e.shape }))
);
for (const { slug, shape } of lib) {
  await page.evaluate((s) => {
    const e = window.__tch.panel.library.find((x) => x.slug === s);
    window.__tch.applyLibrary(e.config);
  }, slug);
  await wait(620);
  const r = await page.evaluate(() => {
    const t = window.__tch.tower;
    const g = t.region;
    const x0 = (innerWidth * (g.ndcX + 1)) / 2 - g.w / 2;
    const x1 = x0 + g.w;
    let inside = 0;
    let seen = 0;
    for (let i = 0; i < t.itemCount; i++) {
      const p = t.screenOf(i);
      if (!p || !p.infront) continue;
      seen += 1;
      if (p.x >= x0 - 2 && p.x <= x1 + 2 && p.y >= -2 && p.y <= innerHeight + 2) inside += 1;
    }
    return { seen, inside, cards: t.itemCount };
  });
  libraryReport.push({ slug, shape, ...r });
}
const strays = libraryReport.filter((r) => r.seen === 0 || r.inside / r.seen < 0.7);
ok(
  `all ${lib.length} library presets land in the region`,
  strays.length === 0,
  strays.map((r) => `${r.slug} ${r.inside}/${r.seen}`).join(", ")
);
ok("...and every one builds its cards", libraryReport.every((r) => r.cards > 0));

// [ and ] walk the library without touching the framing region
const stepped = await page.evaluate(() => {
  window.__tch.cfg.tower.region.width = 42;
  window.__tch.applyAll();
  window.__tch.panel.stepLibrary(1);
  const a = window.__tch.state.current;
  window.__tch.panel.stepLibrary(1);
  const b = window.__tch.state.current;
  window.__tch.panel.stepLibrary(-1);
  return { after: window.__tch.cfg.tower.region.width, a, b, back: window.__tch.state.current };
});
ok(
  "stepping the library leaves the framing region alone",
  stepped.after === 42 && stepped.a !== stepped.b && stepped.back === stepped.a,
  JSON.stringify(stepped)
);

// ── reset ────────────────────────────────────────────────────────────────
await page.evaluate(() => {
  const btn = [...document.querySelectorAll(".was-panel button")].find((b) =>
    b.textContent.trim().startsWith("Reset to the Tower")
  );
  btn.click();
});
await wait(1500);
const afterReset = await page.evaluate(() => ({
  tiltZ: window.__tch.cfg.tower.camera.tiltZ,
  width: window.__tch.cfg.tower.region.width,
  cleared: localStorage.getItem("tch.live.v1") === null,
  copy: window.__tch.state.copy.title,
}));
ok(
  "reset puts the preset back",
  afterReset.tiltZ === -10 && afterReset.width === 48 && afterReset.copy.startsWith("Make an impact"),
  JSON.stringify(afterReset)
);

// ── click-to-focus ───────────────────────────────────────────────────────
// The click goes where the renderer actually put a card, so this checks the
// picking too: the raycast has to agree with the projection, auto-frame's
// zoom and view offset included.
await wait(900);
const target = await page.evaluate(() => {
  const t = window.__tch.tower;
  const g = t.region;
  const cx = (innerWidth * (g.ndcX + 1)) / 2;
  const cy = (innerHeight * (1 - g.ndcY)) / 2;
  let best = null;
  for (let i = 0; i < t.itemCount; i++) {
    const p = t.screenOf(i);
    if (!p || !p.infront) continue;
    const d = Math.hypot(p.x - cx, p.y - cy);
    if (!best || d < best.d) best = { i, d, x: p.x, y: p.y };
  }
  return best;
});
ok("a card is on screen to click", !!target, JSON.stringify(target));
await page.mouse.click(Math.round(target.x), Math.round(target.y));
await wait(1700);
ok("click focuses a portrait", (await page.evaluate(() => window.__tch.tower.focused)) >= 0);
await page.screenshot({ path: `${OUT}/teach-03-focus.png` });
await page.keyboard.press("Escape");
await wait(1500);
ok("Esc releases the focus", (await page.evaluate(() => window.__tch.tower.focused)) === -1);

// ── C hides the chrome ───────────────────────────────────────────────────
await page.evaluate(() => window.__tch.setClean(true));
await wait(300);
const clean = await page.evaluate(() => ({
  clean: window.__tch.state.clean,
  panel: getComputedStyle(document.querySelector(".was-panel")).display,
  legend: getComputedStyle(document.querySelector(".tch-legend")).display,
}));
ok(
  "C hides the panel and the legend",
  clean.clean && clean.panel === "none" && clean.legend === "none",
  JSON.stringify(clean)
);
await page.screenshot({ path: `${OUT}/teach-04-clean.png` });
await page.evaluate(() => window.__tch.setClean(false));

// ── autosave survives a reload, panel included ───────────────────────────
// Tweakpane swallows the selection gestures a synthetic keyboard can make, so
// the field is committed the way the widget itself commits it: a real
// `change` event on its own input. Everything downstream of that is the
// production path.
await page.evaluate(() => {
  const el = [...document.querySelectorAll(".was-panel input.tp-txtv_i")][0];
  el.focus();
  el.value = "36";
  el.dispatchEvent(new Event("change", { bubbles: true }));
});
await wait(900);
const autosaved = await page.evaluate(() => {
  const live = JSON.parse(localStorage.getItem("tch.live.v1") || "null");
  return {
    wrote: !!live,
    saved: live && live.tower.region.width,
    live: window.__tch.cfg.tower.region.width,
  };
});
ok(
  "typing in the panel autosaves it",
  autosaved.wrote && autosaved.saved === 36 && autosaved.live === 36,
  JSON.stringify(autosaved)
);
await boot();
const afterReload = await page.evaluate(() => ({
  width: window.__tch.cfg.tower.region.width,
  restored: window.__tch.state.restored,
  regionW: window.__tch.state.region.w,
  cta: window.__tch.state.copy.cta,
  presets: window.__tch.state.presets,
}));
ok(
  "a reload restores the session with the copy intact",
  afterReload.width === 36 && afterReload.restored && afterReload.cta === "Become a teacher",
  JSON.stringify(afterReload)
);
ok("...and the saved presets are still there", afterReload.presets === 1, `n=${afterReload.presets}`);

// ── responsive ───────────────────────────────────────────────────────────
await page.setViewport({ width: 820, height: 900, deviceScaleFactor: 1 });
await wait(900);
const narrow = await page.evaluate(() => ({
  scrollW: document.documentElement.scrollWidth,
  clientW: document.documentElement.clientWidth,
  title: window.__tch.state.copy.title.length,
}));
ok("no horizontal spill at 820px", narrow.scrollW <= narrow.clientW + 1, JSON.stringify(narrow));
ok("the copy is still there when narrow", narrow.title > 10);
await page.screenshot({ path: `${OUT}/teach-05-narrow.png` });

ok("no console / page errors", errors.length === 0, errors.slice(0, 3).join(" ~ "));

await browser.close();

const failed = checks.filter((c) => !c.pass);
for (const c of checks) console.log(`${c.pass ? "ok  " : "FAIL"}  ${c.name}${c.detail ? "  — " + c.detail : ""}`);
console.log(`\n${checks.length - failed.length}/${checks.length} passed`);
if (errors.length) console.log("errors:\n" + errors.join("\n"));
process.exit(failed.length ? 1 : 0);
