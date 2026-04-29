import { useEffect, useMemo, useRef, useState } from 'react';
import Scene from './components/Scene/Scene.jsx';
import LeftPanel from './components/LeftPanel/LeftPanel.jsx';
import RightPanel from './components/RightPanel/RightPanel.jsx';
import ExportModal from './components/ExportModal/ExportModal.jsx';
import HelpModal from './components/HelpModal/HelpModal.jsx';
import Toast, { useToasts } from './components/Toast/Toast.jsx';
import { PRESETS, getPreset } from './utils/presets.js';
import {
  SHADER_PRESETS,
  randomShaderState,
  renderShader
} from './utils/shaderEngine.js';
import {
  generateMaps,
  imageDataToCanvas,
  loadImageToImageData,
  makeSeamless
} from './utils/textureMaps.js';
import {
  buildThumbFromCanvas,
  loadAssets,
  newAsset,
  saveAssets
} from './utils/assets.js';
import { MATERIAL_TYPES, getMaterialType } from './utils/materialPresets.js';
import { renderEngraving } from './utils/engraving.js';
import {
  buildMaterialFromAsset,
  disposeMaterial
} from './utils/materialBuilder.js';
import { exportSceneAsGlb } from './utils/glbExporter.js';
import Toolbox from './components/Toolbox/Toolbox.jsx';
import './App.css';

const DEFAULT_GEN = {
  brightness: 0,
  contrast: 0.15,         // a touch of contrast helps maps read better
  saturation: 1,
  heightInvert: false,
  heightLevels: 1,
  normalStrength: 3,      // stronger relief out of the box
  normalInvertY: false,
  normalSmoothing: 1,     // px gaussian blur on height before sobel — smooth shading
  roughnessBase: 0.65,    // matte-ish, not mirror
  roughnessVariation: 0.55,
  roughnessInvert: false,
  aoStrength: 1.5,
  aoRadius: 2,
  displacementGamma: 1,
  displacementBias: 0
};

const DEFAULT_MATERIAL = {
  // Standard PBR
  metalness: 0,
  roughness: 0.85,        // already textured-feeling on first paint
  normalScale: 1.4,
  bumpScale: 0.05,
  repeat: 2,              // tile twice so the surface reads at first glance
  envIntensity: 1.1,

  // Displacement
  displacementScale: 0,

  // Emissive
  emissiveColor: '#000000',
  emissiveIntensity: 0,

  // Specular (KHR_materials_specular)
  specularIntensity: 1,
  specularColor: '#ffffff',

  // Transmission / refraction
  transmission: 0,
  thickness: 0,
  ior: 1.5,
  attenuationDistance: 0,
  attenuationColor: '#ffffff',

  // Clearcoat
  clearcoat: 0,
  clearcoatRoughness: 0.1,

  // Sheen
  sheen: 0,
  sheenRoughness: 0.5,
  sheenColor: '#ffffff',

  // Anisotropy
  anisotropy: 0,
  anisotropyRotation: 0,

  // Iridescence
  iridescence: 0,
  iridescenceIOR: 1.3,
  iridescenceThicknessMin: 100,
  iridescenceThicknessMax: 400,

  // Renderer
  exposure: 1.05
};

// Pick a textured shader for the very first paint so the sphere doesn't
// look like a perfect glass marble — falls back to the first entry.
const initialShaderPreset =
  SHADER_PRESETS.find((p) => p.id === 'pro-stucco') ||
  SHADER_PRESETS.find((p) => p.id === 'concrete') ||
  SHADER_PRESETS.find((p) => p.id === 'pro-marble') ||
  SHADER_PRESETS[0];
const DEFAULT_SHADER = {
  presetId: initialShaderPreset.id,
  code: initialShaderPreset.code,
  p1: initialShaderPreset.defaults.p1,
  p2: initialShaderPreset.defaults.p2,
  p3: initialShaderPreset.defaults.p3,
  p4: initialShaderPreset.defaults.p4,
  p5: 0, p6: 0, p7: 0, p8: 0,
  p9: 0, p10: 0, p11: 0, p12: 0,
  p1_anim: false, p2_anim: false, p3_anim: false, p4_anim: false,
  p5_anim: false, p6_anim: false, p7_anim: false, p8_anim: false,
  p9_anim: false, p10_anim: false, p11_anim: false, p12_anim: false,
  colorA: initialShaderPreset.defaults.colorA,
  colorB: initialShaderPreset.defaults.colorB,
  seed: 0
};

