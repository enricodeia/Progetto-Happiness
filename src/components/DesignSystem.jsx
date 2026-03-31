import { useState, useEffect, useRef, useCallback } from 'react';
import { gsap } from 'gsap';
import StickerPeel from './StickerPeel.jsx';
import Noise from './Noise.jsx';

/* ═══════════════════════════════════════════
   PROGETTO HAPPINESS — DESIGN SYSTEM
   Access via /#design-system
   ═══════════════════════════════════════════ */

function useReveal(t = 0.1) {
  const ref = useRef(null);
  const [v, setV] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const o = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setV(true); o.disconnect(); } }, { threshold: t });
    o.observe(el); return () => o.disconnect();
  }, [t]);
  return [ref, v];
}

function Reveal({ children, delay = 0, className = '' }) {
  const [ref, vis] = useReveal(0.05);
  const inner = useRef(null);
  useEffect(() => {
    if (!vis || !inner.current) return;
    gsap.fromTo(inner.current, { opacity: 0, y: 36 }, { opacity: 1, y: 0, duration: 1, ease: 'power3.out', delay });
  }, [vis, delay]);
  return <div ref={ref} className={className}><div ref={inner} style={{ opacity: 0 }}>{children}</div></div>;
}

function Stagger({ children, className = '' }) {
  const [ref, vis] = useReveal(0.05);
  const inner = useRef(null);
  useEffect(() => {
    if (!vis || !inner.current) return;
    gsap.fromTo(inner.current.querySelectorAll('[data-s]'),
      { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out', stagger: 0.04 });
  }, [vis]);
  return <div ref={ref} className={className}><div ref={inner}>{children}</div></div>;
}

function useCopy() {
  const [c, setC] = useState(null);
  const copy = useCallback(t => { navigator.clipboard?.writeText(t); setC(t); setTimeout(() => setC(null), 1200); }, []);
  return [c, copy];
}

/* Logo */
function Logo({ size = 80, color = 'currentColor' }) {
  return (
    <svg width={size} height={size * 1.127} viewBox="0 0 510 575" fill={color}>
      <path d="M14.5 19.5C14.9 13.5 23.8 12.8 28.5 12C58.5 7 212 .5 220.5 0c6.8-.4 8.5 3.5 8.5 5.5v18c0 6.4-4 8.7-6 9H186c-31.6 2.4-40.8 29.3-41.5 42.5-1 20.7-2.5 63.3-2.5 68.5 0 6.5 3.5 8.5 11 7 15-3.5 56-8.5 103.5-10s92 9 103 11c8.8 1.6 10.3-4 10-7-1-20.7-2-64.1-2-72.5-3.2-29.2-31.7-38.5-47.5-39.5H293c-6.8 0-8.8-3.3-9-5V7c0-7 6-6 10-6 94 2 183.5 12.5 194 12.5 8.4 0 10.8 5 11 7.5 0 3.2.6 11 1.8 17s-6.4 6-9.7 5.5c-4.3-.7-16.1-2-28.5-2-31.6 2.4-36.8 24.7-35.5 35.5 0 6.7.7 24.4 1.8 42 1.5 22 3 159.5 3 184s27 36 33 37 24.5.5 34 0c7.6-.4 9.5 3.2 9.5 5 0 8.7-.4 27.8-.8 35-1 9-11.2 8.5-22.5 2s-34-16-75.5-16c-71.5 0-93.5 17.5-110 24-14.2 5.2-18.5-.8-19-4.5v-36c0-6.4 5-7.7 7.5-7.5H328c26.4 0 39-25.7 42-38.5 0-33.2.7-100.9.7-106.5s-4.3-8.3-6.5-9l-9.5-2c-12.2-3-49-9-98.5-9-62 0-93.5 7-105.5 9-9.6 1.6-11 7-10.5 9.5L139 294.5c0 32 29 45.8 41.5 45.8H217c8 0 9.3 3.5 9 5.2v35.6c0 15.4-21.7 5.9-32.5 0C182.3 375 149.4 363 103 363c-58 0-66 10.5-84 18.1C4.6 387.2.3 380.3 0 376v-33c0-5.6 4-6.3 6-6h34c28-2.8 38-29.5 38-42.5 0-25.8.7-84.2.7-111 0-33.5 6-100.5 6-108.5-.4-29.2-24-36.4-39.5-35C38.3 40.7 23.8 41.7 19 42.5c-4.8.8-5.7-3-5.5-5 0-3.7.4-12 .8-18z"/>
      <path d="M73 460c-4.4 2.4-2.5 7.7-1 10 8 13.5 67.5 104.5 184.5 104.5S431.5 479.5 436.5 472.5c4-5.6 1.7-9.3 0-10.5-1.8-1.2-6.7-4.2-11.5-7s-9.5 2.2-11.2 5c-16 25-70 75-157.3 75-109.5 0-159-73.5-163-78.5-3.2-4-8-3.3-10-2.5-1.7 1-6 3.6-10.5 6z"/>
    </svg>
  );
}

/* Clock */
function Clock() {
  const [time, setTime] = useState('');
  const [zone, setZone] = useState('');
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setZone(tz.split('/').pop().replace(/_/g, ' '));
    const tick = () => setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }));
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id);
  }, []);
  return <div className="ds-clock"><span className="ds-clock-z">{zone}</span><span className="ds-clock-t">{time}</span></div>;
}

/* Ease row */
function EaseRow({ ease, desc }) {
  const d = useRef(null);
  const play = () => { if (d.current) gsap.fromTo(d.current, { x: 0 }, { x: 'calc(100% - 14px)', duration: 0.9, ease }); };
  return (
    <div className="ds-ease" onClick={play} data-s>
      <div className="ds-ease-track"><div className="ds-ease-dot" ref={d} /></div>
      <code>{ease}</code>
      <span className="ds-ease-desc">{desc}</span>
    </div>
  );
}

