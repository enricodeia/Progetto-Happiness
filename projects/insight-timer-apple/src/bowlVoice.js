// The bowl's voice, synthesised rather than sampled: six partials at the
// ratios a real bowl's rim modes fall on, each a pair of sines a few Hz apart
// so the tone wobbles the way the metal does, and an energy model in plain JS
// that the audio graph merely follows. Two ways in, a strike (an impulse,
// a felt mallet or a hard one) and a rub (the mallet circling the rim, the
// singing builds over about a second and stays). The energies are public so
// the picture can ripple with the sound.
//
// Nothing here touches the DOM. `ensure()` must come from a user gesture,
// everything else is safe before it (no-ops, zeros).

const N = 6;
const RATIO = [1, 2.78, 5.31, 8.55, 12.3, 16.6];   // the (2,0), (3,0), (4,0)… modes
const BEAT = [1.3, 2.2, 3.1, 4.4, 5.8, 7.5];         // Hz between the two sines of a pair
const TAU = [11, 7, 4.5, 2.8, 1.8, 1.1];              // s, the high modes die first
const SOFT = [1, 0.45, 0.18, 0.07, 0.03, 0.01];       // felt mallet, mostly the low partials
const HARD = [1, 0.8, 0.55, 0.35, 0.2, 0.1];          // hard strike, bright
const RUB = [1, 0.35, 0.08, 0, 0, 0];                 // the rim only sings the low modes
const AMP = [0.5, 0.32, 0.18, 0.1, 0.06, 0.03];       // gain of each partial at full energy
const AMP_SUM = AMP.reduce((a, b) => a + b, 0);
const RUB_RISE = 1.2;                                 // s, how fast the singing builds
const LEVEL_SMOOTH = 0.06;                            // s, a little lag on the loudness

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

