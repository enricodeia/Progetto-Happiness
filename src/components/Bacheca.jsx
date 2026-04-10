import { useState, useRef, useEffect, useCallback } from 'react';
import { gsap } from 'gsap';
import { containsBadWords } from '../badwords';
import BachecaRings from './BachecaRings';
import BachecaDots, { dotIndexToWorld, worldToScreen, COLS, ROWS, TOTAL } from './BachecaDots';
import { FAKE_MESSAGES, FAKE_COLORS } from '../fakeMessages';
import './Bacheca.css';

const MAX_CHARS = 200;
const MAX_NAME  = 30;

const COLOR_PRESETS = [
  '#F6E3D5', '#FFF3C4', '#FFD6D6', '#D4F0F0',
  '#D5ECD4', '#FFE0C2', '#E8D5F5',
];

const EMPTY_MSGS = []; // stable reference — avoids BachecaRings init/destroy loop

function getDeviceId() {
  const raw = [navigator.userAgent, navigator.language, screen.width, screen.height, screen.colorDepth, new Date().getTimezoneOffset()].join('|');
  let h = 0;
  for (let i = 0; i < raw.length; i++) { h = ((h << 5) - h) + raw.charCodeAt(i); h |= 0; }
  return 'dev_' + Math.abs(h).toString(36);
}

