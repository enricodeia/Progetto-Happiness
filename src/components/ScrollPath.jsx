import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { globeState } from '../globe-scene.js';

const STEPS = [
  { pct: 0, label: 'Orbit' },
  { pct: 60, label: 'Explore' },
  { pct: 90, label: 'Close' },
  { pct: 97, label: 'Surface' },
];

const ScrollPath = () => {
  const [scrollPct, setScrollPct] = useState(0);
  const pathRef = useRef(null);
  const progressRef = useRef(null);
  const dotsRef = useRef([]);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const onScroll = (e) => setScrollPct(e.detail.pct);
    window.addEventListener('globe:scroll', onScroll);
    return () => window.removeEventListener('globe:scroll', onScroll);
  }, []);

  // Intro animation
  useEffect(() => {
    if (hasAnimated.current) return;
    hasAnimated.current = true;
    const path = pathRef.current;
    const progress = progressRef.current;
    if (!path || !progress) return;

    const len = path.getTotalLength();
    gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });
    gsap.set(progress, { strokeDasharray: len, strokeDashoffset: len });

    // Draw path in
    gsap.to(path, {
      strokeDashoffset: 0, duration: 1.8, ease: 'power3.out', delay: 0.6,
    });

    // Fade in dots
    dotsRef.current.filter(Boolean).forEach((dot, i) => {
      gsap.fromTo(dot,
        { opacity: 0, scale: 0 },
        { opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(2)', delay: 0.8 + i * 0.15 }
      );
    });
  }, []);

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

  // SVG curve points — vertical curve bowing left
  const h = 500;
  const w = 60;
  const curve = `M ${w - 8},20 Q 8,${h * 0.35} ${w - 15},${h * 0.5} Q ${w + 5},${h * 0.65} ${w - 8},${h - 20}`;

  // Map percentage to position on the path
  const getPos = (pct) => {
    const t = pct / 100;
    // Approximate position along the curve
    return { y: 20 + t * (h - 40) };
  };

  return (
    <div className="scroll-path">
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Background track */}
        <path ref={pathRef} d={curve} stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        {/* Progress overlay */}
        <path ref={progressRef} d={curve} stroke="rgba(255,221,0,0.5)" strokeWidth="1.5" fill="none" strokeLinecap="round" />

        {/* Step circles */}
        {STEPS.map((step, i) => {
          const pos = getPos(step.pct);
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
              {/* Outer ring */}
              <circle
                cx={w - 8} cy={pos.y} r={isCurrent ? 7 : 5}
                fill="none"
                stroke={isActive ? '#FFDD00' : 'rgba(255,255,255,0.2)'}
                strokeWidth={isCurrent ? 1.5 : 1}
                style={{ transition: 'all 0.4s ease' }}
              />
              {/* Inner dot */}
              <circle
                cx={w - 8} cy={pos.y}
                r={isCurrent ? 3 : 2}
                fill={isActive ? '#FFDD00' : 'rgba(255,255,255,0.3)'}
                style={{ transition: 'all 0.4s ease' }}
              />
              {/* Label */}
              <text
                x={w - 20} y={pos.y + 3.5}
                textAnchor="end"
                className="scroll-path__label"
                style={{ fill: isCurrent ? '#FFDD00' : 'rgba(253,244,237,0.25)', transition: 'fill 0.4s ease' }}
              >
                {step.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export default ScrollPath;
