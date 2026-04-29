import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Bookmark, Settings } from 'lucide-react'
import InfiniteMenu from '../../InfiniteMenu'
import MetaBalls from '../../MetaBalls'
import FloatingNetwork from '../../FloatingNetwork'
import { supabase } from '../../supabase'
import { C } from '../../constants'
import AuthForm from './AuthForm'
import ProfileSetup from './ProfileSetup'

export const ONBOARDING_SLIDES = [
  {
    title: 'Discover creative work',
    body: 'Browse portfolios and projects from professionals near you.',
    mockup: (
      <div style={{ position: 'relative', width: 220, height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <InfiniteMenu
          items={[
            { image: 'https://i.pravatar.cc/150?img=32', title: 'Mara', description: 'Design' },
            { image: 'https://i.pravatar.cc/150?img=12', title: 'Kai', description: 'Engineering' },
            { image: 'https://i.pravatar.cc/150?img=47', title: 'Aisha', description: 'Brand' },
            { image: 'https://i.pravatar.cc/150?img=51', title: 'Leo', description: 'Product' },
            { image: 'https://i.pravatar.cc/150?img=25', title: 'Yuki', description: 'Motion' },
            { image: 'https://i.pravatar.cc/150?img=9', title: 'Priya', description: 'Dev' },
          ]}
          scale={0.55}
          onSelect={() => {}}
          autoRotate
          autoRotateSpeed={0.4}
        />
      </div>
    ),
  },
  {
    title: 'Save what inspires you',
    body: 'Bookmark profiles and signal your intent to collaborate, hire, or learn.',
    mockup: (
      <div style={{ position: 'relative', width: 160, height: 120, margin: '0 auto' }}>
        {/* Back card (static) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 0.92 }}
          transition={{ delay: 0.2 }}
          style={{
            width: 80, height: 100, borderRadius: 18,
            background: 'linear-gradient(160deg, #1B3A4E, #142F40)',
            position: 'absolute', left: '50%', top: '50%',
            marginLeft: -40, marginTop: -54,
            boxShadow: '0 4px 20px rgba(0,0,0,.4)',
            border: '1px solid rgba(255,255,255,.06)',
          }}
        >
          <div style={{ width: '100%', height: '50%', borderRadius: '18px 18px 0 0', overflow: 'hidden' }}>
            <img src="https://i.pravatar.cc/150?img=51" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.6 }} />
          </div>
          <div style={{ padding: '6px 8px' }}>
            <div style={{ width: '60%', height: 5, borderRadius: 3, background: 'rgba(255,255,255,.08)', marginBottom: 4 }} />
            <div style={{ width: '40%', height: 4, borderRadius: 2, background: 'rgba(255,255,255,.05)' }} />
          </div>
        </motion.div>
        {/* Front card (swiping) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ x: [0, 30, 0], rotate: [0, 10, 0], opacity: 1, scale: 1 }}
          transition={{ x: { duration: 2.2, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }, rotate: { duration: 2.2, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }, opacity: { duration: 0.4, delay: 0.3 }, scale: { duration: 0.4, delay: 0.3 } }}
          style={{
            width: 80, height: 100, borderRadius: 18,
            background: 'linear-gradient(160deg, #2D1B4E, #1F1340)',
            position: 'absolute', left: '50%', top: '50%',
            marginLeft: -40, marginTop: -54,
            boxShadow: '0 8px 28px rgba(192,132,252,.2)',
            border: '1px solid rgba(192,132,252,.15)',
            overflow: 'hidden',
          }}
        >
          <div style={{ width: '100%', height: '50%', overflow: 'hidden' }}>
            <img src="https://i.pravatar.cc/150?img=25" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div style={{ padding: '6px 8px' }}>
            <div style={{ width: '65%', height: 5, borderRadius: 3, background: 'rgba(255,255,255,.1)', marginBottom: 4 }} />
            <div style={{ width: '45%', height: 4, borderRadius: 2, background: 'rgba(255,255,255,.06)' }} />
          </div>
          {/* Save badge */}
          <motion.div
            animate={{ opacity: [0, 0.9, 0] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
            style={{
              position: 'absolute', top: 8, left: 8,
              fontSize: 9, fontWeight: 800, color: C.orange,
              border: `1.5px solid ${C.orange}`, borderRadius: 4, padding: '2px 6px',
              letterSpacing: '0.08em',
            }}
          >SAVE</motion.div>
        </motion.div>
        {/* Bookmark pulse */}
        <motion.div
          animate={{ scale: [0, 1.2, 0], opacity: [0, 1, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut', delay: 1.2 }}
          style={{
            position: 'absolute', right: 16, top: '50%', marginTop: -12,
          }}
        >
          <Bookmark size={20} color={C.orange} fill={C.orange} />
        </motion.div>
      </div>
    ),
  },
  {
    title: 'Build together',
    body: 'When interest is mutual, the conversation starts naturally. The right people, faster.',
    mockup: (
      <div style={{ position: 'relative', width: 160, height: 120, margin: '0 auto' }}>
        {/* Chat window mockup */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 20 }}
          style={{
            width: 150, height: 110, borderRadius: 16,
            background: C.surface, border: `1px solid ${C.surface3}`,
            margin: '0 auto', overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div style={{
            height: 24, borderBottom: `1px solid ${C.surface2}`,
            display: 'flex', alignItems: 'center', padding: '0 8px', gap: 5,
          }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', overflow: 'hidden' }}>
              <img src="https://i.pravatar.cc/150?img=9" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,.12)' }} />
          </div>
          {/* Messages */}
          <div style={{ padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: 5 }}>
            {[
              { align: 'flex-start', w: 70, color: C.surface2, delay: 0.5 },
              { align: 'flex-end', w: 55, color: `${C.green}25`, delay: 0.7 },
              { align: 'flex-start', w: 48, color: C.surface2, delay: 0.9 },
              { align: 'flex-end', w: 62, color: `${C.green}25`, delay: 1.1 },
            ].map((m, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0, opacity: 0, x: m.align === 'flex-end' ? 10 : -10 }}
                animate={{ scale: 1, opacity: 1, x: 0 }}
                transition={{ delay: m.delay, type: 'spring', stiffness: 300, damping: 22 }}
                style={{
                  height: 10, borderRadius: 6, background: m.color, width: m.w,
                  alignSelf: m.align,
                }}
              />
            ))}
          </div>
        </motion.div>
        {/* Typing indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.3 }}
          style={{
            position: 'absolute', bottom: -2, left: 14,
            display: 'flex', gap: 3, background: C.surface2, borderRadius: 8, padding: '4px 8px',
          }}
        >
          {[0, 1, 2].map(i => (
            <motion.div
              key={i}
              animate={{ y: [0, -3, 0] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
              style={{ width: 4, height: 4, borderRadius: '50%', background: C.green }}
            />
          ))}
        </motion.div>
      </div>
    ),
  },
]

export default function WelcomeScreen({ onDone, glassStyle, startAtSetup }) {
  // phase: 'auth' -> 'profile-setup' -> 'onboarding' -> done
  const [phase, setPhase] = useState(startAtSetup ? 'profile-setup' : 'auth')
  const [slide, setSlide] = useState(0)
  const [slideDirection, setSlideDirection] = useState(1)

  // Pre-filled name from OAuth metadata (passed to ProfileSetup)
  const [prefillFirstName, setPrefillFirstName] = useState('')
  const [prefillLastName, setPrefillLastName] = useState('')

  // MetaBalls control panel state
  const [showControls, setShowControls] = useState(false)
  const [mbColor, setMbColor] = useState('#FF6B35')
  const [mbCursorColor, setMbCursorColor] = useState('#FF6B35')
  const [mbBallCount, setMbBallCount] = useState(24)
  const [mbAnimationSize, setMbAnimationSize] = useState(9)
  const [mbCursorBallSize, setMbCursorBallSize] = useState(0.7)
  const [mbSpeed, setMbSpeed] = useState(0.05)
  const [mbClumpFactor, setMbClumpFactor] = useState(1.1)
  const [mbHoverSmoothness, setMbHoverSmoothness] = useState(0.34)
  const [mbTransparency, setMbTransparency] = useState(true)
  const [mbMouseInteraction, setMbMouseInteraction] = useState(true)
  const [mbAsciiMode, setMbAsciiMode] = useState(true)
  const [mbAsciiCharSize, setMbAsciiCharSize] = useState(8)

  // On mount only: check if user already has a session (e.g. Google OAuth redirect)
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone
  useEffect(() => {
    // No session check here — App handles session detection and passes startAtSetup
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const isLast = slide === ONBOARDING_SLIDES.length - 1
  const current = ONBOARDING_SLIDES[slide]

  const handleOnboardingNext = () => {
    setSlideDirection(1)
    if (isLast) onDone()
    else setSlide(s => s + 1)
  }

  const handleOnboardingPrev = () => {
    if (slide > 0) {
      setSlideDirection(-1)
      setSlide(s => s - 1)
    }
  }

  const handleSlideDragEnd = (_, info) => {
    const threshold = 50
    if (info.offset.x < -threshold) {
      handleOnboardingNext()
    } else if (info.offset.x > threshold) {
      handleOnboardingPrev()
    }
  }

  // Called by AuthForm when auth succeeds
  const handleAuthComplete = (isNewUser, user) => {
    if (!isNewUser) {
      onDone()
    } else {
      // Pre-fill name from user metadata if available
      if (user) {
        const metaName = user.user_metadata?.full_name || user.user_metadata?.name || ''
        if (metaName) {
          const parts = metaName.split(' ')
          setPrefillFirstName(parts[0] || '')
          setPrefillLastName(parts.slice(1).join(' ') || '')
        }
      }
      setPhase('profile-setup')
    }
  }

  // Called by ProfileSetup when profile is saved
  const handleProfileDone = (isNewUser) => {
    onDone(isNewUser)
  }

  // Called by ProfileSetup to go back to auth
  const handleProfileBack = () => {
    setPhase('auth')
  }

  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      style={{
        position: 'absolute', inset: 0, zIndex: 250,
        background: C.bg,
        overflow: 'hidden',
      }}
    >
      {/* FULLSCREEN MetaBalls background */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: phase === 'auth' || phase === 'profile-setup' ? 0.4 : 1 }}
        transition={{ duration: 1.2, delay: 0.2, ease: [.25,.1,.25,1] }}
        style={{
          position: 'absolute', inset: 0, overflow: 'hidden',
        }}
      >
        <div style={{
          position: 'absolute', inset: 0, overflow: 'hidden',
          background: C.surface,
        }}>
          <MetaBalls
            color={mbColor}
            cursorBallColor={mbCursorColor}
            cursorBallSize={mbCursorBallSize}
            ballCount={mbBallCount}
            animationSize={mbAnimationSize}
            enableMouseInteraction={mbMouseInteraction}
            enableTransparency={mbTransparency}
            hoverSmoothness={mbHoverSmoothness}
            clumpFactor={mbClumpFactor}
            speed={mbSpeed}
            asciiMode={mbAsciiMode}
            asciiCharSize={mbAsciiCharSize}
          />
        </div>
      </motion.div>

      {/* Floating Network (fades out when modal is focused) */}
      <motion.div
        initial={{ opacity: 0, scale: 1 }}
        animate={{
          opacity: phase === 'auth' || phase === 'profile-setup' ? 0 : 0.8,
          scale: phase === 'auth' || phase === 'profile-setup' ? 0.85 : 1,
        }}
        transition={{ duration: 1.5, ease: [.25,.1,.25,1] }}
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      >
        <FloatingNetwork />
      </motion.div>

      {/* MetaBalls Control Panel (hidden) */}
      <div style={{ display: 'none' }}>
        <button
          onClick={() => setShowControls(!showControls)}
          style={{
            width: 36, height: 36, borderRadius: 10,
            background: showControls ? C.orange : 'rgba(255,255,255,0.08)',
            border: `1px solid ${showControls ? C.orange : 'rgba(255,255,255,0.12)'}`,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: showControls ? C.bg : C.textSecondary,
            fontSize: 16,
            backdropFilter: 'blur(12px)',
          }}
        >
          <Settings size={16} />
        </button>
        <AnimatePresence>
          {showControls && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              style={{
                position: 'absolute', top: 44, right: 0, width: 260,
                background: 'rgba(20,20,20,0.95)', border: `1px solid ${C.border}`,
                borderRadius: 14, padding: 16, backdropFilter: 'blur(20px)',
                maxHeight: 'calc(100dvh - 100px)', overflowY: 'auto',
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 600, color: C.white, marginBottom: 14, letterSpacing: '0.05em', textTransform: 'uppercase' }}>MetaBalls Controls</div>
              {[
                { label: 'Color', type: 'color', value: mbColor, set: setMbColor },
                { label: 'Cursor Color', type: 'color', value: mbCursorColor, set: setMbCursorColor },
                { label: 'Ball Count', type: 'range', value: mbBallCount, set: setMbBallCount, min: 1, max: 50, step: 1 },
                { label: 'Animation Size', type: 'range', value: mbAnimationSize, set: setMbAnimationSize, min: 1, max: 60, step: 1 },
                { label: 'Cursor Ball Size', type: 'range', value: mbCursorBallSize, set: setMbCursorBallSize, min: 0.5, max: 10, step: 0.1 },
                { label: 'Speed', type: 'range', value: mbSpeed, set: setMbSpeed, min: 0.01, max: 2, step: 0.01 },
                { label: 'Clump Factor', type: 'range', value: mbClumpFactor, set: setMbClumpFactor, min: 0, max: 3, step: 0.1 },
                { label: 'Hover Smoothness', type: 'range', value: mbHoverSmoothness, set: setMbHoverSmoothness, min: 0.01, max: 0.5, step: 0.01 },
                { label: 'Transparency', type: 'toggle', value: mbTransparency, set: setMbTransparency },
                { label: 'Mouse Interaction', type: 'toggle', value: mbMouseInteraction, set: setMbMouseInteraction },
                { label: 'ASCII Mode', type: 'toggle', value: mbAsciiMode, set: setMbAsciiMode },
                { label: 'ASCII Char Size', type: 'range', value: mbAsciiCharSize, set: setMbAsciiCharSize, min: 3, max: 20, step: 1 },
              ].map(ctrl => (
                <div key={ctrl.label} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: C.textSecondary, fontWeight: 400 }}>{ctrl.label}</span>
                    {ctrl.type === 'range' && (
                      <span style={{ fontSize: 10, color: C.textTertiary, fontFamily: 'monospace' }}>{ctrl.value}</span>
                    )}
                  </div>
                  {ctrl.type === 'color' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input type="color" value={ctrl.value} onChange={e => ctrl.set(e.target.value)}
                        style={{ width: 28, height: 28, border: 'none', borderRadius: 6, cursor: 'pointer', background: 'transparent', padding: 0 }} />
                      <span style={{ fontSize: 11, color: C.textTertiary, fontFamily: 'monospace' }}>{ctrl.value}</span>
                    </div>
                  )}
                  {ctrl.type === 'range' && (
                    <input type="range" min={ctrl.min} max={ctrl.max} step={ctrl.step} value={ctrl.value}
                      onChange={e => ctrl.set(parseFloat(e.target.value))}
                      style={{ width: '100%', accentColor: C.orange, height: 4, cursor: 'pointer' }} />
                  )}
                  {ctrl.type === 'toggle' && (
                    <button onClick={() => ctrl.set(!ctrl.value)} style={{
                      width: 40, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer',
                      background: ctrl.value ? C.orange : C.surface3,
                      position: 'relative', transition: 'background 0.2s',
                    }}>
                      <div style={{
                        width: 16, height: 16, borderRadius: 8, background: C.white,
                        position: 'absolute', top: 3,
                        left: ctrl.value ? 21 : 3, transition: 'left 0.2s',
                      }} />
                    </button>
                  )}
                </div>
              ))}
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
                <button onClick={() => {
                  const vals = { color: mbColor, cursorBallColor: mbCursorColor, ballCount: mbBallCount, animationSize: mbAnimationSize, cursorBallSize: mbCursorBallSize, speed: mbSpeed, clumpFactor: mbClumpFactor, hoverSmoothness: mbHoverSmoothness, enableTransparency: mbTransparency, enableMouseInteraction: mbMouseInteraction, asciiMode: mbAsciiMode, asciiCharSize: mbAsciiCharSize }
                  navigator.clipboard.writeText(JSON.stringify(vals, null, 2))
                }} style={{
                  width: '100%', padding: '8px', borderRadius: 8, border: `1px solid ${C.border}`,
                  background: 'transparent', cursor: 'pointer', fontSize: 11, fontWeight: 500,
                  color: C.textSecondary, fontFamily: "'Space Grotesk', sans-serif",
                }}>Copy values to clipboard</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* CENTERED popup frame */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.7, ease: [.25,.1,.25,1] }}
        style={{
        position: 'absolute', inset: 0, zIndex: 2,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
        pointerEvents: 'none',
      }}>
        <div className="welcome-popup" style={{
        width: '100%', maxWidth: 420, maxHeight: '85vh',
        display: 'flex', flexDirection: 'column',
        borderRadius: 24,
        overflow: 'hidden',
        pointerEvents: 'auto',
        ...(glassStyle || { background: C.surface, border: `1px solid ${C.border}`, boxShadow: '0 32px 100px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)' }),
      }}>
        <AnimatePresence mode="wait">
          {phase === 'auth' ? (
            <AuthForm
              key="auth"
              onAuthComplete={handleAuthComplete}
              glassStyle={glassStyle}
            />
          ) : phase === 'onboarding' ? (
            <motion.div
              key="onboarding"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                padding: '48px 36px 36px',
              }}
            >
              {/* Skip */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                <button onClick={() => onDone()} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 13, color: C.textTertiary, fontWeight: 400,
                }}>Skip</button>
              </div>

              {/* Slide content */}
              <div style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden',
              }}>
                <AnimatePresence mode="wait" custom={slideDirection}>
                  <motion.div
                    key={slide}
                    custom={slideDirection}
                    variants={{
                      enter: (dir) => ({ x: dir * 60, opacity: 0 }),
                      center: { x: 0, opacity: 1 },
                      exit: (dir) => ({ x: dir * -60, opacity: 0 }),
                    }}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ type: 'spring', stiffness: 280, damping: 28 }}
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0.3}
                    onDragEnd={handleSlideDragEnd}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                      textAlign: 'center', width: '100%', cursor: 'grab',
                    }}
                  >
                    <div style={{
                      width: 220, height: 180, marginBottom: 40,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {current.mockup}
                    </div>

                    <div style={{
                      fontSize: 10, fontWeight: 500, color: C.textTertiary,
                      letterSpacing: '0.08em', textTransform: 'uppercase',
                      marginBottom: 12,
                    }}>{slide + 1} of {ONBOARDING_SLIDES.length}</div>

                    <div style={{
                      fontSize: 24, fontWeight: 700, color: C.white,
                      letterSpacing: '-0.03em', marginBottom: 12, lineHeight: 1.2,
                    }}>{current.title}</div>

                    <div style={{
                      fontSize: 14, fontWeight: 300, color: C.textSecondary,
                      lineHeight: 1.7, maxWidth: 300,
                    }}>{current.body}</div>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Dots + button */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  {ONBOARDING_SLIDES.map((_, i) => (
                    <motion.div
                      key={i}
                      animate={{ width: i === slide ? 20 : 6 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      style={{
                        height: 6, borderRadius: 3,
                        background: i === slide ? C.orange : C.surface3,
                      }}
                    />
                  ))}
                </div>
                <motion.button
                  onClick={handleOnboardingNext}
                  whileTap={{ scale: 0.97 }}
                  style={{
                    width: '100%', padding: '15px', borderRadius: 50, cursor: 'pointer',
                    background: C.white,
                    color: C.bg, fontSize: 15, fontWeight: 600,
                    letterSpacing: '-0.01em', border: 'none',
                  }}
                >{isLast ? 'Get started' : 'Continue'}</motion.button>
              </div>
            </motion.div>
          ) : (
            <ProfileSetup
              key="profile-setup"
              onDone={handleProfileDone}
              onBack={handleProfileBack}
              initialFirstName={prefillFirstName}
              initialLastName={prefillLastName}
            />
          )}
        </AnimatePresence>
      </div>
      </motion.div>
    </motion.div>
  )
}