const DEFAULT_ANIMATION = { playing: false, speed: 1, amp: 0.25 };


const DEFAULT_ENGRAVING = {
  enabled: false,
  text: 'STONE',
  font: 'Impact',
  weight: 700,
  fontSizeRel: 0.18,
  letterSpacing: 1,
  x: 0.5,
  y: 0.5,
  rotationDeg: 0,
  mode: 'engrave', // 'engrave' | 'emboss'
  depth: 0.6,
  bevel: 0.006,
  darken: 0.4
};

const LS_KEY = 'tss::state::v1';

const loadPersisted = () => {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const App = () => {
  const persisted = useMemo(loadPersisted, []);

  // First-launch defaults aim for an obviously textured surface so the
  // user can immediately tell that materials are working.
  const [mode, setMode] = useState(persisted?.mode ?? 'shader');
  const [activePresetId, setActivePresetId] = useState(persisted?.activePresetId ?? 'concrete');

  const [uploadedImage, setUploadedImage] = useState(null);
  const [sourceName, setSourceName] = useState(null);
  const [seamlessStrength, setSeamlessStrength] = useState(persisted?.seamlessStrength ?? 0.15);

  const [shader, setShader] = useState(persisted?.shader ?? DEFAULT_SHADER);
  const [shaderError, setShaderError] = useState(null);
  const [animation, setAnimation] = useState(DEFAULT_ANIMATION);
  const [animTick, setAnimTick] = useState(0);

  const [glbUrl, setGlbUrl] = useState(null);
  const [glbName, setGlbName] = useState(null);

  const [size, setSize] = useState(persisted?.size ?? 512);
  const [gen, setGen] = useState(persisted?.gen ?? DEFAULT_GEN);
  const [material, setMaterial] = useState(persisted?.material ?? DEFAULT_MATERIAL);

  const [geometry, setGeometry] = useState(persisted?.geometry ?? 'sphere');
  const [environment, setEnvironment] = useState(persisted?.environment ?? 'studio');
  const [lighting, setLighting] = useState(persisted?.lighting ?? 'studio');
  const [rotate, setRotate] = useState(persisted?.rotate ?? true);
  const [showTilePreview, setShowTilePreview] = useState(persisted?.showTilePreview ?? true);
  const [text3d, setText3d] = useState(
    persisted?.text3d ?? { text: 'PBR', size: 0.7, depth: 0.2, bevel: 0.02 }
  );

  // Asset library — saved configurations (loaded once from LS).
  const [assets, setAssets] = useState(() => loadAssets());

  // Currently selected physical-material preset (Glass, Ice, Rubber, …).
  const [materialType, setMaterialType] = useState(persisted?.materialType ?? 'standard');

  // Engraving overlay (text chiselled into the surface).
  const [engraving, setEngraving] = useState(persisted?.engraving ?? DEFAULT_ENGRAVING);

  // HDR environment transforms.
  const [hdrRotationY, setHdrRotationY] = useState(persisted?.hdrRotationY ?? 0);
  const [envIntensity, setEnvIntensity] = useState(persisted?.envIntensity ?? 1);
  const [bgIntensity, setBgIntensity] = useState(persisted?.bgIntensity ?? 1);

  // Custom HDR/EXR environment uploaded by the user.
  const [hdrUrl, setHdrUrl] = useState(null);
  const [hdrName, setHdrName] = useState(null);
  // Cubemap preset id (1..8 from /envmaps/<id>/) — null when not in use.
  const [cubemapId, setCubemapId] = useState(persisted?.cubemapId ?? null);
  const [showBackground, setShowBackground] = useState(persisted?.showBackground ?? false);
  const [bgBlur, setBgBlur] = useState(persisted?.bgBlur ?? 0);

  const applyMaterialType = (id) => {
    const preset = getMaterialType(id);
    setMaterialType(id);
    setMaterial((prev) => ({ ...prev, ...preset.state }));
  };

  const [exportOpen, setExportOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [maps, setMaps] = useState(null);

  const debounceRef = useRef(null);
  const searchRef = useRef(null);
  const sceneContainerRef = useRef(null);

  // Per-mesh material assignment (only used when a GLB scene is loaded).
  // assignments: Map<meshUuid, assetId>
  // materialCache: Map<assetId, THREE.MeshPhysicalMaterial> — built lazily.
  const [assignments] = useState(() => new Map());
  const materialCache = useRef(new Map());
  const [assignmentsVersion, setAssignmentsVersion] = useState(0);
  const bumpAssignments = () => setAssignmentsVersion((v) => v + 1);

  const pickerRef = useRef(null);
  const glbSceneRootRef = useRef(null);
  const [hoverMeshUuid, setHoverMeshUuid] = useState(null);

  const { toasts, push: pushToast, dismiss } = useToasts();

  // --- Persistence (debounced writes) ------------------------------------
  useEffect(() => {
    const id = setTimeout(() => {
      try {
        localStorage.setItem(
          LS_KEY,
          JSON.stringify({
            mode,
            activePresetId,
            seamlessStrength,
            shader,
            size,
            gen,
            material,
            geometry,
            environment,
            lighting,
            rotate,
            showTilePreview,
            text3d,
            materialType,
            engraving,
            showBackground,
            bgBlur,
            hdrRotationY,
            envIntensity,
            bgIntensity,
            cubemapId
          })
        );
      } catch {
        /* quota exceeded — ignore */
      }
    }, 250);
    return () => clearTimeout(id);
  }, [mode, activePresetId, seamlessStrength, shader, size, gen, material, geometry, environment, lighting, rotate, showTilePreview, text3d, materialType, engraving, showBackground, bgBlur, hdrRotationY, envIntensity, bgIntensity, cubemapId]);

  // Render the engraving mask any time text/font/position changes.
  const engravingImage = useMemo(() => {
    if (!engraving?.enabled) return null;
    return renderEngraving({
      size,
      text: engraving.text,
      font: engraving.font,
      weight: engraving.weight,
      fontSizeRel: engraving.fontSizeRel,
      letterSpacing: engraving.letterSpacing,
      x: engraving.x,
      y: engraving.y,
      rotationDeg: engraving.rotationDeg,
      bevel: engraving.bevel
    });
  }, [engraving, size]);

  // --- Shader history (undo / redo) --------------------------------------
  // Snapshot shader state after user stops editing for 400ms, skip meaningless
  // changes (== serialized match). `suppressHistoryRef` is set when we apply
  // history navigation so we don't push a duplicate.
  const historyRef = useRef({ past: [], future: [] });
  const lastSnapshotRef = useRef(null);
  const suppressHistoryRef = useRef(false);

  useEffect(() => {
    if (lastSnapshotRef.current === null) {
      lastSnapshotRef.current = JSON.stringify(shader);
      return undefined;
    }
    const id = setTimeout(() => {
      if (suppressHistoryRef.current) {
        suppressHistoryRef.current = false;
        return;
      }
      const snapshot = JSON.stringify(shader);
      if (snapshot !== lastSnapshotRef.current) {
        historyRef.current.past.push(lastSnapshotRef.current);
        historyRef.current.future = [];
        if (historyRef.current.past.length > 50) historyRef.current.past.shift();
        lastSnapshotRef.current = snapshot;
      }
    }, 400);
    return () => clearTimeout(id);
  }, [shader]);

  const undoShader = () => {
    const h = historyRef.current;
    if (h.past.length === 0) return false;
    h.future.unshift(lastSnapshotRef.current);
    const prev = h.past.pop();
    lastSnapshotRef.current = prev;
    suppressHistoryRef.current = true;
    setShader(JSON.parse(prev));
    return true;
  };

  const redoShader = () => {
    const h = historyRef.current;
    if (h.future.length === 0) return false;
    h.past.push(lastSnapshotRef.current);
    const next = h.future.shift();
    lastSnapshotRef.current = next;
    suppressHistoryRef.current = true;
    setShader(JSON.parse(next));
    return true;
  };

  // --- Animation loop ----------------------------------------------------
  useEffect(() => {
    if (!animation.playing) return undefined;
    let raf = 0;
    let last = performance.now();
    const loop = (now) => {
      const dt = (now - last) / 1000;
      last = now;
      setAnimTick((t) => t + dt * animation.speed);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [animation.playing, animation.speed]);

  const effectiveShaderParams = useMemo(() => {
    const keys = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10', 'p11', 'p12'];
    const out = {};
    keys.forEach((k, i) => {
      const base = shader[k] ?? 0;
      if (shader[`${k}_anim`] && animation.playing) {
        const phase = i * 0.7;
        out[k] = base * (1 + Math.sin(animTick * 2 + phase) * animation.amp);
      } else {
        out[k] = base;
      }
    });
    return out;
  }, [shader, animation.playing, animation.amp, animTick]);

  // --- Source resolution -------------------------------------------------
  const sourceImage = useMemo(() => {
    if (mode === 'preset') {
      const preset = getPreset(activePresetId) ?? PRESETS[0];
      return preset.generate(size);
    }
    if (mode === 'image' && uploadedImage) {
      return makeSeamless(uploadedImage, seamlessStrength);
    }
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, activePresetId, uploadedImage, seamlessStrength, size]);

  const [shaderImage, setShaderImage] = useState(null);
  useEffect(() => {
    if (mode !== 'shader' && mode !== 'glb') return;
    const { imageData, error } = renderShader({
      size,
      body: shader.code,
      params: effectiveShaderParams,
      colorA: shader.colorA,
      colorB: shader.colorB,
      seed: shader.seed,
      time: animTick
    });
    if (error) {
      setShaderError(error);
    } else {
      setShaderError(null);
      setShaderImage(imageData);
    }
  }, [mode, size, shader.code, shader.colorA, shader.colorB, shader.seed, effectiveShaderParams, animTick]);

  const effectiveSource =
    mode === 'shader' || (mode === 'glb' && !sourceImage) ? shaderImage : sourceImage;

  // --- Handlers ----------------------------------------------------------
  const applyPresetDefaults = (preset) => {
    if (!preset) return;
    setGen((prev) => ({ ...prev, ...(preset.params ?? {}) }));
    if (preset.params?.metalness !== undefined) {
      setMaterial((prev) => ({ ...prev, metalness: preset.params.metalness }));
    }
  };

  const handleSelectPreset = (id) => {
    setActivePresetId(id);
    applyPresetDefaults(getPreset(id));
  };

  const handleUpload = async (file) => {
    const img = await loadImageToImageData(file, size);
    setUploadedImage(img);
    setSourceName(file.name);
    setMode('image');
  };

  const handleClearUpload = () => {
    setUploadedImage(null);
    setSourceName(null);
    setMode('preset');
  };

  const handleGlbUpload = (file) => {
    if (glbUrl) URL.revokeObjectURL(glbUrl);
    setGlbUrl(URL.createObjectURL(file));
    setGlbName(file.name);
    setMode('glb');
  };

  const handleGlbClear = () => {
    if (glbUrl) URL.revokeObjectURL(glbUrl);
    setGlbUrl(null);
    setGlbName(null);
    setMode('preset');
  };

  const handleHdrUpload = (file) => {
    if (hdrUrl) URL.revokeObjectURL(hdrUrl);
    setHdrUrl(URL.createObjectURL(file));
    setHdrName(file.name);
  };

  const handleHdrClear = () => {
    if (hdrUrl) URL.revokeObjectURL(hdrUrl);
    setHdrUrl(null);
    setHdrName(null);
  };

  const handleRandomize = () => {
    const next = randomShaderState(shader);
    setShader(next);
    setMode('shader');
  };

  const handleSaveAsset = () => {
    const name = (window.prompt('Asset name', `Material ${assets.length + 1}`) || '').trim();
    if (!name) return;
    const thumb = buildThumbFromCanvas(mapCanvases?.diffuse, 96);
    const asset = newAsset({
      name,
      thumb,
      state: { mode, activePresetId, shader, gen, material, geometry, environment, lighting, text3d }
    });
    const next = [asset, ...assets].slice(0, 24);
    setAssets(next);
    saveAssets(next);
    pushToast(`Saved "${name}"`, { kind: 'success', icon: '✓' });
  };

  const handleLoadAsset = (asset) => {
    const s = asset.state;
    if (!s) return;
    if (s.mode) setMode(s.mode);
    if (s.activePresetId) setActivePresetId(s.activePresetId);
    if (s.shader) setShader(s.shader);
    if (s.gen) setGen(s.gen);
    if (s.material) setMaterial(s.material);
    if (s.geometry) setGeometry(s.geometry);
    if (s.environment) setEnvironment(s.environment);
    if (s.lighting) setLighting(s.lighting);
    if (s.text3d) setText3d(s.text3d);
  };

  const handleDeleteAsset = (id) => {
    const next = assets.filter((a) => a.id !== id);
    setAssets(next);
    saveAssets(next);
    // Drop any per-mesh assignments + cached material for this asset.
    let touched = false;
    for (const [k, v] of assignments) {
      if (v === id) { assignments.delete(k); touched = true; }
    }
    const m = materialCache.current.get(id);
    if (m) { disposeMaterial(m); materialCache.current.delete(id); touched = true; }
    if (touched) bumpAssignments();
  };

  // Lazily build (and cache) a MeshPhysicalMaterial for an asset.
  const ensureMaterialForAsset = (asset) => {
    const cached = materialCache.current.get(asset.id);
    if (cached) return cached;
    const mat = buildMaterialFromAsset(asset, 512);
    if (mat) materialCache.current.set(asset.id, mat);
    return mat;
  };

  // ─── Drag-drop materials onto GLB meshes ──────────────────────────────
  const handleSceneDragOver = (e) => {
    if (!e.dataTransfer.types.includes('application/x-tss-asset')) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    if (pickerRef.current) {
      const mesh = pickerRef.current(e.clientX, e.clientY);
      setHoverMeshUuid(mesh?.uuid || null);
    }
  };

  const handleSceneDragLeave = () => setHoverMeshUuid(null);

  const handleSceneDrop = (e) => {
    const assetId = e.dataTransfer.getData('application/x-tss-asset');
    if (!assetId) return;
    e.preventDefault();
    setHoverMeshUuid(null);
    const asset = assets.find((a) => a.id === assetId);
    if (!asset) return;
    if (!glbUrl) {
      pushToast('Load a GLB scene first', { kind: 'error', icon: '!' });
      return;
    }
    const mesh = pickerRef.current?.(e.clientX, e.clientY);
    if (!mesh) {
      pushToast('Drop on a mesh in the scene', { kind: 'error', icon: '!' });
      return;
    }
    const mat = ensureMaterialForAsset(asset);
    if (!mat) return;
    assignments.set(mesh.uuid, asset.id);
    bumpAssignments();
  };

  const handleClearAssignments = () => {
    assignments.clear();
    bumpAssignments();
  };

  const handleExportGlbScene = async () => {
    const root = glbSceneRootRef.current;
    if (!root) {
      pushToast('No GLB scene to export', { kind: 'error', icon: '!' });
      return;
    }
    try {
      await exportSceneAsGlb(root, (glbName?.replace(/\.glb[x]?$/i, '') || 'scene') + '_pbr');
      pushToast('GLB exported', { kind: 'success', icon: '⬇' });
    } catch (err) {
      pushToast(`Export failed: ${String(err.message || err)}`, { kind: 'error', icon: '!' });
    }
  };

  const handleCopyGLSL = async () => {
    try {
      await navigator.clipboard.writeText(shader.code);
      pushToast('Shader code copied', { kind: 'success', icon: '⧉' });
    } catch {
      pushToast('Clipboard unavailable', { kind: 'error', icon: '!' });
    }
  };

  const handleReset = () => {
    setGen(DEFAULT_GEN);
    setMaterial(DEFAULT_MATERIAL);
  };

  // Re-resample uploaded image when resolution changes.
  useEffect(() => {
    if (!uploadedImage) return;
    if (uploadedImage.width === size && uploadedImage.height === size) return;
    const srcCanvas = imageDataToCanvas(uploadedImage);
    const out = document.createElement('canvas');
    out.width = size;
    out.height = size;
    out.getContext('2d').drawImage(srcCanvas, 0, 0, size, size);
    setUploadedImage(out.getContext('2d').getImageData(0, 0, size, size));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size]);

  // --- Map generation ----------------------------------------------------
  useEffect(() => {
    if (!effectiveSource) return;
    clearTimeout(debounceRef.current);
    const engravingParams = engraving?.enabled
      ? {
          engravingDepth: engraving.depth,
          engravingMode: engraving.mode,
          engravingDarken: engraving.darken
        }
      : {};
    debounceRef.current = setTimeout(
      () => setMaps(generateMaps(effectiveSource, { ...gen, ...engravingParams }, engravingImage)),
      animation.playing ? 0 : 40
    );
    return () => clearTimeout(debounceRef.current);
  }, [effectiveSource, gen, animation.playing, engravingImage, engraving]);

  const mapCanvases = useMemo(() => {
    if (!maps) return null;
    return {
      diffuse: imageDataToCanvas(maps.diffuse),
      normal: imageDataToCanvas(maps.normal),
      roughness: imageDataToCanvas(maps.roughness),
      height: imageDataToCanvas(maps.height),
      ao: imageDataToCanvas(maps.ao),
      displacement: imageDataToCanvas(maps.displacement)
    };
  }, [maps]);

  // --- Drop anywhere -----------------------------------------------------
  useEffect(() => {
    const handleDrop = (e) => {
      e.preventDefault();
      const file = e.dataTransfer?.files?.[0];
      if (!file) return;
      const name = file.name.toLowerCase();
      if (name.endsWith('.glb') || name.endsWith('.gltf')) {
        handleGlbUpload(file);
      } else if (name.endsWith('.hdr') || name.endsWith('.exr')) {
        handleHdrUpload(file);
      } else if (file.type.startsWith('image/')) {
        handleUpload(file);
      } else {
        pushToast('Unsupported file', { kind: 'error', icon: '!' });
      }
    };
    const handleDragOver = (e) => e.preventDefault();
    window.addEventListener('drop', handleDrop);
    window.addEventListener('dragover', handleDragOver);
    return () => {
      window.removeEventListener('drop', handleDrop);
      window.removeEventListener('dragover', handleDragOver);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size, glbUrl]);

  // --- Global keyboard shortcuts -----------------------------------------
  useEffect(() => {
    const handler = (e) => {
      const active = document.activeElement;
      const typing =
        active?.tagName === 'INPUT' ||
        active?.tagName === 'TEXTAREA' ||
        active?.tagName === 'SELECT';
      // '/' always focuses search even while typing elsewhere.
      if (e.key === '/') {
        e.preventDefault();
        setMode('shader');
        setTimeout(() => searchRef.current?.focus(), 0);
        return;
      }
      // Cmd/Ctrl+Z / Cmd/Ctrl+Shift+Z — undo/redo, allowed even while typing
      // outside textareas since these shortcuts are so ingrained.
      if ((e.metaKey || e.ctrlKey) && (e.key === 'z' || e.key === 'Z')) {
        if (active?.tagName === 'TEXTAREA' || active?.tagName === 'INPUT') return;
        e.preventDefault();
        if (e.shiftKey) redoShader();
        else undoShader();
        return;
      }

      if (typing) return;

      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        setAnimation((a) => ({ ...a, playing: !a.playing }));
      } else if (e.key === 'c' || e.key === 'C') {
        if (mode === 'shader') handleCopyGLSL();
      } else if (e.key === 'r' || e.key === 'R') {
        if (e.shiftKey) {
          handleReset();
        } else {
          handleRandomize();
        }
      } else if (e.key === 'e' || e.key === 'E') {
        setExportOpen(true);
      } else if (e.key === 'f' || e.key === 'F') {
        const el = sceneContainerRef.current;
        if (!document.fullscreenElement) el?.requestFullscreen?.();
        else document.exitFullscreen?.();
      } else if (e.key === '?') {
        setHelpOpen(true);
      } else if (['1', '2', '3', '4'].includes(e.key)) {
        const map = { 1: 'preset', 2: 'image', 3: 'shader', 4: 'glb' };
        setMode(map[e.key]);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shader]);


  const statusLabel =
    mode === 'image'
      ? `image · ${sourceName ?? '—'}`
      : mode === 'shader'
        ? `shader · ${shader.presetId}${animation.playing ? ' · ▶' : ''}`
        : mode === 'glb'
          ? `glb · ${glbName ?? '—'}`
          : `preset · ${activePresetId}`;

  return (
    <div className="app">
      <header className="app__topbar">
        <div className="app__brand">
          <span className="app__brand-dot" />
          <span className="app__brand-name">Texture Shader Simulator</span>
        </div>
        <div className="app__topbar-right">
          <div className="app__meta">
            {statusLabel}
            <span className="app__meta-sep">·</span>
            {size}×{size}
          </div>
          <button
            type="button"
            className="app__save-material"
            onClick={handleSaveAsset}
            title="Save the current material to your library"
          >
            <span className="app__save-material-icon">💾</span>
            Save material
          </button>
          <button
            type="button"
            className="app__icon-btn"
            onClick={() => setHelpOpen(true)}
            title="Keyboard shortcuts (?)"
          >
            ?
          </button>
        </div>
      </header>

      <main className="app__layout">
        <LeftPanel
          mode={mode}
          setMode={setMode}
          activePresetId={activePresetId}
          onSelectPreset={handleSelectPreset}
          onUpload={handleUpload}
          sourceName={sourceName}
          onClearUpload={handleClearUpload}
          seamlessStrength={seamlessStrength}
          setSeamlessStrength={setSeamlessStrength}
          shader={shader}
          setShader={setShader}
          shaderError={shaderError}
          animation={animation}
          setAnimation={setAnimation}
          onRandomize={handleRandomize}
          onCopyGLSL={handleCopyGLSL}
          glbName={glbName}
          onGlbUpload={handleGlbUpload}
          onGlbClear={handleGlbClear}
          engraving={engraving}
          setEngraving={setEngraving}
          gen={gen}
          setGen={setGen}
          size={size}
          setSize={setSize}
          searchRef={searchRef}
        />

        <section
          className="app__scene"
          ref={sceneContainerRef}
          onDragOver={handleSceneDragOver}
          onDragLeave={handleSceneDragLeave}
          onDrop={handleSceneDrop}
        >
          <Scene
            maps={mapCanvases}
            material={material}
            geometry={geometry}
            rotate={rotate}
            environment={environment}
            lighting={lighting}
            showTilePreview={showTilePreview}
            text3d={text3d}
            glbUrl={glbUrl}
            customHdrUrl={hdrUrl}
            cubemapId={cubemapId}
            showBackground={showBackground}
            bgBlur={bgBlur}
            hdrRotationY={hdrRotationY}
            envIntensity={envIntensity}
            bgIntensity={bgIntensity}
            pickerRef={pickerRef}
            assignments={assignments}
            materialCache={materialCache.current}
            onGlbSceneReady={(root) => { glbSceneRootRef.current = root; }}
            highlightUuid={hoverMeshUuid}
            assignmentsVersion={assignmentsVersion}
          />
        </section>

        <RightPanel
          gen={gen}
          setGen={setGen}
          material={material}
          setMaterial={setMaterial}
          maps={maps}
          onExport={() => setExportOpen(true)}
          onReset={handleReset}
          geometry={geometry}
          setGeometry={setGeometry}
          environment={environment}
          setEnvironment={setEnvironment}
          rotate={rotate}
          setRotate={setRotate}
          lighting={lighting}
          setLighting={setLighting}
          showTilePreview={showTilePreview}
          setShowTilePreview={setShowTilePreview}
          text3d={text3d}
          setText3d={setText3d}
          assets={assets}
          onSaveAsset={handleSaveAsset}
          onLoadAsset={handleLoadAsset}
          onDeleteAsset={handleDeleteAsset}
          materialType={materialType}
          onMaterialType={applyMaterialType}
          hdrName={hdrName}
          onHdrUpload={handleHdrUpload}
          onHdrClear={handleHdrClear}
          cubemapId={cubemapId}
          setCubemapId={setCubemapId}
          showBackground={showBackground}
          setShowBackground={setShowBackground}
          bgBlur={bgBlur}
          setBgBlur={setBgBlur}
          hdrRotationY={hdrRotationY}
          setHdrRotationY={setHdrRotationY}
          envIntensity={envIntensity}
          setEnvIntensity={setEnvIntensity}
          bgIntensity={bgIntensity}
          setBgIntensity={setBgIntensity}
        />
      </main>

      <Toolbox
        assets={assets}
        glbLoaded={!!glbUrl}
        hasAssignments={assignments.size > 0}
        onExportGlb={handleExportGlbScene}
        onClearAssignments={handleClearAssignments}
      />

      <ExportModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        maps={maps}
        material={material}
        gen={gen}
        shader={shader}
        sourceName={statusLabel}
      />

      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />

      <Toast toasts={toasts} onDismiss={dismiss} />
    </div>
  );
};

export default App;
