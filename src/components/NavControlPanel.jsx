import { useState, useCallback, useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import './NavControlPanel.css';

const EASE_PRESETS = [
  'power1.out', 'power2.out', 'power3.out', 'power4.out',
  'power1.inOut', 'power2.inOut', 'power3.inOut', 'power4.inOut',
  'back.out(1.4)', 'back.inOut(1.4)',
  'circ.out', 'circ.inOut',
  'expo.out', 'expo.inOut',
  'sine.out', 'sine.inOut',
  'elastic.out(1,0.3)',
  'none',
];

const DEFAULTS = {
  pillColor: '#ddd9c0',
  pillTextColor: '#2C2118',
  hoverCircleColor: '#FFDD00',
  hoverTextColor: '#2C2118',
  navBg: 'rgba(12, 12, 12, 0.6)',
  navStroke: 'rgba(255, 255, 255, 0.12)',
  enterDuration: 0.45,
  leaveDuration: 0.35,
  enterEase: 'power3.out',
  leaveEase: 'power3.inOut',
  circleScale: 1.2,
  labelShift: 1.0,
  logoSpinDuration: 0.35,
};

const NavControlPanel = ({ onChange }) => {
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
      onChange?.(next);
      return next;
    });
  }, [onChange]);

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
    <button className="nav-ctrl__toggle" onClick={() => setOpen(true)} title="Nav Controls">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 3v2m0 14v2M5.636 5.636l1.414 1.414m9.9 9.9l1.414 1.414M3 12h2m14 0h2M5.636 18.364l1.414-1.414m9.9-9.9l1.414-1.414"/>
        <rect x="8" y="8" width="8" height="8" rx="2"/>
      </svg>
    </button>
  );

  const f = fine;
  const rows = [
    { type: 'heading', label: 'Pill Colors' },
    { key: 'pillColor', label: 'Background', type: 'color' },
    { key: 'pillTextColor', label: 'Text', type: 'color' },
    { key: 'hoverCircleColor', label: 'Hover bubble', type: 'color' },
    { key: 'hoverTextColor', label: 'Hover text', type: 'color' },
    null,
    { type: 'heading', label: 'Nav Container' },
    { key: 'navBg', label: 'Background', type: 'text' },
    { key: 'navStroke', label: 'Stroke', type: 'text' },
    null,
    { type: 'heading', label: 'Timing' },
    { key: 'enterDuration', label: 'Enter', type: 'range', min: 0.1, max: 1.5, step: f ? 0.01 : 0.05 },
    { key: 'leaveDuration', label: 'Leave', type: 'range', min: 0.1, max: 1.5, step: f ? 0.01 : 0.05 },
    { key: 'logoSpinDuration', label: 'Logo spin', type: 'range', min: 0.1, max: 1.0, step: f ? 0.01 : 0.05 },
    null,
    { type: 'heading', label: 'Easing' },
    { key: 'enterEase', label: 'Enter', type: 'select', options: EASE_PRESETS },
    { key: 'leaveEase', label: 'Leave', type: 'select', options: EASE_PRESETS },
    null,
    { type: 'heading', label: 'Scale' },
    { key: 'circleScale', label: 'Circle', type: 'range', min: 0.5, max: 2.5, step: f ? 0.01 : 0.05 },
    { key: 'labelShift', label: 'Label shift', type: 'range', min: 0.3, max: 2.0, step: f ? 0.01 : 0.05 },
  ];

  return (
    <div className="nav-ctrl" ref={panelRef}>
      <div className="nav-ctrl__header">
        <span className="nav-ctrl__title">Nav Controls</span>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <button className={`nav-ctrl__mode ${fine ? 'nav-ctrl__mode--on' : ''}`} onClick={() => setFine(!fine)}>
            {fine ? 'FINE' : 'NORM'}
          </button>
          <button className="nav-ctrl__close" onClick={close}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
      </div>

      <div className="nav-ctrl__body">
        {rows.map((row, i) => {
          if (!row) return <div className="nav-ctrl__sep" key={`s${i}`} />;
          if (row.type === 'heading') return <div className="nav-ctrl__heading" key={row.label}>{row.label}</div>;
          const { key, label, type, min, max, step, options } = row;
          return (
            <label className="nav-ctrl__row" key={key}>
              <span className="nav-ctrl__label">{label}</span>
              {type === 'color' && (
                <div className="nav-ctrl__color-wrap">
                  <input type="color" value={v[key]} onChange={(e) => set(key, e.target.value)} className="nav-ctrl__color-input" />
                  <span className="nav-ctrl__hex">{v[key]}</span>
                </div>
              )}
              {type === 'text' && (
                <input type="text" value={v[key]} onChange={(e) => set(key, e.target.value)} className="nav-ctrl__text-input" />
              )}
              {type === 'range' && (
                <div className="nav-ctrl__range-wrap">
                  <input type="range" min={min} max={max} step={step} value={v[key]} onChange={(e) => set(key, parseFloat(e.target.value))} />
                  <span className="nav-ctrl__range-val">{v[key].toFixed(f ? 3 : 2)}</span>
                </div>
              )}
              {type === 'select' && (
                <select className="nav-ctrl__select" value={v[key]} onChange={(e) => set(key, e.target.value)}>
                  {options.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              )}
            </label>
          );
        })}
      </div>

      <button className="nav-ctrl__copy" onClick={copy}>{copied ? 'Copied!' : 'Copy config'}</button>
    </div>
  );
};

export default NavControlPanel;