/* ═══ Component ═══ */
const Bacheca = ({ visible, onBack }) => {
  const [step, setStep]       = useState('loading');
  const [tickets, setTickets] = useState([]);  // { id, text, author, color, x, y }
  const [hasPosted, setHasPosted] = useState(false);

  // Rings exit
  const [ringsExiting, setRingsExiting] = useState(false);
  const [ringsGone, setRingsGone] = useState(false);

  // Tuning (final hardcoded values)
  const tuning = useRef({
    bgAlpha: 0.16, drawAlpha: 0.80, occAlpha: 1.00,
    basePt: 1.5, occSize: 3.00, targetSize: 2.00,
    highlight: 0.40, shadow: 0.00, gradient: 0.90,
    tipFontSize: 18, tipMaxWidth: 350, tipPadding: 17, tipBgAlpha: 0.94,
    fakeCount: 290,
  }).current;

  // Form
  const [name, setName]         = useState('');
  const [text, setText]         = useState('');
  const [filterError, setFilterError] = useState(null);
  const [selectedColor, setSelectedColor] = useState(COLOR_PRESETS[0]);
  const [flipped, setFlipped] = useState(false);

  // Dot-image system
  const [occupiedDots, setOccupiedDots] = useState(new Set());
  const [dotMessages, setDotMessages] = useState(new Map());
  const [dotColors, setDotColors] = useState(new Map());
  const [targetDot, setTargetDot] = useState(null);
  const [zoomPhase, setZoomPhase] = useState('idle');
  const darkDotsRef = useRef([]);

  // Camera + tooltip
  const [camState, setCamState] = useState(null);
  const [tooltip, setTooltip] = useState(null);
  const tooltipTimer = useRef(null);

  // Refs
  const deviceId     = useRef(getDeviceId());
  const containerRef = useRef(null);
  const canvasRef    = useRef(null);
  const introRef     = useRef(null);
  const cardRef      = useRef(null);
  const sceneFloatRef = useRef(null);
  const feedbackRef  = useRef(null);
  const posted       = useRef({ name: '', text: '' });

  /* ── Supabase (REST) ──
   * Read: via view `bacheca_public` (device_id hidden)
   * Write: via RPC `bacheca_post` (server-side validation + rate-limit)
   * Check: via RPC `bacheca_check_device`
   */
  const SUPA_URL = import.meta.env.VITE_SUPABASE_URL;
  const SUPA_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const supaGet = useCallback(async (path) => {
    if (!SUPA_URL || !SUPA_KEY) return null;
    try {
      const res = await fetch(`${SUPA_URL}/rest/v1/${path}`, {
        headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` },
      });
      if (!res.ok) return null;
      return await res.json();
    } catch { return null; }
  }, [SUPA_URL, SUPA_KEY]);
  const supaRpc = useCallback(async (fn, params) => {
    if (!SUPA_URL || !SUPA_KEY) return { error: 'no_config' };
    try {
      const res = await fetch(`${SUPA_URL}/rest/v1/rpc/${fn}`, {
        method: 'POST',
        headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const body = await res.text();
      const data = body ? JSON.parse(body) : null;
      if (!res.ok) return { error: data?.message || data?.hint || `http_${res.status}` };
      return { data };
    } catch (e) { return { error: e?.message || 'network' }; }
  }, [SUPA_URL, SUPA_KEY]);

  /* ═══ Load ═══ */
  useEffect(() => {
    if (!visible) { setStep('loading'); setZoomPhase('idle'); setTargetDot(null); setRingsExiting(false); setRingsGone(false); return; }
    (async () => {
      try {
        const rows = await supaGet('bacheca_public?select=dot_index,text,author,color&order=created_at.asc');
        const occ = new Set();
        const msgs = new Map();
        const cols = new Map();
        if (Array.isArray(rows)) rows.forEach(r => {
          occ.add(r.dot_index);
          msgs.set(r.dot_index, { text: r.text, author: r.author });
          if (r.color) cols.set(r.dot_index, r.color);
        });
        setOccupiedDots(occ);
        setDotMessages(msgs);
        setDotColors(cols);

        const { data: myDot } = await supaRpc('bacheca_check_device', { p_device_id: deviceId.current });
        const dbPosted = typeof myDot === 'number';
        setHasPosted(dbPosted);

        if (dbPosted) {
          setTargetDot(myDot);
          setZoomPhase('free');
          setStep('explore');
        } else {
          setStep('intro');
        }
      } catch { setStep('intro'); }
    })();
  }, [visible, supaGet, supaRpc]);

  /* ═══ Animations ═══ */
  useEffect(() => {
    if (step !== 'intro' || !introRef.current) return;
    const kids = Array.from(introRef.current.children || []);
    if (kids.length === 0) return;
    gsap.set(kids, { y: 40, opacity: 0 });
    gsap.to(kids, { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out', stagger: 0.15, delay: 0.15 });
  }, [step]);

  useEffect(() => {
    if (step !== 'compose' || !sceneFloatRef.current) return;
    const el = sceneFloatRef.current; // float on the scene wrapper, NOT the flipper
    // Entrance
    gsap.fromTo(el,
      { scale: 0.85, opacity: 0, y: 40 },
      { scale: 1, opacity: 1, y: 0, duration: 0.7, ease: 'back.out(1.4)' },
    );
    // Gentle float
    const float = gsap.timeline({ repeat: -1, yoyo: true });
    float.to(el, { y: -6, duration: 2.5, ease: 'sine.inOut' });
    float.to(el, { y: 4, duration: 2.8, ease: 'sine.inOut' });
    const onEnter = () => { float.pause(); gsap.to(el, { y: 0, duration: 0.5, ease: 'power2.out' }); };
    const onLeave = () => { float.resume(); };
    el.addEventListener('pointerenter', onEnter);
    el.addEventListener('pointerleave', onLeave);
    return () => { float.kill(); el.removeEventListener('pointerenter', onEnter); el.removeEventListener('pointerleave', onLeave); };
  }, [step]);

  useEffect(() => {
    if (step !== 'feedback' || !feedbackRef.current) return;
    const el = feedbackRef.current;
    gsap.fromTo(el, { scale: 0.85, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.6, ease: 'power3.out' });
    const timer = setTimeout(() => {
      gsap.to(el, {
        opacity: 0, scale: 1.02, duration: 0.6, ease: 'circ.inOut',
        onComplete: () => {
          setZoomPhase('zoomed-in');
          setStep('result');
          // After 2.5s, zoom out
          setTimeout(() => setZoomPhase('zooming-out'), 2500);
        },
      });
    }, 1800);
    return () => clearTimeout(timer);
  }, [step]);

  const handleZoomComplete = useCallback(() => {
    setZoomPhase('free');
    setStep('explore');
  }, []);

  /* ═══ Submit ═══ */
  const handleSubmit = async () => {
    const trimName = name.trim();
    const trimText = text.trim();
    if (!trimName || !trimText) return;
    if (containsBadWords(trimText) || containsBadWords(trimName)) {
      setFilterError('Il tuo messaggio contiene parole non appropriate. Per favore, riscrivilo.');
      return;
    }
    setFilterError(null);
    posted.current = { name: trimName, text: trimText };

    // Assign next free dark dot
    const freeDark = darkDotsRef.current.find(i => !occupiedDots.has(i));
    const dotIdx = freeDark !== undefined ? freeDark : 0;

    const { error } = await supaRpc('bacheca_post', {
      p_dot_index: dotIdx,
      p_text: trimText,
      p_author: trimName,
      p_color: selectedColor,
      p_device_id: deviceId.current,
    });
    if (error) {
      if (error.includes('rate_limited')) setFilterError('Troppi tentativi. Riprova tra qualche minuto.');
      else if (error.includes('already_posted')) setFilterError('Hai già lasciato il tuo messaggio sulla bacheca.');
      else if (error.includes('invalid_')) setFilterError('Messaggio non valido. Controlla nome e testo.');
      else setFilterError('Errore di connessione. Riprova.');
      return;
    }

    const newOcc = new Set(occupiedDots);
    newOcc.add(dotIdx);
    setOccupiedDots(newOcc);
    setDotMessages(prev => new Map(prev).set(dotIdx, { text: trimText, author: trimName }));
    setDotColors(prev => new Map(prev).set(dotIdx, selectedColor));
    setTargetDot(dotIdx);
    localStorage.setItem('ph-bacheca-posted', 'true');
    setHasPosted(true);
    setStep('feedback');
  };

  /* ═══ Callbacks for BachecaDots ═══ */
  const handleCamera = useCallback((s) => setCamState(s), []);
  const handleDarkDotsReady = useCallback((indices) => {
    darkDotsRef.current = indices;
    console.log(`[Bacheca] ${indices.length} dark drawing dots`);
    // Seed fake messages sequentially from bottom-left
    // (indices already sorted bottom-row first, left→right in BachecaDots)
    // Skip seeding when Supabase is configured — use real data instead
    const supaConfigured = !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
    const n = supaConfigured ? 0 : Math.min(tuning.fakeCount | 0, indices.length);
    if (n > 0) {
      const msgs = new Map();
      const cols = new Map();
      const occ = new Set();
      for (let k = 0; k < n; k++) {
        const dotIdx = indices[k];
        const m = FAKE_MESSAGES[k % FAKE_MESSAGES.length];
        const c = FAKE_COLORS[k % FAKE_COLORS.length];
        occ.add(dotIdx);
        msgs.set(dotIdx, { text: m.text, author: m.author });
        cols.set(dotIdx, c);
      }
      setOccupiedDots(occ);
      setDotMessages(msgs);
      setDotColors(cols);
    }
  }, [tuning.fakeCount]);
  const handleDotHover = useCallback((idx, x, y) => {
    setTooltip(idx !== null && dotMessages.has(idx) ? { dotIndex: idx, x, y } : null);
  }, [dotMessages]);
  const handleDotTap = useCallback((idx, x, y) => {
    if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
    if (idx !== null && dotMessages.has(idx)) {
      setTooltip({ dotIndex: idx, x, y });
      tooltipTimer.current = setTimeout(() => setTooltip(null), 3000);
    } else { setTooltip(null); }
  }, [dotMessages]);

  /* ═══ Render ═══ */
  if (!visible) return null;
  const overlayZ = { position: 'absolute', inset: 0, zIndex: 100 };
  return (
    <div ref={containerRef} className={`bacheca ${visible ? 'bacheca--visible' : ''}`} style={{ position: 'fixed' }}>

      {/* ═══ Dot Canvas (WebGL — forms the SVG image) ═══ */}
      <BachecaDots
        occupiedDots={occupiedDots}
        dotColors={dotColors}
        targetDot={targetDot}
        zoomPhase={zoomPhase}
        onZoomComplete={handleZoomComplete}
        panEnabled={step === 'explore' || step === 'result' || step === 'intro'}
        onCameraChange={handleCamera}
        onDarkDotsReady={handleDarkDotsReady}
        onDotHover={handleDotHover}
        onDotTap={handleDotTap}
        tuning={tuning}
      />

      {/* Tooltip */}
      {tooltip && dotMessages.has(tooltip.dotIndex) && (
        <div className="bacheca__tooltip" style={{
          position: 'fixed', zIndex: 120,
          left: tooltip.x + 16, top: tooltip.y - 8,
          maxWidth: tuning.tipMaxWidth,
          padding: `${tuning.tipPadding}px ${tuning.tipPadding + 4}px`,
          background: `rgba(255,255,255,${tuning.tipBgAlpha})`,
        }}>
          <p className="bacheca__tooltip-text" style={{ fontSize: tuning.tipFontSize, lineHeight: 1.45 }}>
            "{dotMessages.get(tooltip.dotIndex).text}"
          </p>
          <span className="bacheca__tooltip-author" style={{ fontSize: Math.max(9, tuning.tipFontSize - 4) }}>
            — {dotMessages.get(tooltip.dotIndex).author}
          </span>
        </div>
      )}

      {/* Counter (unica occorrenza) */}
      <div className="bacheca__counter" style={{ position: 'absolute', zIndex: 102 }}>
        {occupiedDots.size.toLocaleString('it-IT')} / 100.000 messaggi
      </div>

      {/* Back button — top right */}
      {(step === 'explore' || step === 'result' || step === 'intro') && (
        <button className="bacheca__back" style={{ zIndex: 110 }} onClick={onBack}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Torna al Globo
        </button>
      )}

      {/* STEP 1 — Intro */}
      {step === 'intro' && (
        <div className="bacheca__intro" ref={introRef} style={overlayZ}>
          <h1 className="bacheca__intro-title">Cos'è per te<br />la felicità?</h1>
          <svg className="bacheca__intro-smile" width="49" height="16" viewBox="0 0 49 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0.362416 0.876017C-0.222765 1.19302 0.0299269 1.88868 0.22942 2.19688C1.29344 3.98005 9.20657 16 24.7671 16C40.3275 16 48.0413 3.45179 48.7063 2.52719C49.2382 1.7875 48.9279 1.29438 48.7063 1.14028C48.4624 0.986178 47.8152 0.585516 47.1768 0.215674C46.5384 -0.154168 45.9355 0.501802 45.7139 0.876017C43.5859 4.17821 36.4175 10.7826 24.7671 10.7826C10.204 10.7826 3.62075 1.07415 3.08877 0.413715C2.66318 -0.114631 2.02481 -0.0265732 1.75881 0.0834988C1.53717 0.215585 0.947597 0.55901 0.362416 0.876017Z" fill="#2C2014"/>
          </svg>
          <p className="bacheca__intro-body">
            {tickets.length > 0
              ? `${tickets.length.toLocaleString('it-IT')} persone hanno già risposto.`
              : 'Il tuo messaggio diventerà parte della bacheca.'}
            <br />Crea il tuo messaggio e posizionalo sulla bacheca.
          </p>
          <button
            className="bacheca__intro-cta"
            onClick={() => { setRingsExiting(true); setFlipped(false); setStep('compose'); }}
            ref={(el) => {
              if (!el || el._pillInit) return;
              el._pillInit = true;
              const circle = el.querySelector('.bacheca__cta-circle');
              const label = el.querySelector('.bacheca__cta-label');
              const hoverLabel = el.querySelector('.bacheca__cta-hover');
              if (!circle) return;
              const h = el.getBoundingClientRect().height;
              const w = el.getBoundingClientRect().width;
              const R = ((w * w) / 4 + h * h) / (2 * h);
              const D = Math.ceil(2 * R) + 2;
              const delta = Math.ceil(R - Math.sqrt(Math.max(0, R * R - (w * w) / 4))) + 1;
              Object.assign(circle.style, { width: `${D}px`, height: `${D}px`, bottom: `${-delta}px` });
              gsap.set(circle, { xPercent: -50, scale: 0, transformOrigin: `50% ${D - delta}px` });
              if (hoverLabel) gsap.set(hoverLabel, { y: h + 10, opacity: 0 });

              el.addEventListener('pointerenter', () => {
                gsap.to(circle, { scale: 1.2, duration: 0.45, ease: 'power3.out', overwrite: 'auto' });
                if (label) gsap.to(label, { y: -(h + 8), duration: 0.45, ease: 'power3.out', overwrite: 'auto' });
                if (hoverLabel) gsap.to(hoverLabel, { y: 0, opacity: 1, duration: 0.45, ease: 'power3.out', overwrite: 'auto' });
              });
              el.addEventListener('pointerleave', () => {
                gsap.to(circle, { scale: 0, duration: 0.35, ease: 'power3.inOut', overwrite: 'auto' });
                if (label) gsap.to(label, { y: 0, duration: 0.35, ease: 'power3.inOut', overwrite: 'auto' });
                if (hoverLabel) gsap.to(hoverLabel, { y: h + 10, opacity: 0, duration: 0.35, ease: 'power3.inOut', overwrite: 'auto' });
              });
            }}
          >
            <span className="bacheca__cta-circle" />
            <span className="bacheca__cta-label">Scrivi il tuo messaggio</span>
            <span className="bacheca__cta-hover">Scrivi il tuo messaggio</span>
          </button>
        </div>
      )}

      {/* 3D Rings background — visible only until CTA clicked, then exit animation */}
      {!ringsGone && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 2,
          pointerEvents: 'none',
        }}>
          <BachecaRings
            visible={visible}
            messages={EMPTY_MSGS}
            expanded={ringsExiting}
            exiting={ringsExiting}
            onExitComplete={() => setRingsGone(true)}
          />
        </div>
      )}

      {/* STEP 2 — Compose (flip card: front=name, back=message) */}
      {step === 'compose' && (
        <div className="bacheca__overlay bacheca__overlay--compose" style={overlayZ}>
          <div className="bacheca__ticket-scene" ref={sceneFloatRef}>
            <div className={`bacheca__ticket-flipper ${flipped ? 'bacheca__ticket-flipper--flipped' : ''}`} ref={cardRef}>
              {/* ── FRONT: name + color picker ── */}
              <div className="bacheca__ticket bacheca__ticket--front" style={{ backgroundColor: selectedColor }}>
                <button className="bacheca__ticket-close" onClick={() => setStep('intro')}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12"/>
                  </svg>
                </button>
                <h2 className="bacheca__ticket-title">Come ti chiami?</h2>
                <p className="bacheca__ticket-desc">Il tuo nome apparirà sul bigliettino</p>
                <div className="bacheca__field">
                  <input className="bacheca__field-input" type="text" placeholder=" "
                    value={name} onChange={(e) => { setName(e.target.value); setFilterError(null); }}
                    maxLength={MAX_NAME} autoFocus={!flipped} id="bk-name" />
                  <label className="bacheca__field-label" htmlFor="bk-name">Il tuo nome</label>
                </div>
                <button
                  className="bacheca__ticket-submit"
                  onClick={() => { if (name.trim()) setFlipped(true); }}
                  disabled={!name.trim()}
                >
                  Continua
                </button>
              </div>

              {/* ── BACK: message ── */}
              <div className="bacheca__ticket bacheca__ticket--back" style={{ backgroundColor: selectedColor }}>
                <button className="bacheca__ticket-close" onClick={() => setFlipped(false)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 12H5M12 19l-7-7 7-7"/>
                  </svg>
                </button>
                <h2 className="bacheca__ticket-title">Il tuo messaggio</h2>
                <p className="bacheca__ticket-desc">Cosa significa per te la felicità?</p>
                <div className="bacheca__field bacheca__field--area">
                  <textarea className="bacheca__field-input bacheca__field-textarea" placeholder=" "
                    value={text} onChange={(e) => { setText(e.target.value.slice(0, MAX_CHARS)); setFilterError(null); }}
                    maxLength={MAX_CHARS} rows={3} id="bk-text"
                    autoFocus={flipped} />
                  <label className="bacheca__field-label" htmlFor="bk-text">Scrivi qui...</label>
                </div>
                {filterError && <p className="bacheca__ticket-error">{filterError}</p>}
                <div className="bacheca__ticket-footer">
                  <button className="bacheca__ticket-submit" onClick={handleSubmit} disabled={!text.trim()}>Invia</button>
                  <span className="bacheca__ticket-count">{text.length}/{MAX_CHARS}</span>
                </div>
              </div>
            </div>

            {/* Color picker — detached below */}
            <div className="bacheca__colors">
              {COLOR_PRESETS.map(c => (
                <button key={c}
                  className={`bacheca__colors-dot${c === selectedColor ? ' bacheca__colors-dot--active' : ''}`}
                  style={{ background: c, opacity: c === selectedColor ? 1 : 0.4 }}
                  onClick={() => setSelectedColor(c)} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Feedback */}
      {step === 'feedback' && (
        <div className="bacheca__overlay bacheca__overlay--light" style={overlayZ}>
          <div className="bacheca__feedback-inner" ref={feedbackRef}>
            <h2 className="bacheca__feedback-title">Grazie, {posted.current.name}</h2>
            <p className="bacheca__feedback-sub">Posiziona il tuo messaggio sulla bacheca</p>
          </div>
        </div>
      )}

      {/* Loading */}
      {step === 'loading' && (
        <div className="bacheca__overlay bacheca__overlay--light" style={overlayZ}>
          <p className="bacheca__loading-text">Caricamento...</p>
        </div>
      )}
    </div>
  );
};

export default Bacheca;
