import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';

const SMILE_WORDS = ['What', 'Makes', 'You', 'Happy?'];

const circIn = (t) => 1 - Math.sqrt(1 - t * t);

const SplitChars = ({ text, scrollPct, fadeStart, fadeEnd }) => {
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

        return (
          <span key={i} className="hero-char" style={{
            opacity: 1 - eased,
            transform: `translateY(${-10 * eased}px)`,
          }}>
            {char}
          </span>
        );
      })}
    </>
  );
};

const HeroTitle = ({ config }) => {
  const line1Ref = useRef(null);
  const line2Ref = useRef(null);
  const smileWordsRef = useRef([]);
  const [wordsVisible, setWordsVisible] = useState(false);
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

  // Word-level intro — opacity only (no transform, no clearProps needed)
  useEffect(() => {
    setWordsVisible(false);
    const tl = gsap.timeline({
      onComplete: () => setWordsVisible(true),
    });
    tl.to({}, { duration: 0.1 }); // tiny delay
    tl.call(() => setWordsVisible(true));

    const smileEls = smileWordsRef.current.filter(Boolean);
    gsap.fromTo(smileEls,
      { opacity: 0, attr: { dy: 50 } },
      { opacity: 1, attr: { dy: 0 }, duration: 1.4, ease: 'circ.out', stagger: 0.13, delay: 0.5 }
    );
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
        <span className="hero-title__line1" ref={line1Ref}
          style={{ opacity: wordsVisible ? 1 : 0, transition: wordsVisible ? 'none' : 'opacity 1.2s ease' }}>
          <SplitChars text="Progetto" scrollPct={scrollPct} fadeStart={50} fadeEnd={60} />
        </span>
        <span className="hero-title__line2" ref={line2Ref}
          style={{ opacity: wordsVisible ? 1 : 0, transition: wordsVisible ? 'none' : 'opacity 1.2s ease' }}>
          <SplitChars text="Happiness" scrollPct={scrollPct} fadeStart={18} fadeEnd={46} />
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
