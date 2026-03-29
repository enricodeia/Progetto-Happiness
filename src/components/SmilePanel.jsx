import { useState, useCallback, useRef, useEffect } from 'react';
import { gsap } from 'gsap';

const DEFAULTS = {
  fontSize: 52,
  width: 500,
  viewW: 620,
  curveDepth: 200,
  posY: 80,
  revealStart: 59,
  revealEnd: 69,
  fadeStart: 77,
  fadeEnd: 81,
};

const SmilePanel = ({ onChange }) => {
  const [open, setOpen] = useState(false);
  const [v, setV] = useState(DEFAULTS);
  const [copied, setCopied] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    onChange(DEFAULTS);
  }, []);

  useEffect(() => {
    if (ref.current && open) {
      gsap.fromTo(ref.current, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.3, ease: 'power3.out' });
    }
  }, [open]);

  const set = useCallback((key, val) => {
    const next = { ...v, [key]: val };
    setV(next);
    onChange(next);
  }, [v, onChange]);

  const close = () => {
    if (!ref.current) { setOpen(false); return; }
    gsap.to(ref.current, { opacity: 0, y: 8, duration: 0.2, ease: 'power4.in', onComplete: () => setOpen(false) });
  };

  if (!open) return (
    <button className="pp__toggle" onClick={() => setOpen(true)}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="2.5"/><circle cx="12" cy="4" r="1.5"/><circle cx="12" cy="20" r="1.5"/>
        <circle cx="4" cy="12" r="1.5"/><circle cx="20" cy="12" r="1.5"/>
      </svg>
    </button>
  );

  const rows = [
    { section: 'Text' },
    { key: 'fontSize', label: 'Font size', min: 30, max: 120, step: 2 },
    { key: 'width', label: 'Width', min: 300, max: 1200, step: 20 },
    { key: 'viewW', label: 'ViewBox W', min: 400, max: 1400, step: 20 },
    { key: 'curveDepth', label: 'Curve depth', min: 50, max: 400, step: 10 },
    { key: 'posY', label: 'Position Y', min: 50, max: 95, step: 1 },
    null,
    { section: 'Scroll' },
    { key: 'revealStart', label: 'Reveal start %', min: 0, max: 100, step: 1 },
    { key: 'revealEnd', label: 'Reveal end %', min: 0, max: 100, step: 1 },
    { key: 'fadeStart', label: 'Fade start %', min: 0, max: 100, step: 1 },
    { key: 'fadeEnd', label: 'Fade end %', min: 0, max: 100, step: 1 },
  ];

  return (
    <div className="pp" ref={ref}>
      <div className="pp__head">
        <span className="pp__title">What Makes You Happy?</span>
        <button className="pp__x" onClick={close}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>
      {rows.map((r, i) => {
        if (!r) return <div className="pp__sep" key={i} />;
        if (r.section) return <div className="pp__section" key={r.section}>{r.section}</div>;
        return (
          <label className="pp__row" key={r.key}>
            <span className="pp__label">{r.label}</span>
            <input type="range" min={r.min} max={r.max} step={r.step} value={v[r.key]}
              onChange={(e) => set(r.key, parseFloat(e.target.value))} />
            <span className="pp__val">
              {v[r.key] >= 1000 ? Math.round(v[r.key] / 1000) + 'k' : v[r.key]}
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

export default SmilePanel;
