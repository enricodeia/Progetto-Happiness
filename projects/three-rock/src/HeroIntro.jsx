import { useEffect, useRef, useState } from 'react'

// 7 letters = 7 paths (M, E, T, A, L, A, B).
const LETTER_PATHS = [
  'M0.998047 0.96875H6.30376L10.3194 16.4906L14.3143 0.96875H19.62V16.7818H16.936V1.28085L12.8579 16.7818H7.76023L3.68211 1.28085V16.7818H0.998047V0.96875Z',
  'M26.5349 17.0315C25.4113 17.0315 24.4334 16.7818 23.6011 16.2825C22.7688 15.7831 22.1308 15.0896 21.6869 14.2018C21.243 13.3141 21.0211 12.3015 21.0211 11.164C21.0211 10.0266 21.243 9.01401 21.6869 8.12626C22.1446 7.2385 22.7897 6.55188 23.6219 6.06639C24.4542 5.56703 25.4252 5.31735 26.5349 5.31735C27.6307 5.31735 28.5878 5.5601 29.4062 6.04559C30.2385 6.51721 30.8765 7.18995 31.3204 8.06384C31.7781 8.93772 32.007 9.95031 32.007 11.1016C32.007 11.3652 31.9862 11.6426 31.9446 11.9339H23.6635C23.7606 13.002 24.0658 13.8134 24.579 14.3683C25.0923 14.9231 25.7511 15.2005 26.5557 15.2005C27.2492 15.2005 27.7971 15.0549 28.1994 14.7636C28.6017 14.4723 28.9068 14.0423 29.1149 13.4736H31.7573C31.4106 14.6526 30.7864 15.5404 29.8847 16.1368C28.9831 16.7333 27.8665 17.0315 26.5349 17.0315ZM29.3438 10.1237C29.3022 9.52724 29.1565 9.00707 28.9068 8.5632C28.671 8.11932 28.345 7.77254 27.9289 7.52286C27.5266 7.27318 27.062 7.14834 26.5349 7.14834C25.7581 7.14834 25.12 7.39802 24.6206 7.89738C24.1352 8.39674 23.8231 9.13885 23.6843 10.1237H29.3438Z',
  'M38.0477 16.7818C37.3402 16.7818 36.7091 16.6639 36.1543 16.4281C35.5994 16.1923 35.1625 15.8386 34.8434 15.367C34.5244 14.8815 34.3649 14.285 34.3649 13.5776V13.536V7.48125H32.1594V5.56703H34.3649V2.90377H36.9657V5.56703H39.629V7.48125H36.9657V13.4112V13.4528C36.9657 13.966 37.0906 14.3267 37.3402 14.5347C37.5899 14.7428 37.9714 14.8468 38.4846 14.8468H39.6706V16.7818H38.0477Z',
  'M44.3384 17.0315C43.631 17.0315 42.986 16.8789 42.4034 16.5738C41.8208 16.2547 41.3561 15.8178 41.0094 15.263C40.6765 14.7081 40.51 14.0839 40.51 13.3904C40.51 12.5858 40.7319 11.9478 41.1758 11.4761C41.6336 11.0045 42.1953 10.6647 42.8612 10.4566C43.527 10.2485 44.2899 10.1029 45.1499 10.0197L48.1253 9.70757V9.56192V9.52031C48.1253 9.07643 48.0351 8.67417 47.8548 8.31352C47.6883 7.95287 47.4317 7.66851 47.0849 7.46044C46.7381 7.25238 46.3151 7.14834 45.8157 7.14834C45.1499 7.14834 44.6159 7.32173 44.2136 7.66851C43.8252 8.00142 43.5894 8.41755 43.5062 8.91691H40.8845C40.9678 8.18174 41.2244 7.54367 41.6544 7.00269C42.0982 6.46172 42.6739 6.04559 43.3813 5.75429C44.1026 5.463 44.9141 5.31735 45.8157 5.31735C46.9254 5.31735 47.8478 5.51155 48.583 5.89994C49.3182 6.28833 49.8591 6.8085 50.2059 7.46044C50.5527 8.11239 50.7261 8.83368 50.7261 9.62434V9.66595V16.7818H48.1461V14.5555C47.8964 15.0965 47.612 15.5473 47.293 15.908C46.9739 16.2547 46.5717 16.5322 46.0862 16.7402C45.6146 16.9344 45.032 17.0315 44.3384 17.0315ZM43.1525 13.3904C43.1525 13.8065 43.2495 14.1671 43.4437 14.4723C43.6379 14.7636 43.9015 14.9925 44.2344 15.1589C44.5673 15.3115 44.9349 15.3878 45.3372 15.3878C45.9336 15.3878 46.4399 15.2422 46.856 14.9509C47.2861 14.6457 47.6051 14.2434 47.8132 13.7441C48.0212 13.2308 48.1253 12.6552 48.1253 12.0171V11.3513L46.107 11.5594C45.4828 11.6287 44.9696 11.7189 44.5673 11.8299C44.1789 11.9269 43.846 12.1003 43.5686 12.35C43.2912 12.5858 43.1525 12.9326 43.1525 13.3904Z',
  'M52.5078 0.96875H55.1087V16.7818H52.5078V0.96875Z',
  'M60.6969 17.0315C59.9895 17.0315 59.3445 16.8789 58.7619 16.5738C58.1793 16.2547 57.7146 15.8178 57.3678 15.263C57.0349 14.7081 56.8685 14.0839 56.8685 13.3904C56.8685 12.5858 57.0904 11.9478 57.5343 11.4761C57.992 11.0045 58.5538 10.6647 59.2196 10.4566C59.8854 10.2485 60.6483 10.1029 61.5084 10.0197L64.4837 9.70757V9.56192V9.52031C64.4837 9.07643 64.3936 8.67417 64.2132 8.31352C64.0468 7.95287 63.7902 7.66851 63.4434 7.46044C63.0966 7.25238 62.6735 7.14834 62.1742 7.14834C61.5084 7.14834 60.9743 7.32173 60.5721 7.66851C60.1837 8.00142 59.9478 8.41755 59.8646 8.91691H57.243C57.3262 8.18174 57.5828 7.54367 58.0128 7.00269C58.4567 6.46172 59.0324 6.04559 59.7398 5.75429C60.4611 5.463 61.2725 5.31735 62.1742 5.31735C63.2839 5.31735 64.2063 5.51155 64.9415 5.89994C65.6766 6.28833 66.2176 6.8085 66.5644 7.46044C66.9112 8.11239 67.0845 8.83368 67.0845 9.62434V9.66595V16.7818H64.5045V14.5555C64.2548 15.0965 63.9705 15.5473 63.6514 15.908C63.3324 16.2547 62.9301 16.5322 62.4447 16.7402C61.973 16.9344 61.3904 17.0315 60.6969 17.0315ZM59.5109 13.3904C59.5109 13.8065 59.608 14.1671 59.8022 14.4723C59.9964 14.7636 60.2599 14.9925 60.5929 15.1589C60.9258 15.3115 61.2934 15.3878 61.6956 15.3878C62.2921 15.3878 62.7984 15.2422 63.2145 14.9509C63.6445 14.6457 63.9635 14.2434 64.1716 13.7441C64.3797 13.2308 64.4837 12.6552 64.4837 12.0171V11.3513L62.4655 11.5594C61.8413 11.6287 61.328 11.7189 60.9258 11.8299C60.5374 11.9269 60.2045 12.1003 59.927 12.35C59.6496 12.5858 59.5109 12.9326 59.5109 13.3904Z',
  'M75.2956 17.0315C74.7407 17.0315 74.2067 16.9206 73.6934 16.6986C73.1941 16.4767 72.7502 16.1646 72.3618 15.7623C71.9734 15.3601 71.6683 14.9023 71.4463 14.3891V16.7818H68.8663V0.96875H71.4463V8.20948C71.6266 7.68238 71.8902 7.20383 72.237 6.77382C72.5976 6.32995 73.0346 5.97623 73.5478 5.71268C74.061 5.44913 74.6436 5.31735 75.2956 5.31735C76.1972 5.31735 77.0017 5.56703 77.7091 6.06639C78.4304 6.56575 78.9922 7.25931 79.3945 8.14706C79.7967 9.03482 79.9979 10.0405 79.9979 11.164C79.9979 12.2876 79.7967 13.3002 79.3945 14.2018C78.9922 15.0896 78.4304 15.7831 77.7091 16.2825C77.0017 16.7818 76.1972 17.0315 75.2956 17.0315ZM71.3631 11.164C71.3631 11.9824 71.481 12.6968 71.7168 13.3071C71.9526 13.9175 72.2925 14.3891 72.7363 14.722C73.1941 15.041 73.7351 15.2005 74.3593 15.2005C74.9973 15.2005 75.5383 15.041 75.9822 14.722C76.4399 14.3891 76.7798 13.9244 77.0017 13.3279C77.2375 12.7176 77.3554 11.9963 77.3554 11.164C77.3554 10.3456 77.2375 9.63821 77.0017 9.04175C76.7798 8.43142 76.4399 7.96674 75.9822 7.6477C75.5383 7.3148 74.9973 7.14834 74.3593 7.14834C73.7351 7.14834 73.1941 7.3148 72.7363 7.6477C72.2925 7.96674 71.9526 8.43142 71.7168 9.04175C71.481 9.63821 71.3631 10.3456 71.3631 11.164Z',
]

