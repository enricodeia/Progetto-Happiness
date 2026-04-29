import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { UserCircle, Sliders, Target, Settings, ChevronLeft, Crown } from 'lucide-react'
import MyProfileScreen from './MyProfileScreen'
import PreferencesScreen from './PreferencesScreen'
import LookingForScreen from './LookingForScreen'
import SettingsScreen from './SettingsScreen'
import ProPaywall from './ProPaywall'
import { supabase } from '../../supabase'
import { C } from '../../constants'

export default function ProfileScreen({ userId }) {
  const [subScreen, setSubScreen] = useState(null)
  const [showPro, setShowPro] = useState(false)
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    if (!userId) return
    const load = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()
      if (data) setProfile(data)
    }
    load()
  }, [userId])

  const name = profile?.name || 'User'
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  const role = profile?.role || ''
  const photoUrl = profile?.photo_url || null

  // Calculate profile completion
  const fields = [profile?.name, profile?.role, profile?.bio, profile?.location, profile?.looking_for, profile?.availability]
  const skillsFilled = (profile?.skills || []).length > 0
  const promptsFilled = (profile?.prompts || []).filter(p => p.a?.trim()).length >= 3
  const filledCount = fields.filter(Boolean).length + (skillsFilled ? 1 : 0) + (promptsFilled ? 1 : 0) + (photoUrl ? 1 : 0)
  const totalFields = fields.length + 3
  const completion = Math.round((filledCount / totalFields) * 100)

  const subScreenComponents = {
    profile: MyProfileScreen,
    preferences: PreferencesScreen,
    looking: LookingForScreen,
    settings: SettingsScreen,
  }

  const rows = [
    { icon: <UserCircle size={18} color={C.textSecondary} />, label: 'My Profile', key: 'profile', desc: 'Photos, bio, skills' },
    { icon: <Sliders size={18} color={C.textSecondary} />, label: 'Preferences', key: 'preferences', desc: 'Distance, roles, industries' },
    { icon: <Target size={18} color={C.textSecondary} />, label: 'Looking for', key: 'looking', desc: 'Collaborator, hire, mentor' },
    { icon: <Settings size={18} color={C.textSecondary} />, label: 'Settings', key: 'settings', desc: 'Account, notifications, privacy' },
  ]

  const SubScreenComponent = subScreen ? subScreenComponents[subScreen] : null

  return (
    <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
      {/* Main hub */}
      <div style={{
        position: 'absolute', inset: 0, overflowY: 'auto', padding: '0 20px',
        transform: subScreen ? 'translateX(-30%)' : 'translateX(0)',
        opacity: subScreen ? 0 : 1,
        transition: 'all .3s cubic-bezier(.4,0,.2,1)',
        pointerEvents: subScreen ? 'none' : 'auto',
      }}>
        {/* Profile completion */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 0 8px' }}>
          <div style={{ position: 'relative', marginBottom: 14 }}>
            {photoUrl ? (
              <img src={photoUrl} alt="" style={{
                width: 80, height: 80, borderRadius: 26, objectFit: 'cover',
              }} />
            ) : (
              <div style={{
                width: 80, height: 80, borderRadius: 26,
                background: C.surface3,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 27, fontWeight: 700, color: C.white,
              }}>{initials}</div>
            )}
            {/* Completion ring */}
            <svg width="92" height="92" style={{ position: 'absolute', top: -6, left: -6 }}>
              <circle cx="46" cy="46" r="42" fill="none" stroke={C.surface3} strokeWidth="2.5" />
              <circle cx="46" cy="46" r="42" fill="none" stroke={C.orange} strokeWidth="2.5"
                strokeDasharray={`${(completion / 100) * 2 * Math.PI * 42} ${2 * Math.PI * 42}`}
                strokeLinecap="round"
                transform="rotate(-90 46 46)"
              />
            </svg>
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: C.white, marginBottom: 2, letterSpacing: '-0.02em' }}>{name}</div>
          {role && <div style={{ fontSize: 12.5, color: C.textTertiary, marginBottom: 6 }}>{role}</div>}
          <div style={{
            padding: '4px 10px', borderRadius: 8,
            background: completion === 100 ? C.green + '15' : 'rgba(255,255,255,.06)',
            fontSize: 10.5, fontWeight: 600,
            color: completion === 100 ? C.green : C.textSecondary,
          }}>{completion === 100 ? 'Profile complete' : `${completion}% complete`}</div>
        </div>

        {/* Stats row -- real stats will come later, show zeros for now */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {[
            { value: '0', label: 'Saves' },
            { value: '0', label: 'Connections' },
            { value: '0', label: 'Views' },
          ].map((stat, i) => (
            <div key={i} style={{
              flex: 1, padding: '12px 0', borderRadius: 14, background: C.surface,
              border: `1px solid ${C.border}`, textAlign: 'center',
            }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: C.white, letterSpacing: '-0.02em' }}>{stat.value}</div>
              <div style={{ fontSize: 10, color: C.textTertiary, marginTop: 2 }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Navigation rows */}
        <div style={{ background: C.surface, borderRadius: 16, overflow: 'hidden', border: `1px solid ${C.border}` }}>
          {rows.map((row, i) => (
            <button
              key={i}
              onClick={() => setSubScreen(row.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, width: '100%',
                padding: '14px 14px', background: 'none', border: 'none', cursor: 'pointer',
                borderBottom: i < rows.length - 1 ? `1px solid ${C.border}` : 'none',
                textAlign: 'left',
              }}
            >
              <div style={{
                width: 34, height: 34, borderRadius: 10, background: C.surface2,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>{row.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, color: C.text, fontWeight: 500 }}>{row.label}</div>
                <div style={{ fontSize: 11, color: C.textTertiary, marginTop: 1 }}>{row.desc}</div>
              </div>
              <ChevronLeft size={14} color={C.textTertiary} style={{ transform: 'rotate(180deg)' }} />
            </button>
          ))}
        </div>

        {/* Pro upgrade */}
        <button onClick={() => setShowPro(true)} style={{
          width: '100%', marginTop: 16, padding: '16px', borderRadius: 18,
          background: C.surface,
          border: `1px solid ${C.border}`,
          display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
          textAlign: 'left',
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: 13,
            background: C.orange,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Crown size={18} color={C.white} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.orange }}>Upgrade to Pro</div>
            <div style={{ fontSize: 11, color: C.textTertiary, marginTop: 2 }}>See who liked you, unlimited swipes, 3D mode</div>
          </div>
          <ChevronLeft size={14} color={C.textTertiary} style={{ transform: 'rotate(180deg)' }} />
        </button>

        <div style={{ height: 16 }} />
      </div>

      {/* Sub-screen slide-in */}
      <AnimatePresence>
        {SubScreenComponent && (
          <motion.div
            key={subScreen}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 350, damping: 35 }}
            style={{
              position: 'absolute', inset: 0, background: C.bg,
              display: 'flex', flexDirection: 'column', zIndex: 10,
            }}
          >
            <SubScreenComponent onBack={() => { setSubScreen(null); /* reload profile */ const reload = async () => { const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle(); if (data) setProfile(data) }; reload() }} userId={userId} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pro paywall */}
      <AnimatePresence>
        {showPro && <ProPaywall onClose={() => setShowPro(false)} />}
      </AnimatePresence>
    </div>
  )
}
