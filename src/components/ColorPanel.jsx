import { useState, useCallback, useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { globeState } from '../globe-scene.js';

const DEFAULTS = {
  bgColor: '#1a1a1a',
  bgOpacity: 0.85,
  strokeColor: '#FFDD00',
  strokeWidth: 3,
  strokeExpand: 1.4,
  strokeOpacity: 0.9,
  hoverScale: 1.6,
  magnetRadius: 120,
  magnetStrength: 0.18,
  orbitColor: '#FFDD00',
  orbitSize: 0.18,
  orbitSpeed: 1.2,
  orbitOpacity: 0.6,
};

const PinTuner = () => {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState(DEFAULTS);
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
    <button className="pin-tuner__toggle" onClick={() => setOpen(true)} title="Pin Tuner">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/>
        <circle cx="8" cy="6" r="2" fill="currentColor"/><circle cx="16" cy="12" r="2" fill="currentColor"/><circle cx="10" cy="18" r="2" fill="currentColor"/>
      </svg>
    </button>
  );

  const f = fineMode;

  const rows = [
    { section: 'Glass' },
    { key: 'bgColor', label: 'Background', type: 'color' },
    { key: 'bgOpacity', label: 'Opacity', type: 'range', min: 0.1, max: 1, step: f ? 0.01 : 0.05 },
    null,
    { section: 'Stroke' },
    { key: 'strokeColor', label: 'Color', type: 'color' },
    { key: 'strokeWidth', label: 'Width', type: 'range', min: 1, max: 8, step: f ? 0.5 : 1 },
    { key: 'strokeExpand', label: 'Expand', type: 'range', min: 1, max: 2.5, step: f ? 0.05 : 0.1 },
    { key: 'strokeOpacity', label: 'Opacity', type: 'range', min: 0.1, max: 1, step: f ? 0.01 : 0.05 },
    null,
    { section: 'Hover' },
    { key: 'hoverScale', label: 'Scale', type: 'range', min: 1, max: 2.5, step: f ? 0.05 : 0.1 },
    { key: 'magnetRadius', label: 'Radius', type: 'range', min: 40, max: 200, step: f ? 5 : 10 },
    { key: 'magnetStrength', label: 'Force', type: 'range', min: 0.02, max: 0.4, step: f ? 0.01 : 0.02 },
    null,
    { section: 'Orbits' },
    { key: 'orbitColor', label: 'Color', type: 'color' },
    { key: 'orbitSize', label: 'Size', type: 'range', min: 0.05, max: 0.5, step: f ? 0.01 : 0.02 },
    { key: 'orbitSpeed', label: 'Speed', type: 'range', min: 0.2, max: 3, step: f ? 0.05 : 0.1 },
    { key: 'orbitOpacity', label: 'Opacity', type: 'range', min: 0, max: 1, step: f ? 0.01 : 0.05 },
  ];

  return (
    <div className="pin-tuner" ref={panelRef}>
      <div className="pin-tuner__header">
        <span className="pin-tuner__title">Pin Tuner</span>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <button
            className={`pin-tuner__mode ${fineMode ? 'pin-tuner__mode--on' : ''}`}
            onClick={() => setFineMode(!fineMode)}
          >
            {fineMode ? 'fine' : 'norm'}
          </button>
          <button className="pin-tuner__close" onClick={handleClose}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
      </div>
      {rows.map((row, i) => {
        if (!row) return <div className="pin-tuner__sep" key={`sep-${i}`} />;
        if (row.section) return <div className="pin-tuner__section" key={row.section}>{row.section}</div>;
        const { key, label, type, min, max, step } = row;
        return (
          <label className="pin-tuner__row" key={key}>
            <span className="pin-tuner__label">{label}</span>
            {type === 'color' && (
              <div className="pin-tuner__color-wrap">
                <input type="color" value={values[key]} onChange={(e) => update(key, e.target.value)} className="pin-tuner__swatch" />
                <span className="pin-tuner__hex">{values[key]}</span>
              </div>
            )}
            {type === 'range' && (
              <div className="pin-tuner__range-wrap">
                <input type="range" min={min} max={max} step={step} value={values[key]} onChange={(e) => update(key, parseFloat(e.target.value))} />
                <span className="pin-tuner__val">
                  {typeof values[key] === 'number'
                    ? (Math.abs(values[key]) >= 1000 ? Math.round(values[key] / 1000) + 'k' : values[key].toFixed(f ? 3 : 2))
                    : values[key]}
                </span>
              </div>
            )}
          </label>
        );
      })}
      <button className="pin-tuner__copy" onClick={copyValues}>{copied ? 'copiato!' : 'copia valori'}</button>
    </div>
  );
};

export default PinTuner;
