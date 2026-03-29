import { useRef, useEffect, useMemo } from 'react';
import { gsap } from 'gsap';
import './StickerPeel.css';

const StickerPeel = ({
  imageSrc,
  rotate = 0,
  peelBackPct = 90,
  peelEasing = 'power3.out',
  width = 200,
  shadowIntensity = 0.6,
  lightingIntensity = 0.1,
  peelDirection = 0,
  className = '',
}) => {
  const containerRef = useRef(null);
  const pointLightRef = useRef(null);
  const pointLightFlippedRef = useRef(null);

  const defaultPadding = 10;

  // Expose imperative peel control
  const stickerMainRef = useRef(null);
  const flapRef = useRef(null);

  useEffect(() => {
    const updateLight = (e) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      gsap.set(pointLightRef.current, { attr: { x, y } });
      gsap.set(pointLightFlippedRef.current, { attr: { x, y: rect.height - y } });
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('mousemove', updateLight);
      return () => container.removeEventListener('mousemove', updateLight);
    }
  }, []);

  const cssVars = useMemo(() => ({
    '--sticker-rotate': `${rotate}deg`,
    '--sticker-p': `${defaultPadding}px`,
    '--sticker-peelback': `${peelBackPct}%`,
    '--sticker-peel-easing': peelEasing,
    '--sticker-width': `${width}px`,
    '--sticker-shadow-opacity': shadowIntensity,
    '--sticker-lighting-constant': lightingIntensity,
    '--peel-direction': `${peelDirection}deg`,
  }), [rotate, peelBackPct, peelEasing, width, shadowIntensity, lightingIntensity, peelDirection]);

  return (
    <div className={`sticker-peel ${className}`} style={cssVars}>
      <svg width="0" height="0">
        <defs>
          <filter id="sticker-peel__point-light">
            <feGaussianBlur stdDeviation="1" result="blur" />
            <feSpecularLighting result="spec" in="blur" specularExponent="100" specularConstant={lightingIntensity} lightingColor="white">
              <fePointLight ref={pointLightRef} x="100" y="100" z="300" />
            </feSpecularLighting>
            <feComposite in="spec" in2="SourceGraphic" result="lit" />
            <feComposite in="lit" in2="SourceAlpha" operator="in" />
          </filter>
          <filter id="sticker-peel__point-light-flipped">
            <feGaussianBlur stdDeviation="10" result="blur" />
            <feSpecularLighting result="spec" in="blur" specularExponent="100" specularConstant={lightingIntensity * 7} lightingColor="white">
              <fePointLight ref={pointLightFlippedRef} x="100" y="100" z="300" />
            </feSpecularLighting>
            <feComposite in="spec" in2="SourceGraphic" result="lit" />
            <feComposite in="lit" in2="SourceAlpha" operator="in" />
          </filter>
          <filter id="sticker-peel__shadow">
            <feDropShadow dx="2" dy="4" stdDeviation={3 * shadowIntensity} floodColor="black" floodOpacity={shadowIntensity} />
          </filter>
          <filter id="sticker-peel__fill">
            <feOffset dx="0" dy="0" in="SourceAlpha" result="shape" />
            <feFlood floodColor="#F6E3D5" result="flood" />
            <feComposite operator="in" in="flood" in2="shape" />
          </filter>
        </defs>
      </svg>

      <div className="sticker-peel__container" ref={containerRef}>
        <div className="sticker-peel__main" ref={stickerMainRef}>
          <div className="sticker-peel__lighting">
            <img src={imageSrc} alt="" className="sticker-peel__image" draggable="false" />
          </div>
        </div>
        <div className="sticker-peel__flap" ref={flapRef}>
          <div className="sticker-peel__flap-lighting">
            <img src={imageSrc} alt="" className="sticker-peel__flap-image" draggable="false" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default StickerPeel;
