# Metalab Starter

A pre-wired Vite + React 19 boilerplate that ships with the **reverse-engineered Metalab design system** loaded as CSS tokens, plus base components (Button, Card, NavBar, Marquee, Hero, Footer) ready to drag into any layout.

Built so you can skip the first half-day of setup when the **paid Design Test** brief lands. Open the project, change the copy, ship.

> Reverse-engineering source: `projects/krea-agent/brand/metalab/DESIGN-SYSTEM.md`

---

## Quick start

```bash
cd projects/metalab-starter
npm install
npm run dev
```

Opens on `http://localhost:5173`.

---

## What's inside

```
metalab-starter/
├── public/
│   └── fonts/                 # drop licensed .woff2 here
├── figma/
│   ├── figma-plugin/          # native plugin: one-click tokens + pages + components
│   └── metalab-tokens.json    # Tokens Studio import file (fallback path)
├── src/
│   ├── styles/
│   │   ├── tokens.css         # ALL design tokens (color, type, motion, radius)
│   │   ├── fonts.css          # @font-face for Basis Grotesque Pro + PP Eiko
│   │   └── base.css           # reset + helpers
│   ├── components/
│   │   ├── Button.jsx + .css  # primary / secondary / ghost, pill radius, arrow on hover
│   │   ├── Card.jsx + .css    # 4:5 media, eyebrow + display title + meta
│   │   ├── Hero.jsx + .css    # full-bleed editorial, clamp() display type
│   │   ├── Marquee.jsx + .css # wordmark scroller, pauses on hover
│   │   ├── NavBar.jsx + .css  # sticky w/ backdrop-blur glass
│   │   └── Footer.jsx + .css  # 3-col + marquee
│   ├── lib/
│   │   └── motion.js          # dur + ease vocabulary for motion/react
│   ├── App.jsx                # demo composition using all components
│   └── main.jsx
├── index.html                 # preloads Inter as Basis fallback
├── package.json
└── vite.config.js
```

---

## Font setup

The CSS expects `Basis Grotesque Pro` (300/400/500) and `PP Eiko` (300/400) as `.woff2` files in `public/fonts/`.

**Until you drop them in, the stack falls back to:**
- Basis Grotesque Pro → **Inter** (loaded via CDN in `index.html`)
- PP Eiko → **Editorial New** if installed locally, else Times New Roman

### How to get the real fonts

Both faces are commercial. For the design test phase you have three options:

1. **Use existing licenses** if you or a former client owns Basis (Lineto) or PP Eiko (Pangram Pangram). Drop the `.woff2` files in `public/fonts/` with these exact filenames:
   ```
   basis-grotesque-light.woff2
   basis-grotesque-regular.woff2
   basis-grotesque-medium.woff2
   ppeiko-light.woff2
   ppeiko-regular.woff2
   ```
2. **Trial / personal-use licenses:** Pangram Pangram offers PP Eiko at no cost for personal/non-commercial. Lineto sells Basis trials. Acceptable for a Figma test mockup, not for live deploy.
3. **Open-source substitutes (zero cost, ships immediately):**
   - Basis Grotesque → **Inter** (already wired)
   - PP Eiko → **Big Shoulders Display** (free on Google Fonts) — closest in spirit (high contrast, condensed)

> Recommendation: keep Inter + Big Shoulders Display for the prototype, mention the substitution explicitly in your design test deliverable. It signals you understand licensing constraints and can scope accordingly.

---

## Figma — build the file

Two paths. Pick one. The custom plugin is the recommended path (free, native, no subscriptions).

### Path A — Custom plugin (recommended, free)

A native Figma plugin at `figma/figma-plugin/` builds a complete starting file in one click: tokens (Variables + Paint Styles + Text Styles), Cover page, Token specimen page, Components page (Button, Card, NavBar, Hero, Marquee, Footer), and Layout archetypes (Editorial, System, Hero).

**No Tokens Studio subscription required** (that plugin moved to €199/mo for Studio features). This plugin uses the free native Figma Plugin API.

1. Open Figma desktop → any file → top menu → **Plugins → Development → Import plugin from manifest…**
2. Select `projects/metalab-starter/figma/figma-plugin/manifest.json`.
3. Run **Plugins → Development → Metalab Design Test Builder**.
4. Tick what to build, click **Build the file**. Variables, Paint Styles, Text Styles, and pages appear automatically.

