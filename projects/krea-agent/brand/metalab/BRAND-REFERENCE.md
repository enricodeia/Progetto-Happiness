# Metalab — Brand Reference Kit (reverse-engineered)

> **Honest framing.** This is **NOT Metalab's internal working design system.** It is their *public brand* — the visual language they use on `metalab.com` to talk about themselves to the world. Metalab is a studio that builds bespoke design systems for 90+ clients (Midjourney, Nike, Loom, Suno, Coinbase, TED, Patreon, Headspace, Pitch, Genies, Webflow, Calvin Klein, etc.) — there is no single "Metalab design system" that gets reused across client work.
>
> **Why this matters for the design test.** The brief will likely ask you to design *for a hypothetical client*, not to replicate Metalab's own brand. Use this kit to demonstrate cultural fluency with their aesthetic, not as something to copy. Your real job in the test is to apply *your own* brand-level thinking to a fresh problem, in a way that feels like it could live next to the case studies on `metalab.com/work`.
>
> **For the practice-level analysis** — how Metalab actually works, the cluster of clients they serve, what their case studies reveal about their methodology — see [`PRACTICE-NOTES.md`](./PRACTICE-NOTES.md).

Reverse-engineered from the live `metalab.com` site (home, what-we-do, about, blog, contact) by inspecting the production CSS bundle and rendered markup. Every token below is observed in the wild — not invented.

> Source bundle inspected: `/_next/static/css/15230c8daab2ecff.css` (~287 KB). Stack: Next.js. Slider: Swiper.

---

## 1. Brand voice (observed)

**Tagline:** *"We make interfaces."*
**Positioning line:** *"Since 2006, we've helped the most innovative startups and reputable brands design, build, and ship products worth talking about."*
**Social proof line:** *"Odds are you've used a product we've built."*
**Recruiting tone:** *"Your career — our open roles."*
**Newsletter line:** *"Sign up to our newsletter and keep up with the cool kids."*
**Contact CTA:** *"Say hey."*

Voice = confident, plain-spoken, slightly cheeky. Sentences are short and declarative. No corporate filler. Wordmark "Metalab" repeats horizontally as a marquee/brand stamp.

---

## 2. Typography

### 2.1 Type families

Two faces only. Both loaded as self-hosted `woff2` via `@font-face` with `font-display: swap`.

| Role | Family | Weights loaded | Use |
|---|---|---|---|
| **Primary (UI + body)** | **Basis Grotesque Pro** | 300, 400, 500 | All UI text, navigation, body, CTAs, labels |
| **Display (editorial)** | **PP Eiko** | 300, 400 | Hero headlines, large editorial display, accent quotes |

Both fall back to `sans-serif`. No serif body. No mono. The contrast between the rational neogrotesque (Basis) and the high-contrast, almost stencil-feel of PP Eiko is the entire typographic identity.

### 2.2 Base unit

`html { font-size: 10px }` — meaning `1rem = 10px`. Every size below is rem-based on that anchor.

### 2.3 Type scale (observed sizes)

```
12px  →  1.2rem    micro / labels
14px  →  1.4rem    caption
16px  →  1.6rem    small body
18px  →  1.8rem    body
20px  →  2.0rem    body-lg
22px  →  2.2rem    lead small
24px  →  2.4rem    lead
26px  →  2.6rem    h6
28px  →  2.8rem    h5
32px  →  3.2rem    h4
36px  →  3.6rem    h4-lg
40px  →  4.0rem    h3
44px  →  4.4rem    h3-lg
56px  →  5.6rem    h2
64px  →  6.4rem    h2-xl
68px  →  6.8rem    h1-sm
84px  →  8.4rem    h1
88px  →  8.8rem    h1-lg
109px →  10.9rem   display-sm
110px →  11rem     display
120px →  12rem     display-lg
140px →  14rem     display-xl
163.2px → 16.32rem display-xxl
220px →  22rem     hero
272px →  27.2rem   hero-mega
```

**Rule of thumb:** UI/body lives 12–24px. Editorial display jumps straight to 64px+ (no "medium-big" zone — hierarchy is enforced by *size jumps*, not scale steps).

### 2.4 Letter-spacing (tracking)

