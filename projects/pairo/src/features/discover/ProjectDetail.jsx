import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { X } from 'lucide-react'
import { C } from '../../constants'

export default function ProjectDetail({ project, originIndex, onClose }) {
  const col = originIndex % 2
  const row = Math.floor(originIndex / 2)
  const originX = col === 0 ? '25%' : '75%'
  const originY = row === 0 ? '30%' : '60%'
  const [fullscreenVisual, setFullscreenVisual] = useState(null)

  const hasCover = !!project.cover_url
  const fallbackColor = project.color || '#2D1B4E'

  return (
    <motion.div
      initial={{ scale: 0.35, opacity: 0, borderRadius: 20 }}
      animate={{ scale: 1, opacity: 1, borderRadius: 28 }}
      exit={{ scale: 0.35, opacity: 0, borderRadius: 20 }}
      transition={{ type: 'spring', stiffness: 320, damping: 28 }}
      style={{
        position: 'absolute', inset: 0, zIndex: 50, overflow: 'hidden',
        background: C.bg, display: 'flex', flexDirection: 'column',
        transformOrigin: `${originX} ${originY}`,
      }}
    >
      {/* Hero */}
      <div style={{
        position: 'relative', height: 220, flexShrink: 0,
        background: hasCover ? 'transparent' : fallbackColor,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
      }}>
        {hasCover ? (
          <img src={project.cover_url} alt="" style={{
            width: '100%', height: '100%', objectFit: 'cover',
            position: 'absolute', inset: 0,
          }} />
        ) : (
          <span style={{ fontSize: 72, fontWeight: 700, color: 'rgba(255,255,255,.06)' }}>
            {project.label.charAt(0)}
          </span>
        )}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 100,
          background: `linear-gradient(to bottom, transparent, ${C.bg})`,
        }} />
        <motion.button
          onClick={onClose}
          whileTap={{ scale: 0.85 }}
          style={{
            position: 'absolute', top: 14, right: 14,
            width: 34, height: 34, borderRadius: 12,
            background: 'rgba(0,0,0,.4)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
            border: `1px solid rgba(255,255,255,.12)`, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <X size={16} color={C.white} />
        </motion.button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 40px', marginTop: -24 }}>
        <div style={{ fontSize: 24, fontWeight: 700, color: C.white, letterSpacing: '-0.03em', marginBottom: 8 }}>
          {project.label}
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
          {project.role && (
            <div style={{
              padding: '5px 12px', borderRadius: 8,
              background: `${fallbackColor}18`, border: `1px solid ${fallbackColor}30`,
              fontSize: 11, fontWeight: 600, color: fallbackColor,
            }}>{project.role}</div>
          )}
          {project.year && (
            <div style={{
              padding: '5px 12px', borderRadius: 8,
              background: 'rgba(255,255,255,.04)', border: `1px solid ${C.border}`,
              fontSize: 11, fontWeight: 500, color: C.textTertiary,
            }}>{project.year}</div>
          )}
        </div>

        {project.desc && (
          <p style={{
            fontSize: 14.5, fontWeight: 300, color: C.textSecondary, lineHeight: 1.75, margin: 0,
          }}>{project.desc}</p>
        )}

        {/* Visuals gallery */}
        {project.visuals && project.visuals.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <div style={{
              fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em',
              color: C.textTertiary, marginBottom: 12,
            }}>Gallery</div>
            <div style={{
              display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 8,
              WebkitOverflowScrolling: 'touch',
              scrollbarWidth: 'none',
            }}>
              {project.visuals.map((url, i) => (
                <motion.div
                  key={i}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setFullscreenVisual(url)}
                  style={{
                    width: 180, height: 240, borderRadius: 14, flexShrink: 0,
                    overflow: 'hidden', cursor: 'pointer',
                    background: C.surface2,
                  }}
                >
                  <img src={url} alt="" style={{
                    width: '100%', height: '100%', objectFit: 'cover',
                  }} />
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* No visuals fallback */}
        {(!project.visuals || project.visuals.length === 0) && (
          <div style={{
            marginTop: 24, width: '100%', aspectRatio: '16/10', borderRadius: 18,
            background: `linear-gradient(145deg, ${fallbackColor}12, ${fallbackColor}04)`,
            border: `1px solid ${fallbackColor}18`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '60%', opacity: 0.15 }}>
              <div style={{ height: 6, borderRadius: 3, background: fallbackColor, width: '80%' }} />
              <div style={{ height: 4, borderRadius: 2, background: fallbackColor, width: '100%' }} />
              <div style={{ height: 4, borderRadius: 2, background: fallbackColor, width: '65%' }} />
              <div style={{ height: 20, borderRadius: 6, background: fallbackColor, width: '40%', marginTop: 4 }} />
            </div>
          </div>
        )}
      </div>

      {/* Fullscreen visual overlay */}
      <AnimatePresence>
        {fullscreenVisual && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setFullscreenVisual(null)}
            style={{
              position: 'absolute', inset: 0, zIndex: 60,
              background: 'rgba(0,0,0,.92)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <motion.button
              onClick={() => setFullscreenVisual(null)}
              whileTap={{ scale: 0.85 }}
              style={{
                position: 'absolute', top: 16, right: 16,
                width: 36, height: 36, borderRadius: 12,
                background: 'rgba(255,255,255,.1)', border: 'none',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <X size={18} color={C.white} />
            </motion.button>
            <img src={fullscreenVisual} alt="" style={{
              maxWidth: '92%', maxHeight: '85%', objectFit: 'contain',
              borderRadius: 12,
            }} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
