import { useState, useEffect } from 'react'
import GlassesScene from './components/GlassesScene'
import DuceGame from './components/DuceGame'

export default function App() {
  const [gameOpen, setGameOpen] = useState(false)
  const [guitarOpen, setGuitarOpen] = useState(false)

  // Listen for close message from Guitar Tony iframe
  useEffect(() => {
    const handler = (ev) => {
      if (ev.data?.type === 'close-guitar-tony') setGuitarOpen(false)
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  return (
    <>
      <GlassesScene />

      {/* Desktop folder icons - bottom right */}
      <div style={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 50,
        display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center'
      }}>
        {/* Duce o Non Duce folder */}
        <button
          className="folder-icon"
          onClick={() => setGameOpen(true)}
          title="Duce o Non Duce"
        >
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <path d="M4 12C4 10.9 4.9 10 6 10H18L22 14H42C43.1 14 44 14.9 44 16V38C44 39.1 43.1 40 42 40H6C4.9 40 4 39.1 4 38V12Z" fill="#FFC107"/>
            <path d="M4 16H44V38C44 39.1 43.1 40 42 40H6C4.9 40 4 39.1 4 38V16Z" fill="#FFD54F"/>
            <path d="M4 16H44V20H4V16Z" fill="#FFCA28"/>
          </svg>
          <span className="folder-label">Duce o Non Duce</span>
        </button>

        {/* Guitar Tony folder */}
        <button
          className="folder-icon"
          onClick={() => setGuitarOpen(true)}
          title="Guitar Tony"
        >
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <path d="M4 12C4 10.9 4.9 10 6 10H18L22 14H42C43.1 14 44 14.9 44 16V38C44 39.1 43.1 40 42 40H6C4.9 40 4 39.1 4 38V12Z" fill="#4CAF50"/>
            <path d="M4 16H44V38C44 39.1 43.1 40 42 40H6C4.9 40 4 39.1 4 38V16Z" fill="#66BB6A"/>
            <path d="M4 16H44V20H4V16Z" fill="#43A047"/>
          </svg>
          <span className="folder-label">Guitar Tony</span>
        </button>
      </div>

      {/* Duce game panel */}
      <div className={`game-panel ${gameOpen ? 'open' : ''}`}>
        <button
          className="game-panel-close"
          onClick={() => setGameOpen(false)}
        >
          ✕
        </button>
        {gameOpen && <DuceGame />}
      </div>

      {/* Guitar Tony panel */}
      <div className={`game-panel ${guitarOpen ? 'open' : ''}`}>
        {guitarOpen && (
          <iframe
            src="/guitar-tony/index.html"
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              background: '#000',
            }}
            allow="autoplay"
          />
        )}
      </div>
    </>
  )
}
