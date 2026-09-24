import { createBowl } from "./bowl.js";
import {
  $, $$, clamp01,
  TEAM, PARTNERS,
  mountNav, mountReveal, mountCounters, mountFooter, mountVersion, scrollLoop, chapterFills,
  waysSentence, mountByline, masthead, partnersLine,
} from "./common.js";

// ─────────────────────────────────────────────────────────────────────────────
// Edition 4 — the object. The bowl stays pinned on the left for the whole
// read; the chapters pass on the right. Everything the object does — a
// three-quarter turn, a lean that shows more of the inside, more light on
// the metal — is a pure function of how far down the chapters you are.
// ─────────────────────────────────────────────────────────────────────────────

const navUpdate = mountNav();
mountReveal();
mountVersion(4);

// ── the object ────────────────────────────────────────────────────────────
const pinStage = $("#pinStage");
const chapters = $("#chapters");
const bowl = createBowl({ canvas: $("#bowl"), host: pinStage, size: 0.6, lean: 14, shrink: 0.08, hover: true, hoverAmount: 0.7, reveal: true, wireAlpha: 0.26, revealRadius: 150 });
/** 0 at the top of the chapters, 1 when their end reaches the bottom */
const progress = () => {
  const r = chapters.getBoundingClientRect();
  return clamp01(-r.top / Math.max(1, r.height - innerHeight));
};

// ── the chapter index: one line per chapter, filling as it is read ───────
const chs = $$(".ch");
const steps = $$("#steps li");
const stepNum = $("#stepNum"), stepTitle = $("#stepTitle");
const pin = $("#pin");
let active = -1;
function updateSteps() {
  const fills = chapterFills(chs, 0.5);
  let cur = 0;
  for (let i = 0; i < fills.length; i++) {
    steps[i]?.style.setProperty("--f", fills[i].toFixed(3));
    if (fills[i] > 0) cur = i;
  }
  if (cur !== active) {
    active = cur;
    steps.forEach((li, k) => li.classList.toggle("is-on", k === cur));
    const n = String(cur).padStart(2, "0");
    stepNum.textContent = n;
    stepTitle.textContent = steps[cur]?.dataset.t || "";
    pin.dataset.ch = String(cur);
  }
}

// ── people, ways: a byline and a sentence ────────────────────────────────
mountByline($("#byline"));
$("#ways").innerHTML = waysSentence(10);

// ── numbers develop as they count; the roster; the footer ─────────────────
mountCounters(document, {
  duration: 1600,
  onTick: (el, e) => { el.style.fontVariationSettings = `"EXPO" ${(100 * (1 - e)).toFixed(1)}`; },
});
masthead($("#masthead"), TEAM);
partnersLine($("#partners"), PARTNERS);
mountFooter();

// ── one scroll loop ───────────────────────────────────────────────────────
scrollLoop(() => {
  navUpdate();
  const p = progress();
  bowl.setScroll(p);                       // the lean and the slight settle
  bowl.setTurn(p * Math.PI);               // a half turn over the read
  bowl.setExposure(0.95 + 0.25 * p);       // a little more light on the metal, chapter by chapter
  // the ground follows: the bowl rises 6% of the stage and settles to 90%
  const H = pinStage.clientHeight;
  pinStage.style.setProperty("--gy", `${(-0.06 * H * p).toFixed(1)}px`);
  pinStage.style.setProperty("--gs", (1 - 0.08 * p).toFixed(3));
  pinStage.style.setProperty("--go", (1 - 0.2 * p).toFixed(3));
  updateSteps();
});

// for a scripted check
window.__it = {
  bowl,
  edition: 4,
  get progress() { return progress(); },
  get chapter() { return active; },
  chapters: () => chs.length,
  revealed: () => $$("[data-reveal].is-in").length,
  total: () => $$("[data-reveal]").length,
};
