import { createBowl } from "./bowl.js";
import { TEAM } from "./data/team.js";
import { PARTNERS } from "./data/partners.js";
import { TECHNIQUES, CATEGORIES } from "./data/techniques.js";
import logoSvg from "./assets/insight-timer-logo.svg?raw";

// ─────────────────────────────────────────────────────────────────────────────
// The page, in the order it reads. Everything below is either static content
// stamped once from the data files, or a state that is a pure function of the
// scroll position — the reveal observer, the sticky chapter's active step,
// the bowl's lean. Nothing owns a timeline.
// ─────────────────────────────────────────────────────────────────────────────

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

// ── nav ──────────────────────────────────────────────────────────────────
$(".nav-logo").innerHTML = logoSvg.replace(/fill="[^"]*"/g, 'fill="currentColor"');
const nav = $("#nav");
const onScrollNav = () => nav.classList.toggle("is-scrolled", scrollY > 8);
addEventListener("scroll", onScrollNav, { passive: true });
onScrollNav();

// ── reveal on enter ──────────────────────────────────────────────────────
const io = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
  }
}, { rootMargin: "0px 0px -12% 0px", threshold: 0.05 });
$$("[data-reveal]").forEach((el) => io.observe(el));

// ── the bowl ─────────────────────────────────────────────────────────────
const heroStage = $("#heroStage");
const bowl = createBowl({ canvas: $("#bowl"), host: heroStage, size: 0.82 });
function heroQ() {
  const r = heroStage.getBoundingClientRect();
  // 0 until the stage's top reaches the top of the viewport, 1 once most of
  // it has scrolled past — a pure function of where the stage is
  return clamp01(-r.top / Math.max(1, r.height * 0.8));
}

// ── the sticky chapter: three steps, one visual each ─────────────────────
const guided = $("#guided");
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
function guidedQ() {
  const r = guided.getBoundingClientRect();
  const span = Math.max(1, r.height - innerHeight);
  return clamp01(-r.top / span);
}

// the photographs: three sets, one per step. Vite's glob keeps them as URLs.
const files = (g) => Object.keys(g).sort().map((k) => g[k]);
const TEACHER_PHOTOS = files(import.meta.glob("./therapists/*.webp", { eager: true, query: "?url", import: "default" }));
const EXPERIENCE_PHOTOS = files(import.meta.glob("./experiences/*.webp", { eager: true, query: "?url", import: "default" }));
const PEOPLE_PHOTOS = files(import.meta.glob("./people/*.webp", { eager: true, query: "?url", import: "default" }));
function mosaic(el, list, n = 6) {
  el.innerHTML = list.slice(0, n).map((src, i) => `<img src="${src}" alt="" loading="${i < 3 ? "eager" : "lazy"}" decoding="async">`).join("");
}
mosaic($("#mosaicTeachers"), TEACHER_PHOTOS);
mosaic($("#mosaicExperiences"), EXPERIENCE_PHOTOS);
mosaic($("#mosaicPeople"), PEOPLE_PHOTOS);

// ── teachers rail — the real thirty, with their photographs ───────────────
const rail = $("#teacherRail");
fetch("/teachers.json").then((r) => r.json()).then((list) => {
  rail.innerHTML = list.slice(0, 18).map((t) => `
    <article class="card">
      <img src="/${t.img}" alt="${t.name}" loading="lazy" decoding="async">
      <div class="card-body">
        <b>${t.name}</b>
        <span>${t.loc || ""}</span>
        ${t.followers ? `<em>${t.followers} followers</em>` : ""}
      </div>
    </article>`).join("");
}).catch(() => { rail.innerHTML = ""; });
$$(".rail-btn").forEach((b) => b.addEventListener("click", () => {
  const dir = Number(b.dataset.dir);
  rail.scrollBy({ left: dir * (320 * 2), behavior: reduce ? "auto" : "smooth" });
}));

// ── techniques marquee — the real directory, category by category ─────────
const pill = (name) => `<span class="pill">${name}<i>${TECHNIQUES[name].length}</i></span>`;
const half = Math.ceil(CATEGORIES.length / 2);
const rowA = CATEGORIES.slice(0, half).map(pill).join("");
const rowB = CATEGORIES.slice(half).map(pill).join("");
// each row twice, so the −50% loop is seamless
$('[data-row="0"]').innerHTML = rowA + rowA;
$('[data-row="1"]').innerHTML = rowB + rowB;

