import { useState, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import StickerPeel from './StickerPeel.jsx';

const Preloader = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [peelPct, setPeelPct] = useState(90); // starts 90% peeled
  const containerRef = useRef(null);
  const done = useRef(false);

  useEffect(() => {
    // Simulate loading progress
    let start = performance.now();
    const totalDuration = 2400; // ms

    function tick(now) {
      const elapsed = now - start;
      const p = Math.min(elapsed / totalDuration, 1);
      // Ease in-out
      const eased = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      const pct = Math.round(eased * 100);

      setProgress(pct);
      // Peel goes from 90% → 0% as progress goes 0% → 100%
      setPeelPct(Math.round(90 * (1 - eased)));

      if (p < 1) {
        requestAnimationFrame(tick);
      } else if (!done.current) {
        done.current = true;
        // Hold for a moment, then fade out
        setTimeout(() => {
          gsap.to(containerRef.current, {
            opacity: 0,
            duration: 0.6,
            ease: 'power2.inOut',
            onComplete,
          });
        }, 400);
      }
    }

    requestAnimationFrame(tick);
  }, [onComplete]);

  return (
    <div className="preloader" ref={containerRef}>
      <div className="preloader__content">
        <StickerPeel
          imageSrc="/logo.webp"
          width={220}
          rotate={0}
          peelBackPct={peelPct}
          shadowIntensity={0.4}
          lightingIntensity={0.15}
          peelDirection={180}
        />
        <div className="preloader__counter">
          <span className="preloader__number">{progress}</span>
          <span className="preloader__percent">%</span>
        </div>
      </div>
    </div>
  );
};

export default Preloader;
