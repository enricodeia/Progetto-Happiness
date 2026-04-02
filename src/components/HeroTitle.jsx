import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';

const SMILE_WORDS = ['What', 'Makes', 'You', 'Happy?'];

const smoothstep = (t) => t * t * (3 - 2 * t);

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

        const eased = smoothstep(t);
        const op = t >= 0.97 ? 0 : 1 - eased;

        const style = introDone
          ? { opacity: op, transform: `translateY(${-10 * eased}px)` }
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

const HeroTitle = ({ config, smileConfig }) => {
  const smileWordsRef = useRef([]);
  const progettoCharsRef = useRef([]);
  const happinessCharsRef = useRef([]);
  const subtitleRef = useRef(null);
  const [introDone, setIntroDone] = useState(false);
  const [scrollPct, setScrollPct] = useState(0);
  const targetScroll = useRef(0);
  const smoothScroll = useRef(0);
  const rafId = useRef(null);

  useEffect(() => {
    const onScroll = (e) => { targetScroll.current = e.detail.pct; };
    window.addEventListener('globe:scroll', onScroll);
    const tick = () => {
      const diff = targetScroll.current - smoothScroll.current;
      if (Math.abs(diff) < 0.05) {
        smoothScroll.current = targetScroll.current;
      } else {
        smoothScroll.current += diff * 0.08;
      }
      setScrollPct(smoothScroll.current);
      rafId.current = requestAnimationFrame(tick);
    };
    rafId.current = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener('globe:scroll', onScroll);
      cancelAnimationFrame(rafId.current);
    };
  }, []);

  // Per-char intro + subtitle fade in
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
        gsap.set(chars, { opacity: 0, y: -40 });
        gsap.to(sorted, {
          y: 0, opacity: 1, duration: 1, ease: 'circ.out', stagger: 0.035, delay,
          onComplete() {
            chars.forEach((el) => gsap.set(el, { clearProps: 'transform' }));
          },
        });
      };

      animateIn(progettoCharsRef, 0.1);
      animateIn(happinessCharsRef, 0.3);

      // Subtitle paragraph fade in
      if (subtitleRef.current) {
        gsap.fromTo(subtitleRef.current,
          { opacity: 0, y: 8 },
          { opacity: 0.45, y: 0, duration: 1.2, ease: 'power3.out', delay: 1.0 }
        );
      }

      // Smile words — opacity controlled by scroll, no GSAP needed

      setTimeout(() => setIntroDone(true), 2200);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  const c = config;
  const raw = smileConfig || {};
  const isMob = typeof window !== 'undefined' && window.innerWidth <= 768;
  const sc = isMob ? {
    ...raw,
    fontSize: raw.mFontSize ?? 32,
    width: raw.mWidth ?? 300,
    viewW: raw.mViewW ?? 400,
    curveDepth: raw.mCurveDepth ?? 140,
    posY: raw.mPosY ?? 82,
  } : raw;

  // Subtitle fades out on scroll
  const subtitleFade = scrollPct <= 25 ? 1 : scrollPct >= 40 ? 0 : 1 - (scrollPct - 25) / 15;

  // "What Makes You Happy?" reveals on scroll — per-word stagger
  const smileRevealStart = sc.revealStart ?? 60;
  const smileRevealEnd = sc.revealEnd ?? 75;
  const smileStagger = 3; // scroll % between each word's start
  const smileWordDur = 8; // scroll % for each word to fully appear

  // Per-word opacity + Y offset
  const smileWords = SMILE_WORDS.map((word, i) => {
    const wordStart = smileRevealStart + i * smileStagger;
    const wordEnd = wordStart + smileWordDur;
    let t = 0;
    if (scrollPct >= wordEnd) t = 1;
    else if (scrollPct > wordStart) t = (scrollPct - wordStart) / (wordEnd - wordStart);
    const eased = 1 - Math.pow(1 - t, 3); // cubic ease-out
    const op = eased;
    const dy = (1 - eased) * -50;

    // Fade out phase
    let fadeOp = 1;
    if (scrollPct > (sc.fadeStart ?? 90)) {
      const fadeEnd = sc.fadeEnd ?? 98;
      fadeOp = scrollPct >= fadeEnd ? 0 : 1 - (scrollPct - (sc.fadeStart ?? 90)) / (fadeEnd - (sc.fadeStart ?? 90));
    }

    return { word, op: op * fadeOp, dy };
  });

  // Overall SVG visibility (show container when any word is active)
  const smileOp = smileWords.some((w) => w.op > 0.01) ? 1 : 0;

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
            fadeStart={32} fadeEnd={60} introDone={introDone} />
        </span>
        <span className="hero-title__line2">
          <SplitChars text="Happiness" charsRef={happinessCharsRef} scrollPct={scrollPct}
            fadeStart={18} fadeEnd={46} introDone={introDone} />
        </span>
      </h1>

      {/* Subtitle paragraph — visible at start, fades on scroll */}
      <p className="hero-title__subtitle" ref={subtitleRef} style={{
        opacity: introDone ? subtitleFade * 0.45 : 0,
      }}>
        Il progetto che racconta la felicità<br />attraverso reportage dal mondo.
      </p>

      {/* "What Makes You Happy?" — reveals on scroll at 60%+ */}
      <svg className="hero-title__curve" viewBox={`0 0 ${sc.viewW ?? 900} ${Math.round((sc.curveDepth ?? 200) * 1.2)}`}
        xmlns="http://www.w3.org/2000/svg"
        style={{
          opacity: smileOp,
          fontSize: `${sc.fontSize ?? 64}px`,
          top: `${sc.posY ?? 80}vh`,
          width: `${sc.width ?? 700}px`,
        }}>
        <defs>
          <path id="smile-curve" d={`M 30,10 Q ${(sc.viewW ?? 900) / 2},${sc.curveDepth ?? 200} ${(sc.viewW ?? 900) - 30},10`} fill="none" />
        </defs>
        <text fontSize={sc.fontSize ?? 64}>
          <textPath href="#smile-curve" startOffset="50%" textAnchor="middle">
            {smileWords.map((w, i) => (
              <tspan key={i} dy={w.dy} opacity={w.op}>
                {w.word}{i < smileWords.length - 1 ? ' ' : ''}
              </tspan>
            ))}
          </textPath>
        </text>
      </svg>
    </div>
  );
};

export default HeroTitle;
