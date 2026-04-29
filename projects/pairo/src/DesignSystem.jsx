import { useState, useEffect } from 'react'
import { motion, AnimatePresence, useAnimation } from 'motion/react'
import { C, TYPE, SPACE, RADIUS, SPRINGS, DURATION, SHADOW } from './constants'
import { Button, Input, Avatar, Badge, Card, SectionLabel, Divider } from './components/ui'
import { Crown, Heart, Send, MapPin, Bell, Eye, EyeOff, Check, Bookmark, Plus, Compass, MessageCircle, User, Layers, Globe, BadgeCheck, Sparkles, Star, Zap, X, Settings, UserCircle, Sliders, Target, Shield, LogOut, Camera, Search, ChevronLeft, ChevronRight, ExternalLink, Briefcase, BarChart3, Users, Code, HelpCircle, Maximize2 } from 'lucide-react'

const F = "'Space Grotesk', sans-serif"
const PH = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face'
const PH2 = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face'
const PH3 = 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=200&h=200&fit=crop&crop=face'

const TABS = [
  { id: 'colors', label: 'Colors' },
  { id: 'type', label: 'Type' },
  { id: 'tokens', label: 'Tokens' },
  { id: 'buttons', label: 'Buttons' },
  { id: 'inputs', label: 'Inputs' },
  { id: 'forms', label: 'Forms' },
  { id: 'avatars', label: 'Avatars' },
  { id: 'badges', label: 'Badges' },
  { id: 'cards', label: 'Cards' },
  { id: 'media', label: 'Media' },
  { id: 'nav', label: 'Navigation' },
  { id: 'chat', label: 'Chat' },
  { id: 'overlays', label: 'Overlays' },
  { id: 'states', label: 'States' },
  { id: 'glass', label: 'Glass' },
  { id: 'screens', label: 'Screens' },
  { id: 'guidelines', label: 'Guidelines' },
  { id: 'motion', label: 'Motion' },
  { id: 'icons', label: 'Icons' },
  { id: 'auth', label: 'Auth' },
  { id: 'profile', label: 'Profile' },
  { id: 'discover', label: 'Discover' },
  { id: 'webtype', label: 'Web Type' },
  { id: 'webhero', label: 'Web Hero' },
  { id: 'weblayout', label: 'Web Layout' },
  { id: 'webmotion', label: 'Web Motion' },
  { id: 'webcomponents', label: 'Web Components' },
]

const DISPLAY = "'Syne', sans-serif"

// ── Helpers ──

function Label({ children }) {
  return <div style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: C.textTertiary, fontFamily: F, marginBottom: 10 }}>{children}</div>
}

function Block({ label, children, inline, maxW }) {
  return (
    <div style={{ marginBottom: 28, maxWidth: maxW }}>
      {label && <Label>{label}</Label>}
      <div style={inline ? { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' } : undefined}>{children}</div>
    </div>
  )
}

function Swatch({ name, value, wide }) {
  const [ok, set] = useState(false)
  return (
    <div onClick={() => { navigator.clipboard.writeText(value); set(true); setTimeout(() => set(false), 800) }}
      style={{ cursor: 'pointer', width: wide ? 90 : 64, flexShrink: 0 }}>
      <div style={{
        width: '100%', height: 40, borderRadius: 8, background: value,
        border: `1px solid ${C.borderLight}`, marginBottom: 4,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'transform 0.15s',
      }}>{ok && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}><Check size={11} color="#fff" /></motion.div>}</div>
      <div style={{ fontSize: 9, fontWeight: 600, color: C.text, fontFamily: F, marginBottom: 1 }}>{name}</div>
      <div style={{ fontSize: 7.5, color: C.textTertiary, fontFamily: 'monospace', wordBreak: 'break-all', lineHeight: 1.3 }}>
        {typeof value === 'string' && value.length < 28 ? value : ''}
      </div>
    </div>
  )
}

function Spring({ name, spring }) {
  const c = useAnimation()
  return (
    <div onClick={() => c.start({ x: [0, 50, 0], transition: spring })}
      style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, height: 28 }}>
      <div style={{ width: 52, fontSize: 11, fontWeight: 500, color: C.white, fontFamily: F }}>{name}</div>
      <div style={{ width: 120, background: C.surface2, borderRadius: 3, height: 4, position: 'relative' }}>
        <motion.div animate={c} style={{ width: 14, height: 4, borderRadius: 3, background: C.orange, position: 'absolute' }} />
      </div>
      <div style={{ fontSize: 8, color: C.textTertiary, fontFamily: 'monospace' }}>{spring.stiffness}/{spring.damping}</div>
    </div>
  )
}

// Phone frame wrapper for realistic previews
function Phone({ children, height = 480 }) {
  return (
    <div style={{
      width: 260, height, borderRadius: 28, overflow: 'hidden',
      border: `1px solid ${C.borderLight}`, background: C.bg,
      boxShadow: SHADOW.xl, flexShrink: 0,
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Notch */}
      <div style={{ height: 28, display: 'flex', justifyContent: 'center', alignItems: 'flex-end', paddingBottom: 4, flexShrink: 0 }}>
        <div style={{ width: 60, height: 4, borderRadius: 2, background: C.surface3 }} />
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════
// PAGES
// ═══════════════════════════════════════════════

function ColorsPage() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28, maxWidth: 600 }}>
      <Block label="Core surfaces">
        <div style={{ display: 'flex', gap: 8 }}>
          {[['bg', C.bg], ['surface', C.surface], ['surface2', C.surface2], ['surface3', C.surface3]].map(([k, v]) => <Swatch key={k} name={k} value={v} />)}
        </div>
      </Block>
      <Block label="Brand">
        <div style={{ display: 'flex', gap: 8 }}>
          {[['orange', C.orange], ['orangeLight', C.orangeLight], ['orangeDim', C.orangeDim], ['orangeBorder', C.orangeBorder]].map(([k, v]) => <Swatch key={k} name={k} value={v} />)}
        </div>
      </Block>
      <Block label="Semantic">
        <div style={{ display: 'flex', gap: 8 }}>
          {[['green', C.green], ['red', C.red], ['blue', C.blue]].map(([k, v]) => <Swatch key={k} name={k} value={v} />)}
        </div>
      </Block>
      <Block label="Text">
        <div style={{ display: 'flex', gap: 8 }}>
          {[['white', C.white], ['text', C.text], ['secondary', C.textSecondary], ['tertiary', C.textTertiary]].map(([k, v]) => <Swatch key={k} name={k} value={v} />)}
        </div>
      </Block>
      <Block label="Borders">
        <div style={{ display: 'flex', gap: 8 }}>
          {[['border', C.border], ['borderLight', C.borderLight]].map(([k, v]) => <Swatch key={k} name={k} value={v} wide />)}
        </div>
      </Block>
      <Block label="Orange hierarchy">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 20, borderRadius: 4, background: C.orange }} />
            <span style={{ fontSize: 10, color: C.white, fontFamily: F }}>CTA buttons, send, save, subscribe</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 20, borderRadius: 4, background: C.orange, opacity: 0.6 }} />
            <span style={{ fontSize: 10, color: C.white, fontFamily: F }}>Active tabs, toggles, selections</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 20, borderRadius: 4, background: C.surface3 }} />
            <span style={{ fontSize: 10, color: C.white, fontFamily: F }}>Avatar fallbacks, decorative elements</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 20, borderRadius: 4, background: C.surface, border: `1px solid ${C.border}` }} />
            <span style={{ fontSize: 10, color: C.white, fontFamily: F }}>Card borders, backgrounds, non-interactive</span>
          </div>
        </div>
      </Block>
      <Block label="Contrast check">
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ padding: '8px 14px', borderRadius: 8, background: C.orange }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#fff', fontFamily: F }}>White on orange</span>
          </div>
          <div style={{ padding: '8px 14px', borderRadius: 8, background: C.bg, border: `1px solid ${C.border}` }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: C.orange, fontFamily: F }}>Orange on dark</span>
          </div>
          <div style={{ padding: '8px 14px', borderRadius: 8, background: C.surface }}>
            <span style={{ fontSize: 12, color: C.textSecondary, fontFamily: F }}>Secondary text</span>
          </div>
        </div>
        <div style={{ fontSize: 8, color: C.textTertiary, fontFamily: 'monospace', marginTop: 6 }}>
          #FF6B35 on #131313 = 5.2:1 ✓ · #FAFAFA on #FF6B35 = 3.1:1 (large text only) · #E8E8E8 on #111111 = 14.5:1 ✓
        </div>
      </Block>
    </div>
  )
}

function TypePage() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '480px 1fr', gap: 32, maxWidth: 700 }}>
      <Block label="Type scale">
        {Object.entries(TYPE).map(([name, s]) => (
          <div key={name} style={{ display: 'flex', alignItems: 'baseline', padding: '6px 0', borderBottom: `1px solid ${C.border}` }}>
            <div style={{ width: 64, flexShrink: 0 }}>
              <div style={{ fontSize: 9, fontWeight: 600, color: C.orange, fontFamily: F }}>{name}</div>
              <div style={{ fontSize: 8, color: C.textTertiary, fontFamily: 'monospace' }}>{s.fontSize}px · {s.fontWeight}</div>
            </div>
            <div style={{ ...s, color: C.white, fontFamily: F }}>Pairo Design System</div>
          </div>
        ))}
      </Block>
      <div>
        <Block label="Weights">
          <div style={{ display: 'flex', gap: 14 }}>
            {[300, 400, 500, 600, 700].map(w => (
              <div key={w} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: w, color: C.white, fontFamily: F }}>Aa</div>
                <div style={{ fontSize: 8, color: C.textTertiary, fontFamily: 'monospace' }}>{w}</div>
              </div>
            ))}
          </div>
        </Block>
        <Block label="Paragraph">
          <div style={{ ...TYPE.body, color: C.textSecondary, fontFamily: F, lineHeight: 1.7, maxWidth: 200, fontSize: 13 }}>
            Pairo connects creative professionals. Browse portfolios, match, and collaborate.
          </div>
        </Block>
        <Block label="Section labels">
          <div style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: C.textTertiary, fontFamily: F, marginBottom: 6 }}>Tools & Skills</div>
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: C.orange, fontFamily: F }}>A project I'm proud of</div>
        </Block>
      </div>
    </div>
  )
}

function TokensPage() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '220px 220px 220px', gap: 28, maxWidth: 700 }}>
      <Block label="Spacing scale">
        {SPACE.map((px, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, height: 16 }}>
            <span style={{ width: 32, fontSize: 9, color: C.textTertiary, fontFamily: 'monospace', textAlign: 'right' }}>[{i}] {px}</span>
            <div style={{ height: 6, width: Math.max(px * 2, 2), borderRadius: 2, background: C.orange }} />
          </div>
        ))}
      </Block>
      <Block label="Border radius">
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {Object.entries(RADIUS).map(([name, val]) => (
            <div key={name} style={{ textAlign: 'center', width: 48 }}>
              <div style={{ width: 36, height: 24, borderRadius: val, background: C.surface2, border: `1px solid ${C.borderLight}`, margin: '0 auto 2px' }} />
              <div style={{ fontSize: 7.5, fontWeight: 600, color: C.text, fontFamily: F }}>{name}</div>
              <div style={{ fontSize: 7, color: C.textTertiary, fontFamily: 'monospace' }}>{val}{typeof val === 'number' ? 'px' : ''}</div>
            </div>
          ))}
        </div>
      </Block>
      <Block label="Shadows">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {Object.entries(SHADOW).map(([name, val]) => (
            <div key={name} style={{ padding: '8px 12px', borderRadius: 8, background: C.surface, boxShadow: val }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: C.white, fontFamily: F }}>{name}</div>
            </div>
          ))}
        </div>
      </Block>
    </div>
  )
}

function ButtonsPage() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28, maxWidth: 560 }}>
      <div>
        <Block label="Variants" inline>
          <Button variant="primary" size="sm">Primary</Button>
          <Button variant="secondary" size="sm">Secondary</Button>
          <Button variant="ghost" size="sm">Ghost</Button>
          <Button variant="danger" size="sm">Danger</Button>
        </Block>
        <Block label="Sizes" inline>
          <Button size="sm">Sm</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
        </Block>
        <Block label="States" inline>
          <Button disabled size="sm">Disabled</Button>
          <Button loading size="sm">Loading</Button>
        </Block>
        <Block label="With icons" inline>
          <Button size="sm"><Heart size={12} /> Like</Button>
          <Button variant="secondary" size="sm"><Bookmark size={12} /> Save</Button>
          <Button size="sm"><Send size={12} /></Button>
        </Block>
      </div>
      <div>
        <Block label="Full width CTA" maxW={240}>
          <Button size="full">Subscribe now</Button>
          <div style={{ height: 8 }} />
          <Button variant="secondary" size="full">Keep swiping</Button>
        </Block>
        <Block label="Social login" maxW={240}>
          <button style={{
            width: '100%', padding: 12, borderRadius: 50,
            background: 'transparent', border: `1px solid rgba(255,255,255,0.3)`,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            fontSize: 13, fontWeight: 500, color: C.textSecondary, fontFamily: F,
          }}>
            <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#4285F4' }} />
            Continue with Google
          </button>
        </Block>
        <Block label="Icon button">
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 12,
              background: `${C.orange}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            }}><Send size={15} color={C.white} /></div>
            <div style={{
              width: 34, height: 34, borderRadius: 12,
              background: 'rgba(0,0,0,.4)', backdropFilter: 'blur(12px)',
              border: `1px solid rgba(255,255,255,.12)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            }}><X size={14} color={C.white} /></div>
            <div style={{
              width: 40, height: 40, borderRadius: 14,
              background: C.orangeDim, border: `1px solid ${C.orangeBorder}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            }}><Bookmark size={18} color={C.orange} fill={C.orange} /></div>
          </div>
        </Block>
      </div>
    </div>
  )
}

function InputsPage() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '200px 200px', gap: 16, maxWidth: 420 }}>
      <Input label="Email" placeholder="name@email.com" />
      <Input label="Password" placeholder="••••••••" type="password" />
      <Input label="Error state" placeholder="name@email.com" error="Invalid email address" />
      <Input placeholder="No label" />
      <div style={{ gridColumn: '1 / 3' }}>
        <Label>Chat input</Label>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', maxWidth: 300 }}>
          <input placeholder="Type a message..." style={{
            flex: 1, padding: '9px 14px', borderRadius: 14,
            background: C.surface, border: `1px solid ${C.border}`,
            color: C.white, fontSize: 13, outline: 'none', fontFamily: F, boxSizing: 'border-box',
          }} />
          <div style={{
            width: 34, height: 34, borderRadius: 12,
            background: `${C.orange}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}><Send size={15} color={C.white} /></div>
        </div>
      </div>
      <div style={{ gridColumn: '1 / 3' }}>
        <Label>Search</Label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 14, background: C.surface, border: `1px solid ${C.border}`, maxWidth: 300 }}>
          <Search size={14} color={C.textTertiary} />
          <input placeholder="Search people..." style={{ flex: 1, background: 'none', border: 'none', color: C.white, fontSize: 13, outline: 'none', fontFamily: F }} />
        </div>
      </div>
      <div style={{ gridColumn: '1 / 3' }}>
        <Label>Password with eye toggle</Label>
        <div style={{ maxWidth: 200, position: 'relative' }}>
          <input readOnly value="••••••••" style={{
            width: '100%', padding: '10px 42px 10px 14px', borderRadius: 12,
            background: C.surface2, border: `1.5px solid ${C.surface3}`,
            fontSize: 12, color: C.white, fontFamily: F, outline: 'none', boxSizing: 'border-box',
          }} />
          <div style={{
            position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
            cursor: 'pointer', display: 'flex',
          }}>
            <EyeOff size={14} color={C.textTertiary} />
          </div>
        </div>
      </div>
    </div>
  )
}

