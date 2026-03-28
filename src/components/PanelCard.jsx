import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';

const PanelCard = ({ data, onClose }) => {
  const panelRef = useRef(null);
  const itemsRef = useRef([]);
  const [visible, setVisible] = useState(false);
  const prevDataRef = useRef(null);

  // Open animation
  useEffect(() => {
    if (data && data !== prevDataRef.current) {
      prevDataRef.current = data;
      setVisible(true);

      requestAnimationFrame(() => {
        const el = panelRef.current;
        if (!el) return;
        const items = itemsRef.current.filter(Boolean);

        // Kill any existing tweens
        gsap.killTweensOf(el);
        gsap.killTweensOf(items);

        // Panel: grow from bottom
        gsap.fromTo(el,
          { height: 0, opacity: 0 },
          { height: 'auto', opacity: 1, duration: 0.5, ease: 'power4.out' }
        );

        // Stagger children
        gsap.fromTo(items,
          { y: 16, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.4, ease: 'power4.out', stagger: 0.06, delay: 0.15 }
        );
      });
    }
  }, [data]);

  const handleClose = () => {
    const el = panelRef.current;
    const items = itemsRef.current.filter(Boolean);
    if (!el) { onClose(); return; }

    // Reverse: stagger out then shrink
    gsap.to(items.reverse(), {
      y: 12, opacity: 0, duration: 0.25, ease: 'power4.in', stagger: 0.04,
      onComplete: () => {
        gsap.to(el, {
          height: 0, opacity: 0, duration: 0.35, ease: 'power4.in',
          onComplete: () => { setVisible(false); prevDataRef.current = null; onClose(); }
        });
      }
    });
  };

  if (!visible || !data) return null;

  const d = data.data;
  const isEp = data.type === 'episode';
  const hiddenStyle = { opacity: 0 };

  return (
    <div className="panel" ref={panelRef} style={{ overflow: 'hidden', height: 0, opacity: 0 }}>
      {d.thumb && (
        <div className="panel__thumb" ref={(el) => { itemsRef.current[0] = el; }} style={hiddenStyle}>
          <img className="panel__thumb-img" src={d.thumb} alt="" />
        </div>
      )}
      <div className="panel__header" ref={(el) => { itemsRef.current[1] = el; }} style={hiddenStyle}>
        <span className="panel__location-tag">{d.location || d.country}</span>
        {isEp && <span className="panel__ep-badge">Ep. {String(d.id).padStart(2, '0')}</span>}
      </div>
      <h2 className="panel__title" ref={(el) => { itemsRef.current[2] = el; }} style={hiddenStyle}>{d.title || d.concept}</h2>
      <div className="panel__divider" ref={(el) => { itemsRef.current[3] = el; }} style={hiddenStyle} />
      <p className="panel__desc" ref={(el) => { itemsRef.current[4] = el; }} style={hiddenStyle}>{d.description || d.meaning}</p>
      {d.youtubeSearch && (
        <div className="panel__actions" ref={(el) => { itemsRef.current[5] = el; }} style={hiddenStyle}>
          <a className="panel__yt" href={`https://www.youtube.com/results?search_query=${encodeURIComponent(d.youtubeSearch)}`} target="_blank" rel="noopener">
            Guarda su YouTube
          </a>
          {d.views && (
            <div className="panel__meta-inline">
              <span>{d.views} views</span>
              <span className="panel__meta-dot">·</span>
              <span>{d.date}</span>
            </div>
          )}
        </div>
      )}
      <button className="panel__close" onClick={handleClose} style={hiddenStyle} ref={(el) => { itemsRef.current[6] = el; }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
      </button>
    </div>
  );
};

export default PanelCard;
