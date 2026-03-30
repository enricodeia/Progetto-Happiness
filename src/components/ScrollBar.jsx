import { useEffect, useRef, useState } from 'react';
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
  baseOpacity: 0.25,
  activeOpacity: 1.0,
  dotSize: 11,
  dotCount: 3,
};

function scrollToDash(scrollPct, count) {
  return (scrollPct / 100) * (count - 1);
}

const ScrollBar = () => {
  const [scrollPct, setScrollPct] = useState(0);
  const cfg = DEFAULTS;
  const dashesRef = useRef([]);
  const containerRef = useRef(null);
  const scrollRef = useRef(0);
  const rafId = useRef(null);


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

        // Color: blend from dim to #FDF4ED based on wave
        const r = Math.round(253 * (0.25 + eased * 0.75));
        const g = Math.round(244 * (0.25 + eased * 0.75));
        const b = Math.round(237 * (0.25 + eased * 0.75));

        gsap.to(el, {
          width: w,
          opacity: op,
          backgroundColor: `rgb(${r}, ${g}, ${b})`,
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

  // No intro hide — dashes always visible


  const { count } = cfg;
  const barOpacity = 1; // always visible


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
              style={{ width: cfg.baseWidth, background: 'rgba(253, 244, 237, 0.25)' }}
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

    </>
  );
};

export default ScrollBar;
