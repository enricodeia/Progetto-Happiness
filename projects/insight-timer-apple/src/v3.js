import { createBowl } from "./bowl.js";
import {
  $, $$, clamp01,
  TEACHER_PHOTOS, EXPERIENCE_PHOTOS, PEOPLE_PHOTOS, TEAM, PARTNERS,
  mountNav, mountReveal, mountCounters, mountFooter, mountVersion, scrollLoop,
  waysSentence, mountByline, masthead, partnersLine,
} from "./common.js";

// ─────────────────────────────────────────────────────────────────────────────
// Edition 3 — the essay. One column of reading, wide photographs between
// chapters, and the four editorial modules: a byline, a sentence, one big
// number, a masthead. The only scroll-driven state is the bowl's lean.
// ─────────────────────────────────────────────────────────────────────────────

const navUpdate = mountNav();
mountReveal();
mountVersion(3);

// ── photographs ───────────────────────────────────────────────────────────
const PHOTO = { teachers: TEACHER_PHOTOS, experiences: EXPERIENCE_PHOTOS, people: PEOPLE_PHOTOS };
$$("[data-plate]").forEach((f) => {
  const [set, idx] = f.dataset.plate.split(":");
  const list = PHOTO[set] || EXPERIENCE_PHOTOS;
  $("img", f).src = list[Number(idx) || 0] || list[0];
});

// ── the bowl ─────────────────────────────────────────────────────────────
const heroStage = $("#heroStage");
const bowl = createBowl({ canvas: $("#bowl"), host: heroStage, size: 0.82, hover: true });
const heroQ = () => {
  const r = heroStage.getBoundingClientRect();
  return clamp01(-r.top / Math.max(1, r.height * 0.8));
};

// ── the four modules ──────────────────────────────────────────────────────
mountByline($("#byline"));
$("#ways").innerHTML = waysSentence(10);
mountCounters(document, {
  duration: 1800,
  onTick: (el, e) => { el.style.fontVariationSettings = `"EXPO" ${(100 * (1 - e)).toFixed(1)}`; },
});
masthead($("#masthead"), TEAM);
partnersLine($("#partners"), PARTNERS);
mountFooter();

// ── one scroll loop ───────────────────────────────────────────────────────
scrollLoop(() => {
  navUpdate();
  bowl.setScroll(heroQ());
});

// for a scripted check
window.__it = {
  bowl,
  edition: 3,
  revealed: () => $$("[data-reveal].is-in").length,
  total: () => $$("[data-reveal]").length,
};
