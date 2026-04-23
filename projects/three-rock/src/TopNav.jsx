import { useState } from 'react'

// EnvelopeIcon — simple mail outline, size in px.
function EnvelopeIcon({ size = 16, color = 'currentColor', strokeWidth = 1.5 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      style={{ display: 'block' }}
    >
      <rect x="3" y="5" width="18" height="14" rx="1.5" stroke={color} strokeWidth={strokeWidth} />
      <path d="M3.8 6.3L12 13L20.2 6.3" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// Top-of-page navigation, metalab.com-style:
//   LEFT  — single "Menu" pill. Idle: filled dark pill, transparent border. Hover: transparent
//           fill, white border appears.
//   RIGHT — location/time text + circular envelope button. On hover the circular button
//           expands into a pill revealing a "Get in Touch" label to the LEFT of the icon.
export default function TopNav({
  revealed = true,
  resetting = false,
  topVh = 2.0,
  leftVw = 2.2,
  rightVw = 2.2,
  zIndex = 18,
  // Menu pill (left)
  menuOn = true,
  menuLabel = 'Menu',
  menuFontVw = 0.9,
  menuPadYVw = 0.55,
  menuPadXVw = 1.3,
  menuIdleBg = 'rgba(255,255,255,0.08)',
  menuIdleBorder = 'rgba(255,255,255,0)',
  menuHoverBg = 'transparent',
  menuHoverBorder = 'rgba(255,255,255,0.9)',
  menuBlurPx = 4,
  // Right cluster
  rightOn = true,
  locationLabel = 'YYZ 1:58 PM',
  locationFontVw = 0.9,
  locationGapVw = 1.2,        // gap between location text and envelope button
  ctaCircleSizePx = 40,
  ctaExpandedLabel = 'Get in Touch',
  ctaFontVw = 0.9,
  ctaPadYVw = 0.55,
  ctaPadXVw = 1.15,
  ctaIdleBg = 'rgba(255,255,255,0.08)',
  ctaIdleBorder = 'rgba(255,255,255,0)',
  ctaHoverBg = 'transparent',
  ctaHoverBorder = 'rgba(255,255,255,0.9)',
  ctaIconSize = 16,
  ctaBlurPx = 4,
  // Reveal
  fromY = 24,
  durationS = 1.0,
  easing = 'cubic-bezier(0, 0.55, 0.45, 1)',
  delayS = 0.35,
  hoverEasing = 'cubic-bezier(0.23, 1, 0.32, 1)',
  hoverDurationS = 0.45,
}) {
  const [menuHover, setMenuHover] = useState(false)
  const [ctaHover, setCtaHover]   = useState(false)

  const revealTransition = resetting
    ? 'none'
    : `opacity ${durationS}s ${easing} ${revealed ? delayS : 0}s, transform ${durationS}s ${easing} ${revealed ? delayS : 0}s`

  const baseTransform = revealed ? 'translateY(0)' : `translateY(${-fromY}px)`
  const baseOpacity   = revealed ? 1 : 0

  return (
    <>
      {menuOn && (
        <button
          type="button"
          onPointerEnter={() => setMenuHover(true)}
          onPointerLeave={() => setMenuHover(false)}
          style={{
            all: 'unset',
            position: 'fixed',
            top: `${topVh}vh`,
            left: `${leftVw}vw`,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: `${menuPadYVw}vw ${menuPadXVw}vw`,
            borderRadius: 999,
            background: menuHover ? menuHoverBg : menuIdleBg,
            border: `1px solid ${menuHover ? menuHoverBorder : menuIdleBorder}`,
            backdropFilter: `blur(${menuBlurPx}px)`,
            WebkitBackdropFilter: `blur(${menuBlurPx}px)`,
            fontFamily: "'Basis Grotesque Pro', -apple-system, BlinkMacSystemFont, sans-serif",
            fontSize: `${menuFontVw}vw`,
            color: '#f5f6f8',
            letterSpacing: '-0.005em',
            whiteSpace: 'nowrap',
            cursor: 'pointer',
            zIndex,
            opacity: baseOpacity,
            transform: baseTransform,
            transition: `${revealTransition}, background ${hoverDurationS}s ${hoverEasing}, border-color ${hoverDurationS}s ${hoverEasing}`,
            willChange: 'transform, opacity, background, border-color',
            pointerEvents: revealed ? 'auto' : 'none',
            userSelect: 'none',
          }}
        >
          {menuLabel}
        </button>
      )}

      {rightOn && (
        <div
          style={{
            position: 'fixed',
            top: `${topVh}vh`,
            right: `${rightVw}vw`,
            display: 'inline-flex',
            alignItems: 'center',
            gap: `${locationGapVw}vw`,
            zIndex,
            opacity: baseOpacity,
            transform: baseTransform,
            transition: revealTransition,
            willChange: 'transform, opacity',
            pointerEvents: revealed ? 'auto' : 'none',
            userSelect: 'none',
          }}
        >
          {/* Location + time */}
          {locationLabel && (
            <span
              style={{
                fontFamily: "'Basis Grotesque Pro', -apple-system, BlinkMacSystemFont, sans-serif",
                fontSize: `${locationFontVw}vw`,
                color: 'rgba(245, 246, 248, 0.92)',
                letterSpacing: '-0.005em',
                whiteSpace: 'nowrap',
              }}
            >
              {locationLabel}
            </span>
          )}

          {/* Envelope button — circular idle, expands to pill on hover with label */}
          <button
            type="button"
            aria-label={ctaExpandedLabel}
            onPointerEnter={() => setCtaHover(true)}
            onPointerLeave={() => setCtaHover(false)}
            style={{
              all: 'unset',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: ctaHover ? '8px' : '0px',
              height: `${ctaCircleSizePx}px`,
              minWidth: `${ctaCircleSizePx}px`,
              padding: ctaHover ? `${ctaPadYVw}vw ${ctaPadXVw}vw` : '0',
              borderRadius: 999,
              background: ctaHover ? ctaHoverBg : ctaIdleBg,
              border: `1px solid ${ctaHover ? ctaHoverBorder : ctaIdleBorder}`,
              backdropFilter: `blur(${ctaBlurPx}px)`,
              WebkitBackdropFilter: `blur(${ctaBlurPx}px)`,
              color: '#f5f6f8',
              fontFamily: "'Basis Grotesque Pro', -apple-system, BlinkMacSystemFont, sans-serif",
              fontSize: `${ctaFontVw}vw`,
              letterSpacing: '-0.005em',
              whiteSpace: 'nowrap',
              cursor: 'pointer',
              transition: `background ${hoverDurationS}s ${hoverEasing}, border-color ${hoverDurationS}s ${hoverEasing}, padding ${hoverDurationS}s ${hoverEasing}, gap ${hoverDurationS}s ${hoverEasing}`,
              willChange: 'background, border-color, padding',
              overflow: 'hidden',
            }}
          >
            <span
              style={{
                display: 'inline-block',
                maxWidth: ctaHover ? '200px' : '0px',
                opacity: ctaHover ? 1 : 0,
                transform: ctaHover ? 'translateX(0)' : 'translateX(-8px)',
                transition: `opacity ${hoverDurationS}s ${hoverEasing}, transform ${hoverDurationS}s ${hoverEasing}, max-width ${hoverDurationS}s ${hoverEasing}`,
                whiteSpace: 'nowrap',
              }}
            >
              {ctaExpandedLabel}
            </span>
            <EnvelopeIcon size={ctaIconSize} />
          </button>
        </div>
      )}
    </>
  )
}
