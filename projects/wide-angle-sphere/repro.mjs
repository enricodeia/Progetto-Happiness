import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const URL = process.env.URL || 'http://localhost:5199/'
const OUT = process.env.OUT || 'shots'
fs.mkdirSync(OUT, { recursive: true })

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--window-size=1500,1000', '--enable-webgl', '--use-gl=angle'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1500, height: 1000, deviceScaleFactor: 1 })

const errors = []
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + (e.stack || e.message).split('\n')[0]))
page.on('console', (m) => {
  if (m.type() === 'error' && !m.text().includes('favicon')) errors.push('CONSOLE: ' + m.text().split('\n')[0])
})
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

await page.goto(URL, { waitUntil: 'networkidle2', timeout: 45000 })
await page.waitForFunction('window.__was && window.__was.state.sphereCards > 0', { timeout: 20000 })
// The shipped default is V4 now (his ask, 2026-09-18) — the rest of this
// suite was authored against the V1 baseline, so it is set explicitly here;
// the real, untouched boot default is asserted separately, near the end,
// off a `page.reload()`.
await page.evaluate(() => window.__was.setVariant(1))
await page.evaluate(() => { window.__was.bowlPanel.hide(); window.__was.titlesPanel.hide() })
// C — the clean frame. The cards sit under the panel, so nothing can be
// hovered until it is gone.
await page.evaluate(() => window.__was.setClean(true))
const cleanState = await page.evaluate(() => ({
  clean: window.__was.state.clean,
  panels: [...document.querySelectorAll('.was-panel')].every((e) => getComputedStyle(e).display === 'none'),
  markers: getComputedStyle(document.querySelector('.was-debug')).display === 'none',
  legend: getComputedStyle(document.querySelector('.was-legend')).display === 'none',
}))
const glassOk = await page.evaluate(() => {
  const f = document.querySelector('.was-card-frost')
  return {
    supported: window.__was.left.refract.supported,
    filter: f.style.backdropFilter,
    svg: !!f.querySelector('.was-glass-defs filter feDisplacementMap'),
    channels: [...f.querySelectorAll('feDisplacementMap')].map((d) => +d.getAttribute('scale')),
  }
})
await page.waitForFunction('window.__was.state.bowl.ready', { timeout: 20000 })

const boot = await page.evaluate(() => window.__was.state)
const innerWidthPx = await page.evaluate(() => innerWidth)

// ── the player (bottom-left) and the scroll bar — in place of the old fanned
//    deck of video cards (his ask, 2026-09-17) ───────────────────────────────
await wait(2600)
const playerBoot = await page.evaluate(() => window.__was.player.probe())
const heroPara = await page.evaluate(() => {
  const r = document.querySelector('.was-hero-para').getBoundingClientRect()
  return { left: Math.round(r.left), bottomGap: Math.round(innerHeight - r.bottom) }
})
const innerHeightPx = await page.evaluate(() => window.innerHeight)
const deckGone = await page.evaluate(() => document.querySelectorAll('.was-swap, .was-swap-stack').length)
// hover the bar — the WHOLE bar lifts, not only the button
const playerPoint = await page.evaluate(() => {
  const r = document.querySelector('.was-player').getBoundingClientRect()
  return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }
})
await page.screenshot({ path: `${OUT}/00a-player.png` })
// no audio in src/media yet: the label SAYS so, and — `player.fake` on, his
// own ask — the button still drives the equaliser from noise: a click starts
// the fake track (the pills spread out from the centre line), another stops it
await page.evaluate(() => document.querySelector('.was-player-btn').click())
await wait(900)
const playerAfterClick = await page.evaluate(() => window.__was.player.probe())
await page.evaluate(() => document.querySelector('.was-player-btn').click())
await wait(800)
const playerAfterPause = await page.evaluate(() => window.__was.player.probe())
// the equaliser can be switched OFF from the panel — and then the name is the
// only thing left in a column sized by the photo, so it has to CENTRE on it
// instead of floating to the top of the space the two used to share
const playerNoWave = await page.evaluate(async () => {
  const pause = (ms) => new Promise((r) => setTimeout(r, ms))
  const mid = (sel) => {
    const r = document.querySelector(sel).getBoundingClientRect()
    return r.top + r.height / 2
  }
  const off = () => +(mid('.was-player-text') - mid('.was-player-photo')).toFixed(1)
  const before = off()
  window.__was.cfg.player.wave.on = false
  window.__was.player.style()
  await pause(150)
  const hidden = { off: off(), cls: document.querySelector('.was-player').classList.contains('is-nowave') }
  window.__was.cfg.player.wave.on = true
  window.__was.player.style()
  await pause(150)
  return { before, hidden, after: off() }
})
// ── the bar closes as you read DOWN and opens coming back UP, hovering
//    always opens it, and leaving puts it back exactly where the scroll had
//    it (his ask, 2026-09-17, in place of the hover lift he didn't want) ────
const colRead = () => page.evaluate(() => {
  const c = window.__was.player.probe().collapse
  return {
    v: c.v, w: c.width, chars: c.chars, lit: c.charAlphas.filter((a) => a > 0.5).length,
    radii: c.radii, btnMid: c.btnMid, capMid: c.capMid,
    transform: getComputedStyle(document.querySelector('.was-player')).transform,
  }
})
const pCol = { rest: await colRead(), open: await colRead() }
await page.evaluate(() => window.__was.scrollToUntil(0.25))
await wait(1200)
pCol.closed = await colRead()
await page.mouse.move(playerPoint.x, playerPoint.y)
await wait(900)
pCol.hoverOpen = await colRead()
await page.mouse.move(1400, 200)
await wait(900)
pCol.afterLeave = await colRead()
await page.evaluate(() => window.__was.scrollToUntil(0))
await wait(1200)
pCol.reopened = await colRead()
// ...and back to the top, so everything after this starts where it expects to
await page.evaluate(() => { window.__was.scrollTo(0); window.scrollTo(0, 0) })
await wait(900)

// the scroll bar: invisible before the pinned clock, half-full at its middle,
// gone again once it is over
const barTop = await page.evaluate(() => window.__was.scrollBar.probe())
await page.evaluate(() => window.__was.scrollTo(0.5))
await wait(400)
const barMid = await page.evaluate(() => window.__was.scrollBar.probe())
await page.evaluate(() => window.__was.scrollTo(1))
// `fadeOut` is a share of a ~1180vh clock (0.03 ≈ 35vh), so a full viewport
// past the end is comfortably beyond it
await page.evaluate(() => window.scrollBy(0, innerHeight * 1.0))
await wait(400)
const barAfter = await page.evaluate(() => window.__was.scrollBar.probe())

// ── the ring act's own background — one colour per step, the falling
//    parallax, and the bowl sinking as the rings go (his ask, 2026-09-17) ───
await page.evaluate(() => window.__was.setVariant(2))
await wait(300)
// the pan is ALREADY moving in act two, from the moment the ground opens
// (his ask, 2026-09-17: "la prima sezione inizi da subito a scendere")
await page.evaluate(() => window.__was.scrollToUntil(0.5))
await wait(700)
const panEarly = await page.evaluate(() => window.__was.ground.probe())
// ...and with the shader under it the player's whole UI — its OUTLINE with it
// (his ask, 2026-09-17) — is white instead of black
const playerOnGround = await page.evaluate(() => ({
  isGround: document.body.classList.contains('is-ground'),
  stroke: window.__was.player.probe().stroke,
}))
await page.evaluate(() => window.__was.scrollToUntil(0.95))
await wait(700)
const panLate = await page.evaluate(() => window.__was.ground.probe())
// the rings feel the scroll's "force": a fling pushes their turn, and scrolling
// back above a ring's own mark plays its bloom BACKWARDS, last card out first
const ringForce = await page.evaluate(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms))
  window.__was.scrollToStep(0, 0.6)
  await wait(900)
  const still = window.__was.rings[0].boost
  const vStill = window.__was.state.v2.scrollVel
  window.scrollBy(0, 700)
  await wait(60)
  const moving = window.__was.rings[0].boost
  const vMoving = window.__was.state.v2.scrollVel
  await wait(900)
  const settled = window.__was.rings[0].boost
  // now back ABOVE ring a's own mark: it should be leaving through a stagger,
  // not gone in a snap — alpha still > 0 a beat later, 0 once the tween is done
  window.__was.scrollToStep(0, 0.5)
  await wait(600)
  const aBefore = window.__was.rings[0].alpha
  window.__was.scrollToStep(0, 0.02)
  // mid-stagger: the LAST card leaves first (`from: "end"`), so the ring's
  // MAX alpha stays 1 for a while — the proof of a stagger is the SPREAD
  // across the cards: some already gone, some still fully there
  await wait(700)
  const mid = window.__was.rings[0].probe().map((c) => c.a)
  const leavingMax = Math.max(...mid), leavingMin = Math.min(...mid)
  await wait(2400)
  const aGone = window.__was.rings[0].alpha
  return { still, vStill, moving, vMoving, settled, aBefore, leavingMax, leavingMin, aGone }
})
console.log('ring force / reverse:', ringForce)
// ...and it NEVER stands still (his ask: "non voglio che si fermi mai"): 13
// samples from the ground's opening to the frame before pinB covers, every
// one strictly lower than the last — the run-in above the act and the
// hand-over included, the two seams where the first cut used to pause
const panRun = await page.evaluate(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms))
  const u = document.getElementById('until'), b = document.getElementById('pinB')
  const gAt = window.__was.cfg.v2.ground.at
  const y0 = u.offsetTop + gAt * (u.offsetHeight - innerHeight) + 30
  const y1 = b.offsetTop - 30
  const out = []
  for (let i = 0; i <= 12; i++) {
    window.scrollTo(0, y0 + ((y1 - y0) * i) / 12)
    await wait(350)
    out.push(+window.__was.ground.probe().pan.toFixed(4))
  }
  return out
})
console.log('pan, dall\'apertura alla copertura:', panRun)
const searchGlass = await page.evaluate(() => {
  const s = getComputedStyle(document.querySelector('.was-search'))
  return { bg: s.backgroundColor, backdrop: s.backdropFilter || s.webkitBackdropFilter || '' }
})
const actBgAt = async (step, f) => {
  await page.evaluate((s, ff) => window.__was.scrollToStep(s, ff), step, f)
  await wait(700)
  return page.evaluate(() => ({
    colorA: window.__was.ground.probe().colorA,
    pan: window.__was.ground.probe().pan,
    room: window.__was.ground.probe().room,
    zoom: window.__was.ground.probe().zoom,
    bowlY: window.__was.state.bowl.y,
    actP: window.__was.state.v2.actP,
    step: window.__was.state.v2.actStep,
  }))
}
const actBg0 = await actBgAt(0, 0.4)
const actBg1 = await actBgAt(1, 0.4)
const actBg2 = await actBgAt(2, 0.3)
const actBgEnd = await actBgAt(2, 0.97)
// ...and INTO the hand-over: the sink must still be going — sampled just
// before `#pinB`'s stage covers (it rises `earlyRiseVh` sooner now, so the
// cover lands a few vh into step 4 rather than a whole viewport in)
const actBgThrough = await actBgAt(3, 0.03)
// the three-step section is already rising over the act's last stretch, and
// the player has gone WHITE over the shader
const earlyRise = await page.evaluate(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms))
  window.__was.scrollToStep(2, 0.95)
  await wait(500)
  const b = document.getElementById('pinB').getBoundingClientRect()
  const p = getComputedStyle(document.querySelector('.was-player'))
  const btn = getComputedStyle(document.querySelector('.was-player-btn'))
  return {
    pinBTop: Math.round(b.top), vh: innerHeight,
    early: window.__was.state.v2.earlyRiseVh,
    bowlOpacity: window.__was.state.bowl.opacity,
    ground: document.body.classList.contains('is-ground'),
    playerColor: p.color, playerBg: p.backgroundColor, btnBg: btn.backgroundColor,
  }
})
const ACT_BG = await page.evaluate(() => JSON.parse(JSON.stringify(window.__was.cfg.v2.act.bg)))
await page.evaluate(() => { window.__was.setVariant(1); window.__was.scrollTo(0); window.scrollTo(0, 0) })
await wait(600)
console.log('player:', { source: playerBoot.hasSource, label: playerBoot.label, deckGone: deckGone === 0 })
console.log('scroll bar:', { top: barTop.alpha, mid: barMid.value, midAlpha: barMid.alpha, after: barAfter.alpha })
console.log('act bg:', { s0: actBg0.colorA, s1: actBg1.colorA, s2: actBg2.colorA,
                         pan: [actBg0.pan, actBg1.pan, actBg2.pan], zoom: actBg0.zoom,
                         bowlY: [actBg1.bowlY, actBgEnd.bowlY, actBgThrough.bowlY] })
const mat = await page.evaluate(() => window.__was.cfg.bowl.material)
const CONFIG_COUNT = await page.evaluate(() => window.__was.cfg.pills3d.count)
const CFG_PILL_START = await page.evaluate(() => window.__was.cfg.pills3d.startFrac)
const CONFIG_EXPO_REST = await page.evaluate(() => window.__was.cfg.text.expoRest)
const HERO_CFG = await page.evaluate(() => window.__was.cfg.hero)
const FOOT_CFG = await page.evaluate(() => window.__was.cfg.footer)
const NET_CFG = await page.evaluate(() => {
  const n = window.__was.cfg.v2.network
  return { field: n.fieldCount, people: n.peopleCount, teacher: n.teacherCount, technique: n.techniqueCount,
    dotUser: n.dotUser, dotTeacher: n.dotTeacher, dotField: n.dotField }
})
const CANVAS_BOX = await page.evaluate(() => window.__was.cfg.v2.canvasBox)
const RING_MIN_RADIUS = await page.evaluate(() => window.__was.cfg.v2.rings.a.minRadius)
const RING_CFG = await page.evaluate(() => JSON.parse(JSON.stringify(window.__was.cfg.v2.rings)))
const ATLAS_CFG = await page.evaluate(() => window.__was.cfg.atlas)
// Everything the mark IS comes from the preset he exported from the studio.
const preset = await page.evaluate(() => window.__was.atlasState)
// The relief is sampled in object space but normalised against view-space
// derivatives, so the object's own scale has to be put back or a small bowl
// gets a relief 1/k too strong. Check the correction is actually compiled in.
const reliefShader = await page.evaluate(() => {
  const sh = window.__was.bowl.shells.A
  const src = sh.mat.userData.shader?.fragmentShader || ''
  return {
    hasScale: /uReliefGain \* k \* lod/.test(src),
    hasVarying: /varying float vBsScale/.test(src),
    aa: sh.mat.userData.u.uReliefAA.value,
  }
})
console.log('rilievo:', reliefShader)
const CONFIG_PIN_SIZE = await page.evaluate(() => window.__was.cfg.bowl.poses.pin.size)
const bowlModel = await page.evaluate(() => {
  const b = window.__was.bowl
  const M = window.__was.cfg.bowl
  const shells = Object.keys(b.shells)
  const tri = (s) => {
    const g = b.shells[s].mesh.geometry
    return (g.index ? g.index.count : g.getAttribute('position').count) / 3
  }
  // the two halves share one vertex buffer and differ only by index
  const shared = shells.length === 2 &&
    b.shells.A.mesh.geometry.getAttribute('position') ===
    b.shells.B.mesh.geometry.getAttribute('position')
  return {
    source: M.model.source,
    shells,
    names: shells.map((s) => b.shells[s].name),
    tris: shells.reduce((t, s) => t + tri(s), 0),
    split: shells.map(tri),
    shared,
    relief: M.material.A.reliefNoise,
    reliefSource: M.material.A.relief.source,
    reliefMap: b.reliefInfo('A'),
    // what the material actually has bound
    bound: {
      normalMap: !!b.shells.A.mat.normalMap,
      bumpMap: !!b.shells.A.mat.bumpMap,
      normalScale: b.shells.A.mat.normalMap ? +b.shells.A.mat.normalScale.x.toFixed(3) : 0,
      tiling: b.shells.A.mat.normalMap ? +b.shells.A.mat.normalMap.repeat.x.toFixed(2) : 0,
      procedural: b.shells.A.mat.userData.u.uReliefOn.value,
    },
    innerRamp: M.material.B.colorNoise.enabled && M.material.B.ramp.mix > 0 &&
               M.material.B.rampNoise.type === 'Gaseous' && M.material.B.relief.enabled === false,
    reliefOn: M.material.A.relief.enabled,
    hdr: b.hdr.state,
    // the environment lights the 3D and nothing else
    noBackground: b.scene ? b.scene.background === null : true,
  }
})
console.log('la bowl:', bowlModel)

// ...and any image can take the built-in map's place. It classifies itself:
// blue-dominant is a normal map, anything else a height map.
const upload = await page.evaluate(async () => {
  const res = await fetch('/images/bowl.png')
  const file = new File([await res.blob()], 'bowl.png', { type: 'image/png' })
  const out = await window.__was.bowl.loadReliefImage('A', file)
  const m = window.__was.bowl.shells.A.mat
  const after = { ...out, bump: !!m.bumpMap, normal: !!m.normalMap, info: window.__was.bowl.reliefInfo('A') }
  window.__was.bowl.clearReliefImage('A')
  return { after, back: window.__was.bowl.reliefInfo('A') }
})
console.log('immagine caricata:', upload)
const BOWL_FALL_EASE = await page.evaluate(() => window.__was.cfg.bowl.fallEase)
boot.cornerN = await page.evaluate(() => window.__was.cfg.geometry.cornerN)
console.log('boot:', {
  cards: boot.cards, photos: boot.photos, pills: boot.pills, heroIdx: boot.heroIdx,
  pinVh: boot.pinVh, style: boot.scrollStyle,
  canvas: Math.round(boot.canvasWidth), panel: Math.round(boot.leftWidth),
})

