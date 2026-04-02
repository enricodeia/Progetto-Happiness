import { useRef, useEffect } from 'react';
import { gsap } from 'gsap';

const PinBubble = ({ data, type, x, y }) => {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;
    gsap.fromTo(ref.current,
      { opacity: 0, scale: 0.85 },
      { opacity: 1, scale: 1, duration: 0.25, ease: 'power3.out' }
    );
  }, [data]);

  if (!data) return null;

  const thumb = data.thumb || data.image;
  const title = data.title || data.concept;
  const loc = data.location || data.country;
  const epNum = type === 'episode' ? `Ep. ${String(data.id).padStart(2, '0')}` : type === 'geography' ? 'Articolo' : '';

  // Position: follow cursor with offset
  const left = x + 18;
  const top = y - 24;

  return (
    <div className="pin-bubble" ref={ref} style={{ left, top }}>
      {thumb && <img className="pin-bubble__img" src={thumb} alt="" />}
      <div className="pin-bubble__text">
        {epNum && <span className="pin-bubble__tag">{epNum} · {loc}</span>}
        <span className="pin-bubble__title">{title}</span>
      </div>
    </div>
  );
};

export default PinBubble;
