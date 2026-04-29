import { ChevronLeft } from 'lucide-react'
import { C } from '../constants'

export function SettingsRow({ icon, label, value, onClick, isLast, danger }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 12, width: '100%',
      padding: '13px 14px', background: 'none', border: 'none', cursor: 'pointer',
      borderBottom: isLast ? 'none' : `1px solid ${C.border}`,
    }}>
      {icon}
      <span style={{ fontSize: 14, color: danger ? C.red : C.text, fontWeight: 400 }}>{label}</span>
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
        {value && <span style={{ fontSize: 12, color: C.textTertiary }}>{value}</span>}
        <ChevronLeft size={14} color={C.textTertiary} style={{ transform: 'rotate(180deg)' }} />
      </div>
    </button>
  )
}

export function ToggleRow({ icon, label, enabled, onToggle, isLast }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, width: '100%',
      padding: '13px 14px',
      borderBottom: isLast ? 'none' : `1px solid ${C.border}`,
    }}>
      {icon}
      <span style={{ fontSize: 14, color: C.text, fontWeight: 400 }}>{label}</span>
      <button onClick={onToggle} style={{
        marginLeft: 'auto', width: 42, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
        background: enabled ? C.orange : C.surface3,
        position: 'relative', transition: 'background .2s ease',
      }}>
        <div style={{
          width: 18, height: 18, borderRadius: 9, background: C.white,
          position: 'absolute', top: 3,
          left: enabled ? 21 : 3,
          transition: 'left .2s ease',
        }} />
      </button>
    </div>
  )
}
