import { createBowl } from "./bowl.js";
import { TECHNIQUES, CATEGORIES } from "./data/techniques.js";
import {
  $, $$, clamp01,
  TEACHER_PHOTOS, EXPERIENCE_PHOTOS, PEOPLE_PHOTOS,
  TEAM, PARTNERS, teamPhoto, partnerPhoto, initials,
  mountNav, mountReveal, mountCounters, mountFooter, mountVersion, scrollLoop, chapterFills,
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

// ── people ────────────────────────────────────────────────────────────────
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
    return `<li>${src ? `<img src="${src}" alt="" loading="lazy" decoding="async">` : `<div class="initials">${initials(p.name)}</div>`}<div><b>${p.name}</b>${p.role ? `<span>${p.role}</span>` : ""}</div></li>`;
  }).join("");
}
roster($("#teamList"), TEAM, teamPhoto);
roster($("#partnerList"), PARTNERS, partnerPhoto);
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
