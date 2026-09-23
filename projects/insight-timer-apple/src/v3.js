import { createBowl } from "./bowl.js";
import { TECHNIQUES, CATEGORIES } from "./data/techniques.js";
import {
  $, $$, clamp01,
  TEACHER_PHOTOS, EXPERIENCE_PHOTOS, PEOPLE_PHOTOS,
  TEAM, PARTNERS, teamPhoto, partnerPhoto, initials,
  mountNav, mountReveal, mountCounters, mountFooter, mountVersion, scrollLoop,
} from "./common.js";

// ─────────────────────────────────────────────────────────────────────────────
// Edition 3 — the bento. One fact per tile; the tiles arrive in a stagger
// and then keep their own small state (a count, a slow row of pills, three
// circles drawing, a face lighting up). The bowl lives in the first tile and
// leans as that tile passes.
// ─────────────────────────────────────────────────────────────────────────────

const navUpdate = mountNav();
mountReveal();
mountVersion(3);

// ── the bowl, in its tile ─────────────────────────────────────────────────
const bowlTile = $("#bowlTile");
const bowl = createBowl({ canvas: $("#bowl"), host: bowlTile, size: 0.74, lean: 12, shrink: 0.1, hover: true });
const tileQ = () => {
  // 0 while the tile's centre sits at or below 60% of the viewport, 1 once it
  // has risen to the top
  const r = bowlTile.getBoundingClientRect();
  return clamp01((innerHeight * 0.6 - (r.top + r.height / 2)) / (innerHeight * 0.6));
};

// ── photographs into the tiles that ask for one ───────────────────────────
const PHOTO = { teachers: TEACHER_PHOTOS, experiences: EXPERIENCE_PHOTOS, people: PEOPLE_PHOTOS };
$$("[data-photo]").forEach((t) => {
  const [set, idx] = t.dataset.photo.split(":");
  const list = PHOTO[set] || TEACHER_PHOTOS;
  $("img", t).src = list[Number(idx) || 0] || list[0];
});

// ── pills — one slow row ──────────────────────────────────────────────────
const pill = (name) => `<span class="pill">${name}<i>${TECHNIQUES[name].length}</i></span>`;
const half = Math.ceil(CATEGORIES.length / 2);
const rowA = CATEGORIES.slice(0, half).map(pill).join("");
const rowB = CATEGORIES.slice(half).map(pill).join("");
// each row twice, so the −50% loop is seamless
$("#pillRow").innerHTML = rowA + rowA;
$("#pillRowB").innerHTML = rowB + rowB;

// ── faces — the thirty, and six of them up in the teachers count tile ─────
const faces = $("#faces");
const facesCaption = $("#facesCaption");
const FACES_IDLE = "Hover a face.";
fetch("/teachers.json").then((r) => r.json()).then((list) => {
  const face = (t, i) => `<figure class="mini-face" tabindex="0" data-i="${i}" aria-label="${t.name}"><img src="/${t.img}" alt="" loading="eager" decoding="async" draggable="false"></figure>`;
  faces.innerHTML = list.slice(0, 30).map(face).join("");
  $("#miniFaces").innerHTML = list.slice(0, 6).map(face).join("");
  const caption = (i) => {
    const t = list[i];
    facesCaption.innerHTML = t ? `<b>${t.name}</b>${t.loc ? ` · ${t.loc}` : ""}${t.followers ? ` · ${t.followers} followers` : ""}` : FACES_IDLE;
  };
  faces.addEventListener("mouseover", (e) => { const f = e.target.closest(".mini-face"); if (f) caption(Number(f.dataset.i)); });
  faces.addEventListener("mouseleave", () => caption(-1));
  faces.addEventListener("focusin", (e) => { const f = e.target.closest(".mini-face"); if (f) caption(Number(f.dataset.i)); });
  faces.addEventListener("focusout", () => caption(-1));
}).catch(() => { faces.innerHTML = ""; });

// ── numbers develop as they count; people; footer ─────────────────────────
mountCounters(document, {
  duration: 1600,
  onTick: (el, e) => { el.style.fontVariationSettings = `"EXPO" ${(100 * (1 - e)).toFixed(1)}`; },
});
function people(el, list, photo) {
  el.innerHTML = list.map((p) => {
    const src = photo(p);
    return `<div class="person">
      ${src ? `<img src="${src}" alt="${p.name}" loading="lazy" decoding="async">` : `<div class="initials">${initials(p.name)}</div>`}
      <b>${p.name}</b>${p.role ? `<span>${p.role}</span>` : ""}
    </div>`;
  }).join("");
}
people($("#teamGrid"), TEAM, teamPhoto);
people($("#partnersGrid"), PARTNERS, partnerPhoto);
mountFooter();

// ── one scroll loop ───────────────────────────────────────────────────────
scrollLoop(() => {
  navUpdate();
  bowl.setScroll(tileQ());
});

// for a scripted check
window.__it = {
  bowl,
  edition: 3,
  get tileQ() { return tileQ(); },
  revealed: () => $$("[data-reveal].is-in").length,
  total: () => $$("[data-reveal]").length,
  tiles: () => $$(".tile3").length,
};
