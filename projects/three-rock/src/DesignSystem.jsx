import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

// =====================================================================
// metalab — design system, editorial cut
// =====================================================================
// Tokens scraped from production CSS (15230c8daab2ecff.css) across home,
// what-we-do, about, blog, contact. Built as a long-form editorial page
// rather than a spec sheet — sections breathe, type lives at native
// scale, the brand purple is rationed (one accent per section, never
// two), borders are 1px hairlines on rgba(255,255,255,0.10), no cards.
// =====================================================================

// ---- TOKENS ---------------------------------------------------------
const TOKENS = {
  bg:           '#000000',
  bgSubtle:     '#171717',
  fg:           '#ffffff',
  textBold:     '#ffffff',
  textRegular:  '#cac5ca',
  textSubtle:   '#79767a',
  textWeak:     '#48464a',
  borderBold:   '#ffffff',
  borderSubtle: 'rgba(255,255,255,0.10)',
  borderHair:   'rgba(255,255,255,0.06)',
  highlight:    '#584dff',
  darkPurple:   '#100037',
  coolGrey:     '#edf1f5',
  midGrey:      '#c7c7c7',
  errorDark:    '#ff6060',
  errorLight:   '#b60000',
}

const COLOR_GROUPS = [
  {
    title: 'Surfaces',
    items: [
      { name: '--bg',         hex: '#000000', desc: 'Page (dark, default)' },
      { name: '--bg',         hex: '#ffffff', desc: 'Page (light invert)' },
      { name: '--bg-subtle',  hex: '#171717', desc: 'Subtle dark surface' },
      { name: '--bg-subtle',  hex: '#edf1f5', desc: 'Subtle light surface (cool grey)' },
    ],
  },
  {
    title: 'Foreground / Text',
    items: [
      { name: '--text-bold',    hex: '#ffffff', desc: 'Bold heading (dark)' },
      { name: '--text-regular', hex: '#cac5ca', desc: 'Body (dark)' },
      { name: '--text-subtle',  hex: '#79767a', desc: 'Subtle (dark)' },
      { name: '--text-bold',    hex: '#000000', desc: 'Bold heading (light)' },
      { name: '--text-regular', hex: '#313033', desc: 'Body (light)' },
      { name: '--text-subtle',  hex: '#605d62', desc: 'Subtle (light)' },
    ],
  },
  {
    title: 'Accents',
    items: [
      { name: '--bg-highlight / --purple', hex: '#584dff', desc: 'The single brand accent' },
      { name: '--dark-purple',             hex: '#100037', desc: 'Deep brand surface' },
    ],
  },
  {
    title: 'Status',
    items: [
      { name: '--text-error',   hex: '#ff6060', desc: 'Error (dark theme)' },
      { name: '--text-error',   hex: '#b60000', desc: 'Error (light theme)' },
      { name: '--swiper-theme', hex: '#007aff', desc: 'Carousel widget (Swiper)' },
    ],
  },
]

const TYPE_DISPLAY = [
  { label: 'Hero',       size: '17vw', weight: 240, lh: 0.9,  tracking: '-0.04em', sample: 'We make interfaces' },
  { label: 'Display XL', size: '13vw', weight: 240, lh: 0.92, tracking: '-0.03em', sample: 'How we work' },
  { label: 'Display L',  size: '9vw',  weight: 240, lh: 0.95, tracking: '-0.025em', sample: 'Selected work' },
  { label: 'Display M',  size: '7vw',  weight: 300, lh: 1.0,  tracking: '-0.02em', sample: 'About the studio' },
  { label: 'H1',         size: '5.5vw', weight: 300, lh: 1.02, tracking: '-0.015em', sample: 'Get in touch' },
  { label: 'H2',         size: '4.4vw', weight: 300, lh: 1.04, tracking: '-0.015em', sample: 'Featured projects' },
  { label: 'H3',         size: '3.4vw', weight: 300, lh: 1.08, tracking: '-0.01em',  sample: 'Process' },
]

