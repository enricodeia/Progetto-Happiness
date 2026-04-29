import { motion, useMotionValue, useTransform, animate } from 'motion/react'
import ProfileCardContent from './ProfileCardContent'
import { C, SWIPE_THRESHOLD, EXIT_SPRING } from '../../constants'

export default function SwipeableCard({ profile, photoIndex, onPhotoChange, scrollRef, onSwipe, isFront, onSave, isSaved }) {
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-200, 200], [-12, 12])
  const likeOpacity = useTransform(x, [0, SWIPE_THRESHOLD], [0, 1])
  const nopeOpacity = useTransform(x, [-SWIPE_THRESHOLD, 0], [1, 0])

  const handleDragEnd = (_, info) => {
    const { offset, velocity } = info
    if (offset.x > SWIPE_THRESHOLD || velocity.x > 500) {
      animate(x, 600, EXIT_SPRING)
      setTimeout(() => onSwipe('right'), 200)
    } else if (offset.x < -SWIPE_THRESHOLD || velocity.x < -500) {
      animate(x, -600, EXIT_SPRING)
      setTimeout(() => onSwipe('left'), 200)
    } else {
      animate(x, 0, { type: 'spring', stiffness: 500, damping: 35 })
    }
  }

  return (
    <motion.div
      style={{ x, rotate, position: 'absolute', inset: 0, zIndex: isFront ? 2 : 1, touchAction: 'none' }}
      drag={isFront ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.9}
      onDragEnd={isFront ? handleDragEnd : undefined}
      initial={isFront ? { scale: 0.95, y: 12 } : { scale: 0.92, y: 20 }}
      animate={isFront ? { scale: 1, y: 0 } : { scale: 0.92, y: 20 }}
      transition={{ type: 'spring', stiffness: 260, damping: 26 }}
    >
      {isFront && (
        <motion.div style={{
          opacity: likeOpacity,
          position: 'absolute', top: 32, left: 24, zIndex: 10,
          padding: '8px 18px', borderRadius: 12,
          border: `3px solid ${C.green}`, background: 'rgba(52,211,153,.12)',
          fontSize: 22, fontWeight: 800, color: C.green, letterSpacing: '0.08em',
          transform: 'rotate(-12deg)', pointerEvents: 'none',
        }}>LIKE</motion.div>
      )}
      {isFront && (
        <motion.div style={{
          opacity: nopeOpacity,
          position: 'absolute', top: 32, right: 24, zIndex: 10,
          padding: '8px 18px', borderRadius: 12,
          border: `3px solid ${C.red}`, background: 'rgba(248,113,113,.12)',
          fontSize: 22, fontWeight: 800, color: C.red, letterSpacing: '0.08em',
          transform: 'rotate(12deg)', pointerEvents: 'none',
        }}>NOPE</motion.div>
      )}
      <ProfileCardContent
        profile={profile}
        photoIndex={photoIndex}
        onPhotoChange={onPhotoChange}
        scrollRef={scrollRef}
        isFront={isFront}
        onSave={onSave}
        isSaved={isSaved}
      />
    </motion.div>
  )
}
