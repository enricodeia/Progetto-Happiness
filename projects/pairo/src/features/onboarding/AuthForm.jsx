import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Eye } from 'lucide-react'
import { supabase } from '../../supabase'
import { C } from '../../constants'

export default function AuthForm({ onAuthComplete, glassStyle }) {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [focusedField, setFocusedField] = useState(null)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [authError, setAuthError] = useState(null)
  const [resetSent, setResetSent] = useState(false)

  const isLogin = mode === 'login'

  // Map raw Supabase errors to human-friendly messages
  const friendlyError = (msg) => {
    if (!msg) return null
    const map = {
      'Invalid login credentials': 'Wrong email or password. Try again.',
      'Email not confirmed': 'Check your inbox and confirm your email first.',
      'User already registered': 'This email is already registered. Try logging in.',
      'Signup requires a valid password': 'Enter a password to continue.',
      'Password should be at least 6 characters': 'Password needs at least 8 characters.',
      'Email rate limit exceeded': 'Too many attempts. Wait a moment and try again.',
      'For security purposes, you can only request this after': 'Too many attempts. Wait a moment and try again.',
    }
    for (const [key, value] of Object.entries(map)) {
      if (msg.includes(key)) return value
    }
    // Strip technical prefixes and clean up
    const cleaned = msg.replace(/^AuthApiError:\s*/i, '').replace(/\s*\(.*\)$/, '')
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
  }

  const handleGoogleSignIn = async () => {
    setLoading(true)
    setAuthError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    })
    if (error) {
      setAuthError(friendlyError(error.message))
    }
    // Reset loading after 5s in case redirect doesn't happen
    setTimeout(() => setLoading(false), 5000)
  }

  const handleLinkedInSignIn = async () => {
    setLoading(true)
    setAuthError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'linkedin_oidc',
      options: {
        redirectTo: window.location.origin,
      },
    })
    if (error) {
      setAuthError(friendlyError(error.message))
    }
    setTimeout(() => setLoading(false), 5000)
  }

  const handleEmailSubmit = async () => {
    const newErrors = {}
    if (!email) newErrors.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Enter a valid email'
    if (!password) newErrors.password = 'Password is required'
    else if (!isLogin && password.length < 8) newErrors.password = 'Min 8 characters'
    if (!isLogin) {
      if (!confirmPassword) newErrors.confirmPassword = 'Confirm your password'
      else if (password !== confirmPassword) newErrors.confirmPassword = 'Passwords don\'t match'
    }
    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return

    setLoading(true)
    setAuthError(null)

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setAuthError(friendlyError(error.message))
        setLoading(false)
      } else {
        try {
          // Check if profile is complete
          const { data: { session: sess } } = await supabase.auth.getSession()
          const user = sess?.user
          if (!user) {
            setLoading(false)
            onAuthComplete(false)
            return
          }
          const { data: profile } = await supabase
            .from('profiles')
            .select('onboarding_complete')
            .eq('id', user.id)
            .maybeSingle()
          if (profile?.onboarding_complete) {
            setLoading(false)
            onAuthComplete(false)
          } else {
            setLoading(false)
            onAuthComplete(true, user)
          }
        } catch (e) {
          console.error('Post-login check failed:', e)
          setLoading(false)
          onAuthComplete(false)
        }
      }
    } else {
      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        })
        if (error) {
          setAuthError(friendlyError(error.message))
          setLoading(false)
        } else if (data?.user?.identities?.length === 0) {
          setAuthError('This email is already registered. Try signing in instead.')
          setLoading(false)
        } else {
          setLoading(false)
          onAuthComplete(true)
        }
      } catch (e) {
        console.error('Signup error:', e)
        setAuthError('Something went wrong. Try again.')
        setLoading(false)
      }
    }
  }

  const handleForgotPassword = async () => {
    if (!email) {
      setErrors({ email: 'Enter your email first' })
      return
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setErrors({ email: 'Enter a valid email' })
      return
    }
    setLoading(true)
    setAuthError(null)
    setErrors({})
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    })
    setLoading(false)
    if (error) {
      setAuthError(friendlyError(error.message))
    } else {
      setResetSent(true)
    }
  }

  const inputStyle = (field) => ({
    width: '100%', padding: '14px 18px', borderRadius: 14,
    background: C.surface2,
    border: `1.5px solid ${errors[field] ? C.red + '60' : focusedField === field ? C.orange : C.surface3}`,
    color: C.white, fontSize: 14, outline: 'none',
    fontFamily: "'Space Grotesk', sans-serif", fontWeight: 400,
    transition: 'border-color 0.3s ease, background 0.3s ease',
  })

  const labelStyle = {
    fontSize: 11, fontWeight: 500, color: C.textTertiary,
    letterSpacing: '0.06em', textTransform: 'uppercase',
    display: 'block', marginBottom: 8,
  }

  const errorStyle = {
    fontSize: 11, color: C.red, fontWeight: 400, marginTop: 6,
  }

  return (
    <motion.div
      key="auth"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.35 }}
      style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div style={{ flex: 1, overflowY: 'auto', padding: '48px 36px 24px' }}>
        {/* Header */}
        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -8, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div style={{
              fontSize: 28, fontWeight: 700, color: C.white,
              letterSpacing: '-0.04em', lineHeight: 1.15, marginBottom: 6,
            }}>
              {isLogin ? 'Welcome back.' : 'Create your account.'}
            </div>
            <div style={{
              fontSize: 14, color: 'rgba(255,255,255,0.42)', fontWeight: 300, lineHeight: 1.5,
              marginBottom: 32,
            }}>
              {isLogin ? 'Pick up where you left off.' : 'Join the community.'}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Auth error/warning banner */}
        <AnimatePresence>
          {authError && (() => {
            const isWarning = authError.includes('already registered')
            const bannerColor = isWarning ? '#F59E0B' : C.red
            return (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                style={{
                  background: bannerColor + '12', border: `1px solid ${bannerColor}30`,
                  borderRadius: 12, padding: '12px 16px', marginBottom: 24,
                  fontSize: 13, color: bannerColor, fontWeight: 400, lineHeight: 1.5,
                  overflow: 'hidden', display: 'flex', alignItems: 'flex-start', gap: 10,
                }}
              >
                {isWarning && <span style={{ fontSize: 15, lineHeight: 1.3, flexShrink: 0 }}>!</span>}
                <span>{authError}{isWarning && (
                  <button onClick={() => { setMode('login'); setErrors({}); setAuthError(null) }} style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: '#F59E0B', fontWeight: 600, fontSize: 13,
                    fontFamily: "'Space Grotesk', sans-serif",
                    textDecoration: 'underline', marginLeft: 4,
                  }}>Sign in</button>
                )}</span>
              </motion.div>
            )
          })()}
        </AnimatePresence>

        {/* Social buttons - only on login */}
        <AnimatePresence>
          {isLogin && (
            <motion.div
              key="social-buttons"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.35, ease: [.25,.1,.25,1] }}
              style={{ overflow: 'hidden' }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  style={{
                    width: '100%', padding: '14px', borderRadius: 50,
                    background: 'transparent', border: '1px solid rgba(255,255,255,0.3)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: 14, fontWeight: 500, color: C.textSecondary,
                    opacity: loading ? 0.6 : 1,
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 001 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Continue with Google
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleLinkedInSignIn}
                  disabled={loading}
                  style={{
                    width: '100%', padding: '14px', borderRadius: 50,
                    background: 'transparent', border: '1px solid rgba(255,255,255,0.3)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: 14, fontWeight: 500, color: C.textSecondary,
                    opacity: loading ? 0.6 : 1,
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" fill="white"/>
                  </svg>
                  Continue with LinkedIn
                </motion.button>
              </div>

              {/* Divider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
                <div style={{ flex: 1, height: 1, background: C.surface3 }} />
                <span style={{ fontSize: 14, color: C.textTertiary, fontWeight: 400 }}>or with email</span>
                <div style={{ flex: 1, height: 1, background: C.surface3 }} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Email form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <label style={labelStyle}>Email</label>
            <input
              value={email}
              onChange={e => { setEmail(e.target.value); setErrors(p => ({...p, email: null})); setAuthError(null) }}
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField(null)}
              placeholder="name@email.com"
              type="email"
              style={inputStyle('email')}
            />
            {errors.email && <div style={errorStyle}>{errors.email}</div>}
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={labelStyle}>Password</label>
              {isLogin && !resetSent && (
                <button onClick={handleForgotPassword} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 11, color: C.textTertiary, fontWeight: 400,
                  fontFamily: "'Space Grotesk', sans-serif",
                  marginBottom: 6,
                }}>Forgot password?</button>
              )}
            </div>
            <div style={{ position: 'relative' }}>
              <input
                value={password}
                onChange={e => { setPassword(e.target.value); setErrors(p => ({...p, password: null})); setAuthError(null) }}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                placeholder={isLogin ? 'Enter password' : 'Min 8 characters'}
                type={showPassword ? 'text' : 'password'}
                style={{...inputStyle('password'), paddingRight: 44}}
              />
              <button
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                }}
              >
                <Eye size={15} color={showPassword ? C.orange : C.textTertiary} />
              </button>
            </div>
            {errors.password && <div style={errorStyle}>{errors.password}</div>}
          </div>

          <AnimatePresence>
            {!isLogin && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                style={{ overflow: 'hidden' }}
              >
                <label style={labelStyle}>Confirm password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    value={confirmPassword}
                    onChange={e => { setConfirmPassword(e.target.value); setErrors(p => ({...p, confirmPassword: null})) }}
                    onFocus={() => setFocusedField('confirmPassword')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="Re-enter password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    style={{...inputStyle('confirmPassword'), paddingRight: 44}}
                  />
                  <button
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={{
                      position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                    }}
                  >
                    <Eye size={15} color={showConfirmPassword ? C.orange : C.textTertiary} />
                  </button>
                </div>
                {errors.confirmPassword && <div style={errorStyle}>{errors.confirmPassword}</div>}
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {resetSent && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                style={{
                  background: C.green + '12', border: `1px solid ${C.green}30`,
                  borderRadius: 12, padding: '12px 16px',
                  fontSize: 13, color: C.green, fontWeight: 400, lineHeight: 1.5,
                  overflow: 'hidden',
                }}
              >
                Check your inbox. We sent a password reset link to <strong>{email}</strong>.
                <button onClick={() => { setResetSent(false) }} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: C.green, fontWeight: 600, fontSize: 13,
                  fontFamily: "'Space Grotesk', sans-serif",
                  textDecoration: 'underline', marginLeft: 4,
                }}>Dismiss</button>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            onClick={handleEmailSubmit}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.97 }}
            disabled={loading}
            style={{
              width: '100%', padding: '16px', borderRadius: 50, border: 'none', cursor: 'pointer',
              background: C.white, color: C.bg,
              fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em',
              fontFamily: "'Space Grotesk', sans-serif",
              marginTop: 4,
              opacity: loading ? 0.6 : 1,
            }}
          >{loading ? 'Please wait...' : isLogin ? 'Sign in' : 'Create account'}</motion.button>
        </div>

        {!isLogin && (
          <p style={{
            fontSize: 11, color: C.textTertiary, textAlign: 'center',
            lineHeight: 1.6, margin: '20px 0 0', fontWeight: 300,
          }}>
            By continuing, you agree to our <a href="/terms.html" target="_blank" rel="noopener" style={{ color: C.textSecondary, textDecoration: 'underline' }}>Terms</a> and <a href="/privacy.html" target="_blank" rel="noopener" style={{ color: C.textSecondary, textDecoration: 'underline' }}>Privacy Policy</a>.
          </p>
        )}
      </div>

      {/* Bottom: sign up / sign in text link */}
      <div style={{
        padding: '16px 36px 28px', flexShrink: 0,
        display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 4,
      }}>
        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: 300 }}>
          {isLogin ? "Don't have an account?" : 'Already have an account?'}
        </span>
        <button onClick={() => { setMode(isLogin ? 'signup' : 'login'); setErrors({}); setAuthError(null) }} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 13, color: C.white, fontWeight: 600,
          fontFamily: "'Space Grotesk', sans-serif",
        }}>{isLogin ? 'Sign up' : 'Sign in'}</button>
      </div>
    </motion.div>
  )
}
