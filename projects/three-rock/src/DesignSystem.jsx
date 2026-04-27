import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

// =====================================================================
// metalab.com design system — extracted from production CSS
// =====================================================================
// Sources: https://www.metalab.com/_next/static/css/15230c8daab2ecff.css
// (home, what-we-do, about, blog, contact share the same stylesheet).
//
// Below are the actual CSS custom properties + raw values used on the
// live site, organised into a single browseable specimen page so we
// can mirror their system 1:1 in our own variants.
// =====================================================================

const COLORS_LIGHT = [
  { name: '--bg',                  hex: '#ffffff', use: 'page background (light theme)' },
  { name: '--fg',                  hex: '#000000', use: 'foreground / primary' },
  { name: '--bg-subtle',           hex: '#edf1f5', use: 'subtle surface' },
  { name: '--bg-highlight',        hex: '#584dff', use: 'accent / highlight bg (Metalab purple)' },
  { name: '--text-bold',           hex: '#000000', use: 'bold heading text' },
  { name: '--text-regular',        hex: '#313033', use: 'body text' },
  { name: '--text-subtle',         hex: '#605d62', use: 'subtle / secondary text' },
  { name: '--text-error',          hex: '#b60000', use: 'error text' },
  { name: '--border-bold',         hex: '#000000', use: 'bold border' },
  { name: '--border-subtle',       hex: '#c7c7c7', use: 'subtle border' },
  { name: '--border-highlight',    hex: '#584dff', use: 'accent border' },
  { name: '--border-error',        hex: '#b60000', use: 'error border' },
]

const COLORS_DARK = [
  { name: '--bg',                  hex: '#000000', use: 'page background (dark theme)' },
  { name: '--fg',                  hex: '#ffffff', use: 'foreground / primary' },
  { name: '--bg-subtle',           hex: '#171717', use: 'subtle surface' },
  { name: '--bg-highlight',        hex: '#584dff', use: 'accent / highlight bg' },
  { name: '--text-bold',           hex: '#ffffff', use: 'bold heading text' },
  { name: '--text-regular',        hex: '#cac5ca', use: 'body text' },
  { name: '--text-subtle',         hex: '#79767a', use: 'subtle / secondary text' },
  { name: '--text-error',          hex: '#ff6060', use: 'error text' },
  { name: '--border-bold',         hex: '#ffffff', use: 'bold border' },
  { name: '--border-subtle',       hex: '#313033', use: 'subtle border' },
  { name: '--border-highlight',    hex: '#584dff', use: 'accent border' },
  { name: '--border-error',        hex: '#ff6060', use: 'error border' },
]

const COLORS_BRAND = [
  { name: 'Purple',     hex: '#584dff', label: '--purple, --bg-highlight (the brand accent)' },
  { name: 'Dark Purple',hex: '#100037', label: '--dark-purple' },
  { name: 'Cool Grey',  hex: '#edf1f5', label: '--cool-grey' },
  { name: 'Mid Grey',   hex: '#c7c7c7', label: '--mid-grey' },
  { name: 'Black',      hex: '#000000', label: '--black' },
  { name: 'White',      hex: '#ffffff', label: '--white' },
  { name: 'Off-white',  hex: '#fffbff', label: 'subtle off-white surface' },
]

const TYPE_DISPLAY = [
  { label: 'Hero (272px / 27.2rem)', size: '27.2rem', weight: 240, lh: '0.85', tracking: '-0.04em', sample: 'We make' },
  { label: 'Display XL (220px)',     size: '22rem',   weight: 240, lh: '0.85', tracking: '-0.03em', sample: 'interfaces' },
  { label: 'Display L (163.2px)',    size: '16.32rem',weight: 240, lh: '0.9',  tracking: '-0.03em', sample: 'How we work' },
  { label: 'Display M (140px)',      size: '14rem',   weight: 240, lh: '0.95', tracking: '-0.02em', sample: 'Selected work' },
  { label: 'Display S (120px)',      size: '12rem',   weight: 300, lh: '1',    tracking: '-0.02em', sample: 'About' },
  { label: 'H1 (110px)',             size: '11rem',   weight: 300, lh: '1',    tracking: '-0.015em', sample: 'Get in touch' },
  { label: 'H2 (109px)',             size: '10.9rem', weight: 300, lh: '1',    tracking: '-0.015em', sample: 'Studio' },
  { label: 'H3 (88px)',              size: '8.8rem',  weight: 300, lh: '1.04', tracking: '-0.015em', sample: 'Featured' },
  { label: 'H4 (84px)',              size: '8.4rem',  weight: 300, lh: '1.05', tracking: '-0.01em',  sample: 'Process' },
]

