// The sound, made visible: a 2D overlay laid over the bowl. A strike sends
// a ring out from the rim, the rim itself breathes while the note holds, and
// a circular oscilloscope traced from the real waveform sits a little outside
// the bowl, a perfect faint circle when nothing plays. Strokes only, one
// colour, alpha does the rest. The caller owns the clock and the geometry:
// setCenter, pulse, scope, then draw, every frame.

const TAU = Math.PI * 2;
const RING_SPEED = 420;      // px/s the strike ring grows
const RING_LIFE = 2.4;       // s until a ring is gone
const RING_MAX = 24;         // alive at once, pooled so nothing allocates
const SCOPE_SCALE = 1.32;    // the scope sits this far out from the rim
const SCOPE_SPIN = 0.05;     // rad/s, slow enough to read as drift, not motion
const PULSE_GATE = 0.35;     // above this level the breathing rim sheds faint rings
const PULSE_EVERY = 0.5;     // s between those

export function createWaves(canvas, { color = "224,176,111" } = {}) {
  const ctx = canvas.getContext("2d");
  // one stroke colour for the whole overlay, alpha set per stroke, so no
  // colour strings are built while drawing
  const stroke = `rgb(${color})`;

  const state = {
    w: 1, h: 1, dpr: 1,
    cx: 0, cy: 0, r: 100,
    // what pulse() and scope() recorded for this frame, consumed by draw()
    hasPulse: false, level: 0, pulseClock: 0,
    hasScope: false, samples: null, gain: 0, rot: 0,
  };

  // the ring pool: fixed objects, a dead one is reused, the oldest is
  // recycled when all are alive
  const rings = [];
  for (let i = 0; i < RING_MAX; i++) rings.push({ alive: false, age: 0, strength: 0, r0: 0 });

  // cos/sin of the scope angles, rebuilt only when the sample count changes
  let cosT = new Float32Array(0);
  let sinT = new Float32Array(0);
  function table(n) {
    if (cosT.length === n) return;
    cosT = new Float32Array(n);
    sinT = new Float32Array(n);
    for (let i = 0; i < n; i++) { const a = (i / n) * TAU; cosT[i] = Math.cos(a); sinT[i] = Math.sin(a); }
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    state.w = Math.max(1, rect.width);
    state.h = Math.max(1, rect.height);
    state.dpr = Math.min(window.devicePixelRatio || 1, 2);
    // backing store in device pixels, the CSS size stays whatever the page
    // gave the element; everything is then drawn in CSS px
    canvas.width = Math.max(1, Math.round(state.w * state.dpr));
    canvas.height = Math.max(1, Math.round(state.h * state.dpr));
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    ctx.strokeStyle = stroke;
    ctx.lineJoin = "round";
  }

  function setCenter(x, y, r) { state.cx = x; state.cy = y; state.r = r; }

  function strike(strength = 1) {
    let slot = null;
    for (const ring of rings) {
      if (!ring.alive) { slot = ring; break; }
      // all alive: take the one nearest its end, it is the faintest anyway
      if (!slot || ring.age > slot.age) slot = ring;
    }
    slot.alive = true;
    slot.age = 0;
    slot.strength = strength;
    slot.r0 = state.r;
  }

  function pulse(level) {
    state.hasPulse = true;
    state.level = level < 0 ? 0 : level > 1 ? 1 : level;
  }

  function scope(samples, gain) {
    state.hasScope = true;
    state.samples = samples;
    state.gain = gain;
  }

  function circle(x, y, radius, width, alpha) {
    ctx.globalAlpha = alpha;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, TAU);
    ctx.stroke();
  }

  function draw(dt) {
    // a hidden tab hands back a huge dt, never let the rings jump
    dt = dt > 0.1 ? 0.1 : dt < 0 ? 0 : dt;
    ctx.clearRect(0, 0, state.w, state.h);
    const { cx, cy, r } = state;

    // strike rings: out from the rim, fading fast then lingering
    for (const ring of rings) {
      if (!ring.alive) continue;
      ring.age += dt;
      if (ring.age >= RING_LIFE) { ring.alive = false; continue; }
      const left = 1 - ring.age / RING_LIFE;
      circle(cx, cy, ring.r0 + RING_SPEED * ring.age, 1.2, 0.75 * ring.strength * left * left);
    }

    // the rim breathing with the note, shedding a faint ring now and then
    // while it is loud enough to be felt
    if (state.hasPulse) {
      const lv = state.level;
      circle(cx, cy, r * (1 + 0.08 * lv), 1, 0.15 + 0.45 * lv);
      if (lv > PULSE_GATE) {
        state.pulseClock += dt;
        if (state.pulseClock >= PULSE_EVERY) { state.pulseClock -= PULSE_EVERY; strike(0.35); }
      } else {
        state.pulseClock = 0;
      }
      state.hasPulse = false;
    }

    // the oscilloscope: the waveform wrapped around the bowl, a closed
    // polyline that is a plain circle when the samples are silent
    state.rot += dt * SCOPE_SPIN;
    if (state.hasScope && state.samples && state.samples.length > 1) {
      const s = state.samples;
      const n = s.length;
      table(n);
      let sum = 0;
      for (let i = 0; i < n; i++) sum += s[i] * s[i];
      const rms = Math.sqrt(sum / n);
      const base = r * SCOPE_SCALE;
      const gain = state.gain;
      ctx.globalAlpha = 0.18 + 0.5 * Math.min(1, rms * 8);
      ctx.lineWidth = 1;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(state.rot);
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const rad = base + s[i] * gain;
        if (i === 0) ctx.moveTo(cosT[0] * rad, sinT[0] * rad);
        else ctx.lineTo(cosT[i] * rad, sinT[i] * rad);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
      state.hasScope = false;
    }
    ctx.globalAlpha = 1;
  }

  function clear() {
    for (const ring of rings) ring.alive = false;
    state.hasPulse = false;
    state.hasScope = false;
    state.pulseClock = 0;
    ctx.clearRect(0, 0, state.w, state.h);
  }

  return {
    resize,
    /** the bowl's centre and rim radius, in CSS px within the canvas, every frame */
    setCenter,
    /** a ring out from the rim; strength scales its alpha */
    strike,
    /** level 0..1, the note's loudness this frame */
    pulse,
    /** the waveform this frame and how many px a full-scale sample pushes the line */
    scope,
    /** clears, advances and paints; call after setCenter, pulse and scope */
    draw,
    clear,
    /** for probes */
    get alive() { let n = 0; for (const ring of rings) if (ring.alive) n++; return n; },
  };
}
