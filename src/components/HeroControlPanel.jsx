import { useState, useRef, useEffect } from 'react';
import { gsap } from 'gsap';

const HeroControlPanel = ({ config, onChange }) => {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const panelRef = useRef(null);

  useEffect(() => {
    if (!panelRef.current || !open) return;
    gsap.fromTo(panelRef.current,
      { opacity: 0, scale: 0.92, y: 10 },
      { opacity: 1, scale: 1, y: 0, duration: 0.35, ease: 'power3.out' }
    );
  }, [open]);

  const update = (key, val) => onChange({ ...config, [key]: val });

  const copyValues = () => {
    navigator.clipboard.writeText(JSON.stringify(config, null, 2));
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
    <button className="color-panel__toggle" style={{ bottom: 68, right: 28 }} onClick={() => setOpen(true)}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M4 7h16M4 12h16M4 17h10"/>
      </svg>
    </button>
  );

  const rows = [
    { key: 'topY', label: 'Title Y pos', min: 0, max: 40, step: 0.5 },
    { key: 'topSize', label: 'Title size', min: 30, max: 140, step: 1 },
    { key: 'topOpacity', label: 'Title opacity', min: 0, max: 1, step: 0.05 },
    { key: 'topColor', label: 'Progetto color', type: 'color' },
    { key: 'accentColor', label: 'Happiness color', type: 'color' },
    null,
    { key: 'bottomY', label: 'Smile Y pos', min: 50, max: 95, step: 0.5 },
    { key: 'bottomSize', label: 'Smile size', min: 20, max: 80, step: 1 },
    { key: 'bottomOpacity', label: 'Smile opacity', min: 0, max: 1, step: 0.05 },
    { key: 'bottomColor', label: 'Smile color', type: 'color' },
    { key: 'curveWidth', label: 'Curve width', min: 200, max: 800, step: 10 },
    { key: 'curveDepth', label: 'Curve depth', min: 50, max: 300, step: 5 },
  ];

  return (
    <div className="color-panel" ref={panelRef} style={{ bottom: 68 }}>
      <div className="color-panel__header">
        <span className="color-panel__title">Hero Text</span>
        <button className="color-panel__close" onClick={handleClose}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>
      {rows.map((row, i) => {
        if (!row) return <div className="color-panel__sep" key={`sep-${i}`} />;
        const { key, label, type, min, max, step } = row;
        return (
          <label className="color-panel__row" key={key}>
            <span className="color-panel__label">{label}</span>
            {type === 'color' ? (
              <div className="color-panel__color-wrap">
                <input type="color" value={config[key]} onChange={(e) => update(key, e.target.value)} className="color-panel__color-input" />
                <span className="color-panel__hex">{config[key]}</span>
              </div>
            ) : (
              <div className="color-panel__range-wrap">
                <input type="range" min={min} max={max} step={step} value={config[key]} onChange={(e) => update(key, parseFloat(e.target.value))} />
                <span className="color-panel__range-val">{typeof config[key] === 'number' ? config[key].toFixed(config[key] < 2 ? 2 : 0) : config[key]}</span>
              </div>
            )}
          </label>
        );
      })}
      <button className="color-panel__copy" onClick={copyValues}>{copied ? 'Copiato!' : 'Copia valori'}</button>
    </div>
  );
};

export default HeroControlPanel;
