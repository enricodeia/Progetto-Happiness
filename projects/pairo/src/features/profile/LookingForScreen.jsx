import { useState, useEffect } from 'react'
import { Handshake, Users, GraduationCap, Target, Megaphone, Building2, Check } from 'lucide-react'
import SubScreenHeader from '../../components/SubScreenHeader'
import { supabase } from '../../supabase'
import { C } from '../../constants'

const LOOKING_FOR_OPTIONS = [
  { icon: (c) => <Handshake size={20} color={c} />, label: 'Collaborator', desc: 'Partner on creative projects', color: C.orange },
  { icon: (c) => <Users size={20} color={c} />, label: 'Hire', desc: 'Find talent for your team', color: C.blue },
  { icon: (c) => <GraduationCap size={20} color={c} />, label: 'Mentor', desc: 'Learn from experienced pros', color: C.green },
  { icon: (c) => <Target size={20} color={c} />, label: 'Co-founder', desc: 'Build something together', color: '#C084FC' },
  { icon: (c) => <Megaphone size={20} color={c} />, label: 'Freelance gigs', desc: 'Find project-based work', color: '#F472B6' },
  { icon: (c) => <Building2 size={20} color={c} />, label: 'Agency work', desc: 'Join agency projects', color: '#FBBF24' },
]

export default function LookingForScreen({ onBack, userId }) {
  const [selected, setSelected] = useState([])

  useEffect(() => {
    if (!userId) return
    supabase.from('profiles').select('looking_for').eq('id', userId).maybeSingle()
      .then(({ data }) => {
        if (data?.looking_for) {
          // looking_for can be a string or array
          const val = data.looking_for
          setSelected(Array.isArray(val) ? val : [val])
        }
      })
  }, [userId])

  const toggle = (label) => {
    const next = selected.includes(label) ? selected.filter(s => s !== label) : [...selected, label]
    setSelected(next)
    supabase.from('profiles').update({ looking_for: next.join(', ') }).eq('id', userId)
      .then(({ error }) => { if (error) console.warn('Failed to save looking_for:', error.message) })
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 20px' }}>
      <SubScreenHeader title="Looking for" onBack={onBack} />

      <p style={{
        fontSize: 13, color: C.textTertiary, lineHeight: 1.5, margin: '0 0 20px',
        fontWeight: 300,
      }}>Select what you're open to. This helps us show you the right people.</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {LOOKING_FOR_OPTIONS.map((opt) => {
          const active = selected.includes(opt.label)
          return (
            <button key={opt.label} onClick={() => toggle(opt.label)} style={{
              display: 'flex', alignItems: 'center', gap: 14, padding: '14px 14px',
              borderRadius: 16, cursor: 'pointer', border: 'none', textAlign: 'left',
              background: active ? `${C.orange}0A` : C.surface,
              outline: active ? `1.5px solid ${C.orangeBorder}` : `1px solid ${C.border}`,
              transition: 'all .15s ease',
            }}>
              <div style={{
                width: 42, height: 42, borderRadius: 14,
                background: active ? `${opt.color}20` : C.surface2,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>{opt.icon(active ? opt.color : C.textTertiary)}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.white, marginBottom: 2 }}>{opt.label}</div>
                <div style={{ fontSize: 11.5, color: C.textTertiary, fontWeight: 400 }}>{opt.desc}</div>
              </div>
              {/* Checkbox indicator: squared corners for multi-select */}
              <div style={{
                width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                background: active ? C.orange : 'transparent',
                border: active ? 'none' : `1.5px solid ${C.textTertiary}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all .15s ease',
              }}>
                {active && <Check size={12} color={C.white} strokeWidth={3} />}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
