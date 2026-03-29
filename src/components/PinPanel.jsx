import { useState, useCallback, useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { globeState } from '../globe-scene.js';

const DEFAULTS = {
  // Background
  bg: '#000000',
  sphereColor: '#080808',
  // Dots
  dotColor: '#FDF4ED',
  dotOpacity: 0.45,
  dotSize: 20000,
  // Borders
  borderColor: '#FFDD00',
  borderOpacity: 0.06,
  // Stalks
  stalkColor: '#FFDD00',
  stalkOpacity: 0.5,
  // Clouds
  cloudOpacity: 0.4,
  // Texture fade
  texFadeStart: 98,
  texFadeEnd: 100,
  // Pins
  pinSize: 150000,
  hoverScale: 1.4,
  // Sticky
  stickyRadius: 100,
  stickyStrength: 0.15,
  stickyMinScroll: 0,
};

const PinPanel = () => {
  const [open, setOpen] = useState(false);
  const [v, setV] = useState(DEFAULTS);
  const [copied, setCopied] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current && open) {
      gsap.fromTo(ref.current,
        { opacity: 0, y: 8 },
        { opacity: 1, y: 0, duration: 0.3, ease: 'power3.out' }
      );
    }
  }, [open]);

  const set = useCallback((key, val) => {
    const next = { ...v, [key]: val };
    setV(next);
    if (globeState.updateColors) globeState.updateColors(next);
  }, [v]);

  const close = () => {
    if (!ref.current) { setOpen(false); return; }
    gsap.to(ref.current, {
      opacity: 0, y: 8, duration: 0.2, ease: 'power4.in',
      onComplete: () => setOpen(false),
    });
  };

  if (!open) return (
    <button className="pp__toggle" onClick={() => setOpen(true)}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="2.5"/><circle cx="12" cy="4" r="1.5"/><circle cx="12" cy="20" r="1.5"/>
        <circle cx="4" cy="12" r="1.5"/><circle cx="20" cy="12" r="1.5"/>
      </svg>
    </button>
  );

  const S = 'section';
  const rows = [
    { t: S, label: 'Scene' },
    { key: 'bg', label: 'Background', type: 'color' },
    { key: 'sphereColor', label: 'Globe', type: 'color' },
    { key: 'cloudOpacity', label: 'Clouds', min: 0, max: 1, step: 0.05 },
    null,
    { t: S, label: 'Dots' },
    { key: 'dotColor', label: 'Color', type: 'color' },
    { key: 'dotOpacity', label: 'Opacity', min: 0, max: 1, step: 0.05 },
    { key: 'dotSize', label: 'Size', min: 5000, max: 60000, step: 2000 },
    null,
    { t: S, label: 'Borders' },
    { key: 'borderColor', label: 'Color', type: 'color' },
    { key: 'borderOpacity', label: 'Opacity', min: 0, max: 0.3, step: 0.01 },
    null,
    { t: S, label: 'Stalks' },
    { key: 'stalkColor', label: 'Color', type: 'color' },
    { key: 'stalkOpacity', label: 'Opacity', min: 0, max: 1, step: 0.05 },
    null,
    { t: S, label: 'Texture' },
    { key: 'texFadeStart', label: 'Fade start %', min: 50, max: 100, step: 1 },
    { key: 'texFadeEnd', label: 'Fade end %', min: 50, max: 100, step: 1 },
    null,
    { t: S, label: 'Pins' },
    { key: 'pinSize', label: 'Size', min: 50000, max: 400000, step: 10000 },
    { key: 'hoverScale', label: 'Hover scale', min: 1, max: 3, step: 0.1 },
    null,
    { t: S, label: 'Sticky' },
    { key: 'stickyRadius', label: 'Radius', min: 0, max: 250, step: 5 },
    { key: 'stickyStrength', label: 'Force', min: 0, max: 0.5, step: 0.01 },
    { key: 'stickyMinScroll', label: 'Min scroll %', min: 0, max: 100, step: 5 },
  ];

  return (
    <div className="pp" ref={ref}>
      <div className="pp__head">
        <span className="pp__title">Controls</span>
        <button className="pp__x" onClick={close}>
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
            <span className="pp__val">
              {v[r.key] >= 1000 ? Math.round(v[r.key] / 1000) + 'k' : v[r.key].toFixed(2)}
            </span>
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

export default PinPanel;