const TYPE_BODY = [
  { label: 'Standfirst',     size: '2.4vw', weight: 300, lh: 1.18, sample: 'Since 2006, we’ve helped the most innovative startups and reputable brands design, build, and ship products worth talking about.' },
  { label: 'Body L',         size: '1.6vw', weight: 350, lh: 1.30, sample: 'A team of designers, engineers and strategists working from Victoria, BC. Selective, opinionated, fast.' },
  { label: 'Body',           size: '1.05vw', weight: 400, lh: 1.45, sample: 'We collaborate with category-defining companies on the products that move them forward — from a single feature to an entire flagship app.' },
  { label: 'UI / Caption',   size: '0.85vw', weight: 400, lh: 1.50, sample: 'We collaborate with category-defining companies on the products that move them forward.' },
  { label: 'Eyebrow',        size: '0.72vw', weight: 500, lh: 1.50, sample: 'A SELECTION OF OUR LATEST WORK', upper: true, tracking: '0.18em' },
]

const RADII = [
  { val: '0.2rem', token: '--border-radius-sm', use: 'Inputs, hairline pills' },
  { val: '0.8rem', token: '--border-radius',     use: 'Default — cards, buttons' },
  { val: '1.6rem', token: '--border-radius-lg',  use: 'Large cards, dialogs' },
  { val: '3rem',   token: '—',                   use: 'Media tiles' },
  { val: '5rem',   token: '—',                   use: 'Large chips' },
  { val: '999px',  token: 'pill',                use: 'Pills + circular' },
]

const SPACING_TOKENS = [
  { k: '--gutter-xs',         v: '0.8rem',         note: '8 px — micro spacing' },
  { k: '--component-gutter',  v: '1.2rem',         note: '12 px — inside components' },
  { k: '--gutter-sm',         v: '1.6rem',         note: '16 px — base unit' },
  { k: '--gutter (mobile)',   v: '1.6rem',         note: '16 px' },
  { k: '--gutter (desktop)',  v: '2.4rem',         note: '24 px — main page gutter' },
  { k: '--list-margin',       v: '2.4 → 4.8rem',   note: '24 → 48 px (mobile → desktop)' },
  { k: '--vertical-gutter',   v: '14 → 18rem',     note: '140 → 180 px between sections' },
  { k: '--top-offset',        v: '11 → 20rem',     note: '110 → 200 px page top inset' },
  { k: '--form-gap',          v: '4 → 6rem',       note: '40 → 60 px between form rows' },
  { k: '--button-padding',    v: '1.6rem',         note: '16 px — pill horizontal pad' },
]

const MOTION = [
  { name: 'micro',     d: '0.1s', use: 'active flicker, key feedback' },
  { name: 'fast',      d: '0.2s', use: 'button hover, border colour' },
  { name: 'standard',  d: '0.3s', use: 'opacity fades' },
  { name: 'considered',d: '0.4s', use: 'colour transitions, larger pills' },
  { name: 'reveal',    d: '0.6s', use: 'section reveals' },
  { name: 'shift',     d: '0.7s', use: 'background image / size shifts' },
]

const EASINGS = [
  { name: 'ease-in-out', curve: 'cubic-bezier(0.42, 0, 0.58, 1)',  use: 'Default for the live site' },
  { name: 'circ.out',    curve: 'cubic-bezier(0, 0.55, 0.45, 1)',  use: 'Reveals (used in our variants)' },
  { name: 'expo.out',    curve: 'cubic-bezier(0.16, 1, 0.3, 1)',   use: 'Logo intro (/c, /d)' },
  { name: 'power4.out',  curve: 'cubic-bezier(0.23, 1, 0.32, 1)',  use: 'Pill hover settle' },
]

// ---- PRIMITIVES -----------------------------------------------------
function Eyebrow({ children, color = TOKENS.textSubtle, mt = 0, mb = 16 }) {
  return (
    <div style={{
      fontFamily: "'Basis Grotesque Pro', sans-serif",
      fontSize: 11, fontWeight: 500, letterSpacing: '0.18em',
      textTransform: 'uppercase', color, marginTop: mt, marginBottom: mb,
    }}>{children}</div>
  )
}

