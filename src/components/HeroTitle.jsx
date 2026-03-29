import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';

const SMILE_WORDS = ['What', 'Makes', 'You', 'Happy?'];

const SplitChars = ({ text, charsRef }) => {
  const chars = text.split('');
  return (
    <span style={{ display: 'inline-flex', justifyContent: 'center' }}>
      {chars.map((char, i) => (
        <span key={i} ref={(el) => { charsRef.current[i] = el; }} style={{ display: 'inline-block' }}>
          {char === ' ' ? '\u00A0' : char}
        </span>
      ))}
    </span>
  );
};

const HeroTitle = ({ config, onConfigChange }) => {
  const line1Ref = useRef(null);
  const line2Ref = useRef(null);
  const smileWordsRef = useRef([]);
  const happinessCharsRef = useRef([]);
  const progettoCharsRef = useRef([]);
  const hasAnimated = useRef(false);
  const [scrollPct, setScrollPct] = useState(0);
  const scrollRef = useRef(0);

  // Track triggers
  const happinessFired = useRef(false);
  const progettoFired = useRef(false);
  const happinessTween = useRef(null);
  const progettoTween = useRef(null);

  useEffect(() => {
    const onScroll = (e) => {
      setScrollPct(e.detail.pct);
      scrollRef.current = e.detail.pct;
    };
    window.addEventListener('globe:scroll', onScroll);
    return () => window.removeEventListener('globe:scroll', onScroll);
  }, []);

  // Intro animation
  useEffect(() => {
    if (hasAnimated.current) return;
    hasAnimated.current = true;

    const words = [line1Ref.current, line2Ref.current].filter(Boolean);
    gsap.fromTo(words,
      { y: 50, opacity: 0 },
      { y: 0, opacity: 1, duration: 1.2, ease: 'power3.out', stagger: 0.15 }
    );

    const smileEls = smileWordsRef.current.filter(Boolean);
    gsap.fromTo(smileEls,
      { opacity: 0, attr: { dy: 50 } },
      { opacity: 1, attr: { dy: 0 }, duration: 1.4, ease: 'circ.out', stagger: 0.13, delay: 0.5 }
    );
  }, []);

  // Animate chars from center outward
  const animateOut = (charsRef) => {
    const chars = charsRef.current.filter(Boolean);
    if (!chars.length) return null;
    const mid = (chars.length - 1) / 2;
    // Sort by distance from center (center first)
    const sorted = chars.map((el, i) => ({ el, dist: Math.abs(i - mid) }))
      .sort((a, b) => a.dist - b.dist)
      .map((o) => o.el);
    return gsap.to(sorted, {
      y: -30, opacity: 0, duration: 1.4, ease: 'circ.inOut', stagger: 0.04,
    });
  };

  const animateIn = (charsRef) => {
    const chars = charsRef.current.filter(Boolean);
    if (!chars.length) return null;
    const mid = (chars.length - 1) / 2;
    const sorted = chars.map((el, i) => ({ el, dist: Math.abs(i - mid) }))
      .sort((a, b) => a.dist - b.dist)
      .map((o) => o.el);
    return gsap.to(sorted, {
      y: 0, opacity: 1, duration: 1.4, ease: 'circ.inOut', stagger: 0.04,
    });
  };

  // Scroll triggers
  useEffect(() => {
    // Happiness: trigger at 35%
    if (scrollPct >= 35 && !happinessFired.current) {
      happinessFired.current = true;
      happinessTween.current?.kill();
      happinessTween.current = animateOut(happinessCharsRef);
    } else if (scrollPct < 35 && happinessFired.current) {
      happinessFired.current = false;
      happinessTween.current?.kill();
      happinessTween.current = animateIn(happinessCharsRef);
    }

    // Progetto: trigger at 50%
    if (scrollPct >= 50 && !progettoFired.current) {
      progettoFired.current = true;
      progettoTween.current?.kill();
      progettoTween.current = animateOut(progettoCharsRef);
    } else if (scrollPct < 50 && progettoFired.current) {
      progettoFired.current = false;
      progettoTween.current?.kill();
      progettoTween.current = animateIn(progettoCharsRef);
    }
  }, [scrollPct]);

  const c = config;
  const smileFade = scrollPct <= 50 ? 1 : scrollPct >= 58 ? 0 : 1 - (scrollPct - 50) / 8;

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
        <span className="hero-title__line1" ref={line1Ref} style={{ opacity: hasAnimated.current ? 1 : 0 }}>
          <SplitChars text="Progetto" charsRef={progettoCharsRef} />
        </span>
        <span className="hero-title__line2" ref={line2Ref} style={{ opacity: hasAnimated.current ? 1 : 0 }}>
          <SplitChars text="Happiness" charsRef={happinessCharsRef} />
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
