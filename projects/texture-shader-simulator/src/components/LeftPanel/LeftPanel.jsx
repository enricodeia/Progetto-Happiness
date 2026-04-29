import { useEffect, useMemo, useRef, useState } from 'react';
import { PRESETS } from '../../utils/presets.js';
import {
  SHADER_CATEGORIES,
  SHADER_PRESETS,
  getShaderPreset,
  renderPresetThumb
} from '../../utils/shaderEngine.js';
import { harmonize, loadFavorites, saveFavorites } from '../../utils/palette.js';
import { ENGRAVING_FONTS } from '../../utils/engraving.js';
import Dropzone from '../Dropzone/Dropzone.jsx';
import Slider from '../Slider.jsx';
import './LeftPanel.css';

const HARMONIES = [
  { id: 'complement', label: 'Comp' },
  { id: 'analogous', label: 'Analog' },
  { id: 'triadic', label: 'Triad' },
  { id: 'mono-dark', label: 'Mono−' },
  { id: 'mono-light', label: 'Mono+' },
  { id: 'invert', label: 'Invert' }
];

const TABS = [
  { id: 'preset', label: 'Preset' },
  { id: 'image', label: 'Image' },
  { id: 'shader', label: 'Materiali' },
  { id: 'glb', label: 'Model' }
];

// Per-param metadata: range and the step used by the sliders.
const PARAM_META = [
  { key: 'p1', min: 0, max: 64, step: 0.1 },
  { key: 'p2', min: 0, max: 64, step: 0.01 },
  { key: 'p3', min: 0, max: 16, step: 0.01 },
  { key: 'p4', min: 0, max: 8, step: 0.01 },
  { key: 'p5', min: 0, max: 4, step: 0.01 },
  { key: 'p6', min: 0, max: 4, step: 0.01 },
  { key: 'p7', min: 0, max: 4, step: 0.01 },
  { key: 'p8', min: 0, max: 4, step: 0.01 },
  { key: 'p9', min: 0, max: 4, step: 0.01 },
  { key: 'p10', min: 0, max: 4, step: 0.01 },
  { key: 'p11', min: 0, max: 4, step: 0.01 },
  { key: 'p12', min: 0, max: 4, step: 0.01 }
];