function AvatarsPage() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28, maxWidth: 500 }}>
      <Block label="Photo sizes">
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          {[24, 32, 40, 56, 80].map(s => (
            <div key={s} style={{ textAlign: 'center' }}>
              <Avatar src={PH} name="Mara" size={s} />
              <div style={{ fontSize: 8, color: C.textTertiary, fontFamily: 'monospace', marginTop: 3 }}>{s}</div>
            </div>
          ))}
        </div>
      </Block>
      <Block label="Initials + badge">
        <div style={{ display: 'flex', gap: 8 }}>
          <Avatar name="Enrico Deiana" size={40} />
          <Avatar name="Mara Solano" size={40} badge />
          <Avatar src={PH2} name="Kai" size={40} badge />
          <Avatar src={PH3} name="Aisha" size={40} />
        </div>
      </Block>
      <Block label="Card avatar (discover)">
        <div style={{
          width: 46, height: 46, borderRadius: 16, overflow: 'hidden',
          border: `2px solid ${C.orange}`, boxShadow: '0 4px 16px rgba(0,0,0,.4)',
        }}>
          <img src={PH} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      </Block>
      <Block label="Stacked row">
        <div style={{ display: 'flex' }}>
          {[PH, PH2, PH3, null].map((src, i) => (
            <div key={i} style={{ marginLeft: i > 0 ? -6 : 0, zIndex: 4 - i }}>
              <Avatar src={src} name={['M', 'K', 'A', 'E'][i]} size={30} style={{ border: `2px solid ${C.bg}` }} />
            </div>
          ))}
          <div style={{
            marginLeft: -6, width: 30, height: 30, borderRadius: 10,
            background: C.surface2, border: `2px solid ${C.bg}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 9, color: C.textTertiary, fontFamily: F, fontWeight: 600,
          }}>+12</div>
        </div>
      </Block>
      <Block label="Profile completion">
        <div style={{ position: 'relative', width: 80, height: 80 }}>
          <Avatar src={PH} name="Mara" size={80} />
          <svg width="92" height="92" style={{ position: 'absolute', top: -6, left: -6 }}>
            <circle cx="46" cy="46" r="42" fill="none" stroke={C.surface3} strokeWidth="2.5" />
            <circle cx="46" cy="46" r="42" fill="none" stroke={C.orange} strokeWidth="2.5"
              strokeDasharray={`${0.78 * 2 * Math.PI * 42} ${2 * Math.PI * 42}`}
              strokeLinecap="round" transform="rotate(-90 46 46)" />
          </svg>
        </div>
        <div style={{ fontSize: 8, color: C.textTertiary, fontFamily: 'monospace', marginTop: 4 }}>78% complete</div>
      </Block>
    </div>
  )
}

function BadgesPage() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28, maxWidth: 500 }}>
      <Block label="Component variants" inline>
        <Badge>Default</Badge>
        <Badge variant="accent">Accent</Badge>
        <Badge variant="success">Success</Badge>
        <Badge variant="pro"><Crown size={9} /> Pro</Badge>
      </Block>
      <Block label="Verified badge">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: C.white, fontFamily: F }}>Mara Solano</span>
          <BadgeCheck size={16} color={C.orange} fill={C.orange} />
        </div>
      </Block>
      <Block label="Status chips (discover cards)">
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          <div style={{ padding: '5px 11px', borderRadius: 20, fontSize: 11, fontWeight: 500, color: C.white, background: 'rgba(255,255,255,.04)', border: `1px solid ${C.border}` }}>Open to work</div>
          <div style={{ padding: '5px 11px', borderRadius: 20, fontSize: 11, fontWeight: 500, color: C.textSecondary, background: 'rgba(255,255,255,.04)', border: `1px solid ${C.border}` }}>Full-time</div>
          <div style={{ padding: '5px 11px', borderRadius: 20, fontSize: 11, fontWeight: 500, color: C.textSecondary, background: 'rgba(255,255,255,.04)', border: `1px solid ${C.border}` }}>6y exp</div>
        </div>
      </Block>
      <Block label="Skill chips (first highlighted)">
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {['Product Design', 'React', 'Figma', 'Motion'].map((s, i) => (
            <div key={s} style={{
              padding: '7px 14px', borderRadius: 20, fontSize: 12, fontWeight: 500,
              color: i === 0 ? C.bg : C.textSecondary,
              background: i === 0 ? C.white : C.surface,
              border: i === 0 ? 'none' : `1px solid ${C.border}`,
            }}>{s}</div>
          ))}
        </div>
      </Block>
      <Block label="Photo navigation dots">
        <div style={{ display: 'flex', gap: 5 }}>
          {[true, false, false, false].map((active, i) => (
            <div key={i} style={{ width: active ? 18 : 6, height: 6, borderRadius: 3, background: active ? C.orange : 'rgba(255,255,255,.3)', transition: 'all .3s' }} />
          ))}
        </div>
      </Block>
      <Block label="Swipe counter">
        <div style={{ display: 'flex', gap: 6 }}>
          <div style={{ padding: '3px 8px', borderRadius: 8, background: C.orangeDim, fontSize: 10, fontWeight: 600, color: C.orange, fontFamily: F }}>20 left</div>
          <div style={{ padding: '3px 8px', borderRadius: 8, background: C.red + '15', fontSize: 10, fontWeight: 600, color: C.red, fontFamily: F }}>3 left</div>
        </div>
      </Block>
      <Block label="PairoLogo (brand mark)">
        <div style={{ display: 'flex', gap: 16, alignItems: 'baseline' }}>
          {[18, 22, 28].map(s => (
            <div key={s} style={{ textAlign: 'center' }}>
              <span style={{ fontSize: s, fontWeight: 700, color: C.white, fontFamily: F }}>pa<span style={{ color: C.orange }}>i</span>ro</span>
              <div style={{ fontSize: 7.5, color: C.textTertiary, fontFamily: 'monospace', marginTop: 2 }}>{s}px</div>
            </div>
          ))}
        </div>
      </Block>
    </div>
  )
}

function CardsPage() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '260px 260px', gap: 12, maxWidth: 540 }}>
      {/* Profile */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <Avatar src={PH} name="Mara" size={40} badge />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: C.white, fontFamily: F }}>Mara Solano</span>
              <BadgeCheck size={13} color={C.orange} fill={C.orange} />
            </div>
            <div style={{ fontSize: 11, color: C.textTertiary, fontFamily: F }}>Product Designer · Figma</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 5, marginBottom: 10, flexWrap: 'wrap' }}>
          <div style={{ padding: '4px 9px', borderRadius: 20, fontSize: 10, fontWeight: 500, color: C.white, background: 'rgba(255,255,255,.04)', border: `1px solid ${C.border}` }}>Open to work</div>
          <div style={{ padding: '4px 9px', borderRadius: 20, fontSize: 10, fontWeight: 500, color: C.textSecondary, background: 'rgba(255,255,255,.04)', border: `1px solid ${C.border}` }}>Barcelona</div>
        </div>
        <div style={{ height: 1, background: C.border, marginBottom: 10 }} />
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {['Design Systems', 'Figma', 'Prototyping'].map((s, i) => (
            <span key={s} style={{ padding: '5px 10px', borderRadius: 20, fontSize: 10, fontWeight: 500, color: i === 0 ? C.bg : C.textSecondary, background: i === 0 ? C.white : C.surface2, border: i === 0 ? 'none' : `1px solid ${C.border}` }}>{s}</span>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 16 }}>
        <div style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: C.textTertiary, fontFamily: F, marginBottom: 10 }}>Statistics</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
          {[{ v: '24', l: 'Saves' }, { v: '8', l: 'Matches' }, { v: '142', l: 'Views' }].map(s => (
            <div key={s.l} style={{ padding: '10px 0', borderRadius: 14, background: C.surface2, textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: C.white, letterSpacing: '-0.02em', fontFamily: F }}>{s.v}</div>
              <div style={{ fontSize: 10, color: C.textTertiary, fontFamily: F, marginTop: 2 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Prompt */}
      <div style={{ padding: '18px 18px 16px', borderRadius: 20, background: C.surface, border: `1px solid ${C.border}`, position: 'relative', overflow: 'hidden' }}>
        <span style={{ position: 'absolute', top: 8, left: 14, fontSize: 48, fontWeight: 700, color: C.white, opacity: 0.06, lineHeight: 1 }}>"</span>
        <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: C.textTertiary, marginBottom: 10, fontFamily: F }}>A project I'm proud of</div>
        <div style={{ fontSize: 14, fontWeight: 400, color: C.text, lineHeight: 1.6, fontFamily: F }}>Led the redesign of Figma's component library, reducing friction by 40%.</div>
      </div>

      {/* Pro upgrade */}
      <div style={{
        padding: 14, borderRadius: 18,
        background: `${C.orange}08`,
        border: `1px solid ${C.orangeBorder}`, display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: 13,
          background: `${C.orange}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          boxShadow: SHADOW.glowStrong,
        }}><Crown size={18} color={C.white} /></div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.orange, fontFamily: F }}>Upgrade to Pro</div>
          <div style={{ fontSize: 10, color: C.textTertiary, fontFamily: F, marginTop: 1 }}>Unlimited swipes, 3D mode</div>
        </div>
      </div>

      {/* Work tile */}
      <div style={{ aspectRatio: '1', borderRadius: 16, overflow: 'hidden', position: 'relative', background: '#6C5CE7' }}>
        <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', fontSize: 36, fontWeight: 700, color: 'rgba(255,255,255,.06)' }}>F</span>
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '24px 10px 9px', background: 'linear-gradient(to top, rgba(0,0,0,.6) 0%, transparent 100%)' }}>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: C.white, fontFamily: F }}>Figma Components</div>
          <div style={{ fontSize: 9.5, color: 'rgba(255,255,255,.5)', fontFamily: F }}>Lead Designer · 2024</div>
        </div>
        <div style={{ position: 'absolute', top: 8, right: 8, width: 22, height: 22, borderRadius: 7, background: 'rgba(0,0,0,.3)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ExternalLink size={10} color="rgba(255,255,255,.6)" />
        </div>
      </div>

      {/* Location card */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <MapPin size={13} color={C.orange} />
          <span style={{ fontSize: 13, fontWeight: 600, color: C.white, fontFamily: F }}>Barcelona</span>
          <span style={{ fontSize: 11, color: C.textSecondary, fontFamily: F }}>· 2 km</span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <div style={{ padding: '6px 12px', borderRadius: 10, background: 'rgba(255,255,255,.06)', fontSize: 11, fontWeight: 500, color: C.white, fontFamily: F, display: 'flex', alignItems: 'center', gap: 5 }}>
            <Briefcase size={11} color={C.textSecondary} />Figma
          </div>
          <div style={{ padding: '6px 12px', borderRadius: 10, background: 'rgba(255,255,255,.06)', fontSize: 11, fontWeight: 500, color: C.white, fontFamily: F }}>6y exp</div>
        </div>
      </div>
    </div>
  )
}

function NavPage() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '280px 240px', gap: 28, maxWidth: 540 }}>
      <div>
        <Block label="Tab bar">
          <div style={{
            display: 'flex', justifyContent: 'space-around', alignItems: 'center',
            height: 60, background: C.bg, borderRadius: 16, border: `1px solid ${C.border}`,
          }}>
            {[
              { Icon: Compass, label: 'Discover', active: true },
              { Icon: MessageCircle, label: 'Chat', active: false },
              { Icon: User, label: 'Profile', active: false },
            ].map(({ Icon, label, active }) => (
              <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '6px 24px', cursor: 'pointer' }}>
                <Icon size={21} color={active ? C.orange : C.textTertiary} fill={active ? C.orange : 'none'} strokeWidth={active ? 2.2 : 1.5} />
                <span style={{ fontSize: 9.5, fontWeight: active ? 600 : 400, color: active ? C.white : C.textTertiary, letterSpacing: '0.04em', textTransform: 'uppercase', fontFamily: F }}>{label}</span>
              </div>
            ))}
          </div>
        </Block>
        <Block label="Settings rows">
          <div style={{ background: C.surface, borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
            {[
              { icon: <UserCircle size={18} color={C.textSecondary} />, label: 'My Profile', desc: 'Photos, bio, skills' },
              { icon: <Sliders size={18} color={C.textSecondary} />, label: 'Preferences', desc: 'Distance, roles' },
              { icon: <Target size={18} color={C.textSecondary} />, label: 'Looking for', desc: 'Collaborator, hire' },
              { icon: <Settings size={18} color={C.textSecondary} />, label: 'Settings', desc: 'Account, privacy' },
            ].map((r, i, a) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '14px 14px',
                borderBottom: i < a.length - 1 ? `1px solid ${C.border}` : 'none', cursor: 'pointer',
              }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: C.surface2, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{r.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, color: C.text, fontWeight: 500, fontFamily: F }}>{r.label}</div>
                  <div style={{ fontSize: 11, color: C.textTertiary, fontFamily: F, marginTop: 1 }}>{r.desc}</div>
                </div>
                <ChevronLeft size={14} color={C.textTertiary} style={{ transform: 'rotate(180deg)' }} />
              </div>
            ))}
          </div>
        </Block>
      </div>
      <div>
        <Block label="Mode toggle">
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 2, padding: 3, borderRadius: 10,
            background: C.surface, border: `1px solid ${C.border}`,
          }}>
            {[{ icon: <Layers size={13} />, label: 'Cards', active: true }, { icon: <Globe size={13} />, label: '3D', active: false }].map(m => (
              <button key={m.label} style={{
                display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 7,
                border: 'none', cursor: 'pointer', background: m.active ? C.orange : 'transparent',
                color: m.active ? C.bg : C.textTertiary, fontFamily: F, fontSize: 10, fontWeight: 600,
              }}><span style={{ display: 'flex', color: 'inherit' }}>{m.icon}</span>{m.label}</button>
            ))}
          </div>
        </Block>
        <Block label="Toggle row">
          <div style={{ background: C.surface, borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
            {[{ label: 'Push notifications', on: true }, { label: 'Email updates', on: false }, { label: 'Profile visible', on: true }].map((r, i, a) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px',
                borderBottom: i < a.length - 1 ? `1px solid ${C.border}` : 'none',
              }}>
                <span style={{ flex: 1, fontSize: 14, color: C.text, fontWeight: 400, fontFamily: F }}>{r.label}</span>
                <div style={{
                  width: 42, height: 24, borderRadius: 12, background: r.on ? C.orange : C.surface3,
                  position: 'relative', transition: 'background .2s',
                }}>
                  <div style={{ width: 18, height: 18, borderRadius: 9, background: C.white, position: 'absolute', top: 3, left: r.on ? 21 : 3, transition: 'left .2s' }} />
                </div>
              </div>
            ))}
          </div>
        </Block>
        <Block label="Sub-screen header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '2px 6px 12px' }}>
            <ChevronLeft size={22} color={C.white} />
            <span style={{ fontSize: 17, fontWeight: 700, color: C.white, letterSpacing: '-0.02em', fontFamily: F }}>My Profile</span>
          </div>
        </Block>
        <Block label="Tab underline (prompt tabs)">
          <div style={{ display: 'flex', gap: 0, borderBottom: `1px solid ${C.border}` }}>
            {['About', 'Work', 'Prompts'].map((t, i) => (
              <div key={t} style={{
                padding: '8px 16px', cursor: 'pointer', position: 'relative',
                fontSize: 13, fontWeight: i === 0 ? 600 : 400,
                color: i === 0 ? C.white : C.textTertiary, fontFamily: F,
              }}>
                {t}
                {i === 0 && <div style={{
                  position: 'absolute', bottom: -1, left: 16, right: 16,
                  height: 2, borderRadius: 1, background: C.orange,
                }} />}
              </div>
            ))}
          </div>
        </Block>
      </div>
    </div>
  )
}

