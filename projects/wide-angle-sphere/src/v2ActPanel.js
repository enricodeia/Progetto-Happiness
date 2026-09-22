// ─────────────────────────────────────────────────────────────────────────────
// The ONE panel, for act two's three beats (his ask, 2026-09-22 — "voglio un
// control panel che sia solido... mettimene uno solo e basta a destra per la
// V2"). Every other panel is off while this is the work: main.js stops
// showing Titles/Bowl/V behind `c` and shows only this.
//
// The three beats — Top, Bottom, Until (the one behind the bowl) — are a
// SEQUENCE across act two's own 0→1 scroll, and the two bugs that got us here
// were both about that sequence: two beats standing on screen together with
// no gap between them, and a beat that fired before its own mark. A slider
// with a number next to it cannot show either of those; a TIMELINE can — so
// the panel's spine is one: each beat is a bar spanning [at, out) on a shared
// 0→1 track, dragged by its own two edges, with a playhead that moves with
// the real scroll so "where am I right now" is always on screen while he
// tunes it. Dragging previews live (it writes straight into `cfg`, which the
// driver already reads fresh every frame — nothing here owns the timing, it
// only edits the same numbers hero.js's `drive()` already trusted); it only
// commits (into the copy table, via `onStyle`) once the pointer lets go, so a
// drag doesn't spam JSON.stringify on every pixel.
//
// Below the timeline, one full card per beat: the text, the split (how the
// reveal cuts it — line / word / char / fade), the align, which edge it is
// anchored to (top/bottom only — "until" is always centred), and the THREE
// numbers that are the actual ask — width, x, y, all in the same vw/% units
// the CSS itself reads — so the container's own measure is his to set, not a
// guess. Duration/stagger/exit-duration/ease sit under "Advanced", closed by
// default: real controls, just not the first thing in view.
// ─────────────────────────────────────────────────────────────────────────────

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const fmt = (v, d = 2) => (Math.round(v * 10 ** d) / 10 ** d).toString();

const MODES = [
  ["lines", "Lines"],
  ["words", "Words"],
  ["chars", "Chars"],
  ["fade", "Fade"],
];
const ALIGNS = [["left", "Left"], ["center", "Center"], ["right", "Right"]];
const SIDES = [["left", "Left"], ["right", "Right"]];
const EASES = [
  ["power2.out", "power2"],
  ["power3.out", "power3"],
  ["power4.out", "power4"],
  ["expo.out", "expo"],
  ["circ.out", "circ"],
  ["back.out", "back"],
  ["linear", "linear"],
];

const STEPS = [
  { key: "top", label: "Top", hint: "the sticky stage, left of centre by default", color: "#3b6fd6", side: true, show: false },
  { key: "bottom", label: "Bottom", hint: "the sticky stage, right of centre by default", color: "#c9812f", side: true, show: false },
  { key: "until", label: "Until", hint: "fixed, behind the bowl (z below it)", color: "#1f9d74", side: false, show: true },
];

const svgIcon = (d, box = 24) =>
  `<svg viewBox="0 0 ${box} ${box}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`;
const ICON_CLOSE = svgIcon("M5 5l14 14M19 5L5 19");

