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
- **Edition 3** (`/v3`, key `3`) — the essay. Narrative led: one measured
  column of reading in Exposure, a wide captioned photograph between
  chapters, and the four editorial modules — a byline of three faces instead
  of a wall of thirty, the directory as one sentence, one big number, a
  masthead of names and roles. Nothing is a grid. (The bento was set aside
  after the "too busy" note.)
- **Edition 4** (`/v4`, key `4`) — the object. Apple's product-page grammar:
  the bowl pinned on the left for the whole read, turning half way, leaning
  a little and taking more light as the chapters pass on the right. White,
  system sans, Exposure only for numerals. Every chapter sits on one
  two-column grid (a narrow label column, a 520px text column) and says one
  thing, with the same editorial modules as edition 3. Under the bowl, eight
  short strokes fill as the chapters are read.
  The cursor pulls the object a little anywhere on the page and, over it,
  reveals the wireframe under the metal (a soft disc, a fragment-shader mask
  on the bowl's own materials).
- **Edition 5** (`/v5`, key `5`) — the book. A contents page first: every
  chapter a line in Exposure with a dotted leader running to its figure
  (hover a line, its plate appears in the margin). The bowl as a
  frontispiece in a wide band. Then spreads: a narrow margin with the
  numeral, a small plate and its caption; a wide column with the words and
  the same editorial modules. A folio at the bottom keeps the page. Warm
  paper #faf9f6.

- **Edition 6** (`/v6`, key `6`) — the instrument. One black stage: the bowl
  and a mallet. Strike it and it rings for real (Web Audio: the six radial
  modes of a Tibetan bowl, each a beating pair of sines, with a mallet tick
  and a room); the metal vibrates (the same modes as a vertex displacement,
  slowed down so the eye can follow, antinode at the strike); the sound is
  drawn as rings leaving the rim and as a circular oscilloscope of the real
  waveform. Circle the rim and it sings. The story is read by playing:
  every strike, once the last one is past its peak, brings the next line,
  which develops (EXPO 100 → 0) while the sound lasts and fades as it decays.

- **Edition 7** (`/v7`, key `7`) — the ripple. The instrument of edition 6,
  and around it, built chapter by chapter as you scroll, the whole of Insight
  Timer laid out on the table: the 45 categories as a crown of lines on the
  rim (length = techniques, each sings in its own note), the thirty most
  followed teachers standing round the bowl (grey until the sound reaches
  them), the three sources of evidence as three circles meeting under it,
  thirty million members as 3,000 points of light. Every strike sends a
  ripple through all of it. The panel on the left shows the chapter, and
  whatever is under the pointer: a category and its techniques, a teacher, a
  source, the team.

Keys `1` … `7` switch edition (also the small switch bottom left; bottom
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
node shots/tour6.mjs [url] [w] [h] [outDir] # edition 6: attract, hover, strike, sing, next line, keys (prints levels/energies)
node shots/tour7.mjs [url] [w] [h] [outDir] # edition 7: every chapter, crown aim + strike + note, teacher hover, ripple lighting, sources, members, rail, singing
node shots/voice-probe.mjs                  # the synth alone: strike decay, waveform, rub build
node shots/waves-probe.mjs                  # the overlay alone: ring growth, scope circle
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

Hero (Exposure title developing, the bowl below), statement, a wide
photograph, People (byline), a photograph, Ways (the sentence), Science (the
three circles as "Fig. 1" with a caption), a photograph, Numbers (30M+ then
three small figures), Masthead (names and roles, partners as a line), close.
Everything in a 680px measure; photographs at the 1120px wrap.

## The editorial modules (`src/editorial.css`, helpers in `common.js`)

- `.byline` — `mountByline(el)`: three faces from the real most-followed
  list and "Sarah Blondin, davidji and Tara Brach, with 25,997 more teachers."
- `.ways` — `waysSentence(10)`: the ten biggest categories as one Exposure
  sentence, "Plus 35 more categories."
- `.bignum` + `.figrow` — one counted number, three small figures under a rule.
- `.masthead` + `.partners-line` — `masthead(el, TEAM)`, `partnersLine(el, PARTNERS)`.

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

Contents (eight `.toc` lines, `data-plate` names the hover plate), the
frontispiece band with the bowl and "Plate I" caption, the display title,
then seven `.spread` sections (`.margin` numeral + label + `figure.plate`,
`.body` headline + lead + `.module`), and the colophon. The folio reads the
page off `chapterFills()`. Plates are `set:index` into the photo globs.

## Edition 6, how it is built

- `src/bowlVoice.js` — the synth. `createBowlVoice({ f0 })` → `ensure()` (from
  a gesture), `strike({ strength, brightness })`, `rub(rate)` per frame,
  `update(dt)` per frame, `energies()` (six 0..1), `level`, `waveform(out)`,
  `setMuted()`. Six partials at [1, 2.78, 5.31, 8.55, 12.3, 16.6] × f0, each a
  pair of sines split by a beat of 1.3 … 7.5 Hz; decay taus 11 … 1.1 s; a
  JS energy model per partial writes the gains; compressor → dry + convolver
  (2.6 s synthesised room, wet 0.28) → master → analyser.
- `src/waves.js` — the overlay. `createWaves(canvas)` → `resize()`,
  `setCenter(x, y, r)`, `strike()`, `pulse(level)`, `scope(samples, gain)`,
  `draw(dt)`. Rings pooled (24), one colour, alpha only.
- `src/bowl.js` with `ring: true` — `withRing(mat)` chains a vertex
  displacement onto the bowl materials' own `onBeforeCompile` (after their
  `vBsPos = transformed;`, so the relief stays welded): mode k bends the
  wall into cos((k+2)θ), weighted to the rim. `setModes(energies, theta)`,
  `pulse()` (a strike squash on the group scale), `pick(x, y)` (raycast on
  the shells + the rim plane: `theta`, `planeR` where 1 = the rim),
  `toScreen()`, and `rim / group / norm` exposed for the mallet. Picking
  never touches the two million triangles of the shells: the outer shell's
  profile is sampled once into a 6k-triangle lathe proxy (0.2 ms per pick).
- `src/v6.js` — the mallet (a felt head and a wooden handle in the bowl's
  group, riding the rim at the pointer's angle: hovering, pressed, laid
  down), pointer → strike (on the metal or just inside the rim) and rub
  (moving on the rim band 0.78 … 1.5, rate from angular speed, read once per
  frame, decaying when the mallet is held still), keys (Space, ← →, M), the
  silent attract strike (until anything is touched), the story rule (each
  strike, given 2.5 s since the last, brings the next line), and one frame
  loop that reads the voice and writes the bowl, the waves, the text and the
  glow. Input is never gated on the AudioContext: strike and press happen
  synchronously, `ensure()` is fire-and-forget from the same gesture (and
  from pointerup, the activation event on touch). A hidden tab ramps the
  master out and suspends the context; blur lets go of every held key.

## Edition 7, how it is built

- `v7.html` — one `.ripple` section eight stage-heights tall with a sticky
  `.stage`; seven `.chap` articles in the left panel, one on at a time; a
  `.live` block the frame loop rewrites; a rail of seven filling strokes.
- `src/field.js` — the table, in 2D on two canvases that sandwich the WebGL
  one. It projects group-space points with the bowl's own camera; a point
  behind the bowl's centre goes on the back canvas (the metal hides it), the
  rest on the front one. `ring`, `scope`, `segment`, `dots` (alpha-binned so
  3,000 points are a dozen fills) and `label` (clamped to the stage).
- `src/mallet.js` — the mallet of edition 6 as a module (`target`, `hit`,
  `lay`, `place`), now shared by editions 6 and 7.
- `src/bowlVoice.js` — `banks: 3`: a strike at a new pitch takes the
  quietest bank and retunes it, so the note still ringing keeps its pitch.
  `strike({ f0 })`, `voice.f0`.
- `src/bowl.js` — `setShift(x, y)` and `setSize(v)`, so edition 7 can frame
  the object off centre and grow the lean with the scroll.
- `src/v7.js` — the data (categories sorted by count, longest at the back;
  teachers by followers, most followed at the front; the notes D3 … G4 by
  count), the ripples (`waveAt(r)`: what any layer at radius r gets lit by),
  the chapter maths (`rv.dial/teachers/science/dots` are smoothsteps of the
  scroll), hit tests in screen space, and one frame loop.

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
  imported by editions 2 to 5.
- `src/editorial.css` — the four editorial modules, imported by editions 3 to 5.
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
