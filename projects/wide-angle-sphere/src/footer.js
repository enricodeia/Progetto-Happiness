// The page's real footer (his reference, 2026-09-16) — three link columns,
// the bowl as a photograph rather than the 3D object, a giant wordmark, and
// the legal line. Static: nothing here is scroll-driven or config-tuned, the
// same way the nav bar's own copy isn't — it is the real Insight Timer
// footer, transcribed off his screenshot link for link, "Blog" listed twice
// and "Accesibility Statement" spelled exactly as their own site spells it.
//
// The wordmark is the REAL logo (his own SVG, 2026-09-16 — "otherwise is not
// correct"), not a serif approximation: `src/assets/insight-timer-logo.svg`,
// every path's `fill` swapped from a hard-coded black to `currentColor` so
// the CSS `color` on `.was-footer-word` is what actually paints it — a
// vector logo scales to any size with nothing lost, which is the whole
// reason it can stand this large in the first place.

import logoSvg from "./assets/insight-timer-logo.svg?raw";

// Each group can run its links over more than ONE column (his ask,
// 2026-09-17: "Browse, che tiene tutti quegli elementi, però su due colonne.
// Stessa roba per l'altro, che si tratta dei resources"). That is what takes
// the footer from a 15-row wall down to 8 — the height it gives back is why
// the wordmark and the legal line can breathe.
const COLUMNS = [
  {
    title: "Browse",
    split: 2,
    links: [
      "Yoga", "Live Events", "Popular Meditations", "Meditation Music",
      "Meditation Playlists", "Meditation Courses", "Meditation Topics",
      "Meditation Teachers", "Meditation Meets-ups", "Meditation Near You",
      "Retreats", "Yoga Retreats", "Meditaçao em Portugues do Brasil",
      "Meditation auf Deutsch", "Meditatiòn en Espanol",
    ],
  },
  {
    title: "Resources",
    split: 2,
    links: [
      "Members Plus", "Meditation Timer", "Become a Teacher",
      "Better sleep guide", "How to meditate guide",
      "Anxiety's Effects On Our Health", "Course Directory",
      "Guided Meditations Directory", "Playlists Directory",
      "Retreats Directory", "Add an Embeddable Player", "AI Safety",
    ],
  },
  {
    title: "Company",
    split: 1,
    links: [
      // "Blog" was in his screenshot TWICE — transcribed faithfully the first
      // time, and it read as a bug, because it is one (his catch, 2026-09-17)
      "About", "Blog", "Support", "Media", "Careers",
      "CA Notice at Collection", "Accesibility Statement",
    ],
  },
];

