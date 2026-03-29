import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';

const SMILE_WORDS = ['What', 'Makes', 'You', 'Happy?'];

const circIn = (t) => 1 - Math.sqrt(1 - t * t);

function getCharProgress(i, total, scrollPct, fadeStart, fadeEnd) {
  const mid = (total - 1) / 2;
  const dist = Math.abs(i - mid) / (mid || 1);
  const delay = dist * 0.6;
  const range = fadeEnd - fadeStart;
  const start = fadeStart + delay * range * 0.3;
  const end = fadeStart + range * 0.5 + delay * range * 0.5;
  let t = 0;
  if (scrollPct >= end) t = 1;
  else if (scrollPct > start) t = (scrollPct - start) / (end - start);
  return circIn(t);
}

const HeroTitle = ({ config, startAnim }) => {
  const smileWordsRef = useRef([]);
  const progettoCharsRef = useRef([]);
  const happinessCharsRef = useRef([]);
  const introFired = useRef(false);
  const introDoneRef = useRef(false);
  const [scrollPct, setScrollPct] = useState(0);
  const targetScroll = useRef(0);
  const smoothScroll = useRef(0);
  const rafId = useRef(null);

  // Smooth scroll lerp — no glitch, buttery smooth
  useEffect(() => {
    const onScroll = (e) => { targetScroll.current = e.detail.pct; };
    window.addEventListener('globe:scroll', onScroll);
    const tick = () => {
      smoothScroll.current += (targetScroll.current - smoothScroll.current) * 0.12;
      setScrollPct(smoothScroll.current);
      rafId.current = requestAnimationFrame(tick);
    };
    rafId.current = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener('globe:scroll', onScroll);
      cancelAnimationFrame(rafId.current);
    };
  }, []);

  // Intro animation — fires once when startAnim becomes true
  useEffect(() => {
    if (!startAnim || introFired.current) return;
    introFired.current = true;

    const animateIn = (charsRef, delay) => {
      const chars = charsRef.current.filter(Boolean);
      if (!chars.length) return;
      const mid = (chars.length - 1) / 2;
      const sorted = chars
        .map((el, i) => ({ el, dist: Math.abs(i - mid) }))
        .sort((a, b) => a.dist - b.dist)
        .map((o) => o.el);
      gsap.fromTo(sorted,
        { y: 10, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: 1, ease: 'circ.out', stagger: 0.035, delay }
      );
    };

    // Title chars first, before any other UI
    animateIn(happinessCharsRef, 0.1);
    animateIn(progettoCharsRef, 0.5);

    const smileEls = smileWordsRef.current.filter(Boolean);
    gsap.fromTo(smileEls,
      { opacity: 0, attr: { dy: 50 } },
      { opacity: 1, attr: { dy: 0 }, duration: 1.4, ease: 'circ.out', stagger: 0.13, delay: 1.0 }
    );

    setTimeout(() => { introDoneRef.current = true; }, 2000);
  }, [startAnim]);

  const c = config;
  const smileFade = scrollPct <= 30 ? 1 : scrollPct >= 40 ? 0 : 1 - (scrollPct - 30) / 10;

  return (
    <div className="hero-title" style={{
      '--hero-top-y': `${c.topY}vh`,
      '--hero-top-y-dvh': `${c.topY}dvh`,
      '--hero-top-y-mobile': `${c.topYMobile ?? c.topY}vh`,
      '--hero-top-y-mobile-dvh': `${c.topYMobile ?? c.topY}dvh`,
      '--hero-bottom-y': `${c.bottomY}vh`,
      '--hero-bottom-y-dvh': `${c.bottomY}dvh`,
      '--hero-top-size': `${c.topSize}px`,
      '--hero-bottom-size': `${c.bottomSize}px`,
      '--hero-curve-width': `${c.curveWidth}px`,
      '--hero-top-color': c.topColor,
      '--hero-accent-color': c.accentColor,
      '--hero-bottom-color': c.bottomColor,
    }}>
      <h1 className="hero-title__heading">
        <span className="hero-title__line1">
          {'Progetto'.split('').map((char, i) => {
            const e = introDoneRef.current ? getCharProgress(i, 8, scrollPct, 50, 60) : 0;
            return (
              <span key={i} ref={(el) => { progettoCharsRef.current[i] = el; }}
                className="hero-char"
                style={e > 0 ? { opacity: 1 - e, transform: `translateY(${-10 * e}px)` } : undefined}>
                {char}
              </span>
            );
          })}
        </span>
        <span className="hero-title__line2">
          {'Happiness'.split('').map((char, i) => {
            const e = introDoneRef.current ? getCharProgress(i, 9, scrollPct, 18, 46) : 0;
            return (
              <span key={i} ref={(el) => { happinessCharsRef.current[i] = el; }}
                className="hero-char"
                style={e > 0 ? { opacity: 1 - e, transform: `translateY(${-10 * e}px)` } : undefined}>
                {char}
              </span>
            );
          })}
        </span>
      </h1>
      <svg className="hero-title__curve" viewBox={`0 0 600 ${Math.round(c.curveDepth * 1.2)}`} xmlns="http://www.w3.org/2000/svg">
        <defs>
          <path id="smile-curve" d={`M 30,10 Q 300,${c.curveDepth} 570,10`} fill="none" />
        </defs>
        <text style={{ opacity: smileFade }}>
          <textPath href="#smile-curve" startOffset="50%" textAnchor="middle">
            {SMILE_WORDS.map((word, i) => (
              <tspan key={i} ref={(el) => { smileWordsRef.current[i] = el; }} style={{ opacity: 0 }}>
                {word}{i < SMILE_WORDS.length - 1 ? ' ' : ''}
              </tspan>
            ))}
          </textPath>
        </text>
      </svg>
    </div>
  );
};

export default HeroTitle;