export function createBowlVoice({ f0 = 246, master = 0.6 } = {}) {
  const e = new Float32Array(N);       // energy per partial, 0..1
  const snapshot = new Float32Array(N);
  let rate = 0;                        // rub speed, 0..1
  let level = 0;
  let muted = false;
  let destroyed = false;

  // the graph, built once at ensure()
  let ctx = null;
  let building = null;
  let built = false;
  let noise = null;                    // 1 s of white noise shared by every burst
  let oscs = [];
  let partialGain = [];
  let sum, rubGain, masterGain, analyser;

  function whiteNoise(seconds) {
    const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * seconds), ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  // a room for the bowl: stereo noise fading out, nothing more. Two channels
  // of different noise is what makes it feel wide.
  function impulseResponse(seconds, tau) {
    const len = Math.ceil(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / ctx.sampleRate / tau);
    }
    return buf;
  }

  function build() {
    const now = ctx.currentTime;
    noise = whiteNoise(1);

    sum = ctx.createGain();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 3;
    sum.connect(comp);

    masterGain = ctx.createGain();
    masterGain.gain.value = muted ? 0 : master;
    // dry, and a wet share through the room
    comp.connect(masterGain);
    const conv = ctx.createConvolver();
    conv.buffer = impulseResponse(2.6, 0.7);
    const wet = ctx.createGain();
    wet.gain.value = 0.28;
    comp.connect(conv);
    conv.connect(wet);
    wet.connect(masterGain);

    analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.6;
    masterGain.connect(analyser);
    analyser.connect(ctx.destination);

    // the partials: a pair of sines each, split by half the beat either
    // side, each at half gain, into one gain the energy model drives
    for (let k = 0; k < N; k++) {
      const g = ctx.createGain();
      g.gain.value = 0;
      g.connect(sum);
      partialGain.push(g);
      const half = ctx.createGain();
      half.gain.value = 0.5;
      half.connect(g);
      const f = f0 * RATIO[k];
      for (const sign of [-1, 1]) {
        const o = ctx.createOscillator();
        o.type = "sine";
        o.frequency.value = f + (sign * BEAT[k]) / 2;
        o.connect(half);
        o.start(now);
        oscs.push(o);
      }
    }

    // the stick-slip of the mallet on the rim: noise narrowed to f0, quiet,
    // only while rubbing. Runs forever, its gain is the switch.
    const src = ctx.createBufferSource();
    src.buffer = noise;
    src.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = f0;
    bp.Q.value = 10;
    rubGain = ctx.createGain();
    rubGain.gain.value = 0;
    src.connect(bp);
    bp.connect(rubGain);
    rubGain.connect(sum);
    src.start(now);
    oscs.push(src);

    built = true;
  }

  async function ensure() {
    if (destroyed) return;
    if (!ctx) {
      const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!AC) return;
      ctx = new AC({ latencyHint: "interactive" });
    }
    if (!built) {
      // one build, however many gestures race for it
      building ??= Promise.resolve().then(build);
      await building;
    }
    if (ctx.state !== "running") await ctx.resume().catch(() => {});
  }

  const running = () => built && !destroyed && ctx.state === "running";

  // the mallet's own contact, a short band of noise around 2.4 kHz
  function tick(strength, brightness) {
    const now = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = noise;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 2400;
    bp.Q.value = 1.5;
    const g = ctx.createGain();
    const peak = 0.12 * (0.4 + 0.6 * brightness) * strength;
    g.gain.setValueAtTime(peak, now);
    g.gain.exponentialRampToValueAtTime(0.0005, now + 0.025);
    src.connect(bp);
    bp.connect(g);
    g.connect(sum);
    src.start(now);
    src.stop(now + 0.03);
    // nothing holds these, they go with the GC once stopped
  }

  function strike({ strength = 1, brightness = 0.5 } = {}) {
    if (destroyed) return;
    const s = Math.max(0, strength);
    const b = clamp01(brightness);
    for (let k = 0; k < N; k++) e[k] = clamp01(e[k] + s * (SOFT[k] + (HARD[k] - SOFT[k]) * b));
    if (running() && s > 0) tick(s, b);
  }

  function rub(r) {
    rate = clamp01(+r || 0);
  }

  function update(dt) {
    if (destroyed) return;
    dt = dt > 0.1 ? 0.1 : dt > 0 ? dt : 0;
    let weighted = 0;
    for (let k = 0; k < N; k++) {
      // each mode rings down on its own clock; the rub feeds the low ones
      // toward full and no further
      let d = -e[k] / TAU[k];
      if (rate > 0) d += (rate * RUB[k] * (1 - e[k])) / RUB_RISE;
      e[k] = clamp01(e[k] + d * dt);
      weighted += e[k] * AMP[k];
    }
    level += (weighted / AMP_SUM - level) * (1 - Math.exp(-dt / LEVEL_SMOOTH));
    if (!built) return;
    const now = ctx.currentTime;
    for (let k = 0; k < N; k++) partialGain[k].gain.setTargetAtTime(e[k] * AMP[k], now, 0.02);
    rubGain.gain.setTargetAtTime(0.05 * rate, now, 0.02);
  }

  function energies() {
    snapshot.set(e);
    return snapshot;
  }

  function waveform(out) {
    if (running()) analyser.getFloatTimeDomainData(out);
    else out.fill(0);
  }

  function setMuted(on) {
    muted = !!on;
    if (!built) return;
    const now = ctx.currentTime;
    const g = masterGain.gain;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(muted ? 0 : master, now + 0.03);
  }

  // the tab goes away: the model stops (no frames), so the graph must not
  // hold its last gains as a drone. Ramp out, then suspend; resume restores.
  let asleep = false;
  async function suspend() {
    if (!built || destroyed || asleep) return;
    asleep = true;
    rate = 0;
    const now = ctx.currentTime;
    const g = masterGain.gain;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(0, now + 0.03);
    await new Promise((r) => setTimeout(r, 40));
    if (asleep && ctx.state === "running") await ctx.suspend().catch(() => {});
  }
  async function resume() {
    if (!built || destroyed || !asleep) return;
    asleep = false;
    if (ctx.state !== "running") await ctx.resume().catch(() => {});
    const now = ctx.currentTime;
    const g = masterGain.gain;
    g.cancelScheduledValues(now);
    g.setValueAtTime(0, now);
    g.linearRampToValueAtTime(muted ? 0 : master, now + 0.05);
  }

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    rate = 0;
    e.fill(0);
    if (built) {
      for (const o of oscs) { try { o.stop(); } catch {} }
      oscs = [];
      partialGain = [];
    }
    built = false;
    ctx?.close().catch(() => {});
    ctx = null;
  }

  return {
    ensure,
    strike,
    rub,
    update,
    energies,
    waveform,
    setMuted,
    suspend,
    resume,
    destroy,
    get ready() { return running(); },
    get level() { return level; },
    get muted() { return muted; },
  };
}
