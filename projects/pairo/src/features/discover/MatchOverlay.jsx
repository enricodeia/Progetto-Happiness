import { motion } from 'motion/react'
import { Sparkles } from 'lucide-react'
import { C } from '../../constants'
import { Button, Avatar } from '../../components/ui'

export default function MatchOverlay({ profile, onMessage, onKeepSwiping }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        position: 'absolute', inset: 0, zIndex: 500,
        background: 'rgba(0,0,0,0.85)',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: 32, gap: 20,
      }}
    >
      <motion.div
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.15 }}
      >
        <Sparkles size={48} color={C.orange} />
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.25 }}
        style={{ textAlign: 'center' }}
      >
        <div style={{ fontSize: 28, fontWeight: 800, color: C.white, letterSpacing: '-0.03em', marginBottom: 6 }}>
          It's a match!
        </div>
        <div style={{ fontSize: 14, color: C.textSecondary }}>
          You and {profile.name} liked each other
        </div>
      </motion.div>

      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.35, type: 'spring', stiffness: 300 }}
      >
        <Avatar
          src={profile.photo_url || null}
          name={profile.name}
          size={100}
          style={{
            borderRadius: 32,
            border: `3px solid ${C.orange}`,
            boxShadow: `0 0 40px ${C.orange}40`,
          }}
        />
      </motion.div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 260, marginTop: 8 }}>
        <Button
          variant="primary"
          onClick={onMessage}
          style={{ padding: '14px', borderRadius: 14, width: '100%' }}
        >Send a message</Button>
        <Button
          variant="secondary"
          onClick={onKeepSwiping}
          style={{ padding: '14px', borderRadius: 14, width: '100%', fontWeight: 500 }}
        >Keep swiping</Button>
      </div>
    </motion.div>
  )
}
