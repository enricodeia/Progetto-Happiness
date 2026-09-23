import { createBowl } from "./bowl.js";
import { TECHNIQUES, CATEGORIES } from "./data/techniques.js";
import {
  $, $$, clamp01, reduce,
  TEACHER_PHOTOS, EXPERIENCE_PHOTOS, PEOPLE_PHOTOS,
  TEAM, PARTNERS, teamPhoto, partnerPhoto, initials,
  mountNav, mountReveal, mountCounters, mountFooter, mountVersion, scrollLoop, sectionQ,
} from "./common.js";

// ─────────────────────────────────────────────────────────────────────────────
// Edition 1 — the white page. Static content stamped once from the data
// files, plus three states that are pure functions of the scroll position:
// the bowl's lean, the sticky chapter's active step (and the drift of its
// photo columns), the nav's active link.
// ─────────────────────────────────────────────────────────────────────────────

const navUpdate = mountNav();
mountReveal();
mountVersion(1);

// ── the bowl ─────────────────────────────────────────────────────────────
const heroStage = $("#heroStage");
const bowl = createBowl({ canvas: $("#bowl"), host: heroStage, size: 0.82, hover: true });
function heroQ() {
  const r = heroStage.getBoundingClientRect();
  // 0 until the stage's top reaches the top of the viewport, 1 once most of
  // it has scrolled past — a pure function of where the stage is
  return clamp01(-r.top / Math.max(1, r.height * 0.8));
}

// ── the sticky chapter: three steps, one visual each ─────────────────────
const guided = $("#guided");
const guidedVisual = $(".guided-visual");
const steps = $$(".guided-step");
const dots = $$(".guided-dots li");
const layers = $$(".mosaic");
let activeStep = -1;
function setStep(i) {
  if (i === activeStep) return;
  activeStep = i;
  steps.forEach((s, k) => s.classList.toggle("is-active", k === i));
  dots.forEach((d, k) => d.classList.toggle("is-active", k === i));
  layers.forEach((l, k) => l.classList.toggle("is-active", k === i));
}
function mosaic(el, list, n = 6) {
  el.innerHTML = list.slice(0, n).map((src, i) => `<img src="${src}" alt="" loading="${i < 3 ? "eager" : "lazy"}" decoding="async">`).join("");
}
mosaic($("#mosaicTeachers"), TEACHER_PHOTOS);
mosaic($("#mosaicExperiences"), EXPERIENCE_PHOTOS);
mosaic($("#mosaicPeople"), PEOPLE_PHOTOS);

// ── teachers rail — the real thirty, with their photographs ───────────────
const rail = $("#teacherRail");
const [prevBtn, nextBtn] = $$(".rail-btn");
function railEnds() {
  const max = rail.scrollWidth - rail.clientWidth;
  prevBtn.disabled = rail.scrollLeft <= 2;
  nextBtn.disabled = rail.scrollLeft >= max - 2;
}
fetch("/teachers.json").then((r) => r.json()).then((list) => {
  rail.innerHTML = list.slice(0, 18).map((t) => `
    <article class="card">
      <img src="/${t.img}" alt="${t.name}" loading="lazy" decoding="async" draggable="false">
      <div class="card-body">
        <b>${t.name}</b>
        <span>${t.loc || ""}</span>
        ${t.followers ? `<em>${t.followers} followers</em>` : ""}
      </div>
    </article>`).join("");
  railEnds();
}).catch(() => { rail.innerHTML = ""; });
rail.addEventListener("scroll", railEnds, { passive: true });
$$(".rail-btn").forEach((b) => b.addEventListener("click", () => {
  const dir = Number(b.dataset.dir);
  rail.scrollBy({ left: dir * (320 * 2), behavior: reduce ? "auto" : "smooth" });
}));
// a mouse can also just grab the rail; the snap takes over again on release
let drag = null;
rail.addEventListener("pointerdown", (e) => {
  if (e.pointerType !== "mouse" || e.button !== 0) return;
  drag = { x: e.clientX, left: rail.scrollLeft, moved: false };
  rail.setPointerCapture(e.pointerId);
});
rail.addEventListener("pointermove", (e) => {
  if (!drag) return;
  const dx = e.clientX - drag.x;
  if (!drag.moved && Math.abs(dx) > 4) { drag.moved = true; rail.classList.add("is-dragging"); }
  if (drag.moved) rail.scrollLeft = drag.left - dx;
});
const endDrag = () => {
  if (!drag) return;
  drag = null;
  requestAnimationFrame(() => rail.classList.remove("is-dragging"));
};
rail.addEventListener("pointerup", endDrag);
rail.addEventListener("pointercancel", endDrag);

// ── techniques marquee — the real directory, category by category ─────────
const pill = (name) => `<span class="pill">${name}<i>${TECHNIQUES[name].length}</i></span>`;
const half = Math.ceil(CATEGORIES.length / 2);
const rowA = CATEGORIES.slice(0, half).map(pill).join("");
const rowB = CATEGORIES.slice(half).map(pill).join("");
// each row twice, so the −50% loop is seamless
$('[data-row="0"]').innerHTML = rowA + rowA;
$('[data-row="1"]').innerHTML = rowB + rowB;

// ── the numbers, the people, the footer ───────────────────────────────────
mountCounters();
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

// ── one scroll loop for the scroll-driven states ──────────────────────────
scrollLoop(() => {
  navUpdate();
  bowl.setScroll(heroQ());
  const q = sectionQ(guided);
  setStep(q < 1 / 3 ? 0 : q < 2 / 3 ? 1 : 2);
  // the photo columns drift a few pixels against each other across the chapter
  guidedVisual.style.setProperty("--py", `${((q - 0.5) * -56).toFixed(1)}px`);
});

// for a scripted check
window.__it = {
  bowl,
  edition: 1,
  get step() { return activeStep; },
  get heroQ() { return heroQ(); },
  get guidedQ() { return sectionQ(guided); },
  revealed: () => $$("[data-reveal].is-in").length,
  total: () => $$("[data-reveal]").length,
};
