import { useState, useCallback, useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { globeState } from '../globe-scene.js';

const DEFAULTS = {
  bg: '#030303', sphereColor: '#080808',
  dotColor: '#FDF4ED', dotOpacity: 0.45, dotSize: 20000,
  borderColor: '#FFDD00', borderOpacity: 0.06,
  markerColor: '#FFDD00', pinSize: 14000,
  showTexture: false, textureOpacity: 0.8,
  textureOffsetX: 0, textureOffsetY: 0, textureScale: 1, textureRotation: 0,
};

const PIN_DEFAULTS = {
  borderColor: '#FFDD00',
  borderWidth: 3,
  bgColor: '#1a1a1a',
  bgOpacity: 0.85,
  orbitColor: '#FFDD00',
  orbitSize: 0.18,
  orbitSpeed: 1.2,
  orbitOpacity: 0.6,
  hoverScale: 1.6,
  magnetRadius: 120,
  magnetStrength: 0.18,
};

const ColorPanel = () => {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('globe'); // 'globe' | 'pin'
  const [values, setValues] = useState(DEFAULTS);
  const [pinValues, setPinValues] = useState(PIN_DEFAULTS);
  const [copied, setCopied] = useState(false);
  const [fineMode, setFineMode] = useState(false);
  const panelRef = useRef(null);

  useEffect(() => {
    if (!panelRef.current) return;
    if (open) {
      gsap.fromTo(panelRef.current,
        { opacity: 0, scale: 0.92, y: 10 },
        { opacity: 1, scale: 1, y: 0, duration: 0.35, ease: 'power3.out' }
      );
    }
  }, [open]);

  const update = useCallback((key, val) => {
    const next = { ...values, [key]: val };
    setValues(next);
    if (globeState.updateColors) globeState.updateColors(next);
  }, [values]);

  const updatePin = useCallback((key, val) => {
    const next = { ...pinValues, [key]: val };
    setPinValues(next);
    if (globeState.updatePinStyle) globeState.updatePinStyle(next);
  }, [pinValues]);

  const copyValues = () => {
    const data = tab === 'globe' ? values : pinValues;
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  };

  const handleClose = () => {
    if (!panelRef.current) { setOpen(false); return; }
    gsap.to(panelRef.current, {
      opacity: 0, scale: 0.92, y: 10, duration: 0.25, ease: 'power4.inOut',
      onComplete: () => setOpen(false),
    });
  };

  if (!open) return (
    <button className="color-panel__toggle" onClick={() => setOpen(true)}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
      </svg>
    </button>
  );

  const f = fineMode;

  const globeRows = [
    { key: 'bg', label: 'Background', type: 'color' },
    { key: 'sphereColor', label: 'Globe', type: 'color' },
    null,
    { key: 'dotColor', label: 'Dot color', type: 'color' },
    { key: 'dotOpacity', label: 'Dot opacity', type: 'range', min: 0, max: 1, step: f ? 0.01 : 0.05 },
    { key: 'dotSize', label: 'Dot size', type: 'range', min: 2000, max: 60000, step: f ? 500 : 2000 },
    null,
    { key: 'borderColor', label: 'Borders', type: 'color' },
    { key: 'borderOpacity', label: 'Border opacity', type: 'range', min: 0, max: 0.3, step: f ? 0.005 : 0.01 },
    null,
    { key: 'markerColor', label: 'Pin tint', type: 'color' },
    { key: 'pinSize', label: 'Pin size', type: 'range', min: 3000, max: 40000, step: f ? 500 : 1000 },
    null,
    { key: 'showTexture', label: 'Earth texture', type: 'toggle' },
    { key: 'textureOpacity', label: 'Tex opacity', type: 'range', min: 0.05, max: 1, step: f ? 0.01 : 0.05 },
    { key: 'textureOffsetX', label: 'Shift X', type: 'range', min: -0.5, max: 0.5, step: f ? 0.001 : 0.01 },
    { key: 'textureOffsetY', label: 'Shift Y', type: 'range', min: -0.5, max: 0.5, step: f ? 0.001 : 0.01 },
    { key: 'textureScale', label: 'Scale', type: 'range', min: 0.8, max: 1.2, step: f ? 0.002 : 0.02 },
    { key: 'textureRotation', label: 'Rotation', type: 'range', min: -30, max: 30, step: f ? 0.2 : 1 },
  ];

  const pinRows = [
    { key: 'borderColor', label: 'Border', type: 'color' },
    { key: 'borderWidth', label: 'Border width', type: 'range', min: 1, max: 8, step: f ? 0.5 : 1 },
    { key: 'bgColor', label: 'Background', type: 'color' },
    { key: 'bgOpacity', label: 'Bg opacity', type: 'range', min: 0.1, max: 1, step: f ? 0.01 : 0.05 },
    null,
    { key: 'hoverScale', label: 'Hover scale', type: 'range', min: 1, max: 2.5, step: f ? 0.05 : 0.1 },
    { key: 'magnetRadius', label: 'Magnet radius', type: 'range', min: 40, max: 200, step: f ? 5 : 10 },
    { key: 'magnetStrength', label: 'Magnet force', type: 'range', min: 0.02, max: 0.4, step: f ? 0.01 : 0.02 },
    null,
    { key: 'orbitColor', label: 'Orbit color', type: 'color' },
    { key: 'orbitSize', label: 'Orbit size', type: 'range', min: 0.05, max: 0.5, step: f ? 0.01 : 0.02 },
    { key: 'orbitSpeed', label: 'Orbit speed', type: 'range', min: 0.2, max: 3, step: f ? 0.05 : 0.1 },
    { key: 'orbitOpacity', label: 'Orbit opacity', type: 'range', min: 0, max: 1, step: f ? 0.01 : 0.05 },
  ];

  const rows = tab === 'globe' ? globeRows : pinRows;
  const currentValues = tab === 'globe' ? values : pinValues;
  const currentUpdate = tab === 'globe' ? update : updatePin;

  return (
    <div className="color-panel" ref={panelRef}>
      <div className="color-panel__header">
        <span className="color-panel__title">Controls</span>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <button
            className={`color-panel__toggle-btn ${fineMode ? 'color-panel__toggle-btn--on' : ''}`}
            onClick={() => setFineMode(!fineMode)}
            title="Fine tuning mode — smaller steps"
          >
            {fineMode ? 'FINE' : 'NORM'}
          </button>
          <button className="color-panel__close" onClick={handleClose}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
      </div>
      <div className="color-panel__tabs">
        <button className={`color-panel__tab ${tab === 'globe' ? 'color-panel__tab--active' : ''}`} onClick={() => setTab('globe')}>Globe</button>
        <button className={`color-panel__tab ${tab === 'pin' ? 'color-panel__tab--active' : ''}`} onClick={() => setTab('pin')}>Pin</button>
      </div>
      {rows.map((row, i) => {
        if (!row) return <div className="color-panel__sep" key={`sep-${i}`} />;
        const { key, label, type, min, max, step } = row;
        return (
          <label className="color-panel__row" key={key}>
            <span className="color-panel__label">{label}</span>
            {type === 'color' && (
              <div className="color-panel__color-wrap">
                <input type="color" value={currentValues[key]} onChange={(e) => currentUpdate(key, e.target.value)} className="color-panel__color-input" />
                <span className="color-panel__hex">{currentValues[key]}</span>
              </div>
            )}
            {type === 'range' && (
              <div className="color-panel__range-wrap">
                <input type="range" min={min} max={max} step={step} value={currentValues[key]} onChange={(e) => currentUpdate(key, parseFloat(e.target.value))} />
                <span className="color-panel__range-val">
                  {typeof currentValues[key] === 'number'
                    ? (Math.abs(currentValues[key]) >= 1000 ? Math.round(currentValues[key] / 1000) + 'k' : currentValues[key].toFixed(f ? 3 : 2))
                    : currentValues[key]}
                </span>
              </div>
            )}
            {type === 'toggle' && (
              <button
                className={`color-panel__toggle-btn ${currentValues[key] ? 'color-panel__toggle-btn--on' : ''}`}
                onClick={() => currentUpdate(key, !currentValues[key])}
              >
                {currentValues[key] ? 'ON' : 'OFF'}
              </button>
            )}
          </label>
        );
      })}
      <button className="color-panel__copy" onClick={copyValues}>{copied ? 'Copiato!' : 'Copia valori'}</button>
    </div>
  );
};

export default ColorPanel;
