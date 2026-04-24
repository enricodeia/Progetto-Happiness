import { useState } from 'react'

// EnvelopeIcon — simple mail outline, size in px.
function EnvelopeIcon({ size = 14, color = 'currentColor', strokeWidth = 1.5 }) {
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

// Version C — metalab-style top navigation, smaller than B and the CTA grows
// HORIZONTALLY from right → left on hover (the right edge is pinned, the left
// edge extends leftwards). Height stays constant; no vertical morph, no label
// slide-in transform. The label simply fades in once the pill has expanded.
//
// Layout:
//   LEFT  — "Menu" pill (dark fill idle, transparent + white border on hover).
//   RIGHT — location/time label + envelope button anchored to the RIGHT side,
//           which on hover widens toward the left, revealing "Get in Touch".
export default function TopNavC({
  revealed = true,
  resetting = false,
  topVh = 1.2,
  leftVw = 1.1,
  rightVw = 1.1,
  zIndex = 18,
  // Menu pill (left)
  menuOn = true,
  menuLabel = 'Menu',
  menuFontVw = 0.7,
  menuPadYVw = 0.45,
  menuPadXVw = 0.85,
  menuIdleBg = 'rgba(255,255,255,0.08)',
  menuIdleBorder = 'rgba(255,255,255,0)',
  menuHoverBg = 'transparent',
  menuHoverBorder = 'rgba(255,255,255,0.9)',
  menuBlurPx = 4,
  // Right cluster
  rightOn = true,
  locationLabel = 'YYZ 1:58 PM',
  locationFontVw = 0.7,
  locationGapVw = 0.8,
  ctaCircleSizePx = 32,
  ctaExpandedLabel = 'Get in Touch',
  ctaFontVw = 0.7,
  ctaPadXVw = 0.95,
  ctaLabelGapPx = 8,
  ctaIdleBg = 'rgba(255,255,255,0.08)',
  ctaIdleBorder = 'rgba(255,255,255,0)',
  ctaHoverBg = 'transparent',
  ctaHoverBorder = 'rgba(255,255,255,0.9)',
  ctaIconSize = 14,
  ctaIconColor = '#ffffff',
  ctaBlurPx = 4,
  // Reveal
  fromY = 20,
  durationS = 1.0,
  easing = 'cubic-bezier(0, 0.55, 0.45, 1)',
  delayS = 0.35,
  hoverEasing = 'cubic-bezier(0.23, 1, 0.32, 1)',
  hoverDurationS = 0.5,
  ctaLabelFadeDelayS = 0.12,
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

          {/* Envelope CTA — right-anchored, grows leftwards on hover. */}
          <button
            type="button"
            aria-label={ctaExpandedLabel}
            onPointerEnter={() => setCtaHover(true)}
            onPointerLeave={() => setCtaHover(false)}
            style={{
              all: 'unset',
              boxSizing: 'border-box',
              display: 'inline-flex',
              flexDirection: 'row-reverse',
              alignItems: 'center',
              // Right-anchor the icon inside the pill. padding-right is a
              // constant equal to (circle - icon) / 2 so the envelope is
              // visually centred inside the circle at idle AND stays at
              // exactly the same distance from the right edge when the pill
              // expands to auto-width on hover — so it doesn't move. Only
              // the LEFT edge of the button grows to accommodate the label.
              justifyContent: 'flex-start',
              gap: ctaHover ? `${ctaLabelGapPx}px` : '0px',
              height: `${ctaCircleSizePx}px`,
              width: ctaHover ? 'auto' : `${ctaCircleSizePx}px`,
              minWidth: `${ctaCircleSizePx}px`,
              paddingTop: 0,
              paddingBottom: 0,
              paddingLeft: ctaHover ? `${ctaPadXVw}vw` : `${(ctaCircleSizePx - ctaIconSize) / 2}px`,
              paddingRight: `${(ctaCircleSizePx - ctaIconSize) / 2}px`,
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
              // Use hoverEasing (power4-style) going INTO hover and circ.out
              // on the way back — a gentler settle when the pill shrinks.
              transition: (() => {
                const ease = ctaHover ? hoverEasing : 'cubic-bezier(0, 0.55, 0.45, 1)'
                return [
                  `background ${hoverDurationS}s ${ease}`,
                  `border-color ${hoverDurationS}s ${ease}`,
                  `padding-left ${hoverDurationS}s ${ease}`,
                  `gap ${hoverDurationS}s ${ease}`,
                  `width ${hoverDurationS}s ${ease}`,
                ].join(', ')
              })(),
              willChange: 'width, padding-left, background, border-color',
              overflow: 'hidden',
            }}
          >
            <EnvelopeIcon size={ctaIconSize} color={ctaIconColor} />
            <span
              style={{
                display: 'inline-block',
                // At idle, clamp the label to zero width so the icon sits
                // perfectly centred inside the circle. At hover the width
                // relaxes to auto (content-sized) in sync with the button
                // width expansion, and the label fades in.
                maxWidth: ctaHover ? '200px' : '0px',
                opacity: ctaHover ? 1 : 0,
                overflow: 'hidden',
                transition: [
                  `opacity ${hoverDurationS * 0.7}s ${hoverEasing} ${ctaHover ? ctaLabelFadeDelayS : 0}s`,
                  `max-width ${hoverDurationS}s ${hoverEasing}`,
                ].join(', '),
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
              }}
            >
              {ctaExpandedLabel}
            </span>
          </button>
        </div>
      )}
    </>
  )
}
