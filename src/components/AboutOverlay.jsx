import { useEffect, useRef, useCallback, useState } from 'react';
import { gsap } from 'gsap';

const IMAGES = Array.from({ length: 10 }, (_, i) => `/gallery/${i + 1}.jpg`);

const DEFAULT_SETTINGS = { speed: 1, depth: 300, imageWidth: 22, perspective: 100, mouseInfluence: 10 };

const AboutOverlay = ({ visible, onClose }) => {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [showControls, setShowControls] = useState(false);
  const rootRef = useRef(null);
  const containerRef = useRef(null);
  const mediasRef = useRef([]);
  const tlRef = useRef(null);
  const incrRef = useRef(400);
  const deltaObjRef = useRef({ delta: 0 });
  const deltaToRef = useRef(null);
  const indexImgRef = useRef(0);
  const wheelTimerRef = useRef(null);

  const updateMedia = useCallback((el) => {
    gsap.set(el, {
      xPercent: -50,
      yPercent: -50,
      x: (Math.random() * 0.6 + 0.2) * window.innerWidth,
      y: (Math.random() * 0.6 + 0.2) * window.innerHeight,
    });
    indexImgRef.current = (indexImgRef.current + 1) % IMAGES.length;
    const img = el.querySelector('img');
    if (img) img.src = IMAGES[indexImgRef.current];
  }, []);

  useEffect(() => {
    if (!visible || !containerRef.current) return;

    const medias = mediasRef.current.filter(Boolean);
    const mediasImg = medias.map((m) => m.querySelector('img'));

    deltaToRef.current = gsap.quickTo(deltaObjRef.current, 'delta', { duration: 2, ease: 'power1' });
    const rotY = gsap.quickTo(containerRef.current, 'rotationY', { duration: 0.5, ease: 'power1' });
    const rotX = gsap.quickTo(containerRef.current, 'rotationX', { duration: 0.5, ease: 'power1' });

    medias.forEach((m) => updateMedia(m));

    const tl = gsap.timeline({ paused: true });
    tlRef.current = tl;

    tl.to(medias, {
      z: 0,
      ease: 'none',
      duration: 8,
      stagger: {
        each: 1,
        repeat: -1,
        onRepeat() { updateMedia(this.targets()[0]); },
      },
    });

    tl.fromTo(mediasImg, { scale: 0 }, {
      scale: 1,
      ease: 'back.out(2)',
      duration: 0.6,
      stagger: {
        each: 1,
        repeat: -1,
        repeatDelay: 7.4,
        onRepeat() { this.targets()[0].style.transform = 'scale(0, 0)'; },
      },
    }, '<');

    tl.fromTo(mediasImg, { scale: 1 }, {
      scale: 0,
      ease: 'back.in(1.2)',
      duration: 0.6,
      immediateRender: false,
      delay: 7.4,
      stagger: {
        each: 1,
        repeat: -1,
        repeatDelay: 7.4,
        onRepeat() { this.targets()[0].style.transform = 'scale(1, 1)'; },
      },
    }, '<');

    const tickFn = (time, dt) => {
      incrRef.current += deltaObjRef.current.delta / 300 + dt / 1000;
      tl.time(incrRef.current);
    };
    gsap.ticker.add(tickFn);

    const handleWheel = (e) => {
      if (deltaToRef.current) deltaToRef.current(e.deltaY);
      clearTimeout(wheelTimerRef.current);
      wheelTimerRef.current = setTimeout(() => { if (deltaToRef.current) deltaToRef.current(0); }, 120);
    };

    const handleMouseMove = (e) => {
      const inf = settings.mouseInfluence;
      const valY = (e.clientX / window.innerWidth - 0.5) * inf;
      const valX = (e.clientY / window.innerHeight - 0.5) * inf;
      rotY(valY);
      rotX(-valX);
    };

    window.addEventListener('wheel', handleWheel, { passive: true });
    rootRef.current?.addEventListener('mousemove', handleMouseMove);

    return () => {
      gsap.ticker.remove(tickFn);
      tl.kill();
      window.removeEventListener('wheel', handleWheel);
      rootRef.current?.removeEventListener('mousemove', handleMouseMove);
    };
  }, [visible, updateMedia, settings]);

  if (!visible) return null;

  const updateSetting = (key, val) => setSettings((s) => ({ ...s, [key]: val }));

  return (
    <div className="about" ref={rootRef} style={{ perspective: `${settings.perspective}vw` }}>
      <button className="about__close" onClick={onClose}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M18 6L6 18M6 6l12 12" /></svg>
      </button>

      {/* Control panel toggle */}
      <button className="about__controls-toggle" onClick={() => setShowControls((v) => !v)}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
      </button>

      {/* Control panel */}
      {showControls && (
        <div className="about__controls">
          <h4 className="about__controls-title">Gallery Controls</h4>
          {[
            { key: 'speed', label: 'Speed', min: 0.1, max: 5, step: 0.1 },
            { key: 'depth', label: 'Depth (vw)', min: 50, max: 600, step: 10 },
            { key: 'imageWidth', label: 'Image Size (%)', min: 10, max: 40, step: 1 },
            { key: 'perspective', label: 'Perspective (vw)', min: 20, max: 300, step: 5 },
            { key: 'mouseInfluence', label: 'Mouse', min: 0, max: 30, step: 1 },
          ].map(({ key, label, min, max, step }) => (
            <label className="about__control" key={key}>
              <span className="about__control-label">{label}</span>
              <input type="range" min={min} max={max} step={step} value={settings[key]} onChange={(e) => updateSetting(key, parseFloat(e.target.value))} />
              <span className="about__control-value">{settings[key]}</span>
            </label>
          ))}
        </div>
      )}

      {/* Center text */}
      <div className="about__text">
        <img className="about__logo" src="/logo.webp" alt="" width="48" height="48" />
        <h2 className="about__title">Progetto Happiness</h2>
        <p className="about__body">
          Progetto Happiness e' un progetto indipendente nato nel 2019 da un'idea di Giuseppe Bertuccio D'Angelo.
          Quello che e' iniziato come un viaggio personale alla scoperta della felicita' nel mondo si e' trasformato
          in qualcosa di piu' grande: una casa per storie straordinarie, raccontate con la profondita' di un
          documentario e il calore di una conversazione autentica.
        </p>
        <p className="about__body">
          Dai villaggi piu' remoti alle metropoli, da ogni continente, Progetto Happiness porta alla luce voci,
          volti e filosofie di vita che raramente trovano spazio altrove.
        </p>
        <p className="about__body about__body--accent">
          Non cerchiamo risposte definitive, ma sfumature. Perche' la felicita' non e' una formula:
          e' un mosaico di esperienze umane.
        </p>
        <div className="about__stats">
          <div className="about__stat"><span className="about__stat-value">2.7M</span><span className="about__stat-label">Subscribers</span></div>
          <div className="about__stat"><span className="about__stat-value">50+</span><span className="about__stat-label">Paesi</span></div>
          <div className="about__stat"><span className="about__stat-value">900+</span><span className="about__stat-label">Episodi</span></div>
        </div>
      </div>

      {/* 3D flying images gallery */}
      <div className="about__gallery" ref={containerRef}>
        {Array.from({ length: 8 }, (_, i) => (
          <div
            key={i}
            className="about__media"
            ref={(el) => { mediasRef.current[i] = el; }}
            style={{ width: `${settings.imageWidth}%` }}
          >
            <img src={IMAGES[i % IMAGES.length]} alt="" />
          </div>
        ))}
      </div>
    </div>
  );
};

export default AboutOverlay;
