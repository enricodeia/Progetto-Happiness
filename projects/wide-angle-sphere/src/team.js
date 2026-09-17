import gsap from "gsap";
import { TEAM } from "./data/team.js";
import { PARTNERS } from "./data/partners.js";

// ─────────────────────────────────────────────────────────────────────────────
// "The Great Team Behind" — the page's last section (his own reference,
// 2026-09-15), a black grid of the real team with a cursor-follow tooltip on
// hover. The tooltip is ported from crnacura/PlayersClub's `tooltip.js` —
// he asked for exactly that piece, nothing else from that repo: a single
// floating box that tracks the pointer with `gsap.quickTo` (not the raw
// mousemove position — that reads as sticky, not as FOLLOWING), scales in
// from the hovered card's own corner, and swaps its two lines — the name in
// white, the role under it in `#A6A6A6` — with a short roll transition when
// the pointer moves from one card to another without ever leaving the grid.
//
// Photos are their own drop-in folder, `src/team/*` — while a slot is empty
// it falls back to a plain initials avatar, never another person's face:
// these are named, real people, not stock photography.
//
// A second grid, "Partners" (`data/partners.js` / `src/partners/*`), sits
// right under the team's own. It used to be a tab that swapped the SAME grid
// — his correction, 2026-09-16: "abbiamo una grid per il team e l'altra grid
// invece per i partners", both ALWAYS on the page, no switch button.
// ─────────────────────────────────────────────────────────────────────────────

