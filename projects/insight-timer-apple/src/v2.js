import { createBowl } from "./bowl.js";
import { TECHNIQUES, CATEGORIES } from "./data/techniques.js";
import {
  $, $$, clamp01, reduce,
  TEACHER_PHOTOS, EXPERIENCE_PHOTOS, PEOPLE_PHOTOS,
  TEAM, PARTNERS, teamPhoto, partnerPhoto, initials,
  mountNav, mountReveal, mountCounters, mountFooter, mountVersion, scrollLoop, sectionQ,
} from "./common.js";

// ─────────────────────────────────────────────────────────────────────────────
// Edition 2 — the exposure. Same content, same data, a different grammar:
// black page, Exposure for the titles, and its EXPO axis as the one motion.
// Three things are pure functions of the scroll — the bowl's lean, the
// manifesto developing word by word, the three circles drawing themselves.
// The rest is stamped once and revealed on entry.
// ─────────────────────────────────────────────────────────────────────────────

const navUpdate = mountNav();
mountReveal();
mountVersion(2);

// ── the bowl — a touch more exposure on the metal, a gentler lean ─────────
const heroStage = $("#heroStage");
const bowl = createBowl({ canvas: $("#bowl"), host: heroStage, size: 0.86, exposure: 1.18, lean: 10, shrink: 0.14 });
const heroQ = () => {
  const r = heroStage.getBoundingClientRect();
  return clamp01(-r.top / Math.max(1, r.height * 0.8));
};

// ── manifesto — every word over-exposed, developing as you scroll ─────────
const manifesto = $("#statement");
const manText = $("#manifesto");
manText.innerHTML = manText.textContent.trim().split(/\s+/).map((w) => `<span class="w">${w}</span>`).join(" ");
const WORDS = $$(".w", manText);
const OVERLAP = 10;   // how many words are mid-development at once
function develop(q) {
  // the whole run happens between 6% and 86% of the chapter — the rest is
  // room to read it fully developed before it leaves
  const t = clamp01((q - 0.06) / 0.8) * (WORDS.length + OVERLAP);
  for (let i = 0; i < WORDS.length; i++) {
    const l = clamp01((t - i) / OVERLAP);
    const w = WORDS[i];
    w.style.opacity = (0.16 + 0.84 * l).toFixed(3);
    w.style.fontVariationSettings = `"EXPO" ${(100 * (1 - l)).toFixed(1)}`;
  }
}

// ── three ways in — one photograph each ───────────────────────────────────
const PHOTO = { teachers: TEACHER_PHOTOS, experiences: EXPERIENCE_PHOTOS, people: PEOPLE_PHOTOS };
$$(".way").forEach((w) => {
  const [set, idx] = (w.dataset.photo || "teachers:0").split(":");
  const list = PHOTO[set] || TEACHER_PHOTOS;
  $("img", w).src = list[Number(idx) || 0] || list[0];
});

// ── the wall — thirty faces, black and white until you reach for one ─────
const wall = $("#wall");
const wallCaption = $("#wallCaption");
const WALL_IDLE = "The thirty most followed. Hover a face.";
fetch("/teachers.json").then((r) => r.json()).then((list) => {
  wall.innerHTML = list.slice(0, 30).map((t, i) => `
    <figure class="face" tabindex="0" data-i="${i}" aria-label="${t.name}">
      <img src="/${t.img}" alt="" loading="lazy" decoding="async" draggable="false">
    </figure>`).join("");
  const caption = (i) => {
    const t = list[i];
    if (!t) { wallCaption.textContent = WALL_IDLE; return; }
    wallCaption.innerHTML = `<b>${t.name}</b>${t.loc ? ` · ${t.loc}` : ""}${t.followers ? ` · ${t.followers} followers` : ""}`;
  };
  wallCaption.textContent = WALL_IDLE;
  wall.addEventListener("mouseover", (e) => { const f = e.target.closest(".face"); if (f) caption(Number(f.dataset.i)); });
  wall.addEventListener("mouseleave", () => caption(-1));
  wall.addEventListener("focusin", (e) => { const f = e.target.closest(".face"); if (f) caption(Number(f.dataset.i)); });
  wall.addEventListener("focusout", () => caption(-1));
}).catch(() => { wall.innerHTML = ""; });

