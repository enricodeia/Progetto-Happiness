import { useRef } from 'react';
import MapPreview from '../MapPreview/MapPreview.jsx';
import Slider from '../Slider.jsx';
import { MATERIAL_TYPES } from '../../utils/materialPresets.js';
import './RightPanel.css';

const ENVIRONMENTS = ['studio', 'city', 'sunset', 'warehouse', 'forest', 'night'];
// Cubemaps stolen from prinzipiell/tsl (Tinker Day 16) — 8 stylized 360 sky boxes.
const CUBEMAPS = [
  { id: '1', label: 'Sky 1 — Dawn' },
  { id: '2', label: 'Sky 2 — Noon' },
  { id: '3', label: 'Sky 3 — Cloudy' },
  { id: '4', label: 'Sky 4 — Storm' },
  { id: '5', label: 'Sky 5 — Sunset' },
  { id: '6', label: 'Sky 6 — Dusk' },
  { id: '7', label: 'Sky 7 — Night' },
  { id: '8', label: 'Sky 8 — Studio' }
];
const GEOMETRIES = [
  { id: 'sphere', label: 'Sphere' },
  { id: 'box', label: 'Cube' },
  { id: 'torus', label: 'Torus knot' },
  { id: 'plane', label: 'Plane' },
  { id: 'text', label: 'Text 3D' }
];
const LIGHTING_OPTIONS = [
  { id: 'studio', label: 'Studio' },
  { id: 'dramatic', label: 'Dramatic' },
  { id: 'moonlight', label: 'Moonlight' },
  { id: 'backlit', label: 'Backlit' }
];

