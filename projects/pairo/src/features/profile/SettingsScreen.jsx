import { useState, useEffect } from 'react'
import { UserCircle, Shield, Bell, Send, Eye, LogOut } from 'lucide-react'
import SubScreenHeader from '../../components/SubScreenHeader'
import { SettingsRow, ToggleRow } from '../../components/SettingsRow'
import { supabase } from '../../supabase'
import { C } from '../../constants'

export default function SettingsScreen({ onBack, userId }) {
  const [pushEnabled, setPushEnabled] = useState(true)
  const [emailEnabled, setEmailEnabled] = useState(false)
  const [profileVisible, setProfileVisible] = useState(true)
  const [userEmail, setUserEmail] = useState('')
  const [loggingOut, setLoggingOut] = useState(false)

  useEffect(() => {
    if (!userId) return
    // Load user email from auth session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email) setUserEmail(session.user.email)
    })
    // Load settings from profile
    supabase.from('profiles').select('setting_push_notifications, setting_email_updates, setting_profile_visible').eq('id', userId).maybeSingle()
      .then(({ data }) => {
        if (data) {
          if (data.setting_push_notifications != null) setPushEnabled(data.setting_push_notifications)
          if (data.setting_email_updates != null) setEmailEnabled(data.setting_email_updates)
          if (data.setting_profile_visible != null) setProfileVisible(data.setting_profile_visible)
        }
      })
  }, [userId])

  const saveSetting = async (key, value) => {
    const { error } = await supabase.from('profiles').update({ [key]: value }).eq('id', userId)
    if (error) console.warn('Failed to save setting:', key, error.message)
  }

  const handleLogout = async () => {
    setLoggingOut(true)
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 20px' }}>
      <SubScreenHeader title="Settings" onBack={onBack} />

      {/* Account */}
      <div style={{
        fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em',
        color: C.textTertiary, marginBottom: 8,
      }}>Account</div>
      <div style={{
        background: C.surface, borderRadius: 16, overflow: 'hidden',
        border: `1px solid ${C.border}`, marginBottom: 20,
      }}>
        <SettingsRow icon={<UserCircle size={18} color={C.textSecondary} />} label="Email" value={userEmail || '...'} />
        <SettingsRow icon={<Shield size={18} color={C.textSecondary} />} label="Password" value="••••••••" isLast />
      </div>

      {/* Notifications */}
      <div style={{
        fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em',
        color: C.textTertiary, marginBottom: 8,
      }}>Notifications</div>
      <div style={{
        background: C.surface, borderRadius: 16, overflow: 'hidden',
        border: `1px solid ${C.border}`, marginBottom: 20,
      }}>
        <ToggleRow
          icon={<Bell size={18} color={C.textSecondary} />}
          label="Push notifications"
          enabled={pushEnabled}
          onToggle={() => { const next = !pushEnabled; setPushEnabled(next); saveSetting('setting_push_notifications', next) }}
        />
        <ToggleRow
          icon={<Send size={18} color={C.textSecondary} />}
          label="Email updates"
          enabled={emailEnabled}
          onToggle={() => { const next = !emailEnabled; setEmailEnabled(next); saveSetting('setting_email_updates', next) }}
          isLast
        />
      </div>

      {/* Privacy */}
      <div style={{
        fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em',
        color: C.textTertiary, marginBottom: 8,
      }}>Privacy</div>
      <div style={{
        background: C.surface, borderRadius: 16, overflow: 'hidden',
        border: `1px solid ${C.border}`, marginBottom: 20,
      }}>
        <ToggleRow
          icon={<Eye size={18} color={C.textSecondary} />}
          label="Profile visible"
          enabled={profileVisible}
          onToggle={() => { const next = !profileVisible; setProfileVisible(next); saveSetting('setting_profile_visible', next) }}
        />
        <SettingsRow icon={<Shield size={18} color={C.textSecondary} />} label="Blocked users" value="0" isLast />
      </div>

      {/* Danger zone */}
      <div style={{
        background: C.surface, borderRadius: 16, overflow: 'hidden',
        border: `1px solid ${C.border}`, marginBottom: 20,
      }}>
        <button onClick={handleLogout} disabled={loggingOut} style={{
          display: 'flex', alignItems: 'center', gap: 12, width: '100%',
          padding: '14px 14px', background: 'none', border: 'none', cursor: 'pointer',
          textAlign: 'left', opacity: loggingOut ? 0.5 : 1,
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10, background: C.surface2,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <LogOut size={18} color={C.red} />
          </div>
          <span style={{ fontSize: 14, color: C.red, fontWeight: 500, fontFamily: "'Space Grotesk', sans-serif" }}>
            {loggingOut ? 'Logging out...' : 'Log out'}
          </span>
        </button>
      </div>

      <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>
        <span style={{ fontSize: 10.5, color: C.textTertiary }}>pairo v1.0.0</span>
      </div>
    </div>
  )
}
