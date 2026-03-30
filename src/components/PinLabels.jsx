import { useEffect, useState, useRef } from 'react';
import { gsap } from 'gsap';

const PinLabels = ({ activeEpId, onSelect }) => {
  const [pins, setPins] = useState([]);
  const labelsRef = useRef({});
  const shownRef = useRef(new Set());

  useEffect(() => {
    const onUpdate = (e) => setPins(e.detail.pins);
    window.addEventListener('globe:pin-positions', onUpdate);
    return () => window.removeEventListener('globe:pin-positions', onUpdate);
  }, []);

  // Animate in new labels
  useEffect(() => {
    pins.forEach((p) => {
      const el = labelsRef.current[p.id];
      if (el && !shownRef.current.has(p.id)) {
        shownRef.current.add(p.id);
        gsap.fromTo(el,
          { opacity: 0, x: -8 },
          { opacity: 1, x: 0, duration: 0.4, ease: 'power3.out', delay: Math.random() * 0.15 }
        );
      }
    });
    // Clean up gone pins
    const currentIds = new Set(pins.map((p) => p.id));
    shownRef.current.forEach((id) => {
      if (!currentIds.has(id)) shownRef.current.delete(id);
    });
  }, [pins]);

  if (pins.length === 0) return null;

  return (
    <div className="pin-labels">
      {pins.filter((p) => p.id !== activeEpId).map((p) => (
        <button
          key={p.id}
          ref={(el) => { labelsRef.current[p.id] = el; }}
          className="pin-label"
          style={{ left: p.sx + 14, top: p.sy - 18 }}
          onClick={(e) => { e.stopPropagation(); onSelect(p.id); }}
        >
          {p.thumb && (
            <div className="pin-label__thumb">
              <img src={p.thumb} alt="" />
            </div>
          )}
          <div className="pin-label__text">
            <span className="pin-label__ep">Ep. {String(p.id).padStart(2, '0')}</span>
            <span className="pin-label__title">{p.title}</span>
          </div>
        </button>
      ))}
    </div>
  );
};

export default PinLabels;
