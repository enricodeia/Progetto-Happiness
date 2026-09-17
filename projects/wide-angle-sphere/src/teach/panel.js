import { Pane } from "tweakpane";
import { LIBRARY } from "./library.js";
import { FX } from "./fx.js";
import {
  listPresets, savePreset, updatePreset, deletePreset, exportAll, importAll,
} from "./store.js";

// Live panel for the teach page. Same furniture as the main page's
// (`.was-panel` + Tweakpane), and the only surface this screen has: the
// presets live in here too, at the top, rather than on a shelf across the
// bottom of the page.
//
// Anything marked (rebuild) tears the WebGL scene down and builds it again;
// everything else is read every frame or written straight to a CSS variable.
//
// One `pane.on("change")` at the end catches EVERY binding, so the autosave
// covers controls with no side effect of their own (camera, motion, the FX)
// as well as the ones with an explicit handler.
export function createTeachPanel({
  cfg, onChange, onStyle, onRebuild, onLook, onNav, onCopy, onReset,
  onApplyLibrary, onApplyPreset, onNotify,
}) {
  const host = document.createElement("div");
  host.className = "was-panel";
  host.setAttribute("data-lenis-prevent", "");
  document.body.appendChild(host);

  const file = document.createElement("input");
  file.type = "file";
  file.accept = "application/json";
  file.style.display = "none";
  host.appendChild(file);

  const pane = new Pane({ container: host, title: "Teach — carousel" });
  const T = cfg.tower;
  const say = (m) => onNotify && onNotify(m);

  // ── presets ─────────────────────────────────────────────────────────────
  // Two lists: the 19 webkit compositions, and whatever you save. Tweakpane
  // cannot re-option a list blade in place, so "Mine" is rebuilt inside its
  // own folder whenever it changes.
  const fPre = pane.addFolder({ title: "Presets", expanded: true });

  // The page boots on Tower of Pisa, so that is what the list must say it is
  // showing — a dropdown naming a different preset than the one on screen is
  // worse than no dropdown.
  const BOOT = LIBRARY.find((e) => e.slug === "tower-of-pisa") || LIBRARY[0];
  const pick = { library: BOOT ? BOOT.slug : "", mine: "" };
  let mineList = listPresets();

  fPre
    .addBlade({
      view: "list",
      label: `library (${LIBRARY.length})`,
      options: LIBRARY.map((e) => ({
        text: e.note ? `${e.name} · ${e.shape} ⚠` : `${e.name} · ${e.shape}`,
        value: e.slug,
      })),
      value: pick.library,
    })
    .on("change", (ev) => {
      pick.library = ev.value;
      const e = LIBRARY.find((x) => x.slug === ev.value);
      if (!e) return;
      onApplyLibrary(e.config);
      say(e.note ? `${e.name} — ${e.note}` : e.name);
    });

  /** Step through the library — what `[` and `]` drive. */
  function stepLibrary(dir) {
    const at = LIBRARY.findIndex((e) => e.slug === pick.library);
    const next = (at + dir + LIBRARY.length * 2) % LIBRARY.length;
    const e = LIBRARY[next];
    pick.library = e.slug;
    onApplyLibrary(e.config);
    say(`${e.name} · ${e.shape}`);
    pane.refresh();
    return e;
  }

  const fMine = fPre.addFolder({ title: "Mine", expanded: true });
  let mineBlade = null;

  function buildMine() {
    if (mineBlade) {
      mineBlade.dispose();
      mineBlade = null;
    }
    mineList = listPresets();
    if (!mineList.length) {
      mineBlade = fMine.addBlade({
        view: "text",
        label: "saved",
        parse: (v) => v,
        value: "none yet",
        disabled: true,
      });
      return;
    }
    if (!mineList.some((p) => p.id === pick.mine)) pick.mine = mineList[mineList.length - 1].id;
    mineBlade = fMine.addBlade({
      view: "list",
      label: `saved (${mineList.length})`,
      options: [...mineList].reverse().map((p) => ({ text: p.name, value: p.id })),
      value: pick.mine,
    });
    mineBlade.on("change", (ev) => {
      pick.mine = ev.value;
      const p = mineList.find((x) => x.id === ev.value);
      if (!p) return;
      onApplyPreset(p.config);
      say(`loaded "${p.name}"`);
    });
  }
  buildMine();

  fMine.addButton({ title: "Save the current look as…" }).on("click", () => {
    const name = window.prompt("Name this one", `Alt ${mineList.length + 1}`);
    if (name === null) return;
    const { entry } = savePreset({ name: name.trim() || `Alt ${mineList.length + 1}`, config: cfg });
    pick.mine = entry.id;
    buildMine();
    say(`saved "${entry.name}"`);
  });
  fMine.addButton({ title: "Overwrite the selected one" }).on("click", () => {
    const p = mineList.find((x) => x.id === pick.mine);
    if (!p) return say("nothing selected");
    updatePreset(p.id, { config: cfg });
    buildMine();
    say(`updated "${p.name}"`);
  });
  fMine.addButton({ title: "Delete the selected one" }).on("click", () => {
    const p = mineList.find((x) => x.id === pick.mine);
    if (!p) return say("nothing selected");
    if (!window.confirm(`Delete "${p.name}"?`)) return;
    deletePreset(p.id);
    pick.mine = "";
    buildMine();
  });

  const fIO = fPre.addFolder({ title: "File", expanded: false });
  fIO.addButton({ title: "Export everything as JSON" }).on("click", () => {
    const blob = new Blob([exportAll(cfg)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "teach-presets.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
  fIO.addButton({ title: "Import a JSON" }).on("click", () => file.click());
  file.addEventListener("change", async () => {
    const f = file.files && file.files[0];
    file.value = "";
    if (!f) return;
    try {
      importAll(await f.text(), cfg);
      onApplyPreset(cfg);
      buildMine();
      say("imported");
    } catch {
      say("could not read that file");
    }
  });
  fPre.addButton({ title: "Reset to the Tower of Pisa" }).on("click", onReset);

  // ── where the carousel is composed ──────────────────────────────────────
  // The canvas is always the full viewport; this is the rectangle the
  // composition is fitted and centred into, not a clip.
  const fReg = pane.addFolder({ title: "Framing region", expanded: false });
  fReg.addBinding(T.region, "width", { min: 15, max: 100, step: 0.5, label: "width (% vw)" });
  fReg.addBinding(T.region, "xPct", { min: 0, max: 100, step: 0.5, label: "centre x (%)" });
  fReg.addBinding(T.region, "yPct", { min: 0, max: 100, step: 0.5, label: "centre y (%)" });
  fReg.addBinding(T.camera, "autoFrame", { label: "auto-frame" });
  fReg.addBinding(T.camera, "autoFill", { min: 0.3, max: 1.15, step: 0.01, label: "fills (of region)" });
  fReg.addBinding(T.camera, "fit", { min: 0, max: 1.4, step: 0.01, label: "manual fit" });
  fReg.addBinding(T.camera, "fitAspect", { min: 0.6, max: 2.6, step: 0.01, label: "...authored at" });
  const fMob = fReg.addFolder({ title: "Mobile (under the breakpoint)", expanded: false });
  fMob.addBinding(T.region, "breakpoint", { min: 380, max: 1400, step: 10, label: "breakpoint" });
  fMob.addBinding(T.region.mobile, "width", { min: 20, max: 100, step: 0.5, label: "width (% vw)" });
  fMob.addBinding(T.region.mobile, "xPct", { min: 0, max: 100, step: 0.5, label: "centre x (%)" });
  fMob.addBinding(T.region.mobile, "yPct", { min: 0, max: 100, step: 0.5, label: "centre y (%)" });

  // ── the camera ──────────────────────────────────────────────────────────
  const fCam = pane.addFolder({ title: "Camera", expanded: false });
  fCam.addBinding(T.camera, "x", { min: -80, max: 80, step: 0.5 });
  fCam.addBinding(T.camera, "y", { min: -40, max: 60, step: 0.5 });
  fCam.addBinding(T.camera, "z", { min: 5, max: 200, step: 0.5 });
  fCam.addBinding(T.camera, "lookAtX", { min: -20, max: 20, step: 0.5, label: "look at x" });
  fCam.addBinding(T.camera, "lookAtY", { min: -20, max: 20, step: 0.5, label: "look at y" });
  fCam.addBinding(T.camera, "fov", { min: 5, max: 90, step: 0.5 });
  fCam.addBinding(T.camera, "tiltX", { min: -60, max: 60, step: 0.5, label: "tilt x (°)" });
  fCam.addBinding(T.camera, "tiltZ", { min: -60, max: 60, step: 0.5, label: "the lean (°)" });

  // ── the shape ───────────────────────────────────────────────────────────
  const fL = pane.addFolder({ title: "Shape (rebuild)", expanded: false });
  fL.addBinding(T.layout, "shape", {
    options: { spiral: "spiral", ring: "ring", cylinder: "cylinder", sphere: "sphere", wave: "wave" },
  }).on("change", onRebuild);
  fL.addBinding(T.layout, "radius", { min: 0.5, max: 20, step: 0.05 }).on("change", onRebuild);
  fL.addBinding(T.layout, "spiralTurns", { min: 0.5, max: 8, step: 0.05, label: "turns (spiral)" })
    .on("change", onRebuild);
  fL.addBinding(T.layout, "spiralRise", { min: 0, max: 60, step: 0.1, label: "rise (spiral)" })
    .on("change", onRebuild);
  fL.addBinding(T.layout, "spiralGrow", { min: -10, max: 10, step: 0.05, label: "grow (spiral)" })
    .on("change", onRebuild);
  fL.addBinding(T.layout, "perRow", { min: 3, max: 40, step: 1, label: "per row (cyl/wave)" })
    .on("change", onRebuild);
  fL.addBinding(T.layout, "rows", { min: 1, max: 10, step: 1 }).on("change", onRebuild);
  fL.addBinding(T.layout, "rowGap", { min: 0.5, max: 10, step: 0.05 }).on("change", onRebuild);
  fL.addBinding(T.layout, "curve", { min: -1, max: 1, step: 0.01 }).on("change", onRebuild);
  fL.addBinding(T.layout, "faceCenter", { label: "face the centre" }).on("change", onRebuild);
  fL.addBinding(T.layout, "faceCamera", { label: "billboard" });

  // ── the cards ───────────────────────────────────────────────────────────
  const fG = pane.addFolder({ title: "Cards (rebuild)", expanded: false });
  fG.addBinding(T.images, "source", {
    options: { "teacher portraits": "photos", "metalab cases": "metalab" },
    label: "images",
  }).on("change", onRebuild);
  fG.addBinding(T.images, "video", { label: "video (metalab only)" }).on("change", onRebuild);
  fG.addBinding(T.images, "count", { min: 3, max: 40, step: 1 }).on("change", onRebuild);
  fG.addBinding(T.geometry, "planeW", { min: 0.5, max: 14, step: 0.05, label: "card width" })
    .on("change", onRebuild);
  fG.addBinding(T.geometry, "aspect", { min: 0.4, max: 3, step: 0.01 }).on("change", onRebuild);
  fG.addBinding(T.geometry, "bend", { min: 0, max: 1, step: 0.01 }).on("change", onRebuild);
  fG.addBinding(T.geometry, "segments", { min: 1, max: 48, step: 1 }).on("change", onRebuild);
  fG.addBinding(T.geometry, "borderRadius", { min: 0, max: 0.5, step: 0.005, label: "corner radius" })
    .on("change", onRebuild);
  // 2 = the usual circular corner, 4 = the squircle every app icon uses
  if (!("cornerN" in T.geometry)) T.geometry.cornerN = 2;
  fG.addBinding(T.geometry, "cornerN", { min: 2, max: 8, step: 0.1, label: "corner shape (2=round, 4=squircle)" })
    .on("change", onRebuild);
  fG.addBinding(T.look, "opacity", { min: 0, max: 1, step: 0.01 }).on("change", onLook);
  fG.addBinding(T.look, "solidBg", { label: "solid background" }).on("change", onLook);
  fG.addBinding(T.look, "bgColor", { label: "background" }).on("change", onLook);

  // ── motion ──────────────────────────────────────────────────────────────
  const fM = pane.addFolder({ title: "Motion", expanded: false });
  fM.addBinding(T.motion, "autoSpin", { min: -4, max: 4, step: 0.05, label: "auto spin" });
  fM.addBinding(T.motion, "dragToSpin", { label: "drag to spin" });
  fM.addBinding(T.motion, "invertDrag", { label: "invert drag" });
  fM.addBinding(T.interaction.momentum, "enabled", { label: "glide" });
  fM.addBinding(T.interaction.momentum, "decay", { min: 0.7, max: 0.99, step: 0.005 });
  fM.addBinding(T.interaction.parallax, "enabled", { label: "pointer parallax" });
  fM.addBinding(T.interaction.parallax, "strengthX", { min: 0, max: 12, step: 0.1, label: "parallax x" });
  fM.addBinding(T.interaction.parallax, "strengthY", { min: 0, max: 12, step: 0.1, label: "parallax y" });
  fM.addBinding(T.interaction.parallax, "ease", { min: 0.01, max: 0.3, step: 0.005 });
  fM.addBinding(T.interaction.focus, "enabled", { label: "click to focus" });
  fM.addBinding(T.interaction.focus, "fill", { min: 0.2, max: 0.98, step: 0.01, label: "focus fill" });
  fM.addBinding(T.interaction.focus, "duration", { min: 0.2, max: 3, step: 0.05 });

  // ── per-card motion ─────────────────────────────────────────────────────
  // A GSAP-ticker loop per card, staggered by index: the cards can spin, swing,
  // flip, lean, bob and pulse on their own while the drum turns.
  const fI = pane.addFolder({ title: "Per-card motion", expanded: false });
  fI.addBinding(T.itemMotion, "loopSpeed", { min: 0, max: 4, step: 0.05, label: "clock" });
  fI.addBinding(T.itemMotion, "stagger", { min: 0, max: 2, step: 0.01, label: "stagger" });
  fI.addBinding(T.itemMotion, "spinY", { min: -3, max: 3, step: 0.01, label: "spin (constant)" });
  fI.addBinding(T.itemMotion, "swing", { min: 0, max: 1.6, step: 0.01, label: "swing" });
  fI.addBinding(T.itemMotion, "flip", { min: 0, max: 3.2, step: 0.01, label: "flip" });
  fI.addBinding(T.itemMotion, "flipSpeed", { min: 0, max: 5, step: 0.05, label: "flip speed" });
  fI.addBinding(T.itemMotion, "tiltZ", { min: 0, max: 1.6, step: 0.01, label: "lean (static)" });
  fI.addBinding(T.itemMotion, "tiltAnim", { min: 0, max: 1.6, step: 0.01, label: "lean (animated)" });
  fI.addBinding(T.itemMotion, "bob", { min: 0, max: 4, step: 0.01, label: "bob" });
  fI.addBinding(T.itemMotion, "bobSpeed", { min: 0, max: 5, step: 0.05, label: "bob speed" });
  fI.addBinding(T.itemMotion, "pulse", { min: 0, max: 1, step: 0.01, label: "pulse" });
  fI.addBinding(T.itemMotion, "pulseSpeed", { min: 0, max: 5, step: 0.05, label: "pulse speed" });

  // ── the effects chain ───────────────────────────────────────────────────
  // Generated from `fx.js` so the panel can never list an effect the renderer
  // does not apply, or miss one it does.
  const fFx = pane.addFolder({ title: "Effects", expanded: false });
  for (const effect of FX) {
    const block = T.postfx[effect.key];
    if (!block) continue;
    const f = fFx.addFolder({ title: effect.label, expanded: false });
    f.addBinding(block, "enabled", { label: "on" });
    for (const field of effect.fields) {
      if (!(field.key in block)) continue;
      if (field.options) f.addBinding(block, field.key, { label: field.label, options: field.options });
      else if (field.color) f.addBinding(block, field.key, { label: field.label });
      else if (typeof block[field.key] === "boolean") f.addBinding(block, field.key, { label: field.label });
      else {
        f.addBinding(block, field.key, {
          label: field.label, min: field.min, max: field.max, step: field.step,
        });
      }
    }
  }
  fFx.addButton({ title: "All effects off" }).on("click", () => {
    for (const effect of FX) {
      if (T.postfx[effect.key]) T.postfx[effect.key].enabled = false;
    }
    pane.refresh();
    onChange && onChange();
    say("effects off");
  });

  // ── the page ────────────────────────────────────────────────────────────
  const fP = pane.addFolder({ title: "Copy + nav", expanded: false });
  fP.addBinding(cfg.hero, "showTitle", { label: "title on" }).on("change", onCopy);
  fP.addBinding(cfg.hero, "title", { label: "title ( | = line )" }).on("change", onCopy);
  fP.addBinding(cfg.hero, "titleSize", { min: 1.2, max: 8, step: 0.05, label: "title (vw)" })
    .on("change", onStyle);
  fP.addBinding(cfg.hero, "titleLh", { min: 0.85, max: 1.6, step: 0.01, label: "title lh" })
    .on("change", onStyle);
  fP.addBinding(cfg.hero, "showPara", { label: "para on" }).on("change", onCopy);
  fP.addBinding(cfg.hero, "para", { label: "para ( | = line )" }).on("change", onCopy);
  fP.addBinding(cfg.hero, "paraSize", { min: 0.5, max: 3, step: 0.02, label: "para (vw)" })
    .on("change", onStyle);
  fP.addBinding(cfg.hero, "showCta", { label: "button on" }).on("change", onCopy);
  fP.addBinding(cfg.hero, "cta", { label: "button" }).on("change", onCopy);
  fP.addBinding(cfg.hero, "ctaBg", { label: "button colour" }).on("change", onStyle);
  fP.addBinding(cfg.hero, "reveal", { label: "reveal on load" });
  fP.addBinding(cfg.hero, "x", { min: 20, max: 85, step: 0.5, label: "column at (vw)" })
    .on("change", onStyle);
  fP.addBinding(cfg.hero, "width", { min: 15, max: 60, step: 0.5, label: "measure (vw)" })
    .on("change", onStyle);
  fP.addBinding(cfg.hero, "y", { min: 20, max: 80, step: 0.5, label: "centre at (%)" })
    .on("change", onStyle);
  fP.addBinding(cfg.page, "bg", { label: "paper" }).on("change", onStyle);
  fP.addBinding(cfg.page, "ink", { label: "ink" }).on("change", onStyle);
  fP.addBinding(cfg.nav, "show", { label: "nav" }).on("change", onNav);
  fP.addBinding(cfg.nav, "links", { label: "links (comma)" }).on("change", onNav);
  fP.addBinding(cfg.nav, "pill", { label: "pill" }).on("change", onNav);
  fP.addBinding(cfg.nav, "cta", { label: "log in" }).on("change", onNav);
  fP.addButton({ title: "Replay the copy" }).on("click", onCopy);

  // Autosave. Fires for every binding, including the ones above that already
  // have a handler — the save is debounced, so the double call costs nothing.
  if (onChange) pane.on("change", onChange);

  let visible = true;
  return {
    pane,
    stepLibrary,
    refreshPresets: buildMine,
    get library() {
      return LIBRARY;
    },
    get current() {
      return pick.library;
    },
    get saved() {
      return mineList;
    },
    get visible() {
      return visible;
    },
    hide() {
      visible = false;
      host.style.display = "none";
    },
    show() {
      visible = true;
      host.style.display = "";
    },
    refresh: () => pane.refresh(),
  };
}
