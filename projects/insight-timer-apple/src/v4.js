import { createBowl } from "./bowl.js";
import { TECHNIQUES, CATEGORIES } from "./data/techniques.js";
import {
  $, $$, clamp01,
  TEAM, PARTNERS, teamPhoto, partnerPhoto, initials,
  mountNav, mountReveal, mountCounters, mountFooter, mountVersion, scrollLoop,
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
const bowl = createBowl({ canvas: $("#bowl"), host: pinStage, size: 0.72, lean: 26, shrink: 0.1 });
/** 0 at the top of the chapters, 1 when their end reaches the bottom */
const progress = () => {
  const r = chapters.getBoundingClientRect();
  return clamp01(-r.top / Math.max(1, r.height - innerHeight));
};

// ── which chapter is being read ───────────────────────────────────────────
const chs = $$(".ch");
const toc = $$("#toc li");
const pin = $("#pin");
let active = -1;
function activeChapter() {
  const line = innerHeight * 0.5;
  let cur = 0;
  for (let i = 0; i < chs.length; i++) if (chs[i].getBoundingClientRect().top <= line) cur = i;
  return cur;
}
function setActive(i) {
  if (i === active) return;
  active = i;
  toc.forEach((li, k) => li.classList.toggle("is-on", k === i));
  pin.dataset.ch = String(i);
}

// ── people — ten faces ────────────────────────────────────────────────────
const facesRow = $("#facesRow");
const facesCap = $("#facesCap");
const FACES_IDLE = facesCap.textContent;
fetch("/teachers.json").then((r) => r.json()).then((list) => {
  facesRow.innerHTML = list.slice(0, 10).map((t, i) => `<figure class="mini-face" tabindex="0" data-i="${i}" aria-label="${t.name}"><img src="/${t.img}" alt="" loading="eager" decoding="async" draggable="false"></figure>`).join("");
  const caption = (i) => {
    const t = list[i];
    facesCap.innerHTML = t ? `<b>${t.name}</b>${t.loc ? ` · ${t.loc}` : ""}${t.followers ? ` · ${t.followers} followers` : ""}` : FACES_IDLE;
  };
  facesRow.addEventListener("mouseover", (e) => { const f = e.target.closest(".mini-face"); if (f) caption(Number(f.dataset.i)); });
  facesRow.addEventListener("mouseleave", () => caption(-1));
  facesRow.addEventListener("focusin", (e) => { const f = e.target.closest(".mini-face"); if (f) caption(Number(f.dataset.i)); });
  facesRow.addEventListener("focusout", () => caption(-1));
}).catch(() => { facesRow.innerHTML = ""; });

// ── ways — the whole directory as one running index ───────────────────────
$("#runindex").innerHTML = CATEGORIES.map((c) => `<span>${c}<i>${TECHNIQUES[c].length}</i></span>`).join(" ");

// ── numbers develop as they count; the roster; the footer ─────────────────
mountCounters(document, {
  duration: 1600,
  onTick: (el, e) => { el.style.fontVariationSettings = `"EXPO" ${(100 * (1 - e)).toFixed(1)}`; },
});
function roster(el, list, photo) {
  el.innerHTML = list.map((p) => {
    const src = photo(p);
    return `<li>
      ${src ? `<img src="${src}" alt="" loading="lazy" decoding="async">` : `<div class="initials">${initials(p.name)}</div>`}
      <div><b>${p.name}</b>${p.role ? `<span>${p.role}</span>` : ""}</div>
    </li>`;
  }).join("");
}
roster($("#teamList"), TEAM, teamPhoto);
roster($("#partnerList"), PARTNERS, partnerPhoto);
mountFooter();

// ── one scroll loop ───────────────────────────────────────────────────────
scrollLoop(() => {
  navUpdate();
  const p = progress();
  bowl.setScroll(p);                       // the lean and the slight settle
  bowl.setTurn(p * Math.PI * 1.5);         // a three-quarter turn over the read
  bowl.setExposure(0.92 + 0.38 * p);       // more light on the metal, chapter by chapter
  // the ground follows: the bowl rises 6% of the stage and settles to 90%
  const H = pinStage.clientHeight;
  pinStage.style.setProperty("--gy", `${(-0.06 * H * p).toFixed(1)}px`);
  pinStage.style.setProperty("--gs", (1 - 0.1 * p).toFixed(3));
  pinStage.style.setProperty("--go", (1 - 0.25 * p).toFixed(3));
  setActive(activeChapter());
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
