import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { gsap } from 'gsap';
import { episodeDescriptions } from '../descriptions.js';
import { globeState } from '../globe-scene.js';

// Country → flag emoji (subset)
const FLAGS = { USA:'🇺🇸', Italia:'🇮🇹', Svizzera:'🇨🇭', Giappone:'🇯🇵', India:'🇮🇳', Brasile:'🇧🇷', Messico:'🇲🇽', Thailandia:'🇹🇭', Kenya:'🇰🇪', Tanzania:'🇹🇿', Colombia:'🇨🇴', 'Costa Rica':'🇨🇷', Islanda:'🇮🇸', Norvegia:'🇳🇴', Nepal:'🇳🇵', Iran:'🇮🇷', Cuba:'🇨🇺', Marocco:'🇲🇦', Etiopia:'🇪🇹', Perù:'🇵🇪', Bolivia:'🇧🇴', Argentina:'🇦🇷', Spagna:'🇪🇸', Portogallo:'🇵🇹', Francia:'🇫🇷', Germania:'🇩🇪', 'Regno Unito':'🇬🇧', Olanda:'🇳🇱', Grecia:'🇬🇷', Turchia:'🇹🇷', Israele:'🇮🇱', Filippine:'🇵🇭', Indonesia:'🇮🇩', Cambogia:'🇰🇭', Vietnam:'🇻🇳', 'Corea del Sud':'🇰🇷', Cina:'🇨🇳', Australia:'🇦🇺', 'Nuova Zelanda':'🇳🇿', Canada:'🇨🇦', Egitto:'🇪🇬', 'Sud Africa':'🇿🇦', Nigeria:'🇳🇬', Ghana:'🇬🇭', Romania:'🇷🇴', Ucraina:'🇺🇦', Polonia:'🇵🇱', Ungheria:'🇭🇺' };