const TYPE_BODY = [
  { label: 'XL (68px)',  size: '6.8rem', weight: 300, lh: '1.10', sample: 'A standfirst paragraph that sets the tone for the article.' },
  { label: 'L (64px)',   size: '6.4rem', weight: 300, lh: '1.14', sample: 'Heading line in the body of an article.' },
  { label: 'M (56px)',   size: '5.6rem', weight: 350, lh: '1.16', sample: 'Section heading inside a long-form page.' },
  { label: 'Body L (44px)', size: '4.4rem', weight: 350, lh: '1.18', sample: 'Lead paragraph used at the top of cases studies.' },
  { label: 'Body (40px)', size: '4rem',   weight: 400, lh: '1.20', sample: 'Standard reading paragraph in case study body.' },
  { label: 'Body M (36px)', size: '3.6rem', weight: 400, lh: '1.25', sample: 'Default paragraph body used across most pages.' },
  { label: 'Body S (32px)', size: '3.2rem', weight: 400, lh: '1.30', sample: 'Smaller paragraph for captions and meta.' },
  { label: 'UI L (28px)',  size: '2.8rem', weight: 400, lh: '1.40', sample: 'Navigation labels, large UI text.' },
  { label: 'UI M (26px)',  size: '2.6rem', weight: 400, lh: '1.45', sample: 'Standard UI text in components.' },
  { label: 'UI (24px)',    size: '2.4rem', weight: 400, lh: '1.50', sample: 'Buttons, form fields, inputs.' },
  { label: 'UI S (22px)',  size: '2.2rem', weight: 500, lh: '1.50', sample: 'Tight UI labels, breadcrumbs.' },
  { label: 'Caption (20px)', size: '2rem', weight: 500, lh: '1.50', sample: 'Captions, footnotes, meta text.' },
  { label: 'Tag (18px)',     size: '1.8rem',weight: 500, lh: '1.51', sample: 'Eyebrow tags, sub-labels.' },
  { label: 'Tag S (16px)',   size: '1.6rem',weight: 500, lh: '1.50', sample: 'Small uppercase tags.' },
  { label: 'Mono (14px)',    size: '1.4rem',weight: 400, lh: '1.40', sample: 'Smallest meta / code-like text.' },
  { label: 'Mono S (12px)',  size: '1.2rem',weight: 400, lh: '1.30', sample: 'Footer fine-print only.' },
]

const RADII = [
  { name: '--border-radius-sm', val: '0.2rem',  px: '2px',  use: 'inputs, hairline pills' },
  { name: '--border-radius',    val: '0.8rem',  px: '8px',  use: 'default radius for cards, buttons' },
  { name: '--border-radius-lg', val: '1.6rem',  px: '16px', use: 'large cards, dialogs' },
  { name: '— (tile)',           val: '3rem',    px: '30px', use: 'media tiles, image cards' },
  { name: '— (chip)',           val: '5rem',    px: '50px', use: 'large chips' },
  { name: '— (full)',           val: '100rem',  px: '∞',    use: 'pill / circular' },
]

const EASING = [
  { name: 'ease-in-out',   curve: 'cubic-bezier(0.42, 0, 0.58, 1)', use: 'most transitions on metalab.com' },
  { name: 'circ.out',      curve: 'cubic-bezier(0, 0.55, 0.45, 1)', use: 'reveals (we use this in our variants)' },
  { name: 'expo.out',      curve: 'cubic-bezier(0.16, 1, 0.3, 1)',  use: 'logo intro on /c /d' },
  { name: 'power4.out',    curve: 'cubic-bezier(0.23, 1, 0.32, 1)', use: 'nav pill hovers' },
]

