import { useEffect, useRef, forwardRef } from 'react';
import { gsap } from 'gsap';

/* ── Progetti ───────────────────────────────────────── */
const projects = [
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

/* ── ProgettiPage ───────────────────────────────────── */
const BlogPage = forwardRef(({ visible, onClose }, ref) => {
  const containerRef = useRef(null);
  const cardsRef = useRef([]);
  const contentsRef = useRef([]);
  const currentRef = useRef(0); // 0 = none

  useEffect(() => {
    if (!visible) return;
    const container = containerRef.current;
    if (!container) return;

    const cards = cardsRef.current.filter(Boolean);
    const cardContents = contentsRef.current.filter(Boolean);
    const cardsLength = cards.length;
    if (!cardsLength) return;

    // Initial scattered positions
    cards.forEach(card => {
      gsap.set(card, {
        xPercent: (Math.random() - 0.5) * 10,
        yPercent: (Math.random() - 0.5) * 10,
        rotation: (Math.random() - 0.5) * 20,
      });
    });

    // Intro fade in
    gsap.fromTo(cards, { opacity: 0 }, { opacity: 1, duration: 0.8, ease: 'power3.out', stagger: 0.1, delay: 0.2 });

    const resetPortion = (index) => {
      gsap.to(cards[index], {
        xPercent: (Math.random() - 0.5) * 10,
        yPercent: (Math.random() - 0.5) * 10,
        rotation: (Math.random() - 0.5) * 20,
        scale: 1,
        duration: 0.8,
        ease: 'elastic.out(1, 0.75)',
      });
    };

    const newPortion = (i) => {
      gsap.to(cards[i], {
        xPercent: 0,
        yPercent: 0,
        rotation: 0,
        duration: 0.8,
        scale: 1.1,
        ease: 'elastic.out(1, 0.75)',
      });

      cardContents.forEach((content, index) => {
        if (index !== i) {
          gsap.to(content, {
            xPercent: 80 / (index - i),
            ease: 'elastic.out(1, 0.75)',
            duration: 0.8,
          });
        } else {
          gsap.to(content, {
            xPercent: 0,
            ease: 'elastic.out(1, 0.75)',
            duration: 0.8,
          });
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
      gsap.to(cardContents, {
        xPercent: 0,
        ease: 'elastic.out(1, 0.75)',
        duration: 0.8,
      });
    };

    container.addEventListener('mousemove', onMove);
    container.addEventListener('mouseleave', onLeave);

    return () => {
      container.removeEventListener('mousemove', onMove);
      container.removeEventListener('mouseleave', onLeave);
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div ref={ref} className="progetti-page" style={{
      position: 'fixed', inset: 0, zIndex: 500,
      background: '#0a0a0a',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden',
    }}>
      <h1 style={{
        position: 'absolute', top: 28, left: 28, zIndex: 5,
        font: '200 normal clamp(32px, 4vw, 56px)/0.9 var(--font-serif)',
        letterSpacing: '-0.02em',
        color: '#FDF4ED',
        margin: 0,
        maxWidth: '60vw',
      }}>Progetti<br/><span style={{ opacity: 0.4, fontSize: '0.5em' }}>che cambiano il mondo</span></h1>

      <button onClick={onClose} style={{
        position: 'absolute', top: 28, right: 28, zIndex: 10,
        background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: '50%', width: 40, height: 40, color: '#fff', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(8px)',
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
      </button>

      <div ref={containerRef} className="progetti__container" style={{
        display: 'flex',
        cursor: 'pointer',
      }}>
        {projects.map((p, i) => (
          <div
            key={p.id}
            ref={(el) => { cardsRef.current[i] = el; }}
            className="progetti__card"
            style={{
              width: '32vw',
              aspectRatio: '0.8',
              marginLeft: i === 0 ? 0 : '-12vw',
              zIndex: i === 1 ? 5 : (i === 0 ? 3 : 4),
            }}
          >
            <div
              ref={(el) => { contentsRef.current[i] = el; }}
              className="progetti__content"
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '0.8em',
                background: p.bg,
                color: p.color,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '32px 28px',
                boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
              }}
            >
              <div>
                <p style={{
                  font: '500 normal clamp(10px, 0.85vw, 13px)/normal "IBM Plex Mono", monospace',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  opacity: 0.7,
                  margin: 0,
                }}>{p.subtitle}</p>
              </div>

              <h2 style={{
                font: '200 normal clamp(34px, 3.5vw, 56px)/0.9 var(--font-serif)',
                letterSpacing: '-0.02em',
                margin: '0 0 16px',
              }}>{p.title}</h2>

              <p style={{
                font: '400 normal clamp(11px, 0.85vw, 14px)/1.5 var(--font-sans)',
                margin: 0,
                opacity: 0.85,
              }}>{p.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <p style={{
        position: 'absolute', bottom: 28, left: '50%', transform: 'translateX(-50%)',
        font: '500 normal 11px/normal "IBM Plex Mono", monospace',
        letterSpacing: '1px', textTransform: 'uppercase',
        color: 'rgba(253,244,237,0.4)',
        margin: 0,
      }}>← Muovi il mouse sulle card →</p>
    </div>
  );
});

BlogPage.displayName = 'BlogPage';
export default BlogPage;
