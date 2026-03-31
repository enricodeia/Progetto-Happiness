import { useState, useRef, useEffect, useCallback } from 'react';
import { gsap } from 'gsap';
import { episodes } from '../data.js';

const EpisodeSearch = ({ onSelect }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const wrapRef = useRef(null);
  const inputRef = useRef(null);
  const resultsRef = useRef(null);

  // Search episodes by title, location, country, description
  const search = useCallback((q) => {
    setQuery(q);
    if (!q.trim()) { setResults([]); return; }
    const lower = q.toLowerCase();
    const matched = episodes.filter((ep) =>
      ep.title.toLowerCase().includes(lower) ||
      ep.location.toLowerCase().includes(lower) ||
      ep.country.toLowerCase().includes(lower) ||
      ep.description.toLowerCase().includes(lower)
    ).slice(0, 6);
    setResults(matched);
  }, []);

  // Open animation
  const handleOpen = () => {
    setOpen(true);
    requestAnimationFrame(() => {
      const el = wrapRef.current;
      if (!el) return;
      gsap.fromTo(el,
        { width: 40 },
        { width: 280, duration: 0.4, ease: 'power3.out', onComplete: () => inputRef.current?.focus() }
      );
    });
  };

  // Close animation
  const handleClose = () => {
    const el = wrapRef.current;
    if (!el) return;
    // Fade out results first
    if (resultsRef.current) gsap.to(resultsRef.current, { height: 0, opacity: 0, duration: 0.25, ease: 'power2.in' });
    gsap.to(el, {
      width: 40, duration: 0.55, ease: 'circ.inOut',
      onComplete: () => { setOpen(false); setQuery(''); setResults([]); }
    });
  };

  // Results: container height + items slide up from below
  useEffect(() => {
    const el = resultsRef.current;
    if (!el) return;
    if (results.length > 0) {
      gsap.to(el, { height: 'auto', opacity: 1, duration: 0.35, ease: 'circ.out' });
      // Stagger items from bottom
      requestAnimationFrame(() => {
        const items = el.querySelectorAll('.ep-search__result');
        gsap.fromTo(items, { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, ease: 'power3.out', stagger: 0.04 });
      });
    } else {
      gsap.to(el, { height: 0, opacity: 0, duration: 0.2, ease: 'power2.in' });
    }
  }, [results]);

  // Close on escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Click outside to close
  useEffect(() => {
    if (!open) return;
    const onClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) handleClose();
    };
    setTimeout(() => document.addEventListener('pointerdown', onClick), 100);
    return () => document.removeEventListener('pointerdown', onClick);
  }, [open]);

  const selectEp = (ep) => {
    handleClose();
    onSelect?.(ep);
  };

  return (
    <div className="ep-search" ref={wrapRef} style={{ width: open ? 280 : 40 }}>
      {!open ? (
        <button className="ep-search__btn" onClick={handleOpen}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
        </button>
      ) : (
        <div className="ep-search__field">
          <svg className="ep-search__icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            ref={inputRef}
            className="ep-search__input"
            type="text"
            placeholder=""
            value={query}
            onChange={(e) => search(e.target.value)}
          />
          <button className="ep-search__close" onClick={handleClose}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
      )}

      <div className="ep-search__results" ref={resultsRef} style={{ height: 0, opacity: 0, overflow: 'hidden' }}>
        {results.map((ep) => (
          <button key={ep.id} className="ep-search__result" onClick={() => selectEp(ep)}>
            {ep.thumb && <img className="ep-search__thumb" src={ep.thumb} alt="" />}
            <div className="ep-search__info">
              <span className="ep-search__ep">Ep. {String(ep.id).padStart(2, '0')} · {ep.country}</span>
              <span className="ep-search__title">{ep.title}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default EpisodeSearch;
