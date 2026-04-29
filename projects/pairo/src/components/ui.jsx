import { motion } from 'motion/react'
import { C, TYPE, RADIUS, SPRINGS, SHADOW } from '../constants'

// ── Button ──────────────────────────────────────────
export function Button({ children, variant = 'primary', size = 'md', disabled, loading, onClick, style, ...props }) {
  const variants = {
    primary: {
      background: C.orange,
      color: C.white,
      border: 'none',
      boxShadow: 'none',
    },
    secondary: {
      background: 'transparent',
      color: C.textSecondary,
      border: `1px solid ${C.border}`,
      boxShadow: 'none',
    },
    ghost: {
      background: 'transparent',
      color: C.textTertiary,
      border: 'none',
      boxShadow: 'none',
    },
    danger: {
      background: 'transparent',
      color: C.red,
      border: `1px solid ${C.red}30`,
      boxShadow: 'none',
    },
  }

  const sizes = {
    sm: { padding: '8px 16px', fontSize: 12, borderRadius: RADIUS.sm },
    md: { padding: '12px 20px', fontSize: 14, borderRadius: RADIUS.md },
    lg: { padding: '16px 24px', fontSize: 15, borderRadius: RADIUS.lg },
    full: { padding: '16px', fontSize: 15, borderRadius: RADIUS.pill, width: '100%' },
  }

  return (
    <motion.button
      onClick={disabled || loading ? undefined : onClick}
      whileTap={disabled ? {} : { scale: 0.97 }}
      disabled={disabled || loading}
      style={{
        cursor: disabled ? 'default' : 'pointer',
        fontFamily: "'Space Grotesk', sans-serif",
        fontWeight: 600,
        letterSpacing: '-0.01em',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        opacity: disabled ? 0.4 : loading ? 0.7 : 1,
        transition: 'opacity 0.2s',
        ...variants[variant],
        ...sizes[size],
        ...style,
      }}
      {...props}
    >
      {loading ? (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          style={{
            width: 16, height: 16, borderRadius: '50%',
            border: '2px solid transparent',
            borderTopColor: variant === 'primary' ? C.white : C.orange,
          }}
        />
      ) : children}
    </motion.button>
  )
}

// ── Input ──────────────────────────────────────────
export function Input({ label, error, style, ...props }) {
  return (
    <div>
      {label && (
        <label style={{
          ...TYPE.caption,
          color: C.textTertiary,
          display: 'block', marginBottom: 8,
        }}>{label}</label>
      )}
      <input
        style={{
          width: '100%', padding: '14px 18px',
          borderRadius: RADIUS.md,
          background: C.surface2,
          border: `1.5px solid ${error ? C.red + '60' : C.surface3}`,
          color: C.white, fontSize: 14, outline: 'none',
          fontFamily: "'Space Grotesk', sans-serif",
          fontWeight: 400,
          transition: 'border-color 0.2s',
          boxSizing: 'border-box',
          ...style,
        }}
        onFocus={e => { e.target.style.borderColor = C.orange }}
        onBlur={e => { e.target.style.borderColor = error ? C.red + '60' : C.surface3 }}
        {...props}
      />
      {error && (
        <div style={{ fontSize: 11, color: C.red, marginTop: 6 }}>{error}</div>
      )}
    </div>
  )
}

// ── Avatar ──────────────────────────────────────────
export function Avatar({ src, name, size = 40, badge, style }) {
  const initials = (name || '').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  const radius = size > 60 ? RADIUS['2xl'] : size > 30 ? RADIUS.lg : RADIUS.md

  return (
    <div style={{
      width: size, height: size, borderRadius: radius,
      overflow: 'hidden', flexShrink: 0, position: 'relative',
      ...style,
    }}>
      {src ? (
        <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <div style={{
          width: '100%', height: '100%',
          background: C.surface3,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: size * 0.35, fontWeight: 700, color: C.white,
        }}>{initials}</div>
      )}
      {badge && (
        <div style={{
          position: 'absolute', bottom: -1, right: -1,
          width: size * 0.3, height: size * 0.3,
          borderRadius: '50%', background: C.green,
          border: `2px solid ${C.bg}`,
        }} />
      )}
    </div>
  )
}

// ── Badge / Chip ──────────────────────────────────────────
export function Badge({ children, variant = 'default', style }) {
  const variants = {
    default: { background: 'rgba(255,255,255,.04)', border: `1px solid ${C.border}`, color: C.textSecondary },
    accent: { background: C.orangeDim, border: `1px solid ${C.orangeBorder}`, color: C.orange },
    success: { background: `${C.green}15`, border: `1px solid ${C.green}30`, color: C.green },
    pro: { background: 'rgba(255,255,255,.06)', border: `1px solid ${C.border}`, color: C.orange },
  }

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '4px 10px', borderRadius: RADIUS.xl,
      fontSize: 11, fontWeight: 500,
      ...variants[variant],
      ...style,
    }}>{children}</span>
  )
}

// ── Card ──────────────────────────────────────────
export function Card({ children, padding = 16, style, ...props }) {
  return (
    <div style={{
      background: C.surface,
      border: `1px solid ${C.border}`,
      borderRadius: RADIUS.lg,
      padding,
      ...style,
    }} {...props}>{children}</div>
  )
}

// ── SectionLabel ──────────────────────────────────────────
export function SectionLabel({ children, action, style }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      marginBottom: 10,
      ...style,
    }}>
      <span style={{ ...TYPE.micro, color: C.textTertiary }}>{children}</span>
      {action}
    </div>
  )
}

// ── Divider ──────────────────────────────────────────
export function Divider({ style }) {
  return <div style={{ height: 1, background: C.border, ...style }} />
}
