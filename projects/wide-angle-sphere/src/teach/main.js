import "../style.css";
import "./teach.css";
import { createReveal } from "../reveal.js";
import { CONFIG } from "../config.js";
import { cfg, DEFAULTS } from "./config.js";
import { createTower } from "./tower.js";
import { createTeachPanel } from "./panel.js";
import { loadLive, makeAutosave, clearLive, applyInto, sanitize } from "./store.js";

/**
 * /teach — the Insight Timer teacher hero.
 *
 * One screen, nothing scrolls. The WebGL canvas is the WHOLE viewport; the
 * carousel is composed into `cfg.tower.region` (the left half on desktop, the
 * centre of the screen on mobile) but never clipped by it. The copy sits on
 * the right, above the canvas, and keeps its own clicks.
 *
 * The nav furniture, the paper palette, Exposure and the type reveal are all
 * the main page's — imported, not re-implemented.
 *
 * ── Nothing here is lost, and nothing can wipe the page ──────────────────
 * The live config is autosaved to localStorage on every panel change and
 * restored on boot, so a reload costs nothing. It is `sanitize`d on the way
 * in: a config saved with blank copy used to wipe the page and then restore
 * that blank state on every reload afterwards. Blank text now falls back to
 * the default, and hiding a block is a `show*` toggle you can see and undo.
 */

const ICON_SEARCH = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M20 20l-4.6-4.6"/></svg>`;
const ICON_BOOK = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 6.5C10.6 5.2 8.8 4.6 6.4 4.6c-1 0-1.8.1-2.4.2v13c.6-.1 1.4-.2 2.4-.2 2.4 0 4.2.6 5.6 1.9"/><path d="M12 6.5c1.4-1.3 3.2-1.9 5.6-1.9 1 0 1.8.1 2.4.2v13c-.6-.1-1.4-.2-2.4-.2-2.4 0-4.2.6-5.6 1.9z"/></svg>`;

const $ = (sel) => document.querySelector(sel);

// ── restore the working state BEFORE anything reads the config ────────────
const restored = loadLive(cfg, DEFAULTS);
const autosave = makeAutosave(cfg);

// ── the page shell ────────────────────────────────────────────────────────
const nav = $("#nav");
const stage = $("#stage");
const copy = $("#copy");

function buildNav() {
  const n = cfg.nav;
  nav.hidden = !n.show;
  const links = String(n.links || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => `<button class="tch-link" type="button">${s}</button>`)
    .join("");
  nav.innerHTML = `
    <a class="was-logo" href="/">${n.logo}</a>
    <nav class="tch-links">${links}</nav>
    <button class="tch-pill" type="button">${ICON_BOOK}<span>${n.pill}</span></button>
    <label class="was-search">
      ${ICON_SEARCH}
      <input type="text" placeholder="${n.search}" aria-label="${n.search}" />
      <img class="was-search-bowl" src="/images/bowl.png" alt="" />
    </label>
    <button class="was-cta" type="button">${n.cta}</button>`;
}

copy.innerHTML = `
  <h1 class="tch-title"></h1>
  <p class="tch-para"></p>
  <button class="tch-cta" type="button"></button>`;
const titleEl = copy.querySelector(".tch-title");
const paraEl = copy.querySelector(".tch-para");
const ctaEl = copy.querySelector(".tch-cta");

// `createReveal` reads its timing off the main page's CONFIG (`intro`/`text`)
// — the same type behaviour as the rest of the project, not a second dialect.
let title = null;
let para = null;

function buildCopy() {
  sanitize(cfg, DEFAULTS);
  ctaEl.textContent = cfg.hero.cta;
  titleEl.hidden = !cfg.hero.showTitle;
  paraEl.hidden = !cfg.hero.showPara;
  ctaEl.hidden = !cfg.hero.showCta;
  title = createReveal({ el: titleEl, text: cfg.hero.title, mode: "lines", cfg: CONFIG });
  para = createReveal({ el: paraEl, text: cfg.hero.para, mode: "lines", cfg: CONFIG });
}

/** The copy at rest — built, landed, no animation. `buildCopy` leaves the
 *  reveal at frame 0 (i.e. hidden), so anything that rebuilds it without
 *  replaying has to land it explicitly or the type never shows up. */
function restCopy() {
  title.set(1);
  para.set(1);
  ctaEl.style.transition = "none";
  ctaEl.style.opacity = "1";
  ctaEl.style.transform = "none";
}

function playCopy() {
  if (!cfg.hero.reveal) {
    restCopy();
    return;
  }
  title.reset();
  para.reset();
  ctaEl.style.transition = "none";
  ctaEl.style.opacity = "0";
  ctaEl.style.transform = "translateY(14px)";
  title.play({ duration: 1.5, delay: 0.15, ease: "expo.out" });
  para.play({ duration: 1.2, delay: 0.5, ease: "expo.out" });
  requestAnimationFrame(() => {
    ctaEl.style.transition =
      "opacity .7s ease .95s, transform .9s cubic-bezier(.16,1,.3,1) .95s";
    ctaEl.style.opacity = "1";
    ctaEl.style.transform = "none";
  });
}