const DURATIONS = [
  { ms: 100, label: '0.1s — micro feedback (active state flick)' },
  { ms: 200, label: '0.2s — button hover, border colour' },
  { ms: 300, label: '0.3s — opacity fades' },
  { ms: 400, label: '0.4s — colour transitions, larger pills' },
  { ms: 600, label: '0.6s — section reveals' },
  { ms: 700, label: '0.7s — background image / size shifts' },
]

const SPACING = [
  { name: '--gutter-xs',       val: '0.8rem',  px: '8px' },
  { name: '--gutter-sm',       val: '1.6rem',  px: '16px' },
  { name: '--component-gutter',val: '1.2rem',  px: '12px' },
  { name: '--gutter (mobile)', val: '1.6rem',  px: '16px' },
  { name: '--gutter (desktop)',val: '2.4rem',  px: '24px' },
  { name: '--list-margin (m)', val: '2.4rem',  px: '24px' },
  { name: '--list-margin (d)', val: '4.8rem',  px: '48px' },
  { name: '--vertical-gutter', val: '14rem / 18rem', px: '140 / 180px' },
  { name: '--top-offset',      val: '11rem / 20rem', px: '110 / 200px' },
  { name: '--form-gap',        val: '4rem / 6rem',   px: '40 / 60px' },
  { name: '--button-padding',  val: '1.6rem',  px: '16px' },
]

const BUTTON_HEIGHTS = [
  { name: '--button-height (sm)',   val: '2.4rem', px: '24px' },
  { name: '--button-height-md',     val: '3.2rem', px: '32px' },
  { name: '--button-height-lg',     val: '3.6rem', px: '36px' },
]

// =====================================================================
// Atoms
// =====================================================================
function Section({ title, kicker, children }) {
  return (
    <section style={{ marginBottom: '120px' }}>
      <div style={{ marginBottom: '32px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
        {kicker && (
          <div style={{
            fontFamily: 'Basis Grotesque Pro, sans-serif',
            fontSize: 11, fontWeight: 500, letterSpacing: '0.18em',
            textTransform: 'uppercase', color: 'var(--text-subtle)', marginBottom: 8,
          }}>{kicker}</div>
        )}
        <h2 style={{
          fontFamily: 'PP Eiko, serif',
          fontSize: '4.4rem', lineHeight: 1, letterSpacing: '-0.02em',
          fontWeight: 100, color: 'var(--text-bold)', margin: 0,
        }}>{title}</h2>
      </div>
      {children}
    </section>
  )
}

function Swatch({ hex, name, use }) {
  const isLight = ['#ffffff', '#fffbff', '#edf1f5', '#cac5ca', '#c7c7c7'].includes(hex.toLowerCase())
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{
        height: 96, borderRadius: 8, background: hex,
        border: '1px solid var(--border-subtle)',
        display: 'flex', alignItems: 'flex-end', padding: 12,
      }}>
        <code style={{
          fontFamily: 'ui-monospace, SF Mono, monospace', fontSize: 11,
          color: isLight ? '#000' : '#fff', opacity: 0.85,
        }}>{hex}</code>
      </div>
      <div>
        <div style={{ fontFamily: 'Basis Grotesque Pro, sans-serif', fontSize: 13, fontWeight: 500, color: 'var(--text-bold)' }}>{name}</div>
        {use && <div style={{ fontFamily: 'Basis Grotesque Pro, sans-serif', fontSize: 12, color: 'var(--text-subtle)' }}>{use}</div>}
      </div>
    </div>
  )
}

function TypeRow({ size, weight, lh, tracking, sample, label, family = 'Basis Grotesque Pro, sans-serif' }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '180px 1fr', gap: 24,
      paddingBlock: '20px 18px', borderBottom: '1px solid var(--border-subtle)',
      alignItems: 'baseline',
    }}>
      <div style={{ fontFamily: 'Basis Grotesque Pro, sans-serif', fontSize: 12, color: 'var(--text-subtle)', lineHeight: 1.4 }}>
        <div style={{ fontWeight: 500, color: 'var(--text-bold)' }}>{label}</div>
        <div>{size} · w{weight} · lh {lh}{tracking ? ` · ${tracking}` : ''}</div>
      </div>
      <div style={{
        fontFamily: family, fontSize: size, fontWeight: weight,
        lineHeight: lh, letterSpacing: tracking || '0',
        color: 'var(--text-bold)', overflowWrap: 'anywhere',
      }}>
        {sample}
      </div>
    </div>
  )
}

