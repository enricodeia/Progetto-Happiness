import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { globeState } from '../globe-scene.js';

const STEPS = [
  { pct: 0 },
  { pct: 64 },
  { pct: 90 },
  { pct: 97 },
];

const H = 520;
const W = 160;
// Quarter-orbit arc — curves from top-right toward center-left, then back to bottom-right
const CURVE = `M ${W - 10},14 C ${W - 10},${H * 0.2} 12,${H * 0.4} 12,${H * 0.5} C 12,${H * 0.6} ${W - 10},${H * 0.8} ${W - 10},${H - 14}`;

const ScrollPath = () => {
  const [scrollPct, setScrollPct] = useState(0);
  const pathRef = useRef(null);
  const progressRef = useRef(null);
  const dotsRef = useRef([]);
  const hasAnimated = useRef(false);
  const [dotPositions, setDotPositions] = useState([]);

  useEffect(() => {
    const onScroll = (e) => setScrollPct(e.detail.pct);
    window.addEventListener('globe:scroll', onScroll);
    return () => window.removeEventListener('globe:scroll', onScroll);
  }, []);

  // Calculate dot positions on the actual SVG path
  useEffect(() => {
    const path = pathRef.current;
    if (!path) return;
    const len = path.getTotalLength();
    const positions = STEPS.map((s) => {
      const pt = path.getPointAtLength(len * (s.pct / 100));
      return { x: pt.x, y: pt.y };
    });
    setDotPositions(positions);
  }, []);

  // Intro animation
  useEffect(() => {
    if (hasAnimated.current || dotPositions.length === 0) return;
    hasAnimated.current = true;
    const path = pathRef.current;
    const progress = progressRef.current;
    if (!path || !progress) return;

    const len = path.getTotalLength();
    gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });
    gsap.set(progress, { strokeDasharray: len, strokeDashoffset: len });

    gsap.to(path, {
      strokeDashoffset: 0, duration: 1.8, ease: 'power3.out', delay: 0.6,
    });

    dotsRef.current.filter(Boolean).forEach((dot, i) => {
      gsap.fromTo(dot,
        { opacity: 0, scale: 0 },
        { opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(2)', delay: 0.8 + i * 0.18 }
      );
    });
  }, [dotPositions]);

  // Update progress stroke
  useEffect(() => {
    const progress = progressRef.current;
    const path = pathRef.current;
    if (!progress || !path) return;
    const len = path.getTotalLength();
    const offset = len * (1 - scrollPct / 100);
    gsap.to(progress, {
      strokeDashoffset: offset, duration: 0.3, ease: 'power2.out',
    });
  }, [scrollPct]);

  const handleClick = (pct) => {
    if (globeState.setZoomPct) globeState.setZoomPct(pct);
  };

  return (
    <div className="scroll-path">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} fill="none">
        <path ref={pathRef} d={CURVE} stroke="rgba(255,255,255,0.06)" strokeWidth="1" fill="none" strokeLinecap="round" />
        <path ref={progressRef} d={CURVE} stroke="rgba(255,221,0,0.4)" strokeWidth="1" fill="none" strokeLinecap="round" />

        {dotPositions.map((pos, i) => {
          const step = STEPS[i];
          const isActive = scrollPct >= step.pct - 2;
          const isCurrent = i < STEPS.length - 1
            ? scrollPct >= step.pct && scrollPct < STEPS[i + 1].pct
            : scrollPct >= step.pct;
          return (
            <g key={step.pct}
              ref={(el) => { dotsRef.current[i] = el; }}
              style={{ cursor: 'pointer', opacity: 0 }}
              onClick={() => handleClick(step.pct)}
            >
              <circle
                cx={pos.x} cy={pos.y} r={isCurrent ? 5.5 : 4}
                fill="none"
                stroke={isActive ? 'rgba(255,221,0,0.6)' : 'rgba(255,255,255,0.12)'}
                strokeWidth={isCurrent ? 1.2 : 0.8}
                style={{ transition: 'all 0.4s ease' }}
              />
              <circle
                cx={pos.x} cy={pos.y}
                r={isCurrent ? 2 : 1.5}
                fill={isActive ? '#FFDD00' : 'rgba(255,255,255,0.2)'}
                style={{ transition: 'all 0.4s ease' }}
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export default ScrollPath;
