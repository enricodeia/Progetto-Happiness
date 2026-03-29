import { useState, useCallback, useRef, useEffect } from 'react';
import { gsap } from 'gsap';

const DESKTOP = {
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

const MOBILE = {
  mFontSize: 32,
  mWidth: 300,
  mViewW: 400,
  mCurveDepth: 140,
  mPosY: 82,
};

const SmilePanel = ({ onChange }) => {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('desktop');
  const [v, setV] = useState({ ...DESKTOP, ...MOBILE });
  const [copied, setCopied] = useState(false);
  const ref = useRef(null);

  useEffect(() => { onChange({ ...DESKTOP, ...MOBILE }); }, []);

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

  const desktopRows = [
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

  const mobileRows = [
    { section: 'Mobile Text' },
    { key: 'mFontSize', label: 'Font size', min: 20, max: 80, step: 2 },
    { key: 'mWidth', label: 'Width', min: 200, max: 600, step: 10 },
    { key: 'mViewW', label: 'ViewBox W', min: 250, max: 800, step: 10 },
    { key: 'mCurveDepth', label: 'Curve depth', min: 30, max: 300, step: 10 },
    { key: 'mPosY', label: 'Position Y', min: 50, max: 95, step: 1 },
  ];

  const rows = tab === 'desktop' ? desktopRows : mobileRows;

  return (
    <div className="pp" ref={ref}>
      <div className="pp__head">
        <span className="pp__title">Smile</span>
        <button className="pp__x" onClick={close}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>
      <div className="pp__tabs">
        <button className={`pp__tab ${tab === 'desktop' ? 'pp__tab--on' : ''}`} onClick={() => setTab('desktop')}>Desktop</button>
        <button className={`pp__tab ${tab === 'mobile' ? 'pp__tab--on' : ''}`} onClick={() => setTab('mobile')}>Mobile</button>
      </div>
      {rows.map((r, i) => {
        if (!r) return <div className="pp__sep" key={i} />;
        if (r.section) return <div className="pp__section" key={r.section}>{r.section}</div>;
        return (
          <label className="pp__row" key={r.key}>
            <span className="pp__label">{r.label}</span>
            <input type="range" min={r.min} max={r.max} step={r.step} value={v[r.key]}
              onChange={(e) => set(r.key, parseFloat(e.target.value))} />
            <span className="pp__val">{v[r.key]}</span>
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
