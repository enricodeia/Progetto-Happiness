import { useState, useCallback, useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { globeState } from '../globe-scene.js';
import './StalkControlPanel.css';

const DEFAULTS = {
  stalkHeight: 900000,
  pinSize: 150000,
  collapseStart: 0,
  collapseEnd: 90,
  stalkFadeStart: 85,
  stalkFadeEnd: 92,
  stalkOpacity: 0.5,
  lerpSpeed: 0.04,
};

const StalkControlPanel = () => {
  const [open, setOpen] = useState(false);
  const [v, setV] = useState(DEFAULTS);
  const [copied, setCopied] = useState(false);
  const [fine, setFine] = useState(false);
  const panelRef = useRef(null);

  useEffect(() => {
    if (panelRef.current && open) {
      gsap.fromTo(panelRef.current,
        { opacity: 0, scale: 0.92, y: 10 },
        { opacity: 1, scale: 1, y: 0, duration: 0.35, ease: 'power3.out' }
      );
    }
  }, [open]);

  const set = useCallback((key, val) => {
    setV((prev) => {
      const next = { ...prev, [key]: val };
      // Push to globe live
      Object.assign(globeState.stalkConfig, next);
      return next;
    });
  }, []);

  const copy = () => {
    navigator.clipboard.writeText(JSON.stringify(v, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const close = () => {
    if (!panelRef.current) { setOpen(false); return; }
    gsap.to(panelRef.current, {
      opacity: 0, scale: 0.92, y: 10, duration: 0.25, ease: 'power4.inOut',
      onComplete: () => setOpen(false),
    });
  };

  if (!open) return (
    <button className="stalk-ctrl__toggle" onClick={() => setOpen(true)} title="Stalk Controls">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <line x1="12" y1="2" x2="12" y2="16" />
        <circle cx="12" cy="19" r="3" />
      </svg>
    </button>
  );

  const f = fine;
  const rows = [
    { type: 'heading', label: 'Stalk' },
    { key: 'stalkHeight', label: 'Height', type: 'range', min: 100000, max: 900000, step: f ? 5000 : 25000 },
    { key: 'stalkOpacity', label: 'Opacity', type: 'range', min: 0.05, max: 1, step: f ? 0.01 : 0.05 },
    { key: 'lerpSpeed', label: 'Lerp speed', type: 'range', min: 0.005, max: 0.15, step: f ? 0.001 : 0.005 },
    null,
    { type: 'heading', label: 'Pin' },
    { key: 'pinSize', label: 'Size', type: 'range', min: 20000, max: 150000, step: f ? 1000 : 5000 },
    null,
    { type: 'heading', label: 'Collapse (scroll %)' },
    { key: 'collapseStart', label: 'Start', type: 'range', min: 0, max: 80, step: 1 },
    { key: 'collapseEnd', label: 'End', type: 'range', min: 10, max: 100, step: 1 },
    null,
    { type: 'heading', label: 'Stalk Fade (scroll %)' },
    { key: 'stalkFadeStart', label: 'Fade start', type: 'range', min: 0, max: 99, step: 1 },
    { key: 'stalkFadeEnd', label: 'Fade end', type: 'range', min: 1, max: 100, step: 1 },
  ];

  return (
    <div className="stalk-ctrl" ref={panelRef}>
      <div className="stalk-ctrl__header">
        <span className="stalk-ctrl__title">Stalk / Pin</span>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <button className={`stalk-ctrl__mode ${fine ? 'stalk-ctrl__mode--on' : ''}`} onClick={() => setFine(!fine)}>
            {fine ? 'FINE' : 'NORM'}
          </button>
          <button className="stalk-ctrl__close" onClick={close}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
      </div>

      <div className="stalk-ctrl__body">
        {rows.map((row, i) => {
          if (!row) return <div className="stalk-ctrl__sep" key={`s${i}`} />;
          if (row.type === 'heading') return <div className="stalk-ctrl__heading" key={row.label}>{row.label}</div>;
          const { key, label, type, min, max, step } = row;
          return (
            <label className="stalk-ctrl__row" key={key}>
              <span className="stalk-ctrl__label">{label}</span>
              {type === 'range' && (
                <div className="stalk-ctrl__range-wrap">
                  <input type="range" min={min} max={max} step={step} value={v[key]} onChange={(e) => set(key, parseFloat(e.target.value))} />
                  <span className="stalk-ctrl__range-val">
                    {v[key] >= 1000 ? `${Math.round(v[key] / 1000)}k` : v[key].toFixed(f ? 3 : 2)}
                  </span>
                </div>
              )}
            </label>
          );
        })}
      </div>

      <button className="stalk-ctrl__copy" onClick={copy}>{copied ? 'Copied!' : 'Copy config'}</button>
    </div>
  );
};

export default StalkControlPanel;
