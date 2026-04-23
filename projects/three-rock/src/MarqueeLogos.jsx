import ProgressiveBlur from './ProgressiveBlur.jsx'
import { LOGOS, parseLogoDims } from './logos.js'

export default function MarqueeLogos({
  enabled = true,
  duration = 50,
  gap = 3,
  endGap,
  logoHeight = 1.1,
  bottom = 2,
  height = 3,
  maxWidthVw = 33,
  fadeWidth = 5.2,
  blurIntensity = 1.65,
  edgeMaskWidth = 12.8,
  edgeMaskColor = '#000000',
  invert = true,
  sideLabelOn = true,
  leftLabel = 'We make',
  rightLabel = 'interfaces',
  labelSize = 6.5,
  labelPad = 3.3,
  labelItalic = false,
  buttonHovered = false,
  fadeInDuration = 1.0,
  fadeOutDuration = 1.2,
  introStarted = true,
  resetting = false,
  introDuration = 1.4,
  introEasing = 'cubic-bezier(0, 0.55, 0.45, 1)',
  introStaggerMs = 350,
  introFromY = 100,
  introDelay = 0.5,
  marqueeRevealDelay = 0.4,
  marqueeRevealDuration = 1.0,
  marqueeRevealEasing = 'cubic-bezier(0, 0.55, 0.45, 1)',
  heroLayout = 'bottom',
  logoHovered = false,
  centerLeftTitleTopVh = 23,
  centerLeftTitleLeftVw = 10,
  centerRightTitleBottomVh = 25,
  centerRightTitleLeftVw = 5,
  centerMarqueeTopVh = 50,
  centerHoverFadeS = 0.5,
}) {
  if (!enabled) return null

  const isCenter = heroLayout === 'center'

  // Strip fade on Play Reel hover.
  const stripDuration = buttonHovered ? fadeInDuration : fadeOutDuration
  const stripEasing = buttonHovered
    ? 'cubic-bezier(0, 0.55, 0.45, 1)'
    : 'cubic-bezier(0.55, 0, 1, 0.45)'
  const stripDelay = buttonHovered ? 0 : fadeOutDuration
  const stripTransition = resetting
    ? 'none'
    : `opacity ${stripDuration}s ${stripEasing} ${stripDelay}s`

  // Intro reveal for the two labels.
  const leftDelayS  = introDelay
  const rightDelayS = introDelay + introStaggerMs / 1000
  const leftLabelTransition  = resetting
    ? 'none'
    : `transform ${introDuration}s ${introEasing} ${leftDelayS}s, opacity ${introDuration}s ${introEasing} ${leftDelayS}s`
  const rightLabelTransition = resetting
    ? 'none'
    : `transform ${introDuration}s ${introEasing} ${rightDelayS}s, opacity ${introDuration}s ${introEasing} ${rightDelayS}s`

  const marqueeRevealTransition = resetting
    ? 'none'
    : `opacity ${marqueeRevealDuration}s ${marqueeRevealEasing} ${introStarted ? marqueeRevealDelay : 0}s`

  const labelBase = {
    position: 'fixed',
    margin: 0,
    fontFamily: "'PP Eiko', serif",
    fontWeight: 100,
    fontSize: `${labelSize}vw`,
    lineHeight: 0.9,
    letterSpacing: '-0.03em',
    color: '#ecedf0',
    opacity: introStarted ? 0.95 : 0,
    pointerEvents: 'none',
    zIndex: 14,
    whiteSpace: 'nowrap',
    userSelect: 'none',
  }

  const leftAnchor = isCenter
    ? { top: `${centerLeftTitleTopVh}vh`, left: `${centerLeftTitleLeftVw}vw`, textAlign: 'left' }
    : { bottom: `${bottom}vw`, left: `${labelPad}vw`, textAlign: 'left' }
  const rightAnchor = isCenter
    ? { bottom: `${centerRightTitleBottomVh}vh`, left: `${centerRightTitleLeftVw}vw`, textAlign: 'left' }
    : { bottom: `${bottom}vw`, right: `${labelPad}vw`, textAlign: 'right' }

  return (
    <>
      {sideLabelOn && (
        <>
          <h1
            style={{
              ...labelBase,
              ...leftAnchor,
              transform: introStarted ? 'translateY(0)' : `translateY(${introFromY}px)`,
              transition: leftLabelTransition,
              willChange: 'transform, opacity',
            }}
          >
            {leftLabel}
          </h1>
          <h1
            style={{
              ...labelBase,
              ...rightAnchor,
              fontStyle: labelItalic ? 'italic' : 'normal',
              transform: introStarted ? 'translateY(0)' : `translateY(${introFromY}px)`,
              transition: rightLabelTransition,
              willChange: 'transform, opacity',
            }}
          >
            {rightLabel}
          </h1>
        </>
      )}
    <div
      style={{
        position: 'fixed',
        left: '50%',
        bottom: isCenter ? 'auto' : `${bottom}vw`,
        top: isCenter ? `${centerMarqueeTopVh}vh` : 'auto',
        transform: isCenter ? 'translate(-50%, -50%)' : 'translateX(-50%)',
        width: isCenter ? '100vw' : `${maxWidthVw}vw`,
        height: `${height}vw`,
        overflow: 'hidden',
        zIndex: isCenter ? 3 : 15,   /* behind canvas (z:5) in center layout */
        pointerEvents: 'none',
        opacity: introStarted ? 1 : 0,
        transition: marqueeRevealTransition,
        willChange: 'opacity',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: isCenter
            ? (logoHovered ? 0 : 1)
            : (buttonHovered ? 0 : 1),
          transition: resetting
            ? 'none'
            : (isCenter
                ? `opacity ${centerHoverFadeS}s cubic-bezier(0, 0.55, 0.45, 1)`
                : stripTransition),
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            height: '100%',
            width: 'max-content',
            animation: `marquee-scroll ${duration}s linear infinite`,
          }}
        >
          {[0, 1].map((copy) => (
            <div
              key={copy}
              aria-hidden={copy === 1 ? true : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: `${gap}vw`,
                paddingRight: `${endGap != null ? endGap : gap}vw`,
                flexShrink: 0,
              }}
            >
              {LOGOS.map((logo) => {
                const d = parseLogoDims(logo.url)
                const w = d ? (logoHeight * d.w) / d.h : null
                return (
                  <img
                    key={`${copy}-${logo.name}`}
                    src={logo.url}
                    alt={logo.name}
                    decoding="async"
                    style={{
                      height: `${logoHeight}vw`,
                      width: w != null ? `${w}vw` : 'auto',
                      display: 'block',
                      flexShrink: 0,
                      opacity: 0.72,
                      filter: invert ? 'invert(1) brightness(1.5)' : 'brightness(1)',
                    }}
                  />
                )
              })}
            </div>
          ))}
        </div>
        <ProgressiveBlur side="left"  width={fadeWidth} intensity={blurIntensity} />
        <ProgressiveBlur side="right" width={fadeWidth} intensity={blurIntensity} />

        {/* Solid gradient masks to hide the abrupt start of the blur */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            marginLeft: -1,            /* shift 1px left to cover sub-pixel bleed */
            height: '100%',
            width: `calc(${edgeMaskWidth}vw + 1px)`,
            pointerEvents: 'none',
            background: `linear-gradient(to right, ${edgeMaskColor} 0%, ${edgeMaskColor} 35%, transparent 100%)`,
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            marginRight: -1,
            height: '100%',
            width: `calc(${edgeMaskWidth}vw + 1px)`,
            pointerEvents: 'none',
            background: `linear-gradient(to left, ${edgeMaskColor} 0%, ${edgeMaskColor} 35%, transparent 100%)`,
          }}
        />
      </div>
    </div>
    </>
  )
}
