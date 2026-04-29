import { C } from '../constants'

export default function PairoLogo({ size = 20 }) {
  return (
    <span style={{
      fontSize: size, fontWeight: 700, letterSpacing: '-0.02em', color: C.white,
      display: 'inline-flex', alignItems: 'center', gap: 2,
    }}>
      pa<span style={{ color: C.orange }}>i</span>ro
    </span>
  )
}
