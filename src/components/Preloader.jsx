import { useState, useEffect, useRef, useCallback } from 'react';
import { gsap } from 'gsap';
import { Howl, Howler } from 'howler';
import StickerPeel from './StickerPeel.jsx';

let audioEnabled = false;
let bgMusic = null;
export const isAudioEnabled = () => audioEnabled;
export const getBgMusic = () => bgMusic;

const Preloader = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [peelPct, setPeelPct] = useState(90);
  const [showPrompt, setShowPrompt] = useState(false);
  const containerRef = useRef(null);
  const promptTextRef = useRef(null);
  const btnYesRef = useRef(null);
  const btnNoRef = useRef(null);
  const stickerWrapRef = useRef(null);
  const counterRef = useRef(null);
  const done = useRef(false);

  useEffect(() => {
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

    const promises = assets.map((url) =>
      fetch(url).then(() => {
        loaded++;
        realProgress = Math.round((loaded / assets.length) * 100);
      }).catch(() => {
        loaded++;
        realProgress = Math.round((loaded / assets.length) * 100);
      })
    );

    if (document.fonts?.ready) {
      promises.push(document.fonts.ready.then(() => {}));
    }

    function tick() {
      if (displayProgress < realProgress) {
        displayProgress += (realProgress - displayProgress) * 0.08;
        if (realProgress - displayProgress < 1) displayProgress = realProgress;
      }

      const pct = Math.round(displayProgress);
      setProgress(pct);
      setPeelPct(Math.round(90 * (1 - pct / 100)));

      if (pct >= 100 && !done.current) {
        done.current = true;
        // Fade counter out, then show prompt
        if (counterRef.current) {
          gsap.to(counterRef.current, {
            opacity: 0, y: -6, duration: 0.5, ease: 'circ.out',
            onComplete: () => setShowPrompt(true),
          });
        } else {
          setTimeout(() => setShowPrompt(true), 400);
        }
      } else {
        animFrame = requestAnimationFrame(tick);
      }
    }

    animFrame = requestAnimationFrame(tick);
    const fallback = setTimeout(() => { realProgress = 100; }, 8000);

    return () => {
      cancelAnimationFrame(animFrame);
      clearTimeout(fallback);
    };
  }, []);

  // Animate prompt in: text first, then buttons stagger
  useEffect(() => {
    if (!showPrompt) return;
    requestAnimationFrame(() => {
      if (promptTextRef.current) {
        gsap.fromTo(promptTextRef.current,
          { opacity: 0, y: 10 },
          { opacity: 0.7, y: 0, duration: 0.9, ease: 'circ.out', delay: 0.1 }
        );
      }
      const btns = [btnYesRef.current, btnNoRef.current].filter(Boolean);
      gsap.fromTo(btns,
        { opacity: 0, y: 8 },
        { opacity: 1, y: 0, duration: 0.7, ease: 'circ.out', stagger: 0.12, delay: 0.4 }
      );
    });
  }, [showPrompt]);

  const launchSite = useCallback((withAudio) => {
    if (withAudio) {
      audioEnabled = true;
      Howler.autoUnlock = true;
    } else {
      Howler.mute(true);
    }

    const el = containerRef.current;
    if (!el) { onComplete(); return; }

    // One clean fade — everything goes together
    gsap.to(el, {
      opacity: 0,
      duration: 1.2,
      ease: 'power2.inOut',
      onComplete: () => { if (el) el.style.display = 'none'; },
    });

    // Title starts slightly before preloader is fully gone
    setTimeout(onComplete, 400);

  }, [onComplete]);

  return (
    <div className="preloader" ref={containerRef}>
      <div className="preloader__content">
        <div ref={stickerWrapRef}>
          <StickerPeel
            imageSrc="/logo.webp"
            width={230}
            rotate={0}
            peelBackPct={peelPct}
            shadowIntensity={0.4}
            lightingIntensity={0.15}
            peelDirection={0}
          />
        </div>

        <div className="preloader__below">
          <div className="preloader__counter" ref={counterRef}>
            <span className="preloader__number">{progress}</span>
            <span className="preloader__percent">%</span>
          </div>

          {showPrompt && (
            <div className="preloader__prompt">
              <p className="preloader__prompt-text" ref={promptTextRef} style={{ opacity: 0 }}>
                Attiva l'audio per un'esperienza immersiva
              </p>
              <div className="preloader__prompt-buttons">
                <button ref={btnYesRef} className="preloader__prompt-btn preloader__prompt-btn--yes"
                  onClick={() => launchSite(true)} style={{ opacity: 0 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07"/>
                  </svg>
                  Sì, attiva
                </button>
                <button ref={btnNoRef} className="preloader__prompt-btn preloader__prompt-btn--no"
                  onClick={() => launchSite(false)} style={{ opacity: 0 }}>
                  Senza audio
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Preloader;