Always **negative** on display, near-zero on body, slightly positive only on small caps/eyebrows.

| Token | Value | Use |
|---|---|---|
| `--tracking-display-tight` | `-0.04em` | Hero/display |
| `--tracking-display` | `-0.03em` | Large headlines |
| `--tracking-headline` | `-0.02em` | h1–h3 |
| `--tracking-body-tight` | `-0.015em` | h4–h6, lead |
| `--tracking-body` | `-0.01em` | body, UI |
| `--tracking-default` | `0` | inputs, raw |
| `--tracking-eyebrow` | `0.01em` | uppercase labels |

### 2.5 Line-height

| Use | Value |
|---|---|
| Display / hero | `0.8` – `1.0` |
| h1–h3 | `1.0` – `1.16` (114–118%) |
| h4–h6 / lead | `1.2` – `1.3` (120–130%) |
| Body | `1.4` – `1.5` (140–150%) |
| Long-form blog | `1.6` (160%) |

### 2.6 Editorial principle

> "Type is the structure. Color is the accent."

Headlines do the heavy emotional lifting. PP Eiko reserved for *the moment* — never used twice in the same viewport. Basis carries everything else with quiet competence.

---

## 3. Color system

Extracted by frequency from production CSS (top usage counts in parentheses).

### 3.1 Brand

| Token | Hex | Usage count | Meaning |
|---|---|---|---|
| `--brand-primary` | `#584dff` | **125** | Signature electric indigo. The Metalab purple. CTAs, key links, brand mark, focus states. |
| `--brand-accent` | `#ff6060` | 62 | Coral red. Hover, hot states, highlights, stickers. |
| `--brand-accent-deep` | `#b60000` | 62 | Deep red. Active/pressed pair for the coral. |

The whole identity hinges on **#584dff** — it's the only saturated cool tone on the site. Everything else is built around it.

### 3.2 Neutrals (Material You-style ramp)

| Token | Hex | Notes |
|---|---|---|
| `--ink-pure` | `#000` | Pure black — used 134× |
| `--ink-near` | `#171717` | Near-black — body on light bg |
| `--ink-strong` | `#313033` | Strong gray, headings on light |
| `--ink` | `#48464a` | Default ink |
| `--ink-muted` | `#545156` | Muted body |
| `--ink-soft` | `#605d62` | Soft body, captions |
| `--ink-softer` | `#79767a` | Tertiary text |
| `--ink-faint` | `#938f94` | Faint, disabled |
| `--surface-divider` | `#aeaaae` | Hairlines, dividers |
| `--surface-line` | `#bababa` | Borders |
| `--surface-mute` | `#cac5ca` | Quiet surfaces |
| `--surface-soft` | `#c7c7c7` | Soft surfaces |
| `--surface-paper` | `#edf1f5` | Off-white paper |
| `--surface-tint` | `#e6e1e6` | Subtle tinted bg |
| `--surface-warm` | `#f4eff4` | Warm off-white |
| `--surface-pure` | `#fffbff` | Near-white |
| `--surface-white` | `#fff` | Pure white — used 132× |

### 3.3 Functional / signal

| Token | Hex | Meaning |
|---|---|---|
| `--signal-success` | `#14a800` | Success / confirmation green |
| `--signal-link` | `#007aff` | System blue (rare, system-style links) |
| `--signal-deep` | `#100037` | Deep navy on tinted dark surfaces |

### 3.4 Mode pairings (observed)

- **Light mode:** `#fff` background, `#171717` body, `#584dff` accent.
- **Dark mode:** `#000` background, `#fff` body, `#584dff` accent (unchanged — purple holds in both).
- **Tinted surfaces:** `#edf1f5` (cool paper), `#f4eff4` (warm paper) for differentiated sections inside light mode.

---

## 4. Spacing & layout

### 4.1 Grid

- 12 columns desktop, 6 tablet, 4 mobile.
- Generous full-bleed sections — content commonly breaks the grid for hero/display moments.
- Carousel/slider uses **24-step pagination** (numbered 1–24 visible in markup) — observed across home, about, contact.

### 4.2 Border-radius

A barbell — either nearly flat or fully pill/circular. No "soft modern" middle.

