import { useState } from 'react'
import './Folder.css'

const darkenColor = (hex, percent) => {
  let color = hex.startsWith('#') ? hex.slice(1) : hex
  if (color.length === 3) {
    color = color.split('').map(c => c + c).join('')
  }
  const num = parseInt(color, 16)
  let r = (num >> 16) & 0xff
  let g = (num >> 8) & 0xff
  let b = num & 0xff
  r = Math.max(0, Math.min(255, Math.floor(r * (1 - percent))))
  g = Math.max(0, Math.min(255, Math.floor(g * (1 - percent))))
  b = Math.max(0, Math.min(255, Math.floor(b * (1 - percent))))
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()
}

const Folder = ({ color = '#FF6B35', size = 0.5, count, onClick, className = '' }) => {
  const [hovered, setHovered] = useState(false)

  const folderBackColor = darkenColor(color, 0.08)
  const paper1 = darkenColor('#ffffff', 0.1)
  const paper2 = darkenColor('#ffffff', 0.05)
  const paper3 = '#ffffff'

  const folderStyle = {
    '--folder-color': color,
    '--folder-back-color': folderBackColor,
    '--paper-1': paper1,
    '--paper-2': paper2,
    '--paper-3': paper3,
  }

  return (
    <div
      style={{ transform: `scale(${size})` }}
      className={className}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className={`folder ${hovered ? 'open' : ''}`}
        style={folderStyle}
        onClick={onClick}
      >
        <div className="folder__back">
          <div className="folder-paper" />
          <div className="folder-paper" />
          <div className="folder-paper" />
          <div className="folder__front">
            {count != null && (
              <span style={{
                position: 'absolute', top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                fontSize: 28, fontWeight: 700, color: '#fff',
                pointerEvents: 'none', lineHeight: 1,
              }}>{count}</span>
            )}
          </div>
          <div className="folder__front right" />
        </div>
      </div>
    </div>
  )
}

export default Folder
