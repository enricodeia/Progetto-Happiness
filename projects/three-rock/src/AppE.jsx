import { useRef, useState, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrthographicCamera } from '@react-three/drei'
import { useControls, folder, Leva, useCreateStore, LevaPanel } from 'leva'
import ScenicBackdrop from './ScenicBackdrop.jsx'

// Test E — playful scenic backdrop. Procedural night-sky / ocean / moon
// shader (GLSL port of prinzipiell/tsl/scenic-backdrop) running behind a
// minimal Metalab title overlay. Self-contained: own route, own Leva
// store, no impact on /a /b /c /d.

const NAV_ITEMS = ['Work', 'Studio', 'Capabilities', 'Journal', 'Contact']

const FG = '#ecedf0'
const ACCENT = '#584dff'

export default function AppE() {
  const store = useCreateStore()

  const { gamma, horizon, moonlight } = useControls({
    'E · Backdrop': folder({
      gamma:     { value: 0.87, min: 0.40, max: 0.90, step: 0.01 },
      horizon:   { value: 0.36, min: 0.25, max: 0.50, step: 0.01 },
      moonlight: { value: 8.00, min: 5.00, max: 20.0, step: 0.10 },
    }, { collapsed: false }),
  }, { store })

  // mounted flag avoids flashing the title before the shader has its first
  // frame (the original scenic-backdrop fades in via smoothstep(0,4,tick))
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(id)
  }, [])

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000', overflow: 'hidden' }}>
      <Canvas
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        dpr={[1, 1.75]}
        style={{ position: 'absolute', inset: 0 }}
        orthographic
      >
        <OrthographicCamera makeDefault left={-1} right={1} top={1} bottom={-1} near={0} far={1} />
        <ScenicBackdrop gamma={gamma} horizon={horizon} moonlight={moonlight} />
      </Canvas>

      <nav style={{
        position: 'absolute',
        top: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 20,
        opacity: mounted ? 1 : 0,
        transition: 'opacity 0.8s ease 0.3s',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 36,
          background: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          padding: '10px 28px',
          borderRadius: '0 0 18px 18px',
          border: '1px solid rgba(255,255,255,0.06)',
          borderTop: 'none',
        }}>
          {NAV_ITEMS.map((item) => (
            <a
              key={item}
              href="#"
              style={{
                fontFamily: 'Basis Grotesque Pro, sans-serif',
                fontSize: 12,
                letterSpacing: '0.02em',
                color: 'rgba(236,237,240,0.78)',
                textDecoration: 'none',
                transition: 'color 0.2s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = FG)}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(236,237,240,0.78)')}
            >
              {item}
            </a>
          ))}
        </div>
      </nav>

      <div style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: '8vh',
        textAlign: 'center',
        zIndex: 10,
        pointerEvents: 'none',
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'translateY(0)' : 'translateY(16px)',
        transition: 'opacity 1.2s ease 0.6s, transform 1.2s cubic-bezier(0.16, 1, 0.3, 1) 0.6s',
      }}>
        <h1 style={{
          fontFamily: 'PP Eiko, serif',
          fontWeight: 100,
          fontSize: 'clamp(80px, 14vw, 240px)',
          lineHeight: 0.85,
          letterSpacing: '-0.05em',
          color: FG,
          margin: 0,
          mixBlendMode: 'difference',
          position: 'relative',
          display: 'inline-block',
        }}>
          Metalab
          <span style={{
            position: 'absolute',
            top: '0.2em',
            right: '-0.45em',
            fontSize: '0.18em',
            color: ACCENT,
            fontFamily: 'Basis Grotesque Pro, sans-serif',
            mixBlendMode: 'normal',
          }}>*</span>
        </h1>
        <p style={{
          fontFamily: 'Basis Grotesque Pro, sans-serif',
          fontSize: 13,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'rgba(236,237,240,0.7)',
          marginTop: 18,
        }}>
          A brand & product studio
        </p>
      </div>

      <Leva store={store} hideCopyButton titleBar={{ title: 'E · controls' }} />
      <LevaPanel store={store} />
    </div>
  )
}