// ── the index — every category, its count, and what is inside ────────────
const indexList = $("#indexList");
const indexPreview = $("#indexPreview");
const INDEX_IDLE = indexPreview.innerHTML;
indexList.innerHTML = CATEGORIES.map((c) => `<li data-c="${c}"><span>${c}</span><b>${TECHNIQUES[c].length}</b></li>`).join("");
let indexOn = null;
function preview(c) {
  if (indexOn) indexOn.classList.remove("is-on");
  indexOn = c ? $(`li[data-c="${c.replace(/"/g, '\\"')}"]`, indexList) : null;
  if (!c) { indexPreview.innerHTML = INDEX_IDLE; return; }
  indexOn?.classList.add("is-on");
  const names = TECHNIQUES[c].map((t) => (typeof t === "string" ? t : t.name || t.title || String(t)));
  const shown = names.slice(0, 6);
  const more = names.length - shown.length;
  indexPreview.innerHTML = `<b>${c}.</b> ${shown.join(", ")}${more > 0 ? ` and ${more} more.` : "."}`;
}
indexList.addEventListener("mouseover", (e) => { const li = e.target.closest("li"); if (li) preview(li.dataset.c); });
indexList.addEventListener("mouseleave", () => preview(null));

// ── the science — three circles, drawn one after the other by the scroll ──
const science = $("#evidence");
const circles = $$(".trio2 circle");
const labels = $$(".trio2 text");
const sources = $$(".sources li");
function draw(q) {
  for (let i = 0; i < circles.length; i++) {
    const l = clamp01((q - (0.06 + i * 0.27)) / 0.25);
    circles[i].style.strokeDashoffset = String(1 - l);
    labels[i]?.classList.toggle("is-on", l > 0.92);
    sources[i]?.classList.toggle("is-on", l > 0.5);
  }
}

// ── the numbers develop as they count; the people; the footer ─────────────
mountCounters(document, {
  duration: 1600,
  onTick: (el, e) => { el.style.fontVariationSettings = `"EXPO" ${(100 * (1 - e)).toFixed(1)}`; },
});
function roster(el, list, photo) {
  el.innerHTML = list.map((p) => {
    const src = photo(p);
    return `<li>
      ${src ? `<img src="${src}" alt="" loading="lazy" decoding="async">` : `<div class="initials">${initials(p.name)}</div>`}
      <b>${p.name}</b><span>${p.role || ""}</span>
    </li>`;
  }).join("");
}
roster($("#teamList"), TEAM, teamPhoto);
roster($("#partnerList"), PARTNERS, partnerPhoto);
mountFooter();

// ── one scroll loop ───────────────────────────────────────────────────────
if (reduce) { develop(1); draw(1); }
scrollLoop(() => {
  navUpdate();
  bowl.setScroll(heroQ());
  if (!reduce) {
    develop(sectionQ(manifesto));
    draw(sectionQ(science));
  }
});

// for a scripted check
window.__it = {
  bowl,
  edition: 2,
  get heroQ() { return heroQ(); },
  get manifestoQ() { return sectionQ(manifesto); },
  get scienceQ() { return sectionQ(science); },
  developed: () => WORDS.filter((w) => parseFloat(w.style.opacity) > 0.99).length,
  words: () => WORDS.length,
  drawn: () => circles.filter((c) => parseFloat(c.style.strokeDashoffset) < 0.01).length,
  revealed: () => $$("[data-reveal].is-in").length,
  total: () => $$("[data-reveal]").length,
  preview,
};