The plugin is idempotent — re-running it skips collections, paint styles, and text styles that already exist, so it's safe to iterate.

**Fonts.** If `PP Eiko` and `Basis Grotesque Pro` aren't installed locally, the plugin falls back to **Big Shoulders Display** + **Inter** automatically (same as the React boilerplate).

### Path B — Tokens Studio JSON (fallback)

A `figma/metalab-tokens.json` file is also included for Tokens Studio users who already have the plugin installed.

1. Install **Tokens Studio for Figma** (<https://tokens.studio>).
2. Open it → gear icon → **Tools → Load from file/folder or preset** → select `figma/metalab-tokens.json`.
3. Click the paintbrush → **Apply to document → Create styles**.

### To install the real fonts in Figma

If you're running Figma desktop, install the `.ttf`/`.otf` files of Basis Grotesque Pro and PP Eiko in macOS Font Book — Figma picks them up automatically. If you only have web `.woff2`, convert them to `.otf` with [transfonter.org](https://transfonter.org).

---

## Component cheat-sheet

```jsx
import { Button } from './components/Button'
import { Card } from './components/Card'
import { Hero } from './components/Hero'
import { Marquee } from './components/Marquee'
import { NavBar } from './components/NavBar'
import { Footer } from './components/Footer'

<NavBar links={[{ href: '/x', label: 'X' }]} cta="Say hey" />

<Hero
  eyebrow="Section label"
  title="A headline that does the lifting."
  body="One paragraph of supporting copy in Basis 24px / 140%."
>
  <Button variant="primary">Primary action</Button>
  <Button variant="secondary">Secondary</Button>
</Hero>

<Card image="/img.jpg" eyebrow="Brand" title="Project title" meta="2026" href="/case" />

<Marquee text="Metalab" repeat={8} speed={20} />

<Footer />
```

---

## Token cheat-sheet

```css
/* color */
color: var(--brand-primary);   /* #584dff */
background: var(--surface-pure);

/* type */
font-family: var(--font-display);          /* PP Eiko */
font-size: var(--display);                 /* 120px */
letter-spacing: var(--track-display-tight); /* -0.04em */
line-height: var(--leading-display);        /* 0.9 */

/* motion */
transition: color var(--dur-ui) var(--ease-default);

/* layout */
border-radius: var(--radius-pill);
padding: var(--space-4) var(--space-5);
```

Full reference in `src/styles/tokens.css` (95 tokens total).

---

## Design test playbook

When the brief lands:

1. **Read the brief twice.** Note: required deliverables, format (Figma + prototype? PDF? URL?), deadline.
2. **Decide the format mix in 15 minutes:**
   - Brand campaign → Figma + key visuals + 1-page system in PDF
   - Landing page → Figma high-fi + this React boilerplate deployed on Vercel
   - Marketing system → Figma library + token JSON + 1 implemented section in React
3. **First hour:**
   - `npm run dev` — confirm boilerplate runs
   - Duplicate `App.jsx` into `App.draft.jsx` and start replacing copy
   - Open the Figma file with Tokens Studio loaded, start the visual concept in parallel
4. **Last hour before submission:**
   - Loom: 3-minute walkthrough of your thinking. Record once, no editing.
   - Write the cover note: 3 short paragraphs — what you understood, your direction, what you'd do next with more time.

---

## Deliverable structure (suggested)

```
DESIGN-TEST-METALAB/
├── 01_thinking.pdf          # 4-6 pages: brief recap, direction, references
├── 02_visual.fig            # Figma file, polished
├── 03_prototype/            # this React boilerplate, deployed on Vercel
│   └── (live URL in cover note)
├── 04_walkthrough.mp4       # 3-min Loom export
└── README.md                # cover note + how to navigate
```

---

## License & credit

Tokens reverse-engineered from the public `metalab.com` CSS for educational / interview-prep purposes. Not affiliated with Metalab. The Basis Grotesque Pro and PP Eiko fonts are commercial products of Lineto and Pangram Pangram respectively — license appropriately before any commercial use.
