import { useState, useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { globeState } from '../globe-scene.js';

const DEFAULTS = {
  ambientIntensity: 0.4,
  ambientColor: '#404040',
  sunIntensity: 1.5,
  sunColor: '#ffffff',
  shininess: 5,
  emissive: '#000000',
  emissiveIntensity: 0,
  shadowColor: '#080808',
  cloudOpacity: 0.4,
};

const EarthPanel = () => {
  const [open, setOpen] = useState(false);
  const [v, setV] = useState(DEFAULTS);
  const [copied, setCopied] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current && open) {
      gsap.fromTo(ref.current, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.3, ease: 'power3.out' });
    }
  }, [open]);

  const set = (k, val) => {
    const next = { ...v, [k]: val };
    setV(next);
    if (globeState.updateEarth) globeState.updateEarth(next);
  };

  if (!open) return (
    <button className="pp__toggle" style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 100 }}
      onClick={() => setOpen(true)}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
      </svg>
    </button>
  );

  const S = 'section';
  const rows = [
    { t: S, label: 'Sun' },
    { key: 'sunIntensity', label: 'Intensity', min: 0, max: 4, step: 0.1 },
    { key: 'sunColor', label: 'Color', type: 'color' },
    null,
    { t: S, label: 'Shadow' },
    { key: 'ambientIntensity', label: 'Ambient', min: 0, max: 2, step: 0.05 },
    { key: 'ambientColor', label: 'Ambient color', type: 'color' },
    { key: 'shadowColor', label: 'Dark side', type: 'color' },
    null,
    { t: S, label: 'Surface' },
    { key: 'shininess', label: 'Shininess', min: 0, max: 100, step: 1 },
    { key: 'emissive', label: 'Emissive', type: 'color' },
    { key: 'emissiveIntensity', label: 'Emissive amt', min: 0, max: 1, step: 0.05 },
    null,
    { t: S, label: 'Clouds' },
    { key: 'cloudOpacity', label: 'Opacity', min: 0, max: 1, step: 0.05 },
  ];

  return (
    <div className="pp" ref={ref} style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 100 }}>
      <div className="pp__head">
        <span className="pp__title">Earth</span>
        <button className="pp__x" onClick={() => {
          gsap.to(ref.current, { opacity: 0, y: 8, duration: 0.2, ease: 'power4.in', onComplete: () => setOpen(false) });
        }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>
      {rows.map((r, i) => {
        if (!r) return <div className="pp__sep" key={i} />;
        if (r.t === S) return <div className="pp__section" key={r.label}>{r.label}</div>;
        if (r.type === 'color') return (
          <label className="pp__row" key={r.key}>
            <span className="pp__label">{r.label}</span>
            <input type="color" value={v[r.key]} onChange={(e) => set(r.key, e.target.value)} className="pp__swatch" />
            <span className="pp__hex">{v[r.key]}</span>
          </label>
        );
        return (
          <label className="pp__row" key={r.key}>
            <span className="pp__label">{r.label}</span>
            <input type="range" min={r.min} max={r.max} step={r.step} value={v[r.key]}
              onChange={(e) => set(r.key, parseFloat(e.target.value))} />
            <span className="pp__val">{v[r.key] >= 100 ? Math.round(v[r.key]) : v[r.key].toFixed(2)}</span>
          </label>
        );
      })}
      <button className="pp__copy" onClick={() => {
        navigator.clipboard.writeText(JSON.stringify(v, null, 2));
        setCopied(true); setTimeout(() => setCopied(false), 1200);
      }}>{copied ? 'copiato!' : 'copia'}</button>
    </div>
  );
};

export default EarthPanel;