function ChatPage() {
  return (
    <div style={{ display: 'flex', gap: 20 }}>
      {/* Chat list in phone */}
      <Phone height={400}>
        <div style={{ padding: '10px 14px', flexShrink: 0 }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: C.white, fontFamily: F }}>pa<span style={{ color: C.orange }}>i</span>ro</span>
        </div>
        <div style={{ padding: '0 14px', flexShrink: 0 }}>
          <span style={{ fontSize: 20, fontWeight: 700, color: C.white, letterSpacing: '-0.02em', fontFamily: F }}>Conversations</span>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }}>
          {[
            { name: 'Mara Solano', role: 'Product Designer', msg: 'Would love to collaborate!', time: '2m', unread: true, photo: PH },
            { name: 'Kai Andersen', role: 'Full-Stack Engineer', msg: 'Let me check and get back.', time: '1h', unread: false, photo: PH2 },
            { name: 'Aisha Mensah', role: 'Brand Designer', msg: 'That sounds great!', time: '3h', unread: false, photo: PH3 },
          ].map((c, i, a) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0',
              borderBottom: i < a.length - 1 ? `1px solid ${C.border}` : 'none',
            }}>
              <Avatar src={c.photo} name={c.name} size={40} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span style={{ fontSize: 13, fontWeight: c.unread ? 700 : 500, color: C.white, fontFamily: F }}>{c.name}</span>
                  <span style={{ fontSize: 10, color: c.unread ? C.orange : C.textTertiary, fontFamily: F }}>{c.time}</span>
                </div>
                <div style={{ fontSize: 12, color: c.unread ? C.textSecondary : C.textTertiary, fontFamily: F, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.msg}</div>
              </div>
              {c.unread && <div style={{ width: 7, height: 7, borderRadius: 4, background: C.orange, flexShrink: 0 }} />}
            </div>
          ))}
        </div>
        {/* Tab bar */}
        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', height: 50, borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
          {[{ Icon: Compass, active: false }, { Icon: MessageCircle, active: true }, { Icon: User, active: false }].map(({ Icon, active }, i) => (
            <Icon key={i} size={20} color={active ? C.orange : C.textTertiary} fill={active ? C.orange : 'none'} strokeWidth={active ? 2.2 : 1.5} />
          ))}
        </div>
      </Phone>

      {/* Chat detail in phone */}
      <Phone height={400}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          <ChevronLeft size={18} color={C.white} />
          <Avatar src={PH} name="Mara" size={28} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.white, fontFamily: F }}>Mara Solano</div>
            <div style={{ fontSize: 9, color: C.textTertiary, fontFamily: F }}>Product Designer</div>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 12px 6px', display: 'flex', flexDirection: 'column', gap: 5 }}>
          <div style={{ alignSelf: 'flex-start', padding: '8px 12px', borderRadius: '14px 14px 14px 4px', background: C.surface2, fontSize: 12.5, color: C.white, fontFamily: F, maxWidth: '80%' }}>
            Hey! Saw your work.
          </div>
          <div style={{ alignSelf: 'flex-end', padding: '8px 12px', borderRadius: '14px 14px 4px 14px', background: `${C.orange}`, fontSize: 12.5, color: '#fff', fontFamily: F, maxWidth: '80%' }}>
            Thanks! Love to chat.
          </div>
          <div style={{ alignSelf: 'flex-start', padding: '8px 12px', borderRadius: '14px 14px 14px 4px', background: C.surface2, fontSize: 12.5, color: C.white, fontFamily: F, maxWidth: '80%' }}>
            Let's set up a call!
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, padding: '6px 12px 8px', borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
          <input placeholder="Message..." style={{
            flex: 1, padding: '7px 12px', borderRadius: 12, background: C.surface,
            border: `1px solid ${C.border}`, color: C.white, fontSize: 12, outline: 'none', fontFamily: F, boxSizing: 'border-box',
          }} />
          <div style={{
            width: 30, height: 30, borderRadius: 10, flexShrink: 0,
            background: `${C.orange}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}><Send size={13} color={C.white} /></div>
        </div>
      </Phone>
    </div>
  )
}

function OverlaysPage() {
  return (
    <div style={{ display: 'flex', gap: 20 }}>
      {/* Match overlay */}
      <Phone height={420}>
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.85)', padding: 20, gap: 12,
        }}>
          <Sparkles size={36} color={C.orange} />
          <div style={{ fontSize: 22, fontWeight: 800, color: C.white, letterSpacing: '-0.03em', fontFamily: F }}>It's a match!</div>
          <div style={{ fontSize: 12, color: C.textSecondary, fontFamily: F }}>You and Mara liked each other</div>
          <div style={{
            width: 72, height: 72, borderRadius: 24, overflow: 'hidden',
            border: `3px solid ${C.orange}`, boxShadow: `0 0 40px ${C.orange}40`,
          }}>
            <img src={PH} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%', maxWidth: 180, marginTop: 4 }}>
            <button style={{ padding: 11, borderRadius: 12, border: 'none', background: `${C.orange}`, color: '#fff', fontSize: 13, fontWeight: 600, fontFamily: F, cursor: 'pointer', boxShadow: SHADOW.glow }}>Send a message</button>
            <button style={{ padding: 11, borderRadius: 12, background: 'transparent', color: C.textSecondary, fontSize: 13, fontWeight: 500, border: `1px solid ${C.border}`, fontFamily: F, cursor: 'pointer' }}>Keep swiping</button>
          </div>
        </div>
      </Phone>

      {/* Pro paywall */}
      <Phone height={420}>
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          background: 'rgba(0,0,0,0.85)', padding: '24px 16px 16px',
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: 16, margin: '0 auto 10px',
            background: `${C.orange}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: SHADOW.glowStrong,
          }}><Crown size={22} color={C.white} /></div>
          <div style={{ fontSize: 20, fontWeight: 700, color: C.white, textAlign: 'center', letterSpacing: '-0.03em', fontFamily: F, marginBottom: 4 }}>Upgrade to Pro</div>
          <div style={{ fontSize: 11, color: C.textTertiary, textAlign: 'center', fontFamily: F, marginBottom: 14 }}>Cancel anytime.</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 14 }}>
            {[
              { icon: <Eye size={14} />, label: 'See who liked you' },
              { icon: <Zap size={14} />, label: 'Unlimited swipes' },
              { icon: <Globe size={14} />, label: '3D Globe mode' },
              { icon: <Star size={14} />, label: '5x Super Likes' },
            ].map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 10, background: 'rgba(255,255,255,.03)' }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: `${C.orange}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.orange, flexShrink: 0 }}>{f.icon}</div>
                <span style={{ fontSize: 12, fontWeight: 500, color: C.white, fontFamily: F }}>{f.label}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 'auto' }}>
            <div style={{ padding: 12, borderRadius: 14, background: `${C.orange}08`, border: `1.5px solid ${C.orangeBorder}`, marginBottom: 8, textAlign: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 2 }}>
                <span style={{ fontSize: 12, color: C.textTertiary, textDecoration: 'line-through', marginRight: 4 }}>9.99</span>
                <span style={{ fontSize: 26, fontWeight: 700, color: C.white, letterSpacing: '-0.03em', fontFamily: F }}>4.99</span>
                <span style={{ fontSize: 12, color: C.textTertiary }}>/mo</span>
              </div>
            </div>
            <button style={{ width: '100%', padding: 12, borderRadius: 14, border: 'none', background: `${C.orange}`, fontSize: 14, fontWeight: 700, color: '#fff', fontFamily: F, cursor: 'pointer', boxShadow: SHADOW.glowStrong }}>Subscribe now</button>
          </div>
        </div>
      </Phone>

      {/* Swipe indicators */}
      <div style={{ maxWidth: 200 }}>
        <Block label="LIKE indicator">
          <div style={{
            padding: '8px 18px', borderRadius: 12, display: 'inline-block',
            border: `3px solid ${C.green}`, background: 'rgba(52,211,153,.12)',
            fontSize: 22, fontWeight: 800, color: C.green, letterSpacing: '0.08em',
            transform: 'rotate(-12deg)', fontFamily: F,
          }}>LIKE</div>
        </Block>
        <Block label="NOPE indicator">
          <div style={{
            padding: '8px 18px', borderRadius: 12, display: 'inline-block',
            border: `3px solid ${C.red}`, background: 'rgba(248,113,113,.12)',
            fontSize: 22, fontWeight: 800, color: C.red, letterSpacing: '0.08em',
            transform: 'rotate(12deg)', fontFamily: F,
          }}>NOPE</div>
        </Block>
      </div>

      {/* Project detail modal */}
      <Phone height={420}>
        <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          {/* Cover hero */}
          <div style={{ height: 130, position: 'relative', background: '#6C5CE7' }}>
            <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', fontSize: 48, fontWeight: 700, color: 'rgba(255,255,255,.06)' }}>F</span>
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 50%, rgba(10,10,10,0.8))' }} />
            {/* Close button */}
            <button style={{
              position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 10,
              background: 'rgba(0,0,0,.4)', backdropFilter: 'blur(12px)',
              border: `1px solid rgba(255,255,255,.12)`, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}><X size={14} color={C.white} /></button>
          </div>
          {/* Content */}
          <div style={{ padding: '12px 14px' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.white, fontFamily: F, marginBottom: 4 }}>Figma Components</div>
            {/* Role/Year badges */}
            <div style={{ display: 'flex', gap: 5, marginBottom: 10 }}>
              <div style={{ padding: '4px 9px', borderRadius: 20, fontSize: 10, fontWeight: 500, color: C.orange, background: C.orangeDim, border: `1px solid ${C.orangeBorder}` }}>Lead Designer</div>
              <div style={{ padding: '4px 9px', borderRadius: 20, fontSize: 10, fontWeight: 500, color: C.textSecondary, background: 'rgba(255,255,255,.04)', border: `1px solid ${C.border}` }}>2024</div>
            </div>
            {/* Description */}
            <div style={{ fontSize: 12, color: C.textSecondary, lineHeight: 1.6, fontFamily: F, marginBottom: 12 }}>
              Redesigned Figma's core component library serving 4M+ users. Reduced handoff friction by 40%.
            </div>
            {/* Gallery strip */}
            <Label>Gallery</Label>
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto' }}>
              {[PH, PH2, PH3].map((url, i) => (
                <div key={i} style={{ width: 64, height: 48, borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}>
                  <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </Phone>
    </div>
  )
}

function StatesPage() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '260px 260px', gap: 16, maxWidth: 540 }}>
      {/* Empty - no messages */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 32, textAlign: 'center' }}>
        <div style={{ width: 48, height: 48, borderRadius: 16, background: C.surface2, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
          <MessageCircle size={20} color={C.textTertiary} />
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, color: C.white, fontFamily: F, marginBottom: 4 }}>No messages yet</div>
        <div style={{ fontSize: 12, color: C.textTertiary, fontFamily: F, lineHeight: 1.5 }}>Save profiles and connect to start.</div>
      </div>

      {/* Empty - no profiles */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 32, textAlign: 'center' }}>
        <div style={{ width: 48, height: 48, borderRadius: 16, background: C.surface2, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
          <User size={20} color={C.textTertiary} />
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, color: C.white, fontFamily: F, marginBottom: 4 }}>No one here yet</div>
        <div style={{ fontSize: 12, color: C.textTertiary, fontFamily: F, lineHeight: 1.5 }}>Be the first to join.</div>
      </div>

      {/* Loading */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 32, textAlign: 'center' }}>
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} style={{
          width: 32, height: 32, borderRadius: '50%', margin: '0 auto 12px',
          border: `2px solid ${C.surface3}`, borderTopColor: C.orange,
        }} />
        <div style={{ fontSize: 12, color: C.textTertiary, fontFamily: F }}>Loading profiles...</div>
      </div>

      {/* Error */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 20 }}>
        <div style={{
          padding: '10px 14px', borderRadius: 12, marginBottom: 12,
          background: C.red + '12', border: `1px solid ${C.red}30`,
          fontSize: 12, color: C.red, fontFamily: F,
        }}>Upload failed. Try again.</div>
        <div style={{
          padding: '10px 14px', borderRadius: 12,
          background: `${C.green}15`, border: `1px solid ${C.green}30`,
          fontSize: 12, color: C.green, fontFamily: F,
        }}>Photo saved!</div>
      </div>

      {/* Checkout success toast */}
      <div style={{ gridColumn: '1 / 3' }}>
        <Label>Toast notifications</Label>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 10,
          padding: '12px 20px', borderRadius: 16,
          background: `${C.orange}`,
          boxShadow: SHADOW.glowStrong,
        }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: C.white, fontFamily: F }}>Pro activated! Welcome to Pairo Pro.</span>
        </div>
      </div>

      {/* Completion badge */}
      <div>
        <Label>Completion badges</Label>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ padding: '4px 10px', borderRadius: 8, background: C.orangeDim, fontSize: 10.5, fontWeight: 600, color: C.orange, fontFamily: F }}>78% complete</div>
          <div style={{ padding: '4px 10px', borderRadius: 8, background: `${C.green}15`, fontSize: 10.5, fontWeight: 600, color: C.green, fontFamily: F }}>Profile complete</div>
        </div>
      </div>

      {/* Auth error */}
      <div>
        <Label>Auth error banner</Label>
        <div style={{
          padding: '12px 16px', borderRadius: 12,
          background: '#F59E0B12', border: '1px solid #F59E0B30',
          fontSize: 13, color: '#F59E0B', fontFamily: F, lineHeight: 1.5,
        }}>Wrong email or password. Try again.</div>
      </div>
    </div>
  )
}

function MotionPage() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '220px 200px', gap: 28, maxWidth: 460 }}>
      <Block label="Springs (click to trigger)">
        {Object.entries(SPRINGS).map(([n, s]) => <Spring key={n} name={n} spring={s} />)}
      </Block>
      <div>
        <Block label="Durations">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {Object.entries(DURATION).map(([n, v]) => (
              <div key={n} style={{ padding: 10, borderRadius: 8, background: C.surface, textAlign: 'center' }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: C.white, fontFamily: F }}>{v}s</div>
                <div style={{ fontSize: 9, color: C.textTertiary, fontFamily: F }}>{n}</div>
              </div>
            ))}
          </div>
        </Block>
        <Block label="Easing">
          <div style={{ fontSize: 12, color: C.textSecondary, fontFamily: F, lineHeight: 1.6 }}>
            Primary: spring-based motion<br />
            Secondary: cubic-bezier(.4,0,.2,1)<br />
            Exit: cubic-bezier(.25,.1,.25,1)
          </div>
        </Block>
      </div>
    </div>
  )
}

function IconsPage() {
  const icons = [
    { Icon: Heart, label: 'Heart' }, { Icon: Bookmark, label: 'Bookmark' }, { Icon: Send, label: 'Send' },
    { Icon: Search, label: 'Search' }, { Icon: MapPin, label: 'MapPin' }, { Icon: Bell, label: 'Bell' },
    { Icon: Eye, label: 'Eye' }, { Icon: Star, label: 'Star' }, { Icon: Crown, label: 'Crown' },
    { Icon: Sparkles, label: 'Sparkles' }, { Icon: Zap, label: 'Zap' }, { Icon: X, label: 'X' },
    { Icon: Plus, label: 'Plus' }, { Icon: Check, label: 'Check' }, { Icon: Camera, label: 'Camera' },
    { Icon: Settings, label: 'Settings' }, { Icon: Shield, label: 'Shield' }, { Icon: LogOut, label: 'LogOut' },
    { Icon: Compass, label: 'Compass' }, { Icon: MessageCircle, label: 'Message' }, { Icon: User, label: 'User' },
    { Icon: Globe, label: 'Globe' }, { Icon: Layers, label: 'Layers' }, { Icon: ExternalLink, label: 'External' },
    { Icon: Briefcase, label: 'Briefcase' }, { Icon: Target, label: 'Target' }, { Icon: Sliders, label: 'Sliders' },
    { Icon: BadgeCheck, label: 'Verified' }, { Icon: BarChart3, label: 'BarChart' }, { Icon: ChevronLeft, label: 'Chevron' },
  ]
  return (
    <div style={{ maxWidth: 560 }}>
      <Block label="Lucide icons used in Pairo">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 4 }}>
          {icons.map(({ Icon, label }) => (
            <div key={label} style={{ textAlign: 'center', padding: '10px 4px', borderRadius: 8, background: C.surface, border: `1px solid ${C.border}`, cursor: 'pointer' }}>
              <Icon size={18} color={C.textSecondary} />
              <div style={{ fontSize: 7.5, color: C.textTertiary, fontFamily: F, marginTop: 4 }}>{label}</div>
            </div>
          ))}
        </div>
      </Block>
      <Block label="Icon sizes used" inline>
        {[10, 12, 13, 14, 15, 16, 18, 20, 21, 26].map(s => (
          <div key={s} style={{ textAlign: 'center' }}>
            <Heart size={s} color={C.orange} />
            <div style={{ fontSize: 7.5, color: C.textTertiary, fontFamily: 'monospace', marginTop: 2 }}>{s}</div>
          </div>
        ))}
      </Block>
      <Block label="Active vs inactive" inline>
        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{ textAlign: 'center' }}>
            <Compass size={21} color={C.orange} fill={C.orange} strokeWidth={2.2} />
            <div style={{ fontSize: 8, color: C.textTertiary, fontFamily: F, marginTop: 2 }}>Active</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <Compass size={21} color={C.textTertiary} fill="none" strokeWidth={1.5} />
            <div style={{ fontSize: 8, color: C.textTertiary, fontFamily: F, marginTop: 2 }}>Inactive</div>
          </div>
        </div>
      </Block>
    </div>
  )
}

function FormsPage() {
  const [pillSelected, setPillSelected] = useState('Designer')
  const [multiSelected, setMultiSelected] = useState(['React', 'Figma'])
  const [dobVal, setDobVal] = useState('12031990')
  const toggleMulti = (v) => setMultiSelected(p => p.includes(v) ? p.filter(x => x !== v) : [...p, v])

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '260px 260px', gap: 24, maxWidth: 560 }}>
      {/* Pill select single */}
      <Block label="Pill select (single)">
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {['Designer', 'Developer', 'Product', 'Strategist', 'Other'].map(r => (
            <motion.button key={r} whileTap={{ scale: 0.95 }} onClick={() => setPillSelected(r)} style={{
              padding: '7px 14px', borderRadius: 20, fontSize: 11, fontWeight: 500,
              background: pillSelected === r ? C.orangeDim : 'transparent',
              border: `1.5px ${pillSelected === r ? 'dashed' : 'solid'} ${pillSelected === r ? C.orange : C.surface3}`,
              color: pillSelected === r ? C.orange : C.textTertiary,
              cursor: 'pointer', fontFamily: F,
            }}>{r}</motion.button>
          ))}
        </div>
      </Block>

      {/* Pill select multi */}
      <Block label="Pill select (multi)">
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {['React', 'Figma', 'TypeScript', 'Motion', 'WebGL'].map(s => (
            <motion.button key={s} whileTap={{ scale: 0.95 }} onClick={() => toggleMulti(s)} style={{
              padding: '7px 14px', borderRadius: 20, fontSize: 11, fontWeight: 500,
              background: multiSelected.includes(s) ? C.orangeDim : 'transparent',
              border: `1.5px ${multiSelected.includes(s) ? 'dashed' : 'solid'} ${multiSelected.includes(s) ? C.orange : C.surface3}`,
              color: multiSelected.includes(s) ? C.orange : C.textTertiary,
              cursor: 'pointer', fontFamily: F,
            }}>{s}</motion.button>
          ))}
        </div>
      </Block>

      {/* Date input slots */}
      <Block label="Date input (DD/MM/YYYY)">
        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          {[0, 1].map(i => (
            <div key={i} style={{
              width: 36, height: 48, borderRadius: 10,
              background: C.surface2, border: `1.5px solid ${dobVal[i] ? C.orange : C.surface3}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, fontWeight: 600, color: C.white, fontFamily: F,
            }}>{dobVal[i] || ''}</div>
          ))}
          <span style={{ fontSize: 16, color: C.textTertiary, fontFamily: F, margin: '0 2px' }}>/</span>
          {[2, 3].map(i => (
            <div key={i} style={{
              width: 36, height: 48, borderRadius: 10,
              background: C.surface2, border: `1.5px solid ${dobVal[i] ? C.orange : C.surface3}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, fontWeight: 600, color: C.white, fontFamily: F,
            }}>{dobVal[i] || ''}</div>
          ))}
          <span style={{ fontSize: 16, color: C.textTertiary, fontFamily: F, margin: '0 2px' }}>/</span>
          {[4, 5, 6, 7].map(i => (
            <div key={i} style={{
              width: 36, height: 48, borderRadius: 10,
              background: C.surface2, border: `1.5px solid ${dobVal[i] ? C.orange : C.surface3}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, fontWeight: 600, color: C.white, fontFamily: F,
            }}>{dobVal[i] || ''}</div>
          ))}
        </div>
        <div style={{ fontSize: 11, color: C.textSecondary, fontFamily: F, marginTop: 8 }}>
          You're <span style={{ color: C.orange, fontWeight: 600 }}>36</span> · Born 12 March 1990
        </div>
      </Block>

      {/* Inline field edit */}
      <Block label="Inline field edit">
        <div style={{ background: C.surface, borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
          {/* Display mode */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderBottom: `1px solid ${C.border}`, cursor: 'pointer' }}>
            <span style={{ fontSize: 12, color: C.textTertiary, fontWeight: 500, fontFamily: F }}>Name</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 14, color: C.text, fontFamily: F }}>Mara Solano</span>
              <Camera size={11} color={C.textTertiary} />
            </div>
          </div>
          {/* Edit mode */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px' }}>
            <span style={{ fontSize: 12, color: C.textTertiary, fontWeight: 500, width: 50, flexShrink: 0, fontFamily: F }}>Role</span>
            <input value="Product Designer" readOnly style={{
              flex: 1, padding: '6px 10px', borderRadius: 8, outline: 'none',
              background: C.surface2, color: C.white, fontSize: 14, fontWeight: 400,
              border: `1px solid ${C.orange}`, fontFamily: F,
            }} />
            <button style={{ background: C.orange, border: 'none', borderRadius: 8, padding: '6px 12px', color: C.white, fontSize: 12, fontWeight: 600, fontFamily: F, cursor: 'pointer' }}>Save</button>
          </div>
        </div>
      </Block>

      {/* Skills with add */}
      <Block label="Skills (add/remove)">
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {['Product Design', 'Figma', 'React'].map(s => (
            <div key={s} style={{
              padding: '7px 14px', borderRadius: 20, fontSize: 12, fontWeight: 500,
              color: C.textSecondary, background: C.surface, border: `1px solid ${C.border}`,
              display: 'flex', alignItems: 'center', gap: 6, fontFamily: F,
            }}>
              {s}
              <X size={10} color={C.textTertiary} style={{ cursor: 'pointer' }} />
            </div>
          ))}
          <button style={{
            padding: '7px 14px', borderRadius: 20, fontSize: 12, fontWeight: 500,
            color: C.textTertiary, background: 'none',
            border: `1.5px dashed ${C.borderLight}`, cursor: 'pointer', fontFamily: F,
          }}>+ Add</button>
        </div>
      </Block>

      {/* Bio textarea */}
      <Block label="Textarea (bio edit)">
        <textarea readOnly value="Design lead passionate about building systems that scale." rows={3} style={{
          width: '100%', padding: '12px 14px', borderRadius: 14, outline: 'none',
          background: C.surface, color: C.white, fontSize: 13.5, fontWeight: 300,
          border: `1px solid ${C.orange}`, fontFamily: F,
          resize: 'none', lineHeight: 1.6, boxSizing: 'border-box',
        }} />
        <div style={{ display: 'flex', gap: 8, marginTop: 8, justifyContent: 'flex-end' }}>
          <button style={{ background: 'none', border: `1px solid ${C.surface3}`, borderRadius: 8, padding: '6px 14px', color: C.textSecondary, fontSize: 12, cursor: 'pointer', fontFamily: F }}>Cancel</button>
          <button style={{ background: C.orange, border: 'none', borderRadius: 8, padding: '6px 14px', color: C.white, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: F }}>Save</button>
        </div>
      </Block>

      {/* Profile picture uploader */}
      <Block label="Profile picture uploader">
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          {/* Empty state */}
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 80, height: 80, borderRadius: '50%',
              border: `2px dashed ${C.borderLight}`, background: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            }}>
              <Camera size={20} color={C.textTertiary} />
            </div>
            <div style={{ fontSize: 8, color: C.textTertiary, fontFamily: F, marginTop: 4 }}>Empty</div>
          </div>
          {/* With photo */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', position: 'relative', overflow: 'visible' }}>
              <img src={PH} alt="" style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover' }} />
              <button style={{
                position: 'absolute', top: -2, right: -2, width: 22, height: 22, borderRadius: '50%',
                background: C.red, border: `2px solid ${C.bg}`, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
              }}><X size={10} color={C.white} /></button>
            </div>
            <div style={{ fontSize: 8, color: C.textTertiary, fontFamily: F, marginTop: 4 }}>With photo</div>
          </div>
        </div>
      </Block>

      {/* Location autocomplete */}
      <Block label="Location autocomplete">
        <div style={{ maxWidth: 240 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 12,
            background: C.surface2, border: `1.5px solid ${C.orange}`,
          }}>
            <MapPin size={14} color={C.orange} />
            <span style={{ fontSize: 12, color: C.white, fontFamily: F }}>Barce</span>
            <span style={{ fontSize: 12, color: C.textTertiary, fontFamily: F }}>|</span>
          </div>
          <div style={{
            marginTop: 4, borderRadius: 12, overflow: 'hidden',
            background: C.surface, border: `1px solid ${C.border}`,
          }}>
            {['Barcelona, Spain', 'Barcelona, Venezuela', 'Barcena, Italy'].map((city, i, a) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', cursor: 'pointer',
                borderBottom: i < a.length - 1 ? `1px solid ${C.border}` : 'none',
                background: i === 0 ? C.orangeDim : 'transparent',
              }}>
                <MapPin size={12} color={i === 0 ? C.orange : C.textTertiary} />
                <span style={{ fontSize: 12, color: i === 0 ? C.orange : C.text, fontFamily: F, fontWeight: i === 0 ? 500 : 400 }}>{city}</span>
              </div>
            ))}
          </div>
        </div>
      </Block>
    </div>
  )
}

