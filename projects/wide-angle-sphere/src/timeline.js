// The one clock. Everything — canvas, copy, pills, rings, markers — reads from
// here, and it is derived entirely from `steps[].vh`, so making a step taller
// makes its animation longer AND moves everything inside it.
//
// Two numbers say how the six steps are laid out:
//
//   sections.canvasSteps  where the two sticky sections are CUT. Steps
//                         [0, canvasSteps) ride the first one, the rest the
//                         second.
//   sections.canvasFrom   which block of three the CANVAS EXPERIENCE (the
//                         sphere, the glass card, the pills) actually owns.
//                         0 in V1 — the first sticky. V2 sets it to 3 and
//                         gives the first sticky to the ring act instead.
//
// So the assembly and the pills are always measured from `canvasFrom`, never
// from step 0, and whichever block the canvas is NOT in is the other act.

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (x) => x * x * (3 - 2 * x);

export function pinVh(cfg) {
  return cfg.steps.reduce((a, s) => a + Math.max(1, s.vh), 0);
}

export function stepRanges(cfg) {
  const total = pinVh(cfg);
  let acc = 0;
  return cfg.steps.map((s) => {
    const s0 = acc / total;
    acc += Math.max(1, s.vh);
    return { s0, s1: acc / total, len: Math.max(1, s.vh) / total };
  });
}

export function timeline(cfg, p) {
  const ranges = stepRanges(cfg);
  const R = (i) => ranges[Math.min(Math.max(0, i), ranges.length - 1)];

  const split = Math.max(
    1,
    Math.min(cfg.steps.length, Math.round(cfg.sections.canvasSteps))
  );
  const c0 = Math.max(0, Math.round(cfg.sections.canvasFrom || 0));
  // the other block of three — the one the canvas is not in
  const a0 = c0 === 0 ? split : 0;

  /** a 0→1 ramp over [from, to] of step `i`, both as fractions of that step */
  const win = (i, from, to) => {
    const r = R(i);
    const a = r.s0 + from * r.len;
    const b = r.s0 + Math.max(from + 0.02, to) * r.len;
    return clamp01((p - a) / Math.max(1e-4, b - a));
  };

  // The first step of the SECOND sticky straddles the join: its first
  // `scroll.handoverVh` is the handover itself, so whatever lives in it only
  // starts once its section has actually arrived.
  const gapF = clamp01(
    Math.max(0, cfg.scroll.handoverVh) / Math.max(1, R(split).len * pinVh(cfg))
  );
  // ...and that only applies to the block that IS the second sticky.
  const canvasGap = c0 >= split ? gapF : 0;

  // the canvas experience: two steps for the sphere to assemble over, then the
  // pills on the third. It starts INSIDE its first step (`assembly.startFrac`)
  // and finishes inside the second, so the two read as one move.
  const r0 = R(c0);
  const r1 = R(c0 + 1);
  const asmStart =
    r0.s0 + (canvasGap + clamp01(cfg.assembly.startFrac || 0) * (1 - canvasGap)) * r0.len;
  const asmEnd = Math.min(r1.s1, r1.s0 + cfg.assembly.endFrac * r1.len);
  const asm = clamp01((p - asmStart) / Math.max(1e-4, asmEnd - asmStart));

  // the category pills come out among the photographs, on the canvas's last step
  const r2 = R(c0 + 2);
  const pillStart = r2.s0 + cfg.pills3d.startFrac * r2.len;
  const pillEnd = Math.min(r2.s1, pillStart + cfg.pills3d.span * r2.len);
  const pill = clamp01((p - pillStart) / Math.max(1e-4, pillEnd - pillStart));

  // ── the evidence panel ───────────────────────────────────────────────────
  // It ALWAYS rides the second sticky — that is what makes the handover gap
  // its own — whether it has that section to itself (V1) or shares it with the
  // canvas experience, which in V2 runs in a box in its bottom-left corner.
  const evOn = !!cfg.evidence.show;
  const ev = evOn
    ? [win(split, gapF, 1), win(split + 1, 0, 1), win(split + 2, 0, 1)]
    : [0, 0, 0];
  // ...and the statement above them is not scrubbed at all: this is the MARK
  // it fires at, on the global clock, after the column has arrived.
  const ra = R(split);
  const evTitleAt = evOn
    ? ra.s0 + (gapF + Math.max(0, cfg.evidence.titleAt)) * ra.len
    : 2;

  // ── the ring act (V2) ────────────────────────────────────────────────────
  // 0 → 1 across its own block of three, plus which of the three it is in and
  // how far through that one it is. Everything V2 does on the pinned scroll —
  // the two rings, the bowl's dolly, the ground turning orange — is measured
  // from these.
  const actGap = a0 >= split ? gapF : 0;
  const actS0 = R(a0).s0 + actGap * R(a0).len;
  const actS1 = R(a0 + 2).s1;
  const actP = clamp01((p - actS0) / Math.max(1e-4, actS1 - actS0));
  let actStep = 0;
  for (let i = 0; i < 3; i++) if (p >= R(a0 + i).s0) actStep = i;
  const ar = R(a0 + actStep);
  const arS0 = actStep === 0 ? actS0 : ar.s0;
  const actLocal = clamp01((p - arS0) / Math.max(1e-4, ar.s1 - arS0));

  let step = 0;
  for (let i = 0; i < ranges.length; i++) if (p >= ranges[i].s0) step = i;
  const local = clamp01((p - ranges[step].s0) / ranges[step].len);

  // Scroll spin: it only creeps while the sphere is still assembling (else
  // the hero card swings out of frame before the sphere has arrived), then
  // takes the remaining turns — and it is FINISHED by `motion.spinUntil`, so
  // the last stretch is about the pills arriving, not about the cloud turning
  // under them.
  const spinEnd = Math.max(asmEnd + 0.05, clamp01(cfg.motion.spinUntil));
  const q = clamp01((p - asmStart) / Math.max(1e-4, spinEnd - asmStart));
  const asmFrac = clamp01((asmEnd - asmStart) / Math.max(1e-4, spinEnd - asmStart));
  const pre = clamp01(cfg.motion.preSpin);
  const spinP =
    q <= asmFrac
      ? smooth(q / Math.max(1e-4, asmFrac)) * pre
      : pre + ((q - asmFrac) / Math.max(1e-4, 1 - asmFrac)) * (1 - pre);

  return {
    p, ranges, step, local, asm, spinP, pill, ev, evTitleAt, gapF,
    pinVh: pinVh(cfg),
    asmStart, asmEnd, pillStart, pillEnd,
    // the two blocks, and where each one runs
    split, c0, a0, evOn,
    canvasS0: R(c0).s0 + canvasGap * R(c0).len,
    canvasS1: R(c0 + 2).s1,
    actS0, actS1, actP, actStep, actLocal,
  };
}