const PanelCard = ({ data, onClose, onNav }) => {
  const panelRef = useRef(null);
  const itemsRef = useRef([]);
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [shareToast, setShareToast] = useState(false);
  const prevDataRef = useRef(null);
  const descRef = useRef(null);
  const isOpenRef = useRef(false);
  const closingRef = useRef(false);
  const touchRef = useRef({ startX: 0, startY: 0, startTime: 0 });
  const navDirRef = useRef(1);
  const thumbRef = useRef(null);
  const kenBurnsRef = useRef(null);
  const lastTapRef = useRef(0);

  // ── Ken Burns on thumb ──
  useEffect(() => {
    if (!visible || !thumbRef.current) return;
    const img = thumbRef.current;
    kenBurnsRef.current?.kill();
    gsap.set(img, { scale: 1, x: 0, y: 0 });
    // Random slow drift direction
    const tx = (Math.random() - 0.5) * 20;
    const ty = (Math.random() - 0.5) * 10;
    kenBurnsRef.current = gsap.to(img, {
      scale: 1.08, x: tx, y: ty,
      duration: 12, ease: 'none', repeat: -1, yoyo: true,
    });
    return () => kenBurnsRef.current?.kill();
  }, [visible, data]);

  // ── Close ──
  const handleClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    const el = panelRef.current;
    const items = itemsRef.current.filter(Boolean);
    if (!el) { closingRef.current = false; onClose(); return; }
    globeState.returnToScrollLimit?.();
    const mobile = window.innerWidth <= 768;
    const done = () => { setVisible(false); prevDataRef.current = null; isOpenRef.current = false; closingRef.current = false; onClose(); };
    if (mobile) {
      el.style.overflow = 'hidden';
      gsap.to(items.reverse(), { y: 12, opacity: 0, duration: 0.18, stagger: 0.025 });
      gsap.to(el, { x: '100vw', duration: 0.55, ease: 'circ.out', delay: 0.08, onComplete: done });
    } else {
      gsap.to(items.reverse(), {
        y: 10, opacity: 0, duration: 0.2, ease: 'power4.in', stagger: 0.03,
        onComplete: () => gsap.to(el, { height: 0, opacity: 0, duration: 0.3, ease: 'power4.in', onComplete: done })
      });
    }
  }, [onClose]);

  const navigate = useCallback((dir) => { navDirRef.current = dir; onNav?.(dir); }, [onNav]);

  // ── Image loaded state ──
  useEffect(() => { setImgLoaded(false); }, [data]);

  // ── Share with toast ──
  const handleShare = useCallback(() => {
    const d = data?.data;
    if (!d) return;
    const url = d.youtubeSearch ? `https://www.youtube.com/results?search_query=${encodeURIComponent(d.youtubeSearch)}` : d.url || window.location.href;
    const title = d.title || d.concept || 'Progetto Happiness';
    if (navigator.share) {
      navigator.share({ title, url }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(url);
      setShareToast(true);
      setTimeout(() => setShareToast(false), 1500);
    }
  }, [data]);

  useEffect(() => {
    if (!visible) return;
    const onEmpty = () => handleClose();
    window.addEventListener('globe:empty-click', onEmpty);
    return () => window.removeEventListener('globe:empty-click', onEmpty);
  }, [visible, handleClose]);

  useEffect(() => {
    if (!visible) return;
    const onKey = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); navigate(1); }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); navigate(-1); }
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, navigate, handleClose]);

  // ── Open / swap ──
  useEffect(() => {
    if (!data) return;
    if (data === prevDataRef.current) return;
    const wasOpen = isOpenRef.current;
    prevDataRef.current = data;
    closingRef.current = false;
    setVisible(true);
    setExpanded(false);
    isOpenRef.current = true;

    requestAnimationFrame(() => {
      const el = panelRef.current;
      if (!el) return;
      const items = itemsRef.current.filter(Boolean);
      gsap.killTweensOf(el);
      gsap.killTweensOf(items);
      const mobile = window.innerWidth <= 768;
      const dir = navDirRef.current;

      if (wasOpen) {
        const outX = dir * -14;
        const inX = dir * 18;
        gsap.to(items, {
          x: outX, opacity: 0, duration: 0.18, ease: 'power2.in',
          onComplete: () => {
            if (descRef.current) descRef.current.style.maxHeight = '80px';
            el.scrollTop = 0;
            gsap.fromTo(items, { x: inX, y: 4, opacity: 0 }, { x: 0, y: 0, opacity: 1, duration: 0.35, ease: 'power3.out', stagger: 0.03 });
            gsap.to(el, { height: 'auto', duration: 0.35, ease: 'circ.out' });
          }
        });
      } else {
        if (mobile) {
          gsap.set(el, { height: 'auto', opacity: 1, x: '100vw', overflow: 'hidden' });
          gsap.to(el, { x: 0, duration: 0.9, ease: 'circ.out', onComplete: () => { el.style.overflowY = 'auto'; el.style.overflowX = 'hidden'; } });
        } else {
          gsap.fromTo(el, { height: 0, opacity: 0, y: 12 }, { height: 'auto', opacity: 1, y: 0, duration: 0.5, ease: 'power4.out', onComplete: () => { el.style.height = ''; el.style.overflow = ''; } });
        }
        gsap.fromTo(items, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, ease: 'power4.out', stagger: 0.05, delay: mobile ? 0.25 : 0.12 });
        if (descRef.current) descRef.current.style.maxHeight = '80px';
      }
    });
  }, [data]);

  const toggleExpand = () => {
    const el = descRef.current;
    if (!el) return;
    const next = !expanded;
    setExpanded(next);
    if (next) {
      const prev = el.style.maxHeight;
      el.style.maxHeight = 'none';
      const fullH = el.scrollHeight;
      el.style.maxHeight = prev;
      el.offsetHeight;
      gsap.to(el, { maxHeight: fullH, duration: 0.5, ease: 'circ.out' });
    } else {
      gsap.to(el, { maxHeight: 80, duration: 0.45, ease: 'circ.out' });
      if (panelRef.current) gsap.to(panelRef.current, { scrollTop: 0, duration: 0.4, ease: 'power2.out' });
    }
  };

  const onTouchStart = useCallback((e) => { touchRef.current = { startX: e.touches[0].clientX, startY: e.touches[0].clientY, startTime: Date.now() }; }, []);
  const onTouchEnd = useCallback((e) => {
    const dx = e.changedTouches[0].clientX - touchRef.current.startX;
    const dy = e.changedTouches[0].clientY - touchRef.current.startY;
    const dt = Date.now() - touchRef.current.startTime;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5 && dt < 400) navigate(dx < 0 ? 1 : -1);
  }, [navigate]);

  const navInfo = useMemo(() => {
    if (!data) return null;
    const type = data.type;
    const all = globeState.markers?.filter((m) => m.type === type).sort((a, b) => (a.data.id > b.data.id ? 1 : -1)) || [];
    const idx = all.findIndex((m) => m.data.id === data.data?.id);
    return { idx, total: all.length, isFirst: idx <= 0, isLast: idx >= all.length - 1 };
  }, [data]);

  if (!visible || !data) return null;

  const d = data.data;
  const isEp = data.type === 'episode';
  const hiddenStyle = { opacity: 0 };
  const fullDesc = (isEp && d.id && episodeDescriptions[d.id]) || null;
  const shortDesc = d.description || d.meaning || '';
  const hasMore = fullDesc && fullDesc.length > shortDesc.length;
  const progressPct = navInfo && navInfo.total > 1 ? (navInfo.idx / (navInfo.total - 1)) * 100 : 0;
  const flag = FLAGS[d.country] || '';

  return (
    <div className="panel" ref={panelRef} style={{ overflow: 'hidden', height: 0, opacity: 0 }} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <div className="panel__content">

      {/* Thumb with Ken Burns */}
      {(d.thumb || d.image) && (
        <div className="panel__thumb" ref={(el) => { itemsRef.current[0] = el; }} style={hiddenStyle}>
          <img
            className={`panel__thumb-img ${imgLoaded ? 'panel__thumb-img--loaded' : ''}`}
            ref={thumbRef}
            src={d.thumb || d.image}
            alt=""
            loading="lazy"
            onLoad={() => setImgLoaded(true)}
          />
          {isEp && <span className="panel__thumb-ep">{String(d.id).padStart(2, '0')}</span>}
        </div>
      )}

      {/* Header */}
      <div className="panel__header" ref={(el) => { itemsRef.current[1] = el; }} style={hiddenStyle}>
        <span className="panel__location-tag">
          {flag && <span className="panel__flag">{flag}</span>}
          {d.location || d.country}
        </span>
        {isEp && <span className="panel__ep-badge">Ep. {String(d.id).padStart(2, '0')}</span>}
        {data.type === 'geography' && <span className="panel__ep-badge">Articolo</span>}
      </div>

      {/* Title */}
      <h2 className="panel__title" ref={(el) => { itemsRef.current[2] = el; }} style={hiddenStyle}>{d.title || d.concept}</h2>

      {/* Divider */}
      <div className="panel__divider" ref={(el) => { itemsRef.current[3] = el; }} style={hiddenStyle} />

      {/* Description — double-tap to expand */}
      <div
        className={`panel__desc-wrap ${expanded ? 'panel__desc-wrap--expanded' : ''}`}
        ref={(el) => { itemsRef.current[4] = el; }}
        style={hiddenStyle}
        onClick={() => {
          if (!hasMore) return;
          const now = Date.now();
          if (now - lastTapRef.current < 300) { toggleExpand(); lastTapRef.current = 0; }
          else lastTapRef.current = now;
        }}
      >
        <div className="panel__desc-inner" ref={descRef} style={{ maxHeight: 80, overflow: 'hidden' }}>
          <p className="panel__desc">{fullDesc || shortDesc}</p>
        </div>
        {hasMore && (
          <button className="panel__expand-btn" onClick={toggleExpand}>
            {expanded ? 'mostra meno' : 'leggi tutto'}
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s var(--ease)' }}><path d="M6 9l6 6 6-6"/></svg>
          </button>
        )}
      </div>

      {/* Actions */}
      {(d.youtubeSearch || d.url) && (
        <div className="panel__actions" ref={(el) => { itemsRef.current[5] = el; }} style={hiddenStyle}>
          <div className="panel__actions-row">
            {d.youtubeSearch ? (
              <a className="panel__yt" href={`https://www.youtube.com/results?search_query=${encodeURIComponent(d.youtubeSearch)}`} target="_blank" rel="noopener">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                YouTube
              </a>
            ) : d.url ? (
              <a className="panel__yt" href={d.url} target="_blank" rel="noopener">Leggi</a>
            ) : null}
            <button className="panel__share" onClick={handleShare} aria-label="Condividi">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
              {shareToast && <span className="panel__share-toast">Copiato</span>}
            </button>
          </div>
          {d.views && (
            <div className="panel__meta-inline">
              <span>{d.views} views</span>
              <span className="panel__meta-dot">&middot;</span>
              <span>{d.date}</span>
            </div>
          )}
        </div>
      )}

      </div>{/* end panel__content */}

      {/* Nav */}
      <div className="panel__nav-bar" ref={(el) => { itemsRef.current[6] = el; }} style={hiddenStyle}>
        {navInfo && navInfo.total > 1 && (
          <div className="panel__nav-progress"><div className="panel__nav-progress-fill" style={{ width: `${progressPct}%` }} /></div>
        )}
        <div className="panel__nav-row">
          <button className={`panel__nav-btn ${navInfo?.isFirst ? 'panel__nav-btn--disabled' : ''}`} onClick={() => !navInfo?.isFirst && navigate(-1)} aria-label="Precedente">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          {navInfo && navInfo.total > 0 && (
            <span className="panel__nav-counter">
              <span className="panel__nav-current">{navInfo.idx + 1}</span>
              <span className="panel__nav-sep">/</span>
              <span>{navInfo.total}</span>
            </span>
          )}
          <button className={`panel__nav-btn ${navInfo?.isLast ? 'panel__nav-btn--disabled' : ''}`} onClick={() => !navInfo?.isLast && navigate(1)} aria-label="Successivo">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
      </div>

      {/* Close */}
      <button className="panel__close" onClick={handleClose} style={hiddenStyle} ref={(el) => { itemsRef.current[7] = el; }} aria-label="Chiudi">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
  );
};

export default PanelCard;
