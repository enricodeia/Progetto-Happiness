import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';

const SMILE_WORDS = ['What', 'Makes', 'You', 'Happy?'];

const circIn = (t) => 1 - Math.sqrt(1 - t * t);

const SplitChars = ({ text, scrollPct, fadeStart, fadeEnd, charsRef, introDone }) => {
  const chars = text.split('');
  const mid = (chars.length - 1) / 2;

  return (
    <>
      {chars.map((char, i) => {
        const dist = Math.abs(i - mid) / (mid || 1);
        const delay = dist * 0.6;
        const range = fadeEnd - fadeStart;
        const start = fadeStart + delay * range * 0.3;
        const end = fadeStart + range * 0.5 + delay * range * 0.5;

        let t = 0;
        if (scrollPct >= end) t = 1;
        else if (scrollPct > start) t = (scrollPct - start) / (end - start);

        const eased = circIn(t);

        // Before intro done: no inline style (GSAP controls via ref)
        // After intro done: React controls scroll-out
        const style = introDone
          ? { opacity: 1 - eased, transform: `translateY(${-10 * eased}px)` }
          : undefined;

        return (
          <span key={i} ref={(el) => { charsRef.current[i] = el; }}
            className="hero-char" style={style}>
            {char}
          </span>
        );
      })}
    </>
  );
};

const HeroTitle = ({ config }) => {
  const smileWordsRef = useRef([]);
  const progettoCharsRef = useRef([]);
  const happinessCharsRef = useRef([]);
  const [introDone, setIntroDone] = useState(false);
  const [scrollPct, setScrollPct] = useState(0);
  const targetScroll = useRef(0);
  const smoothScroll = useRef(0);
  const rafId = useRef(null);

  // Smooth lerp loop
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

  // Per-char intro — GSAP on .hero-char only, never on parent spans
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
        // Set all chars hidden immediately (GSAP controls from here)
        gsap.set(chars, { opacity: 0, y: 10 });
        gsap.to(sorted, {
          y: 0, opacity: 1, duration: 1, ease: 'circ.out', stagger: 0.035, delay,
          onComplete() {
            // Only clear transform — leave opacity:1 so no flash when React takes over
            chars.forEach((el) => gsap.set(el, { clearProps: 'transform' }));
          },
        });
      };

      animateIn(happinessCharsRef, 0.1);
      animateIn(progettoCharsRef, 0.5);

      const smileEls = smileWordsRef.current.filter(Boolean);
      gsap.fromTo(smileEls,
        { opacity: 0, attr: { dy: 50 } },
        { opacity: 1, attr: { dy: 0 }, duration: 1.4, ease: 'circ.out', stagger: 0.13, delay: 1.0 }
      );

      // After all animations complete, let React take over
      setTimeout(() => setIntroDone(true), 2200);
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
            fadeStart={50} fadeEnd={60} introDone={introDone} />
        </span>
        <span className="hero-title__line2">
          <SplitChars text="Happiness" charsRef={happinessCharsRef} scrollPct={scrollPct}
            fadeStart={18} fadeEnd={46} introDone={introDone} />
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
