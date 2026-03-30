import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { episodeDescriptions } from '../descriptions.js';

const PanelCard = ({ data, onClose }) => {
  const panelRef = useRef(null);
  const itemsRef = useRef([]);
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const prevDataRef = useRef(null);
  const descRef = useRef(null);

  // Open animation
  useEffect(() => {
    if (data && data !== prevDataRef.current) {
      prevDataRef.current = data;
      setVisible(true);
      setExpanded(false);

      requestAnimationFrame(() => {
        const el = panelRef.current;
        if (!el) return;
        const items = itemsRef.current.filter(Boolean);

        gsap.killTweensOf(el);
        gsap.killTweensOf(items);

        const mobile = window.innerWidth <= 768;

        if (mobile) {
          // Mobile: slide in from right, scrollable
          gsap.set(el, { height: 'auto', opacity: 1, x: '100vw', overflow: 'hidden' });
          gsap.to(el, {
            x: 0, duration: 1, ease: 'circ.out',
            onComplete: () => { el.style.overflowY = 'auto'; el.style.overflowX = 'hidden'; }
          });
        } else {
          // Desktop: height reveal
          gsap.fromTo(el,
            { height: 0, opacity: 0 },
            {
              height: 'auto', opacity: 1, duration: 0.5, ease: 'power4.out',
              onComplete: () => { el.style.height = ''; el.style.overflow = ''; }
            }
          );
        }

        gsap.fromTo(items,
          { y: 16, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.4, ease: 'power4.out', stagger: 0.06, delay: mobile ? 0.3 : 0.15 }
        );

        // Reset desc height
        if (descRef.current) descRef.current.style.maxHeight = '60px';
      });
    }
  }, [data]);

  // Expand / collapse description
  const toggleExpand = () => {
    const el = descRef.current;
    if (!el) return;
    const next = !expanded;
    setExpanded(next);

    if (next) {
      // Measure full height
      const prev = el.style.maxHeight;
      el.style.maxHeight = 'none';
      const fullH = el.scrollHeight;
      el.style.maxHeight = prev;
      // Force reflow so GSAP sees the starting value
      el.offsetHeight; // eslint-disable-line no-unused-expressions
      gsap.to(el, { maxHeight: fullH, duration: 0.55, ease: 'circ.out' });
    } else {
      gsap.to(el, { maxHeight: 60, duration: 0.55, ease: 'circ.out' });
    }
  };

  const handleClose = () => {
    const el = panelRef.current;
    const items = itemsRef.current.filter(Boolean);
    if (!el) { onClose(); return; }

    const mobile = window.innerWidth <= 768;
    const done = () => { setVisible(false); prevDataRef.current = null; onClose(); };

    if (mobile) {
      // Mobile: slide out to right
      el.style.overflow = 'hidden';
      gsap.to(items.reverse(), { y: 12, opacity: 0, duration: 0.2, stagger: 0.03 });
      gsap.to(el, { x: '100vw', duration: 0.6, ease: 'circ.out', delay: 0.1, onComplete: done });
    } else {
      // Desktop: collapse
      gsap.to(items.reverse(), {
        y: 12, opacity: 0, duration: 0.25, ease: 'power4.in', stagger: 0.04,
        onComplete: () => {
          gsap.to(el, { height: 0, opacity: 0, duration: 0.35, ease: 'power4.in', onComplete: done });
        }
      });
    }
  };

  // Click outside to close
  useEffect(() => {
    if (!visible || !data) return;
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        handleClose();
      }
    };
    // Delay listener so the opening click doesn't immediately close
    const timer = setTimeout(() => {
      document.addEventListener('pointerdown', handleClickOutside);
    }, 100);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('pointerdown', handleClickOutside);
    };
  }, [visible, data]);

  if (!visible || !data) return null;

  const d = data.data;
  const isEp = data.type === 'episode';
  const hiddenStyle = { opacity: 0 };

  const fullDesc = (isEp && d.id && episodeDescriptions[d.id]) || null;
  const shortDesc = d.description || d.meaning || '';
  const hasMore = fullDesc && fullDesc.length > shortDesc.length;

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
      <div
        className={`panel__desc-wrap ${expanded ? 'panel__desc-wrap--expanded' : ''}`}
        ref={(el) => { itemsRef.current[4] = el; }}
        style={hiddenStyle}
      >
        <div className="panel__desc-inner" ref={descRef} style={{ maxHeight: 60, overflow: 'hidden' }}>
          <p className="panel__desc">{fullDesc || shortDesc}</p>
        </div>
        {hasMore && (
          <button className="panel__expand-btn" onClick={toggleExpand}>
            {expanded ? 'mostra meno' : 'leggi tutto'}
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }}>
              <path d="M6 9l6 6 6-6"/>
            </svg>
          </button>
        )}
      </div>
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