// Matched by NAME, not by position: a folder that is missing one person (or
// has an extra file that isn't in the roster at all) must never shift
// everyone after it onto the wrong face. Both sides are normalised the same
// way — accents stripped, case and spacing ignored — so "Stefan Pühringer"
// and a file saved as "stefan-puhringer.webp" still find each other.
const norm = (s) =>
  String(s || "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

// `import.meta.glob` is a build-time macro — its pattern has to be a literal,
// so each folder gets its own call rather than one helper taking a variable.
const TEAM_FILES = import.meta.glob("./team/*.{jpg,jpeg,png,webp,avif}", {
  eager: true, query: "?url", import: "default",
});
const PARTNER_FILES = import.meta.glob("./partners/*.{jpg,jpeg,png,webp,avif}", {
  eager: true, query: "?url", import: "default",
});
function photoMap(files) {
  const map = new Map();
  for (const path of Object.keys(files)) {
    const stem = path.replace(/^.*\//, "").replace(/\.[^.]+$/, "");
    map.set(norm(stem), files[path]);
  }
  return map;
}

const ROSTERS = {
  team: { roster: TEAM, photos: photoMap(TEAM_FILES) },
  partners: { roster: PARTNERS, photos: photoMap(PARTNER_FILES) },
};

const AVATAR_TINTS = ["#2a2622", "#22282a", "#2a2422", "#20242a", "#282022", "#242a24"];
const initialsOf = (name) =>
  name.split(/\s+/).filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase();

export function createTeam({ mount, cfg }) {
  const root = document.createElement("div");
  root.className = "was-team";
  root.innerHTML = `
    <div class="was-team-head">
      <h2 class="was-team-title"></h2>
      <p class="was-team-desc"></p>
    </div>
    <div class="was-team-grid" data-roster="team"></div>
    <h3 class="was-team-sublabel"></h3>
    <div class="was-team-grid" data-roster="partners"></div>
    <div class="was-team-tooltip">
      <div class="was-tt-row was-tt-name"><span class="was-tt-in"></span><span class="was-tt-in"></span></div>
      <div class="was-tt-row was-tt-role"><span class="was-tt-in"></span><span class="was-tt-in"></span></div>
    </div>
  `;
  mount.appendChild(root);

  const titleEl = root.querySelector(".was-team-title");
  const descEl = root.querySelector(".was-team-desc");
  const sublabelEl = root.querySelector(".was-team-sublabel");
  const gridEls = { team: root.querySelector('[data-roster="team"]'), partners: root.querySelector('[data-roster="partners"]') };
  const tooltip = root.querySelector(".was-team-tooltip");
  const nameSpans = tooltip.querySelectorAll(".was-tt-name .was-tt-in");
  const roleSpans = tooltip.querySelectorAll(".was-tt-role .was-tt-in");

  /** "\n" is a real line break in the title, same idiom as the Atlas header */
  const setLines = (el, text) => {
    el.innerHTML = String(text || "").split("\n").map((l) => `<span>${l}</span>`).join("<br/>");
  };

  function buildGrid(name) {
    const { roster, photos } = ROSTERS[name];
    const gridEl = gridEls[name];
    gridEl.textContent = "";
    roster.forEach((person, i) => {
      const card = document.createElement("div");
      card.className = "was-team-card";
      const src = photos.get(norm(person.name));
      if (src) {
        card.style.backgroundImage = `url("${src}")`;
      } else {
        card.classList.add("is-placeholder");
        card.style.background = AVATAR_TINTS[i % AVATAR_TINTS.length];
        // a SPAN, not textContent: the caption below is a child of the card
        // too, and textContent would wipe it out
        const ini = document.createElement("span");
        ini.className = "was-team-initials";
        ini.textContent = initialsOf(person.name);
        card.appendChild(ini);
      }
      // V4 names the face under its own card (his ask, 2026-09-17) — the name
      // in the ink, the role in a grey under it. It lives INSIDE the card so
      // the row reveal, the row grouping and the hover all keep working
      // untouched; CSS lifts it below the box and gives the grid the room.
      const cap = document.createElement("figcaption");
      cap.className = "was-team-cap";
      const capName = document.createElement("span");
      capName.className = "was-team-cap-name";
      capName.textContent = person.name;
      const capRole = document.createElement("span");
      capRole.className = "was-team-cap-role";
      capRole.textContent = person.role || "";
      cap.append(capName, capRole);
      card.appendChild(cap);
      card.dataset.name = person.name;
      card.dataset.role = person.role;
      gridEl.appendChild(card);
    });
  }

  /** the caption's own numbers */
  function style() {
    const T = cfg.team;
    root.style.setProperty("--tc-size", `${T.captionSize ?? 13}px`);
    root.style.setProperty("--tc-role", `${T.captionRoleSize ?? 12}px`);
    root.style.setProperty("--tc-gap", `${T.captionGap ?? 10}px`);
  }

  function build() {
    const T = cfg.team;
    setLines(titleEl, T.title);
    descEl.textContent = T.desc;
    sublabelEl.textContent = T.partnersTitle;
    buildGrid("team");
    buildGrid("partners");
  }

  // ── the cards arrive ROW BY ROW, on scroll (his ask, 2026-09-17) ──────────
  // A row is found from where its cards actually LAND (`offsetTop`), never
  // from a column count — so the 3-column mobile grid groups itself right
  // with exactly the same code as the 6-column one. Each row plays ONCE, the
  // first time any card in it comes into view: opacity 0 → 1, y → 0,
  // staggered left to right. `prefers-reduced-motion` gets the final state
  // straight away.
  // Driven off the scroll position directly rather than an
  // IntersectionObserver: an observer only fires on a threshold CROSSING, so
  // a jump straight past the section (a fling, an anchor, the verify's own
  // `scrollTo`) would leave every row it skipped sitting at opacity 0 for
  // good. Checking "is this row's top above the fold yet?" on every scroll
  // can never miss one, costs a few rect reads only while rows are still
  // pending, and detaches itself the moment the last row has played.
  let pending = [];
  const revealState = { rows: 0, revealed: 0 };
  function collectRows(gridEl) {
    const cards = [...gridEl.querySelectorAll(".was-team-card")];
    const byTop = new Map();
    for (const c of cards) {
      const top = Math.round(c.offsetTop);
      if (!byTop.has(top)) byTop.set(top, []);
      byTop.get(top).push(c);
    }
    return [...byTop.values()];
  }
  function checkRows() {
    if (!pending.length) return;
    const R = cfg.team.reveal;
    const vh = window.innerHeight;
    const still = [];
    for (const row of pending) {
      const r = row[0].getBoundingClientRect();
      // "in view" = its top has risen above the fold by `threshold` of its own
      // height — the same feel an observer's threshold would give
      if (r.top < vh - r.height * (R.threshold ?? 0.2)) {
        revealState.revealed++;
        gsap.to(row, {
          opacity: 1, y: 0, duration: R.dur, stagger: R.stagger,
          ease: "power2.out", overwrite: true,
        });
      } else still.push(row);
    }
    pending = still;
    if (!pending.length) detach();
  }
  let attached = false;
  const attach = () => {
    if (attached) return;
    attached = true;
    addEventListener("scroll", checkRows, { passive: true });
    addEventListener("resize", checkRows);
  };
  const detach = () => {
    if (!attached) return;
    attached = false;
    removeEventListener("scroll", checkRows);
    removeEventListener("resize", checkRows);
  };
  function armReveal() {
    const R = cfg.team.reveal;
    const cards = [...root.querySelectorAll(".was-team-card")];
    detach();
    pending = [];
    revealState.rows = 0;
    revealState.revealed = 0;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (!R?.on || reduce) { gsap.set(cards, { opacity: 1, y: 0 }); return; }
    pending = [...collectRows(gridEls.team), ...collectRows(gridEls.partners)];
    revealState.rows = pending.length;
    gsap.set(cards, { opacity: 0, y: R.y });
    attach();
    checkRows();
  }

  // ── the cursor-follow tooltip ────────────────────────────────────────────
  // A single floating box, not one per card: `quickTo` gives it the SAME
  // smooth chase every frame regardless of how fast the pointer is moving,
  // which is the whole difference between "following" and "sticking".
  const OFFSET_X = 20, OFFSET_Y = 0;
  const xTo = gsap.quickTo(tooltip, "x", { duration: 0.5, ease: "expo.out" });
  const yTo = gsap.quickTo(tooltip, "y", { duration: 0.5, ease: "expo.out" });
  let visible = false;
  let active = null;
  let scaleTween = null;
  let leaveTimer = null;

  const rollTo = (spans, text, animate) => {
    const cur = spans[0].dataset.on !== "0" ? spans[0] : spans[1];
    const next = cur === spans[0] ? spans[1] : spans[0];
    next.textContent = text;
    cur.dataset.on = "0";
    next.dataset.on = "1";
    if (!animate) {
      gsap.set(cur, { yPercent: 100, opacity: 0 });
      gsap.set(next, { yPercent: 0, opacity: 1 });
      return;
    }
    gsap.to(cur, { yPercent: -100, opacity: 0, duration: 0.45, ease: "power3.inOut" });
    gsap.fromTo(next, { yPercent: 100, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.45, ease: "power3.inOut" });
  };

  function place(e) {
    const w = tooltip.offsetWidth || 200;
    const x = e.clientX + OFFSET_X + w > window.innerWidth
      ? e.clientX - OFFSET_X - w
      : e.clientX + OFFSET_X;
    const y = e.clientY + OFFSET_Y;
    if (!visible) gsap.set(tooltip, { x, y });
    else { xTo(x); yTo(y); }
  }

  function onEnter(e) {
    clearTimeout(leaveTimer);
    const card = e.currentTarget;
    active = card;
    place(e);
    const wasVisible = visible;
    if (!wasVisible) {
      scaleTween?.kill();
      scaleTween = gsap.fromTo(tooltip,
        { scale: 0, opacity: 1, transformOrigin: "0% 100%" },
        { scale: 1, duration: 0.5, ease: "power4.out" });
      visible = true;
    }
    rollTo(nameSpans, card.dataset.name, wasVisible);
    rollTo(roleSpans, card.dataset.role, wasVisible);
  }

  function onMove(e) { if (active) place(e); }

  function onLeave(e) {
    if (active !== e.currentTarget) return;
    active = null;
    leaveTimer = setTimeout(() => {
      if (active) return;
      scaleTween?.kill();
      scaleTween = gsap.to(tooltip, { scale: 0, duration: 0.4, ease: "power3.in" });
      visible = false;
    }, 40);
  }

  function wireCards() {
    for (const name of ["team", "partners"]) {
      for (const card of gridEls[name].querySelectorAll(".was-team-card")) {
        card.addEventListener("pointerenter", onEnter);
        card.addEventListener("pointermove", onMove);
        card.addEventListener("pointerleave", onLeave);
      }
    }
  }

  build();
  wireCards();
  armReveal();
  style();

  return {
    style,
    build: () => { build(); wireCards(); armReveal(); style(); },
    /** rows found / rows already played, across both grids */
    get reveal() { return { ...revealState }; },
    /** what's on screen right now, for the assertions — both grids, always */
    probe() {
      const of = (name) => {
        const cards = [...gridEls[name].querySelectorAll(".was-team-card")];
        return {
          count: cards.length,
          placeholders: cards.filter((c) => c.classList.contains("is-placeholder")).length,
          names: cards.map((c) => c.dataset.name),
          roles: cards.map((c) => c.dataset.role),
        };
      };
      return {
        team: of("team"),
        partners: of("partners"),
        title: [...titleEl.querySelectorAll("span")].map((s) => s.textContent).join("\n"),
        sublabel: sublabelEl.textContent,
        tooltipVisible: visible,
        tooltipName: nameSpans[0].dataset.on === "1" ? nameSpans[0].textContent : nameSpans[1].textContent,
        tooltipRole: roleSpans[0].dataset.on === "1" ? roleSpans[0].textContent : roleSpans[1].textContent,
      };
    },
    /** fire a pointer sequence at a card in one of the two grids, for the assertions */
    hover(i, roster = "team") {
      const card = gridEls[roster]?.children[i];
      if (!card) return;
      const r = card.getBoundingClientRect();
      const opts = { clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, bubbles: true };
      card.dispatchEvent(new PointerEvent("pointerenter", opts));
      card.dispatchEvent(new PointerEvent("pointermove", opts));
    },
    unhover(i, roster = "team") {
      const card = gridEls[roster]?.children[i];
      if (!card) return;
      card.dispatchEvent(new PointerEvent("pointerleave", { bubbles: true }));
    },
  };
}
