import { useRef, useEffect } from 'react';

const SoundWaves = ({ volume = 1, muted = false, size = 20 }) => {
  const barsRef = useRef([]);

  useEffect(() => {
    let frame;
    let t = 0;
    const animate = () => {
      t += 0.06;
      const amp = muted ? 0 : volume;
      barsRef.current.forEach((bar, i) => {
        if (!bar) return;
        // Each bar has different phase + frequency
        const phase = i * 1.8;
        const freq = 1.2 + i * 0.3;
        const wave = Math.sin(t * freq + phase);
        // Scale height: min 15%, max based on volume
        const minH = 0.15;
        const maxH = 0.3 + amp * 0.7;
        const h = minH + (wave * 0.5 + 0.5) * (maxH - minH);
        bar.setAttribute('y', (1 - h) * size * 0.5);
        bar.setAttribute('height', h * size);
      });
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [volume, muted, size]);

  const barCount = 4;
  const barW = size * 0.1;
  const gap = (size * 0.7) / (barCount - 1);
  const startX = size * 0.15;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block' }}>
      {Array.from({ length: barCount }, (_, i) => (
        <rect
          key={i}
          ref={(el) => { barsRef.current[i] = el; }}
          x={startX + i * gap}
          y={size * 0.35}
          width={barW}
          height={size * 0.3}
          rx={barW / 2}
          fill="white"
        />
      ))}
    </svg>
  );
};

export default SoundWaves;
