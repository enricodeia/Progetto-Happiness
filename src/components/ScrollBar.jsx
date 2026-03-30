import { useEffect, useRef, useState, useCallback } from 'react';
import { gsap } from 'gsap';
import { globeState } from '../globe-scene.js';

const STEPS = [
  { pct: 0 },
  { pct: 64 },
  { pct: 97 },
];

const DEFAULTS = {
  count: 70,
  baseWidth: 6,
  peakWidth: 29,
  spread: 12,
  height: 40,
  gap: 2.5,
  baseOpacity: 0.10,
  activeOpacity: 0.60,
  dotSize: 11,
  dotCount: 3,
};

function scrollToDash(scrollPct, count) {
  return (scrollPct / 100) * (count - 1);
}

const ScrollBar = () => {
  const [scrollPct, setScrollPct] = useState(0);
  const [cfg, setCfg] = useState(DEFAULTS);
  const [panel, setPanel] = useState(false);
  const [copied, setCopied] = useState(false);
  const dashesRef = useRef([]);
  const containerRef = useRef(null);
  const panelRef = useRef(null);
  const scrollRef = useRef(0);
  const rafId = useRef(null);

  const set = (k, v) => setCfg((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    const onScroll = (e) => {
      scrollRef.current = e.detail.pct;
      setScrollPct(e.detail.pct);
    };
    window.addEventListener('globe:scroll', onScroll);
    return () => window.removeEventListener('globe:scroll', onScroll);
  }, []);

  // GSAP-driven dash animation — smooth, no React inline style flicker
  useEffect(() => {
    const tick = () => {
      const dashes = dashesRef.current;
      const { count, baseWidth, peakWidth, spread, baseOpacity, activeOpacity } = cfg;
      const pct = scrollRef.current;
      const active = scrollToDash(pct, count);

      for (let i = 0; i < dashes.length; i++) {
        const el = dashes[i];
        if (!el) continue;

        const dist = Math.abs(i - active);
        const wave = dist < spread ? 1 - dist / spread : 0;
        const eased = wave * wave * (3 - 2 * wave);

        const w = baseWidth + eased * (peakWidth - baseWidth);
        const op = baseOpacity + eased * (activeOpacity - baseOpacity);

        gsap.to(el, {
          width: w,
          opacity: op,
          duration: 0.3,
          ease: 'power2.out',
          overwrite: 'auto',
        });
      }

      rafId.current = requestAnimationFrame(tick);
    };
    rafId.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId.current);
  }, [cfg]);

  // Intro
  useEffect(() => {
    const dashes = dashesRef.current.filter(Boolean);
    gsap.set(dashes, { opacity: 0, scaleX: 0 });
    // Will be revealed by scroll threshold
  }, []);

  useEffect(() => {
    if (panelRef.current && panel) {
      gsap.fromTo(panelRef.current, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.3, ease: 'power3.out' });
    }
  }, [panel]);

  const { count } = cfg;
  const barOpacity = scrollPct < 5 ? 0 : scrollPct < 10 ? (scrollPct - 5) / 5 : 1;

  // Intro reveal when bar becomes visible
  const revealed = useRef(false);
  useEffect(() => {
    if (barOpacity > 0 && !revealed.current) {
      revealed.current = true;
      const dashes = dashesRef.current.filter(Boolean);
      gsap.to(dashes, {
        opacity: cfg.baseOpacity, scaleX: 1,
        duration: 0.4, ease: 'circ.out', stagger: 0.01,
      });
    }
  }, [barOpacity, cfg.baseOpacity]);

  const dots = [];
  const dc = cfg.dotCount;
  for (let i = 0; i < dc; i++) {
    const t = dc === 1 ? 0 : i / (dc - 1);
    const dashIdx = Math.round(t * (count - 1));
    const pct = STEPS[i]?.pct ?? Math.round(t * 100);
    dots.push({ dashIdx, pct, pos: (dashIdx / (count - 1)) * 100 });
  }

  return (
    <>
      <div className="scrollbar" ref={containerRef} style={{ height: `${cfg.height}vh`, opacity: barOpacity }}>
        <div className="scrollbar__track" style={{ gap: cfg.gap }}>
          {Array.from({ length: count }, (_, i) => (
            <div
              key={i}
              ref={(el) => { dashesRef.current[i] = el; }}
              className="scrollbar__dash"
              style={{ width: cfg.baseWidth, background: 'rgba(255, 255, 255, 0.15)' }}
            />
          ))}
        </div>

        {dots.map((dot, i) => (
          <button
            key={i}
            className={`scrollbar__step ${scrollPct >= dot.pct ? 'scrollbar__step--active' : ''}`}
            style={{ top: `${dot.pos}%`, width: cfg.dotSize, height: cfg.dotSize }}
            onClick={() => globeState.setZoomPct?.(dot.pct)}
          />
        ))}
      </div>

      <button className="pp__toggle" style={{ position: 'fixed', top: '50%', left: 20, transform: 'translateY(-50%)', zIndex: 100 }}
        onClick={() => setPanel(!panel)}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="2.5"/><circle cx="12" cy="4" r="1.5"/><circle cx="12" cy="20" r="1.5"/>
          <circle cx="4" cy="12" r="1.5"/><circle cx="20" cy="12" r="1.5"/>
        </svg>
      </button>
      {panel && (
        <div className="pp" ref={panelRef} style={{ position: 'fixed', top: '50%', left: 56, transform: 'translateY(-50%)', zIndex: 100, maxHeight: '80vh', overflowY: 'auto' }}>
          <div className="pp__head">
            <span className="pp__title">Scroll Bar</span>
            <button className="pp__x" onClick={() => setPanel(false)}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <div className="pp__section">Layout</div>
          <label className="pp__row">
            <span className="pp__label">Count</span>
            <input type="range" min={15} max={100} step={1} value={cfg.count} onChange={(e) => set('count', +e.target.value)} />
            <span className="pp__val">{cfg.count}</span>
          </label>
          <label className="pp__row">
            <span className="pp__label">Height vh</span>
            <input type="range" min={20} max={80} step={1} value={cfg.height} onChange={(e) => set('height', +e.target.value)} />
            <span className="pp__val">{cfg.height}</span>
          </label>
          <label className="pp__row">
            <span className="pp__label">Gap</span>
            <input type="range" min={0} max={6} step={0.5} value={cfg.gap} onChange={(e) => set('gap', +e.target.value)} />
            <span className="pp__val">{cfg.gap}</span>
          </label>
          <div className="pp__sep" />
          <div className="pp__section">Wave</div>
          <label className="pp__row">
            <span className="pp__label">Base width</span>
            <input type="range" min={2} max={20} step={1} value={cfg.baseWidth} onChange={(e) => set('baseWidth', +e.target.value)} />
            <span className="pp__val">{cfg.baseWidth}px</span>
          </label>
          <label className="pp__row">
            <span className="pp__label">Peak width</span>
            <input type="range" min={10} max={60} step={1} value={cfg.peakWidth} onChange={(e) => set('peakWidth', +e.target.value)} />
            <span className="pp__val">{cfg.peakWidth}px</span>
          </label>
          <label className="pp__row">
            <span className="pp__label">Spread</span>
            <input type="range" min={1} max={20} step={1} value={cfg.spread} onChange={(e) => set('spread', +e.target.value)} />
            <span className="pp__val">{cfg.spread}</span>
          </label>
          <div className="pp__sep" />
          <div className="pp__section">Dots</div>
          <label className="pp__row">
            <span className="pp__label">Count</span>
            <input type="range" min={2} max={8} step={1} value={cfg.dotCount} onChange={(e) => set('dotCount', +e.target.value)} />
            <span className="pp__val">{cfg.dotCount}</span>
          </label>
          <label className="pp__row">
            <span className="pp__label">Size</span>
            <input type="range" min={3} max={14} step={1} value={cfg.dotSize} onChange={(e) => set('dotSize', +e.target.value)} />
            <span className="pp__val">{cfg.dotSize}px</span>
          </label>
          <div className="pp__sep" />
          <div className="pp__section">Opacity</div>
          <label className="pp__row">
            <span className="pp__label">Base</span>
            <input type="range" min={0} max={0.3} step={0.01} value={cfg.baseOpacity} onChange={(e) => set('baseOpacity', +e.target.value)} />
            <span className="pp__val">{cfg.baseOpacity.toFixed(2)}</span>
          </label>
          <label className="pp__row">
            <span className="pp__label">Active</span>
            <input type="range" min={0.2} max={1} step={0.05} value={cfg.activeOpacity} onChange={(e) => set('activeOpacity', +e.target.value)} />
            <span className="pp__val">{cfg.activeOpacity.toFixed(2)}</span>
          </label>
          <button className="pp__copy" onClick={() => {
            navigator.clipboard.writeText(JSON.stringify(cfg, null, 2));
            setCopied(true); setTimeout(() => setCopied(false), 1200);
          }}>{copied ? 'copiato!' : 'copia'}</button>
        </div>
      )}
    </>
  );
};

export default ScrollBar;
