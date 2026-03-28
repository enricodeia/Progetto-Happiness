import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

const SMILE_TEXT = 'What Makes You Happy?';

const HeroTitle = ({ config }) => {
  const line1Ref = useRef(null);
  const line2Ref = useRef(null);
  const charsRef = useRef([]);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (hasAnimated.current) return;
    hasAnimated.current = true;

    const words = [line1Ref.current, line2Ref.current].filter(Boolean);
    gsap.fromTo(words,
      { y: 50, opacity: 0 },
      { y: 0, opacity: 1, duration: 1.2, ease: 'power3.out', stagger: 0.15 }
    );

    const chars = charsRef.current.filter(Boolean);
    gsap.fromTo(chars,
      { opacity: 0, y: 100 },
      { opacity: 1, y: 0, ease: 'circ.out', stagger: 0.13, delay: 1.0 }
    );
  }, []);

  const c = config;

  return (
    <div className="hero-title" style={{
      '--hero-top-y': `${c.topY}vh`,
      '--hero-bottom-y': `${c.bottomY}vh`,
      '--hero-top-size': `${c.topSize}px`,
      '--hero-bottom-size': `${c.bottomSize}px`,
      '--hero-curve-width': `${c.curveWidth}px`,
      '--hero-top-color': c.topColor,
      '--hero-accent-color': c.accentColor,
      '--hero-bottom-color': c.bottomColor,
      '--hero-top-opacity': c.topOpacity,
      '--hero-bottom-opacity': c.bottomOpacity,
    }}>
      <h1 className="hero-title__heading">
        <span className="hero-title__line1" ref={line1Ref} style={{ opacity: 0 }}>Progetto</span>
        <span className="hero-title__line2" ref={line2Ref} style={{ opacity: 0 }}>Happiness</span>
      </h1>
      <svg className="hero-title__curve" viewBox={`0 0 600 ${Math.round(c.curveDepth * 1.2)}`} xmlns="http://www.w3.org/2000/svg">
        <defs>
          <path id="smile-curve" d={`M 30,10 Q 300,${c.curveDepth} 570,10`} fill="none" />
        </defs>
        <text>
          <textPath href="#smile-curve" startOffset="50%" textAnchor="middle">
            {SMILE_TEXT.split('').map((char, i) => (
              <tspan key={i} ref={(el) => { charsRef.current[i] = el; }} style={{ opacity: 0 }}>
                {char}
              </tspan>
            ))}
          </textPath>
        </text>
      </svg>
    </div>
  );
};

export default HeroTitle;