| Token | Value | Use |
|---|---|---|
| `--radius-flat` | `0` | Editorial sections, images |
| `--radius-hairline` | `0.2rem` (2px) | Inputs, hairline cards |
| `--radius-card` | `0.8rem` (8px) | Cards, surfaces |
| `--radius-card-lg` | `1rem` (10px) | Large cards |
| `--radius-card-xl` | `3rem` (30px) | Modules, hero blocks |
| `--radius-block` | `5rem` (50px) | Big blocks |
| `--radius-pill` | `100rem` | CTAs, tags, chips |
| `--radius-circle` | `50%` | Avatars, dots |

---

## 5. Motion

### 5.1 Durations

```
.1s   tap feedback (rare)
.2s   border / fill toggles
.3s   bg-color hovers
.4s   color / fill / border transitions (default)
.6s   composed transitions
.7s   backdrop-filter, large fades
1s    section reveals
2s    ambient
3s    longer ambient
6s    slow loops
7s    drift loops
9s    long ambient
20s   marquee / wordmark loop
```

### 5.2 Principles

- **Default UI duration: `0.4s`.** Borders, colors, fills.
- **Glassmorphism is real:** `backdrop-filter` transitions at `0.7s` for nav and overlays.
- **Long ambient > parallax.** They never use parallax. They use slow background loops (6–20s) and the wordmark marquee.
- **Easing:** primarily `ease-in-out` and the browser default. No flashy spring physics. Tone is *measured, not playful*.

---

## 6. Components (observed patterns)

### 6.1 Navigation
- Sticky top nav with `backdrop-filter` blur on scroll.
- Logo wordmark "Metalab" (not the 4-point star) sits left.
- Right side: 3–4 link nav + a CTA.

### 6.2 Wordmark marquee
- Horizontal scrolling "Metalab Metalab Metalab" repeated as a brand stamp on hero and contact pages.
- Speed: ~20s loop. Pauses on hover.

### 6.3 Hero
- Full-bleed image carousel, **24 slides**, numbered pagination bottom-right.
- Headline overlaid in PP Eiko, `8.4rem`–`16.32rem`, white on dark or `#171717` on light.
- "HoverDrag" interaction component for cursor → drag affordance on hero media.

### 6.4 Buttons / CTAs
- **Primary:** pill (`border-radius: 100rem`), bg `#584dff`, text `#fff`, padding ~`1.6rem 2.4rem`, transitions `border-color .2s, background-color .2s, padding-right .2s`. The padding-right transition produces the classic "arrow slides on hover" effect.
- **Secondary:** transparent bg, `1px` border `#171717`, hover swaps to filled.
- **Tertiary / inline link:** underline appears on hover, `border-color .4s`.

### 6.5 Cards (work / blog)
- `border-radius: 0.8rem`–`1rem`, white bg, no shadow at rest, subtle bg shift on hover (`background-color .4s`).
- Image first, eyebrow/category in `1.2rem` Basis 500 caps with positive tracking, title in PP Eiko `2.8–3.6rem`, meta in `1.4rem` Basis 400.

### 6.6 Forms (contact page)
- Label-above-input.
- Required marked with `*`.
- Field set: Name, Email, Message, company stage dropdown (Early / Mid / Late / Enterprise), newsletter checkbox.
- Submit button states: idle → "Submit" / loading → "Sending" / success → "Message received".
- Inputs: `border-radius: 0.2rem`, `1px` border, focus ring tinted with `#584dff`.

### 6.7 Footer
- Wordmark marquee top.
- Three columns: contact, social, sitemap.
- Email exposed: `contact@metalab.com`.

---

## 7. Photography & imagery

- **Style:** documentary lifestyle. Real teams in real spaces. Natural light, warm white balance.
- **Subjects:** people > product. Distributed team across 19+ cities.
- **Treatment:** light grade, slightly warm, low-contrast. No heavy LUTs. No stock.
- **Crops:** vertical 3:4 dominant for portraits (1500×2000px observed). Full-bleed 16:9 for environment shots.
- **Composite work:** 3D / abstract renders appear only in product/case-study contexts, never on team or about pages.

---

## 8. Iconography