function SectionMark({ index, label }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'baseline',
      gap: 24, paddingBottom: '4rem', borderBottom: `1px solid ${TOKENS.borderSubtle}`,
      marginBottom: '6rem',
    }}>
      <div style={{
        fontFamily: "'PP Eiko', serif",
        fontSize: '7vw', lineHeight: 0.9, fontWeight: 100,
        letterSpacing: '-0.03em', color: TOKENS.textBold,
      }}>{label}</div>
      <div style={{
        fontFamily: "'Basis Grotesque Pro', sans-serif",
        fontSize: 13, color: TOKENS.textSubtle, letterSpacing: '0.18em',
        textTransform: 'uppercase',
      }}>{index}</div>
    </div>
  )
}

function ColorRow({ items }) {
  // First item gets a tall presentation; rest get smaller
  return (
    <div style={{
      display: 'grid', gap: 8,
      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    }}>
      {items.map((c, i) => {
        const isLight = ['#ffffff', '#edf1f5', '#cac5ca', '#c7c7c7'].includes(c.hex.toLowerCase())
        return (
          <div key={`${c.name}-${i}`} style={{
            display: 'flex', flexDirection: 'column', gap: 12,
            padding: 18, background: TOKENS.bgSubtle, borderRadius: 8,
            border: `1px solid ${TOKENS.borderSubtle}`,
          }}>
            <div style={{
              height: 130, borderRadius: 6, background: c.hex,
              display: 'flex', alignItems: 'flex-end', padding: 14,
            }}>
              <code style={{
                fontFamily: 'ui-monospace, SF Mono, monospace',
                fontSize: 12, color: isLight ? '#000' : '#fff', opacity: 0.9, fontWeight: 500,
              }}>{c.hex.toUpperCase()}</code>
            </div>
            <div>
              <div style={{
                fontFamily: 'ui-monospace, SF Mono, monospace', fontSize: 12,
                color: TOKENS.textBold, marginBottom: 4,
              }}>{c.name}</div>
              <div style={{
                fontFamily: "'Basis Grotesque Pro', sans-serif", fontSize: 12,
                color: TOKENS.textSubtle,
              }}>{c.desc}</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ---- HERO -----------------------------------------------------------
function Hero() {
  return (
    <section style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      justifyContent: 'space-between', padding: '24px 32px 48px',
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        gap: 24,
      }}>
        <div style={{
          fontFamily: "'PP Eiko', serif",
          fontSize: 22, lineHeight: 1, letterSpacing: '-0.02em', fontWeight: 100,
        }}>metalab</div>
        <Eyebrow mb={0}>Design System / Live spec</Eyebrow>
      </div>

      <div>
        <div style={{
          fontFamily: "'PP Eiko', serif",
          fontSize: 'clamp(72px, 17vw, 280px)', lineHeight: 0.85, fontWeight: 100,
          letterSpacing: '-0.04em', color: TOKENS.textBold,
        }}>
          design<br/>system<span style={{ color: TOKENS.highlight }}>.</span>
        </div>
        <div style={{
          maxWidth: '60ch', marginTop: 32,
          fontFamily: "'Basis Grotesque Pro', sans-serif",
          fontSize: 'clamp(15px, 1.1vw, 19px)', lineHeight: 1.45, fontWeight: 400,
          color: TOKENS.textRegular,
        }}>
          A living token map extracted from the production CSS that powers
          metalab.com — home, what-we-do, about, blog, contact. Two
          typefaces, one accent, hairline rules. Use this as the reference
          when building anything that should feel like the studio.
        </div>
      </div>

      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        gap: 24,
      }}>
        <div style={{
          fontFamily: 'ui-monospace, SF Mono, monospace', fontSize: 11,
          color: TOKENS.textSubtle,
        }}>VICTORIA, BC · EST. 2006 · BLACK / WHITE / #584DFF</div>
        <div style={{
          fontFamily: 'ui-monospace, SF Mono, monospace', fontSize: 11,
          color: TOKENS.textSubtle,
        }}>↓ scroll</div>
      </div>
    </section>
  )
}

// ---- TYPE SPECIMENS -------------------------------------------------
function TypeSpecimen({ label, size, weight, lh, tracking, sample, family, upper }) {
  return (
    <div style={{
      borderTop: `1px solid ${TOKENS.borderSubtle}`,
      padding: '40px 0',
      display: 'grid', gridTemplateColumns: '160px 1fr', gap: 24,
    }}>
      <div style={{
        fontFamily: "'Basis Grotesque Pro', sans-serif",
        fontSize: 11, color: TOKENS.textSubtle, letterSpacing: '0.06em',
        textTransform: 'uppercase', paddingTop: 6,
      }}>
        <div style={{ color: TOKENS.textBold, fontWeight: 500, marginBottom: 8, letterSpacing: '0.12em' }}>{label}</div>
        <div>{size}</div>
        <div>w {weight} / lh {lh}</div>
        {tracking && <div>{tracking}</div>}
      </div>
      <div style={{
        fontFamily: family,
        fontSize: size, fontWeight: weight, lineHeight: lh,
        letterSpacing: tracking || '0',
        color: TOKENS.textBold,
        textTransform: upper ? 'uppercase' : 'none',
        overflow: 'hidden',
      }}>{sample}</div>
    </div>
  )
}

// ---- BUTTONS DEMO ---------------------------------------------------
function ButtonsRow() {
  const [hover, setHover] = useState(null)
  const Btn = ({ id, label, height, kind = 'menu' }) => {
    const isHover = hover === id
    if (kind === 'cta') {
      const padX = isHover ? '14px' : `${(height - 14) / 2}px`
      return (
        <button
          type="button"
          onMouseEnter={() => setHover(id)}
          onMouseLeave={() => setHover(null)}
          style={{
            all: 'unset',
            display: 'inline-flex', flexDirection: 'row-reverse', alignItems: 'center',
            justifyContent: 'flex-start',
            gap: isHover ? '8px' : '0px',
            height, width: isHover ? 'auto' : `${height}px`,
            paddingLeft: padX, paddingRight: `${(height - 14) / 2}px`,
            borderRadius: 999,
            background: isHover ? 'transparent' : 'rgba(255,255,255,0.08)',
            border: `1px solid ${isHover ? 'rgba(255,255,255,0.9)' : 'transparent'}`,
            color: '#fff',
            fontFamily: "'Basis Grotesque Pro', sans-serif", fontSize: 13,
            cursor: 'pointer', overflow: 'hidden',
            transition: 'background 0.4s cubic-bezier(0.23,1,0.32,1), border-color 0.4s, gap 0.4s, padding-left 0.4s, width 0.4s',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden style={{ display: 'block' }}>
            <rect x="3" y="5" width="18" height="14" rx="1.5" stroke="#fff" strokeWidth="1.5" />
            <path d="M3.8 6.3L12 13L20.2 6.3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <span style={{ maxWidth: isHover ? 200 : 0, opacity: isHover ? 1 : 0, overflow: 'hidden', whiteSpace: 'nowrap', transition: 'max-width 0.4s, opacity 0.4s' }}>
            {label}
          </span>
        </button>
      )
    }
    return (
      <button
        type="button"
        onMouseEnter={() => setHover(id)}
        onMouseLeave={() => setHover(null)}
        style={{
          all: 'unset',
          height,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          padding: '0 16px', borderRadius: 999,
          background: isHover ? 'transparent' : 'rgba(255,255,255,0.08)',
          border: `1px solid ${isHover ? 'rgba(255,255,255,0.9)' : 'transparent'}`,
          color: '#fff',
          fontFamily: "'Basis Grotesque Pro', sans-serif", fontSize: 13,
          cursor: 'pointer',
          transition: 'background 0.2s ease-in-out, border-color 0.2s ease-in-out',
        }}
      >{label}</button>
    )
  }
  return (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
      <Btn id="m1" label="Menu" height={24} />
      <Btn id="m2" label="Menu" height={32} />
      <Btn id="m3" label="Menu" height={36} />
      <Btn id="cta" label="Get in Touch" height={36} kind="cta" />
      <Btn id="filled" label="Filled action" height={36} />
    </div>
  )
}

// ---- MOTION DEMO ----------------------------------------------------
function MotionDemo() {
  const [t, setT] = useState(false)
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'stretch' }}>
      {EASINGS.map((e) => (
        <div key={e.name} style={{
          padding: 24, background: TOKENS.bgSubtle, borderRadius: 8,
          border: `1px solid ${TOKENS.borderSubtle}`,
        }}>
          <Eyebrow mb={12}>Easing</Eyebrow>
          <div style={{
            fontFamily: "'PP Eiko', serif", fontSize: 28, fontWeight: 100, lineHeight: 1,
            letterSpacing: '-0.01em', color: TOKENS.textBold, marginBottom: 8,
          }}>{e.name}</div>
          <div style={{
            fontFamily: "'Basis Grotesque Pro', sans-serif", fontSize: 13,
            color: TOKENS.textRegular, marginBottom: 18,
          }}>{e.use}</div>
          <code style={{
            fontFamily: 'ui-monospace, SF Mono, monospace', fontSize: 11,
            color: TOKENS.textSubtle, display: 'block', marginBottom: 18,
          }}>{e.curve}</code>
          <div
            onMouseEnter={() => setT(e.name)}
            onMouseLeave={() => setT(false)}
            style={{
              height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 999,
              cursor: 'pointer', position: 'relative', overflow: 'hidden',
            }}
          >
            <div style={{
              position: 'absolute', inset: 0,
              transform: t === e.name ? 'translateX(0)' : 'translateX(-100%)',
              background: TOKENS.highlight,
              transition: `transform 1.2s ${e.curve}`,
            }}/>
          </div>
          <div style={{ marginTop: 8, fontFamily: "'Basis Grotesque Pro', sans-serif", fontSize: 11, color: TOKENS.textWeak }}>
            hover to play
          </div>
        </div>
      ))}
    </div>
  )
}

// ---- LAYOUT ---------------------------------------------------------
function HeaderBar() {
  const navigate = useNavigate()
  const Pill = ({ label, path, isCurrent }) => (
    <button
      type="button"
      onClick={() => path && navigate(path)}
      style={{
        all: 'unset',
        padding: '5px 11px', borderRadius: 999,
        fontFamily: "'Basis Grotesque Pro', sans-serif", fontSize: 11,
        background: isCurrent ? 'rgba(255,255,255,0.14)' : 'transparent',
        border: `1px solid ${isCurrent ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.10)'}`,
        color: TOKENS.textRegular, cursor: 'pointer',
        transition: 'background 0.2s, border-color 0.2s',
      }}
      onMouseEnter={(e) => {
        if (!isCurrent) {
          e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'
        }
      }}
      onMouseLeave={(e) => {
        if (!isCurrent) {
          e.currentTarget.style.background = 'transparent'
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)'
        }
      }}
    >{label}</button>
  )
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0,
      padding: '14px 24px', zIndex: 50,
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      background: 'rgba(0,0,0,0.7)',
      borderBottom: `1px solid ${TOKENS.borderSubtle}`,
      display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
        <span style={{ fontFamily: "'PP Eiko', serif", fontSize: 16, letterSpacing: '-0.02em', fontWeight: 100 }}>metalab</span>
        <span style={{ fontFamily: 'ui-monospace, SF Mono, monospace', fontSize: 10, color: TOKENS.textSubtle }}>/ design system</span>
      </div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <Pill label="v.1" path="/a" />
        <Pill label="v.2" path="/b" />
        <Pill label="v.3 (Best)" path="/c" />
        <Pill label="v.4" path="/d" />
        <span style={{ width: 1, height: 16, background: TOKENS.borderSubtle, margin: '0 4px' }} />
        <Pill label="design system" isCurrent />
      </div>
    </div>
  )
}

