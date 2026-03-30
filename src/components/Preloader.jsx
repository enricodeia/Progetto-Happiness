import { useState, useEffect, useRef, useCallback } from 'react';
import { gsap } from 'gsap';
import { Howl, Howler } from 'howler';
import StickerPeel from './StickerPeel.jsx';

let audioEnabled = false;
let bgMusic = null;
export const isAudioEnabled = () => audioEnabled;
export const getBgMusic = () => bgMusic;

const EASES = ['power1.inOut','power2.inOut','power3.inOut','power4.inOut','circ.inOut','cubic.inOut','sine.inOut','expo.inOut','none'];

const Preloader = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [peelPct, setPeelPct] = useState(90);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  const containerRef = useRef(null);
  const promptTextRef = useRef(null);
  const btnYesRef = useRef(null);
  const btnNoRef = useRef(null);
  const stickerWrapRef = useRef(null);
  const counterRef = useRef(null);
  const done = useRef(false);

  // Tunable params
  const [cfg, setCfg] = useState({
    fadeDuration: 1.5,
    fadeEase: 'power2.inOut',
    titleDelay: 500,
    stickerFadeDuration: 0.5,
    stickerFadeDelay: 0,
    promptFadeDuration: 0.3,
  });

  const set = (k, v) => setCfg((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    const assets = [
      '/earth-8k.webp', '/clouds.webp', '/logo.webp',
      'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json',
      'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json',
    ];
    let loaded = 0, realProgress = 0, displayProgress = 0, animFrame = null;
    assets.forEach((url) =>
      fetch(url).then(() => { loaded++; realProgress = Math.round((loaded / assets.length) * 100); })
        .catch(() => { loaded++; realProgress = Math.round((loaded / assets.length) * 100); })
    );
    if (document.fonts?.ready) document.fonts.ready.then(() => {});

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
        if (counterRef.current) {
          gsap.to(counterRef.current, { opacity: 0, y: -6, duration: 0.5, ease: 'circ.out', onComplete: () => setShowPrompt(true) });
        } else {
          setTimeout(() => setShowPrompt(true), 400);
        }
      } else {
        animFrame = requestAnimationFrame(tick);
      }
    }
    animFrame = requestAnimationFrame(tick);
    const fallback = setTimeout(() => { realProgress = 100; }, 8000);
    return () => { cancelAnimationFrame(animFrame); clearTimeout(fallback); };
  }, []);

  useEffect(() => {
    if (!showPrompt) return;
    requestAnimationFrame(() => {
      if (promptTextRef.current) gsap.fromTo(promptTextRef.current, { opacity: 0, y: 10 }, { opacity: 0.7, y: 0, duration: 0.9, ease: 'circ.out', delay: 0.1 });
      const btns = [btnYesRef.current, btnNoRef.current].filter(Boolean);
      gsap.fromTo(btns, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.7, ease: 'circ.out', stagger: 0.12, delay: 0.4 });
    });
  }, [showPrompt]);

  const launchSite = useCallback((withAudio) => {
    if (withAudio) { audioEnabled = true; Howler.autoUnlock = true; }
    else { Howler.mute(true); }

    const el = containerRef.current;
    if (!el) { onComplete(); return; }

    // Disable clicks immediately so globe is usable during fade
    el.style.pointerEvents = 'none';

    // Fade prompt + sticker first
    if (promptTextRef.current) gsap.to(promptTextRef.current, { opacity: 0, duration: cfg.promptFadeDuration, ease: 'circ.in' });
    const btns = [btnYesRef.current, btnNoRef.current].filter(Boolean);
    gsap.to(btns, { opacity: 0, duration: cfg.promptFadeDuration, ease: 'circ.in' });
    if (stickerWrapRef.current) gsap.to(stickerWrapRef.current, { opacity: 0, duration: cfg.stickerFadeDuration, delay: cfg.stickerFadeDelay, ease: 'circ.inOut' });

    // Main preloader fade
    gsap.to(el, {
      opacity: 0,
      duration: cfg.fadeDuration,
      ease: cfg.fadeEase,
      delay: cfg.stickerFadeDelay + cfg.stickerFadeDuration * 0.3,
      onComplete: () => { if (el) el.style.display = 'none'; },
    });

    setTimeout(onComplete, cfg.titleDelay);
  }, [onComplete, cfg]);

  return (
    <div className="preloader" ref={containerRef}>
      <div className="preloader__content">
        <div ref={stickerWrapRef}>
          <StickerPeel imageSrc="/logo.webp" width={170} rotate={0} peelBackPct={peelPct}
            shadowIntensity={0.4} lightingIntensity={0.15} peelDirection={0} />
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

      {/* Tuning panel */}
      {showPrompt && (
        <button className="pp__toggle" style={{ position: 'fixed', bottom: 20, left: 20, zIndex: 9999 }}
          onClick={() => setShowPanel(!showPanel)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="2.5"/><circle cx="12" cy="4" r="1.5"/><circle cx="12" cy="20" r="1.5"/>
            <circle cx="4" cy="12" r="1.5"/><circle cx="20" cy="12" r="1.5"/>
          </svg>
        </button>
      )}
      {showPanel && (
        <div className="pp" style={{ position: 'fixed', bottom: 60, left: 20, zIndex: 9999 }}>
          <div className="pp__head">
            <span className="pp__title">Preloader</span>
            <button className="pp__x" onClick={() => setShowPanel(false)}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <div className="pp__section">Fade Out</div>
          <label className="pp__row">
            <span className="pp__label">Duration</span>
            <input type="range" min={0.3} max={4} step={0.1} value={cfg.fadeDuration} onChange={(e) => set('fadeDuration', +e.target.value)} />
            <span className="pp__val">{cfg.fadeDuration.toFixed(1)}s</span>
          </label>
          <label className="pp__row">
            <span className="pp__label">Ease</span>
            <select value={cfg.fadeEase} onChange={(e) => set('fadeEase', e.target.value)}
              style={{ flex: 1, background: '#111', color: '#F6E3D5', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 4, padding: '2px 4px', fontSize: 10, fontFamily: 'monospace' }}>
              {EASES.map((e) => <option key={e} value={e}>{e}</option>)}
            </select>
          </label>
          <label className="pp__row">
            <span className="pp__label">Title delay</span>
            <input type="range" min={0} max={2000} step={50} value={cfg.titleDelay} onChange={(e) => set('titleDelay', +e.target.value)} />
            <span className="pp__val">{cfg.titleDelay}ms</span>
          </label>
          <div className="pp__sep" />
          <div className="pp__section">Sticker</div>
          <label className="pp__row">
            <span className="pp__label">Fade dur</span>
            <input type="range" min={0} max={2} step={0.05} value={cfg.stickerFadeDuration} onChange={(e) => set('stickerFadeDuration', +e.target.value)} />
            <span className="pp__val">{cfg.stickerFadeDuration.toFixed(2)}s</span>
          </label>
          <label className="pp__row">
            <span className="pp__label">Fade delay</span>
            <input type="range" min={0} max={1} step={0.05} value={cfg.stickerFadeDelay} onChange={(e) => set('stickerFadeDelay', +e.target.value)} />
            <span className="pp__val">{cfg.stickerFadeDelay.toFixed(2)}s</span>
          </label>
          <div className="pp__sep" />
          <div className="pp__section">Prompt</div>
          <label className="pp__row">
            <span className="pp__label">Fade dur</span>
            <input type="range" min={0.1} max={1} step={0.05} value={cfg.promptFadeDuration} onChange={(e) => set('promptFadeDuration', +e.target.value)} />
            <span className="pp__val">{cfg.promptFadeDuration.toFixed(2)}s</span>
          </label>
          <button className="pp__copy" onClick={() => {
            navigator.clipboard.writeText(JSON.stringify(cfg, null, 2));
          }}>copia valori</button>
        </div>
      )}
    </div>
  );
};

export default Preloader;
