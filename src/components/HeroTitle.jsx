import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';

const SMILE_WORDS = ['What', 'Makes', 'You', 'Happy?'];

const charBase = { display: 'inline-block', fontKerning: 'auto', textRendering: 'optimizeLegibility' };

const SplitChars = ({ text, charsRef, scrollPct, fadeStart, fadeEnd, introComplete }) => {
  const chars = text.split('');
  const mid = (chars.length - 1) / 2;
  const circIn = (t) => 1 - Math.sqrt(1 - t * t);

  return (
    <span>
      {chars.map((char, i) => {
        if (!introComplete) {
          return (
            <span key={i} ref={(el) => { charsRef.current[i] = el; }}
              style={{ ...charBase, opacity: 0, transform: 'translateY(10px)' }}>
              {char === ' ' ? '\u00A0' : char}
            </span>
          );
        }

        const distFromCenter = Math.abs(i - mid) / mid;
        const charDelay = distFromCenter * 0.6;
        const range = fadeEnd - fadeStart;
        const charStart = fadeStart + charDelay * range * 0.3;
        const charEnd = fadeStart + range * 0.5 + charDelay * range * 0.5;

        let t = 0;
        if (scrollPct >= charEnd) t = 1;
        else if (scrollPct > charStart) t = (scrollPct - charStart) / (charEnd - charStart);

        const eased = circIn(t);

        return (
          <span key={i} ref={(el) => { charsRef.current[i] = el; }}
            style={{ ...charBase, opacity: 1 - eased, transform: `translateY(${-10 * eased}px)` }}>
            {char === ' ' ? '\u00A0' : char}
          </span>
        );
      })}
    </span>
  );
};

const HeroTitle = ({ config, onConfigChange }) => {
  const smileWordsRef = useRef([]);
  const progettoCharsRef = useRef([]);
  const happinessCharsRef = useRef([]);
  const [introComplete, setIntroComplete] = useState(false);
  const [scrollPct, setScrollPct] = useState(0);
  const targetScroll = useRef(0);
  const smoothScroll = useRef(0);
  const rafId = useRef(null);

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

  // Intro: per-char stagger from center
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

        gsap.to(sorted, {
          y: 0, opacity: 1, duration: 1, ease: 'circ.out', stagger: 0.035, delay,
          clearProps: 'transform',  // clean up so scroll-driven styles take over
        });
      };

      animateIn(happinessCharsRef, 0.3);
      animateIn(progettoCharsRef, 0.7);

      // Mark intro done after both animations complete
      setTimeout(() => setIntroComplete(true), 2000);

      const smileEls = smileWordsRef.current.filter(Boolean);
      gsap.fromTo(smileEls,
        { opacity: 0, attr: { dy: 50 } },
        { opacity: 1, attr: { dy: 0 }, duration: 1.4, ease: 'circ.out', stagger: 0.13, delay: 1.2 }
      );
    }, 100);

    return () => clearTimeout(timer);
  }, []);

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
          <SplitChars text="Progetto" charsRef={progettoCharsRef} scrollPct={scrollPct}
            fadeStart={50} fadeEnd={60} introComplete={introComplete} />
        </span>
        <span className="hero-title__line2">
          <SplitChars text="Happiness" charsRef={happinessCharsRef} scrollPct={scrollPct}
            fadeStart={18} fadeEnd={46} introComplete={introComplete} />
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
