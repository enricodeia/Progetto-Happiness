import { Compass, MessageCircle, User } from 'lucide-react'
import { C } from '../constants'

export default function TabBar({ active, onChange }) {
  const tabs = [
    { id: 'discover', label: 'Discover', Icon: Compass },
    { id: 'chat', label: 'Chat', Icon: MessageCircle },
    { id: 'profile', label: 'Profile', Icon: User },
  ]
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-around', alignItems: 'center',
      minHeight: 60, flexShrink: 0, background: C.bg,
      borderTop: `1px solid ${C.border}`,
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
    }}>
      {tabs.map(({ id, label, Icon }) => {
        const isActive = active === id
        return (
          <button key={id} onClick={() => onChange(id)} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            position: 'relative', padding: '6px 24px',
          }}>
            <Icon
              size={21}
              color={isActive ? C.orange : C.textTertiary}
              fill={isActive ? C.orange : 'none'}
              strokeWidth={isActive ? 2.2 : 1.5}
            />
            <span style={{
              fontSize: 9.5, fontWeight: isActive ? 600 : 400,
              color: isActive ? C.white : C.textTertiary,
              letterSpacing: '0.04em', textTransform: 'uppercase',
            }}>{label}</span>
          </button>
        )
      })}
    </div>
  )
}