// ── the opening act: one line with the bowl in the middle of it ─────────
await page.evaluate(() => scrollTo(0, 0))
await page.evaluate(() => window.__was.playHero())
await wait(3200)
const heroState = await page.evaluate(() => window.__was.state)
const introDom = await page.evaluate(() => {
  const el = document.querySelector('.was-hero-half.is-a')
  const inners = [...el.querySelectorAll('.was-word-in')]
  return {
    isIntro: el.classList.contains('is-intro'),
    words: el.querySelectorAll('.was-word').length,
    inners: inners.length,
    rise: window.__was.cfg.intro.rise,
    inPlace: inners.every((w) => /translate3d\(0px,\s*-?0(\.0+)?%/.test(w.style.transform || 'translate3d(0px, 0%, 0px)')),
  }
})
// the bowl sits IN the line, and the two halves are placed SYMMETRICALLY
// around it however long each piece of lettering is
const heroLine = await page.evaluate(() => {
  const a = document.querySelector('.was-hero-half.is-a').getBoundingClientRect()
  const b = document.querySelector('.was-hero-half.is-b').getBoundingClientRect()
  const bowl = window.__was.state.bowl.at
  return {
    a: { left: Math.round(a.left), right: Math.round(a.right), w: Math.round(a.width) },
    b: { left: Math.round(b.left), right: Math.round(b.right), w: Math.round(b.width) },
    bowlX: Math.round(bowl.x), bowlY: Math.round(bowl.y),
    mid: Math.round((a.top + a.bottom) / 2),
    oneLine: Math.round(a.top) === Math.round(b.top),
    aTop: Math.round(a.top), bTop: Math.round(b.top),
    aLines: document.querySelectorAll('.was-hero-half.is-a .was-line').length,
    bLines: document.querySelectorAll('.was-hero-half.is-b .was-line').length,
    aText: document.querySelector('.was-hero-half.is-a').textContent.trim(),
    bText: document.querySelector('.was-hero-half.is-b').textContent.trim(),
    // the air on each side of the bowl — equal by construction, even though
    // the two halves are a hundred pixels apart in width
    gapL: Math.round(bowl.x - a.right),
    gapR: Math.round(b.left - bowl.x),
    uneven: Math.abs(a.width - b.width) > 40,
  }
})

// ...and the whole opening is ONE GSAP timeline, scrubbed here rather than
// waited on: We · Guide · the bowl · You · Through, each one starting while
// the one before it is still arriving.
const seq = await page.evaluate(() => {
  const h = window.__was.hero
  const op = (e) => +(+e.style.opacity || 0).toFixed(2)
  const read = () => ({
    we: [...document.querySelectorAll('.was-hero-half.is-a .was-word')].map(op),
    you: [...document.querySelectorAll('.was-hero-half.is-b .was-word')].map(op),
    bowl: +window.__was.bowl.state.intro.v.toFixed(2),
  })
  const out = { dur: h.introDur, at: {} }
  for (const t of [0, 0.3, 0.9, 1.2, 1.5, 2.1, 2.6, 3.0, h.introDur]) {
    h.seek(t)
    out.at[t] = read()
  }
  h.seek(h.introDur)
  return out
})
console.log('la timeline di apertura:', seq.dur + 's', seq.at)
// put it back where it belongs before anything else is measured
await page.evaluate(() => window.__was.playHero())
await wait(4200)
await page.screenshot({ path: `${OUT}/00-hero.png` })
console.log('hero @0:', heroState.hero, 'bowl:', heroState.bowl)
console.log('la riga:', heroLine)

// ...and it is still there further down: it must not vanish into nothing —
// but the two halves DO slide apart
await page.evaluate(() => scrollTo(0, innerHeight * 0.6))
await wait(1600)
// half way through the hero, the RIGHT half is still behind the left one:
// that lag IS the "sfasarsi sulla X" he asked for
const heroPhase = await page.evaluate((base) => {
  const a = document.querySelector('.was-hero-half.is-a').getBoundingClientRect()
  const b = document.querySelector('.was-hero-half.is-b').getBoundingClientRect()
  const px = innerWidth / 100
  const L = Math.round(base.aLeft - a.left)
  const R = Math.round(b.left - base.bLeft)
  return {
    leftMoved: L, rightMoved: R,
    leftFrac: +(L / (base.drift * px)).toFixed(3),
    rightFrac: +(R / (base.driftRight * px)).toFixed(3),
  }
}, { aLeft: heroLine.a.left, bLeft: heroLine.b.left,
     drift: HERO_CFG.drift, driftRight: HERO_CFG.driftRight })
console.log('lo sfasamento:', heroPhase)
const heroScrolled = await page.evaluate(() => window.__was.state)
await page.screenshot({ path: `${OUT}/00-hero-drift.png` })
console.log('hero @0.6:', heroScrolled.hero, 'heroQ', heroScrolled.heroQ)
// ...and close again on the way back up
await page.evaluate(() => scrollTo(0, 0))
await wait(1200)
const heroBack = await page.evaluate(() => window.__was.state.hero)
console.log('hero, tornando su:', heroBack)

// ── act two: 200vh of sticky, two beats that alternate across the bowl ──
// beat 1 — the long one, on the left, revealed LINE by line
await page.evaluate(() => {
  const u = document.getElementById('until')
  scrollTo(0, u.offsetTop + (u.offsetHeight - innerHeight) * 0.25)
})
await wait(3000)
const beat1 = await page.evaluate(() => window.__was.state)
await page.screenshot({ path: `${OUT}/00b-act2-left.png` })
console.log('beat 1:', beat1.hero, 'q=', beat1.untilQ, 'bowl:', beat1.bowl)

// beat 2 — "Until now" joins it on the right; the first one STAYS
await page.evaluate(() => {
  const u = document.getElementById('until')
  scrollTo(0, u.offsetTop + (u.offsetHeight - innerHeight) * 0.78)
})
await wait(3000)
const untilState = await page.evaluate(() => window.__was.state)
await page.screenshot({ path: `${OUT}/00c-act2-right.png` })
console.log('beat 2:', untilState.hero, 'q=', untilState.untilQ, 'bowl:', untilState.bowl)

const beatBox = await page.evaluate(() => {
  const l = document.querySelector('.was-until-left')
  const r = document.querySelector('.was-until-text')
  const lb = l.getBoundingClientRect()
  const rb = r.getBoundingClientRect()
  return {
    leftSide: lb.left < innerWidth * 0.3,
    rightSide: rb.right > innerWidth * 0.7,
    // level, not a diagonal: the eye reads straight across the bowl
    level: Math.abs((lb.top + lb.bottom) / 2 - (rb.top + rb.bottom) / 2) < 60,
    bowlBetween: (() => {
      const x = window.__was.state.bowl.at.x
      return x > lb.right && x < rb.left
    })(),
    sticky: getComputedStyle(document.querySelector('.was-until-stage')).position,
    // the long one is clipped line by line, the short one is words in place
    leftLines: l.classList.contains('is-lines') && l.querySelectorAll('.was-line').length >= 3 &&
               getComputedStyle(l.querySelector('.was-line')).overflow === 'hidden',
    rightWords: !r.classList.contains('is-lines') && r.querySelectorAll('.was-word').length === 2,
  }
})
console.log('act 2 layout:', beatBox)

// ...and each beat FIRES as a real stagger: sampled a moment after its mark,
// its lines are at different points of their own travel
await page.evaluate(() => {
  const u = document.getElementById('until')
  scrollTo(0, u.offsetTop + (u.offsetHeight - innerHeight) * 0.9)
})
await wait(2600)
await page.evaluate(() => window.__was.playUntil())
await page.evaluate(() => {
  const u = document.getElementById('until')
  scrollTo(0, u.offsetTop + (u.offsetHeight - innerHeight) * 0.9)
})
await wait(430)
const a2Stagger = await page.evaluate(() => ({
  lines: [...document.querySelectorAll('.was-until-left .was-line-in')].map(
    (e) => +(e.style.transform.match(/,\s*(-?[\d.]+)%/)?.[1] ?? 0)
  ),
  words: [...document.querySelectorAll('.was-until-text .was-word')].map(
    (e) => +(+e.style.opacity || 0).toFixed(2)
  ),
}))
console.log('lo stagger di atto 2:', a2Stagger)
await wait(2600)

// the bowl shrinks and centres on the way to the pinned section
await page.evaluate(() => {
  const pin = document.getElementById('pinA')
  scrollTo(0, pin.offsetTop * 0.88)
})
await wait(1200)
const bowlMid = await page.evaluate(() => window.__was.state)
await page.screenshot({ path: `${OUT}/00c-bowl-shrink.png` })
console.log('bowl a 0.88:', bowlMid.bowl, 'q=', bowlMid.bowlQ.toFixed(3))

// ...and arrives dead centre exactly where the pinned section engages
await page.evaluate(() => {
  const pin = document.getElementById('pinA')
  scrollTo(0, pin.offsetTop - 2)
})
await wait(1400)
const bowlHand = await page.evaluate(() => window.__was.state)
await page.screenshot({ path: `${OUT}/00d-bowl-handover.png` })
console.log('bowl alla consegna:', bowlHand.bowl, 'q=', bowlHand.bowlQ.toFixed(3))

const steps = await page.evaluate(() => window.__was.cfg.steps.map((s) => s.vh))
const total = steps.reduce((a, b) => a + b, 0)
const at = (i, f) => (steps.slice(0, i).reduce((a, b) => a + b, 0) + steps[i] * f) / total

const shot = async (p, name) => {
  await page.evaluate((v) => window.__was.scrollTo(v), p)
  await wait(950)
  const s = await page.evaluate(() => window.__was.state)
  await page.screenshot({ path: `${OUT}/${name}.png` })
  console.log(
    `p=${p.toFixed(3)} ${name.padEnd(18)} step=${s.step + 1} asm=${s.asm.toFixed(2)} ` +
    `pill=${s.pill.toFixed(2)} panel=${Math.round(s.leftWidth)} ` +
    `copy=[${s.copyAlpha.join(',')}] img=[${s.left.alphas.join(',')}] bowl=${s.bowl.opacity.toFixed(2)}`
  )
  return s
}

// step 1 — the portrait is simply there, centred in the exposed half
await page.evaluate(() => window.__was.scrollTo(0))
await wait(1600)
const s0 = await page.evaluate(() => window.__was.state)
await page.screenshot({ path: `${OUT}/01-step1.png` })
console.log(`p=0.000 01-step1           intro=${s0.intro.toFixed(2)} asm=${s0.asm.toFixed(2)} copy=[${s0.copyAlpha.join(',')}]`)

const c0 = s0.heroAt
console.log('ritratto sullo schermo:', {
  x: Math.round(c0.x), wantX: Math.round(c0.wantX),
  y: Math.round(c0.y), wantY: Math.round(c0.wantY),
  w: Math.round(s0.left.card.w), h: Math.round(s0.left.card.h),
})

const expoOk = await page.evaluate(() => {
  // scope it to the pinned copy — the hero line has .was-word spans too
  const sel = window.__was.cfg.text.mode === 'mask' ? '.was-copy .was-line-in' : '.was-copy .was-word'
  const w = document.querySelector(sel)
  return { sel, fvs: w?.style.fontVariationSettings || '', family: getComputedStyle(w).fontFamily,
           size: Math.round(parseFloat(getComputedStyle(w).fontSize)),
           transform: w?.style.transform || '', filter: w?.style.filter || '' }
})
console.log('copy:', expoOk)

// ── the bowl grows and comes back down without a corner in it ──────────
// Sample its size right across the opening act: where the arc turns over, the
// step it takes must be a fraction of the biggest step it ever takes. With an
// expo on the way down it leaves the top at full speed, which is the snap.
const bowlTurn = await (async () => {
  const N = 24
  const sizes = []
  for (let i = 0; i <= N; i++) {
    await page.evaluate((f) => {
      const a = document.getElementById('pinA')
      scrollTo(0, a.offsetTop * f)
    }, i / N)
    await wait(90)
    sizes.push(await page.evaluate(() => window.__was.state.bowl.size))
  }
  const peak = Math.max(...sizes)
  let peakEnd = 0
  for (let i = sizes.length - 1; i >= 0; i--) if (sizes[i] >= peak * 0.995) { peakEnd = i; break }
  const d = sizes.slice(1).map((v, i) => Math.abs(v - sizes[i]))
  const vMax = Math.max(...d)
  const v1 = peakEnd < d.length ? d[peakEnd] : 0
  return { peak: +peak.toFixed(3), v1: +v1.toFixed(4), vMax: +vMax.toFixed(4),
           ratio: +(v1 / Math.max(1e-6, vMax)).toFixed(3) }
})()
console.log('curva della bowl:', bowlTurn)

const sStep1 = await shot(at(0, 0.55), '01b-step1-image')
const sHand = await shot(at(0, 0.96), '02-handover')
const sAsm = await shot(at(1, 0.3), '03-assembling')
const sMid2 = await shot(at(1, 0.6), '03b-step2-image')
const sSphere = await shot(at(1, 0.85), '04-sphere')
const sPills = await shot(at(2, 0.7), '05-pills-in-sphere')
// the very end of the canvas experience — where the bowl's journey must finish
const sEndA = await shot(at(2, 0.999), '05e-end-of-act-one')
// ...and the held section that carries the rest of the same clock
const sHeld1 = await shot(at(3, 0.92), '05f-evidence-1')
// ...the panel's own layout, measured WHILE it is the thing on screen — his
// own reference (2026-09-15): the statement at the TOP, the three steps a
// HORIZONTAL row under it, and the summary at the BOTTOM, all sharing one
// left margin.
const evLayout = await page.evaluate(() => {
  const t = document.querySelector('.was-ev-title').getBoundingClientRect()
  const nav = document.querySelector('.was-nav').getBoundingClientRect()
  const rows = [...document.querySelectorAll('.was-ev-row')].map((r) => r.getBoundingClientRect())
  const summary = document.querySelector('.was-ev-summary').getBoundingClientRect()
  const rails = [...document.querySelectorAll('.was-ev-rail')]
    .map((r) => r.getBoundingClientRect())
    .filter((b) => b.width > 0)
  return {
    inB: document.getElementById('leftB').contains(document.querySelector('.was-ev-title')),
    clearsNav: t.top >= nav.bottom - 2,
    titleTop: Math.round(t.top),
    // a ROW now: all three at the same height, left → right in reading order
    rowed: rows.length === 3 && rows[0].top > t.bottom &&
      Math.abs(rows[1].top - rows[0].top) < 4 && Math.abs(rows[2].top - rows[0].top) < 4 &&
      rows[1].left > rows[0].left + 60 && rows[2].left > rows[1].left + 60,
    rails: rails.length === 3 && rails.every((b) => b.width > b.height * 15 && b.width > 60),
    rows: rows.map((r) => Math.round(r.left)),
    // the whole column — statement, steps AND the summary — in the LEFT half
    titleLeft: t.right < innerWidth * 0.5,
    rowsLeft: rows.every((r) => r.left < innerWidth * 0.5),
    summaryBottomLeft: summary.left < innerWidth * 0.5 && summary.bottom > innerHeight * 0.75 &&
      summary.top > rows[0].bottom + 60,
    // ...and none of the three sits on the bowl, which holds the exact centre
    clearOfBowl: (() => {
      const at = window.__was.state.bowl.at
      const half = (window.__was.state.bowl.size * innerHeight) / 2
      return [...document.querySelectorAll('.was-ev-row, .was-ev-title, .was-ev-summary')].every((e) => {
        const r = e.getBoundingClientRect()
        return r.left > at.x + half || r.right < at.x - half
      })
    })(),
  }
})
console.log('il pannello evidenze:', evLayout)
const evFire = await (async () => {
  // the STATEMENT is already there the instant the section exists — not
  // scrolled into being — so it is read BEFORE the section has even arrived
  const titleEarly = await page.evaluate(() => window.__was.state.left.ev.title)
  const mark = await page.evaluate(() => window.__was.state.left.ev) // warm
  await page.evaluate(() => window.__was.scrollTo(0.5))
  await wait(700)
  const before = await page.evaluate(() => window.__was.state.left.ev.summary)
  await page.evaluate(() => window.__was.scrollTo(0.56))
  await wait(300)
  const mid = await page.evaluate(() => window.__was.state.left.ev)
  await wait(2000)
  const after = await page.evaluate(() => window.__was.state.left.ev.summary)
  const titleLate = await page.evaluate(() => window.__was.state.left.ev.title)
  return { titleEarly, titleLate, before, mid: mid.summary, lines: mid.summaryA, after }
})()
console.log('il titolone è già lì, il riassunto si accende:', evFire)
const sHeld2 = await shot(at(4, 0.85), '05g-evidence-2')
const sHeld3 = await shot(at(5, 0.9), '05h-evidence-3')

// ── the section ARRIVES FROM BELOW: the canvas rides up inside its stage
const arrive = []
for (const f of [0.75, 0.5, 0.25, 0]) {
  await page.evaluate((v) => {
    const a = document.getElementById('pinA')
    scrollTo(0, a.offsetTop - innerHeight * v)
  }, f)
  await wait(600)
  arrive.push(await page.evaluate(() => {
    const a = document.getElementById('pinA').getBoundingClientRect()
    const c = document.getElementById('canvasLayer').getBoundingClientRect()
    const l = document.getElementById('leftA').getBoundingClientRect()
    return { section: Math.round(a.top), canvas: Math.round(c.top), col: Math.round(l.top) }
  }))
}
await page.screenshot({ path: `${OUT}/05c-arriving.png` })
console.log('arriva da sotto:', arrive)

// ── the bowl's last frame: the section after it COVERS it ──────────────
// It is not faded out. The held section sits above the bowl's own layer and
// rises over it, so the last thing anyone sees of the bowl is the last frame
// of the canvas section — and scrolling back up uncovers it in place.
const cover = await (async () => {
  const z = await page.evaluate(() => ({
    bowl: +getComputedStyle(document.querySelector('.was-bowl-layer')).zIndex,
    held: +getComputedStyle(document.getElementById('pinB')).zIndex,
    atlas: +getComputedStyle(document.getElementById('pinC')).zIndex,
    canvas: +getComputedStyle(document.getElementById('pinA')).zIndex,
  }))
  const during = []
  for (const f of [0.15, 0.4, 0.7]) {
    await page.evaluate((v) => {
      const a = document.getElementById('pinA')
      const b = document.getElementById('pinB')
      scrollTo(0, b.offsetTop - innerHeight * (1 - v))
      void a
    }, f)
    await wait(600)
    during.push(await page.evaluate(() => ({
      heldTop: Math.round(document.getElementById('pinB').getBoundingClientRect().top),
      bowl: +window.__was.state.bowl.opacity.toFixed(2),
    })))
  }
  await page.evaluate(() => window.__was.scrollTo(0.42))
  await wait(900)
  const back = await page.evaluate(() => window.__was.state.bowl)
  return { z, during, back }
})()
console.log('la bowl viene coperta:', cover)

// ── the last section: Atlas, COLLAPSING over the one before it ─────────
// It rises while the canvas stage is still pinned behind it, and it is opaque,
// so nothing has to fade.
//
// Off by default now (his ask, 2026-09-16 — the current version skips it
// entirely, straight to Team): flipped ON just for this block, to prove the
// section itself is untouched underneath the flag, then flipped straight
// back so every test after this one sees the real current default.
await page.evaluate(() => {
  window.__was.cfg.atlas.show = true
  window.dispatchEvent(new Event('resize'))
})
await wait(300)
const collapse = []
for (const f of [0.8, 0.5, 0.2, 0]) {
  await page.evaluate((v) => {
    const c = document.getElementById('pinC')
    scrollTo(0, c.offsetTop - innerHeight * v)
  }, f)
  await wait(650)
  collapse.push(await page.evaluate(() => {
    const c = document.getElementById('pinC').getBoundingClientRect()
    const held = document.getElementById('stageB').getBoundingClientRect()
    return {
      atlas: Math.round(c.top),
      held: Math.round(held.top),
      z: +getComputedStyle(document.getElementById('pinC')).zIndex,
      shadow: getComputedStyle(document.getElementById('stageC')).boxShadow,
      bowl: window.__was.state.bowl.opacity,
      q: window.__was.state.atlasQ,
    }
  }))
}
await page.screenshot({ path: `${OUT}/06-collapse.png` })
console.log('la sezione collassa sopra:', collapse)

const atlasShot = async (f, name) => {
  await page.evaluate((v) => window.__was.scrollToAtlas(v), f)
  await wait(1000)
  const s = await page.evaluate(() => window.__was.state)
  await page.screenshot({ path: `${OUT}/${name}.png` })
  console.log(`atlas q=${s.atlasQ.toFixed(2)} ${name.padEnd(16)} front=${s.atlas.front} ` +
              `cards=[${s.atlas.cards.join(',')}] bowl=${s.bowl.opacity.toFixed(2)}`)
  return s
}
const a0 = await atlasShot(0.02, '07-atlas-empty')
const a1 = await atlasShot(0.3, '07b-atlas-drawing')
const a2 = await atlasShot(0.62, '07c-atlas-half')
const a3 = await atlasShot(1, '08-atlas-closed')

// the three cards, where they land and what they say
const atlasCards = await page.evaluate(() => {
  const cards = [...document.querySelectorAll('.was-atl-card')]
  const marks = [...document.querySelectorAll('.was-atl-marker')]
  const lines = [...document.querySelectorAll('.was-atl-lines line')]
  return {
    titles: cards.map((c) => c.querySelector('.was-atl-title').textContent),
    stats: cards.map((c) => [...c.querySelectorAll('dt')].map((d) => d.textContent)),
    inFrame: cards.every((c) => {
      const r = c.getBoundingClientRect()
      return r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight
    }),
    // ...and never laid out under the page's own nav
    clearOfNav: (() => {
      const nav = document.querySelector('.was-nav').getBoundingClientRect()
      return cards.every((c) => c.getBoundingClientRect().top >= nav.bottom - 1)
    })(),
    leaders: lines.length === cards.length &&
             lines.every((l) => Math.hypot(+l.getAttribute('x2') - +l.getAttribute('x1'),
                                           +l.getAttribute('y2') - +l.getAttribute('y1')) > 20),
    markerColours: marks.map((m) => m.style.getPropertyValue('--accent')),
    accents: cards.map((c) => c.style.getPropertyValue('--accent')),
  }
})
console.log('le tre card:', atlasCards)

// the header above the mark: a plain fade, already in place, and the cards
// never land on top of it
const atlasTitle = await page.evaluate(() => {
  const box = document.querySelector('.was-atlas-title')
  const h = document.querySelector('.was-atlas-h')
  const sub = document.querySelector('.was-atlas-sub')
  const r = box.getBoundingClientRect()
  const cards = [...document.querySelectorAll('.was-atl-card')]
  return {
    heading: h.textContent, sub: sub.textContent,
    hOpacity: +getComputedStyle(h).opacity, subOpacity: +getComputedStyle(sub).opacity,
    rect: { top: Math.round(r.top), bottom: Math.round(r.bottom) },
    cardsClearTitle: cards.every((c) => c.getBoundingClientRect().top >= r.bottom - 4),
  }
})
console.log('il titolo dell’Atlas:', atlasTitle)

// the small 2D sketch above it: a circle MORPHING once into a 3-lobed curve
// as the section arrives (his ask, 2026-09-15) — a preview of the mark below
await page.evaluate(() => window.__was.scrollToAtlas(0.001))
await wait(400)
const sketchStart = await page.evaluate(() => window.__was.atlasSketch.probe())
await page.evaluate(() => window.__was.scrollToAtlas(0.02))
await wait(400)
const sketchMid = await page.evaluate(() => window.__was.atlasSketch.probe())
await page.evaluate(() => window.__was.scrollToAtlas(1))
await wait(400)
const sketchEnd = await page.evaluate(() => window.__was.atlasSketch.probe())
// leaves the section entirely, then comes back — does it replay cleanly?
await page.evaluate(() => window.scrollTo(0, 0))
await wait(400)
await page.evaluate(() => window.__was.scrollToAtlas(1))
await wait(400)
const sketchReplay = await page.evaluate(() => window.__was.atlasSketch.probe())
console.log('lo sketch 2D:', { sketchStart, sketchMid, sketchEnd, sketchReplay })

// hovering a card recolours ITS OWN stretch of the band
const beforeHover = await page.evaluate(() => window.__was.atlas.knot.tint.amount)
await page.evaluate(() => {
  const c = document.querySelector('.was-atl-card')
  const r = c.getBoundingClientRect()
  c.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true, clientX: r.left + 10, clientY: r.top + 10 }))
})
await wait(1600)
const hover = await page.evaluate(() => ({
  index: window.__was.atlas.knot.hoverIndex,
  amount: +window.__was.atlas.knot.tint.amount.toFixed(2),
  spread: +window.__was.atlas.knot.tint.spread.toFixed(2),
  colour: '#' + window.__was.atlas.knot.tint.color.getHexString(),
}))
await page.screenshot({ path: `${OUT}/08b-atlas-hover.png` })
await page.evaluate(() => {
  document.querySelector('.was-atl-card').dispatchEvent(new PointerEvent('pointerleave', { bubbles: true }))
})
console.log('hover:', { beforeHover, ...hover })