function RadiusBlock({ name, val, px, use }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{
        height: 96, background: 'var(--bg-highlight)', borderRadius: val,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontFamily: 'Basis Grotesque Pro, sans-serif', fontSize: 11,
      }}>{val}</div>
      <div style={{ fontFamily: 'Basis Grotesque Pro, sans-serif', fontSize: 12, color: 'var(--text-subtle)' }}>
        <div style={{ fontWeight: 500, color: 'var(--text-bold)' }}>{name}</div>
        <div>{val} ({px})</div>
        <div>{use}</div>
      </div>
    </div>
  )
}

function MetaPill({ children, isCurrent = false, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        all: 'unset',
        padding: '6px 14px', borderRadius: 999,
        fontFamily: 'Basis Grotesque Pro, sans-serif', fontSize: 12,
        background: isCurrent ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.06)',
        border: `1px solid ${isCurrent ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.10)'}`,
        color: 'rgba(245,246,248,0.92)', cursor: 'pointer',
        backdropFilter: 'blur(4px)',
      }}
    >
      {children}
    </button>
  )
}

// =====================================================================
// Page
// =====================================================================
export default function DesignSystem() {
  const navigate = useNavigate()
  const [theme, setTheme] = useState('dark')

  // Apply theme tokens to the page root
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'light') {
      root.style.setProperty('--bg', '#ffffff')
      root.style.setProperty('--fg', '#000000')
      root.style.setProperty('--bg-subtle', '#edf1f5')
      root.style.setProperty('--text-bold', '#000000')
      root.style.setProperty('--text-regular', '#313033')
      root.style.setProperty('--text-subtle', '#605d62')
      root.style.setProperty('--border-bold', '#000000')
      root.style.setProperty('--border-subtle', '#c7c7c7')
      root.style.setProperty('--bg-highlight', '#584dff')
      root.style.setProperty('--border-highlight', '#584dff')
    } else {
      root.style.setProperty('--bg', '#000000')
      root.style.setProperty('--fg', '#ffffff')
      root.style.setProperty('--bg-subtle', '#171717')
      root.style.setProperty('--text-bold', '#ffffff')
      root.style.setProperty('--text-regular', '#cac5ca')
      root.style.setProperty('--text-subtle', '#79767a')
      root.style.setProperty('--border-bold', '#ffffff')
      root.style.setProperty('--border-subtle', '#313033')
      root.style.setProperty('--bg-highlight', '#584dff')
      root.style.setProperty('--border-highlight', '#584dff')
    }
  }, [theme])

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'var(--bg)', color: 'var(--text-bold)',
      overflow: 'auto', overflowX: 'hidden',
      fontFamily: 'Basis Grotesque Pro, sans-serif',
    }}>
      {/* Top bar */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg)',
        borderBottom: '1px solid var(--border-subtle)',
        padding: '14px 32px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{
            fontFamily: 'PP Eiko, serif', fontSize: 18, fontWeight: 100, letterSpacing: '-0.02em',
          }}>metalab</span>
          <span style={{
            fontFamily: 'Basis Grotesque Pro, sans-serif', fontSize: 11,
            color: 'var(--text-subtle)', letterSpacing: '0.18em', textTransform: 'uppercase',
          }}>· design system</span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <MetaPill onClick={() => navigate('/a')}>v.1</MetaPill>
          <MetaPill onClick={() => navigate('/b')}>v.2</MetaPill>
          <MetaPill onClick={() => navigate('/c')}>v.3 (Best)</MetaPill>
          <MetaPill onClick={() => navigate('/d')}>v.4</MetaPill>
          <MetaPill isCurrent>design system</MetaPill>
          <MetaPill onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? '☀ light' : '☾ dark'}
          </MetaPill>
        </div>
      </header>

      <main style={{ maxWidth: 1280, margin: '0 auto', padding: '64px 32px' }}>
        {/* Intro */}
        <section style={{ marginBottom: 96 }}>
          <div style={{
            fontFamily: 'Basis Grotesque Pro, sans-serif', fontSize: 11,
            color: 'var(--text-subtle)', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 16,
          }}>Extracted from production CSS</div>
          <h1 style={{
            fontFamily: 'PP Eiko, serif', fontSize: 'clamp(56px, 11vw, 176px)',
            lineHeight: 0.9, letterSpacing: '-0.03em', fontWeight: 100, margin: 0,
            color: 'var(--text-bold)',
          }}>
            metalab<br/>design system
          </h1>
          <p style={{
            marginTop: 32, maxWidth: 720, fontSize: '1.6rem', lineHeight: 1.5,
            color: 'var(--text-regular)', fontWeight: 400,
          }}>
            Live tokens scraped from <a href="https://www.metalab.com/" target="_blank" rel="noreferrer"
            style={{ color: 'var(--text-bold)', textDecoration: 'underline' }}>metalab.com</a> across home, what-we-do,
            about, blog and contact. Two fonts (PP Eiko display, Basis Grotesque Pro body), a tight grey-scale plus a
            single brand purple <code style={{ background: 'var(--bg-subtle)', padding: '2px 6px', borderRadius: 4 }}>#584dff</code>,
            and a uniform 0.8rem radius scale doubling up to pill. Both light and dark themes ship from the same
            variable map.
          </p>
        </section>

        {/* Colors */}
        <Section title="Colors" kicker="Tokens">
          <div style={{ marginBottom: 28 }}>
            <h3 style={{ fontFamily: 'Basis Grotesque Pro, sans-serif', fontSize: 14, fontWeight: 500, marginBottom: 16, color: 'var(--text-bold)' }}>Brand</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 20 }}>
              {COLORS_BRAND.map((c) => (
                <Swatch key={c.name} hex={c.hex} name={c.name} use={c.label} />
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 28 }}>
            <h3 style={{ fontFamily: 'Basis Grotesque Pro, sans-serif', fontSize: 14, fontWeight: 500, marginBottom: 16, color: 'var(--text-bold)' }}>Light theme tokens</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 20 }}>
              {COLORS_LIGHT.map((c) => (
                <Swatch key={c.name} hex={c.hex} name={c.name} use={c.use} />
              ))}
            </div>
          </div>

          <div>
            <h3 style={{ fontFamily: 'Basis Grotesque Pro, sans-serif', fontSize: 14, fontWeight: 500, marginBottom: 16, color: 'var(--text-bold)' }}>Dark theme tokens (default)</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 20 }}>
              {COLORS_DARK.map((c) => (
                <Swatch key={c.name} hex={c.hex} name={c.name} use={c.use} />
              ))}
            </div>
          </div>
        </Section>

        {/* Typography */}
        <Section title="Typography" kicker="Two-family stack">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, marginBottom: 32 }}>
            <div style={{ padding: 24, border: '1px solid var(--border-subtle)', borderRadius: 8 }}>
              <div style={{ fontFamily: 'Basis Grotesque Pro, sans-serif', fontSize: 11, color: 'var(--text-subtle)', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 12 }}>Display</div>
              <div style={{ fontFamily: 'PP Eiko, serif', fontSize: 64, lineHeight: 1, fontWeight: 100, letterSpacing: '-0.02em' }}>PP Eiko</div>
              <div style={{ marginTop: 12, fontSize: 13, color: 'var(--text-regular)' }}>Weights observed: 240, 300. Used for hero titles, h1–h4, large numerics.</div>
            </div>
            <div style={{ padding: 24, border: '1px solid var(--border-subtle)', borderRadius: 8 }}>
              <div style={{ fontFamily: 'Basis Grotesque Pro, sans-serif', fontSize: 11, color: 'var(--text-subtle)', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 12 }}>Body / UI</div>
              <div style={{ fontFamily: 'Basis Grotesque Pro, sans-serif', fontSize: 64, fontWeight: 350, lineHeight: 1 }}>Basis Grotesque</div>
              <div style={{ marginTop: 12, fontSize: 13, color: 'var(--text-regular)' }}>Weights observed: 300, 350, 400, 500. Body, UI, captions, eyebrows.</div>
            </div>
          </div>

          <h3 style={{ fontFamily: 'Basis Grotesque Pro, sans-serif', fontSize: 14, fontWeight: 500, marginBottom: 12, color: 'var(--text-bold)' }}>Display scale (PP Eiko)</h3>
          <div style={{ marginBottom: 40 }}>
            {TYPE_DISPLAY.map((t) => (
              <TypeRow key={t.label} {...t} family="PP Eiko, serif" />
            ))}
          </div>

          <h3 style={{ fontFamily: 'Basis Grotesque Pro, sans-serif', fontSize: 14, fontWeight: 500, marginBottom: 12, color: 'var(--text-bold)' }}>Body / UI scale (Basis Grotesque Pro)</h3>
          <div>
            {TYPE_BODY.map((t) => (
              <TypeRow key={t.label} {...t} />
            ))}
          </div>
        </Section>

        {/* Radius */}
        <Section title="Radius" kicker="Surface shape">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 20 }}>
            {RADII.map((r) => <RadiusBlock key={r.name} {...r} />)}
          </div>
        </Section>

        {/* Spacing */}
        <Section title="Spacing" kicker="Gutters & rhythm">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {SPACING.map((s) => (
              <div key={s.name} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                padding: '12px 0', borderBottom: '1px solid var(--border-subtle)', gap: 12,
              }}>
                <code style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12, color: 'var(--text-bold)' }}>{s.name}</code>
                <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12, color: 'var(--text-subtle)' }}>{s.val} · {s.px}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* Buttons */}
        <Section title="Buttons" kicker="Heights & padding">
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center', marginBottom: 24 }}>
            {BUTTON_HEIGHTS.map((b) => (
              <button key={b.name} type="button" style={{
                all: 'unset',
                height: b.val, padding: '0 1.6rem', borderRadius: 999,
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)',
                color: 'var(--text-bold)', fontFamily: 'Basis Grotesque Pro, sans-serif',
                fontSize: 13, cursor: 'pointer',
              }}>{b.name}</button>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {BUTTON_HEIGHTS.map((b) => (
              <div key={b.name} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                padding: '10px 0', borderBottom: '1px solid var(--border-subtle)', gap: 12,
              }}>
                <code style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12 }}>{b.name}</code>
                <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12, color: 'var(--text-subtle)' }}>{b.val} ({b.px})</span>
              </div>
            ))}
          </div>
        </Section>

        {/* Motion */}
        <Section title="Motion" kicker="Easing & duration">
          <h3 style={{ fontFamily: 'Basis Grotesque Pro, sans-serif', fontSize: 14, fontWeight: 500, marginBottom: 12 }}>Easings observed</h3>
          {EASING.map((e) => (
            <div key={e.name} style={{
              padding: '12px 0', borderBottom: '1px solid var(--border-subtle)',
              display: 'flex', justifyContent: 'space-between', gap: 16,
            }}>
              <div>
                <div style={{ fontFamily: 'Basis Grotesque Pro, sans-serif', fontSize: 13, fontWeight: 500 }}>{e.name}</div>
                <div style={{ fontFamily: 'Basis Grotesque Pro, sans-serif', fontSize: 12, color: 'var(--text-subtle)' }}>{e.use}</div>
              </div>
              <code style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12, color: 'var(--text-regular)' }}>{e.curve}</code>
            </div>
          ))}

          <h3 style={{ fontFamily: 'Basis Grotesque Pro, sans-serif', fontSize: 14, fontWeight: 500, margin: '32px 0 12px' }}>Durations observed</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {DURATIONS.map((d) => (
              <div key={d.ms} style={{
                padding: '10px 0', borderBottom: '1px solid var(--border-subtle)',
                fontFamily: 'Basis Grotesque Pro, sans-serif', fontSize: 13, color: 'var(--text-regular)',
              }}>{d.label}</div>
            ))}
          </div>
        </Section>

        {/* Footer */}
        <footer style={{
          marginTop: 80, paddingTop: 24,
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
          fontFamily: 'Basis Grotesque Pro, sans-serif', fontSize: 12, color: 'var(--text-subtle)',
        }}>
          <div>Scraped from production CSS · {new Date().getFullYear()}</div>
          <div>Pages: home · what-we-do · about · blog · contact</div>
        </footer>
      </main>
    </div>
  )
}
