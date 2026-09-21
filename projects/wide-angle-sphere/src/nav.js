// ─────────────────────────────────────────────────────────────────────────────
// The nav bar — two bars, one component (his ask, 2026-09-21, the final task).
//
//   mode 1   Discover · Become a teacher · Clinical Resources · Research ·
//            About — the search, one black "Log In"           (frames 1-3)
//   mode 2   Discover · About · Become a teacher — an outlined "For
//            therapists", the search, "Get the app"           (frames 4-6)
//
// HOVER opens a dropdown ("on hover, voglio che si apra una tendina"): a white
// card whose head row sits exactly where the link was, then its rows in a
// vertical list ("in fila, quindi in verticale"). A row with a chevron opens a
// SECOND, much wider panel beside the card ("una tendina molto più larga dove
// queste voci sono elencate") — Techniques lists the real directory.
//
// The opening is a real animation, in two movements he asked for by name:
// first the card itself opens (a clip-path curtain, top → down; the wide panel
// opens left → right), THEN the items arrive, staggered, each rising a few px
// into place. Closing is the same timeline run backwards, a little faster —
// GSAP's `reverse()`, so a pointer that changes its mind mid-way is continuous.
//
// Hover is debounced both ways (`openDelay`/`closeDelay`), the wide panel
// bridges the gap to the card with a transparent strip (see style.css), and
// keyboard focus opens exactly what hover does. Every number is in `cfg.nav`.
// ─────────────────────────────────────────────────────────────────────────────

import gsap from "gsap";
import {
  faGlobe, faBookOpen, faChevronDown, faMagnifyingGlass,
} from "@fortawesome/pro-regular-svg-icons";
import { NAV_LINKS, NAV_SUBS } from "./data/nav.js";

/** a Font Awesome Pro icon as an inline SVG — the page's default library */
const svgOf = (icon, cls = "") => {
  const [w, h, , , d] = icon.icon;
  const path = Array.isArray(d) ? d.join(" ") : d;
  return `<svg class="${cls}" viewBox="0 0 ${w} ${h}" aria-hidden="true" focusable="false"><path fill="currentColor" d="${path}"/></svg>`;
};
const ICONS = {
  globe: svgOf(faGlobe, "was-menu-ico"),
  book: svgOf(faBookOpen, "was-menu-ico"),
};
const CHEV = svgOf(faChevronDown, "was-menu-chev");
const SEARCH = svgOf(faMagnifyingGlass, "was-search-ico");