// where #pinC actually sits relative to the pinned clock, while it is still
// laid out (a hidden element's offsetTop is 0 — meaningless for this)
const riseAtOn = await page.evaluate(() => {
  const q = (id) => document.getElementById(id)
  const vh = innerHeight
  return Math.round((q('pinC').offsetTop - vh - q('pinA').offsetTop) / vh * 100)
})

// back to the real current default — off — for everything after this
await page.evaluate(() => {
  window.__was.cfg.atlas.show = false
  window.dispatchEvent(new Event('resize'))
  window.scrollTo(0, 0)
})
await wait(300)

// the layout probes
const layout = await page.evaluate(() => {
  const nav = document.querySelector('.was-nav')
  const glass = document.querySelector('.was-card-glass')
  const frost = document.querySelector('.was-card-frost')
  return {
    navFixed: getComputedStyle(nav).position,
    navChips: document.querySelectorAll('.was-nav .was-chip').length,
    // the SEARCH sits on the viewport's own centre line
    navSearchCentred: (() => {
      const r = document.querySelector('.was-search').getBoundingClientRect()
      return Math.abs(r.left + r.width / 2 - innerWidth / 2) < 3
    })(),
    navCta: document.querySelector('.was-cta')?.textContent || '',
    navSearchBowl: !!document.querySelector('.was-search .was-search-bowl'),
    navOnRight: (() => {
      const c = document.querySelector('.was-cta').getBoundingClientRect()
      return c.right > innerWidth * 0.85
    })(),
    canvasInStage: document.getElementById('stageA').contains(document.getElementById('canvasLayer')),
    canvasPos: getComputedStyle(document.getElementById('canvasLayer')).position,
    stageCSolid: (() => {
      const c = document.getElementById('stageC')
      const bg = getComputedStyle(c).backgroundColor
      return c.classList.contains('is-solid') && bg !== 'rgba(0, 0, 0, 0)' &&
             getComputedStyle(c).position === 'sticky'
    })(),
    atlasGround: getComputedStyle(document.getElementById('stageC')).backgroundColor,
    // the second sticky: an opaque stage on the same clock, carrying the
    // evidence panel
    heldSolid: (() => {
      const b = document.getElementById('stageB')
      return b.classList.contains('is-solid') &&
             getComputedStyle(b).position === 'sticky' &&
             getComputedStyle(b).backgroundColor === 'rgb(255, 255, 255)'
    })(),
    evInB: document.getElementById('leftB').contains(document.querySelector('.was-evidence')) &&
           document.getElementById('leftA').querySelector('.was-evidence') === null,
    // (the panel's own detailed geometry is `evLayout`, above — measured
    // while V1 is on screen, which is where this `layout` object is read)
    // #below used to be an empty spacer; it now holds the team section,
    // and only that — sized to its own content, not a forced vh
    belowHasOnlyTeam: document.getElementById('below').children.length === 1 &&
      !!document.querySelector('#below .was-team'),
    belowAuto: document.getElementById('below').style.height === '',
    threeSections: ['pinA', 'pinB', 'pinC'].every((id) => !!document.getElementById(id)),
    // the sections, in vh, and where each one starts
    geom: (() => {
      const q = (id) => document.getElementById(id)
      const vh = innerHeight
      return {
        a: Math.round(q('pinA').offsetHeight / vh * 100),
        b: Math.round(q('pinB').offsetHeight / vh * 100),
        c: Math.round(q('pinC').offsetHeight / vh * 100),
        // the Atlas starts rising exactly where the pinned clock completes
        riseAt: Math.round((q('pinC').offsetTop - vh - q('pinA').offsetTop) / vh * 100),
      }
    })(),
    pageBg: getComputedStyle(document.body).backgroundColor,
    player: window.__was.player.probe(),
    heroParaCorner: (() => {
      const r = document.querySelector('.was-hero-para').getBoundingClientRect()
      const h = document.getElementById('hero').getBoundingClientRect()
      return r.left < innerWidth * 0.2 && r.bottom > h.bottom - innerHeight * 0.2
    })(),
    glassAlpha: +getComputedStyle(glass).opacity,
    frostBlur: frost.style.backdropFilter,
    frostShown: !frost.hidden && frost.getBoundingClientRect().width >
                document.querySelector('.was-card-glass').getBoundingClientRect().width,
    // the glass is the WHOLE left column, not a patch around the card
    glassFull: (() => {
      const col = document.getElementById('leftA').getBoundingClientRect()
      const f = frost.getBoundingClientRect()
      return Math.abs(f.width - col.width) < 2 && f.height >= innerHeight - 2 &&
             frost.style.clipPath === 'none'
    })(),
    glassBehindCard: [...document.getElementById('leftA').children].indexOf(frost) <
                     [...document.getElementById('leftA').children].indexOf(document.querySelector('.was-card')),
    // the map machinery is gone for good; the panel is not
    noMap: !document.querySelector('.was-closing'),
  }
})
console.log('layout:', layout)
// ...nor in the config the panel binds to
const cfgClean = await page.evaluate(() => {
  const c = window.__was.cfg
  return {
    keys: ['vanish', 'techniques', 'network', 'closing'].filter((k) => k in c),
    steps: c.steps.length,
    pillKeys: ['spreadShell', 'spreadScale', 'fovTo', 'dezoom', 'textOut', 'dotHold'].filter((k) => k in c.pills3d),
    canvasSteps: c.sections.canvasSteps,
    lastTextOut: c.steps[2].textOut,
    square: c.left.card.square,
    shadow: c.atlas.shadow,
  }
})
console.log('config ripulita:', cfgClean)

// scroll all the way back up: the opening portrait must land dead centre again
await page.evaluate(() => window.__was.scrollTo(0))
await wait(3200)
const sBack = await page.evaluate(() => window.__was.state)
await page.screenshot({ path: `${OUT}/09-back-to-top.png` })
console.log('back:', sBack.heroAt, 'tumble', sBack.tumble)

// free tumble: drag horizontally AND vertically
await page.evaluate(() => window.__was.scrollTo(0.62))
await wait(700)
const before = await page.evaluate(() => window.__was.state.tumble)
await page.evaluate(() => window.__was.drag(140, 0))
await wait(600)
const afterX = await page.evaluate(() => window.__was.state.tumble)
await page.screenshot({ path: `${OUT}/10-drag-x.png` })
await page.evaluate(() => window.__was.drag(0, 150))
await wait(600)
const afterY = await page.evaluate(() => window.__was.state.tumble)
await page.screenshot({ path: `${OUT}/10b-drag-y.png` })
console.log('tumble:', { before, afterX, afterY })

// the panel must scroll internally with Lenis running — C has to come back
// off first, or there is nothing on screen to scroll
await page.evaluate(() => window.__was.setClean(false))
await wait(200)
const panelInfo = await page.evaluate(() => {
  // "Wide Angle Sphere" is gone (his ask, 2026-09-16) — `.was-panel-bowl` is
  // the first `.was-panel` in the DOM now, and the Lenis-scroll mechanic this
  // checks is generic to every panel, so any one of them proves it
  const el = document.querySelector('.was-panel')
  el.classList.remove('is-hidden')
  window.__was.bowlPanel.pane.children.forEach((f) => { if ('expanded' in f) f.expanded = true })
  el.scrollTop = 0
  const r = el.getBoundingClientRect()
  return {
    scrollable: el.scrollHeight > el.clientHeight + 20,
    x: Math.round(r.left + r.width / 2),
    y: Math.round(r.top + r.height / 2),
  }
})
await wait(300)
await page.mouse.move(panelInfo.x, panelInfo.y)
const pageYBefore = await page.evaluate(() => window.scrollY)
await page.mouse.wheel({ deltaY: 500 })
await wait(600)
const panelScroll = await page.evaluate(() => {
  const el = document.querySelector('.was-panel')
  const out = {
    top: Math.round(el.scrollTop),
    pageY: Math.round(window.scrollY),
    prevented: el.hasAttribute('data-lenis-prevent'),
  }
  el.classList.add('is-hidden')
  window.__was.bowlPanel.pane.children.forEach((f) => { if ('expanded' in f) f.expanded = false })
  return out
})
console.log('panel:', { ...panelInfo, ...panelScroll, pageYBefore })

// markers off → the clean frame
await page.evaluate(() => { window.__was.setClean(true) })
await page.evaluate(() => { window.__was.cfg.debug.markers = false; window.__was.debug.apply() })
await page.evaluate(() => window.__was.scrollTo(0.72))
await wait(900)
await page.screenshot({ path: `${OUT}/11-clean.png` })

// ── V2 — the ring act (keyboard 2) ─────────────────────────────────────────
// Everything about V2 is checked LAST, so the page can be left in whichever
// version it likes without touching a single reading taken above.
//
// `alphaOf` reads the node the painter actually touches: the inner span of a
// line for a block set in lines, the words for one set in words. A block builds
// both wrappers, and the one its mode does not paint keeps whatever it was —
// measuring that instead is how a block that is properly hidden reads as
// visible.
const ALPHA = `(sel, lines) => {
  const e = document.querySelector(sel);
  if (!e) return -1;
  const n = e.querySelectorAll(lines ? '.was-line-in' : '.was-word');
  let m = 0;
  n.forEach((x) => { m = Math.max(m, +getComputedStyle(x).opacity) });
  return +m.toFixed(2);
}`
const DY = `(sel) => {
  const e = document.querySelector(sel);
  const i = e && e.querySelector('.was-line-in');
  if (!i) return 0;
  const m = new DOMMatrixReadOnly(getComputedStyle(i).transform);
  return Math.round(m.m42);
}`

const v2Z = await page.evaluate(() => ({
  ground: +getComputedStyle(document.getElementById('ground')).zIndex,
  under: +getComputedStyle(document.getElementById('under')).zIndex,
  bowl: +getComputedStyle(document.querySelector('.was-bowl-layer')).zIndex,
  held: +getComputedStyle(document.getElementById('pinB')).zIndex,
  navBand: +getComputedStyle(document.querySelector('.was-nav'), '::before').opacity,
}))
const v1Act = await page.evaluate(() => {
  const s = window.__was.state
  return {
    steps: s.v2.stepNames, canvasFrom: s.v2.canvasFrom, canvasInB: s.v2.canvasInB,
    act: s.hero.act, untilVh: s.v2.untilVh,
    ground: getComputedStyle(document.getElementById('ground')).display,
    under: getComputedStyle(document.getElementById('under')).display,
    boxed: document.getElementById('canvasLayer').classList.contains('is-box'),
    canvases: document.querySelectorAll('.was-bowl-canvas').length,
  }
})
// a REAL keypress: the switch has to work from the keyboard
await page.keyboard.press('2')
await wait(900)
const v2On = await page.evaluate(() => {
  const s = window.__was.state
  return {
    on: s.v2.on, body: s.v2.body, act: s.hero.act, steps: s.v2.stepNames,
    canvasFrom: s.v2.canvasFrom, canvasInB: s.v2.canvasInB,
    leftAHidden: document.getElementById('leftA').hidden,
    boxed: document.getElementById('canvasLayer').classList.contains('is-box'),
    untilVh: s.v2.untilVh,
    rings: s.v2.rings.map((r) => ({ key: r.key, source: r.source, count: r.count })),
    ground: s.v2.ground,
    canvases: document.querySelectorAll('.was-bowl-canvas').length,
  }
})

// NOTHING may be on screen before it has fired. A block now only resets
// once it has actually scrolled OUT of the viewport (his own ask, 2026-09-15
// — never visibly un-reveal while still looking at it), so `scrollToUntil(0)`
// alone is not enough to prove that if an earlier check left one "on" within
// this same page session: go all the way back to the top FIRST, where every
// block genuinely leaves the screen and gets the chance to reset, then come
// back down to right before its own mark.
await page.evaluate(() => window.scrollTo(0, 0))
await wait(500)
await page.evaluate(() => window.__was.scrollToUntil(0))
await wait(1400)
const v2Rest = await page.evaluate(([f, g]) => {
  const a = eval(f)
  const s = window.__was.state
  return {
    top: a('.was-v2-block.is-top', true),
    bottom: a('.was-v2-block.is-bottom', true),
    until: a('.was-v2-until', false),
    state: { t: s.hero.v2Top, b: s.hero.v2Bottom, u: s.hero.v2Until },
    dy: eval(g)('.was-v2-block.is-bottom'),
  }
}, [ALPHA, DY])

// the three beats, the rail, and the ground opening under them
const v2Two = []
for (const q of [0.14, 0.38, 0.55, 0.85]) {
  await page.evaluate((v) => window.__was.scrollToUntil(v), q)
  await wait(2500)
  const r = await page.evaluate(([f, g]) => {
    const a = eval(f), d = eval(g)
    const s = window.__was.state
    return {
      top: a('.was-v2-block.is-top', true), topDy: d('.was-v2-block.is-top'),
      bottom: a('.was-v2-block.is-bottom', true), botDy: d('.was-v2-block.is-bottom'),
      until: s.hero.v2Until,
      untilInk: getComputedStyle(document.querySelector('.was-v2-until')).color,
      ground: s.v2.ground, px: window.__was.ground.sample(5),
      bowl: s.bowl, darkPage: document.body.classList.contains('is-ground'),
    }
  }, [ALPHA, DY])
  v2Two.push({ q, ...r })
}
await page.screenshot({ path: `${OUT}/12-v2-ground.png` })

// the ring act, on the three pinned steps — including a point still INSIDE
// step 2 (Experiences) where the pose must already be step 3's (the lead-time
// requirement), and a pre-/mid-collapse pair at the very end (the rings must
// be seen gathering into the bowl's centre as they fade, not just vanishing at
// whatever radius they were already holding).
// Retargeted 2026-09-16 when step 3 ("Connecting") was cut again (190→110vh,
// his ask — no dead scroll before Team): every fraction here is a fraction of
// the FULL page clock, and shortening one step shifts what a fixed fraction
// lands on, even though the underlying behaviour did not change. Verified
// live against the running build before touching these, not guessed.
const v2Act = []
for (const p of [0.05, 0.25, 0.34, 0.39, 0.44, 0.55, 0.62]) {
  await page.evaluate((v) => window.__was.scrollTo(v), p)
  await wait(2200)
  const r = await page.evaluate(() => {
    const s = window.__was.state
    const live = (cs) => cs.filter((c) => c.a > 0.4)
    const maxR = (cs) => Math.max(0, ...cs.map((c) => Math.hypot(c.x, c.y)))
    // the WORLD radius of every ring card, as a fraction of the bowl's own
    // diameter (D) — read straight off the mesh transforms, not the NDC
    // projection `cards` uses (which is for screen-space checks, not
    // world-space clearance from the mesh). The camera DOLLIES during this
    // act, so D itself changes frame to frame — has to use the LIVE distance,
    // not the static config default.
    const worldH = 2 * s.v2.dist * Math.tan((window.__was.cfg.bowl.cam.fov * Math.PI / 180) / 2)
    const D = s.bowl.size * worldH
    const worldR = []
    window.__was.bowl.scene.traverse((o) => {
      if (o.isMesh && o.material?.uniforms?.uHasTex !== undefined) worldR.push(o.position.length() / D)
    })
    return {
      actP: s.v2.actP, step: s.v2.actStep, dist: s.v2.dist, warm: s.v2.warm,
      mix: s.v2.ground.mix, px: window.__was.ground.sample(4),
      rings: s.v2.rings.map((x) => {
        const l = live(x.cards)
        return {
          key: x.key, a: x.alpha, n: l.length, maxR: maxR(x.cards),
          front: l.filter((c) => c.dz > 0.01).length,
          behind: l.filter((c) => c.dz < -0.01).length,
        }
      }),
      worldRmin: worldR.length ? Math.min(...worldR) : null,
      bowl: s.bowl, copy: s.copyAlpha,
    }
  })
  v2Act.push({ p, ...r })
}
const actAt = (p) => v2Act.find((x) => x.p === p)
await page.evaluate(() => window.__was.scrollTo(0.05))
await wait(2500)
await page.screenshot({ path: `${OUT}/13-v2-ring-a.png` })
await page.evaluate(() => window.__was.scrollTo(0.47))
await wait(2500)
await page.screenshot({ path: `${OUT}/14-v2-over-the-top.png` })

