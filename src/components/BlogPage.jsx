import { useEffect, useRef, useState, forwardRef } from 'react';
import { gsap } from 'gsap';

/* ── Default projects ───────────────────────────────── */
const DEFAULT_PROJECTS = [
  {
    id: 'happiness-forest',
    title: 'Happiness Forest',
    subtitle: 'In collaborazione con Treedom',
    desc: 'Un progetto per restituire qualcosa al pianeta che ci ospita. Una Foresta costruita interamente con gli alberi piantati dalla community di Progetto Happiness in ogni parte del Mondo.',
    bg: '#71CFA3',
    color: '#184739',
  },
  {
    id: 'ocean-viking',
    title: 'Ocean Viking',
    subtitle: 'Mediterraneo Centrale',
    desc: 'Il primo content creator a bordo di una missione di soccorso nel Mediterraneo Centrale. Un mese con SOS MÉDITERRANÉE per documentare cosa significa speranza lungo la rotta migratoria più letale al mondo.',
    bg: '#BCEFFF',
    color: '#0C3FD3',
  },
  {
    id: 'progetto-scuola',
    title: 'Progetto Scuola',
    subtitle: 'Kapale, Zimbabwe',
    desc: "La costruzione della scuola di Kapale, in Zimbabwe, dove oltre 300 bambini seguono le lezioni all'aperto. Perché l'istruzione è la chiave per spezzare il ciclo della povertà.",
    bg: '#FFDF40',
    color: '#702626',
  },
];

const DEFAULT_LAYOUT = {
  // Page title
  pageTitle: 'Progetti',
  pageSubtitle: 'che cambiano il mondo',
  pageTitleSize: 56,         // px (clamped responsively)
  pageTitleX: 28,            // px from left
  pageTitleY: 28,            // px from top
  pageTitleColor: '#FDF4ED',
  pageSubtitleOpacity: 0.4,

  // Cards layout
  cardWidth: 32,             // vw
  cardAspect: 0.8,
  cardOverlap: 12,           // vw negative margin
  cardRadius: 0.8,           // em
  cardPaddingX: 28,          // px
  cardPaddingY: 32,          // px
  cardShadowBlur: 64,        // px
  cardShadowOpacity: 0.4,

  // Typography (clamped values: title)
  titleSizeMin: 34,
  titleSizeVw: 3.5,
  titleSizeMax: 56,
  titleLineHeight: 0.9,
  titleLetterSpacing: -0.02,

  // Typography (subtitle / mono)
  subtitleSize: 12,          // px
  subtitleLetterSpacing: 0.5,
  subtitleOpacity: 0.7,

  // Typography (desc)
  descSizeMin: 11,
  descSizeVw: 0.85,
  descSizeMax: 14,
  descLineHeight: 1.5,
  descOpacity: 0.85,

  // Background
  bgColor: '#0a0a0a',

  // Animation
  rotationRange: 20,         // deg
  positionRange: 10,         // %
  scaleHover: 1.1,
  pushAmount: 80,
  elasticDuration: 0.8,
  elasticAmplitude: 1,
  elasticPeriod: 0.75,
};

const STORAGE_KEY = 'progetti-cfg-v1';

