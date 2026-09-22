# Insight Timer — the Apple-grammar rebuild

A single white page, one idea per chapter, big type set in the system sans,
the object photographed large and left alone. Built after the client turned
down the scroll-driven piece in `../wide-angle-sphere`: same content, same
photographs, same bowl, none of the choreography.

## Run

```bash
npm install
npm run dev        # http://localhost:5205
npm run build      # dist/
node shots/tour.mjs [url]   # screenshots of every chapter + a probe (needs Chrome)
```

## The page, top to bottom

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

## Motion budget

Reveal-on-enter (IntersectionObserver → `.is-in`, `--i` stagger), the sticky
chapter's active step, the bowl's lean, the count-up, the trio draw, the
marquee. Nothing else moves. `prefers-reduced-motion` turns it all off.

## Files

- `index.html` — all the copy lives here, in order.
- `src/styles.css` — tokens (`--ink #1d1d1f`, `--gray #f5f5f7`, `--accent`
  = the bowl's gold), type scale, every chapter.
- `src/main.js` — stamps the data (teachers, techniques, team, partners,
  footer) and runs the one scroll loop. `window.__it` for scripted checks.
- `src/bowl.js` — slim renderer around the scroll piece's `bowlGeo` /
  `bowlMaterial` / `env` modules and `data/bowlPreset.js` (all copied, untouched).
- `public/` — bowl GLB (Draco), normal map, teacher portraits, `teachers.json`.

## Deploy

Vercel project `insight-timer-apple`, CLI only (`vercel --prod --yes` from this
folder), not git-linked.