export function createNav({ mount, cfg, mode }) {
  const N = () => cfg.nav;
  const hoverable = () => !!window.matchMedia?.("(hover: hover)").matches;

  let items = [];
  let openItem = null;
  let built = { mode: 0 };

  // ── the DOM ───────────────────────────────────────────────────────────────
  const linkHtml = (key, bar) => {
    const L = NAV_LINKS[key];
    if (!L) return "";
    if (!L.menu) {
      return `<div class="was-nav-item" data-key="${key}"><a class="was-nav-link" href="#">${L.label}</a></div>`;
    }
    const rows = L.menu.map((r) =>
      `<a class="was-menu-row${r.sub ? " has-sub" : ""}" href="#" role="menuitem"${r.sub ? ` data-sub="${r.sub}"` : ""}>` +
      `<span>${r.label}</span>${r.sub ? CHEV : ""}</a>`).join("");
    const icon = bar.icons && L.icon ? ICONS[L.icon] : "";
    const dot = N().dot ? `<i class="was-menu-dot"></i>` : "";
    const mega = L.menu.some((r) => r.sub)
      ? `<div class="was-mega" aria-hidden="true"><div class="was-mega-in">` +
        `<div class="was-mega-title"></div><div class="was-mega-grid"></div></div></div>`
      : "";
    return `
      <div class="was-nav-item has-menu" data-key="${key}">
        <a class="was-nav-link" href="#" aria-haspopup="true" aria-expanded="false">${L.label}</a>
        <div class="was-menu" role="menu" aria-label="${L.label}">
          <div class="was-menu-head">${icon}<span>${L.label}</span>${dot}</div>
          <div class="was-menu-rows">${rows}</div>
        </div>
        ${mega}
      </div>`;
  };

  function build() {
    closeAll(true);
    const n = N();
    const m = mode() === 2 ? 2 : 1;
    const bar = m === 2 ? n.two : n.one;
    built = { mode: m };
    mount.hidden = !cfg.hero.nav.show;
    mount.dataset.mode = String(m);
    mount.innerHTML = `
      <a class="was-logo" href="#">${n.logo}</a>
      <nav class="was-nav-links" aria-label="Primary">${bar.links.map((k) => linkHtml(k, bar)).join("")}</nav>
      <div class="was-nav-right">
        ${m === 2 && bar.pill ? `<button class="was-nav-pill" type="button">${bar.pill}</button><i class="was-nav-sep"></i>` : ""}
        <label class="was-search">
          ${SEARCH}
          <input type="text" placeholder="${n.search}" aria-label="${n.search}" />
          <img class="was-search-bowl" src="/images/bowl.png" alt="" />
        </label>
        <button class="was-cta" type="button">${bar.cta}</button>
      </div>`;
    wire();
    style();
  }

  /** everything that is a number in the panel */
  function style() {
    const n = N();
    const s = mount.style;
    s.setProperty("--nav-link-size", `${n.linkSize}px`);
    s.setProperty("--nav-item-gap", `${n.itemGap}px`);
    s.setProperty("--nav-links-x", `${n.linksX}px`);
    s.setProperty("--nav-menu-w", `${n.menuWidth}px`);
    s.setProperty("--nav-mega-w", `${n.megaWidth}px`);
    s.setProperty("--nav-pad", `${n.pad}px`);
    s.setProperty("--nav-gap", `${n.gap}px`);
    s.setProperty("--nav-r", `${n.radius}px`);
    s.setProperty("--nav-row-size", `${n.rowSize}px`);
    s.setProperty("--nav-row-h", `${n.rowHeight}px`);
    s.setProperty("--nav-shadow", String(n.shadow));
    s.setProperty("--nav-mega-cols", String(Math.max(1, Math.round(n.megaCols))));
    // the search glass is the Titles panel's (2026-09-17) — same vars
    const sg = cfg.hero.nav.searchGlass || {};
    s.setProperty("--search-alpha", String(sg.alpha ?? 1));
    s.setProperty("--search-blur", `${sg.blur ?? 0}px`);
  }

  // ── hover / focus → open · close ──────────────────────────────────────────
  function wire() {
    items = [...mount.querySelectorAll(".was-nav-item.has-menu")].map((el) => {
      const it = {
        el, key: el.dataset.key,
        link: el.querySelector(".was-nav-link"),
        menu: el.querySelector(".was-menu"),
        head: el.querySelector(".was-menu-head"),
        rows: [...el.querySelectorAll(".was-menu-row")],
        mega: el.querySelector(".was-mega"),
        open: false, megaOpen: false, sub: null,
        tl: null, megaTl: null, tOpen: 0, tClose: 0, tSub: 0,
      };
      el.addEventListener("pointerenter", () => { if (hoverable()) scheduleOpen(it); });
      // ...and a pointer that is simply FOUND inside (the bar re-rendered under
      // a still cursor, a boundary event the browser skipped) opens it too
      el.addEventListener("pointermove", () => {
        if (hoverable() && !it.open && !it.tOpen) scheduleOpen(it);
        else if (it.open) clearTimeout(it.tClose);
      });
      el.addEventListener("pointerleave", () => { if (hoverable()) scheduleClose(it); });
      el.addEventListener("focusin", () => openNow(it));
      el.addEventListener("focusout", (e) => { if (!el.contains(e.relatedTarget)) closeNow(it); });
      it.link.addEventListener("click", (e) => { e.preventDefault(); it.open ? closeNow(it) : openNow(it); });
      for (const row of it.rows) {
        const sub = row.dataset.sub;
        if (!sub) continue;
        const arm = () => {
          clearTimeout(it.tSub);
          it.tSub = setTimeout(() => { it.tSub = 0; showSub(it, sub); }, Math.max(0, N().subDelay));
        };
        row.addEventListener("pointerenter", arm);
        // the same fallback as the item's: a pointer resting on a row whose
        // panel is not the one open (or none is) opens it
        row.addEventListener("pointermove", () => { if (!it.tSub && !(it.megaOpen && it.sub === sub)) arm(); });
        row.addEventListener("focus", () => showSub(it, sub));
        row.addEventListener("click", (e) => { e.preventDefault(); showSub(it, sub); });
      }
      return it;
    });
  }

  function scheduleOpen(it) {
    clearTimeout(it.tClose);
    clearTimeout(it.tOpen);
    it.tOpen = setTimeout(() => { it.tOpen = 0; openNow(it); }, Math.max(0, N().openDelay));
  }
  function scheduleClose(it) {
    clearTimeout(it.tOpen);
    clearTimeout(it.tSub);
    clearTimeout(it.tClose);
    it.tClose = setTimeout(() => closeNow(it), Math.max(0, N().closeDelay));
  }

  /** the card: a curtain from the top, then the rows, one after the next */
  function cardTl(it) {
    const n = N();
    const R = `${n.radius}px`;
    const tl = gsap.timeline({
      paused: true,
      defaults: { ease: n.ease },
      onReverseComplete: () => { it.menu.style.visibility = "hidden"; },
    });
    tl.set(it.menu, { visibility: "visible" }, 0);
    tl.fromTo(it.menu,
      { clipPath: `inset(0 0 100% 0 round ${R})`, opacity: 0, y: -6 },
      { clipPath: `inset(0 0 0% 0 round ${R})`, opacity: 1, y: 0, duration: n.dur }, 0);
    tl.fromTo(it.head, { opacity: 0 }, { opacity: 1, duration: n.rowDur }, n.dur * 0.08);
    tl.fromTo(it.rows,
      { opacity: 0, y: n.rowRise },
      { opacity: 1, y: 0, duration: n.rowDur, stagger: n.rowStagger }, n.dur * n.rowsAt);
    return tl;
  }
  /** the wide panel: a curtain from the left, its title, then the grid */
  function megaTl(it) {
    const n = N();
    const R = `${n.radius}px`;
    const title = it.mega.querySelector(".was-mega-title");
    const cells = it.mega.querySelectorAll(".was-mega-item");
    const tl = gsap.timeline({
      paused: true,
      defaults: { ease: n.ease },
      onReverseComplete: () => { it.mega.style.visibility = "hidden"; it.megaOpen = false; },
    });
    tl.set(it.mega, { visibility: "visible" }, 0);
    tl.fromTo(it.mega,
      { clipPath: `inset(0 100% 0 0 round ${R})`, opacity: 0 },
      { clipPath: `inset(0 0% 0 0 round ${R})`, opacity: 1, duration: n.megaDur }, 0);
    tl.fromTo(title, { opacity: 0 }, { opacity: 1, duration: n.rowDur }, n.megaDur * 0.12);
    tl.fromTo(cells,
      { opacity: 0, y: n.rowRise },
      { opacity: 1, y: 0, duration: n.rowDur, stagger: n.megaStagger }, n.megaDur * n.rowsAt);
    return tl;
  }

  function openNow(it) {
    clearTimeout(it.tOpen);
    clearTimeout(it.tClose);
    it.tOpen = 0;
    if (openItem && openItem !== it) closeNow(openItem, true);
    openItem = it;
    if (it.open) return;
    it.open = true;
    it.el.classList.add("is-open");
    it.link.setAttribute("aria-expanded", "true");
    // a fresh timeline every time, so a knob turned in the panel is honoured
    // on the very next open — unless one is still running backwards, which
    // simply turns round where it is
    if (!it.tl || !it.tl.isActive()) { it.tl?.kill(); it.tl = cardTl(it); }
    it.tl.timeScale(1).play();
  }
  function closeNow(it, fast = false) {
    clearTimeout(it.tOpen);
    clearTimeout(it.tClose);
    clearTimeout(it.tSub);
    it.tOpen = 0;
    it.tSub = 0;
    if (openItem === it) openItem = null;
    if (!it.open) return;
    it.open = false;
    it.el.classList.remove("is-open");
    it.link.setAttribute("aria-expanded", "false");
    const speed = Math.max(0.5, N().closeSpeed) * (fast ? 1.6 : 1);
    it.tl?.timeScale(speed).reverse();
    closeMega(it, speed);
  }
  function closeMega(it, speed = 1) {
    if (!it.mega || !it.megaOpen) return;
    for (const r of it.rows) r.classList.remove("is-active");
    it.sub = null;
    it.megaTl?.timeScale(speed).reverse();
  }
  function closeAll(immediate = false) {
    for (const it of items) {
      if (!immediate) { closeNow(it); continue; }
      clearTimeout(it.tOpen); clearTimeout(it.tClose); clearTimeout(it.tSub);
      it.tl?.kill(); it.megaTl?.kill();
      it.open = false; it.megaOpen = false; it.sub = null;
    }
    openItem = null;
  }

  function fillSub(it, sub) {
    const S = NAV_SUBS[sub];
    const n = N();
    const title = it.mega.querySelector(".was-mega-title");
    const grid = it.mega.querySelector(".was-mega-grid");
    title.textContent = S.title;
    grid.innerHTML = S.items.slice(0, Math.max(1, Math.round(n.megaCount)))
      .map((t) => `<a class="was-mega-item" href="#">${t}</a>`).join("");
  }

  /** the wide panel, for one row — opens it, or swaps what it lists */
  function showSub(it, sub) {
    if (!it.mega || !NAV_SUBS[sub]) return;
    if (!it.open) openNow(it);
    const n = N();
    const row = it.rows.find((r) => r.dataset.sub === sub);
    for (const r of it.rows) r.classList.toggle("is-active", r === row);
    // the panel's top edge sits on the row that opened it
    const y = row.getBoundingClientRect().top - it.el.getBoundingClientRect().top;
    it.mega.style.top = `${Math.round(y - n.pad)}px`;
    if (it.sub === sub && it.megaOpen) return;
    const wasOpen = it.megaOpen && it.megaTl && !it.megaTl.reversed();
    it.sub = sub;
    if (!wasOpen) {
      fillSub(it, sub);
      it.megaTl?.kill();
      it.megaTl = megaTl(it);
      it.megaOpen = true;
      it.megaTl.timeScale(1).play();
      return;
    }
    // already open on another row: the list goes, the new one arrives
    const title = it.mega.querySelector(".was-mega-title");
    const grid = it.mega.querySelector(".was-mega-grid");
    gsap.killTweensOf([title, ...grid.children]);
    gsap.to([title, ...grid.children], {
      opacity: 0, duration: Math.max(0.05, n.swapDur), ease: "power1.out", stagger: 0,
      onComplete: () => {
        if (it.sub !== sub) return;      // the pointer moved on again
        fillSub(it, sub);
        gsap.fromTo(title, { opacity: 0 }, { opacity: 1, duration: n.rowDur, ease: n.ease });
        gsap.fromTo(grid.children,
          { opacity: 0, y: n.rowRise },
          { opacity: 1, y: 0, duration: n.rowDur, stagger: n.megaStagger, ease: n.ease });
      },
    });
  }

  addEventListener("keydown", (e) => { if (e.key === "Escape") closeAll(); });

  build();

  const find = (key) => items.find((i) => i.key === key) || null;
  return {
    build, style, closeAll,
    /** rebuild only if the bar's mode changed — cheap to call from anywhere */
    sync() { if ((mode() === 2 ? 2 : 1) !== built.mode) build(); },
    open(key) { const it = find(key); if (it) openNow(it); return !!it; },
    openSub(key, sub) { const it = find(key); if (it) showSub(it, sub); return !!it; },
    close(key) { const it = find(key); if (it) closeNow(it); },
    get mode() { return built.mode; },
    /** the live numbers, for the assertions */
    probe() {
      const cs = (el) => (el ? getComputedStyle(el) : null);
      const clipOpen = (el) => {
        const c = cs(el)?.clipPath || "";
        // fully open: every inset is zero — GSAP leaves the one it animated
        // as `0%`, the others as `0px` — or no clip at all
        if (c === "none" || c === "") return true;
        const m = c.match(/inset\(([^)]*)\)/);
        if (!m) return false;
        return m[1].split(" round ")[0].trim().split(/\s+/).every((v) => parseFloat(v) === 0);
      };
      return {
        mode: built.mode,
        links: [...mount.querySelectorAll(".was-nav-link")].map((a) => a.textContent),
        cta: mount.querySelector(".was-cta")?.textContent || "",
        pill: mount.querySelector(".was-nav-pill")?.textContent || "",
        search: !!mount.querySelector(".was-search input"),
        searchBowl: !!mount.querySelector(".was-search .was-search-bowl"),
        open: openItem?.key || null,
        items: Object.fromEntries(items.map((it) => [it.key, {
          open: it.open,
          visible: cs(it.menu).visibility === "visible" && +cs(it.menu).opacity > 0.01,
          fullyOpen: it.open && +cs(it.menu).opacity > 0.99 && clipOpen(it.menu),
          rows: it.rows.map((r) => r.querySelector("span").textContent),
          rowAlphas: it.rows.map((r) => +(+cs(r).opacity).toFixed(2)),
          hasIcon: !!it.head.querySelector(".was-menu-ico"),
          hasDot: !!it.head.querySelector(".was-menu-dot"),
          mega: it.mega ? {
            open: it.megaOpen, sub: it.sub,
            visible: cs(it.mega).visibility === "visible" && +cs(it.mega).opacity > 0.01,
            fullyOpen: it.megaOpen && +cs(it.mega).opacity > 0.99 && clipOpen(it.mega),
            title: it.mega.querySelector(".was-mega-title").textContent,
            count: it.mega.querySelectorAll(".was-mega-item").length,
            alphas: [...it.mega.querySelectorAll(".was-mega-item")].map((c) => +(+cs(c).opacity).toFixed(2)),
            left: Math.round(it.mega.getBoundingClientRect().left - it.menu.getBoundingClientRect().right),
            width: Math.round(it.mega.getBoundingClientRect().width),
          } : null,
        }])),
      };
    },
  };
}
