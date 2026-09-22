import logoSvg from "./assets/insight-timer-logo.svg?raw";
import { TEAM } from "./data/team.js";
import { PARTNERS } from "./data/partners.js";

// ─────────────────────────────────────────────────────────────────────────────
// What both editions share: the nav, the reveal observer, the count-up, the
// team + partners stamping, the footer, the 1 · 2 switch, and one
// rAF-throttled scroll loop. Everything here is either stamped once from the
// data files or a pure function of the scroll position. Nothing owns a
// timeline.
// ─────────────────────────────────────────────────────────────────────────────

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

// ── photographs — Vite keeps them as URLs ─────────────────────────────────
const files = (g) => Object.keys(g).sort().map((k) => g[k]);
export const TEACHER_PHOTOS = files(import.meta.glob("./therapists/*.webp", { eager: true, query: "?url", import: "default" }));
export const EXPERIENCE_PHOTOS = files(import.meta.glob("./experiences/*.webp", { eager: true, query: "?url", import: "default" }));
export const PEOPLE_PHOTOS = files(import.meta.glob("./people/*.webp", { eager: true, query: "?url", import: "default" }));

const norm = (s) => String(s || "").normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
const photoMap = (g) => {
  const m = new Map();
  for (const k of Object.keys(g)) m.set(norm(k.replace(/^.*\//, "").replace(/\.[^.]+$/, "")), g[k]);
  return m;
};
export const TEAM_PHOTOS = photoMap(import.meta.glob("./team/*.webp", { eager: true, query: "?url", import: "default" }));
export const PARTNER_PHOTOS = photoMap(import.meta.glob("./partners/*.webp", { eager: true, query: "?url", import: "default" }));
export const teamPhoto = (p) => TEAM_PHOTOS.get(norm(p.name));
export const partnerPhoto = (p) => PARTNER_PHOTOS.get(norm(p.name));
export const initials = (name) => name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
export { TEAM, PARTNERS };

// ── nav: the logo, the scrolled state, the active link ────────────────────
export function mountNav() {
  $(".nav-logo").innerHTML = logoSvg.replace(/fill="[^"]*"/g, 'fill="currentColor"');
  const nav = $("#nav");
  const links = $$(".nav-links a").filter((a) => a.hash);
  const targets = links.map((a) => $(a.hash)).filter(Boolean);
  let active = null;
  return function update() {
    nav.classList.toggle("is-scrolled", scrollY > 8);
    // the section whose top has passed the upper third of the viewport wins
    let cur = null;
    const line = innerHeight * 0.36;
    for (let i = 0; i < targets.length; i++) {
      const r = targets[i].getBoundingClientRect();
      if (r.top <= line && r.bottom > line) cur = links[i];
    }
    if (cur !== active) {
      active = cur;
      links.forEach((l) => l.classList.toggle("is-active", l === cur));
    }
  };
}

// ── reveal on enter ──────────────────────────────────────────────────────
export function mountReveal(root = document) {
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
    }
  }, { rootMargin: "0px 0px -12% 0px", threshold: 0.05 });
  $$("[data-reveal]", root).forEach((el) => io.observe(el));
  return io;
}

// ── the numbers count up, once, when they arrive ──────────────────────────
const parseCount = (s) => {
  const m = String(s).match(/^([\d,.]+)([A-Za-z+]*)$/);
  if (!m) return { n: 0, fmt: () => s };
  const n = parseFloat(m[1].replace(/,/g, ""));
  const suffix = m[2];
  const hasComma = m[1].includes(",");
  return { n, fmt: (v) => (hasComma ? Math.round(v).toLocaleString("en-US") : String(Math.round(v))) + suffix };
};
export function mountCounters(root = document, { duration = 1400, onTick } = {}) {
  const cio = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      cio.unobserve(e.target);
      const { n, fmt } = parseCount(e.target.dataset.count);
      if (reduce) { e.target.textContent = fmt(n); onTick?.(e.target, 1); continue; }
      const t0 = performance.now();
      const tick = (now) => {
        const p = clamp01((now - t0) / duration);
        const eased = 1 - Math.pow(1 - p, 3);
        e.target.textContent = fmt(n * eased);
        onTick?.(e.target, eased);
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }
  }, { threshold: 0.4 });
  $$("[data-count]", root).forEach((c) => cio.observe(c));
}

// ── footer — the real link columns ────────────────────────────────────────
const FOOTER = [
  { title: "Browse", split: true, links: ["Yoga", "Live Events", "Popular Meditations", "Meditation Music", "Meditation Playlists", "Meditation Courses", "Meditation Topics", "Meditation Teachers", "Meditation Meets-ups", "Meditation Near You", "Retreats", "Yoga Retreats", "Meditaçao em Portugues do Brasil", "Meditation auf Deutsch", "Meditatiòn en Espanol"] },
  { title: "Resources", split: true, links: ["Members Plus", "Meditation Timer", "Become a Teacher", "Better sleep guide", "How to meditate guide", "Anxiety's Effects On Our Health", "Course Directory", "Guided Meditations Directory", "Playlists Directory", "Retreats Directory", "Add an Embeddable Player", "AI Safety"] },
  { title: "Company", links: ["About", "Blog", "Support", "Media", "Careers", "CA Notice at Collection", "Accessibility Statement"] },
];
export function mountFooter() {
  $("#footerCols").innerHTML = FOOTER.map((c) => `
    <div class="footer-col${c.split ? " is-split" : ""}"><h4>${c.title}</h4>
      <ul${c.split ? ' style="grid-template-columns:1fr 1fr"' : ""}>${c.links.map((l) => `<li><a href="#">${l}</a></li>`).join("")}</ul>
    </div>`).join("");
  $("#year").textContent = String(new Date().getFullYear());
}

// ── 1 · 2 — two editions, two URLs, two keys ──────────────────────────────
const EDITIONS = { 1: "/", 2: "/v2" };
export function mountVersion(current) {
  const el = document.createElement("nav");
  el.className = "vswitch";
  el.setAttribute("aria-label", "Edition");
  el.innerHTML = Object.entries(EDITIONS).map(([k, href]) =>
    `<a href="${href}" class="${Number(k) === current ? "is-current" : ""}" title="Edition ${k} (press ${k})">${k}</a>`).join("");
  document.body.appendChild(el);
  addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const t = e.target;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
    const href = EDITIONS[e.key];
    if (href && Number(e.key) !== current) location.href = href;
  });
}

// ── one scroll loop ───────────────────────────────────────────────────────
export function scrollLoop(fn) {
  let raf = 0;
  const update = () => { raf = 0; fn(); };
  const kick = () => { if (!raf) raf = requestAnimationFrame(update); };
  addEventListener("scroll", kick, { passive: true });
  addEventListener("resize", kick);
  update();
  return kick;
}

/** progress 0→1 of a tall section with a sticky child: 0 when its top
 *  reaches the top of the viewport, 1 when its bottom reaches the bottom */
export function sectionQ(el) {
  const r = el.getBoundingClientRect();
  const span = Math.max(1, r.height - innerHeight);
  return clamp01(-r.top / span);
}
