import { useState, useCallback, useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { globeState } from '../globe-scene.js';

const PIN_DEFAULTS = {
  // Glass effect
  bgColor: '#1a1a1a',
  bgOpacity: 0.85,
  // Expanding stroke ring
  strokeColor: '#FFDD00',
  strokeWidth: 3,
  strokeExpand: 1.4, // how much the stroke ring expands on hover (1 = no expand)
  strokeOpacity: 0.9,
  // Hover
  hoverScale: 1.6,
  // Magnetic
  magnetRadius: 120,
  magnetStrength: 0.18,
  // Orbiting balls
  orbitColor: '#FFDD00',
  orbitSize: 0.18,
  orbitSpeed: 1.2,
  orbitOpacity: 0.6,
};

const ColorPanel = () => {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState(PIN_DEFAULTS);
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
    // Map to pinStyle keys
    const mapped = {
      borderColor: next.strokeColor,
      borderWidth: next.strokeWidth,
      bgColor: next.bgColor,
      bgOpacity: next.bgOpacity,
      hoverScale: next.hoverScale,
      magnetRadius: next.magnetRadius,
      magnetStrength: next.magnetStrength,
      orbitColor: next.orbitColor,
      orbitSize: next.orbitSize,
      orbitSpeed: next.orbitSpeed,
      orbitOpacity: next.orbitOpacity,
      strokeExpand: next.strokeExpand,
      strokeOpacity: next.strokeOpacity,
    };
    if (globeState.updatePinStyle) globeState.updatePinStyle(mapped);
  }, [values]);

  const copyValues = () => {
    navigator.clipboard.writeText(JSON.stringify(values, null, 2));
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

  const rows = [
    { section: 'Glass' },
    { key: 'bgColor', label: 'Background', type: 'color' },
    { key: 'bgOpacity', label: 'Bg opacity', type: 'range', min: 0.1, max: 1, step: f ? 0.01 : 0.05 },
    null,
    { section: 'Stroke Ring' },
    { key: 'strokeColor', label: 'Color', type: 'color' },
    { key: 'strokeWidth', label: 'Width', type: 'range', min: 1, max: 8, step: f ? 0.5 : 1 },
    { key: 'strokeExpand', label: 'Hover expand', type: 'range', min: 1, max: 2.5, step: f ? 0.05 : 0.1 },
    { key: 'strokeOpacity', label: 'Opacity', type: 'range', min: 0.1, max: 1, step: f ? 0.01 : 0.05 },
    null,
    { section: 'Hover' },
    { key: 'hoverScale', label: 'Scale', type: 'range', min: 1, max: 2.5, step: f ? 0.05 : 0.1 },
    { key: 'magnetRadius', label: 'Magnet radius', type: 'range', min: 40, max: 200, step: f ? 5 : 10 },
    { key: 'magnetStrength', label: 'Magnet force', type: 'range', min: 0.02, max: 0.4, step: f ? 0.01 : 0.02 },
    null,
    { section: 'Orbit Balls' },
    { key: 'orbitColor', label: 'Color', type: 'color' },
    { key: 'orbitSize', label: 'Size', type: 'range', min: 0.05, max: 0.5, step: f ? 0.01 : 0.02 },
    { key: 'orbitSpeed', label: 'Speed', type: 'range', min: 0.2, max: 3, step: f ? 0.05 : 0.1 },
    { key: 'orbitOpacity', label: 'Opacity', type: 'range', min: 0, max: 1, step: f ? 0.01 : 0.05 },
  ];

  return (
    <div className="color-panel" ref={panelRef}>
      <div className="color-panel__header">
        <span className="color-panel__title">Pin Controls</span>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <button
            className={`color-panel__toggle-btn ${fineMode ? 'color-panel__toggle-btn--on' : ''}`}
            onClick={() => setFineMode(!fineMode)}
            title="Fine tuning mode"
          >
            {fineMode ? 'FINE' : 'NORM'}
          </button>
          <button className="color-panel__close" onClick={handleClose}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
      </div>
      {rows.map((row, i) => {
        if (!row) return <div className="color-panel__sep" key={`sep-${i}`} />;
        if (row.section) return <div className="color-panel__section" key={row.section}>{row.section}</div>;
        const { key, label, type, min, max, step } = row;
        return (
          <label className="color-panel__row" key={key}>
            <span className="color-panel__label">{label}</span>
            {type === 'color' && (
              <div className="color-panel__color-wrap">
                <input type="color" value={values[key]} onChange={(e) => update(key, e.target.value)} className="color-panel__color-input" />
                <span className="color-panel__hex">{values[key]}</span>
              </div>
            )}
            {type === 'range' && (
              <div className="color-panel__range-wrap">
                <input type="range" min={min} max={max} step={step} value={values[key]} onChange={(e) => update(key, parseFloat(e.target.value))} />
                <span className="color-panel__range-val">
                  {typeof values[key] === 'number'
                    ? (Math.abs(values[key]) >= 1000 ? Math.round(values[key] / 1000) + 'k' : values[key].toFixed(f ? 3 : 2))
                    : values[key]}
                </span>
              </div>
            )}
          </label>
        );
      })}
      <button className="color-panel__copy" onClick={copyValues}>{copied ? 'Copiato!' : 'Copia valori'}</button>
    </div>
  );
};

export default ColorPanel;