// ---- PAGE -----------------------------------------------------------
export default function DesignSystem() {
  const wrapperRef = useRef(null)
  const [progress, setProgress] = useState(0)

  // Page-scroll progress bar (purple thin line at the very top).
  useEffect(() => {
    const onScroll = () => {
      const el = wrapperRef.current
      if (!el) return
      const max = el.scrollHeight - el.clientHeight
      setProgress(max > 0 ? el.scrollTop / max : 0)
    }
    const el = wrapperRef.current
    el?.addEventListener('scroll', onScroll, { passive: true })
    return () => el?.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <>
      {/* progress bar at very top */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: 2,
        zIndex: 60, background: 'rgba(255,255,255,0.04)',
      }}>
        <div style={{
          height: '100%', width: `${Math.max(0.005, progress) * 100}%`,
          background: TOKENS.highlight,
          transition: 'width 0.05s linear',
        }}/>
      </div>

      <HeaderBar />

      <div
        ref={wrapperRef}
        style={{
          position: 'fixed', inset: 0,
          background: TOKENS.bg, color: TOKENS.textBold,
          overflow: 'auto', overflowX: 'hidden',
          fontFamily: "'Basis Grotesque Pro', sans-serif",
          paddingTop: 56,
        }}
      >
        <Hero />

        <main style={{ maxWidth: 1440, margin: '0 auto', padding: '0 32px 240px' }}>
          {/* 01 — COLOR */}
          <section style={{ marginTop: '12rem' }}>
            <SectionMark index="01 / Color" label="Black, white, and one purple." />

            <div style={{
              display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 32, marginBottom: 80,
            }}>
              {/* Hero accent — the single brand purple */}
              <div style={{
                background: TOKENS.highlight, borderRadius: 12,
                padding: 36, minHeight: 320,
                display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
              }}>
                <Eyebrow color="rgba(255,255,255,0.7)" mb={0}>The accent</Eyebrow>
                <div>
                  <div style={{
                    fontFamily: "'PP Eiko', serif", fontSize: 64, fontWeight: 100,
                    lineHeight: 0.95, letterSpacing: '-0.02em', color: '#fff',
                  }}>#584DFF</div>
                  <div style={{
                    marginTop: 16, fontFamily: "'Basis Grotesque Pro', sans-serif",
                    fontSize: 14, color: 'rgba(255,255,255,0.85)', maxWidth: 360,
                  }}>
                    The only colour that isn’t neutral. Used surgically — one underline,
                    one button, one progress bar — never two on screen at the same time.
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  { hex: '#000000', tag: 'fg / page' },
                  { hex: '#ffffff', tag: 'bg / fg invert' },
                  { hex: '#171717', tag: 'subtle dark' },
                  { hex: '#edf1f5', tag: 'subtle light' },
                  { hex: '#100037', tag: 'dark purple' },
                  { hex: '#cac5ca', tag: 'text regular dark' },
                ].map((c) => (
                  <div key={c.hex} style={{
                    aspectRatio: '1.4 / 1', borderRadius: 8, background: c.hex,
                    border: `1px solid ${TOKENS.borderSubtle}`, padding: 12,
                    display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                    color: ['#ffffff','#edf1f5','#cac5ca'].includes(c.hex) ? '#000' : '#fff',
                  }}>
                    <code style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, opacity: 0.9 }}>{c.hex.toUpperCase()}</code>
                    <span style={{ fontFamily: "'Basis Grotesque Pro', sans-serif", fontSize: 11, opacity: 0.85 }}>{c.tag}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Token groups */}
            {COLOR_GROUPS.map((g) => (
              <div key={g.title} style={{ marginBottom: 56 }}>
                <Eyebrow mb={20}>{g.title}</Eyebrow>
                <ColorRow items={g.items} />
              </div>
            ))}
          </section>

          {/* 02 — TYPOGRAPHY */}
          <section style={{ marginTop: '14rem' }}>
            <SectionMark index="02 / Typography" label="Two voices." />

            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1,
              background: TOKENS.borderSubtle, marginBottom: 80,
            }}>
              <div style={{ background: TOKENS.bg, padding: 36 }}>
                <Eyebrow>Display</Eyebrow>
                <div style={{
                  fontFamily: "'PP Eiko', serif", fontSize: 96, fontWeight: 100,
                  lineHeight: 0.92, letterSpacing: '-0.02em',
                }}>PP Eiko</div>
                <div style={{
                  marginTop: 24, fontFamily: "'Basis Grotesque Pro', sans-serif",
                  fontSize: 14, lineHeight: 1.5, color: TOKENS.textRegular, maxWidth: 420,
                }}>
                  Thin, condensed display serif. Weights observed: <strong>240</strong> and <strong>300</strong>.
                  Used for hero, h1–h4 and any time the page needs to feel slow and confident.
                  Never used at body sizes.
                </div>
              </div>
              <div style={{ background: TOKENS.bg, padding: 36 }}>
                <Eyebrow>Body / UI</Eyebrow>
                <div style={{
                  fontFamily: "'Basis Grotesque Pro', sans-serif",
                  fontSize: 96, fontWeight: 350, lineHeight: 0.95, letterSpacing: '-0.01em',
                }}>Basis Grotesque</div>
                <div style={{
                  marginTop: 24, fontFamily: "'Basis Grotesque Pro', sans-serif",
                  fontSize: 14, lineHeight: 1.5, color: TOKENS.textRegular, maxWidth: 420,
                }}>
                  Workhorse grotesque. Weights observed: <strong>300, 350, 400, 500</strong>.
                  Body, buttons, captions, eyebrows. 350 is the most-used variant — sits between
                  regular and book.
                </div>
              </div>
            </div>

            <Eyebrow mt={64} mb={0}>Display scale — PP Eiko</Eyebrow>
            <div>
              {TYPE_DISPLAY.map((t) => (
                <TypeSpecimen key={t.label} {...t} family={"'PP Eiko', serif"} />
              ))}
            </div>

            <Eyebrow mt={80} mb={0}>Body / UI scale — Basis Grotesque Pro</Eyebrow>
            <div>
              {TYPE_BODY.map((t) => (
                <TypeSpecimen key={t.label} {...t} family={"'Basis Grotesque Pro', sans-serif"} />
              ))}
            </div>
          </section>

          {/* 03 — RADIUS */}
          <section style={{ marginTop: '14rem' }}>
            <SectionMark index="03 / Radius" label="A doubling 0.8 base." />
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16,
            }}>
              {RADII.map((r) => (
                <div key={r.token + r.val} style={{
                  padding: 24, border: `1px solid ${TOKENS.borderSubtle}`, borderRadius: 8,
                  display: 'flex', flexDirection: 'column', gap: 16,
                }}>
                  <div style={{
                    aspectRatio: '1.6 / 1', background: TOKENS.highlight,
                    borderRadius: r.val,
                  }}/>
                  <div>
                    <div style={{
                      fontFamily: 'ui-monospace, monospace', fontSize: 12, color: TOKENS.textBold,
                    }}>{r.token}</div>
                    <div style={{
                      fontFamily: "'Basis Grotesque Pro', sans-serif", fontSize: 11,
                      color: TOKENS.textSubtle, marginTop: 4,
                    }}>{r.val} · {r.use}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 04 — SPACING */}
          <section style={{ marginTop: '14rem' }}>
            <SectionMark index="04 / Spacing" label="Rhythm, not grid." />
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0,
              borderTop: `1px solid ${TOKENS.borderSubtle}`,
            }}>
              {SPACING_TOKENS.map((s) => (
                <div key={s.k} style={{
                  padding: '20px 24px',
                  borderBottom: `1px solid ${TOKENS.borderSubtle}`,
                  borderRight: `1px solid ${TOKENS.borderSubtle}`,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                  gap: 12,
                }}>
                  <code style={{
                    fontFamily: 'ui-monospace, monospace', fontSize: 12, color: TOKENS.textBold,
                  }}>{s.k}</code>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{
                      fontFamily: 'ui-monospace, monospace', fontSize: 12, color: TOKENS.textBold,
                    }}>{s.v}</div>
                    <div style={{
                      fontFamily: "'Basis Grotesque Pro', sans-serif", fontSize: 11,
                      color: TOKENS.textSubtle,
                    }}>{s.note}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 05 — BUTTONS */}
          <section style={{ marginTop: '14rem' }}>
            <SectionMark index="05 / Buttons" label="One pill, three sizes, surgical hover." />
            <div style={{ marginBottom: 48 }}>
              <ButtonsRow />
              <div style={{
                marginTop: 28, fontFamily: "'Basis Grotesque Pro', sans-serif", fontSize: 14,
                color: TOKENS.textRegular, lineHeight: 1.5, maxWidth: 640,
              }}>
                Idle: filled glass <code style={{ background: TOKENS.bgSubtle, padding: '2px 6px', borderRadius: 4 }}>rgba(255,255,255,.08)</code> with no border.
                Hover: background fades to transparent and a 1px white border appears. The "Get in Touch" envelope CTA grows
                horizontally from right → left, the icon stays anchored to the right edge.
              </div>
            </div>

            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1,
              background: TOKENS.borderSubtle, marginBottom: 48,
            }}>
              {[
                { label: '24px', sub: 'sm — used at top of nav (metalab.com top bar)' },
                { label: '32px', sub: 'md — primary in body content' },
                { label: '36px', sub: 'lg — hero CTA' },
              ].map((b) => (
                <div key={b.label} style={{ background: TOKENS.bg, padding: 24 }}>
                  <div style={{
                    fontFamily: "'PP Eiko', serif", fontSize: 32, fontWeight: 100, lineHeight: 1,
                    letterSpacing: '-0.01em', marginBottom: 6,
                  }}>{b.label}</div>
                  <div style={{
                    fontFamily: "'Basis Grotesque Pro', sans-serif", fontSize: 12, color: TOKENS.textSubtle,
                  }}>{b.sub}</div>
                </div>
              ))}
            </div>
          </section>

          {/* 06 — MOTION */}
          <section style={{ marginTop: '14rem' }}>
            <SectionMark index="06 / Motion" label="Settle, don’t bounce." />
            <MotionDemo />

            <Eyebrow mt={64} mb={20}>Duration palette</Eyebrow>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1,
              background: TOKENS.borderSubtle,
            }}>
              {MOTION.map((d) => (
                <div key={d.name} style={{ background: TOKENS.bg, padding: 22 }}>
                  <div style={{
                    fontFamily: "'PP Eiko', serif", fontSize: 36, fontWeight: 100,
                    lineHeight: 1, letterSpacing: '-0.01em',
                  }}>{d.d}</div>
                  <div style={{
                    fontFamily: "'Basis Grotesque Pro', sans-serif", fontSize: 12,
                    color: TOKENS.textBold, marginTop: 6, fontWeight: 500,
                  }}>{d.name}</div>
                  <div style={{
                    fontFamily: "'Basis Grotesque Pro', sans-serif", fontSize: 11,
                    color: TOKENS.textSubtle, marginTop: 4, lineHeight: 1.4,
                  }}>{d.use}</div>
                </div>
              ))}
            </div>
          </section>

          {/* 07 — FOOTER MANIFESTO */}
          <section style={{ marginTop: '20rem' }}>
            <div style={{
              fontFamily: "'PP Eiko', serif", fontSize: '11vw', lineHeight: 0.9, fontWeight: 100,
              letterSpacing: '-0.03em', maxWidth: '20ch',
            }}>
              We make<br/>interfaces<span style={{ color: TOKENS.highlight }}>.</span>
            </div>
            <div style={{
              marginTop: 48, fontFamily: "'Basis Grotesque Pro', sans-serif",
              fontSize: 14, color: TOKENS.textSubtle, lineHeight: 1.5, maxWidth: '54ch',
            }}>
              Tokens scraped <em>{new Date().toISOString().slice(0, 10)}</em> from
              <a href="https://www.metalab.com/" target="_blank" rel="noreferrer"
                 style={{ color: TOKENS.textBold, textDecoration: 'none', borderBottom: `1px solid ${TOKENS.textBold}`, marginLeft: 6 }}>metalab.com</a>.
              CSS file ID: <code style={{ background: TOKENS.bgSubtle, padding: '2px 6px', borderRadius: 4, fontSize: 12 }}>15230c8daab2ecff.css</code>.
              Pages parsed: home, what-we-do, about, blog, contact.
            </div>
          </section>
        </main>
      </div>
    </>
  )
}
