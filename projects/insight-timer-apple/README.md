# Insight Timer — the Apple-grammar rebuild

Two editions of one page, built after the client turned down the
scroll-driven piece in `../wide-angle-sphere`: same content, same
photographs, same bowl, none of the choreography.

- **Edition 1** (`/`, key `1`) — the white page. System sans, one idea per
  chapter, the object photographed large and left alone.
- **Edition 2** (`/v2`, key `2`) — the exposure. Black page, the Exposure
  variable serif for every title, its EXPO axis as the one motion: text
  arrives over-exposed and develops to rest, on entry or under the scroll.
  Photographs black and white until you reach for them.

Keys `1` / `2` switch edition (also the small 1 · 2 switch bottom left).

## Run

```bash
npm install
npm run dev        # http://localhost:5205
npm run build      # dist/
node shots/tour.mjs [url]                   # edition 1, every chapter + a probe (needs Chrome)
node shots/tour2.mjs [url] [w] [h] [outDir] # edition 2
node shots/mobile.mjs [url] 390 844         # edition 1 at phone width
```

## Edition 1, top to bottom

1. **Hero** — "Where practice makes progress." + lead + two chevron links, the
   bowl below it (three.js, his preset, slow idle turn, leans as you scroll).
2. **Statement** on black — "Across traditions and cultures…" / "But we've
   never had a full picture…".
3. **Discover** — sticky chapter, 320vh, three steps that swap copy and a
   photo mosaic (teachers → experiences → people) as a pure function of scroll.
4. **Teachers** — scroll-snap rail of the real 30 most-followed teachers.
5. **Techniques** — the real directory as two slow marquee rows of pills.
6. **The science** — bento: three source tiles + a dark wide tile with the
   three circles drawing themselves (SVG `pathLength`).
7. **Numbers** on black — six stats that count up once.
8. **About** — team of 12 + partners, real photos, initials fallback.
9. **Close** — "Insight Timer is making the impact of practice clear for
   everybody." + Get the app / Become a teacher.
10. Footer — the real link columns.

## Edition 2, top to bottom

1. **Hero** — Exposure title developing on load, the bowl with a touch more
   exposure and a faint warm glow behind it.
2. **Manifesto** — sticky, 260vh: the statement copy word by word, each word
   over-exposed (EXPO 100, faint) and developing to rest as you scroll. Pure
   function of scroll, scrubs back.
3. **Discover** — "On a platform guided by people." + three photo cards.
4. **Teachers** — the wall: thirty round portraits, black and white, colour
   and caption on hover. Count-up headline.
5. **Techniques** — the index: 45 categories in three columns with counts;
   hovering one lists what is inside.
6. **The science** — sticky, 260vh: three circles drawn one after the other
   by the scroll, the matching source lighting up on the left.
7. **Numbers** — the ledger: six rows, Exposure numerals developing as they
   count.
8. **About** — the roster: two-column list, round photos, roles.
9. **Close** + footer.

## Motion budget

Reveal-on-enter (IntersectionObserver → `.is-in`, `--i` stagger), the sticky
chapters' scroll-driven states, the bowl's lean, the count-up, the trio draw,
the marquee (edition 1), the EXPO develop (edition 2). Nothing else moves.
`prefers-reduced-motion` turns it all off.

## Files

- `index.html` / `v2.html` — all the copy lives here, in order.
- `src/base.css` — shared tokens, type scale, nav, footer, reveal, switch.
  `src/v1.css` and `src/v2.css` import it and override the tokens they
  disagree with (edition 2 flips to black and sets `--font-display: Exposure`).
- `src/common.js` — nav (with active link), reveal, count-up, footer, the
  1 · 2 switch, the scroll loop, the photo globs.
- `src/main.js` / `src/v2.js` — each edition's own stamping and scroll states.
  `window.__it` for scripted checks.
- `src/bowl.js` — slim renderer around the scroll piece's `bowlGeo` /
  `bowlMaterial` / `env` modules and `data/bowlPreset.js` (all copied,
  untouched). Sizes the bowl on the stage's shorter side; `exposure`, `lean`,
  `shrink` options.
- `public/` — bowl GLB (Draco), normal map, teacher portraits, `teachers.json`,
  `fonts/ExposureTrialVAR.woff2`.
- `vercel.json` — `cleanUrls` so `/v2` serves `v2.html`; `vite.config.js`
  does the same rewrite in dev.

## Deploy

Vercel project `insight-timer-apple`, CLI only (`vercel --prod --yes` from this
folder), not git-linked.
