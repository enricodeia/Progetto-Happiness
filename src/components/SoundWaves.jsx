import { useRef, useEffect } from 'react';

const SoundWaves = ({ volume = 1, muted = false, size = 20 }) => {
  const barsRef = useRef([]);
  const smoothVol = useRef(volume);

  useEffect(() => {
    let frame;
    let t = 0;
    const animate = () => {
      t += 0.04;
      const target = muted ? 0 : volume;
      smoothVol.current += (target - smoothVol.current) * 0.03;
      const amp = smoothVol.current;

      barsRef.current.forEach((bar, i) => {
        if (!bar) return;
        const phase = i * 1.3;
        const wave1 = Math.sin(t * (0.8 + i * 0.2) + phase);
        const wave2 = Math.sin(t * (1.4 + i * 0.15) + phase * 0.7) * 0.4;
        const wave = wave1 + wave2;
        const minH = 0.12;
        const maxH = 0.25 + amp * 0.75;
        const h = minH + (wave * 0.35 + 0.5) * (maxH - minH);
        bar.setAttribute('y', (1 - h) * size * 0.5);
        bar.setAttribute('height', h * size);
      });
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [volume, muted, size]);

  const barCount = 5;
  const barW = size * 0.055;
  const gap = (size * 0.65) / (barCount - 1);
  const startX = size * 0.175;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block' }}>
      <defs>
        <linearGradient id="wave-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity="0" />
          <stop offset="50%" stopColor="#fff" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      {Array.from({ length: barCount }, (_, i) => (
        <rect
          key={i}
          ref={(el) => { barsRef.current[i] = el; }}
          x={startX + i * gap}
          y={size * 0.35}
          width={barW}
          height={size * 0.3}
          rx={barW / 2}
          fill="url(#wave-grad)"
        />
      ))}
    </svg>
  );
};

export default SoundWaves;