function MediaPage() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '280px 260px', gap: 24, maxWidth: 560 }}>
      {/* Photo hero with vignette */}
      <Block label="Photo hero (discover card)">
        <div style={{ width: '100%', height: 200, borderRadius: 20, overflow: 'hidden', position: 'relative' }}>
          <img src={`${PH.replace('200', '400')}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          {/* Vignette */}
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 40%, transparent 30%, rgba(10,10,10,.25) 70%, rgba(10,10,10,.5) 100%)', pointerEvents: 'none' }} />
          {/* Bottom gradient */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 100, background: 'linear-gradient(to bottom, transparent, rgba(10,10,10,0.9))', padding: '0 14px 10px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ fontSize: 20, fontWeight: 700, color: C.white, letterSpacing: '-0.03em', fontFamily: F }}>Mara Solano</span>
              <BadgeCheck size={14} color={C.orange} fill={C.orange} />
            </div>
            <div style={{ fontSize: 11, color: C.textSecondary, fontFamily: F }}>Product Designer · Figma</div>
          </div>
          {/* Avatar */}
          <div style={{ position: 'absolute', top: 10, left: 10, width: 36, height: 36, borderRadius: 12, overflow: 'hidden', border: `2px solid ${C.orange}`, boxShadow: '0 4px 16px rgba(0,0,0,.4)' }}>
            <img src={PH} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          {/* Photo dots */}
          <div style={{ position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 4 }}>
            {[true, false, false].map((a, i) => <div key={i} style={{ width: a ? 14 : 5, height: 5, borderRadius: 3, background: a ? C.orange : 'rgba(255,255,255,.3)' }} />)}
          </div>
        </div>
      </Block>

      {/* Photo grid with upload/remove */}
      <Block label="Photo grid (profile edit)">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
          {[PH, PH2, PH3].map((url, i) => (
            <div key={i} style={{ aspectRatio: '3/4', borderRadius: 10, background: C.surface2, position: 'relative', overflow: 'hidden' }}>
              <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <button style={{
                position: 'absolute', top: 4, right: 4, width: 18, height: 18, borderRadius: 6,
                background: 'rgba(0,0,0,.5)', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}><X size={8} color="rgba(255,255,255,.7)" /></button>
            </div>
          ))}
          {/* Upload slot */}
          <div style={{
            aspectRatio: '3/4', borderRadius: 10, background: 'none',
            border: `1.5px dashed ${C.borderLight}`, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: 18, color: C.textTertiary, fontWeight: 300 }}>+</span>
          </div>
        </div>
      </Block>

      {/* Work tile */}
      <Block label="Work tile (2-col grid)">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {[
            { label: 'Figma Components', color: '#6C5CE7', role: 'Lead', year: '2024' },
            { label: 'Design System', color: '#00B894', role: 'Architect', year: '2023' },
          ].map(w => (
            <div key={w.label} style={{ aspectRatio: '1', borderRadius: 14, overflow: 'hidden', position: 'relative', background: w.color }}>
              <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', fontSize: 28, fontWeight: 700, color: 'rgba(255,255,255,.06)' }}>{w.label[0]}</span>
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '20px 8px 7px', background: 'linear-gradient(to top, rgba(0,0,0,.6) 0%, transparent 100%)' }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: C.white, fontFamily: F }}>{w.label}</div>
                <div style={{ fontSize: 8, color: 'rgba(255,255,255,.5)', fontFamily: F }}>{w.role} · {w.year}</div>
              </div>
              <div style={{ position: 'absolute', top: 6, right: 6, width: 18, height: 18, borderRadius: 5, background: 'rgba(0,0,0,.3)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ExternalLink size={8} color="rgba(255,255,255,.6)" />
              </div>
            </div>
          ))}
        </div>
      </Block>

      {/* Project cover + visuals upload */}
      <Block label="Project form (cover + visuals)">
        <div style={{ padding: 12, borderRadius: 12, background: C.surface, border: `1px solid ${C.border}` }}>
          {/* Cover */}
          <div style={{ fontSize: 8, color: C.textTertiary, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4, fontFamily: F }}>Cover</div>
          <div style={{
            width: '100%', aspectRatio: '16/9', borderRadius: 8, marginBottom: 10,
            border: `1.5px dashed ${C.borderLight}`, background: C.surface2,
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              <Camera size={14} color={C.textTertiary} />
              <span style={{ fontSize: 9, color: C.textTertiary, fontFamily: F }}>Add cover</span>
            </div>
          </div>
          {/* Visuals */}
          <div style={{ fontSize: 8, color: C.textTertiary, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4, fontFamily: F }}>Visuals (0/12)</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
            <button style={{
              aspectRatio: '1', borderRadius: 6, background: 'none',
              border: `1.5px dashed ${C.borderLight}`, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}><Plus size={10} color={C.textTertiary} /></button>
          </div>
        </div>
      </Block>

      {/* CTA footer */}
      <Block label="Card CTA footer">
        <div style={{
          padding: 16, borderRadius: 20,
          background: `${C.orange}08`,
          border: `1px solid ${C.orangeBorder}`,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
        }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 12,
              background: `${C.orange}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}><Heart size={16} color={C.white} /></div>
            <div style={{
              width: 36, height: 36, borderRadius: 12,
              background: C.surface, border: `1px solid ${C.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}><Bookmark size={16} color={C.textTertiary} /></div>
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.white, fontFamily: F }}>Interested in Mara?</div>
          <div style={{ fontSize: 10, color: C.textTertiary, fontFamily: F }}>Swipe right or tap the heart</div>
        </div>
        {/* End marker */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', marginTop: 10 }}>
          <div style={{ width: 20, height: 1, background: C.border }} />
          <span style={{ fontSize: 9.5, fontWeight: 500, color: C.textTertiary, letterSpacing: '0.06em', fontFamily: F }}>END</span>
          <div style={{ width: 20, height: 1, background: C.border }} />
        </div>
      </Block>

      {/* Connection strip */}
      <Block label="Connection avatar strip (chat)">
        <div style={{ display: 'flex', gap: 10 }}>
          {[{ photo: PH, name: 'Mara', online: true }, { photo: PH2, name: 'Kai', online: false }, { photo: PH3, name: 'Aisha', online: true }].map((c, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, cursor: 'pointer' }}>
              <div style={{ position: 'relative' }}>
                <img src={c.photo} alt="" style={{ width: 44, height: 44, borderRadius: 15, objectFit: 'cover', border: `2px solid ${C.orange}30` }} />
                {c.online && <div style={{ position: 'absolute', bottom: 0, right: -1, width: 12, height: 12, borderRadius: 6, background: C.green, border: `2px solid ${C.bg}` }} />}
              </div>
              <span style={{ fontSize: 9, color: C.textSecondary, fontWeight: 500, fontFamily: F }}>{c.name}</span>
            </div>
          ))}
        </div>
      </Block>
    </div>
  )
}

function AuthPage() {
  const [showPw, setShowPw] = useState(false)
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '260px 260px', gap: 24, maxWidth: 560 }}>
      {/* Password input with eye toggle */}
      <Block label="Password with eye toggle">
        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: 9, fontWeight: 500, color: C.textTertiary, letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: F, marginBottom: 5 }}>PASSWORD</div>
          <div style={{ position: 'relative' }}>
            <input readOnly value={showPw ? 'mypassword' : '••••••••'} style={{
              width: '100%', padding: '10px 42px 10px 14px', borderRadius: 12,
              background: C.surface2, border: `1.5px solid ${C.surface3}`,
              fontSize: 12, color: C.white, fontFamily: F, outline: 'none', boxSizing: 'border-box',
            }} />
            <button onClick={() => setShowPw(!showPw)} style={{
              position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {showPw
                ? <Eye size={14} color={C.orange} />
                : <EyeOff size={14} color={C.textTertiary} />
              }
            </button>
          </div>
        </div>
      </Block>

      {/* Social divider */}
      <Block label="Social divider">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, height: 1, background: C.border }} />
          <span style={{ fontSize: 11, color: C.textTertiary, fontFamily: F }}>or with email</span>
          <div style={{ flex: 1, height: 1, background: C.border }} />
        </div>
      </Block>

      {/* T&C notice */}
      <Block label="Terms & conditions notice">
        <div style={{ fontSize: 11, color: C.textTertiary, fontFamily: F, lineHeight: 1.6 }}>
          By signing up you agree to our{' '}
          <span style={{ color: C.textSecondary, textDecoration: 'underline', cursor: 'pointer' }}>Terms of Service</span>
          {' '}and{' '}
          <span style={{ color: C.textSecondary, textDecoration: 'underline', cursor: 'pointer' }}>Privacy Policy</span>.
        </div>
      </Block>

      {/* Auth error banner */}
      <Block label="Auth error banner">
        <div style={{
          padding: '12px 16px', borderRadius: 12,
          background: C.red + '12', border: `1px solid ${C.red}30`,
          fontSize: 13, color: C.red, fontFamily: F, lineHeight: 1.5,
        }}>Wrong email or password. Try again.</div>
        <div style={{ height: 8 }} />
        <div style={{
          padding: '12px 16px', borderRadius: 12,
          background: '#F59E0B12', border: '1px solid #F59E0B30',
          fontSize: 13, color: '#F59E0B', fontFamily: F, lineHeight: 1.5,
        }}>Please verify your email address.</div>
      </Block>

      {/* Forgot password link */}
      <Block label="Forgot password link">
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <span style={{ fontSize: 10, color: C.orange, fontFamily: F, cursor: 'pointer' }}>Forgot?</span>
        </div>
      </Block>

      {/* Full auth form composition */}
      <Block label="Auth form composition" maxW={260}>
        <div style={{ padding: '20px 16px', borderRadius: 16, background: C.surface, border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: C.white, letterSpacing: '-0.03em', fontFamily: F, marginBottom: 4 }}>Welcome back.</div>
          <div style={{ fontSize: 11, color: C.textTertiary, fontFamily: F, marginBottom: 14 }}>Pick up where you left off.</div>
          <button style={{ width: '100%', padding: 10, borderRadius: 50, background: 'transparent', border: `1px solid rgba(255,255,255,.2)`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 12, color: C.textSecondary, fontFamily: F, cursor: 'pointer', marginBottom: 8 }}>
            <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#4285F4' }} /> Google
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '10px 0' }}>
            <div style={{ flex: 1, height: 1, background: C.border }} />
            <span style={{ fontSize: 11, color: C.textTertiary, fontFamily: F }}>or with email</span>
            <div style={{ flex: 1, height: 1, background: C.border }} />
          </div>
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 9, fontWeight: 500, color: C.textTertiary, letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: F, marginBottom: 5 }}>EMAIL</div>
            <div style={{ padding: '10px 14px', borderRadius: 12, background: C.surface2, border: `1.5px solid ${C.surface3}`, fontSize: 12, color: C.textTertiary, fontFamily: F }}>name@email.com</div>
          </div>
          <div style={{ marginBottom: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
              <span style={{ fontSize: 9, fontWeight: 500, color: C.textTertiary, letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: F }}>PASSWORD</span>
              <span style={{ fontSize: 10, color: C.orange, fontFamily: F, cursor: 'pointer' }}>Forgot?</span>
            </div>
            <div style={{ position: 'relative' }}>
              <div style={{ padding: '10px 42px 10px 14px', borderRadius: 12, background: C.surface2, border: `1.5px solid ${C.surface3}`, fontSize: 12, color: C.textTertiary, fontFamily: F }}>••••••••</div>
              <div style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)' }}>
                <EyeOff size={14} color={C.textTertiary} />
              </div>
            </div>
          </div>
          <div style={{ fontSize: 11, color: C.textTertiary, fontFamily: F, lineHeight: 1.6, marginBottom: 14 }}>
            By signing up you agree to our <span style={{ color: C.textSecondary, textDecoration: 'underline' }}>Terms</span> and <span style={{ color: C.textSecondary, textDecoration: 'underline' }}>Privacy Policy</span>.
          </div>
          <button style={{ width: '100%', padding: 12, borderRadius: 50, border: 'none', background: C.white, color: C.bg, fontSize: 13, fontWeight: 600, fontFamily: F, cursor: 'pointer' }}>Sign in</button>
          <div style={{ textAlign: 'center', marginTop: 12 }}>
            <span style={{ fontSize: 11, color: C.textTertiary, fontFamily: F }}>Don't have an account? </span>
            <span style={{ fontSize: 11, color: C.white, fontWeight: 600, fontFamily: F, cursor: 'pointer' }}>Sign up</span>
          </div>
        </div>
      </Block>
    </div>
  )
}

function ProfilePage() {
  const [lookingFor, setLookingFor] = useState([0, 2])
  const toggleLF = (i) => setLookingFor(p => p.includes(i) ? p.filter(x => x !== i) : [...p, i])

  const lookingForOptions = [
    { icon: <Users size={16} />, color: C.orange, label: 'Collaborator', desc: 'Someone to build with on projects' },
    { icon: <Code size={16} />, color: C.blue, label: 'Hire', desc: 'Looking for talent to join my team' },
    { icon: <Briefcase size={16} />, color: C.green, label: 'Work', desc: 'Open to freelance or full-time roles' },
  ]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '280px 260px', gap: 24, maxWidth: 560 }}>
      {/* Profile hub layout */}
      <Block label="Profile hub layout">
        <div style={{ padding: 16, borderRadius: 20, background: C.surface, border: `1px solid ${C.border}` }}>
          {/* Avatar + completion ring */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ position: 'relative', marginBottom: 8 }}>
              <Avatar src={PH} name="Mara" size={64} />
              <svg width="76" height="76" style={{ position: 'absolute', top: -6, left: -6 }}>
                <circle cx="38" cy="38" r="35" fill="none" stroke={C.surface3} strokeWidth="2.5" />
                <circle cx="38" cy="38" r="35" fill="none" stroke={C.orange} strokeWidth="2.5"
                  strokeDasharray={`${0.78 * 2 * Math.PI * 35} ${2 * Math.PI * 35}`}
                  strokeLinecap="round" transform="rotate(-90 38 38)" />
              </svg>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: C.white, fontFamily: F }}>Mara Solano</span>
              <BadgeCheck size={14} color={C.orange} fill={C.orange} />
            </div>
            <div style={{ fontSize: 11, color: C.textTertiary, fontFamily: F, marginTop: 2 }}>Product Designer</div>
            <div style={{ padding: '3px 8px', borderRadius: 6, background: C.orangeDim, fontSize: 9, fontWeight: 600, color: C.orange, marginTop: 6 }}>78% complete</div>
          </div>
          {/* Stats */}
          <div style={{ display: 'flex', gap: 5, marginBottom: 12 }}>
            {[{ v: '24', l: 'Saves' }, { v: '8', l: 'Matches' }, { v: '142', l: 'Views' }].map(s => (
              <div key={s.l} style={{ flex: 1, padding: '12px 0', borderRadius: 14, background: C.surface, border: `1px solid ${C.border}`, textAlign: 'center' }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: C.white, letterSpacing: '-0.02em', fontFamily: F }}>{s.v}</div>
                <div style={{ fontSize: 9, color: C.textTertiary, fontFamily: F, marginTop: 2 }}>{s.l}</div>
              </div>
            ))}
          </div>
          {/* Nav rows */}
          <div style={{ borderRadius: 14, overflow: 'hidden' }}>
            {[
              { icon: <UserCircle size={16} color={C.textSecondary} />, label: 'My Profile', desc: 'Photos, bio, skills' },
              { icon: <Sliders size={16} color={C.textSecondary} />, label: 'Preferences', desc: 'Distance, roles' },
              { icon: <Target size={16} color={C.textSecondary} />, label: 'Looking for', desc: 'Collaborator, hire' },
              { icon: <Settings size={16} color={C.textSecondary} />, label: 'Settings', desc: 'Account, privacy' },
            ].map((r, i, a) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: 14, cursor: 'pointer',
                borderBottom: i < a.length - 1 ? `1px solid ${C.border}` : 'none',
              }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: C.surface2, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{r.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, color: C.text, fontWeight: 500, fontFamily: F }}>{r.label}</div>
                  <div style={{ fontSize: 11, color: C.textTertiary, fontFamily: F, marginTop: 1 }}>{r.desc}</div>
                </div>
                <ChevronRight size={14} color={C.textTertiary} />
              </div>
            ))}
          </div>
        </div>
      </Block>

      <div>
        {/* Pro upgrade card */}
        <Block label="Pro upgrade card">
          <div style={{
            padding: 14, borderRadius: 18,
            background: `${C.orange}08`,
            border: `1px solid ${C.orangeBorder}`, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 13,
              background: `${C.orange}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              boxShadow: SHADOW.glowStrong,
            }}><Crown size={18} color={C.white} /></div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.orange, fontFamily: F }}>Upgrade to Pro</div>
              <div style={{ fontSize: 10, color: C.textTertiary, fontFamily: F, marginTop: 1 }}>Unlimited swipes, 3D mode</div>
            </div>
            <ChevronRight size={14} color={C.textTertiary} />
          </div>
        </Block>

        {/* Looking For option cards */}
        <Block label="Looking For cards">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {lookingForOptions.map((opt, i) => {
              const active = lookingFor.includes(i)
              return (
                <div key={i} onClick={() => toggleLF(i)} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, cursor: 'pointer',
                  background: active ? C.orange + '0A' : C.surface,
                  outline: active ? `1.5px solid ${C.orangeBorder}` : `1px solid ${C.border}`,
                }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 12,
                    background: opt.color + '18',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    color: opt.color,
                  }}>{opt.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.white, fontFamily: F }}>{opt.label}</div>
                    <div style={{ fontSize: 10, color: C.textTertiary, fontFamily: F, marginTop: 1 }}>{opt.desc}</div>
                  </div>
                  <div style={{
                    width: 22, height: 22, borderRadius: 6,
                    background: active ? C.orange : 'transparent',
                    border: active ? 'none' : `1.5px solid ${C.surface3}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    {active && <Check size={12} color={C.white} strokeWidth={3} />}
                  </div>
                </div>
              )
            })}
          </div>
        </Block>
      </div>
    </div>
  )
}

function DiscoverPage() {
  const [promptExpanded, setPromptExpanded] = useState(false)
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '260px 260px', gap: 24, maxWidth: 560 }}>
      {/* Card stack */}
      <Block label="Card stack (depth)">
        <div style={{ position: 'relative', width: 220, height: 300 }}>
          {/* Back card */}
          <div style={{
            position: 'absolute', top: 20, left: 14, right: 14, bottom: 0,
            borderRadius: 28, background: C.surface2, border: `1px solid ${C.border}`,
            transform: 'scale(0.92)',
          }} />
          {/* Front card */}
          <div style={{
            position: 'absolute', inset: 0,
            borderRadius: 28, overflow: 'hidden', background: C.surface,
            border: `1px solid ${C.border}`, boxShadow: SHADOW.lg,
          }}>
            <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=500&fit=crop&crop=face" alt="" style={{ width: '100%', height: '65%', objectFit: 'cover' }} />
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '40px 16px 14px', background: 'linear-gradient(to bottom, transparent, rgba(10,10,10,0.9))' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ fontSize: 18, fontWeight: 700, color: C.white, fontFamily: F }}>Mara Solano</span>
                <BadgeCheck size={14} color={C.orange} fill={C.orange} />
              </div>
              <div style={{ fontSize: 11, color: C.textSecondary, fontFamily: F }}>Product Designer</div>
            </div>
            {/* Photo dots */}
            <div style={{ position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 4 }}>
              {[true, false, false].map((a, i) => <div key={i} style={{ width: a ? 14 : 5, height: 5, borderRadius: 3, background: a ? C.orange : 'rgba(255,255,255,.3)' }} />)}
            </div>
          </div>
        </div>
      </Block>

      {/* Swipe indicators (in context) */}
      <div>
        <Block label="LIKE / NOPE indicators">
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{
              padding: '6px 14px', borderRadius: 10, display: 'inline-block',
              border: `3px solid ${C.green}`, background: 'rgba(52,211,153,.12)',
              fontSize: 18, fontWeight: 800, color: C.green, letterSpacing: '0.08em',
              transform: 'rotate(-12deg)', fontFamily: F,
            }}>LIKE</div>
            <div style={{
              padding: '6px 14px', borderRadius: 10, display: 'inline-block',
              border: `3px solid ${C.red}`, background: 'rgba(248,113,113,.12)',
              fontSize: 18, fontWeight: 800, color: C.red, letterSpacing: '0.08em',
              transform: 'rotate(12deg)', fontFamily: F,
            }}>NOPE</div>
          </div>
        </Block>

        {/* Prompt card variant 2 - orange tinted */}
        <Block label="Prompt card (orange tint)">
          <div style={{
            padding: '18px 18px 16px', borderRadius: 20, position: 'relative', overflow: 'hidden',
            background: `${C.orange}08`,
            border: `1px solid ${C.orangeBorder}`,
          }}>
            <span style={{ position: 'absolute', top: 8, left: 14, fontSize: 48, fontWeight: 700, color: C.orange, opacity: 0.2, lineHeight: 1 }}>"</span>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: C.orange, marginBottom: 10, fontFamily: F }}>What excites me right now</div>
            <div style={{ fontSize: 14, fontWeight: 400, color: C.text, lineHeight: 1.6, fontFamily: F }}>The intersection of generative art and brand systems.</div>
          </div>
        </Block>
      </div>

      {/* Horizontal scroll gallery */}
      <Block label="Horizontal scroll gallery">
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
          {[PH, PH2, PH3, PH, PH2].map((url, i) => (
            <div key={i} style={{ width: 100, height: 140, borderRadius: 10, overflow: 'hidden', flexShrink: 0 }}>
              <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          ))}
        </div>
      </Block>

      {/* Fullscreen image overlay */}
      <Block label="Fullscreen image overlay">
        <div style={{
          width: 220, height: 180, borderRadius: 14, overflow: 'hidden',
          background: 'rgba(0,0,0,.92)', position: 'relative',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <img src={PH} alt="" style={{ maxWidth: '70%', maxHeight: '70%', borderRadius: 10, objectFit: 'cover' }} />
          <button style={{
            position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 10,
            background: 'rgba(255,255,255,.1)', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}><X size={14} color={C.white} /></button>
        </div>
      </Block>

      {/* Expandable prompt button */}
      <Block label="Expandable prompt button">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Collapsed */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 20,
            background: C.surface, border: `1px solid ${C.border}`, cursor: 'pointer',
          }} onClick={() => setPromptExpanded(!promptExpanded)}>
            <HelpCircle size={13} color={C.orange} />
            <span style={{ flex: 1, fontSize: 12, fontWeight: 500, color: C.text, fontFamily: F }}>A project I'm proud of</span>
            <Check size={12} color={C.green} />
          </div>
          {/* Expanded */}
          {promptExpanded && (
            <div style={{
              padding: 14, borderRadius: 16,
              background: C.surface, border: `1px solid ${C.orangeBorder}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <HelpCircle size={13} color={C.orange} />
                <span style={{ fontSize: 12, fontWeight: 500, color: C.orange, fontFamily: F }}>A project I'm proud of</span>
              </div>
              <textarea readOnly value="Led the redesign of Figma's component library, reducing friction by 40%." rows={3} style={{
                width: '100%', padding: '10px 12px', borderRadius: 10, outline: 'none',
                background: C.surface2, color: C.white, fontSize: 13, fontWeight: 300,
                border: `1px solid ${C.border}`, fontFamily: F,
                resize: 'none', lineHeight: 1.5, boxSizing: 'border-box',
              }} />
            </div>
          )}
        </div>
      </Block>
    </div>
  )
}