export default function HeroIntro({
  revealed,
  resetting = false,
  logoStartVw = 12,
  logoEndPx = 88,
  logoDuration = 1.4,
  logoEasing = 'cubic-bezier(0.85, 0, 0.15, 1)',
  overlayDuration = 1.0,
  overlayEasing = 'cubic-bezier(0.85, 0, 0.15, 1)',
  lettersAnim = true,
  lettersDisperseY = 50,
  lettersStaggerMs = 80,
  lettersDuration = 0.55,
  lettersEasing = 'cubic-bezier(0.85, 0, 0.15, 1)',
  glossOn = true,
  glossLight = '#ffffff',
  glossMid = '#b8bcc4',
  glossDark = '#5c626f',
  glossSweepOn = true,
  glossSweepDur = 2.5,
  glossHoverTrigger = true,
  loaderBarOn = true,
  loaderBarWidthPx = 120,
  loaderBarGapPx = 18,
  letterEntryOn = true,
  letterEntryDuration = 0.6,
  letterEntryStaggerMs = 80,
}) {
  // Logo transitions from centered + large (preloader) to top + small (nav
  // slot) on reveal. One instance, one continuous slide — no separate nav
  // logo, no duplicate fade-in.
  const logoTransition = resetting
    ? 'none'
    : `top ${logoDuration}s ${logoEasing}, transform ${logoDuration}s ${logoEasing}, width ${logoDuration}s ${logoEasing}`
  const overlayTransitionCss = resetting ? 'none' : `opacity ${overlayDuration}s ${overlayEasing}`

  // Letter phase machine:
  //   preEntry (!entered):                letters invisible (y:0, opacity 0) at center
  //   idle    (entered, !revealed):       letters visible   (y:0, opacity 1) at center
  //   disperse (entered, revealed, !dispersed): letters invisible (y:±disperseY, opacity 0)
  //   final   (entered, revealed, dispersed):   letters visible  (y:0, opacity 1) at nav
  const [entered, setEntered] = useState(false)
  const [dispersed, setDispersed] = useState(false)

  // Entry on mount: after one RAF, flip entered → triggers CSS transition to visible.
  useEffect(() => {
    if (resetting) { setEntered(false); return }
    if (!letterEntryOn) { setEntered(true); return }
    setEntered(false)
    let r1 = 0, r2 = 0
    r1 = requestAnimationFrame(() => {
      r2 = requestAnimationFrame(() => setEntered(true))
    })
    return () => { cancelAnimationFrame(r1); cancelAnimationFrame(r2) }
  }, [resetting, letterEntryOn])

  useEffect(() => {
    if (!revealed || !lettersAnim) {
      setDispersed(false)
      return
    }
    if (resetting) return
    const lastStaggerMs = (LETTER_PATHS.length - 1) * lettersStaggerMs
    const ms = lettersDuration * 1000 + lastStaggerMs
    const id = window.setTimeout(() => setDispersed(true), ms)
    return () => window.clearTimeout(id)
  }, [revealed, resetting, lettersAnim, lettersDuration, lettersStaggerMs])

  // Per-letter visual state.
  const inDisperse = lettersAnim && entered && revealed && !dispersed
  const letterTransform = (i) =>
    inDisperse ? `translateY(${i % 2 === 0 ? -lettersDisperseY : lettersDisperseY}px)` : 'translateY(0)'
  const letterOpacity = (i) => {
    if (!entered) return 0
    if (inDisperse) return 0
    return 1
  }
  const letterTransition = (i) => {
    if (resetting) return 'none'
    // Pick duration + stagger based on current phase: entry uses entry timing, disperse/reassemble use disperse timing.
    const inEntry = !revealed
    const dur = inEntry ? letterEntryDuration : lettersDuration
    const stagger = (inEntry ? letterEntryStaggerMs : lettersStaggerMs) / 1000
    const delay = i * stagger
    return `transform ${dur}s ${lettersEasing} ${delay}s, opacity ${dur}s ${lettersEasing} ${delay}s`
  }

  // Gloss state machine:
  //   loopSweep        — always on (legacy), gradient always visible
  //   hoverSweepActive — briefly on during a hover sweep; gradient becomes the fill during that window
  //   idle             — plain white fill, no gradient visible
  const [sweepTick, setSweepTick] = useState(0)
  const [sweeping, setSweeping] = useState(false)
  const fireSweep = () => {
    setSweepTick((n) => n + 1)
    setSweeping(true)
  }
  useEffect(() => {
    if (!sweeping) return
    const id = window.setTimeout(() => setSweeping(false), glossSweepDur * 1000)
    return () => window.clearTimeout(id)
  }, [sweepTick, glossSweepDur, sweeping])

  const loopSweep = glossSweepOn && !glossHoverTrigger
  const hoverSweepActive = glossSweepOn && glossHoverTrigger && sweeping
  const fill = glossOn && (loopSweep || hoverSweepActive) ? 'url(#metalab_gloss)' : 'currentColor'

  return (
    <>
      {/* Dark wash — fades out on reveal */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: '#090b0d',
          zIndex: 19,
          pointerEvents: revealed ? 'none' : 'auto',
          opacity: revealed ? 0 : 1,
          transition: overlayTransitionCss,
        }}
      />
      {/* Metalab mark — starts centered + big during the preloader, then on
          reveal slides up to the nav slot (top: 28px) at logoEndPx width.
          Single instance, single slide. This is the "usual" animation from
          before the experimental lock-in-place attempt — restores it for
          Versions B/C/D so there's no separate nav logo fading in. */}
      <div
        style={{
          position: 'fixed',
          left: '50%',
          top: revealed ? '28px' : '50%',
          transform: revealed ? 'translate(-50%, 0)' : 'translate(-50%, -50%)',
          width: revealed ? `${logoEndPx}px` : `${logoStartVw}vw`,
          color: '#ffffff',
          opacity: 1,
          zIndex: 21,
          pointerEvents: 'none',
          transition: logoTransition,
          willChange: 'top, transform, width',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <svg
          viewBox="0 0 80 18"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden
          onPointerEnter={glossHoverTrigger ? fireSweep : undefined}
          style={{
            width: '100%',
            height: 'auto',
            display: 'block',
            overflow: 'visible',
            pointerEvents: revealed && glossHoverTrigger ? 'auto' : 'none',
          }}
        >
          <defs>
            {/*
              Animated gloss — a bright highlight swept horizontally across the logo.
              gradientUnits="userSpaceOnUse" so the translate is in viewBox units (0..80).
              SMIL animateTransform moves the gradient from x:-80 → x:+80 for a full sweep each cycle.
            */}
            <linearGradient
              id="metalab_gloss"
              gradientUnits="userSpaceOnUse"
              x1="0" y1="0" x2="80" y2="0"
            >
              <stop offset="0%"   stopColor={glossDark} />
              <stop offset="35%"  stopColor={glossMid} />
              <stop offset="50%"  stopColor={glossLight} />
              <stop offset="65%"  stopColor={glossMid} />
              <stop offset="100%" stopColor={glossDark} />
              {loopSweep && (
                <animateTransform
                  attributeName="gradientTransform"
                  type="translate"
                  from="-80 0"
                  to="80 0"
                  dur={`${glossSweepDur}s`}
                  repeatCount="indefinite"
                />
              )}
              {hoverSweepActive && (
                <animateTransform
                  key={sweepTick}
                  attributeName="gradientTransform"
                  type="translate"
                  from="-80 0"
                  to="80 0"
                  dur={`${glossSweepDur}s`}
                  repeatCount="1"
                  fill="freeze"
                />
              )}
            </linearGradient>
            <clipPath id="hero_metalab_clip">
              <rect width="80" height="17" fill="white" transform="translate(0 0.5)" />
            </clipPath>
          </defs>
          <g clipPath="url(#hero_metalab_clip)">
            {LETTER_PATHS.map((d, i) => (
              <path
                key={i}
                d={d}
                fill={fill}
                style={{
                  transformBox: 'fill-box',
                  transformOrigin: 'center',
                  transform: letterTransform(i),
                  opacity: letterOpacity(i),
                  transition: letterTransition(i),
                  willChange: 'transform, opacity',
                }}
              />
            ))}
          </g>
        </svg>

        {/* Minimal indeterminate loader bar — hides once revealed. */}
        {loaderBarOn && (
          <div
            style={{
              marginTop: `${loaderBarGapPx}px`,
              width: `${loaderBarWidthPx}px`,
              height: '1px',
              background: 'rgba(245, 246, 248, 0.12)',
              overflow: 'hidden',
              opacity: revealed ? 0 : 1,
              transition: resetting ? 'none' : 'opacity 0.35s ease-out',
            }}
          >
            <div
              style={{
                width: '40%',
                height: '100%',
                background: 'linear-gradient(to right, transparent, rgba(245, 246, 248, 0.9), transparent)',
                animation: 'metalab-loader-sweep 1.6s cubic-bezier(0.4, 0, 0.2, 1) infinite',
              }}
            />
          </div>
        )}

        <style>{`
          @keyframes metalab-loader-sweep {
            0%   { transform: translateX(-100%); }
            100% { transform: translateX(250%); }
          }
        `}</style>
      </div>
    </>
  )
}