const RightPanel = ({
  gen,
  setGen,
  material,
  setMaterial,
  maps,
  onExport,
  onReset,
  geometry,
  setGeometry,
  environment,
  setEnvironment,
  rotate,
  setRotate,
  lighting,
  setLighting,
  showTilePreview,
  setShowTilePreview,
  text3d,
  setText3d,
  assets,
  onSaveAsset,
  onLoadAsset,
  onDeleteAsset,
  materialType,
  onMaterialType,
  hdrName,
  onHdrUpload,
  onHdrClear,
  showBackground,
  setShowBackground,
  bgBlur,
  setBgBlur,
  hdrRotationY,
  setHdrRotationY,
  envIntensity,
  setEnvIntensity,
  bgIntensity,
  setBgIntensity,
  cubemapId,
  setCubemapId
}) => {
  const hdrInputRef = useRef(null);
  const updateGen = (key) => (value) => setGen({ ...gen, [key]: value });
  const updateMat = (key) => (value) => setMaterial({ ...material, [key]: value });

  return (
    <aside className="right-panel">
      <header className="right-panel__header">
        <h2 className="right-panel__title">Material</h2>
        <p className="right-panel__subtitle">
          Pick a physical preset, then dial in the maps + scalars below.
        </p>
      </header>

      <section className="right-panel__section">
        <div className="right-panel__section-label">Material type</div>
        <div className="right-panel__mat-grid">
          {MATERIAL_TYPES.map((m) => (
            <button
              key={m.id}
              type="button"
              className={`mat-chip${materialType === m.id ? ' mat-chip--active' : ''}`}
              onClick={() => onMaterialType(m.id)}
              title={m.label}
            >
              <span className="mat-chip__icon">{m.icon}</span>
              <span className="mat-chip__label">{m.label}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="right-panel__section">
        <div className="right-panel__section-label">Physical (transmission / clearcoat / sheen)</div>
        <Slider
          label="Transmission"
          value={material.transmission ?? 0}
          min={0} max={1} step={0.01}
          onChange={updateMat('transmission')}
        />
        <Slider
          label="Thickness"
          value={material.thickness ?? 0}
          min={0} max={3} step={0.01}
          onChange={updateMat('thickness')}
        />
        <Slider
          label="IOR"
          value={material.ior ?? 1.5}
          min={1} max={2.5} step={0.01}
          onChange={updateMat('ior')}
        />
        <Slider
          label="Clearcoat"
          value={material.clearcoat ?? 0}
          min={0} max={1} step={0.01}
          onChange={updateMat('clearcoat')}
        />
        <Slider
          label="Clearcoat roughness"
          value={material.clearcoatRoughness ?? 0}
          min={0} max={1} step={0.01}
          onChange={updateMat('clearcoatRoughness')}
        />
        <Slider
          label="Sheen"
          value={material.sheen ?? 0}
          min={0} max={1} step={0.01}
          onChange={updateMat('sheen')}
        />
        <Slider
          label="Sheen roughness"
          value={material.sheenRoughness ?? 0}
          min={0} max={1} step={0.01}
          onChange={updateMat('sheenRoughness')}
        />
        <Slider
          label="Anisotropy"
          value={material.anisotropy ?? 0}
          min={0} max={1} step={0.01}
          onChange={updateMat('anisotropy')}
        />
        <Slider
          label="Anisotropy rotation"
          value={material.anisotropyRotation ?? 0}
          min={0} max={Math.PI * 2} step={0.01}
          format={(v) => `${((v / Math.PI) * 180).toFixed(0)}°`}
          onChange={updateMat('anisotropyRotation')}
        />
        <Slider
          label="Iridescence"
          value={material.iridescence ?? 0}
          min={0} max={1} step={0.01}
          onChange={updateMat('iridescence')}
        />
        <Slider
          label="Iridescence IOR"
          value={material.iridescenceIOR ?? 1.3}
          min={1} max={2.4} step={0.01}
          onChange={updateMat('iridescenceIOR')}
        />
        <Slider
          label="Iridescence thickness min"
          value={material.iridescenceThicknessMin ?? 100}
          min={0} max={1000} step={1}
          format={(v) => `${Math.round(v)} nm`}
          onChange={updateMat('iridescenceThicknessMin')}
        />
        <Slider
          label="Iridescence thickness max"
          value={material.iridescenceThicknessMax ?? 400}
          min={0} max={1000} step={1}
          format={(v) => `${Math.round(v)} nm`}
          onChange={updateMat('iridescenceThicknessMax')}
        />
        <Slider
          label="Attenuation distance"
          value={material.attenuationDistance ?? 0}
          min={0} max={5} step={0.05}
          onChange={updateMat('attenuationDistance')}
        />
        <div className="right-panel__color-row">
          <label className="right-panel__color">
            <span>Sheen</span>
            <input
              type="color"
              value={material.sheenColor || '#ffffff'}
              onChange={(e) => updateMat('sheenColor')(e.target.value)}
            />
          </label>
          <label className="right-panel__color">
            <span>Attenuate</span>
            <input
              type="color"
              value={material.attenuationColor || '#ffffff'}
              onChange={(e) => updateMat('attenuationColor')(e.target.value)}
            />
          </label>
        </div>
        <p className="right-panel__hint">
          Transmission + IOR = real glass refraction. Clearcoat = wet gloss.
          Sheen = velvet/silk rim. Iridescence = thin-film soap-bubble effect.
        </p>
      </section>

      <section className="right-panel__section">
        <div className="right-panel__section-label">Specular control (F0)</div>
        <Slider
          label="Specular intensity"
          value={material.specularIntensity ?? 1}
          min={0} max={1} step={0.01}
          onChange={updateMat('specularIntensity')}
        />
        <div className="right-panel__color-row">
          <label className="right-panel__color">
            <span>Specular tint</span>
            <input
              type="color"
              value={material.specularColor || '#ffffff'}
              onChange={(e) => updateMat('specularColor')(e.target.value)}
            />
          </label>
        </div>
      </section>

      <section className="right-panel__section">
        <div className="right-panel__section-label">Emissive (glow)</div>
        <Slider
          label="Emissive intensity"
          value={material.emissiveIntensity ?? 0}
          min={0} max={4} step={0.01}
          onChange={updateMat('emissiveIntensity')}
        />
        <div className="right-panel__color-row">
          <label className="right-panel__color">
            <span>Emissive</span>
            <input
              type="color"
              value={material.emissiveColor || '#000000'}
              onChange={(e) => updateMat('emissiveColor')(e.target.value)}
            />
          </label>
        </div>
        <p className="right-panel__hint">
          Self-illumination. Use for lava, neon, bioluminescence, screens.
        </p>
      </section>

      <section className="right-panel__section">
        <div className="right-panel__section-label">Renderer</div>
        <Slider
          label="Tone-mapping exposure"
          value={material.exposure ?? 1}
          min={0.1} max={3} step={0.01}
          onChange={updateMat('exposure')}
        />
      </section>

      <section className="right-panel__section">
        <div className="right-panel__section-label">Normal map</div>
        <Slider
          label="Strength"
          value={gen.normalStrength}
          min={0}
          max={8}
          step={0.05}
          onChange={updateGen('normalStrength')}
        />
        <label className="right-panel__toggle">
          <input
            type="checkbox"
            checked={gen.normalInvertY}
            onChange={(e) => updateGen('normalInvertY')(e.target.checked)}
          />
          <span>Invert Y (DirectX)</span>
        </label>
        <Slider
          label="Smoothing (gauss px)"
          value={gen.normalSmoothing ?? 0}
          min={0}
          max={6}
          step={1}
          format={(v) => `${Math.round(v)}px`}
          onChange={updateGen('normalSmoothing')}
        />
      </section>

      <section className="right-panel__section">
        <div className="right-panel__section-label">Height / Bump</div>
        <Slider
          label="Levels"
          value={gen.heightLevels}
          min={0.3}
          max={3}
          step={0.01}
          onChange={updateGen('heightLevels')}
        />
        <label className="right-panel__toggle">
          <input
            type="checkbox"
            checked={gen.heightInvert}
            onChange={(e) => updateGen('heightInvert')(e.target.checked)}
          />
          <span>Invert heightmap</span>
        </label>
        <Slider
          label="Bump scale"
          value={material.bumpScale}
          min={0}
          max={0.3}
          step={0.001}
          onChange={updateMat('bumpScale')}
        />
      </section>

      <section className="right-panel__section">
        <div className="right-panel__section-label">Roughness</div>
        <Slider
          label="Base"
          value={gen.roughnessBase}
          min={0}
          max={1}
          step={0.01}
          onChange={updateGen('roughnessBase')}
        />
        <Slider
          label="Variation"
          value={gen.roughnessVariation}
          min={0}
          max={1.5}
          step={0.01}
          onChange={updateGen('roughnessVariation')}
        />
        <label className="right-panel__toggle">
          <input
            type="checkbox"
            checked={gen.roughnessInvert}
            onChange={(e) => updateGen('roughnessInvert')(e.target.checked)}
          />
          <span>Invert</span>
        </label>
      </section>

      <section className="right-panel__section">
        <div className="right-panel__section-label">Ambient occlusion</div>
        <Slider
          label="Strength"
          value={gen.aoStrength}
          min={0}
          max={4}
          step={0.05}
          onChange={updateGen('aoStrength')}
        />
        <Slider
          label="Radius"
          value={gen.aoRadius}
          min={1}
          max={6}
          step={1}
          format={(v) => `${Math.round(v)}px`}
          onChange={updateGen('aoRadius')}
        />
      </section>

      <section className="right-panel__section">
        <div className="right-panel__section-label">Displacement (real extrusion)</div>
        <Slider
          label="Displacement scale"
          value={material.displacementScale}
          min={0}
          max={0.5}
          step={0.005}
          onChange={updateMat('displacementScale')}
        />
        <Slider
          label="Displacement gamma"
          value={gen.displacementGamma}
          min={0.3}
          max={3}
          step={0.01}
          onChange={updateGen('displacementGamma')}
        />
        <Slider
          label="Displacement bias"
          value={gen.displacementBias}
          min={-0.5}
          max={0.5}
          step={0.01}
          onChange={updateGen('displacementBias')}
        />
        <p className="right-panel__hint">
          Actually deforms the mesh vertices — use with Plane or high-poly shapes.
        </p>
      </section>

      <section className="right-panel__section">
        <div className="right-panel__section-label">Material properties</div>
        <Slider
          label="Metalness"
          value={material.metalness}
          min={0}
          max={1}
          step={0.01}
          onChange={updateMat('metalness')}
        />
        <Slider
          label="Roughness multiplier"
          value={material.roughness}
          min={0}
          max={1}
          step={0.01}
          onChange={updateMat('roughness')}
        />
        <Slider
          label="Normal scale"
          value={material.normalScale}
          min={0}
          max={4}
          step={0.05}
          onChange={updateMat('normalScale')}
        />
        <Slider
          label="Repeat"
          value={material.repeat}
          min={1}
          max={8}
          step={1}
          format={(v) => `${Math.round(v)}x`}
          onChange={updateMat('repeat')}
        />
        <Slider
          label="Env intensity"
          value={material.envIntensity}
          min={0}
          max={3}
          step={0.05}
          onChange={updateMat('envIntensity')}
        />
      </section>

      <section className="right-panel__section">
        <div className="right-panel__section-label">Scene</div>
        <div className="right-panel__row">
          {GEOMETRIES.map((g) => (
            <button
              key={g.id}
              type="button"
              className={`pill${geometry === g.id ? ' pill--active' : ''}`}
              onClick={() => setGeometry(g.id)}
            >
              {g.label}
            </button>
          ))}
        </div>

        {geometry === 'text' && text3d && setText3d && (
          <div className="right-panel__text3d">
            <input
              type="text"
              className="right-panel__text-input"
              maxLength={60}
              placeholder="Type something…"
              value={text3d.text}
              onChange={(e) => setText3d({ ...text3d, text: e.target.value })}
            />
            <Slider
              label="Size"
              value={text3d.size}
              min={0.2}
              max={2}
              step={0.01}
              onChange={(v) => setText3d({ ...text3d, size: v })}
            />
            <Slider
              label="Depth"
              value={text3d.depth}
              min={0.01}
              max={1}
              step={0.005}
              onChange={(v) => setText3d({ ...text3d, depth: v })}
            />
            <Slider
              label="Bevel"
              value={text3d.bevel}
              min={0}
              max={0.1}
              step={0.001}
              onChange={(v) => setText3d({ ...text3d, bevel: v })}
            />
          </div>
        )}
        <div className="right-panel__section-label">Environment</div>
        <select
          className="right-panel__select"
          value={environment}
          onChange={(e) => { setEnvironment(e.target.value); setCubemapId?.(null); }}
          disabled={!!hdrName || !!cubemapId}
        >
          {ENVIRONMENTS.map((e) => (
            <option key={e} value={e}>
              Preset: {e}
            </option>
          ))}
        </select>

        <div className="right-panel__section-label" style={{ marginTop: 8 }}>
          Sky cubemap (swap background)
        </div>
        <select
          className="right-panel__select"
          value={cubemapId ?? ''}
          onChange={(e) => setCubemapId?.(e.target.value || null)}
          disabled={!!hdrName}
        >
          <option value="">— off —</option>
          {CUBEMAPS.map((c) => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>

        <div className="right-panel__hdr-row">
          <button
            type="button"
            className="right-panel__hdr-btn"
            onClick={() => hdrInputRef.current?.click()}
          >
            ☼ {hdrName ? 'Replace HDR' : 'Upload HDR / EXR'}
          </button>
          <input
            ref={hdrInputRef}
            type="file"
            accept=".hdr,.exr"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onHdrUpload(f);
              e.target.value = '';
            }}
          />
          {hdrName && (
            <button
              type="button"
              className="right-panel__hdr-clear"
              onClick={onHdrClear}
              title="Drop HDR and revert to preset"
            >
              ×
            </button>
          )}
        </div>
        {hdrName && (
          <div className="right-panel__hdr-name" title={hdrName}>
            <span className="right-panel__hdr-dot" /> {hdrName}
          </div>
        )}
        <p className="right-panel__hint">
          Drop a <code>.hdr</code> or <code>.exr</code> here (or anywhere) to use
          your own image-based lighting. Tip: try <code>polyhaven.com/hdris</code>.
        </p>

        <Slider
          label="Env intensity"
          value={envIntensity ?? 1}
          min={0} max={3} step={0.01}
          onChange={setEnvIntensity}
        />
        <Slider
          label="Env rotation Y"
          value={hdrRotationY ?? 0}
          min={-Math.PI} max={Math.PI} step={0.01}
          format={(v) => `${((v / Math.PI) * 180).toFixed(0)}°`}
          onChange={setHdrRotationY}
        />

        <label className="right-panel__toggle">
          <input
            type="checkbox"
            checked={showBackground}
            onChange={(e) => setShowBackground(e.target.checked)}
          />
          <span>Show env as background</span>
        </label>
        {showBackground && (
          <>
            <Slider
              label="Background blur"
              value={bgBlur ?? 0}
              min={0} max={1} step={0.01}
              onChange={setBgBlur}
            />
            <Slider
              label="Background intensity"
              value={bgIntensity ?? 1}
              min={0} max={3} step={0.01}
              onChange={setBgIntensity}
            />
          </>
        )}

        <div className="right-panel__section-label">Lighting rig</div>
        <div className="right-panel__row">
          {LIGHTING_OPTIONS.map((l) => (
            <button
              key={l.id}
              type="button"
              className={`pill${lighting === l.id ? ' pill--active' : ''}`}
              onClick={() => setLighting(l.id)}
            >
              {l.label}
            </button>
          ))}
        </div>

        <label className="right-panel__toggle">
          <input
            type="checkbox"
            checked={rotate}
            onChange={(e) => setRotate(e.target.checked)}
          />
          <span>Auto-rotate</span>
        </label>
        <label className="right-panel__toggle">
          <input
            type="checkbox"
            checked={showTilePreview}
            onChange={(e) => setShowTilePreview(e.target.checked)}
          />
          <span>Show tile preview</span>
        </label>
      </section>

      <section className="right-panel__section">
        <div className="right-panel__section-label">Generated maps</div>
        <div className="right-panel__maps">
          {maps?.diffuse && <MapPreview imageData={maps.diffuse} label="Diffuse" />}
          {maps?.normal && <MapPreview imageData={maps.normal} label="Normal" />}
          {maps?.roughness && <MapPreview imageData={maps.roughness} label="Roughness" />}
          {maps?.height && <MapPreview imageData={maps.height} label="Height" />}
          {maps?.ao && <MapPreview imageData={maps.ao} label="AO" />}
          {maps?.displacement && <MapPreview imageData={maps.displacement} label="Displace" />}
        </div>
      </section>

      {assets && (
        <section className="right-panel__section">
          <div className="right-panel__section-header">
            <div className="right-panel__section-label">
              Asset library
              <span className="right-panel__count">{assets.length}</span>
            </div>
            <button
              type="button"
              className="right-panel__save-asset"
              onClick={onSaveAsset}
              title="Save the current material as a named asset"
            >
              + Save
            </button>
          </div>
          {assets.length === 0 ? (
            <p className="right-panel__hint">
              Save the current material to build your own library. Reload anytime.
            </p>
          ) : (
            <div className="right-panel__asset-grid">
              {assets.map((a) => (
                <div key={a.id} className="asset-tile">
                  <button
                    className="asset-tile__main"
                    onClick={() => onLoadAsset(a)}
                    title={`Load: ${a.name}`}
                  >
                    {a.thumb ? (
                      <img src={a.thumb} alt={a.name} className="asset-tile__thumb" />
                    ) : (
                      <span className="asset-tile__thumb asset-tile__thumb--empty" />
                    )}
                    <span className="asset-tile__name">{a.name}</span>
                  </button>
                  <button
                    className="asset-tile__delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteAsset(a.id);
                    }}
                    title="Delete asset"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <footer className="right-panel__footer">
        <button type="button" className="right-panel__btn right-panel__btn--ghost" onClick={onReset}>
          Reset
        </button>
        <button type="button" className="right-panel__btn right-panel__btn--primary" onClick={onExport}>
          Export
        </button>
      </footer>
    </aside>
  );
};

export default RightPanel;
