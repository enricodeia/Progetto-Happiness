import { useEffect, useRef, useState, forwardRef } from 'react';
import { gsap } from 'gsap';
import PillNav from './PillNav.jsx';

/* ── Blog articles (Geografia della Felicità) ───────────────── */
const articles = [
  { id: 1, title: 'Meraki', subtitle: 'La felicità del fare con l\'anima', origin: 'Grecia', color: '#feca4f', url: '/geografia-della-felicita/meraki-significato-filosofia-greca/', img: null, desc: 'Quando metti anima e passione in ciò che fai, ogni gesto diventa un atto di felicità.' },
  { id: 2, title: 'Tarab', subtitle: 'Quando la musica diventa felicità', origin: 'Mondo Arabo', color: '#e8927c', url: '/geografia-della-felicita/tarab-significato-musica-araba/', img: null, desc: 'Nella musica araba esiste uno stato di estasi che trascende il semplice ascolto.' },
  { id: 3, title: 'Saudade', subtitle: 'La nostalgia che diventa felicità', origin: 'Portogallo', color: '#80455a', url: '/geografia-della-felicita/saudade-significato-nostalgia-portoghese/', img: null, desc: 'I portoghesi hanno dato un nome alla dolce malinconia dei ricordi belli.' },
  { id: 4, title: 'Nunchi', subtitle: 'L\'arte di leggere le emozioni', origin: 'Corea', color: '#3c72c6', url: '/blog/nunchi-arte-coreana-leggere-emozioni/', img: 'https://progettohappiness.com/wp-content/uploads/2026/01/NUNCHI-Blog-Cover-819x1024.jpg', desc: 'Saper percepire le emozioni degli altri è un\'arte coreana.' },
  { id: 5, title: 'Sohbet', subtitle: 'La conversazione profonda', origin: 'Turchia', color: '#d4a574', url: '/geografia-della-felicita/sohbet-arte-turca-della-conversazione/', img: 'https://progettohappiness.com/wp-content/uploads/2026/01/01_SOHBET-1024x681.png', desc: 'I turchi credono che una conversazione autentica possa nutrire l\'anima.' },
  { id: 6, title: 'Ho\'oponopono', subtitle: 'L\'arte dell\'equilibrio', origin: 'Hawaii', color: '#a5b599', url: '/blog/hooponopono/', img: 'https://progettohappiness.com/wp-content/uploads/2025/09/hooponopono-1024x681.jpg', desc: 'Una pratica hawaiana di perdono e riconciliazione.' },
  { id: 7, title: 'Jugaad', subtitle: 'L\'arte di arrangiarsi', origin: 'India', color: '#FFDD00', url: '/blog/jugaad/', img: 'https://progettohappiness.com/wp-content/uploads/2025/09/Jugaad-1024x681.jpg', desc: 'La creatività nata dalla necessità è una forma di genio.' },
  { id: 8, title: 'Mono no aware', subtitle: 'La bellezza effimera', origin: 'Giappone', color: '#fa7b71', url: '/blog/mono-no-aware/', img: 'https://progettohappiness.com/wp-content/uploads/2025/08/Mono-no-aware-1024x681.jpg', desc: 'La consapevolezza giapponese della transitorietà delle cose.' },
  { id: 9, title: 'Kalsarikännit', subtitle: 'Bere in mutande', origin: 'Finlandia', color: '#fdd895', url: '/blog/kalsarikannit-bere-in-mutande/', img: 'https://progettohappiness.com/wp-content/uploads/2025/04/Kalsarikannit-Cover-Blog-1024x681.jpg', desc: 'A volte la felicità è semplicemente stare a casa senza pretese.' },
  { id: 10, title: 'Hallyu Wave', subtitle: 'L\'onda della felicità', origin: 'Corea', color: '#3c72c6', url: '/blog/hallyu-wave/', img: 'https://progettohappiness.com/wp-content/uploads/2025/03/Hallyu_Wave-1024x681.jpg', desc: 'La Korean Wave porta con sé una nuova idea di bellezza e felicità.' },
  { id: 11, title: 'Sisu', subtitle: 'Guardare oltre le difficoltà', origin: 'Finlandia', color: '#F6E3D5', url: '/blog/sisu-finlandia/', img: 'https://progettohappiness.com/wp-content/uploads/2025/03/Lagom-sisu-1024x681.jpg', desc: 'Il coraggio finlandese di andare avanti quando tutto sembra impossibile.' },
  { id: 12, title: 'Lagom', subtitle: 'La ricetta svedese', origin: 'Svezia', color: '#a5b599', url: '/blog/lagom-la-ricetta-svedese-della-felicita/', img: 'https://progettohappiness.com/wp-content/uploads/2025/02/Lagom-1024x681.jpg', desc: 'Non troppo, non troppo poco — il giusto.' },
  { id: 13, title: 'Hózhó', subtitle: 'La filosofia navajo', origin: 'Navajo', color: '#d4a574', url: '/blog/hozho-la-filosofia-navajo/', img: 'https://progettohappiness.com/wp-content/uploads/2025/01/0x1900-000000-80-0-0-1024x1024.jpg', desc: 'Camminare nella bellezza, in equilibrio con tutto ciò che esiste.' },
  { id: 14, title: 'Niksen', subtitle: 'Imparare a rallentare', origin: 'Olanda', color: '#80455a', url: '/blog/niksen-la-filosofia-felice/', img: 'https://progettohappiness.com/wp-content/uploads/2024/12/pexels-mateusz-dach-99805-914929-1024x760.jpg', desc: 'L\'arte olandese del non fare niente.' },
  { id: 15, title: 'Ubuntu', subtitle: 'Filosofia africana', origin: 'Africa', color: '#e8927c', url: '/blog/ubuntu-la-filosofia-africana-della-felicita/', img: 'https://progettohappiness.com/wp-content/uploads/2024/11/Ubuntu-felicita-africa-1024x683.jpg', desc: '\"Io sono perché noi siamo.\"' },
  { id: 16, title: 'Wabi Sabi', subtitle: 'La felicità dell\'imperfezione', origin: 'Giappone', color: '#feca4f', url: '/blog/wabi-sabi/', img: 'https://progettohappiness.com/wp-content/uploads/2024/10/pexels-leeloothefirst-5245218-scaled-e1730369204364-1024x577.jpg', desc: 'Trovare la bellezza nell\'imperfezione.' },
  { id: 17, title: 'Kintsugi', subtitle: 'Riparare con l\'oro', origin: 'Giappone', color: '#FFDD00', url: '/blog/kintsugi-arte-di-riparare-con-oro/', img: 'https://progettohappiness.com/wp-content/uploads/2024/02/kintsugi-tazza-the-1024x678.jpg', desc: 'Le cicatrici non vanno nascoste ma esaltate con l\'oro.' },
  { id: 18, title: 'Hygge', subtitle: 'Filosofia danese', origin: 'Danimarca', color: '#F6E3D5', url: '/blog/hygge-danimarca/', img: 'https://progettohappiness.com/wp-content/uploads/2024/02/Progetto-senza-titolo-e1706778735261.png', desc: 'Il calore della semplicità condivisa.' },
  { id: 19, title: 'Friluftsliv', subtitle: 'Il segreto norvegese', origin: 'Norvegia', color: '#a5b599', url: '/blog/friluftsliv-il-segreto-della-felicita-norvegese/', img: 'https://progettohappiness.com/wp-content/uploads/2024/01/FRILUFTSLIV-felicità-norvegia-1024x576.jpg', desc: 'La natura è la migliore medicina.' },
];