function GlassPage() {
  return (
    <div style={{ display: 'flex', gap: 20, maxWidth: 600 }}>
      {/* Glass levels */}
      <div style={{ flex: 1 }}>
        <Block label="Glass intensities">
          <div style={{
            position: 'relative', borderRadius: 16, overflow: 'hidden', height: 320,
            background: `linear-gradient(135deg, ${C.orange}30, ${C.blue}20, ${C.green}15)`,
          }}>
            {/* Floating circles for visual depth */}
            <div style={{ position: 'absolute', width: 120, height: 120, borderRadius: '50%', background: C.orange, opacity: 0.3, top: 20, left: 30, filter: 'blur(40px)' }} />
            <div style={{ position: 'absolute', width: 80, height: 80, borderRadius: '50%', background: C.blue, opacity: 0.25, bottom: 40, right: 20, filter: 'blur(30px)' }} />

            <div style={{ position: 'relative', zIndex: 1, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: 'Light', blur: 8, bg: 0.2, border: 0.06 },
                { label: 'Medium', blur: 16, bg: 0.4, border: 0.1 },
                { label: 'Heavy', blur: 24, bg: 0.55, border: 0.12 },
              ].map(g => (
                <div key={g.label} style={{
                  padding: '14px 16px', borderRadius: 14,
                  background: `rgba(19,19,19,${g.bg})`,
                  backdropFilter: `blur(${g.blur}px)`, WebkitBackdropFilter: `blur(${g.blur}px)`,
                  border: `1px solid rgba(255,255,255,${g.border})`,
                }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.white, fontFamily: F, marginBottom: 2 }}>{g.label}</div>
                  <div style={{ fontSize: 9, color: C.textTertiary, fontFamily: 'monospace' }}>
                    blur({g.blur}px) · bg {Math.round(g.bg * 100)}% · border {Math.round(g.border * 100)}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Block>
      </div>

      {/* Glass card composition */}
      <div style={{ width: 240 }}>
        <Block label="App column glass">
          <div style={{
            padding: 16, borderRadius: 20, height: 200,
            background: `${C.bg}8C`,
            backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
            border: `1px solid rgba(255,255,255,0.1)`,
            boxShadow: `0 24px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)`,
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            position: 'relative', overflow: 'hidden',
          }}>
            {/* Noise texture */}
            <div style={{
              position: 'absolute', inset: 0, borderRadius: 'inherit', opacity: 0.03,
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
              backgroundSize: '128px 128px', pointerEvents: 'none',
            }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: C.white, fontFamily: F }}>pa<span style={{ color: C.orange }}>i</span>ro</span>
            </div>
            <div style={{ fontSize: 10, color: C.textTertiary, fontFamily: 'monospace' }}>
              blur: 24px<br />bg: 55% opacity<br />border: 10%<br />noise: 3%
            </div>
          </div>
        </Block>
        <Block label="Noise overlay">
          <div style={{ display: 'flex', gap: 8 }}>
            {[0, 0.02, 0.05, 0.1].map(n => (
              <div key={n} style={{
                width: 48, height: 36, borderRadius: 8, background: C.surface,
                border: `1px solid ${C.border}`, position: 'relative', overflow: 'hidden',
              }}>
                <div style={{
                  position: 'absolute', inset: 0, opacity: n,
                  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
                  backgroundSize: '128px', pointerEvents: 'none',
                }} />
                <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', height: '100%', paddingBottom: 4 }}>
                  <span style={{ fontSize: 7, color: C.textTertiary, fontFamily: 'monospace' }}>{n * 100}%</span>
                </div>
              </div>
            ))}
          </div>
        </Block>
      </div>
    </div>
  )
}