// ── the numbers count up, once, when they arrive ──────────────────────────
const counters = $$("[data-count]");
const parseCount = (s) => {
  const m = String(s).match(/^([\d,.]+)([A-Za-z+]*)$/);
  if (!m) return { n: 0, fmt: () => s };
  const n = parseFloat(m[1].replace(/,/g, ""));
  const suffix = m[2];
  const hasComma = m[1].includes(",");
  return { n, fmt: (v) => (hasComma ? Math.round(v).toLocaleString("en-US") : String(Math.round(v))) + suffix };
};
const cio = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    cio.unobserve(e.target);
    const { n, fmt } = parseCount(e.target.dataset.count);
    if (reduce) { e.target.textContent = fmt(n); continue; }
    const t0 = performance.now();
    const dur = 1400;
    const tick = (now) => {
      const p = clamp01((now - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      e.target.textContent = fmt(n * eased);
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
}, { threshold: 0.4 });
counters.forEach((c) => cio.observe(c));

// ── team + partners ───────────────────────────────────────────────────────
const norm = (s) => String(s || "").normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
const photoMap = (g) => {
  const m = new Map();
  for (const k of Object.keys(g)) m.set(norm(k.replace(/^.*\//, "").replace(/\.[^.]+$/, "")), g[k]);
  return m;
};
const TEAM_PHOTOS = photoMap(import.meta.glob("./team/*.webp", { eager: true, query: "?url", import: "default" }));
const PARTNER_PHOTOS = photoMap(import.meta.glob("./partners/*.webp", { eager: true, query: "?url", import: "default" }));
const initials = (name) => name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
function people(el, list, photos) {
  el.innerHTML = list.map((p) => {
    const src = photos.get(norm(p.name));
    return `<div class="person">
      ${src ? `<img src="${src}" alt="${p.name}" loading="lazy" decoding="async">` : `<div class="initials">${initials(p.name)}</div>`}
      <b>${p.name}</b>${p.role ? `<span>${p.role}</span>` : ""}
    </div>`;
  }).join("");
}
people($("#teamGrid"), TEAM, TEAM_PHOTOS);
people($("#partnersGrid"), PARTNERS, PARTNER_PHOTOS);

// ── footer — the real link columns ────────────────────────────────────────
const FOOTER = [
  { title: "Browse", split: true, links: ["Yoga", "Live Events", "Popular Meditations", "Meditation Music", "Meditation Playlists", "Meditation Courses", "Meditation Topics", "Meditation Teachers", "Meditation Meets-ups", "Meditation Near You", "Retreats", "Yoga Retreats", "Meditaçao em Portugues do Brasil", "Meditation auf Deutsch", "Meditatiòn en Espanol"] },
  { title: "Resources", split: true, links: ["Members Plus", "Meditation Timer", "Become a Teacher", "Better sleep guide", "How to meditate guide", "Anxiety's Effects On Our Health", "Course Directory", "Guided Meditations Directory", "Playlists Directory", "Retreats Directory", "Add an Embeddable Player", "AI Safety"] },
  { title: "Company", links: ["About", "Blog", "Support", "Media", "Careers", "CA Notice at Collection", "Accessibility Statement"] },
];
$("#footerCols").innerHTML = FOOTER.map((c) => `
  <div class="footer-col${c.split ? " is-split" : ""}"><h4>${c.title}</h4>
    <ul${c.split ? ' style="grid-template-columns:1fr 1fr"' : ""}>${c.links.map((l) => `<li><a href="#">${l}</a></li>`).join("")}</ul>
  </div>`).join("");
$("#year").textContent = String(new Date().getFullYear());

// ── one scroll loop for the two scroll-driven states ─────────────────────
let raf = 0;
function update() {
  raf = 0;
  bowl.setScroll(heroQ());
  const q = guidedQ();
  setStep(q < 1 / 3 ? 0 : q < 2 / 3 ? 1 : 2);
}
const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
addEventListener("scroll", onScroll, { passive: true });
addEventListener("resize", onScroll);
update();

// for a scripted check
window.__it = {
  bowl,
  get step() { return activeStep; },
  get heroQ() { return heroQ(); },
  get guidedQ() { return guidedQ(); },
  revealed: () => $$("[data-reveal].is-in").length,
  total: () => $$("[data-reveal]").length,
};
