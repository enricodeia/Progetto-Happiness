import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

const HoverCard = ({ data, type, x, y }) => {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;
    gsap.fromTo(ref.current,
      { opacity: 0, scale: 0.9, y: 8 },
      { opacity: 1, scale: 1, y: 0, duration: 0.3, ease: 'power3.out' }
    );
    return () => {
      // Cleanup: animate out won't work on unmount, handled by parent
    };
  }, [data]);

  if (!data) return null;

  const left = Math.min(x + 20, window.innerWidth - 300);
  const top = Math.max(20, y - 120);

  return (
    <div className="hover-card" ref={ref} style={{ left, top, opacity: 0 }}>
      {type === 'episode' && data.thumb && (
        <div className="hover-card__thumb">
          <img className="hover-card__thumb-img" src={data.thumb} alt="" />
          <div className="hover-card__thumb-overlay">
            <svg className="hover-card__play" width="32" height="32" viewBox="0 0 24 24" fill="white" opacity="0.8"><path d="M8 5v14l11-7z"/></svg>
          </div>
        </div>
      )}
      <div className="hover-card__body">
        <span className="hover-card__tag">{type === 'episode' ? `Ep. ${String(data.id).padStart(2, '0')}` : data.country}</span>
        <h3 className="hover-card__title">{data.title || data.concept}</h3>
        {data.views && (
          <div className="hover-card__footer">
            <span>{data.views} views</span>
            <span>{data.date}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default HoverCard;
