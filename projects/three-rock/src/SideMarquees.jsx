import ProgressiveBlur from './ProgressiveBlur.jsx'
import { LOGOS, parseLogoDims } from './logos.js'

// One horizontal marquee rail. Scrolls from right→left (direction:-1) or left→right (+1).
// Separate glow/mask config for inner (center-facing) and outer (viewport-facing) edges,
// so we can bloom the inner side like Version A's marquee glow while keeping the outer
// side clean.
function Rail({
  side,            // 'left' | 'right'
  widthVw,
  sideGapVw,
  centerYVh,
  heightVw,
  durationS,
  delayS = 0,
  direction = -1,
  gapVw,
  logoHeightVw,
  invert,
  logoBrightness,
  logoGlowPx,
  logoGlowColor,
  // Inner = side facing the 3D logo center. Outer = side facing the viewport edge.
  innerFadeWidthVw,
  innerBlurIntensity,
  innerEdgeWidthVw,
  outerFadeWidthVw,
  outerBlurIntensity,
  outerEdgeWidthVw,
  edgeMaskColor,
  zIndex = 3,
  opacity = 1,
  transitionS = 1,
}) {
  const pos = side === 'left'
    ? { left: `${sideGapVw}vw` }
    : { right: `${sideGapVw}vw` }

  const animName = direction === 1 ? 'side-marquee-horiz-rev' : 'side-marquee-horiz'

  // Which screen edge corresponds to "inner" for this rail?
  // Left rail: inner = 'right' side.  Right rail: inner = 'left' side.
  const innerEdge = side === 'left' ? 'right' : 'left'
  const outerEdge = side === 'left' ? 'left'  : 'right'

  return (
    <div
      style={{
        position: 'fixed',
        top: `${centerYVh}vh`,
        transform: 'translateY(-50%)',
        ...pos,
        width: `${widthVw}vw`,
        height: `${heightVw}vw`,
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex,
        opacity,
        transition: `opacity ${transitionS}s cubic-bezier(0, 0.55, 0.45, 1)`,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          height: '100%',
          width: 'max-content',
          animation: `${animName} ${durationS}s linear infinite`,
          animationDelay: `${delayS}s`,
        }}
      >
        {[0, 1].map((copy) => (
          <div
            key={copy}
            aria-hidden={copy === 1 ? true : undefined}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: `${gapVw}vw`,
              paddingRight: `${gapVw}vw`,
              flexShrink: 0,
            }}
          >
            {LOGOS.map((logo) => {
              const d = parseLogoDims(logo.url)
              const w = d ? (logoHeightVw * d.w) / d.h : null
              return (
                <img
                  key={`${copy}-${logo.name}`}
                  src={logo.url}
                  alt={logo.name}
                  decoding="async"
                  style={{
                    height: `${logoHeightVw}vw`,
                    width: w != null ? `${w}vw` : 'auto',
                    display: 'block',
                    flexShrink: 0,
                    opacity: 0.72,
                    filter: [
                      invert ? 'invert(1)' : '',
                      `brightness(${logoBrightness})`,
                      logoGlowPx > 0 ? `drop-shadow(0 0 ${logoGlowPx}px ${logoGlowColor})` : '',
                    ].filter(Boolean).join(' '),
                  }}
                />
              )
            })}
          </div>
        ))}
      </div>

      {/* Inner-edge glow (A-style) */}
      <ProgressiveBlur side={innerEdge} width={innerFadeWidthVw} intensity={innerBlurIntensity} />
      {/* Outer-edge fade (lighter) */}
      <ProgressiveBlur side={outerEdge} width={outerFadeWidthVw} intensity={outerBlurIntensity} />

      {/* Solid gradient edge masks — cover the abrupt start of each blur */}
      {innerEdge === 'right' ? (
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            marginRight: -1,
            height: '100%',
            width: `calc(${innerEdgeWidthVw}vw + 1px)`,
            pointerEvents: 'none',
            background: `linear-gradient(to left, ${edgeMaskColor} 0%, ${edgeMaskColor} 35%, transparent 100%)`,
          }}
        />
      ) : (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            marginLeft: -1,
            height: '100%',
            width: `calc(${innerEdgeWidthVw}vw + 1px)`,
            pointerEvents: 'none',
            background: `linear-gradient(to right, ${edgeMaskColor} 0%, ${edgeMaskColor} 35%, transparent 100%)`,
          }}
        />
      )}
      {outerEdge === 'left' ? (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            marginLeft: -1,
            height: '100%',
            width: `calc(${outerEdgeWidthVw}vw + 1px)`,
            pointerEvents: 'none',
            background: `linear-gradient(to right, ${edgeMaskColor} 0%, ${edgeMaskColor} 35%, transparent 100%)`,
          }}
        />
      ) : (
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            marginRight: -1,
            height: '100%',
            width: `calc(${outerEdgeWidthVw}vw + 1px)`,
            pointerEvents: 'none',
            background: `linear-gradient(to left, ${edgeMaskColor} 0%, ${edgeMaskColor} 35%, transparent 100%)`,
          }}
        />
      )}

      <style>{`
        @keyframes side-marquee-horiz {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        @keyframes side-marquee-horiz-rev {
          from { transform: translateX(-50%); }
          to   { transform: translateX(0); }
        }
      `}</style>
    </div>
  )
}