// Reusable shader-row renderer (used by both the flat and grouped list views).
const renderShaderRow = (s, shader, setShader, thumbs, favorites, toggleFavorite) => {
  const active = shader.presetId === s.id;
  const thumb = thumbs[s.id];
  const favorited = favorites.has(s.id);
  return (
    <div
      key={s.id}
      className={`shader-row${active ? ' shader-row--active' : ''}`}
    >
      <button
        type="button"
        className="shader-row__main"
        onClick={() => {
          setShader({
            ...shader,
            presetId: s.id,
            code: s.code,
            p1: s.defaults.p1,
            p2: s.defaults.p2,
            p3: s.defaults.p3,
            p4: s.defaults.p4,
            p5: s.defaults.p5 ?? shader.p5,
            p6: s.defaults.p6 ?? shader.p6,
            p7: s.defaults.p7 ?? shader.p7,
            p8: s.defaults.p8 ?? shader.p8,
            p9: s.defaults.p9 ?? shader.p9,
            p10: s.defaults.p10 ?? shader.p10,
            p11: s.defaults.p11 ?? shader.p11,
            p12: s.defaults.p12 ?? shader.p12,
            colorA: s.defaults.colorA,
            colorB: s.defaults.colorB,
            colorC: s.defaults.colorC ?? shader.colorC,
            colorD: s.defaults.colorD ?? shader.colorD
          });
        }}
        title={s.label}
      >
        <span
          className={`shader-row__thumb${thumb ? '' : ' shader-row__thumb--loading'}`}
          style={thumb ? { backgroundImage: `url(${thumb})` } : undefined}
        />
        <span className="shader-row__meta">
          <span className="shader-row__label">{s.label}</span>
          <span className="shader-row__sublabel">
            <span className="shader-row__cat">{s.category}</span>
            <span className="shader-row__id">{s.id}</span>
          </span>
        </span>
      </button>
      <button
        type="button"
        className={`shader-row__fav${favorited ? ' shader-row__fav--on' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          toggleFavorite(s.id);
        }}
        aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
      >
        {favorited ? '★' : '☆'}
      </button>
    </div>
  );
};

// Progressive thumbnail rendering. Updates state in small batches so the user
// sees thumbnails appear as they're produced (instead of staring at empty
// rows for a full second). Render order is randomised lightly so the visible
// area fills in quickly regardless of which category is active.
const useShaderThumbs = () => {
  const [thumbs, setThumbs] = useState({});
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const out = {};
      let pending = 0;
      for (let i = 0; i < SHADER_PRESETS.length; i++) {
        if (cancelled) return;
        const preset = SHADER_PRESETS[i];
        out[preset.id] = renderPresetThumb(preset, { size: 80, seed: 0 });
        pending++;
        // Flush every 6 renders so the UI updates incrementally.
        if (pending >= 6) {
          setThumbs({ ...out });
          pending = 0;
          await new Promise((r) => setTimeout(r, 0));
        }
      }
      if (!cancelled) setThumbs({ ...out });
    };
    run();
    return () => {
      cancelled = true;
    };
  }, []);
  return thumbs;
};

const LeftPanel = ({
  mode,
  setMode,
  activePresetId,
  onSelectPreset,
  onUpload,
  sourceName,
  onClearUpload,
  seamlessStrength,
  setSeamlessStrength,
  shader,
  setShader,
  shaderError,
  animation,
  setAnimation,
  onRandomize,
  onCopyGLSL,
  glbName,
  onGlbUpload,
  onGlbClear,
  engraving,
  setEngraving,
  trail,
  setTrail,
  brushShader,
  setBrushShader,
  gen,
  setGen,
  size,
  setSize,
  searchRef
}) => {
  const updateTrail = (key) => (value) => setTrail({ ...trail, [key]: value });
  const updateBrush = (key) => (value) => setBrushShader({ ...brushShader, [key]: value });

  // brush picker UI state
  const [brushSearch, setBrushSearch] = useState('');
  const [brushCategory, setBrushCategory] = useState('all');
  const [brushPickerOpen, setBrushPickerOpen] = useState(false);

  const filteredBrushPresets = useMemo(() => {
    const q = brushSearch.trim().toLowerCase();
    return SHADER_PRESETS.filter((p) => {
      if (brushCategory !== 'all' && p.category !== brushCategory) return false;
      if (q && !p.label.toLowerCase().includes(q) && !p.id.includes(q)) return false;
      return true;
    });
  }, [brushSearch, brushCategory]);

  const activeBrushPreset = useMemo(
    () => SHADER_PRESETS.find((s) => s.id === brushShader?.presetId) || SHADER_PRESETS[0],
    [brushShader?.presetId]
  );
  const update = (key) => (value) => setGen({ ...gen, [key]: value });
  const updateShader = (key) => (value) => setShader({ ...shader, [key]: value });
  const updateAnim = (key) => (value) => setAnimation({ ...animation, [key]: value });
  const updateEng = (key) => (value) => setEngraving({ ...engraving, [key]: value });

  const thumbs = useShaderThumbs();

  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [favorites, setFavorites] = useState(() => loadFavorites());

  const toggleFavorite = (id) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      saveFavorites(next);
      return next;
    });
  };

  const filteredPresets = useMemo(() => {
    const q = search.trim().toLowerCase();
    return SHADER_PRESETS.filter((p) => {
      if (category === 'favorites' && !favorites.has(p.id)) return false;
      if (category !== 'all' && category !== 'favorites' && p.category !== category) return false;
      if (q && !p.label.toLowerCase().includes(q) && !p.id.includes(q)) return false;
      return true;
    });
  }, [category, search, favorites]);

  // Active preset informs which params actually do something + nice labels
  // for them. Falls back to generic p1..p12 names.
  const activePreset = useMemo(() => getShaderPreset(shader.presetId), [shader.presetId]);
  const paramLabels = activePreset?.paramLabels ?? {};
  const usesColorC = !!activePreset?.usesColorC;
  const usesColorD = !!activePreset?.usesColorD;
  const visibleParamCount = activePreset?.paramCount ?? 8;

  return (
    <aside className="left-panel">
      <header className="left-panel__header">
        <h2 className="left-panel__title">Source</h2>
        <p className="left-panel__subtitle">
          Preset, image, live shader, or a GLB model — pipe it through the
          PBR generator on the right.
        </p>
      </header>

      <div className="left-panel__tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`left-panel__tab${mode === t.id ? ' left-panel__tab--active' : ''}`}
            onClick={() => setMode(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {mode === 'preset' && (
        <section className="left-panel__section">
          <div className="left-panel__section-label">Material presets</div>
          <div className="left-panel__presets">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`preset${activePresetId === p.id ? ' preset--active' : ''}`}
                onClick={() => onSelectPreset(p.id)}
              >
                <span className={`preset__swatch preset__swatch--${p.id}`} />
                <span className="preset__label">{p.label}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {mode === 'image' && (
        <section className="left-panel__section">
          <div className="left-panel__section-label">Upload image</div>
          <Dropzone onFile={onUpload} accept="image/*" hint="JPG / PNG" />
          {sourceName && (
            <div className="left-panel__source-meta">
              <span className="left-panel__source-name" title={sourceName}>
                {sourceName}
              </span>
              <button
                type="button"
                className="left-panel__source-clear"
                onClick={onClearUpload}
              >
                clear
              </button>
            </div>
          )}
          <Slider
            label="Seamless blend"
            value={seamlessStrength}
            min={0}
            max={0.45}
            step={0.01}
            onChange={setSeamlessStrength}
          />
          <p className="left-panel__hint">
            Mirror-blends the edges so the texture tiles without seams.
          </p>
        </section>
      )}

      {mode === 'shader' && (
        <section className="left-panel__section">
          <div className="left-panel__section-header">
            <div className="left-panel__section-label">
              Shaders <span className="left-panel__count">{filteredPresets.length}/{SHADER_PRESETS.length}</span>
            </div>
            <button
              type="button"
              className="left-panel__random"
              onClick={onRandomize}
              title="Randomize shader + params (R)"
            >
              ⚄ Random
            </button>
          </div>

          <input
            ref={searchRef}
            type="text"
            className="left-panel__search"
            placeholder="Search shaders…   ( / )"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <div className="left-panel__chips">
            <button
              type="button"
              className={`chip chip--fav${category === 'favorites' ? ' chip--active' : ''}`}
              onClick={() => setCategory('favorites')}
              title={`Favorites (${favorites.size})`}
            >
              ★ {favorites.size}
            </button>
            {SHADER_CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`chip${category === c.id ? ' chip--active' : ''}`}
                onClick={() => setCategory(c.id)}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div className="left-panel__shader-list">
            {filteredPresets.length === 0 && (
              <div className="left-panel__empty">
                {category === 'favorites'
                  ? 'No favorites yet — click ☆ on a shader to save it.'
                  : 'No shaders match that filter.'}
              </div>
            )}

            {(() => {
              // Group rows by category when no filter is applied; otherwise
              // render flat. Sticky headers separate sections in "All" view.
              const grouped = category === 'all' && search.trim() === '';
              if (!grouped) {
                return filteredPresets.map((s) =>
                  renderShaderRow(s, shader, setShader, thumbs, favorites, toggleFavorite)
                );
              }
              const buckets = {};
              filteredPresets.forEach((p) => {
                (buckets[p.category] ||= []).push(p);
              });
              return SHADER_CATEGORIES.filter((c) => c.id !== 'all').map((c) => {
                const items = buckets[c.id];
                if (!items?.length) return null;
                return (
                  <div key={c.id} className="shader-list__group">
                    <div className="shader-list__header">
                      <span>{c.label}</span>
                      <span className="shader-list__header-count">{items.length}</span>
                    </div>
                    {items.map((s) =>
                      renderShaderRow(s, shader, setShader, thumbs, favorites, toggleFavorite)
                    )}
                  </div>
                );
              });
            })()}
          </div>

          <div className="left-panel__section-label">
            Parameters
            <span className="left-panel__count">{visibleParamCount}</span>
          </div>
          {PARAM_META.slice(0, visibleParamCount).map(({ key, min, max, step }) => (
            <div key={key} className="left-panel__param-row">
              <Slider
                label={paramLabels[key] || key.toUpperCase()}
                value={shader[key] ?? 0}
                min={min}
                max={max}
                step={step}
                onChange={updateShader(key)}
              />
              <label
                className={`left-panel__anim-toggle${shader[`${key}_anim`] ? ' left-panel__anim-toggle--on' : ''}`}
                title="Animate this parameter"
              >
                <input
                  type="checkbox"
                  checked={!!shader[`${key}_anim`]}
                  onChange={(e) => updateShader(`${key}_anim`)(e.target.checked)}
                />
                <span>~</span>
              </label>
            </div>
          ))}

          <div className="left-panel__seed-row">
            <Slider
              label="Seed"
              value={shader.seed}
              min={0}
              max={99}
              step={1}
              format={(v) => `${Math.round(v)}`}
              onChange={updateShader('seed')}
            />
            <button
              type="button"
              className="left-panel__shuffle"
              onClick={() => updateShader('seed')(Math.floor(Math.random() * 100))}
              title="Shuffle seed"
            >
              ↻
            </button>
          </div>

          <div className="left-panel__animation">
            <button
              type="button"
              className={`left-panel__play${animation.playing ? ' left-panel__play--on' : ''}`}
              onClick={() => updateAnim('playing')(!animation.playing)}
            >
              {animation.playing ? '⏸ Pause' : '▶ Play'}
            </button>
            <Slider
              label="Speed"
              value={animation.speed}
              min={0}
              max={4}
              step={0.01}
              onChange={updateAnim('speed')}
            />
            <Slider
              label="Amplitude"
              value={animation.amp}
              min={0}
              max={2}
              step={0.01}
              onChange={updateAnim('amp')}
            />
          </div>

          <div className="left-panel__section-label">Palette</div>
          <div className="left-panel__color-grid">
            <label className="color-swatch">
              <input
                type="color"
                value={shader.colorA}
                onChange={(e) => updateShader('colorA')(e.target.value)}
              />
              <span className="color-swatch__label">A</span>
            </label>
            <label className="color-swatch">
              <input
                type="color"
                value={shader.colorB}
                onChange={(e) => updateShader('colorB')(e.target.value)}
              />
              <span className="color-swatch__label">B</span>
            </label>
            {usesColorC && (
              <label className="color-swatch color-swatch--extra">
                <input
                  type="color"
                  value={shader.colorC || '#ffffff'}
                  onChange={(e) => updateShader('colorC')(e.target.value)}
                />
                <span className="color-swatch__label">C</span>
              </label>
            )}
            {usesColorD && (
              <label className="color-swatch color-swatch--extra">
                <input
                  type="color"
                  value={shader.colorD || '#000000'}
                  onChange={(e) => updateShader('colorD')(e.target.value)}
                />
                <span className="color-swatch__label">D</span>
              </label>
            )}
            <button
              type="button"
              className="left-panel__swap"
              onClick={() => setShader({ ...shader, colorA: shader.colorB, colorB: shader.colorA })}
              title="Swap A ⇄ B"
            >
              ⇄
            </button>
          </div>

          <div className="left-panel__harmonies">
            {HARMONIES.map((h) => (
              <button
                key={h.id}
                type="button"
                className="chip"
                onClick={() => updateShader('colorB')(harmonize(shader.colorA, h.id))}
                title={`Set Color B to ${h.label} of Color A`}
              >
                {h.label}
              </button>
            ))}
          </div>

          <div className="left-panel__section-header">
            <div className="left-panel__section-label">GLSL body</div>
            <button
              type="button"
              className="left-panel__copy-glsl"
              onClick={onCopyGLSL}
              title="Copy the current shader code"
            >
              Copy
            </button>
          </div>
          <textarea
            className="left-panel__shader-code"
            spellCheck={false}
            value={shader.code}
            onChange={(e) => updateShader('code')(e.target.value)}
          />
          {shaderError && <pre className="left-panel__shader-error">{shaderError}</pre>}
          <p className="left-panel__hint">
            Uniforms: <code>vUv</code>, <code>uP1..uP12</code>, <code>uColorA/B/C/D</code>,
            <code> uTime</code>, <code>uSeed</code>. Helpers:
            <code> tnoise</code>, <code>tfbm</code>, <code>tridge</code>,
            <code> tturbulence</code>, <code>dwarp</code>, <code>worley</code>,
            <code> tcaustics</code>, <code>smin</code>.
          </p>
        </section>
      )}

      {mode === 'glb' && (
        <section className="left-panel__section">
          <div className="left-panel__section-label">Upload .glb / .gltf</div>
          <Dropzone onFile={onGlbUpload} accept=".glb,.gltf,model/gltf-binary" hint="Replaces the preview mesh" />
          {glbName && (
            <div className="left-panel__source-meta">
              <span className="left-panel__source-name" title={glbName}>
                {glbName}
              </span>
              <button
                type="button"
                className="left-panel__source-clear"
                onClick={onGlbClear}
              >
                clear
              </button>
            </div>
          )}
          <p className="left-panel__hint">
            The generated material is applied to every mesh in the GLB. UV
            layout must exist in the model for textures to map correctly.
          </p>

          <section className={`left-panel__section trail${trail?.enabled ? ' trail--on' : ''}`}>
            <div className="left-panel__section-header">
              <div className="left-panel__section-label">
                Cursor shader
                {trail?.enabled && <span className="left-panel__count trail__badge">live</span>}
              </div>
              <label className="engraving__switch" title="Enable cursor shader brush">
                <input
                  type="checkbox"
                  checked={!!trail?.enabled}
                  onChange={(e) => updateTrail('enabled')(e.target.checked)}
                />
                <span />
              </label>
            </div>

            {trail?.enabled && (
              <>
                <p className="left-panel__hint">
                  Move your cursor over the model — it leaves a trail painted
                  with the brush shader picked below. The model material
                  stays clean; only the brush carries the pattern.
                </p>

                {/* ───────────── BRUSH SHADER PICKER ───────────── */}
                <div className="left-panel__section-label">
                  Brush shader
                  <span className="left-panel__count">{SHADER_PRESETS.length}</span>
                </div>

                <button
                  type="button"
                  className={`brush-current${brushPickerOpen ? ' brush-current--open' : ''}`}
                  onClick={() => setBrushPickerOpen(!brushPickerOpen)}
                  title="Open brush shader picker"
                >
                  <span
                    className="brush-current__thumb"
                    style={
                      thumbs[activeBrushPreset.id]
                        ? { backgroundImage: `url(${thumbs[activeBrushPreset.id]})` }
                        : undefined
                    }
                  />
                  <span className="brush-current__meta">
                    <span className="brush-current__label">{activeBrushPreset.label}</span>
                    <span className="brush-current__cat">{activeBrushPreset.category}</span>
                  </span>
                  <span className="brush-current__chev">{brushPickerOpen ? '▾' : '▸'}</span>
                </button>

                {brushPickerOpen && (
                  <>
                    <input
                      type="text"
                      className="left-panel__search"
                      placeholder="Search brush shaders…"
                      value={brushSearch}
                      onChange={(e) => setBrushSearch(e.target.value)}
                    />
                    <div className="left-panel__chips">
                      {SHADER_CATEGORIES.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          className={`chip${brushCategory === c.id ? ' chip--active' : ''}`}
                          onClick={() => setBrushCategory(c.id)}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                    <div className="left-panel__shader-list left-panel__shader-list--brush">
                      {filteredBrushPresets.map((s) => {
                        const active = brushShader?.presetId === s.id;
                        const thumb = thumbs[s.id];
                        return (
                          <div
                            key={s.id}
                            className={`shader-row${active ? ' shader-row--active' : ''}`}
                          >
                            <button
                              type="button"
                              className="shader-row__main"
                              onClick={() => {
                                setBrushShader({
                                  ...brushShader,
                                  presetId: s.id,
                                  code: s.code,
                                  p1: s.defaults.p1,
                                  p2: s.defaults.p2,
                                  p3: s.defaults.p3,
                                  p4: s.defaults.p4,
                                  colorA: s.defaults.colorA,
                                  colorB: s.defaults.colorB,
                                  colorC: s.defaults.colorC ?? brushShader.colorC,
                                  colorD: s.defaults.colorD ?? brushShader.colorD
                                });
                              }}
                              title={s.label}
                            >
                              <span
                                className={`shader-row__thumb${thumb ? '' : ' shader-row__thumb--loading'}`}
                                style={thumb ? { backgroundImage: `url(${thumb})` } : undefined}
                              />
                              <span className="shader-row__meta">
                                <span className="shader-row__label">{s.label}</span>
                                <span className="shader-row__sublabel">
                                  <span className="shader-row__cat">{s.category}</span>
                                </span>
                              </span>
                            </button>
                          </div>
                        );
                      })}
                      {filteredBrushPresets.length === 0 && (
                        <div className="left-panel__empty">No shaders match.</div>
                      )}
                    </div>
                  </>
                )}

                <div className="left-panel__section-label">Brush parameters</div>
                <Slider label="p1" value={brushShader.p1 ?? 0} min={0} max={64} step={0.1}
                  onChange={updateBrush('p1')} />
                <Slider label="p2" value={brushShader.p2 ?? 0} min={0} max={64} step={0.01}
                  onChange={updateBrush('p2')} />
                <Slider label="p3" value={brushShader.p3 ?? 0} min={0} max={16} step={0.01}
                  onChange={updateBrush('p3')} />
                <Slider label="p4" value={brushShader.p4 ?? 0} min={0} max={8} step={0.01}
                  onChange={updateBrush('p4')} />

                <div className="left-panel__color-grid">
                  <label className="color-swatch">
                    <input
                      type="color"
                      value={brushShader.colorA}
                      onChange={(e) => updateBrush('colorA')(e.target.value)}
                    />
                    <span className="color-swatch__label">A</span>
                  </label>
                  <label className="color-swatch">
                    <input
                      type="color"
                      value={brushShader.colorB}
                      onChange={(e) => updateBrush('colorB')(e.target.value)}
                    />
                    <span className="color-swatch__label">B</span>
                  </label>
                  <button
                    type="button"
                    className="left-panel__swap"
                    onClick={() => setBrushShader({
                      ...brushShader,
                      colorA: brushShader.colorB,
                      colorB: brushShader.colorA
                    })}
                    title="Swap A ⇄ B"
                  >⇄</button>
                </div>

                <div className="left-panel__seed-row">
                  <Slider
                    label="Seed"
                    value={brushShader.seed ?? 0}
                    min={0} max={99} step={1}
                    format={(v) => `${Math.round(v)}`}
                    onChange={updateBrush('seed')}
                  />
                  <button
                    type="button"
                    className="left-panel__shuffle"
                    onClick={() => updateBrush('seed')(Math.floor(Math.random() * 100))}
                    title="Shuffle brush seed"
                  >↻</button>
                </div>

                <div className="left-panel__section-label">Trail</div>
                <Slider
                  label="Decay"
                  value={trail.decay}
                  min={0.5}
                  max={1}
                  step={0.001}
                  format={(v) => v.toFixed(3)}
                  onChange={updateTrail('decay')}
                />
                <Slider
                  label="Brush radius"
                  value={trail.radius}
                  min={0.005}
                  max={0.5}
                  step={0.005}
                  format={(v) => `${(v * 100).toFixed(1)}%`}
                  onChange={updateTrail('radius')}
                />
                <Slider
                  label="Brush strength"
                  value={trail.strength}
                  min={0}
                  max={3}
                  step={0.01}
                  onChange={updateTrail('strength')}
                />
                <Slider
                  label="Hardness"
                  value={trail.hardness ?? 0.35}
                  min={0}
                  max={1}
                  step={0.01}
                  onChange={updateTrail('hardness')}
                />
                <Slider
                  label="Flow"
                  value={trail.flow ?? 0.7}
                  min={0}
                  max={1}
                  step={0.01}
                  onChange={updateTrail('flow')}
                />
                <Slider
                  label="Stretch (velocity)"
                  value={trail.stretch ?? 0.45}
                  min={0}
                  max={1}
                  step={0.01}
                  onChange={updateTrail('stretch')}
                />
                <Slider
                  label="Edge warp"
                  value={trail.warp ?? 0.6}
                  min={0}
                  max={1}
                  step={0.01}
                  onChange={updateTrail('warp')}
                />
                <Slider
                  label="Center highlight"
                  value={trail.highlight ?? 0.35}
                  min={0}
                  max={1.5}
                  step={0.01}
                  onChange={updateTrail('highlight')}
                />
                <Slider
                  label="Pattern mix"
                  value={trail.patternMix}
                  min={0}
                  max={1}
                  step={0.01}
                  onChange={updateTrail('patternMix')}
                />
                <Slider
                  label="Bump scale"
                  value={trail.bumpScale}
                  min={0}
                  max={1}
                  step={0.005}
                  onChange={updateTrail('bumpScale')}
                />
                <Slider
                  label="Displacement"
                  value={trail.displacement}
                  min={0}
                  max={0.5}
                  step={0.005}
                  onChange={updateTrail('displacement')}
                />
              </>
            )}
          </section>
        </section>
      )}

      <section className="left-panel__section">
        <div className="left-panel__section-label">Source adjustments</div>
        <Slider
          label="Brightness"
          value={gen.brightness}
          min={-0.5}
          max={0.5}
          step={0.01}
          onChange={update('brightness')}
        />
        <Slider
          label="Contrast"
          value={gen.contrast}
          min={-1}
          max={1}
          step={0.01}
          onChange={update('contrast')}
        />
        <Slider
          label="Saturation"
          value={gen.saturation}
          min={0}
          max={2}
          step={0.01}
          onChange={update('saturation')}
        />
      </section>

      <section className={`left-panel__section engraving${engraving?.enabled ? ' engraving--on' : ''}`}>
        <div className="left-panel__section-header">
          <div className="left-panel__section-label">
            Engraving
            {engraving?.enabled && <span className="left-panel__count engraving__badge">on</span>}
          </div>
          <label className="engraving__switch" title="Toggle engraving overlay">
            <input
              type="checkbox"
              checked={!!engraving?.enabled}
              onChange={(e) => updateEng('enabled')(e.target.checked)}
            />
            <span />
          </label>
        </div>

        {engraving?.enabled && (
          <>
            <input
              type="text"
              className="engraving__text"
              maxLength={120}
              placeholder="Type the inscription…"
              value={engraving.text}
              onChange={(e) => updateEng('text')(e.target.value)}
            />

            <div className="engraving__row">
              <select
                className="engraving__select"
                value={engraving.font}
                onChange={(e) => updateEng('font')(e.target.value)}
              >
                {ENGRAVING_FONTS.map((f) => (
                  <option key={f} value={f} style={{ fontFamily: f }}>
                    {f}
                  </option>
                ))}
              </select>
              <select
                className="engraving__select engraving__select--narrow"
                value={engraving.weight}
                onChange={(e) => updateEng('weight')(parseInt(e.target.value, 10))}
              >
                <option value={300}>Light</option>
                <option value={400}>Regular</option>
                <option value={600}>Semibold</option>
                <option value={700}>Bold</option>
                <option value={900}>Black</option>
              </select>
            </div>

            <Slider
              label="Font size"
              value={engraving.fontSizeRel}
              min={0.04}
              max={0.5}
              step={0.005}
              format={(v) => `${(v * 100).toFixed(0)}%`}
              onChange={updateEng('fontSizeRel')}
            />
            <Slider
              label="Letter spacing"
              value={engraving.letterSpacing}
              min={-10}
              max={40}
              step={0.5}
              format={(v) => `${v.toFixed(1)}px`}
              onChange={updateEng('letterSpacing')}
            />

            <div className="engraving__row">
              <Slider
                label="X"
                value={engraving.x}
                min={0}
                max={1}
                step={0.005}
                format={(v) => `${(v * 100).toFixed(0)}%`}
                onChange={updateEng('x')}
              />
              <Slider
                label="Y"
                value={engraving.y}
                min={0}
                max={1}
                step={0.005}
                format={(v) => `${(v * 100).toFixed(0)}%`}
                onChange={updateEng('y')}
              />
            </div>
            <Slider
              label="Rotation"
              value={engraving.rotationDeg}
              min={-180}
              max={180}
              step={1}
              format={(v) => `${Math.round(v)}°`}
              onChange={updateEng('rotationDeg')}
            />

            <div className="engraving__mode">
              {[
                { id: 'engrave', label: '◣ Engrave' },
                { id: 'emboss', label: '◤ Emboss' }
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={`pill${engraving.mode === m.id ? ' pill--active' : ''}`}
                  onClick={() => updateEng('mode')(m.id)}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <Slider
              label="Depth"
              value={engraving.depth}
              min={0}
              max={1}
              step={0.01}
              onChange={updateEng('depth')}
            />
            <Slider
              label="Bevel softness"
              value={engraving.bevel}
              min={0}
              max={0.04}
              step={0.001}
              format={(v) => `${(v * 100).toFixed(1)}%`}
              onChange={updateEng('bevel')}
            />
            <Slider
              label="Diffuse darken"
              value={engraving.darken}
              min={0}
              max={1}
              step={0.01}
              onChange={updateEng('darken')}
            />

            <p className="left-panel__hint">
              The text is folded into the height map before normals/AO/displacement
              are computed, so the inscription gets real shading + bevels.
              Crank Displacement scale on the right to make it physically protrude.
            </p>
          </>
        )}
      </section>

      <section className="left-panel__section">
        <div className="left-panel__section-label">Resolution</div>
        <div className="left-panel__resolution">
          {[256, 512, 1024, 2048].map((s) => (
            <button
              key={s}
              type="button"
              className={`pill${size === s ? ' pill--active' : ''}`}
              onClick={() => setSize(s)}
            >
              {s}
            </button>
          ))}
        </div>
        <p className="left-panel__hint">
          512 for fast iteration, 2048 for export-quality. Mip-mapping +
          16x anisotropy is on regardless.
        </p>
      </section>
    </aside>
  );
};

export default LeftPanel;
