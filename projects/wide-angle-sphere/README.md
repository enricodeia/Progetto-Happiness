# Wide Angle Sphere — the hero, three pinned steps, and Atlas

Three acts on one page:

1. **The hero** — the Insight Timer nav bar (the logo left, the **search dead
   centre** on the viewport's own centre line, one black button right) and
   **one display line with the bowl sitting inside it**:
   "We Guide" · the bowl · "You Through". The paragraph is in the bottom-left
   corner, above the **player** (fixed, bottom-left — see its own section);
   the fanned deck of video cards that used to sit bottom-right is gone.

   It arrives as **ONE GSAP timeline** (`hero.seq`), staggered word by word:
   *We* · *Guide* · the bowl · *You* · *Through*. Nothing in it is a delay —
   every unit is a tween at its own position on one timeline, and they
   **overlap**, because `stagger` is smaller than the durations and both leads
   are negative. The first word of a half is allowed to be slower than the ones
   after it (`firstDur` vs `wordDur`), which is what makes the eye land before
   the sentence starts moving.

   The two halves are placed **independently, both measured from the centre
   line of the viewport**: `hero.leftGap` is how far the END of the left half
   sits from it, `hero.rightGap` how far the START of the right half does. That
   is what keeps the bowl dead centre between them however long each piece of
   lettering is — a centred row puts the bowl off-centre in its own gap the
   moment one side is a word longer than the other — and each half keeps its
   own `Y`, so either can be put exactly where it is wanted.
2. **Act two** — 200vh of sticky in which the bowl grows, leans and rolls,
   and **two beats arrive across it**: the long one high on the LEFT, then
   "Until now" low on the RIGHT. Neither beat is scrubbed, and **neither
   leaves** (see below).
3. **Three sticky sections.** The first is the canvas experience — three
   steps, photograph + glass card on the left, the sphere on the right. The
   second carries steps 4–6 of the **same clock**: the statement, then the
   three sources of evidence stacked under it, one filling per step. Only then
   does
   **Atlas** arrive, **collapsing over that one** while it is still pinned, and
   draw its knot through the rest of its own scroll. It casts **no shadow**
   (`atlas.shadow`) — the section underneath is going to hold an animation of
   its own, and a shadow creeping over it while it plays is wrong.

The bowl **never moves off centre**, and **its run ends with act two**:
`poses.hand` and `poses.pin` are the same pose on purpose, so from the moment
the pinned section engages it neither moves nor scales again — the canvas
section gets a bowl that is simply there, turning.

**And that section is its last.** The bowl layer sits at `z-index: 4`, above
the canvas section (3) so it can float on the seam of the two columns, and
BELOW the two sections after it (5). So the held section rises straight over it
and covers it: the bowl leaves the way everything else on this page leaves, by
being taken over, not by fading under something. Its last frame is the last
frame of the canvas section, and scrolling back up uncovers it exactly in
place. `bowl.fadeAfter` only starts once that cover is already complete — it is
never seen, it is there so the bowl is not still being drawn behind an opaque
stage and cannot come back out over the empty tail of the page.

As the page scrolls out of the hero the two halves of the line **slide apart**
(`hero.drift`, vw) and **close again on the way back up**. The offset is read
straight off the scroll, never tweened, so it cannot end up stuck.

The **nav bar is sticky** (`hero.nav.sticky`), with a soft fade under it whose
colour follows whichever ground is underneath, so it never shows as a band of
the wrong paper over the Atlas.

| section | left column | right |
|---------|-------------|-------|
| 1 · One | photograph + glass card | one portrait, dead centre; the sphere starts blooming at `assembly.startFrac` of this step |
| 2 · Sphere | " | the rest arrive, lens 30° → 90° |
| 3 · Pills | " | the category pills appear among them; **the copy stays** (`textOut: 0`) |
| 4–6 · Evidence | — | **on the right**: the statement, then the three sources with a rail from each down to the next |
| **Atlas** | — | the knot draws itself, three cards on its lobes |

The page is **#faf9f2 paper** from the top down, the canvas is the only white
on it, and the Atlas brings its own ground (`#EEE9E2`, from the preset).

**The canvas lives inside the first stage.** It is not a fixed layer with a
clip, a fade or a switch: it is an ordinary child of `#stageA`, so the section
**arrives from below** like any other and pins. (A fixed layer with a
travelling reveal was tried and rejected: it read as a window opening over the
image, or as a jump.)

**The held section rises over it** the ordinary way — `#pinA`'s tail IS
`#pinB`'s run-in, the `scroll.handoverVh` — and **the Atlas collapses over
THAT**: `#pinC` starts `atlas.overlapVh` early, by a negative margin, and sits
above everything (`z-index: 5`, over the bowl's own layer). Its stage is
opaque, so it simply rises over the held one — still pinned behind it — and
covers it. `#pinB` is given exactly that much extra height to hold for, so
nothing is ever cut short.

**The video cards are no longer mounted (2026-09-17)** — replaced by the
player, bottom-left (his ask: *"un componente che sia al posto del componente
che ora abbiamo nella hero per i video"*). `src/cardswap.js` and its `cards`
config stay on disk, exactly as the big scroll panel did, one import away
from coming back. What follows describes it as built.

Those video cards were **React Bits' `Stack`**, ported to vanilla in
`src/cardswap.js`: a deck fanned by `cards.fan` degrees each, turning about its
own corner. Nothing moves on its own. **Drag the top card** and it tilts in 3D
towards the pointer (`rotateX` / `rotateY` off the drag offset, `elastic` of
the pointer followed); pull it past `sensitivity` and it is thrown to the back
of the deck, otherwise it springs home. **Click it** and it goes straight to
the back. The spring is the component's own — stiffness 260, damping 20 —
integrated as a GSAP ease so the motion matches rather than approximating it.
Images come from `src/cards/`, falling back to the portraits.

The `z-index` goes on the **drag wrapper**, not on the card inside it: the
wrappers are what the pointer hits, and with `z-index: auto` on them the deck
hands every click to the last one in the DOM instead of the one on top.

```
npm install
npm run dev       # http://localhost:5199
npm run verify    # puppeteer pass → shots/*.png + 208 checks
                  # (run it ALONE — a concurrent `vite build` starves the
                  #  headless tab and skews GSAP's clock into false KOs)
```

**`2` is V2, `1` is V1** (the choice is remembered) · `C` **hides everything**
(every panel, the markers, the legend) · `T` titles panel (left) · `B` bowl
panel (right) · `M` markers · **drag the sphere in any direction** ·
everything is in `src/config.js` (and everything the Atlas is, in
`src/atlas/preset.json`). The big "Wide Angle Sphere" scroll panel is gone
(his ask, 2026-09-16 — see **The panel**, below); only Titles and Bowl are
left, one each side of the screen.

## V2 — the ring act (`2` / `1`)

**One switch**, and it changes the SHAPE of the middle of the page. `2` puts V2
on, `1` takes it back, the choice is remembered across reloads, and V1 does not
know V2 exists — its layers are `display: none`, so nothing it measures from
moves.

| | V1 | V2 |
|---|---|---|
| `#pinA` steps 1-3 | the canvas experience | **the ring act** |
| `#pinB` steps 4-6 | the evidence panel | **the evidence panel, with the canvas in a corner of it** |

`sections.canvasFrom` is the one number that says which block of three the
canvas experience owns — 0 in V1, 3 in V2 — and the clock measures the assembly
and the pills from it rather than from step 0. The **evidence panel always rides
the second sticky**; in V2 it simply shares that section with the canvas, which
sits in a box in the **bottom-left corner** (`v2.canvasBox`) instead of taking
the frame. Each version has its own `steps` array (`v2.steps`), so switching is a
swap, not a migration, and the panel is **rebuilt** on a switch because every
binding that points at a step object would otherwise still be editing the other
version's.

### The canvas box actually renders (a real bug, now fixed)

`observeEnter()` — the IntersectionObserver that fires `sphere.startHeroIntro()`
once the canvas's stage is far enough on screen — was hard-wired to `#stageA`.
In V2 the canvas lives in `#stageB` (`placeStages()` moved it there), so the
observer was watching a stage the canvas had already left: the portrait's fade
never started, every card sat at opacity 0 forever, and the box in the evidence
section was a blank white square. It now watches whichever stage is actually
hosting the canvas, is re-armed on every version switch, and
`maybeStartHeroIntro()` is a synchronous backstop for the case where switching
version lands the box already on screen with no further scroll to trigger a
fresh intersection callback.

The same mismatch was in `applyLive()`'s sphere on/off toggle (it read
`#pinA`'s visibility even when the canvas had moved to `#pinB`) — fixed
alongside it. `npm run verify` now reads the sphere's own scene graph
(`uOpacity`/`uHasTex` on the card materials) to assert cards are genuinely
drawn in the box, not just that the box is positioned correctly.

### The nav has no band

`hero.nav.fade: 0`. The soft gradient kept type clean as it passed under the
bar, but it cuts a rectangle of the wrong paper across everything the page opens
into. Raise it and it comes back.

### One reveal for the whole of V2 — strictly in place

`v2.reveal`: opacity **0 → 1** while Exposure's EXPO axis travels **+100 → −10**,
and that is the whole of the motion — **zero vertical travel, in or out**. A
rail (rise from below, carry on past on the way out) was tried and reverted: it
read as arriving from underneath, which is exactly what this reveal must never
look like. The exit is the entry run backwards — a mirror, not a continuation.

`lineShift` / `lineExit` / `rise` / `riseExit` all still exist and still work
(`linesAt`/`wordsAt` honour them) — they default to 0, which is off, so a rail
can come back with two numbers if it is ever wanted again.

### Act two — the ground opens

The bowl **holds the centre and never leaves it**. What happens instead is the
**ground**: a MASK that propagates from behind the object and uncovers the field
the rest of the act happens on. Inside it the field is there, outside it the
page's paper is untouched — the edge is broken up by FBM so it reads as
something spreading rather than a circle growing, and the centre drifts slowly
around the bowl (`wander`).

The beats hand over: the first statement **leaves up the rail**, the ground
opens, and the second arrives **on it**, in lines, one at a time. "Until now" is
not on screen until its own mark, and when it lands it is **white** — it is on
the opened field, and it lives on `.was-under`, `z-index: 3` against the bowl
layer's 4, so the object is genuinely in front of the type.

**A webm takes the mask over** when there is one: drop a clip in `public/video/`,
name it in `v2.ground.video`, and its LUMINANCE becomes the mask at the same
scale and about the same centre.

### What the ground uncovers is his three images, behind glass

`v2.ground.images`: the field is **`src/values/*`** — the same squares the left
column of V1 opens on — **one per step of the ring act**, crossfaded at each
boundary (not all the way through a step, so each one is itself for most of the
time it is up).

And they are seen **through glass**, done in the shader that is already drawing
the field rather than as a second DOM layer trying to line up with it: a
golden-angle disc of taps for the frost, the **same FBM** that broke the mask's
edge bending the lookup (refraction), a small split between the three channels
along each tap — which is what makes it read as glass and not as a blur — and a
breath of white over the top. `v2.ground.tint` is how much colour is laid over
the photograph; `act.bg` warms that tint on the second step.

The verify **reads the layer's pixels back** (`ground.sample()`) and asserts they
vary the way a photograph does and change from step to step, because "is the
image actually there" is not something a config value can answer.

### The ring act — three pinned steps

One line per step, top left, on the rail, and two orbits around the bowl:

1. **"On a platform guided by people"** — ring A blooms out of the bowl: his
   own ask (2026-09-15), despite the step's own copy, is a face he wants read
   as a **teacher's** here, not an ordinary person's — `rings.a.source:
   "teachers"`, resolved through `src/therapists/`.
2. **the experiences** — ring B arrives OUTSIDE it, turning the other way
   (`src/experiences/`), while the environment turns slowly under the object.
3. **"Connecting experience to evidence…"** — the view goes **over the top of
   the bowl**: it tips to `act.tilt[2]`, both rings flatten (`leanEnd`) and
   converge — the people tight inside the rim, the experiences outside — and
   then everything **staggers out** (`act.outAt`) and the evidence section
   rises over it. This step's own length was trimmed from 240vh to 190vh
   (2026-09-16, his ask — the act was leaving a long empty stretch of scroll
   once everything had converged and gone) — a live dial in the panel
   (`Steps — height + copy` → `Connecting`) if it still wants tightening
   further.

**The camera really dollies in** (`act.dist`, 5.0 → 3.6 → 2.8). It is the
camera, not the lens: the bowl's placement is derived from the same number, so
it holds its size on screen and only the PERSPECTIVE deepens — which is what
makes the rings separate instead of flattening.

Every pose (`act.size`/`tilt`/`tiltZ`/`dist`) is reached **ahead of time, in
the TAIL of the step BEFORE it** (`act.transitionShare`, the last share of that
step's own scroll), and simply held once its own step begins — the same idiom
the rest of this clock already uses everywhere else (the sphere's assembly
starting inside step One, not at Sphere's own start). So the reader arrives at
step 3 **already** looking straight down on the bowl; the tilt has finished its
turn during step 2's tail, not partway through step 3 while its line is still
being read. `npm run verify` catches this directly — it samples a point still
inside step 2 and asserts the tilt is already at step 3's target there.

At the end of step 3, both rings do not just fade where they are standing:
they **converge to the bowl's own centre as they fade** (`ring.js`'s
`collapse`, tied to the same exit tween as the opacity stagger) — gathering
into the object and disappearing there, which reads as belonging to it rather
than dissolving in front of it.

### Both rings are depth, not circles of pictures

They are built into **the bowl's own scene**: sharing the scene means sharing
the depth buffer, so the far half of an orbit is occluded **by the object** and
the near half covers it.

The orbit is the circle `(R cosθ, R sinθ, 0)` — a ring in the plane of the
screen — **leant back by `lean`**. At 0 the circle has no depth at all and
nothing can pass behind anything; every degree of it sends the top further back
and brings the bottom forward. `radius`, `card` and `z` are all in **bowl
diameters**, so a ring is anchored to the object, not to the viewport, and
`radius → radiusEnd`, `lean → leanEnd`, `card → cardEnd` are scrubbed across
`from` → `to` so the two orbits converge as the act closes.

### Dropping images in

| folder | used by | falls back to |
|---|---|---|
| `src/people/` | ring A — ordinary people | `ring-media` → `cards` → `photos` |
| `src/experiences/` | ring B — the practices | `ring-media` → `values` → `photos` |
| `src/values/` | **the ground**, one per step | — |
| `public/video/` | the ground's mask | the procedural FBM |

Filename order is orbit order, so a numeric prefix places each image. While a
folder is empty the ring falls back, so the piece never renders blank — which is
also why the verify reports which folder each ring actually resolved to.

## Reversibility, weight, and never touching the mesh

Three fixes that only matter once the piece is actually being scrolled, not
scrubbed step by step.

### The reveal is a single state machine now, not two independent checks

`hero.js`'s `drive()` used to be two separate `if` blocks — one deciding
whether a beat should be ON, one deciding whether it should be GONE — checked
in sequence on every call. A big scroll delta (a real fling, or `scrollTo`
landing straight past an entire `at → out` window in one frame) could make
BOTH true on the same tick: the entry tween starts, and immediately the exit
check ALSO fires and starts the exit tween over it — GSAP's `overwrite: "auto"`
lets the second one win, so the block never visibly finishes arriving before
it's told to leave. It reads as the text simply not showing up.

`drive()` is now one function that asks "what does `q` say the state ought to
be right now" and makes AT MOST ONE transition toward it, checking "should it
be gone" first — so a scroll that jumped straight past the whole window always
lands exactly where a slow scroll through the same point would have, and nothing
ever fights itself for the same GSAP target on the same tick. Verified with an
actual single-frame jump (`scrollToUntil(0)` → `scrollToUntil(0.5)`, one raf
tick, no time to catch up in between): the block is already in its FINAL
correct state on the very next frame, not flickering through cancelled tweens.

### The rings never cross into the bowl's own mesh (`minRadius`)

Each ring's radius was already scrubbed down toward its `radiusEnd`, bloomed in
from a smaller `enterRadius`, and — since the last pass — collapsed toward 0 as
it fades at the end of the act. All three of those can put a card's world
position CLOSER to the bowl's centre than the bowl's own surface (≈ half its
world diameter) — the image plane cutting straight through the mesh.

`v2.rings.a/b.minRadius` is a hard floor, in the SAME bowl-diameter units as
everything else in a ring, that NONE of those three things may cross — not the
k-scrub, not the entry bloom, not the end-of-act collapse. Cards gather in
close around the rim and fade there; they never go inside it. Verified by
reading the actual mesh positions off `bowl.scene` (not the screen-projected
`x`/`y` the depth checks use) and dividing by the LIVE camera distance — the
camera dollies during this entire act, so the bowl's own world size is not
constant, and a check against the static config default would silently drift
wrong as the dolly moves.

### The bowl and the ground stop rendering entirely once covered

Once the evidence section's own sticky stage has risen to cover the full
viewport, nothing behind it — the bowl, spinning and posing every frame, and
the ground's full-viewport FBM + glass shader — can possibly be seen. They kept
running anyway: `bowl.fadeAfter` only ever dimmed the bowl's OPACITY, and the
ground's `out: 0` means it never closes at all. Both are now told to stop
completely — `bowl.setHidden()` / `ground.setHidden()` skip posing, spinning,
and drawing outright, not just the final draw call — the instant `#stageB`'s
own rect spans exactly `0..vh` (fully pinned, fully covering), and resume from
a fresh, correct frame the instant that stops being true on the way back up.

### A block never visibly un-reveals — it holds until it is off screen (2026-09-15)

His ask, after several rounds of "already correct in the code, must be your
cache": a title that has already fired must **hold exactly as shown** for as
long as any part of it is still on screen, however far back you scroll — it
must never be seen reversing. Only once it has scrolled fully OUT of the
viewport is it safe to reset it, silently, so scrolling back down later plays
its entrance again from scratch. The bug this surfaces (`hero.js`'s `drive()`,
shared by every block on the page — the hero, act two, the ring act's own
copy): the backward branch used to reset the instant scroll crossed back
below a block's `at` mark, which is a SCROLL-POSITION check, not a
VISIBILITY one — and for anything living in a sticky-pinned section (act two
is 300vh of sticky; the element sits at the same screen position for the
WHOLE range), crossing back below `at` happens while the block is still
sitting there in full view. Fixed by gating the reset on the block's own
`getBoundingClientRect()`: `drive()` now holds at `on: true` and checks again
every frame until `r.bottom <= 0 || r.top >= innerHeight` actually becomes
true. Verified live, not just read: scrolled "This knowledge is carried by
people…" back from `q=0.6` to `q=0.1` (still fully pinned, still fully on
screen) — `opacity: 1` the whole way, unmoved (`top: 720` both times) — then
scrolled all the way to the page's own top, genuinely off screen — only THEN
does it drop to `opacity: 0`.

The ground shader had the same family of bug, a layer down: scrolling back up
past `v2.ground.at` used to set `open.v = 0` directly — a snap, not a tween,
which is what "si attiva, poi torno su e scompare magicamente" was describing.
It now calls the SAME `play(0)` tween the forward exit already used, so it
closes the way it opened. Verified by sampling `ground.open` every 120ms
after scrolling back: `0.988 → 0.878 → 0.745 → 0.641 → … → 0.245`, a real
descent through intermediate values, not a jump to 0.

"Until now" is off in V2 entirely now (`v2.until.show: false`) — one fewer
beat to reason about, his own ask, rather than one more surface for this same
class of bug. `drive()` reads an explicit `show: false` on any beat's source
object as "pull this out of the page" — reset if it was on, then skip it
every frame — so the beat itself stays wired (a panel checkbox away from
coming back) without deleting anything.

### Two more per-frame costs found and cut (2026-09-15)

His ask was general ("fai debug e facciamolo andare liscio") — two real,
`getBoundingClientRect`-verifiable costs found by checking every `frame()`
against the same standard the bowl/ground hard cutoff already set (stop ALL
per-frame work once nothing could possibly be seen, not just the draw call):

- **The Atlas** (`atlas.js`) called `active` right, `renderer.render()` was
  gated — but `knot.sync()` (the pointer-lean spring), `applySceneSettings()`
  and `syncCards()` (the three DOM overlays' own projection) ran every frame
  regardless, the whole time the section was off screen. `frame()` now
  returns immediately when `!active`, and the canvas itself gets
  `display: none` to match — same treatment `bowl.setHidden()` already got.
- **The trust network** (`network.js`) wrote to ~100 SVG attributes (the
  whole field, plus every assigned dot, line and pill) on EVERY frame of the
  WHOLE page's scroll — the hero, the ring act, anywhere — not just its own
  section's. `update()` now checks its own mount's `getBoundingClientRect()`
  first and skips the rest entirely while it is nowhere near the viewport.

**Deliberately NOT touched: `sphere.js`.** It has the same `if (active)
render()` shape and could look like the same bug — it is not. An earlier
pass explicitly kept its full per-frame update (camera, tilt, spin) running
even while its own section is technically covered, specifically so the
sphere is never caught having visibly stopped mid-spin the moment the reader
scrolls back up through the handover zone. That window is bounded (~1
viewport height around the handover, not "the rest of the page"), and
hard-stopping it would silently undo a feature he asked for, not fix a bug —
so it stays as it is.

**Still open, and the actual biggest number on the page:** the bowl's GLB is
61 MB. No `gltf-transform` / `gltfpack` in this environment to compress it
here — Draco or meshopt compression needs to happen wherever the model was
authored (Blender's own glTF exporter has both built in) or via an online
compressor, then dropped back into `public/models/`. Flagged every pass; not
something to silently attempt without the right tool in hand.

## The corner — a trust network, not a spinning ball (`v2.network`)

What actually sits bottom-left in the evidence section (V2), once the sphere
box was fixed and rendering again: not it. **A FIELD of plain, unnamed,
unstyled black vertices spread over a sphere** — so the corner reads as a
small WORLD, not a diagram — three subsets of which get **ASSIGNED** a role
as the section scrolls: some become USERS (stock photos), some TEACHERS
(portraits), some TECHNIQUES (pills). Everything else just stays what it
always was: the mesh the assigned ones sit on. It is still driven off the
SAME three ramps that already scrub the evidence panel's own rows, so the
diagram lands exactly with the claim it illustrates rather than running a
clock of its own.

```
step 1 (tl.ev[0])   the field appears, fast, all together — then USERS pop out of it
step 2 (tl.ev[1])   TEACHERS pop, each wired to its own user by a curve bowed
                     along the sphere's own surface
step 3 (tl.ev[2])   TECHNIQUES pop further out — "the tree of connections
                     widens" — each wired to its NEAREST teacher, not a fixed
                     one-per-teacher cap, so there can be (and by default are)
                     more techniques than teachers
```

**The sphere itself.** `fibonacciSphere(n)` in `src/network.js` places
`v2.network.fieldCount` points evenly over a unit sphere (the golden-angle
spiral — no pole crowding the way a lat/long grid gets), oriented ONCE at
layout time (`tiltX`/`rotateY`) and never re-touched: because the orientation
is fixed, paint order (who occludes whom) is sorted back-to-front a single
time, not every frame, which is what keeps this exactly as cheap as the old
flat fan — still plain SVG, still one layout pass, nothing per-frame but
opacity/scale/dash-offset. A vertex's DEPTH (`perspective`) dims and shrinks
it, which is the whole "globe, not a flat scatter" read.

**Which vertices get a role.** `pickRole()` spreads `peopleCount`,
`teacherCount` and `techniqueCount` vertices across the whole field with a
stride, so users/teachers/techniques are woven through the sphere rather than
landing on a handful of adjacent points, and no vertex is ever double-assigned.
Defaults: **8 users, 8 teachers (paired 1:1), 16 techniques** — deliberately
more techniques than teachers, per his ask ("soprattutto più techniques"),
each wired to whichever teacher is angularly closest on the sphere
(`nearest()`, a plain dot-product comparison).

**Technique pills never collide, and never leave the box.** Two vertices can
project to nearly the same spot once pushed out by `pillReach`; before a
single pill is drawn, `layout()` runs a few passes of plain AABB separation
on their anchors (using the label's own rough width) and then hard-clamps
every anchor to stay inside the box — the same "never crosses a floor,
whatever the tuning" philosophy `ring.js`'s `minRadius` already enforces on
the 3D side, just in 2D. (Caught by `npm run verify`'s own structural probe,
not by eye — two labels landed on top of each other, and two pills on a
near-polar vertex cleared the top edge of the box entirely, before this pass.)

It is a **pure function of the scroll** — no GSAP timeline, no fire-and-forget
tween: each dot's own progress is the SAME spread/stagger formula `reveal.js`
uses for words and lines, applied to `tl.ev[i]` directly. Scrolling back up
un-draws it exactly the way it drew.

**It replaces the sphere box, it does not sit on top of it**
(`v2.network.show`, on by default). The sphere is still mounted underneath —
nothing is disposed — it is just told to stop drawing
(`sphere.setActive(false)`, and `applyLive`'s own on/off check is told never to
turn it back on while the network has the corner). Flip `network.show` off and
the box falls back to the sphere-and-portraits canvas exactly as it worked
before this feature existed; `npm run verify` exercises BOTH paths.

Users come from **`src/people/`** (the same stock-photo folder the ring act's
inner ring already falls back through), teachers from **`src/therapists/`** —
the network's own dedicated pool, falling back to `src/photos/` (V1's real
named portraits) while it is empty. All three folders — `src/people/`,
`src/therapists/`, `src/experiences/` — are populated now (his own minified
webp sets, 2026-09-15: 12 people, 20 therapists, 15 activities), so the field,
the ring act's own rings, and V1's sphere each show genuinely distinct faces
instead of all three falling back to the same portrait pool. `src/photos/`
itself — V1's hero sphere — was deliberately left untouched: it is real,
named, recognisable content, not a placeholder, and nothing in this pass
touches V1.

## The opening act

### Every block is conducted, not scrubbed

There is ONE driver for all the type on the page (`src/hero.js`). Each block
carries four numbers in the config — `<k>At` fires it, `<k>Dur` / `<k>Delay`
are its own timing, `<k>Out` fires the exit over `<k>OutDur` — and the scroll
only says WHEN. `At: 0` means it plays on load; `Out: 0` means it never
leaves. Crossing a mark backwards rewinds that half, so it can play again.

The hero's two blocks run on the hero's own scroll (the title on load, the
paragraph from `hero.paraAt` — it waits for the scroll to start, which is when
the bowl starts turning); act two's two run on its sticky travel. Every one of
those numbers is a slider.

### Act two — two beats across the bowl

`#until` is **200vh of sticky** (`until.vh`) holding one screen with the bowl
big and tilted **between** two blocks: the statement on the **left** and
"Until now" on the **right**, both at the same height, so the eye reads
straight across the object.

Each beat has its own numbers (`leftAt` fires it, `leftDur` is how long ONE
line takes and `leftStagger` how far apart they start — and the same for
`right`), so the two can be tuned against each other until the scroll reads
right. Both are `Out: 0`: the first one is still standing when the second
arrives beside it, rather than flashing past before it can be read.

Neither is scrubbed and neither derives its stagger from a formula: a beat
FIRES at its mark and then plays itself out as a **real GSAP stagger**, one
tween per line (or per word), `createReveal().playStagger()`.

They are revealed **differently on purpose** (`until.leftMode` /
`until.rightMode`): the long one **line by line**, clipped, so it reads as a
paragraph settling, and "Until now" **word by word**, in place, so it lands as
two separate beats.

| element | reveal |
|---------|--------|
| hero line, both halves | `intro` — every word clipped by its own box, on the EXPO axis |
| hero paragraph | `lines` — clipped, each line rising into its own mask |
| act two, left | `lines` |
| "Until now" | `words`, strictly in place |

The **intro** mode is the opening treatment: each word sits in its own
`overflow: hidden` box and rises into it (`intro.rise`, % of that box) while
Exposure's EXPO axis travels from over-exposed to rest **and overshoots past
it** — a half-sine bump (`intro.overshoot`), so the settle is continuous and
never snaps. Set `intro.rise: 0` for a purely in-place version of the same
thing. The pinned copy is untouched: it stays `words`, strictly in place.

`src/reveal.js` is the single painter behind all of it — the pinned copy
(`src/copy.js`) delegates to the same functions, so the type behaves
identically everywhere.

The nav bar: the logo left, one black button right, and the search field
**dead centre** on the viewport's own centre line — `.was-nav-mid` is
absolutely centred and the round filter button hangs off the search's left
edge, so it is the *search* that is centred rather than the pair of them. The
search carries the bowl thumbnail (`public/images/bowl.png`, the render from
`projects/collective-fan`). Every label is a panel field.

## The bowl

### The model

`bowl.model.source` picks the geometry:

- **`"glb"`** (the default) — **BOWL_OPTION C**, in `public/models/`. It
  exports as ONE mesh with ONE material, but the geometry is a real hollow
  solid: an outer shell and an inner one, welded at the rim. `splitShell`
  separates them again so they carry the two materials the bowl has always had
  — A outside, B inside.

  They are not separate connected components (the weld makes them one), so
  connectivity cannot do it. What does: for a hollow solid the **mean of its
  surface points lands inside the cavity**, and from there the outer shell's
  normals point away (`dot(n, p − c) > 0`) while the inner's point back towards
  it. That holds at the base too, where both normals are vertical and a radial
  test gives up, and it puts the rim annulus — where the dot is ~0 — on the
  outside, which is where it reads. The two halves **share their vertex
  buffers** and differ only by index, so the split costs an index array rather
  than another 35 MB of positions.

  It is 61 MB and 2.2M triangles — 60 fps locally, and the first thing to bake
  down (the studio's own quantised `.bin` is 494 KB for the same kind of mesh)
  before this ships.
- **`"studio"`** — the bowl studio's pair of welded shells, slots A and B.

Either way the loader normalises it into the **same object space** (widest XZ
span 2, sitting on y = 0). That is not cosmetic: the relief is procedural noise
sampled in object space, so `model.noiseSpace` and the noise's own `oscale` are
read against those units. A model authored at 28 cm instead of 2 would get a
relief seven times finer and read as glitter rather than as a surface.

### The environment

`bowl.studio.hdr` takes one or two equirectangular EXR/HDRs from `public/hdr/`,
blends them by `mix` into a single equirect target and pre-filters that once
through PMREM into `scene.environment`. Pre-filtering two maps and cross-fading
the reflections afterwards is not the same thing and costs twice as much.

It lights **the 3D and nothing else**: `scene.background` is never set, and the
bowl's canvas is a transparent layer over the page, so the page's own paper
shows straight through. With no files there it falls back to the panel rig, and
`npm run verify` reports which one is up.

### The look

The shader, the noise and the studio are vendored from the **bowl studio**
(`~/Desktop/bowl-studio-source 2`) — the same mesh, the same shader, the same
dialled-in look:

- `src/assets/studio-bowl.bin` + `.json` — the two shells welded, positions
  quantised to uint16 against each mesh's bounding box, normals octahedral to
  int16, real UVs from the GLB. `src/bowlGeo.js` is that project's decoder.
- `src/bowlNoise.js` — the Maxon-compatible GLSL noise library, verbatim.
- `src/bowlMaterial.js` — the two material slots on one
  MeshPhysicalMaterial recipe. **This is why it reads as an object:**
  - **A · outer shell** carries the relief, and it is a **real texture map**,
    not noise evaluated per pixel (`relief.source: "image"`). That distinction
    is the whole difference between a surface and glitter: procedural noise has
    no footprint, so every fragment samples it fresh and the moment one pixel
    spans more than a cell it aliases — and no amount of rescaling helps,
    because the top octave is always below the pixel grid. A map has mipmaps,
    so it stays a surface at every size the page shows the bowl at.

    `public/images/bowl-normal.webp` is the default (the hammered map the old
    procedural relief was calibrated against), tiled by `relief.imageScale` and
    given depth by `relief.strength`. **Load your own** from the bowl panel —
    B → `A · outer shell` → Relief → *Load an image…* — and it classifies
    itself: blue-dominant is used as a **normal map**, anything else as a
    **height map**, so a grey noise PNG and a baked normal both just work.

  - ...and the *procedural* hammering is still there, one switch away
    (`relief.source: "noise"`) — Voronoi 1 with
    a smooth-min F1 (a hard minimum gives every cell a constant gradient and
    the surface reads as flat facets; the smooth one rounds the ridges into
    real dimples), perturbing the normal through screen-space derivatives.
    Never colour noise.
  - **B · inner surface** carries a *gaseous colour ramp* — two turbulent bands
    folded through a sine — and no relief at all.
  - Everything is uniform-gated: a slider drag writes a uniform, nothing
    recompiles.
- `src/env.js` — **the studio IS the light rig**: a gradient dome plus
  soft-edged emissive panels baked through PMREM into `scene.environment`, and
  the same panels mirrored as real `RectAreaLight`s, because the inner surface
  runs at `envMapIntensity: 0` and is lit by those alone. On a metal a punctual
  light does essentially nothing, so every slider in the Studio folder moves a
  real reflection.

`public/images/bowl-normal.webp` is the hammered normal map the procedural
noise was calibrated against — switch a slot's relief `source` to `image` to
use it instead.

### Look at the cursor (`bowl.lookCursor`, 2026-09-16)

*"Un po' di look at the cursor sulla bowl, così possiamo avere qualcosa di
più interattivo."* A small extra turn, purely additive on top of whatever
pose the scroll (or the ring act) already put the object in — it never
replaces or fights that pose, it just nudges it.

`src/bowl.js` listens for `pointermove` on the whole **window**, not just its
own canvas — the layer sits over the entire page, so the object should notice
the cursor wherever it is, not only while it happens to be over the bowl
itself. The raw pointer position is normalised to −1…1 and smoothed toward
every frame in `frame()` (`lookCursor.ease`, a lerp factor, not seconds — low
is slow and creamy, close to 1 is instant and jittery), then added to the
existing rotation: the smoothed horizontal position becomes extra **yaw** on
top of the spin (`lookCursor.strengthX`, ° at the edge of the viewport), the
vertical becomes extra **lean** on top of the tilt (`lookCursor.strengthY`).
Turn `lookCursor.enabled` off and it decays back to dead centre — the pose is
exactly what it was before this existed.

All four values are in the **Bowl · look** panel → *Look at cursor*, live —
nothing here is hard-coded.

### How it rides the page

Four poses on one clock, all in the `On scroll` folder. `x` is in viewport
widths, `y` in viewport heights, `size` is the diameter as a fraction of the
viewport height.

| pose | when |
|------|------|
| `hero` | rising behind the opening copy |
| `until` | **act two** — big, leaning and rolled, behind the two beats |
| `hand` | **the handover** — reached exactly as the pinned section engages |
| `pin` | the SAME pose as `hand`: from here it neither moves nor scales again |
| `end` | the last sliver of the pin, where it dissolves |

`hero → until` is eased by `handEase` and `until → hand` by **`fallEase`**,
which defaults to `smooth`: smoothstep leaves and arrives with zero velocity,
so grow → shrink is a turn and not a corner. With an expo there it would leave
the top of the arc at full speed, which is the snap. `npm run verify` samples
the size right across the opening act and asserts the step it takes at the top
is a fraction of the biggest step it ever takes.

`parkIn: 1` spends the whole of the first sticky on `hand → pin`, so its
journey finishes **exactly** with the last of the three steps — and then it
**goes**: `bowl.fadeAfter` fades it out over that many viewport heights, so it
leaves with its section instead of hanging over the next one.

**Its relief is scale-invariant.** The hammering is sampled in object space but
the normal is perturbed against *view-space* derivatives, so a bowl scaled down
by `k` was getting a relief `1/k` too strong — five times too deep at the
parked size, which read as crunch. The vertex stage now passes `vBsScale`
(the object → world scale) and the fragment stage puts it back. `model.reliefAA`
is a separate footprint fade, off by default, for the day a very small bowl
shimmers on scroll.

Each pose also carries `tilt` (lean toward the camera, on X) and `tiltZ` (roll,
on Z). The group's Euler order is **ZXY**, so the matrix is `Rz · Rx · Ry`: the
spin stays about the bowl's own axis, the lean tips it on top of that, and the
roll is the OUTERMOST rotation — which is what makes it a roll *on screen*
rather than a second turn about its own axis.

The opening clock is `scrollY / pinA.offsetTop`, and it is now two moves:
`hero → until` finishes by `bowl.riseAt`, and `until → hand` starts at
`bowl.fallAt`, so the big tilted pose HOLDS across act two's whole sticky.
`handEase` eases both (expo by default); `hand → pin` takes `parkIn` of the
pinned clock; `pin → end` runs over `endFrom` → `endTo`. The handover always
lands where the pin engages whatever the section heights are — verified at
**(750, 500) on a 1500×1000 frame**.

It lives on its own fixed, transparent canvas at `z-index: 4`. The opening
copy sits at `z-index: 6` so the bowl passes *behind* the title, and every
later section stays below it so nothing ever occludes it.

**`B` opens its own panel**: the two material slots in full (colour,
metalness, roughness, ior, specular intensity, env intensity, clearcoat +
roughness, side), each with its **relief** and **colour ramp** sub-folders and
the complete noise parameter set for both — type, global scale, seed, octaves,
lacunarity, gain, exponent, absolute, per-axis scale / offset / rotation,
cycles, clip, brightness, contrast. Then eight surface presets, the model
(noise space, tilt, wireframe), the studio (dome, PMREM blur, area-light
scale, solo, and three lights with colour, intensity, size, edge softness,
azimuth, elevation, distance, roll, and separate *→ reflection* / *→ direct*
weights), the render pass, the four poses, the camera and the intro.
**Copy bowl JSON** dumps the whole thing to the clipboard.

The PMREM bake is the expensive call, so every studio control is coalesced
behind a 70 ms debounce — dragging a light never re-bakes per frame.

## The left column — two lives

**Steps 1–3:** one photograph per step, from whatever is in **`src/values/`** (filename order,
`import.meta.glob`). They cross over in the last `left.cross` of each step,
which is the same window the copy leaves in, with a slow `left.zoom` drift on
the one that is showing.

**Steps 4–6:** the evidence panel takes the second sticky's stage. Rebuilt to
his own reference (2026-09-15): three blocks, all sharing the **same left
margin**, stacked top to bottom — the statement, then the three steps as a
**row**, then a smaller summary — rather than a title-and-list pair split
across the two halves of the frame. The statement sits at the **top**
(`evidence.title`) and is **already there** the instant the section exists —
no scroll trigger, no stagger, painted at full visibility once in
`buildEvidence()` and never touched again (his ask, same day: he wants it
*read*, not performed). It is the SUMMARY at the bottom that does the actual
reveal now — `evidence.titleAt` still names the mark, but it is the summary
that fires there, **line by line on the variable axis, strictly in place**
(`titleRise: 0` — the line has nowhere to travel from, so all that happens is
the axis settling and the opacity coming up). Then the three steps, now a
**horizontal row** (`evidence.rowsX/rowsTop/rowW/rowGap`): each one is its own
column, a thin rail **above** the label that fills left→right as its own ramp
plays (`transform: scaleX`, not the old `scaleY` — the rail rotated 90° along
with everything else), with its own paragraph underneath while it is the
active one. `rowW`/`rowGap` are narrow enough on purpose that the whole row
stays clear of the bowl, which holds the exact centre of the frame right
through this section — `npm run verify` checks the real geometry, not just
that the numbers look plausible. Last, the **summary** (`evidence.summary`) at
the bottom — the statement this whole section used to open on, demoted to a
smaller supporting line once the row carries the actual claim, fired on the
SAME mark as the title so the two arrive together.

In V2 this freed up the bottom-left corner, which is where the trust network
used to sit — it moved to a box of its own on the **right** of the section
instead (`v2.canvasBox`, now `{x:52, y:20, w:42, h:58}`), since a summary
paragraph and a cluster of photographs were fighting for the same patch of
the frame once both existed.

The card is **square** (`card.square`): the height is taken from the width in
real pixels, so it is a true square whatever the viewport does.

On top of it floats the card, and its silhouette is a **real squircle**:
straight edges joined by superellipse corners (`|x|ⁿ + |y|ⁿ = rⁿ`, `card.n`
= 4.2 by default, 2 would be a plain circular corner), generated as an SVG
path and applied as `clip-path: path(...)`. That matters for two reasons —
`border-radius` cannot make that shape at all, and `clip-path` is what makes
`backdrop-filter` follow it. Because a border or a `box-shadow` would be cut
off by the clip, the hairline and the shadow are drawn as SVG paths from the
very same geometry.

**The card is solid white and the glass lives behind it, across the WHOLE
column.** A translucent card tints itself with whatever is behind it and goes
grey over a dark photograph, so the card runs at `alpha: 1` and the refraction
is its own layer — with `card.glassFull` (the default) it is the entire left
column, edge to edge, so the whole photograph is seen through it and a change
of image reads through the glass. Turn it off and it falls back to a squircle
mat `card.frost` px around the card.

That mat runs **React Bits' GlassSurface**, ported to vanilla in
`src/glass.js`. Instead of `blur()`, which only softens, the backdrop goes
through an SVG filter that **displaces** it: a gradient map (red across, blue
down) drives three `feDisplacementMap`s, one per channel at slightly different
scales, so the edge of the panel bends the photograph and splits it into
colour the way real glass does. The three channels are recombined with screen
blends and one last small blur. `backdrop-filter: url(#…)` is Chromium-only,
so it feature-detects and falls back to a plain frost elsewhere. Every
parameter is in the panel under **Glass surface (refraction)**.

Everything inside the column is sized in **viewport pixels, never per cent of
the column**.

## Step 3 — the pills

The pills are the real **categories** from
[insighttimer.com/techniques](https://insighttimer.com/techniques) (the whole
directory, 45 categories and 385 techniques, is in `src/data/techniques.js`;
`pills3d.count` takes the first N). They live on their own fibonacci shell just
outside the photographs', twisted off their distribution (`pills3d.twist`),
turning with the drum, passing behind it and sorting against the cards like any
other object. They arrive staggered (`stagger`, `enterScale`) and breathe
radially (`float`).

That is where the canvas experience ends. What used to follow it — the
photographs vanishing, the technique orbits, the ordered band and the net —
**is gone**, along with its config and its panel folders. The Atlas takes that
stretch of the page.

The scroll spin is **finished by `motion.spinUntil`**, so the end of the third
step is about the pills arriving rather than the cloud turning under them.

## The last section — Atlas

**Off by default in the current version** (`atlas.show: false`, his ask,
2026-09-16 — see **Reaching Team without the Atlas**, further down): the page
goes straight from the evidence panel's three steps to "The Great Team
Behind". Nothing below is deleted or disabled — only the one flag, one
section away from coming back exactly as it is described here.

`src/atlas/` is [`projects/atlas-knot`](../atlas-knot) ported whole. A trefoil
band in white porcelain that **draws itself** as the section scrolls: one front
travels once around the loop, the band grows out of its own centre line behind
it, a two-tone stripe rides the leading edge, and the surface swells right at
the front as if pushed out from inside. It is geometry, not an alpha fade, so
the silhouette and the crossings are honest at every instant.

Everything the mark **is** comes from **`src/atlas/preset.json`** — the preset
exported from that studio — merged over its defaults, so an older preset keeps
working. The only things this page decides are in `CONFIG.atlas`: `vh` (the
section's own scroll), `overlapVh` (how much of it collapses over the section
before it) and `shadow`.

The reveal is anchored on an **under-crossing** (`reveal.anchor`, found from the
curve itself), so the band opens and closes where it is hidden behind another
strand and neither end is ever seen.

Three cards hang off the lobes — the library, the members, the therapists —
each with its own accent, its numbers, and a description that opens on hover.
**A card arrives when the front passes ITS OWN vertex**, not on a timer, so the
beat you see and the number driving it are the same and they cannot
desynchronise. Hovering one **recolours that stretch of the band**: the colour
does not fade in, it spreads out of the chip along the path.

Placement is derived, never guessed: the vertex is projected to screen space
each frame and the card pushed out past the mark's own projected silhouette
box, laid out at the height it has with the description **open** so opening it
cannot make it crawl. `cards.padTop` keeps a card clear of this page's nav,
which the studio it came from did not have.

### The header — a plain fade, already in place (`CONFIG.atlas.title`)

The section used to start with the mark alone; it now opens on a heading and
a subtitle above it ("Bringing this data together lets us create something
powerful."), introducing the mark instead of leaving the reader to guess what
it is. It fires almost immediately (`title.dur`, a share of the Atlas's OWN
scroll) and then simply stays — a plain `opacity` write in the raf loop, no
transform, no CSS transition: the same "strictly in place" treatment every
other reveal on this page got this pass. `styleAtlasTitle()` in `main.js`
writes the copy and CSS custom properties once (and on a panel edit); the
raf loop only ever touches two `.style.opacity` values.

Making room for it meant the mark itself had to get smaller: `camera.padding`
in `src/atlas/preset.json` (now `1.2`, panel range widened to `0..3` — it was
capped at `1.2` in the panel from before this feature existed, which silently
clamped a live value of `2.0` set from an earlier pass of this same tuning).
`fitView()`'s distance is derived from it directly (`pad = 1 + c.padding`), so
this is a real zoom, symmetric around the mark's own centre, not a crop.
`cards.padTop` went from its default (104, just clearing the nav) to `300`,
so a card can never land above the header either — `npm run verify` reads
both the title's and every card's real `getBoundingClientRect()` and asserts
the cards' tops never cross the title's bottom edge.

**Repositioning it, from the panel** (his ask, 2026-09-15: "permettimi di
ingrandire e spostare più in basso l'atlas... nel control panel"):
`camera.offsetX`/`offsetY` pan the fit composition — `fitView()` aims the
camera at the mark's own centre PLUS this offset (both position and
`lookAt`), rather than at the centre itself, so the ZOOM (still derived from
the real extents) is untouched and only where in the frame that zoomed
composition sits moves. Positive `offsetY` moves the mark DOWN the frame.
Both are plain Tweakpane sliders under "Atlas — the last section" now
(`-3..3`, world units), alongside `padding` for size — no code required to
retune the composition further.

### The 2D sketch above the header (`src/atlasSketch.js`)

A small preview of the mark, above the heading: a plain circle MORPHS once
into a 3-lobed curve as the section arrives, on the SAME ramp as the header
text (his ask, 2026-09-15 — "questo GSAP morphSVG curve manipulation...
vorrei facesse parte del top della seconda sezione"). No `MorphSVGPlugin` —
checked first, and it turns out to be installed but never actually USED
anywhere across his other projects either, nothing to port. A closed curve is
just N points on a circle (`N = 120`); morphing between two shapes with the
SAME point count is a per-point `lerp`, recomputed into a fresh `d` every
frame while `t < 1` (an eased `t`, `smoothstep`, plus a small settle-spin
that dies out as it finishes — not part of the shape math, just what makes
the arrival read as alive rather than mechanical). Once `t` reaches 1 it
holds — reversible by construction, the same way everything else on scroll
is: it is a pure function of `atlasQ`, so leaving the section and scrolling
back in lands on the SAME settled shape, not a replay from scratch.
`cards.padTop` (the Atlas header clearance) went 300 → 395 to make room for
it — it made the header box taller, and the cards need to clear the new
bottom edge, not the old one.

**A new preset landed from his own atlas-knot studio session (2026-09-15)** —
smaller marker dots (`cards.marker` 24 → 16), the accent colour spreading out
over longer, matching in and out (`cards.tintOut` 0.45 → 1.5), plus whatever
else changed in `material`/`light`/`curve`/`section`. Merged in as the new
`src/atlas/preset.json` WHOLESALE, except `camera.padding/offsetX/offsetY`
and `cards.padTop` — his own file still carried the pre-header defaults
(`padding: 0.36`, no `padTop` at all), and he was explicit that this pass's
size and position are "perfetti": those four stayed on the values already
tuned in the panel, not his file's.

## "The Great Team Behind" — the last section, for now (`src/team.js`)

His own reference (2026-09-15, background flipped to **white** on 2026-09-16
to match it exactly): a grid of the real team, the tooltip ported from
**[crnacura/PlayersClub](https://github.com/crnacura/PlayersClub)**'s
`tooltip.js` — the one piece of that repo he asked for ("mi raccomando solo
il cursor voglio"), nothing else of that site. `#below`, previously an empty
spacer forced to a fixed `belowVh`, now holds this section and sizes to its
own content instead (`belowEl.style.removeProperty("height")` in `main.js`).
The tooltip itself stays **black** regardless — it is its own small floating
object, not part of the section's own background.

**Photos are matched by NAME, not by position.** `src/team/*` and
`src/partners/*` are both real drop-in folders — but neither is guaranteed to
have exactly the same people as its roster, in the same order, so `team.js`
normalises both sides (accents stripped, case and spacing ignored) and looks
each person up by their own name rather than trusting
`Object.keys(FILES).sort()` to line up with the roster array.

**Patrick Orlando's photo, resolved (2026-09-16).** The first pass could only
read the two photos he pasted inline in chat — this environment has no
filesystem path for an inline-pasted image, so there was genuinely nothing to
copy. His actual photo turned out to be sitting on disk the whole time, in
`~/Desktop/Team Minified/Patrick Orlando.webp` — a real file, not the chat
attachment — and is now in `src/team/`. Nobody in the team grid falls back to
initials any more.

### Two grids, always both on the page — no switch button (2026-09-16, twice)

The team section went through two passes the same day. The first added
**Christopher Plowman** to `TEAM` at index `0`; a screenshot arrived right
after ("Board & Investors") showing his face in a clearly-separate
board/investor context, so the very next pass **moved** him out of `TEAM`
into a new roster, `PARTNERS`, and turned the section's existing (but inert)
"Team / Partners" tab button into a real switch between the two.

**That was still wrong** — his correction: *"Metti Christopher nel team...
e devi anche metterlo, ovviamente, nei partner. Facciamo così: abbiamo una
grid per il team e l'altra grid invece per i partners."* He belongs in
**both**, and the two rosters are two separate grids stacked on the page, not
one grid a tab swaps between. `TEAM` in `src/data/team.js` has him back at
index `0` (top-left, his original ask); `PARTNERS` never lost him. His photo
now sits in both `src/team/` and `src/partners/` — a deliberate duplication,
not a bug. The tab buttons are gone from the markup entirely; `team.js`
builds two independent `.was-team-grid` elements (`buildGrid("team")` /
`buildGrid("partners")`) into ONE `.was-team` section, both always mounted,
each with its own tooltip wiring.

Six people in `PARTNERS` (`src/data/partners.js`), read straight off the
"Board & Investors" screenshot: **Bo Shao** (Evolve Ventures), **Christopher
Plowman**, **Gretel Packer**, **Anthony Lee** (Altos Ventures), **Zack
Lynch** (Jazz Ventures), **Charlie Hartwell** (Bridge Builders). The
screenshot showed no caption under Christopher's or Gretel's name — no
company, no title — so their `role` is left blank rather than guessed, the
same convention this page already uses for a missing *photo*, now covering a
missing *job title* too. The second grid's own small label reads
`team.partnersTitle` ("Partners", plain — his final reference dropped the
"Board & Investors" framing) and has no body copy of its own.

**The title wraps on a real line break** — `team.title` is
`"The Great\nTeam Behind"`, rendered with `.split("\n")` into `<span>`s
joined by `<br/>` (the same idiom the Atlas header already used), because a
`\n` inside a plain `textContent` assignment collapses to a space in HTML —
it needed the explicit markup to actually break the line the way his
reference shows it.

**The tooltip is ONE floating box, not one per card** — one instance, shared
by both grids. `gsap.quickTo` chases the pointer on `x`/`y` — raw
`clientX/clientY` reads as sticking to the mouse, `quickTo`'s own easing is
what actually reads as *following*. It scales in from `0`
(`transformOrigin: 0% 100%`, the hovered card's own corner) on the first
hover, and away again on leave; moving from one card to another WITHOUT
leaving a grid keeps it visible and just swaps its two lines with a short
roll transition (two stacked spans per line, the outgoing one sliding up and
out while the incoming one slides up into place — the exact mechanic
PlayersClub's own `updateTextSlider` uses). Name is **white**, role is
**`#A6A6A6`**, both his own spec.

**Names and roles are real** (`src/data/team.js` / `src/data/partners.js`,
from the listing screenshots he sent) — 12 in the team grid, 6 in Partners,
both 6-column, the team grid wrapping to 6 on the second row (an even
count, now that Christopher fills what used to be an empty last cell).
**Photos are their own drop-in folders** — while a slot is empty it falls
back to a plain **initials avatar** over a flat tint, never someone else's
face: these are named, specific people, and there is nothing honest to fall
back to but "no photo yet."

## The footer (`src/footer.js`, 2026-09-16)

His reference, transcribed link for link: three columns (**Browse**,
**Resources**, **Company** — "Blog" really is listed twice and
"Accesibility Statement" really is spelled that way on the real site, so
both are kept verbatim rather than "corrected"), the bowl as a **photograph**
this time (`/images/bowl.png`, the same file the nav search field already
uses, at full size) rather than the 3D object, a giant serif wordmark
("Insight Timer", dark green, `10vw`), and the legal line — version, © line,
and the three policy links — along the bottom edge. Entirely static: nothing
in it is scroll-driven or config-tuned, the same as the nav bar's own real
copy isn't. Mounted into its own `<footer id="footer">`, right after a
spacer, right after `#below`, not inside the team section.

### Fixed, and revealed underneath the page (2026-09-16, right after)

His ask, once he saw it in normal flow: *"permettimi di averlo fixed... la
pagina scrolla sopra e poi si rivela con l'ultima sezione"* — the classic
"reveal" footer: pinned to the viewport's own bottom edge the whole time,
with `.was-below` sliding up and off it as the page scrolls, uncovering it
rather than pushing it down ahead of itself.

`.was-footer` is `position: fixed; left:0; bottom:0; z-index: 4`, but it
starts `visibility: hidden` — a bare z-index of 4 would otherwise also sit
above `.was-pin`'s own base tier (3, `#pinA`, the canvas experience), which
would show the footer's white box through the BOTTOM of that section's
entire pin. `main.js`'s `applyLive()` flips `.is-revealed` on the exact
frame `.was-below`'s own bottom edge rises to the viewport's bottom edge
(`belowEl.getBoundingClientRect().bottom <= vh`) — a condition that can only
ever become true once every pinned section has already scrolled fully away,
so the two z-indices never actually contest the same pixel.

Because the footer is fixed, it no longer takes its own height out of the
document — `#footerSpacer`, a plain empty block right where it used to sit,
does that instead. `main.js`'s `syncFooterSpacer()` keeps its height matched
to `footerEl.offsetHeight` (on load, on resize, and again once the wordmark's
own font has actually swapped in, since `document.fonts.ready` can still
land after the first paint) — get that height wrong in either direction and
the reveal either leaves a gap or clips itself.

**The spacer is deliberately unstyled** — no `position`, no `z-index`, no
background of its own. The very first version gave it `z-index: 5` and a
white background as "extra" protection against the canvas layers underneath,
and that was exactly backwards: for the whole length of the reveal, the
spacer's own on-screen region is ALWAYS exactly where the footer's fixed box
is too, so a z-index on the spacer higher than the footer's own (4) just
painted the spacer's opaque white square OVER the footer — a wall of blank
white where the actual footer should have been. The footer's own z:4 is
already all the protection that region needs, because `.is-revealed` is
never true anywhere the spacer isn't also the thing on screen.

**The bug that started this.** Scrolled to the very bottom in V2 with the
panels open, he saw a dark, softly-lit rectangle instead of the footer —
his own diagnosis, "un problema di z-index", was exactly right. Root cause,
confirmed live before touching anything: `.was-ground`'s opened mask
(`z-index: 2`, fixed, and *by design* never closes again once the ring act
opens it — see `ground.out: 0` above) was painting OVER the plain
`position: relative` footer that existed before this pass, because a
positioned element with no z-index of its own lands in a stacking layer
BELOW any sibling that has an explicit positive one, regardless of DOM
order. `.was-below` had always been safe from this at `z-index: 5` — the
footer, freshly added two passes ago, simply never got the same protection.
Giving the footer its own explicit z-index (as part of making it fixed) is
what actually closes the gap; nothing about `ground.js`/`bowl.js`'s own
"stay open forever" behaviour needed to change.

### The wordmark is the real logo, and the ground is `#e5ece8` (2026-09-17)

His own SVG (*"otherwise is not correct"*): `src/assets/insight-timer-logo.svg`,
inlined into `.was-footer-word` via Vite's `?raw` import, every path's
hard-coded `fill="black"` swapped for `currentColor` so the CSS `color`
(`#16302a`) is what paints it. A vector scales to any size with nothing lost,
which is the whole reason it can stand `min(55vw, 860px)` wide. The footer's
own background went from white to **`#e5ece8`**, his hex.

## The player — fixed, bottom-left (`src/player.js`, 2026-09-17)

In place of the hero's fanned deck of video cards: **Christopher's own photo**
on the left (`src/team/Christopher Plowman.webp` — the team grid's file, not a
copy), a round **play / pause** button, his name and what the track is, and a
hairline of playback progress along the bar's bottom edge. `position: fixed`
at `player.left` / `player.bottom` (2.6vw / 4vh — the hero paragraph's own
margin; the paragraph itself moved up to 13vh to sit clear of it), 24px corner
radius, white, the nav's own hairline border and UI face, and **the whole bar
lifts on hover**, not only the button.

**The audio is a drop-in, and nothing plays that isn't his.** The first file
in `src/media/` (`.mp3` / `.m4a` / `.wav` / `.ogg` / `.aac`, filename order) is
the track. While that folder is empty — as it is now — the label says so
(`player.emptyLabel`, "Audio coming soon"), the same honesty the team grid has
for a missing photo. Every number is in the Bowl panel → *Player
(bottom-left)*.

### Concentric corners, glass, and the fake player (2026-09-17, second pass)

- **Corners** — *"16px... 4px di padding... calcolala tu."* The bar is
  `player.radius` (16px); the photo sits `player.pad` (4px) inside it, so its
  own corner is `radius − pad` = **12px** — the two curves share a centre
  instead of fighting (`--pl-r-in`, computed in `player.js`). The bar's
  padding is `pad` all round, plus 14px on the right for the text.
- **Glass** — white at `glass.alpha` (0.26) over a `backdrop-filter`
  blur/saturate, a hairline of white highlight along the top edge
  (`glass.bevel`, the "bevel") and a soft drop underneath. Over the paper it
  reads as a pale card; over the ring act's field the blur shows through — the
  bowl's own canvas included.
- **The fake player** (`player.fake`, his own ask, so the effect can be seen
  before the track exists): with no file in `src/media/` the button still
  works — it runs a fake 72s "track" (slow progress hairline) and drives the
  **equaliser**: `wave.bars` pills in a row, each growing and shrinking about
  the bar's **centre line** (both ends move, no floor — *"con la base al
  centro"*) between `wave.min` and `wave.max`, from three unrelated sines per
  bar so no two ever move in step, easing back flat on pause. One
  `requestAnimationFrame` loop, running only while something plays and until
  the bars have settled. The label still says "Audio coming soon" while it is
  fake. Glass and equaliser each have their own sub-folder in the panel.

## The scroll bar (`src/progress.js`, 2026-09-17)

*"Non per vedere la percentuale, ma per vedere l'andamento dello scroll."* A
4px white line along the bottom of the viewport, filling left → right across
the **whole pinned canvas clock** — driven from the raf loop with the
UNCLAMPED clock (`rawProgress`), so it can **fade in** over its first
`progress.fadeIn` (*"così che non si veda che sta iniziando a partire"*) and
fade back out over `fadeOut` once the clock is done, rather than sitting there
fully lit before anything has moved. The fill is a `scaleX`, one composited
property; the unfilled track behind it is the same colour at
`progress.trackAlpha`. A 1px dark hairline at `progress.edge` (0.25) sits
around the fill — invisible on the ring act's dark field, and the only reason
a WHITE bar survives the evidence panel's white stage, which is half the
clock. Thickness, rounding, distance from the bottom, side inset, colour and
the hairline are all in the Bowl panel → *Scroll bar*.

`progress.wavy` is reserved for the version he sketched — five interlaced,
slowly moving lines, the un-scrolled part at 10% — and is **off and not built
yet**, by his own ordering: *"focalizziamoci prima sulla linea"*.

## The ring act's own background, and the bowl's exit (2026-09-17)

**One colour per step** — green, orange, blue (`v2.act.bg.colors`) — laid over
the ground's field once the ring act has taken over (`actTakeover()` gates it,
so act two still owns the field's colour until the act arrives), handed over
in each step's TAIL by the same `transitionShare` the bowl's own size/tilt
already lead with, so field and object change key together. `ground.frame()`
now takes an `act` object rather than the single "warm" scalar it used to
lerp toward one orange.

**The parallax is on the photographs themselves** (his correction, same day:
*"ad ora non vedo nulla"* — the first cut only nudged the FBM mask's centre by
a few percent, which the eye cannot read, while the pictures, sampled straight
off `vUv`, never moved at all). Now the image is enlarged by `v2.act.bg.zoom`
(1.25) in the shader to make room, and that room is **panned from the TOP of
the picture at the start of the act to the BOTTOM at its end** (*"puntando
verso l'alto all'inizio e andando verso il basso"*), one `uPan` shared by both
images of a crossfade so they match. `parallax[i]` is each step's **share** of
that travel — its speed — so whatever the three numbers are, they add up to
exactly the room there is. Cumulative across the steps as a pure function of
`actStep` + `actLocal` (never accumulated over time — see the gotcha about
anything monotonic on a scroll piece), so it never jumps at a boundary and
unwinds on the way up.

**The room is the picture's whole height, not just the zoom's** (his ask,
later the same day: *"metti le immagini verticali, così che ci sia più raggio
per scrollare"*). His three step images are SQUARE (2016² / 1512²); on a 3:2
screen `cover()` already scales them to the width and hides a third of their
height above and below — they are "vertical" relative to the viewport — and
the first cut of the pan ignored that, using only the zoom's ±0.10. The room
is now worked out in `ground.js`, where the texture's aspect is known:
`shown = min(1, imageAspect / screenAspect) / zoom`, `room = 0.5 − shown / 2`
— ±0.233 at 3:2, more on a wider screen, and never a sample off the picture.
`main.js` now hands the ground a `frac` (0 → 1 across the travel) rather than
a pan in UV, because only the ground can turn one into the other.

**And it never stands still** (*"lo sfondo lo voglio che inizi a muoversi da
top a bottom dall'inizio fino alla fine, e non voglio che si fermi mai"*). The
first cut stitched act two (`untilQ`) to the ring act (`actLocal`) and paused
at both seams: the 40vh of `.was-above` between them, and the 100vh hand-over
after the last step. The pan is now ONE function of the page's own pixels:
five stretches — act two from the moment the ground opens (`ground.at`), the
run-in above the act, the three steps, the hand-over until `#pinB` covers —
each weighted by its **length × a speed multiplier** (`v2.act.bg.preSpeed`,
`parallax[0..2]`, `postSpeed`, all 1 by default). So by default the picture
moves at one constant speed per pixel scrolled from the frame it is uncovered
to the frame it is covered, and a multiplier can only make a stretch faster
or slower, never still. `npm run verify` samples it 13 times across the whole
run and requires every sample to be lower than the last. All of it in the
Bowl panel → *Ring act — background (V2)*.

**The bowl sinks as the rings go — and does not stop** (`v2.act.exit`): from
`exit.at` of the act's clock (0.7, well before the rings' own `outAt` 0.9) it
eases down `exit.y` (−0.5 viewport heights, the poses' own axis) over
`exit.dur`; then, with `exit.through` (his correction: *"si blocca in basso
senza senso"*), it **keeps going at that same rate through the hand-over**,
read off `actPExt` — the act's clock left UNclamped past 1 — so it is still
on its way down when the next section covers it and is never seen parked at
the bottom of the frame. All of it in the Bowl panel → *Ring act — background
(V2)*.

## The team arrives row by row (`team.reveal`, 2026-09-17)

*"Ad ogni 20% di scroll, l'intera fila in stagger, da opacità 0 da y 100 fino
a y 0."* Each row of the team grid (and the Partners grid) plays once, the
first time its top rises above the fold: opacity 0 → 1, `y: 100px → 0`,
staggered left to right (`reveal.dur` 0.8s, `reveal.stagger` 0.08s,
`power2.out`). **Rows are found from where the cards actually land**
(`offsetTop`), never from a column count — so the 3-column mobile grid groups
itself correctly with exactly the same code as the 6-column one.

Deliberately **not** an `IntersectionObserver`: an observer fires only on a
threshold *crossing*, so a jump straight past the section (a fling, an anchor,
the verify's own `scrollTo`) would leave every skipped row at opacity 0 for
good. A passive `scroll` listener asking "is this row's top above the fold
yet?" can never miss one, costs a few rect reads only while rows are still
pending, and detaches itself the moment the last row has played.
`prefers-reduced-motion` gets the final state straight away.

## Wider rings, a glass search field (2026-09-17, later)

- **The teachers' ring was grazing the bowl's texture** — `rings.a.radius`
  0.78 → **0.9**, `radiusEnd` 0.34 → 0.42, `minRadius` 0.6 → 0.68 (the floor
  goes up with it, so the end-of-act gather keeps the same clearance); the
  activities move out with them, `rings.b.radius` 1.25 → **1.42**,
  `radiusEnd` 0.62 → 0.74, `minRadius` 0.68 → 0.8, keeping the same gap
  outside the inner ring. The verify's "never crosses into the mesh" check
  reads the floors live, so it covers the new numbers unchanged.
- **The nav's search field is light glass** (*"così che si veda la ui che
  passa sotto"*): white at `hero.nav.searchGlass.alpha` (0.55) over a
  `backdrop-filter` blur of `searchGlass.blur` (14px), the same hairline
  border as before; `hero.style()` writes both as CSS custom properties on the
  nav. Titles panel → *Nav — search glass*.
- **The player parks when the three-step section arrives** (*"arresta lo
  scroll di corsa del componente playback fino alla sezione di tre step prima
  del team"*): `player.parkAt: "evidence"` — as `#pinB`'s top rises through
  the last `parkOver` (0.4) of the viewport, `main.js` writes `--pl-park`
  0 → 1 and the whole bar slides down 140% of its height and fades, pointer
  events off once parked; a pure function of the scroll, so it comes straight
  back on the way up. `"never"` keeps it riding to the end.
- **Footer: the logo is the whole width, the bottom inset is 3vw** — the
  128px of bottom padding that kept the legal line clear of the player is
  gone with the player parked long before; `.was-footer-word` is `width:
  100%`.

## The three steps rise early, the rings feel the scroll (2026-09-17, later still)

**`#pinB` starts rising over the ring act's last stretch** (*"inizi a salire
molto prima, quando la ball è praticamente appena partita"*):
`scroll.earlyRiseVh` (90, V2 only) pulls the section up by that much with a
negative `margin-top` AND makes it that much taller, so the page's length and
the clock do not move an inch — only WHEN the white stage's top clears the
viewport's bottom changes: from the act's end to ~0.83 of it. The bowl's own
exit is retimed to meet it (`exit.at` 0.78, `dur` 0.22, `through`): the bowl
starts down, the section comes up, they cross, and the bowl leaves the way
everything on this page leaves — covered. 90 is the most the rings' own
stagger-out (0.9) can take without being hidden; the Bowl panel has the
slider (it re-applies `applyPinHeight()`).

**The rings feel the scroll's force.** `main.js` keeps a damped scroll
velocity (px/s, eased toward the raw value at 8/s) and hands it to every
ring each frame; a ring turns at `speed × (1 + min(4, |v| × force))` — in its
OWN direction, capped, and back to exactly its base speed the moment the page
is still. Nothing accumulates, so the orbit is never left somewhere it would
not otherwise be (the monotonic-drift gotcha).

**Scrolling back above a ring's own mark plays its bloom BACKWARDS** (*"allo
stesso modo di come è entrato, deve uscire"*): the same duration and stagger,
`from: "end"` so the last card in is the first out, instead of the snap-to-
nothing `reset()` it used to be. The tween is simply overwritten by the bloom
if the mark is crossed again on the way down. (Scrolling back up past the
act's `outAt` was already a re-bloom.)

**The player goes white over the shader** (*"quando entro nello shader,
diventi bianca"*): keyed off `body.is-ground` — the class that already turns
the copy to light while the ring act's field is open — the bar becomes dark
glass (white 12%), type and pills white, the button white with dark glyph,
with a 0.35s colour transition each way.

## The performance pass — "un codex" (2026-09-17, last)

His ask closed the day: *"fai un codex e valuta come migliorare le prestazioni
in tutto e per tutto, così che abbiamo un sito ottimizzato."* Rather than
guess, the whole codebase was put through a four-lens review (per-frame JS and
three.js, GPU and shaders, DOM and CSS, bundle and assets), and every finding
was then handed to an independent sceptic told to REFUTE it against the real
code and the real three.js source before it was allowed to count. 24 findings
came back; 18 survived, 6 were thrown out. What was rejected — and why — is
as much a part of the record as what was fixed, so both lists are below.

The rules the review had to respect, and did: every animated value stays a
**pure function of the scroll**; reveals stay in place; the bowl's canvas
stays a transparent layer; the footer stays fixed and reveal-gated; the ground
layer stays readable by the verify.

### What ships differently

**Bytes on the wire (the opening waits for these):**

- **The bowl's GLB: 61.8 MB → 2.2 MB.** Same file name, the SAME geometry —
  1.1 M vertices, 2.2 M triangles, no simplification — Draco-compressed
  (`gltf-transform draco`). `bowlGeo.js` hands `GLTFLoader` a `DRACOLoader`
  whose decoder is served from `public/draco/` (copied out of
  `three/examples/jsm/libs/draco/gltf/`); Draco decodes to plain Float32, so
  the two `applyMatrix4` passes and the shell split are exactly as before
  (the verify still asserts `tris > 2e6`, `shells === "AB"`, balanced halves).
  A `simplify` pass was tried (388 k verts → 1.7 MB) and not taken: 0.5 MB
  for a thinner rim was a bad trade. The original sits in
  `source-assets/models/` with the command that regenerates the shipped file.
- **Exposure: 440 kB TTF → 217 kB woff2** (`wawoff2`), and both it and the
  GLB are `<link rel="preload">`ed from `index.html` (font also on
  `teach.html`), so the browser asks for them with the HTML, not after
  `main.js` has downloaded, run and parsed the stylesheet.
- **The EXR/HDR loaders are no longer in the main chunk.** `studio.hdr.on`
  was `true` with no files in `public/hdr/`: two 404s at boot, the bowl unlit
  for a round trip, ~36 kB of `EXRLoader`+`fflate` shipped for nothing.
  Now `on: false`, and `bowl.js` `import()`s `envHdr.js` only when an HDR is
  actually switched on; a synchronous stub stands in for every reader
  (`setWorld`, `dispose`, the panel's `sync`, `bowl.hdr.state` in the verify).
  Dropping maps in means flipping `on` too — the panel's toggle does it live.

**GPU, every frame:**

- **The ground layer renders at DPR 1.** It is frosted by design — three FBMs
  and up to 96 texture taps per pixel, then a blur — so device pixels bought
  nothing; on a retina screen this is a 4× cut in fragments for the heaviest
  shader on the page. `main.js`'s resize handler now also calls
  `ground.resize()` (it never did).
- **Only the picture(s) actually showing are frosted.** `uMix` sits at
  exactly 0 or 1 for most of the act, and each `frost()` is up to 48 taps —
  the second was run on every pixel regardless. Guarded on exact `0.0`/`1.0`
  thresholds, so the output is bit-identical.
- **No `preserveDrawingBuffer` on the ground.** On a full-viewport canvas it
  makes the browser copy the back buffer on every composited frame; it was
  there only so the verify could read pixels back. `ground.sample()` now
  re-renders the current uniforms and reads back in the same task, which the
  spec guarantees — the readback assertions are unchanged.
- **The bowl's bloom runs in CSS pixels.** `EffectComposer` hands every pass
  the device-pixel size, so on retina the bright pass and five mips ran at
  4× the fragments — for a blur. `bloomPass.setSize` is wrapped to divide by
  the pixel ratio; the kernel is in texels, so the halo is now the same width
  in CSS px on every screen (what a DPR-1 viewer always saw). `post.bloomHiRes`
  puts it back for comparison — the Bowl panel has a **Post-fx** folder now
  (it had no live bindings before).
- **No MSAA on the bowl's context.** With post on, the scene is drawn into
  the composer's non-multisampled targets and the canvas only ever receives a
  full-screen quad, so `antialias: true` bought a multisample resolve per
  frame and not one smoother edge. It is asked for only when the page boots
  with `post.enabled: false`, where the direct path needs it.
- **The inner shell's Gaseous patina: 13 → 8 octaves.** At lacunarity 2.1
  the top five were sub-pixel at every pose size — 224 gradient evaluations
  per fragment for nothing visible. It is a preset value in the Bowl panel.

**The main thread, every frame:**

- **The debug HUD** rebuilt its `innerHTML` on every frame (markers are on by
  default) — layout dirtied 60× a second whether or not a digit had changed.
  It is six text cells built once, written only when their string differs,
  and not at all while hidden (M, or C's clean view).
- **`sphere.frame` returns before the billboard pass** (18 `lookAt`s, the
  assembly pop, the pills, the drum subtree update) when its canvas is not
  active. The spin, the drag and the recentre above it keep running, so it is
  never caught stopped mid-turn — the 2026-09-15 rule holds — and the skipped
  part is a pure function of the scroll, so the first active frame lands on
  the same picture.
- **Layout reads are grouped ahead of the writes** in the raf: `readAtlas()`
  and the "Until now" rect are taken next to `readUntil()`, and
  `network.update()` (which measures its mount inside the sticky stage) runs
  before the frame's transform/opacity writes. The sceptic downgraded this
  one — most writes were already change-guarded — but it is free hygiene.
- **The player's park is not transitioned.** `--pl-park` is written every
  frame as a function of the scroll, but `transform`/`opacity` carried a
  0.35 s transition, so every write retargeted it and the bar trailed the
  scroll by a third of a second (and kept drifting after it stopped — a
  purity bug as much as a perf one). The park now rides on `translate`, the
  root's transition list drops `opacity`, and the hover lift keeps its own
  `transform`. The fake track's fill is also untransitioned (real audio's
  ~4 Hz `timeupdate` keeps its smoothing).
- **No `will-change` on the word/line/char spans.** It promoted ~200 text
  fragments to their own compositor layers for a reveal that repaints its
  block anyway; the blocks are a few hundred px of type.
- **No `backdrop-filter` under the solid card.** `left.js` set
  `blur(14px) saturate(1.28)` on a card that is opaque white — computed, then
  completely covered. The frost behind the card is where the glass lives; the
  filter is only asked for when the card lets something through.
- **`ring.clear()` frees the textures** it never did (`Material.dispose()`
  does not touch uniforms), and a build generation guard stops an in-flight
  image load from writing into a ring that has since been rebuilt.

### What was rejected, and why

- *~30 layout reads per frame, `actTakeover()` computed 3×*: accurate, but
  0.05–0.1 ms against three WebGL renderers and a bloom chain; hoisting is
  hygiene, not a win. (The cheap moves were folded into the read grouping.)
- *`copy.update` repaints every word every frame*: on THIS page a handful of
  words, all identical strings the engine dedupes — ~10–25 µs.
- *Equaliser bars animate `height`*: the raf already recomposites every
  frame; the bars are not layers; and the proposed `scaleY` would fight the
  existing 0.35 s transition and squash the resting dots.
- *798 kB `bowl.png` for a 34 px nav icon*: real (~750 kB), but the same file
  is the verify's relief-upload fixture and the footer asserts its `src`;
  it is a follow-up with its own check changes, not a silent swap.
- *Tweakpane and both panels bundled and built at boot*: they are the page's
  default UI, open by design. Removing them is a product change.
- *The Atlas builds a fourth WebGL context at boot while off*: real, but its
  per-frame cost is already nil, `ATLAS_STATE` is read synchronously at boot,
  and the verify flips `cfg.atlas.show` directly — deferring it needs a
  different seam. Follow-up.

### How it is asserted

Six checks were added to `repro.mjs`: the ground's `dpr === 1`; the bloom's
bright pass at half the CSS width with `antialias === false` on the context;
the GLB served under 4 MB with `tris > 2e6` and both preloads present in the
HTML; the woff2 served under 300 kB; the player root with no `opacity` in its
transition list, a live `translate`, and zero word spans carrying
`will-change`; and the HUD at 12 cells, `hdr.on === false` with 0 loaded and
0 files, patina at 8 octaves. The glass check was rewritten to assert the card
is solid with NO backdrop under it.

## The outline became the timeline, and the footer became a page (2026-09-17, last)

Four asks in one message, and three of them were about the same instinct: stop
the UI looking like UI.

### The player: its own edge is the playback

- **The hairline inside the bar is gone.** His words: *"togliamo quella linea
  che c'è in basso, che non so perché ce l'abbiamo messa... sembra un errore di
  codice."* It did. In its place the component's OWN outline is the progress:
  *"lo stroke possa diventare invece la nostra linea del tempo, quindi che si
  compone attorno allo stroke del componente."*
- It is one inline `<svg>` at the top-left of `.was-player`, holding the same
  rounded-rect path twice: a faint **track**, which is simply the edge the bar
  always has, and over it the **progress**, which composes itself clockwise
  from the top-left corner. `pathLength="1"` normalises the outline to a length
  of 1, so the dash pattern IS the progress — `${p} 1` — with no arithmetic and
  nothing to keep in sync.
- The CSS `border` had to go with it. An absolutely positioned child is laid
  out on the PADDING box, so with the border kept the stroke would sit one
  pixel inside it: a doubled hairline, with the progress off-register from the
  very edge it is meant to be drawing.
- The path is inset by **half the stroke width**. A stroke straddles its path,
  and the bar clips its own overflow, so a path on the box's edge would lose
  its outer half. Inset, the whole stroke is inside and the corner's outer edge
  lands exactly on the clip radius.
- The box is content-sized — his name decides its width — so the path is
  rebuilt from a **ResizeObserver**, which runs after layout and before paint.
  Nothing measures geometry in the animation loop. `borderBoxSize[0]` is the
  box the outline is drawn on and it is fractional, so the rect is exact;
  `contentRect` would be short by the padding on both axes, which is why the
  fallback is `offsetWidth/offsetHeight` and not that.
- There is **no transition on the dash**. It is written per frame while the
  track plays, and a transition would retarget every frame and trail it — the
  same rule the park already follows. The stroke's COLOUR does transition:
  that only changes when the theme does.
- **Black on the white page, white over the shader** (his ask). Both come off
  `--pl-ink` / `--pl-track` on `.was-player`, which `body.is-v2.is-ground`
  swaps — the same class that already turns the copy, the button and the pills
  to light. The two old border colours were exactly the track values he
  described, so nothing was invented.

### ...and it breathes

- The equaliser moved **under the name** (*"vorrei che il sound line stesse in
  basso"*): the name and the wave are now one stretched column with
  `justify-content: space-between`, so the sound line sits on the photo's own
  bottom edge and the space between them is what stops the bar reading as
  *"tutto bello compatto"*.
- The photo is the tallest thing in the row, so **it IS the bar's height**:
  `size` 56 → 72, and the bar 64px → **84px**. The image scales with it, which
  is what he asked for ("scala in proporzione") and means the height is one
  number, not two. `radius` 16 → 20 and `pad` 4 → 6 keep the concentric rule
  (the photo's corner is the bar's, less the inset: 14px).
- `hero.paraBottom` went 13 → 14vh with it. The bar's top edge is now 124px off
  the bottom at 1000px tall, so 13vh no longer cleared it.
- One thing is load-bearing and easy to break: the wave row's height is FIXED
  at `wave.max`, and `tickWave` never eases a pill past it. The pills animate
  their `height` in px every frame, so a row that grew with them would resize
  the player and fire the outline's observer 60×/s.
- The panel can switch the equaliser off, and then the name is the only thing
  left in a column sized by the photo — `space-between` floated it to the top.
  `.is-nowave` centres it instead. There is a check for it.

### The rings: the teachers are the subject

*"Le immagini dei therapist... siano più grandi rispetto a quelle delle
persone, poco più grandi, così che abbiano più una gerarchia diversa."*

Ring **a** is `source: "teachers"`, which resolves to `src/therapists/` — 20
square face portraits. Ring **b** is `source: "experiences"` — activity
photographs, which all happen to show people, which is why he called them
"quelle delle persone". Today the activities were the BIGGER of the two: the
hierarchy was inverted.

The constraint is not where the rings start, it is where they END. Both land on
their `minRadius` floors (`ring.js` clamps `r` to it, and both `radiusEnd`s are
below their floors), so there is exactly `0.80 − 0.68 = 0.12 × D` of radial gap
between the two orbits, and half of each card has to fit in it. Growing the
teachers alone would have pushed the pair from 0.130 to 0.1475 and made the two
rings visibly cross. So the difference is **given back by the activities**:

| | card | cardEnd |
|---|---|---|
| a — therapists | 0.22 → **0.25** | 0.12 → **0.135** |
| b — activities | 0.24 → **0.215** | 0.14 → **0.115** |

~16% of hierarchy at both ends, and the combined half-cards drop from 0.130 to
0.125 — so the orbits crowd each other slightly LESS than they did.

### The footer is a page, not a band

`.was-footer-word` carried `margin: 96px 0 56px`, and that was the whole bug he
found. The footer is `position: fixed; bottom: 0`, so its content height is
also how much of the screen it hides — and every pixel over one viewport goes
off the TOP. At 1440×800 the stack was 984px: the link columns started 184px
above the viewport, behind the nav. Delete the margins and the box drops to
~843px, and the page shows through above it — his *"parte scoperta sopra"*.

Both are one bug: the box must be exactly one viewport and the slack must live
somewhere else.

- `.was-footer` is a flex column at `min-height: 100vh` (then `100dvh`), and
  `.was-footer-in` — which had no rule at all before — is the column that
  stretches inside it.
- `.was-footer-word` gets `margin-top: auto`, so **the gap he asked for IS the
  leftover viewport**, with `padding-top` as the floor it can never go below.
- The content genuinely does not fit one viewport on a laptop, so the wordmark
  — the only purely expressive element here; the links and the legal line are
  information — is what gives way. The footer writes its vertical budget down
  as custom properties (`--foot-pad-top`, `--foot-top-h`, `--foot-gap-min`,
  `--foot-bottom-h`) and the wordmark takes what is left, converted back to a
  width through the logo's own aspect (viewBox 160 × 27 = 5.926):
  `width: clamp(280px, calc(var(--foot-word-cap) * 160 / 27), 100%)`.
- Under `max-height: 860px` the link rhythm tightens (11 → 7px) and the gaps
  give, but the TOP padding does not: it is what keeps the columns clear of the
  fixed nav, which paints over the footer at z 7 against its z 4. It is **96px**,
  not 88 — at 88 the column headings' first 3px sat inside the nav's box at
  every viewport, which is a guarantee the comment was making and the number
  was not keeping.
- `--foot-top-h` and `--foot-bottom-h` are **measured, not assumed**:
  `footer.measure()` writes the real column and legal-row heights on boot, on
  resize and once the font has swapped, and `syncFooterSpacer()` calls it
  first. The budget is tuned to consume the viewport exactly, so hand-written
  constants would have failed unsafe — one more link in a column and the box
  goes over one viewport again, off the top, which is the original bug. There
  is no feedback loop: what is measured does not depend on the wordmark's
  width, which is all it decides.

Measured at 1920×1080, 1500×1000, 1440×900, 1440×800, 1366×768, 1280×720 and
1440×1440: the footer is exactly one viewport at every one, the spacer matches
it exactly, nothing is cut, and the wordmark stays full-bleed down to 1440×900
before it starts to narrow.

The page's total length changes with this (it gets ~5px longer at 1000px tall,
~184px shorter at 1440×800), and nothing downstream cares: every clock is
measured off `pinA`/`pinB`/`pinC`/`until` offsets, all of which sit upstream of
the spacer in flow, and nothing in `src/` reads the document's height at all.

## The bar closes as you read, and the hierarchy moved a section (2026-09-17)

### The player closes, instead of twitching

He did not like the hover lift — *"non voglio che si alzi leggermente in Y.
Sinceramente, fa un po' cagare come interazione"* — so it is gone, and the
gesture it was standing in for is the real one:

- **Scrolling DOWN closes the bar** to just the photo and the play button;
  **scrolling UP opens it.** The type goes out **letter by letter from the
  right**, and comes back from the left.
- **Hovering always opens it**, wherever the scroll left it, and leaving puts
  it back to exactly that — not to "open", to whatever the scroll had decided.
- Closed, the **right-hand end is a half-circle** (*"il border radius di destra
  top e destra bottom fosse 100%"*), and it is **concentric with the play
  button**, not merely near it — which is what *"calza a pennello"* asks for.
  The closed right inset is therefore `height/2 − button/2`, computed, not
  typed: the button's centre and the round end's centre land on the same pixel
  (the verify asserts `btnMid === capMid`).
- The left corners keep the radius they share with the photo, as he asked.

**One GSAP value drives all of it.** `collapse.v` (0 → 1) writes
`--pl-collapse`, `--pl-main-w`, `--pl-pr` and `--pl-rr`, AND redraws the SVG
outline with a per-side radius. That matters: the outline is the timeline, so
if the box and its own edge were animated by two different mechanisms they
would visibly disagree for half a second. Nothing here is a CSS transition —
the tween is the animation.

The letters are sorted by **where they actually sit**, not by which line they
are on, so "right to left" reads across the block rather than down it:
`charsLtr` / `charsRtl` are the same spans in the two orders, and the stagger
just walks whichever one the direction calls for.

**This is the one hysteretic thing on the page.** Everything else is a pure
function of the scroll POSITION; this reads its DIRECTION, so it depends on
history. That is deliberate and it is bounded: it holds one boolean, both ends
are defined states, it settles, and `collapse.velocity` (90 px/s) means the
wobble at the end of a Lenis glide cannot flutter it. It is chrome, not
choreography — the distinction worth keeping is that the PARK stays a pure
continuous function of position, and only this sits on top of it.

### The footer's links

At `opacity: .65`, full strength on hover and on `:focus-visible` — the list
reads as one quiet block and the one you are pointing at comes forward.
Opacity rather than colour, so it works over this paper and would work over
anything else.

And **"Blog" is no longer in the Company column twice**. It was in his
screenshot twice and was transcribed faithfully, which the README used to say
out loud. It read as a bug because it is one; the verify now asserts there is
exactly one.

### The therapists — the RIGHT section this time

I got this wrong the first time and grew the ring act's cards. He meant the
section AFTER it: the three steps of the network — **the people, then the
therapists, then the techniques** — where `dotUser` and `dotTeacher` are the
photo sizes.

The ring cards are back exactly as they were (`a` 0.22/0.12, `b` 0.24/0.14),
and `network.dotTeacher` goes **34 → 48** against `dotUser: 30`. 34 against 30
is a 13% difference: technically present, visually not. 48 is 1.6×, which is
read as a rank rather than as a rendering accident — the therapists are the
step's subject, and the three steps ARE a hierarchy.

The network had **no panel bindings at all**; it has a "Network — the three
steps" folder now (both photo sizes, the field dot, the sphere's radius, how
far the technique pills sit out), because these are numbers to be looked at
rather than calculated.

## V3 — the third version (2026-09-17)

`3` switches to it, `1` and `2` still do what they did. V3 is **V2 plus four
deltas**, not a third page: the ring act, the ground shader, the player, the
bowl's whole choreography are V2's, untouched.

### The switch became a real tri-state

`CONFIG.v2.on` was a boolean read in some two dozen places, and every one of
them wants V2's behaviour in V3 too. So the switch is now `CONFIG.variant`
(1 | 2 | 3) and `v2.on` is **derived** from it — written in exactly one place,
`setVariant`, as `variant >= 2`. Nothing else changed, and nothing else had to.
`body.is-v3` is **additive**: `is-v2` stays on, so every existing `is-v2` rule
keeps applying and only the four deltas key off the new class.

### 1. The three steps become a golden-angle disc

His ask: the people grow inside the first circle, the therapists on the area
outside it, the pills around that, *"per ogni persona, un terapista; per ogni
terapista, una pill"* — a progression, not a scatter.

One continuous phyllotactic spiral: point *i* at angle `i × 137.507°` and
radius `R·√(i/N)`. **The square root is the whole thing.** Area grows as r², so
radius ∝ √i is the only law that keeps the density even — it is why a sunflower
looks the way it does, and, more usefully here, it makes a *contiguous index
band* exactly a *contiguous annulus*. The three zones are therefore three index
ranges on one uninterrupted spiral, and they come out strictly ordered for
free: measured at 1500×1000, people 34→130, therapists 138→186, pills 192→230,
against rings at 134 / 189 / 232.

And the chain falls out of the geometry. Because the three bands hold the same
count, the angular step from a person to its therapist — `(P × 137.507°) mod
360` — is **exactly** the step from that therapist to its pill: 20.06° for
P = 8. Every chain is the same shape rotated by 360/P, so the eight of them
nest as a pinwheel and **cannot cross**. No untangling pass, no heuristics, no
separation loop. Pill overlap measured at 1500×1000, 1280×720 and 1920×1080:
zero pairs, nothing outside the box.

The centre stays **empty** and there is **no field of dots** (his correction:
*"non deve essere riempito... non voglio neanche i puntini"*). What is there
first is the discs' own **rings**, in a very light grey, which **draw
themselves on** as you scroll — `stroke-dashoffset` against each step's own
ramp, so they un-draw coming back up like everything else here. The content
then grows over them on the same three ramps V2 already uses.

V2's sphere is untouched: `layout()` branches once on the variant and the two
modes share nothing but the builders.

### 2. The team grid in black and white

`filter: grayscale(1)`, full colour on hover. On the **card**, because there is
no `<img>` — `team.js` paints each person as the card's own `background-image`
— and only on real photographs, since the placeholders are flat tints and
greying those says nothing. One class, `is-team-bw`, set from the variant AND
`team.grayscale`, so the panel can lift it. `transition: filter` only, never
`all`: the same element's opacity and y are written by the scroll-driven row
reveal, and a transition there would trail the scroll.

### 3. The footer got much lighter (all versions)

Not V3-only — he called the old one *"molto pesante"*, and that is a defect
rather than a look.

- **The bowl photograph is gone.** It was a 798 kB PNG for a decorative crop.
- **Browse and Resources each run over two sub-columns**, Company over one,
  the three groups spread across the full width. That takes the block from a
  15-row wall to 8 rows and hands ~190px back to the page — which is why the
  wordmark and the legal line can breathe now (the gap above the wordmark went
  from 117px to 298px at 1500×1000).
- The markup nests `.was-footer-sub` INSIDE each `.was-footer-col`, so the
  per-column link counts the verify asserts (15 / 12 / 7) are unchanged.
- **Links at 50%**, full strength on hover — *"così che, quando vado in over,
  si nota di più la differenza"*.

### 4. The hero's real titles (all versions)

"Building / space" to the left of the bowl, "to / practice" to the right, two
lines each. `|` starts a new line — the separator the paragraph already used —
and each half is still two words, so the opening timeline keeps its shape.

The two halves **slide apart and are deliberately not a mirror pair**
(*"devono sfasarsi sulla X"*): the left travels 5vw, the right 7vw, and the
right **starts 18% later on the same clock**. The lag is what stops the pair
reading as one object being pulled in half. `smoothstep` rather than a linear
ramp is the "organico" part; it stays a pure function of the scroll either way.

The sfasamento is not visible in pixels — the right half travels further, so
it is ahead in pixels even while behind in phase. It shows in the FRACTION of
its own travel each has done: measured mid-hero, left 0.65 against right 0.51.
That is what the verify asserts.

### 5. A third panel

There were deliberately only two. This is a third because it answers a
different question from either: not "what does this title say" (Titles) and
not "what does the object look like" (Bowl), but **how version three is laid
out** — the disc, the hero's two halves, the footer and the team, plus the
version switch itself. `V` toggles it, `C` hides it with the others.

It docks as a **second left-hand column** (`left: 330px`) rather than stacking
under Titles, which would have cost the longest pane on the page half its
height. Left on purpose: the disc it tunes lives in the bottom-RIGHT box, and
the Bowl panel already overlooks that side.

## Five placements (2026-09-17, last)

- **The footer's columns are one left-aligned row with a real 30px gap**, not
  `space-between` — which had stretched the three groups to the full width and
  left canyons between them. One number, `footer.colGap`, separates a group
  from the next AND a group's own two sub-columns, so all five tracks read as
  one rhythm: measured lefts 60 · 220 · 469 · 701 · 918, gaps 30 · 30 · 30 · 30.
- **The links start lower** (`footer.padTop`, 96 → 150) and **the wordmark sits
  lower** — the block is bottom-anchored, so the only gap that can move the
  logo down is the air UNDER it (`footer.wordBottom`, 40 → 14).
  `footer.style()` is now called at boot, not just from the panel: `measure()`
  alone left `padTop`/`colGap` at their CSS defaults until something touched
  them.
- **The player moved to the bottom-RIGHT** (`player.side`). `--pl-left` is the
  inset from whichever side it picks, so the collapse, the park and the
  concentric round end all work unchanged.
- **...which hands the bottom-left back to the hero's paragraph**: it sits on
  `4vw`, the same left inset the whole page shares, and at `6vh` instead of the
  14vh it needed to clear an 84px bar.
- **The three-step summary fires when the SECTION reaches the top of the
  viewport**, not at a fraction of the pinned clock. `applyLive()` already read
  pinB's rect every frame, so it costs nothing: `tl.evTopped` is that read, and
  `left.js` arms on it. Measured: section top at +260 and +60 → nothing; at −4
  and −200 → revealed. `evidence.summaryOnTop: false` restores the clock mark.

## V4 — the contours, inflated (2026-09-17)

`4` switches to it. His idea, and his correction of my first attempt at it:
*"prima devono uscire le peels... i dots molto piccoli e non troppo visibili,
subtle... e poi nel terzo step la sfera, perché una sfera interattiva possa
girarla, dove ci sono le pills che girano attorno e i vari punti collegati con
delle linee che vanno attorno alla mesh."*

```
step 1   the TECHNIQUES come out first, flat on the map
step 2   then the vertices, WITH the concentric rings — small, quiet
step 3   then it becomes a world: the map inflates into a sphere you can turn
         by hand, the techniques lift into orbit, and a chain hops vertex to
         vertex across the surface to reach each one
```

That order is his, and it was the correction that took three goes to land
("il contrario, bro"): the techniques are the question the section opens with,
not the answer it closes on.

**The flat state is not a decoration of a sphere, it is one.** It is the
AZIMUTHAL EQUIDISTANT projection — the one on the UN flag — which puts the
pole at the centre and every parallel at a radius proportional to its angular
distance from it. Evenly spaced latitudes therefore come out as evenly spaced
concentric rings, which is what the verify asserts. The third step is that
projection being wrapped back onto the ball it came from:

```
flat   ρ = Rf · (π/2 − φ) / θmax ,  bearing λ
ball   x = cosφ·sinλ ,  y = sinφ ,  z = cosφ·cosλ
```

Both are true positions of the same (φ, λ), so the inflation is one lerp and
scrolling back up flattens it exactly.

**The vertices are spread over the SPHERE first and projected flat second.** A
latitude/longitude lattice is the obvious way round and it is wrong: every
meridian converges at the poles, so the ball comes out with two dense caps and
a bare equator. Golden-angle first (the same law the V3 disc runs on) gives an
even ball AND an even map, because both projections here are area-honest.

**The chains wrap the mesh.** *"Si collegano alcuni punti con alcuni punti che
si collegano con delle techniques"* — so each technique is the END of a short
chain that hops vertex to vertex across the surface to reach it, drawing
inward hop by hop.  Every sample of an arc is a real point of the
sphere, so the line travels over the surface instead of cutting across the
air — the verify measures that no sample sticks out past the ball's own
silhouette. That is the whole difference between these and the strands he
turned down: these belong to the object. Two mistakes were worth the fixing:
tying each technique to its NEAREST vertex made the arc a stub, so each one
reaches for vertices about `arcSpan` radians away, spread around its own
bearing; and an arc whose mean depth is behind the ball is drawn faint, or the
silhouette stops meaning anything.

**It turns by hand.** The drag is an offset ON TOP of the scroll's own
rotation and it settles back to zero, so the ball is never left somewhere the
scroll did not put it — the same rule `sphere.js` follows in the hero.

### Made properly (the "do your best" pass)

He asked for more techniques and for the thing to be *done really well*. What
separated correct from good, in order of how much it mattered:

- **Perspective.** The ball was orthographic — a flat pattern that happened
  to be round. `perspective: 0.26` draws the near side larger than the far
  side, and it is applied to positions, dot sizes and the pills alike. This
  one change is most of the difference between a diagram and an object.
- **Every ring is split at the horizon.** The far half of a parallel is a
  separate path at `backAlpha`; before, a ring was one opacity all the way
  round and the wireframe had no depth of its own.
- **Twelve techniques**, spread over a belt of ±46° by a Fibonacci sphere
  confined to that belt — even in *sin(latitude)*, which is even in area —
  so twelve labels never bunch. Each is scaled by perspective, shrunk a
  little more when behind (`pillBackScale`), dimmed as it swings round the
  back, and **moved behind the ball's near side in the DOM** when it does, so
  the front rings really cross over it. A label at the limb, pushed to the
  orbit and grown by perspective, could clear the frame: it is held inside by
  its own half width, and the chain's last hop bends with it so the line
  still arrives at the label.
- **The vertices a chain reaches light up** — a hairline halo that grows as
  the hop arrives — so the connection is felt at the point, not only read
  along the line. The last hop of every chain climbs, on purpose, from the
  surface up to the orbit, so it arrives *at* the technique rather than under
  it; the verify's surface check allows exactly that climb and nothing more.
- **The drag turns on both axes and has inertia**: a fling keeps turning,
  then everything settles home. The box says `grab`.

Paint order is DOM order, back to front: far rings · far dots · far chains ·
far halos · far pills, then the same five again for the near side. All 320
vertices still live in six paths, the halos in two, and a technique's whole
chain in two — so a frame is ~40 attribute writes, not ~500.

Measured at 1500×1000, 1280×720 and 1920×1080 with the ball fully inflated:
eight labels visible (four behind), zero overlapping pairs, zero outside the
frame.

## V4's first proposal — the braid (superseded)

`4` switches to it. Same rule as V3: V4 is V2 plus its own deltas.

### The three steps, my own reading

He asked for a third version of the illustration — *"una variante fatta da te,
ragionata da te e che sia diversa dalle altre due"*.

The sphere (V2) and the disc (V3) are both **radial**: the subject sits in the
middle and you read outward. So this one is **linear**, and reads left to right
like the sentence it illustrates. Three strands enter from the left — the
members' own reports, the therapists' reports, the clinical research — wind
around one another, and converge into a single node on the right. That is what
the section actually claims: *"unifying data from clinical research, reporting
from therapists, and lived outcomes"*. Three sources becoming one answer. A
braid is the plainest picture of that there is, and it fills a landscape box
the way a circle never can.

Strand *k* is a sine wave in y, the three of them 120° apart in phase:

```
angle(t) = 2π·t·twists + k·2π/3 + phase
y_k(t)   = cy + A(t)·cos(angle)       A(t) closes toward the right
z_k(t)   = sin(angle)                 > 0 is in FRONT
```

**`z` is what makes it a braid rather than three crossing lines.** Every strand
is painted as short segments, all of them sorted back-to-front, so a strand
passing behind is genuinely drawn *under* the one in front and dimmed. Without
that it is just a wave pattern.

Three things it took iterations to get right, all visible in the config:

- **`phase: -90°`.** At 0° the three sit at `cos 0 / 120 / 240`, and the last
  two are the same number — two strands entered the frame on exactly the same
  line, with their labels on top of each other. −90° opens them to
  `0 / +0.87 / −0.87`: three distinct heights at the left edge.
- **It is a FUNNEL, not an even rope** — wide at the left so the three read as
  three separate things, closed to almost a point at the right. `converge:
  0.96`. An even rope is a texture; the funnel is the sentence.
- **The beads are spread first and nudged second.** A bead only sits where its
  own strand faces forward, so a photo is never half-covered by a line crossing
  it — but filtering a list of front-facing `t` values bunched them wherever
  the winding happened to face the viewer. They are spread evenly along the
  strand first, then each walks to the nearest front-facing place.

The pills all ride one strand, so they get a Y separation pass; the strand
labels carry a white halo (a fat stroke painted under the glyphs) because the
strands pass right through where they sit. It draws itself on left to right —
each segment's opacity is a soft leading edge swept by its own step's ramp — so
it is a pure function of the scroll and un-draws coming back up.

### The team, named under the face

`is-team-caps`: the name in the ink, the role in a grey under it, and the
cursor tooltip they replace is hidden. The caption is a child of the CARD, so
the row reveal, the row grouping and the hover all keep working on exactly the
element they already did — CSS is what lifts it below the photo, and the grid
gets the extra row-gap it needs.

### And the footer's column gap is in vw

`footer.colGap: 4` — 60px at his own 1500, and it scales with the page instead
of staying 60px on a 3000px screen.

## The canvas never resizes

The canvas is **always the whole frame**, behind everything; the left panel is
an opaque overlay on top of it. The composition is placed by skewing the
camera frustum (`camera.filmOffset`) so the scene sits dead centre of whatever
the panel leaves exposed — `npm run verify` asserts it to the pixel (the
portrait lands at 1125, 500 in a 1500×1000 frame with a 50% panel).

The split is now fixed for the whole piece, so the skew is written once and
never moves: no `setSize` during the scroll, no reallocated drawing buffer, no
jank, and the whole six-step map holds its centre. It is also what keeps the
door open — sliding the panel is a one-line change to `--split`, and the skew
would unwind on its own.

## The steps

| step | canvas | copy |
|------|--------|------|
| **1 · One** | one portrait, **already there**, holding the centre of the exposed half, narrow 30° lens (`hero.intro: "fade"` softens it in on load; `"none"` for instant) | copy 1, fully in before the pin engages (`text.lead` vh of the approach) |
| **2 · Sphere** | the other 17 cards **bloom out of it** (angular order, staggered `expo.out`) while the lens widens 30° → **90°** and the drum tilt eases in; then it turns with the scroll | copy 1 over-exposes away while copy 2 arrives |
| **3 · Pills** | the topic pills appear **on the sphere**, among the photos — their own fibonacci shell just outside the photos', turning with the drum, passing behind it, sorted against the cards like any other object | copy 2 out, copy 3 in |

## The clock

`pin = sum(steps[].vh)` (1180vh right now) and `p` runs 0 where the first stage
pins → 1 where the held one lets go — **one continuous clock with no frozen
stretch anywhere in the middle**.

`#pinA` is `100vh + vhA`: the first 100vh is its sticky child's own height, and
its tail IS `#pinB`'s run-in — the `scroll.handoverVh` in which the held
section rises over it. `#pinB` gives that tail back out of its own share and
adds `atlas.overlapVh` on the end, which is the stretch it holds for while
`#pinC` collapses over it. So the Atlas starts rising at exactly `p = 1`.

The canvas runs on a clock of its own that **stops where its experience does**
(`sections.canvasSteps`), so the last thing it holds is the third step — but
the **spin is left live**, so the sphere never stops turning just because its
section has been covered over. `motion.spinUntil: 1` keeps the scroll spin
running to the very end of the pin.

**Every window is derived from the step heights**:

- `assembly` — `assembly.startFrac` of step **1** → `assembly.endFrac` of step
  2. It deliberately straddles the two, so "One" hands over to "Sphere" with no
  seam in the middle.
- `pills` — `pills3d.startFrac` of step 3 (0: the moment the step does), for
  `pills3d.span`
- copy *i* — in over `steps[i].textIn`, out over `steps[i].textOut`, after an
  optional `steps[i].textDelay`, with `text.overlap` letting the next start
  early. **`textOut: 0` means it never leaves** — the same convention the
  hero's beats use.

Making a step taller makes its animation longer **and** moves its copy swap
with it. `M` draws all of it: one segment per step plus the copy, assembly
(red) and pills (blue) windows, with a live indicator and a numeric HUD.

## The copy — Exposure, in place

`public/fonts/ExposureTrialVAR.woff2` (the raw TTF it was made from is in
`source-assets/fonts/`) carries **one axis, `EXPO`, −100 → +100** (read out
of its `fvar` table). The default reveal is deliberately quiet and
**strictly in place**: no rise, no blur, no travel. Each word simply moves
along the axis, from `expoFrom: 100` (over-exposed) to `expoRest: -10`, and
back to `expoTo: 100` on the way out, staggered word by word. The opacity ramp
is faster than the axis move (`fadeIn`/`fadeOut`), so a word is solid early and
only its weight keeps settling.

`text.mode` also offers `mask` (per-line clipped rise) and `fade`.

Copy is edited as one line in the panel — `|` starts a new line (so does a
real `\n` in `config.js`).

## Colour

The card shader samples an sRGB texture (which three decodes to linear) and
used to write the result straight out — every photo came back crushed and
over-contrasty. `src/lib/itemMesh.js` now ends its fragment shader with
`#include <colorspace_fragment>`, so the portraits render with their natural
colour. **This fix is worth porting back to
`projects/design-component-library/src/lib/itemMesh.js`.**

## It always comes back

Two things used to drift and never come back, so scrolling down and back up
left the opening portrait a few degrees off centre:

- the **idle drift** (`motion.autoSpin`) only ever accumulated. It is now
  applied *through* the assembly ramp and unwound whenever the piece is back
  on step 1.
- a **hand-turned sphere** kept its rotation. `motion.recenter` slerps the drag
  quaternion back to identity once you are on step 1 and not dragging.

`npm run verify` scrolls to the last step and all the way back, then asserts
the portrait lands on the exact pixel it started on.

## Turning it by hand

`motion.drag` + `motion.dragX`: horizontal drag turns it, vertical drag tumbles
it, both with momentum (`motion.momentum`, `motion.dragSense`). It is a real
quaternion applied in world space on top of the framing tilt and the scroll
spin, so there is no gimbal to fight — the sphere can be turned to any
orientation and the scroll keeps spinning it about its own axis from there.
**Reset rotation** in the Motion folder puts it back.

## Images

Whatever sits in **`src/photos/`** is what the sphere shows — drop files in,
they appear. No manifest, no build step: files are used in filename order and
the display name comes from the filename (`09-tara-brach.jpg` → "Tara Brach"),
so the numeric prefix controls both order and which card is the hero (the
equator slot, currently `09-`).

It holds 18 real Insight Timer teachers, taken from the pool harvested in
`projects/teacher-sphere/public/teachers/` (700 portraits + `teachers.json`
with names and follower counts). **Tara Brach** (the hero) and **Rick Hanson**
are the same photographs Enrico supplied. `images.source: "metalab"` switches
back to the case media the preset shipped with — that source is landscape, so
set `geometry.aspect: 1.2` / `borderRadius: 0.12` back if you do.

## Scroll style — pin or stack

`scroll.style`, first thing in the panel:

- **pin** — the stage sticks for the whole clock, then releases and the section
  below scrolls up after it.
- **stack** — the sections collapse over each other. The stage rides over the
  section above (which becomes sticky too), and the section below collapses on
  top of the *still-stuck* stage over the last `scroll.overlapVh`, with an
  optional soft edge (`scroll.stackShadow`).

The clock always spans exactly `pinVh`, measured from the config rather than
the element height, so the stack tail never distorts it.

## The panel

Lenis hijacks the wheel on the whole window, which is why the panel used to
refuse to scroll once a few folders were open. The host carries
`data-lenis-prevent` (plus a `wheel` listener that stops propagation, for the
smooth-scroll-off case), and `npm run verify` asserts it: a real trusted wheel
over the panel moves the panel and leaves `window.scrollY` alone.

### The "Wide Angle Sphere" panel is gone (2026-09-16)

His words, verbatim: *"Togli il control panel wide angle sphere che non
abbiamo più."* The big scroll panel (`P` — scroll style, steps, columns, the
video cards, the left column's glass, pills, the sphere-rebuild/camera/
motion/parallax group, the trust network, the two rings, the Atlas mark) is
no longer built or mounted — `src/panel.js` is still on disk, still correct,
just never called from `main.js`. Everything it used to expose is exactly as
live in `src/config.js` as it always was; there is simply no slider for any
of it right now. Say which of it should come back (folded into Titles or
Bowl, or as its own panel again) and it is a small job, not a rebuild.

Two panels are left, each independently docked — no shared row any more,
since two on opposite edges of the screen never needed one:

- **Titles** (`T`), on the **LEFT** (`src/titlesPanel.js`) — one place to
  reach every title on the page: the hero's own paragraph, both beats of the
  "Until now" act, act two's two statements, the ring act's own step copy,
  the evidence panel's statement and summary, the Atlas header. Every field
  points at the exact same config object the rest of the page already reads
  (a second *view*, never a second copy), split into two callbacks that are
  never conflated: **rebuild** (text or split changed — the reveal is torn
  down and re-armed) and **style** (align, size, position — a cheap re-paint
  that must never replay the block's own entrance, or dragging a slider would
  flash it through its reveal every tick).
- **Bowl · look** (`B`), on the **RIGHT** (`src/bowlPanel.js`) —
  the bowl's own material, studio, post-processing and "look at cursor" (see
  below).

### The timing fields weren't doing anything (a real bug, fixed 2026-09-16)

*"Non capisco perché non funziona il control panel per i titoli."* — and he
was right: act two's beats (`until.left/right`, `v2.top/bottom/until`) fire
once, the first time the scroll crosses their own `at` mark, through
`hero.js`'s `drive()` — a real GSAP stagger, not a value re-read every frame.
"Fires at" / "plays in (s)" / "unit → unit (s)" / "leaves at" had **no**
change handler at all in `titlesPanel.js`: dragging one correctly mutated
`cfg.v2.top.dur` (say), but nothing told the beat that had *already* fired to
fire again — so if you'd scrolled past it even once, the slider visibly did
nothing until a full page reload happened to land the scroll before its mark
again.

Fixed with a third callback, `onReplayBeats` (`() => hero.playUntil()`),
wired to exactly those four fields: it rearms whichever beats belong to the
version currently on the page, and the raf loop's next tick sees the scroll
is already past `at` and fires it again immediately, with the new numbers.
Align/size/position were never affected — they go through the existing
`style()` re-paint, which was always live.

### One shared left inset — 4vw — down the whole title chain (2026-09-16)

*"Un padding delle sezioni che allinei perfettamente i titoli."* Three
sections in a row down the page had each picked their own close-but-not-quite
left margin over the life of this project: act two's top statement and the
ring act's own step copy were both at `5vw`, while the evidence panel's title
and the team section's own CSS padding were at `4vw` — a 1vw seam right where
the reader's eye is tracking a straight line down the left edge. `v2.top.x`
and `v2.act.copyX` are now `4` to match, so the same vertical rule now runs
from act two through the ring act, the evidence panel and into the team
section without a jog anywhere in it.

Two things were missing from every title's controls before this pass, and
both are shared infrastructure now, not one-offs per block:

- **align** (left / center / right) — every positioned title reads its own
  `--align` custom property, with the exact value it already rendered with as
  the CSS fallback, so adding the control changed nothing until someone
  actually touches it.
- **chars**, alongside the existing lines / words split — `reveal.js`'s
  `buildBlock()` now wraps every LETTER of every word in its own `.was-char`
  span, always, not only when `chars` is picked: a parent's opacity/transform
  simply passes through to a plain child span it never touches, which is what
  lets a block switch into `chars` from the panel with no structural rebuild
  and no cost to every block that never uses it.

**The ring act's own step copy is a per-step keyframe now**, not one shared
position for all three (`copyX/copyY/copySize/copyWidth` are 3-element arrays,
the same "one number per step" idiom `size`/`tilt`/`dist` already used) —
`copy.js` tracks whichever step is actually the most visible one this frame
and applies THAT step's own values to the shared box, the same box every step
takes turns painting into. Step 3 ("Connecting") carries no copy of its own
any more — that line now lives once, in the evidence panel — and is cut down
to a pure transition beat (see **V2 — the ring act**, above, and **Reaching
Team without the Atlas**, below).

## Post-processing — on the BOWL, not the Atlas (`src/bowl.js`, 2026-09-16)

His correction, in his own words: *"Io chiedevo di mettere il post-processing
sulla canva del bowl, non su quella dell'Atlas."* The first pass put it on
the Atlas scene (an easy target: opaque background, its own isolated
renderer); this is the actual ask — on the bowl's own canvas, which is what
is actually on screen almost everywhere on the page.

The bowl's canvas is **transparent** over the page (`alpha: true`, cleared to
0 alpha) — every pass in the chain has to carry that channel through
untouched, which is the one real risk of post-processing a see-through layer.
`RenderPass` with no explicit clear colour/alpha of its own just reuses
whatever the renderer already has, which is already transparent; and
`UnrealBloomPass`'s bright-pass extraction naturally contributes nothing in a
fully transparent (black) region, so the bloom halo never leaks outside the
object's own silhouette. Verified by eye, not just by the numbers: the warm
paper background is still exactly itself all the way up to the bowl's edge,
in the hero, in the ring act, everywhere.

Same shape as before: `EffectComposer` (`RenderPass` → `UnrealBloomPass` → a
tiny shared vignette `ShaderPass`, `src/postfx.js`, now used by both scenes →
`OutputPass`, which re-applies tone-mapping and colour-space conversion that
an intermediate render target otherwise loses) sits behind `bowl.post` in the
Bowl panel — **off costs nothing**: `frame()` renders straight to the canvas
when `post.enabled` is false, no composer work at all, on a canvas that is
live for nearly the whole page. Deliberately subtle by default (bloom
threshold 0.82, a whisper of a vignette).

The Atlas's own post-processing code is untouched and still there — the
section is off in the current version anyway (below), so it costs nothing —
ready to matter again the moment the Atlas comes back.

## Reaching Team without the Atlas (2026-09-16)

His ask: *"vorrei non mostrare, nella versione che abbiamo attualmente,
l'Atlas, ma direttamente 'the team behind the project'."* `atlas.show` in
`src/config.js` is `false` now — the section and every number underneath it
are untouched, `#pinC` is simply `hidden`, and flipping the flag back on
undoes this completely (verified live: `npm run verify` flips it on just to
prove the section itself still works, then flips it straight back to match
the real default).

Two knock-on fixes so "off" reads as OFF, not as a held breath before nothing
happens:

- `overlapVh()` (the allowance `#pinB` used to hold, so the Atlas could rise
  smoothly over it) is now `0` whenever `atlas.show` is false — otherwise the
  evidence panel's own sticky stage would sit pinned for an extra 100vh of
  scroll with nothing left to do, which is exactly the "long empty scroll"
  problem this whole pass keeps chasing down, just relocated.
- The ring act's own third step ("Connecting") lost its copy entirely — the
  identical line was already being said twice, once here and once as
  `evidence.title` — and was cut hard, 240 → 190 → **110vh**. The readable
  part of the act now ends at step 2's "Practices that people actually live
  by"; step 3 is a pure transition (the camera swoops overhead, both rings
  converge into the bowl and vanish), and the reader's next line of text is
  the evidence panel's own "Connecting experience to evidence…", already
  there, said once.

## Notes

- The sphere is the **Wide Angle Sphere** preset (#3) out of
  `projects/design-component-library/.presets/cylinder.json`, and
  `src/lib/layout.js` + `src/lib/itemMesh.js` are vendored from that library
  (see **Colour** for the one deliberate divergence).
- Smooth scroll is **Lenis**, not Locomotive: Lenis lerps the real window
  scroll, so native `position: sticky` keeps working and the clock stays a
  plain `getBoundingClientRect()` read.
- `geometry.cornerN` gives the 3D photo cards the same squircle corner as the
  glass card: the rounded-rect SDF's corner is the Lp unit ball of the offset
  vector, so `n = 2` is the usual circle and `n = 4` is the app-icon shape.
- The bowl's dome bottom is very dark (`#1d1913`) because the studio renders it
  on a cream ground. On a white page that reads heavy at large sizes — it is
  the first thing to lift in the Studio folder if it bothers you.

## `/teach.html` — the teacher hero, with the Tower of Pisa on the left

A second page in the same project (`vite.config.js` makes it a two-input
build; dev serves it at `http://localhost:5199/teach.html`). One screen,
nothing scrolls:

- The **canvas is the whole viewport**, always. The tower is *composed* into
  the left half but never clipped by it, so a card thrown out by the parallax
  or by the focus zoom keeps drawing across the page.
- **Right** — the hero copy, set in Exposure, with the green "Become a
  teacher" pill. It sits above the canvas and keeps its own clicks; the rest
  of the canvas is the drag surface.
- The **18 `src/photos/*` teacher portraits**, the same ones the sphere uses.

The nav, the paper palette, Exposure and the type reveal are the main page's
(`src/style.css` + `src/reveal.js`), imported rather than re-implemented.

### Where the effect comes from

`src/teach/preset.js` is **"Tower of Pisa" lifted verbatim** from
[metalab-webkit](https://github.com/enricodeia/metalab-webkit) →
`.presets/cylinder.json` (the `CylinderCarousel` component — the same library
`src/lib/layout.js` and `src/lib/itemMesh.js` already come from). Don't
hand-edit it: re-export from the webkit panel and paste the new block in.

`src/teach/config.js` is the only place it is changed, and only as an
**override** on top of that object, so a fresh paste picks up cleanly:
portraits instead of the Metalab case media, a transparent background instead
of the preset's `#0c0c0c`, and the framing region below.

`src/teach/tower.js` is the React `CylinderCarousel` ported to plain three.js.
Everything the preset switches off (orbit, scroll camera, scroll reveal,
smooothy, the post-FX kit) is **absent** rather than written and disabled;
what is left is what the preset turns on — the spiral, the `tiltZ` lean,
auto-spin + drag + glide, pointer parallax, and click-to-focus.

### The framing region

`cfg.tower.region` is the rectangle the tower is **composed into** — the left
half on desktop, the whole screen under `region.breakpoint`. It is a framing
rectangle, not a clip: the canvas stays full-bleed either way. Two things
read it.

`fov` is **vertical**, so a region narrower than the canvas crops the
composition horizontally and nothing else. **`camera.fit`** dollies the camera
along its own axis until the horizontal extent at the drum matches what the
preset framed at `camera.fitAspect` — measured against the *region's* aspect,
not the canvas's. `fit: 0` gives the raw preset distance, `fit: 1` the full
correction; the page ships at `0.88`.

**`camera.setViewOffset`** then pans the frustum so the region's centre
becomes the optical centre. (`filmOffset`, which `sphere.js` uses, only skews
horizontally; the view offset does both axes, which is what `region.yPct`
needs.) The offsets move the frustum, so they are the *negative* of where the
subject should land — see the comment on `applyPlacement`. Raycasting reads
the same projection matrix, so click-to-focus keeps hitting the card under
the cursor with the frustum panned.

### Everything lives in the panel

There is no shelf across the bottom. The panel on the right is the whole
surface, top to bottom:

| folder | what is in it |
|---|---|
| **Presets** | the 19 webkit compositions in one list, your own saved ones in another, save / overwrite / delete, export + import JSON, and reset |
| **Framing region** | where the carousel is composed, desktop and mobile, plus auto-frame |
| **Camera** | position, look-at, fov, and the two tilts |
| **Shape** (rebuild) | spiral · ring · cylinder · sphere · wave, and every parameter each of them reads |
| **Cards** (rebuild) | image source, count, size, aspect, bend, segments, corner radius and corner *shape* (2 = round, 4 = squircle) |
| **Motion** | auto-spin, drag, glide, pointer parallax, click-to-focus |
| **Per-card motion** | the ticker loop each card runs on its own, staggered by index: spin, swing, flip, lean, bob, pulse |
| **Effects** | the eleven below |
| **Copy + nav** | the type, the button, the nav, the paper |

### The effects

`src/lib/itemMesh.js` already shipped a full effects chain in the card
shader — every uniform a no-op until it is switched on — and the carousel
was not using a single one of them. It is all wired now, through
`src/teach/fx.js`, which is the **one** table the panel and the renderer both
read, so the panel cannot list an effect the renderer does not apply.

Bloom · chromatic aberration (radial or lateral) · RGB split · ripple ·
liquid warp · drag streak · colour grade (brightness, contrast, saturation,
hue, tint) · vignette · grain · smooth noise · image parallax.

Four of them are driven by the pointer rather than by a slider, so they only
show themselves when you move: **ripple** and **RGB split** centre on the
cursor, **liquid** is pushed harder by pointer speed, and **drag streak**
smears along the spin and fades as the drum settles (turn `driven by drag`
off to pin it on and dial it in).

`verify:teach` probes every one: switching it on must move its uniform, and
switching it off must put the uniform back.

### Blank copy cannot wipe the page

A preset saved with the title, paragraph and button deleted took the hero
with it — and the autosave then restored that blank state on every reload,
with no way back short of clearing storage by hand. `store.js → sanitize()`
now treats blank text as "nothing was set" and puts the default back, and
**hiding a block is a `show*` toggle** in the panel, visible and reversible.
The same guard covers a zero-width framing region and a blank paper colour.

### The library — all 19 webkit presets

`npm run library` reads the webkit preset file and generates
`src/teach/library.js`: the **whole cylinder set**, four shapes (spiral ·
ring · sphere · cylinder), verbatim apart from three page decisions baked
onto each — the teacher portraits as the image source, a transparent
background instead of `#0c0c0c`, and the framing correction. `region` is
deliberately left out, so flipping through the library never moves the
composition you set up.

They are the **library** list at the top of the panel. **`[` and `]`** step
through all 19 without touching anything else — the fastest way to see the
lot. Save the current look into **Mine** to keep one.

`npm run library:shots` regenerates `public/preset-previews/*.webp` by
driving the page itself, so the thumbnails are these portraits on this paper
rather than the webkit panel's own previews (Metalab case media on black).

Two entries — *Floating Pills (Scroll)* and *Soft Spiral Mask (SCROLL
REVEAL)* — were authored around page scroll, which this page does not have.
They load and read as their non-scroll sibling; the shelf says so on hover.

The other webkit preset files (`onscroll`, `parallax`, `scrolllist`,
`sphere`, `gridbloom` — 44 more) belong to **different components** that are
not ported here. They are not in this library.

### autoFrame — why every one of them lands

Each preset was composed for a full-bleed ~16:9 canvas, and several sit
deliberately off-centre in it. Carrying that offset into a half-width region
puts the subject outside the frame — on the first pass the two Corner Decos
came out empty. `camera.autoFrame` fixes it by measuring rather than
guessing: it sweeps the drum through a **full turn** (a carousel that spins
has to be framed by its swept extent, or it fits now and pops out a second
later), projects every card as a sphere of its own half-diagonal from a
measuring camera at the base pose, and solves a `camera.zoom` + NDC shift.
Zoom, not a dolly: a dolly would change the perspective the preset was
authored with.

The solver has **two modes, because the library has two geometries**:

- **detached** — the whole sweep is comfortably in front of the lens: fit it,
  zoom and pan.
- **enclosed** — the camera is *inside* the solid. Half the library is like
  this: Spiral Loop sits at z 7.5 inside a radius-9.8 spiral, the Simple
  Rings and Corner Decos at z 7 inside a radius 9.8–11.1 ring. Being inside
  the loop **is** the composition, and "fit everything in frame" is not just
  wrong for it but undefined — cards behind the camera project to garbage and
  the measured box runs away. So it **pans only**, on the centroid of what is
  actually visible, and shrinks solely if that overflows the region. The
  preset keeps its authored scale.

`camera.autoFill` is how much of the region the result should fill.
`camera.fit` is the manual alternative and is ignored while autoFrame is on.
`npm run verify:teach` loads all 19 and asserts each one lands with its cards
inside the region.

### Nothing is lost to a reload

Vite's HMR full-reloads the page on every edit, which used to cost a whole
tuning session. It does not any more:

- **Autosave** — one `pane.on("change")` catches every binding and writes the
  live config to `localStorage` (`tch.live.v1`, debounced 350ms). It is
  restored before anything reads it, so a reload — HMR's or your own ⌘R —
  costs nothing. "Reset to the preset" clears it.
- **The preset shelf** along the bottom keeps saved alternatives
  (`tch.presets.v1`), each with a **thumbnail of the framing region** grabbed
  off the canvas, letterboxed so the whole composition is visible. Save,
  overwrite (⟳), rename (✎), delete (✕), and **Export / Import** the lot as
  JSON. Loading one mutates the live config **in place** and re-applies it —
  the page is never reloaded, so nothing in progress is lost.

The thumbnail is taken inside the ticker, in the same frame as the render
that filled the drawing buffer, which is why `preserveDrawingBuffer` stays
off. If `localStorage` fills up, the oldest thumbnails are dropped before any
config is.

```
npm run dev            # http://localhost:5199/teach.html
npm run verify:teach   # puppeteer pass → shots/teach-*.png + 47 checks
npm run library        # regenerate src/teach/library.js from the webkit file
npm run library:shots  # regenerate the shelf thumbnails from this page
```

**Drag** anywhere on the canvas · **click** a portrait to swing it front and
zoom-to-fit · **Esc** releases it · **`[` `]`** step the library ·
**P** the panel · **C** the clean frame.

The panel is the same Tweakpane furniture as the main page, docked right —
the left belongs to the carousel, and a panel over it would eat the drag.

Under the breakpoint there is no room for two columns, so the tower is
centred on the whole screen at low opacity behind the type, with a paper wash
under it. That is a stopgap, not a designed mobile layout.

## Bloom removed from the bowl's post-processing (his ask, 2026-09-17)

`UnrealBloomPass` is out of `src/bowl.js`'s composer entirely — not disabled,
removed: no import, no pass, no bright-pass render target. The chain is now
just `RenderPass` → the shared vignette `ShaderPass` (`src/postfx.js`) →
`OutputPass`. `bowl.post` in `src/config.js` keeps only `enabled` and
`vignette`; the Bowl panel's **Post-fx** folder lost its bloom/radius/
threshold/hi-res bindings and kept the other two. The probe's `post` getter
dropped `bloomStrength`/`bloomHiRes`/`bloomW` accordingly, and the two
`repro.mjs` checks that asserted bloom numbers now assert their absence
(`bloomStrength === undefined`) alongside the vignette and antialias-off
behaviour, which are unchanged. The Atlas scene's own (unused, off-by-default)
post-processing code in `src/atlas/atlas.js` / `src/panel.js` still has its
own bloom — untouched, since it is a different, inactive scene.

## Shipped default: V4, panels hidden behind `c` (his ask, 2026-09-18)

`src/config.js`'s `variant` default is `4`, not `1` — a page that has never
been touched lands on the globe. The old `localStorage` restore (`was-variant`)
is gone entirely: it would have let a stale value from earlier testing
override the new default in the one browser it mattered least (his own), so
every load now starts deterministically at V4 with no memory of the last
session.

The three Tweakpane panels (Titles, Bowl, V3/V4) are still fully there — his
correction, mid-request: *"lascami la possibilità di vedere tutti i control
panel per favore solo se schiaccio 'c'"* — nothing was deleted. What changed
is the boot state: `clean` now starts `true` instead of `false`, so
`body.is-clean` (which already hid `.was-panel` via CSS) is on from the first
frame. `c` still just flips it, same as always — the only difference is which
side of the flip is home. The per-panel keys (`v`/`b`/`t`) were moved below
the `if (clean) return` guard in the keydown handler, so they no longer punch
through the clean state on their own — `c` is the one door, exactly as asked.
The `1`–`4` quick-switch keys stay live regardless of `clean`, for fast
peeking without opening any panel.

`repro.mjs` still runs its whole existing suite against a V1 baseline —
authored that way, and reset to it with one `setVariant(1)` call right after
boot — then adds two checks of its own at the very end, off a real
`page.reload()` with nothing touched afterward: the fresh boot is on V4
(`cfg.variant === 4`, `body.is-v4`), and every `.was-panel` computes
`display: none` until `c` is simulated. 210 checks now, up from 208.

## The scroll bar reads pinA's own clock, not the combined one (his ask, 2026-09-18)

It used to ride `rawProgress` — 0 where `#pinA` starts pinning, 1 where the
LAST of all six steps ends, across both sticky sections. He asked for it to
track the first pinned module (`#pinA`, the ring act in V2/V3/V4) alone. A
second reader, `readProgressA()`, mirrors `readProgress()` exactly but scales
by `vhA()` — the vh-height of steps `0..canvasSteps`, which is always `#pinA`'s
own travel regardless of which content (ring act or canvas) is parented into
it — instead of `pinVh(cfg)`, the sum of all six. The bar's `set()` call in
the raf loop now takes `rawProgressA`.

`window.__was.scrollToA(p)` was added alongside the existing `scrollTo(p)` (the
combined-clock one) so `repro.mjs` can target pinA's own fractions directly.
Its scroll-bar section now asserts the bar is full — `value > 0.98` — right
where `scrollToA(1)` lands, while the COMBINED clock (`state.progress`) is
still under 0.9 and `state.step` is only 3 — proof this is pinA's own
percentage, not a slice cut out of the bigger one. 211 checks now.

Widening one unrelated wait paid for itself here: `ground.open`'s tween
(2.6s, `power2.out`) crossing the 0.35 threshold that flips `body.is-ground`
white, plus the player stroke's own 0.35s CSS transition on top, left the
existing `wait(700)` in the "player turns white over the shader" check
sitting right at its margin — comfortably passing before, but tipped into
sampling mid-transition (`rgb(254,254,254)` instead of a settled
`rgb(255,255,255)`) by the extra real time this pass's own new steps added
earlier in the run. Raised to `wait(1100)`; nothing about the product
changed, only how much slack the check gives the tween to settle.

### ...and then corrected: from the very top, ending before the handover

His follow-up the same day: *"l'inizio della bar scroll... che inizia
esattamente quando inizia lo scroll... dovrebbe finire prima, calcolando lo
scroll up della sezione che arriva successivamente."* `readProgressA()` now
reads 0 at `scrollY 0` — the bar starts the instant the page does, not once
it has already scrolled all the way to `#pinA` — and reaches 1 at
`pinA.offsetTop + (vhA() − gapVh())`: the last `handoverVh` of pinA's own
travel IS pinB's run-in, already rising over it (the "three sections, one
clock" note above `canvasSteps`), so counting to the full `vhA()` had the
bar reading full while the next section was visibly taking the frame.
`scrollToA()` uses the same two ends.

## V5 — two circles around the bowl (his ask, 2026-09-21)

Press `5`. It is V2 plus one delta, like V3 and V4 were: the canvas block
(`#pinB`) no longer holds the sphere/disc/globe but a four-beat diagram of
plain SVG circles — `src/circles.js`, mounted full-bleed in a new
`#circlesBox`, because it has to stay centred on the bowl, which is
dead-centre of the whole viewport, not tucked in the corner box the network
draws in. His four reference frames, in his words:

1. *"due sfere, una a destra e a sinistra della bowl, vicine tra loro che si
   toccano ma che non si intersecano"* — two circles flank the bowl, tangent
   at its centre; their captions reveal as a share of the beat, and the bowl
   behind crossfades to a **15%-opacity wireframe**.
2. *"le sfere si allontanano, creano un'area che contiene i due cerchi"* —
   they pull apart; two BIG circles close around them, their union drawn
   solid and their overlap (the lens between) dashed.
3. *"far comparire il terzo cerchio al centro"* — a third grows in the gap.
4. *"il cerchio grande che compone tutto, che deve essere il diametro della
   bowl"* — a dashed fourth, the bowl's own diameter, around all three, the
   closing title inside its top.

**Every length is a share of the bowl's own on-screen radius R**, read off the
bowl every frame (`bowl.projectedRadius()` — the rim sampled all the way
round and read as its on-screen half-width; a single point on local X swung
with the idle spin and the diagram breathed). Measured off his frames: the
base circles are 0.32R and end up centred at ±0.40R. The two big circles are
NOT a knob — `circles.js` sizes them as `R − (r + spread)`, so their union is
exactly 2R wide: **the fourth circle is tangent to it left and right by
construction** (*"assicurati che combaci con la bowl"* — asserted:
`unionHalf === R`, `|big.r − R| < 1.5px`). Type scales with R too
(a name is 0.03R, three of them sit 0.4R apart without touching).

One progress value drives it: the canvas block's own 0→1
(`(tl.p − tl.canvasS0) / (tl.canvasS1 − tl.canvasS0)`, the same span the
network's three `ev` ramps are cut from), read against four stage windows
(`s2`, `s3`, `s4` in `v2.circles`). Pure scrub: back up and it un-draws the
way it drew (asserted).

**The wireframe is a lattice, not the mesh.** `wireframe: true` on a 1.1M-
triangle Draco shell is a solid, shaded surface with extra steps, and a
million 15%-opacity lines stack to nearly opaque. `buildBowlWire()` in
`bowl.js` fits 14 rings and 24 meridians to the ACTUAL bowl's profile — for
each height band, the widest radius any vertex reaches — so it is this
bowl's silhouette, parented under `norm` to inherit its pose. The crossfade
is two opacities: shells `× (1 − mix)`, lattice `× mix × 0.15`, both still
under the pose's own opacity, the intro and the gain.

**Three things had to stop taking the bowl away in V5**, each gated on
`circlesOn()`: the ring act's exit no longer SINKS it (`A.exit`); the
"stage B fully covers" cutoff no longer hides it (`bowl.setHidden`) — V5's
stage is see-through by design (`body.is-v5 #stageB.is-solid { background:
transparent }`, and the bowl layer sits at z-index 4 under every `.was-pin`);
and `bowl.fadeAfter` no longer fades it. Instead a fifth, LAST step in the
V2 pose hook brings it back to dead-centre, upright (`bowlTilt` 14°), at
`bowlSize` and opaque, blended in across the handover into the canvas block
so it is home when beat 1 begins. `#leftB` and `#copyboxB` are `display:
none` in V5 — *"non includere i testi del titolo e del paragrafo... voglio
che sia un'esperienza pulita on scroll"*.

Panel: "V5 — the circles (four beats)" in the `V` panel — radii, spread, the
beat marks, caption timing, stroke/dash/ink, the bowl's wireframe alpha, size
and lean, and type sizes (all × R). `5` on the keyboard and the Version
dropdown.

### Reworked the same day: outro first, then the wireframe, then a path reveal

*"Miglioriamolo, non mi piace."* His notes, and what each became:

- *"lo shader scomparisse con una chiusura... l'animazione al contrario
  rispetto all'intro"* — the ring act's ground shader opens as a radius
  growing out of the bowl's centre (`uRadius = scale × open`). Its outro is
  now the same radius shrinking back INTO the bowl: `ground.setClose(k)`
  multiplies the radius by `(1 − k)`, and `k` is scrubbed by the scroll across
  the handover into pinB (ring act's end → `canvasS0`), the same span the pose
  hook brings the bowl home over. A pure function of the scroll, unlike the
  intro's tween — so it unwinds on the way up.
- *"la fine della sezione arrivi sempre con sfondo bianco"* — a white sheet
  (`--right-bg`, the pinned sections' own white) fades in with `k`. It lives
  INSIDE the bowl's fixed layer, under the canvas: above the ground (z 2),
  below the bowl, and nothing above z 4 is touched, so V5's see-through stage
  still shows the bowl on it.
- One thing had to give way for the outro to be seen at all: pinB's stage
  pins the very frame the handover begins, so the "stage B fully covers"
  cutoff was hiding the shader BEFORE its close could run — the abrupt cut
  he was reacting to. In V5 the ground's hide is gated on the outro having
  finished (`outroNow() >= 0.999`) instead. The verify now asserts the
  shader is still on screen at mid-handover, at half its radius.
- *"prima il wireframe della ball e poi l'animazione dei cerchi"* — the
  crossfade to the lattice is now the block's own first beat, alone on white;
  nothing is drawn until it is done.
- *"devono venire con una SVG path reveal... SVG lines che si intersecano
  perfettamente con la bowl"* — every shape now DRAWS ON: `pathLength="1"`
  plus `stroke-dashoffset = 1 − t`. The two base circles draw from the point
  where they touch — A from its 3 o'clock, which IS the touch point, and B
  turned half round so its start is the same point — then part company.
  The dashed shapes (the lens, the bowl-sized fourth) cannot carry a second
  dasharray, so each is revealed through a `<mask>` holding a fat solid copy
  of itself that draws on the same way. The third and fourth start from
  their tops.
- *"prima le due sfere... il terzo che arriva in seguito, però deve essere un
  continuo"* — five ABUTTING windows over the block's 0→1 (`marks.wire`,
  `.ab`, `.spread`, `.third`, then 1): wireframe → two circles → pull apart
  with the big circles → the third → the fourth. Each caption arrives over
  the last `textReveal` share of its own shape's window.

Ten V5 checks now: the swap and the see-through stage; the outro at
mid-handover (shader on screen at half radius, white at half, nothing
drawn); the block's first frame (shader gone, canvas hidden, white in, bowl
opaque); then the five beats, reading both the drive value and the DOM's own
`stroke-dashoffset` — wireframe alone; two circles drawn and touching at
0.32R with the lattice at 15%; pulled apart with the union drawn and the lens
masked; the third drawn; the fourth matching the bowl with the union tangent
to it — the un-draw on the way back up, and reversibility to 4 and to 1.
221 checks now.