function ScreensPage() {
  return (
    <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 8 }}>
      {/* Discover */}
      <Phone height={460}>
        <div style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: C.white, fontFamily: F }}>pa<span style={{ color: C.orange }}>i</span>ro</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ padding: '2px 6px', borderRadius: 6, background: C.orangeDim, fontSize: 9, fontWeight: 600, color: C.orange, fontFamily: F }}>20 left</div>
            <div style={{ display: 'inline-flex', padding: 2, borderRadius: 8, background: C.surface, border: `1px solid ${C.border}` }}>
              <div style={{ padding: '3px 8px', borderRadius: 6, background: C.orange, fontSize: 9, fontWeight: 600, color: '#fff', fontFamily: F }}>Cards</div>
              <div style={{ padding: '3px 8px', borderRadius: 6, fontSize: 9, fontWeight: 500, color: C.textTertiary, fontFamily: F }}>3D</div>
            </div>
          </div>
        </div>
        {/* Card preview */}
        <div style={{ flex: 1, margin: '0 8px', borderRadius: 20, overflow: 'hidden', position: 'relative', background: C.surface }}>
          <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=600&fit=crop&crop=face" alt="" style={{ width: '100%', height: '70%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '40px 14px 12px', background: 'linear-gradient(to bottom, transparent, rgba(10,10,10,0.9))' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: C.white, fontFamily: F }}>Mara Solano</span>
              <BadgeCheck size={14} color={C.orange} fill={C.orange} />
            </div>
            <div style={{ fontSize: 11, color: C.textSecondary, fontFamily: F }}>Product Designer · Figma</div>
          </div>
          {/* Photo dots */}
          <div style={{ position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 4 }}>
            {[true, false, false].map((a, i) => <div key={i} style={{ width: a ? 14 : 5, height: 5, borderRadius: 3, background: a ? C.orange : 'rgba(255,255,255,.3)' }} />)}
          </div>
        </div>
        {/* Tab bar */}
        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', height: 44, borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
          <Compass size={18} color={C.orange} fill={C.orange} strokeWidth={2.2} />
          <MessageCircle size={18} color={C.textTertiary} strokeWidth={1.5} />
          <User size={18} color={C.textTertiary} strokeWidth={1.5} />
        </div>
      </Phone>

      {/* Profile */}
      <Phone height={460}>
        <div style={{ padding: '8px 12px', flexShrink: 0 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: C.white, fontFamily: F }}>pa<span style={{ color: C.orange }}>i</span>ro</span>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px' }}>
          {/* Avatar + completion */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 0 8px' }}>
            <div style={{ position: 'relative', marginBottom: 10 }}>
              <Avatar src={PH} name="Mara" size={60} />
              <svg width="72" height="72" style={{ position: 'absolute', top: -6, left: -6 }}>
                <circle cx="36" cy="36" r="33" fill="none" stroke={C.surface3} strokeWidth="2" />
                <circle cx="36" cy="36" r="33" fill="none" stroke={C.orange} strokeWidth="2"
                  strokeDasharray={`${0.78 * 2 * Math.PI * 33} ${2 * Math.PI * 33}`}
                  strokeLinecap="round" transform="rotate(-90 36 36)" />
              </svg>
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.white, fontFamily: F }}>Mara Solano</div>
            <div style={{ fontSize: 10, color: C.textTertiary, fontFamily: F, marginBottom: 4 }}>Product Designer</div>
            <div style={{ padding: '3px 8px', borderRadius: 6, background: C.orangeDim, fontSize: 9, fontWeight: 600, color: C.orange }}>78% complete</div>
          </div>
          {/* Stats */}
          <div style={{ display: 'flex', gap: 5, marginBottom: 10 }}>
            {[{ v: '24', l: 'Saves' }, { v: '8', l: 'Matches' }, { v: '142', l: 'Views' }].map(s => (
              <div key={s.l} style={{ flex: 1, padding: '8px 0', borderRadius: 10, background: C.surface, border: `1px solid ${C.border}`, textAlign: 'center' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.white, fontFamily: F }}>{s.v}</div>
                <div style={{ fontSize: 8, color: C.textTertiary, fontFamily: F, marginTop: 1 }}>{s.l}</div>
              </div>
            ))}
          </div>
          {/* Nav rows */}
          <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
            {[
              { icon: <UserCircle size={14} color={C.textSecondary} />, label: 'My Profile' },
              { icon: <Sliders size={14} color={C.textSecondary} />, label: 'Preferences' },
              { icon: <Target size={14} color={C.textSecondary} />, label: 'Looking for' },
              { icon: <Settings size={14} color={C.textSecondary} />, label: 'Settings' },
            ].map((r, i, a) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '10px 10px',
                borderBottom: i < a.length - 1 ? `1px solid ${C.border}` : 'none',
              }}>
                <div style={{ width: 26, height: 26, borderRadius: 7, background: C.surface2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{r.icon}</div>
                <span style={{ flex: 1, fontSize: 12, color: C.text, fontFamily: F }}>{r.label}</span>
                <ChevronLeft size={12} color={C.textTertiary} style={{ transform: 'rotate(180deg)' }} />
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', height: 44, borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
          <Compass size={18} color={C.textTertiary} strokeWidth={1.5} />
          <MessageCircle size={18} color={C.textTertiary} strokeWidth={1.5} />
          <User size={18} color={C.orange} fill={C.orange} strokeWidth={2.2} />
        </div>
      </Phone>

      {/* Auth */}
      <Phone height={460}>
        <div style={{ flex: 1, padding: '24px 20px 16px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: C.white, letterSpacing: '-0.04em', fontFamily: F, marginBottom: 4 }}>Welcome back.</div>
          <div style={{ fontSize: 12, color: C.textTertiary, fontFamily: F, marginBottom: 20 }}>Pick up where you left off.</div>
          {/* Social */}
          <button style={{ width: '100%', padding: 10, borderRadius: 50, background: 'transparent', border: `1px solid rgba(255,255,255,.2)`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 12, color: C.textSecondary, fontFamily: F, cursor: 'pointer', marginBottom: 8 }}>
            <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#4285F4' }} /> Google
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '10px 0' }}>
            <div style={{ flex: 1, height: 1, background: C.border }} />
            <span style={{ fontSize: 10, color: C.textTertiary, fontFamily: F }}>or with email</span>
            <div style={{ flex: 1, height: 1, background: C.border }} />
          </div>
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 9, fontWeight: 500, color: C.textTertiary, letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: F, marginBottom: 5 }}>EMAIL</div>
            <div style={{ padding: '10px 14px', borderRadius: 12, background: C.surface2, border: `1.5px solid ${C.surface3}`, fontSize: 12, color: C.textTertiary, fontFamily: F }}>name@email.com</div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
              <span style={{ fontSize: 9, fontWeight: 500, color: C.textTertiary, letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: F }}>PASSWORD</span>
              <span style={{ fontSize: 10, color: C.orange, fontFamily: F }}>Forgot?</span>
            </div>
            <div style={{ padding: '10px 14px', borderRadius: 12, background: C.surface2, border: `1.5px solid ${C.surface3}`, fontSize: 12, color: C.textTertiary, fontFamily: F }}>••••••••</div>
          </div>
          <button style={{ width: '100%', padding: 12, borderRadius: 50, border: 'none', background: C.white, color: C.bg, fontSize: 13, fontWeight: 600, fontFamily: F, cursor: 'pointer' }}>Sign in</button>
          <div style={{ marginTop: 'auto', textAlign: 'center', paddingTop: 12 }}>
            <span style={{ fontSize: 11, color: C.textTertiary, fontFamily: F }}>Don't have an account? </span>
            <span style={{ fontSize: 11, color: C.white, fontWeight: 600, fontFamily: F }}>Sign up</span>
          </div>
        </div>
      </Phone>

      {/* Onboarding step */}
      <Phone height={460}>
        <div style={{ flex: 1, padding: '16px 16px 12px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
            <ChevronLeft size={16} color={C.white} />
            <span style={{ fontSize: 12, color: C.textSecondary, fontFamily: F }}>Back</span>
          </div>
          {/* Progress dots */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: C.surface, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Briefcase size={14} color={C.orange} />
            </div>
            <div style={{ display: 'flex', gap: 3 }}>
              {Array.from({ length: 12 }, (_, i) => (
                <div key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: i < 3 ? C.orange : i === 3 ? C.orangeLight : C.surface3 }} />
              ))}
            </div>
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: C.white, letterSpacing: '-0.02em', fontFamily: F, marginBottom: 4 }}>What's your role?</div>
          <div style={{ fontSize: 11, color: C.textTertiary, fontFamily: F, marginBottom: 16 }}>Type your role. Be specific.</div>
          <div style={{ padding: '10px 14px', borderRadius: 12, background: C.surface2, border: `1.5px solid ${C.orange}`, fontSize: 12, color: C.white, fontFamily: F, marginBottom: 12 }}>Creative Director</div>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {['Designer', 'Developer', 'Product', 'Strategist', 'Other'].map(r => (
              <div key={r} style={{ padding: '5px 10px', borderRadius: 20, fontSize: 10, color: r === 'Designer' ? C.orange : C.textTertiary, background: 'transparent', border: `1px solid ${r === 'Designer' ? C.orange : C.surface3}`, fontFamily: F }}>{r}</div>
            ))}
          </div>
          <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: C.orange, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: SHADOW.glow }}>
              <ChevronLeft size={20} color={C.white} style={{ transform: 'rotate(180deg)' }} />
            </div>
          </div>
        </div>
      </Phone>
    </div>
  )
}