// ...and the last section: the EVIDENCE panel, with the canvas in a corner of it
await page.evaluate(() => window.__was.scrollTo(0.97))
await wait(1800)
const v2Last = await page.evaluate(() => {
  const s = window.__was.state
  const r = document.getElementById('canvasLayer').getBoundingClientRect()
  const rn = document.getElementById('networkBox').getBoundingClientRect()
  return {
    asm: s.asm, pill: s.pill, step: s.step, ev: s.left.ev,
    box: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
    netBox: { x: Math.round(rn.x), y: Math.round(rn.y), w: Math.round(rn.width), h: Math.round(rn.height) },
    vh: window.innerHeight, vw: window.innerWidth,
    canvasOn: s.canvasOn, introV: s.intro,
    canvasHidden: s.v2.canvasHidden,
    network: s.v2.network,
  }
})
await page.screenshot({ path: `${OUT}/15-v2-evidence-with-network.png` })

// ── the hard cutoff: bowl + ground stop the instant the section behind them
// fully covers the viewport, and come back the instant it stops being true.
// `v2Last` already sat at p=0.97 (deep in the section, fully covered) — this
// reads the SAME moment, then scrolls back up to prove it is reversible.
const cutoffCovered = await page.evaluate(() => {
  const bc = document.querySelector('.was-bowl-canvas')
  const gc = document.querySelector('.was-ground-canvas')
  return { bowlDisp: getComputedStyle(bc).display, groundDisp: getComputedStyle(gc).display,
           bowlHidden: window.__was.bowl.hidden, groundHidden: window.__was.ground.hidden,
           bowlOpacity: window.__was.state.bowl.opacity }
})
// 0.42, not 0.5: with `#pinB` rising `earlyRiseVh` sooner (2026-09-17) the
// clock's 0.5 is already 55vh under its stage — 0.42 (act ≈ 0.94) is the
// last stretch where the bowl is still uncovered, sinking, fully opaque
await page.evaluate(() => window.__was.scrollTo(0.42))
await wait(1200)
const cutoffUncovered = await page.evaluate(() => {
  const bc = document.querySelector('.was-bowl-canvas')
  return { bowlDisp: getComputedStyle(bc).display,
           bowlHidden: window.__was.bowl.hidden, groundHidden: window.__was.ground.hidden,
           bowlOpacity: window.__was.state.bowl.opacity }
})
await page.evaluate(() => window.__was.scrollTo(0.97))
await wait(1200)

// ── the trust network's own build-up, row by row ────────────────────────────
// The field appears once, right at the start of step 1; then USERS pop out of
// it, then TEACHERS (with their connector to a user), then TECHNIQUES (with
// their connector to a teacher) — never out of order, never ahead of the
// evidence row that is supposed to be driving it.
const netRows = []
for (const p of [0.60, 0.70, 0.80, 0.90, 0.98]) {
  await page.evaluate((v) => window.__was.scrollTo(v), p)
  await wait(1200)
  const r = await page.evaluate(() => {
    const s = window.__was.state
    const n = s.v2.network
    const avg = (arr, k) => arr.length ? arr.reduce((a, x) => a + (x[k] || 0), 0) / arr.length : 0
    return {
      ev: s.v2.ev.map((x) => +x.toFixed(2)),
      fieldO: +n.field.alpha.toFixed(2),
      userO: +avg(n.people, 'opacity').toFixed(2), teachO: +avg(n.teachers, 'opacity').toFixed(2),
      pillO: +avg(n.techniques, 'opacity').toFixed(2),
      lineUT: +avg(n.teachers, 'lineDraw').toFixed(2), lineTT: +avg(n.techniques, 'lineDraw').toFixed(2),
    }
  })
  netRows.push({ p, ...r })
}

// the structural sanity a screenshot would otherwise be needed for: real
// image hrefs, real pill widths (not a getBBox() race landing on zero), every
// point actually INSIDE the box, no two pills sharing a spot, and the
// techniques genuinely reaching FURTHER than the sphere's own shell
const netStruct = await page.evaluate(() => {
  const svg = document.querySelector('.was-network-svg')
  const images = [...svg.querySelectorAll('image')]
    .map((i) => i.getAttribute('href')).filter(Boolean)
  const rects = [...svg.querySelectorAll('rect')]
  const s = window.__was.state
  const n = s.v2.network
  const w = n.box.w, h = n.box.h
  const allPts = [
    ...n.people.map((x) => x.pt), ...n.teachers.map((x) => x.pt), ...n.techniques.map((x) => x.pt),
  ].filter(Boolean)
  const inBox = allPts.every((p) => p.x >= -2 && p.x <= w + 2 && p.y >= -2 && p.y <= h + 2)
  const spreadOf = (arr) => {
    const xs = arr.map((x) => x.pt?.x).filter((x) => x !== undefined)
    return xs.length ? Math.max(...xs) - Math.min(...xs) : 0
  }
  // no two pill rects should overlap — the whole point of separating them
  // BEFORE they are drawn
  const boxes = rects.map((r) => ({
    x: +r.getAttribute('x'), y: +r.getAttribute('y'),
    w: +r.getAttribute('width'), h: +r.getAttribute('height'),
  }))
  let overlaps = 0
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], b = boxes[j]
      if (a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y) overlaps++
    }
  }
  return {
    imageCount: images.length, allImagesResolved: images.every((h) => /\.(jpg|jpeg|png|webp|avif)$/i.test(h)),
    rectCount: rects.length, rectsPositive: boxes.every((b) => b.w > 10),
    overlaps,
    labels: n.techniques.map((x) => x.label),
    labelsUnique: new Set(n.techniques.map((x) => x.label)).size === n.techniques.length,
    fieldCount: n.field.count,
    peopleCount: n.people.length, teacherCount: n.teachers.length, techniqueCount: n.techniques.length,
    inBox,
    spreadUser: spreadOf(n.people), spreadTeacher: spreadOf(n.teachers), spreadTech: spreadOf(n.techniques),
  }
})

// V1: the network must not exist there at all, and the sphere box is back
await page.keyboard.press('1')
await wait(700)
const netV1 = await page.evaluate(() => {
  const el = document.getElementById('networkBox')
  return {
    hidden: el.hidden, display: getComputedStyle(el).display,
    canvasHidden: document.getElementById('canvasLayer').hidden,
  }
})
await page.keyboard.press('2')
await wait(700)

// the sphere fallback still works — flip `network.show` off WITHOUT touching
// version, exactly the escape hatch `v2.network.show: false` promises
await page.evaluate(() => window.__was.scrollTo(0.97))
await wait(1200)
await page.evaluate(() => { window.__was.cfg.v2.network.show = false; window.__was.placeStages() })
await wait(1600)
const sphereFallback = await page.evaluate(() => {
  const s = window.__was.state
  let cardsVisible = 0, cardsTextured = 0
  window.__was.sphereScene.traverse((o) => {
    if (o.isMesh && o.material?.uniforms?.uOpacity) {
      const op = o.material.uniforms.uOpacity.value
      if (op > 0.05) cardsVisible++
      if (op > 0.05 && o.material.uniforms.uHasTex?.value > 0.5) cardsTextured++
    }
  })
  return {
    canvasOn: s.canvasOn, canvasHidden: s.v2.canvasHidden, introV: s.intro,
    cardsVisible, cardsTextured,
    netHidden: document.getElementById('networkBox').hidden,
  }
})
await page.evaluate(() => { window.__was.cfg.v2.network.show = true; window.__was.placeStages() })
await wait(300)

// ...and 1 puts V1 back, exactly as it was
await page.keyboard.press('1')
await wait(900)
const v1Back = await page.evaluate(() => {
  const s = window.__was.state
  return {
    act: s.hero.act, steps: s.v2.stepNames, canvasFrom: s.v2.canvasFrom,
    canvasInB: s.v2.canvasInB, untilVh: s.v2.untilVh,
    boxed: document.getElementById('canvasLayer').classList.contains('is-box'),
    leftAHidden: document.getElementById('leftA').hidden,
    ground: getComputedStyle(document.getElementById('ground')).display,
    under: getComputedStyle(document.getElementById('under')).display,
    ringA: s.v2.rings[0].alpha,
  }
})
await page.evaluate(() => window.__was.scrollToUntil(0.8))
await wait(1900)
const v1BackBeats = await page.evaluate(() => window.__was.state.hero)

// how much the field actually VARIES — a photograph does, a flat colour does not
const spread = (px) => {
  const ch = [0, 1, 2].map((c) => px.map((p) => p[c]))
  return Math.max(...ch.map((v) => Math.max(...v) - Math.min(...v)))
}

// ── "The Great Team Behind" — TWO grids, always both on the page, no
//    switch button any more (his correction, 2026-09-16: "hai fatto un
//    casino... abbiamo una grid per il team e l'altra grid invece per i
//    partners") — Christopher Plowman is back in Team (top-left, index 0)
//    AND still in Partners, a deliberate duplication, not a data bug ───────
await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
await wait(1200)
const teamBoot = await page.evaluate(() => window.__was.team.probe())
// the rows arrived on scroll (2026-09-17) — by the bottom of the page every
// row has passed the fold, so every one must have played, even though this
// was a JUMP straight past them, not a scroll through
await wait(700)
const teamReveal = await page.evaluate(() => ({
  ...window.__was.team.reveal,
  firstOpacity: +getComputedStyle(document.querySelector('[data-roster="team"] .was-team-card')).opacity,
  lastOpacity: +getComputedStyle([...document.querySelectorAll('[data-roster="partners"] .was-team-card')].pop()).opacity,
  revealCfg: window.__was.cfg.team.reveal,
}))
const teamColours = await page.evaluate(() => {
  const root = document.querySelector('.was-team')
  const title = document.querySelector('.was-team-title')
  const desc = document.querySelector('.was-team-desc')
  return {
    bg: getComputedStyle(root).backgroundColor,
    titleColor: getComputedStyle(title).color,
    descColor: getComputedStyle(desc).color,
    titleHTML: title.innerHTML,
    switchButtons: document.querySelectorAll('.was-team-tab').length,
    gridCount: document.querySelectorAll('.was-team-grid').length,
  }
})
await page.evaluate(() => window.__was.team.hover(0))
await wait(700)
const teamHoverA = await page.evaluate(() => {
  const t = document.querySelector('.was-team-tooltip')
  return { ...window.__was.team.probe(), scale: getComputedStyle(t).transform }
})
await page.evaluate(() => window.__was.team.hover(6))
await wait(700)
const teamHoverB = await page.evaluate(() => window.__was.team.probe())
await page.evaluate(() => window.__was.team.unhover(6))
await wait(700)
const teamAfterLeave = await page.evaluate(() => window.__was.team.probe())
await page.evaluate(() => window.__was.team.hover(0, 'partners'))
await wait(700)
const partnersHover = await page.evaluate(() => window.__was.team.probe())
await page.evaluate(() => window.__was.team.unhover(0, 'partners'))
await wait(700)
await page.screenshot({ path: `${OUT}/16-team.png` })

// ── the new footer, transcribed from his reference (2026-09-16) ───────────
await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
await wait(600)
const footerProbe = await page.evaluate(() => window.__was.footer.probe())
// the five tracks: where the first one starts, and the real gap between each
const footerCols = await page.evaluate(() => {
  const subs = [...document.querySelectorAll('.was-footer-sub')].map((e) => e.getBoundingClientRect())
  const gaps = []
  for (let i = 1; i < subs.length; i++) gaps.push(Math.round(subs[i].left - subs[i - 1].right))
  return { left: Math.round(subs[0].left), gaps }
})
console.log('le colonne del footer:', footerCols)
// the link list sits back at .65 and only the one under the pointer comes forward
const footerLinks = await (async () => {
  const sel = '.was-footer-col a'
  const rest = await page.evaluate((s) => +getComputedStyle(document.querySelector(s)).opacity, sel)
  const box = await page.evaluate((s) => {
    const r = document.querySelector(s).getBoundingClientRect()
    return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }
  }, sel)
  await page.mouse.move(box.x, box.y)
  await wait(400)
  const hover = await page.evaluate((s) => +getComputedStyle(document.querySelector(s)).opacity, sel)
  await page.mouse.move(5, 5)
  await wait(250)
  return { rest, hover }
})()
// the player has parked by now — pinB arrived long ago
const playerParked = await page.evaluate(() => window.__was.player.probe())
await page.screenshot({ path: `${OUT}/16c-footer.png` })

// ── the footer's FIXED reveal, and the z-index bug it exposed (his ask and
//    his own debug session, 2026-09-16: "ci deve essere un problema di
//    z-index... permettimi di averlo fixed... la pagina scrolla sopra e poi
//    si rivela con l'ultima sezione") ──────────────────────────────────────
//
// Root cause, confirmed live before fixing it: `.was-ground`'s opened V2
// mask (z-index 2, fixed, NEVER closes again by design — `ground.out: 0`)
// was painting OVER the footer because the footer had no z-index of its own
// (position:relative, z-index:auto lands in a LOWER paint layer than any
// positioned sibling with an explicit positive z-index, regardless of DOM
// order) — exactly the same protection `.was-below` already had at z:5 and
// the footer simply didn't.
const revealCheck = await page.evaluate(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms))
  window.__was.setVariant(2)
  await wait(150)
  const below = document.getElementById('below')
  const footer = document.getElementById('footer')
  const belowTop = below.getBoundingClientRect().top + window.scrollY
  // still well inside the team section: must stay hidden, ground must not
  // be able to leak through it even though V2's mask is wide open by now
  window.scrollTo(0, belowTop + 20)
  await wait(300)
  const early = {
    revealed: window.__was.footer.probe().revealed,
    belowBottom: Math.round(below.getBoundingClientRect().bottom),
  }
  // scrolled all the way to the end: must be revealed, fixed, above the
  // canvas layers, and sized exactly to the spacer that makes room for it
  window.scrollTo(0, document.documentElement.scrollHeight)
  await wait(400)
  const late = {
    revealed: window.__was.footer.probe().revealed,
    position: window.__was.footer.probe().position,
    zIndex: Number(window.__was.footer.probe().zIndex),
    spacerH: document.getElementById('footerSpacer').offsetHeight,
    footerH: footer.offsetHeight,
    groundZ: Number(getComputedStyle(document.getElementById('ground')).zIndex),
    underZ: Number(getComputedStyle(document.getElementById('under')).zIndex),
  }
  window.__was.setVariant(1)
  window.scrollTo(0, document.documentElement.scrollHeight)
  await wait(200)
  return { early, late }
})

// ── the two panels (Titles left, Bowl right — "Wide Angle Sphere" is GONE),
//    align, chars, per-step ring-act copy, and post-processing ON THE BOWL,
//    not the Atlas (his corrections, 2026-09-16) ───────────────────────────
const dockInfo = await page.evaluate(() => {
  // both may be hidden from an earlier setClean(true) — `body.is-clean
  // .was-panel { display: none !important }` overrides a plain class
  // removal, so the clean frame itself has to come off too, or a hidden
  // panel's degenerate 0×0 rect fails this for the wrong reason entirely
  window.__was.setClean(false)
  const all = [...document.querySelectorAll('.was-panel')]
  for (const el of all) el.classList.remove('is-hidden')
  const titles = document.querySelector('.was-panel-titles').getBoundingClientRect()
  const bowl = document.querySelector('.was-panel-bowl').getBoundingClientRect()
  return {
    // exactly two panels now, never a third
    count: all.length,
    titlesOnLeft: titles.left < 100,
    bowlOnRight: Math.abs(bowl.right - window.innerWidth) < 20,
  }
})
const titlesToggle = await page.evaluate(() => {
  const was = window.__was.titlesPanel.isOpen
  window.__was.titlesPanel.toggle()
  const now = window.__was.titlesPanel.isOpen
  window.__was.titlesPanel.toggle() // restore
  return { was, now }
})

const alignCheck = await page.evaluate(() => {
  const cfg = window.__was.cfg
  const before = getComputedStyle(document.querySelector('.was-v2-block.is-top')).textAlign
  cfg.v2.top.align = 'right'
  window.__was.hero.style()
  const afterRight = getComputedStyle(document.querySelector('.was-v2-block.is-top')).textAlign
  cfg.v2.top.align = 'left'
  window.__was.hero.style()
  const restored = getComputedStyle(document.querySelector('.was-v2-block.is-top')).textAlign
  return { before, afterRight, restored }
})

const charsCheck = await page.evaluate(() => {
  const cfg = window.__was.cfg
  const savedMode = cfg.evidence.summaryMode
  // exactly what buildBlock() does: split into lines, each line into
  // whitespace-separated words, one `.was-char` per character of every word
  // (the trailing space between words is a plain text node, not a unit)
  const letters = cfg.evidence.summary
    .split(/\n|\s*\|\s*/)
    .join(' ')
    .split(/\s+/)
    .filter(Boolean)
    .join('').length
  cfg.evidence.summaryMode = 'chars'
  window.__was.left.build()
  const chars = document.querySelectorAll('.was-ev-summary .was-char').length
  cfg.evidence.summaryMode = savedMode
  window.__was.left.build()
  const restoredMode = cfg.evidence.summaryMode
  return { letters, chars, restoredMode }
})

// per-step ring-act copy position: three visibly different keyframes, read
// back from the box that actually carries them on screen
const actCopyCheck = await page.evaluate(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms))
  const cfg = window.__was.cfg
  const saved = { x: [...cfg.v2.act.copyX] }
  cfg.v2.act.copyX = [5, 25, 45]
  window.__was.hero.style()
  window.__was.setVariant(2)
  await wait(400)
  const lefts = []
  for (const f of [0.05, 0.32, 0.42]) {
    window.__was.scrollTo(f)
    await wait(500)
    lefts.push(getComputedStyle(document.querySelector('.was-copy-box.is-act')).left)
  }
  cfg.v2.act.copyX = saved.x
  window.__was.hero.style()
  window.__was.setVariant(1)
  await wait(400)
  return { lefts }
})

const postFx = await page.evaluate(() => window.__was.atlas.probe().post)
const bowlPostFx = await page.evaluate(() => window.__was.bowl.post)
const v2ActStep3Text = await page.evaluate(() => window.__was.cfg.v2.steps[2].text)
const atlasSkip = await page.evaluate(() => ({
  show: window.__was.cfg.atlas.show,
  pinCHidden: document.getElementById('pinC').hidden,
}))

// ── one shared left inset down the whole title chain (his ask, 2026-09-16:
//    "un padding delle sezioni che allinei perfettamente i titoli") ────────
const insetAlign = await page.evaluate(() => ({
  v2TopX: window.__was.cfg.v2.top.x,
  actCopyX: [...window.__was.cfg.v2.act.copyX],
  evidenceTitleX: window.__was.cfg.evidence.titleX,
}))

// ── "look at cursor" on the bowl (his ask, 2026-09-16) — a real pointer
//    move at each edge of the window, read back off the smoothed offset the
//    panel exposes ───────────────────────────────────────────────────────
async function moveWindowPointer(cx, cy) {
  await page.evaluate((cx, cy) => {
    window.dispatchEvent(new PointerEvent('pointermove', { clientX: cx, clientY: cy }))
  }, cx, cy)
}
await page.evaluate(() => window.__was.scrollTo(0))
await wait(200)
await moveWindowPointer(60, 500)
await wait(700)
const lookLeft = await page.evaluate(() => window.__was.bowl.look)
await moveWindowPointer(1440, 500)
await wait(700)
const lookRight = await page.evaluate(() => window.__was.bowl.look)
await page.evaluate(() => { window.__was.cfg.bowl.lookCursor.enabled = false })
await wait(1200)
const lookOff = await page.evaluate(() => window.__was.bowl.look)
await page.evaluate(() => { window.__was.cfg.bowl.lookCursor.enabled = true })

