import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { X, Eye, Zap, Globe, Star, BarChart3, Crown } from 'lucide-react'
import { supabase } from '../../supabase'
import { C } from '../../constants'
import { Button, Badge } from '../../components/ui'

export default function ProPaywall({ onClose }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const features = [
    { icon: <Eye size={18} />, label: 'See who liked you', desc: 'Never miss a connection' },
    { icon: <Zap size={18} />, label: 'Unlimited swipes', desc: 'No daily limits' },
    { icon: <Globe size={18} />, label: '3D Globe mode', desc: 'Explore talent in 3D space' },
    { icon: <Star size={18} />, label: '5x Super Likes', desc: 'Stand out from the crowd' },
    { icon: <BarChart3 size={18} />, label: 'Profile analytics', desc: 'See who viewed your profile' },
  ]

  const handleCheckout = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Please log in first.')
        setLoading(false)
        return
      }

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ origin: window.location.origin }),
        }
      )

      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setError(data.error || 'Something went wrong.')
        setLoading(false)
      }
    } catch (e) {
      console.error('Checkout error:', e)
      setError('Connection failed. Try again.')
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'absolute', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,.85)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        display: 'flex', flexDirection: 'column',
      }}
    >
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 24, padding: 40,
            }}
          >
            {/* Animated spinner */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
              style={{
                width: 48, height: 48, borderRadius: '50%',
                border: '3px solid rgba(255,255,255,.08)',
                borderTopColor: C.orange,
              }}
            />
            <div style={{ textAlign: 'center' }}>
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                style={{
                  fontSize: 18, fontWeight: 600, color: C.white,
                  letterSpacing: '-0.02em', marginBottom: 8,
                }}
              >Setting up checkout</motion.div>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: [0.3, 0.7, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                style={{
                  fontSize: 13, color: C.textTertiary, fontWeight: 300,
                }}
              >Connecting to Stripe</motion.div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="content"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28, delay: 0.1 }}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              padding: '60px 24px 30px', overflowY: 'auto',
            }}
          >
            {/* Close */}
            <Button
              variant="ghost"
              onClick={onClose}
              style={{
                position: 'absolute', top: 52, right: 16,
                width: 32, height: 32, borderRadius: 10, background: 'rgba(255,255,255,.08)',
                padding: 0, minWidth: 0,
              }}
            >
              <X size={16} color={C.textSecondary} />
            </Button>

            {/* Crown badge */}
            <div style={{
              width: 64, height: 64, borderRadius: 22, margin: '0 auto 16px',
              background: C.orange,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 8px 32px rgba(255,107,53,.35)`,
            }}>
              <Crown size={28} color={C.white} />
            </div>

            <div style={{
              fontSize: 24, fontWeight: 700, color: C.white, textAlign: 'center',
              marginBottom: 6, letterSpacing: '-0.03em',
            }}>Upgrade to Pro</div>
            <p style={{
              fontSize: 13, color: C.textTertiary, textAlign: 'center', margin: '0 0 28px',
              lineHeight: 1.5, fontWeight: 300,
            }}>Get the full pairo experience. Cancel anytime.</p>

            {/* Features */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 28 }}>
              {features.map((f, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 + i * 0.06 }}
                >
                  <Badge
                    variant="default"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14, padding: '11px 14px',
                      borderRadius: 14, width: '100%', boxSizing: 'border-box',
                    }}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: 11,
                      background: 'rgba(255,255,255,.06)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: C.textSecondary, flexShrink: 0,
                    }}>{f.icon}</div>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: C.white }}>{f.label}</div>
                      <div style={{ fontSize: 11, color: C.textTertiary, marginTop: 1 }}>{f.desc}</div>
                    </div>
                  </Badge>
                </motion.div>
              ))}
            </div>

            {/* Pricing */}
            <div style={{ marginTop: 'auto' }}>
              <div style={{
                padding: '16px', borderRadius: 18,
                background: C.surface,
                border: `1.5px solid ${C.border}`, marginBottom: 12,
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 11, color: C.textTertiary, marginBottom: 4, fontWeight: 500 }}>Monthly</div>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 2 }}>
                  <span style={{ fontSize: 14, color: C.textTertiary, fontWeight: 400, textDecoration: 'line-through', marginRight: 6 }}>9.99</span>
                  <span style={{ fontSize: 32, fontWeight: 700, color: C.white, letterSpacing: '-0.03em' }}>4.99</span>
                  <span style={{ fontSize: 14, color: C.textTertiary, fontWeight: 400 }}>/mo</span>
                </div>
              </div>

              {error && (
                <div style={{
                  padding: '10px 14px', borderRadius: 12, marginBottom: 10,
                  background: C.red + '12', border: `1px solid ${C.red}30`,
                  fontSize: 12, color: C.red, textAlign: 'center',
                }}>{error}</div>
              )}

              <Button
                variant="primary"
                size="full"
                onClick={handleCheckout}
                loading={loading}
                style={{ fontWeight: 700, borderRadius: 16 }}
              >Subscribe now</Button>

              <p style={{
                fontSize: 10.5, color: C.textTertiary, textAlign: 'center', margin: '10px 0 0',
                fontWeight: 400,
              }}>Secure payment via Stripe. Cancel anytime.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