/* ── ProgettiPage ───────────────────────────────────── */
const BlogPage = forwardRef(({ visible, onClose }, ref) => {
  const containerRef = useRef(null);
  const cardsRef = useRef([]);
  const contentsRef = useRef([]);
  const currentRef = useRef(0);

  // Load from localStorage if available
  const [projects, setProjects] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY + '-projects');
      return saved ? JSON.parse(saved) : DEFAULT_PROJECTS;
    } catch { return DEFAULT_PROJECTS; }
  });
  const [layout, setLayout] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY + '-layout');
      return saved ? { ...DEFAULT_LAYOUT, ...JSON.parse(saved) } : DEFAULT_LAYOUT;
    } catch { return DEFAULT_LAYOUT; }
  });
  const [showPanel, setShowPanel] = useState(false);
  const [editingCard, setEditingCard] = useState(null);

  // Persist
  useEffect(() => { try { localStorage.setItem(STORAGE_KEY + '-projects', JSON.stringify(projects)); } catch {} }, [projects]);
  useEffect(() => { try { localStorage.setItem(STORAGE_KEY + '-layout', JSON.stringify(layout)); } catch {} }, [layout]);

  const updateLayout = (k, v) => setLayout(prev => ({ ...prev, [k]: v }));
  const updateProject = (i, k, v) => setProjects(prev => prev.map((p, idx) => idx === i ? { ...p, [k]: v } : p));
  const resetAll = () => { setLayout(DEFAULT_LAYOUT); setProjects(DEFAULT_PROJECTS); };

  useEffect(() => {
    if (!visible) return;
    const container = containerRef.current;
    if (!container) return;

    const cards = cardsRef.current.filter(Boolean);
    const cardContents = contentsRef.current.filter(Boolean);
    const cardsLength = cards.length;
    if (!cardsLength) return;

    const L = layout;

    cards.forEach(card => {
      gsap.set(card, {
        xPercent: (Math.random() - 0.5) * L.positionRange,
        yPercent: (Math.random() - 0.5) * L.positionRange,
        rotation: (Math.random() - 0.5) * L.rotationRange,
      });
    });

    gsap.fromTo(cards, { opacity: 0 }, { opacity: 1, duration: 0.8, ease: 'power3.out', stagger: 0.1, delay: 0.2 });

    const ease = `elastic.out(${L.elasticAmplitude}, ${L.elasticPeriod})`;

    const resetPortion = (index) => {
      gsap.to(cards[index], {
        xPercent: (Math.random() - 0.5) * L.positionRange,
        yPercent: (Math.random() - 0.5) * L.positionRange,
        rotation: (Math.random() - 0.5) * L.rotationRange,
        scale: 1,
        duration: L.elasticDuration,
        ease,
      });
    };

    const newPortion = (i) => {
      gsap.to(cards[i], {
        xPercent: 0, yPercent: 0, rotation: 0,
        duration: L.elasticDuration, scale: L.scaleHover, ease,
      });
      cardContents.forEach((content, index) => {
        if (index !== i) {
          gsap.to(content, { xPercent: L.pushAmount / (index - i), ease, duration: L.elasticDuration });
        } else {
          gsap.to(content, { xPercent: 0, ease, duration: L.elasticDuration });
        }
      });
    };

    const onMove = (e) => {
      const containerW = container.clientWidth;
      const mouseX = e.clientX - container.getBoundingClientRect().left;
      const percentage = mouseX / containerW;
      const activePortion = Math.ceil(percentage * cardsLength);
      if (currentRef.current !== activePortion && activePortion > 0 && activePortion <= cardsLength) {
        if (currentRef.current !== 0) resetPortion(currentRef.current - 1);
        currentRef.current = activePortion;
        newPortion(currentRef.current - 1);
      }
    };

    const onLeave = () => {
      if (currentRef.current !== 0) resetPortion(currentRef.current - 1);
      currentRef.current = 0;
      gsap.to(cardContents, { xPercent: 0, ease, duration: L.elasticDuration });
    };

    container.addEventListener('mousemove', onMove);
    container.addEventListener('mouseleave', onLeave);
    return () => {
      container.removeEventListener('mousemove', onMove);
      container.removeEventListener('mouseleave', onLeave);
    };
  }, [visible, layout, projects]);

  if (!visible) return null;

  const L = layout;

  return (
    <div ref={ref} className="progetti-page" style={{
      position: 'fixed', inset: 0, zIndex: 500,
      background: L.bgColor,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden',
    }}>
      <h1 style={{
        position: 'absolute', top: L.pageTitleY, left: L.pageTitleX, zIndex: 5,
        font: `200 normal clamp(32px, 4vw, ${L.pageTitleSize}px)/0.9 var(--font-serif)`,
        letterSpacing: '-0.02em',
        color: L.pageTitleColor,
        margin: 0,
        maxWidth: '60vw',
      }}>{L.pageTitle}<br/><span style={{ opacity: L.pageSubtitleOpacity, fontSize: '0.5em' }}>{L.pageSubtitle}</span></h1>

      <button onClick={onClose} style={{
        position: 'absolute', top: 28, right: 28, zIndex: 10,
        background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: '50%', width: 40, height: 40, color: '#fff', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(8px)',
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
      </button>

      <div ref={containerRef} className="progetti__container" style={{ display: 'flex', cursor: 'pointer' }}>
        {projects.map((p, i) => (
          <div
            key={p.id}
            ref={(el) => { cardsRef.current[i] = el; }}
            className="progetti__card"
            style={{
              width: `${L.cardWidth}vw`,
              aspectRatio: L.cardAspect,
              marginLeft: i === 0 ? 0 : `-${L.cardOverlap}vw`,
              zIndex: i === 1 ? 5 : (i === 0 ? 3 : 4),
            }}
          >
            <div
              ref={(el) => { contentsRef.current[i] = el; }}
              className="progetti__content"
              style={{
                width: '100%', height: '100%',
                borderRadius: `${L.cardRadius}em`,
                background: p.bg, color: p.color,
                display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                padding: `${L.cardPaddingY}px ${L.cardPaddingX}px`,
                boxShadow: `0 24px ${L.cardShadowBlur}px rgba(0,0,0,${L.cardShadowOpacity})`,
              }}
            >
              <div>
                <p style={{
                  font: `500 normal ${L.subtitleSize}px/normal "IBM Plex Mono", monospace`,
                  textTransform: 'uppercase', letterSpacing: `${L.subtitleLetterSpacing}px`,
                  opacity: L.subtitleOpacity, margin: 0,
                }}>{p.subtitle}</p>
              </div>
              <h2 style={{
                font: `200 normal clamp(${L.titleSizeMin}px, ${L.titleSizeVw}vw, ${L.titleSizeMax}px)/${L.titleLineHeight} var(--font-serif)`,
                letterSpacing: `${L.titleLetterSpacing}em`,
                margin: '0 0 16px',
              }}>{p.title}</h2>
              <p style={{
                font: `400 normal clamp(${L.descSizeMin}px, ${L.descSizeVw}vw, ${L.descSizeMax}px)/${L.descLineHeight} var(--font-sans)`,
                margin: 0, opacity: L.descOpacity,
              }}>{p.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <p style={{
        position: 'absolute', bottom: 28, left: '50%', transform: 'translateX(-50%)',
        font: '500 normal 11px/normal "IBM Plex Mono", monospace',
        letterSpacing: '1px', textTransform: 'uppercase',
        color: 'rgba(253,244,237,0.4)', margin: 0,
      }}>← Muovi il mouse sulle card →</p>

      {/* Toggle button */}
      <button onClick={() => setShowPanel(!showPanel)} style={{
        position: 'absolute', bottom: 28, right: 28, zIndex: 11,
        background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 8, padding: '6px 12px', color: '#fff', cursor: 'pointer',
        fontSize: 10, fontFamily: 'var(--font-sans)',
      }}>{showPanel ? 'Hide' : 'Edit'}</button>

      {/* Control Panel */}
      {showPanel && (
        <div style={{
          position: 'absolute', top: 28, right: 80, bottom: 28, zIndex: 10,
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12,
          padding: '14px 16px', fontFamily: 'var(--font-sans)', fontSize: 10,
          color: '#fff', overflowY: 'auto', width: 300,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontWeight: 600, fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase', opacity: 0.6 }}>Progetti Editor</span>
            <button onClick={resetAll} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 4, color: '#fff', cursor: 'pointer', fontSize: 9, padding: '3px 8px' }}>Reset</button>
          </div>

          {/* Card editor */}
          <Section title="Cards Content">
            {projects.map((p, i) => (
              <div key={p.id} style={{ marginBottom: 8, padding: 8, background: 'rgba(255,255,255,0.04)', borderRadius: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ opacity: 0.6, fontSize: 9, fontWeight: 600 }}>CARD {i + 1}</span>
                  <button onClick={() => setEditingCard(editingCard === i ? null : i)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 9, opacity: 0.5 }}>
                    {editingCard === i ? '−' : '+'}
                  </button>
                </div>
                {editingCard === i && (
                  <>
                    <Field label="Title" value={p.title} onChange={v => updateProject(i, 'title', v)} />
                    <Field label="Subtitle" value={p.subtitle} onChange={v => updateProject(i, 'subtitle', v)} />
                    <Textarea label="Desc" value={p.desc} onChange={v => updateProject(i, 'desc', v)} />
                    <Color label="BG" value={p.bg} onChange={v => updateProject(i, 'bg', v)} />
                    <Color label="Text" value={p.color} onChange={v => updateProject(i, 'color', v)} />
                  </>
                )}
              </div>
            ))}
          </Section>

          {/* Page Title */}
          <Section title="Page Title">
            <Field label="Title" value={L.pageTitle} onChange={v => updateLayout('pageTitle', v)} />
            <Field label="Subtitle" value={L.pageSubtitle} onChange={v => updateLayout('pageSubtitle', v)} />
            <Range label="Size" min={20} max={120} step={1} value={L.pageTitleSize} onChange={v => updateLayout('pageTitleSize', v)} />
            <Range label="X" min={0} max={200} step={1} value={L.pageTitleX} onChange={v => updateLayout('pageTitleX', v)} />
            <Range label="Y" min={0} max={200} step={1} value={L.pageTitleY} onChange={v => updateLayout('pageTitleY', v)} />
            <Color label="Color" value={L.pageTitleColor} onChange={v => updateLayout('pageTitleColor', v)} />
            <Range label="Sub Op" min={0} max={1} step={0.05} value={L.pageSubtitleOpacity} onChange={v => updateLayout('pageSubtitleOpacity', v)} />
          </Section>

          {/* Card Layout */}
          <Section title="Card Layout">
            <Range label="Width" min={15} max={50} step={0.5} value={L.cardWidth} onChange={v => updateLayout('cardWidth', v)} unit="vw" />
            <Range label="Aspect" min={0.4} max={1.5} step={0.05} value={L.cardAspect} onChange={v => updateLayout('cardAspect', v)} />
            <Range label="Overlap" min={0} max={25} step={0.5} value={L.cardOverlap} onChange={v => updateLayout('cardOverlap', v)} unit="vw" />
            <Range label="Radius" min={0} max={3} step={0.05} value={L.cardRadius} onChange={v => updateLayout('cardRadius', v)} unit="em" />
            <Range label="Pad X" min={10} max={80} step={1} value={L.cardPaddingX} onChange={v => updateLayout('cardPaddingX', v)} />
            <Range label="Pad Y" min={10} max={80} step={1} value={L.cardPaddingY} onChange={v => updateLayout('cardPaddingY', v)} />
            <Range label="Shadow" min={0} max={120} step={1} value={L.cardShadowBlur} onChange={v => updateLayout('cardShadowBlur', v)} />
            <Range label="Sh Op" min={0} max={1} step={0.05} value={L.cardShadowOpacity} onChange={v => updateLayout('cardShadowOpacity', v)} />
          </Section>

          {/* Title Typography */}
          <Section title="Title Typography">
            <Range label="Min" min={16} max={80} step={1} value={L.titleSizeMin} onChange={v => updateLayout('titleSizeMin', v)} />
            <Range label="Vw" min={1} max={8} step={0.1} value={L.titleSizeVw} onChange={v => updateLayout('titleSizeVw', v)} />
            <Range label="Max" min={20} max={120} step={1} value={L.titleSizeMax} onChange={v => updateLayout('titleSizeMax', v)} />
            <Range label="Line H" min={0.7} max={2} step={0.05} value={L.titleLineHeight} onChange={v => updateLayout('titleLineHeight', v)} />
            <Range label="Letter" min={-0.1} max={0.1} step={0.005} value={L.titleLetterSpacing} onChange={v => updateLayout('titleLetterSpacing', v)} unit="em" />
          </Section>

          {/* Subtitle */}
          <Section title="Subtitle">
            <Range label="Size" min={8} max={20} step={0.5} value={L.subtitleSize} onChange={v => updateLayout('subtitleSize', v)} />
            <Range label="Letter" min={0} max={3} step={0.1} value={L.subtitleLetterSpacing} onChange={v => updateLayout('subtitleLetterSpacing', v)} />
            <Range label="Opacity" min={0} max={1} step={0.05} value={L.subtitleOpacity} onChange={v => updateLayout('subtitleOpacity', v)} />
          </Section>

          {/* Desc */}
          <Section title="Description">
            <Range label="Min" min={8} max={20} step={0.5} value={L.descSizeMin} onChange={v => updateLayout('descSizeMin', v)} />
            <Range label="Vw" min={0.5} max={3} step={0.05} value={L.descSizeVw} onChange={v => updateLayout('descSizeVw', v)} />
            <Range label="Max" min={10} max={24} step={0.5} value={L.descSizeMax} onChange={v => updateLayout('descSizeMax', v)} />
            <Range label="Line H" min={1} max={2.5} step={0.05} value={L.descLineHeight} onChange={v => updateLayout('descLineHeight', v)} />
            <Range label="Opacity" min={0} max={1} step={0.05} value={L.descOpacity} onChange={v => updateLayout('descOpacity', v)} />
          </Section>

          {/* Animation */}
          <Section title="Animation">
            <Range label="Rot" min={0} max={45} step={1} value={L.rotationRange} onChange={v => updateLayout('rotationRange', v)} unit="°" />
            <Range label="Pos" min={0} max={30} step={0.5} value={L.positionRange} onChange={v => updateLayout('positionRange', v)} unit="%" />
            <Range label="Scale" min={1} max={1.5} step={0.01} value={L.scaleHover} onChange={v => updateLayout('scaleHover', v)} />
            <Range label="Push" min={0} max={200} step={5} value={L.pushAmount} onChange={v => updateLayout('pushAmount', v)} />
            <Range label="Dur" min={0.1} max={2} step={0.05} value={L.elasticDuration} onChange={v => updateLayout('elasticDuration', v)} unit="s" />
            <Range label="Amp" min={0.1} max={3} step={0.05} value={L.elasticAmplitude} onChange={v => updateLayout('elasticAmplitude', v)} />
            <Range label="Period" min={0.1} max={2} step={0.05} value={L.elasticPeriod} onChange={v => updateLayout('elasticPeriod', v)} />
          </Section>

          {/* BG */}
          <Section title="Background">
            <Color label="BG" value={L.bgColor} onChange={v => updateLayout('bgColor', v)} />
          </Section>
        </div>
      )}
    </div>
  );
});

/* ── Subcomponents for control panel ─────────────────── */
const Section = ({ title, children }) => (
  <div style={{ marginBottom: 12 }}>
    <div style={{ opacity: 0.4, fontSize: 9, marginBottom: 6, letterSpacing: 0.8, textTransform: 'uppercase', fontWeight: 600 }}>{title}</div>
    {children}
  </div>
);

const Range = ({ label, min, max, step, value, onChange, unit = '' }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
    <span style={{ width: 44, opacity: 0.5 }}>{label}</span>
    <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(+e.target.value)} style={{ flex: 1 }} />
    <span style={{ width: 38, textAlign: 'right', opacity: 0.4, fontSize: 9 }}>{typeof value === 'number' ? value.toFixed(step < 1 ? 2 : 0) : value}{unit}</span>
  </div>
);

const Field = ({ label, value, onChange }) => (
  <div style={{ marginBottom: 4 }}>
    <div style={{ opacity: 0.4, fontSize: 9, marginBottom: 2 }}>{label}</div>
    <input type="text" value={value} onChange={e => onChange(e.target.value)} style={{
      width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 4, color: '#fff', padding: '4px 6px', fontSize: 10, fontFamily: 'inherit',
    }} />
  </div>
);

const Textarea = ({ label, value, onChange }) => (
  <div style={{ marginBottom: 4 }}>
    <div style={{ opacity: 0.4, fontSize: 9, marginBottom: 2 }}>{label}</div>
    <textarea value={value} onChange={e => onChange(e.target.value)} rows={3} style={{
      width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 4, color: '#fff', padding: '4px 6px', fontSize: 10, fontFamily: 'inherit', resize: 'vertical',
    }} />
  </div>
);

const Color = ({ label, value, onChange }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
    <span style={{ width: 44, opacity: 0.5, fontSize: 10 }}>{label}</span>
    <input type="color" value={value} onChange={e => onChange(e.target.value)} style={{ width: 28, height: 22, border: 'none', background: 'none', cursor: 'pointer' }} />
    <span style={{ flex: 1, opacity: 0.4, fontSize: 9, fontFamily: 'monospace' }}>{value}</span>
  </div>
);

BlogPage.displayName = 'BlogPage';
export default BlogPage;
