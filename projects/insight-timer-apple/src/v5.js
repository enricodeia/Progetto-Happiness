import { createBowl } from "./bowl.js";
import { TECHNIQUES, CATEGORIES } from "./data/techniques.js";
import {
  $, $$, clamp01, reduce,
  EXPERIENCE_PHOTOS,
  TEAM, teamPhoto, initials,
  mountNav, mountReveal, mountCounters, mountFooter, mountVersion, scrollLoop, sectionQ, chapterFills,
} from "./common.js";

// ─────────────────────────────────────────────────────────────────────────────
// Edition 5 — the film. A sticky stage holds one full-frame photograph per
// scene; the scenes pass over it with their words bottom left. Which frame
// shows, how far it has drifted, how full each line of the index is — all
// pure functions of the scroll. The bowl appears once, at the end, on black.
// ─────────────────────────────────────────────────────────────────────────────

const navUpdate = mountNav();
mountReveal();
mountVersion(5);

// ── the frames ────────────────────────────────────────────────────────────
const stage = $("#stage");
const scenes = $$(".scene");
const frameIdx = scenes.map((s) => Number(s.dataset.frame));
const uniq = [...new Set(frameIdx.filter((i) => i >= 0))];
stage.innerHTML = uniq.map((i) => `<img class="frame" data-frame="${i}" src="${EXPERIENCE_PHOTOS[i] || EXPERIENCE_PHOTOS[0]}" alt="" decoding="async" ${i === frameIdx[0] ? 'loading="eager"' : ""}>`).join("") + '<div class="scrim"></div>';
const frames = new Map($$(".frame", stage).map((f) => [Number(f.dataset.frame), f]));
let activeScene = -1;
function showScene(i) {
  if (i === activeScene) return;
  activeScene = i;
  const want = frameIdx[i];
  frames.forEach((f, k) => f.classList.toggle("is-on", k === want));
}

// ── the index on the right edge ───────────────────────────────────────────
const steps = $$("#reelSteps li");

// ── people ────────────────────────────────────────────────────────────────
const strip = $("#strip");
const stripCap = $("#stripCap");
const STRIP_IDLE = stripCap.textContent;
fetch("/teachers.json").then((r) => r.json()).then((list) => {
  strip.innerHTML = list.slice(0, 10).map((t, i) => `<figure class="mini-face" tabindex="0" data-i="${i}" aria-label="${t.name}"><img src="/${t.img}" alt="" loading="eager" decoding="async" draggable="false"></figure>`).join("");
  const caption = (i) => {
    const t = list[i];
    stripCap.innerHTML = t ? `<b>${t.name}</b>${t.loc ? ` · ${t.loc}` : ""}${t.followers ? ` · ${t.followers} followers` : ""}` : STRIP_IDLE;
  };
  strip.addEventListener("mouseover", (e) => { const f = e.target.closest(".mini-face"); if (f) caption(Number(f.dataset.i)); });
  strip.addEventListener("mouseleave", () => caption(-1));
  strip.addEventListener("focusin", (e) => { const f = e.target.closest(".mini-face"); if (f) caption(Number(f.dataset.i)); });
  strip.addEventListener("focusout", () => caption(-1));
}).catch(() => { strip.innerHTML = ""; });

// ── ways — the twelve biggest categories, and how many more ──────────────
const top = [...CATEGORIES].sort((a, b) => TECHNIQUES[b].length - TECHNIQUES[a].length).slice(0, 12);
$("#pills").innerHTML = top.map((c) => `<span class="pill">${c}<i>${TECHNIQUES[c].length}</i></span>`).join("") + `<span class="more">and ${CATEGORIES.length - top.length} more categories</span>`;

// ── numbers, roster, footer ───────────────────────────────────────────────
mountCounters(document, {
  duration: 1600,
  onTick: (el, e) => { el.style.fontVariationSettings = `"EXPO" ${(100 * (1 - e)).toFixed(1)}`; },
});
$("#teamList").innerHTML = TEAM.map((p) => {
  const src = teamPhoto(p);
  return `<li>${src ? `<img src="${src}" alt="" loading="lazy" decoding="async">` : `<div class="initials">${initials(p.name)}</div>`}<div><b>${p.name}</b>${p.role ? `<span>${p.role}</span>` : ""}</div></li>`;
}).join("");
mountFooter();

// ── the bowl, once, at the end ────────────────────────────────────────────
const finalStage = $("#finalStage");
const finalScene = $("#close");
const bowl = createBowl({ canvas: $("#bowl"), host: finalStage, size: 0.8, exposure: 1.15, lean: 10, shrink: 0.08, hover: true });
const finalQ = () => {
  const r = finalScene.getBoundingClientRect();
  return clamp01(1 - r.top / innerHeight);
};

// ── one scroll loop ───────────────────────────────────────────────────────
scrollLoop(() => {
  navUpdate();
  const fills = chapterFills(scenes, 0.5);
  let cur = 0;
  for (let i = 0; i < fills.length; i++) {
    steps[i]?.style.setProperty("--f", fills[i].toFixed(3));
    if (fills[i] > 0) cur = i;
  }
  steps.forEach((li, k) => li.classList.toggle("is-on", k === cur));
  showScene(cur);
  // the active frame drifts a little as its scene is read
  const f = frames.get(frameIdx[cur]);
  if (f && !reduce) f.style.setProperty("--kb", (1 + 0.06 * fills[cur]).toFixed(4));
  bowl.setScroll(finalQ());
});

// for a scripted check
window.__it = {
  bowl,
  edition: 5,
  get scene() { return activeScene; },
  scenes: () => scenes.length,
  frames: () => frames.size,
  revealed: () => $$("[data-reveal].is-in").length,
  total: () => $$("[data-reveal]").length,
};