export function createFooter({ mount, cfg }) {
  const root = document.createElement("div");
  root.className = "was-footer-in";
  root.innerHTML = `
    <div class="was-footer-top">
      <div class="was-footer-cols">
        ${COLUMNS.map((c) => {
          const n = Math.max(1, c.split || 1);
          const per = Math.ceil(c.links.length / n);
          const subs = Array.from({ length: n }, (_, k) =>
            c.links.slice(k * per, (k + 1) * per));
          return `
          <div class="was-footer-col" data-split="${n}">
            <h4>${c.title}</h4>
            <div class="was-footer-lists">
              ${subs.map((list) => `
                <div class="was-footer-sub">
                  ${list.map((l) => `<a href="#">${l}</a>`).join("")}
                </div>`).join("")}
            </div>
          </div>`;
        }).join("")}
      </div>
    </div>
    <div class="was-footer-word">${logoSvg}</div>
    <div class="was-footer-bottom">
      <p class="was-footer-legal">V2.472.2 © Copyright 2026 Insight<br/>Network Inc. All rights reserved.</p>
      <div class="was-footer-policies">
        <a href="#">Terms &amp; Conditions</a>
        <a href="#">Privacy Policy</a>
        <a href="#">Cookie Policy</a>
      </div>
    </div>
  `;
  mount.appendChild(root);

  /**
   * The footer's vertical budget, MEASURED rather than assumed. The wordmark
   * takes whatever the link columns and the legal line leave it (see the
   * `--foot-*` properties in style.css), and those two were hand-measured
   * constants — so a link added to a column, or a font that swaps in wider,
   * would push the whole box past one viewport, and a box fixed to the bottom
   * spends that overflow off the TOP of the screen. Which is the exact bug
   * this layout exists to fix.
   *
   * Read on boot, on resize and once the font has swapped — never per frame.
   * There is no feedback loop: what is measured here (the columns, the legal
   * row) does not depend on the wordmark's width, which is all it decides.
   */
  function measure() {
    const top = root.querySelector(".was-footer-top");
    const bottom = root.querySelector(".was-footer-bottom");
    const bm = parseFloat(getComputedStyle(bottom).marginTop) || 0;
    mount.style.setProperty("--foot-top-h", `${Math.ceil(top.getBoundingClientRect().height)}px`);
    mount.style.setProperty("--foot-bottom-h", `${Math.ceil(bottom.getBoundingClientRect().height + bm)}px`);
  }
  /** the two numbers that are a judgement rather than a measurement */
  function style() {
    const F = cfg?.footer || {};
    mount.style.setProperty("--foot-link-a", String(F.linkAlpha ?? 0.5));
    mount.style.setProperty("--foot-gap-min", `${F.gap ?? 56}px`);
    // vw, not px, so the row scales with the page (his ask, 2026-09-17)
    mount.style.setProperty("--foot-col-gap", `${F.colGap ?? 4}vw`);
    // never under 96: that is what clears the fixed nav, which paints over
    // the footer (z 7 against z 4)
    mount.style.setProperty("--foot-pad-top", `${Math.max(96, F.padTop ?? 96)}px`);
    mount.style.setProperty("--foot-word-bottom", `${F.wordBottom ?? 14}px`);
    measure();
  }

  // style() writes the custom properties AND measures, so this is the only
  // call the factory needs — measure() alone would leave `padTop`/`colGap`
  // sitting at their CSS defaults until the panel happened to touch them
  style();

  return {
    measure,
    style,
    probe() {
      return {
        cols: [...root.querySelectorAll(".was-footer-col")].map((c) => ({
          title: c.querySelector("h4").textContent,
          count: c.querySelectorAll("a").length,
        })),
        wordSvg: !!root.querySelector(".was-footer-word svg"),
        wordPaths: root.querySelectorAll(".was-footer-word path").length,
        wordUsesCurrentColor: [...root.querySelectorAll(".was-footer-word path")]
          .every((p) => p.getAttribute("fill") === "currentColor"),
        companyLinks: [...root.querySelectorAll(".was-footer-col")][2]
          ? [...[...root.querySelectorAll(".was-footer-col")][2].querySelectorAll("a")].map((a) => a.textContent)
          : [],
        legal: root.querySelector(".was-footer-legal").textContent,
        policies: [...root.querySelectorAll(".was-footer-policies a")].map((a) => a.textContent),
        // the bowl PHOTOGRAPH is gone (his ask, 2026-09-17: "è molto pesante.
        // Con la bowl, li toglierei") — the wordmark is the image now
        bowl: root.querySelectorAll(".was-footer-bowl").length,
        splits: [...root.querySelectorAll(".was-footer-col")].map((c) => c.querySelectorAll(".was-footer-sub").length),
        position: getComputedStyle(mount).position,
        zIndex: getComputedStyle(mount).zIndex,
        revealed: mount.classList.contains("is-revealed"),
        paddingBottom: parseFloat(getComputedStyle(mount).paddingBottom),
        wordWidthRatio: +(root.querySelector(".was-footer-word").getBoundingClientRect().width / Math.max(1, mount.clientWidth)).toFixed(3),
        // it covers the WHOLE viewport (his ask, 2026-09-17) — and the space
        // between the last link and the wordmark is the flex slack, not a
        // fixed margin, which is what lets it do that at any window height
        ...(() => {
          const f = mount.getBoundingClientRect();
          const cols = root.querySelector(".was-footer-cols").getBoundingClientRect();
          const word = root.querySelector(".was-footer-word");
          const wr = word.getBoundingClientRect();
          const padTop = parseFloat(getComputedStyle(word).paddingTop) || 0;
          return {
            top: Math.round(f.top),
            height: Math.round(f.height),
            fullHeight: f.height >= window.innerHeight - 1,
            colsTop: Math.round(cols.top - f.top),
            // the real ink-to-ink gap: the flex slack plus the floor under it
            wordGap: Math.round(wr.top - cols.bottom + padTop),
          };
        })(),
      };
    },
  };
}
