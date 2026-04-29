import { useState, useEffect } from 'react'
import { Globe } from 'lucide-react'
import SubScreenHeader from '../../components/SubScreenHeader'
import { ToggleRow } from '../../components/SettingsRow'
import { supabase } from '../../supabase'
import { C, ALL_ROLE_TYPES, ALL_INDUSTRIES } from '../../constants'

export default function PreferencesScreen({ onBack, userId }) {
  const [distance, setDistance] = useState(25)
  const [showRemote, setShowRemote] = useState(true)
  const [roleTypes, setRoleTypes] = useState([])
  const [industries, setIndustries] = useState([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!userId) return
    supabase.from('profiles').select('pref_distance, pref_show_remote, pref_role_types, pref_industries').eq('id', userId).maybeSingle()
      .then(({ data }) => {
        if (data) {
          if (data.pref_distance != null) setDistance(data.pref_distance)
          if (data.pref_show_remote != null) setShowRemote(data.pref_show_remote)
          if (data.pref_role_types) setRoleTypes(data.pref_role_types)
          if (data.pref_industries) setIndustries(data.pref_industries)
        }
        setLoaded(true)
      })
  }, [userId])

  const saveField = async (key, value) => {
    const { error } = await supabase.from('profiles').update({ [key]: value }).eq('id', userId)
    if (error) console.warn('Failed to save preference:', key, error.message)
  }

  const toggleRole = (role) => {
    const next = roleTypes.includes(role) ? roleTypes.filter(r => r !== role) : [...roleTypes, role]
    setRoleTypes(next)
    saveField('pref_role_types', next)
  }

  const toggleIndustry = (ind) => {
    const next = industries.includes(ind) ? industries.filter(i => i !== ind) : [...industries, ind]
    setIndustries(next)
    saveField('pref_industries', next)
  }

  const chipStyle = (active) => ({
    padding: '8px 16px', borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: 'pointer',
    color: active ? C.orange : C.textSecondary,
    background: 'transparent',
    border: `1.5px ${active ? 'dashed' : 'solid'} ${active ? C.orange : C.border}`,
    fontFamily: "'Space Grotesk', sans-serif",
  })

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 20px' }}>
      <SubScreenHeader title="Preferences" onBack={onBack} />

      {/* Distance */}
      <div style={{ marginBottom: 24 }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12,
        }}>
          <span style={{
            fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em',
            color: C.textTertiary,
          }}>Maximum distance</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: C.orange }}>{distance} km</span>
        </div>
        <div style={{ position: 'relative', height: 28, display: 'flex', alignItems: 'center' }}>
          <div style={{
            width: '100%', height: 4, borderRadius: 2, background: C.surface3,
          }}>
            <div style={{
              width: `${(distance / 100) * 100}%`, height: '100%', borderRadius: 2,
              background: C.orange,
            }} />
          </div>
          <input
            type="range" min={1} max={100} value={distance}
            onChange={e => {
              const v = Number(e.target.value)
              setDistance(v)
            }}
            onPointerUp={() => saveField('pref_distance', distance)}
            onTouchEnd={() => saveField('pref_distance', distance)}
            style={{
              position: 'absolute', width: '100%', height: '100%',
              opacity: 0, cursor: 'pointer', margin: 0,
            }}
          />
          <div style={{
            position: 'absolute', left: `calc(${(distance / 100) * 100}% - 10px)`,
            width: 20, height: 20, borderRadius: 10,
            background: C.white, boxShadow: `0 2px 8px rgba(0,0,0,.3)`,
            pointerEvents: 'none',
          }} />
        </div>
      </div>

      {/* Remote toggle */}
      <div style={{
        background: C.surface, borderRadius: 16, overflow: 'hidden',
        border: `1px solid ${C.border}`, marginBottom: 24,
      }}>
        <ToggleRow
          icon={<Globe size={18} color={C.textSecondary} />}
          label="Include remote"
          enabled={showRemote}
          onToggle={() => { const next = !showRemote; setShowRemote(next); saveField('pref_show_remote', next) }}
          isLast
        />
      </div>

      {/* Role types */}
      <div style={{ marginBottom: 24 }}>
        <div style={{
          fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em',
          color: C.textTertiary, marginBottom: 10,
        }}>Role types</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {ALL_ROLE_TYPES.map(r => (
            <button key={r} onClick={() => toggleRole(r)} style={chipStyle(roleTypes.includes(r))}>{r}</button>
          ))}
        </div>
      </div>

      {/* Industries */}
      <div>
        <div style={{
          fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em',
          color: C.textTertiary, marginBottom: 10,
        }}>Industries</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {ALL_INDUSTRIES.map(ind => (
            <button key={ind} onClick={() => toggleIndustry(ind)} style={chipStyle(industries.includes(ind))}>{ind}</button>
          ))}
        </div>
      </div>
    </div>
  )
}
