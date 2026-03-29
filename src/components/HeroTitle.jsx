import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

const SMILE_WORDS = ['What', 'Makes', 'You', 'Happy?'];

const HeroTitle = ({ config }) => {
  const smileWordsRef = useRef([]);
  const progettoCharsRef = useRef([]);
  const happinessCharsRef = useRef([]);
  const smileWrapRef = useRef(null);
  const introDone = useRef(false);
  const scrollVal = useRef(0);
  const smoothVal = useRef(0);

  // Scroll listener + smooth rAF loop — updates GSAP directly, no React state
  useEffect(() => {
    const onScroll = (e) => { scrollVal.current = e.detail.pct; };
    window.addEventListener('globe:scroll', onScroll);

    const circIn = (t) => 1 - Math.sqrt(1 - t * t);

    const updateChars = (charsRef, fadeStart, fadeEnd) => {
      const chars = charsRef.current.filter(Boolean);
      if (!chars.length || !introDone.current) return;
      const mid = (chars.length - 1) / 2;
      const range = fadeEnd - fadeStart;
      const pct = smoothVal.current;

      chars.forEach((el, i) => {
        const distFromCenter = Math.abs(i - mid) / mid;
        const charDelay = distFromCenter * 0.6;
        const charStart = fadeStart + charDelay * range * 0.3;
        const charEnd = fadeStart + range * 0.5 + charDelay * range * 0.5;

        let t = 0;
        if (pct >= charEnd) t = 1;
        else if (pct > charStart) t = (pct - charStart) / (charEnd - charStart);

        const eased = circIn(t);
        gsap.set(el, { y: -10 * eased, opacity: 1 - eased });
      });
    };

    const tick = () => {
      smoothVal.current += (scrollVal.current - smoothVal.current) * 0.12;
      updateChars(happinessCharsRef, 18, 46);
      updateChars(progettoCharsRef, 50, 60);

      // Smile fade
      if (smileWrapRef.current && introDone.current) {
        const p = smoothVal.current;
        const op = p <= 30 ? 1 : p >= 40 ? 0 : 1 - (p - 30) / 10;
        gsap.set(smileWrapRef.current, { opacity: op });
      }

      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);

    return () => window.removeEventListener('globe:scroll', onScroll);
  }, []);

  // Intro animation — GSAP only
  useEffect(() => {
    const timer = setTimeout(() => {
      const animateIn = (charsRef, delay) => {
        const chars = charsRef.current.filter(Boolean);
        if (!chars.length) return;
        const mid = (chars.length - 1) / 2;
        const sorted = chars
          .map((el, i) => ({ el, dist: Math.abs(i - mid) }))
          .sort((a, b) => a.dist - b.dist)
          .map((o) => o.el);

        gsap.fromTo(sorted,
          { y: 10, opacity: 0 },
          { y: 0, opacity: 1, duration: 1, ease: 'circ.out', stagger: 0.035, delay }
        );
      };

      animateIn(happinessCharsRef, 0.3);
      animateIn(progettoCharsRef, 0.7);

      const smileEls = smileWordsRef.current.filter(Boolean);
      gsap.fromTo(smileEls,
        { opacity: 0, attr: { dy: 50 } },
        { opacity: 1, attr: { dy: 0 }, duration: 1.4, ease: 'circ.out', stagger: 0.13, delay: 1.2 }
      );

      // Mark intro done after animations complete
      setTimeout(() => { introDone.current = true; }, 2200);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  const c = config;

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
          {'Progetto'.split('').map((char, i) => (
            <span key={i} ref={(el) => { progettoCharsRef.current[i] = el; }}
              className="hero-char">
              {char}
            </span>
          ))}
        </span>
        <span className="hero-title__line2">
          {'Happiness'.split('').map((char, i) => (
            <span key={i} ref={(el) => { happinessCharsRef.current[i] = el; }}
              className="hero-char">
              {char}
            </span>
          ))}
        </span>
      </h1>
      <svg className="hero-title__curve" viewBox={`0 0 600 ${Math.round(c.curveDepth * 1.2)}`} xmlns="http://www.w3.org/2000/svg">
        <defs>
          <path id="smile-curve" d={`M 30,10 Q 300,${c.curveDepth} 570,10`} fill="none" />
        </defs>
        <text ref={smileWrapRef}>
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
