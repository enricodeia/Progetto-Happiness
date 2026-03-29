import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { globeState } from '../globe-scene.js';

// pct = zoom target, pos = visual position along the curve (0-100)
const STEPS = [
  { pct: 0, pos: 5 },
  { pct: 64, pos: 33 },
  { pct: 90, pos: 63 },
  { pct: 97, pos: 93 },
];

const SVG_W = 68;
const SVG_H = 622;
const PATH_D = 'M0.769531 0C14.1893 28.8865 29.0413 69.7802 41.2871 118.76C74.759 252.638 88.7837 447.025 0.763672 621.822';

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
      const pt = path.getPointAtLength(len * (s.pos / 100));
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
      <svg width={SVG_W} height={SVG_H} viewBox={`0 0 ${SVG_W} ${SVG_H}`} fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Background track */}
        <path ref={pathRef} d={PATH_D} stroke="rgba(255,255,255,0.08)" strokeWidth="1" fill="none" strokeLinecap="round" />
        {/* Progress overlay */}
        <path ref={progressRef} d={PATH_D} stroke="rgba(255,221,0,0.4)" strokeWidth="1" fill="none" strokeLinecap="round" />

        {/* Step dots */}
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
