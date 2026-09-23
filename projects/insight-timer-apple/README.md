# Insight Timer — the Apple-grammar rebuild

Two editions of one page, built after the client turned down the
scroll-driven piece in `../wide-angle-sphere`: same content, same
photographs, same bowl, none of the choreography.

- **Edition 1** (`/`, key `1`) — the white page. System sans, one idea per
  chapter, the object photographed large and left alone.
- **Edition 2** (`/v2`, key `2`) — the exposure. Black page, the Exposure
  variable serif for every title, its EXPO axis as the one motion: text
  arrives over-exposed and develops to rest, on entry or under the scroll.
  Photographs black and white until you reach for them. Also in light:
  `/v2?theme=light`, key `L`, or the half-moon in the switch (remembered).
- **Edition 3** (`/v3`, key `3`) — the bento. Apple's keynote grammar: white
  page, everything said in lightest-grey tiles, one fact per tile — the bowl
  alive in one, the numbers in Exposure in others, faces, pills, circles.
- **Edition 4** (`/v4`, key `4`) — the object. Apple's product-page grammar:
  the bowl pinned on the left for the whole read, turning three quarters,
  leaning to show its inside and taking more light as the chapters pass on
  the right. White, system sans, Exposure only for numerals. Under the bowl,
  one line per chapter fills as it is read. The cursor pulls the object a
  little anywhere on the page and, over it, reveals the wireframe under the
  metal (a soft disc, a fragment-shader mask on the bowl's own materials).
- **Edition 5** (`/v5`, key `5`) — the film. Every chapter a full-frame
  photograph held on a sticky stage while the words pass over it, bottom
  left, white on a scrim; frames cross-fade and drift with the scroll. The
  bowl appears once, at the end, on black. Chapter index as vertical lines
  on the right edge, filling.

Keys `1` … `5` switch edition (also the small switch bottom left; bottom
right on edition 4, where the chapter index owns the corner).

## Run

```bash
npm install
npm run dev        # http://localhost:5205
npm run build      # dist/
node shots/tour.mjs [url]                   # edition 1, every chapter + a probe (needs Chrome)
node shots/tour2.mjs [url] [w] [h] [outDir] # edition 2 (append ?theme=light for light)
node shots/tour3.mjs [url] [w] [h] [outDir] # edition 3
node shots/tour4.mjs [url] [w] [h] [outDir] # edition 4
node shots/hover4.mjs [url] [outDir]        # edition 4: cursor tilt + wireframe reveal
node shots/tour5.mjs [url] [w] [h] [outDir] # edition 5
node shots/mobile.mjs [url] 390 844         # edition 1 at phone width
node shots/fontprobe.mjs [url...]           # is Exposure actually loaded + which family the h1 got
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

## Edition 3, top to bottom

1. **Hero** — Exposure title developing on load, no object.
2. **Bento 1** — the bowl alive in a 2×2 white tile (leans as the tile
   passes), the statement in a dark tile, Members 30M+, Teachers 26,000 with
   six small faces, then a wide pills tile (two slow rows) and a photo.
3. **Discover** — three card tiles, photo on top, words beneath.
4. **Teachers** — one wide tile with the thirty faces, caption on hover.
5. **The science** — dark 2×2 tile with the circles drawing on reveal, three
   source tiles, one photo tile.
6. **Numbers** — six tiles, numerals sized to their tile (`cqw`) and
   developing as they count.
7. **About** — leadership tile, partners tile, dark closing tile with the CTA.

## Edition 4, top to bottom

Left: the pinned object (sticky for the whole read) with a chapter index
underneath that follows the scroll. Right: eight chapters, each a viewport
tall — 00 Practice (hero), 01 Wisdom (statement), 02 People (ten faces,
count-up), 03 Ways (the whole directory as one running index), 04 Science
(sources + circles), 05 Numbers (six stats developing), 06 Team (roster in
two columns + partners), 07 Everybody (close + CTA). The bowl's turn, lean,
light and ground shadow are all pure functions of the chapters' progress.
On phones the object pins on top and the chapters slide under it.

## Edition 5, top to bottom

A sticky full-viewport stage with one `<img class="frame">` per distinct
photograph; eight scenes scroll over it (00 Practice … 07 Everybody), each
naming its frame with `data-frame`. Which frame is on, its slow drift
(`--kb` scale), and the fill of each index line are pure functions of the
scroll. The final scene is black with the bowl (glow behind, cursor pull) and
the close.

## Motion budget

Reveal-on-enter (IntersectionObserver → `.is-in`, `--i` stagger), the sticky
chapters' scroll-driven states, the bowl's lean, the count-up, the trio draw,
the marquee (edition 1), the EXPO develop (edition 2). Nothing else moves.
`prefers-reduced-motion` turns it all off.

## Files

- `index.html` / `v2.html` — all the copy lives here, in order.
- `src/base.css` — shared tokens, type scale, nav, footer, reveal, switch.
  `src/v1.css`, `src/v2.css` and `src/v3.css` import it and override the
  tokens they disagree with (edition 2 flips to black and sets
  `--font-display: Exposure`; its light theme is a second token block under
  `:root[data-theme="light"]`).
- `src/common.js` — nav (with active link), reveal, count-up, footer, the
  1 · 2 switch, the scroll loop, the photo globs.
- `src/exposure.css` — the Exposure `@font-face` and the `.dev` develop rules,
  imported by editions 2 and 3.
- `src/main.js` / `src/v2.js` / `src/v3.js` / `src/v4.js` / `src/v5.js` —
  each edition's own stamping and scroll states. `window.__it` for scripted checks. `v2.js` also owns the
  dark/light theme (`data-theme` on `<html>`, set before paint by an inline
  script in `v2.html`).
- `src/bowl.js` — slim renderer around the scroll piece's `bowlGeo` /
  `bowlMaterial` / `env` modules and `data/bowlPreset.js` (all copied,
  untouched). Sizes the bowl on the stage's shorter side; `exposure`, `lean`,
  `shrink` options; `setScroll(q)`, `setTurn(rad)`, `setExposure(mult)` at
  runtime. `hover: true` = the object tilts a little toward the cursor,
  anywhere in the window. `reveal: true` = a wireframe copy of each shell is
  drawn on top, and a `gl_FragCoord` disc around the cursor fades the metal
  out and the lines in (chained onto the materials' own `onBeforeCompile`).
- `public/` — bowl GLB (Draco), normal map, teacher portraits, `teachers.json`,
  `fonts/ExposureTrialVAR.woff2`.
- `vercel.json` — `cleanUrls` so `/v2` … `/v5` serve the matching html;
  `vite.config.js` does the same rewrite in dev.

## Deploy

Vercel project `insight-timer-apple`, CLI only (`vercel --prod --yes` from this
folder), not git-linked.
