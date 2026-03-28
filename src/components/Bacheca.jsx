import { useState, useRef, useEffect, useCallback } from 'react';
import { gsap } from 'gsap';

const MAX_CHARS = 200;

function getDeviceId() {
  const raw = [navigator.userAgent, navigator.language, screen.width, screen.height, screen.colorDepth, new Date().getTimezoneOffset()].join('|');
  let hash = 0;
  for (let i = 0; i < raw.length; i++) { hash = ((hash << 5) - hash) + raw.charCodeAt(i); hash |= 0; }
  return 'dev_' + Math.abs(hash).toString(36);
}

const Bacheca = ({ visible, onBack }) => {
  const [messages, setMessages] = useState([]);
  const [hasPosted, setHasPosted] = useState(false);
  const [text, setText] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
  const [panning, setPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [panStartOffset, setPanStartOffset] = useState({ x: 0, y: 0 });
  const notesRef = useRef([]);
  const deviceId = useRef(getDeviceId());

  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const supaFetch = useCallback(async (path, options = {}) => {
    if (!SUPABASE_URL || !SUPABASE_KEY) return null;
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', Prefer: options.prefer || '' },
      ...options,
    });
    if (!res.ok) return null;
    const t = await res.text();
    return t ? JSON.parse(t) : null;
  }, [SUPABASE_URL, SUPABASE_KEY]);

  useEffect(() => {
    if (!visible) return;
    (async () => {
      setLoading(true);
      const data = await supaFetch('bacheca?select=*&order=created_at.desc');
      if (data) setMessages(data);
      const check = await supaFetch(`bacheca?device_id=eq.${deviceId.current}&select=id`);
      if (check && check.length > 0) setHasPosted(true);
      else setHasPosted(localStorage.getItem('ph-bacheca-posted') === 'true');
      setLoading(false);
    })();
  }, [visible, supaFetch]);

  useEffect(() => {
    if (!visible || messages.length === 0) return;
    const timer = setTimeout(() => {
      const els = notesRef.current.filter(Boolean);
      gsap.fromTo(els,
        { scale: 0, rotation: () => (Math.random() - 0.5) * 15, opacity: 0 },
        { scale: 1, rotation: () => (Math.random() - 0.5) * 4, opacity: 1, duration: 0.35, ease: 'back.out(1.5)', stagger: 0.03 }
      );
    }, 300);
    return () => clearTimeout(timer);
  }, [visible, messages]);

  const handleSubmit = async () => {
    if (!text.trim() || !name.trim() || hasPosted || submitting) return;
    setSubmitting(true);
    const newMsg = {
      text: text.trim(), author: name.trim(), device_id: deviceId.current,
      x: 80 + Math.random() * 600, y: 120 + Math.random() * 400,
      color: Math.random() > 0.5 ? '#FFDD00' : '#FFFFFF',
    };
    const result = await supaFetch('bacheca', { method: 'POST', body: JSON.stringify(newMsg), prefer: 'return=representation' });
    if (result && result.length > 0) setMessages((prev) => [result[0], ...prev]);
    else setMessages((prev) => [{ id: Date.now(), ...newMsg, created_at: new Date().toISOString() }, ...prev]);
    localStorage.setItem('ph-bacheca-posted', 'true');
    setHasPosted(true); setSubmitting(false); setText(''); setName('');
  };

  const onCanvasDown = useCallback((e) => {
    setPanning(true);
    setPanStart({ x: e.clientX, y: e.clientY });
    setPanStartOffset({ ...canvasOffset });
  }, [canvasOffset]);

  const onPointerMove = useCallback((e) => {
    if (panning) setCanvasOffset({ x: panStartOffset.x + (e.clientX - panStart.x), y: panStartOffset.y + (e.clientY - panStart.y) });
  }, [panning, panStart, panStartOffset]);

  const onPointerUp = useCallback(() => setPanning(false), []);

  return (
    <div
      className={`bacheca ${visible ? 'bacheca--visible' : ''} ${panning ? 'bacheca--dragging' : ''}`}
      onPointerDown={onCanvasDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerLeave={onPointerUp}
    >
      <button className="bacheca__back" onClick={onBack} onPointerDown={(e) => e.stopPropagation()}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        Torna al Globo
      </button>
      <h1 className="bacheca__question">Per te cosa e' la felicita?</h1>
      <div className="bacheca__grid" style={{ backgroundPosition: `${canvasOffset.x}px ${canvasOffset.y}px` }} />

      {!hasPosted && !loading && (
        <div className="bacheca__compose" onPointerDown={(e) => e.stopPropagation()}>
          <input className="bacheca__compose-name" type="text" placeholder="Il tuo nome" value={name} onChange={(e) => setName(e.target.value)} maxLength={30} />
          <textarea className="bacheca__compose-text" placeholder="Cosa e' per te la felicita?" value={text} onChange={(e) => setText(e.target.value.slice(0, MAX_CHARS))} maxLength={MAX_CHARS} rows={3} />
          <div className="bacheca__compose-footer">
            <span className="bacheca__compose-count">{text.length}/{MAX_CHARS}</span>
            <button className="bacheca__compose-submit" onClick={handleSubmit} disabled={!text.trim() || !name.trim() || submitting}>
              {submitting ? 'Invio...' : 'Lascia il tuo messaggio'}
            </button>
          </div>
        </div>
      )}

      {messages.map((msg, i) => (
        <div key={msg.id} className="bacheca__note" ref={(el) => { notesRef.current[i] = el; }}
          style={{ left: (msg.x || 100 + i * 60) + canvasOffset.x, top: (msg.y || 150 + i * 40) + canvasOffset.y, '--note-color': msg.color || '#FFDD00' }}>
          <p className="bacheca__note-text">{msg.text}</p>
          <span className="bacheca__note-author">{msg.author}</span>
        </div>
      ))}

      {loading && <p className="bacheca__loading">Caricamento...</p>}
    </div>
  );
};

export default Bacheca;
