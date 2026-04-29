import { ChevronLeft } from 'lucide-react'
import { C } from '../constants'

export default function SubScreenHeader({ title, onBack }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '2px 6px 12px', flexShrink: 0,
    }}>
      <button onClick={onBack} style={{
        background: 'none', border: 'none', cursor: 'pointer', padding: 4,
        display: 'flex', alignItems: 'center',
      }}>
        <ChevronLeft size={22} color={C.white} />
      </button>
      <span style={{ fontSize: 17, fontWeight: 700, color: C.white, letterSpacing: '-0.02em' }}>{title}</span>
    </div>
  )
}