- Minimal. Most "icons" are typographic or geometric primitives.
- Swiper's built-in icon font for slider arrows (`swiper-icons`).
- Logo: 4-point star (the monolith motif) — kept *separate* from the wordmark in nav contexts. Wordmark used for navigation/marquee, star used for brand stamps and favicon.

---

## 9. The four operating principles

Distilled from how the system actually behaves on the live site:

1. **Two faces, infinite hierarchy.** Basis carries the rational layer, PP Eiko carries the emotional moments. Never more than one PP Eiko block per viewport.
2. **One hot color.** `#584dff` is the only saturated tone allowed to dominate. Coral `#ff6060` is a guest, not a co-star.
3. **Editorial scale, not modular scale.** Display jumps from 24px to 64px+ with no in-between, forcing decisive hierarchy choices.
4. **Slow ambient over fast micro.** 0.4s for UI, 6–20s for atmosphere. Nothing in between gets animated for its own sake.

---

## 10. Token export (drop-in)

```css
:root {
  /* fonts */
  --font-sans: "Basis Grotesque Pro", system-ui, sans-serif;
  --font-display: "PP Eiko", "Basis Grotesque Pro", serif;

  /* base */
  --base-rem: 10px;

  /* scale */
  --text-xs: 1.2rem;   --text-sm: 1.4rem;
  --text-base: 1.6rem; --text-md: 1.8rem;
  --text-lg: 2.0rem;   --text-xl: 2.4rem;
  --h6: 2.8rem;  --h5: 3.2rem;  --h4: 4.0rem;
  --h3: 5.6rem;  --h2: 6.8rem;  --h1: 8.8rem;
  --display: 12rem; --display-xl: 16.32rem; --hero: 22rem;

  /* tracking */
  --track-display: -0.04em;
  --track-headline: -0.02em;
  --track-body: -0.01em;
  --track-eyebrow: 0.01em;

  /* leading */
  --leading-display: 0.9;
  --leading-headline: 1.16;
  --leading-body: 1.5;
  --leading-long: 1.6;

  /* color — brand */
  --brand-primary: #584dff;
  --brand-accent: #ff6060;
  --brand-accent-deep: #b60000;

  /* color — ink */
  --ink-pure: #000;
  --ink-near: #171717;
  --ink-strong: #313033;
  --ink: #48464a;
  --ink-muted: #605d62;
  --ink-soft: #79767a;
  --ink-faint: #938f94;

  /* color — surface */
  --surface-pure: #fff;
  --surface-paper: #edf1f5;
  --surface-warm: #f4eff4;
  --surface-mute: #cac5ca;
  --surface-line: #bababa;

  /* color — signal */
  --signal-success: #14a800;
  --signal-link: #007aff;

  /* radius */
  --radius-flat: 0;
  --radius-hairline: 0.2rem;
  --radius-card: 0.8rem;
  --radius-card-lg: 1rem;
  --radius-card-xl: 3rem;
  --radius-block: 5rem;
  --radius-pill: 100rem;

  /* motion */
  --dur-tap: 0.2s;
  --dur-ui: 0.4s;
  --dur-glass: 0.7s;
  --dur-section: 1s;
  --dur-ambient: 7s;
  --dur-marquee: 20s;
  --ease-default: cubic-bezier(0.4, 0, 0.2, 1);
}
```

---

## 11. How to apply this for portfolio / personal use

You're applying for **Senior Brand Designer (Marketing)** at Metalab. Use this document as:

- **Pre-interview reference:** when you mock a hypothetical Metalab landing page or campaign, ground every decision in these tokens. Don't invent a font. Don't invent a purple.
- **Talking points:** the *editorial-scale-not-modular-scale* observation (§9.3) and *one hot color* (§9.2) are the kind of insights that signal you've actually looked at the brand, not just admired it.
- **Adjacent reuse:** for your own marketing site, pick a *different* signature color (don't copy `#584dff`) but borrow the structural rules: two-face system, base-10 rem, barbell radii, slow-ambient motion.
- **For the Sliced Monolith campaign:** ensure compositing in Figma uses Basis 400 for any tagline overlay and PP Eiko 300 for any single hero word. Match the existing voice.

---

*Generated 2026-04-27 from live site inspection. Refresh by re-fetching `/_next/static/css/<hash>.css` if Metalab redeploys.*