export function createV2ActPanel({ cfg, onRebuild, onStyle, onClose, dock }) {
  const host = document.createElement("div");
  host.className = "was-panel was-v2act";
  host.setAttribute("data-lenis-prevent", "");
  host.addEventListener("wheel", (e) => e.stopPropagation(), { passive: true });

  host.innerHTML = `
    <div class="wa-head">
      <div class="wa-head-t">
        <span class="wa-eyebrow">Act two</span>
        <h2>The three beats</h2>
      </div>
      <button type="button" class="wa-close" aria-label="close">${ICON_CLOSE}</button>
    </div>
    <div class="wa-body">
      <div class="wa-tl">
        <div class="wa-tl-head">
          <span>Timeline — act two's own scroll</span>
          <span class="wa-tl-q">0.000</span>
        </div>
        <div class="wa-tl-rows"></div>
        <div class="wa-tl-axis">
          <span>0</span><span>0.25</span><span>0.5</span><span>0.75</span><span>1</span>
        </div>
      </div>
      <div class="wa-cards"></div>
    </div>
  `;
  (dock || document.body).appendChild(host);

  const rowsEl = host.querySelector(".wa-tl-rows");
  const cardsEl = host.querySelector(".wa-cards");
  const qEl = host.querySelector(".wa-tl-q");
  host.querySelector(".wa-close").addEventListener("click", () => onClose?.());

  // ── small DOM builders ────────────────────────────────────────────────
  const seg = (name, options, get, set) => {
    const wrap = document.createElement("div");
    wrap.className = "wa-seg";
    wrap.dataset.field = name;
    for (const [val, label] of options) {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = label;
      b.dataset.val = val;
      b.addEventListener("click", () => { if (get() !== val) { set(val); paintSeg(); } });
      wrap.appendChild(b);
    }
    function paintSeg() {
      const v = get();
      for (const b of wrap.children) b.classList.toggle("is-on", b.dataset.val === v);
    }
    wrap.refresh = paintSeg;
    paintSeg();
    return wrap;
  };

  /** a slider + a number input, synced, both firing the same handlers */
  const numRow = (label, { min, max, step, unit = "", decimals, get, onInput, onCommit }) => {
    // an explicit decimal count, not one guessed off the step — the step is
    // how far a drag moves, not how many digits a 48px box has room for
    const d = decimals ?? (step < 0.1 ? 2 : step < 1 ? 1 : 0);
    const row = document.createElement("label");
    row.className = "wa-row";
    row.innerHTML = `
      <span class="wa-row-label">${label}</span>
      <input type="range" min="${min}" max="${max}" step="${step}">
      <span class="wa-row-num"><input type="number" min="${min}" max="${max}" step="${step}"><i>${unit}</i></span>
    `;
    const range = row.querySelector('input[type="range"]');
    const num = row.querySelector('input[type="number"]');
    function paint() {
      const v = get();
      range.value = String(v);
      num.value = fmt(v, d);
    }
    range.addEventListener("input", () => { onInput(clamp(+range.value, min, max)); num.value = fmt(+range.value, d); });
    range.addEventListener("change", () => onCommit(clamp(+range.value, min, max)));
    num.addEventListener("change", () => {
      const v = clamp(Number.isFinite(+num.value) ? +num.value : get(), min, max);
      onInput(v); onCommit(v); paint();
    });
    row.refresh = paint;
    paint();
    return row;
  };

  // ── the timeline (one track per beat, one shared playhead) ─────────────
  const tracks = {};
  let dragTrackWidth = 0;

  function beatWindow(step) {
    const c = cfg.v2[step.key];
    const at = clamp01(Number(c.at) || 0);
    const rawOut = Number(c.out) || 0;
    const stays = !(rawOut > at);
    return { at, out: stays ? 1 : clamp01(rawOut), stays };
  }

  function buildTimeline() {
    rowsEl.innerHTML = "";
    for (const step of STEPS) {
      const row = document.createElement("div");
      row.className = "wa-tl-row";
      row.innerHTML = `
        <span class="wa-tl-name" style="color:${step.color}">${step.label}</span>
        <div class="wa-tl-track">
          <div class="wa-tl-bar">
            <span class="wa-tl-handle is-l" title="enters"></span>
            <span class="wa-tl-handle is-r" title="leaves"></span>
          </div>
        </div>
      `;
      rowsEl.appendChild(row);
      const track = row.querySelector(".wa-tl-track");
      const bar = row.querySelector(".wa-tl-bar");
      bar.style.setProperty("--c", step.color);
      const hL = bar.querySelector(".is-l");
      const hR = bar.querySelector(".is-r");
      tracks[step.key] = { track, bar, hL, hR };

      const dragHandle = (which) => (e) => {
        e.preventDefault();
        const r = track.getBoundingClientRect();
        dragTrackWidth = r.width;
        const move = (ev) => {
          const frac = clamp01((ev.clientX - r.left) / Math.max(1, dragTrackWidth));
          const c = cfg.v2[step.key];
          const at = clamp01(Number(c.at) || 0);
          const out = Number(c.out) || 0;
          const stays = !(out > at);
          if (which === "l") {
            const ceiling = stays ? 0.98 : Math.max(0.01, out - 0.015);
            c.at = clamp(frac, 0, ceiling);
          } else {
            c.out = clamp(frac, at + 0.015, 1);
          }
          paintTimeline();
          syncCard(step.key);
        };
        const up = () => {
          window.removeEventListener("pointermove", move);
          window.removeEventListener("pointerup", up);
          onStyle();
        };
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", up);
      };
      hL.addEventListener("pointerdown", dragHandle("l"));
      hR.addEventListener("pointerdown", dragHandle("r"));
      // grabbing the BODY of the bar moves the whole window, keeping its span
      bar.addEventListener("pointerdown", (e) => {
        if (e.target === hL || e.target === hR) return;
        e.preventDefault();
        const r = track.getBoundingClientRect();
        const c0 = cfg.v2[step.key];
        const at0 = clamp01(Number(c0.at) || 0);
        const out0 = Number(c0.out) || 0;
        const stays0 = !(out0 > at0);
        const span = stays0 ? null : out0 - at0;
        const startX = e.clientX;
        const move = (ev) => {
          const dFrac = (ev.clientX - startX) / Math.max(1, r.width);
          const c = cfg.v2[step.key];
          if (span === null) {
            c.at = clamp(at0 + dFrac, 0, 0.98);
          } else {
            const at = clamp(at0 + dFrac, 0, 1 - span);
            c.at = at; c.out = at + span;
          }
          paintTimeline();
          syncCard(step.key);
        };
        const up = () => {
          window.removeEventListener("pointermove", move);
          window.removeEventListener("pointerup", up);
          onStyle();
        };
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", up);
      });
    }
    const ph = document.createElement("div");
    ph.className = "wa-tl-playhead";
    rowsEl.style.position = "relative";
    rowsEl.appendChild(ph);
    tracks.__playhead = ph;
    paintTimeline();
  }

  function paintTimeline() {
    for (const step of STEPS) {
      const { bar } = tracks[step.key];
      const { at, out, stays } = beatWindow(step);
      bar.style.left = `${(at * 100).toFixed(2)}%`;
      bar.style.width = `${Math.max(0, (out - at) * 100).toFixed(2)}%`;
      bar.classList.toggle("is-stays", stays);
    }
  }

  // ── the playhead + the readout, driven from outside (raf) ──────────────
  // The playhead lives in `rowsEl`, but the TRACK it has to line up with sits
  // to the right of each row's own 52px label column — a plain left:X% would
  // measure against the whole row's width and land the line under the
  // labels, not the timeline (found on the first screenshot). It is
  // positioned in the TRACK's own pixel space instead — measured off the
  // first row (all three share one grid, so any of them gives the same
  // offset) and re-read on every call, which is the width of two
  // `getBoundingClientRect`s: cheap, and correct across a resize for free.
  let lastQ = -1;
  function setPlayhead(q) {
    const c = clamp01(q);
    if (Math.abs(c - lastQ) < 0.0007) return;
    lastQ = c;
    qEl.textContent = c.toFixed(3);
    const track = tracks.top?.track;
    if (!track || !tracks.__playhead) return;
    const tr = track.getBoundingClientRect();
    const rr = rowsEl.getBoundingClientRect();
    const left = (tr.left - rr.left) + c * tr.width;
    tracks.__playhead.style.left = `${left.toFixed(1)}px`;
  }

  // ── the three cards ──────────────────────────────────────────────────
  const cards = {};
  function buildCards() {
    cardsEl.innerHTML = "";
    for (const step of STEPS) {
      const c = () => cfg.v2[step.key];
      const card = document.createElement("div");
      card.className = "wa-card";
      card.style.setProperty("--c", step.color);
      card.innerHTML = `
        <div class="wa-card-head">
          <span class="wa-dot"></span>
          <h3>${step.label}</h3>
          <span class="wa-hint">${step.hint}</span>
          ${step.show ? `<label class="wa-switch"><input type="checkbox"><i></i></label>` : ""}
        </div>
        <textarea class="wa-text" rows="3" placeholder="text — | starts a new line"></textarea>
      `;
      cardsEl.appendChild(card);

      const textEl = card.querySelector(".wa-text");
      let debounceT = 0;
      const commitText = () => { c().text = textEl.value; onRebuild(); };
      textEl.addEventListener("input", () => {
        clearTimeout(debounceT);
        debounceT = setTimeout(commitText, 380);
      });
      textEl.addEventListener("blur", () => { clearTimeout(debounceT); commitText(); });
      textEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { clearTimeout(debounceT); commitText(); textEl.blur(); }
      });

      let showBox = null;
      if (step.show) {
        showBox = card.querySelector(".wa-switch input");
        showBox.addEventListener("change", () => { c().show = showBox.checked; onStyle(); refreshEnabled(); });
      }

      const row1 = document.createElement("div");
      row1.className = "wa-fieldrow";
      const splitSeg = seg("mode", MODES, () => c().mode, (v) => { c().mode = v; onRebuild(); });
      const alignSeg = seg("align", ALIGNS, () => c().align, (v) => { c().align = v; onStyle(); });
      row1.append(labelled("Split", splitSeg), labelled("Align", alignSeg));
      card.appendChild(row1);

      let sideSeg = null;
      if (step.side) {
        const row1b = document.createElement("div");
        row1b.className = "wa-fieldrow";
        sideSeg = seg("side", SIDES, () => c().side, (v) => { c().side = v; onStyle(); });
        row1b.append(labelled("Anchored to", sideSeg));
        card.appendChild(row1b);
      }

      const widthMax = 90;
      const xUnit = step.side ? "vw" : "%";
      const xMax = step.side ? 44 : 100;
      const widthRow = numRow("Container width", { min: 6, max: widthMax, step: 0.5, unit: "vw", get: () => c().width, onInput: (v) => { c().width = v; }, onCommit: () => onStyle() });
      const sizeRow = numRow("Type size", { min: 0.6, max: 6, step: 0.05, unit: "vw", get: () => c().size, onInput: (v) => { c().size = v; }, onCommit: () => onStyle() });
      const xRow = numRow(`Position x`, { min: 0, max: xMax, step: 0.5, unit: xUnit, get: () => c().x, onInput: (v) => { c().x = v; }, onCommit: () => onStyle() });
      const yRow = numRow("Position y", { min: 0, max: 100, step: 0.5, unit: "%", get: () => c().y, onInput: (v) => { c().y = v; }, onCommit: () => onStyle() });
      card.append(widthRow, sizeRow, xRow, yRow);

      // ── the timing readout — mirrors the timeline drag, for typed precision
      const timeRow = document.createElement("div");
      timeRow.className = "wa-fieldrow wa-timing";
      const atRow = numRow("Enters at", { min: 0, max: 0.98, step: 0.005, unit: "", get: () => clamp01(c().at), onInput: (v) => { c().at = v; paintTimeline(); }, onCommit: () => onStyle() });
      const outRow = numRow("Leaves at", { min: 0.02, max: 1, step: 0.005, unit: "", get: () => { const o = c().out; const a = clamp01(c().at); return o > a ? o : Math.min(1, a + 0.2); }, onInput: (v) => { c().out = v; paintTimeline(); }, onCommit: () => onStyle() });
      const staysBox = document.createElement("label");
      staysBox.className = "wa-stays";
      staysBox.innerHTML = `<input type="checkbox"><span>stays (never leaves)</span>`;
      const staysInput = staysBox.querySelector("input");
      staysInput.addEventListener("change", () => {
        const c0 = c();
        if (staysInput.checked) { c0.out = 0; }
        else { c0.out = Math.min(1, clamp01(c0.at) + 0.2); }
        onStyle(); paintTimeline(); syncCard(step.key);
      });
      timeRow.append(atRow, outRow);
      card.appendChild(timeRow);
      card.appendChild(staysBox);

      const adv = document.createElement("details");
      adv.className = "wa-adv";
      adv.innerHTML = `<summary>Advanced — timing feel</summary>`;
      const durRow = numRow("Arrives over", { min: 0.2, max: 3, step: 0.05, unit: "s", get: () => c().dur, onInput: (v) => { c().dur = v; }, onCommit: () => onStyle() });
      const stagRow = numRow("Line → line", { min: 0, max: 0.6, step: 0.01, unit: "s", get: () => c().stagger, onInput: (v) => { c().stagger = v; }, onCommit: () => onStyle() });
      const outDurRow = numRow("Leaves over", { min: 0.1, max: 2, step: 0.05, unit: "s", get: () => c().outDur, onInput: (v) => { c().outDur = v; }, onCommit: () => onStyle() });
      const easeRow = document.createElement("div");
      easeRow.className = "wa-fieldrow";
      const easeSeg = seg("ease", EASES, () => c().ease, (v) => { c().ease = v; onStyle(); });
      easeRow.append(labelled("Ease", easeSeg));
      adv.append(durRow, stagRow, outDurRow, easeRow);
      card.appendChild(adv);

      cards[step.key] = {
        card, textEl, showBox, splitSeg, alignSeg, sideSeg,
        widthRow, sizeRow, xRow, yRow, atRow, outRow, staysInput,
        durRow, stagRow, outDurRow, easeSeg,
      };
    }
    refreshEnabled();
  }

  function labelled(text, el) {
    const wrap = document.createElement("div");
    wrap.className = "wa-field";
    const l = document.createElement("span");
    l.className = "wa-field-label";
    l.textContent = text;
    wrap.append(l, el);
    return wrap;
  }

  function refreshEnabled() {
    for (const step of STEPS) {
      const on = step.show ? cfg.v2[step.key].show !== false : true;
      cards[step.key].card.classList.toggle("is-off", !on);
    }
  }

  /** pull the live cfg values into ONE card's controls, without touching focus */
  function syncCard(key) {
    const step = STEPS.find((s) => s.key === key);
    const c = cfg.v2[key];
    const k = cards[key];
    if (document.activeElement !== k.textEl) k.textEl.value = c.text || "";
    k.splitSeg.refresh(); k.alignSeg.refresh(); k.sideSeg?.refresh(); k.easeSeg.refresh();
    if (k.showBox) k.showBox.checked = c.show !== false;
    for (const r of [k.widthRow, k.sizeRow, k.xRow, k.yRow, k.atRow, k.outRow, k.durRow, k.stagRow, k.outDurRow]) r.refresh();
    const stays = !((Number(c.out) || 0) > clamp01(Number(c.at) || 0));
    k.staysInput.checked = stays;
    k.outRow.classList.toggle("is-disabled", stays);
  }

  function refresh() {
    for (const step of STEPS) syncCard(step.key);
    paintTimeline();
  }

  buildTimeline();
  buildCards();
  refresh();

  return {
    refresh,
    setPlayhead,
    toggle: () => host.classList.toggle("is-hidden"),
    hide: () => host.classList.add("is-hidden"),
    show: () => host.classList.remove("is-hidden"),
    get isOpen() { return !host.classList.contains("is-hidden"); },
    probe() {
      return {
        steps: STEPS.map((s) => ({
          key: s.key,
          ...beatWindow(s),
          text: cfg.v2[s.key].text,
          width: cfg.v2[s.key].width,
          x: cfg.v2[s.key].x,
          y: cfg.v2[s.key].y,
          show: cfg.v2[s.key].show !== false,
        })),
        playheadLeft: tracks.__playhead?.style.left || "",
      };
    },
    dispose() { host.remove(); },
  };
}