function GuidelinesPage() {
  const Do = ({ children }) => (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 8 }}>
      <div style={{ width: 18, height: 18, borderRadius: 6, background: `${C.green}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
        <Check size={10} color={C.green} strokeWidth={3} />
      </div>
      <span style={{ fontSize: 12, color: C.textSecondary, fontFamily: F, lineHeight: 1.5 }}>{children}</span>
    </div>
  )
  const Dont = ({ children }) => (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 8 }}>
      <div style={{ width: 18, height: 18, borderRadius: 6, background: `${C.red}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
        <X size={10} color={C.red} strokeWidth={3} />
      </div>
      <span style={{ fontSize: 12, color: C.textSecondary, fontFamily: F, lineHeight: 1.5 }}>{children}</span>
    </div>
  )

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, maxWidth: 600 }}>
      <Block label="Color usage">
        <Do>Use C.orange ONLY for primary CTA buttons</Do>
        <Do>Use C.orange for active tab/toggle indicators</Do>
        <Do>Use C.orange for the brand logo letter "i"</Do>
        <Do>Use C.surface3 for avatar fallbacks (not orange)</Do>
        <Do>Use neutral borders (C.border) for decorative cards</Do>
        <Dont>Never use orange for decorative backgrounds or borders</Dont>
        <Dont>Never use orangeDim for non-interactive elements</Dont>
        <Dont>Never use orange for section labels or quote marks</Dont>
        <Dont>Never use orange on avatar fallback backgrounds</Dont>
      </Block>
      <Block label="Typography">
        <Do>Use the 9-level TYPE scale for all text</Do>
        <Do>Use negative letter-spacing for headings (-0.02em)</Do>
        <Do>Use positive letter-spacing for labels (+0.12em)</Do>
        <Dont>Never use font sizes outside the scale</Dont>
        <Dont>Never use weight 800+ except for swipe indicators</Dont>
        <Dont>Never use a font other than Space Grotesk</Dont>
      </Block>
      <Block label="Spacing">
        <Do>Use SPACE scale values for all gaps and padding</Do>
        <Do>Use 14px padding for standard card/row content</Do>
        <Do>Use 20px padding for screen-level containers</Do>
        <Dont>Never use spacing values outside the scale</Dont>
        <Dont>Never use margin for layout (use gap instead)</Dont>
      </Block>
      <Block label="Motion">
        <Do>Use spring-based animation for all UI transitions</Do>
        <Do>Use SPRINGS.card for card enter/exit</Do>
        <Do>Use SPRINGS.snappy for button taps (scale 0.97)</Do>
        <Dont>Never use linear easing for UI elements</Dont>
        <Dont>Never animate more than 2 properties simultaneously</Dont>
        <Dont>Never use duration longer than 0.6s for interactions</Dont>
      </Block>
      <Block label="Components">
        <Do>Use Button component for all interactive actions</Do>
        <Do>Use Avatar for all user images (never raw img)</Do>
        <Do>Use Card for all elevated containers</Do>
        <Dont>Never create new button patterns without using Button</Dont>
        <Dont>Never hardcode border-radius (use RADIUS tokens)</Dont>
        <Dont>Never use box-shadow without SHADOW tokens</Dont>
      </Block>
      <Block label="Accessibility">
        <Do>Ensure 4.5:1 contrast for body text on backgrounds</Do>
        <Do>Use minimum 44px tap targets on mobile</Do>
        <Do>Provide loading states for all async operations</Do>
        <Dont>Never rely on color alone to convey meaning</Dont>
        <Dont>Never remove focus indicators</Dont>
        <Dont>Never use text smaller than 9px</Dont>
      </Block>
    </div>
  )
}

// ═══════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════

// ═══════════════════════════════════════════════
// WEB LANDING PAGE PAGES
// ═══════════════════════════════════════════════

const WEB_TYPE = {
  hero: { fontSize: 'clamp(48px, 8vw, 96px)', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 0.95, fontFamily: DISPLAY },
  h1: { fontSize: 'clamp(36px, 5vw, 64px)', fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.05, fontFamily: DISPLAY },
  h2: { fontSize: 'clamp(28px, 3.5vw, 44px)', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.1, fontFamily: DISPLAY },
  h3: { fontSize: 'clamp(20px, 2.5vw, 28px)', fontWeight: 600, letterSpacing: '-0.01em', lineHeight: 1.2, fontFamily: DISPLAY },
  lead: { fontSize: 'clamp(16px, 1.5vw, 20px)', fontWeight: 400, lineHeight: 1.6, fontFamily: F },
  body: { fontSize: 16, fontWeight: 400, lineHeight: 1.7, fontFamily: F },
  caption: { fontSize: 12, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: F },
}

function WebTypePage() {
  return (
    <div style={{ maxWidth: 680 }}>
      <Block label="Display font: Syne">
        <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
          {[400, 500, 600, 700, 800].map(w => (
            <div key={w} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: w, color: C.white, fontFamily: DISPLAY }}>Aa</div>
              <div style={{ fontSize: 8, color: C.textTertiary, fontFamily: 'monospace' }}>{w}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 11, color: C.textTertiary, fontFamily: F, lineHeight: 1.6 }}>
          Syne for display/headings. Space Grotesk for body/UI. Never mix in the same heading.
        </div>
      </Block>

      <Block label="Web type scale">
        {Object.entries(WEB_TYPE).map(([name, s]) => (
          <div key={name} style={{ padding: '10px 0', borderBottom: `1px solid ${C.border}` }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 4 }}>
              <span style={{ fontSize: 9, fontWeight: 600, color: C.orange, fontFamily: F, width: 48 }}>{name}</span>
              <span style={{ fontSize: 8, color: C.textTertiary, fontFamily: 'monospace' }}>{typeof s.fontSize === 'string' ? s.fontSize : s.fontSize + 'px'} · {s.fontWeight}</span>
            </div>
            <div style={{ ...s, color: C.white, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {name === 'hero' ? 'Creative talent.' : name === 'h1' ? 'Find your next collaborator.' : name === 'caption' ? 'HOW IT WORKS' : 'Pairo connects creative professionals worldwide.'}
            </div>
          </div>
        ))}
      </Block>

      <Block label="Font pairing in context">
        <div style={{ padding: 24, borderRadius: 16, background: C.surface, border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.textTertiary, fontFamily: F, marginBottom: 12 }}>THE PLATFORM</div>
          <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 0.95, color: C.white, fontFamily: DISPLAY, marginBottom: 16 }}>
            Match with<br />creative talent.
          </div>
          <div style={{ fontSize: 16, fontWeight: 400, lineHeight: 1.7, color: C.textSecondary, fontFamily: F, maxWidth: 360 }}>
            Swipe through portfolios, connect with professionals, and start collaborating in minutes.
          </div>
        </div>
      </Block>
    </div>
  )
}

function WebHeroPage() {
  return (
    <div style={{ maxWidth: 680 }}>
      <Block label="Hero: centered (default)">
        <div style={{
          padding: '48px 32px', borderRadius: 20, background: C.surface,
          border: `1px solid ${C.border}`, textAlign: 'center',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.textTertiary, fontFamily: F, marginBottom: 16 }}>TALENT MATCHING PLATFORM</div>
            <div style={{ fontSize: 48, fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 0.95, color: C.white, fontFamily: DISPLAY, marginBottom: 20 }}>
              Discover creative<br />professionals.
            </div>
            <div style={{ fontSize: 16, fontWeight: 400, lineHeight: 1.6, color: C.textSecondary, fontFamily: F, maxWidth: 380, margin: '0 auto 28px' }}>
              Swipe, match, and collaborate with designers, developers, and makers worldwide.
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button style={{ padding: '14px 28px', borderRadius: 50, background: C.orange, border: 'none', color: '#fff', fontSize: 14, fontWeight: 600, fontFamily: F, cursor: 'pointer' }}>Get started</button>
              <button style={{ padding: '14px 28px', borderRadius: 50, background: 'transparent', border: `1px solid ${C.border}`, color: C.textSecondary, fontSize: 14, fontWeight: 500, fontFamily: F, cursor: 'pointer' }}>Learn more</button>
            </div>
          </div>
        </div>
      </Block>

      <Block label="Hero: split (image + text)">
        <div style={{
          display: 'flex', gap: 0, borderRadius: 20, overflow: 'hidden',
          background: C.surface, border: `1px solid ${C.border}`, height: 280,
        }}>
          <div style={{ flex: 1, padding: '32px 28px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.textTertiary, fontFamily: F, marginBottom: 12 }}>FOR CREATIVES</div>
            <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.0, color: C.white, fontFamily: DISPLAY, marginBottom: 14 }}>
              Your next<br />collaboration<br />starts here.
            </div>
            <div style={{ fontSize: 14, fontWeight: 400, lineHeight: 1.6, color: C.textSecondary, fontFamily: F, marginBottom: 20 }}>
              Browse portfolios and connect with talent that matches your vision.
            </div>
            <button style={{ padding: '12px 24px', borderRadius: 50, background: C.orange, border: 'none', color: '#fff', fontSize: 13, fontWeight: 600, fontFamily: F, cursor: 'pointer', alignSelf: 'flex-start' }}>Join free</button>
          </div>
          <div style={{ width: '45%', background: C.surface2, position: 'relative', overflow: 'hidden' }}>
            <img src={PH} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.7 }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(17,17,17,0.6), transparent)' }} />
          </div>
        </div>
      </Block>

      <Block label="Hero: minimal (text only)">
        <div style={{ padding: '48px 32px', borderRadius: 20, background: C.bg, border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 56, fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 0.92, color: C.white, fontFamily: DISPLAY, marginBottom: 20 }}>
            pa<span style={{ color: C.orange }}>i</span>ro
          </div>
          <div style={{ fontSize: 18, fontWeight: 400, lineHeight: 1.6, color: C.textTertiary, fontFamily: F, maxWidth: 320 }}>
            Creative talent matching. Swipe. Match. Build.
          </div>
        </div>
      </Block>
    </div>
  )
}