export default function SideMarquees({
  enabled = true,
  widthVw = 34,
  sideGapVw = 0,
  centerYVh = 50,
  heightVw = 4,
  durationS = 50,
  offsetRightS,
  gapVw = 3,
  logoHeightVw = 1.1,
  invert = true,
  logoBrightness = 1.5,
  logoGlowPx = 0,
  logoGlowColor = '#ffffff',
  // Inner = center-facing side (where the 3D sits). A-style glow.
  innerFadeWidthVw = 9.3,
  innerBlurIntensity = 1.4,
  innerEdgeWidthVw = 2.8,
  // Outer = viewport-facing side. Softer/smaller.
  outerFadeWidthVw = 4,
  outerBlurIntensity = 0.6,
  outerEdgeWidthVw = 1.5,
  edgeMaskColor = '#090b0d',
  zIndex = 3,
  opacity = 1,
  transitionS = 1,
  oppositeDirections = true,
}) {
  if (!enabled) return null
  const rightDelay = offsetRightS != null ? offsetRightS : -durationS / 2
  return (
    <>
      <Rail
        side="left" widthVw={widthVw} sideGapVw={sideGapVw}
        centerYVh={centerYVh} heightVw={heightVw}
        durationS={durationS} delayS={0} direction={-1}
        gapVw={gapVw} logoHeightVw={logoHeightVw} invert={invert}
        logoBrightness={logoBrightness} logoGlowPx={logoGlowPx} logoGlowColor={logoGlowColor}
        innerFadeWidthVw={innerFadeWidthVw} innerBlurIntensity={innerBlurIntensity} innerEdgeWidthVw={innerEdgeWidthVw}
        outerFadeWidthVw={outerFadeWidthVw} outerBlurIntensity={outerBlurIntensity} outerEdgeWidthVw={outerEdgeWidthVw}
        edgeMaskColor={edgeMaskColor}
        zIndex={zIndex} opacity={opacity} transitionS={transitionS}
      />
      <Rail
        side="right" widthVw={widthVw} sideGapVw={sideGapVw}
        centerYVh={centerYVh} heightVw={heightVw}
        durationS={durationS} delayS={rightDelay} direction={oppositeDirections ? 1 : -1}
        gapVw={gapVw} logoHeightVw={logoHeightVw} invert={invert}
        logoBrightness={logoBrightness} logoGlowPx={logoGlowPx} logoGlowColor={logoGlowColor}
        innerFadeWidthVw={innerFadeWidthVw} innerBlurIntensity={innerBlurIntensity} innerEdgeWidthVw={innerEdgeWidthVw}
        outerFadeWidthVw={outerFadeWidthVw} outerBlurIntensity={outerBlurIntensity} outerEdgeWidthVw={outerEdgeWidthVw}
        edgeMaskColor={edgeMaskColor}
        zIndex={zIndex} opacity={opacity} transitionS={transitionS}
      />
    </>
  )
}
