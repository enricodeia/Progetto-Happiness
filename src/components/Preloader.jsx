import { useState, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import StickerPeel from './StickerPeel.jsx';

const Preloader = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [peelPct, setPeelPct] = useState(90);
  const containerRef = useRef(null);
  const done = useRef(false);

  useEffect(() => {
    // Track real asset loading
    const assets = [
      '/earth-8k.webp',
      '/clouds.webp',
      '/logo.webp',
      'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json',
      'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json',
    ];

    let loaded = 0;
    let realProgress = 0;
    let displayProgress = 0;
    let animFrame = null;

    // Load all assets
    const promises = assets.map((url) =>
      fetch(url).then((r) => {
        loaded++;
        realProgress = Math.round((loaded / assets.length) * 100);
      }).catch(() => {
        loaded++;
        realProgress = Math.round((loaded / assets.length) * 100);
      })
    );

    // Also wait for fonts
    if (document.fonts?.ready) {
      promises.push(document.fonts.ready.then(() => {}));
    }

    // Animate display progress smoothly toward real progress
    function tick() {
      if (displayProgress < realProgress) {
        // Ease toward real progress
        displayProgress += (realProgress - displayProgress) * 0.08;
        if (realProgress - displayProgress < 1) displayProgress = realProgress;
      }

      const pct = Math.round(displayProgress);
      setProgress(pct);
      // Peel: 90% → 0% as progress 0% → 100%
      setPeelPct(Math.round(90 * (1 - pct / 100)));

      if (pct >= 100 && !done.current) {
        done.current = true;
        setTimeout(() => {
          const el = containerRef.current;
          if (!el) return;
          gsap.to(el, {
            opacity: 0, duration: 1.4,
            ease: 'circ.inOut',
            onComplete: () => { if (el) el.style.display = 'none'; },
          });
          // Title starts halfway through the fade
          setTimeout(onComplete, 500);
        }, 200);
      } else {
        animFrame = requestAnimationFrame(tick);
      }
    }

    // Start ticking
    animFrame = requestAnimationFrame(tick);

    // Ensure minimum display time (at least 1.5s even if assets load instantly)
    const minTimer = setTimeout(() => {
      if (realProgress < 100) return;
    }, 1500);

    // Fallback: if assets take too long, force complete after 8s
    const fallback = setTimeout(() => {
      realProgress = 100;
    }, 8000);

    return () => {
      cancelAnimationFrame(animFrame);
      clearTimeout(minTimer);
      clearTimeout(fallback);
    };
  }, [onComplete]);

  return (
    <div className="preloader" ref={containerRef}>
      <div className="preloader__content">
        <StickerPeel
          imageSrc="/logo.webp"
          width={230}
          rotate={0}
          peelBackPct={peelPct}
          shadowIntensity={0.4}
          lightingIntensity={0.15}
          peelDirection={0}
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