function WebLayoutPage() {
  return (
    <div style={{ maxWidth: 680 }}>
      <Block label="Feature grid (3 columns)">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          {[
            { icon: <Compass size={20} />, title: 'Discover', desc: 'Browse creative profiles with swipe cards and 3D globe.' },
            { icon: <MessageCircle size={20} />, title: 'Connect', desc: 'Match and start real-time conversations instantly.' },
            { icon: <Briefcase size={20} />, title: 'Collaborate', desc: 'Find the right talent for your next project.' },
          ].map((f, i) => (
            <div key={i} style={{ padding: 20, borderRadius: 16, background: C.surface, border: `1px solid ${C.border}` }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: C.surface2, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.white, marginBottom: 14 }}>{f.icon}</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: C.white, fontFamily: DISPLAY, marginBottom: 6 }}>{f.title}</div>
              <div style={{ fontSize: 12, color: C.textTertiary, fontFamily: F, lineHeight: 1.5 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </Block>

      <Block label="Stats row">
        <div style={{ display: 'flex', gap: 0, borderRadius: 16, background: C.surface, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
          {[
            { value: '12K+', label: 'Creatives' },
            { value: '3.2K', label: 'Matches' },
            { value: '94%', label: 'Response rate' },
            { value: '48h', label: 'Avg. first message' },
          ].map((s, i, a) => (
            <div key={i} style={{ flex: 1, padding: '24px 0', textAlign: 'center', borderRight: i < a.length - 1 ? `1px solid ${C.border}` : 'none' }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: C.white, fontFamily: DISPLAY, letterSpacing: '-0.03em' }}>{s.value}</div>
              <div style={{ fontSize: 11, color: C.textTertiary, fontFamily: F, marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </Block>

      <Block label="Testimonial card">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[
            { name: 'Mara Solano', role: 'Product Designer', photo: PH, text: 'Found my co-founder through Pairo. The matching algorithm understood exactly what I was looking for.' },
            { name: 'Kai Andersen', role: 'Full-Stack Engineer', photo: PH2, text: 'Best platform for finding creative collaborators. The quality of profiles is unmatched.' },
          ].map((t, i) => (
            <div key={i} style={{ padding: 20, borderRadius: 16, background: C.surface, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 13, color: C.textSecondary, fontFamily: F, lineHeight: 1.6, marginBottom: 16, fontStyle: 'italic' }}>"{t.text}"</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Avatar src={t.photo} name={t.name} size={32} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.white, fontFamily: F }}>{t.name}</div>
                  <div style={{ fontSize: 10, color: C.textTertiary, fontFamily: F }}>{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Block>

      <Block label="CTA section">
        <div style={{
          padding: '40px 32px', borderRadius: 20,
          background: C.surface, border: `1px solid ${C.border}`,
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.0, color: C.white, fontFamily: DISPLAY, marginBottom: 12 }}>
            Ready to find your<br />next collaborator?
          </div>
          <div style={{ fontSize: 14, color: C.textTertiary, fontFamily: F, marginBottom: 24 }}>Join 12,000+ creatives already on Pairo.</div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button style={{ padding: '14px 32px', borderRadius: 50, background: C.orange, border: 'none', color: '#fff', fontSize: 14, fontWeight: 600, fontFamily: F, cursor: 'pointer' }}>Get started free</button>
          </div>
        </div>
      </Block>

      <Block label="Footer">
        <div style={{ padding: '28px 24px', borderRadius: 16, background: C.surface, border: `1px solid ${C.border}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <span style={{ fontSize: 18, fontWeight: 700, color: C.white, fontFamily: F }}>pa<span style={{ color: C.orange }}>i</span>ro</span>
              <div style={{ fontSize: 11, color: C.textTertiary, fontFamily: F, marginTop: 4 }}>Creative talent matching.</div>
            </div>
            <div style={{ display: 'flex', gap: 24 }}>
              {['Product', 'Company', 'Legal'].map(col => (
                <div key={col}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: C.textSecondary, fontFamily: F, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{col}</div>
                  {['Link one', 'Link two', 'Link three'].map((l, i) => (
                    <div key={i} style={{ fontSize: 12, color: C.textTertiary, fontFamily: F, marginBottom: 4, cursor: 'pointer' }}>{l}</div>
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div style={{ height: 1, background: C.border, marginBottom: 16 }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 10, color: C.textTertiary, fontFamily: F }}>2026 Pairo. All rights reserved.</span>
            <div style={{ display: 'flex', gap: 12 }}>
              {['Twitter', 'LinkedIn', 'Instagram'].map(s => (
                <span key={s} style={{ fontSize: 10, color: C.textTertiary, fontFamily: F, cursor: 'pointer' }}>{s}</span>
              ))}
            </div>
          </div>
        </div>
      </Block>
    </div>
  )
}

function WebMotionPage() {
  const [reveal, setReveal] = useState(false)

  return (
    <div style={{ maxWidth: 680 }}>
      <Block label="Scroll reveal (click to trigger)">
        <button onClick={() => { setReveal(false); setTimeout(() => setReveal(true), 50) }} style={{
          padding: '6px 14px', borderRadius: 50, background: C.surface, border: `1px solid ${C.border}`,
          color: C.textSecondary, fontSize: 11, fontFamily: F, cursor: 'pointer', marginBottom: 16,
        }}>Trigger animation</button>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, overflow: 'hidden' }}>
          {/* Stagger fade-up */}
          {['Discover creative talent.', 'Match with professionals.', 'Start collaborating today.'].map((text, i) => (
            <motion.div
              key={text + reveal}
              initial={{ opacity: 0, y: 24 }}
              animate={reveal ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
              transition={{ delay: i * 0.12, duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
              style={{ fontSize: 20, fontWeight: 700, color: C.white, fontFamily: DISPLAY, letterSpacing: '-0.02em' }}
            >{text}</motion.div>
          ))}
        </div>
      </Block>

      <Block label="Text reveal patterns">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ padding: 16, borderRadius: 12, background: C.surface, border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 9, color: C.orange, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: F, marginBottom: 6 }}>Fade up</div>
            <div style={{ fontSize: 11, color: C.textTertiary, fontFamily: 'monospace', lineHeight: 1.6 }}>
              opacity: 0 → 1<br />y: 24px → 0<br />ease: [.25,.1,.25,1]<br />stagger: 0.12s
            </div>
          </div>
          <div style={{ padding: 16, borderRadius: 12, background: C.surface, border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 9, color: C.orange, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: F, marginBottom: 6 }}>Scale in</div>
            <div style={{ fontSize: 11, color: C.textTertiary, fontFamily: 'monospace', lineHeight: 1.6 }}>
              scale: 0.95 → 1<br />opacity: 0 → 1<br />ease: [.25,.1,.25,1]<br />duration: 0.6s
            </div>
          </div>
          <div style={{ padding: 16, borderRadius: 12, background: C.surface, border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 9, color: C.orange, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: F, marginBottom: 6 }}>Slide in</div>
            <div style={{ fontSize: 11, color: C.textTertiary, fontFamily: 'monospace', lineHeight: 1.6 }}>
              x: -40px → 0<br />opacity: 0 → 1<br />ease: [.25,.1,.25,1]<br />stagger: 0.08s
            </div>
          </div>
          <div style={{ padding: 16, borderRadius: 12, background: C.surface, border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 9, color: C.orange, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: F, marginBottom: 6 }}>Char split</div>
            <div style={{ fontSize: 11, color: C.textTertiary, fontFamily: 'monospace', lineHeight: 1.6 }}>
              per-char y: 16 → 0<br />opacity: 0 → 1<br />delay: i * 0.025<br />duration: 0.35s
            </div>
          </div>
        </div>
      </Block>

      <Block label="Hover states">
        <div style={{ display: 'flex', gap: 12 }}>
          <motion.div whileHover={{ y: -4, boxShadow: SHADOW.md }} transition={{ duration: 0.2 }}
            style={{ padding: 16, borderRadius: 12, background: C.surface, border: `1px solid ${C.border}`, cursor: 'pointer', width: 120, textAlign: 'center' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: C.white, fontFamily: F }}>Lift</div>
            <div style={{ fontSize: 9, color: C.textTertiary, fontFamily: 'monospace' }}>y: -4px</div>
          </motion.div>
          <motion.div whileHover={{ scale: 1.03 }} transition={{ duration: 0.2 }}
            style={{ padding: 16, borderRadius: 12, background: C.surface, border: `1px solid ${C.border}`, cursor: 'pointer', width: 120, textAlign: 'center' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: C.white, fontFamily: F }}>Scale</div>
            <div style={{ fontSize: 9, color: C.textTertiary, fontFamily: 'monospace' }}>1.03x</div>
          </motion.div>
          <motion.div whileHover={{ borderColor: C.orange }} transition={{ duration: 0.2 }}
            style={{ padding: 16, borderRadius: 12, background: C.surface, border: `1px solid ${C.border}`, cursor: 'pointer', width: 120, textAlign: 'center' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: C.white, fontFamily: F }}>Border</div>
            <div style={{ fontSize: 9, color: C.textTertiary, fontFamily: 'monospace' }}>accent</div>
          </motion.div>
        </div>
      </Block>

      <Block label="Smooth scroll stack">
        <div style={{ fontSize: 11, color: C.textTertiary, fontFamily: F, lineHeight: 1.7 }}>
          Use <span style={{ color: C.white, fontWeight: 600 }}>Lenis</span> for smooth scroll. Pair with <span style={{ color: C.white, fontWeight: 600 }}>GSAP ScrollTrigger</span> for section pinning and parallax. Motion (framer-motion) for component-level animations.
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          {['lenis', 'gsap', 'motion/react'].map(lib => (
            <span key={lib} style={{ padding: '4px 10px', borderRadius: 20, background: C.surface, border: `1px solid ${C.border}`, fontSize: 10, color: C.textSecondary, fontFamily: 'monospace' }}>{lib}</span>
          ))}
        </div>
      </Block>
    </div>
  )
}

function WebComponentsPage() {
  return (
    <div style={{ maxWidth: 680 }}>
      <Block label="Navbar">
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 24px', borderRadius: 50, background: C.surface, border: `1px solid ${C.border}`,
        }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: C.white, fontFamily: F }}>pa<span style={{ color: C.orange }}>i</span>ro</span>
          <div style={{ display: 'flex', gap: 24 }}>
            {['Features', 'Pricing', 'About'].map(l => (
              <span key={l} style={{ fontSize: 13, color: C.textSecondary, fontFamily: F, cursor: 'pointer', fontWeight: 400 }}>{l}</span>
            ))}
          </div>
          <button style={{ padding: '10px 20px', borderRadius: 50, background: C.orange, border: 'none', color: '#fff', fontSize: 12, fontWeight: 600, fontFamily: F, cursor: 'pointer' }}>Get started</button>
        </div>
      </Block>

      <Block label="Feature row (image + text)">
        <div style={{
          display: 'flex', gap: 24, alignItems: 'center',
          padding: 20, borderRadius: 20, background: C.surface, border: `1px solid ${C.border}`,
        }}>
          <div style={{ width: 200, height: 160, borderRadius: 14, background: C.surface2, overflow: 'hidden', flexShrink: 0 }}>
            <img src={PH} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.6 }} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.textTertiary, fontFamily: F, marginBottom: 8 }}>DISCOVER</div>
            <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.05, color: C.white, fontFamily: DISPLAY, marginBottom: 10 }}>
              Swipe through<br />creative profiles.
            </div>
            <div style={{ fontSize: 13, color: C.textTertiary, fontFamily: F, lineHeight: 1.6 }}>
              Each card shows portfolio highlights, skills, and availability.
            </div>
          </div>
        </div>
      </Block>

      <Block label="Phone mockup">
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
          <Phone height={320}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: 24, fontWeight: 700, color: C.white, fontFamily: F }}>pa<span style={{ color: C.orange }}>i</span>ro</span>
                <div style={{ fontSize: 10, color: C.textTertiary, fontFamily: F, marginTop: 4 }}>App preview</div>
              </div>
            </div>
          </Phone>
          <Phone height={320}>
            <div style={{ padding: '12px 12px 0', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: C.white, fontFamily: F }}>pa<span style={{ color: C.orange }}>i</span>ro</span>
                <div style={{ display: 'inline-flex', padding: 2, borderRadius: 8, background: C.surface, border: `1px solid ${C.border}` }}>
                  <div style={{ padding: '2px 6px', borderRadius: 5, background: C.orange, fontSize: 8, fontWeight: 600, color: '#fff', fontFamily: F }}>Cards</div>
                  <div style={{ padding: '2px 6px', fontSize: 8, color: C.textTertiary, fontFamily: F }}>3D</div>
                </div>
              </div>
            </div>
            <div style={{ flex: 1, margin: 8, borderRadius: 16, overflow: 'hidden', position: 'relative' }}>
              <img src={PH} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '28px 10px 8px', background: 'linear-gradient(to bottom, transparent, rgba(0,0,0,.8))' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.white, fontFamily: F }}>Mara Solano</div>
                <div style={{ fontSize: 9, color: C.textSecondary, fontFamily: F }}>Product Designer</div>
              </div>
            </div>
          </Phone>
        </div>
      </Block>

      <Block label="Pricing card">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ padding: 20, borderRadius: 16, background: C.surface, border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: C.textTertiary, fontFamily: F, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Free</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: C.white, fontFamily: DISPLAY, letterSpacing: '-0.03em', marginBottom: 4 }}>0</div>
            <div style={{ fontSize: 11, color: C.textTertiary, fontFamily: F, marginBottom: 16 }}>25 swipes/day</div>
            {['Discover profiles', 'Match & chat', 'Basic search'].map(f => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <Check size={12} color={C.textTertiary} />
                <span style={{ fontSize: 12, color: C.textSecondary, fontFamily: F }}>{f}</span>
              </div>
            ))}
          </div>
          <div style={{ padding: 20, borderRadius: 16, background: C.surface, border: `1px solid ${C.orange}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 500, color: C.orange, fontFamily: F, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Pro</span>
              <Crown size={12} color={C.orange} />
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 2, marginBottom: 4 }}>
              <span style={{ fontSize: 32, fontWeight: 800, color: C.white, fontFamily: DISPLAY, letterSpacing: '-0.03em' }}>4.99</span>
              <span style={{ fontSize: 12, color: C.textTertiary, fontFamily: F }}>/mo</span>
            </div>
            <div style={{ fontSize: 11, color: C.textTertiary, fontFamily: F, marginBottom: 16 }}>Unlimited everything</div>
            {['Unlimited swipes', 'See who liked you', '3D Globe mode', 'Profile analytics'].map(f => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <Check size={12} color={C.orange} />
                <span style={{ fontSize: 12, color: C.textSecondary, fontFamily: F }}>{f}</span>
              </div>
            ))}
            <button style={{ width: '100%', padding: '12px', borderRadius: 50, background: C.orange, border: 'none', color: '#fff', fontSize: 13, fontWeight: 600, fontFamily: F, cursor: 'pointer', marginTop: 10 }}>Upgrade</button>
          </div>
        </div>
      </Block>

      <Block label="Logo cloud">
        <div style={{
          padding: '16px 24px', borderRadius: 12, background: C.surface, border: `1px solid ${C.border}`,
          display: 'flex', justifyContent: 'space-around', alignItems: 'center',
        }}>
          {['Figma', 'Stripe', 'Vercel', 'Linear', 'Notion'].map(l => (
            <span key={l} style={{ fontSize: 14, fontWeight: 600, color: C.textTertiary, fontFamily: DISPLAY, letterSpacing: '-0.01em', opacity: 0.5 }}>{l}</span>
          ))}
        </div>
      </Block>
    </div>
  )
}

const PAGES = { colors: ColorsPage, type: TypePage, tokens: TokensPage, buttons: ButtonsPage, inputs: InputsPage, forms: FormsPage, avatars: AvatarsPage, badges: BadgesPage, cards: CardsPage, media: MediaPage, nav: NavPage, chat: ChatPage, overlays: OverlaysPage, states: StatesPage, glass: GlassPage, screens: ScreensPage, guidelines: GuidelinesPage, motion: MotionPage, icons: IconsPage, auth: AuthPage, profile: ProfilePage, discover: DiscoverPage, webtype: WebTypePage, webhero: WebHeroPage, weblayout: WebLayoutPage, webmotion: WebMotionPage, webcomponents: WebComponentsPage }

export default function DesignSystem() {
  const [tab, setTab] = useState('colors')
  const Page = PAGES[tab]

  return (
    <div style={{ background: C.bg, height: '100vh', fontFamily: F, color: C.text, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 20px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
        <span style={{ fontSize: 18, fontWeight: 700, color: C.white }}>pa<span style={{ color: C.orange }}>i</span>ro</span>
        <div style={{ padding: '2px 8px', borderRadius: 20, background: C.orangeDim, border: `1px solid ${C.orangeBorder}`, fontSize: 9, fontWeight: 600, color: C.orange, letterSpacing: '0.06em' }}>DESIGN SYSTEM</div>
        <span style={{ fontSize: 9, color: C.textTertiary, fontFamily: 'monospace', marginLeft: 'auto' }}>
          {Object.keys(C).length} colors · {Object.keys(TYPE).length} type · {Object.keys(RADIUS).length} radius · {Object.keys(SPRINGS).length} springs
        </span>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 3, padding: '7px 20px', borderBottom: `1px solid ${C.border}`, flexShrink: 0, overflowX: 'auto' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '4px 11px', borderRadius: 50,
            background: tab === t.id ? C.orange : 'transparent',
            border: tab === t.id ? 'none' : `1px solid ${C.border}`,
            color: tab === t.id ? '#fff' : C.textTertiary,
            fontSize: 11, fontWeight: tab === t.id ? 600 : 400,
            cursor: 'pointer', fontFamily: F, flexShrink: 0,
          }}>{t.label}</button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 60px' }}>
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.1 }}>
            <Page />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