// ── the Titles panel's "fires at / plays in / stagger / leaves at" fields
//    now rearm a beat that already fired (his ask, 2026-09-16: "non
//    funziona il control panel per i titoli") — exercise the exact path a
//    slider drag now takes (mutate the config, then the SAME callback
//    `createTitlesPanel` wires to onChange) on a beat already settled at
//    full alpha, and confirm it visibly replays rather than sitting inert ──
const panelReplayCheck = await page.evaluate(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms))
  window.__was.setVariant(2)
  window.__was.scrollToUntil(0.95)
  await wait(2600)
  const before = window.__was.hero.state.v2Bottom
  const savedDur = window.__was.cfg.v2.bottom.dur
  window.__was.cfg.v2.bottom.dur = 3
  window.__was.playUntil()                 // == titlesPanel's onReplayBeats
  await wait(150)
  const mid = window.__was.hero.state.v2Bottom
  await wait(3300)
  const settled = window.__was.hero.state.v2Bottom
  window.__was.cfg.v2.bottom.dur = savedDur
  window.__was.setVariant(1)
  return { before, mid, settled }
})

// ── perf pass (2026-09-17): what the audit changed, read back off the page ──
const perf = await page.evaluate(async () => {
  const W = window.__was
  const glb = await fetch('/models/bowl-option-c.glb', { method: 'HEAD' })
  const woff = await fetch('/fonts/ExposureTrialVAR.woff2', { method: 'HEAD' })
  const cs = getComputedStyle(document.querySelector('.was-player'))
  const hud = document.querySelector('.was-hud')
  return {
    groundDpr: W.ground.probe().dpr,
    post: W.bowl.post,
    glbOk: glb.ok,
    glbBytes: +glb.headers.get('content-length'),
    woffOk: woff.ok,
    woffBytes: +woff.headers.get('content-length'),
    preload: [...document.querySelectorAll('link[rel="preload"]')].map((l) => l.getAttribute('href')),
    playerTransition: cs.transitionProperty,
    playerTranslate: cs.translate,
    hudCells: hud ? hud.children.length : 0,
    willChangeWords: [...document.querySelectorAll('.was-word, .was-line-in, .was-char')]
      .filter((w) => getComputedStyle(w).willChange !== 'auto').length,
    hdrOn: W.cfg.bowl.studio.hdr.on,
    hdr: W.bowl.hdr.state,
    octaves: W.cfg.bowl.material.B.rampNoise.octaves,
    frost: W.state.left.glass,
  }
})
console.log('perf:', perf)

// ═══════════════════════════════════════════════════════════════════════
// V3 — the third version (his ask, 2026-09-17): the same page, with the
// three steps as a golden-angle DISC instead of a sphere, the team in black
// and white, and a hero that reads "Building space / to practice".
// ═══════════════════════════════════════════════════════════════════════
const v3 = await page.evaluate(async () => {
  const pause = (ms) => new Promise((r) => setTimeout(r, ms))
  const W = window.__was
  W.setVariant(3)
  await pause(900)
  const n = W.network.probe()
  const card = document.querySelector('.was-team-card:not(.is-placeholder)')
  const out = {
    variant: W.cfg.variant,
    v2on: W.cfg.v2.on,
    body: { v2: document.body.classList.contains('is-v2'), v3: document.body.classList.contains('is-v3'),
      bw: document.body.classList.contains('is-team-bw') },
    panels: document.querySelectorAll('.was-panel').length,
    disc: n.disc,
    field: n.field.count,
    teamFilter: getComputedStyle(card).filter,
  }
  // ...and back to 2, then 1, to prove the three states really are reversible
  W.setVariant(2)
  await pause(500)
  out.backTo2 = { variant: W.cfg.variant, v2on: W.cfg.v2.on, disc: W.network.probe().disc.on,
    field: W.network.probe().field.count, bw: document.body.classList.contains('is-team-bw') }
  W.setVariant(1)
  await pause(500)
  out.backTo1 = { variant: W.cfg.variant, v2on: W.cfg.v2.on }
  return out
})
console.log('V3:', JSON.stringify(v3, null, 1))

// ═══════════════════════════════════════════════════════════════════════
// V4 — the BRAID (my own proposal): three strands of evidence entering from
// the left, winding over and under each other, converging into one node.
// Plus the team named under each card instead of in a cursor tooltip.
// ═══════════════════════════════════════════════════════════════════════
const v4 = await page.evaluate(async () => {
  const pause = (ms) => new Promise((r) => setTimeout(r, ms))
  const W = window.__was
  W.setVariant(4)
  await pause(1000)
  const n = W.network.probe()
  const card = document.querySelector('.was-team-card:not(.is-placeholder)')
  const cap = card.querySelector('.was-team-cap')
  const cs = (el) => getComputedStyle(el)
  const out = {
    variant: W.cfg.variant,
    v2on: W.cfg.v2.on,
    body: { v3: document.body.classList.contains('is-v3'), v4: document.body.classList.contains('is-v4'),
      caps: document.body.classList.contains('is-team-caps'), bw: document.body.classList.contains('is-team-bw') },
    globe: n.globe,
    disc: n.disc.on,
    field: n.field.count,
    cap: cap ? {
      name: cap.querySelector('.was-team-cap-name').textContent,
      role: cap.querySelector('.was-team-cap-role').textContent,
      nameColor: cs(cap.querySelector('.was-team-cap-name')).color,
      roleColor: cs(cap.querySelector('.was-team-cap-role')).color,
      below: Math.round(cap.getBoundingClientRect().top - card.getBoundingClientRect().bottom),
      shown: cs(cap).display !== 'none',
    } : null,
    tooltipHidden: cs(document.querySelector('.was-team-tooltip')).display === 'none',
  }
  // THE ORDER (his correction, 2026-09-17: "il contrario, bro") — the
  // techniques first, then the dots with the circles, then the world
  // measured: the techniques are all out by .60 with nothing else on screen,
  // the dots and rings arrive .64→.78, and it is a world from .84
  out.order = []
  for (const f of [0.60, 0.78, 0.97]) {
    W.scrollTo(f)
    await pause(800)
    const g = W.network.probe().globe
    out.order.push({ pills: g.pillsOn, dots: g.drawn, rings: g.ringAlpha, behind: g.behind })
  }
  // ...and at the end of the third step the sheet is shut
  W.scrollTo(0.97)
  await pause(1200)
  out.folded = W.network.probe().globe
  // every sample of an arc has to sit ON the ball — that is what "wraps the
  // mesh" means, and a chord through the air would fail it
  out.folded.arcOnSurface = (() => {
    const svg = document.querySelector('.was-network-svg')
    const paths = [...svg.querySelectorAll('path')].filter((p) => {
      const d = p.getAttribute('d') || ''
      return d.split('L').length > 8 && +p.getAttribute('opacity') > 0.02 && p.getAttribute('fill') === 'none'
    })
    const vb = (svg.getAttribute('viewBox') || '0 0 1 1').split(' ').map(Number)
    const cx = vb[2] / 2
    const cy = vb[3] / 2
    const R = W.network.probe().globe.sphereR
    let worst = 0
    for (const p of paths) {
      const L = p.getTotalLength()
      for (let i = 0; i <= 10; i++) {
        const pt = p.getPointAtLength((i / 10) * L)
        worst = Math.max(worst, Math.hypot(pt.x - cx, pt.y - cy) - R)
      }
    }
    // nothing may leave the ORBIT shell: the chains run on the surface and
    // only the last hop climbs, on purpose, up to where the label is
    const G = W.cfg.v2.network.globe
    return worst < R * (G.pillOrbit * (1 + (G.perspective || 0) * 0.5) - 1) + 6
  })()
  // ...and it can be turned by hand
  out.dragged = await (async () => {
    const before = W.network.probe().globe.drag
    const ev = (type, x) => document.getElementById('networkBox')?.dispatchEvent(
      new PointerEvent(type, { clientX: x, clientY: 400, bubbles: true, pointerId: 1 }))
    ev('pointerdown', 400); ev('pointermove', 520); ev('pointerup', 520)
    await pause(60)
    const after = W.network.probe().globe.drag
    return { before, after, moved: Math.abs(after - before) > 0.05 }
  })()
  W.setVariant(1)
  await pause(500)
  out.backTo1 = {
    variant: W.cfg.variant,
    caps: document.body.classList.contains('is-team-caps'),
    capShown: getComputedStyle(document.querySelector('.was-team-cap')).display !== 'none',
  }
  return out
})
console.log('V4:', JSON.stringify({ ...v4, globe: { ...v4.globe, flatBox: v4.globe.flatBox } }, null, 1))

// il paragrafo in basso dei tre step: si accende quando la sezione tocca il top
const evTop = await page.evaluate(async () => {
  const pause = (ms) => new Promise((r) => setTimeout(r, ms))
  const pin = document.getElementById('pinB')
  const out = []
  for (const off of [-260, -60, 4, 200]) {
    scrollTo(0, pin.offsetTop + off)
    await pause(700)
    out.push({ top: Math.round(pin.getBoundingClientRect().top), summary: window.__was.left.evidence().summary })
  }
  scrollTo(0, 0)
  await pause(600)
  return out
})
console.log('il paragrafo dei tre step:', evTop)

// il boot vero, senza toccare nulla (sua richiesta, 2026-09-18): V4 di
// default, pannelli nascosti finché non premo "c"
await page.reload({ waitUntil: 'networkidle2', timeout: 45000 })
await page.waitForFunction('window.__was && window.__was.state.sphereCards > 0', { timeout: 20000 })
const freshBoot = await page.evaluate(() => {
  const W = window.__was
  return {
    variant: W.cfg.variant,
    v2on: W.cfg.v2.on,
    isV4: document.body.classList.contains('is-v4'),
    clean: W.state.clean,
    panelsHidden: [...document.querySelectorAll('.was-panel')].every((e) => getComputedStyle(e).display === 'none'),
  }
})
console.log('freshBoot:', freshBoot)