/* Counter */
function Counter({ to, suffix = '' }) {
  const [v, setV] = useState(0);
  const [ref, vis] = useReveal(0.3);
  useEffect(() => {
    if (!vis) return;
    const n = parseFloat(to), start = performance.now();
    const step = now => { const t = Math.min((now - start) / 1500, 1); setV(Math.round(n * (1 - Math.pow(1 - t, 3)) * 10) / 10); if (t < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }, [vis, to]);
  return <span ref={ref}>{v}{suffix}</span>;
}

/* ═══ DATA ═══ */
const COLORS = [
  { n: 'Giallo Primario', h: '#FFDD00', v: '--color-primary', dk: true },
  { n: 'Crema', h: '#F6E3D5', v: '--color-cream', dk: true },
  { n: 'Brand Scuro', h: '#2C2118', v: '--color-brand-dark' },
  { n: 'Sfondo', h: '#030303', v: '--color-bg' },
  { n: 'Superficie', h: '#0c0c0c', v: '--color-surface' },
  { n: 'Testo', h: '#FDF4ED', v: '--color-text' },
];
const ALPHAS = [
  { n: 'Primary 10%', h: 'rgba(255,221,0,.10)', v: '--color-primary-10' },
  { n: 'Primary 20%', h: 'rgba(255,221,0,.20)', v: '--color-primary-20' },
  { n: 'Primary Glow', h: 'rgba(255,221,0,.25)', v: '--color-primary-glow' },
  { n: 'Card', h: 'rgba(12,12,12,.88)', v: '--color-card' },
  { n: 'Border', h: 'rgba(255,255,255,.12)', v: '--color-border' },
  { n: 'Border Hover', h: 'rgba(255,221,0,.15)', v: '--color-border-hover' },
  { n: 'Testo 50%', h: 'rgba(253,244,237,.50)', v: '--color-text-secondary' },
  { n: 'Testo 25%', h: 'rgba(253,244,237,.25)', v: '--color-text-tertiary' },
];
const EASINGS = [
  { ease: 'power3.out', desc: 'UI primario' },
  { ease: 'power3.inOut', desc: 'Bidirezionale' },
  { ease: 'circ.out', desc: 'Pannelli' },
  { ease: 'circ.in', desc: 'Uscite' },
  { ease: 'back.out(1.5)', desc: 'Menu' },
  { ease: 'power4.out', desc: 'Reveal' },
  { ease: 'power4.in', desc: 'Chiusure' },
  { ease: 'power2.inOut', desc: 'Fade' },
];
const COMPS = [
  { n: 'Globe', t: 'WebGL', d: 'Sfera 3D con texture 8K, nuvole, confini, marker, stelle zodiacali, drag & zoom.', tags: ['three.js','webgl'] },
  { n: 'Preloader', t: 'Overlay', d: 'Schermata di caricamento con StickerPeel, contatore %, prompt audio Howler.', tags: ['gsap','howler'] },
  { n: 'HeroTitle', t: 'Typography', d: 'Titolo per-carattere con stagger GSAP. Testo curvo SVG "What Makes You Happy?".', tags: ['gsap','scroll'] },
  { n: 'AboutOverlay', t: 'WebGL', d: 'Galleria volante 3D con scroll-depth. 10 immagini, contatori statistiche animate.', tags: ['three.js','gsap'] },
  { n: 'PillNav', t: 'Nav', d: 'Navigazione pill desktop. Cerchi hover GSAP, spin logo, stagger intro.', tags: ['gsap','desktop'] },
  { n: 'BubbleMenu', t: 'Nav', d: 'Menu mobile fullscreen. Toggle hamburger, pill card, back.out(1.5) stagger.', tags: ['gsap','mobile'] },
  { n: 'PanelCard', t: 'Card', d: 'Dettaglio episodio. Thumbnail, descrizione espandibile, link YouTube.', tags: ['gsap'] },
  { n: 'HoverCard', t: 'Tooltip', d: 'Preview marker globo. Thumbnail con icona play, tag, titolo, stats.', tags: ['gsap'] },
  { n: 'ScrollBar', t: 'Indicator', d: '70 dash con onda di prossimita. Larghezza e opacita dinamiche.', tags: ['gsap','raf'] },
  { n: 'Bacheca', t: 'Canvas', d: 'Board della felicita. Canvas draggabile infinito, persistenza Supabase.', tags: ['supabase','webgl'] },
  { n: 'LogoOverlay', t: 'SVG', d: 'Watermark SVG con luminosity blend. Fade scroll 30-59%.', tags: ['svg'] },
  { n: 'StickerPeel', t: 'Effect', d: 'Effetto peel 3D con filtri SVG specular lighting e shadow.', tags: ['svg','css'] },
  { n: 'Noise', t: 'Texture', d: 'Overlay fractalNoise SVG. Blend overlay, pointer-events none.', tags: ['svg'] },
  { n: 'LocalClock', t: 'Utility', d: 'Ora locale con timezone. Font serif per ora, sans per zona.', tags: ['interval'] },
];

/* ═══════════════════════════════════════════
   MAIN
   ═══════════════════════════════════════════ */
export default function DesignSystem() {
  const [copied, copy] = useCopy();

  useEffect(() => {
    const html = document.documentElement, body = document.body, root = document.getElementById('root');
    const p = { ho: html.style.overflow, hh: html.style.height, bo: body.style.overflow, bh: body.style.height, rh: root?.style.height, ro: root?.style.overflow };
    [html, body, root].forEach(e => { if (e) { e.style.overflow = 'auto'; e.style.height = 'auto'; } });
    return () => { html.style.overflow = p.ho; html.style.height = p.hh; body.style.overflow = p.bo; body.style.height = p.bh; if (root) { root.style.overflow = p.ro; root.style.height = p.rh; } };
  }, []);

  useEffect(() => {
    const tl = gsap.timeline({ delay: 0.2 });
    tl.fromTo('[data-h]', { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 1, ease: 'power3.out', stagger: 0.1 });
  }, []);

  const goBack = () => { window.location.hash = ''; window.location.reload(); };

  return (
    <div className="ds">
      <style>{STYLES}</style>
      <div className="ds-noise-wrap"><Noise patternAlpha={10} /></div>

      {/* ═══ HERO ═══ */}
      <header className="ds-hero">
        <div className="ds-hero-glow" />
        <button className="ds-back" onClick={goBack} data-h>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M10 3L5 8l5 5"/></svg>
          Torna al sito
        </button>
        <div data-h><Logo size={52} color="var(--color-primary)" /></div>
        <h1 className="ds-hero-t" data-h>Design System</h1>
        <p className="ds-hero-sub" data-h>Progetto Happiness</p>
        <div className="ds-hero-tags" data-h>
          {['v0.0.0','React 19','Three.js','GSAP','Vite'].map(t => <span key={t}>{t}</span>)}
        </div>
        <div className="ds-hero-line" data-h />
      </header>

      {/* ═══ 01 PALETTE ═══ */}
      <section className="ds-s">
        <Reveal><SH n="01" t="Palette" /></Reveal>
        <Reveal><p className="ds-label">Core</p></Reveal>
        <Stagger>
          <div className="ds-color-grid">
            {COLORS.map(c => (
              <div key={c.v} className={`ds-color ${c.dk ? 'ds-color--dk' : ''}`} data-s onClick={() => copy(c.h)} style={{ '--bg': c.h }}>
                <div className="ds-color-swatch">{copied === c.h && <span className="ds-toast">Copiato</span>}</div>
                <strong>{c.n}</strong>
                <code>{c.h}</code>
                <code className="ds-color-var">{c.v}</code>
              </div>
            ))}
          </div>
        </Stagger>

        <Reveal delay={0.1}><p className="ds-label" style={{ marginTop: 48 }}>Alpha & Overlay</p></Reveal>
        <Stagger>
          <div className="ds-alpha-grid">
            {ALPHAS.map(a => (
              <div key={a.v} className="ds-alpha" data-s onClick={() => copy(a.h)}>
                <div className="ds-alpha-sw"><div className="ds-alpha-ck" /><div className="ds-alpha-fill" style={{ background: a.h }} />{copied === a.h && <span className="ds-toast ds-toast--sm">Copiato</span>}</div>
                <span className="ds-alpha-n">{a.n}</span>
                <code className="ds-alpha-v">{a.v}</code>
              </div>
            ))}
          </div>
        </Stagger>
      </section>

      {/* ═══ 02 TYPOGRAPHY ═══ */}
      <section className="ds-s">
        <Reveal><SH n="02" t="Tipografia" /></Reveal>
        <Reveal>
          <div className="ds-type-hero">
            <span className="ds-type-hero-lbl">PP Editorial Old &middot; 200 Ultralight</span>
            <span className="ds-type-hero-big">Happiness</span>
          </div>
        </Reveal>
        <Stagger>
          <div className="ds-type-list">
            {[
              { sz: 80, tx: 'Progetto', f: 'serif', w: 200 },
              { sz: 52, tx: 'La felicita e un viaggio', f: 'serif', w: 200 },
              { sz: 40, tx: 'Attraverso il mondo', f: 'serif', w: 200 },
              { sz: 28, tx: 'What Makes You Happy?', f: 'serif', w: 200, i: true },
              { sz: 24, tx: 'Episodio 01 — San Francisco', f: 'serif', w: 200 },
            ].map(r => (
              <div key={r.sz + r.tx} className="ds-type-row" data-s>
                <span className="ds-type-sz">{r.sz}{r.i ? 'i' : ''}</span>
                <span style={{ fontFamily: `var(--font-${r.f})`, fontSize: `min(${r.sz}px, 8vw)`, fontWeight: r.w, fontStyle: r.i ? 'italic' : 'normal', lineHeight: 1.05, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.tx}</span>
              </div>
            ))}
          </div>
        </Stagger>
        <Reveal delay={0.1}><div style={{ height: 1, background: 'rgba(255,255,255,0.04)', margin: '48px 0' }} /></Reveal>
        <Reveal>
          <div className="ds-type-hero" style={{ marginBottom: 24 }}>
            <span className="ds-type-hero-lbl">Inter &middot; 400 / 500 / 600</span>
          </div>
        </Reveal>
        <Stagger>
          <div className="ds-type-list">
            {[
              { sz: 20, tx: 'Un viaggio alla ricerca della felicita', w: 400 },
              { sz: 16, tx: 'Il progetto che racconta la felicita nel mondo intero', w: 400 },
              { sz: 13, tx: 'Cosa spinge un manager di successo a cercare risposte in luoghi inaspettati?', w: 300 },
              { sz: 11, tx: 'EPISODIO 01 \u00b7 SAN FRANCISCO, USA', w: 500, u: true, ls: .5 },
              { sz: 9, tx: '4.2M VIEWS \u00b7 2023 \u00b7 PROGETTO HAPPINESS', w: 500, u: true, ls: 1.5 },
            ].map(r => (
              <div key={r.sz + r.tx} className="ds-type-row" data-s>
                <span className="ds-type-sz">{r.sz}</span>
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: r.sz, fontWeight: r.w, textTransform: r.u ? 'uppercase' : 'none', letterSpacing: r.ls || 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.tx}</span>
              </div>
            ))}
          </div>
        </Stagger>
      </section>

      {/* ═══ 03 SPACING ═══ */}
      <section className="ds-s">
        <Reveal><SH n="03" t="Spaziatura" /></Reveal>
        <Stagger>
          <div className="ds-space-row">
            {[{ v: 28, u: 'UI outer' },{ v: 20, u: 'Section' },{ v: 16, u: 'Mobile' },{ v: 12, u: 'Card' },{ v: 8, u: 'Gap' }].map(s => (
              <div key={s.v} className="ds-space" data-s>
                <div className="ds-space-box" style={{ width: s.v * 2.5, height: s.v * 2.5 }}>{s.v}</div>
                <span>{s.u}</span>
              </div>
            ))}
          </div>
        </Stagger>
        <Reveal delay={0.15}><p className="ds-label" style={{ marginTop: 56 }}>Border Radius</p></Reveal>
        <Stagger>
          <div className="ds-radius-row">
            {[{ v: 9999, l: 'Pill', w: 140, h: 44 },{ v: 24, l: 'Card', w: 100, h: 100 },{ v: 12, l: 'Button', w: 100, h: 48 },{ v: 10, l: 'Small', w: 60, h: 60 }].map(r => (
              <div key={r.v} className="ds-radius" data-s>
                <div className="ds-radius-box" style={{ borderRadius: r.v, width: r.w, height: r.h }} />
                <code>{r.v === 9999 ? '9999' : r.v}px</code>
                <span>{r.l}</span>
              </div>
            ))}
          </div>
        </Stagger>
      </section>

      {/* ═══ 04 MOTION ═══ */}
      <section className="ds-s">
        <Reveal><SH n="04" t="Motion" /></Reveal>
        <div className="ds-motion-2col">
          <Reveal>
            <p className="ds-label">CSS Ease</p>
            <code className="ds-ease-code">cubic-bezier(0.19, 1, 0.22, 1)</code>
            <svg width="180" height="180" viewBox="-5 -5 210 210" style={{ display: 'block' }}>
              <rect x={0} y={0} width={200} height={200} fill="none" stroke="rgba(255,255,255,0.05)" />
              <line x1={0} y1={200} x2={200} y2={0} stroke="rgba(255,255,255,0.03)" strokeDasharray="4 4" />
              <line x1={0} y1={200} x2={38} y2={0} stroke="var(--color-primary)" opacity=".25" />
              <line x1={200} y1={0} x2={44} y2={0} stroke="var(--color-primary)" opacity=".25" />
              <path d="M0,200 C38,0 44,0 200,0" fill="none" stroke="var(--color-primary)" strokeWidth="2.5" />
              <circle cx={38} cy={0} r="5" fill="var(--color-primary)" />
              <circle cx={44} cy={0} r="5" fill="var(--color-primary)" />
              <circle cx={0} cy={200} r="4" fill="var(--color-cream)" />
              <circle cx={200} cy={0} r="4" fill="var(--color-cream)" />
            </svg>
          </Reveal>
          <Stagger>
            <p className="ds-label">GSAP Easings <span style={{ opacity: .35 }}>&mdash; clicca</span></p>
            {EASINGS.map(e => <EaseRow key={e.ease} {...e} />)}
          </Stagger>
        </div>
        <Reveal delay={0.15}>
          <p className="ds-label" style={{ marginTop: 56 }}>Durate</p>
          <div className="ds-dur-list">
            {[{ v: .2, u: 'Hover' },{ v: .35, u: 'Pill leave' },{ v: .45, u: 'Pill enter' },{ v: .6, u: 'Intro' },{ v: .65, u: 'Sidebar' },{ v: 1, u: 'Panel' },{ v: 1.5, u: 'Preloader' }].map(d => (
              <div key={d.v} className="ds-dur">
                <div className="ds-dur-bar" style={{ width: `${d.v / 1.5 * 100}%` }} />
                <code>{d.v}s</code>
                <span>{d.u}</span>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* ═══ 05 GLASS ═══ */}
      <section className="ds-s">
        <Reveal><SH n="05" t="Glassmorphism" /></Reveal>
        <Stagger>
          <div className="ds-glass-grid">
            {[8, 12, 16, 20, 24].map(b => (
              <div key={b} className="ds-glass" data-s>
                <div className="ds-glass-bg" />
                <div className="ds-glass-card" style={{ backdropFilter: `blur(${b}px)`, WebkitBackdropFilter: `blur(${b}px)` }}>
                  <span className="ds-glass-num">{b}</span>
                  <span className="ds-glass-unit">px blur</span>
                </div>
              </div>
            ))}
          </div>
        </Stagger>
      </section>

      {/* ═══ 06 COMPONENTS ═══ */}
      <section className="ds-s">
        <Reveal>
          <SH n="06" t="Componenti" />
          <div className="ds-stats">
            <div><span className="ds-stat-n"><Counter to="14" /></span><span className="ds-stat-l">Componenti</span></div>
            <div><span className="ds-stat-n"><Counter to="6" /></span><span className="ds-stat-l">File CSS</span></div>
            <div><span className="ds-stat-n"><Counter to="3" suffix="+" /></span><span className="ds-stat-l">Scene WebGL</span></div>
          </div>
        </Reveal>
        <Stagger>
          <div className="ds-comp-grid">
            {COMPS.map((c, i) => (
              <div key={c.n} className="ds-comp" data-s>
                <div className="ds-comp-top">
                  <span className="ds-comp-idx">{String(i + 1).padStart(2, '0')}</span>
                  <span className="ds-comp-type">{c.t}</span>
                </div>
                <h4 className="ds-comp-name">{c.n}</h4>
                <p className="ds-comp-desc">{c.d}</p>
                <div className="ds-comp-tags">{c.tags.map(t => <span key={t} className="ds-comp-tag">{t}</span>)}</div>
              </div>
            ))}
          </div>
        </Stagger>
      </section>

      {/* ═══ 07 DEMO ═══ */}
      <section className="ds-s">
        <Reveal><SH n="07" t="Demo Live" /></Reveal>
        <div className="ds-demo-grid">
          <Reveal>
            <div className="ds-demo">
              <div className="ds-demo-head"><span className="ds-demo-dot" />StickerPeel</div>
              <div className="ds-demo-peel">
                {[{ p: 80, l: '80%' },{ p: 40, l: '40%' },{ p: 0, l: 'Flat' }].map(x => (
                  <div key={x.p} style={{ textAlign: 'center' }}>
                    <StickerPeel imageSrc="/logo.webp" width={110} peelBackPct={x.p} />
                    <span className="ds-demo-lbl">{x.l}</span>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <div className="ds-demo">
              <div className="ds-demo-head"><span className="ds-demo-dot" />LocalClock</div>
              <div className="ds-demo-body"><Clock /></div>
            </div>
          </Reveal>
          <Reveal delay={0.16}>
            <div className="ds-demo ds-demo--wide">
              <div className="ds-demo-head"><span className="ds-demo-dot" />Noise</div>
              <div className="ds-demo-noise"><div className="ds-demo-noise-bg" /><Noise patternAlpha={30} /></div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══ 08 BRAND ═══ */}
      <section className="ds-s">
        <Reveal><SH n="08" t="Marca" /></Reveal>
        <Stagger>
          <div className="ds-brand-row">
            {[{ s: 140, c: 'var(--color-primary)', l: 'Primary' },{ s: 100, c: 'var(--color-cream)', l: 'Cream' },{ s: 64, c: 'var(--color-text)', l: 'Light' },{ s: 40, c: 'var(--color-text-tertiary)', l: 'Muted' }].map(x => (
              <div key={x.l} className="ds-brand" data-s><Logo size={x.s} color={x.c} /><span>{x.s}px &middot; {x.l}</span></div>
            ))}
          </div>
        </Stagger>
      </section>

      {/* ═══ 09 PINS ═══ */}
      <section className="ds-s">
        <Reveal><SH n="09" t="Pin & Marker" /></Reveal>
        <Stagger>
          <div className="ds-pin-grid">
            {[
              { name: 'Standard', cls: 'ds-pin--std' },
              { name: 'Pulse', cls: 'ds-pin--pulse' },
              { name: 'Glow', cls: 'ds-pin--glow' },
              { name: 'Ring', cls: 'ds-pin--ring' },
              { name: 'Orbit', cls: 'ds-pin--orbit' },
              { name: 'Diamond', cls: 'ds-pin--diamond' },
              { name: 'Crosshair', cls: 'ds-pin--cross' },
              { name: 'Beacon', cls: 'ds-pin--beacon' },
            ].map(p => (
              <div key={p.name} className="ds-pin-cell" data-s>
                <div className="ds-pin-stage">
                  <div className={`ds-pin ${p.cls}`}>
                    <span className="ds-pin-core" />
                  </div>
                </div>
                <span className="ds-pin-name">{p.name}</span>
              </div>
            ))}
          </div>
        </Stagger>
      </section>

      {/* ═══ 10 BUTTONS ═══ */}
      <section className="ds-s">
        <Reveal><SH n="10" t="Bottoni" /></Reveal>
        <Reveal><p className="ds-label">Varianti</p></Reveal>
        <Stagger>
          <div className="ds-btn-row">
            <button className="ds-btn ds-btn--primary" data-s>Guarda su YouTube</button>
            <button className="ds-btn ds-btn--secondary" data-s>Scopri di piu</button>
            <button className="ds-btn ds-btn--ghost" data-s>Leggi tutto</button>
            <button className="ds-btn ds-btn--icon" data-s>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
            <button className="ds-btn ds-btn--pill" data-s>Bacheca</button>
            <button className="ds-btn ds-btn--audio-yes" data-s>Si, attiva</button>
            <button className="ds-btn ds-btn--audio-no" data-s>Senza audio</button>
          </div>
        </Stagger>
        <Reveal delay={0.1}><p className="ds-label" style={{ marginTop: 40 }}>Dimensioni</p></Reveal>
        <Stagger>
          <div className="ds-btn-row">
            <button className="ds-btn ds-btn--primary ds-btn--lg" data-s>Large</button>
            <button className="ds-btn ds-btn--primary" data-s>Default</button>
            <button className="ds-btn ds-btn--primary ds-btn--sm" data-s>Small</button>
            <button className="ds-btn ds-btn--primary ds-btn--xs" data-s>XS</button>
          </div>
        </Stagger>
      </section>

      {/* ═══ 11 BADGES ═══ */}
      <section className="ds-s">
        <Reveal><SH n="11" t="Badge & Tag" /></Reveal>
        <Stagger>
          <div className="ds-badge-row">
            <span className="ds-badge ds-badge--ep" data-s>Ep. 01</span>
            <span className="ds-badge ds-badge--ep" data-s>Ep. 14</span>
            <span className="ds-badge ds-badge--loc" data-s>San Francisco, USA</span>
            <span className="ds-badge ds-badge--loc" data-s>Zurigo, Svizzera</span>
            <span className="ds-badge ds-badge--cat" data-s>three.js</span>
            <span className="ds-badge ds-badge--cat" data-s>gsap</span>
            <span className="ds-badge ds-badge--cat" data-s>webgl</span>
            <span className="ds-badge ds-badge--status ds-badge--live" data-s>Live</span>
            <span className="ds-badge ds-badge--status ds-badge--draft" data-s>Draft</span>
            <span className="ds-badge ds-badge--count" data-s>42</span>
            <span className="ds-badge ds-badge--count" data-s>900+</span>
            <span className="ds-badge ds-badge--views" data-s>4.2M views</span>
          </div>
        </Stagger>
      </section>

      {/* ═══ 12 CARDS ═══ */}
      <section className="ds-s">
        <Reveal><SH n="12" t="Cards" /></Reveal>
        <Stagger>
          <div className="ds-card-grid">
            {/* Episode card */}
            <div className="ds-card ds-card--episode" data-s>
              <div className="ds-card-thumb">
                <div className="ds-card-thumb-overlay">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="white" opacity=".8"><path d="M8 5v14l11-7z"/></svg>
                </div>
              </div>
              <div className="ds-card-body">
                <div className="ds-card-meta"><span className="ds-badge ds-badge--ep">Ep. 01</span><span className="ds-badge ds-badge--loc">San Francisco</span></div>
                <h4 className="ds-card-title">BDSM: dentro il mondo segreto</h4>
                <p className="ds-card-desc">Cosa spinge un manager di successo a pagare per farsi umiliare?</p>
                <div className="ds-card-foot"><span>4.2M views</span><span>2023</span></div>
              </div>
            </div>

            {/* Stat card */}
            <div className="ds-card ds-card--stat" data-s>
              <span className="ds-card-stat-val"><Counter to="2.7" suffix="M" /></span>
              <span className="ds-card-stat-label">Iscritti YouTube</span>
              <div className="ds-card-stat-bar"><div className="ds-card-stat-fill" style={{ width: '78%' }} /></div>
            </div>

            {/* Stat card 2 */}
            <div className="ds-card ds-card--stat" data-s>
              <span className="ds-card-stat-val"><Counter to="50" suffix="+" /></span>
              <span className="ds-card-stat-label">Paesi visitati</span>
              <div className="ds-card-stat-bar"><div className="ds-card-stat-fill" style={{ width: '62%' }} /></div>
            </div>

            {/* Glass feature card */}
            <div className="ds-card ds-card--feature" data-s>
              <div className="ds-card-feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
              </div>
              <h4 className="ds-card-feature-title">Happiness Index</h4>
              <p className="ds-card-feature-desc">Mappa interattiva della felicita percepita per paese, basata su dati reali.</p>
            </div>

            {/* Quote card */}
            <div className="ds-card ds-card--quote" data-s>
              <svg className="ds-card-quote-mark" width="24" height="24" viewBox="0 0 24 24" fill="var(--color-primary)" opacity=".3"><path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z"/></svg>
              <p className="ds-card-quote-text">La felicita non e una destinazione, e un modo di viaggiare.</p>
              <span className="ds-card-quote-author">Giuseppe Bertuccio D'Angelo</span>
            </div>

            {/* Notification card */}
            <div className="ds-card ds-card--notif" data-s>
              <div className="ds-card-notif-dot" />
              <div>
                <strong>Nuovo episodio disponibile</strong>
                <p>Ep. 42 — Tanzania: il rifugio degli albini</p>
              </div>
            </div>
          </div>
        </Stagger>
      </section>

      {/* ═══ 13 INPUTS ═══ */}
      <section className="ds-s">
        <Reveal><SH n="13" t="Input & Form" /></Reveal>
        <Stagger>
          <div className="ds-input-grid">
            <div className="ds-input-group" data-s>
              <label className="ds-input-label">Cerca episodio</label>
              <div className="ds-input-wrap">
                <svg className="ds-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                <input className="ds-input" type="text" placeholder="San Francisco, felicita..." readOnly />
              </div>
            </div>
            <div className="ds-input-group" data-s>
              <label className="ds-input-label">Il tuo messaggio</label>
              <textarea className="ds-textarea" placeholder="Cosa ti rende felice?" readOnly rows={3} />
              <span className="ds-input-hint">Max 200 caratteri</span>
            </div>
            <div className="ds-input-group" data-s>
              <label className="ds-input-label">Seleziona</label>
              <div className="ds-select-wrap">
                <select className="ds-select" disabled><option>Tutti gli episodi</option></select>
                <svg className="ds-select-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
              </div>
            </div>
            <div className="ds-input-group" data-s>
              <label className="ds-input-label">Toggle</label>
              <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
                <ToggleSwitch label="Audio" />
                <ToggleSwitch label="Notifiche" defaultOn />
              </div>
            </div>
          </div>
        </Stagger>
      </section>

      {/* ═══ 14 LOADING ═══ */}
      <section className="ds-s">
        <Reveal><SH n="14" t="Loading & Progress" /></Reveal>
        <Stagger>
          <div className="ds-load-grid">
            {/* Skeleton card */}
            <div className="ds-load-item" data-s>
              <span className="ds-load-name">Skeleton</span>
              <div className="ds-skel">
                <div className="ds-skel-img" />
                <div className="ds-skel-line ds-skel-line--w80" />
                <div className="ds-skel-line ds-skel-line--w60" />
                <div className="ds-skel-line ds-skel-line--w40" />
              </div>
            </div>
            {/* Spinner */}
            <div className="ds-load-item" data-s>
              <span className="ds-load-name">Spinner</span>
              <div className="ds-spinner-row">
                <div className="ds-spinner ds-spinner--sm" />
                <div className="ds-spinner" />
                <div className="ds-spinner ds-spinner--lg" />
              </div>
            </div>
            {/* Pulse dots */}
            <div className="ds-load-item" data-s>
              <span className="ds-load-name">Dots</span>
              <div className="ds-dots"><span /><span /><span /></div>
            </div>
            {/* Progress bar */}
            <div className="ds-load-item" data-s>
              <span className="ds-load-name">Progress</span>
              <div className="ds-prog"><div className="ds-prog-fill" /></div>
              <div className="ds-prog ds-prog--thin"><div className="ds-prog-fill ds-prog-fill--slow" /></div>
            </div>
          </div>
        </Stagger>
      </section>

      {/* ═══ 15 DECORATIVE ═══ */}
      <section className="ds-s">
        <Reveal><SH n="15" t="Decorativi" /></Reveal>
        <Stagger>
          <div className="ds-deco-grid">
            {/* Dividers */}
            <div className="ds-deco-item ds-deco-item--wide" data-s>
              <span className="ds-deco-name">Divider — Gradient</span>
              <div className="ds-divider ds-divider--grad" />
            </div>
            <div className="ds-deco-item ds-deco-item--wide" data-s>
              <span className="ds-deco-name">Divider — Dot</span>
              <div className="ds-divider ds-divider--dot" />
            </div>
            <div className="ds-deco-item ds-deco-item--wide" data-s>
              <span className="ds-deco-name">Divider — Dash</span>
              <div className="ds-divider ds-divider--dash" />
            </div>
            {/* Glow orb */}
            <div className="ds-deco-item" data-s>
              <span className="ds-deco-name">Glow Orb</span>
              <div className="ds-deco-stage"><div className="ds-orb" /></div>
            </div>
            {/* Orbit rings */}
            <div className="ds-deco-item" data-s>
              <span className="ds-deco-name">Orbit Ring</span>
              <div className="ds-deco-stage"><div className="ds-orbit"><div className="ds-orbit-dot" /></div></div>
            </div>
            {/* Particle field */}
            <div className="ds-deco-item" data-s>
              <span className="ds-deco-name">Star Field</span>
              <div className="ds-deco-stage ds-stars">
                {Array.from({ length: 30 }, (_, i) => (
                  <span key={i} className="ds-star" style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`, animationDelay: `${Math.random() * 3}s`, width: Math.random() * 2 + 1, height: Math.random() * 2 + 1 }} />
                ))}
              </div>
            </div>
          </div>
        </Stagger>
      </section>

      {/* ═══ 16 TOASTS ═══ */}
      <section className="ds-s">
        <Reveal><SH n="16" t="Toast & Feedback" /></Reveal>
        <Stagger>
          <div className="ds-toast-grid">
            <div className="ds-toast-item ds-toast-item--success" data-s>
              <div className="ds-toast-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <div><strong>Messaggio inviato</strong><p>Il tuo post-it e stato aggiunto alla bacheca.</p></div>
            </div>
            <div className="ds-toast-item ds-toast-item--info" data-s>
              <div className="ds-toast-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
              </div>
              <div><strong>Caricamento globo</strong><p>Download texture 8K in corso...</p></div>
            </div>
            <div className="ds-toast-item ds-toast-item--warn" data-s>
              <div className="ds-toast-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              </div>
              <div><strong>Audio disattivato</strong><p>L'esperienza immersiva richiede audio.</p></div>
            </div>
          </div>
        </Stagger>
      </section>

      {/* ═══ 17 AVATARS ═══ */}
      <section className="ds-s">
        <Reveal><SH n="17" t="Avatar & Thumbnail" /></Reveal>
        <Stagger>
          <div className="ds-avatar-row">
            {[64, 48, 36, 28].map(s => (
              <div key={s} className="ds-avatar" data-s style={{ width: s, height: s }}>
                <Logo size={s * 0.55} color="var(--color-primary)" />
              </div>
            ))}
            <div className="ds-avatar ds-avatar--ring" data-s style={{ width: 48, height: 48 }}>
              <Logo size={24} color="var(--color-primary)" />
            </div>
            <div className="ds-avatar ds-avatar--square" data-s style={{ width: 48, height: 48 }}>
              <Logo size={24} color="var(--color-cream)" />
            </div>
          </div>
          <p className="ds-label" style={{ marginTop: 40 }}>Thumbnail Treatment</p>
          <div className="ds-thumb-row">
            <div className="ds-thumb" data-s>
              <div className="ds-thumb-img" />
              <div className="ds-thumb-grad" />
            </div>
            <div className="ds-thumb ds-thumb--round" data-s>
              <div className="ds-thumb-img" />
            </div>
            <div className="ds-thumb ds-thumb--vignette" data-s>
              <div className="ds-thumb-img" />
              <div className="ds-thumb-vig" />
            </div>
          </div>
        </Stagger>
      </section>

      <footer className="ds-foot">
        <div className="ds-foot-line" />
        <Logo size={18} color="var(--color-text-tertiary)" />
        <span>Progetto Happiness &middot; Design System</span>
      </footer>
    </div>
  );
}

function ToggleSwitch({ label, defaultOn = false }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <button className={`ds-toggle ${on ? 'ds-toggle--on' : ''}`} onClick={() => setOn(!on)}>
      <span className="ds-toggle-thumb" />
      <span className="ds-toggle-label">{label}</span>
    </button>
  );
}

function SH({ n, t }) {
  return <div className="ds-sh"><span className="ds-sh-n">{n}</span><h2 className="ds-sh-t">{t}</h2></div>;
}

/* ═══════════════════════════════════════════
   STYLES
   ═══════════════════════════════════════════ */
const STYLES = `
/* BASE */
.ds{position:fixed;inset:0;z-index:9999;overflow-y:auto;overflow-x:hidden;background:var(--color-bg);color:var(--color-text);font-family:var(--font-sans);-webkit-font-smoothing:antialiased;scroll-behavior:smooth}
.ds *,.ds *::before,.ds *::after{box-sizing:border-box;margin:0;padding:0}
.ds-noise-wrap{position:fixed;inset:0;z-index:1;pointer-events:none}

/* HERO */
.ds-hero{min-height:100vh;min-height:100dvh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:80px 40px;position:relative}
.ds-hero-glow{position:absolute;inset:0;z-index:-1;background:radial-gradient(ellipse 50% 40% at 50% 45%,rgba(255,221,0,.04) 0%,transparent 70%)}
.ds-back{position:absolute;top:28px;left:28px;background:none;border:1px solid var(--color-border);color:var(--color-text-secondary);font-family:var(--font-sans);font-size:12px;padding:10px 20px;border-radius:9999px;cursor:pointer;display:flex;align-items:center;gap:8px;transition:all .3s var(--ease)}
.ds-back:hover{border-color:var(--color-primary);color:var(--color-primary)}
.ds-hero-t{font-family:var(--font-serif);font-weight:200;font-size:clamp(56px,13vw,130px);line-height:.88;color:var(--color-cream);letter-spacing:-2px;margin-top:32px}
.ds-hero-sub{font-family:var(--font-serif);font-weight:200;font-size:clamp(16px,2.5vw,22px);color:var(--color-text-secondary);margin-top:16px}
.ds-hero-tags{display:flex;align-items:center;gap:0;margin-top:24px;font-size:10px;letter-spacing:1px;text-transform:uppercase;color:var(--color-text-tertiary)}
.ds-hero-tags span{padding:0 10px}
.ds-hero-tags span:not(:last-child){border-right:1px solid rgba(255,255,255,.08)}
.ds-hero-line{width:1px;height:48px;margin-top:48px;background:linear-gradient(to bottom,var(--color-primary),transparent);animation:ds-pulse 2s ease-in-out infinite}
@keyframes ds-pulse{0%,100%{opacity:.25;transform:scaleY(1)}50%{opacity:.7;transform:scaleY(1.15)}}

/* SECTIONS */
.ds-s{max-width:1200px;margin:0 auto;padding:100px 48px}
@media(max-width:768px){.ds-s{padding:64px 20px}}
.ds-sh{margin-bottom:56px}
.ds-sh-n{font-size:11px;font-weight:600;letter-spacing:3px;color:var(--color-primary);display:block;margin-bottom:12px}
.ds-sh-t{font-family:var(--font-serif);font-weight:200;font-size:clamp(36px,6vw,56px);color:var(--color-cream);line-height:1}
.ds-label{font-size:10px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:var(--color-text-tertiary);margin-bottom:24px}

/* COLORS — 6 columns on large, 3 on medium, 2 on small */
.ds-color-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:12px}
@media(max-width:1000px){.ds-color-grid{grid-template-columns:repeat(3,1fr)}}
@media(max-width:600px){.ds-color-grid{grid-template-columns:repeat(2,1fr)}}
.ds-color{border-radius:16px;overflow:hidden;cursor:pointer;background:var(--color-surface);border:1px solid transparent;transition:border-color .3s,transform .3s var(--ease);padding-bottom:14px}
.ds-color:hover{border-color:var(--color-border-hover);transform:translateY(-3px)}
.ds-color-swatch{height:100px;background:var(--bg);display:flex;align-items:center;justify-content:center;position:relative}
.ds-color--dk .ds-color-swatch{color:var(--color-brand-dark)}
.ds-color strong{display:block;font-size:12px;font-weight:500;padding:12px 14px 4px}
.ds-color code{display:block;font-size:10px;color:var(--color-text-secondary);padding:0 14px}
.ds-color-var{color:var(--color-text-tertiary)!important;margin-top:2px}
.ds-toast{font-size:10px;font-weight:600;color:var(--color-brand-dark);background:var(--color-primary);padding:4px 14px;border-radius:9999px;animation:ds-pop .25s var(--ease)}
.ds-toast--sm{font-size:8px;padding:3px 10px}
@keyframes ds-pop{from{transform:scale(.7);opacity:0}}

/* ALPHAS — 4 columns */
.ds-alpha-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
@media(max-width:800px){.ds-alpha-grid{grid-template-columns:repeat(4,1fr)}}
@media(max-width:500px){.ds-alpha-grid{grid-template-columns:repeat(2,1fr)}}
.ds-alpha{cursor:pointer;text-align:center;transition:transform .3s var(--ease)}
.ds-alpha:hover{transform:translateY(-2px)}
.ds-alpha-sw{height:56px;border-radius:12px;overflow:hidden;position:relative;border:1px solid var(--color-border);display:flex;align-items:center;justify-content:center}
.ds-alpha-ck{position:absolute;inset:0;background:repeating-conic-gradient(rgba(255,255,255,.05) 0% 25%,transparent 0% 50%) 0 0/8px 8px}
.ds-alpha-fill{position:absolute;inset:0}
.ds-alpha-n{display:block;font-size:10px;margin-top:8px;color:var(--color-text-secondary)}
.ds-alpha-v{display:block;font-size:9px;color:var(--color-text-tertiary);margin-top:2px}

/* TYPOGRAPHY */
.ds-type-hero{margin-bottom:32px}
.ds-type-hero-lbl{display:block;font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:var(--color-text-tertiary);margin-bottom:12px}
.ds-type-hero-big{display:block;font-family:var(--font-serif);font-weight:200;font-size:clamp(48px,10vw,96px);line-height:.9;color:var(--color-cream);letter-spacing:-1px}
.ds-type-list{}
.ds-type-row{display:flex;align-items:baseline;gap:24px;padding:14px 0;border-bottom:1px solid rgba(255,255,255,.03)}
.ds-type-sz{font-size:10px;font-weight:500;color:var(--color-primary);opacity:.5;min-width:32px;text-align:right;flex-shrink:0;font-variant-numeric:tabular-nums}

/* SPACING */
.ds-space-row{display:flex;gap:24px;flex-wrap:wrap}
.ds-space{display:flex;flex-direction:column;align-items:center;gap:10px}
.ds-space-box{background:rgba(255,221,0,.08);border:1px dashed rgba(255,221,0,.2);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:600;color:var(--color-primary);font-variant-numeric:tabular-nums}
.ds-space span{font-size:10px;color:var(--color-text-tertiary)}
.ds-radius-row{display:flex;gap:28px;flex-wrap:wrap;align-items:center}
.ds-radius{display:flex;flex-direction:column;align-items:center;gap:10px}
.ds-radius-box{background:var(--color-surface);border:1px solid var(--color-border)}
.ds-radius code{font-size:10px;color:var(--color-text-secondary)}
.ds-radius span{font-size:9px;color:var(--color-text-tertiary)}

/* MOTION — 2 columns */
.ds-motion-2col{display:grid;grid-template-columns:auto 1fr;gap:64px;align-items:start}
@media(max-width:768px){.ds-motion-2col{grid-template-columns:1fr;gap:40px}}
.ds-ease-code{display:block;font-size:12px;color:var(--color-primary);margin-bottom:24px;opacity:.6}
.ds-ease{display:grid;grid-template-columns:1fr auto auto;gap:14px;align-items:center;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.03);cursor:pointer;transition:background .15s}
.ds-ease:hover{background:rgba(255,255,255,.015);border-radius:8px;margin:0 -8px;padding:10px 8px}
.ds-ease-track{height:2px;background:rgba(255,255,255,.05);border-radius:2px;position:relative}
.ds-ease-dot{width:14px;height:14px;border-radius:50%;background:var(--color-primary);position:absolute;top:50%;transform:translateY(-50%);box-shadow:0 0 14px rgba(255,221,0,.3)}
.ds-ease code{font-size:11px;white-space:nowrap}
.ds-ease-desc{font-size:10px;color:var(--color-text-tertiary);white-space:nowrap}
.ds-dur-list{display:flex;flex-direction:column;gap:10px;max-width:600px}
.ds-dur{display:grid;grid-template-columns:1fr auto auto;gap:14px;align-items:center}
.ds-dur-bar{height:3px;border-radius:2px;min-width:4px;background:linear-gradient(90deg,var(--color-primary),rgba(255,221,0,.1))}
.ds-dur code{font-size:10px;color:var(--color-text-secondary);font-variant-numeric:tabular-nums}
.ds-dur span{font-size:10px;color:var(--color-text-tertiary)}

/* GLASS — 5 columns on wide, 3 on medium, 2 on small */
.ds-glass-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:16px}
@media(max-width:900px){.ds-glass-grid{grid-template-columns:repeat(3,1fr)}}
@media(max-width:500px){.ds-glass-grid{grid-template-columns:repeat(2,1fr)}}
.ds-glass{height:200px;border-radius:20px;overflow:hidden;position:relative}
.ds-glass-bg{position:absolute;inset:0;background:conic-gradient(from 200deg,#FFDD00,#F6E3D5,#2C2118,#FFDD00)}
.ds-glass-card{position:absolute;inset:24px;border-radius:14px;background:var(--color-card);border:1px solid var(--color-border);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;transition:transform .4s var(--ease)}
.ds-glass:hover .ds-glass-card{transform:scale(1.03)}
.ds-glass-num{font-family:var(--font-serif);font-size:32px;font-weight:200}
.ds-glass-unit{font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:var(--color-text-tertiary)}

/* COMPONENTS — 3 columns on wide, 2 on medium, 1 on small */
.ds-stats{display:flex;gap:48px;margin-bottom:48px;margin-top:8px}
.ds-stat-n{font-family:var(--font-serif);font-size:36px;font-weight:200;color:var(--color-primary);display:block}
.ds-stat-l{font-size:10px;letter-spacing:1px;text-transform:uppercase;color:var(--color-text-tertiary)}
.ds-comp-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
@media(max-width:900px){.ds-comp-grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:550px){.ds-comp-grid{grid-template-columns:1fr}}
.ds-comp{background:var(--color-surface);border:1px solid var(--color-border);border-radius:20px;padding:28px;display:flex;flex-direction:column;min-height:190px;transition:border-color .3s,transform .4s var(--ease)}
.ds-comp:hover{border-color:var(--color-border-hover);transform:translateY(-4px)}
.ds-comp-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}
.ds-comp-idx{font-size:10px;color:var(--color-primary);opacity:.4;font-variant-numeric:tabular-nums;font-weight:600}
.ds-comp-type{font-size:9px;letter-spacing:1px;text-transform:uppercase;color:var(--color-text-tertiary);padding:3px 10px;border-radius:9999px;border:1px solid rgba(255,255,255,.06)}
.ds-comp-name{font-size:16px;font-weight:600;margin-bottom:10px}
.ds-comp-desc{font-size:12px;line-height:1.65;color:var(--color-text-secondary);flex:1}
.ds-comp-tags{display:flex;gap:5px;margin-top:16px;flex-wrap:wrap}
.ds-comp-tag{font-size:9px;padding:3px 9px;border-radius:9999px;background:rgba(255,221,0,.06);color:var(--color-primary);opacity:.7;font-weight:500;letter-spacing:.3px}

/* DEMO — 2-column grid for sticker+clock, full-width for noise */
.ds-demo-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.ds-demo--wide{grid-column:1/-1}
@media(max-width:700px){.ds-demo-grid{grid-template-columns:1fr}}
.ds-demo{background:var(--color-surface);border:1px solid var(--color-border);border-radius:20px;overflow:hidden}
.ds-demo-head{display:flex;align-items:center;gap:10px;font-size:13px;font-weight:600;padding:20px 24px;border-bottom:1px solid rgba(255,255,255,.04)}
.ds-demo-dot{width:8px;height:8px;border-radius:50%;background:var(--color-primary)}
.ds-demo-body{padding:32px 24px}
.ds-demo-peel{display:flex;gap:40px;align-items:flex-end;padding:40px 24px;justify-content:center;flex-wrap:wrap}
.ds-demo-lbl{display:block;font-size:10px;color:var(--color-text-tertiary);margin-top:14px;letter-spacing:.5px}
.ds-demo-noise{height:200px;position:relative;overflow:hidden}
.ds-demo-noise-bg{position:absolute;inset:0;background:linear-gradient(135deg,#2C2118 0%,#FFDD00 50%,#F6E3D5 100%)}
.ds-clock-z{display:block;font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:var(--color-text-tertiary);margin-bottom:6px}
.ds-clock-t{font-family:var(--font-serif);font-size:36px;font-weight:200;letter-spacing:2px}

/* BRAND */
.ds-brand-row{display:flex;gap:56px;align-items:flex-end;flex-wrap:wrap}
.ds-brand{display:flex;flex-direction:column;align-items:center;gap:16px}
.ds-brand span{font-size:10px;color:var(--color-text-tertiary);letter-spacing:.5px}

/* PINS */
.ds-pin-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
@media(max-width:700px){.ds-pin-grid{grid-template-columns:repeat(2,1fr)}}
.ds-pin-cell{text-align:center}
.ds-pin-stage{height:100px;display:flex;align-items:center;justify-content:center;background:var(--color-surface);border:1px solid var(--color-border);border-radius:16px;margin-bottom:8px;position:relative;overflow:hidden}
.ds-pin-name{font-size:10px;color:var(--color-text-tertiary)}
.ds-pin{position:relative;width:40px;height:40px;display:flex;align-items:center;justify-content:center}
.ds-pin-core{width:10px;height:10px;border-radius:50%;background:var(--color-primary);display:block}
/* Standard */
.ds-pin--std .ds-pin-core{box-shadow:0 0 8px rgba(255,221,0,.4)}
/* Pulse */
.ds-pin--pulse .ds-pin-core{animation:ds-pin-pulse 2s ease-out infinite}
.ds-pin--pulse::after{content:'';position:absolute;inset:4px;border-radius:50%;border:1.5px solid var(--color-primary);animation:ds-pin-ring 2s ease-out infinite;opacity:0}
@keyframes ds-pin-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.3)}}
@keyframes ds-pin-ring{0%{transform:scale(.5);opacity:.8}100%{transform:scale(2.5);opacity:0}}
/* Glow */
.ds-pin--glow .ds-pin-core{box-shadow:0 0 20px 6px rgba(255,221,0,.35);animation:ds-glow 3s ease-in-out infinite}
@keyframes ds-glow{0%,100%{box-shadow:0 0 20px 6px rgba(255,221,0,.35)}50%{box-shadow:0 0 30px 10px rgba(255,221,0,.55)}}
/* Ring */
.ds-pin--ring .ds-pin-core{background:transparent;border:2px solid var(--color-primary);width:16px;height:16px}
.ds-pin--ring::after{content:'';position:absolute;width:4px;height:4px;border-radius:50%;background:var(--color-primary)}
/* Orbit */
.ds-pin--orbit::after{content:'';position:absolute;width:30px;height:30px;border-radius:50%;border:1px dashed rgba(255,221,0,.25);animation:ds-spin 4s linear infinite}
@keyframes ds-spin{to{transform:rotate(360deg)}}
.ds-pin--orbit::before{content:'';position:absolute;width:4px;height:4px;border-radius:50%;background:var(--color-primary);top:2px;animation:ds-spin 4s linear infinite;transform-origin:center 18px}
/* Diamond */
.ds-pin--diamond .ds-pin-core{border-radius:2px;transform:rotate(45deg);width:10px;height:10px;box-shadow:0 0 12px rgba(255,221,0,.4)}
/* Crosshair */
.ds-pin--cross .ds-pin-core{width:6px;height:6px}
.ds-pin--cross::before,.ds-pin--cross::after{content:'';position:absolute;background:rgba(255,221,0,.3)}
.ds-pin--cross::before{width:1px;height:24px}
.ds-pin--cross::after{width:24px;height:1px}
/* Beacon */
.ds-pin--beacon .ds-pin-core{width:6px;height:6px}
.ds-pin--beacon::after{content:'';position:absolute;width:28px;height:28px;border-radius:50%;background:rgba(255,221,0,.08);animation:ds-beacon 1.5s ease-out infinite}
@keyframes ds-beacon{0%{transform:scale(.3);opacity:1}100%{transform:scale(1.4);opacity:0}}

/* BUTTONS */
.ds-btn-row{display:flex;gap:12px;flex-wrap:wrap;align-items:center}
.ds-btn{font-family:var(--font-sans);font-size:12px;font-weight:500;border:none;cursor:pointer;border-radius:9999px;padding:11px 24px;transition:all .3s var(--ease);display:inline-flex;align-items:center;gap:6px}
.ds-btn--primary{background:var(--color-primary);color:var(--color-brand-dark)}
.ds-btn--primary:hover{filter:brightness(1.1);transform:translateY(-1px)}
.ds-btn--secondary{background:var(--color-surface);color:var(--color-text);border:1px solid var(--color-border)}
.ds-btn--secondary:hover{border-color:var(--color-primary);color:var(--color-primary)}
.ds-btn--ghost{background:none;color:var(--color-primary);padding:11px 16px}
.ds-btn--ghost:hover{background:rgba(255,221,0,.06)}
.ds-btn--icon{background:var(--color-surface);color:var(--color-text-secondary);border:1px solid var(--color-border);padding:10px;border-radius:50%;width:40px;height:40px;display:flex;align-items:center;justify-content:center}
.ds-btn--icon:hover{border-color:var(--color-text-secondary);color:var(--color-text)}
.ds-btn--pill{background:rgba(221,217,192,.9);color:var(--color-brand-dark);font-size:11px;padding:8px 16px}
.ds-btn--audio-yes{background:var(--color-primary);color:var(--color-brand-dark);font-weight:600;font-size:12px;padding:12px 28px}
.ds-btn--audio-no{background:transparent;color:var(--color-cream);border:1px solid rgba(246,227,213,.15);opacity:.45;font-size:12px;padding:12px 28px}
.ds-btn--lg{padding:14px 32px;font-size:14px}
.ds-btn--sm{padding:8px 16px;font-size:11px}
.ds-btn--xs{padding:5px 12px;font-size:10px}

/* BADGES */
.ds-badge-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.ds-badge{font-size:10px;font-weight:500;padding:4px 12px;border-radius:9999px;display:inline-flex;align-items:center;letter-spacing:.3px}
.ds-badge--ep{background:rgba(255,221,0,.1);color:var(--color-primary)}
.ds-badge--loc{background:rgba(253,244,237,.06);color:var(--color-text-secondary);font-size:9px;letter-spacing:.5px}
.ds-badge--cat{background:rgba(255,221,0,.06);color:var(--color-primary);opacity:.7}
.ds-badge--status{font-size:9px;padding:3px 10px;font-weight:600;letter-spacing:.5px;text-transform:uppercase}
.ds-badge--live{background:rgba(34,197,94,.15);color:#22c55e}
.ds-badge--live::before{content:'';width:5px;height:5px;border-radius:50%;background:#22c55e;margin-right:6px;animation:ds-blink 2s ease infinite}
@keyframes ds-blink{0%,100%{opacity:1}50%{opacity:.3}}
.ds-badge--draft{background:rgba(253,244,237,.06);color:var(--color-text-tertiary)}
.ds-badge--count{background:var(--color-surface);border:1px solid var(--color-border);color:var(--color-text-secondary);font-variant-numeric:tabular-nums;min-width:28px;justify-content:center}
.ds-badge--views{background:none;color:var(--color-text-tertiary);font-size:9px;padding:0;letter-spacing:.3px}

/* CARDS */
.ds-card-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
@media(max-width:900px){.ds-card-grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:550px){.ds-card-grid{grid-template-columns:1fr}}
.ds-card{background:var(--color-surface);border:1px solid var(--color-border);border-radius:20px;overflow:hidden;transition:border-color .3s,transform .4s var(--ease)}
.ds-card:hover{border-color:var(--color-border-hover);transform:translateY(-3px)}
/* Episode card */
.ds-card--episode .ds-card-thumb{height:140px;background:linear-gradient(135deg,#2C2118 0%,#1a120d 100%);position:relative;display:flex;align-items:center;justify-content:center}
.ds-card-thumb-overlay{width:48px;height:48px;border-radius:50%;background:rgba(255,255,255,.1);display:flex;align-items:center;justify-content:center;backdrop-filter:blur(8px)}
.ds-card-body{padding:20px}
.ds-card-meta{display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap}
.ds-card-title{font-family:var(--font-serif);font-size:18px;font-weight:200;line-height:1.2;margin-bottom:8px}
.ds-card-desc{font-size:11px;color:var(--color-text-secondary);line-height:1.6}
.ds-card-foot{display:flex;gap:16px;margin-top:14px;font-size:10px;color:var(--color-text-tertiary)}
/* Stat card */
.ds-card--stat{padding:28px;display:flex;flex-direction:column;gap:8px}
.ds-card-stat-val{font-family:var(--font-serif);font-size:40px;font-weight:200;color:var(--color-primary)}
.ds-card-stat-label{font-size:11px;color:var(--color-text-secondary)}
.ds-card-stat-bar{height:3px;background:rgba(255,255,255,.06);border-radius:2px;margin-top:8px}
.ds-card-stat-fill{height:100%;background:var(--color-primary);border-radius:2px;opacity:.5}
/* Feature card */
.ds-card--feature{padding:28px;display:flex;flex-direction:column;gap:12px;background:linear-gradient(135deg,rgba(255,221,0,.03),transparent)}
.ds-card-feature-icon{width:40px;height:40px;border-radius:12px;background:rgba(255,221,0,.08);display:flex;align-items:center;justify-content:center}
.ds-card-feature-title{font-size:15px;font-weight:600}
.ds-card-feature-desc{font-size:12px;color:var(--color-text-secondary);line-height:1.6}
/* Quote card */
.ds-card--quote{padding:28px;display:flex;flex-direction:column;gap:12px}
.ds-card-quote-mark{opacity:.3}
.ds-card-quote-text{font-family:var(--font-serif);font-size:18px;font-weight:200;font-style:italic;line-height:1.5;color:var(--color-cream)}
.ds-card-quote-author{font-size:11px;color:var(--color-text-tertiary)}
/* Notification card */
.ds-card--notif{padding:20px;display:flex;gap:14px;align-items:flex-start}
.ds-card-notif-dot{width:8px;height:8px;border-radius:50%;background:var(--color-primary);flex-shrink:0;margin-top:4px}
.ds-card--notif strong{font-size:13px;display:block;margin-bottom:4px}
.ds-card--notif p{font-size:11px;color:var(--color-text-secondary)}

/* INPUTS */
.ds-input-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:24px}
@media(max-width:600px){.ds-input-grid{grid-template-columns:1fr}}
.ds-input-group{display:flex;flex-direction:column;gap:8px}
.ds-input-label{font-size:11px;font-weight:500;color:var(--color-text-secondary)}
.ds-input-wrap{position:relative}
.ds-input-icon{position:absolute;left:14px;top:50%;transform:translateY(-50%);color:var(--color-text-tertiary)}
.ds-input{width:100%;background:var(--color-surface);border:1px solid var(--color-border);border-radius:12px;padding:12px 14px 12px 40px;color:var(--color-text);font-family:var(--font-sans);font-size:13px;outline:none;transition:border-color .2s}
.ds-input:focus{border-color:var(--color-primary)}
.ds-input::placeholder{color:var(--color-text-tertiary)}
.ds-textarea{width:100%;background:var(--color-surface);border:1px solid var(--color-border);border-radius:12px;padding:12px 14px;color:var(--color-text);font-family:var(--font-sans);font-size:13px;outline:none;resize:vertical;transition:border-color .2s}
.ds-textarea:focus{border-color:var(--color-primary)}
.ds-textarea::placeholder{color:var(--color-text-tertiary)}
.ds-input-hint{font-size:10px;color:var(--color-text-tertiary)}
.ds-select-wrap{position:relative}
.ds-select{width:100%;background:var(--color-surface);border:1px solid var(--color-border);border-radius:12px;padding:12px 14px;color:var(--color-text);font-family:var(--font-sans);font-size:13px;outline:none;appearance:none;cursor:pointer}
.ds-select-arrow{position:absolute;right:14px;top:50%;transform:translateY(-50%);color:var(--color-text-tertiary);pointer-events:none}
.ds-toggle{display:flex;align-items:center;gap:10px;background:none;border:none;cursor:pointer;padding:0}
.ds-toggle-thumb{width:40px;height:22px;border-radius:11px;background:rgba(255,255,255,.1);position:relative;transition:background .3s var(--ease)}
.ds-toggle-thumb::after{content:'';position:absolute;width:16px;height:16px;border-radius:50%;background:var(--color-text-secondary);top:3px;left:3px;transition:transform .3s var(--ease),background .3s}
.ds-toggle--on .ds-toggle-thumb{background:rgba(255,221,0,.25)}
.ds-toggle--on .ds-toggle-thumb::after{transform:translateX(18px);background:var(--color-primary)}
.ds-toggle-label{font-size:12px;color:var(--color-text-secondary)}

/* LOADING */
.ds-load-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
@media(max-width:700px){.ds-load-grid{grid-template-columns:repeat(2,1fr)}}
.ds-load-item{background:var(--color-surface);border:1px solid var(--color-border);border-radius:16px;padding:24px;display:flex;flex-direction:column;gap:16px}
.ds-load-name{font-size:10px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:var(--color-text-tertiary)}
/* Skeleton */
.ds-skel{display:flex;flex-direction:column;gap:8px}
.ds-skel-img{height:48px;border-radius:8px;background:rgba(255,255,255,.04);animation:ds-shimmer 1.5s ease infinite}
.ds-skel-line{height:8px;border-radius:4px;background:rgba(255,255,255,.04);animation:ds-shimmer 1.5s ease infinite}
.ds-skel-line--w80{width:80%}.ds-skel-line--w60{width:60%}.ds-skel-line--w40{width:40%}
@keyframes ds-shimmer{0%,100%{opacity:1}50%{opacity:.4}}
/* Spinner */
.ds-spinner-row{display:flex;gap:16px;align-items:center}
.ds-spinner{width:24px;height:24px;border-radius:50%;border:2px solid rgba(255,221,0,.15);border-top-color:var(--color-primary);animation:ds-spin .7s linear infinite}
.ds-spinner--sm{width:16px;height:16px;border-width:1.5px}
.ds-spinner--lg{width:32px;height:32px;border-width:2.5px}
/* Dots */
.ds-dots{display:flex;gap:6px;align-items:center}
.ds-dots span{width:8px;height:8px;border-radius:50%;background:var(--color-primary);animation:ds-dotpulse 1.2s ease-in-out infinite}
.ds-dots span:nth-child(2){animation-delay:.2s}
.ds-dots span:nth-child(3){animation-delay:.4s}
@keyframes ds-dotpulse{0%,100%{opacity:.2;transform:scale(.8)}50%{opacity:1;transform:scale(1)}}
/* Progress */
.ds-prog{height:6px;border-radius:3px;background:rgba(255,255,255,.06);overflow:hidden;margin-bottom:8px}
.ds-prog--thin{height:2px}
.ds-prog-fill{height:100%;border-radius:3px;background:linear-gradient(90deg,var(--color-primary),rgba(255,221,0,.5));animation:ds-progress 2.5s ease-in-out infinite}
.ds-prog-fill--slow{animation-duration:4s}
@keyframes ds-progress{0%{width:0}50%{width:75%}100%{width:100%}}

/* DECORATIVE */
.ds-deco-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
.ds-deco-item--wide{grid-column:1/-1}
@media(max-width:700px){.ds-deco-grid{grid-template-columns:1fr}}
.ds-deco-item{display:flex;flex-direction:column;gap:12px}
.ds-deco-name{font-size:10px;color:var(--color-text-tertiary)}
.ds-deco-stage{height:120px;background:var(--color-surface);border:1px solid var(--color-border);border-radius:16px;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden}
/* Dividers */
.ds-divider{height:1px;width:100%}
.ds-divider--grad{background:linear-gradient(90deg,transparent,var(--color-primary),transparent)}
.ds-divider--dot{background:none;border:none;height:auto;display:flex;justify-content:center;gap:8px}
.ds-divider--dot::before{content:'';display:flex;gap:8px;width:100%;height:1px;background:repeating-linear-gradient(90deg,var(--color-text-tertiary) 0 2px,transparent 2px 10px)}
.ds-divider--dash{border-top:1px dashed var(--color-border)}
/* Glow orb */
.ds-orb{width:48px;height:48px;border-radius:50%;background:radial-gradient(circle,rgba(255,221,0,.5),rgba(255,221,0,0) 70%);animation:ds-orb-breathe 3s ease-in-out infinite}
@keyframes ds-orb-breathe{0%,100%{transform:scale(1);opacity:.7}50%{transform:scale(1.3);opacity:1}}
/* Orbit */
.ds-orbit{width:60px;height:60px;border:1px solid rgba(255,221,0,.15);border-radius:50%;position:relative;animation:ds-spin 6s linear infinite}
.ds-orbit-dot{width:6px;height:6px;border-radius:50%;background:var(--color-primary);position:absolute;top:-3px;left:50%;margin-left:-3px;box-shadow:0 0 8px rgba(255,221,0,.4)}
/* Stars */
.ds-stars{overflow:hidden}
.ds-star{position:absolute;border-radius:50%;background:var(--color-cream);animation:ds-twinkle 3s ease-in-out infinite}
@keyframes ds-twinkle{0%,100%{opacity:.15}50%{opacity:.8}}

/* TOASTS */
.ds-toast-grid{display:flex;flex-direction:column;gap:12px;max-width:500px}
.ds-toast-item{display:flex;gap:14px;align-items:flex-start;padding:16px 20px;border-radius:14px;border:1px solid var(--color-border);background:var(--color-surface)}
.ds-toast-icon{flex-shrink:0;margin-top:2px}
.ds-toast-item strong{font-size:13px;display:block;margin-bottom:2px}
.ds-toast-item p{font-size:11px;color:var(--color-text-secondary)}
.ds-toast-item--success{border-color:rgba(34,197,94,.15)}.ds-toast-item--success .ds-toast-icon{color:#22c55e}
.ds-toast-item--info{border-color:rgba(59,130,246,.15)}.ds-toast-item--info .ds-toast-icon{color:#3b82f6}
.ds-toast-item--warn{border-color:rgba(245,158,11,.15)}.ds-toast-item--warn .ds-toast-icon{color:#f59e0b}

/* AVATARS */
.ds-avatar-row{display:flex;gap:16px;align-items:center;flex-wrap:wrap}
.ds-avatar{border-radius:50%;background:var(--color-surface);border:1px solid var(--color-border);display:flex;align-items:center;justify-content:center;transition:transform .3s var(--ease)}
.ds-avatar:hover{transform:scale(1.08)}
.ds-avatar--ring{border:2px solid var(--color-primary)}
.ds-avatar--square{border-radius:12px}
.ds-thumb-row{display:flex;gap:16px;flex-wrap:wrap}
.ds-thumb{width:180px;height:120px;border-radius:14px;overflow:hidden;position:relative}
.ds-thumb-img{position:absolute;inset:0;background:linear-gradient(135deg,#2C2118,#3d2f25)}
.ds-thumb-grad{position:absolute;inset:0;background:linear-gradient(to top,rgba(3,3,3,.8),transparent 60%)}
.ds-thumb--round{border-radius:50%;width:120px;height:120px}
.ds-thumb--vignette{border-radius:14px}
.ds-thumb-vig{position:absolute;inset:0;box-shadow:inset 0 0 40px rgba(0,0,0,.6)}

/* FOOTER */
.ds-foot{max-width:1200px;margin:0 auto;padding:64px 48px 100px;display:flex;flex-direction:column;align-items:center;gap:16px;font-size:10px;color:var(--color-text-tertiary);letter-spacing:.5px}
.ds-foot-line{width:32px;height:1px;background:var(--color-border);margin-bottom:8px}
@media(max-width:768px){.ds-foot{padding:48px 20px 80px}}

/* MOBILE */
@media(max-width:768px){
  .ds-hero{padding:60px 20px}
  .ds-back{top:16px;left:16px;font-size:11px;padding:8px 14px}
  .ds-stats{gap:24px;flex-wrap:wrap}
  .ds-brand-row{gap:28px}
  .ds-demo-peel{gap:20px;padding:24px}
  .ds-pin-grid{grid-template-columns:repeat(2,1fr)}
  .ds-load-grid{grid-template-columns:repeat(2,1fr)}
  .ds-card-grid{grid-template-columns:1fr}
}
`;
