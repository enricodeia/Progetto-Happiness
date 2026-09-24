import { createBowl } from "./bowl.js";
import {
  $, $$, clamp01,
  TEACHER_PHOTOS, EXPERIENCE_PHOTOS, PEOPLE_PHOTOS,
  TEAM, PARTNERS,
  mountNav, mountReveal, mountCounters, mountFooter, mountVersion, scrollLoop, chapterFills,
  waysSentence, mountByline, masthead, partnersLine,
} from "./common.js";

// ─────────────────────────────────────────────────────────────────────────────
// Edition 5 — the book. A contents page, a frontispiece, seven spreads and
// a colophon. Almost nothing moves: things reveal as they arrive, the
// leaders of the contents draw once, the numbers count once, the bowl turns
// slowly and leans with the frontispiece. The folio at the bottom is the
// one state read off the scroll.
// ─────────────────────────────────────────────────────────────────────────────

const navUpdate = mountNav();
mountReveal();
mountVersion(5);

// ── plates ────────────────────────────────────────────────────────────────
const PHOTO = { teachers: TEACHER_PHOTOS, experiences: EXPERIENCE_PHOTOS, people: PEOPLE_PHOTOS };
const plateSrc = (key) => {
  const [set, idx] = String(key || "experiences:0").split(":");
  const list = PHOTO[set] || EXPERIENCE_PHOTOS;
  return list[Number(idx) || 0] || list[0];
};
$$("figure.plate[data-plate]").forEach((f) => { $("img", f).src = plateSrc(f.dataset.plate); });

// ── contents: a plate previews at the right while a line is hovered ───────
const preview = $("#tocPreview");
const previewImg = $("img", preview);
const toc = $("#toc");
toc.addEventListener("mouseover", (e) => {
  const a = e.target.closest("a[data-plate]");
  if (!a) return;
  const src = plateSrc(a.dataset.plate);
  if (previewImg.src !== src) previewImg.src = src;
  preview.classList.add("is-on");
});
toc.addEventListener("mouseleave", () => preview.classList.remove("is-on"));

// ── frontispiece ──────────────────────────────────────────────────────────
const band = $("#band");
const bowl = createBowl({ canvas: $("#bowl"), host: band, size: 0.78, lean: 12, shrink: 0.1, hover: true });
const bandQ = () => {
  const r = band.getBoundingClientRect();
  return clamp01(-r.top / Math.max(1, r.height));
};

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

// ── the folio — which page you are on ─────────────────────────────────────
const pages = [$("#contents"), $("#frontis"), ...$$(".spread"), $("#close")];
const titles = ["Contents", "Practice", "Wisdom", "People", "Ways", "Science", "Numbers", "Team", "Everybody"];
const folioN = $("#folioN"), folioT = $("#folioT");
let page = -1;
function updateFolio() {
  const fills = chapterFills(pages, 0.5);
  let cur = 0;
  for (let i = 0; i < fills.length; i++) if (fills[i] > 0) cur = i;
  if (cur === page) return;
  page = cur;
  // contents and frontispiece are both page 00
  folioN.textContent = String(Math.max(0, cur - 1)).padStart(2, "0");
  folioT.textContent = titles[cur] || "";
}

// ── one scroll loop ───────────────────────────────────────────────────────
scrollLoop(() => {
  navUpdate();
  bowl.setScroll(bandQ());
  updateFolio();
});

// for a scripted check
window.__it = {
  bowl,
  edition: 5,
  get page() { return page; },
  pages: () => pages.length,
  revealed: () => $$("[data-reveal].is-in").length,
  total: () => $$("[data-reveal]").length,
};