const N = articles.length;
const STEP = 360 / N;

/* ── BlogPage ────────────────────────────────────────────────── */
const BlogPage = forwardRef(({ visible, onClose, onBacheca, onAbout, navConfig }, ref) => {
  const wheelRef = useRef(null);
  const rotToRef = useRef(null);
  const rotationRef = useRef(0);
  const snapTimerRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [panelOpen, setPanelOpen] = useState(false);

  // Editable config — numeric inputs, no range limits
  const [cfg, setCfg] = useState({
    wheelSize: 280,
    wheelLeft: -90,
    imgWidth: 27,
    imgHeight: 29,
    imgTopMargin: 52,
    rotDuration: 0.5,
    scrollSpeed: 50,
    touchSpeed: 2,
    snapDelay: 50,
    inactiveOpacity: 0.35,
    tiltAmplitude: 1,
    earthOpacity: 0.15,
    earthBlur: 2,
  });

  const updateCfg = (key, val) => {
    setCfg(prev => ({ ...prev, [key]: val }));
  };

  // Init carousel
  useEffect(() => {
    if (!visible || !wheelRef.current) return;

    const wheelEl = wheelRef.current;
    rotationRef.current = 0;

    // GSAP quickTo for smooth rotation
    rotToRef.current = gsap.quickTo(wheelEl, 'rotation', {
      duration: cfg.rotDuration,
      ease: 'power4',
    });

    gsap.set(wheelEl, { rotation: 0 });
    updateActive(0);

    // Scroll / wheel
    const onWheel = (e) => {
      rotationRef.current -= e.deltaY / cfg.scrollSpeed;
      rotToRef.current(rotationRef.current);
      clearTimeout(snapTimerRef.current);
      snapTimerRef.current = setTimeout(snap, cfg.snapDelay);
    };

    // Touch
    let touchLastY = 0;
    const onTouchStart = (e) => { touchLastY = e.touches[0].clientY; };
    const onTouchMove = (e) => {
      const y = e.touches[0].clientY;
      rotationRef.current -= (touchLastY - y) / cfg.touchSpeed;
      touchLastY = y;
      rotToRef.current(rotationRef.current);
    };
    const onTouchEnd = () => snap();

    // Mouse drag
    let dragging = false;
    let dragStartY = 0;
    const onMouseDown = (e) => { dragging = true; dragStartY = e.clientY; wheelEl.style.cursor = 'grabbing'; };
    const onMouseMove = (e) => {
      if (!dragging) return;
      const delta = dragStartY - e.clientY;
      dragStartY = e.clientY;
      rotationRef.current -= delta / cfg.scrollSpeed;
      rotToRef.current(rotationRef.current);
      clearTimeout(snapTimerRef.current);
      snapTimerRef.current = setTimeout(snap, cfg.snapDelay);
    };
    const onMouseUp = () => { if (dragging) { dragging = false; wheelEl.style.cursor = ''; snap(); } };

    // Arrow keys
    const onKeyDown = (e) => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); rotationRef.current += STEP; rotToRef.current(rotationRef.current); snap(); }
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); rotationRef.current -= STEP; rotToRef.current(rotationRef.current); snap(); }
    };

    // 3D tilt
    const onTilt = (e) => {
      const imgEl = e.target.closest('.blog-radial__img');
      if (!imgEl) return;
      const rect = imgEl.getBoundingClientRect();
      const x = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2);
      const y = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2);
      gsap.to(imgEl, { rotateX: -y * cfg.tiltAmplitude, rotateY: x * cfg.tiltAmplitude, duration: 0.3, ease: 'power2.out', overwrite: 'auto' });
    };
    const onTiltReset = () => {
      wheelEl.querySelectorAll('.blog-radial__img').forEach(img => {
        gsap.to(img, { rotateX: 0, rotateY: 0, duration: 0.5, ease: 'power2.out' });
      });
    };

    window.addEventListener('wheel', onWheel, { passive: true });
    wheelEl.addEventListener('touchstart', onTouchStart, { passive: true });
    wheelEl.addEventListener('touchmove', onTouchMove, { passive: true });
    wheelEl.addEventListener('touchend', onTouchEnd);
    wheelEl.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('keydown', onKeyDown);
    wheelEl.addEventListener('mousemove', onTilt);
    wheelEl.addEventListener('mouseleave', onTiltReset);

    // Intro
    gsap.fromTo(wheelEl.children, { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1, duration: 0.6, ease: 'back.out(1.5)', stagger: 0.04, delay: 0.3 });

    return () => {
      window.removeEventListener('wheel', onWheel);
      wheelEl.removeEventListener('touchstart', onTouchStart);
      wheelEl.removeEventListener('touchmove', onTouchMove);
      wheelEl.removeEventListener('touchend', onTouchEnd);
      wheelEl.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('keydown', onKeyDown);
      wheelEl.removeEventListener('mousemove', onTilt);
      wheelEl.removeEventListener('mouseleave', onTiltReset);
      clearTimeout(snapTimerRef.current);
    };
  }, [visible]);

  function snap() {
    const snapped = Math.round(rotationRef.current / STEP) * STEP;
    rotationRef.current = snapped;
    rotToRef.current?.(snapped);
    updateActive();
  }

  function updateActive(forceIdx) {
    let idx = forceIdx ?? Math.round(-rotationRef.current / STEP) % N;
    if (idx < 0) idx += N;
    setActiveIndex(idx);
    // Opacity for inactive
    wheelRef.current?.querySelectorAll('.blog-radial__img').forEach((img, i) => {
      gsap.to(img, { opacity: i === idx ? 1 : cfg.inactiveOpacity, duration: 0.4, ease: 'power2.out' });
    });
  }

  const article = articles[activeIndex] || articles[0];

  const controlDefs = [
    { key: 'wheelSize', label: 'Wheel Size (vw)', section: 'Wheel' },
    { key: 'wheelLeft', label: 'Wheel Left (vw)', section: 'Wheel' },
    { key: 'imgWidth', label: 'Img Width (vw)', section: 'Wheel' },
    { key: 'imgHeight', label: 'Img Height (vw)', section: 'Wheel' },
    { key: 'imgTopMargin', label: 'Img Top (vh)', section: 'Wheel' },
    { key: 'rotDuration', label: 'Rot Duration', section: 'Motion' },
    { key: 'scrollSpeed', label: 'Scroll Divider', section: 'Motion' },
    { key: 'touchSpeed', label: 'Touch Divider', section: 'Motion' },
    { key: 'snapDelay', label: 'Snap Delay (ms)', section: 'Motion' },
    { key: 'inactiveOpacity', label: 'Inactive Opacity', section: 'Visual' },
    { key: 'tiltAmplitude', label: 'Tilt Amplitude', section: 'Visual' },
    { key: 'earthOpacity', label: 'Earth Opacity', section: 'Background' },
    { key: 'earthBlur', label: 'Earth Blur (px)', section: 'Background' },
  ];

  let lastSection = '';

  return (
    <div className="blog-page" ref={ref}>
      {/* Earth ISS background — same texture as index globe */}
      <div className="blog-page__bg">
        <img
          src="/earth-8k.webp"
          alt=""
          className="blog-page__earth"
          style={{ opacity: cfg.earthOpacity, filter: `blur(${cfg.earthBlur}px)` }}
        />
      </div>

      {/* PillNav */}
      <PillNav
        logo="/logo.webp"
        logoAlt="Progetto Happiness"
        items={[
          { id: 'bacheca', label: 'Bacheca' },
          { id: 'about', label: 'About' },
          { id: 'blog', label: 'Blog' },
        ]}
        activeItem="blog"
        pillColor={navConfig?.pillColor || '#ddd9c0'}
        pillTextColor={navConfig?.pillTextColor || '#2C2118'}
        hoverCircleColor={navConfig?.hoverCircleColor || '#FFDD00'}
        hoverTextColor={navConfig?.hoverTextColor || '#2C2118'}
        navBg={navConfig?.navBg || 'rgba(12, 12, 12, 0.6)'}
        navStroke={navConfig?.navStroke || 'rgba(255, 255, 255, 0.12)'}
        enterDuration={0.45}
        leaveDuration={0.35}
        enterEase="power3.out"
        leaveEase="power3.inOut"
        circleScale={1.2}
        labelShift={1.0}
        logoSpinDuration={0.65}
        onItemClick={(id) => {
          if (id === 'blog') return;
          if (id === 'bacheca') { onBacheca?.(); return; }
          if (id === 'about') { onClose(); onAbout?.(); return; }
          onClose();
        }}
        onItemHover={() => {}}
      />

      {/* Radial wheel carousel */}
      <div
        className="blog-radial"
        ref={wheelRef}
        style={{
          width: `${cfg.wheelSize}vw`,
          height: `${cfg.wheelSize}vw`,
          left: `${cfg.wheelLeft}vw`,
        }}
      >
        {articles.map((a, i) => (
          <div key={a.id} className="blog-radial__item" style={{ transform: `rotate(${STEP * i}deg)` }}>
            <a
              href={`https://progettohappiness.com${a.url}`}
              target="_blank"
              rel="noopener"
              className="blog-radial__link"
              style={{ perspective: 800, marginTop: `${cfg.imgTopMargin}vh` }}
            >
              <div
                className="blog-radial__img"
                style={{
                  width: `${cfg.imgWidth}vw`,
                  height: `${cfg.imgHeight}vw`,
                  background: a.color,
                }}
              >
                {a.img && <img src={a.img} alt={a.title} loading="lazy" />}
                <span className="blog-radial__img-title">{a.title}</span>
              </div>
            </a>
          </div>
        ))}
      </div>

      {/* Product info — bottom center */}
      <div className="blog-page__product-info">
        <span className="blog-page__product-name">{article.title}</span>
        <span className="blog-page__product-subtitle">{article.subtitle}</span>
        <span className="blog-page__product-origin" style={{ color: article.color }}>{article.origin}</span>
      </div>

      {/* Counter */}
      <div className="blog-page__counter">
        <span className="blog-page__counter-current">{String(activeIndex + 1).padStart(2, '0')}</span>
        <span className="blog-page__counter-sep">/</span>
        <span className="blog-page__counter-total">{String(N).padStart(2, '0')}</span>
      </div>

      {/* Control panel toggle */}
      <button className="blog-page__ctrl-toggle" onClick={() => setPanelOpen(v => !v)}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </button>

      {/* Control panel — numeric inputs, no range limits */}
      {panelOpen && (
        <div className="blog-page__ctrl-panel">
          <h4 className="blog-page__ctrl-title">Blog Carousel</h4>
          {controlDefs.map((def) => {
            const showSection = def.section !== lastSection;
            lastSection = def.section;
            return (
              <div key={def.key}>
                {showSection && <p className="blog-page__ctrl-section">{def.section}</p>}
                <label className="blog-page__ctrl-row">
                  <span className="blog-page__ctrl-label">{def.label}</span>
                  <input
                    type="number"
                    className="blog-page__ctrl-input"
                    value={cfg[def.key]}
                    step={def.key.includes('Opacity') || def.key.includes('Duration') || def.key.includes('Amplitude') ? 0.05 : 1}
                    onChange={(e) => updateCfg(def.key, parseFloat(e.target.value) || 0)}
                  />
                </label>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});

export default BlogPage;
