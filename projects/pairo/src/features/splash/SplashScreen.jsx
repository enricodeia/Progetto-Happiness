import { useEffect } from 'react'
import { motion } from 'motion/react'
import MetaBalls from '../../MetaBalls'
import FloatingNetwork from '../../FloatingNetwork'
import PairoLogo from '../../components/PairoLogo'
import { C } from '../../constants'

export default function SplashScreen({ onDone }) {
  useEffect(() => {
    const timer = setTimeout(onDone, 3600)
    return () => clearTimeout(timer)
  }, [onDone])

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.08 }}
      transition={{ duration: 0.6, ease: [.25,.1,.25,1] }}
      style={{
        position: 'absolute', inset: 0, zIndex: 300,
        background: C.bg,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
        padding: 30,
      }}
    >
      <div style={{
        position: 'absolute', inset: 30, borderRadius: 24, overflow: 'hidden',
        background: C.surface,
      }}>
        <MetaBalls
          color="#FF6B35"
          cursorBallColor="#FF6B35"
          cursorBallSize={0.7}
          ballCount={24}
          animationSize={9}
          enableMouseInteraction={false}
          enableTransparency={true}
          hoverSmoothness={0.34}
          clumpFactor={1.1}
          speed={0.05}
          asciiMode={true}
          asciiCharSize={8}
        />
        <FloatingNetwork />
      </div>

      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 120, damping: 14, delay: 0.15 }}
        style={{ position: 'relative', zIndex: 1 }}
      >
        <PairoLogo size={52} />
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.8 }}
        style={{
          position: 'relative', zIndex: 1, marginTop: 14,
          display: 'flex', gap: 0, overflow: 'hidden',
        }}
      >
        {'Discover creative work'.split('').map((char, i) => (
          <motion.span
            key={i}
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.65 + i * 0.025, duration: 0.35, ease: [.25,.1,.25,1] }}
            style={{
              fontSize: 13.5, color: C.textSecondary, fontWeight: 400,
              letterSpacing: '0.02em',
              display: 'inline-block',
              whiteSpace: 'pre',
            }}
          >{char}</motion.span>
        ))}
      </motion.div>

      <motion.div
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ scaleX: 1, opacity: 1 }}
        transition={{ delay: 1.4, duration: 0.8, ease: [.25,.1,.25,1] }}
        style={{
          position: 'relative', zIndex: 1, marginTop: 20,
          width: 40, height: 1,
          background: `linear-gradient(90deg, transparent, ${C.orange}60, transparent)`,
        }}
      />

      <div style={{
        position: 'absolute', bottom: 'calc(60px + env(safe-area-inset-bottom, 0px))',
        width: 120, height: 2, borderRadius: 1,
        background: C.surface2, overflow: 'hidden', zIndex: 1,
      }}>
        <motion.div
          initial={{ x: '-100%' }}
          animate={{ x: '100%' }}
          transition={{ duration: 1.8, repeat: Infinity, ease: [.4,0,.2,1] }}
          style={{
            width: '50%', height: '100%', borderRadius: 1,
            background: `linear-gradient(90deg, transparent, ${C.orange}, transparent)`,
          }}
        />
      </div>
    </motion.div>
  )
}