// ── css variables the panel writes through ────────────────────────────────
function applyStyle() {
  const r = document.documentElement.style;
  r.setProperty("--tch-x", `${cfg.hero.x}vw`);
  r.setProperty("--tch-w", `${cfg.hero.width}vw`);
  r.setProperty("--tch-y", `${cfg.hero.y}%`);
  r.setProperty("--tch-title-size", `${cfg.hero.titleSize}vw`);
  r.setProperty("--tch-title-lh", String(cfg.hero.titleLh));
  r.setProperty("--tch-para-size", `${cfg.hero.paraSize}vw`);
  r.setProperty("--tch-cta", cfg.hero.ctaBg);
  r.setProperty("--page-bg", cfg.page.bg);
  r.setProperty("--left-ink", cfg.page.ink);
}

// ── boot ──────────────────────────────────────────────────────────────────
document.body.classList.add("tch");
buildNav();
buildCopy();
applyStyle();

const tower = createTower({ mount: stage, cfg: cfg.tower });
playCopy();

// A one-line confirmation, so loading and saving are visibly acknowledged.
const toast = document.createElement("div");
toast.className = "tch-toast";
document.body.appendChild(toast);
let toastT = null;
function notify(msg) {
  toast.textContent = msg;
  toast.classList.add("is-on");
  clearTimeout(toastT);
  toastT = setTimeout(() => toast.classList.remove("is-on"), 1800);
}

// Everything the config can touch, re-applied from whatever it now holds.
// `rebuild` is the expensive half (it tears the WebGL scene down), so the
// panel calls only the parts it needs; loading a preset calls all of them.
function applyAll({ replay = false } = {}) {
  sanitize(cfg, DEFAULTS);
  applyStyle();
  buildNav();
  buildCopy();
  tower.rebuild();
  tower.applyLook();
  panel.refresh();
  if (replay) playCopy();
  else restCopy();
  autosave();
}

// A webkit library preset carries only the carousel. `region` is deliberately
// absent from those entries, so `applyInto` leaves it alone and the
// composition stays where you put it while you flip through the shapes.
function applyLibrary(towerConfig) {
  applyInto(cfg.tower, towerConfig);
  applyAll();
}

// One of your own: a whole page config, region and copy included.
function applyPreset(saved) {
  applyInto(cfg, saved);
  applyAll();
}

const panel = createTeachPanel({
  cfg,
  onChange: autosave,
  onNotify: notify,
  onApplyLibrary: applyLibrary,
  onApplyPreset: applyPreset,
  onStyle: () => {
    applyStyle();
    autosave();
  },
  onRebuild: () => {
    tower.rebuild();
    autosave();
  },
  onLook: () => {
    tower.applyLook();
    autosave();
  },
  onNav: () => {
    buildNav();
    autosave();
  },
  onCopy: () => {
    buildCopy();
    applyStyle();
    playCopy();
    autosave();
  },
  onReset: () => {
    applyInto(cfg, DEFAULTS);
    clearLive();
    applyAll({ replay: true });
    notify("back to the Tower of Pisa");
  },
});

// ── keys ──────────────────────────────────────────────────────────────────
// `C` hides the panel — the same gesture as the main page.
let clean = false;
function setClean(v) {
  clean = !!v;
  document.body.classList.toggle("is-clean", clean);
  if (clean) panel.hide();
  else panel.show();
}
window.addEventListener("keydown", (e) => {
  if (e.target instanceof HTMLInputElement || e.metaKey || e.ctrlKey) return;
  const k = e.key.toLowerCase();
  if (k === "c") setClean(!clean);
  if (k === "p") (panel.visible ? panel.hide : panel.show)();
  // [ and ] walk the whole webkit library — the fastest way to see all 19
  if (e.key === "[") panel.stepLibrary(-1);
  if (e.key === "]") panel.stepLibrary(1);
});

if (restored) notify("restored your last session");

// the handle the puppeteer pass drives
window.__tch = {
  cfg,
  tower,
  panel,
  setClean,
  applyAll,
  applyLibrary,
  applyPreset,
  replay: playCopy,
  get state() {
    return {
      cards: tower.itemCount,
      focused: tower.focused,
      clean,
      restored,
      presets: panel.saved.length,
      library: panel.library.length,
      current: panel.current,
      region: tower.region,
      canvas: {
        w: document.querySelector(".tch-canvas").clientWidth,
        h: document.querySelector(".tch-canvas").clientHeight,
      },
      copy: {
        title: titleEl.innerText.replace(/\s+/g, " ").trim(),
        para: paraEl.innerText.replace(/\s+/g, " ").trim(),
        cta: ctaEl.textContent.trim(),
        shown: {
          title: !titleEl.hidden,
          para: !paraEl.hidden,
          cta: !ctaEl.hidden,
        },
      },
    };
  },
};