const drift = HERO_CFG.drift
const checks = [
  // ── the bowl ─────────────────────────────────────────────────────────
  ['la bowl è lì, con il suo rilievo',
    heroState.bowl.ready && mat.A.relief.enabled],
  ['il rilievo della bowl non cambia con la scala (correzione in shader)',
    reliefShader.hasScale && reliefShader.hasVarying && reliefShader.aa === 0],
  // ── the new hero: one line with the bowl in it ────────────────────────
  ['hero: "Building / space" · la bowl · "to / practice" — i titoli GIUSTI ' +
   '(sua richiesta, 2026-09-17), due righe per metà',
    HERO_CFG.title === 'Building|space' && HERO_CFG.titleB === 'to|practice' &&
    heroLine.aLines === 2 && heroLine.bLines === 2 &&
    heroLine.aText === 'Buildingspace' && heroLine.bText === 'topractice' &&
    heroState.hero.title > 0.95 && heroState.hero.titleB > 0.95],
  ['...la bowl sta in mezzo alle due metà con aria uguale, e le due metà sono ' +
   'SFASATE anche in Y — la sinistra più in alto, la destra più in basso',
    heroLine.bowlX > heroLine.a.right && heroLine.bowlX < heroLine.b.left &&
    Math.abs(heroLine.gapL - heroLine.gapR) < 3 &&
    heroLine.oneLine === false && heroLine.bTop - heroLine.aTop > 40 &&
    heroState.bowl.opacity > 0.95],
  ['l’apertura è UNA timeline: We · Guide · bowl · You · Through, in ordine',
    seq.at[0].we[0] === 0 && seq.at[0].bowl === 0 &&
    seq.at[0.3].we[0] > 0.2 && seq.at[0.3].we[1] === 0 &&
    seq.at[1.2].bowl > 0 && seq.at[1.2].you[0] === 0 &&
    seq.at[2.1].bowl > 0.9 && seq.at[2.6].you[0] > 0.2 && seq.at[2.6].you[1] < seq.at[2.6].you[0] &&
    seq.at[seq.dur].you[1] > 0.9],
  ['...e ogni parola parte PRIMA che finisca quella prima: è stagger, non delay',
    // "Guide" is already arriving while "We" is still on its way in, and the
    // bowl starts while "Guide" is, and "You" while the bowl is
    seq.at[0.9].we[0] < 1 && seq.at[0.9].we[1] > 0 &&
    seq.at[1.2].we[1] < 1 && seq.at[1.2].bowl > 0 &&
    seq.at[2.1].bowl < 1 && seq.at[2.6].you[0] > 0 &&
    seq.at[3.0].you[0] < 1 && seq.at[3.0].you[1] > 0],
  ['le due metà si aprono allo scroll — la sinistra a sinistra, la destra a ' +
   'destra — e si richiudono tornando su, esattamente dov\'erano',
    heroScrolled.hero.halfA < heroLine.a.left - drift * 4 &&
    heroScrolled.hero.halfB > heroLine.b.right + drift * 4 &&
    Math.abs(heroBack.halfA - heroLine.a.left) < 2 &&
    Math.abs(heroBack.halfB - heroLine.b.right) < 2],
  ['...e NON sono una coppia speculare (sua richiesta: "devono sfasarsi sulla X"): ' +
   'la destra parte più tardi e arriva più lontano',
    HERO_CFG.driftRight > HERO_CFG.drift && HERO_CFG.driftPhase > 0.05 &&
    // Lo sfasamento NON si vede nei pixel — la destra va più lontano, quindi a
    // metà corsa ha comunque percorso più strada. Si vede nella FRAZIONE di
    // corsa che ognuna ha già fatto: la destra è partita dopo, quindi è
    // indietro di fase anche mentre è avanti in pixel.
    heroPhase.leftFrac > heroPhase.rightFrac + 0.08],
  ['il titolo è rivelato in words sull’asse EXPO, in place',
    introDom.isIntro && introDom.inPlace && introDom.rise === 0],
  ['il paragrafo hero c’è appena atterri, e non sparisce nel nulla',
    heroState.hero.para > 0.95 && heroScrolled.hero.para > 0.95],
  ['nav: niente pills, la ricerca al CENTRO e un solo bottone a destra',
    layout.navFixed === 'fixed' && layout.navSearchBowl && layout.navChips === 0 &&
    layout.navSearchCentred && layout.navCta === HERO_CFG.nav.cta && layout.navOnRight],
  // ── act two ──────────────────────────────────────────────────────────
  ['atto 2: il titolo a sinistra e "Until now" a destra, ALLA STESSA ALTEZZA',
    beatBox.sticky === 'sticky' && beatBox.leftSide && beatBox.rightSide &&
    beatBox.level && beatBox.bowlBetween],
  ['il primo esce in LINES, "Until now" in WORDS',
    beatBox.leftLines && beatBox.rightWords &&
    heroState.hero.leftMode === 'lines' && heroState.hero.rightMode === 'words'],
  ['prima uno, poi l’altro — e RESTANO tutti e due',
    beat1.hero.untilLeft > 0.9 && beat1.hero.until < 0.05 &&
    untilState.hero.until > 0.9 && untilState.hero.untilLeft > 0.9 &&
    heroState.hero.untilLeft < 0.05],
  ['...e partono da soli allo scroll, non sono scrubbed parola per parola',
    heroState.untilQ < 0.02 && beat1.untilQ > 0.2 && untilState.untilQ > 0.6],
  ['la bowl in atto 2 è grande e inclinata',
    beat1.bowl.size > heroState.bowl.size * 1.2 && Math.abs(beat1.bowl.tilt) > 5 &&
    Math.abs(bowlHand.bowl.tilt) < 1],
  ['la bowl gira con lo scroll', Math.abs(bowlMid.bowl.spin - heroState.bowl.spin) > 0.2],
  ['la bowl si rimpicciolisce verso i tre step',
    bowlMid.bowl.size < beat1.bowl.size * 0.75 &&
    bowlHand.bowl.size < bowlMid.bowl.size * 0.9],
  ['alla consegna la bowl è al centro del viewport',
    Math.abs(bowlHand.bowl.at.x - 750) < 4 && Math.abs(bowlHand.bowl.at.y - 500) < 25],
  ['...e non cambia direzione di scatto fra crescere e rimpicciolire',
    BOWL_FALL_EASE === 'smooth' && bowlTurn.ratio < 0.4],
  // ── V2 — the ring act (keyboard 2) ───────────────────────────────────
  ['niente più banda sotto la navbar: lo sfondo è trasparente',
    v2Z.navBand === 0 && HERO_CFG.nav.fade === 0],
  ['2 e 1 cambiano versione dalla tastiera, e V1 torna identica',
    v2On.on && v2On.body && v2On.act === 'v2' &&
    v1Back.act === 'until' && v1Back.canvasFrom === 0 && !v1Back.canvasInB &&
    !v1Back.boxed && !v1Back.leftAHidden && v1Back.untilVh === 200 &&
    v1Back.ground === 'none' && v1Back.under === 'none' && v1Back.ringA === 0 &&
    v1BackBeats.untilLeft > 0.9 && v1BackBeats.until > 0.9],
  ['V1 non sa nemmeno che la V2 esiste: nessun layer, nessuno step spostato',
    v1Act.act === 'until' && v1Act.canvasFrom === 0 && !v1Act.canvasInB &&
    !v1Act.boxed && v1Act.ground === 'none' && v1Act.under === 'none' &&
    v1Act.steps.join() === 'One,Sphere,Pills,Users,Therapists,Research'],
  ['V2 rifà la FORMA della pagina: il ring act nel primo sticky, il canvas nel secondo',
    v2On.steps.join() === 'Guided,Experiences,Connecting,Users,Therapists,Research' &&
    v2On.canvasFrom === 3 && v2On.canvasInB && v2On.boxed && v2On.leftAHidden &&
    v2On.canvases === v1Act.canvases],
  ['il PRIMO ring che appare è di teachers, non di persone qualunque (sua richiesta) ' +
   '— risolto nella cartella dedicata della network, src/therapists/',
    v2On.rings[0].key === 'a' && v2On.rings[0].source === 'therapists' &&
    v2On.rings[1].source === 'experiences'],
  ['...e le card del ring restano PICCOLE come prima (sua correzione, 2026-09-17: ' +
   '"lascia stare"): la gerarchia che voleva è nella network, una sezione dopo',
    RING_CFG.a.card === 0.22 && RING_CFG.a.cardEnd === 0.12 &&
    RING_CFG.b.card === 0.24 && RING_CFG.b.cardEnd === 0.14 &&
    // ...e a fine atto poggiano sui loro `minRadius`, quindi le due mezze card
    // devono stare nei 0.80 − 0.68 che restano fra i due pavimenti
    (RING_CFG.a.cardEnd + RING_CFG.b.cardEnd) / 2 <= 0.13],
  ['nei TRE STEP invece — persone, terapisti, tecniche — la foto del terapista è ' +
   'nettamente la più grande (sua richiesta, "più grande... fatto bene"): 1.5× la persona',
    NET_CFG.dotTeacher / NET_CFG.dotUser >= 1.5 && NET_CFG.dotTeacher > NET_CFG.dotField * 4],
  ['prima di partire NIENTE è a schermo: opacità 0, non EXPO +100 visibile',
    v2Rest.top === 0 && v2Rest.bottom === 0 && v2Rest.until === 0 &&
    v2Rest.state.t === 0 && v2Rest.state.b === 0 && v2Rest.state.u === 0],
  ['reveal SUL POSTO, zero spostamento verticale: né in entrata né in uscita ' +
   '(l’uscita è un reverse, non una risalita)',
    v2Rest.dy === 0 &&                               // non è ancora entrata: y0
    v2Two[0].top > 0.9 && v2Two[0].topDy === 0 &&     // entrata: y0
    v2Two[1].top < 0.1 && v2Two[1].topDy === 0],      // uscita: y0, non risalita
  ['il primo esce, il terreno si apre, e il secondo arriva SOPRA il terreno',
    v2Two[0].ground.open < 0.05 && v2Two[1].top < 0.1 &&
    v2Two[2].ground.open > 0.9 && v2Two[2].bottom > 0.9 &&
    v2Two[2].botDy === 0 && v2Two[1].bottom < 0.1],
  ['"Until now" è OFF in V2 (`v2.until.show: false`, sua richiesta) — non si ' +
   'accende mai, in nessun punto dell’atto',
    v2Two.every((f) => f.until === 0)],
  ['il terreno si apre da DIETRO la bowl (layer 2) e la bowl NON scende mai',
    v2Z.ground === 2 && v2Z.ground < v2Z.bowl &&
    Math.abs(v2Two[2].ground.centre[0] - 0.5) < 0.08 &&
    v2Two.every((f) => Math.abs(f.bowl.at.x - 750) < 6 && Math.abs(f.bowl.at.y - 500) < 40)],
  [`quello che scopre sono le SUE tre immagini (${v2On.ground.loaded}), dietro il vetro`,
    v2On.ground.loaded === 3 && v2On.ground.tex && v2On.ground.glass &&
    spread(v2Two[2].px) > 24 &&                    // è una fotografia, non un colore
    spread(actAt(0.05).px) > 24 && spread(actAt(0.62).px) > 24],
  ['...una per step, e cambiano davvero da uno step all’altro',
    actAt(0.62).mix > 0.9 &&
    Math.max(...[0, 1, 2].map((c) =>
      Math.abs(actAt(0.05).px[0][c] - actAt(0.62).px[0][c]))) > 20 &&
    Math.max(...[0, 1, 2].map((c) =>
      Math.abs(actAt(0.25).px[0][c] - actAt(0.62).px[0][c]))) > 20],
  ['step 1: il ring delle persone; step 2: le experiences FUORI, giro opposto',
    actAt(0.05).rings[0].a > 0.9 && actAt(0.05).rings[1].a < 0.05 &&
    actAt(0.25).rings[0].a > 0.9 && actAt(0.25).rings[1].a > 0.9],
  ['...e tutti e due girano ATTORNO alla bowl: metà davanti, metà dietro',
    actAt(0.05).rings[0].front >= 3 && actAt(0.05).rings[0].behind >= 3 &&
    actAt(0.25).rings[1].front >= 3 && actAt(0.25).rings[1].behind >= 3],
  ['la CAMERA si avvicina davvero, step dopo step',
    actAt(0.05).dist > actAt(0.25).dist + 0.5 && actAt(0.25).dist > actAt(0.39).dist + 0.3],
  ['terzo step: la vista va SOPRA la bowl coi due ring ancora su...',
    actAt(0.39).bowl.tilt > 55 && actAt(0.05).bowl.tilt < 20 &&
    actAt(0.39).rings[0].n > 0 && actAt(0.39).rings[1].n > 0],
  ['...ed è GIÀ così ENTRANDO nello step 3, non ci arriva a metà step: la posa ' +
   'del prossimo step si raggiunge nella CODA di quello prima (best practice: ' +
   'nessun ritardo percepito al cambio sezione)',
    actAt(0.34).step === 1 && actAt(0.34).bowl.tilt > 60 && // ANCORA nello step 2...
    actAt(0.39).step === 2 && actAt(0.39).bowl.tilt > 75],    // ...ma già quasi/del tutto in posa
  ['...e poi se ne vanno tutti in stagger, e la sezione dopo se la prende',
    actAt(0.62).rings[0].a < 0.1 && actAt(0.62).rings[1].a < 0.1],
  ['i ring non toccano MAI la mesh — in nessun istante dell’atto (bloom, ' +
   'k-scrub o collasso finale) una card scende sotto il pavimento `minRadius`, ' +
   'misurato nel MONDO REALE (non sullo schermo) e con la distanza CAMERA ' +
   'dal vivo, perché la camera fa un dolly durante tutto l’atto',
    v2Act.every((x) => x.worldRmin === null || x.worldRmin >= RING_MIN_RADIUS - 0.01) &&
    // ...e il pavimento è davvero IN USO, non solo un numero che non conta
    // mai: da qualche parte nell’atto una card ci arriva vicinissima
    v2Act.some((x) => x.worldRmin !== null && x.worldRmin < RING_MIN_RADIUS + 0.03) &&
    // e all’inizio, prima che collasso o k-scrub li stringano, i ring sono
    // aperti ben oltre quel pavimento
    actAt(0.05).rings[0].maxR > 0.3],
  ['una riga per step, in alto a sinistra, una per volta',
    actAt(0.05).copy[0] > 0.9 && actAt(0.05).copy[1] < 0.1 &&
    actAt(0.25).copy[1] > 0.9 && actAt(0.25).copy[0] < 0.1 && actAt(0.39).copy[2] > 0.9],
  ['...tranne lo step 3, che non ha più copy propria (il "Connecting…" lo ' +
   'dice ormai una volta sola, nel pannello evidenze — sua richiesta, ' +
   '2026-09-16) — resta un puro beat di transizione: telecamera dall\'alto, ' +
   'i due ring che convergono e spariscono',
    v2ActStep3Text === ''],
  ['bowl e ground si SPENGONO del tutto quando la sezione copre il 100% del ' +
   'viewport (non solo invisibili: niente più draw call), e tornano scrollando su',
    cutoffCovered.bowlDisp === 'none' && cutoffCovered.groundDisp === 'none' &&
    cutoffCovered.bowlHidden && cutoffCovered.groundHidden &&
    cutoffCovered.bowlOpacity === 0 &&
    cutoffUncovered.bowlDisp !== 'none' &&
    !cutoffUncovered.bowlHidden && !cutoffUncovered.groundHidden &&
    cutoffUncovered.bowlOpacity > 0.9],
  ['in fondo c’è la sezione EVIDENZE, con la trust network sulla destra ' +
   '(spostata dall’angolo in basso a sinistra quando il paragrafo riassuntivo ' +
   'è arrivato lì, sua stessa richiesta)',
    v2Last.ev.on === 1 && v2Last.ev.title > 0.9 && v2Last.ev.labels.length === 3 &&
    v2Last.step >= 4 &&
    v2Last.netBox.x > v2Last.vw * 0.45 &&
    v2Last.netBox.w < v2Last.vw * 0.6 && v2Last.netBox.h < v2Last.vh * 0.75 &&
    v2Last.canvasHidden],
  ['la network sostituisce il box della sfera — stesso rettangolo, la sfera ' +
   'è hidden (getBoundingClientRect non è la prova, un box display:none è ' +
   'sempre 0×0: qui la prova è il rettangolo ATTESO dalle stesse % di canvasBox)',
    v2Last.network.on && v2Last.network.show && v2Last.canvasHidden &&
    Math.abs(v2Last.netBox.x - v2Last.vw * CANVAS_BOX.x / 100) < 3 &&
    Math.abs(v2Last.netBox.w - v2Last.vw * CANVAS_BOX.w / 100) < 3 &&
    Math.abs(v2Last.netBox.h - v2Last.vh * CANVAS_BOX.h / 100) < 3],
  ['il campo di punti neutri appare tutto insieme, presto, poi users → teachers → ' +
   'techniques si assegnano in ordine, mai uno avanti al suo ramp',
    // the field's OWN opacity is dimmed by depth and `fieldAlpha`, so it
    // never reads as 1 — the proof it "appears fast" is that it is ALREADY
    // at its resting value by the very first sample and never changes again
    netRows[0].fieldO > 0 && netRows[0].fieldO === netRows[4].fieldO &&
    netRows[0].userO > 0 && netRows[0].teachO === 0 && netRows[0].pillO === 0 &&
    netRows[1].userO === 1 && netRows[1].teachO > 0 && netRows[1].teachO < 1 &&
    netRows[2].teachO === 1 && netRows[2].pillO === 0 &&
    netRows[3].pillO > 0 && netRows[3].pillO < 1 &&
    netRows[4].userO === 1 && netRows[4].teachO === 1],
  ['i connettori si DISEGNANO (stroke-dashoffset), non solo appaiono',
    netRows[1].lineUT > 0 && netRows[1].lineUT < 1 &&
    netRows[3].lineTT > 0 && netRows[3].lineTT < 1],
  ['più persone, più terapisti, e soprattutto più techniques, dal dataset reale: ' +
   `campo ${netStruct.fieldCount}, users ${netStruct.peopleCount}, teachers ${netStruct.teacherCount}, ` +
   `techniques ${netStruct.techniqueCount} — ${netStruct.labels.join(', ')}`,
    netStruct.fieldCount === NET_CFG.field &&
    netStruct.peopleCount === NET_CFG.people && netStruct.teacherCount === NET_CFG.teacher &&
    netStruct.techniqueCount === NET_CFG.technique &&
    netStruct.techniqueCount > netStruct.teacherCount &&
    netStruct.labelsUnique && netStruct.labels.every((l) => typeof l === 'string' && l.length > 0)],
  ['ogni foto ha una URL vera, ogni pill una larghezza vera (niente 0px da un getBBox in corsa)',
    netStruct.imageCount > 0 && netStruct.allImagesResolved &&
    netStruct.rectCount === netStruct.labels.length && netStruct.rectsPositive],
  ['tutti i punti stanno DENTRO il box — niente fughe fuori dall’angolo',
    netStruct.inBox],
  ['nessuna pill si sovrappone a un\'altra — separate PRIMA di essere disegnate',
    netStruct.overlaps === 0],
  ['il "mondo": le techniques raggiungono più lontano della shell della sfera stessa ' +
   '— il fan si allarga davvero, non solo il conteggio',
    netStruct.spreadTech > netStruct.spreadUser && netStruct.spreadTech > netStruct.spreadTeacher],
  ['V1 non la vede nemmeno: la network è display:none, il box della sfera torna',
    netV1.hidden && netV1.display === 'none' && !netV1.canvasHidden],
  ['`network.show: false` è la via d’uscita: la sfera torna a disegnare nello stesso box',
    !sphereFallback.canvasHidden && sphereFallback.canvasOn &&
    sphereFallback.introV > 0.95 &&
    sphereFallback.cardsVisible >= 12 && sphereFallback.cardsTextured >= 12 &&
    sphereFallback.netHidden],
  // ── the three steps ──────────────────────────────────────────────────
  ['la bowl resta e gira per tutti e tre gli step...',
    sStep1.bowl.opacity > 0.9 && sPills.bowl.opacity > 0.9 &&
    Math.abs(sSphere.bowl.spin - sStep1.bowl.spin) > 0.1],
  ['...e fino a lì tiene il centro esatto del viewport',
    [sStep1, sSphere, sPills, sEndA].every(
      (s) => Math.abs(s.bowl.at.x - 750) < 3 && Math.abs(s.bowl.at.y - 500) < 3
    )],
  [`${boot.left.images} foto di sezione in src/values`, boot.left.images >= 3],
  ['una foto per step, in ordine, con crossfade',
    sStep1.left.alphas[0] > 0.9 && sMid2.left.alphas[1] > 0.9 && sPills.left.alphas[2] > 0.9 &&
    sHand.left.alphas[0] > 0 && sHand.left.alphas[1] > 0],
  ['la card a sinistra è più piccola, e la copy con lei',
    s0.left.card.w < 750 * 0.68 && s0.left.card.h < 1000 * 0.5 &&
    expoOk.size <= 22 && s0.copyAlpha[0] > 0.9],
  ['il pannello è un vero squircle, non un round-rect',
    boot.left.glass.clip.startsWith('path(') && boot.left.bulge > 2],
  // perf pass (2026-09-17): the card is solid white, so a backdrop-filter under
  // it was computed and then completely covered — the glass lives in the frost
  ['la card è PIENA, quindi nessun backdrop sprecato sotto di lei: il glass vive nel frost dietro',
    boot.left.glass.solid && boot.left.glass.backdrop === '' &&
    (!boot.left.glass.frostOn || boot.left.glass.frostBackdrop !== '')],
  ['card squircle anche sulle foto 3D', boot.cornerN >= 3],
  ['la colonna non si apre mai: il canvas tiene la metà destra',
    [sStep1, sSphere, sPills].every((s) => Math.round(s.leftWidth) === 750)],
  ['la card bianca è QUADRATA',
    cfgClean.square && Math.abs(s0.left.card.w - s0.left.card.h) <= 1 &&
    s0.left.card.w > 200],
  ['la sfera comincia ad assemblarsi DENTRO lo step 1, non allo step 2',
    s0.asm === 0 && sHand.step === 0 && sHand.asm > 0.2 && sHand.asm < 0.9 &&
    sAsm.asm > 0.6],
  ['le pills escono appena arrivo sulla sezione Pills',
    CFG_PILL_START === 0 && sPills.pill > 0.5],
  ['il testo dell’ultimo step NON se ne va: resta fino a fine sezione',
    cfgClean.lastTextOut === 0 && sEndA.copyAlpha[2] > 0.95 &&
    sHeld3.copyAlpha[2] > 0.95],
  ['...e la sfera non smette di girare quando la sezione finisce',
    sHeld1.spin > sEndA.spin + 0.2 && sHeld3.spin > sHeld1.spin + 0.2],
  ['la prima immagine che vediamo è più piccola di prima',
    Math.abs(c0.x - c0.wantX) < 3 && Math.abs(c0.y - c0.wantY) < 3],
  ['le pills sono le CATEGORIE di insighttimer.com/techniques',
    boot.pillLabels[0] === 'Mindfulness' && boot.pillLabels.includes('Breathwork') &&
    boot.pills === CONFIG_COUNT],
  ['step 3: le pills sono nella sfera, in stagger',
    sPills.pill > 0.5 && sPills.pillProbe.first > 0.9 && sSphere.pillProbe.visible === 0],
  // ── the cleanup ──────────────────────────────────────────────────────
  ['niente più techniques, spread, rete o closing statement in pagina...',
    layout.noMap],
  ['#below ora è SOLO la sezione team, altezza naturale non forzata',
    layout.belowHasOnlyTeam && layout.belowAuto],
  // ── the evidence panel ───────────────────────────────────────────────
  ['statement in alto, i tre step in RIGA sotto, il riassunto in basso — ' +
   'tutti a sinistra, liberi dalla bowl',
    layout.evInB && evLayout.inB && evLayout.clearsNav && evLayout.rowed &&
    evLayout.rails && evLayout.titleLeft && evLayout.rowsLeft &&
    evLayout.summaryBottomLeft &&
    evLayout.clearOfBowl && sHeld1.left.ev.on > 0.95],
  ['il titolone è GIÀ VISIBILE appena la sezione esiste (nessuno scroll-trigger, ' +
   'nessuno stagger — 1 fin dal primissimo frame), in posizione (nessun rise)',
    sHeld1.left.ev.titleRise === 0 &&
    sHeld1.left.ev.titleY.every((y) => y === 0) &&
    evFire.titleEarly > 0.95 && evFire.titleLate > 0.95],
  ['...ed è invece il RIASSUNTO in basso che si accende allo scroll, riga per riga',
    evFire.before < 0.05 && evFire.after > 0.95 &&
    // mid-flight the four lines are at different opacities: a real stagger
    new Set(evFire.lines).size >= 3 &&
    evFire.lines[0] > evFire.lines[evFire.lines.length - 1]],
  ['...e i tre punti sono quelli giusti',
    sHeld1.left.ev.labels.join('|') ===
      'Reporting from users|Reporting from therapists|Clinical research'],
  ['una barra si completa per step, in ordine',
    sHeld1.left.ev.bars[0] > 0.6 && sHeld1.left.ev.bars[1] === 0 &&
    sHeld2.left.ev.bars[0] === 1 && sHeld2.left.ev.bars[1] > 0.7 &&
    sHeld3.left.ev.bars[2] > 0.6],
  ['ogni punto mostra il suo paragrafo quando è il suo turno',
    sHeld1.left.ev.paras[0] > 0.9 && sHeld1.left.ev.paras[1] < 0.05 &&
    sHeld2.left.ev.paras[1] > 0.9 && sHeld3.left.ev.paras[2] > 0.9],
  ['...né in config',
    cfgClean.keys.length === 0 && cfgClean.pillKeys.length === 0],
  // ── the last section: Atlas ──────────────────────────────────────────
  ['la sezione arriva NORMALE da sotto: il canvas sale dentro il suo stage',
    layout.canvasInStage && layout.canvasPos === 'absolute' &&
    arrive.every((a) => Math.abs(a.canvas - a.section) < 2 &&
                        Math.abs(a.col - a.section) < 2) &&
    arrive[0].section > 600 && arrive[arrive.length - 1].section < 2],
  ['i tre step del secondo sticky sono tornati, sullo stesso identico clock',
    cfgClean.steps === 6 && cfgClean.canvasSteps === 3 &&
    layout.heldSolid &&
    sHeld1.step === 3 && sHeld3.step === 5 &&
    Math.abs(layout.geom.a - (100 + 520)) <= 1 &&
    // riseAt measured with the Atlas ON, above — #pinC is `hidden` by
    // default now (his ask, 2026-09-16), and a hidden element's offsetTop
    // is 0, which would make this assertion meaningless
    Math.abs(riseAtOn - boot.pinVh) <= 2],
  ['...e la sezione che collassa arriva SOLO DOPO di loro, senza ombra',
    collapse.every((c) => Math.abs(c.held) < 2) &&
    collapse[0].atlas > 700 && collapse[collapse.length - 1].atlas < 2 &&
    collapse[0].atlas > collapse[1].atlas && collapse[1].atlas > collapse[2].atlas &&
    layout.stageCSolid && collapse[0].z > 3 &&
    !cfgClean.shadow && collapse.every((c) => c.shadow === 'none')],
  ['la corsa della bowl finisce con l’atto due: nel pin non scala MAI più',
    [s0, sStep1, sSphere, sPills, sEndA].every(
      (s) => s.bowl.opacity > 0.9 &&
             Math.abs(s.bowl.size - CONFIG_PIN_SIZE) < 0.001 &&
             Math.abs(s.bowl.at.x - 750) < 3 && Math.abs(s.bowl.at.y - 500) < 3
    )],
  ['...e il suo ULTIMO fotogramma è l’ultimo della sezione canvas',
    // fully there to the end of step 3, gone by the step after it — and it is
    // not faded away, the section rising over it simply COVERS it
    sEndA.bowl.opacity > 0.9 && cover.z.held > cover.z.bowl &&
    cover.during.some((c) => c.bowl > 0.9 && c.heldTop < 900 && c.heldTop > 0) &&
    [sHeld1, sHeld2, sHeld3].every((s) => s.bowl.opacity < 0.02) &&
    // ...and coming back up it is there again, in exactly the same place
    cover.back.opacity > 0.9 &&
    Math.abs(cover.back.at.x - 750) < 3 && Math.abs(cover.back.at.y - 500) < 3],
  ['il modello è BOWL_OPTION C: una mesh sola, RISEPARATA nei suoi due gusci',
    bowlModel.source === 'glb' && bowlModel.shells.join('') === 'AB' &&
    bowlModel.tris > 2e6 && bowlModel.shared &&
    // roughly half the triangles each: it really is a hollow solid
    Math.abs(bowlModel.split[0] - bowlModel.split[1]) < bowlModel.tris * 0.1 &&
    /outside/.test(bowlModel.names[0]) && /inside/.test(bowlModel.names[1])],
  ['...così l’esterno porta il rilievo e l’interno il suo ramp di colore',
    bowlModel.reliefOn && bowlModel.innerRamp],
  ['il rilievo è una TEXTURE vera, non noise campionato per pixel',
    bowlModel.reliefSource === 'image' && bowlModel.reliefOn &&
    bowlModel.bound.normalMap && !bowlModel.bound.procedural &&
    bowlModel.bound.normalScale > 0 && bowlModel.bound.tiling > 1 &&
    bowlModel.reliefMap.map === 'bowl-normal.webp' &&
    bowlModel.reliefMap.kind === 'normal'],
  ['...e posso caricarci la mia immagine, che si classifica da sola',
    upload.after.name === 'bowl.png' && upload.after.kind === 'height' &&
    upload.after.bump && !upload.after.normal && upload.after.info.custom &&
    // ...e si torna indietro
    upload.back.custom === false && upload.back.map === 'bowl-normal.webp'],
  ['la vecchia martellatura procedurale è ancora lì, a uno switch di distanza',
    bowlModel.relief.type === 'Voronoi 1'],
  [`ambiente: ${bowlModel.hdr.loaded}/${bowlModel.hdr.files.length} HDR caricati` +
    (bowlModel.hdr.active ? '' : ' → rig a pannelli (fallback)'),
    bowlModel.hdr.active
      ? bowlModel.hdr.loaded === bowlModel.hdr.files.length
      : bowlModel.hdr.loaded === 0],
  ['...e in ogni caso l’ambiente agisce solo sul 3D, mai sullo sfondo',
    bowlModel.noBackground],
  ['...e se ne va solo sotto l’Atlas, che la copre comunque',
    collapse[collapse.length - 1].bowl < 0.02 &&
    a1.bowl.opacity < 0.02 && a3.bowl.opacity < 0.02],
  ['lo stagger di atto 2 è vero: le righe sono a punti diversi del loro viaggio',
    new Set(a2Stagger.lines).size >= 3 &&
    a2Stagger.lines[0] < a2Stagger.lines[a2Stagger.lines.length - 1] &&
    a2Stagger.words.length === 2],
  ['Atlas: il segno si disegna con lo scroll, dal vuoto al nodo chiuso',
    a0.atlas.cards.every((c) => c < 0.05) &&
    a1.atlas.front > a0.atlas.front && a2.atlas.front > a1.atlas.front &&
    a3.atlas.front > a2.atlas.front && a3.atlas.seal > 0.95],
  ['...ancorato a un incrocio, così i due capi non si vedono mai',
    a3.atlas.crossings >= 3 &&
    Math.min(...preset.reveal ? [Math.abs(a3.atlas.anchor - preset.reveal.anchor)] : [1]) < 0.01],
  ['le tre card arrivano UNA PER LOBO, nell’ordine in cui il fronte le raggiunge',
    a1.atlas.cards[0] > 0.9 && a1.atlas.cards[2] < 0.05 &&
    a2.atlas.cards[1] > 0.9 && a3.atlas.cards.every((c) => c > 0.95)],
  ['...con i numeri e la riga di richiamo al proprio vertice',
    atlasCards.titles.join('|') === 'The library and the science|Members|Therapists' &&
    atlasCards.stats[0].join(',') === '26,000,350,000,970' &&
    atlasCards.leaders && atlasCards.inFrame && atlasCards.clearOfNav],
  ['il titolo sopra il segno: testo vero, già dov’è (nessun transform), opaco ' +
   'a mark chiuso, e le card non gli atterrano mai sopra',
    atlasTitle.heading.replace(/\s+/g, ' ').includes('Bringing this data') &&
    atlasTitle.sub.includes('map of how wellbeing') &&
    atlasTitle.hOpacity > 0.95 && atlasTitle.subOpacity > 0.95 &&
    atlasTitle.cardsClearTitle],
  ['lo sketch 2D sopra il titolo MORFA da cerchio a curva a 3 lobi, una volta, ' +
   'sulla stessa rampa del titolo — e rientrando nella sezione riprende ESATTAMENTE ' +
   'dallo stato finale, non da capo',
    sketchStart.t < 0.05 && sketchMid.t > 0.1 && sketchMid.t < 0.9 && sketchEnd.t > 0.95 &&
    sketchStart.d !== sketchMid.d && sketchMid.d !== sketchEnd.d &&
    sketchEnd.d === sketchReplay.d && sketchEnd.opacity > 0.95],
  ['passandoci sopra, quel tratto di banda prende il colore della card',
    beforeHover < 0.02 && hover.index === 0 && hover.amount > 0.9 &&
    hover.colour.toLowerCase() === atlasCards.accents[0].trim().toLowerCase()],
  ['il preset è quello che mi ha dato lui (src/atlas/preset.json)',
    preset.curve.type === 'harmonic' && preset.curve.lobes === 3 &&
    preset.section.shape === 'superellipse' && preset.scene.background === '#EEE9E2' &&
    preset.cards.items.length === 3 && ATLAS_CFG.vh >= 300],
  ['il fondo della sezione Atlas è quello del preset, DOM e canvas d’accordo',
    layout.atlasGround === 'rgb(238, 233, 226)'],
  // ── the frame ────────────────────────────────────────────────────────
  ['tre sticky in fila, il canvas dentro il primo',
    layout.threeSections && layout.canvasInStage],
  ['fondo pagina FAF9F2, il canvas è l’unico bianco',
    layout.pageBg === 'rgb(250, 249, 242)'],
  ['il paragrafo hero sta nell’angolo in basso a sinistra', layout.heroParaCorner],
  ['tornando su, il ritratto iniziale torna ESATTAMENTE al centro',
    Math.abs(sBack.heroAt.x - sBack.heroAt.wantX) < 1 &&
    Math.abs(sBack.heroAt.y - sBack.heroAt.wantY) < 1 &&
    Math.abs(sBack.tumble.x) < 1e-3 && Math.abs(sBack.tumble.y) < 1e-3],
  ['la card bianca è piena: il glass sta dietro, non sulla card',
    layout.glassAlpha > 0.99 && layout.frostShown && layout.glassBehindCard &&
    /^(url\(|blur\()/.test(layout.frostBlur)],
  ['il glass prende TUTTA la colonna di sinistra, non solo un riquadro',
    layout.glassFull],
  // ── the player + the scroll bar, in place of the old deck (2026-09-17) ──
  ['il mazzo di video card è SPARITO dalla hero — al suo posto il player, fixed in ' +
   'basso a DESTRA (sua richiesta, 2026-09-17), la foto di Christopher a sinistra ' +
   'dentro la barra (lo stesso file del team)',
    deckGone === 0 && playerBoot.position === 'fixed' &&
    playerBoot.side === 'right' && playerBoot.rightGap < 120 &&
    playerBoot.left > 600 && playerBoot.bottomGap < 120 &&
    /Christopher/.test(playerBoot.photo) && playerBoot.name === 'Christopher Plowman'],
  ['...e il paragrafo della hero si riprende l\'angolo in basso a SINISTRA, sul ' +
   'padding della sezione (4vw), non più scostato per far posto alla barra',
    layout.heroParaCorner && Math.abs(heroPara.left - innerWidthPx * 0.04) < 2 &&
    heroPara.bottomGap < innerHeightPx * 0.09],
  ['raggi CONCENTRICI (sua richiesta, "calcolala tu"): barra 20px, foto 6px dentro → 14px',
    playerBoot.radius === '20px' && playerBoot.pad === '6px' && playerBoot.photoRadius === '14px'],
  ['sfondo GLASS: bianco a ~26%, backdrop blur, bevel in alto — non una card piena',
    playerBoot.glass.on && /rgba\(255, 255, 255, 0\.2[4-8]/.test(playerBoot.glass.bg) &&
    /blur\(/.test(playerBoot.glass.backdrop)],
  ['senza un file in src/media la label lo DICE ("Audio coming soon") — ma il FAKE player ' +
   '(sua richiesta) risponde: un click fa partire l\'equalizzatore, un altro lo ferma; ' +
   'niente audio che non sia il suo viene mai suonato',
    playerBoot.hasSource === false && playerBoot.fake === true && playerBoot.disabled === false &&
    playerBoot.label === 'Audio coming soon' &&
    playerAfterClick.playing === true && playerAfterClick.icon === 'Pause' &&
    playerAfterPause.playing === false && playerAfterPause.icon === 'Play'],
  ['il player segue lo scroll solo fino alla sezione dei tre step: lì scivola giù e si ' +
   'parcheggia (park 0 nella hero, 1 in fondo alla pagina), e torna risalendo',
    playerBoot.park === 0 && playerParked.park > 0.95],
  // ── lo STROKE è la linea del tempo (sua richiesta, 2026-09-17) ─────────
  ['la vecchia lineetta dentro la barra NON c\'è più ("sembra un errore di codice"): ' +
   'al suo posto il bordo stesso, un unico contorno disegnato due volte — traccia + progresso',
    playerBoot.stroke.innerBar === 0 && playerBoot.stroke.border === '0px' &&
    playerBoot.stroke.len > 400 && playerBoot.stroke.width === '1.5px'],
  ['...e si COMPONE attorno al componente mentre suona: a riposo non è disegnato nulla, ' +
   'dopo un po\' di riproduzione una frazione del contorno c\'è, e cresce',
    playerBoot.stroke.drawn === 0 && playerBoot.stroke.dash.startsWith('0') &&
    playerAfterClick.stroke.drawn > 0 && playerAfterClick.stroke.drawn < 0.5 &&
    playerAfterPause.stroke.drawn >= playerAfterClick.stroke.drawn],
  ['il contorno è NERO sulla pagina bianca e BIANCO sopra lo shader (sua richiesta), ' +
   'traccia compresa — niente bordo CSS da tenere in sincrono',
    playerBoot.stroke.color === 'rgb(10, 10, 10)' &&
    /rgba\(10, 10, 10/.test(playerBoot.stroke.track) &&
    playerOnGround.isGround === true &&
    playerOnGround.stroke.color === 'rgb(255, 255, 255)' &&
    /rgba\(255, 255, 255/.test(playerOnGround.stroke.track)],
  ['la barra è più ALTA (sua richiesta, "senza che sia tutto bello compatto") e ' +
   'l\'equalizzatore è passato SOTTO il nome, non più di fianco',
    playerBoot.layout.h === 84 && playerBoot.layout.textTop < 20 &&
    playerBoot.layout.waveTop > playerBoot.layout.textTop + 30 &&
    playerBoot.layout.waveBottomGap < 16],
  ['...e spegnendo l\'equalizzatore dal pannello il nome torna CENTRATO sulla foto, ' +
   'invece di restare in cima alla colonna che divideva con lui',
    playerNoWave.before < -8 && playerNoWave.hidden.cls === true &&
    Math.abs(playerNoWave.hidden.off) < 2 && playerNoWave.after < -8],
  ['il footer: logo a TUTTA larghezza, padding sotto uguale ai lati (3vw) — niente più fascia alta',
    footerProbe.wordWidthRatio > 0.85 && Math.abs(footerProbe.paddingBottom - innerWidthPx * 0.03) < 1.5],
  ['...e copre TUTTA l\'altezza del viewport (sua richiesta, 2026-09-17: prima restava ' +
   '"una parte scoperta sopra"), con le colonne sotto la nav e un vero gap prima del logo',
    footerProbe.fullHeight && footerProbe.top <= 1 &&
    footerProbe.colsTop > 40 && footerProbe.wordGap > 80],
  ['l\'equalizzatore: pillole in fila orizzontale che crescono e si ritraggono DAL CENTRO ' +
   '(align center) — ferme a riposo, aperte mentre suona, di nuovo ferme in pausa',
    playerBoot.wave.bars === 22 && playerBoot.wave.align === 'center' &&
    playerBoot.wave.spread < 1 && playerAfterClick.wave.spread > 6 && playerAfterPause.wave.spread < 1.5],
  // ── si richiude scrollando (sua richiesta, 2026-09-17) ────────────────
  ['scrollando GIÙ la barra si richiude su foto + play — le lettere se ne vanno ' +
   'e resta una pillola larga quanto i due — e scrollando SU si riapre',
    pCol.open.v === 0 && pCol.open.lit === pCol.open.chars && pCol.open.chars > 20 &&
    pCol.closed.v === 1 && pCol.closed.lit === 0 &&
    pCol.closed.w < pCol.open.w * 0.62 && pCol.reopened.v === 0 &&
    pCol.reopened.lit === pCol.reopened.chars],
  ['...e da chiusa l\'estremità destra è un semicerchio CONCENTRICO al bottone play ' +
   '("che calza a pennello"), non un raggio a caso',
    pCol.closed.btnMid === pCol.closed.capMid &&
    /20px 42px 42px 20px/.test(pCol.closed.radii)],
  ['niente più sollevamento in Y sull\'hover (sua richiesta): passandoci sopra si APRE, ' +
   'e uscendo torna esattamente come lo scroll l\'aveva lasciata',
    pCol.rest.transform === 'none' && pCol.hoverOpen.v === 0 &&
    pCol.afterLeave.v === 1 && pCol.afterLeave.w === pCol.closed.w],
  ['la scroll bar: invisibile prima del clock del canvas, a metà è mezza piena e accesa, ' +
   'e dopo la fine è di nuovo sparita — 4px, bianca, in basso',
    barTop.alpha === 0 && barMid.value > 0.45 && barMid.value < 0.55 && barMid.alpha > 0.99 &&
    barAfter.alpha < 0.05 && barTop.height === 4 && barTop.color === 'rgb(255, 255, 255)'],
  // ── the ring act's own background + the bowl's exit (2026-09-17) ────────
  ['ring act: un colore per step — verde, arancione, blu — e il campo li attraversa ' +
   'davvero (tre colori distinti letti dallo shader)',
    ACT_BG.colors.length === 3 && actBg0.colorA !== actBg1.colorA &&
    actBg1.colorA !== actBg2.colorA && actBg0.colorA !== actBg2.colorA],
  ['...con il parallax sulle FOTO (sua correzione: "ad ora non vedo nulla"): la ' +
   'foto è zoomata per avere margine e fa pan dall\'ALTO verso il BASSO lungo l\'atto — ' +
   'un solo pan condiviso dalle due immagini in crossfade',
    actBg0.zoom > 1.2 && actBg0.pan > actBg1.pan && actBg1.pan > actBg2.pan &&
    actBg0.pan > 0 && actBgEnd.pan < 0],
  ['...usando TUTTA l\'altezza delle foto (quadrate su uno schermo 3:2: un terzo è già fuori ' +
   'dal cover) — la stanza per il pan è ben oltre quella del solo zoom, "più raggio per scrollare"',
    actBg0.room > 0.2 && Math.abs(actBg0.pan) <= actBg0.room + 1e-3 && Math.abs(actBgEnd.pan) <= actBgEnd.room + 1e-3],
  ['...e la foto sta GIÀ scendendo in atto due, appena il terreno si apre',
    panEarly.on && panLate.pan < panEarly.pan - 0.01 && panEarly.pan < panEarly.room - 1e-3],
  ['...e NON si ferma MAI, dall\'apertura del terreno al fotogramma prima della copertura — ' +
   'run-in e hand-over compresi (13 campioni, ognuno più basso del precedente)',
    panRun.length === 13 && panRun.every((v, i) => i === 0 || v < panRun[i - 1] - 1e-4) &&
    panRun[0] > 0 && panRun[12] < 0],
  ['i ring sentono la FORZA dello scroll: fermi → nessuna spinta; un colpo di 700px → la ' +
   'rotazione accelera; un attimo dopo la spinta è di nuovo a zero (smorzata, mai accumulata)',
    ringForce.still < 0.05 && Math.abs(ringForce.vStill) < 40 && ringForce.moving > 0.3 &&
    Math.abs(ringForce.vMoving) > 200 && ringForce.settled < 0.05],
  ['risalendo sopra il suo mark il ring ESCE come è entrato — in stagger, ultima card per ' +
   'prima — non sparisce di colpo: a metà uscita alcune card sono già via e altre ancora ' +
   'piene, poi tutto a zero',
    ringForce.aBefore > 0.9 && ringForce.leavingMax > 0.6 && ringForce.leavingMin < 0.4 &&
    ringForce.aGone < 0.02],
  ['il ring interno e le activities sono più larghi (toccavano la texture): 0.9 / 1.42, con i ' +
   'pavimenti alzati con loro',
    RING_CFG.a.radius >= 0.9 && RING_CFG.a.minRadius >= 0.68 && RING_CFG.b.radius >= 1.4 &&
    RING_CFG.b.minRadius >= 0.8],
  ['la search bar è glass leggero: bianco a ~55% con backdrop blur, la UI sotto si vede passare',
    /rgba\(255, 255, 255, 0\.5[3-7]/.test(searchGlass.bg) && /blur\(/.test(searchGlass.backdrop)],
  ['...e la bowl AFFONDA mentre i ring se ne vanno, e NON si ferma in basso ("si blocca senza ' +
   'senso"): ancora più giù dentro il hand-over di quanto fosse a fine step 3',
    actBgEnd.actP > 0.9 && actBgEnd.bowlY < actBg1.bowlY - 0.1 &&
    actBgThrough.bowlY < actBgEnd.bowlY - 0.01],
  ['la sezione dei tre step sale MOLTO prima (sua richiesta): a 0.95 dell\'atto il suo bordo ' +
   'alto è già dentro il viewport mentre la bowl, ancora visibile, sta scendendo — ' +
   'pinB anticipato di 90vh, pagina e clock immutati',
    earlyRise.early === 90 && earlyRise.pinBTop < earlyRise.vh && earlyRise.pinBTop > 0 &&
    earlyRise.bowlOpacity > 0.9],
  ['sopra lo shader il player diventa BIANCO: testo bianco, bottone bianco, vetro scuro',
    earlyRise.ground === true && earlyRise.playerColor === 'rgb(255, 255, 255)' &&
    earlyRise.btnBg === 'rgb(255, 255, 255)' && /rgba\(255, 255, 255, 0\.1[0-4]/.test(earlyRise.playerBg)],
  ['C fa sparire tutto: pannelli, marker e legenda',
    cleanState.clean && cleanState.panels && cleanState.markers && cleanState.legend],
  ['glass surface: filtro SVG di displacement, non una blur',
    glassOk.supported && /^url\(/.test(glassOk.filter) && glassOk.svg &&
    new Set(glassOk.channels).size === 3],
  [`${boot.photos} ritratti da src/photos`, boot.photos >= 12],
  ['il canvas è full bleed, il pannello ci sta sopra',
    Math.round(boot.canvasWidth) === 1500 && Math.round(boot.leftWidth) === 750],
  ['step 1: il ritratto è già lì, niente reveal in height', s0.intro > 0.99 && s0.asm === 0],
  ['copy in place: zero spostamento, zero blur',
    /^translate3d\(0px,\s*-?0(\.0+)?em/.test(expoOk.transform) &&
    (expoOk.filter === '' || expoOk.filter === 'none')],
  ['EXPO parte da +100 e riposa a 0', /"EXPO"/.test(expoOk.fvs) && CONFIG_EXPO_REST === 0],
  ['handover: copy 1 esce mentre copy 2 entra', sHand.copyAlpha[0] > 0 && sHand.copyAlpha[1] > 0],
  ['step 2: sfera completa in fondo allo step', sSphere.asm === 1],
  ['drag orizzontale gira la sfera', Math.abs(afterX.y - before.y) > 0.05],
  ['drag verticale gira la sfera anche in X', Math.abs(afterY.x - afterX.x) > 0.05],
  ['il pannello scrolla da solo, la pagina no',
    panelScroll.prevented && panelInfo.scrollable && panelScroll.top > 40 &&
    Math.abs(panelScroll.pageY - pageYBefore) < 30],
  // ── "The Great Team Behind" — TWO grids, always both up, no switch button
  //    (his correction, 2026-09-16) ───────────────────────────────────────
  ['12 nomi e ruoli del team — Christopher Plowman è TORNATO in testa (indice 0), ' +
   'restando ANCHE nei Partners: una duplicazione voluta, non un bug',
    teamBoot.team.count === 12 && teamBoot.team.names[0] === 'Christopher Plowman' &&
    teamBoot.team.roles[0] === '' && teamBoot.team.names[1] === 'Chris Mcelhill' &&
    teamBoot.team.names.every((n) => n.length > 0) && new Set(teamBoot.team.names).size === 12],
  ['12 foto vere per NOME nel team, incluso Patrick Orlando — nessun placeholder',
    teamBoot.team.placeholders === 0],
  ['i Partners sono la SECONDA griglia sulla stessa pagina, sempre visibile — ' +
   '6 persone, Christopher incluso, con i ruoli/fondi giusti (come nello screenshot)',
    teamBoot.partners.count === 6 &&
    JSON.stringify(teamBoot.partners.names) === JSON.stringify(
      ['Bo Shao', 'Christopher Plowman', 'Gretel Packer', 'Anthony Lee', 'Zack Lynch', 'Charlie Hartwell']) &&
    teamBoot.partners.roles[0] === 'Evolve Ventures' && teamBoot.partners.roles[3] === 'Altos Ventures' &&
    teamBoot.partners.roles[4] === 'Jazz Ventures' && teamBoot.partners.roles[5] === 'Bridge Builders' &&
    teamBoot.partners.roles[1] === '' && teamBoot.partners.roles[2] === '' &&
    teamBoot.partners.placeholders === 0],
  ['NIENTE tab/switch button — le due griglie stanno l\'una sotto l\'altra, ' +
   'sempre entrambe presenti',
    teamColours.switchButtons === 0 && teamColours.gridCount === 2],
  ['il titolo va a capo — "The Great" poi "Team Behind" — con un vero <br>, non uno spazio',
    teamColours.titleHTML.includes('<br>') && teamBoot.title === 'The Great\nTeam Behind'],
  ['la label "Partners" sopra la seconda griglia',
    teamBoot.sublabel === 'Partners'],
  ['le card arrivano FILA PER FILA allo scroll (opacità 0 → 1, y 100 → 0, in stagger) — ' +
   '3 file trovate dalla loro posizione reale, tutte e 3 giocate anche dopo un SALTO ' +
   'dritto in fondo alla pagina, nessuna lasciata a opacità 0',
    teamReveal.rows === 3 && teamReveal.revealed === 3 &&
    teamReveal.firstOpacity > 0.99 && teamReveal.lastOpacity > 0.99 &&
    teamReveal.revealCfg.y === 100 && teamReveal.revealCfg.on === true],
  ['sfondo bianco, titolo nero, sottotitolo grigio — i suoi colori esatti (invertiti dal nero, sua richiesta)',
    teamColours.bg === 'rgb(255, 255, 255)' && teamColours.titleColor === 'rgb(10, 10, 10)' &&
    /166,\s*166,\s*166/.test(teamColours.descColor)],
  ['il tooltip SEGUE il cursore — scala da 0, poi mostra nome bianco + ruolo grigio (griglia team)',
    teamHoverA.tooltipVisible && teamHoverA.tooltipName === 'Christopher Plowman' &&
    teamHoverA.scale !== 'none'],
  ['spostandosi su un\'altra card SENZA uscire dalla grid, il testo si aggiorna (roll), non sparisce',
    teamHoverB.tooltipVisible && teamHoverB.tooltipName === 'Maddy Gerrard' &&
    teamHoverB.tooltipRole === 'Head of Teacher Engagement'],
  ['uscendo dalla grid il tooltip si richiude',
    !teamAfterLeave.tooltipVisible],
  ['il tooltip funziona anche sulla griglia Partners, senza toccare quella del team',
    partnersHover.tooltipVisible && partnersHover.tooltipName === 'Bo Shao' &&
    partnersHover.tooltipRole === 'Evolve Ventures'],
  // ── the new footer (his reference, 2026-09-16) ──────────────────────────
  ['il footer ha le 3 colonne di link vere (Browse 15, Resources 12, Company 8), ' +
   'trascritte dal suo screenshot',
    footerProbe.cols.length === 3 && footerProbe.cols[0].title === 'Browse' && footerProbe.cols[0].count === 15 &&
    footerProbe.cols[1].title === 'Resources' && footerProbe.cols[1].count === 12 &&
    footerProbe.cols[2].title === 'Company' && footerProbe.cols[2].count === 7 &&
    // "Blog" era doppio nel suo screenshot — trascritto fedelmente, sembrava
    // un bug perché lo è (sua correzione, 2026-09-17)
    footerProbe.companyLinks.filter((l) => l === 'Blog').length === 1],
  ['le voci del footer stanno in secondo piano (opacità .65) e vengono avanti ' +
   'solo quella su cui punti (sua richiesta, 2026-09-17)',
    Math.abs(footerLinks.rest - 0.5) < 0.02 && footerLinks.hover > 0.98],
  ['...e il footer è alleggerito (sua richiesta, "è molto pesante"): via la FOTO ' +
   'della bowl, e Browse e Resources su DUE colonne ciascuno invece di un muro',
    footerProbe.bowl === 0 && JSON.stringify(footerProbe.splits) === '[2,2,1]'],
  ['...le colonne partono da SINISTRA sul padding della sezione con 30px fra una ' +
   'e l\'altra (sua richiesta: niente space-between), e i link scendono più in basso',
    footerCols.left === Math.round(innerWidthPx * 0.04) &&
    footerCols.gaps.every((g) => Math.abs(g - innerWidthPx * 0.04) <= 2) &&
    footerProbe.colsTop >= 140],
  ['la bowl come FOTO (non il 3D), il wordmark = il SUO logo SVG (14 path, tutti in ' +
   'currentColor così è il CSS a colorarlo), il copyright e i tre link legali, tutti presenti',
    footerProbe.wordSvg === true &&
    footerProbe.wordPaths === 14 && footerProbe.wordUsesCurrentColor === true &&
    footerProbe.legal.includes('2026 Insight') &&
    JSON.stringify(footerProbe.policies) === JSON.stringify(['Terms & Conditions', 'Privacy Policy', 'Cookie Policy'])],
  // ── the footer is FIXED and reveal-gated, and the z-index bug that first
  //    exposed it (V2's ground mask painting over it) is gone ────────────
  ['il footer resta nascosto mentre la sezione team ancora riempie il ' +
   'viewport — niente comparsa prematura',
    revealCheck.early.belowBottom > 1000 - 5 && revealCheck.early.revealed === false],
  ['arrivati in fondo il footer è "fixed", sopra i layer del canvas (ground/under, ' +
   'z 2-3) e rivelato — esattamente l\'effetto chiesto, "la pagina scrolla sopra e ' +
   'poi si rivela con l\'ultima sezione"',
    revealCheck.late.revealed === true && revealCheck.late.position === 'fixed' &&
    revealCheck.late.zIndex > revealCheck.late.groundZ && revealCheck.late.zIndex > revealCheck.late.underZ],
  ['lo spacer che gli fa spazio è alto esattamente quanto il footer stesso — ' +
   'nessun buco, nessuna sovrapposizione, qualunque sia la larghezza del viewport',
    revealCheck.late.spacerH === revealCheck.late.footerH],
  // ── SOLO due pannelli ora (Titles a sinistra, Bowl a destra — "Wide Angle
  //    Sphere" è sparito), align/chars, il ring act per-step, il ' +
  //    post-processing sulla BOWL (non sull'Atlas), l'Atlas saltato del
  //    tutto (sue richieste, 2026-09-16) ───────────────────────────────────
  ['il pannello "Wide Angle Sphere" non c\'è più: restano Titles (sinistra) e ' +
   'Bowl · look (destra), più il pannello V3 sotto Titles (sua richiesta, 2026-09-17)',
    dockInfo.count === 3 && dockInfo.titlesOnLeft && dockInfo.bowlOnRight],
  ['il pannello Titles esiste ed è comandabile (tasto T)',
    typeof titlesToggle.was === 'boolean' && titlesToggle.now !== titlesToggle.was],
  ['ogni titolo può essere allineato — sx/centro/dx — indipendentemente dalla sua posizione',
    alignCheck.before === 'left' && alignCheck.afterRight === 'right' &&
    alignCheck.restored === 'left'],
  ['ogni testo si può splittare anche in CHARS, non solo lines/words — un ' +
   'was-char per lettera, costruito sempre (non solo quando scelto)',
    charsCheck.chars === charsCheck.letters && charsCheck.chars > 20 &&
    charsCheck.restoredMode === 'lines'],
  ['la copy del ring act ha una posizione per-step, non più unica per tutti e tre',
    actCopyCheck.lefts[0] !== actCopyCheck.lefts[1] &&
    actCopyCheck.lefts[1] !== actCopyCheck.lefts[2] &&
    actCopyCheck.lefts.every((l) => /^-?[\d.]+px$/.test(l))],
  ['post-processing sulla CANVA DELLA BOWL (non sull\'Atlas — sua correzione, ' +
   '2026-09-16), acceso di default, solo vignetta (bloom rimosso, sua ' +
   'richiesta 2026-09-17), sulla stessa alpha:true layer trasparente sopra la pagina',
    bowlPostFx.enabled === true && bowlPostFx.bloomStrength === undefined &&
    bowlPostFx.vignette > 0 && bowlPostFx.vignette < 0.4],
  ['il codice di post-processing dell\'Atlas resta (a costo zero, la sezione ' +
   'è spenta), pronto se l\'Atlas torna',
    postFx.enabled === true && postFx.bloomStrength > 0],
  ['l\'Atlas è SALTATO nella versione attuale — dopo i 3 step ' +
   'dell\'evidenza si va dritti a "The Great Team Behind", niente terzo sfondo',
    atlasSkip.show === false && atlasSkip.pinCHidden === true],
  // ── one shared left inset (his ask, 2026-09-16) ─────────────────────────
  ['un unico padding di sezione (4vw) allinea i titoli lungo tutta la ' +
   'colonna sinistra — atto due, ring act, pannello evidenze',
    insetAlign.v2TopX === 4 && insetAlign.actCopyX.every((x) => x === 4) &&
    insetAlign.evidenceTitleX === 4],
  // ── look at the cursor on the bowl (his ask, 2026-09-16) ────────────────
  ['la bowl guarda il cursore — una leggera rotazione extra che lo segue, ' +
   'smorzata, non uno scatto',
    Math.abs(lookLeft.x - lookRight.x) > 0.5 && lookLeft.x < 0 && lookRight.x > 0],
  ['spegnendo "look at cursor" l\'offset torna verso zero',
    Math.abs(lookOff.x) < Math.abs(lookRight.x)],
  // ── the Titles panel's timing fields actually replay now (his ask,
  //    2026-09-16: "non capisco perché non funziona il control panel") ────
  ['cambiare "plays in" su un beat GIÀ apparso lo fa rigiocare subito, non ' +
   'resta inerte finché non si ricarica la pagina',
    panelReplayCheck.before > 0.95 && panelReplayCheck.mid < 0.9 &&
    panelReplayCheck.settled > 0.95],

  // ── perf pass (2026-09-17) ───────────────────────────────────────────
  ['il ground gira a DPR 1: è sfocato per disegno, i device pixel non comprano nulla (4× meno fragment su retina)',
    perf.groundDpr === 1],
  ['bloom rimosso dal post-processing della bowl (sua richiesta, 2026-09-17) — resta solo la vignetta, e il context non paga un MSAA che il composer non usa',
    perf.post.enabled && perf.post.bloomStrength === undefined && perf.post.bloomHiRes === undefined &&
    perf.post.antialias === false],
  ['la bowl arriva Draco: STESSO modello (2.2M tri), 2.2 MB invece di 61.8 — e preloaded dall’HTML insieme al font',
    perf.glbOk && perf.glbBytes > 1e6 && perf.glbBytes < 4e6 && bowlModel.tris > 2e6 &&
    perf.preload.some((h) => /bowl-option-c\.glb/.test(h)) && perf.preload.some((h) => /\.woff2/.test(h))],
  ['Exposure è woff2 (≈217 kB), non il TTF grezzo da 440',
    perf.woffOk && perf.woffBytes > 1e5 && perf.woffBytes < 3e5],
  ['il park del player NON è in transizione (pura funzione dello scroll, su `translate`), e nessuna parola porta un will-change',
    !/opacity/.test(perf.playerTransition) && /transform/.test(perf.playerTransition) &&
    perf.playerTranslate !== 'none' && perf.willChangeWords === 0],
  ['HUD a celle (12 nodi, scritti solo se cambiano); HDR off finché non ci sono i file (stub, 0 fetch); patina a 8 ottave',
    perf.hudCells === 12 && perf.hdrOn === false && perf.hdr.loaded === 0 && perf.octaves === 8],

  // ── V3: la terza versione (sua richiesta, 2026-09-17) ─────────────────
  ['il tasto 3 porta alla V3, che è la V2 PIÙ quattro differenze — quindi ' +
   '`v2.on` resta vero e il body porta tutte e due le classi',
    v3.variant === 3 && v3.v2on === true && v3.body.v2 && v3.body.v3 &&
    v3.panels === 3],
  ['i tre step diventano un DISCO a sezione aurea: niente puntini di riempimento, ' +
   'il centro resta vuoto, e ci sono i tre anelli dei dischi',
    v3.disc.on === true && v3.field === 0 && v3.disc.rings.length === 3 &&
    v3.disc.rings[0].r < v3.disc.rings[1].r && v3.disc.rings[1].r < v3.disc.rings[2].r],
  ['...e le tre aree stanno in ordine RADIALE stretto, ognuna dentro il suo anello: ' +
   'persone dentro, terapisti nella fascia dopo, pills fuori',
    Math.max(...v3.disc.bands.person) < v3.disc.rings[0].r &&
    Math.min(...v3.disc.bands.teacher) > v3.disc.rings[0].r &&
    Math.max(...v3.disc.bands.teacher) < v3.disc.rings[1].r &&
    Math.min(...v3.disc.bands.pill) > v3.disc.rings[1].r &&
    Math.max(...v3.disc.bands.pill) <= v3.disc.rings[2].r + 1],
  ['...e la catena è 1:1:1 — per ogni persona un terapista, per ogni terapista ' +
   'una pill (sua richiesta), non un mucchio sparso',
    v3.disc.chain === true &&
    v3.disc.bands.person.length === v3.disc.bands.teacher.length &&
    v3.disc.bands.teacher.length === v3.disc.bands.pill.length],
  ['in V3 la griglia del team è in BIANCO E NERO finché non ci passi sopra',
    v3.body.bw === true && /grayscale\(1\)/.test(v3.teamFilter)],
  ['e le tre versioni sono reversibili: tornando alla 2 il disco sparisce e la ' +
   'sfera torna col suo campo di puntini, tornando alla 1 `v2.on` si spegne',
    v3.backTo2.variant === 2 && v3.backTo2.v2on === true &&
    v3.backTo2.disc === false && v3.backTo2.field > 0 && v3.backTo2.bw === false &&
    v3.backTo1.variant === 1 && v3.backTo1.v2on === false],

  ['il paragrafo dei tre step si rivela quando la SEZIONE tocca il top del viewport ' +
   '(sua richiesta, 2026-09-17) — non prima, e resta su dopo',
    evTop.every((x) => (x.top > 8 ? x.summary === 0 : x.summary > 0.9))],

  // ── V4: la treccia (mia proposta) + i nomi sotto le card ──────────────
  ['il tasto 4 porta alla V4, che resta "V2 più i delta": `v2.on` vero, e in più ' +
   'le classi is-v4 / is-team-caps',
    v4.variant === 4 && v4.v2on === true && v4.body.v4 && v4.body.caps && v4.body.bw],
  ['i tre step diventano un GLOBO (sua idea e sua correzione, 2026-09-17): prima gli ' +
   'ANELLI concentrici piatti, poi i vertici, e alla fine si gonfia in sfera',
    v4.globe.on === true && v4.disc === false && v4.field === 0 &&
    v4.globe.rings >= 6 && v4.globe.dots > 150 && v4.globe.layers === 6],
  ['...e il piatto è una proiezione VERA (azimutale equidistante, quella dell\'ONU): ' +
   'è rotondo, e latitudini equispaziate danno anelli equispaziati',
    Math.abs(v4.globe.flatBox.w / v4.globe.flatBox.h - 1) < 0.06 &&
    (() => {
      const g = v4.globe.ringGaps
      return g.length > 3 && Math.max(...g) - Math.min(...g) < 0.6
    })()],
  ['...e in orbita ci sono DODICI tecniche, ognuna in fondo a catene che seguono la ' +
   'superficie — solo l\'ultimo salto sale, apposta, fino all\'etichetta',
    v4.globe.orbit >= 10 && v4.globe.arcs >= v4.globe.orbit * 2 &&
    v4.folded.arcOnSurface && v4.folded.lit > 10],
  ['...e i vertici sono di tre pesi — membri, terapisti, trial — con i trial pochi e verdi',
    v4.globe.tiers[0] > v4.globe.tiers[1] && v4.globe.tiers[1] > v4.globe.tiers[2] &&
    v4.globe.tiers[2] >= 4 &&
    v4.globe.tiers.reduce((a, b) => a + b, 0) === v4.globe.dots],
  ['...e richiudendosi diventa davvero una SFERA: circa metà dei vertici finisce dietro, ' +
   'ed è per questo che la faccia lontana è più chiara',
    v4.folded.drawn === v4.globe.dots &&
    Math.abs(v4.folded.behind / v4.folded.drawn - 0.5) < 0.12],
  ['in V4 i nomi stanno SOTTO la card (sua richiesta, 2026-09-17): il nome scuro, ' +
   'il ruolo in un grigino, e il tooltip che sostituiscono sparisce',
    v4.cap.shown && v4.cap.below > 0 && v4.cap.name.length > 3 &&
    v4.cap.nameColor === 'rgb(10, 10, 10)' && /rgb\(138, 138, 138\)/.test(v4.cap.roleColor) &&
    v4.tooltipHidden],
  ['...e tornando alla V1 le didascalie spariscono di nuovo: i delta sono additivi',
    v4.backTo1.variant === 1 && v4.backTo1.caps === false && v4.backTo1.capShown === false],
  ['il gap fra le colonne del footer è in vw, non px, così scala con la pagina ' +
   '(sua richiesta, 2026-09-17: "60px che convertiremo con il valore di vw")',
    FOOT_CFG.colGap > 0 && FOOT_CFG.colGap < 12 &&
    footerCols.gaps.every((g) => Math.abs(g - innerWidthPx * FOOT_CFG.colGap / 100) <= 2)],

  ['...e l\'ORDINE è il suo (sua correzione, 2026-09-17: "il contrario, bro"): prima ' +
   'escono le TECNICHE, poi i punti con i cerchi, e solo alla fine diventa mondo',
    // 1) le tecniche sono TUTTE fuori mentre non c'è ancora nient'altro
    v4.order[0].pills >= 5 && v4.order[0].dots === 0 && v4.order[0].rings === 0 &&
    // 2) poi arrivano i punti CON i cerchi, e non è ancora un mondo
    v4.order[1].dots === v4.globe.dots && v4.order[1].rings > 0.02 &&
    v4.order[1].behind === 0 &&
    // 3) e solo alla fine si gonfia
    v4.order[2].behind > v4.globe.dots * 0.35],
  ['...e ogni tecnica è in fondo a una CATENA che salta di vertice in vertice sulla ' +
   'superficie per arrivarci ("punti con punti che si collegano con le techniques")',
    v4.globe.chains >= v4.globe.orbit && v4.globe.arcs > v4.globe.chains],

  // ── shipped default: V4, panels hidden until "c" (his ask, 2026-09-18) ──
  ['una pagina APPENA CARICATA, senza toccare nulla, è già in V4 — non più V1, ' +
   'niente localStorage a decidere per lei',
    freshBoot.variant === 4 && freshBoot.v2on === true && freshBoot.isV4 === true],
  ['...e tutti i control panel sono nascosti di default: si vedono SOLO premendo "c"',
    freshBoot.clean === true && freshBoot.panelsHidden === true],
]
console.log('\n— checks —')
for (const [label, ok] of checks) console.log(`${ok ? 'OK ' : 'KO '} ${label}`)

if (errors.length) { console.log('\n— errori —'); errors.slice(0, 12).forEach((e) => console.log(' ' + e)) }
await browser.close()
process.exit(errors.length || checks.some(([, ok]) => !ok) ? 1 : 0)
